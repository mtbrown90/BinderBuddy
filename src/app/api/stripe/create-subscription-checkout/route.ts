import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

// $4.99/month or $49.99/year for unlimited master sets. Priced inline
// (recurring price_data) rather than a pre-made Stripe Price object, same
// "no Dashboard setup needed" approach the rest of this app's checkouts
// use — client_reference_id is Stripe's own field for tying a
// subscription checkout back to a user id, read off the session/
// subscription objects directly in the webhook (a subscription is
// ongoing account state, not a one-shot purchase row like the others).
const PRICES: Record<"month" | "year", number> = { month: 499, year: 4999 };

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const interval = body?.interval === "year" ? "year" : body?.interval === "month" ? "month" : null;
  if (!interval) {
    return NextResponse.json({ error: "interval must be 'month' or 'year'" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: PRICES[interval],
            recurring: { interval },
            product_data: { name: "BinderBuddy — Unlimited master sets" },
          },
          quantity: 1,
        },
      ],
      client_reference_id: user.id,
      success_url: `${appUrl}/sets/master/new?checkout=success`,
      cancel_url: `${appUrl}/sets/master/new?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe checkout failed" },
      { status: 500 }
    );
  }
}
