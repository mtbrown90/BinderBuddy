"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { importOfficialCards, type ImportResult } from "./actions";

export default function ImportForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ImportResult | undefined, FormData>(
    importOfficialCards,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <input
        name="file"
        type="file"
        accept=".xlsx"
        required
        className="text-sm text-ink file:mr-3 file:py-2 file:px-3.5 file:rounded-full file:border-0 file:bg-panel-2 file:text-ink file:text-sm file:font-semibold"
      />
      {state?.error && <p className="text-bad text-sm">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 disabled:opacity-60"
      >
        {pending ? "Matching cards & importing…" : "Import cards"}
      </button>

      {state && !state.error && (
        <div className="text-sm bg-panel-2 border border-border rounded-lg p-3.5 flex flex-col gap-1.5">
          <p className="text-good font-medium">
            Added {state.added ?? 0} card{state.added === 1 ? "" : "s"} to your collection.
          </p>
          {state.rowErrors && state.rowErrors.length > 0 && (
            <ul className="text-amber text-xs list-disc pl-4">
              {state.rowErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => router.push("/collection")}
            className="text-teal text-xs font-semibold text-left mt-1"
          >
            View collection →
          </button>
        </div>
      )}
    </form>
  );
}
