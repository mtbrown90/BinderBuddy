-- ============================================================
-- Adds subscription state to profiles and a table for one-time "buy an
-- extra master-set slot" purchases — supports: 1 free master set, then
-- either buy additional slots one at a time or subscribe for unlimited.
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

-- One row per $X one-time "buy an extra master-set slot" purchase — same
-- shape/RLS as masterset_purchases.
create table masterset_slot_purchases (
    id                         uuid primary key default gen_random_uuid(),
    user_id                    uuid not null references auth.users(id) on delete cascade,
    stripe_checkout_session_id text,
    stripe_payment_intent_id   text,
    amount_cents               integer not null,
    currency                   text not null default 'usd',
    status                     text not null default 'pending'
      check (status in ('pending', 'completed', 'failed', 'refunded')),
    created_at                 timestamptz not null default now(),
    completed_at               timestamptz
);

alter table masterset_slot_purchases enable row level security;

create policy "read own slot purchases" on masterset_slot_purchases
  for select using (auth.uid() = user_id);
create policy "create own slot purchases" on masterset_slot_purchases
  for insert with check (auth.uid() = user_id);
