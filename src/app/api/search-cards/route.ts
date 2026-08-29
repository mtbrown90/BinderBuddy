import { NextRequest, NextResponse } from "next/server";
import { searchCards, cardVariations } from "@/lib/pokemontcg";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ cards: [] });
  }

  try {
    const cards = await searchCards(q);
    const results = cards.slice(0, 40).map((c) => ({
      id: c.id,
      name: c.name,
      number: c.number,
      setName: c.set.name,
      imageUrl: c.images.small,
      variations: cardVariations(c),
    }));
    return NextResponse.json({ cards: results });
  } catch {
    return NextResponse.json({ cards: [], error: "Search failed" }, { status: 502 });
  }
}
