import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import {
  findAllCardsByName,
  findAllCardsByType,
  findAllCardsByArtist,
  cardVariations,
  type PokemonCard,
} from "@/lib/pokemontcg";

// Type- and artist-based entries in query_names are stored as "type:Fire" /
// "artist:Ken Sugimori" so a single text[] column can carry all three
// purchase kinds without a schema change.
const TYPE_PREFIX = "type:";
const ARTIST_PREFIX = "artist:";

const UPSERT_CHUNK_SIZE = 500;

async function upsertCardRows(
  admin: AdminClient,
  masterSetId: string,
  cards: PokemonCard[]
) {
  const rows = cards.flatMap((c) =>
    cardVariations(c).map((v) => ({
      master_set_id: masterSetId,
      external_card_id: c.id,
      external_source: "pokemontcg.io",
      variation_type: v.label,
      card_name: c.name,
      set_name: c.set.name,
      card_number: c.number,
      set_printed_total: c.set.printedTotal,
      image_url: c.images.small,
      added_via: "auto_purchase" as const,
    }))
  );

  // A type or artist purchase can be thousands of rows — chunk the upsert
  // so it stays well under any request-size limit.
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
    await admin
      .from("master_set_cards")
      .upsert(chunk, { onConflict: "master_set_id,external_card_id,variation_type", ignoreDuplicates: true });
  }
}

// Called by Stripe, not the browser — no user session/cookies are present,
// so this route is excluded from the auth middleware (see src/proxy.ts).
// This is the ONLY place a purchase is marked completed and cards actually
// get added; the client never gets to declare its own payment successful.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const purchaseId = session.metadata?.purchaseId;
  if (!purchaseId) return NextResponse.json({ received: true });

  const admin = createAdminClient();

  const { data: purchase } = await admin
    .from("masterset_purchases")
    .select("*")
    .eq("id", purchaseId)
    .single();

  if (!purchase || purchase.status === "completed") {
    return NextResponse.json({ received: true });
  }

  const queryNames: string[] = purchase.query_names ?? [];

  for (const entry of queryNames) {
    let cards: PokemonCard[];
    try {
      cards = entry.startsWith(TYPE_PREFIX)
        ? await findAllCardsByType(entry.slice(TYPE_PREFIX.length))
        : entry.startsWith(ARTIST_PREFIX)
          ? await findAllCardsByArtist(entry.slice(ARTIST_PREFIX.length))
          : await findAllCardsByName(entry);
    } catch {
      continue; // pokemontcg.io hiccup — the rest of the entries still get processed
    }

    if (cards.length === 0) continue;

    await upsertCardRows(admin, purchase.master_set_id, cards);

    await admin.from("master_set_queries").insert({
      master_set_id: purchase.master_set_id,
      query_name: entry,
    });
  }

  await admin
    .from("masterset_purchases")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
    })
    .eq("id", purchaseId);

  return NextResponse.json({ received: true });
}
