import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { PLACEHOLDER_PDF_PRICE_CENTS, PLACEHOLDER_PDF_ALL_STYLES_PRICE_CENTS } from "@/lib/pricing";

const STYLE_LABELS: Record<string, string> = {
  color: "full color",
  bw: "black & white",
  text: "text-only",
  all: "all 3 styles",
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
  const officialSetId = body?.officialSetId ? String(body.officialSetId) : "";
  const officialSetName = body?.officialSetName ? String(body.officialSetName) : "";
  const style = body?.style ? String(body.style) : "";

  if ((!masterSetId && !(officialSetId && officialSetName)) || !(style in STYLE_LABELS)) {
    return NextResponse.json(
      { error: "A masterSetId, or an officialSetId + officialSetName, and a valid style are required" },
      { status: 400 }
    );
  }

  const amountCents = style === "all" ? PLACEHOLDER_PDF_ALL_STYLES_PRICE_CENTS : PLACEHOLDER_PDF_PRICE_CENTS;

  let targetName: string;
  const insertRow: Record<string, unknown> = {
    user_id: user.id,
    style,
    amount_cents: amountCents,
  };

  if (masterSetId) {
    // Confirm this master set actually belongs to the requesting user — the
    // user's own RLS-scoped client can only see their own rows, so this
    // also doubles as an ownership check.
    const { data: masterSet } = await supabase
      .from("master_sets")
      .select("id, name")
      .eq("id", masterSetId)
      .single();
    if (!masterSet) {
      return NextResponse.json({ error: "Master set not found" }, { status: 404 });
    }
    targetName = masterSet.name;
    insertRow.master_set_id = masterSetId;
  } else {
    // Official sets aren't owned by anyone — browsing one is already open
    // to any signed-in user, so no ownership check is needed here.
    targetName = officialSetName;
    insertRow.official_set_id = officialSetId;
    insertRow.official_set_name = officialSetName;
  }

  const { data: purchase, error } = await supabase
    .from("masterset_pdf_purchases")
    .insert(insertRow)
    .select("id")
    .single();

  if (error || !purchase) {
    return NextResponse.json({ error: error?.message ?? "Could not start checkout" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const redirectPath = masterSetId ? `/sets/master/${masterSetId}` : `/sets/${officialSetId}`;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `Placeholder PDF for "${targetName}"`,
              description: `Printable placeholder cards (${STYLE_LABELS[style]}) for whatever's missing from this ${
                masterSetId ? "checklist" : "set"
              }`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { pdfPurchaseId: purchase.id },
      allow_promotion_codes: true,
      success_url: `${appUrl}${redirectPath}?checkout=success`,
      cancel_url: `${appUrl}${redirectPath}?checkout=cancelled`,
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
