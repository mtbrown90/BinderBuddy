-- ============================================================
-- Adds the "buyable placeholder PDF" product: pay a flat fee to download a
-- printable PDF of card-shaped placeholders for whatever's missing from a
-- masterset checklist. Mirrors masterset_purchases' pending/completed
-- pattern — only the Stripe webhook (service-role) may complete a row.
--
-- Also adds image_url_large to master_set_cards: the existing image_url
-- only ever stored pokemontcg.io's small thumbnail, too low-res to print at
-- trading-card size (2.5"x3.5"). Existing rows get image_url_large = null
-- until re-added or refreshed via the "Refresh prices" button.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

alter table master_set_cards add column if not exists image_url_large text;

create table if not exists masterset_pdf_purchases (
    id                          uuid primary key default gen_random_uuid(),
    user_id                     uuid not null references auth.users(id) on delete cascade,
    master_set_id               uuid not null references master_sets(id) on delete cascade,
    style                       text not null check (style in ('color', 'bw', 'text')),
    stripe_checkout_session_id  text,
    stripe_payment_intent_id    text,
    amount_cents                integer not null,
    currency                    text not null default 'usd',
    status                      text not null default 'pending'
                                   check (status in ('pending', 'completed', 'failed')),
    created_at                  timestamptz not null default now(),
    completed_at                timestamptz
);

create index if not exists idx_masterset_pdf_purchases_user on masterset_pdf_purchases(user_id);
create index if not exists idx_masterset_pdf_purchases_set on masterset_pdf_purchases(master_set_id);

alter table masterset_pdf_purchases enable row level security;

create policy "read own pdf purchases" on masterset_pdf_purchases
  for select using (auth.uid() = user_id);
create policy "create own pdf purchases" on masterset_pdf_purchases
  for insert with check (auth.uid() = user_id);
