"use client";

import { X } from "lucide-react";
import type { CollectionEntry } from "@/types";
import type { EntryGroup } from "@/lib/collectionGroups";

// Shown when a grouped tile (qty > 1) is clicked — each copy can have its
// own price paid and be sold/traded independently, so picking a specific
// copy is how you get to that copy's own detail view.
export default function CopyPickerModal({
  group,
  onPick,
  onClose,
}: {
  group: EntryGroup;
  onPick: (entry: CollectionEntry) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div
        className="bg-panel border border-border rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border font-semibold">
          <span>
            {group.card_name} — {group.condition}
          </span>
          <button onClick={onClose} className="text-muted">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-2 px-5 py-4">
          <p className="text-xs text-muted -mt-1 mb-1">
            You own {group.quantity} of these — pick a copy to view or sell/trade individually.
          </p>
          {group.entries.map((entry, i) => (
            <button
              key={entry.id}
              onClick={() => onPick(entry)}
              className="flex items-center justify-between bg-panel-2 border border-border rounded-lg px-3 py-2.5 text-left text-sm"
            >
              <span className="font-medium">Copy {i + 1}</span>
              <span className="text-muted text-xs">
                {entry.price_paid != null ? `$${Number(entry.price_paid).toFixed(2)} paid` : "No price recorded"}
                {entry.date_acquired ? ` · ${entry.date_acquired}` : ""}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
