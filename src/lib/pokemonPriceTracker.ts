// Thin wrapper around the PokemonPriceTracker.com v2 API — the source for
// graded-card (PSA/CGC/BGS) market values, since pokemontcg.io only has
// raw/ungraded pricing. Server-side only (uses the API key).
//
// Credit-economical by design: a bare name search (e.g. "Charizard") can
// match 50+ cards and burn the whole free-tier daily budget in one call, so
// every lookup here is a two-step, tightly-scoped flow:
//   1. search "<name> <set>" with limit=5, no eBay data (~5 credits) — a set
//      can have several printings sharing the same base name (regular /
//      full art / alternate full art / secret rare GX-VMAX-etc. variants,
//      often priced 5-10x apart from each other), so cardNumber below picks
//      the exact printing out of these candidates rather than trusting
//      whichever one the search ranks first.
//   2. re-fetch that one card by tcgPlayerId with eBay data (2 credits) to
//      get its actual graded sales.
// ~7 credits per lookup total, vs. 100+ for a naive bare-name search.
const BASE_URL = "https://www.pokemonpricetracker.com/api/v2/cards";

// TAG and "Other" aren't covered by this API's eBay grade breakdown at
// all (only PSA/CGC/BGS/SGC are) — callers should treat those as
// always-manual-entry rather than attempting a lookup.
export type CoveredGradingCompany = "PSA" | "CGC" | "BGS";

function headers() {
  const key = process.env.POKEMON_PRICE_TRACKER_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : undefined;
}

// PSA sales are keyed by whole grade only (psa9, psa10); CGC/BGS support
// half-point grades with an underscore in place of the decimal (cgc9_5).
function gradeKeyFor(company: CoveredGradingCompany, grade: number): string {
  const prefix = company.toLowerCase();
  if (company === "PSA") return `${prefix}${Math.round(grade)}`;
  return `${prefix}${String(grade).replace(".", "_")}`;
}

type SalesByGrade = {
  medianPrice?: number;
  smartMarketPrice?: { price?: number; confidence?: string };
};

type ApiCard = {
  tcgPlayerId?: string;
  externalCatalogId?: string;
  // e.g. "215/236" — used to pick the exact printing out of same-named
  // search results, not shown to the user.
  cardNumber?: string;
  ebay?: { salesByGrade?: Record<string, SalesByGrade> };
};

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// "215/236" matches a search result's cardNumber against the card's own
// collector number — the number alone (before the "/") is enough, since a
// printing's number is unique within its set even though the two sides of
// a secret rare's fraction don't always agree with printedTotal.
function numberMatches(resultNumber: string | undefined, cardNumber: string): boolean {
  if (!resultNumber) return false;
  return resultNumber.split("/")[0].trim() === cardNumber.trim();
}

export async function getGradedPrice(params: {
  cardName: string;
  setName: string;
  cardNumber?: string;
  company: string;
  grade: number;
}): Promise<number | null> {
  const auth = headers();
  if (!auth) return null;
  if (params.company !== "PSA" && params.company !== "CGC" && params.company !== "BGS") return null;
  if (!Number.isFinite(params.grade) || params.grade < 1 || params.grade > 10) return null;

  try {
    const query = `${params.cardName} ${params.setName}`.trim();
    const searchRes = await fetch(
      `${BASE_URL}?search=${encodeURIComponent(query)}&includeEbay=false&limit=5`,
      { headers: auth }
    );
    if (!searchRes.ok) return null;
    const searchJson = (await safeJson(searchRes)) as { data?: ApiCard | ApiCard[] } | null;
    const results = Array.isArray(searchJson?.data) ? searchJson.data : searchJson?.data ? [searchJson.data] : [];
    // Multiple printings of a set often share the same base name (regular,
    // full art, alternate full art, secret rare, ...) at wildly different
    // values — prefer the one whose collector number actually matches
    // rather than trusting the search's own ranking.
    const found =
      (params.cardNumber && results.find((r) => numberMatches(r.cardNumber, params.cardNumber!))) || results[0];
    if (!found?.tcgPlayerId) return null;

    const detailRes = await fetch(
      `${BASE_URL}?tcgPlayerId=${encodeURIComponent(found.tcgPlayerId)}&includeEbay=true`,
      { headers: auth }
    );
    if (!detailRes.ok) return null;
    const detailJson = (await safeJson(detailRes)) as { data?: ApiCard } | null;
    const card = detailJson?.data;

    const gradeKey = gradeKeyFor(params.company, params.grade);
    const sales = card?.ebay?.salesByGrade?.[gradeKey];
    if (!sales) return null;

    return sales.smartMarketPrice?.price ?? sales.medianPrice ?? null;
  } catch {
    return null;
  }
}
