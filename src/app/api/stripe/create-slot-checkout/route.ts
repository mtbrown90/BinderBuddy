import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { autoPopulatePriceCents } from "@/lib/pricing";

// One-time purchase of a single extra master-set slot. Priced by the same
// tier curve as Store's Pokémon-name auto-populate — the Nth slot you buy
// costs autoPopulatePriceCents(N), so slot 1 is $2.99, slot 2 is $4.99,
// slot 3 is $5.99, and it's +$1.00 each after that.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { count: purchasedSlots } = await supabase
    .from("masterset_slot_purchases")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "completed");

  const amountCents = autoPopulatePriceCents((purchasedSlots ?? 0) + 1);

  const { data: purchase, error } = await supabase
    .from("masterset_slot_purchases")
    .insert({ user_id: user.id, amount_cents: amountCents })
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
            unit_amount: amountCents,
            product_data: { name: "Additional master set slot" },
          },
          quantity: 1,
        },
      ],
      metadata: { slotPurchaseId: purchase.id },
      allow_promotion_codes: true,
      success_url: `${appUrl}/sets/master/new?checkout=success`,
      cancel_url: `${appUrl}/sets/master/new?checkout=cancelled`,
    });

    // Regular users can only INSERT/SELECT their own purchase rows (never
    // UPDATE — only the webhook may mark one completed), so recording the
    // session id here needs the admin client.
    const admin = createAdminClient();
    await admin
      .from("masterset_slot_purchases")
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
