-- ═══════════════════════════════════════════════════════════════════════════
-- E-Kodak Photography Service Management System
-- MIGRATION: 02_phase3_architecture.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Implements Phase 3 Database Architecture Requirements.
-- Safe to run, adds to existing schema without dropping core data.

-- ── 1. PROFILES (Modifications) ──────────────────────────────────────────────
alter table public.profiles
  add column if not exists middle_name text,
  add column if not exists address text,
  add column if not exists avatar_url text,
  add column if not exists is_active boolean not null default true;

-- Update role constraint to include STAFF
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('customer', 'admin', 'photographer', 'staff'));

-- ── 2. SERVICE CATEGORIES ────────────────────────────────────────────────────
create table if not exists public.service_categories (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null unique,
  description text,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.service_categories enable row level security;
drop policy if exists "Service categories are publicly readable" on public.service_categories;
create policy "Service categories are publicly readable" on public.service_categories for select using (is_active = true);

-- Seed Categories
insert into public.service_categories (name, description) values
  ('Portrait', 'Individual and group portraits'),
  ('Graduation', 'College and academic milestones'),
  ('Event', 'Event coverage and documentation'),
  ('Family', 'Family and group lifestyle sessions'),
  ('Couple', 'Couple, anniversary and prenuptial sessions'),
  ('Commercial', 'Commercial, product and branding photography')
on conflict (name) do nothing;

-- ── 3. SERVICES (Modifications) ──────────────────────────────────────────────
alter table public.services
  add column if not exists category_id uuid references public.service_categories(id),
  add column if not exists base_price numeric(12,2) default 0,
  add column if not exists down_payment_amount numeric(12,2) default 0,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0;

-- RLS for Services
alter table public.services enable row level security;
drop policy if exists "Services are publicly readable" on public.services;
create policy "Services are publicly readable" on public.services for select using (is_active = true);

-- Map existing free-text categories to actual category_id (simple exact match)
update public.services s
set category_id = c.id
from public.service_categories c
where lower(s.category) = lower(c.name)
and s.category_id is null;


-- ── 4. PHOTOGRAPHER PROFILES & AVAILABILITY ──────────────────────────────────
create table if not exists public.photographer_profiles (
  id             uuid        primary key references public.profiles(id) on delete cascade,
  specialization text,
  bio            text,
  is_available   boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.photographer_availability (
  id                uuid        primary key default uuid_generate_v4(),
  photographer_id   uuid        not null references public.photographer_profiles(id) on delete cascade,
  availability_date date        not null,
  start_time        time        not null,
  end_time          time        not null,
  status            text        not null default 'AVAILABLE' check (status in ('AVAILABLE', 'UNAVAILABLE', 'BOOKED', 'BLOCKED')),
  notes             text,
  created_at        timestamptz not null default now()
);

-- RLS
alter table public.photographer_profiles enable row level security;
drop policy if exists "Public can read photographer profiles" on public.photographer_profiles;
create policy "Public can read photographer profiles" on public.photographer_profiles for select using (true);

alter table public.photographer_availability enable row level security;
drop policy if exists "Staff can manage availability" on public.photographer_availability;
create policy "Staff can manage availability" on public.photographer_availability for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('staff', 'admin'))
);
drop policy if exists "Public can view availability" on public.photographer_availability;
create policy "Public can view availability" on public.photographer_availability for select using (true);

-- ── 5. BOOKINGS (Modifications) ──────────────────────────────────────────────
alter table public.bookings
  add column if not exists photographer_id uuid references public.photographer_profiles(id),
  add column if not exists total_amount numeric(12,2) not null default 0,
  add column if not exists down_payment_amount numeric(12,2) not null default 0,
  add column if not exists remaining_balance numeric(12,2) not null default 0;

-- Constraints
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check check (status in (
    'PENDING', 'CONFIRMED', 'PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 
    'EDITING', 'PRINTING', 'READY', 'COMPLETED', 'REJECTED', 'CANCELLED'
  ));

alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings
  add constraint bookings_payment_status_check check (payment_status in (
    'UNPAID', 'PARTIAL', 'PAID', 'REFUNDED'
  ));

-- Make sure staff can read/update all
drop policy if exists "Staff read all bookings" on public.bookings;
create policy "Staff read all bookings" on public.bookings
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
  );

drop policy if exists "Staff update all bookings" on public.bookings;
create policy "Staff update all bookings" on public.bookings
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
  );

-- Photographer read assigned bookings
drop policy if exists "Photographer read assigned bookings" on public.bookings;
create policy "Photographer read assigned bookings" on public.bookings
  for select using (
    auth.uid() = photographer_id
  );

-- ── 6. BOOKING STATUS HISTORY ────────────────────────────────────────────────
create table if not exists public.booking_status_history (
  id          uuid        primary key default uuid_generate_v4(),
  booking_id  uuid        not null references public.bookings(id) on delete cascade,
  status      text        not null,
  changed_by  uuid        references public.profiles(id),
  remarks     text,
  created_at  timestamptz not null default now()
);

alter table public.booking_status_history enable row level security;
drop policy if exists "Customer read own history" on public.booking_status_history;
create policy "Customer read own history" on public.booking_status_history for select using (
  exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid())
);
drop policy if exists "Staff manage history" on public.booking_status_history;
create policy "Staff manage history" on public.booking_status_history for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);

