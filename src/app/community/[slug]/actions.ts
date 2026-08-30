"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";

export async function createThread(formData: FormData): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const categoryId = String(formData.get("categoryId"));
  const categorySlug = String(formData.get("categorySlug"));
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) return { error: "Title and body are required." };

  const { data, error } = await supabase
    .from("discussion_threads")
    .insert({ category_id: categoryId, user_id: user.id, title, body })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/community/${categorySlug}`);
  redirect(`/community/${categorySlug}/${data.id}`);
}

// Admin-only moderation — own-thread edits/deletes go through the RLS
// "own or admin" policies directly rather than a dedicated action.
export async function togglePin(threadId: string, categorySlug: string, pinned: boolean) {
  if (!(await isCurrentUserAdmin())) throw new Error("Admins only");
  const supabase = await createClient();
  const { error } = await supabase.from("discussion_threads").update({ is_pinned: pinned }).eq("id", threadId);
  if (error) throw new Error(error.message);
  revalidatePath(`/community/${categorySlug}`);
}

export async function toggleLock(threadId: string, categorySlug: string, locked: boolean) {
  if (!(await isCurrentUserAdmin())) throw new Error("Admins only");
  const supabase = await createClient();
  const { error } = await supabase.from("discussion_threads").update({ is_locked: locked }).eq("id", threadId);
  if (error) throw new Error(error.message);
  revalidatePath(`/community/${categorySlug}/${threadId}`);
}

export async function deleteThread(threadId: string, categorySlug: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("discussion_threads").delete().eq("id", threadId);
  if (error) throw new Error(error.message);
  revalidatePath(`/community/${categorySlug}`);
  redirect(`/community/${categorySlug}`);
}
