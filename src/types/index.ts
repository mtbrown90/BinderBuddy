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
  image_url: string | null;
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
