"use client";

import { useMemo, useState } from "react";
import CardTile from "@/components/CardTile";
import AddCardModal from "@/components/AddCardModal";

type Variation = { key: string; label: string; marketPrice: number | null };
type GridTile = {
  id: string;
  name: string;
  number: string;
  printedTotal: number;
  setName: string;
  imageUrl: string;
  variations: Variation[];
  variationKey: string;
  variationLabel: string;
};

type SortOption = "number" | "name" | "price";

function tilePrice(c: GridTile) {
  return c.variations.find((v) => v.key === c.variationKey)?.marketPrice ?? null;
}

export default function CardGrid({ cards }: { cards: GridTile[] }) {
  const [open, setOpen] = useState<GridTile | null>(null);
  const [sort, setSort] = useState<SortOption>("number");

  const sorted = useMemo(() => {
    const withIndex = cards.map((c, i) => ({ c, i }));
    withIndex.sort((a, b) => {
      if (sort === "name") return a.c.name.localeCompare(b.c.name) || a.i - b.i;
      if (sort === "price") {
        const pa = tilePrice(a.c);
        const pb = tilePrice(b.c);
        if (pa == null && pb == null) return a.i - b.i;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return pb - pa || a.i - b.i;
      }
      return a.i - b.i; // "number" — cards already arrive in set-number order
    });
    return withIndex.map(({ c }) => c);
  }, [cards, sort]);

  return (
    <>
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as SortOption)}
        className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink mb-3"
      >
        <option value="number">Sort: Card number</option>
        <option value="name">Sort: Name (A–Z)</option>
        <option value="price">Sort: Price (high–low)</option>
      </select>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {sorted.map((c) => (
          <CardTile
            key={`${c.id}-${c.variationKey}`}
            name={c.name}
            imageUrl={c.imageUrl}
            subtitle={`#${c.number}/${c.printedTotal}`}
            variationLabel={c.variationLabel}
            onClick={() => setOpen(c)}
          />
        ))}
      </div>
      {open && (
        <AddCardModal card={open} initialVariationKey={open.variationKey} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
