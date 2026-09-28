// Shared "does this card match what was typed" logic for in-set search
// boxes (official set browsing, and a master set's own checklist) — both
// filter an already-loaded list client-side, so this never hits an API.
//
// Supports three query shapes: a bare number ("215") matches by card
// number only — not name, so numbers don't collide with unrelated cards
// whose name happens to contain that digit; "name number" ("Piplup 71")
// matches both; anything else matches by name substring only.
const TRAILING_NUMBER = /^(.*\S)\s+(\S*\d\S*)$/;

function numbersMatch(cardNumber: string | null | undefined, query: string): boolean {
  if (!cardNumber) return false;
  const a = cardNumber.trim().toLowerCase();
  const b = query.trim().toLowerCase();
  if (a === b) return true;
  // "4" should still match "004" — compare numerically when both sides
  // are plain digits, since set numbering pads inconsistently.
  return /^\d+$/.test(a) && /^\d+$/.test(b) && Number(a) === Number(b);
}

// pokemontcg.io's own orderBy=number isn't reliably numeric — observed
// returning cards out of order for a newly added set — so "sort by card
// number" always re-sorts client-side instead of trusting the fetch order.
// Falls back to string comparison for numbers that aren't plain digits
// (e.g. "TG01", secret rares lettered instead of numbered).
export function compareCardNumbers(a: string | null | undefined, b: string | null | undefined): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return (a ?? "").localeCompare(b ?? "");
}

export function matchesCardQuery(
  name: string,
  number: string | null | undefined,
  query: string
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  if (/^\d+$/.test(trimmed)) {
    return numbersMatch(number, trimmed);
  }

  const trailing = trimmed.match(TRAILING_NUMBER);
  if (trailing) {
    const [, namePart, numberPart] = trailing;
    return name.toLowerCase().includes(namePart.toLowerCase()) && numbersMatch(number, numberPart);
  }

  return name.toLowerCase().includes(trimmed.toLowerCase());
}
