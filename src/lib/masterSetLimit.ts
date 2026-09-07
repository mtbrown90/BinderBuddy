import type { SupabaseClient } from "@supabase/supabase-js";

// Statuses that count as "unlimited access" — everything else (past_due,
// canceled, unpaid, incomplete_expired, ...) falls back to the free-tier
// limit. A lapsed past_due subscription that later recovers flips back to
// "active" automatically via the webhook, so no grace-period logic here.
const UNLIMITED_STATUSES = new Set(["active", "trialing"]);

export type MasterSetLimitInfo = {
  ownedCount: number;
  unlimited: boolean;
  // The free simple-create form is only for the first master set — beyond
  // that (unless subscribed), a new one always goes through the existing
  // paid auto-populate purchase in Store, which has no cap of its own
  // ("buy as many as you want").
  canCreateFree: boolean;
  // Has a Stripe customer on file, even if the subscription has since
  // lapsed — used to still show a "Manage subscription" link.
  hasBillingHistory: boolean;
};

export async function getMasterSetLimitInfo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<MasterSetLimitInfo> {
  const [{ count: ownedCount }, { data: profile }] = await Promise.all([
    supabase.from("master_sets").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("profiles").select("subscription_status, stripe_customer_id").eq("id", userId).single(),
  ]);

  const unlimited = UNLIMITED_STATUSES.has(profile?.subscription_status ?? "");
  const owned = ownedCount ?? 0;

  return {
    ownedCount: owned,
    unlimited,
    canCreateFree: unlimited || owned < 1,
    hasBillingHistory: Boolean(profile?.stripe_customer_id),
  };
}
