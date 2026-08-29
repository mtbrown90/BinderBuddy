import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSet, listCardsInSet, cardVariations } from "@/lib/pokemontcg";
import CardGrid from "./CardGrid";

export default async function SetDetailPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;

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

  // One tile per printing, not per card number — a card with both a Normal
  // and a Reverse Holo run shows as two adjacent tiles (same number,
  // different variation badge), matching how they're actually collected.
  const gridCards = cards.flatMap((c) => {
    const variations = cardVariations(c);
    return variations.map((v) => ({
      id: c.id,
      name: c.name,
      number: c.number,
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
      <CardGrid cards={gridCards} />
    </div>
  );
}
