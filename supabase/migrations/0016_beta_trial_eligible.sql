-- ============================================================
-- Adds an admin-only flag marking an account eligible for the beta
-- free-trial period on the unlimited-master-sets subscription — when
-- subscribing, an eligible account's trial runs until a fixed date
-- (not a rolling N-day duration) rather than starting to bill
-- immediately.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

alter table profiles add column beta_trial_eligible boolean not null default false;
