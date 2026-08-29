"use client";

import { useTransition } from "react";
import { X, Trash2 } from "lucide-react";
import type { CollectionEntry } from "@/types";
import CardTile from "@/components/CardTile";
import { removeCollectionEntry } from "./actions";

export default function EntryDetailModal({
  entry,
  onClose,
}: {
  entry: CollectionEntry;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const paid = Number(entry.price_paid) || 0;
  const market = Number(entry.market_price) || 0;
  const diff = market - paid;

  function handleRemove() {
    startTransition(async () => {
      await removeCollectionEntry(entry.id);
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
          <span>{entry.card_name}</span>
          <button onClick={onClose} className="text-muted">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 flex gap-4">
          <div className="w-24 shrink-0">
            <CardTile name={entry.card_name} imageUrl={entry.image_url} />
          </div>
          <div className="flex-1 flex flex-col text-sm">
            <Row label="Set" value={entry.set_name ?? "—"} />
            <Row label="Variation" value={entry.variation_type} />
            <Row label="Condition" value={entry.condition} />
            <Row label="Quantity" value={String(entry.quantity)} />
            <Row label="Price paid" value={`$${paid.toFixed(2)}`} />
            <Row label="Market price" value={`$${market.toFixed(2)}`} />
            <Row
              label="Gain / loss"
              value={`${diff >= 0 ? "+" : ""}${diff.toFixed(2)}`}
              valueClassName={diff >= 0 ? "text-good" : "text-bad"}
            />
            {entry.date_acquired && <Row label="Acquired" value={entry.date_acquired} />}
          </div>
        </div>
        <div className="px-5 pb-5">
          <button
            onClick={handleRemove}
            disabled={pending}
            className="w-full flex items-center justify-center gap-1.5 text-bad border border-bad/40 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            <Trash2 size={14} /> {pending ? "Removing…" : "Remove from collection"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between py-1.5 border-b border-dashed border-border">
      <span className="text-muted">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}
