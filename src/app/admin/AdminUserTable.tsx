"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, ShieldCheck, ShieldOff, Ban, Undo2 } from "lucide-react";
import type { AdminUserRow } from "@/types";
import { toggleRestricted, toggleBan } from "./actions";

type BadgeTone = "admin" | "restricted" | "banned";

function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  const styles: Record<BadgeTone, string> = {
    admin: "bg-panel-2 text-teal border-teal/40",
    restricted: "bg-panel-2 text-amber border-amber/40",
    banned: "bg-panel-2 text-bad border-bad/40",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${styles[tone]}`}>
      {label}
    </span>
  );
}

function UserRow({ user }: { user: AdminUserRow }) {
  const [pending, startTransition] = useTransition();
  const [confirmingBan, setConfirmingBan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleToggleRestricted() {
    setError(null);
    startTransition(async () => {
      try {
        await toggleRestricted(user.id, !user.is_restricted);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleToggleBan() {
    setError(null);
    setConfirmingBan(false);
    startTransition(async () => {
      try {
        await toggleBan(user.id, !user.banned);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="bg-panel border border-border rounded-xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm">{user.username ?? "(no username)"}</span>
            {user.is_admin && <Badge label="Admin" tone="admin" />}
            {user.is_restricted && <Badge label="Restricted" tone="restricted" />}
            {user.banned && <Badge label="Banned" tone="banned" />}
          </div>
          <div className="text-xs text-muted truncate">{user.email ?? "—"}</div>
          <div className="text-[11px] text-muted mt-0.5">
            Joined {new Date(user.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-bad mt-2">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border">
        <button
          onClick={handleToggleRestricted}
          disabled={pending}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink disabled:opacity-60"
        >
          {user.is_restricted ? (
            <>
              <ShieldCheck size={13} /> Unrestrict
            </>
          ) : (
            <>
              <ShieldOff size={13} /> Restrict
            </>
          )}
        </button>

        {user.banned ? (
          <button
            onClick={handleToggleBan}
            disabled={pending}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink disabled:opacity-60"
          >
            <Undo2 size={13} /> Unban
          </button>
        ) : confirmingBan ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-muted">Ban this account?</span>
            <button onClick={handleToggleBan} disabled={pending} className="font-semibold text-bad disabled:opacity-60">
              Yes, ban
            </button>
            <button onClick={() => setConfirmingBan(false)} disabled={pending} className="text-muted">
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmingBan(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-bad"
          >
            <Ban size={13} /> Ban
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminUserTable({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => (u.username ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <div>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or email…"
          className="w-full bg-panel-2 border border-border rounded-full pl-9 pr-4 py-2 text-sm text-ink placeholder:text-muted"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
          No users match.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}
