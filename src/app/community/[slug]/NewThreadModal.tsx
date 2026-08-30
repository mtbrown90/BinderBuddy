"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import UsernameGate from "@/components/UsernameGate";
import { createThread } from "./actions";

export default function NewThreadModal({
  categoryId,
  categorySlug,
  username,
  onClose,
}: {
  categoryId: string;
  categorySlug: string;
  username: string | null;
  onClose: () => void;
}) {
  const [currentUsername, setCurrentUsername] = useState(username);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setError(null);
    const formData = new FormData();
    formData.set("categoryId", categoryId);
    formData.set("categorySlug", categorySlug);
    formData.set("title", title.trim());
    formData.set("body", body.trim());
    startTransition(async () => {
      const result = await createThread(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div
        className="bg-panel border border-border rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div className="font-semibold">New thread</div>
          <button onClick={onClose} className="text-muted shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <UsernameGate username={currentUsername} onSet={setCurrentUsername}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's this about?"
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Body
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Say more…"
                  rows={5}
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm resize-none"
                  required
                />
              </label>
              {error && <p className="text-xs text-bad">{error}</p>}
              <button
                type="submit"
                disabled={pending}
                className="brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 mt-1 disabled:opacity-60"
              >
                {pending ? "Posting…" : "Post thread"}
              </button>
            </form>
          </UsernameGate>
        </div>
      </div>
    </div>
  );
}
