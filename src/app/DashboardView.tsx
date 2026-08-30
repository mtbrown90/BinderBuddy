"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { CollectionEntry, MasterSet } from "@/types";
import { groupCollectionEntries, groupSubtitle, conditionOrGradeLabel, type EntryGroup } from "@/lib/collectionGroups";
import StatCard from "@/components/StatCard";
import CardTile from "@/components/CardTile";
import CopyPickerModal from "@/components/CopyPickerModal";
import EntryDetailModal from "@/app/collection/EntryDetailModal";

type ViewMode = "collection" | "masterset" | "recent" | "disposed";
type SortOption = "recent" | "name-asc" | "name-desc" | "price-desc" | "price-asc";
type RecentWindow = "1" | "7" | "30" | "90";
const ALL = "all";

function entryKey(e: CollectionEntry) {
  return `${e.external_card_id}::${e.variation_type.toLowerCase()}`;
}

function proceedsOf(e: CollectionEntry) {
  return e.status === "sold"
    ? Number(e.sold_price) || 0
    : (Number(e.traded_cash_received) || 0) + (Number(e.traded_for_card_value) || 0);
}

function costOf(e: CollectionEntry) {
  return (Number(e.price_paid) || 0) * e.quantity;
}

function GainStat({ label, value }: { label: string; value: number }) {
  return (
    <StatCard
      label={label}
      value={
        <span className="flex items-center gap-1.5">
          {value >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          {value >= 0 ? "+" : ""}
          {value.toFixed(2)}
        </span>
      }
      valueClassName={value >= 0 ? "text-good" : "text-bad"}
    />
  );
}

function historySubtitle(e: CollectionEntry): string {
  if (e.status === "sold") return `Sold $${(e.sold_price ?? 0).toFixed(2)}`;
  const total = (e.traded_cash_received ?? 0) + (e.traded_for_card_value ?? 0);
  return `Traded${total ? ` ($${total.toFixed(2)})` : ""}`;
}

export default function DashboardView({
  allEntries,
  masterSets,
  masterSetCardKeys,
}: {
  allEntries: CollectionEntry[];
  masterSets: MasterSet[];
  masterSetCardKeys: Record<string, string[]>;
}) {
  const [mode, setMode] = useState<ViewMode>("recent");
  const [msSelection, setMsSelection] = useState("");
  const [recentWindow, setRecentWindow] = useState<RecentWindow>("7");
  const [sort, setSort] = useState<SortOption>("recent");
  const [conditionFilter, setConditionFilter] = useState(ALL);
  const [setFilter, setSetFilter] = useState(ALL);
  const [open, setOpen] = useState<CollectionEntry | null>(null);
  const [picking, setPicking] = useState<EntryGroup | null>(null);
  // Captured once rather than called inline in useMemo — "now" only needs
  // to be roughly fresh (this is a day-granularity window filter), and a
  // stable value keeps the memoized filtering pure.
  const [now] = useState(() => Date.now());

  const owned = useMemo(() => allEntries.filter((e) => e.status === "owned"), [allEntries]);
  const disposed = useMemo(() => allEntries.filter((e) => e.status !== "owned"), [allEntries]);

  // Only mastersets/official sets you actually own at least one card
  // from — no point listing ones with nothing to show.
  const masterSetOptions = useMemo(
    () =>
      masterSets.filter((ms) => {
        const keys = new Set(masterSetCardKeys[ms.id] ?? []);
        return owned.some((e) => keys.has(entryKey(e)));
      }),
    [masterSets, masterSetCardKeys, owned]
  );
  const standardSetOptions = useMemo(
    () => [...new Set(owned.map((e) => e.set_name).filter((s): s is string => Boolean(s)))].sort(),
    [owned]
  );
  const effectiveMsSelection =
    msSelection || (masterSetOptions[0] ? `masterset:${masterSetOptions[0].id}` : `set:${standardSetOptions[0] ?? ""}`);

  const masterSetScope = useMemo(() => {
    if (effectiveMsSelection.startsWith("masterset:")) {
      const id = effectiveMsSelection.slice("masterset:".length);
      const keys = new Set(masterSetCardKeys[id] ?? []);
      return {
        owned: owned.filter((e) => keys.has(entryKey(e))),
        disposed: disposed.filter((e) => keys.has(entryKey(e))),
      };
    }
    const setName = effectiveMsSelection.slice("set:".length);
    return {
      owned: owned.filter((e) => e.set_name === setName),
      disposed: disposed.filter((e) => e.set_name === setName),
    };
  }, [effectiveMsSelection, owned, disposed, masterSetCardKeys]);

  const recentOwned = useMemo(() => {
    const cutoff = now - Number(recentWindow) * 24 * 60 * 60 * 1000;
    return owned.filter((e) => new Date(e.created_at).getTime() >= cutoff);
  }, [owned, recentWindow, now]);

  const scopedOwned = useMemo(() => {
    if (mode === "collection") return owned;
    if (mode === "masterset") return masterSetScope.owned;
    if (mode === "recent") return recentOwned;
    return [];
  }, [mode, owned, masterSetScope, recentOwned]);
  // "Entire Collection" keeps realized gain/loss over your full disposal
  // history (matches the original dashboard); other scoped views narrow
  // realized gain/loss to their own scope too.
  const scopedDisposed = useMemo(() => {
    if (mode === "collection" || mode === "disposed") return disposed;
    if (mode === "masterset") return masterSetScope.disposed;
    return [];
  }, [mode, disposed, masterSetScope]);

  const realized = useMemo(
    () => scopedDisposed.reduce((s, e) => s + (proceedsOf(e) - costOf(e)), 0),
    [scopedDisposed]
  );
  const disposedStats = useMemo(() => {
    const cards = scopedDisposed.reduce((s, e) => s + e.quantity, 0);
    const cost = scopedDisposed.reduce((s, e) => s + costOf(e), 0);
    const proceeds = scopedDisposed.reduce((s, e) => s + proceedsOf(e), 0);
    return { cards, cost, proceeds };
  }, [scopedDisposed]);

  const allGroups = useMemo(() => groupCollectionEntries(scopedOwned), [scopedOwned]);
  const conditionOptions = useMemo(
    () => [...new Set(allGroups.map(conditionOrGradeLabel))].sort(),
    [allGroups]
  );
  const setOptions = useMemo(
    () => [...new Set(allGroups.map((g) => g.set_name).filter((s): s is string => Boolean(s)))].sort(),
    [allGroups]
  );
  const groups = useMemo(() => {
    const filtered = allGroups.filter(
      (g) =>
        (conditionFilter === ALL || conditionOrGradeLabel(g) === conditionFilter) &&
        (setFilter === ALL || g.set_name === setFilter)
    );
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.card_name.localeCompare(b.card_name);
        case "name-desc":
          return b.card_name.localeCompare(a.card_name);
        case "price-desc":
          return b.totalMarketValue - a.totalMarketValue;
        case "price-asc":
          return a.totalMarketValue - b.totalMarketValue;
        default:
          return b.latestCreatedAt.localeCompare(a.latestCreatedAt);
      }
    });
  }, [allGroups, sort, conditionFilter, setFilter]);

  // Stat cards reflect what's actually shown in the grid below — filtered
  // by condition/set, not just the broader view-mode scope — so the two
  // never disagree with each other.
  const ownedStats = useMemo(() => {
    const filteredEntries = groups.flatMap((g) => g.entries);
    const cards = filteredEntries.reduce((s, e) => s + e.quantity, 0);
    const spent = filteredEntries.reduce((s, e) => s + costOf(e), 0);
    const market = filteredEntries.reduce((s, e) => s + (Number(e.market_price) || 0) * e.quantity, 0);
    return { cards, spent, market, unrealized: market - spent };
  }, [groups]);

  const disposedSorted = useMemo(
    () =>
      [...scopedDisposed].sort((a, b) => {
        const ad = a.sold_date ?? a.traded_date ?? a.updated_at;
        const bd = b.sold_date ?? b.traded_date ?? b.updated_at;
        return bd.localeCompare(ad);
      }),
    [scopedDisposed]
  );

  function openGroup(g: EntryGroup) {
    if (g.entries.length === 1) setOpen(g.entries[0]);
    else setPicking(g);
  }

  const modes: { value: ViewMode; label: string }[] = [
    { value: "collection", label: "Entire Collection" },
    { value: "masterset", label: "Master Set" },
    { value: "recent", label: "Recently Added" },
    { value: "disposed", label: "Recently Sold/Traded" },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        {mode === "disposed" ? (
          <>
            <StatCard label="Cards disposed" value={disposedStats.cards} />
            <StatCard label="Cost basis" value={`$${disposedStats.cost.toFixed(2)}`} />
            <StatCard label="Proceeds" value={`$${disposedStats.proceeds.toFixed(2)}`} />
            <GainStat label="Realized gain / loss" value={realized} />
          </>
        ) : (
          <>
            <StatCard label="Cards owned" value={ownedStats.cards} />
            <StatCard label="Spent" value={`$${ownedStats.spent.toFixed(2)}`} />
            <StatCard label="Market value" value={`$${ownedStats.market.toFixed(2)}`} />
            <GainStat label="Unrealized gain / loss" value={ownedStats.unrealized} />
            <GainStat label="Realized gain / loss" value={realized} />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-2">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`text-sm font-semibold rounded-full px-3.5 py-1.5 border ${
                mode === m.value ? "bg-panel-2 text-ink border-border" : "text-muted border-transparent"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <Link href="/sets" className="text-teal text-sm font-medium">
          Browse sets →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {mode === "masterset" && (
          <select
            value={effectiveMsSelection}
            onChange={(e) => setMsSelection(e.target.value)}
            className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink"
          >
            {masterSetOptions.length > 0 && (
              <optgroup label="Master Sets">
                {masterSetOptions.map((ms) => (
                  <option key={ms.id} value={`masterset:${ms.id}`}>
                    {ms.name}
                  </option>
                ))}
              </optgroup>
            )}
            {standardSetOptions.length > 0 && (
              <optgroup label="Official Sets">
                {standardSetOptions.map((s) => (
                  <option key={s} value={`set:${s}`}>
                    {s}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
        {mode === "recent" && (
          <select
            value={recentWindow}
            onChange={(e) => setRecentWindow(e.target.value as RecentWindow)}
            className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink"
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        )}
        {mode !== "disposed" && (
          <>
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
          </>
        )}
      </div>

      {mode === "disposed" ? (
        disposedSorted.length === 0 ? (
          <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
            Nothing sold or traded yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {disposedSorted.map((e) => (
              <CardTile
                key={e.id}
                name={e.card_name}
                imageUrl={e.image_url}
                subtitle={historySubtitle(e)}
                variationLabel={e.variation_type}
                onClick={() => setOpen(e)}
              />
            ))}
          </div>
        )
      ) : groups.length === 0 ? (
        <div className="text-muted text-sm text-center py-12 bg-panel border border-border rounded-2xl">
          {mode === "collection"
            ? "Your binder's empty. Browse a set and add your first card."
            : "No cards match."}
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
