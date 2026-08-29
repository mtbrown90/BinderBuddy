"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { CONDITIONS } from "@/types";
import { addCustomVariationToCollection } from "./actions";

export default function AddCustomVariationModal({
  entry,
  onClose,
}: {
  entry: {
    variationId: string;
    variationType: string;
    marketPrice: number | null;
    cardName: string;
    setName: string;
    imageUrl: string | null;
  };
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("variationId", entry.variationId);
    formData.set("variationType", entry.variationType);
    formData.set("cardName", entry.cardName);
    formData.set("setName", entry.setName);
    formData.set("imageUrl", entry.imageUrl ?? "");
    formData.set("marketPrice", entry.marketPrice != null ? String(entry.marketPrice) : "");
    startTransition(async () => {
      await addCustomVariationToCollection(formData);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div
        className="bg-panel border border-border rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border font-semibold">
          <span>
            {entry.cardName} — {entry.variationType}
          </span>
          <button onClick={onClose} className="text-muted">
            <X size={18} />
          </button>
        </div>
        <form action={handleSubmit} className="flex flex-col gap-3.5 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-muted">
              Quantity
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted">
              Condition
              <select
                name="condition"
                defaultValue="Near Mint"
                className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-muted">
              Price paid ($)
              <input
                name="pricePaid"
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
                className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted">
              Date acquired
              <input
                name="dateAcquired"
                type="date"
                className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 mt-1 disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add to binder"}
          </button>
        </form>
      </div>
    </div>
  );
}
