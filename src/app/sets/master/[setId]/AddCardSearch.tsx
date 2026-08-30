"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Plus, Check } from "lucide-react";
import { addCardToMasterSet } from "./actions";

type CardResult = {
  id: string;
  name: string;
  number: string;
  setName: string;
  imageUrl: string;
};

export type SearchMode = "search" | "add";

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function AddCardSearch({
  masterSetId,
  existingCardIds,
  mode,
  onModeChange,
  query,
  onQueryChange,
}: {
  masterSetId: string;
  existingCardIds: string[];
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const debouncedQuery = useDebounced(query.trim(), 350);
  const searching = mode === "add" && debouncedQuery.length >= 2;

  const [results, setResults] = useState<CardResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      const cards = await fetch(`/api/search-cards?q=${encodeURIComponent(debouncedQuery)}`)
        .then((r) => r.json())
        .then((d) => (d.cards ?? []) as CardResult[])
        .catch(() => []);
      if (cancelled) return;
      setResults(cards);
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, searching]);

  function handleAdd(card: CardResult) {
    const formData = new FormData();
    formData.set("masterSetId", masterSetId);
    formData.set("cardId", card.id);
    startTransition(async () => {
      await addCardToMasterSet(formData);
      setJustAdded((prev) => new Set(prev).add(card.id));
    });
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={mode === "search" ? "Search cards in this checklist…" : "Search official cards to add…"}
            className="w-full bg-panel-2 border border-border rounded-full pl-9 pr-4 py-2 text-sm text-ink placeholder:text-muted"
          />
        </div>
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as SearchMode)}
          className="bg-panel-2 border border-border rounded-full px-3 py-2 text-xs text-ink"
        >
          <option value="add">Add a new card</option>
          <option value="search">Search within set</option>
        </select>
      </div>
      {mode === "add" && (
        <p className="text-[11px] text-muted -mt-2 mb-3">
          Adding a card adds every known printing of it (Normal, Holofoil, etc.) as separate checklist items.
        </p>
      )}
      {mode === "search" && (
        <p className="text-[11px] text-muted -mt-2 mb-3">Filtering the checklist below as you type.</p>
      )}

      {searching && (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="text-muted text-sm text-center py-4">Searching…</div>
          ) : results.length === 0 ? (
            <div className="text-muted text-sm text-center py-4">No cards found.</div>
          ) : (
            results.map((c) => {
              const already = existingCardIds.includes(c.id) || justAdded.has(c.id);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 bg-panel-2 border border-border rounded-lg px-3 py-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt={c.name} className="w-8 h-11 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted truncate">
                      {c.setName} · #{c.number}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(c)}
                    disabled={already || pending}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full disabled:opacity-60"
                    style={{
                      background: already ? "transparent" : "var(--teal)",
                      color: already ? "var(--good)" : "#0b0c14",
                    }}
                  >
                    {already ? (
                      <>
                        <Check size={13} /> Added
                      </>
                    ) : (
                      <>
                        <Plus size={13} /> Add
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
