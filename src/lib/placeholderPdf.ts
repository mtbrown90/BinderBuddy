import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

export type PlaceholderStyle = "color" | "bw" | "text";

export type PlaceholderCard = {
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  set_printed_total: number | null;
  variation_type: string;
  image_url: string | null;
  image_url_large: string | null;
};

// US Letter at 72pt/inch, a 3x3 grid of standard 2.5"x3.5" trading-card
// slots per page — matches a standard 9-pocket binder page, and matches the
// "set your printer to 100%/true size" instruction on the third-party
// placeholder products this feature is modeled on.
const PAGE_W = 612;
const PAGE_H = 792;
const CARD_W = 180; // 2.5in
const CARD_H = 252; // 3.5in
const COLS = 3;
const ROWS = 3;
const MARGIN_X = (PAGE_W - CARD_W * COLS) / 2;
const MARGIN_Y = (PAGE_H - CARD_H * ROWS) / 2;

const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.45, 0.45, 0.5);
const BORDER = rgb(0.75, 0.75, 0.78);

async function fetchProcessedImage(url: string, grayscale: boolean): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    let pipeline = sharp(input).resize(CARD_W * 4, CARD_H * 4, { fit: "cover" });
    if (grayscale) pipeline = pipeline.grayscale();
    return await pipeline.jpeg({ quality: 88 }).toBuffer();
  } catch {
    return null;
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  centerX: number,
  y: number
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: centerX - width / 2, y, size, font, color });
}

function cardSubtitle(c: PlaceholderCard) {
  const number = c.card_number
    ? `#${c.card_number}${c.set_printed_total ? `/${c.set_printed_total}` : ""}`
    : null;
  // A plain hyphen, not "·" — pdf-lib's standard-font WinAnsi encoding
  // handles the middle dot fine in practice, but this is a printed product,
  // not worth any risk of it rendering oddly on someone's printer/viewer.
  return [c.set_name, number].filter(Boolean).join(" - ");
}

export async function generatePlaceholderPdf(
  masterSetName: string,
  cards: PlaceholderCard[],
  style: PlaceholderStyle
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const wantsArt = style === "color" || style === "bw";

  for (let i = 0; i < cards.length; i++) {
    const slot = i % (COLS * ROWS);
    if (slot === 0) pdfDoc.addPage([PAGE_W, PAGE_H]);
    const page = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];

    const col = slot % COLS;
    const row = Math.floor(slot / COLS);
    const x = MARGIN_X + col * CARD_W;
    // pdf-lib's y-origin is the bottom-left, so row 0 (top row) sits at the
    // highest y — invert the row index to get there.
    const y = PAGE_H - MARGIN_Y - (row + 1) * CARD_H;

    const card = cards[i];
    page.drawRectangle({
      x,
      y,
      width: CARD_W,
      height: CARD_H,
      borderColor: BORDER,
      borderWidth: 1,
    });

    let art: Buffer | null = null;
    if (wantsArt) {
      const url = card.image_url_large ?? card.image_url;
      if (url) art = await fetchProcessedImage(url, style === "bw");
    }

    const pad = 10;
    if (art) {
      const image = await pdfDoc.embedJpg(art);
      const artH = CARD_H - 76;
      page.drawImage(image, { x: x + pad, y: y + CARD_H - artH - pad, width: CARD_W - pad * 2, height: artH });

      const nameLines = wrapText(card.card_name, bold, 10, CARD_W - pad * 2);
      let textY = y + 56;
      for (const line of nameLines.slice(0, 2)) {
        drawCenteredText(page, line, bold, 10, INK, x + CARD_W / 2, textY);
        textY -= 12;
      }
      const subtitle = cardSubtitle(card);
      if (subtitle) drawCenteredText(page, subtitle, regular, 7.5, MUTED, x + CARD_W / 2, y + 26);
      drawCenteredText(page, card.variation_type, bold, 7.5, MUTED, x + CARD_W / 2, y + 14);
    } else {
      // Text-only style, or an art style with no image on this particular
      // card (e.g. an admin-added manual entry) — degrade gracefully to a
      // clean text placeholder rather than leaving a blank slot.
      const nameLines = wrapText(card.card_name, bold, 13, CARD_W - pad * 2);
      let textY = y + CARD_H / 2 + 10 + (nameLines.length - 1) * 8;
      for (const line of nameLines) {
        drawCenteredText(page, line, bold, 13, INK, x + CARD_W / 2, textY);
        textY -= 16;
      }
      const subtitle = cardSubtitle(card);
      if (subtitle) drawCenteredText(page, subtitle, regular, 9, MUTED, x + CARD_W / 2, y + CARD_H / 2 - 18);
      drawCenteredText(page, card.variation_type, regular, 8, MUTED, x + CARD_W / 2, y + CARD_H / 2 - 34);
      drawCenteredText(page, "MISSING", bold, 9, BORDER, x + CARD_W / 2, y + 14);
    }
  }

  if (pdfDoc.getPageCount() === 0) pdfDoc.addPage([PAGE_W, PAGE_H]);

  for (const page of pdfDoc.getPages()) {
    drawCenteredText(
      page,
      `${masterSetName} - placeholder cards - Print at 100% / true size - BinderBuddy`,
      regular,
      7,
      MUTED,
      PAGE_W / 2,
      14
    );
  }

  return pdfDoc.save();
}
