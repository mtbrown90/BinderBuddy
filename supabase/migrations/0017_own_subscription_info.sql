-- ============================================================
-- Fixes a real bug: profiles' column-level SELECT grant to `authenticated`
-- only covers id/username/is_admin/created_at — deliberately narrow,
-- since the row-level "read public profile fields" policy lets ANY
-- signed-in user read ANY OTHER user's row (needed for Community username
-- lookups). Every direct `.from("profiles").select("subscription_status, ...")`
-- call using the user's own client has therefore been silently failing
-- with a permission error since the subscription feature shipped — every
-- account has been reading as never-subscribed regardless of the truth.
--
-- Broadening the grant to include subscription/billing columns would leak
-- every user's subscription status and Stripe customer id to every other
-- signed-in user, so instead: a security-definer function returning only
-- the CALLING user's own subscription info, same pattern already used by
-- is_current_user_restricted() for is_restricted.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

create function get_own_subscription_info()
returns table (
  subscription_status text,
  stripe_customer_id text,
  beta_trial_eligible boolean
) as $$
  select subscription_status, stripe_customer_id, beta_trial_eligible
  from profiles
  where id = auth.uid();
$$ language sql security definer set search_path = public stable;

grant execute on function get_own_subscription_info() to authenticated;
