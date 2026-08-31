"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin";

async function requireAdminNotActingOnSelf(targetUserId: string) {
  if (!(await isCurrentUserAdmin())) throw new Error("Admins only");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === targetUserId) {
    throw new Error("You can't do this to your own account.");
  }
}

export async function toggleRestricted(userId: string, restricted: boolean) {
  await requireAdminNotActingOnSelf(userId);

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_restricted: restricted }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

// Uses Supabase Auth's native ban mechanism — enforced at the session
// layer (a banned user can't sign in or refresh a session at all), not
// just an app-code convention. There's no literal "forever" duration, so
// ~100 years stands in for permanent.
export async function toggleBan(userId: string, banned: boolean) {
  await requireAdminNotActingOnSelf(userId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}
