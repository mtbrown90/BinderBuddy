"use client";

import { useState, useTransition } from "react";
import { RefreshCw, X } from "lucide-react";
import CardTile from "@/components/CardTile";
import AddCardModal from "@/components/AddCardModal";
import type { MasterSetCard } from "@/types";
import { setIdentityLabel } from "@/lib/collectionGroups";
import { refreshMasterSetPrices, removeCardFromMasterSet } from "./actions";

type Variation = { key: string; label: string; marketPrice: number | null };
type FullCard = {
  id: string;
  name: string;
  number?: string;
  printedTotal?: number;
  setName: string;
  imageUrl: string;
  variations: Variation[];
};

function ownedKey(externalCardId: string, variationType: string) {
  return `${externalCardId}::${variationType.toLowerCase()}`;
}

type SortOption = "name-asc" | "name-desc" | "number-asc" | "number-desc" | "price-desc" | "price-asc";
type OwnedFilter = "all" | "owned" | "unowned";

function sortCards(list: MasterSetCard[], sort: SortOption) {
  const withIndex = list.map((c, i) => ({ c, i }));
  withIndex.sort((a, b) => {
    switch (sort) {
      case "number-asc":
      case "number-desc": {
        const na = Number(a.c.card_number);
        const nb = Number(b.c.card_number);
        const cmp =
          !Number.isNaN(na) && !Number.isNaN(nb)
            ? na - nb
            : (a.c.card_number ?? "").localeCompare(b.c.card_number ?? "");
        return (sort === "number-desc" ? -cmp : cmp) || a.i - b.i;
      }
      case "price-desc":
      case "price-asc": {
        const pa = a.c.market_price;
        const pb = b.c.market_price;
        if (pa == null && pb == null) return a.i - b.i;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return (sort === "price-desc" ? pb - pa : pa - pb) || a.i - b.i;
      }
      case "name-desc":
        return b.c.card_name.localeCompare(a.c.card_name) || a.i - b.i;
      default: // "name-asc"
        return a.c.card_name.localeCompare(b.c.card_name) || a.i - b.i;
    }
  });
  return withIndex.map(({ c }) => c);
}

export default function MasterSetGrid({
  masterSetId,
  cards,
  ownedKeys,
  ownedValues,
  ownedPaid,
  searchQuery = "",
}: {
  masterSetId: string;
  cards: MasterSetCard[];
  ownedKeys: Set<string>;
  ownedValues: Record<string, number>;
  ownedPaid: Record<string, number>;
  searchQuery?: string;
}) {
  const [open, setOpen] = useState<FullCard | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sort, setSort] = useState<SortOption>("name-asc");
  const [ownedFilter, setOwnedFilter] = useState<OwnedFilter>("all");
  const [refreshPending, startRefresh] = useTransition();
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  function handleRefreshPrices() {
    setRefreshMessage(null);
    startRefresh(async () => {
      const result = await refreshMasterSetPrices(masterSetId);
      setRefreshMessage(
        "error" in result
          ? `Couldn't refresh prices: ${result.error}`
          : `Refreshed ${result.updated} price${result.updated === 1 ? "" : "s"}.`
      );
    });
  }

  if (cards.length === 0) {
    return (
      <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
        No cards in this checklist yet — search above to add some, or auto-populate it below.
      </div>
    );
  }

  const isOwned = (c: MasterSetCard) => ownedKeys.has(ownedKey(c.external_card_id, c.variation_type));
  const totalOwned = cards.filter(isOwned).length;
  const ownedValue = cards
    .filter(isOwned)
    .reduce((s, c) => s + (ownedValues[ownedKey(c.external_card_id, c.variation_type)] ?? 0), 0);
  const costToComplete = cards
    .filter((c) => !isOwned(c))
    .reduce((s, c) => s + (Number(c.market_price) || 0), 0);
  const searched = searchQuery.trim()
    ? cards.filter((c) => c.card_name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : cards;
  const visible =
    ownedFilter === "owned"
      ? searched.filter(isOwned)
      : ownedFilter === "unowned"
        ? searched.filter((c) => !isOwned(c))
        : searched;
  const owned = sortCards(visible.filter(isOwned), sort);
  const missing = sortCards(visible.filter((c) => !isOwned(c)), sort);

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
        number: c.card_number ?? undefined,
        printedTotal: c.set_printed_total ?? undefined,
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
        number: c.card_number ?? undefined,
        printedTotal: c.set_printed_total ?? undefined,
        setName: c.set_name ?? "",
        imageUrl: c.image_url ?? "",
        variations: [{ key: "normal", label: c.variation_type, marketPrice: null }],
      });
    }
  }

  return (
    <>
      <p className="text-xs text-muted mb-2">
        Owned: {totalOwned}/{cards.length} · Owned value: ${ownedValue.toFixed(2)} · Cost to complete: $
        {costToComplete.toFixed(2)}
      </p>
      <div className="flex items-center justify-end mb-2">
        <div className="flex flex-wrap gap-2">
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
            <option value="name-asc">Sort: Name (A–Z)</option>
            <option value="name-desc">Sort: Name (Z–A)</option>
            <option value="number-asc">Sort: Card number (low–high)</option>
            <option value="number-desc">Sort: Card number (high–low)</option>
            <option value="price-desc">Sort: Price (high–low)</option>
            <option value="price-asc">Sort: Price (low–high)</option>
          </select>
          <button
            type="button"
            onClick={handleRefreshPrices}
            disabled={refreshPending}
            title="Re-fetch live prices for every card in this checklist — useful if prices look missing or out of date"
            className="flex items-center gap-1.5 bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink disabled:opacity-60"
          >
            <RefreshCw size={12} className={refreshPending ? "animate-spin" : ""} />
            {refreshPending ? "Refreshing…" : "Refresh prices"}
          </button>
        </div>
      </div>
      {refreshMessage && <p className="text-xs text-muted mb-2 text-right">{refreshMessage}</p>}
      {owned.length + missing.length === 0 ? (
        <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
          {ownedFilter === "owned" ? "You don't own any cards from this checklist yet." : "No cards match."}
        </div>
      ) : (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {[...missing, ...owned].map((c) => (
          <div key={c.id} className="relative group">
            <CardTile
              name={c.card_name}
              imageUrl={c.image_url}
              setInfoLabel={setIdentityLabel(c)}
              variationLabel={loadingId === c.id ? "Loading…" : c.variation_type}
              priceLabel={c.market_price != null ? `$${Number(c.market_price).toFixed(2)}` : null}
              secondaryLabel={
                isOwned(c) && ownedPaid[ownedKey(c.external_card_id, c.variation_type)] > 0
                  ? `Paid $${ownedPaid[ownedKey(c.external_card_id, c.variation_type)].toFixed(2)}`
                  : null
              }
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
      )}
      {open && <AddCardModal card={open} onClose={() => setOpen(null)} />}
    </>
  );
}
