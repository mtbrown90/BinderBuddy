import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupplementalCard } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

const TYPE_PREFIX = "type:";
const ARTIST_PREFIX = "artist:";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Mirrors how the pokemontcg.io queries behave: type:/artist: entries are
// exact (case-insensitive), and a plain name entry matches any card whose
// name contains it as whole words — so "Eevee" picks up "Eevee ex", but
// "Eevee ex" doesn't pick up a plain "Eevee".
export function supplementalMatchesQuery(card: SupplementalCard, entry: string): boolean {
  if (entry.startsWith(TYPE_PREFIX)) {
    const t = entry.slice(TYPE_PREFIX.length).toLowerCase();
    return card.types.some((x) => x.toLowerCase() === t);
  }
  if (entry.startsWith(ARTIST_PREFIX)) {
    const a = entry.slice(ARTIST_PREFIX.length).trim().toLowerCase();
    return (card.artist ?? "").trim().toLowerCase() === a;
  }
  const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(entry.trim().toLowerCase())}([^a-z0-9]|$)`);
  return re.test(card.card_name.toLowerCase());
}

export function supplementalCardId(id: string) {
  return `supp-${id}`;
}

// master_set_cards row shape for a catalog card — external_source "manual"
// so the rest of the app treats it like any admin-added card (opens from
// its stored snapshot, skipped by the live price refresh).
export function supplementalToChecklistRow(masterSetId: string, card: SupplementalCard) {
  return {
    master_set_id: masterSetId,
    external_card_id: supplementalCardId(card.id),
    external_source: "manual",
    variation_type: card.variation_type,
    card_name: card.card_name,
    set_name: card.set_name,
    card_number: card.card_number,
    set_printed_total: card.set_printed_total,
    image_url: card.image_url,
    image_url_large: card.image_url,
    market_price: card.market_price,
    added_via: "auto_purchase" as const,
  };
}

export async function listSupplementalCards(client: AnySupabaseClient): Promise<SupplementalCard[]> {
  const { data } = await client
    .from("supplemental_cards")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as SupplementalCard[];
}
