import type { CollectionEntry } from "@/types";

// Groups collection entries that represent "the same card" for display —
// same printing, same condition — into one tile with a combined quantity.
// A card owned in two different conditions still shows as two tiles (each
// its own group), matching how they'd actually sit in different binder
// slots. Grouping is purely a display concern; each entry stays its own
// row underneath (its own price paid, its own sell/trade history).
export type EntryGroup = {
  key: string;
  entries: CollectionEntry[];
  card_name: string;
  image_url: string | null;
  variation_type: string;
  set_name: string | null;
  condition: string;
  quantity: number;
  // Latest created_at among the group's entries — used for "recently added"
  // ordering and as this group's representative market price for sorting.
  latestCreatedAt: string;
  totalMarketValue: number;
};

export function groupCollectionEntries(entries: CollectionEntry[]): EntryGroup[] {
  const map = new Map<string, CollectionEntry[]>();
  for (const e of entries) {
    const key = `${e.external_card_id}::${e.variation_type.toLowerCase()}::${e.condition}`;
    map.set(key, [...(map.get(key) ?? []), e]);
  }

  return [...map.entries()].map(([key, group]) => ({
    key,
    entries: group,
    card_name: group[0].card_name,
    image_url: group[0].image_url,
    variation_type: group[0].variation_type,
    set_name: group[0].set_name,
    condition: group[0].condition,
    quantity: group.reduce((s, e) => s + e.quantity, 0),
    latestCreatedAt: group.reduce((max, e) => (e.created_at > max ? e.created_at : max), group[0].created_at),
    totalMarketValue: group.reduce((s, e) => s + (Number(e.market_price) || 0) * e.quantity, 0),
  }));
}

export function groupSubtitle(g: EntryGroup): string {
  return `${g.condition} · Qty ${g.quantity}`;
}
