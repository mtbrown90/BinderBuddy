-- ============================================================
-- Admin-grantable "lifetime free" status: a permanent, no-billing
-- alternative to the beta free trial (which still eventually bills once
-- BETA_TRIAL_END passes). Checked the same way as subscription_status in
-- getMasterSetLimitInfo() — granting it takes effect immediately, no
-- checkout required.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

alter table profiles add column lifetime_free boolean not null default false;

-- Postgres won't let create-or-replace change a function's return row
-- shape (adding lifetime_free counts as a change) — drop it first.
drop function if exists get_own_subscription_info();

create function get_own_subscription_info()
returns table (
  subscription_status text,
  stripe_customer_id text,
  beta_trial_eligible boolean,
  lifetime_free boolean
) as $$
  select subscription_status, stripe_customer_id, beta_trial_eligible, lifetime_free
  from profiles
  where id = auth.uid();
$$ language sql security definer set search_path = public stable;

grant execute on function get_own_subscription_info() to authenticated;
