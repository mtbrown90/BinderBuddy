"use client";

import { useState } from "react";
import CardTile from "@/components/CardTile";
import AddCustomVariationModal from "./AddCustomVariationModal";

type Tile = {
  variationId: string;
  variationType: string;
  marketPrice: number | null;
  cardName: string;
  cardNumber: string | null;
  setName: string;
  imageUrl: string | null;
};

export default function CustomCardGrid({ tiles }: { tiles: Tile[] }) {
  const [open, setOpen] = useState<Tile | null>(null);

  if (tiles.length === 0) {
    return (
      <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
        No cards yet — add one to get started.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <CardTile
            key={t.variationId}
            name={t.cardName}
            imageUrl={t.imageUrl}
            subtitle={t.cardNumber ?? undefined}
            variationLabel={t.variationType}
            onClick={() => setOpen(t)}
          />
        ))}
      </div>
      {open && <AddCustomVariationModal entry={open} onClose={() => setOpen(null)} />}
    </>
  );
}
