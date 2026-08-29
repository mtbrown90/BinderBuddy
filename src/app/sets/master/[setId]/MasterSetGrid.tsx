"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import CardTile from "@/components/CardTile";
import AddCardModal from "@/components/AddCardModal";
import type { MasterSetCard } from "@/types";
import { removeCardFromMasterSet } from "./actions";

type Variation = { key: string; label: string; marketPrice: number | null };
type FullCard = { id: string; name: string; setName: string; imageUrl: string; variations: Variation[] };

function ownedKey(externalCardId: string, variationType: string) {
  return `${externalCardId}::${variationType.toLowerCase()}`;
}

export default function MasterSetGrid({
  masterSetId,
  cards,
  ownedKeys,
}: {
  masterSetId: string;
  cards: MasterSetCard[];
  ownedKeys: Set<string>;
}) {
  const [open, setOpen] = useState<FullCard | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (cards.length === 0) {
    return (
      <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
        No cards in this checklist yet — search above to add some, or auto-populate it below.
      </div>
    );
  }

  const isOwned = (c: MasterSetCard) => ownedKeys.has(ownedKey(c.external_card_id, c.variation_type));
  const owned = cards.filter(isOwned);
  const missing = cards.filter((c) => !isOwned(c));

  function remove(id: string) {
    startTransition(() => removeCardFromMasterSet(id, masterSetId));
  }

  async function openCard(c: MasterSetCard) {
    // Manual (admin-added) cards aren't in pokemontcg.io — use the
    // snapshot already stored on the checklist row instead of the API.
    if (c.external_source === "manual") {
      setOpen({
        id: c.external_card_id,
        name: c.card_name,
        setName: c.set_name ?? "",
        imageUrl: c.image_url ?? "",
        variations: [{ key: "manual", label: c.variation_type, marketPrice: c.market_price }],
      });
      return;
    }

    setLoadingId(c.id);
    const full = await fetch(`/api/card/${encodeURIComponent(c.external_card_id)}`)
      .then((r) => r.json())
      .catch(() => null);
    setLoadingId(null);

    if (full && !full.error) {
      const variations: Variation[] = [...full.variations];
      const idx = variations.findIndex((v) => v.label.toLowerCase() === c.variation_type.toLowerCase());
      if (idx > 0) {
        const [match] = variations.splice(idx, 1);
        variations.unshift(match);
      }
      setOpen({ ...full, variations });
    } else {
      setOpen({
        id: c.external_card_id,
        name: c.card_name,
        setName: c.set_name ?? "",
        imageUrl: c.image_url ?? "",
        variations: [{ key: "normal", label: c.variation_type, marketPrice: null }],
      });
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted">
          {owned.length} / {cards.length} owned
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {[...missing, ...owned].map((c) => (
          <div key={c.id} className="relative group">
            <CardTile
              name={c.card_name}
              imageUrl={c.image_url}
              subtitle={c.set_name ?? undefined}
              variationLabel={loadingId === c.id ? "Loading…" : c.variation_type}
              owned={isOwned(c)}
              onClick={() => openCard(c)}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                remove(c.id);
              }}
              disabled={pending}
              className="absolute top-1 left-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100"
              title="Remove from checklist"
            >
              <X size={12} className="text-ink" />
            </button>
          </div>
        ))}
      </div>
      {open && <AddCardModal card={open} onClose={() => setOpen(null)} />}
    </>
  );
}
