-- ============================================================
-- Stores the set's printed total alongside each checklist card's number, so
-- masterset checklists can display "#215/236" the same way official-set
-- browsing already can (that page gets the total live from pokemontcg.io;
-- a masterset's checklist rows are denormalized snapshots, so this needs to
-- be captured at add time instead).
-- Run this once in the Supabase SQL editor. Safe on existing data — existing
-- rows just get set_printed_total = null until re-added or re-synced.
-- ============================================================

alter table master_set_cards add column if not exists set_printed_total integer;
