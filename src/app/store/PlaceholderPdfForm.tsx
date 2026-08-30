"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { PLACEHOLDER_PDF_PRICE_CENTS } from "@/lib/pricing";
import type { MasterSet, PdfStyle } from "@/types";
import MasterSetSelect, { NEW_MASTER_SET_VALUE } from "./MasterSetSelect";
import { resolveMasterSetId } from "./resolveMasterSetId";

const STYLES: { value: PdfStyle; label: string }[] = [
  { value: "color", label: "Full color" },
  { value: "bw", label: "Black & white" },
  { value: "text", label: "Text only" },
];

export default function PlaceholderPdfForm({ masterSets }: { masterSets: MasterSet[] }) {
  const [masterSetId, setMasterSetId] = useState(masterSets[0]?.id ?? NEW_MASTER_SET_VALUE);
  const [newMasterSetName, setNewMasterSetName] = useState("");
  const [style, setStyle] = useState<PdfStyle>("color");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = (PLACEHOLDER_PDF_PRICE_CENTS / 100).toFixed(2);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const target = await resolveMasterSetId(masterSetId, newMasterSetName);
    if ("error" in target) {
      setError(target.error);
      setPending(false);
      return;
    }

    try {
      const res = await fetch("/api/stripe/create-pdf-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterSetId: target.id, style }),
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
      <MasterSetSelect
        masterSets={masterSets}
        value={masterSetId}
        onChange={setMasterSetId}
        newName={newMasterSetName}
        onNewNameChange={setNewMasterSetName}
      />
      <div className="flex flex-col gap-1.5 text-xs text-muted">
        Style
        <div className="grid grid-cols-3 gap-1.5">
          {STYLES.map((s) => {
            const selected = s.value === style;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setStyle(s.value)}
                className="rounded-lg px-2 py-2 text-xs font-semibold border"
                style={{
                  background: selected ? "var(--panel-2)" : "transparent",
                  borderColor: selected ? "var(--teal)" : "var(--border)",
                  color: selected ? "var(--ink)" : "var(--muted)",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] text-muted -mt-1">
        A print-ready PDF of card-shaped placeholders for every card still missing from this
        checklist — cut them out and slot them into empty binder pockets. Color and black &amp;
        white use the real card art; text-only skips the art entirely.
      </p>
      {error && <p className="text-bad text-sm">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-1.5 brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 disabled:opacity-60"
      >
        <FileDown size={15} /> {pending ? "Starting checkout…" : `Pay $${price} & get placeholder PDF`}
      </button>
    </form>
  );
}
