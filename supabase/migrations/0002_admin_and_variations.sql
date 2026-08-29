-- ============================================================
-- Adds:
--  1) profiles.is_admin — gates the bulk Excel import feature to admins.
--  2) variation-level tracking on master_set_cards — a masterset checklist
--     now has one row per card *printing* (Normal, Holofoil, Reverse Holo,
--     etc.), not one row per card, so "10 cards" actually means 10 distinct
--     printings when a card has only one variation, and more when it has
--     several.
-- Run this once in the Supabase SQL editor. Safe on existing data — any
-- existing master_set_cards rows are backfilled with variation_type =
-- 'Normal' (re-run the auto-populate / re-add cards afterward if you want
-- their real variation breakdown instead of that placeholder).
-- ============================================================

alter table profiles add column if not exists is_admin boolean not null default false;

-- Regular users may only ever update their own display_name — is_admin is
-- gated by row-level security AND this column-level grant, so a user can
-- never grant themselves admin by calling update() from the browser.
revoke update on profiles from authenticated;
grant update (display_name) on profiles to authenticated;

alter table master_set_cards add column if not exists variation_type text;
update master_set_cards set variation_type = 'Normal' where variation_type is null;
alter table master_set_cards alter column variation_type set not null;

alter table master_set_cards drop constraint if exists master_set_cards_master_set_id_external_card_id_key;
alter table master_set_cards
  add constraint master_set_cards_set_card_variation_key
  unique (master_set_id, external_card_id, variation_type);

-- Lets an admin fill a gap in pokemontcg.io's catalog (e.g. a promo it
-- doesn't have) by adding a card straight into a masterset's checklist.
-- external_source = 'manual' for these; market_price is snapshotted here
-- since there's no live API to fetch it from.
alter table master_set_cards add column if not exists market_price numeric(10,2);
