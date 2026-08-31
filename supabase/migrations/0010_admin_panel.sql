-- ============================================================
-- Adds admin moderation: a real ban (via Supabase Auth's native ban
-- mechanism, enforced at the session layer — see src/app/admin/actions.ts)
-- and a lighter "restricted" flag that blocks Community posting/trading
-- without a full ban, enforced as an RLS boundary here, not just hidden UI.
--
-- Admin still cannot see or edit any user's private collection — that
-- guarantee is untouched by this migration.
--
-- Run this once in the Supabase SQL editor (both local/dev and production).
-- ============================================================

alter table profiles add column is_restricted boolean not null default false;

-- security definer so this can read is_restricted regardless of the
-- caller's own column grants (profiles only grants authenticated users
-- select on id/username/is_admin/created_at — never is_restricted, so
-- other users can't see who's restricted).
create function is_current_user_restricted() returns boolean as $$
  select coalesce((select is_restricted from profiles where id = auth.uid()), false);
$$ language sql security definer set search_path = public stable;

grant execute on function is_current_user_restricted() to authenticated;

drop policy "insert own thread" on discussion_threads;
create policy "insert own thread" on discussion_threads
  for insert with check (auth.uid() = user_id and not is_current_user_restricted());

drop policy "insert own reply" on discussion_replies;
create policy "insert own reply" on discussion_replies
  for insert with check (auth.uid() = user_id and not is_current_user_restricted());

drop policy "insert own event" on calendar_events;
create policy "insert own event" on calendar_events
  for insert with check (auth.uid() = user_id and not is_current_user_restricted());

drop policy "insert own want" on trade_wants;
create policy "insert own want" on trade_wants
  for insert with check (auth.uid() = user_id and not is_current_user_restricted());

drop policy "send messages in own conversations" on messages;
create policy "send messages in own conversations" on messages
  for insert with check (
    auth.uid() = sender_id
    and not is_current_user_restricted()
    and exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid())
  );

-- Collection entries: block only the is_for_trade toggle, not general
-- collection management — a restricted user can still buy/sell/organize
-- their own binder normally, just can't list things on the Trading board.
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
