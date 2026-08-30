"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { getCard, getCardsByIds, cardVariations } from "@/lib/pokemontcg";
import type { MasterSetCard } from "@/types";

// Adds every known printing (variation) of the given card to the master
// set's checklist in one go — a masterset tracks each printing separately,
// so a card with three variations becomes three checklist rows.
export async function addCardToMasterSet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const masterSetId = String(formData.get("masterSetId"));
  const cardId = String(formData.get("cardId"));

  const card = await getCard(cardId);
  const variations = cardVariations(card);

  const { error } = await supabase.from("master_set_cards").upsert(
    variations.map((v) => ({
      master_set_id: masterSetId,
      external_card_id: card.id,
      external_source: "pokemontcg.io",
      variation_type: v.label,
      card_name: card.name,
      set_name: card.set.name,
      card_number: card.number,
      set_printed_total: card.set.printedTotal,
      image_url: card.images.small,
      image_url_large: card.images.large,
      market_price: v.marketPrice,
      added_via: "manual" as const,
    })),
    { onConflict: "master_set_id,external_card_id,variation_type", ignoreDuplicates: true }
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/sets/master/${masterSetId}`);
}

// Admin-only: fills a gap in pokemontcg.io's catalog by adding a specific
// real card straight into this masterset's checklist. Not for made-up
// cards — for real printings the API just doesn't have (rare promos, etc).
export async function addManualCardToMasterSet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (!(await isCurrentUserAdmin())) throw new Error("Admins only");

  const masterSetId = String(formData.get("masterSetId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Card name is required");

  const marketPriceRaw = formData.get("marketPrice");
  const marketPrice = marketPriceRaw ? Number(marketPriceRaw) : null;

  const { error } = await supabase.from("master_set_cards").insert({
    master_set_id: masterSetId,
    external_card_id: `manual-${crypto.randomUUID()}`,
    external_source: "manual",
    variation_type: String(formData.get("variationType") || "") || "Normal",
    card_name: name,
    set_name: String(formData.get("setName") || "") || null,
    card_number: String(formData.get("cardNumber") || "") || null,
    image_url: String(formData.get("imageUrl") || "") || null,
    market_price: marketPrice != null && !Number.isNaN(marketPrice) ? marketPrice : null,
    added_via: "manual",
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/sets/master/${masterSetId}`);
}

const REFRESH_CHUNK_SIZE = 500;

// Re-fetches live prices (and images) for every API-sourced card in this
// checklist and snapshots the result onto each row. Needed because
// market_price/image_url_large are only ever captured at add time — a
// checklist built via search-add or a Store auto-populate purchase before
// this snapshotting existed (or since gone stale) would otherwise carry
// null/outdated data forever, since nothing else ever revisits an
// already-added row.
export async function refreshMasterSetPrices(
  masterSetId: string
): Promise<{ updated: number } | { error: string }> {
  const supabase = await createClient();

  const { data: rows, error: fetchError } = await supabase
    .from("master_set_cards")
    .select("*")
    .eq("master_set_id", masterSetId)
    .eq("external_source", "pokemontcg.io")
    .returns<MasterSetCard[]>();

  if (fetchError) return { error: fetchError.message };
  if (!rows || rows.length === 0) return { updated: 0 };

  let cards;
  try {
    cards = await getCardsByIds(rows.map((r) => r.external_card_id));
  } catch {
    return { error: "Couldn't reach the Pokémon TCG API right now — try again in a moment." };
  }
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const updates = rows.flatMap((row) => {
    const card = cardById.get(row.external_card_id);
    if (!card) return [];
    const variation = cardVariations(card).find(
      (v) => v.label.toLowerCase() === row.variation_type.toLowerCase()
    );
    if (!variation) return [];
    return [
      {
        master_set_id: row.master_set_id,
        external_card_id: row.external_card_id,
        external_source: row.external_source,
        variation_type: row.variation_type,
        card_name: row.card_name,
        set_name: row.set_name,
        card_number: row.card_number,
        set_printed_total: row.set_printed_total,
        image_url: card.images.small,
        image_url_large: card.images.large,
        market_price: variation.marketPrice,
        added_via: row.added_via,
      },
    ];
  });

  for (let i = 0; i < updates.length; i += REFRESH_CHUNK_SIZE) {
    const chunk = updates.slice(i, i + REFRESH_CHUNK_SIZE);
    const { error } = await supabase
      .from("master_set_cards")
      .upsert(chunk, { onConflict: "master_set_id,external_card_id,variation_type" });
    if (error) return { error: error.message };
  }

  revalidatePath(`/sets/master/${masterSetId}`);
  return { updated: updates.length };
}

export async function removeCardFromMasterSet(masterSetCardId: string, masterSetId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("master_set_cards").delete().eq("id", masterSetCardId);
  if (error) throw new Error(error.message);

  revalidatePath(`/sets/master/${masterSetId}`);
}

// Deletes the whole masterset — RLS scopes this to sets you own, and the
// foreign keys cascade to remove its checklist rows, auto-populate
// provenance, and purchase history along with it.
export async function deleteMasterSet(masterSetId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("master_sets").delete().eq("id", masterSetId);
  if (error) throw new Error(error.message);

  revalidatePath("/sets");
  redirect("/sets");
}
