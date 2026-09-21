-- ═══════════════════════════════════════════════════════════════════════════
-- E-Kodak Photography Service Management System
-- MIGRATION: 05_booking_addons.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Creates the add_ons table and adds selected_add_ons to bookings

create table if not exists public.add_ons (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null unique,
  price       numeric(12,2) not null check (price >= 0),
  is_active   boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.add_ons enable row level security;

drop policy if exists "Public can view active add_ons" on public.add_ons;
create policy "Public can view active add_ons" on public.add_ons
  for select using (is_active = true);

drop policy if exists "Staff can manage add_ons" on public.add_ons;
create policy "Staff can manage add_ons" on public.add_ons
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
  );

-- Seed Add-ons
insert into public.add_ons (name, price, sort_order) values
  ('Rush Delivery (3 days)', 1500.00, 1),
  ('Extra Edited Photos (+10)', 800.00, 2),
  ('Printed 8×10 Photo', 350.00, 3),
  ('Printed Photo Album (20 pages)', 3500.00, 4),
  ('Same-Day Sneak Peek (5 photos)', 1000.00, 5),
  ('Additional Photographer', 4000.00, 6),
  ('Drone Aerial Photography', 3000.00, 7),
  ('Videography (Short Film)', 8000.00, 8)
on conflict (name) do update 
set price = excluded.price, sort_order = excluded.sort_order;

-- Alter bookings table to store selected add-ons
alter table public.bookings 
  add column if not exists selected_add_ons jsonb default '[]'::jsonb;
