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

function cardSubtitle(c: MasterSetCard) {
  const number = c.card_number ? `#${c.card_number}${c.set_printed_total ? `/${c.set_printed_total}` : ""}` : null;
  return [c.set_name, number].filter(Boolean).join(" · ") || undefined;
}

type SortOption = "name" | "number" | "price";

function sortCards(list: MasterSetCard[], sort: SortOption) {
  const withIndex = list.map((c, i) => ({ c, i }));
  withIndex.sort((a, b) => {
    if (sort === "number") {
      const na = Number(a.c.card_number);
      const nb = Number(b.c.card_number);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb || a.i - b.i;
      return (a.c.card_number ?? "").localeCompare(b.c.card_number ?? "") || a.i - b.i;
    }
    if (sort === "price") {
      const pa = a.c.market_price;
      const pb = b.c.market_price;
      if (pa == null && pb == null) return a.i - b.i;
      if (pa == null) return 1;
      if (pb == null) return -1;
      return pb - pa || a.i - b.i;
    }
    return a.c.card_name.localeCompare(b.c.card_name) || a.i - b.i;
  });
  return withIndex.map(({ c }) => c);
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
  const [sort, setSort] = useState<SortOption>("name");

  if (cards.length === 0) {
    return (
      <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
        No cards in this checklist yet — search above to add some, or auto-populate it below.
      </div>
    );
  }

  const isOwned = (c: MasterSetCard) => ownedKeys.has(ownedKey(c.external_card_id, c.variation_type));
  const owned = sortCards(cards.filter(isOwned), sort);
  const missing = sortCards(cards.filter((c) => !isOwned(c)), sort);

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
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink"
        >
          <option value="name">Sort: Name (A–Z)</option>
          <option value="number">Sort: Card number</option>
          <option value="price">Sort: Price (high–low)</option>
        </select>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {[...missing, ...owned].map((c) => (
          <div key={c.id} className="relative group">
            <CardTile
              name={c.card_name}
              imageUrl={c.image_url}
              subtitle={cardSubtitle(c)}
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
