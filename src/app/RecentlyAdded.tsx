"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CollectionEntry } from "@/types";
import { groupCollectionEntries, groupSubtitle, type EntryGroup } from "@/lib/collectionGroups";
import CardTile from "@/components/CardTile";
import CopyPickerModal from "@/components/CopyPickerModal";
import EntryDetailModal from "@/app/collection/EntryDetailModal";

type SortOption = "recent" | "name-asc" | "name-desc" | "price-desc" | "price-asc";
const ALL = "all";
const PREVIEW_LIMIT = 12;

export default function RecentlyAdded({ owned }: { owned: CollectionEntry[] }) {
  const [sort, setSort] = useState<SortOption>("recent");
  const [conditionFilter, setConditionFilter] = useState(ALL);
  const [setFilter, setSetFilter] = useState(ALL);
  const [open, setOpen] = useState<CollectionEntry | null>(null);
  const [picking, setPicking] = useState<EntryGroup | null>(null);

  const allGroups = useMemo(() => groupCollectionEntries(owned), [owned]);

  const conditionOptions = useMemo(
    () => [...new Set(allGroups.map((g) => g.condition))].sort(),
    [allGroups]
  );
  const setOptions = useMemo(
    () => [...new Set(allGroups.map((g) => g.set_name).filter((s): s is string => Boolean(s)))].sort(),
    [allGroups]
  );

  const groups = useMemo(() => {
    const filtered = allGroups.filter(
      (g) =>
        (conditionFilter === ALL || g.condition === conditionFilter) &&
        (setFilter === ALL || g.set_name === setFilter)
    );
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.card_name.localeCompare(b.card_name);
        case "name-desc":
          return b.card_name.localeCompare(a.card_name);
        case "price-desc":
          return b.totalMarketValue - a.totalMarketValue;
        case "price-asc":
          return a.totalMarketValue - b.totalMarketValue;
        default: // "recent"
          return b.latestCreatedAt.localeCompare(a.latestCreatedAt);
      }
    });
    return sorted.slice(0, PREVIEW_LIMIT);
  }, [allGroups, sort, conditionFilter, setFilter]);

  function openGroup(g: EntryGroup) {
    if (g.entries.length === 1) setOpen(g.entries[0]);
    else setPicking(g);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">Recently added</h2>
        <Link href="/sets" className="text-teal text-sm font-medium">
          Browse sets →
        </Link>
      </div>

      {owned.length === 0 ? (
        <div className="text-muted text-sm text-center py-12 bg-panel border border-border rounded-2xl">
          Your binder&apos;s empty. Browse a set and add your first card.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink"
            >
              <option value="recent">Sort: Recently added</option>
              <option value="name-asc">Sort: Name (A–Z)</option>
              <option value="name-desc">Sort: Name (Z–A)</option>
              <option value="price-desc">Sort: Price (high–low)</option>
              <option value="price-asc">Sort: Price (low–high)</option>
            </select>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink"
            >
              <option value={ALL}>All conditions</option>
              {conditionOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink"
            >
              <option value={ALL}>All sets</option>
              {setOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {groups.length === 0 ? (
            <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
              No cards match.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {groups.map((g) => (
                <CardTile
                  key={g.key}
                  name={g.card_name}
                  imageUrl={g.image_url}
                  subtitle={groupSubtitle(g)}
                  variationLabel={g.variation_type}
                  onClick={() => openGroup(g)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {picking && (
        <CopyPickerModal
          group={picking}
          onPick={(entry) => {
            setPicking(null);
            setOpen(entry);
          }}
          onClose={() => setPicking(null)}
        />
      )}
      {open && <EntryDetailModal entry={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
