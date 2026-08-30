"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import UsernameGate from "@/components/UsernameGate";
import { postWant } from "./actions";

export default function NewWantModal({
  username,
  onClose,
}: {
  username: string | null;
  onClose: () => void;
}) {
  const [currentUsername, setCurrentUsername] = useState(username);
  const [cardName, setCardName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cardName.trim()) return;
    setError(null);
    const formData = new FormData();
    formData.set("cardName", cardName.trim());
    formData.set("note", note.trim());
    startTransition(async () => {
      const result = await postWant(formData);
      if (result && "error" in result) setError(result.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div
        className="bg-panel border border-border rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div className="font-semibold">Post a want</div>
          <button onClick={onClose} className="text-muted shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <UsernameGate username={currentUsername} onSet={setCurrentUsername}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Card you&apos;re looking for
                <input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="e.g. Charizard VMAX"
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Note (optional)
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Condition, what you'll offer, etc."
                  rows={3}
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm resize-none"
                />
              </label>
              {error && <p className="text-xs text-bad">{error}</p>}
              <button
                type="submit"
                disabled={pending}
                className="brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 mt-1 disabled:opacity-60"
              >
                {pending ? "Posting…" : "Post want"}
              </button>
            </form>
          </UsernameGate>
        </div>
      </div>
    </div>
  );
}
