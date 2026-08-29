import { NextRequest, NextResponse } from "next/server";
import { getCard, cardVariations } from "@/lib/pokemontcg";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  try {
    const card = await getCard(cardId);
    return NextResponse.json({
      id: card.id,
      name: card.name,
      number: card.number,
      setName: card.set.name,
      imageUrl: card.images.small,
      variations: cardVariations(card),
    });
  } catch {
    return NextResponse.json({ error: "Card lookup failed" }, { status: 502 });
  }
}
