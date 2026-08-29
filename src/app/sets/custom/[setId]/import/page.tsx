import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { CustomSet } from "@/types";
import ImportForm from "./ImportForm";

export default async function ImportCardsPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const supabase = await createClient();
  const { data: set } = await supabase
    .from("custom_sets")
    .select("*")
    .eq("id", setId)
    .single();
  const typedSet = set as CustomSet | null;

  if (!typedSet) {
    return <div className="text-muted text-sm text-center py-12">Set not found.</div>;
  }

  return (
    <div>
      <Link href={`/sets/custom/${setId}`} className="flex items-center gap-1 text-sm text-muted mb-3">
        <ChevronLeft size={15} /> {typedSet.name}
      </Link>
      <h1 className="font-semibold text-lg mb-1">Import cards from Excel</h1>
      <p className="text-sm text-muted mb-5">
        Bulk-add cards and variations to <span className="text-ink font-medium">{typedSet.name}</span> from
        a spreadsheet.
      </p>

      <div className="bg-panel border border-border rounded-2xl p-5 mb-5">
        <h2 className="font-semibold text-sm mb-2">1. Get the template</h2>
        <p className="text-xs text-muted mb-3">
          One row per card variation. Give a card multiple variations (Normal, Holofoil, …) by repeating
          its name and card number on more than one row.
        </p>
        <a
          href="/api/templates/custom-cards"
          className="inline-flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-border rounded-full px-3.5 py-1.5"
        >
          Download template (.xlsx)
        </a>
      </div>

      <div className="bg-panel border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-3">2. Upload your file</h2>
        <ImportForm setId={setId} />
      </div>
    </div>
  );
}
