"use client";

import { useState, useTransition } from "react";
import { Pin, Lock, Trash2 } from "lucide-react";
import type { DiscussionReply, DiscussionThread } from "@/types";
import UsernameGate from "@/components/UsernameGate";
import { deleteThread, togglePin, toggleLock } from "../actions";
import { createReply, deleteReply } from "./actions";

export default function ThreadDetail({
  categorySlug,
  thread,
  replies,
  currentUserId,
  isAdmin,
  username,
}: {
  categorySlug: string;
  thread: DiscussionThread;
  replies: DiscussionReply[];
  currentUserId: string | null;
  isAdmin: boolean;
  username: string | null;
}) {
  const [currentUsername, setCurrentUsername] = useState(username);
  const [replyBody, setReplyBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmingDeleteThread, setConfirmingDeleteThread] = useState(false);
  const [confirmingDeleteReply, setConfirmingDeleteReply] = useState<string | null>(null);

  const canModifyThread = isAdmin || currentUserId === thread.user_id;

  function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setError(null);
    const formData = new FormData();
    formData.set("threadId", thread.id);
    formData.set("categorySlug", categorySlug);
    formData.set("body", replyBody.trim());
    startTransition(async () => {
      const result = await createReply(formData);
      if (result && "error" in result) setError(result.error);
      else setReplyBody("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-panel border border-border rounded-2xl p-4">
        <h1 className="font-semibold text-lg flex items-center gap-1.5 min-w-0 mb-1">
          {thread.is_pinned && <Pin size={14} className="text-amber shrink-0" />}
          {thread.is_locked && <Lock size={14} className="text-muted shrink-0" />}
          <span className="truncate">{thread.title}</span>
        </h1>
        <div className="text-xs text-muted mb-3">
          {thread.author_username ?? "Unknown"} · {new Date(thread.created_at).toLocaleDateString()}
        </div>
        <p className="text-sm whitespace-pre-wrap">{thread.body}</p>

        {canModifyThread && (
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-border">
            {isAdmin && (
              <>
                <button
                  onClick={() => startTransition(() => togglePin(thread.id, categorySlug, !thread.is_pinned))}
                  disabled={pending}
                  className="text-xs font-semibold text-muted hover:text-ink"
                >
                  {thread.is_pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  onClick={() => startTransition(() => toggleLock(thread.id, categorySlug, !thread.is_locked))}
                  disabled={pending}
                  className="text-xs font-semibold text-muted hover:text-ink"
                >
                  {thread.is_locked ? "Unlock" : "Lock"}
                </button>
              </>
            )}
            {confirmingDeleteThread ? (
              <span className="flex items-center gap-2 text-xs">
                <span className="text-muted">Delete this thread?</span>
                <button
                  onClick={() => startTransition(() => deleteThread(thread.id, categorySlug))}
                  disabled={pending}
                  className="font-semibold text-bad disabled:opacity-60"
                >
                  Yes, delete
                </button>
                <button onClick={() => setConfirmingDeleteThread(false)} disabled={pending} className="text-muted">
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmingDeleteThread(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-bad"
              >
                <Trash2 size={12} /> Delete thread
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {replies.length === 0 ? (
          <div className="text-muted text-sm text-center py-6 bg-panel border border-border rounded-2xl">
            No replies yet.
          </div>
        ) : (
          replies.map((r) => {
            const canModifyReply = isAdmin || currentUserId === r.user_id;
            return (
              <div key={r.id} className="bg-panel border border-border rounded-xl p-3">
                <div className="text-xs text-muted mb-1.5">
                  {r.author_username ?? "Unknown"} · {new Date(r.created_at).toLocaleDateString()}
                </div>
                <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                {canModifyReply && (
                  <div className="mt-2 pt-2 border-t border-border">
                    {confirmingDeleteReply === r.id ? (
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-muted">Delete this reply?</span>
                        <button
                          onClick={() => startTransition(() => deleteReply(r.id, categorySlug, thread.id))}
                          disabled={pending}
                          className="font-semibold text-bad disabled:opacity-60"
                        >
                          Yes, delete
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteReply(null)}
                          disabled={pending}
                          className="text-muted"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmingDeleteReply(r.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-bad"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {thread.is_locked ? (
        <p className="text-xs text-muted text-center py-3">This thread is locked — no new replies.</p>
      ) : (
        <UsernameGate username={currentUsername} onSet={setCurrentUsername}>
          <form onSubmit={submitReply} className="flex flex-col gap-2">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply…"
              rows={3}
              className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm resize-none"
            />
            {error && <p className="text-xs text-bad">{error}</p>}
            <button
              type="submit"
              disabled={pending || !replyBody.trim()}
              className="brand-gradient text-[#0b0c14] font-bold rounded-lg py-2 text-sm disabled:opacity-60 self-end px-5"
            >
              {pending ? "Posting…" : "Reply"}
            </button>
          </form>
        </UsernameGate>
      )}
    </div>
  );
}
