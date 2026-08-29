import ExcelJS from "exceljs";
import { CONDITIONS } from "@/types";

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cards");

  sheet.columns = [
    { header: "Card Name", key: "name", width: 26 },
    { header: "Set Name", key: "setName", width: 22 },
    { header: "Card Number", key: "number", width: 14 },
    { header: "Variation Type", key: "variationType", width: 18 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Condition", key: "condition", width: 16 },
    { header: "Price Paid ($)", key: "pricePaid", width: 14 },
    { header: "Date Acquired", key: "dateAcquired", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  sheet.addRows([
    {
      name: "Umbreon VMAX",
      setName: "Evolving Skies",
      number: "215",
      variationType: "Holofoil",
      quantity: 1,
      condition: "Near Mint",
      pricePaid: 250,
      dateAcquired: "",
    },
    {
      name: "Rayquaza VMAX",
      setName: "Evolving Skies",
      number: "111",
      variationType: "Normal",
      quantity: 1,
      condition: "Near Mint",
      pricePaid: 28,
      dateAcquired: "",
    },
  ]);

  const notes = workbook.addWorksheet("Instructions");
  notes.columns = [{ key: "text", width: 95 }];
  notes.addRows([
    { text: "How to use this template:" },
    { text: "- One row per card/variation you own. Image and current market price are looked up automatically from the Pokémon TCG API — do not enter them yourself." },
    { text: "- Card Name is required." },
    { text: "- Set Name and Card Number are strongly recommended. Many card names are reprinted across sets, and some sets even reprint the same name multiple times (alt art, secret rare) — without both, the wrong printing may get matched." },
    { text: "- Variation Type should match how that printing is sold, e.g. Normal, Holofoil, Reverse Holo, 1st Edition Holofoil. If left blank, Normal is assumed." },
    { text: "- Quantity defaults to 1. Condition defaults to Near Mint — valid values: " + CONDITIONS.join(", ") + "." },
    { text: "- Price Paid and Date Acquired are optional." },
    { text: "- Delete the example rows before importing your own cards." },
    { text: "- After importing, review the results screen — any row that couldn't be matched, or matched ambiguously, is listed there so you can fix and re-import just that row." },
  ]);
  notes.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="binderbuddy-official-cards-template.xlsx"',
    },
  });
}
