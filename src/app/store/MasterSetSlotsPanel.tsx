"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

export default function MasterSetSlotsPanel({
  ownedCount,
  allowedSlots,
  unlimited,
  nextSlotPriceCents,
  hasBillingHistory,
}: {
  ownedCount: number;
  allowedSlots: number;
  unlimited: boolean;
  nextSlotPriceCents: number;
  // Has a Stripe customer on file — shown a "Manage subscription" link
  // even if their subscription has since lapsed (past_due/canceled), so
  // they can fix a payment method or resubscribe from the portal.
  hasBillingHistory: boolean;
}) {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [pending, setPending] = useState<"slot" | "subscription" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(url: string, key: typeof pending, body?: object) {
    setPending(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong");
        setPending(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong");
      setPending(null);
    }
  }

  if (unlimited) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">You have unlimited master sets.</p>
        {error && <p className="text-bad text-sm">{error}</p>}
        <button
          onClick={() => go("/api/stripe/create-portal-session", "portal")}
          disabled={pending !== null}
          className="bg-panel-2 border border-border rounded-lg py-2 text-sm font-semibold disabled:opacity-60 self-start px-4"
        >
          {pending === "portal" ? "Opening…" : "Manage subscription"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        {ownedCount}/{allowedSlots} used — 1 master set is free, then buy slots one at a time or subscribe for
        unlimited.
      </p>
      {error && <p className="text-bad text-sm">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => go("/api/stripe/create-slot-checkout", "slot")}
          disabled={pending !== null}
          className="bg-panel-2 border border-border rounded-lg px-3.5 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {pending === "slot" ? "Starting…" : `Buy 1 slot — $${(nextSlotPriceCents / 100).toFixed(2)}`}
        </button>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setBillingInterval("month")}
            className={`px-2.5 py-2 text-xs font-semibold ${
              billingInterval === "month" ? "bg-panel-2 text-ink" : "text-muted"
            }`}
          >
            $4.99/mo
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("year")}
            className={`px-2.5 py-2 text-xs font-semibold border-l border-border ${
              billingInterval === "year" ? "bg-panel-2 text-ink" : "text-muted"
            }`}
          >
            $49.99/yr
          </button>
        </div>
        <button
          onClick={() =>
            go("/api/stripe/create-subscription-checkout", "subscription", { interval: billingInterval })
          }
          disabled={pending !== null}
          className="flex items-center gap-1.5 brand-gradient text-[#0b0c14] font-bold rounded-lg px-3.5 py-2 text-sm disabled:opacity-60"
        >
          <Sparkles size={14} /> {pending === "subscription" ? "Starting…" : "Subscribe for unlimited"}
        </button>
        {hasBillingHistory && (
          <button
            onClick={() => go("/api/stripe/create-portal-session", "portal")}
            disabled={pending !== null}
            className="text-xs font-semibold text-muted hover:text-ink"
          >
            {pending === "portal" ? "Opening…" : "Manage subscription"}
          </button>
        )}
      </div>
    </div>
  );
}
