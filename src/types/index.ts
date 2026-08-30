// Suggested values for the admin-only "add a card the API is missing" form
// — freeform text underneath, this is just a starting list.
export const VARIATION_TYPES = [
  "Normal",
  "Holofoil",
  "Reverse Holo",
  "1st Edition",
  "Full Art",
  "Alt Art",
  "Promo",
  "Other",
] as const;

export const CONDITIONS = [
  "Mint",
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
] as const;
export type Condition = (typeof CONDITIONS)[number];

// pokemontcg.io's market price is a single TCGplayer figure standardized to
// Near Mint — there's no real per-condition pricing in that data source.
// These are widely-used community rule-of-thumb discounts off the Near
// Mint price, not authoritative market data — always label them as an
// estimate in the UI rather than presenting them as real prices.
export const CONDITION_PRICE_MULTIPLIERS: Record<Condition, number> = {
  Mint: 1,
  "Near Mint": 1,
  "Lightly Played": 0.85,
  "Moderately Played": 0.7,
  "Heavily Played": 0.5,
  Damaged: 0.3,
};

export function conditionAdjustedPrice(nearMintPrice: number, condition: string): number {
  const multiplier = CONDITION_PRICE_MULTIPLIERS[condition as Condition] ?? 1;
  return Math.round(nearMintPrice * multiplier * 100) / 100;
}

export type CollectionStatus = "owned" | "sold" | "traded";

export type CollectionEntry = {
  id: string;
  user_id: string;
  external_card_id: string;
  external_source: string;
  variation_type: string;
  card_name: string;
  set_name: string | null;
  image_url: string | null;
  condition: string;
  quantity: number;
  price_paid: number | null;
  market_price: number | null;
  date_acquired: string | null;
  notes: string | null;
  status: CollectionStatus;
  sold_date: string | null;
  sold_price: number | null;
  traded_date: string | null;
  traded_for_card_name: string | null;
  traded_for_card_value: number | null;
  traded_cash_received: number | null;
  created_at: string;
  updated_at: string;
};

export type MasterSet = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type MasterSetCard = {
  id: string;
  master_set_id: string;
  external_card_id: string;
  external_source: string;
  variation_type: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  set_printed_total: number | null;
  image_url: string | null;
  image_url_large: string | null;
  market_price: number | null;
  added_via: "manual" | "auto_purchase";
  created_at: string;
};

export type PurchaseStatus = "pending" | "completed" | "failed" | "refunded";

export type MastersetPurchase = {
  id: string;
  user_id: string;
  master_set_id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: PurchaseStatus;
  query_names: string[];
  created_at: string;
  completed_at: string | null;
};

export type PdfStyle = "color" | "bw" | "text";
export type PdfPurchaseStatus = "pending" | "completed" | "failed";

export type MastersetPdfPurchase = {
  id: string;
  user_id: string;
  master_set_id: string;
  style: PdfStyle;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: PdfPurchaseStatus;
  created_at: string;
  completed_at: string | null;
};
