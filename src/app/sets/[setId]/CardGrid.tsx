"use client";

import { useState } from "react";
import CardTile from "@/components/CardTile";
import AddCardModal from "@/components/AddCardModal";

type Variation = { key: string; label: string; marketPrice: number | null };
type GridTile = {
  id: string;
  name: string;
  number: string;
  setName: string;
  imageUrl: string;
  variations: Variation[];
  variationKey: string;
  variationLabel: string;
};

export default function CardGrid({ cards }: { cards: GridTile[] }) {
  const [open, setOpen] = useState<GridTile | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <CardTile
            key={`${c.id}-${c.variationKey}`}
            name={c.name}
            imageUrl={c.imageUrl}
            subtitle={`#${c.number}`}
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
