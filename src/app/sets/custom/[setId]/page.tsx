import Link from "next/link";
import { ChevronLeft, Sparkles, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { CustomCard, CustomSet, CustomVariation } from "@/types";
import NewCardModal from "./NewCardModal";
import CustomCardGrid from "./CustomCardGrid";

export default async function CustomSetDetailPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const supabase = await createClient();

  const [setResult, { data: cards }] = await Promise.all([
    supabase.from("custom_sets").select("*").eq("id", setId).single(),
    supabase
      .from("custom_cards")
      .select("*, custom_variations(*)")
      .eq("custom_set_id", setId)
      .order("created_at", { ascending: true })
      .returns<(CustomCard & { custom_variations: CustomVariation[] })[]>(),
  ]);
  const set = setResult.data as CustomSet | null;

  if (!set) {
    return (
      <div className="text-muted text-sm text-center py-12">Set not found.</div>
    );
  }

  const tiles = (cards ?? []).flatMap((c) =>
    c.custom_variations.map((v) => ({
      variationId: v.id,
      variationType: v.variation_type,
      marketPrice: v.market_price,
      cardName: c.name,
      cardNumber: c.card_number,
      setName: set.name,
      imageUrl: v.image_url ?? c.base_image_url,
    }))
  );

  return (
    <div>
      <Link href="/sets" className="flex items-center gap-1 text-sm text-muted mb-3">
        <ChevronLeft size={15} /> All sets
      </Link>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles size={16} className="text-amber" /> {set.name}
          </h1>
          <p className="text-xs text-muted">
            {set.game}
            {set.publisher ? ` · ${set.publisher}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/sets/custom/${set.id}/import`}
            className="flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-border rounded-full px-3.5 py-1.5"
          >
            <Upload size={14} /> Import Excel
          </Link>
          <NewCardModal customSetId={set.id} />
        </div>
      </div>
      <CustomCardGrid tiles={tiles} />
    </div>
  );
}
