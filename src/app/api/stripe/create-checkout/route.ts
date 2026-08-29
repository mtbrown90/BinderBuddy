import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { autoPopulatePriceCents, BULK_AUTOPOPULATE_PRICE_CENTS } from "@/lib/pricing";
import { POKEMON_TYPES } from "@/lib/pokemontcg";

// A purchase is one of: a list of Pokémon names, a single energy type, or a
// single artist. The latter two are stored as a single-element query_names
// array prefixed "type:" / "artist:" so the webhook can tell them apart
// without a schema change.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const masterSetId = body?.masterSetId ? String(body.masterSetId) : "";
  const type = body?.type ? String(body.type) : "";
  const artist = body?.artist ? String(body.artist).trim() : "";
  const queryNames: string[] = Array.isArray(body?.queryNames)
    ? body.queryNames.map((n: unknown) => String(n).trim()).filter(Boolean)
    : [];

  if (!masterSetId || (queryNames.length === 0 && !type && !artist)) {
    return NextResponse.json(
      { error: "masterSetId and one of queryNames, type, or artist are required" },
      { status: 400 }
    );
  }
  if (type && !(POKEMON_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: "Unknown Pokémon type" }, { status: 400 });
  }

  // Confirm this master set actually belongs to the requesting user — the
  // user's own RLS-scoped client can only see their own rows, so this also
  // doubles as an ownership check.
  const { data: masterSet } = await supabase
    .from("master_sets")
    .select("id, name")
    .eq("id", masterSetId)
    .single();
  if (!masterSet) {
    return NextResponse.json({ error: "Master set not found" }, { status: 404 });
  }

  const isBulk = Boolean(type || artist);
  const amountCents = isBulk ? BULK_AUTOPOPULATE_PRICE_CENTS : autoPopulatePriceCents(queryNames.length);
  const storedQueryNames = type ? [`type:${type}`] : artist ? [`artist:${artist}`] : queryNames;
  const productDescription = type
    ? `Add every official ${type}-type card`
    : artist
      ? `Add every official card illustrated by ${artist}`
      : `Add every card matching: ${queryNames.join(", ")}`;

  const { data: purchase, error } = await supabase
    .from("masterset_purchases")
    .insert({
      user_id: user.id,
      master_set_id: masterSetId,
      amount_cents: amountCents,
      query_names: storedQueryNames,
    })
    .select("id")
    .single();

  if (error || !purchase) {
    return NextResponse.json({ error: error?.message ?? "Could not start checkout" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `Auto-populate "${masterSet.name}"`,
              description: productDescription,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { purchaseId: purchase.id },
      success_url: `${appUrl}/sets/master/${masterSetId}?checkout=success`,
      cancel_url: `${appUrl}/sets/master/${masterSetId}?checkout=cancelled`,
    });

    // Regular users can only INSERT/SELECT their own purchase rows (never
    // UPDATE — only the webhook may mark one completed), so recording the
    // session id here needs the admin client.
    const admin = createAdminClient();
    await admin
      .from("masterset_purchases")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", purchase.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe checkout failed" },
      { status: 500 }
    );
  }
}
