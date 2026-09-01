import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import type { MasterSet, MasterSetCard, MastersetPdfPurchase } from "@/types";
import PdfDownloadLinks from "@/components/PdfDownloadLinks";
import MasterSetClient from "./MasterSetClient";
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

  const [{ data: set }, { data: cards }, { data: entries }, { data: pdfPurchases }, admin] = await Promise.all([
    supabase.from("master_sets").select("*").eq("id", setId).single(),
    supabase
      .from("master_set_cards")
      .select("*")
      .eq("master_set_id", setId)
      .order("card_name", { ascending: true })
      .returns<MasterSetCard[]>(),
    supabase.from("collection_entries").select("external_card_id, variation_type, market_price, quantity"),
    supabase
      .from("masterset_pdf_purchases")
      .select("*")
      .eq("master_set_id", setId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .returns<MastersetPdfPurchase[]>(),
    isCurrentUserAdmin(),
  ]);

  const masterSet = set as MasterSet | null;
  if (!masterSet) {
    return <div className="text-muted text-sm text-center py-12">Master set not found.</div>;
  }

  const ownedKeys = new Set(
    (entries ?? []).map((e) => `${e.external_card_id}::${e.variation_type.toLowerCase()}`)
  );
  // Same "value of what you own" math as the Dashboard — each entry's own
  // stored market_price (snapshotted at add time) times quantity.
  const ownedValues: Record<string, number> = {};
  for (const e of entries ?? []) {
    const key = `${e.external_card_id}::${e.variation_type.toLowerCase()}`;
    ownedValues[key] = (ownedValues[key] ?? 0) + (Number(e.market_price) || 0) * e.quantity;
  }
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
          Payment received — for an auto-populate purchase, your cards are being added now (small
          purchases finish in seconds; a full type or artist purchase can take a few minutes). For a
          placeholder PDF, your download will appear below shortly. Refresh to check.
        </div>
      )}
      {checkout === "cancelled" && (
        <div className="bg-panel-2 border border-border text-sm text-muted rounded-xl px-4 py-3 mb-5">
          Checkout cancelled — no charge was made.
        </div>
      )}

      <PdfDownloadLinks purchases={pdfPurchases ?? []} />

      <MasterSetClient
        masterSetId={setId}
        cards={cards ?? []}
        existingCardIds={existingCardIds}
        ownedKeys={ownedKeys}
        ownedValues={ownedValues}
        admin={admin}
      />
    </div>
  );
}
