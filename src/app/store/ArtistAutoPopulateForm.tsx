"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import { BULK_AUTOPOPULATE_PRICE_CENTS } from "@/lib/pricing";
import type { MasterSet } from "@/types";
import MasterSetSelect from "./MasterSetSelect";

export default function ArtistAutoPopulateForm({ masterSets }: { masterSets: MasterSet[] }) {
  const [masterSetId, setMasterSetId] = useState(masterSets[0].id);
  const [artist, setArtist] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = (BULK_AUTOPOPULATE_PRICE_CENTS / 100).toFixed(2);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = artist.trim();
    if (!trimmed) {
      setError("Enter an artist name");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterSetId, artist: trimmed }),
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
        Artist name
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="e.g. Mitsuhiro Arita"
          className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
        />
      </label>
      <p className="text-[11px] text-muted -mt-1">
        Adds every official card illustrated by this artist, exactly as credited on the card — spell it
        the way it appears on a real print (e.g. &quot;5ban Graphics&quot;). Ranges from a couple dozen
        cards for less prolific artists to well over a thousand for the most prolific ones.
      </p>
      {error && <p className="text-bad text-sm">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-1.5 brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 disabled:opacity-60"
      >
        <Palette size={15} />{" "}
        {pending ? "Starting checkout…" : `Pay $${price} & add every card by this artist`}
      </button>
    </form>
  );
}
