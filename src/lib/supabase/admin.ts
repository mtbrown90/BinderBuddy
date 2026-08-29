import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses Row Level Security entirely. Server-only,
// used exclusively by the Stripe webhook handler to confirm a payment and
// write data on the paying user's behalf after Stripe (not the client)
// confirms the charge succeeded. Never import this into client code or a
// route that trusts unauthenticated/user-controlled input.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type AdminClient = ReturnType<typeof createAdminClient>;
