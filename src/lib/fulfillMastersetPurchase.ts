import {
  findAllCardsByName,
  findAllCardsByType,
  findAllCardsByArtist,
  cardVariations,
  type PokemonCard,
} from "@/lib/pokemontcg";
import type { AdminClient } from "@/lib/supabase/admin";

// Type- and artist-based entries in query_names are stored as "type:Fire" /
// "artist:Ken Sugimori" so a single text[] column can carry all three
// purchase kinds without a schema change.
const TYPE_PREFIX = "type:";
const ARTIST_PREFIX = "artist:";

const UPSERT_CHUNK_SIZE = 500;

async function upsertCardRows(admin: AdminClient, masterSetId: string, cards: PokemonCard[]) {
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
      image_url_large: c.images.large,
      market_price: v.marketPrice,
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

// Shared by the Stripe webhook (after a real payment) and the admin free-
// access bypass (no payment at all) — both need the exact same "fetch
// these queries from pokemontcg.io and add the cards" behavior.
export async function fulfillMastersetPurchase(admin: AdminClient, masterSetId: string, queryNames: string[]) {
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

    await upsertCardRows(admin, masterSetId, cards);

    await admin.from("master_set_queries").insert({
      master_set_id: masterSetId,
      query_name: entry,
    });
  }
}
