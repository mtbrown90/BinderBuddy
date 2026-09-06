"use client";

import { useState } from "react";
import Link from "next/link";
import { Store, Search, Plus } from "lucide-react";
import type { MasterSetCard } from "@/types";
import AddCardSearch from "./AddCardSearch";
import MasterSetGrid from "./MasterSetGrid";
import ManualCardForm from "./ManualCardForm";

export default function MasterSetClient({
  masterSetId,
  cards,
  existingCardIds,
  ownedKeys,
  ownedValues,
  ownedPaid,
  admin,
}: {
  masterSetId: string;
  cards: MasterSetCard[];
  existingCardIds: string[];
  ownedKeys: Set<string>;
  ownedValues: Record<string, number>;
  ownedPaid: Record<string, number>;
  admin: boolean;
}) {
  // Searching the checklist you already have and adding a card that isn't
  // in it yet are different actions on different data (local rows vs. the
  // full pokemontcg.io catalog) — kept as two separate controls instead of
  // one input with a mode switch, so the box you're typing in always does
  // what its placeholder says.
  const [checklistQuery, setChecklistQuery] = useState("");
  const [addingCard, setAddingCard] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">Checklist</h2>
        <Link href="/store" className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink">
          <Store size={13} /> Bulk-add in the Store
        </Link>
      </div>

      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={checklistQuery}
            onChange={(e) => setChecklistQuery(e.target.value)}
            placeholder="Search this checklist by name or number…"
            className="w-full bg-panel-2 border border-border rounded-full pl-9 pr-4 py-2 text-sm text-ink placeholder:text-muted"
          />
        </div>
        <button
          onClick={() => setAddingCard(true)}
          className="flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-border rounded-full px-3.5 py-2 shrink-0"
        >
          <Plus size={15} /> Add card
        </button>
      </div>

      {admin && (
        <div className="mb-5">
          <ManualCardForm masterSetId={masterSetId} />
        </div>
      )}

      <MasterSetGrid
        masterSetId={masterSetId}
        cards={cards}
        ownedKeys={ownedKeys}
        ownedValues={ownedValues}
        ownedPaid={ownedPaid}
        searchQuery={checklistQuery}
      />

      {addingCard && (
        <AddCardSearch
          masterSetId={masterSetId}
          existingCardIds={existingCardIds}
          onClose={() => setAddingCard(false)}
        />
      )}
    </>
  );
}
