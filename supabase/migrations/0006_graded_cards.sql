-- ============================================================
-- Adds graded-card support (PSA/TAG/BGS/CGC/Other) to collection_entries.
-- A graded card's "condition" is meaningless (grade replaces it), so
-- condition becomes nullable rather than repurposed — existing raw rows
-- are unaffected, loosening a NOT NULL constraint is always backward
-- compatible.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

alter table collection_entries alter column condition drop not null;
alter table collection_entries add column if not exists is_graded boolean not null default false;
alter table collection_entries add column if not exists grading_company text;
alter table collection_entries add column if not exists grade numeric(3,1);

alter table collection_entries drop constraint if exists collection_entries_grading_company_check;
alter table collection_entries
  add constraint collection_entries_grading_company_check
  check (grading_company is null or grading_company in ('PSA', 'TAG', 'BGS', 'CGC', 'Other'));
