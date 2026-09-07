import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

// Requires the Stripe Dashboard's Customer Portal to be configured once
// (Settings -> Billing -> Customer portal) — not something the API alone
// can turn on.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // profiles' column-level grant excludes stripe_customer_id — go through
  // the security-definer RPC (see get_own_subscription_info() in
  // schema.sql), same reasoning as getMasterSetLimitInfo.
  const { data: profileRows } = await supabase.rpc("get_own_subscription_info");
  const profile = profileRows?.[0];

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription on file" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/store`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't open billing portal" },
      { status: 500 }
    );
  }
}
