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
  releaseDate: string;
  images: { logo: string };
};

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

  const filteredMasterSets = useMemo(
    () =>
      query.trim()
        ? masterSets.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
        : masterSets,
    [masterSets, query]
  );
  const filteredOfficialSets = useMemo(
    () =>
      query.trim()
        ? officialSets.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
        : officialSets,
    [officialSets, query]
  );

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
              {officialCards.map((c) => (
                <CardTile
                  key={c.id}
                  name={c.name}
                  imageUrl={c.imageUrl}
                  subtitle={c.setName}
                  onClick={() => setOpenOfficialCard(c)}
                />
              ))}
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
