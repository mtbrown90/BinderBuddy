import type { SupabaseClient } from "@supabase/supabase-js";
import { isCurrentUserAdmin } from "@/lib/admin";

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
  // profiles' column-level grant deliberately excludes subscription/billing
  // columns (see get_own_subscription_info() in schema.sql) — a plain
  // .select() for them fails silently for the caller's own client, so this
  // goes through the security-definer RPC instead. It always reflects the
  // signed-in session (auth.uid()), which matches every caller of this
  // function passing their own id anyway.
  const [{ count: ownedCount }, { data: profileRows }, isAdmin] = await Promise.all([
    supabase.from("master_sets").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.rpc("get_own_subscription_info"),
    isCurrentUserAdmin(),
  ]);
  const profile = profileRows?.[0];

  // Admins get full free access everywhere in the Store (see the Stripe
  // checkout routes' own admin bypass); lifetime_free is the equivalent
  // permanent grant for a non-admin account, set by an admin in /admin as
  // an alternative to the beta trial (which still eventually bills).
  const unlimited =
    isAdmin || profile?.lifetime_free === true || UNLIMITED_STATUSES.has(profile?.subscription_status ?? "");
  const owned = ownedCount ?? 0;

  return {
    ownedCount: owned,
    unlimited,
    canCreateFree: unlimited || owned < 1,
    hasBillingHistory: Boolean(profile?.stripe_customer_id),
  };
}
