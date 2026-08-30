-- ============================================================
-- Adds the Community show/event calendar — any signed-in user can post an
-- upcoming show or meetup, same "own or admin" moderation pattern as
-- discussion threads (see 0007_community_boards.sql).
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

-- user_id references profiles (not auth.users directly) so PostgREST can
-- embed the organizer's username in one query, same as discussion_threads.
create table calendar_events (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references profiles(id) on delete cascade,
    title       text not null,
    description text,
    location    text,
    event_date  date not null,
    event_url   text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index idx_calendar_events_date on calendar_events(event_date);

alter table calendar_events enable row level security;

create policy "read all events" on calendar_events
  for select using (true);
create policy "insert own event" on calendar_events
  for insert with check (auth.uid() = user_id);
create policy "update own or admin event" on calendar_events
  for update
  using (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
create policy "delete own or admin event" on calendar_events
  for delete
  using (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
