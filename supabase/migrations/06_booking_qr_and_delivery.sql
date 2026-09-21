-- ═══════════════════════════════════════════════════════════════════════════
-- E-Kodak Photography Service Management System
-- MIGRATION: 06_booking_qr_and_delivery.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Adds QR code storage, delivery tracking, and payment enhancements
-- Safe to run, adds to existing schema without dropping core data.

-- ── 1. BOOKINGS: QR Code & Payment Enhancements ────────────────────────────────
alter table public.bookings
  add column if not exists qr_code_path text,
  add column if not exists qr_payload_version int not null default 1,
  add column if not exists booking_token_rotated_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists down_payment_confirmed boolean not null default false;

-- ── 2. BOOKING DELIVERIES ──────────────────────────────────────────────────────
create table if not exists public.booking_deliveries (
  id                  uuid        primary key default uuid_generate_v4(),
  booking_id          uuid        not null references public.bookings(id) on delete cascade,
  delivery_type       text        not null check (delivery_type in ('DIGITAL', 'PICKUP', 'SHIPPING')),
  status              text        not null default 'PENDING' check (status in ('PENDING', 'READY', 'DISPATCHED', 'DELIVERED', 'FAILED', 'CANCELLED')),
  tracking_number     text,
  carrier             text,
  dispatch_address    jsonb,
  digital_access_expires_at timestamptz,
  dispatched_at       timestamptz,
  delivered_at        timestamptz,
  confirmed_by_customer_at timestamptz,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.booking_deliveries enable row level security;

drop policy if exists "Customer view own deliveries" on public.booking_deliveries;
create policy "Customer view own deliveries" on public.booking_deliveries
  for select using (
    exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid())
  );

drop policy if exists "Staff manage deliveries" on public.booking_deliveries;
create policy "Staff manage deliveries" on public.booking_deliveries
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
  );

drop policy if exists "Photographer view assigned deliveries" on public.booking_deliveries;
create policy "Photographer view assigned deliveries" on public.booking_deliveries
  for select using (
    exists (select 1 from public.bookings b where b.id = booking_id and b.photographer_id = auth.uid())
  );

create index if not exists idx_booking_deliveries_booking on public.booking_deliveries(booking_id);
create index if not exists idx_booking_deliveries_status on public.booking_deliveries(status);

-- ── 3. QR SCAN LOGS (Analytics) ────────────────────────────────────────────────
create table if not exists public.qr_scan_logs (
  id                  uuid        primary key default uuid_generate_v4(),
  booking_id          uuid        not null references public.bookings(id) on delete cascade,
  scanned_by          uuid        references public.profiles(id) on delete set null,
  scan_type           text        not null check (scan_type in ('CUSTOMER_VIEW', 'STAFF_CHECKIN', 'PHOTOGRAPHER_CHECKIN', 'DELIVERY_CONFIRM', 'COMPANION_APP')),
  user_agent          text,
  ip_address          inet,
  scan_result         text        not null default 'SUCCESS' check (scan_result in ('SUCCESS', 'EXPIRED', 'INVALID', 'REVOKED')),
  created_at          timestamptz not null default now()
);

alter table public.qr_scan_logs enable row level security;

drop policy if exists "Staff view scan logs" on public.qr_scan_logs;
create policy "Staff view scan logs" on public.qr_scan_logs
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
  );

drop policy if exists "Customer view own scan logs" on public.qr_scan_logs;
create policy "Customer view own scan logs" on public.qr_scan_logs
  for select using (
    exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid())
  );

create index if not exists idx_qr_scan_logs_booking on public.qr_scan_logs(booking_id);
create index if not exists idx_qr_scan_logs_created on public.qr_scan_logs(created_at);

-- ── 4. TRIGGER: Auto-create delivery when booking reaches READY ────────────────
create or replace function public.trg_create_delivery_on_ready()
returns trigger as $$
begin
  if (NEW.status = 'READY' AND OLD.status != 'READY') then
    insert into public.booking_deliveries (booking_id, delivery_type, status)
    values (NEW.id, 'DIGITAL', 'PENDING')
    on conflict do nothing;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists create_delivery_on_ready on public.bookings;
create trigger create_delivery_on_ready
  after update on public.bookings
  for each row execute function public.trg_create_delivery_on_ready();

-- ── 5. TRIGGER: Set confirmed_at timestamp ──────────────────────────────────────
create or replace function public.trg_set_confirmed_at()
returns trigger as $$
begin
  if (NEW.status = 'CONFIRMED' AND OLD.status != 'CONFIRMED') then
    NEW.confirmed_at = now();
    NEW.payment_confirmed_at = case when NEW.payment_status = 'PAID' then now() else NULL end;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists set_confirmed_at on public.bookings;
create trigger set_confirmed_at
  before update on public.bookings
  for each row execute function public.trg_set_confirmed_at();

-- ── 6. STORAGE BUCKET FOR QR CODES ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('booking-qr-codes', 'booking-qr-codes', true)
on conflict (id) do nothing;

drop policy if exists "Public read QR codes" on storage.objects;
create policy "Public read QR codes" on storage.objects
  for select using (bucket_id = 'booking-qr-codes');

drop policy if exists "Staff manage QR codes" on storage.objects;
create policy "Staff manage QR codes" on storage.objects
  for all using (
    bucket_id = 'booking-qr-codes' and
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
  );