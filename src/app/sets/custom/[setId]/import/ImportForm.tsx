"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { importCustomCards, type ImportResult } from "./actions";

export default function ImportForm({ setId }: { setId: string }) {
  const router = useRouter();
  const boundAction = importCustomCards.bind(null, setId);
  const [state, formAction, pending] = useActionState<ImportResult | undefined, FormData>(
    boundAction,
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
        {pending ? "Importing…" : "Import cards"}
      </button>

      {state && !state.error && (
        <div className="text-sm bg-panel-2 border border-border rounded-lg p-3.5 flex flex-col gap-1.5">
          <p className="text-good font-medium">
            Imported {state.variationsWritten ?? 0} variation{state.variationsWritten === 1 ? "" : "s"} across{" "}
            {state.cardsCreated ?? 0} new card{state.cardsCreated === 1 ? "" : "s"}
            {state.cardsUpdated ? ` (${state.cardsUpdated} existing updated)` : ""}.
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
            onClick={() => router.push(`/sets/custom/${setId}`)}
            className="text-teal text-xs font-semibold text-left mt-1"
          >
            View set →
          </button>
        </div>
      )}
    </form>
  );
}
