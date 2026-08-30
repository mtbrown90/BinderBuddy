"use client";

import { useState, useTransition } from "react";
import type { Message } from "@/types";
import { sendMessage } from "./actions";

export default function MessageThread({
  conversationId,
  messages,
  currentUserId,
  otherUsername,
}: {
  conversationId: string;
  messages: Message[];
  currentUserId: string;
  otherUsername: string | null;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    const formData = new FormData();
    formData.set("body", body.trim());
    startTransition(async () => {
      const result = await sendMessage(conversationId, formData);
      if (result && "error" in result) setError(result.error);
      else setBody("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {messages.length === 0 ? (
          <div className="text-muted text-sm text-center py-6 bg-panel border border-border rounded-2xl">
            No messages yet — say hi to {otherUsername ?? "them"}.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                    mine ? "brand-gradient text-[#0b0c14]" : "bg-panel border border-border"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className={`text-[10px] mt-1 ${mine ? "text-[#0b0c14]/70" : "text-muted"}`}>
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          rows={3}
          className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm resize-none"
        />
        {error && <p className="text-xs text-bad">{error}</p>}
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="brand-gradient text-[#0b0c14] font-bold rounded-lg py-2 text-sm disabled:opacity-60 self-end px-5"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
