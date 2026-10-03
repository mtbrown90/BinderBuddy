import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { fulfillMastersetPurchase } from "@/lib/fulfillMastersetPurchase";

// Called by Stripe, not the browser — no user session/cookies are present,
// so this route is excluded from the auth middleware (see src/proxy.ts).
// This is the only place a purchase is marked completed from a REAL
// payment; the client never gets to declare its own payment successful.
// (Admins get the same fulfillment for free — see each create-*-checkout
// route's own admin bypass, which calls fulfillMastersetPurchase directly.)
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const RELEVANT_EVENTS = new Set([
    "checkout.session.completed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ]);
  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await admin
      .from("profiles")
      .update({
        subscription_status: event.type === "customer.subscription.deleted" ? "canceled" : subscription.status,
        subscription_interval: subscription.items.data[0]?.price.recurring?.interval ?? null,
        subscription_current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.mode === "subscription") {
    const userId = session.client_reference_id;
    if (!userId || !session.subscription) return NextResponse.json({ received: true });

    const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
    await admin
      .from("profiles")
      .update({
        stripe_customer_id: typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        subscription_interval: subscription.items.data[0]?.price.recurring?.interval ?? null,
        subscription_current_period_end: new Date(
          subscription.items.data[0].current_period_end * 1000
        ).toISOString(),
      })
      .eq("id", userId);

    return NextResponse.json({ received: true });
  }

  const pdfPurchaseId = session.metadata?.pdfPurchaseId;
  if (pdfPurchaseId) {
    // No card upserting for this product — the PDF is generated on demand
    // at download time from whatever the checklist looks like then, so
    // fulfillment here is just flipping the purchase to completed.
    await admin
      .from("masterset_pdf_purchases")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
      })
      .eq("id", pdfPurchaseId)
      .neq("status", "completed");

    return NextResponse.json({ received: true });
  }

  const purchaseId = session.metadata?.purchaseId;
  if (!purchaseId) return NextResponse.json({ received: true });

  const { data: purchase } = await admin
    .from("masterset_purchases")
    .select("*")
    .eq("id", purchaseId)
    .single();

  if (!purchase || purchase.status === "completed") {
    return NextResponse.json({ received: true });
  }

  const queryNames: string[] = purchase.query_names ?? [];

  await fulfillMastersetPurchase(admin, purchase.master_set_id, queryNames);

  await admin
    .from("masterset_purchases")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
    })
    .eq("id", purchaseId);

  return NextResponse.json({ received: true });
}
