"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { CollectionEntry } from "@/types";
import CardTile from "@/components/CardTile";
import EntryDetailModal from "./EntryDetailModal";

export default function CollectionGrid({ entries }: { entries: CollectionEntry[] }) {
  const [open, setOpen] = useState<CollectionEntry | null>(null);

  const groups = new Map<string, CollectionEntry[]>();
  for (const e of entries) {
    const key = e.set_name ?? "Unsorted";
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  return (
    <div className="flex flex-col gap-6">
      {[...groups.entries()].map(([setName, group]) => (
        <div key={setName} className="bg-panel border border-border rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-sm text-muted mb-3">
            <Sparkles size={13} className="text-amber" /> {setName}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {group.map((e) => (
              <CardTile
                key={e.id}
                name={e.card_name}
                imageUrl={e.image_url}
                variationLabel={e.variation_type}
                onClick={() => setOpen(e)}
              />
            ))}
          </div>
        </div>
      ))}
      {open && <EntryDetailModal entry={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
