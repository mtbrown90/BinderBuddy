import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePlaceholderPdf, type PlaceholderStyle } from "@/lib/placeholderPdf";
import type { MasterSetCard } from "@/types";

// Regenerates the PDF fresh from current checklist data on every download,
// rather than storing one — see the "Buyable placeholder PDFs" plan notes.
// The purchase row is looked up through the user-scoped client, so Supabase
// RLS (masterset_pdf_purchases: "read own pdf purchases") is what actually
// enforces that only the buyer can ever reach this data.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ purchaseId: string }> }) {
  const { purchaseId } = await params;
  const supabase = await createClient();

  const { data: purchase } = await supabase
    .from("masterset_pdf_purchases")
    .select("*")
    .eq("id", purchaseId)
    .single();

  if (!purchase || purchase.status !== "completed") {
    return new Response("Not found", { status: 404 });
  }

  const [{ data: masterSet }, { data: cards }, { data: entries }] = await Promise.all([
    supabase.from("master_sets").select("name").eq("id", purchase.master_set_id).single(),
    supabase
      .from("master_set_cards")
      .select("*")
      .eq("master_set_id", purchase.master_set_id)
      .order("card_name", { ascending: true })
      .returns<MasterSetCard[]>(),
    supabase.from("collection_entries").select("external_card_id, variation_type"),
  ]);

  if (!masterSet) {
    return new Response("Master set not found", { status: 404 });
  }

  const ownedKeys = new Set(
    (entries ?? []).map((e) => `${e.external_card_id}::${e.variation_type.toLowerCase()}`)
  );
  const missing = (cards ?? []).filter(
    (c) => !ownedKeys.has(`${c.external_card_id}::${c.variation_type.toLowerCase()}`)
  );

  const pdfBytes = await generatePlaceholderPdf(
    masterSet.name,
    missing,
    purchase.style as PlaceholderStyle
  );

  const safeName = masterSet.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      // "inline" (not "attachment") so it opens for preview in the browser
      // first, matching how most print-ready PDF downloads work — the
      // browser's own PDF viewer has a save/print button once it's open.
      "Content-Disposition": `inline; filename="${safeName}-placeholders-${purchase.style}.pdf"`,
    },
  });
}
