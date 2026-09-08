-- ============================================================================
-- KOPI BOY 2.0 — Feature #002: Auth + Roles
-- Run this ONCE in your Supabase project's SQL Editor (Dashboard > SQL Editor
-- > New query > paste this whole file > Run).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- One row per authenticated user. Created automatically on signup via the
-- trigger at the bottom of this file — never insert into this table directly
-- from the app.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'cook', 'rider', 'admin')),
  full_name text,
  phone text,
  -- Admin on/off switch for cooks and riders (section 16/21 of the handover
  -- doc — "temporary block", "suspend/reinstate"). Customers and admins are
  -- always active; this only matters for cook/rider rows.
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own row, but a trigger (below) silently protects
-- role/is_active from being changed by anyone except an admin — otherwise
-- this policy alone would let a user grant themselves admin access.
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can read every profile"
  on public.profiles for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins can update every profile"
  on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 2. COOK APPLICATIONS
-- Section 20 of the handover doc: register -> submit -> review -> approve/reject.
-- ----------------------------------------------------------------------------
create table public.cook_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  business_type text, -- e.g. "Home Cook", "Hawker", "Bakery", "Small Business"
  description text,
  neighbourhood text,
  paynow_uen text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.cook_applications enable row level security;

create policy "Applicants can read their own cook application"
  on public.cook_applications for select
  using (auth.uid() = user_id);

create policy "Applicants can submit a cook application"
  on public.cook_applications for insert
  with check (auth.uid() = user_id);

create policy "Admins can read every cook application"
  on public.cook_applications for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins can update every cook application"
  on public.cook_applications for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 3. RIDER APPLICATIONS
-- Section 10/21: free registration, but must be approved before accepting
-- deliveries.
-- ----------------------------------------------------------------------------
create table public.rider_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_type text, -- e.g. "Bicycle", "Motorcycle", "Car"
  license_plate text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.rider_applications enable row level security;

create policy "Applicants can read their own rider application"
  on public.rider_applications for select
  using (auth.uid() = user_id);

create policy "Applicants can submit a rider application"
  on public.rider_applications for insert
  with check (auth.uid() = user_id);

create policy "Admins can read every rider application"
  on public.rider_applications for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins can update every rider application"
  on public.rider_applications for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 4. AUTO-CREATE A PROFILE ROW ON SIGNUP
-- Runs every time someone signs up (Google or email OTP). Defaults everyone
-- to role = 'customer' — cooks/riders upgrade their own role only via an
-- approved application (handled in application-approval logic later, Feature
-- #003), never by editing their own profile row directly.
-- ----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 5. PROTECT role AND is_active FROM SELF-EDITING
-- The "Users can update their own profile" policy above allows a user to
-- update their own row (needed for e.g. changing their name/phone) — but
-- without this trigger, that same policy would let a user set their own
-- role to 'admin' or flip their own is_active flag. This trigger silently
-- reverts those two columns to their previous value unless the person
-- making the change is already an admin.
-- ----------------------------------------------------------------------------
create function public.protect_profile_privileges()
returns trigger as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    new.role := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger before_profile_update
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();


-- ============================================================================
-- KOPI BOY 2.0 — Feature #003: Merchant Onboarding (Kitchen + Menu)
-- Run this ONCE, after the Feature #002 script above, in the same Supabase
-- project's SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6. KITCHENS
-- One row per approved cook — the merchant-facing profile shown in the
-- Customer app marketplace. Created/edited by the cook themselves via the
-- Partner app's kitchen setup screen, not by HQ. id = the cook's own
-- profiles.id (one kitchen per cook).
-- ----------------------------------------------------------------------------
create table public.kitchens (
  id uuid primary key references public.profiles(id) on delete cascade,
  business_name text not null,
  category text not null check (category in ('home-cook', 'hawker', 'bakery', 'bulk-orders', 'drinks')),
  cuisine_type text not null check (cuisine_type in ('chinese', 'halal', 'indian', 'western')),
  neighbourhood text not null,
  description text,
  hero_image text, -- optional per the handover doc ("a food photo is optional"); Customer app falls back to a category image when null
  is_live boolean not null default false, -- flips true once the cook has saved at least one menu item (enforced in app logic, not here)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kitchens enable row level security;

create policy "Cooks can read their own kitchen"
  on public.kitchens for select
  using (auth.uid() = id);

create policy "Cooks can insert their own kitchen"
  on public.kitchens for insert
  with check (auth.uid() = id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'cook'));

create policy "Cooks can update their own kitchen"
  on public.kitchens for update
  using (auth.uid() = id);

create policy "Anyone can read live kitchens"
  on public.kitchens for select
  using (is_live = true);

create policy "Admins can read every kitchen"
  on public.kitchens for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 7. MENU ITEMS
-- Section: "menu items and price tags are mandatory; a food photo is
-- optional." One row per dish. The Partner app replaces all of a kitchen's
-- rows on every save (see KitchenSetupForm) rather than diffing — simplest
-- correct approach for this feature's scope.
-- ----------------------------------------------------------------------------
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  name text not null,
  price numeric(6,2) not null check (price > 0),
  photo_url text,
  created_at timestamptz not null default now()
);

alter table public.menu_items enable row level security;

create policy "Cooks can manage their own menu items"
  on public.menu_items for all
  using (auth.uid() = kitchen_id)
  with check (auth.uid() = kitchen_id);

create policy "Anyone can read menu items of a live kitchen"
  on public.menu_items for select
  using (exists (select 1 from public.kitchens k where k.id = menu_items.kitchen_id and k.is_live = true));

-- ----------------------------------------------------------------------------
-- 8. KEEP updated_at CURRENT ON KITCHENS
-- ----------------------------------------------------------------------------
create function public.touch_kitchen_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger before_kitchen_update
  before update on public.kitchens
  for each row execute function public.touch_kitchen_updated_at();
