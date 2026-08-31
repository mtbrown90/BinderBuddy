-- ============================================================
-- BinderBuddy database schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor for a new project.
--
-- If you already ran an earlier version of this file (before master sets
-- existed), run supabase/migrations/0001_mastersets_pivot.sql instead —
-- it migrates an existing database to this schema without losing data.
-- ============================================================

-- ---------- Profiles ----------
-- Mirrors auth.users so we have a place to hang app-specific user data.
create table profiles (
    id           uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    -- Public handle shown in Community posts — separate from display_name
    -- (which defaults to the user's email below) since that must never be
    -- publicly readable. Null until a user posts for the first time.
    username     text unique,
    is_admin     boolean not null default false,
    -- Blocks Community posting/trading without a full ban — never exposed
    -- via the column grant below, so other users can't see who's
    -- restricted (see is_current_user_restricted()).
    is_restricted boolean not null default false,
    created_at   timestamptz not null default now()
);

alter table profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-zA-Z0-9_]{3,20}$');

-- Regular users may only ever update their own display_name — is_admin is
-- gated by row-level security AND this column-level grant, so a user can
-- never grant themselves admin by calling update() from the browser.
-- Setting is_admin is a manual, service-role-only operation.
revoke update on profiles from authenticated;
grant update (display_name) on profiles to authenticated;
-- username updates go through a dedicated setUsername() server action
-- instead, which validates the format before writing.
grant update (username) on profiles to authenticated;

-- Every profile row is readable (Community needs to show authors' usernames
-- to everyone), but column-level grants below keep display_name (= email)
-- visible only to its own owner, at the database privilege level rather
-- than app-code discipline.
revoke select on profiles from authenticated;
grant select (id, username, is_admin, created_at) on profiles to authenticated;

-- security definer so this can read is_restricted regardless of the
-- caller's own column grant above (which never includes is_restricted).
create function is_current_user_restricted() returns boolean as $$
  select coalesce((select is_restricted from profiles where id = auth.uid()), false);
$$ language sql security definer set search_path = public stable;

grant execute on function is_current_user_restricted() to authenticated;

create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------- Master sets ----------
-- A user-curated checklist of official cards, e.g. "Piplup Masterset" —
-- every printing of a Pokémon (or group of Pokémon) across all real sets.
-- Cards themselves are never stored redundantly here; master_set_cards
-- just points at pokemontcg.io card ids.
create table master_sets (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    name        text not null,
    description text,
    created_at  timestamptz not null default now()
);

create index idx_master_sets_user on master_sets(user_id);

