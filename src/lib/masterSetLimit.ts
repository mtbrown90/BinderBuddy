import type { SupabaseClient } from "@supabase/supabase-js";
import { autoPopulatePriceCents } from "@/lib/pricing";

// Statuses that count as "unlimited access" — everything else (past_due,
// canceled, unpaid, incomplete_expired, ...) falls back to the slot count.
// A lapsed past_due subscription that later recovers flips back to
// "active" automatically via the webhook, so no grace-period logic here.
const UNLIMITED_STATUSES = new Set(["active", "trialing"]);

export type MasterSetLimitInfo = {
  ownedCount: number;
  allowedSlots: number;
  unlimited: boolean;
  canCreateMore: boolean;
  // Price for the NEXT slot purchase — reuses the same tier curve as
  // Store's Pokémon-name auto-populate (1st=$2.99, 2nd=$4.99, 3rd=$5.99,
  // 4th+ = +$1.00 each), just indexed by "which slot is this" instead of
  // "how many names in this purchase."
  nextSlotPriceCents: number;
  // Has a Stripe customer on file, even if the subscription has since
  // lapsed — used to still show a "Manage subscription" link.
  hasBillingHistory: boolean;
};

export async function getMasterSetLimitInfo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<MasterSetLimitInfo> {
  const [{ count: ownedCount }, { data: profile }, { count: purchasedSlots }] = await Promise.all([
    supabase.from("master_sets").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("profiles").select("subscription_status, stripe_customer_id").eq("id", userId).single(),
    supabase
      .from("masterset_slot_purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
  ]);

  const unlimited = UNLIMITED_STATUSES.has(profile?.subscription_status ?? "");
  const slots = purchasedSlots ?? 0;
  const allowedSlots = 1 + slots;
  const owned = ownedCount ?? 0;

  return {
    ownedCount: owned,
    allowedSlots,
    unlimited,
    canCreateMore: unlimited || owned < allowedSlots,
    nextSlotPriceCents: autoPopulatePriceCents(slots + 1),
    hasBillingHistory: Boolean(profile?.stripe_customer_id),
  };
}
