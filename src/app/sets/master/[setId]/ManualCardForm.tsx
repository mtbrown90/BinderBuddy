"use client";

import { useState, useTransition } from "react";
import { ShieldPlus } from "lucide-react";
import { VARIATION_TYPES } from "@/types";
import { POKEMON_TYPES } from "@/lib/pokemontcg";
import { addManualCardToMasterSet } from "./actions";

export default function ManualCardForm({ masterSetId }: { masterSetId: string }) {
  const [open, setOpen] = useState(false);
  const [shareToCatalog, setShareToCatalog] = useState(true);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("masterSetId", masterSetId);
    startTransition(async () => {
      await addManualCardToMasterSet(formData);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-amber"
      >
        <ShieldPlus size={13} /> Add a card the API is missing (admin)
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3 bg-panel-2 border border-border rounded-xl p-3.5">
      <p className="text-[11px] text-muted">
        For a real card pokemontcg.io doesn&apos;t catalog (rare promos, etc.) — not for made-up cards.
      </p>
      <label className="flex flex-col gap-1.5 text-xs text-muted">
        Card name
        <input
          name="name"
          required
          placeholder="e.g. Prinplup"
          className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-xs text-muted">
        Set / promo name
        <input
          name="setName"
          placeholder="e.g. Burger King Promos"
          className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-xs text-muted">
          Card number
          <input
            name="cardNumber"
            placeholder="e.g. 6"
            className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-muted">
          Printed total (optional)
          <input
            name="setPrintedTotal"
            type="number"
            min={1}
            placeholder="e.g. 131"
            className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-xs text-muted">
        Image URL
        <input
          name="imageUrl"
          placeholder="https://…"
          className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-xs text-muted">
          Variation type
          <input
            name="variationType"
            list="variation-suggestions"
            defaultValue="Normal"
            className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
          />
          <datalist id="variation-suggestions">
            {VARIATION_TYPES.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-muted">
          Market price ($)
          <input
            name="marketPrice"
            type="number"
            step="0.01"
            min={0}
            placeholder="0.00"
            className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
          />
        </label>
      </div>
      <label className="flex items-start gap-2 text-xs text-ink">
        <input
          name="shareToCatalog"
          type="checkbox"
          checked={shareToCatalog}
          onChange={(e) => setShareToCatalog(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Also add to the shared promo catalog
          <span className="block text-[11px] text-muted">
            Any master set whose Pokémon name / type / artist search matches this card will include it
            automatically from now on — new purchases, and &quot;Check for new cards&quot; on existing sets.
          </span>
        </span>
      </label>
      {shareToCatalog && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            Artist (optional)
            <input
              name="artist"
              placeholder="so artist searches match it"
              className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            Energy type (optional)
            <select
              name="type"
              defaultValue=""
              className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
            >
              <option value="">None</option>
              {POKEMON_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="flex gap-2 mt-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 text-sm font-semibold border border-border rounded-lg py-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 brand-gradient text-[#0b0c14] font-bold rounded-lg py-2 text-sm disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add to checklist"}
        </button>
      </div>
    </form>
  );
}
