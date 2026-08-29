import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ImportForm from "./ImportForm";

export default function ImportOfficialCardsPage() {
  return (
    <div>
      <Link href="/collection" className="flex items-center gap-1 text-sm text-muted mb-3">
        <ChevronLeft size={15} /> My collection
      </Link>
      <h1 className="font-semibold text-lg mb-1">Import official cards from Excel</h1>
      <p className="text-sm text-muted mb-5">
        Bulk-add real Pokémon TCG cards to your collection. Images and market prices are looked up
        automatically — you don&apos;t enter them.
      </p>

      <div className="bg-panel border border-border rounded-2xl p-5 mb-5">
        <h2 className="font-semibold text-sm mb-2">1. Get the template</h2>
        <p className="text-xs text-muted mb-3">
          List Card Name, Set Name, and Card Number for each card you own — Set Name and Card Number
          aren&apos;t required, but many cards are reprinted more than once and they&apos;re the only way to
          match the exact printing.
        </p>
        <a
          href="/api/templates/official-cards"
          className="inline-flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-border rounded-full px-3.5 py-1.5"
        >
          Download template (.xlsx)
        </a>
      </div>

      <div className="bg-panel border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-3">2. Upload your file</h2>
        <ImportForm />
      </div>
    </div>
  );
}
