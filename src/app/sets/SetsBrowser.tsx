"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FolderPlus, Search, Sparkles, Upload } from "lucide-react";
import CardTile from "@/components/CardTile";
import AddCardModal from "@/components/AddCardModal";
import type { MasterSet } from "@/types";

type OfficialSet = {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  images: { logo: string };
};

const ALL = "all";

function releaseYear(s: OfficialSet) {
  return s.releaseDate.slice(0, 4);
}

type Variation = { key: string; label: string; marketPrice: number | null };
type CardResult = {
  id: string;
  name: string;
  number: string;
  setName: string;
  imageUrl: string;
  variations: Variation[];
};

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function SetsBrowser({
  officialSets,
  masterSets,
  isAdmin,
}: {
  officialSets: OfficialSet[];
  masterSets: MasterSet[];
  isAdmin: boolean;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query.trim(), 350);
  const searching = debouncedQuery.length >= 2;

  const [seriesFilter, setSeriesFilter] = useState(ALL);
  const [yearFilter, setYearFilter] = useState(ALL);
  const [officialSort, setOfficialSort] = useState<"newest" | "oldest">("newest");
  const [masterSort, setMasterSort] = useState<"recent" | "name-asc" | "name-desc">("recent");

  // officialSets already arrives newest-first from the API, so taking series
  // and years in the order they first appear keeps both dropdowns roughly
  // reverse-chronological without a separate sort pass.
  const seriesOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of officialSets) {
      if (!seen.has(s.series)) {
        seen.add(s.series);
        list.push(s.series);
      }
    }
    return list;
  }, [officialSets]);
  const yearOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of officialSets) {
      const y = releaseYear(s);
      if (!seen.has(y)) {
        seen.add(y);
        list.push(y);
      }
    }
    return list;
  }, [officialSets]);

  const [officialCards, setOfficialCards] = useState<CardResult[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [openOfficialCard, setOpenOfficialCard] = useState<CardResult | null>(null);

  useEffect(() => {
    if (!searching) return;

    let cancelled = false;

    async function run() {
      setCardsLoading(true);
      const cards = await fetch(`/api/search-cards?q=${encodeURIComponent(debouncedQuery)}`)
        .then((r) => r.json())
        .then((d) => (d.cards ?? []) as CardResult[])
        .catch(() => []);
      if (cancelled) return;
      setOfficialCards(cards);
      setCardsLoading(false);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, searching]);

  const filteredMasterSets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? masterSets.filter((s) => s.name.toLowerCase().includes(q)) : [...masterSets];
    filtered.sort((a, b) => {
      if (masterSort === "name-asc") return a.name.localeCompare(b.name);
      if (masterSort === "name-desc") return b.name.localeCompare(a.name);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return filtered;
  }, [masterSets, query, masterSort]);

  const filteredOfficialSets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = officialSets.filter(
      (s) =>
        (!q || s.name.toLowerCase().includes(q)) &&
        (seriesFilter === ALL || s.series === seriesFilter) &&
        (yearFilter === ALL || releaseYear(s) === yearFilter)
    );
    filtered.sort((a, b) =>
      officialSort === "oldest"
        ? a.releaseDate.localeCompare(b.releaseDate)
        : b.releaseDate.localeCompare(a.releaseDate)
    );
    return filtered;
  }, [officialSets, query, seriesFilter, yearFilter, officialSort]);

  return (
    <div className="flex flex-col gap-8">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sets or cards…"
          className="w-full bg-panel border border-border rounded-full pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-muted"
        />
      </div>

      {searching && (
        <div>
          <h2 className="font-semibold text-lg mb-3">Cards matching &quot;{debouncedQuery}&quot;</h2>
          {cardsLoading ? (
            <div className="text-muted text-sm text-center py-8 bg-panel border border-border rounded-2xl">
              Searching…
            </div>
          ) : officialCards.length === 0 ? (
            <div className="text-muted text-sm text-center py-8 bg-panel border border-border rounded-2xl">
              No cards found.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {officialCards.map((c) => {
                // Representative price for the tile — the variation search
                // returns them in pokemontcg.io's own order (typically
                // Normal/base first); the full per-variation breakdown
                // shows once the card's opened in AddCardModal.
                const price = c.variations[0]?.marketPrice;
                return (
                  <CardTile
                    key={c.id}
                    name={c.name}
                    imageUrl={c.imageUrl}
                    subtitle={c.setName}
                    priceLabel={price != null ? `$${price.toFixed(2)}` : null}
                    onClick={() => setOpenOfficialCard(c)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Your master sets</h2>
          <Link
            href="/sets/master/new"
            className="flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-border rounded-full px-3.5 py-1.5"
          >
            <FolderPlus size={14} /> New master set
          </Link>
        </div>
        {masterSets.length > 1 && (
          <select
            value={masterSort}
            onChange={(e) => setMasterSort(e.target.value as typeof masterSort)}
            className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink mb-3"
          >
            <option value="recent">Sort: Recently created</option>
            <option value="name-asc">Sort: Name (A–Z)</option>
            <option value="name-desc">Sort: Name (Z–A)</option>
          </select>
        )}
        {filteredMasterSets.length === 0 ? (
          <div className="text-muted text-sm text-center py-8 bg-panel border border-border rounded-2xl">
            {query.trim()
              ? "No master sets match."
              : "No master sets yet — build a checklist of every card of your favorite Pokémon."}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredMasterSets.map((s) => (
              <Link
                key={s.id}
                href={`/sets/master/${s.id}`}
                className="flex items-center gap-2 bg-panel border border-border rounded-xl px-4 py-3"
              >
                <Sparkles size={14} className="text-amber" />
                <span className="font-medium text-sm">{s.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Pokémon TCG sets</h2>
          {isAdmin && (
            <Link
              href="/collection/import"
              className="flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-border rounded-full px-3.5 py-1.5"
            >
              <Upload size={14} /> Import Excel
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <select
            value={seriesFilter}
            onChange={(e) => setSeriesFilter(e.target.value)}
            className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink"
          >
            <option value={ALL}>All series</option>
            {seriesOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink"
          >
            <option value={ALL}>All years</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={officialSort}
            onChange={(e) => setOfficialSort(e.target.value as typeof officialSort)}
            className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink"
          >
            <option value="newest">Sort: Newest first</option>
            <option value="oldest">Sort: Oldest first</option>
          </select>
        </div>
        {filteredOfficialSets.length === 0 ? (
          <div className="text-muted text-sm text-center py-8 bg-panel border border-border rounded-2xl">
            {query.trim() ? "No sets match." : "Couldn't load official sets right now."}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredOfficialSets.map((s) => (
              <Link
                key={s.id}
                href={`/sets/${s.id}`}
                className="flex flex-col items-center gap-2 bg-panel border border-border rounded-xl px-3 py-4 text-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.images.logo} alt={s.name} className="h-10 object-contain" />
                <span className="text-xs font-medium leading-tight">{s.name}</span>
                <span className="text-[10px] text-muted">{s.releaseDate}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {openOfficialCard && <AddCardModal card={openOfficialCard} onClose={() => setOpenOfficialCard(null)} />}
    </div>
  );
}
