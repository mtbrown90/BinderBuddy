"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCustomSet(_prevState: { error?: string } | undefined, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Set name is required" };

  const { data, error } = await supabase
    .from("custom_sets")
    .insert({
      user_id: user.id,
      name,
      game: String(formData.get("game") || "Custom"),
      publisher: String(formData.get("publisher") || "") || null,
      description: String(formData.get("description") || "") || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/sets");
  redirect(`/sets/custom/${data.id}`);
}
