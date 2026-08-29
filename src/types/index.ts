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
  source: "api" | "custom";
  external_card_id: string | null;
  external_source: string | null;
  custom_variation_id: string | null;
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

export type CustomSet = {
  id: string;
  user_id: string;
  name: string;
  game: string;
  publisher: string | null;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
};

export type CustomCard = {
  id: string;
  custom_set_id: string;
  name: string;
  card_number: string | null;
  rarity: string | null;
  supertype: string | null;
  base_image_url: string | null;
  created_at: string;
};

export type CustomVariation = {
  id: string;
  custom_card_id: string;
  variation_type: string;
  market_price: number | null;
  image_url: string | null;
  created_at: string;
};
