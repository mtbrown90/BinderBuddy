"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addCustomCard(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const customSetId = String(formData.get("customSetId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Card name is required");

  const { data: card, error: cardError } = await supabase
    .from("custom_cards")
    .insert({
      custom_set_id: customSetId,
      name,
      card_number: String(formData.get("cardNumber") || "") || null,
      rarity: String(formData.get("rarity") || "") || null,
      base_image_url: String(formData.get("imageUrl") || "") || null,
    })
    .select("id")
    .single();

  if (cardError) throw new Error(cardError.message);

  const { error: variationError } = await supabase.from("custom_variations").insert({
    custom_card_id: card.id,
    variation_type: String(formData.get("variationType") || "Normal"),
    market_price: formData.get("marketPrice") ? Number(formData.get("marketPrice")) : null,
    image_url: String(formData.get("imageUrl") || "") || null,
  });

  if (variationError) throw new Error(variationError.message);

  revalidatePath(`/sets/custom/${customSetId}`);
}

export async function addCustomVariationToCollection(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("collection_entries").insert({
    user_id: user.id,
    source: "custom",
    custom_variation_id: String(formData.get("variationId")),
    variation_type: String(formData.get("variationType")),
    card_name: String(formData.get("cardName")),
    set_name: String(formData.get("setName")),
    image_url: String(formData.get("imageUrl") || "") || null,
    condition: String(formData.get("condition")),
    quantity: Number(formData.get("quantity")) || 1,
    price_paid: formData.get("pricePaid") ? Number(formData.get("pricePaid")) : null,
    market_price: formData.get("marketPrice") ? Number(formData.get("marketPrice")) : null,
    date_acquired: formData.get("dateAcquired") || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/collection");
  revalidatePath("/");
}
