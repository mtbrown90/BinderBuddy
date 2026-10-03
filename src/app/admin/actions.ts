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

// Grants (or revokes) eligibility for the beta free-trial period on the
// unlimited-master-sets subscription — read by create-subscription-checkout
// at the moment they actually subscribe, not enforced here. Unlike
// restrict/ban, self-action is allowed (an admin testing the subscribe
// flow on their own account is a normal thing to want, not a mistake to
// guard against).
export async function toggleBetaTrialEligible(userId: string, eligible: boolean) {
  if (!(await isCurrentUserAdmin())) throw new Error("Admins only");

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ beta_trial_eligible: eligible }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

// Permanent, no-billing unlimited access — an alternative to the beta
// trial above rather than a step toward one: granting this takes effect
// immediately (read by getMasterSetLimitInfo), there's no checkout and
// nothing ever bills. Self-action allowed, same reasoning as the trial.
export async function toggleLifetimeFree(userId: string, enabled: boolean) {
  if (!(await isCurrentUserAdmin())) throw new Error("Admins only");

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ lifetime_free: enabled }).eq("id", userId);
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
