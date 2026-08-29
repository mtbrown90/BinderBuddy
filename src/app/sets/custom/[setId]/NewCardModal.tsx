"use client";

import { useState, useTransition } from "react";
import { X, Plus } from "lucide-react";
import { VARIATION_TYPES } from "@/types";
import { addCustomCard } from "./actions";

export default function NewCardModal({ customSetId }: { customSetId: string }) {
  const [openState, setOpenState] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("customSetId", customSetId);
    startTransition(async () => {
      await addCustomCard(formData);
      setOpenState(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpenState(true)}
        className="flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-border rounded-full px-3.5 py-1.5"
      >
        <Plus size={14} /> New card
      </button>

      {openState && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5"
          onClick={() => setOpenState(false)}
        >
          <div
            className="bg-panel border border-border rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border font-semibold">
              <span>New card</span>
              <button onClick={() => setOpenState(false)} className="text-muted">
                <X size={18} />
              </button>
            </div>
            <form action={handleSubmit} className="flex flex-col gap-3.5 px-5 py-4">
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Card name
                <input
                  name="name"
                  required
                  placeholder="e.g. Shadow Drake"
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs text-muted">
                  Card number
                  <input
                    name="cardNumber"
                    placeholder="24/102"
                    className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-muted">
                  Rarity
                  <input
                    name="rarity"
                    placeholder="Rare"
                    className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Image URL
                <input
                  name="imageUrl"
                  placeholder="https://…"
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs text-muted">
                  Variation type
                  <select
                    name="variationType"
                    defaultValue="Normal"
                    className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  >
                    {VARIATION_TYPES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-muted">
                  Market price ($)
                  <input
                    name="marketPrice"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  />
                </label>
              </div>
              <p className="text-[11px] text-muted -mt-1">
                You can add more variations (holo, reverse holo, etc.) for this card afterwards.
              </p>
              <button
                type="submit"
                disabled={pending}
                className="brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 mt-1 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Add card"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
