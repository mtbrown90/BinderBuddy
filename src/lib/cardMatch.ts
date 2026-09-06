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
