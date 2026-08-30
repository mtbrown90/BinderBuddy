"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function postWant(formData: FormData): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const cardName = String(formData.get("cardName") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!cardName) return { error: "Card name is required." };

  const { error } = await supabase
    .from("trade_wants")
    .insert({ user_id: user.id, card_name: cardName, note: note || null });

  if (error) return { error: error.message };

  revalidatePath("/community/trading");
}

export async function deleteWant(wantId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("trade_wants").delete().eq("id", wantId);
  if (error) throw new Error(error.message);
  revalidatePath("/community/trading");
}

// Starts (or reuses) a 1:1 conversation with another user via the
// start_conversation RPC — the only way into conversations/
// conversation_participants, since regular users have no insert policy on
// either table (see 0009_trading_forum.sql).
export async function messageUser(otherUserId: string) {
  const supabase = await createClient();
  const { data: conversationId, error } = await supabase.rpc("start_conversation", {
    other_user_id: otherUserId,
  });
  if (error) throw new Error(error.message);

  redirect(`/community/messages/${conversationId}`);
}