-- ---------- Master set cards ----------
-- Which official card *printings* belong to a master set's checklist — one
-- row per card+variation (Normal, Holofoil, Reverse Holo, ...), so a card
-- with three printings contributes three checklist rows. Adding a row here
-- does NOT mean you own it — ownership is tracked separately in
-- collection_entries, cross-referenced by (external_card_id, variation_type).
create table master_set_cards (
    id               uuid primary key default gen_random_uuid(),
    master_set_id    uuid not null references master_sets(id) on delete cascade,
    external_card_id text not null,
    external_source  text not null default 'pokemontcg.io',
    variation_type   text not null,

    -- denormalized display fields, snapshotted at add time
    card_name    text not null,
    set_name     text,
    card_number  text,
    set_printed_total integer,
    image_url    text,
    -- higher-resolution image, used for the printable placeholder-PDF
    -- product — the small image_url above is too low-res to print well
    image_url_large text,
    -- only meaningful for external_source = 'manual' (an admin-added card
    -- filling a gap in pokemontcg.io's catalog) — there's no live API to
    -- price API-sourced cards from here, so this stays null for those.
    market_price numeric(10,2),

    added_via  text not null default 'manual' check (added_via in ('manual', 'auto_purchase')),
    created_at timestamptz not null default now(),

    unique (master_set_id, external_card_id, variation_type)
);

create index idx_master_set_cards_set on master_set_cards(master_set_id);

-- ---------- Master set auto-populate queries ----------
-- Records which name searches (e.g. "Piplup") were used to auto-populate a
-- master set via the paid auto-populate feature — provenance for display
-- and any future "check for new cards" refresh.
create table master_set_queries (
    id            uuid primary key default gen_random_uuid(),
    master_set_id uuid not null references master_sets(id) on delete cascade,
    query_name    text not null,
    created_at    timestamptz not null default now()
);

create index idx_master_set_queries_set on master_set_queries(master_set_id);

-- ---------- Collection entries ----------
-- One row per official card+variation a user owns (or used to own — sold
-- and traded entries stay here rather than being deleted, so they still
-- count toward realized gain/loss).
create table collection_entries (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references auth.users(id) on delete cascade,
    external_card_id  text not null,
    external_source   text not null default 'pokemontcg.io',

    -- denormalized display fields (snapshotted so the entry still renders
    -- even if the external API changes)
    variation_type text not null,
    card_name      text not null,
    set_name       text,
    image_url      text,

    -- null for graded entries — grade replaces condition conceptually
    condition      text default 'Near Mint',
    -- graded slabs (PSA/TAG/BGS/CGC/Other) — market_price above still
    -- holds the value either way (raw estimate vs. graded pull/manual)
    is_graded      boolean not null default false,
    grading_company text check (grading_company is null or grading_company in ('PSA', 'TAG', 'BGS', 'CGC', 'Other')),
    grade          numeric(3,1),
    quantity       integer not null default 1 check (quantity >= 1),
    price_paid     numeric(10,2),
    market_price   numeric(10,2),
    date_acquired  date,
    notes          text,

    -- Disposal — a card leaves the active collection either by being sold
    -- (cash only) or traded (a card, cash, or both). Kept on the same row
    -- rather than deleted so the dashboard can compute realized gain/loss;
    -- "Remove from collection" (a hard delete) is a separate action for
    -- correcting a mistaken entry, not for recording a real sale/trade.
    status                  text not null default 'owned' check (status in ('owned', 'sold', 'traded')),
    sold_date               date,
    sold_price              numeric(10,2),
    traded_date             date,
    traded_for_card_name    text,
    traded_for_card_value   numeric(10,2),
    traded_cash_received    numeric(10,2),

    -- Opt-in trade listing — collection_entries has no cross-user SELECT
    -- policy otherwise (see below), so a card stays completely private
    -- until its owner explicitly flips this.
    is_for_trade boolean not null default false,
    trade_note   text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_collection_user on collection_entries(user_id);
create index idx_collection_external on collection_entries(external_card_id);

-- Blocks only the is_for_trade toggle for a restricted user, not general
-- collection management — they can still buy/sell/organize their own
-- binder normally, just can't list things on the public Trading board.
create function prevent_restricted_trade_listing() returns trigger as $$
begin
  if new.is_for_trade and exists (
    select 1 from profiles p where p.id = new.user_id and p.is_restricted
  ) then
    raise exception 'This account is restricted from posting trade listings.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger check_restricted_trade_listing before insert or update on collection_entries
  for each row execute procedure prevent_restricted_trade_listing();

-- ---------- Master set purchases ----------
-- Paid auto-populate: pay a fee and every official card matching the given
-- name(s) gets added to the master set automatically. Rows start 'pending'
-- when checkout is created and only flip to 'completed' from the Stripe
-- webhook handler (using the service-role key, bypassing RLS) after Stripe
-- confirms payment — never trust a client-side "payment succeeded" signal.
create table masterset_purchases (
    id                          uuid primary key default gen_random_uuid(),
    user_id                     uuid not null references auth.users(id) on delete cascade,
    master_set_id               uuid not null references master_sets(id) on delete cascade,
    stripe_checkout_session_id  text,
    stripe_payment_intent_id    text,
    amount_cents                integer not null,
    currency                    text not null default 'usd',
    status                      text not null default 'pending'
                                   check (status in ('pending', 'completed', 'failed', 'refunded')),
    query_names                 text[] not null,
    created_at                  timestamptz not null default now(),
    completed_at                timestamptz
);

create index idx_masterset_purchases_user on masterset_purchases(user_id);
create index idx_masterset_purchases_set on masterset_purchases(master_set_id);
create index idx_masterset_purchases_session on masterset_purchases(stripe_checkout_session_id);

-- ---------- Masterset placeholder PDF purchases ----------
-- Buyable printable placeholder cards for whatever's missing from a
-- masterset checklist. The PDF itself isn't stored anywhere — it's
-- regenerated on demand at download time from current checklist data, so
-- this table only tracks payment status, same pending/completed pattern as
-- masterset_purchases above.
create table masterset_pdf_purchases (
    id                          uuid primary key default gen_random_uuid(),
    user_id                     uuid not null references auth.users(id) on delete cascade,
    master_set_id               uuid not null references master_sets(id) on delete cascade,
    style                       text not null check (style in ('color', 'bw', 'text')),
    stripe_checkout_session_id  text,
    stripe_payment_intent_id    text,
    amount_cents                integer not null,
    currency                    text not null default 'usd',
    status                      text not null default 'pending'
                                   check (status in ('pending', 'completed', 'failed')),
    created_at                  timestamptz not null default now(),
    completed_at                timestamptz
);

create index idx_masterset_pdf_purchases_user on masterset_pdf_purchases(user_id);
create index idx_masterset_pdf_purchases_set on masterset_pdf_purchases(master_set_id);

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
-- table above) so PostgREST can embed the author's username in one query
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

-- ---------- Calendar events ----------
-- Any signed-in user can post a show/event — a shared community calendar,
-- not admin-curated. user_id references profiles (not auth.users directly)
-- so PostgREST can embed the organizer's username in one query, same as
-- discussion_threads above.
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

-- ---------- Trading forum: "looking for" want posts ----------
-- Freeform, not tied to any owned card, so a user can post "looking for X"
-- without exposing anything about what they actually own.
create table trade_wants (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references profiles(id) on delete cascade,
    card_name  text not null,
    note       text,
    created_at timestamptz not null default now()
);

-- ---------- Trading forum: direct messaging ----------
create table conversations (
    id              uuid primary key default gen_random_uuid(),
    last_message_at timestamptz not null default now(),
    created_at      timestamptz not null default now()
);

create table conversation_participants (
    conversation_id uuid not null references conversations(id) on delete cascade,
    user_id         uuid not null references profiles(id) on delete cascade,
    last_read_at    timestamptz not null default now(),
    primary key (conversation_id, user_id)
);

create table messages (
    id              uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references conversations(id) on delete cascade,
    sender_id       uuid not null references profiles(id) on delete cascade,
    body            text not null,
    created_at      timestamptz not null default now()
);

create index idx_messages_conversation on messages(conversation_id);

-- Starting a conversation goes through this security-definer RPC rather
-- than a direct insert — no insert policy is granted to `authenticated` on
-- conversations/conversation_participants, so this is the only way in.
-- Keeps creation atomic and dedupes an existing 1:1 conversation instead of
-- creating a duplicate every time two users message each other again.
create function start_conversation(other_user_id uuid) returns uuid as $$
declare
  conv_id uuid;
begin
  if other_user_id = auth.uid() then
    raise exception 'Cannot message yourself';
  end if;

  select cp1.conversation_id into conv_id
  from conversation_participants cp1
  join conversation_participants cp2 on cp1.conversation_id = cp2.conversation_id
  where cp1.user_id = auth.uid() and cp2.user_id = other_user_id
  limit 1;

  if conv_id is null then
    insert into conversations default values returning id into conv_id;
    insert into conversation_participants (conversation_id, user_id) values
      (conv_id, auth.uid()), (conv_id, other_user_id);
  end if;

  return conv_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function start_conversation(uuid) to authenticated;

-- Keeps conversations.last_message_at current, same reasoning as
-- bump_thread_activity above.
create function bump_conversation_activity() returns trigger as $$
begin
  update conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_message_insert after insert on messages
  for each row execute procedure bump_conversation_activity();

-- ============================================================
-- Row Level Security — every table is scoped to its owning user.
-- ============================================================

alter table profiles enable row level security;
alter table master_sets enable row level security;
alter table master_set_cards enable row level security;
alter table master_set_queries enable row level security;
alter table collection_entries enable row level security;
alter table masterset_purchases enable row level security;
alter table masterset_pdf_purchases enable row level security;
alter table discussion_categories enable row level security;
alter table discussion_threads enable row level security;
alter table discussion_replies enable row level security;
alter table calendar_events enable row level security;
alter table trade_wants enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

create policy "read own profile" on profiles
  for select using (auth.uid() = id);
create policy "read public profile fields" on profiles
  for select using (true);
create policy "update own profile" on profiles
  for update using (auth.uid() = id);

create policy "manage own master sets" on master_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "manage own master set cards" on master_set_cards
  for all using (
    exists (select 1 from master_sets s where s.id = master_set_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from master_sets s where s.id = master_set_id and s.user_id = auth.uid())
  );

create policy "manage own master set queries" on master_set_queries
  for all using (
    exists (select 1 from master_sets s where s.id = master_set_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from master_sets s where s.id = master_set_id and s.user_id = auth.uid())
  );

create policy "manage own collection entries" on collection_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Policies for the same command are OR'd together, so this only ever adds
-- visibility for rows the owner explicitly marked is_for_trade — it does
-- not touch or weaken the owner-only policy above.
create policy "read cards marked for trade" on collection_entries
  for select using (is_for_trade = true);

-- Users can see and create their own purchase rows, but cannot update them —
-- only the Stripe webhook (service-role key, bypasses RLS entirely) may mark
-- a purchase completed.
create policy "read own purchases" on masterset_purchases
  for select using (auth.uid() = user_id);
create policy "create own purchases" on masterset_purchases
  for insert with check (auth.uid() = user_id);

create policy "read own pdf purchases" on masterset_pdf_purchases
  for select using (auth.uid() = user_id);
create policy "create own pdf purchases" on masterset_pdf_purchases
  for insert with check (auth.uid() = user_id);

create policy "read categories" on discussion_categories
  for select using (true);

create policy "read all threads" on discussion_threads
  for select using (true);
create policy "insert own thread" on discussion_threads
  for insert with check (auth.uid() = user_id and not is_current_user_restricted());
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
  for insert with check (auth.uid() = user_id and not is_current_user_restricted());
create policy "update own or admin reply" on discussion_replies
  for update
  using (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
create policy "delete own or admin reply" on discussion_replies
  for delete
  using (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

create policy "read all events" on calendar_events
  for select using (true);
create policy "insert own event" on calendar_events
  for insert with check (auth.uid() = user_id and not is_current_user_restricted());
create policy "update own or admin event" on calendar_events
  for update
  using (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
create policy "delete own or admin event" on calendar_events
  for delete
  using (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

create policy "read all wants" on trade_wants for select using (true);
create policy "insert own want" on trade_wants for insert with check (auth.uid() = user_id and not is_current_user_restricted());
create policy "delete own or admin want" on trade_wants for delete
  using (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

create policy "read own conversations" on conversations for select using (
  exists (select 1 from conversation_participants cp where cp.conversation_id = id and cp.user_id = auth.uid())
);
create policy "read participants of own conversations" on conversation_participants for select using (
  exists (select 1 from conversation_participants cp2 where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid())
);
create policy "update own participant row" on conversation_participants for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read messages in own conversations" on messages for select using (
  exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid())
);
create policy "send messages in own conversations" on messages for insert with check (
  auth.uid() = sender_id
  and not is_current_user_restricted()
  and exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid())
);
