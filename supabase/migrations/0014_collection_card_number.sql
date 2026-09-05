-- ============================================================
-- Adds card_number and set_printed_total to collection_entries, so a
-- personal collection entry can show "Set Name · #4/102" the same way
-- master_set_cards checklist rows already do. Both are nullable — existing
-- rows get backfilled by a one-off script (fetches each card fresh from
-- pokemontcg.io by its stored external_card_id), and manually-added cards
-- (external_source = 'manual') simply have no number to backfill.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

alter table collection_entries add column card_number text;
alter table collection_entries add column set_printed_total integer;
