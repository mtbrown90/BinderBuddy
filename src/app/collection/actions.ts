"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function removeCollectionEntry(entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("collection_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);

  revalidatePath("/collection");
  revalidatePath("/");
}

export async function markEntrySold(entryId: string, formData: FormData) {
  const supabase = await createClient();

  const soldPriceRaw = formData.get("soldPrice");
  const soldPrice = soldPriceRaw ? Number(soldPriceRaw) : null;
  if (soldPrice == null || Number.isNaN(soldPrice)) {
    throw new Error("Sold price is required");
  }

  const { error } = await supabase
    .from("collection_entries")
    .update({
      status: "sold",
      sold_date: String(formData.get("soldDate") || "") || null,
      sold_price: soldPrice,
      // Clear any prior trade fields in case this entry was previously
      // marked traded and is being corrected.
      traded_date: null,
      traded_for_card_name: null,
      traded_for_card_value: null,
      traded_cash_received: null,
    })
    .eq("id", entryId);

  if (error) throw new Error(error.message);

  revalidatePath("/collection");
  revalidatePath("/");
}

export async function markEntryTraded(entryId: string, formData: FormData) {
  const supabase = await createClient();

  const cardName = String(formData.get("tradedForCardName") || "").trim();
  const cardValueRaw = formData.get("tradedForCardValue");
  const cashRaw = formData.get("tradedCashReceived");
  const cardValue = cardValueRaw ? Number(cardValueRaw) : null;
  const cash = cashRaw ? Number(cashRaw) : null;

  if (!cardName && !cash) {
    throw new Error("Enter what you received — a card, cash, or both");
  }

  const { error } = await supabase
    .from("collection_entries")
    .update({
      status: "traded",
      traded_date: String(formData.get("tradedDate") || "") || null,
      traded_for_card_name: cardName || null,
      traded_for_card_value: cardValue != null && !Number.isNaN(cardValue) ? cardValue : null,
      traded_cash_received: cash != null && !Number.isNaN(cash) ? cash : null,
      // Clear any prior sold fields in case this entry was previously
      // marked sold and is being corrected.
      sold_date: null,
      sold_price: null,
    })
    .eq("id", entryId);

  if (error) throw new Error(error.message);

  revalidatePath("/collection");
  revalidatePath("/");
}

// Reverts a sold/traded entry back to owned, clearing disposal fields —
// for undoing a mistaken sale/trade record.
export async function markEntryOwned(entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_entries")
    .update({
      status: "owned",
      sold_date: null,
      sold_price: null,
      traded_date: null,
      traded_for_card_name: null,
      traded_for_card_value: null,
      traded_cash_received: null,
    })
    .eq("id", entryId);

  if (error) throw new Error(error.message);

  revalidatePath("/collection");
  revalidatePath("/");
}
