"use client";

import { useState } from "react";
import { Lock, Sparkles } from "lucide-react";

export default function MasterSetPaywall({
  ownedCount,
  allowedSlots,
  nextSlotPriceCents,
}: {
  ownedCount: number;
  allowedSlots: number;
  nextSlotPriceCents: number;
}) {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [pending, setPending] = useState<"slot" | "subscription" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buySlot() {
    setPending("slot");
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-slot-checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn't start checkout");
        setPending(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't start checkout");
      setPending(null);
    }
  }

  async function subscribe() {
    setPending("subscription");
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-subscription-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: billingInterval }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn't start checkout");
        setPending(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't start checkout");
      setPending(null);
    }
  }

  return (
    <div className="bg-panel border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Lock size={15} />
        You&apos;ve used {ownedCount} of {allowedSlots} master set{allowedSlots === 1 ? "" : "s"}.
      </div>

      <div className="bg-panel-2 border border-border rounded-xl p-4 flex flex-col gap-2">
        <div className="font-semibold text-sm">Buy one more slot</div>
        <p className="text-xs text-muted">A single additional master set, no subscription.</p>
        {error && <p className="text-bad text-sm">{error}</p>}
        <button
          onClick={buySlot}
          disabled={pending !== null}
          className="bg-panel border border-border rounded-lg py-2 text-sm font-semibold disabled:opacity-60"
        >
          {pending === "slot" ? "Starting checkout…" : `Buy 1 slot — $${(nextSlotPriceCents / 100).toFixed(2)}`}
        </button>
      </div>

      <div className="bg-panel-2 border border-teal/40 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-sm">
          <Sparkles size={14} className="text-teal" /> Get unlimited master sets
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBillingInterval("month")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold border ${
              billingInterval === "month" ? "bg-panel border-teal text-ink" : "border-border text-muted"
            }`}
          >
            $4.99/mo
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("year")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold border ${
              billingInterval === "year" ? "bg-panel border-teal text-ink" : "border-border text-muted"
            }`}
          >
            $49.99/yr
          </button>
        </div>
        <button
          onClick={subscribe}
          disabled={pending !== null}
          className="brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 disabled:opacity-60"
        >
          {pending === "subscription" ? "Starting checkout…" : "Subscribe for unlimited"}
        </button>
      </div>
    </div>
  );
}
