"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createReply(formData: FormData): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const threadId = String(formData.get("threadId"));
  const categorySlug = String(formData.get("categorySlug"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Reply can't be empty." };

  const { error } = await supabase.from("discussion_replies").insert({ thread_id: threadId, user_id: user.id, body });
  if (error) return { error: error.message };

  revalidatePath(`/community/${categorySlug}/${threadId}`);
}

export async function deleteReply(replyId: string, categorySlug: string, threadId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("discussion_replies").delete().eq("id", replyId);
  if (error) throw new Error(error.message);
  revalidatePath(`/community/${categorySlug}/${threadId}`);
}
