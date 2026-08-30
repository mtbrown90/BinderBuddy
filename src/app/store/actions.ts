"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Creates a master set and returns its id without redirecting — used when
// a purchase form's "create new master set" option is chosen, so the new
// set can be created and immediately used as the checkout target in one
// flow instead of requiring a separate trip to /sets/master/new first.
export async function createMasterSetForPurchase(
  name: string
): Promise<{ id: string } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Enter a name for the new master set" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("master_sets")
    .insert({ user_id: user.id, name: trimmed })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create master set" };

  revalidatePath("/sets");
  revalidatePath("/store");
  return { id: data.id };
}
