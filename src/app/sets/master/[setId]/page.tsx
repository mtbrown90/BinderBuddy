import Link from "next/link";
import { ChevronLeft, Sparkles, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import type { MasterSet, MasterSetCard } from "@/types";
import AddCardSearch from "./AddCardSearch";
import MasterSetGrid from "./MasterSetGrid";
import ManualCardForm from "./ManualCardForm";
import DeleteMasterSetButton from "./DeleteMasterSetButton";

export default async function MasterSetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { setId } = await params;
  const { checkout } = await searchParams;
  const supabase = await createClient();

  const [{ data: set }, { data: cards }, { data: entries }, admin] = await Promise.all([
    supabase.from("master_sets").select("*").eq("id", setId).single(),
    supabase
      .from("master_set_cards")
      .select("*")
      .eq("master_set_id", setId)
      .order("card_name", { ascending: true })
      .returns<MasterSetCard[]>(),
    supabase.from("collection_entries").select("external_card_id, variation_type"),
    isCurrentUserAdmin(),
  ]);

  const masterSet = set as MasterSet | null;
  if (!masterSet) {
    return <div className="text-muted text-sm text-center py-12">Master set not found.</div>;
  }

  const ownedKeys = new Set(
    (entries ?? []).map((e) => `${e.external_card_id}::${e.variation_type.toLowerCase()}`)
  );
  const existingCardIds = (cards ?? []).map((c) => c.external_card_id);

  return (
    <div>
      <Link href="/sets" className="flex items-center gap-1 text-sm text-muted mb-3">
        <ChevronLeft size={15} /> All sets
      </Link>

      <div className="flex items-center justify-between mb-1">
        <h1 className="font-semibold text-lg flex items-center gap-2">
          <Sparkles size={16} className="text-amber" /> {masterSet.name}
        </h1>
        <DeleteMasterSetButton masterSetId={setId} />
      </div>
      {masterSet.description && <p className="text-sm text-muted mb-4">{masterSet.description}</p>}

      {checkout === "success" && (
        <div className="bg-panel-2 border border-teal/40 text-sm rounded-xl px-4 py-3 mb-5">
          Payment received — your cards are being added now. Small purchases finish in seconds; a full
          type or artist purchase (hundreds to thousands of cards) can take a few minutes. Refresh to
          check.
        </div>
      )}
      {checkout === "cancelled" && (
        <div className="bg-panel-2 border border-border text-sm text-muted rounded-xl px-4 py-3 mb-5">
          Checkout cancelled — no charge was made.
        </div>
      )}

      <div className="bg-panel border border-border rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Add cards manually</h2>
          <Link
            href="/store"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
          >
            <Store size={13} /> Bulk-add in the Store
          </Link>
        </div>
        <AddCardSearch masterSetId={setId} existingCardIds={existingCardIds} />
        {admin && (
          <div className="mt-3">
            <ManualCardForm masterSetId={setId} />
          </div>
        )}
      </div>

      <h2 className="font-semibold text-lg mb-3">Checklist</h2>
      <MasterSetGrid masterSetId={setId} cards={cards ?? []} ownedKeys={ownedKeys} />
    </div>
  );
}
