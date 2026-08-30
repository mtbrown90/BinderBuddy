-- ============================================================
-- Adds the Community trading forum: opt-in trade listings on
-- collection_entries, freeform "looking for" want posts, and a full
-- in-app direct-messaging system for negotiating trades.
--
-- Privacy constraint: a user's collection must never become broadly
-- visible. collection_entries has no cross-user SELECT policy today —
-- every row is invisible to anyone but its owner. The new policy below
-- only ever adds visibility for rows the owner explicitly marked
-- is_for_trade = true; RLS policies for the same command are OR'd
-- together, so the existing owner-only policy is untouched.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

-- ---------- Trade availability on existing collection entries ----------
alter table collection_entries add column is_for_trade boolean not null default false;
alter table collection_entries add column trade_note text;

create policy "read cards marked for trade" on collection_entries
  for select using (is_for_trade = true);

-- ---------- "Looking for" want posts ----------
-- Freeform, not tied to any owned card, so a user can post "looking for X"
-- without exposing anything about what they actually own.
create table trade_wants (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references profiles(id) on delete cascade,
    card_name  text not null,
    note       text,
    created_at timestamptz not null default now()
);

alter table trade_wants enable row level security;
create policy "read all wants" on trade_wants for select using (true);
create policy "insert own want" on trade_wants for insert with check (auth.uid() = user_id);
create policy "delete own or admin want" on trade_wants for delete
  using (auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- ---------- Direct messaging ----------
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
-- bump_thread_activity in the discussion boards migration.
create function bump_conversation_activity() returns trigger as $$
begin
  update conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_message_insert after insert on messages
  for each row execute procedure bump_conversation_activity();

-- ---------- Row Level Security ----------
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

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
  and exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid())
);
