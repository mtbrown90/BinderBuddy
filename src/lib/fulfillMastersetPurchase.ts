import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findAllCardsByName,
  findAllCardsByType,
  findAllCardsByArtist,
  cardVariations,
  type PokemonCard,
} from "@/lib/pokemontcg";
import {
  listSupplementalCards,
  supplementalMatchesQuery,
  supplementalToChecklistRow,
} from "@/lib/supplementalCards";

// Accepts either the service-role admin client (webhook, admin-free
// checkout bypass — no user session to scope by) or a regular signed-in
// user's client (the "check for new cards" refresh, run by the owning
// user themselves — RLS on master_set_cards/master_set_queries already
// scopes it to their own sets).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// Type- and artist-based entries in query_names are stored as "type:Fire" /
// "artist:Ken Sugimori" so a single text[] column can carry all three
// purchase kinds without a schema change.
const TYPE_PREFIX = "type:";
const ARTIST_PREFIX = "artist:";

const UPSERT_CHUNK_SIZE = 500;

async function fetchCardsForQuery(entry: string): Promise<PokemonCard[]> {
  try {
    return entry.startsWith(TYPE_PREFIX)
      ? await findAllCardsByType(entry.slice(TYPE_PREFIX.length))
      : entry.startsWith(ARTIST_PREFIX)
        ? await findAllCardsByArtist(entry.slice(ARTIST_PREFIX.length))
        : await findAllCardsByName(entry);
  } catch {
    return []; // pokemontcg.io hiccup — the rest of the entries still get processed
  }
}

function checklistRowsFromCards(masterSetId: string, cards: PokemonCard[]) {
  return cards.flatMap((c) =>
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
}

// Returns how many rows were actually new — an upsert with ignoreDuplicates
// only RETURNs the rows it inserted (conflicting ones are silently
// skipped), so chaining .select() on it doubles as a free "how many were
// new" count.
async function upsertChecklistRows(
  client: AnySupabaseClient,
  rows: Record<string, unknown>[]
): Promise<number> {
  let insertedCount = 0;
  // A type or artist purchase can be thousands of rows — chunk the upsert
  // so it stays well under any request-size limit.
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
    const { data } = await client
      .from("master_set_cards")
      .upsert(chunk, { onConflict: "master_set_id,external_card_id,variation_type", ignoreDuplicates: true })
      .select("id");
    insertedCount += data?.length ?? 0;
  }
  return insertedCount;
}

// Everything one query should add: the pokemontcg.io matches plus any
// admin-added promo catalog cards (see supplementalCards.ts) that match it.
async function rowsForQuery(
  client: AnySupabaseClient,
  masterSetId: string,
  entry: string,
  supplemental: Awaited<ReturnType<typeof listSupplementalCards>>
) {
  const cards = await fetchCardsForQuery(entry);
  return [
    ...checklistRowsFromCards(masterSetId, cards),
    ...supplemental
      .filter((s) => supplementalMatchesQuery(s, entry))
      .map((s) => supplementalToChecklistRow(masterSetId, s)),
  ];
}

// Shared by the Stripe webhook (after a real payment) and the admin free-
// access bypass (no payment at all) — both need the exact same "fetch
// these queries from pokemontcg.io and add the cards" behavior, and both
// record what was bought in master_set_queries (read later by
// refreshMasterSetFromSavedQueries below).
export async function fulfillMastersetPurchase(
  client: AnySupabaseClient,
  masterSetId: string,
  queryNames: string[]
) {
  const supplemental = await listSupplementalCards(client);

  for (const entry of queryNames) {
    const rows = await rowsForQuery(client, masterSetId, entry, supplemental);
    if (rows.length === 0) continue;

    await upsertChecklistRows(client, rows);

    await client.from("master_set_queries").insert({
      master_set_id: masterSetId,
      query_name: entry,
    });
  }
}

// Re-runs every query this master set was ever auto-populated from (e.g.
// "every card named Piplup") and adds anything that newly matches — new
// pokemontcg.io releases and newly added promo catalog cards alike — for
// free, no new purchase row, since the user already paid for this query
// once. Doesn't touch master_set_queries itself (those rows already exist
// from the original purchase), so repeated checks don't accumulate
// duplicates there. Returns how many new cards were actually added.
export async function refreshMasterSetFromSavedQueries(client: AnySupabaseClient, masterSetId: string) {
  const { data: queryRows } = await client
    .from("master_set_queries")
    .select("query_name")
    .eq("master_set_id", masterSetId);

  const queryNames = [...new Set((queryRows ?? []).map((r) => r.query_name as string))];
  const supplemental = await listSupplementalCards(client);

  let addedCount = 0;
  for (const entry of queryNames) {
    const rows = await rowsForQuery(client, masterSetId, entry, supplemental);
    if (rows.length === 0) continue;
    addedCount += await upsertChecklistRows(client, rows);
  }
  return addedCount;
}
