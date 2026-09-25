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
-- 4. PHOTO ATTACHMENTS
-- Same shape as the Customer app's complaint_messages + complaint-photos
-- (its supabase-schema.sql sections 25-26): a message may carry a photo, and
-- photo_path is an object KEY in a PRIVATE bucket, not a URL — the app turns
-- it into a short-lived signed URL when rendering. Body may be empty only
-- alongside a photo. The path check pins the key under this message's own
-- order folder, so a message can't point at another order's photo.
--
-- The existing table-level `grant select, insert on public.messages` already
-- covers the new column; nothing to add there.
-- ----------------------------------------------------------------------------
alter table public.messages add column if not exists photo_path text;
alter table public.messages alter column body set default '';

-- Replaces the inline check from section 1 (Postgres auto-named it
-- messages_body_check). Existing rows all have a non-empty body, so they pass.
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check
  check (length(body) <= 2000 and (length(btrim(body)) > 0 or photo_path is not null));

alter table public.messages drop constraint if exists messages_photo_path_check;
alter table public.messages add constraint messages_photo_path_check
  check (photo_path is null or photo_path like order_id::text || '/%');

-- ----------------------------------------------------------------------------
-- 5. ORDER CHAT PHOTOS BUCKET (private)
-- Object key: <order_id>/<uploader_id>/<random>.<ext>. Read and upload are
-- allowed to exactly the people order_chat_participant() lets into the chat
-- (first folder), and uploads must sit in the uploader's own sub-folder. So
-- photos follow the chat's own window: once the delivery is completed or the
-- order is cancelled/rejected, neither side can fetch or sign them any more
-- (the objects are kept, like the message rows). No update/delete policy:
-- chat history is immutable. The regex guard keeps a non-uuid folder name
-- from raising a cast error inside the policy — such a key is just denied.
--
-- No storage GRANTs needed: Supabase already grants authenticated
-- select/insert on storage.objects; these policies are what scope it.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-chat-photos', 'order-chat-photos', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Order chat participants can view its photos" on storage.objects;
create policy "Order chat participants can view its photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'order-chat-photos'
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.order_chat_participant(((storage.foldername(name))[1])::uuid)
      else false
    end
  );

drop policy if exists "Order chat participants can upload photos" on storage.objects;
create policy "Order chat participants can upload photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'order-chat-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.order_chat_participant(((storage.foldername(name))[1])::uuid)
      else false
    end
  );

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
--   * photos: the unrelated user's upload to order-chat-photos/<order_id>/...
--     is rejected, and createSignedUrl on an existing photo key fails for
--     them (and for both participants once the delivery is completed).
-- ----------------------------------------------------------------------------
