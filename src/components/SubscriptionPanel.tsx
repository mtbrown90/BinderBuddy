"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

// Shared between /sets/master/new (paywall) and /store (persistent
// management) — subscribing, and managing an existing subscription via
// Stripe's Customer Portal, look the same in both places.
export default function SubscriptionPanel({
  unlimited,
  hasBillingHistory,
}: {
  unlimited: boolean;
  hasBillingHistory: boolean;
}) {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [pending, setPending] = useState<"subscription" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(url: string, key: "subscription" | "portal", body?: object) {
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
      {error && <p className="text-bad text-sm">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setBillingInterval("month")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold border ${
            billingInterval === "month" ? "bg-panel-2 border-teal text-ink" : "border-border text-muted"
          }`}
        >
          $4.99/mo
        </button>
        <button
          type="button"
          onClick={() => setBillingInterval("year")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold border ${
            billingInterval === "year" ? "bg-panel-2 border-teal text-ink" : "border-border text-muted"
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
        className="flex items-center justify-center gap-1.5 brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 disabled:opacity-60"
      >
        <Sparkles size={15} /> {pending === "subscription" ? "Starting checkout…" : "Subscribe for unlimited"}
      </button>
      {hasBillingHistory && (
        <button
          onClick={() => go("/api/stripe/create-portal-session", "portal")}
          disabled={pending !== null}
          className="text-xs font-semibold text-muted hover:text-ink self-start"
        >
          {pending === "portal" ? "Opening…" : "Manage subscription"}
        </button>
      )}
    </div>
  );
}
