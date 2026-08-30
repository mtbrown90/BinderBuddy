"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Trash2, DollarSign, Repeat, Undo2, Search, Plus, Check } from "lucide-react";
import type { CollectionEntry } from "@/types";
import CardTile from "@/components/CardTile";
import AddCardModal from "@/components/AddCardModal";
import { removeCollectionEntry, markEntrySold, markEntryTraded, markEntryOwned } from "./actions";

type Mode = "view" | "sell" | "trade";

type Variation = { key: string; label: string; marketPrice: number | null };
type CardResult = {
  id: string;
  name: string;
  number: string;
  setName: string;
  imageUrl: string;
  variations: Variation[];
};

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function EntryDetailModal({
  entry,
  onClose,
}: {
  entry: CollectionEntry;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("view");
  const [pending, startTransition] = useTransition();
  const paid = Number(entry.price_paid) || 0;
  const totalCost = paid * entry.quantity;
  const market = Number(entry.market_price) || 0;
  const unrealized = market - paid;

  const [tradedForCardName, setTradedForCardName] = useState("");
  const [addReceivedCard, setAddReceivedCard] = useState(false);
  const [receivedQuery, setReceivedQuery] = useState("");
  const debouncedReceivedQuery = useDebounced(receivedQuery.trim(), 350);
  const receivedSearching = debouncedReceivedQuery.length >= 2;
  const [receivedResults, setReceivedResults] = useState<CardResult[]>([]);
  const [receivedLoading, setReceivedLoading] = useState(false);
  const [addedCardId, setAddedCardId] = useState<string | null>(null);
  const [openAddModalFor, setOpenAddModalFor] = useState<CardResult | null>(null);

  useEffect(() => {
    if (!receivedSearching) return;
    let cancelled = false;

    async function run() {
      setReceivedLoading(true);
      const cards = await fetch(`/api/search-cards?q=${encodeURIComponent(debouncedReceivedQuery)}`)
        .then((r) => r.json())
        .then((d) => (d.cards ?? []) as CardResult[])
        .catch(() => []);
      if (cancelled) return;
      setReceivedResults(cards);
      setReceivedLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedReceivedQuery, receivedSearching]);

  function handleRemove() {
    startTransition(async () => {
      await removeCollectionEntry(entry.id);
      onClose();
    });
  }

  function handleRevert() {
    startTransition(async () => {
      await markEntryOwned(entry.id);
    });
  }

  function handleSell(formData: FormData) {
    startTransition(async () => {
      await markEntrySold(entry.id, formData);
      setMode("view");
    });
  }

  function handleTrade(formData: FormData) {
    startTransition(async () => {
      await markEntryTraded(entry.id, formData);
      setMode("view");
    });
  }

  const realized =
    entry.status === "sold"
      ? (entry.sold_price ?? 0) - totalCost
      : entry.status === "traded"
        ? (entry.traded_cash_received ?? 0) + (entry.traded_for_card_value ?? 0) - totalCost
        : null;

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
            {entry.is_graded ? (
              <Row label="Grade" value={`${entry.grading_company} ${entry.grade}`} />
            ) : (
              <Row label="Condition" value={entry.condition ?? "—"} />
            )}
            <Row label="Quantity" value={String(entry.quantity)} />
            <Row label="Price paid" value={`$${totalCost.toFixed(2)}`} />
            {entry.status === "owned" && (
              <>
                <Row label="Market price" value={`$${market.toFixed(2)}`} />
                <Row
                  label="Gain / loss"
                  value={`${unrealized >= 0 ? "+" : ""}${unrealized.toFixed(2)}`}
                  valueClassName={unrealized >= 0 ? "text-good" : "text-bad"}
                />
              </>
            )}
            {entry.date_acquired && <Row label="Acquired" value={entry.date_acquired} />}

            {entry.status === "sold" && (
              <>
                <Row label="Sold" value={entry.sold_date ?? "—"} />
                <Row label="Sold for" value={`$${(entry.sold_price ?? 0).toFixed(2)}`} />
              </>
            )}
            {entry.status === "traded" && (
              <>
                <Row label="Traded" value={entry.traded_date ?? "—"} />
                {entry.traded_for_card_name && (
                  <Row label="Received card" value={entry.traded_for_card_name} />
                )}
                {entry.traded_for_card_value != null && (
                  <Row label="Received card value" value={`$${entry.traded_for_card_value.toFixed(2)}`} />
                )}
                {entry.traded_cash_received != null && (
                  <Row label="Cash received" value={`$${entry.traded_cash_received.toFixed(2)}`} />
                )}
              </>
            )}
            {realized != null && (
              <Row
                label="Realized gain / loss"
                value={`${realized >= 0 ? "+" : ""}${realized.toFixed(2)}`}
                valueClassName={realized >= 0 ? "text-good" : "text-bad"}
              />
            )}
          </div>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-2">
          {mode === "view" && entry.status === "owned" && (
            <div className="flex gap-2">
              <button
                onClick={() => setMode("sell")}
                className="flex-1 flex items-center justify-center gap-1.5 bg-panel-2 border border-border rounded-lg py-2.5 text-sm font-semibold"
              >
                <DollarSign size={14} /> Mark as sold
              </button>
              <button
                onClick={() => {
                  setTradedForCardName("");
                  setAddReceivedCard(false);
                  setReceivedQuery("");
                  setAddedCardId(null);
                  setMode("trade");
                }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-panel-2 border border-border rounded-lg py-2.5 text-sm font-semibold"
              >
                <Repeat size={14} /> Mark as traded
              </button>
            </div>
          )}

          {mode === "sell" && (
            <form action={handleSell} className="flex flex-col gap-2.5 bg-panel-2 border border-border rounded-xl p-3.5">
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Total sold for ($)
                <input
                  name="soldPrice"
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  placeholder="0.00"
                  className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Date sold
                <input
                  name="soldDate"
                  type="date"
                  className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setMode("view")}
                  className="flex-1 text-sm font-semibold border border-border rounded-lg py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 brand-gradient text-[#0b0c14] font-bold rounded-lg py-2 text-sm disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          )}

          {mode === "trade" && (
            <form
              action={handleTrade}
              className="flex flex-col gap-2.5 bg-panel-2 border border-border rounded-xl p-3.5"
            >
              <p className="text-[11px] text-muted">
                Enter a card received, cash received, or both.
              </p>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Card received
                <input
                  name="tradedForCardName"
                  value={tradedForCardName}
                  onChange={(e) => setTradedForCardName(e.target.value)}
                  placeholder="e.g. Charizard VMAX"
                  className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>

              <div className="flex flex-col gap-1.5 text-xs text-muted">
                Add that card to your collection too?
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAddReceivedCard(false)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold border ${
                      !addReceivedCard ? "bg-panel-2 border-teal text-ink" : "border-border text-muted"
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddReceivedCard(true)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold border ${
                      addReceivedCard ? "bg-panel-2 border-teal text-ink" : "border-border text-muted"
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {addReceivedCard && (
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      value={receivedQuery}
                      onChange={(e) => setReceivedQuery(e.target.value)}
                      placeholder="Search for the card you received…"
                      className="w-full bg-panel border border-border rounded-full pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted"
                    />
                  </div>
                  {receivedSearching && (
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {receivedLoading ? (
                        <div className="text-muted text-xs text-center py-2">Searching…</div>
                      ) : receivedResults.length === 0 ? (
                        <div className="text-muted text-xs text-center py-2">No cards found.</div>
                      ) : (
                        receivedResults.map((c) => {
                          const added = addedCardId === c.id;
                          return (
                            <div
                              key={c.id}
                              className="flex items-center gap-2 bg-panel border border-border rounded-lg px-2.5 py-1.5"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={c.imageUrl} alt={c.name} className="w-6 h-8 object-cover rounded" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate">{c.name}</div>
                                <div className="text-[10px] text-muted truncate">{c.setName}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setOpenAddModalFor(c)}
                                disabled={added}
                                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full disabled:opacity-60"
                                style={{
                                  background: added ? "transparent" : "var(--teal)",
                                  color: added ? "var(--good)" : "#0b0c14",
                                }}
                              >
                                {added ? (
                                  <>
                                    <Check size={11} /> Added
                                  </>
                                ) : (
                                  <>
                                    <Plus size={11} /> Add
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex flex-col gap-1.5 text-xs text-muted">
                  That card&apos;s value ($)
                  <input
                    name="tradedForCardValue"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-muted">
                  Cash received ($)
                  <input
                    name="tradedCashReceived"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Date traded
                <input
                  name="tradedDate"
                  type="date"
                  className="bg-panel border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setMode("view")}
                  className="flex-1 text-sm font-semibold border border-border rounded-lg py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 brand-gradient text-[#0b0c14] font-bold rounded-lg py-2 text-sm disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          )}

          {mode === "view" && entry.status !== "owned" && (
            <button
              onClick={handleRevert}
              disabled={pending}
              className="w-full flex items-center justify-center gap-1.5 bg-panel-2 border border-border rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              <Undo2 size={14} /> {pending ? "Reverting…" : "Revert to owned"}
            </button>
          )}

          {mode === "view" && (
            <button
              onClick={handleRemove}
              disabled={pending}
              className="w-full flex items-center justify-center gap-1.5 text-bad border border-bad/40 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              <Trash2 size={14} /> {pending ? "Removing…" : "Remove from collection"}
            </button>
          )}
        </div>
      </div>
      {openAddModalFor && (
        <AddCardModal
          card={openAddModalFor}
          onClose={() => setOpenAddModalFor(null)}
          onAdded={() => {
            setAddedCardId(openAddModalFor.id);
            if (!tradedForCardName.trim()) setTradedForCardName(openAddModalFor.name);
          }}
        />
      )}
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
