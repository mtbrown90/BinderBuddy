"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Plus, Trash2, MessageCircle } from "lucide-react";
import type { TradeListing, TradeWant } from "@/types";
import CardTile from "@/components/CardTile";
import NewWantModal from "./NewWantModal";
import { deleteWant, messageUser } from "./actions";

function conditionOrGrade(listing: TradeListing) {
  return listing.is_graded ? `${listing.grading_company} ${listing.grade}` : (listing.condition ?? "—");
}

function ListingCard({ listing, canMessage }: { listing: TradeListing; canMessage: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-3 bg-panel border border-border rounded-2xl p-3">
      <div className="w-16 shrink-0">
        <CardTile name={listing.card_name} imageUrl={listing.image_url} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="font-semibold text-sm truncate">{listing.card_name}</div>
        <div className="text-xs text-muted truncate">
          {listing.set_name} · {conditionOrGrade(listing)}
        </div>
        {listing.trade_note && <p className="text-xs text-muted mt-1 line-clamp-2">{listing.trade_note}</p>}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted truncate">by {listing.author_username ?? "Unknown"}</span>
          {canMessage && (
            <button
              onClick={() => startTransition(() => messageUser(listing.user_id))}
              disabled={pending}
              className="flex items-center gap-1 text-xs font-semibold text-teal shrink-0 disabled:opacity-60"
            >
              <MessageCircle size={12} /> Message
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WantCard({ want, canMessage, canDelete }: { want: TradeWant; canMessage: boolean; canDelete: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <div className="bg-panel border border-border rounded-xl p-3">
      <div className="font-semibold text-sm">{want.card_name}</div>
      {want.note && <p className="text-xs text-muted mt-1">{want.note}</p>}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border">
        <span className="text-xs text-muted">by {want.author_username ?? "Unknown"}</span>
        {canMessage && (
          <button
            onClick={() => startTransition(() => messageUser(want.user_id))}
            disabled={pending}
            className="flex items-center gap-1 text-xs font-semibold text-teal disabled:opacity-60"
          >
            <MessageCircle size={12} /> Message
          </button>
        )}
        {canDelete &&
          (confirming ? (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-muted">Delete?</span>
              <button
                onClick={() => startTransition(() => deleteWant(want.id))}
                disabled={pending}
                className="font-semibold text-bad disabled:opacity-60"
              >
                Yes
              </button>
              <button onClick={() => setConfirming(false)} disabled={pending} className="text-muted">
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-bad"
            >
              <Trash2 size={12} /> Delete
            </button>
          ))}
      </div>
    </div>
  );
}

export default function TradingBoard({
  listings,
  wants,
  currentUserId,
  isAdmin,
  username,
}: {
  listings: TradeListing[];
  wants: TradeWant[];
  currentUserId: string | null;
  isAdmin: boolean;
  username: string | null;
}) {
  const [query, setQuery] = useState("");
  const [wantModalOpen, setWantModalOpen] = useState(false);

  const filteredListings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter((l) => l.card_name.toLowerCase().includes(q));
  }, [listings, query]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-semibold text-sm mb-2">Available to Trade</h2>
        <p className="text-xs text-muted mb-3">
          Cards other collectors have marked available. Mark your own from a card&apos;s detail view on your{" "}
          <Link href="/collection" className="text-teal font-semibold">
            Collection
          </Link>{" "}
          page.
        </p>
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search available cards…"
            className="w-full bg-panel-2 border border-border rounded-full pl-9 pr-4 py-2 text-sm text-ink placeholder:text-muted"
          />
        </div>
        {filteredListings.length === 0 ? (
          <div className="text-muted text-sm text-center py-8 bg-panel border border-border rounded-2xl">
            {listings.length === 0 ? "No cards available to trade yet." : "No cards match."}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredListings.map((l) => (
              <ListingCard key={l.id} listing={l} canMessage={currentUserId !== l.user_id} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Looking For</h2>
          <button
            onClick={() => setWantModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full brand-gradient text-[#0b0c14]"
          >
            <Plus size={13} /> Post a want
          </button>
        </div>
        {wants.length === 0 ? (
          <div className="text-muted text-sm text-center py-8 bg-panel border border-border rounded-2xl">
            No one&apos;s posted a want yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {wants.map((w) => (
              <WantCard
                key={w.id}
                want={w}
                canMessage={currentUserId !== w.user_id}
                canDelete={isAdmin || currentUserId === w.user_id}
              />
            ))}
          </div>
        )}
      </div>

      {wantModalOpen && <NewWantModal username={username} onClose={() => setWantModalOpen(false)} />}
    </div>
  );
}
