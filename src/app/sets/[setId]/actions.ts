"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Each copy becomes its own row (quantity 1) with its own price_paid,
// rather than one row with an aggregate quantity — buying several copies
// rarely means paying the same price for each, and separate rows also
// mean each copy can later be sold/traded independently.
export async function addOfficialCardToCollection(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const cardId = String(formData.get("cardId"));

  let prices: (number | null)[];
  try {
    prices = JSON.parse(String(formData.get("pricesPaid") || "[]"));
  } catch {
    prices = [];
  }
  if (prices.length === 0) prices = [null];

  const base = {
    user_id: user.id,
    external_card_id: cardId,
    external_source: cardId.startsWith("manual-") ? "manual" : "pokemontcg.io",
    variation_type: String(formData.get("variationType")),
    card_name: String(formData.get("cardName")),
    set_name: String(formData.get("setName")),
    image_url: String(formData.get("imageUrl") || "") || null,
    condition: String(formData.get("condition")),
    quantity: 1,
    market_price: formData.get("marketPrice") ? Number(formData.get("marketPrice")) : null,
    date_acquired: formData.get("dateAcquired") || null,
  };

  const rows = prices.map((price_paid) => ({ ...base, price_paid }));

  const { error } = await supabase.from("collection_entries").insert(rows);

  if (error) throw new Error(error.message);

  revalidatePath("/collection");
  revalidatePath("/");
}
