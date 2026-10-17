-- ==============================================================================
-- Migration 11: Fix Booking Number Sequence Generation under Row Level Security (RLS)
-- ==============================================================================
-- Problem:
--   When customer accounts (authenticated role) created a new booking,
--   the trigger function generate_booking_number() was executed as SECURITY INVOKER.
--   Because the bookings table has RLS policy: (auth.uid() = customer_id),
--   a customer who did not own prior bookings saw 0 existing rows when querying
--   SELECT max(booking_number). Consequently, the function computed sequence 1
--   ('BK-2026-00001'), colliding with existing bookings and raising error 23505
--   (duplicate key value violates unique constraint "bookings_booking_number_key").
--
-- Solution:
--   1. Mark generate_booking_number() as SECURITY DEFINER with set search_path = public.
--      This allows the sequence generator to read all rows across the table,
--      bypassing caller-scoped RLS to correctly find the true highest sequence number.
--   2. Acquire transaction-level advisory lock to serialize concurrent insertions.
--   3. Apply WHILE EXISTS loop as defense-in-depth collision safeguard.
--   4. Mark trg_secure_booking_insert() as SECURITY DEFINER to preserve client tier totals.
-- ==============================================================================

create or replace function public.generate_booking_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  year_prefix text;
  sequence_val int;
  candidate_number text;
begin
  -- Serialize booking number generation using a transaction-level advisory lock
  -- This strictly prevents race conditions and duplicate key errors on concurrent inserts
  perform pg_advisory_xact_lock(hashtext('bookings_booking_number_lock'));

  year_prefix := 'BK-' || to_char(now(), 'YYYY') || '-';

  -- Compute next sequence number for the current year across all records in public.bookings
  select coalesce(max(nullif(regexp_replace(booking_number, '^BK-[0-9]{4}-', ''), '')), '0')::int + 1
  into sequence_val
  from public.bookings
  where booking_number like year_prefix || '%';

  candidate_number := year_prefix || lpad(sequence_val::text, 5, '0');

  -- Robust collision protection: loop until guaranteed unique across entire table
  while exists (select 1 from public.bookings where booking_number = candidate_number) loop
    sequence_val := sequence_val + 1;
    candidate_number := year_prefix || lpad(sequence_val::text, 5, '0');
  end loop;

  new.booking_number := candidate_number;
  return new;
end;
$$;

create or replace function public.trg_secure_booking_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  srv_base_price numeric(12,2);
  srv_down_payment numeric(12,2);
begin
  -- Always enforce initial safe workflow status
  NEW.status = 'PENDING';
  NEW.payment_status = 'UNPAID';
  NEW.photographer_id = NULL;

  -- Validate service_id exists
  select coalesce(base_price, 0), coalesce(down_payment_amount, 0)
  into srv_base_price, srv_down_payment
  from public.services
  where id = NEW.service_id;

  if not found then
    raise exception 'SECURITY VIOLATION: Invalid service_id provided.';
  end if;

  -- Retain client-calculated total_amount (from selected tier + add-ons) if positive
  -- If client did not provide total_amount or sent <= 0, fall back to service base_price
  if coalesce(NEW.total_amount, 0) <= 0 and srv_base_price > 0 then
    NEW.total_amount = srv_base_price;
  end if;

  -- Ensure down_payment_amount is properly calculated (50% default if 0)
  if coalesce(NEW.down_payment_amount, 0) <= 0 then
    if srv_down_payment > 0 then
      NEW.down_payment_amount = srv_down_payment;
    else
      NEW.down_payment_amount = round(coalesce(NEW.total_amount, 0) * 0.5, 2);
    end if;
  end if;

  -- Compute remaining balance
  NEW.remaining_balance = greatest(0, coalesce(NEW.total_amount, 0) - coalesce(NEW.down_payment_amount, 0));

  return NEW;
end;
$$;
