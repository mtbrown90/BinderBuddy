// Thin wrapper around the pokemontcg.io v2 REST API. Server-side only
// (uses the API key, and Next.js will cache these fetches).
const BASE_URL = "https://api.pokemontcg.io/v2";

export type PokemonSet = {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: { symbol: string; logo: string };
};

export type PokemonCardPrices = Record<
  string,
  { low?: number; mid?: number; high?: number; market?: number; directLow?: number }
>;

export type PokemonCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  supertype: string;
  set: { id: string; name: string };
  images: { small: string; large: string };
  tcgplayer?: { url?: string; updatedAt?: string; prices?: PokemonCardPrices };
  cardmarket?: { url?: string; updatedAt?: string; prices?: Record<string, number> };
};

function headers() {
  const key = process.env.POKEMONTCG_API_KEY;
  return key ? { "X-Api-Key": key } : undefined;
}

// pokemontcg.io is prone to brief 5xx blips, especially without an API key.
// One retry with a short backoff clears most of them; a 4xx means the
// request itself is wrong, so those fail immediately.
async function get<T>(path: string, attempt = 1): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: headers(),
    next: { revalidate: 60 * 60 * 12 }, // 12h cache — card catalogs rarely change
  });
  if (!res.ok) {
    if (res.status >= 500 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 400 * attempt));
      return get<T>(path, attempt + 1);
    }
    throw new Error(`pokemontcg.io request failed: ${res.status} ${path}`);
  }
  const json = await res.json();
  return json.data as T;
}

export async function listSets(): Promise<PokemonSet[]> {
  const sets = await get<PokemonSet[]>("/sets?orderBy=-releaseDate&pageSize=250");
  return sets;
}

export async function getSet(id: string): Promise<PokemonSet> {
  return get<PokemonSet>(`/sets/${id}`);
}

export async function listCardsInSet(setId: string): Promise<PokemonCard[]> {
  return get<PokemonCard[]>(
    `/cards?q=set.id:${encodeURIComponent(setId)}&orderBy=number&pageSize=250`
  );
}

export async function getCard(id: string): Promise<PokemonCard> {
  return get<PokemonCard>(`/cards/${id}`);
}

export async function searchCards(query: string): Promise<PokemonCard[]> {
  const q = `name:"*${query.replace(/"/g, "")}*"`;
  return get<PokemonCard[]>(`/cards?q=${encodeURIComponent(q)}&pageSize=50`);
}

function escapeQueryValue(value: string) {
  return value.replace(/"/g, '\\"');
}

// Used by spreadsheet import: looks up official cards by name, optionally
// narrowed by set name and/or card number (the same card name is often
// reprinted many times across sets, and even multiple times within one set
// as alt-art/secret-rare variants — number is the only reliable disambiguator).
export async function findCardCandidates(params: {
  name: string;
  setName?: string;
  number?: string;
}): Promise<PokemonCard[]> {
  const clauses = [`name:"${escapeQueryValue(params.name)}"`];
  if (params.setName) clauses.push(`set.name:"${escapeQueryValue(params.setName)}"`);
  if (params.number) clauses.push(`number:"${escapeQueryValue(params.number)}"`);
  return get<PokemonCard[]>(`/cards?q=${encodeURIComponent(clauses.join(" "))}&pageSize=10`);
}

// tcgplayer.prices keys look like: normal, holofoil, reverseHolofoil,
// "1stEditionHolofoil", "1stEditionNormal", unlimitedHolofoil, etc.
const VARIATION_LABELS: Record<string, string> = {
  normal: "Normal",
  holofoil: "Holofoil",
  reverseHolofoil: "Reverse Holo",
  "1stEditionNormal": "1st Edition",
  "1stEditionHolofoil": "1st Edition Holofoil",
  unlimitedHolofoil: "Unlimited Holofoil",
  unlimited: "Unlimited",
};

export function cardVariations(card: PokemonCard) {
  const prices = card.tcgplayer?.prices;
  if (!prices || Object.keys(prices).length === 0) {
    return [{ key: "normal", label: "Normal", marketPrice: null as number | null }];
  }
  return Object.entries(prices).map(([key, p]) => ({
    key,
    label: VARIATION_LABELS[key] ?? key,
    marketPrice: p.market ?? p.mid ?? null,
  }));
}
