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

type SortOption = "number-asc" | "number-desc" | "name-asc" | "name-desc" | "price-desc" | "price-asc";
type OwnedFilter = "all" | "owned" | "unowned";

function tilePrice(c: GridTile) {
  return c.variations.find((v) => v.key === c.variationKey)?.marketPrice ?? null;
}

export default function CardGrid({ cards, ownedKeys }: { cards: GridTile[]; ownedKeys: Set<string> }) {
  const [open, setOpen] = useState<GridTile | null>(null);
  const [sort, setSort] = useState<SortOption>("number-asc");
  const [ownedFilter, setOwnedFilter] = useState<OwnedFilter>("all");

  const isOwned = (c: GridTile) => ownedKeys.has(`${c.id}::${c.variationLabel.toLowerCase()}`);

  const sorted = useMemo(() => {
    const filtered = cards.filter((c) => {
      if (ownedFilter === "owned") return isOwned(c);
      if (ownedFilter === "unowned") return !isOwned(c);
      return true;
    });
    const withIndex = filtered.map((c, i) => ({ c, i }));
    withIndex.sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.c.name.localeCompare(b.c.name) || a.i - b.i;
        case "name-desc":
          return b.c.name.localeCompare(a.c.name) || a.i - b.i;
        case "price-desc":
        case "price-asc": {
          const pa = tilePrice(a.c);
          const pb = tilePrice(b.c);
          if (pa == null && pb == null) return a.i - b.i;
          if (pa == null) return 1;
          if (pb == null) return -1;
          return (sort === "price-desc" ? pb - pa : pa - pb) || a.i - b.i;
        }
        case "number-desc":
          return b.i - a.i;
        default: // "number-asc" — cards already arrive in set-number order
          return a.i - b.i;
      }
    });
    return withIndex.map(({ c }) => c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, sort, ownedFilter, ownedKeys]);

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={ownedFilter}
          onChange={(e) => setOwnedFilter(e.target.value as OwnedFilter)}
          className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink"
        >
          <option value="all">All cards</option>
          <option value="owned">Owned only</option>
          <option value="unowned">Unowned only</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink"
        >
          <option value="number-asc">Sort: Card number (low–high)</option>
          <option value="number-desc">Sort: Card number (high–low)</option>
          <option value="name-asc">Sort: Name (A–Z)</option>
          <option value="name-desc">Sort: Name (Z–A)</option>
          <option value="price-desc">Sort: Price (high–low)</option>
          <option value="price-asc">Sort: Price (low–high)</option>
        </select>
      </div>
      {sorted.length === 0 ? (
        <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
          {ownedFilter === "owned" ? "You don't own any cards from this set yet." : "No cards match."}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {sorted.map((c) => (
            <CardTile
              key={`${c.id}-${c.variationKey}`}
              name={c.name}
              imageUrl={c.imageUrl}
              subtitle={`#${c.number}/${c.printedTotal}`}
              variationLabel={c.variationLabel}
              owned={isOwned(c)}
              onClick={() => setOpen(c)}
            />
          ))}
        </div>
      )}
      {open && (
        <AddCardModal card={open} initialVariationKey={open.variationKey} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
