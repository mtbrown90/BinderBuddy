import ExcelJS from "exceljs";
import { VARIATION_TYPES } from "@/types";

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cards");

  sheet.columns = [
    { header: "Card Name", key: "name", width: 28 },
    { header: "Card Number", key: "number", width: 14 },
    { header: "Rarity", key: "rarity", width: 16 },
    { header: "Supertype", key: "supertype", width: 14 },
    { header: "Image URL", key: "imageUrl", width: 40 },
    { header: "Variation Type", key: "variationType", width: 18 },
    { header: "Market Price ($)", key: "marketPrice", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  sheet.addRows([
    {
      name: "Shadow Drake",
      number: "1/50",
      rarity: "Rare",
      supertype: "Creature",
      imageUrl: "https://example.com/shadow-drake.png",
      variationType: "Normal",
      marketPrice: 2.5,
    },
    {
      name: "Shadow Drake",
      number: "1/50",
      rarity: "Rare",
      supertype: "Creature",
      imageUrl: "https://example.com/shadow-drake-holo.png",
      variationType: "Holofoil",
      marketPrice: 9.0,
    },
  ]);

  const notes = workbook.addWorksheet("Instructions");
  notes.columns = [{ key: "text", width: 90 }];
  notes.addRows([
    { text: "How to use this template:" },
    { text: "- One row per card variation. To give a card multiple variations (e.g. Normal + Holofoil), add one row per variation with the same Card Name and Card Number." },
    { text: "- Card Name is required." },
    { text: "- Variation Type is required — suggested values: " + VARIATION_TYPES.join(", ") + " (any text works)." },
    { text: "- Card Number, Rarity, Supertype, Image URL, and Market Price are optional." },
    { text: "- Market Price should be a plain number, no currency symbol (e.g. 9.00)." },
    { text: "- Delete the example rows on the Cards sheet before importing your own cards." },
  ]);
  notes.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="binderbuddy-custom-cards-template.xlsx"',
    },
  });
}
