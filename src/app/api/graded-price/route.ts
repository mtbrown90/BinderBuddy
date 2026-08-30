import { NextRequest, NextResponse } from "next/server";
import { getGradedPrice } from "@/lib/pokemonPriceTracker";

export async function GET(req: NextRequest) {
  const cardName = req.nextUrl.searchParams.get("cardName")?.trim() ?? "";
  const setName = req.nextUrl.searchParams.get("setName")?.trim() ?? "";
  const company = req.nextUrl.searchParams.get("company")?.trim() ?? "";
  const grade = Number(req.nextUrl.searchParams.get("grade"));

  if (!cardName || !company || !Number.isFinite(grade)) {
    return NextResponse.json({ price: null, error: "Missing cardName, company, or grade" }, { status: 400 });
  }

  const price = await getGradedPrice({ cardName, setName, company, grade });
  return NextResponse.json({ price });
}
