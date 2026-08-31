import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { PLACEHOLDER_PDF_PRICE_CENTS } from "@/lib/pricing";

const STYLE_LABELS: Record<string, string> = {
  color: "full color",
  bw: "black & white",
  text: "text-only",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const masterSetId = body?.masterSetId ? String(body.masterSetId) : "";
  const style = body?.style ? String(body.style) : "";

  if (!masterSetId || !(style in STYLE_LABELS)) {
    return NextResponse.json({ error: "masterSetId and a valid style are required" }, { status: 400 });
  }

  // Confirm this master set actually belongs to the requesting user — the
  // user's own RLS-scoped client can only see their own rows, so this also
  // doubles as an ownership check.
  const { data: masterSet } = await supabase
    .from("master_sets")
    .select("id, name")
    .eq("id", masterSetId)
    .single();
  if (!masterSet) {
    return NextResponse.json({ error: "Master set not found" }, { status: 404 });
  }

  const { data: purchase, error } = await supabase
    .from("masterset_pdf_purchases")
    .insert({
      user_id: user.id,
      master_set_id: masterSetId,
      style,
      amount_cents: PLACEHOLDER_PDF_PRICE_CENTS,
    })
    .select("id")
    .single();

  if (error || !purchase) {
    return NextResponse.json({ error: error?.message ?? "Could not start checkout" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: PLACEHOLDER_PDF_PRICE_CENTS,
            product_data: {
              name: `Placeholder PDF for "${masterSet.name}"`,
              description: `Printable placeholder cards (${STYLE_LABELS[style]}) for whatever's missing from this checklist`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { pdfPurchaseId: purchase.id },
      allow_promotion_codes: true,
      success_url: `${appUrl}/sets/master/${masterSetId}?checkout=success`,
      cancel_url: `${appUrl}/sets/master/${masterSetId}?checkout=cancelled`,
    });

    // Regular users can only INSERT/SELECT their own purchase rows (never
    // UPDATE — only the webhook may mark one completed), so recording the
    // session id here needs the admin client.
    const admin = createAdminClient();
    await admin
      .from("masterset_pdf_purchases")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", purchase.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe checkout failed" },
      { status: 500 }
    );
  }
}
