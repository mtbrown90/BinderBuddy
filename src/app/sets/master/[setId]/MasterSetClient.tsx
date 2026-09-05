"use client";

import { useState } from "react";
import Link from "next/link";
import { Store } from "lucide-react";
import type { MasterSetCard } from "@/types";
import AddCardSearch, { type SearchMode } from "./AddCardSearch";
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
  const [mode, setMode] = useState<SearchMode>("add");
  const [query, setQuery] = useState("");

  return (
    <>
      <div className="bg-panel border border-border rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Add cards manually</h2>
          <Link
            href="/store"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
          >
            <Store size={13} /> Bulk-add in the Store
          </Link>
        </div>
        <AddCardSearch
          masterSetId={masterSetId}
          existingCardIds={existingCardIds}
          mode={mode}
          onModeChange={setMode}
          query={query}
          onQueryChange={setQuery}
        />
        {admin && (
          <div className="mt-3">
            <ManualCardForm masterSetId={masterSetId} />
          </div>
        )}
      </div>

      <h2 className="font-semibold text-lg mb-3">Checklist</h2>
      <MasterSetGrid
        masterSetId={masterSetId}
        cards={cards}
        ownedKeys={ownedKeys}
        ownedValues={ownedValues}
        ownedPaid={ownedPaid}
        searchQuery={mode === "search" ? query : ""}
      />
    </>
  );
}
