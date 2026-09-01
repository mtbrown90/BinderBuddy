// Tiered pricing for the paid "auto-populate a master set" feature — priced
// per purchase, not per Pokémon name, with the per-name cost dropping as
// you add more:
//   1 name  -> $2.99
//   2 names -> $4.99
//   3 names -> $5.99
//   4+      -> +$1.00 per additional name beyond 3
// No Node/Stripe-SDK imports here so this is safe to use from client
// components too (for a live price preview as the user types).
export function autoPopulatePriceCents(nameCount: number): number {
  const n = Math.max(1, Math.floor(nameCount));
  if (n === 1) return 299;
  if (n === 2) return 499;
  if (n === 3) return 599;
  return 599 + (n - 3) * 100;
}

// Auto-populate every card of one energy type, or every card by one
// illustrator — both a different order of magnitude from name-based
// auto-populate. Checked against the live API: types run 500-2,500+ cards
// (Fire 1,579 / Water 2,446 / Dragon 530 / Colorless 2,179) and prolific
// artists land in the same range (Mitsuhiro Arita 722 / Ken Sugimori 1,110 /
// 5ban Graphics 1,636), with less prolific ones lower (PLANETA Mochizuki
// 141). Priced flat rather than per-card to stay an approachable single
// purchase, and shared across both since the scale is comparable.
export const BULK_AUTOPOPULATE_PRICE_CENTS = 1499;

// Printable placeholder-card PDF for whatever's missing from a masterset
// checklist — flat fee regardless of style (color/bw/text) or how many
// missing cards/pages it comes out to, deliberately priced under what
// similar third-party (Etsy-style) placeholder-card products charge.
export const PLACEHOLDER_PDF_PRICE_CENTS = 200;

// Bundle: all three styles for one purchase, priced under 3x the
// single-style price ($6) to actually reward buying the bundle.
export const PLACEHOLDER_PDF_ALL_STYLES_PRICE_CENTS = 500;
