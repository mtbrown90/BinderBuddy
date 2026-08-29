"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { autoPopulatePriceCents } from "@/lib/pricing";
import type { MasterSet } from "@/types";
import MasterSetSelect from "./MasterSetSelect";

export default function PokemonAutoPopulateForm({ masterSets }: { masterSets: MasterSet[] }) {
  const [masterSetId, setMasterSetId] = useState(masterSets[0].id);
  const [names, setNames] = useState("");
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
  const priceCents = autoPopulatePriceCents(Math.max(1, queryNames.length));
  const price = (priceCents / 100).toFixed(2);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (queryNames.length === 0) {
      setError("Enter at least one Pokémon name");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterSetId, queryNames }),
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
        Separate multiple names with commas — the more you add per purchase, the cheaper it is per
        Pokémon. 1 name: $2.99 · 2: $4.99 · 3: $5.99 · each one after that: +$1.00.
      </p>
      {error && <p className="text-bad text-sm">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-1.5 brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 disabled:opacity-60"
      >
        <Sparkles size={15} /> {pending ? "Starting checkout…" : `Pay $${price} & auto-populate`}
      </button>
    </form>
  );
}
