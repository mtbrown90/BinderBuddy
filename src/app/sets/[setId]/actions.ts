"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addOfficialCardToCollection(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("collection_entries").insert({
    user_id: user.id,
    source: "api",
    external_card_id: String(formData.get("cardId")),
    external_source: "pokemontcg.io",
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
