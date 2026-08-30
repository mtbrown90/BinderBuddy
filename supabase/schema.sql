-- ============================================================
-- BinderBuddy database schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor for a new project.
--
-- If you already ran an earlier version of this file (before master sets
-- existed), run supabase/migrations/0001_mastersets_pivot.sql instead —
-- it migrates an existing database to this schema without losing data.
-- ============================================================

-- ---------- Profiles ----------
-- Mirrors auth.users so we have a place to hang app-specific user data.
create table profiles (
    id           uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    is_admin     boolean not null default false,
    created_at   timestamptz not null default now()
);

-- Regular users may only ever update their own display_name — is_admin is
-- gated by row-level security AND this column-level grant, so a user can
-- never grant themselves admin by calling update() from the browser.
-- Setting is_admin is a manual, service-role-only operation.
revoke update on profiles from authenticated;
grant update (display_name) on profiles to authenticated;

create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------- Master sets ----------
-- A user-curated checklist of official cards, e.g. "Piplup Masterset" —
-- every printing of a Pokémon (or group of Pokémon) across all real sets.
-- Cards themselves are never stored redundantly here; master_set_cards
-- just points at pokemontcg.io card ids.
create table master_sets (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    name        text not null,
    description text,
    created_at  timestamptz not null default now()
);

create index idx_master_sets_user on master_sets(user_id);

-- ---------- Master set cards ----------
-- Which official card *printings* belong to a master set's checklist — one
-- row per card+variation (Normal, Holofoil, Reverse Holo, ...), so a card
-- with three printings contributes three checklist rows. Adding a row here
-- does NOT mean you own it — ownership is tracked separately in
-- collection_entries, cross-referenced by (external_card_id, variation_type).
create table master_set_cards (
    id               uuid primary key default gen_random_uuid(),
    master_set_id    uuid not null references master_sets(id) on delete cascade,
    external_card_id text not null,
    external_source  text not null default 'pokemontcg.io',
    variation_type   text not null,

    -- denormalized display fields, snapshotted at add time
    card_name    text not null,
    set_name     text,
    card_number  text,
    set_printed_total integer,
    image_url    text,
    -- only meaningful for external_source = 'manual' (an admin-added card
    -- filling a gap in pokemontcg.io's catalog) — there's no live API to
    -- price API-sourced cards from here, so this stays null for those.
    market_price numeric(10,2),

    added_via  text not null default 'manual' check (added_via in ('manual', 'auto_purchase')),
    created_at timestamptz not null default now(),

    unique (master_set_id, external_card_id, variation_type)
);

create index idx_master_set_cards_set on master_set_cards(master_set_id);

-- ---------- Master set auto-populate queries ----------
-- Records which name searches (e.g. "Piplup") were used to auto-populate a
-- master set via the paid auto-populate feature — provenance for display
-- and any future "check for new cards" refresh.
create table master_set_queries (
    id            uuid primary key default gen_random_uuid(),
    master_set_id uuid not null references master_sets(id) on delete cascade,
    query_name    text not null,
    created_at    timestamptz not null default now()
);

create index idx_master_set_queries_set on master_set_queries(master_set_id);

-- ---------- Collection entries ----------
-- One row per official card+variation a user owns (or used to own — sold
-- and traded entries stay here rather than being deleted, so they still
-- count toward realized gain/loss).
create table collection_entries (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references auth.users(id) on delete cascade,
    external_card_id  text not null,
    external_source   text not null default 'pokemontcg.io',

    -- denormalized display fields (snapshotted so the entry still renders
    -- even if the external API changes)
    variation_type text not null,
    card_name      text not null,
    set_name       text,
    image_url      text,

    condition      text not null default 'Near Mint',
    quantity       integer not null default 1 check (quantity >= 1),
    price_paid     numeric(10,2),
    market_price   numeric(10,2),
    date_acquired  date,
    notes          text,

    -- Disposal — a card leaves the active collection either by being sold
    -- (cash only) or traded (a card, cash, or both). Kept on the same row
    -- rather than deleted so the dashboard can compute realized gain/loss;
    -- "Remove from collection" (a hard delete) is a separate action for
    -- correcting a mistaken entry, not for recording a real sale/trade.
    status                  text not null default 'owned' check (status in ('owned', 'sold', 'traded')),
    sold_date               date,
    sold_price              numeric(10,2),
    traded_date             date,
    traded_for_card_name    text,
    traded_for_card_value   numeric(10,2),
    traded_cash_received    numeric(10,2),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_collection_user on collection_entries(user_id);
create index idx_collection_external on collection_entries(external_card_id);

-- ---------- Master set purchases ----------
-- Paid auto-populate: pay a fee and every official card matching the given
-- name(s) gets added to the master set automatically. Rows start 'pending'
-- when checkout is created and only flip to 'completed' from the Stripe
-- webhook handler (using the service-role key, bypassing RLS) after Stripe
-- confirms payment — never trust a client-side "payment succeeded" signal.
create table masterset_purchases (
    id                          uuid primary key default gen_random_uuid(),
    user_id                     uuid not null references auth.users(id) on delete cascade,
    master_set_id               uuid not null references master_sets(id) on delete cascade,
    stripe_checkout_session_id  text,
    stripe_payment_intent_id    text,
    amount_cents                integer not null,
    currency                    text not null default 'usd',
    status                      text not null default 'pending'
                                   check (status in ('pending', 'completed', 'failed', 'refunded')),
    query_names                 text[] not null,
    created_at                  timestamptz not null default now(),
    completed_at                timestamptz
);

create index idx_masterset_purchases_user on masterset_purchases(user_id);
create index idx_masterset_purchases_set on masterset_purchases(master_set_id);
create index idx_masterset_purchases_session on masterset_purchases(stripe_checkout_session_id);

-- ============================================================
-- Row Level Security — every table is scoped to its owning user.
-- ============================================================

alter table profiles enable row level security;
alter table master_sets enable row level security;
alter table master_set_cards enable row level security;
alter table master_set_queries enable row level security;
alter table collection_entries enable row level security;
alter table masterset_purchases enable row level security;

create policy "read own profile" on profiles
  for select using (auth.uid() = id);
create policy "update own profile" on profiles
  for update using (auth.uid() = id);

create policy "manage own master sets" on master_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "manage own master set cards" on master_set_cards
  for all using (
    exists (select 1 from master_sets s where s.id = master_set_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from master_sets s where s.id = master_set_id and s.user_id = auth.uid())
  );

create policy "manage own master set queries" on master_set_queries
  for all using (
    exists (select 1 from master_sets s where s.id = master_set_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from master_sets s where s.id = master_set_id and s.user_id = auth.uid())
  );

create policy "manage own collection entries" on collection_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Users can see and create their own purchase rows, but cannot update them —
-- only the Stripe webhook (service-role key, bypasses RLS entirely) may mark
-- a purchase completed.
create policy "read own purchases" on masterset_purchases
  for select using (auth.uid() = user_id);
create policy "create own purchases" on masterset_purchases
  for insert with check (auth.uid() = user_id);
