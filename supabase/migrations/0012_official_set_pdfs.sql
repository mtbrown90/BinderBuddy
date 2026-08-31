-- ============================================================
-- Extends the placeholder-PDF product to official/standard pokemontcg.io
-- sets, not just custom master sets. masterset_pdf_purchases keeps its
-- name despite now covering both target types — a rename would touch the
-- webhook, RLS policies, and every existing reference for no real benefit.
--
-- The webhook's PDF-fulfillment branch and the RLS policies on this table
-- are already generic (scoped by user_id / purchase id only, never
-- master_set_id), so neither needs any change for this.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

alter table masterset_pdf_purchases alter column master_set_id drop not null;
alter table masterset_pdf_purchases add column official_set_id text;
alter table masterset_pdf_purchases add column official_set_name text;
alter table masterset_pdf_purchases add constraint masterset_pdf_purchases_one_target
  check ((master_set_id is not null) <> (official_set_id is not null));
