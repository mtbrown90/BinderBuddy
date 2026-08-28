-- ============================================================
-- BinderBuddy Database Schema (PostgreSQL / Supabase-ready)
-- ============================================================

-- ---------- Users ----------
create table users (
    id              uuid primary key default gen_random_uuid(),
    email           text unique not null,
    display_name    text,
    created_at      timestamptz not null default now()
);

-- ---------- Sets ----------
-- Covers both official/standard sets (Base Set, Evolving Skies, etc.)
-- and user-created custom sets.
create table sets (
    id              uuid primary key default gen_random_uuid(),
    name            text not null,
    code            text,                       -- e.g. "SV05" for standard sets; null for custom
    game            text not null,              -- "Pokemon", "Magic: The Gathering", "Custom", etc.
    publisher       text,                       -- null for custom sets
    release_date    date,
    is_custom       boolean not null default false,
    created_by      uuid references users(id),  -- required if is_custom = true
    description     text,
    cover_image_url text,
    created_at      timestamptz not null default now(),

    constraint custom_sets_need_owner
        check ( (is_custom = false) or (created_by is not null) )
);

create index idx_sets_game on sets(game);
create index idx_sets_created_by on sets(created_by);

-- ---------- Cards ----------
-- One row per distinct card within a set (independent of variation/printing)
create table cards (
    id              uuid primary key default gen_random_uuid(),
    set_id          uuid not null references sets(id) on delete cascade,
    name            text not null,
    card_number     text,                       -- "24/102", "SV-001", etc.
    rarity          text,                       -- "Common", "Rare", "Secret Rare", custom string allowed
    supertype       text,                       -- "Pokemon", "Trainer", "Land", "Creature", etc. (game-dependent, freeform)
    base_image_url  text,                       -- default/front image
    is_custom       boolean not null default false,
    created_by      uuid references users(id),
    created_at      timestamptz not null default now()
);

create index idx_cards_set_id on cards(set_id);
create index idx_cards_name on cards(name);

-- ---------- Variations (printings) ----------
-- The heart of the "track all variations" requirement.
-- Each row is a distinct printing/finish of a card that can be individually
-- collected and priced: Normal, Holofoil, Reverse Holo, 1st Edition,
-- Alt Art, Promo, Textured, Full Art, Misprint, etc.
create table variations (
    id                  uuid primary key default gen_random_uuid(),
    card_id             uuid not null references cards(id) on delete cascade,
    variation_type      text not null,          -- freeform, but recommend a controlled vocabulary in app layer
    finish              text,                   -- "Foil", "Non-Foil", "Etched", etc. (optional finer detail)
    edition             text,                   -- "1st Edition", "Unlimited", "Shadowless", etc.
    language            text default 'English',
    variation_image_url text,                   -- holo/reverse-holo often needs its own scan/photo
    external_id         text,                   -- id in an external pricing source (e.g. TCGplayer product id)
    external_source     text,                   -- "tcgplayer", "pokemontcg.io", "scryfall", "manual"
    created_at          timestamptz not null default now(),

    unique (card_id, variation_type, finish, edition, language)
);

create index idx_variations_card_id on variations(card_id);
create index idx_variations_external on variations(external_source, external_id);

-- ---------- Collection Entries ----------
-- What a user actually owns.
create table collection_entries (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references users(id) on delete cascade,
    variation_id    uuid not null references variations(id) on delete cascade,
    quantity        integer not null default 1 check (quantity >= 0),
    condition       text,                       -- "Mint", "Near Mint", "Lightly Played", "Damaged", etc.
    grading_company text,                       -- "PSA", "BGS", "CGC", null if ungraded
    grade           numeric(3,1),               -- e.g. 9.5
    price_paid      numeric(10,2),
    price_paid_currency text default 'USD',
    date_acquired   date,
    storage_location text,                      -- "Binder 3, Page 12" — nice-to-have
    notes           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index idx_collection_user_id on collection_entries(user_id);
create index idx_collection_variation_id on collection_entries(variation_id);

-- ---------- Price History ----------
-- Time series of market prices per variation, per source & condition bucket.
-- Enables trend charts and "current market price" = latest row.
create table price_history (
    id              uuid primary key default gen_random_uuid(),
    variation_id    uuid not null references variations(id) on delete cascade,
    source          text not null,              -- "tcgplayer", "pricecharting", "community", "manual"
    condition_bucket text default 'near_mint',  -- normalize condition for price comparability
    price           numeric(10,2) not null,
    currency        text default 'USD',
    captured_at     timestamptz not null default now()
);

create index idx_price_history_variation_id on price_history(variation_id, captured_at desc);

-- ---------- Wishlist (nice-to-have, common ask for this kind of app) ----------
create table wishlist_entries (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references users(id) on delete cascade,
    variation_id    uuid not null references variations(id) on delete cascade,
    max_price       numeric(10,2),              -- alert threshold
    created_at      timestamptz not null default now(),
    unique (user_id, variation_id)
);

-- ---------- Convenience view: latest market price per variation ----------
create view latest_market_prices as
select distinct on (variation_id, source, condition_bucket)
    variation_id, source, condition_bucket, price, currency, captured_at
from price_history
order by variation_id, source, condition_bucket, captured_at desc;
