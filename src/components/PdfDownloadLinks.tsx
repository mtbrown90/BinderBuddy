import { FileDown } from "lucide-react";
import type { MastersetPdfPurchase } from "@/types";

const STYLE_LABELS: Record<string, string> = {
  color: "full color",
  bw: "black & white",
  text: "text-only",
};

// "all" purchases unlock all three individual PDFs — rendered by the same
// route via a ?style= query param (see
// src/app/api/masterset-pdf/[purchaseId]/route.ts).
export default function PdfDownloadLinks({ purchases }: { purchases: MastersetPdfPurchase[] }) {
  if (purchases.length === 0) return null;

  return (
    <div className="bg-panel border border-border rounded-2xl p-4 mb-5">
      <h2 className="font-semibold text-sm mb-3">Your placeholder PDFs</h2>
      <div className="flex flex-col gap-2">
        {purchases.map((p) =>
          p.style === "all" ? (
            <div key={p.id} className="flex flex-wrap gap-2">
              {(["color", "bw", "text"] as const).map((s) => (
                <a
                  key={s}
                  href={`/api/masterset-pdf/${p.id}?style=${s}`}
                  className="flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-border rounded-lg px-3 py-2"
                >
                  <FileDown size={14} className="text-teal" /> Download ({STYLE_LABELS[s]})
                </a>
              ))}
            </div>
          ) : (
            <a
              key={p.id}
              href={`/api/masterset-pdf/${p.id}`}
              className="flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-border rounded-lg px-3 py-2"
            >
              <FileDown size={14} className="text-teal" /> Download ({STYLE_LABELS[p.style] ?? p.style})
            </a>
          )
        )}
      </div>
    </div>
  );
}
