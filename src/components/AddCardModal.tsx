"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { CONDITIONS, GRADING_COMPANIES, conditionAdjustedPrice, type GradingCompany } from "@/types";
import { addOfficialCardToCollection } from "@/app/sets/[setId]/actions";

type Variation = { key: string; label: string; marketPrice: number | null };

export default function AddCardModal({
  card,
  initialVariationKey,
  onClose,
  onAdded,
}: {
  card: {
    id: string;
    name: string;
    number?: string;
    printedTotal?: number;
    setName: string;
    imageUrl: string;
    variations: Variation[];
  };
  initialVariationKey?: string;
  onClose: () => void;
  // Fires only when the card is actually added (not on cancel/backdrop-click)
  // — for callers that need to react to a real add, distinct from the modal
  // simply closing.
  onAdded?: () => void;
}) {
  const [variationKey, setVariationKey] = useState(initialVariationKey ?? card.variations[0]?.key ?? "normal");
  const [condition, setCondition] = useState<string>("Near Mint");
  const [quantity, setQuantity] = useState(1);
  // One price-paid slot per copy — buying several copies of the same card
  // over time (or in one trip) rarely means paying the same price for each.
  const [prices, setPrices] = useState<string[]>([""]);
  const [pending, startTransition] = useTransition();
  const variation = card.variations.find((v) => v.key === variationKey) ?? card.variations[0];

  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState<GradingCompany>("PSA");
  const [grade, setGrade] = useState("10");
  const [gradedPrice, setGradedPrice] = useState("");
  const [gradedPriceLoading, setGradedPriceLoading] = useState(false);
  const [gradedPricePulled, setGradedPricePulled] = useState(false);

  // Debounced auto-pull from PokemonPriceTracker whenever graded mode is on
  // and company/grade are set — the user can still edit the result before
  // saving, since it's a median eBay-sold estimate, not an appraisal.
  useEffect(() => {
    if (!isGraded) return;
    const gradeNum = Number(grade);
    if (!Number.isFinite(gradeNum) || gradeNum < 1 || gradeNum > 10) return;

    let cancelled = false;
    const t = setTimeout(async () => {
      setGradedPriceLoading(true);
      const cardNumberParam = card.number ? `&cardNumber=${encodeURIComponent(card.number)}` : "";
      const price = await fetch(
        `/api/graded-price?cardName=${encodeURIComponent(card.name)}&setName=${encodeURIComponent(
          card.setName
        )}${cardNumberParam}&company=${encodeURIComponent(gradingCompany)}&grade=${gradeNum}`
      )
        .then((r) => r.json())
        .then((d) => d.price as number | null)
        .catch(() => null);
      if (cancelled) return;
      setGradedPriceLoading(false);
      if (price != null) {
        setGradedPrice(String(price));
        setGradedPricePulled(true);
      } else {
        setGradedPricePulled(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isGraded, gradingCompany, grade, card.name, card.setName, card.number]);

  function handleQuantityChange(raw: string) {
    const n = Math.max(1, Number(raw) || 1);
    setQuantity(n);
    setPrices((prev) => {
      const next = prev.slice(0, n);
      while (next.length < n) next.push("");
      return next;
    });
  }

  function setPriceAt(i: number, value: string) {
    setPrices((prev) => prev.map((p, idx) => (idx === i ? value : p)));
  }

  const nearMintPrice = variation?.marketPrice ?? null;
  const estimatedPrice = nearMintPrice != null ? conditionAdjustedPrice(nearMintPrice, condition) : null;
  const numberLine = card.number
    ? `#${card.number}${card.printedTotal ? `/${card.printedTotal}` : ""}`
    : null;
  const subtitle = [card.setName, numberLine].filter(Boolean).join(" · ");

  function handleSubmit(formData: FormData) {
    formData.set("cardId", card.id);
    formData.set("cardName", card.name);
    formData.set("setName", card.setName);
    formData.set("cardNumber", card.number ?? "");
    formData.set("setPrintedTotal", card.printedTotal != null ? String(card.printedTotal) : "");
    formData.set("imageUrl", card.imageUrl);
    formData.set("variationType", variation?.label ?? "Normal");
    formData.set("isGraded", isGraded ? "true" : "false");
    if (isGraded) {
      formData.set("gradingCompany", gradingCompany);
      formData.set("grade", grade);
      formData.set("marketPrice", gradedPrice.trim() ? gradedPrice : "");
    } else {
      formData.set("marketPrice", estimatedPrice != null ? String(estimatedPrice) : "");
    }
    formData.set(
      "pricesPaid",
      JSON.stringify(prices.map((p) => (p.trim() ? Number(p) : null)))
    );
    startTransition(async () => {
      await addOfficialCardToCollection(formData);
      onAdded?.();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div
        className="bg-panel border border-border rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="font-semibold">{card.name}</div>
            {subtitle && <div className="text-xs text-muted mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="text-muted shrink-0">
            <X size={18} />
          </button>
        </div>

        {card.imageUrl && (
          <div className="flex justify-center px-5 pt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.imageUrl}
              alt={card.name}
              className="h-48 rounded-lg object-contain"
            />
          </div>
        )}

        <form action={handleSubmit} className="flex flex-col gap-3.5 px-5 py-4">
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            Variation
            <select
              value={variationKey}
              onChange={(e) => setVariationKey(e.target.value)}
              className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
            >
              {card.variations.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label} {v.marketPrice != null ? `($${v.marketPrice.toFixed(2)} NM)` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1.5 text-xs text-muted">
            Raw or graded?
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsGraded(false)}
                className={`rounded-lg py-2 text-sm font-semibold border ${
                  !isGraded ? "bg-panel-2 border-teal text-ink" : "border-border text-muted"
                }`}
              >
                Raw
              </button>
              <button
                type="button"
                onClick={() => setIsGraded(true)}
                className={`rounded-lg py-2 text-sm font-semibold border ${
                  isGraded ? "bg-panel-2 border-teal text-ink" : "border-border text-muted"
                }`}
              >
                Graded
              </button>
            </div>
          </div>

          {isGraded ? (
            <>
              <div className="flex flex-col gap-1.5 text-xs text-muted">
                Grading company
                <div className="grid grid-cols-5 gap-1.5">
                  {GRADING_COMPANIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setGradingCompany(c)}
                      className={`rounded-lg py-1.5 text-xs font-semibold border ${
                        gradingCompany === c ? "bg-panel-2 border-teal text-ink" : "border-border text-muted"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs text-muted">
                  Quantity
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-muted">
                  Grade
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={10}
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Market value ($)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder={gradedPriceLoading ? "Looking up…" : "0.00"}
                  value={gradedPrice}
                  onChange={(e) => {
                    setGradedPrice(e.target.value);
                    setGradedPricePulled(false);
                  }}
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>
              <p className="text-[10.5px] text-muted -mt-2">
                {gradingCompany === "TAG" || gradingCompany === "Other"
                  ? "No pricing data source covers this grading company — enter the value yourself."
                  : gradedPricePulled
                    ? "Pulled from PokemonPriceTracker — median recent eBay sold price for this grade. Edit if you know better."
                    : gradedPriceLoading
                      ? "Looking up recent eBay sold prices for this grade…"
                      : "No recent eBay sales found for this exact grade — enter the value yourself."}
              </p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs text-muted">
                  Quantity
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-muted">
                  Condition
                  <select
                    name="condition"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {estimatedPrice != null && (
                <div className="flex items-center justify-between text-xs bg-panel-2 border border-border rounded-lg px-3 py-2">
                  <span className="text-muted">Est. market value ({condition})</span>
                  <span className="font-semibold">${estimatedPrice.toFixed(2)}</span>
                </div>
              )}
              {estimatedPrice != null && condition !== "Near Mint" && condition !== "Mint" && (
                <p className="text-[10.5px] text-muted -mt-2">
                  pokemontcg.io only prices Near Mint (${nearMintPrice!.toFixed(2)}) — this is a rough
                  condition discount estimate, not a real quoted price.
                </p>
              )}
            </>
          )}

          {quantity === 1 ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Price paid ($)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  value={prices[0] ?? ""}
                  onChange={(e) => setPriceAt(0, e.target.value)}
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Date acquired
                <input
                  name="dateAcquired"
                  type="date"
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Price paid per copy ($)</span>
              <div className="grid grid-cols-2 gap-2">
                {prices.map((p, i) => (
                  <input
                    key={i}
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder={`Copy ${i + 1}`}
                    value={p}
                    onChange={(e) => setPriceAt(i, e.target.value)}
                    className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                  />
                ))}
              </div>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                Date acquired
                <input
                  name="dateAcquired"
                  type="date"
                  className="bg-panel-2 border border-border rounded-lg px-3 py-2 text-ink text-sm"
                />
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="brand-gradient text-[#0b0c14] font-bold rounded-lg py-2.5 mt-1 disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add to binder"}
          </button>
        </form>
      </div>
    </div>
  );
}
