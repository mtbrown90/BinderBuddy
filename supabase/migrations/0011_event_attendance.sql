-- ============================================================
-- Adds RSVPs to Community calendar events, with a deliberate visibility
-- split: "going" only ever surfaces as an aggregate count (see
-- get_going_counts() below — no policy grants row-level read access to
-- going rows, so the count is the only thing anyone can ever see), while
-- "vending" is publicly named — the point of that status is letting
-- people know which sellers will be at a show.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

create table event_attendees (
    event_id   uuid not null references calendar_events(id) on delete cascade,
    user_id    uuid not null references profiles(id) on delete cascade,
    status     text not null check (status in ('going', 'vending')),
    created_at timestamptz not null default now(),
    primary key (event_id, user_id)
);

alter table event_attendees enable row level security;

-- Owner has full CRUD on their own RSVP (create/switch/remove).
create policy "manage own attendance" on event_attendees
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and not is_current_user_restricted());

-- Vending rows are the whole point of the feature — public, with names.
create policy "read vending attendees" on event_attendees
  for select using (status = 'vending');

-- Publicly callable aggregate — returns counts only, never row identities,
-- so "going" stays anonymous at the database level, not just hidden in
-- the UI. Same security-definer reasoning as is_current_user_restricted().
create function get_going_counts() returns table(event_id uuid, going_count bigint) as $$
  select event_id, count(*) as going_count
  from event_attendees
  where status = 'going'
  group by event_id;
$$ language sql security definer set search_path = public stable;

grant execute on function get_going_counts() to authenticated;
