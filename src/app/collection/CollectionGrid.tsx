"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { CollectionEntry } from "@/types";
import { groupCollectionEntries, groupSubtitle, setIdentityLabel, type EntryGroup } from "@/lib/collectionGroups";
import CardTile from "@/components/CardTile";
import CopyPickerModal from "@/components/CopyPickerModal";
import EntryDetailModal from "./EntryDetailModal";

function historySubtitle(e: CollectionEntry): string {
  if (e.status === "sold") return `Sold $${(e.sold_price ?? 0).toFixed(2)}`;
  const total = (e.traded_cash_received ?? 0) + (e.traded_for_card_value ?? 0);
  return `Traded${total ? ` ($${total.toFixed(2)})` : ""}`;
}

export default function CollectionGrid({ entries }: { entries: CollectionEntry[] }) {
  const [tab, setTab] = useState<"owned" | "history">("owned");
  const [open, setOpen] = useState<CollectionEntry | null>(null);
  const [picking, setPicking] = useState<EntryGroup | null>(null);

  const owned = useMemo(() => entries.filter((e) => e.status === "owned"), [entries]);
  const history = useMemo(() => entries.filter((e) => e.status !== "owned"), [entries]);
  const ownedGroups = useMemo(() => groupCollectionEntries(owned), [owned]);

  function openGroup(g: EntryGroup) {
    if (g.entries.length === 1) setOpen(g.entries[0]);
    else setPicking(g);
  }

  const bySet =
    tab === "owned"
      ? groupBy(ownedGroups, (g) => g.set_name ?? "Unsorted")
      : groupBy(history, (e) => e.set_name ?? "Unsorted");

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

      {(tab === "owned" ? owned.length : history.length) === 0 ? (
        <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
          {tab === "owned" ? "No cards owned right now." : "Nothing sold or traded yet."}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {[...bySet.entries()].map(([setName, group]) => (
            <div key={setName} className="bg-panel border border-border rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-sm text-muted mb-3">
                <Sparkles size={13} className="text-amber" /> {setName}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {tab === "owned"
                  ? (group as EntryGroup[]).map((g) => (
                      <CardTile
                        key={g.key}
                        name={g.card_name}
                        imageUrl={g.image_url}
                        setInfoLabel={setIdentityLabel(g)}
                        subtitle={groupSubtitle(g)}
                        variationLabel={g.variation_type}
                        priceLabel={g.totalMarketValue > 0 ? `$${g.totalMarketValue.toFixed(2)}` : null}
                        secondaryLabel={g.totalPricePaid > 0 ? `Paid $${g.totalPricePaid.toFixed(2)}` : null}
                        onClick={() => openGroup(g)}
                      />
                    ))
                  : (group as CollectionEntry[]).map((e) => (
                      <CardTile
                        key={e.id}
                        name={e.card_name}
                        imageUrl={e.image_url}
                        setInfoLabel={setIdentityLabel(e)}
                        subtitle={historySubtitle(e)}
                        variationLabel={e.variation_type}
                        priceLabel={e.market_price != null ? `$${e.market_price.toFixed(2)}` : null}
                        onClick={() => setOpen(e)}
                      />
                    ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {picking && (
        <CopyPickerModal
          group={picking}
          onPick={(entry) => {
            setPicking(null);
            setOpen(entry);
          }}
          onClose={() => setPicking(null)}
        />
      )}
      {open && <EntryDetailModal entry={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function groupBy<T>(list: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of list) {
    const k = key(item);
    map.set(k, [...(map.get(k) ?? []), item]);
  }
  return map;
}
