"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { POKEMON_TYPES, TYPE_COLORS, type PokemonType } from "@/lib/pokemontcg";
import { autoPopulatePriceCents, BULK_AUTOPOPULATE_PRICE_CENTS } from "@/lib/pricing";
import type { MasterSet } from "@/types";
import { createMasterSetForPurchase } from "@/app/store/actions";
import PlaceholderPdfForm from "@/app/store/PlaceholderPdfForm";

// Light backgrounds need dark chip text for contrast; the rest read fine
// in white. Duplicated from TypeAutoPopulateForm — small enough that a
// shared constant isn't worth the import indirection.
const DARK_TEXT_TYPES = new Set<PokemonType>(["Colorless", "Fairy", "Lightning"]);

type Mode = "name" | "type" | "artist" | "pdf";

// A new master set, paid for and pre-filled in one step via the same
// auto-populate purchase already used in Store — "buy as many as you
// want" has no cap of its own, unlike the one free simple-create set.
// "pdf" mode is the odd one out: it reuses Store's PlaceholderPdfForm
// as-is (own master-set-or-official-set targeting, own submit) rather
// than always creating a brand new master set like the other three do.
export default function PurchaseMasterSetForm({
  masterSets,
  officialSets,
}: {
  masterSets: MasterSet[];
  officialSets: { id: string; name: string }[];
}) {
  const [mode, setMode] = useState<Mode>("name");
  const [newMasterSetName, setNewMasterSetName] = useState("");
  const [names, setNames] = useState("");
  const [type, setType] = useState<PokemonType>(POKEMON_TYPES[0]);
  const [artist, setArtist] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryNames = useMemo(
    () =>
      names
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean),
    [names]
  );
  const priceCents =
    mode === "name" ? autoPopulatePriceCents(Math.max(1, queryNames.length)) : BULK_AUTOPOPULATE_PRICE_CENTS;
  const price = (priceCents / 100).toFixed(2);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newMasterSetName.trim()) {
      setError("Enter a name for the new master set");
      return;
    }
    if (mode === "name" && queryNames.length === 0) {
      setError("Enter at least one Pokémon name");
      return;
    }
    if (mode === "artist" && !artist.trim()) {
      setError("Enter an artist name");
      return;
    }

    setPending(true);
    setError(null);

    const target = await createMasterSetForPurchase(newMasterSetName);
    if ("error" in target) {
      setError(target.error);
      setPending(false);
      return;
    }

    const body =
      mode === "name"
        ? { masterSetId: target.id, queryNames }
        : mode === "type"
          ? { masterSetId: target.id, type }
          : { masterSetId: target.id, artist: artist.trim() };

    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn't start checkout");
        setPending(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't start checkout");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-xs text-muted">
        Fill it by
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
        >
          <option value="name">Pokémon name(s)</option>
          <option value="type">Energy type</option>
          <option value="artist">Artist</option>
          <option value="pdf">Placeholder PDF</option>
        </select>
      </label>

      {mode === "pdf" ? (
        <PlaceholderPdfForm masterSets={masterSets} officialSets={officialSets} />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            New master set name
            <input
              value={newMasterSetName}
              onChange={(e) => setNewMasterSetName(e.target.value)}
              placeholder="e.g. Piplup Masterset"
              className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
            />
          </label>

          {mode === "name" && (
            <>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Pokémon name(s)
                <input
                  value={names}
                  onChange={(e) => setNames(e.target.value)}
                  placeholder="e.g. Piplup, or Piplup, Prinplup, Empoleon"
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>
              <p className="text-[11px] text-muted -mt-1">
                Separate multiple names with commas — the more you add per purchase, the cheaper it is
                per Pokémon. 1 name: $2.99 · 2: $4.99 · 3: $5.99 · each one after that: +$1.00.
              </p>
            </>
          )}

          {mode === "type" && (
            <>
              <div className="flex flex-col gap-1.5 text-xs text-muted">
                Energy type
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {POKEMON_TYPES.map((t) => {
                    const selected = t === type;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        title={t}
                        className="flex items-center justify-center rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          background: TYPE_COLORS[t],
                          color: DARK_TEXT_TYPES.has(t) ? "#0b0c14" : "#fff",
                          outline: selected ? "2px solid var(--ink)" : "2px solid transparent",
                          outlineOffset: 1,
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-[11px] text-muted -mt-1">
                Adds every official {type}-type card ever printed — typically hundreds to a couple
                thousand cards, across every set.
              </p>
            </>
          )}

          {mode === "artist" && (
            <>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Artist name
                <input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="e.g. Mitsuhiro Arita"
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>
              <p className="text-[11px] text-muted -mt-1">
                Adds every official card illustrated by this artist, exactly as credited on the card.
              </p>
            </>
          )}

          {error && <p className="text-bad text-sm">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="flex items-center justify-center gap-1.5 brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 disabled:opacity-60"
          >
            <Sparkles size={15} /> {pending ? "Starting checkout…" : `Pay $${price} & create it`}
          </button>
        </form>
      )}
    </div>
  );
}
