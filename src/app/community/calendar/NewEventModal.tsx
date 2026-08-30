"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import UsernameGate from "@/components/UsernameGate";
import { createEvent } from "./actions";

export default function NewEventModal({
  username,
  onClose,
}: {
  username: string | null;
  onClose: () => void;
}) {
  const [currentUsername, setCurrentUsername] = useState(username);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [eventUrl, setEventUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;
    setError(null);
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("eventDate", eventDate);
    formData.set("location", location.trim());
    formData.set("description", description.trim());
    formData.set("eventUrl", eventUrl.trim());
    startTransition(async () => {
      const result = await createEvent(formData);
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
          <div className="font-semibold">New event</div>
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
                  placeholder="e.g. Springfield Card Show"
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Date
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Location
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, venue…"
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details, hours, admission…"
                  rows={4}
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm resize-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Event link (optional)
                <input
                  value={eventUrl}
                  onChange={(e) => setEventUrl(e.target.value)}
                  placeholder="https://…"
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>
              {error && <p className="text-xs text-bad">{error}</p>}
              <button
                type="submit"
                disabled={pending}
                className="brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 mt-1 disabled:opacity-60"
              >
                {pending ? "Posting…" : "Post event"}
              </button>
            </form>
          </UsernameGate>
        </div>
      </div>
    </div>
  );
}
