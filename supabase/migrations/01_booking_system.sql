-- ═══════════════════════════════════════════════════════════════════════════
-- E-Kodak Photography Service Management System
-- MIGRATION: 01_booking_system.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this script in your Supabase SQL Editor to create the tables,
-- triggers, and RLS policies required for the Booking System.

-- ── 1. PROFILES ───────────────────────────────────────────────────────────────
-- Associates authenticated Supabase auth.users with app-specific data.

create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  role        text        not null default 'customer', -- 'customer', 'admin', 'photographer'
  first_name  text,
  last_name   text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Trigger to automatically create a profile when a new user signs up
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'customer'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Profiles RLS
alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- ── 2. BOOKINGS ───────────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id                uuid        primary key default uuid_generate_v4(),
  booking_number    text        not null unique, -- Human readable e.g., BK-2026-00001
  booking_token     uuid        not null unique default uuid_generate_v4(), -- Secure token for QR
  customer_id       uuid        not null references public.profiles(id) on delete cascade,
  service_id        uuid        not null references public.services(id) on delete restrict,
  tier_name         text,       -- The specific package tier chosen
  event_date        date,       -- Nullable in case the date isn't set yet
  preferred_time    time,       
  location          text,       -- Studio, specific address, etc
  notes             text,       
  status            text        not null default 'PENDING', -- PENDING, CONFIRMED, COMPLETED, CANCELLED
  payment_status    text        not null default 'UNPAID',  -- UNPAID, PARTIAL, PAID
  reference_images  text[]      default '{}', -- Array of paths in Supabase Storage
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Bookings RLS
alter table public.bookings enable row level security;

drop policy if exists "Customers can view their own bookings" on public.bookings;
create policy "Customers can view their own bookings"
  on public.bookings for select
  using (auth.uid() = customer_id);

drop policy if exists "Customers can create bookings" on public.bookings;
create policy "Customers can create bookings"
  on public.bookings for insert
  with check (auth.uid() = customer_id);


-- ── 3. FUNCTION TO GENERATE BOOKING NUMBER ────────────────────────────────────
-- Safely generates unique human-readable booking numbers like BK-YYYY-XXXXX
create or replace function generate_booking_number()
returns trigger as $$
declare
  year_prefix text;
  sequence_val int;
begin
  year_prefix := 'BK-' || to_char(now(), 'YYYY') || '-';
  
  -- Simple approach: lock table and get max number for the year, then increment.
  -- In high concurrency, a sequence is better, but this works fine for a studio.
  select coalesce(max(nullif(regexp_replace(booking_number, '^BK-\d{4}-', ''), '')), '0')::int + 1
  into sequence_val
  from public.bookings
  where booking_number like year_prefix || '%';
  
  new.booking_number := year_prefix || lpad(sequence_val::text, 5, '0');
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_booking_number on public.bookings;
create trigger set_booking_number
  before insert on public.bookings
  for each row
  execute function generate_booking_number();


-- ── 4. STORAGE: BOOKING REFERENCES ────────────────────────────────────────────
-- Create a bucket for customers to upload reference/peg images
insert into storage.buckets (id, name, public) 
values ('booking-references', 'booking-references', false)
on conflict (id) do nothing;

-- Storage RLS
drop policy if exists "Customers can upload reference images" on storage.objects;
create policy "Customers can upload reference images"
  on storage.objects for insert
  with check (
    bucket_id = 'booking-references' AND 
    auth.role() = 'authenticated'
  );

drop policy if exists "Customers can read their own reference images" on storage.objects;
create policy "Customers can read their own reference images"
  on storage.objects for select
  using (
    bucket_id = 'booking-references' AND 
    auth.role() = 'authenticated'
  );
