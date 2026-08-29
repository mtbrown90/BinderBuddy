"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { POKEMON_TYPES, TYPE_COLORS, type PokemonType } from "@/lib/pokemontcg";
import { BULK_AUTOPOPULATE_PRICE_CENTS } from "@/lib/pricing";
import type { MasterSet } from "@/types";
import MasterSetSelect from "./MasterSetSelect";

// Light backgrounds need dark chip text for contrast; the rest read fine
// in white.
const DARK_TEXT_TYPES = new Set<PokemonType>(["Colorless", "Fairy", "Lightning"]);

export default function TypeAutoPopulateForm({ masterSets }: { masterSets: MasterSet[] }) {
  const [masterSetId, setMasterSetId] = useState(masterSets[0].id);
  const [type, setType] = useState<PokemonType>(POKEMON_TYPES[0]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = (BULK_AUTOPOPULATE_PRICE_CENTS / 100).toFixed(2);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterSetId, type }),
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <MasterSetSelect masterSets={masterSets} value={masterSetId} onChange={setMasterSetId} />
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
        Adds every official {type}-type card ever printed — typically hundreds to a couple thousand
        cards, across every set.
      </p>
      {error && <p className="text-bad text-sm">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-1.5 brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 disabled:opacity-60"
      >
        <Zap size={15} /> {pending ? "Starting checkout…" : `Pay $${price} & add every ${type} card`}
      </button>
    </form>
  );
}
