"use client";

import { useState, useTransition } from "react";
import { CalendarDays, MapPin, Plus, Trash2, ExternalLink, ChevronDown } from "lucide-react";
import type { CalendarEvent } from "@/types";
import NewEventModal from "./NewEventModal";
import { deleteEvent } from "./actions";

function formatDate(dateStr: string) {
  // event_date is a plain SQL date (yyyy-mm-dd) — parse as UTC so it
  // doesn't shift a day depending on the viewer's timezone.
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EventCard({
  event,
  canDelete,
}: {
  event: CalendarEvent;
  canDelete: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="bg-panel border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-sm">{event.title}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted mt-1">
            <CalendarDays size={12} /> {formatDate(event.event_date)}
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted mt-1">
              <MapPin size={12} /> {event.location}
            </div>
          )}
        </div>
      </div>
      {event.description && <p className="text-sm text-muted mt-3 whitespace-pre-wrap">{event.description}</p>}
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>Posted by {event.author_username ?? "Unknown"}</span>
          {event.event_url && (
            <a
              href={event.event_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-teal font-semibold"
            >
              Visit event page <ExternalLink size={11} />
            </a>
          )}
        </div>
        {canDelete &&
          (confirming ? (
            <span className="flex items-center gap-2 text-xs shrink-0">
              <span className="text-muted">Delete?</span>
              <button
                onClick={() => startTransition(() => deleteEvent(event.id))}
                disabled={pending}
                className="font-semibold text-bad disabled:opacity-60"
              >
                Yes
              </button>
              <button onClick={() => setConfirming(false)} disabled={pending} className="text-muted">
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-bad shrink-0"
            >
              <Trash2 size={12} /> Delete
            </button>
          ))}
      </div>
    </div>
  );
}

export default function EventList({
  upcoming,
  past,
  currentUserId,
  isAdmin,
  username,
}: {
  upcoming: CalendarEvent[];
  past: CalendarEvent[];
  currentUserId: string | null;
  isAdmin: boolean;
  username: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);

  function canDelete(event: CalendarEvent) {
    return isAdmin || currentUserId === event.user_id;
  }

  return (
    <>
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full brand-gradient text-[#0b0c14]"
        >
          <Plus size={13} /> Add event
        </button>
      </div>

      {upcoming.length === 0 ? (
        <div className="text-muted text-sm text-center py-10 bg-panel border border-border rounded-2xl">
          No upcoming shows yet — be the first to post one.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} canDelete={canDelete(e)} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-5">
          <button
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
          >
            <ChevronDown size={13} className={showPast ? "rotate-180" : ""} />
            Past events ({past.length})
          </button>
          {showPast && (
            <div className="flex flex-col gap-3 mt-3">
              {past.map((e) => (
                <EventCard key={e.id} event={e} canDelete={canDelete(e)} />
              ))}
            </div>
          )}
        </div>
      )}

      {open && <NewEventModal username={username} onClose={() => setOpen(false)} />}
    </>
  );
}
