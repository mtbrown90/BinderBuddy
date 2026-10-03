-- ============================================================
-- Shared "promo catalog": real cards pokemontcg.io doesn't list (stamped
-- promos, retail exclusives, etc.) that an admin adds once and that then
-- get included automatically whenever a master set's name/type/artist
-- query matches them — on new auto-populate purchases and on "Check for
-- new cards" for existing sets.
--
-- Everyone signed in can read the catalog (their own client runs the
-- "Check for new cards" refresh); only admins write, through server
-- actions using the service role — so there are deliberately no
-- insert/update/delete policies.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

create table supplemental_cards (
    id                uuid primary key default gen_random_uuid(),
    card_name         text not null,
    set_name          text,
    card_number       text,
    set_printed_total integer,
    variation_type    text not null default 'Normal',
    image_url         text,
    market_price      numeric(10,2),
    -- Optional matching fields so type:/artist: queries can include it too
    artist            text,
    types             text[] not null default '{}',
    created_by        uuid references auth.users(id) on delete set null,
    created_at        timestamptz not null default now()
);

alter table supplemental_cards enable row level security;

create policy "read supplemental cards" on supplemental_cards
  for select to authenticated using (true);
