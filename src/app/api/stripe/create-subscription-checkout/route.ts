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

// Beta free-trial period ends on a fixed calendar date rather than N days
// from signup — everyone admin-flagged as beta_trial_eligible (see
// src/app/admin/actions.ts) bills for the first time on the same date,
// no matter when during the beta they actually subscribed.
const BETA_TRIAL_END = new Date("2027-01-01T00:00:00Z");

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

  // profiles' column-level grant excludes beta_trial_eligible — go through
  // the security-definer RPC (see get_own_subscription_info() in
  // schema.sql), same reasoning as getMasterSetLimitInfo.
  const { data: profileRows } = await supabase.rpc("get_own_subscription_info");
  const profile = profileRows?.[0];

  // Stripe rejects a trial_end that isn't in the future — once the beta
  // cutoff itself has passed, a still-flagged account just subscribes at
  // full price immediately rather than erroring out.
  const trialEndSeconds =
    profile?.beta_trial_eligible && BETA_TRIAL_END.getTime() > Date.now()
      ? Math.floor(BETA_TRIAL_END.getTime() / 1000)
      : null;

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
      ...(trialEndSeconds ? { subscription_data: { trial_end: trialEndSeconds } } : {}),
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