-- ── 7. PAYMENTS ──────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id               uuid        primary key default uuid_generate_v4(),
  booking_id       uuid        not null references public.bookings(id) on delete cascade,
  amount           numeric(12,2) not null check (amount > 0),
  payment_type     text        not null check (payment_type in ('DOWN_PAYMENT', 'FINAL_PAYMENT', 'OTHER')),
  payment_method   text        not null check (payment_method in ('CASH', 'BANK_TRANSFER', 'E_WALLET', 'OTHER')),
  reference_number text,
  payment_date     timestamptz not null default now(),
  recorded_by      uuid        references public.profiles(id),
  notes            text,
  created_at       timestamptz not null default now()
);

-- Trigger to update remaining balance
create or replace function update_booking_balance()
returns trigger as $$
declare
  total_paid numeric(12,2);
  b_total numeric(12,2);
begin
  -- Get total paid for the booking
  select sum(amount) into total_paid from public.payments 
  where booking_id = coalesce(new.booking_id, old.booking_id);
  
  -- Get total required amount
  select total_amount into b_total from public.bookings 
  where id = coalesce(new.booking_id, old.booking_id);
  
  -- Update booking remaining_balance and payment_status
  update public.bookings 
  set remaining_balance = b_total - coalesce(total_paid, 0),
      payment_status = case 
        when (b_total - coalesce(total_paid, 0)) <= 0 then 'PAID'
        when coalesce(total_paid, 0) > 0 then 'PARTIAL'
        else 'UNPAID'
      end
  where id = coalesce(new.booking_id, old.booking_id);
  
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_update_booking_balance on public.payments;
create trigger trg_update_booking_balance
  after insert or update or delete on public.payments
  for each row execute function update_booking_balance();

alter table public.payments enable row level security;
drop policy if exists "Staff manage payments" on public.payments;
create policy "Staff manage payments" on public.payments for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);
drop policy if exists "Customers view own payments" on public.payments;
create policy "Customers view own payments" on public.payments for select using (
  exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid())
);

-- ── 8. NOTIFICATIONS ─────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id                uuid        primary key default uuid_generate_v4(),
  user_id           uuid        not null references public.profiles(id) on delete cascade,
  booking_id        uuid        references public.bookings(id) on delete cascade,
  title             text        not null,
  message           text        not null,
  notification_type text        not null,
  is_read           boolean     not null default false,
  created_at        timestamptz not null default now()
);

alter table public.notifications enable row level security;
drop policy if exists "Users manage own notifications" on public.notifications;
create policy "Users manage own notifications" on public.notifications for all using (
  auth.uid() = user_id
);

-- ── 9. SMS LOGS ──────────────────────────────────────────────────────────────
create table if not exists public.sms_logs (
  id                  uuid        primary key default uuid_generate_v4(),
  booking_id          uuid        references public.bookings(id) on delete set null,
  customer_id         uuid        references public.profiles(id) on delete set null,
  phone_number        text        not null,
  message             text        not null,
  notification_type   text        not null,
  provider_message_id text,
  status              text        not null default 'PENDING',
  error_message       text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);

alter table public.sms_logs enable row level security;
drop policy if exists "Staff read sms logs" on public.sms_logs;
create policy "Staff read sms logs" on public.sms_logs for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);

-- ── 10. PHOTO OUTPUTS ────────────────────────────────────────────────────────
create table if not exists public.photo_outputs (
  id          uuid        primary key default uuid_generate_v4(),
  booking_id  uuid        not null references public.bookings(id) on delete cascade,
  file_path   text        not null,
  file_name   text        not null,
  file_type   text,
  file_size   bigint,
  status      text        not null default 'UPLOADED' check (status in ('UPLOADED', 'EDITING', 'READY', 'RELEASED')),
  uploaded_by uuid        references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.photo_outputs enable row level security;
drop policy if exists "Customer view released photos" on public.photo_outputs;
create policy "Customer view released photos" on public.photo_outputs for select using (
  status = 'RELEASED' and exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid())
);
drop policy if exists "Staff manage photo outputs" on public.photo_outputs;
create policy "Staff manage photo outputs" on public.photo_outputs for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);
drop policy if exists "Photographer manage assigned photo outputs" on public.photo_outputs;
create policy "Photographer manage assigned photo outputs" on public.photo_outputs for all using (
  exists (select 1 from public.bookings b where b.id = booking_id and b.photographer_id = auth.uid())
);

-- ── 11. INDEXES ──────────────────────────────────────────────────────────────
create index if not exists idx_bookings_customer on public.bookings(customer_id);
create index if not exists idx_bookings_photographer on public.bookings(photographer_id);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_booking_history_booking on public.booking_status_history(booking_id);
create index if not exists idx_payments_booking on public.payments(booking_id);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_sms_logs_booking on public.sms_logs(booking_id);
create index if not exists idx_photo_outputs_booking on public.photo_outputs(booking_id);

-- ── 12. STORAGE BUCKETS ──────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) 
values ('photo-outputs', 'photo-outputs', false)
on conflict (id) do nothing;

drop policy if exists "Staff full access photo outputs" on storage.objects;
create policy "Staff full access photo outputs" on storage.objects for all using (
  bucket_id = 'photo-outputs' and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin')
  )
);

drop policy if exists "Customer read released photos" on storage.objects;
create policy "Customer read released photos" on storage.objects for select using (
  bucket_id = 'photo-outputs' and exists (
    select 1 from public.photo_outputs po
    join public.bookings b on po.booking_id = b.id
    where po.file_path = storage.objects.name
      and po.status = 'RELEASED'
      and b.customer_id = auth.uid()
  )
);
