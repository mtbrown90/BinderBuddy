"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendMessage(conversationId: string, formData: FormData): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Message can't be empty." };

  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body });
  if (error) return { error: error.message };

  // Sending counts as reading your own conversation up to now.
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  revalidatePath(`/community/messages/${conversationId}`);
  revalidatePath("/community/messages");
}
