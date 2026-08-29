"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findCardCandidates, cardVariations, type PokemonCard } from "@/lib/pokemontcg";

export type ImportResult = {
  error?: string;
  added?: number;
  rowErrors?: string[];
};

const MAX_ROWS = 300;

const HEADER_ALIASES: Record<string, string> = {
  "card name": "name",
  name: "name",
  "set name": "setName",
  set: "setName",
  "card number": "number",
  number: "number",
  "variation type": "variationType",
  variation: "variationType",
  quantity: "quantity",
  qty: "quantity",
  condition: "condition",
  "price paid": "pricePaid",
  "price paid ($)": "pricePaid",
  "date acquired": "dateAcquired",
};

type ParsedRow = {
  rowNumber: number;
  name: string;
  setName: string;
  number: string;
  variationType: string;
  quantity: number;
  condition: string;
  pricePaid: number | null;
  dateAcquired: string;
};

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text ?? "");
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result ?? "");
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

export async function importOfficialCards(
  _prevState: ImportResult | undefined,
  formData: FormData
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an .xlsx file to import" };
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return { error: "Couldn't read that file — make sure it's a valid .xlsx" };
  }

  const sheet = workbook.getWorksheet("Cards") ?? workbook.worksheets[0];
  if (!sheet) return { error: "No sheet found in that file" };

  const headerRow = sheet.getRow(1);
  const colForField = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const key = HEADER_ALIASES[cellText(cell.value).toLowerCase()];
    if (key) colForField.set(key, colNumber);
  });

  if (!colForField.has("name")) {
    return { error: 'No "Card Name" column found — download the template and match its headers.' };
  }

  const get = (row: ExcelJS.Row, field: string) => {
    const col = colForField.get(field);
    return col ? cellText(row.getCell(col).value) : "";
  };

  const rows: ParsedRow[] = [];
  const rowErrors: string[] = [];
  const lastRow = Math.min(sheet.rowCount, MAX_ROWS + 1);

  for (let r = 2; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;
    const name = get(row, "name");
    if (!name) continue;

    const qtyRaw = get(row, "quantity");
    const quantity = qtyRaw ? Math.max(1, Math.round(Number(qtyRaw)) || 1) : 1;

    const priceRaw = get(row, "pricePaid");
    const pricePaid = priceRaw ? Number(priceRaw.replace(/[^0-9.-]/g, "")) : null;
    if (priceRaw && Number.isNaN(pricePaid)) {
      rowErrors.push(`Row ${r}: price paid "${priceRaw}" isn't a number, left blank`);
    }

    rows.push({
      rowNumber: r,
      name,
      setName: get(row, "setName"),
      number: get(row, "number"),
      variationType: get(row, "variationType") || "Normal",
      quantity,
      condition: get(row, "condition") || "Near Mint",
      pricePaid: priceRaw && !Number.isNaN(pricePaid) ? pricePaid : null,
      dateAcquired: get(row, "dateAcquired"),
    });
  }

  if (sheet.rowCount - 1 > MAX_ROWS) {
    rowErrors.push(`File has more than ${MAX_ROWS} rows — only the first ${MAX_ROWS} were processed`);
  }
  if (rows.length === 0) {
    return { error: "No rows with a Card Name were found", rowErrors };
  }

  const lookupCache = new Map<string, PokemonCard[]>();
  let added = 0;

  for (const row of rows) {
    const cacheKey = `${row.name.toLowerCase()}|||${row.setName.toLowerCase()}|||${row.number.toLowerCase()}`;
    let candidates = lookupCache.get(cacheKey);
    if (!candidates) {
      try {
        candidates = await findCardCandidates({
          name: row.name,
          setName: row.setName || undefined,
          number: row.number || undefined,
        });
      } catch {
        rowErrors.push(`Row ${row.rowNumber}: card lookup failed (Pokémon TCG API error), skipped`);
        continue;
      }
      lookupCache.set(cacheKey, candidates);
    }

    if (candidates.length === 0) {
      rowErrors.push(
        `Row ${row.rowNumber}: no match for "${row.name}"${row.setName ? ` in ${row.setName}` : ""}${
          row.number ? ` #${row.number}` : ""
        }, skipped`
      );
      continue;
    }

    const exact = candidates.filter((c) => c.name.toLowerCase() === row.name.toLowerCase());
    const card = (exact.length > 0 ? exact : candidates)[0];
    if (candidates.length > 1 && (exact.length !== 1 || !row.number)) {
      rowErrors.push(
        `Row ${row.rowNumber}: "${row.name}" matched ${candidates.length} printings — used ${card.set.name} #${card.number}. Add Set Name and Card Number to be precise.`
      );
    }

    const variations = cardVariations(card);
    const variation =
      variations.find((v) => v.label.toLowerCase() === row.variationType.toLowerCase()) ?? variations[0];
    if (variation.label.toLowerCase() !== row.variationType.toLowerCase()) {
      rowErrors.push(
        `Row ${row.rowNumber}: variation "${row.variationType}" not sold for this printing — used "${variation.label}" instead.`
      );
    }

    const { error } = await supabase.from("collection_entries").insert({
      user_id: user.id,
      source: "api",
      external_card_id: card.id,
      external_source: "pokemontcg.io",
      variation_type: variation.label,
      card_name: card.name,
      set_name: card.set.name,
      image_url: card.images.small,
      condition: row.condition,
      quantity: row.quantity,
      price_paid: row.pricePaid,
      market_price: variation.marketPrice,
      date_acquired: row.dateAcquired || null,
    });

    if (error) {
      rowErrors.push(`Row ${row.rowNumber}: ${error.message}`);
      continue;
    }
    added++;
  }

  revalidatePath("/collection");
  revalidatePath("/");

  return { added, rowErrors };
}
