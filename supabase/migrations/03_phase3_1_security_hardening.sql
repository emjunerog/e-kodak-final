-- ═══════════════════════════════════════════════════════════════════════════
-- E-Kodak Photography Service Management System
-- MIGRATION: 03_phase3_1_security_hardening.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Hardens database security using RLS and strictly enforced Database Triggers.

-- ── 1. PROFILES SECURITY ─────────────────────────────────────────────────────

-- Replace broad UPDATE policy with restricted one (just a formal replacement)
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Create a strict trigger to prevent privilege escalation
create or replace function public.trg_enforce_profile_security()
returns trigger as $$
declare
  v_caller_role text;
begin
  -- Allow postgres superuser and session_user
  if (current_user IN ('postgres', 'supabase_admin') OR session_user IN ('postgres', 'supabase_admin')) then
    return NEW;
  end if;

  -- Allow service_role
  if (coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role') then
    return NEW;
  end if;

  -- Prevent unauthorized role escalation by non-admin authenticated users
  if (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) then
    select role into v_caller_role from public.profiles where id = auth.uid();
    if (v_caller_role != 'admin' AND (OLD.role NOT IN ('admin', 'staff') AND auth.uid() = OLD.id)) then
      raise exception 'SECURITY VIOLATION: Unauthorized attempt to modify protected profile fields (role or is_active).';
    end if;
  end if;

  -- Protect the ID
  if (NEW.id IS DISTINCT FROM OLD.id) then
    raise exception 'SECURITY VIOLATION: Cannot modify profile ID.';
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_profile_security on public.profiles;
create trigger enforce_profile_security
  before update on public.profiles
  for each row execute function public.trg_enforce_profile_security();


-- ── 2. CUSTOMER BOOKING INSERT SECURITY ──────────────────────────────────────

create or replace function public.trg_secure_booking_insert()
returns trigger as $$
declare
  srv_base_price numeric(12,2);
  srv_down_payment numeric(12,2);
begin
  -- Force secure defaults, completely ignoring anything sent by the client
  NEW.status = 'PENDING';
  NEW.payment_status = 'UNPAID';
  NEW.photographer_id = NULL;
  
  -- Prevent client from spoofing the service price
  select base_price, down_payment_amount 
  into srv_base_price, srv_down_payment 
  from public.services 
  where id = NEW.service_id;

  if not found then
    raise exception 'SECURITY VIOLATION: Invalid service_id provided.';
  end if;

  NEW.total_amount = srv_base_price;
  NEW.down_payment_amount = srv_down_payment;
  NEW.remaining_balance = srv_base_price;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists secure_booking_insert on public.bookings;
create trigger secure_booking_insert
  before insert on public.bookings
  for each row execute function public.trg_secure_booking_insert();


-- ── 3. BOOKING UPDATE SECURITY ───────────────────────────────────────────────

create or replace function public.trg_secure_booking_update()
returns trigger as $$
begin
  -- Immutable fields - these should NEVER change once a booking is created
  if (NEW.id IS DISTINCT FROM OLD.id OR 
      NEW.booking_number IS DISTINCT FROM OLD.booking_number OR 
      NEW.booking_token IS DISTINCT FROM OLD.booking_token OR 
      NEW.customer_id IS DISTINCT FROM OLD.customer_id) then
    raise exception 'SECURITY VIOLATION: Attempted to modify immutable booking identity fields.';
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists secure_booking_update on public.bookings;
create trigger secure_booking_update
  before update on public.bookings
  for each row execute function public.trg_secure_booking_update();


-- ── 4. NOTIFICATIONS SECURITY ────────────────────────────────────────────────

-- Remove overly permissive ALL policy
drop policy if exists "Users manage own notifications" on public.notifications;

-- Replace with strict SELECT and UPDATE
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- Trigger to prevent modifying notification content
create or replace function public.trg_secure_notification_update()
returns trigger as $$
begin
  -- If it's the user updating their own notification, they can ONLY change is_read
  if (auth.uid() = OLD.user_id) then
    if (NEW.title IS DISTINCT FROM OLD.title OR 
        NEW.message IS DISTINCT FROM OLD.message OR 
        NEW.notification_type IS DISTINCT FROM OLD.notification_type OR 
        NEW.user_id IS DISTINCT FROM OLD.user_id OR 
        NEW.booking_id IS DISTINCT FROM OLD.booking_id) then
      raise exception 'SECURITY VIOLATION: Only is_read can be modified by the user.';
    end if;
  end if;
  
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists secure_notification_update on public.notifications;
create trigger secure_notification_update
  before update on public.notifications
  for each row execute function public.trg_secure_notification_update();


-- ── 5. CLEANUP PERMISSIVE POLICIES ON PUBLIC TABLES ──────────────────────────

-- Ensure services and categories only have SELECT for public, and ALL for staff
drop policy if exists "Staff can manage services" on public.services;
create policy "Staff can manage services" on public.services
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('staff', 'admin'))
  );

drop policy if exists "Staff can manage service categories" on public.service_categories;
create policy "Staff can manage service categories" on public.service_categories
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('staff', 'admin', 'finance'))
  );

-- ── 6. ADMIN & STAFF ROLE EXPANSION (FINANCE ROLE & RLS) ──────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('customer', 'admin', 'photographer', 'staff', 'finance'));

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('staff', 'admin', 'finance')
  );
$$ LANGUAGE sql SECURITY DEFINER;

