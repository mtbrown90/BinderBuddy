"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { SupplementalCard } from "@/types";
import { deleteSupplementalCard } from "./actions";

function CatalogRow({ card }: { card: SupplementalCard }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    setConfirming(false);
    startTransition(async () => {
      try {
        await deleteSupplementalCard(card.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const number = card.card_number
    ? `#${card.card_number}${card.set_printed_total ? `/${card.set_printed_total}` : ""}`
    : null;
  const subtitle = [card.set_name, number, card.variation_type].filter(Boolean).join(" · ");

  return (
    <div className="flex items-center gap-3 bg-panel border border-border rounded-xl p-3">
      {card.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.image_url} alt={card.card_name} className="h-14 rounded object-contain shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm truncate">{card.card_name}</div>
        <div className="text-xs text-muted truncate">{subtitle}</div>
        {(card.artist || card.types.length > 0) && (
          <div className="text-[11px] text-muted truncate">
            {[card.artist, card.types.join(", ")].filter(Boolean).join(" · ")}
          </div>
        )}
        {error && <p className="text-xs text-bad">{error}</p>}
      </div>
      {confirming ? (
        <span className="flex items-center gap-2 text-xs shrink-0">
          <button onClick={handleDelete} disabled={pending} className="font-semibold text-bad disabled:opacity-60">
            Remove
          </button>
          <button onClick={() => setConfirming(false)} className="text-muted">
            Cancel
          </button>
        </span>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          disabled={pending}
          title="Remove from the promo catalog"
          className="text-muted hover:text-bad shrink-0 disabled:opacity-60"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

export default function PromoCatalog({ cards }: { cards: SupplementalCard[] }) {
  return (
    <div className="mb-8">
      <h2 className="font-semibold text-sm mb-1">Promo catalog</h2>
      <p className="text-xs text-muted mb-3">
        Cards pokemontcg.io doesn&apos;t list, included automatically in any master set whose search matches them.
        Add one with &quot;Add a card the API is missing&quot; on a master set&apos;s page.
      </p>
      {cards.length === 0 ? (
        <div className="text-muted text-sm text-center py-6 bg-panel border border-border rounded-2xl">
          No promo cards yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map((c) => (
            <CatalogRow key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
