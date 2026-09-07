import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMasterSetLimitInfo } from "@/lib/masterSetLimit";
import NewMasterSetForm from "./NewMasterSetForm";
import MasterSetPaywall from "./MasterSetPaywall";

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
  const limit = user
    ? await getMasterSetLimitInfo(supabase, user.id)
    : {
        ownedCount: 0,
        allowedSlots: 1,
        unlimited: false,
        canCreateMore: false,
        nextSlotPriceCents: 299,
        hasBillingHistory: false,
      };

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

      {limit.canCreateMore ? (
        <NewMasterSetForm />
      ) : (
        <MasterSetPaywall
          ownedCount={limit.ownedCount}
          allowedSlots={limit.allowedSlots}
          nextSlotPriceCents={limit.nextSlotPriceCents}
        />
      )}
    </div>
  );
}
