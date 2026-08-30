"use client";

import { useState, useTransition, type ReactNode } from "react";
import { setUsername } from "@/app/community/actions";

// Wraps a Community compose form — swaps in a one-time "choose a username"
// prompt instead of the form until the signed-in user has one, since posts
// need a public-safe author name (profiles.display_name defaults to the
// user's email and must never be shown).
export default function UsernameGate({
  username,
  onSet,
  children,
}: {
  username: string | null;
  onSet: (username: string) => void;
  children: ReactNode;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (username) return <>{children}</>;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = value.trim();
    const formData = new FormData();
    formData.set("username", trimmed);
    startTransition(async () => {
      const result = await setUsername(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        onSet(trimmed);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-panel-2 border border-border rounded-xl p-3 flex flex-col gap-2">
      <p className="text-xs text-muted">Choose a username to post in the Community.</p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="username"
          className="flex-1 bg-panel border border-border rounded-lg px-3 py-1.5 text-sm text-ink"
        />
        <button
          type="submit"
          disabled={pending || value.trim().length < 3}
          className="brand-gradient text-[#0b0c14] font-bold rounded-lg px-3 py-1.5 text-sm disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="text-xs text-bad">{error}</p>}
    </form>
  );
}
