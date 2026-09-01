import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSet, listCardsInSet, cardVariations } from "@/lib/pokemontcg";
import { createClient } from "@/lib/supabase/server";
import type { MastersetPdfPurchase } from "@/types";
import PdfDownloadLinks from "@/components/PdfDownloadLinks";
import CardGrid from "./CardGrid";

export default async function SetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { setId } = await params;
  const { checkout } = await searchParams;
  const supabase = await createClient();

  let set, cards;
  try {
    [set, cards] = await Promise.all([getSet(setId), listCardsInSet(setId)]);
  } catch {
    return (
      <div>
        <Link href="/sets" className="flex items-center gap-1 text-sm text-muted mb-3">
          <ChevronLeft size={15} /> All sets
        </Link>
        <div className="text-muted text-sm text-center py-12 bg-panel border border-border rounded-2xl">
          Couldn&apos;t load this set from the Pokémon TCG API right now — it may be temporarily down.
          Try again in a moment.
        </div>
      </div>
    );
  }

  const [{ data: entries }, { data: pdfPurchases }] = await Promise.all([
    supabase
      .from("collection_entries")
      .select("external_card_id, variation_type, market_price, quantity"),
    supabase
      .from("masterset_pdf_purchases")
      .select("*")
      .eq("official_set_id", setId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .returns<MastersetPdfPurchase[]>(),
  ]);
  const ownedKeys = new Set(
    (entries ?? []).map((e) => `${e.external_card_id}::${e.variation_type.toLowerCase()}`)
  );
  // Sums to the same "value of what you own" figure the Dashboard shows,
  // just scoped to this set — same source (each entry's own stored
  // market_price, snapshotted at add time) and the same market_price *
  // quantity math, so a card counts its full value once per copy owned.
  const ownedValues: Record<string, number> = {};
  for (const e of entries ?? []) {
    const key = `${e.external_card_id}::${e.variation_type.toLowerCase()}`;
    ownedValues[key] = (ownedValues[key] ?? 0) + (Number(e.market_price) || 0) * e.quantity;
  }

  // One tile per printing, not per card number — a card with both a Normal
  // and a Reverse Holo run shows as two adjacent tiles (same number,
  // different variation badge), matching how they're actually collected.
  const gridCards = cards.flatMap((c) => {
    const variations = cardVariations(c);
    return variations.map((v) => ({
      id: c.id,
      name: c.name,
      number: c.number,
      printedTotal: set.printedTotal,
      setName: set.name,
      imageUrl: c.images.small,
      variations,
      variationKey: v.key,
      variationLabel: v.label,
    }));
  });

  return (
    <div>
      <Link href="/sets" className="flex items-center gap-1 text-sm text-muted mb-3">
        <ChevronLeft size={15} /> All sets
      </Link>
      <div className="flex items-center gap-3 mb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={set.images.logo} alt={set.name} className="h-9 object-contain" />
        <div>
          <h1 className="font-semibold text-lg leading-tight">{set.name}</h1>
          <p className="text-xs text-muted">
            {gridCards.length} cards ({set.total} numbers) · {set.releaseDate}
          </p>
        </div>
      </div>

      {checkout === "success" && (
        <div className="bg-panel-2 border border-teal/40 text-sm rounded-xl px-4 py-3 mb-5">
          Payment received — your placeholder PDF download will appear below shortly. Refresh to check.
        </div>
      )}
      {checkout === "cancelled" && (
        <div className="bg-panel-2 border border-border text-sm text-muted rounded-xl px-4 py-3 mb-5">
          Checkout cancelled — no charge was made.
        </div>
      )}

      <PdfDownloadLinks purchases={pdfPurchases ?? []} />

      <CardGrid cards={gridCards} ownedKeys={ownedKeys} ownedValues={ownedValues} />
    </div>
  );
}
