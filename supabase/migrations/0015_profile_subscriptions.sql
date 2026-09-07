-- ============================================================
-- Adds subscription state to profiles — supports: 1 free master set,
-- then either buy additional ones via the existing auto-populate
-- purchase (Store) or subscribe for unlimited.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

-- Subscription state lives on the user's own profile row — locked down
-- the same way is_admin already is; only the Stripe webhook (service
-- role) ever writes these.
alter table profiles add column stripe_customer_id text;
alter table profiles add column stripe_subscription_id text;
-- Stripe's own status string (active/trialing/past_due/canceled/...);
-- null = never subscribed.
alter table profiles add column subscription_status text;
alter table profiles add column subscription_interval text
  check (subscription_interval is null or subscription_interval in ('month', 'year'));
alter table profiles add column subscription_current_period_end timestamptz;
