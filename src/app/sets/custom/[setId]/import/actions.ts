"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ImportResult = {
  error?: string;
  cardsCreated?: number;
  cardsUpdated?: number;
  variationsWritten?: number;
  rowErrors?: string[];
};

const MAX_ROWS = 1000;

const HEADER_ALIASES: Record<string, string> = {
  "card name": "name",
  name: "name",
  "card number": "number",
  number: "number",
  rarity: "rarity",
  supertype: "supertype",
  "image url": "imageUrl",
  imageurl: "imageUrl",
  "variation type": "variationType",
  variation: "variationType",
  "market price": "marketPrice",
  "market price ($)": "marketPrice",
  price: "marketPrice",
};

type ParsedRow = {
  rowNumber: number;
  name: string;
  number: string;
  rarity: string;
  supertype: string;
  imageUrl: string;
  variationType: string;
  marketPrice: number | null;
};

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text ?? "");
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result ?? "");
  return String(value).trim();
}

export async function importCustomCards(
  setId: string,
  _prevState: ImportResult | undefined,
  formData: FormData
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: set, error: setError } = await supabase
    .from("custom_sets")
    .select("id")
    .eq("id", setId)
    .single();
  if (setError || !set) return { error: "Set not found" };

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
  if (!colForField.has("variationType")) {
    return { error: 'No "Variation Type" column found — download the template and match its headers.' };
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

    const priceRaw = get(row, "marketPrice");
    const marketPrice = priceRaw ? Number(priceRaw.replace(/[^0-9.-]/g, "")) : null;
    if (priceRaw && Number.isNaN(marketPrice)) {
      rowErrors.push(`Row ${r}: market price "${priceRaw}" isn't a number, skipped it`);
    }

    rows.push({
      rowNumber: r,
      name,
      number: get(row, "number"),
      rarity: get(row, "rarity"),
      supertype: get(row, "supertype"),
      imageUrl: get(row, "imageUrl"),
      variationType: get(row, "variationType") || "Normal",
      marketPrice: priceRaw && !Number.isNaN(marketPrice) ? marketPrice : null,
    });
  }

  if (sheet.rowCount - 1 > MAX_ROWS) {
    rowErrors.push(`File has more than ${MAX_ROWS} rows — only the first ${MAX_ROWS} were imported`);
  }
  if (rows.length === 0) {
    return { error: "No rows with a Card Name were found", rowErrors };
  }

  const groups = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    const key = `${row.name.trim().toLowerCase()}|||${row.number.trim().toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const { data: existingCards } = await supabase
    .from("custom_cards")
    .select("id, name, card_number")
    .eq("custom_set_id", setId);

  let cardsCreated = 0;
  let cardsUpdated = 0;
  let variationsWritten = 0;

  for (const group of groups.values()) {
    const first = group.find((r) => r.rarity || r.supertype || r.imageUrl) ?? group[0];

    const existing = existingCards?.find(
      (c) =>
        c.name.trim().toLowerCase() === first.name.trim().toLowerCase() &&
        (c.card_number ?? "").trim().toLowerCase() === first.number.trim().toLowerCase()
    );

    let cardId: string;
    if (existing) {
      cardId = existing.id;
      const { error } = await supabase
        .from("custom_cards")
        .update({
          rarity: first.rarity || null,
          supertype: first.supertype || null,
          base_image_url: first.imageUrl || null,
        })
        .eq("id", cardId);
      if (error) {
        rowErrors.push(`Row ${first.rowNumber}: ${error.message}`);
        continue;
      }
      cardsUpdated++;
    } else {
      const { data: created, error } = await supabase
        .from("custom_cards")
        .insert({
          custom_set_id: setId,
          name: first.name,
          card_number: first.number || null,
          rarity: first.rarity || null,
          supertype: first.supertype || null,
          base_image_url: first.imageUrl || null,
        })
        .select("id")
        .single();
      if (error || !created) {
        rowErrors.push(`Row ${first.rowNumber}: ${error?.message ?? "failed to create card"}`);
        continue;
      }
      cardId = created.id;
      cardsCreated++;
    }

    for (const row of group) {
      const { error } = await supabase.from("custom_variations").upsert(
        {
          custom_card_id: cardId,
          variation_type: row.variationType,
          market_price: row.marketPrice,
          image_url: row.imageUrl || null,
        },
        { onConflict: "custom_card_id,variation_type" }
      );
      if (error) {
        rowErrors.push(`Row ${row.rowNumber}: ${error.message}`);
        continue;
      }
      variationsWritten++;
    }
  }

  revalidatePath(`/sets/custom/${setId}`);

  return { cardsCreated, cardsUpdated, variationsWritten, rowErrors };
}
