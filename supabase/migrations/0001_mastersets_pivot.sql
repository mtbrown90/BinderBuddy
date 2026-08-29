-- ============================================================
-- Migrates an existing BinderBuddy database (created from the original
-- schema.sql, with homebrew custom_sets/custom_cards/custom_variations)
-- to the master-sets model: user-curated checklists of real, official
-- cards instead of made-up ones.
--
-- Run this once in the Supabase SQL editor of a project that already ran
-- the old schema.sql. Safe to run even if you have existing data — any
-- collection entries pointing at homebrew custom cards are removed (they
-- no longer have meaning under the new model); everything else is kept.
-- ============================================================

-- Drop collection entries that pointed at homebrew custom cards — the
-- concept no longer exists, so these rows can't be migrated meaningfully.
delete from collection_entries where source = 'custom';

alter table collection_entries drop constraint if exists valid_source;
alter table collection_entries drop column if exists source;
alter table collection_entries drop column if exists custom_variation_id;
alter table collection_entries alter column external_card_id set not null;
alter table collection_entries alter column external_source set not null;
alter table collection_entries alter column external_source set default 'pokemontcg.io';

-- custom_variations / custom_cards no longer exist as a concept.
drop table if exists custom_variations;
drop table if exists custom_cards;

-- custom_sets becomes master_sets — same idea (a user-curated set), just
-- pointing at real cards now instead of homebrew ones. Drop the columns
-- that only made sense for homebrew sets.
alter table custom_sets rename to master_sets;
alter table master_sets drop column if exists game;
alter table master_sets drop column if exists publisher;
alter table master_sets drop column if exists cover_image_url;

create table master_set_cards (
    id               uuid primary key default gen_random_uuid(),
    master_set_id    uuid not null references master_sets(id) on delete cascade,
    external_card_id text not null,
    external_source  text not null default 'pokemontcg.io',

    card_name   text not null,
    set_name    text,
    card_number text,
    image_url   text,

    added_via  text not null default 'manual' check (added_via in ('manual', 'auto_purchase')),
    created_at timestamptz not null default now(),

    unique (master_set_id, external_card_id)
);

create index idx_master_set_cards_set on master_set_cards(master_set_id);

create table master_set_queries (
    id            uuid primary key default gen_random_uuid(),
    master_set_id uuid not null references master_sets(id) on delete cascade,
    query_name    text not null,
    created_at    timestamptz not null default now()
);

create index idx_master_set_queries_set on master_set_queries(master_set_id);

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

-- ---------- RLS ----------

drop policy if exists "manage own custom cards" on master_sets;
drop policy if exists "manage own custom sets" on master_sets;
create policy "manage own master sets" on master_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table master_set_cards enable row level security;
create policy "manage own master set cards" on master_set_cards
  for all using (
    exists (select 1 from master_sets s where s.id = master_set_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from master_sets s where s.id = master_set_id and s.user_id = auth.uid())
  );

alter table master_set_queries enable row level security;
create policy "manage own master set queries" on master_set_queries
  for all using (
    exists (select 1 from master_sets s where s.id = master_set_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from master_sets s where s.id = master_set_id and s.user_id = auth.uid())
  );

alter table masterset_purchases enable row level security;
create policy "read own purchases" on masterset_purchases
  for select using (auth.uid() = user_id);
create policy "create own purchases" on masterset_purchases
  for insert with check (auth.uid() = user_id);
