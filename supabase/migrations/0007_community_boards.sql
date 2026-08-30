-- ============================================================
-- Adds Community discussion boards: a public username on profiles, plus
-- discussion_categories / discussion_threads / discussion_replies.
--
-- This is the app's first cross-user-visible feature — every table until
-- now is scoped to auth.uid() = user_id with zero cross-user visibility.
-- profiles.display_name defaults to the user's email (see handle_new_user
-- in schema.sql) and must never become publicly readable, so a separate
-- `username` column is added instead, and column-level grants (mirroring
-- the existing is_admin update protection below) keep display_name private
-- at the database privilege level even though profile rows become broadly
-- readable.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

-- ---------- Public username ----------
alter table profiles add column username text unique;
alter table profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-zA-Z0-9_]{3,20}$');

create policy "read public profile fields" on profiles
  for select using (true);

revoke select on profiles from authenticated;
grant select (id, username, is_admin, created_at) on profiles to authenticated;

-- username updates go through a dedicated setUsername() server action,
-- which validates the format before writing.
grant update (username) on profiles to authenticated;

-- ---------- Discussion categories ----------
create table discussion_categories (
    id          uuid primary key default gen_random_uuid(),
    slug        text not null unique,
    name        text not null,
    description text,
    sort_order  integer not null default 0
);

insert into discussion_categories (slug, name, description, sort_order) values
  ('general', 'General Discussion', 'Anything Pokémon TCG collecting.', 0),
  ('sets', 'Set & Card Discussion', 'Talk about specific sets, cards, and printings.', 1),
  ('grading', 'Grading & Pricing', 'PSA/CGC/BGS grading, market prices, and value talk.', 2),
  ('shows', 'Shows & Meetups', 'Chat about card shows and meetups you''re attending.', 3),
  ('off-topic', 'Off Topic', 'Everything else.', 4);

-- ---------- Discussion threads ----------
-- user_id references profiles (not auth.users directly, unlike every other
-- table so far) so PostgREST can embed the author's username in one query
-- (`select("*, profiles(username)")`) — auth.users isn't in the `public`
-- schema PostgREST exposes, and a profiles row is guaranteed to exist for
-- every user via the on_auth_user_created trigger.
create table discussion_threads (
    id           uuid primary key default gen_random_uuid(),
    category_id  uuid not null references discussion_categories(id) on delete cascade,
    user_id      uuid not null references profiles(id) on delete cascade,
    title        text not null,
    body         text not null,
    is_pinned    boolean not null default false,
    is_locked    boolean not null default false,
    reply_count  integer not null default 0,
    last_activity_at timestamptz not null default now(),
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index idx_discussion_threads_category on discussion_threads(category_id);

-- ---------- Discussion replies ----------
create table discussion_replies (
    id         uuid primary key default gen_random_uuid(),
    thread_id  uuid not null references discussion_threads(id) on delete cascade,
    user_id    uuid not null references profiles(id) on delete cascade,
    body       text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_discussion_replies_thread on discussion_replies(thread_id);

-- Keeps discussion_threads.reply_count/last_activity_at correct without
-- relying on app-code discipline. security definer is required because a
-- replier usually isn't the thread's owner and wouldn't otherwise be
-- allowed to update that row under RLS (same reasoning as handle_new_user).
create function bump_thread_activity() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update discussion_threads set reply_count = reply_count + 1, last_activity_at = now()
      where id = new.thread_id;
    return new;
  else
    update discussion_threads set reply_count = greatest(reply_count - 1, 0)
      where id = old.thread_id;
    return old;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_reply_insert after insert on discussion_replies
  for each row execute procedure bump_thread_activity();
create trigger on_reply_delete after delete on discussion_replies
  for each row execute procedure bump_thread_activity();

-- ---------- Row Level Security ----------
alter table discussion_categories enable row level security;
alter table discussion_threads enable row level security;
alter table discussion_replies enable row level security;

create policy "read categories" on discussion_categories
  for select using (true);

create policy "read all threads" on discussion_threads
  for select using (true);
create policy "insert own thread" on discussion_threads
  for insert with check (auth.uid() = user_id);
create policy "update own or admin thread" on discussion_threads
  for update
  using (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
create policy "delete own or admin thread" on discussion_threads
  for delete
  using (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

create policy "read all replies" on discussion_replies
  for select using (true);
create policy "insert own reply" on discussion_replies
  for insert with check (auth.uid() = user_id);
create policy "update own or admin reply" on discussion_replies
  for update
  using (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
create policy "delete own or admin reply" on discussion_replies
  for delete
  using (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
