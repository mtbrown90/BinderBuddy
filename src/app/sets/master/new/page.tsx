import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listSets } from "@/lib/pokemontcg";
import { getMasterSetLimitInfo } from "@/lib/masterSetLimit";
import SubscriptionPanel from "@/components/SubscriptionPanel";
import type { MasterSet } from "@/types";
import NewMasterSetForm from "./NewMasterSetForm";
import PurchaseMasterSetForm from "./PurchaseMasterSetForm";

export default async function NewMasterSetPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [limit, { data: masterSets }, officialSets] = await Promise.all([
    user
      ? getMasterSetLimitInfo(supabase, user.id)
      : Promise.resolve({ ownedCount: 0, unlimited: false, canCreateFree: false, hasBillingHistory: false }),
    supabase.from("master_sets").select("*").order("name", { ascending: true }).returns<MasterSet[]>(),
    listSets().catch(() => []),
  ]);

  return (
    <div>
      <Link href="/sets" className="flex items-center gap-1 text-sm text-muted mb-4">
        <ChevronLeft size={15} /> All sets
      </Link>
      <h1 className="font-semibold text-lg mb-1">New master set</h1>
      <p className="text-sm text-muted mb-4">
        A checklist of real cards you curate yourself — e.g. every printing of a Pokémon across every set.
      </p>

      {checkout === "success" && (
        <div className="bg-panel-2 border border-teal/40 text-sm rounded-xl px-4 py-3 mb-5">
          Payment received — refresh in a moment if this page doesn&apos;t already reflect it.
        </div>
      )}
      {checkout === "cancelled" && (
        <div className="bg-panel-2 border border-border text-sm text-muted rounded-xl px-4 py-3 mb-5">
          Checkout cancelled — no charge was made.
        </div>
      )}

      <div className="flex flex-col gap-5">
        <div className="bg-panel border border-border rounded-2xl p-5">
          <h2 className="font-semibold text-sm mb-3">1. Start free</h2>
          {limit.canCreateFree ? (
            <NewMasterSetForm />
          ) : (
            <p className="text-sm text-muted">
              You&apos;ve already used your one free master set ({limit.ownedCount} owned).
            </p>
          )}
        </div>

        <div className="bg-panel border border-border rounded-2xl p-5">
          <h2 className="font-semibold text-sm mb-3">2. Purchase — buy as many as you want</h2>
          <PurchaseMasterSetForm
            masterSets={masterSets ?? []}
            officialSets={officialSets.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>

        <div className="bg-panel border border-teal/40 rounded-2xl p-5">
          <h2 className="flex items-center gap-1.5 font-semibold text-sm mb-3">
            <Sparkles size={14} className="text-teal" /> 3. Subscribe for unlimited
          </h2>
          <SubscriptionPanel unlimited={limit.unlimited} hasBillingHistory={limit.hasBillingHistory} />
        </div>
      </div>
    </div>
  );
}
