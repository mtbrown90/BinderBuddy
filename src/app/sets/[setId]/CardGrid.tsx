"use client";

import { useState } from "react";
import CardTile from "@/components/CardTile";
import AddCardModal from "./AddCardModal";

type Variation = { key: string; label: string; marketPrice: number | null };
type GridCard = {
  id: string;
  name: string;
  number: string;
  setName: string;
  imageUrl: string;
  variations: Variation[];
};

export default function CardGrid({ cards }: { cards: GridCard[] }) {
  const [open, setOpen] = useState<GridCard | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <CardTile
            key={c.id}
            name={c.name}
            imageUrl={c.imageUrl}
            subtitle={`#${c.number}`}
            onClick={() => setOpen(c)}
          />
        ))}
      </div>
      {open && <AddCardModal card={open} onClose={() => setOpen(null)} />}
    </>
  );
}
