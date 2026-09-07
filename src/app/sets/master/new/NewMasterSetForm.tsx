"use client";

import { useActionState } from "react";
import { createMasterSet } from "./actions";

export default function NewMasterSetForm() {
  const [state, formAction, pending] = useActionState(createMasterSet, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3.5 bg-panel border border-border rounded-2xl p-5">
      <label className="flex flex-col gap-1.5 text-xs text-muted">
        Name
        <input
          name="name"
          required
          placeholder="e.g. Piplup Masterset"
          className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-xs text-muted">
        Description
        <textarea
          name="description"
          rows={3}
          placeholder="Optional notes about this checklist"
          className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
        />
      </label>
      {state?.error && <p className="text-bad text-sm">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create master set"}
      </button>
    </form>
  );
}
