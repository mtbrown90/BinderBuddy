"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMasterSetLimitInfo } from "@/lib/masterSetLimit";

export async function createMasterSet(_prevState: { error?: string } | undefined, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Set name is required" };

  // The page itself hides this form once the limit is hit — this is the
  // real gate, since the client can't be trusted to enforce it honestly.
  const limit = await getMasterSetLimitInfo(supabase, user.id);
  if (!limit.canCreateMore) {
    return { error: "You've reached your master set limit — buy another slot or subscribe for unlimited." };
  }

  const { data, error } = await supabase
    .from("master_sets")
    .insert({
      user_id: user.id,
      name,
      description: String(formData.get("description") || "") || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/sets");
  redirect(`/sets/master/${data.id}`);
}
