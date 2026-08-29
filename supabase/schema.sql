-- ============================================================
-- BinderBuddy database schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor for a new project.
-- ============================================================

-- ---------- Profiles ----------
-- Mirrors auth.users so we have a place to hang app-specific user data.
create table profiles (
    id           uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    created_at   timestamptz not null default now()
);

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

-- ---------- Custom sets ----------
-- User-created sets, for homebrew / non-standard TCGs.
create table custom_sets (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id) on delete cascade,
    name            text not null,
    game            text not null default 'Custom',
    publisher       text,
    description     text,
    cover_image_url text,
    created_at      timestamptz not null default now()
);

create index idx_custom_sets_user on custom_sets(user_id);

-- ---------- Custom cards ----------
create table custom_cards (
    id              uuid primary key default gen_random_uuid(),
    custom_set_id   uuid not null references custom_sets(id) on delete cascade,
    name            text not null,
    card_number     text,
    rarity          text,
    supertype       text,
    base_image_url  text,
    created_at      timestamptz not null default now()
);

create index idx_custom_cards_set on custom_cards(custom_set_id);

-- ---------- Custom card variations ----------
create table custom_variations (
    id              uuid primary key default gen_random_uuid(),
    custom_card_id  uuid not null references custom_cards(id) on delete cascade,
    variation_type  text not null,
    market_price    numeric(10,2),
    image_url       text,
    created_at      timestamptz not null default now(),
    unique (custom_card_id, variation_type)
);

create index idx_custom_variations_card on custom_variations(custom_card_id);

-- ---------- Collection entries ----------
-- One row per card+variation a user owns. Points either at an official card
-- (identified by its pokemontcg.io id) or at a custom_variation.
create table collection_entries (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references auth.users(id) on delete cascade,
    source              text not null check (source in ('api','custom')),

    -- source = 'api'
    external_card_id    text,
    external_source     text default 'pokemontcg.io',

    -- source = 'custom'
    custom_variation_id uuid references custom_variations(id) on delete cascade,

    -- denormalized display fields (snapshotted so the entry still renders
    -- even if the external API changes or a custom card is edited later)
    variation_type      text not null,
    card_name           text not null,
    set_name            text,
    image_url           text,

    condition           text not null default 'Near Mint',
    quantity            integer not null default 1 check (quantity >= 1),
    price_paid          numeric(10,2),
    market_price        numeric(10,2),
    date_acquired        date,
    notes               text,

    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),

    constraint valid_source check (
        (source = 'api' and external_card_id is not null and custom_variation_id is null)
        or
        (source = 'custom' and custom_variation_id is not null and external_card_id is null)
    )
);

create index idx_collection_user on collection_entries(user_id);
create index idx_collection_external on collection_entries(external_card_id);

-- ============================================================
-- Row Level Security — every table is scoped to its owning user.
-- ============================================================

alter table profiles enable row level security;
alter table custom_sets enable row level security;
alter table custom_cards enable row level security;
alter table custom_variations enable row level security;
alter table collection_entries enable row level security;

create policy "read own profile" on profiles
  for select using (auth.uid() = id);
create policy "update own profile" on profiles
  for update using (auth.uid() = id);

create policy "manage own custom sets" on custom_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "manage own custom cards" on custom_cards
  for all using (
    exists (select 1 from custom_sets s where s.id = custom_set_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from custom_sets s where s.id = custom_set_id and s.user_id = auth.uid())
  );

create policy "manage own custom variations" on custom_variations
  for all using (
    exists (
      select 1 from custom_cards c
      join custom_sets s on s.id = c.custom_set_id
      where c.id = custom_card_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from custom_cards c
      join custom_sets s on s.id = c.custom_set_id
      where c.id = custom_card_id and s.user_id = auth.uid()
    )
  );

create policy "manage own collection entries" on collection_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
