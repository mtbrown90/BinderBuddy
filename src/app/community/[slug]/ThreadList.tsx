"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pin, Lock, Plus } from "lucide-react";
import type { DiscussionThread } from "@/types";
import NewThreadModal from "./NewThreadModal";

type SortOption = "activity" | "newest" | "replies";

export default function ThreadList({
  categoryId,
  categorySlug,
  threads,
  username,
}: {
  categoryId: string;
  categorySlug: string;
  threads: DiscussionThread[];
  username: string | null;
}) {
  const [sort, setSort] = useState<SortOption>("activity");
  const [open, setOpen] = useState(false);

  const sorted = useMemo(() => {
    const pinned = threads.filter((t) => t.is_pinned);
    const rest = threads.filter((t) => !t.is_pinned);
    const cmp = (a: DiscussionThread, b: DiscussionThread) => {
      switch (sort) {
        case "newest":
          return b.created_at.localeCompare(a.created_at);
        case "replies":
          return b.reply_count - a.reply_count;
        default:
          return b.last_activity_at.localeCompare(a.last_activity_at);
      }
    };
    return [...pinned.sort(cmp), ...rest.sort(cmp)];
  }, [threads, sort]);

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink"
        >
          <option value="activity">Sort: Recent activity</option>
          <option value="newest">Sort: Newest</option>
          <option value="replies">Sort: Most replies</option>
        </select>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full brand-gradient text-[#0b0c14]"
        >
          <Plus size={13} /> New thread
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
          No threads yet — start the first one.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((t) => (
            <Link
              key={t.id}
              href={`/community/${categorySlug}/${t.id}`}
              className="flex items-center justify-between gap-3 bg-panel border border-border rounded-xl px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {t.is_pinned && <Pin size={12} className="text-amber shrink-0" />}
                  {t.is_locked && <Lock size={12} className="text-muted shrink-0" />}
                  <span className="font-medium text-sm truncate">{t.title}</span>
                </div>
                <div className="text-xs text-muted truncate">
                  {t.author_username ?? "Unknown"} · {new Date(t.last_activity_at).toLocaleDateString()}
                </div>
              </div>
              <div className="text-xs text-muted shrink-0">
                {t.reply_count} repl{t.reply_count === 1 ? "y" : "ies"}
              </div>
            </Link>
          ))}
        </div>
      )}

      {open && (
        <NewThreadModal
          categoryId={categoryId}
          categorySlug={categorySlug}
          username={username}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
