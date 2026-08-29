"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { CollectionEntry } from "@/types";
import CardTile from "@/components/CardTile";
import EntryDetailModal from "./EntryDetailModal";

function historySubtitle(e: CollectionEntry): string {
  if (e.status === "sold") return `Sold $${(e.sold_price ?? 0).toFixed(2)}`;
  const total = (e.traded_cash_received ?? 0) + (e.traded_for_card_value ?? 0);
  return `Traded${total ? ` ($${total.toFixed(2)})` : ""}`;
}

export default function CollectionGrid({ entries }: { entries: CollectionEntry[] }) {
  const [tab, setTab] = useState<"owned" | "history">("owned");
  const [open, setOpen] = useState<CollectionEntry | null>(null);

  const owned = useMemo(() => entries.filter((e) => e.status === "owned"), [entries]);
  const history = useMemo(() => entries.filter((e) => e.status !== "owned"), [entries]);
  const visible = tab === "owned" ? owned : history;

  const groups = new Map<string, CollectionEntry[]>();
  for (const e of visible) {
    const key = e.set_name ?? "Unsorted";
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("owned")}
          className={`flex-1 text-sm font-semibold rounded-full py-2 border ${
            tab === "owned" ? "bg-panel-2 text-ink border-border" : "text-muted border-transparent"
          }`}
        >
          Owned ({owned.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 text-sm font-semibold rounded-full py-2 border ${
            tab === "history" ? "bg-panel-2 text-ink border-border" : "text-muted border-transparent"
          }`}
        >
          Sold & Traded ({history.length})
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
          {tab === "owned" ? "No cards owned right now." : "Nothing sold or traded yet."}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {[...groups.entries()].map(([setName, group]) => (
            <div key={setName} className="bg-panel border border-border rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-sm text-muted mb-3">
                <Sparkles size={13} className="text-amber" /> {setName}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {group.map((e) => (
                  <CardTile
                    key={e.id}
                    name={e.card_name}
                    imageUrl={e.image_url}
                    subtitle={tab === "history" ? historySubtitle(e) : undefined}
                    variationLabel={e.variation_type}
                    onClick={() => setOpen(e)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <EntryDetailModal entry={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
