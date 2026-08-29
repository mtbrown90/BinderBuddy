"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteMasterSet } from "./actions";

export default function DeleteMasterSetButton({ masterSetId }: { masterSetId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted">Delete this masterset?</span>
        <button
          onClick={() => startTransition(() => deleteMasterSet(masterSetId))}
          disabled={pending}
          className="font-semibold text-bad disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button onClick={() => setConfirming(false)} disabled={pending} className="text-muted">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-bad"
    >
      <Trash2 size={13} /> Delete masterset
    </button>
  );
}
