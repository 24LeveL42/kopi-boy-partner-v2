-- ============================================================================
-- KOPI BOY 2.0 — Customer <-> Rider chat for an active delivery
-- Run this ONCE, after every script in supabase-schema.sql and
-- supabase-notifications.sql, in the same Supabase project's SQL Editor
-- (Dashboard > SQL Editor > New query > paste this whole file > Run).
--
-- Safe to re-run: every statement is idempotent (CREATE TABLE IF NOT EXISTS,
-- DROP POLICY IF EXISTS before CREATE, CREATE OR REPLACE for functions).
--
-- This is the ONE definition of these objects — same rule as get_order_rider
-- in supabase-schema.sql. If the Customer app has its own copy of the schema
-- files, don't duplicate this section there; both apps talk to the same
-- Supabase project, so running it once here is enough.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. MESSAGES
-- One row per chat message on an order. Deliberately minimal: no edit, no
-- delete, no read receipts — same "immutable snapshot" shape as order_items.
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) > 0 and length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_order_created_idx
  on public.messages (order_id, created_at);

alter table public.messages enable row level security;

-- select + insert only — no update, no delete (chat history is immutable and
-- is never wiped by the app; see order_chat_participant() below for when it
-- stops being *visible*).
grant select, insert on public.messages to authenticated;

-- ----------------------------------------------------------------------------
-- 2. order_chat_participant(): is the caller allowed into this order's chat?
-- SECURITY DEFINER is required here, not just style: a customer has no SELECT
-- access to delivery_requests (only cooks/riders/admin do — see
-- supabase-schema.sql section 18), so a plain invoker-rights check would
-- always read 0 rows for a customer and silently deny everyone. Same
-- workaround already used for public.get_order_rider().
--
-- Returns true only while ALL of these hold — this is both the "who" and the
-- "until when" rule in one place, so select and insert can't drift apart:
--   * the order is not cancelled/rejected;
--   * the order has a delivery_requests row with status = 'accepted' (once a
--     rider marks it completed, or backs out, or it's cancelled, that row no
--     longer matches, and access stops for both sides — no separate "is it
--     terminal" check needed);
--   * the caller is that order's customer OR that delivery's rider.
-- No admin bypass on purpose — this scope is customer + assigned rider only.
-- ----------------------------------------------------------------------------
create or replace function public.order_chat_participant(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    join public.delivery_requests d on d.order_id = o.id
    where o.id = p_order_id
      and o.order_status not in ('cancelled', 'rejected')
      and d.status = 'accepted'
      and (o.customer_id = auth.uid() or d.rider_id = auth.uid())
  );
$$;

revoke all on function public.order_chat_participant(uuid) from public, anon;
grant execute on function public.order_chat_participant(uuid) to authenticated;

drop policy if exists "Participants can read active order chat" on public.messages;
create policy "Participants can read active order chat"
  on public.messages for select
  using (public.order_chat_participant(order_id));

drop policy if exists "Participants can send active order chat messages" on public.messages;
create policy "Participants can send active order chat messages"
  on public.messages for insert
  with check (sender_id = auth.uid() and public.order_chat_participant(order_id));

-- ----------------------------------------------------------------------------
-- 3. REALTIME
-- Same mechanism as the notifications inbox: RLS still applies to what each
-- subscriber receives, so a stale session watching an order that just went
-- terminal simply stops getting rows — it doesn't need to unsubscribe.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- HOW TO CHECK IT'S WORKING (run after applying the file above)
--
-- As the DB owner (SQL Editor bypasses RLS, so this only proves the rows
-- exist — it does NOT prove RLS is enforced; use two real sessions for that):
--   select * from public.messages order by created_at desc limit 20;
--
-- To prove RLS itself: open two browser sessions (or two Supabase client
-- instances) signed in as the order's customer and the accepted rider, plus
-- a third signed in as an unrelated user. Insert/select from the app (or via
-- supabase.from('messages')...) as each and confirm:
--   * customer + assigned rider can read/send;
--   * the unrelated user's select returns zero rows and insert is rejected
--     ("new row violates row-level security policy");
--   * once the rider marks the delivery completed (or it's cancelled), both
--     the customer's and the rider's selects go back to zero rows for that
--     order_id, even though the rows are still in the table.
-- ----------------------------------------------------------------------------
