"use client";

import { Check, ImageIcon } from "lucide-react";

function isHoloLabel(label?: string | null) {
  if (!label) return false;
  const l = label.toLowerCase();
  return l.includes("holo") || l.includes("alt art") || l.includes("full art");
}

export function VariationBadge({ label }: { label: string }) {
  const holo = isHoloLabel(label);
  return (
    <span
      className="inline-block text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{
        background: holo ? "linear-gradient(120deg, #00C2A8, #6C5CE7 45%, #C13584)" : "#3A3D4E",
        color: holo ? "#0B0C14" : "#B7BACB",
      }}
    >
      {label}
    </span>
  );
}

export default function CardTile({
  name,
  imageUrl,
  variationLabel,
  subtitle,
  priceLabel,
  owned,
  onClick,
}: {
  name: string;
  imageUrl?: string | null;
  variationLabel?: string | null;
  subtitle?: string;
  priceLabel?: string | null;
  owned?: boolean;
  onClick?: () => void;
}) {
  const holo = isHoloLabel(variationLabel);
  return (
    <div className={onClick ? "cursor-pointer" : ""} onClick={onClick}>
      <div
        className={`relative aspect-[5/7] bg-panel-2 border border-border rounded-lg overflow-hidden ${
          holo ? "shadow-[0_0_0_1.5px_var(--teal),0_0_18px_-4px_rgba(193,53,132,0.6)]" : ""
        } ${owned ? "ring-2 ring-good" : ""}`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className={`w-full h-full object-cover ${owned === false ? "grayscale opacity-60" : ""}`}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={22} className="text-muted" />
          </div>
        )}
        {owned && (
          <div className="absolute top-1 right-1 bg-good rounded-full p-0.5">
            <Check size={11} className="text-[#0b0c14]" strokeWidth={3} />
          </div>
        )}
      </div>
      <div className="mt-1.5">
        <div className="text-xs font-semibold leading-tight line-clamp-2">{name}</div>
        {(subtitle || priceLabel) && (
          <div className="flex items-center justify-between gap-1">
            {subtitle && <div className="text-[10px] text-muted truncate">{subtitle}</div>}
            {priceLabel && (
              <div className="text-[10px] text-good font-semibold shrink-0">{priceLabel}</div>
            )}
          </div>
        )}
        {variationLabel && (
          <div className="mt-1">
            <VariationBadge label={variationLabel} />
          </div>
        )}
      </div>
    </div>
  );
}
