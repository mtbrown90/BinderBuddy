-- ============================================================
-- Adds sold/traded tracking to collection_entries for realized gain/loss.
-- A card leaves the active collection either by being sold (cash only) or
-- traded (a card, cash, or both) — the row stays (not deleted) so the
-- dashboard can compute what you actually made or lost on it. "Remove from
-- collection" stays a separate, unrelated hard delete for correcting a
-- mistaken entry, not for recording a real sale/trade.
-- Run this once in the Supabase SQL editor. Safe on existing data — every
-- existing row defaults to status = 'owned', matching current behavior.
-- ============================================================

alter table collection_entries add column if not exists status text not null default 'owned';
alter table collection_entries drop constraint if exists collection_entries_status_check;
alter table collection_entries
  add constraint collection_entries_status_check check (status in ('owned', 'sold', 'traded'));

alter table collection_entries add column if not exists sold_date date;
alter table collection_entries add column if not exists sold_price numeric(10,2);
alter table collection_entries add column if not exists traded_date date;
alter table collection_entries add column if not exists traded_for_card_name text;
alter table collection_entries add column if not exists traded_for_card_value numeric(10,2);
alter table collection_entries add column if not exists traded_cash_received numeric(10,2);
