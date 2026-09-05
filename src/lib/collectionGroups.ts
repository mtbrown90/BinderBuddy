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
  card_number: string | null;
  set_printed_total: number | null;
  condition: string | null;
  is_graded: boolean;
  grading_company: string | null;
  grade: number | null;
  quantity: number;
  // Latest created_at among the group's entries — used for "recently added"
  // ordering and as this group's representative market price for sorting.
  latestCreatedAt: string;
  totalMarketValue: number;
  totalPricePaid: number;
};

// Two different grades of the same card are as distinct as two different
// raw conditions — grouped separately, same as condition already was.
function conditionOrGradeKey(e: CollectionEntry) {
  return e.is_graded ? `graded::${e.grading_company}::${e.grade}` : `condition::${e.condition}`;
}

export function groupCollectionEntries(entries: CollectionEntry[]): EntryGroup[] {
  const map = new Map<string, CollectionEntry[]>();
  for (const e of entries) {
    const key = `${e.external_card_id}::${e.variation_type.toLowerCase()}::${conditionOrGradeKey(e)}`;
    map.set(key, [...(map.get(key) ?? []), e]);
  }

  return [...map.entries()].map(([key, group]) => ({
    key,
    entries: group,
    card_name: group[0].card_name,
    image_url: group[0].image_url,
    variation_type: group[0].variation_type,
    set_name: group[0].set_name,
    card_number: group[0].card_number,
    set_printed_total: group[0].set_printed_total,
    condition: group[0].condition,
    is_graded: group[0].is_graded,
    grading_company: group[0].grading_company,
    grade: group[0].grade,
    quantity: group.reduce((s, e) => s + e.quantity, 0),
    latestCreatedAt: group.reduce((max, e) => (e.created_at > max ? e.created_at : max), group[0].created_at),
    totalMarketValue: group.reduce((s, e) => s + (Number(e.market_price) || 0) * e.quantity, 0),
    totalPricePaid: group.reduce((s, e) => s + (Number(e.price_paid) || 0) * e.quantity, 0),
  }));
}

// The condition-or-grade label shown on tiles and used for filtering —
// e.g. "Near Mint" for a raw card, "PSA 10" for a graded one.
export function conditionOrGradeLabel(g: EntryGroup): string {
  return g.is_graded ? `${g.grading_company} ${g.grade}` : (g.condition ?? "—");
}

export function groupSubtitle(g: EntryGroup): string {
  return `${conditionOrGradeLabel(g)} · Qty ${g.quantity}`;
}

// "Set Name · #4/102" — the same identity line master_set_cards checklist
// tiles already show, so a card looks the same no matter which page it's
// viewed from. Works from either an EntryGroup or a raw CollectionEntry.
export function setIdentityLabel(card: {
  set_name: string | null;
  card_number: string | null;
  set_printed_total: number | null;
}): string | undefined {
  const number = card.card_number
    ? `#${card.card_number}${card.set_printed_total ? `/${card.set_printed_total}` : ""}`
    : null;
  return [card.set_name, number].filter(Boolean).join(" · ") || undefined;
}
