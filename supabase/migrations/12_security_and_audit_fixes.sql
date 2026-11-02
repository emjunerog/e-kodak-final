-- =============================================================================
-- E-KODAK STUDIO — MIGRATION 12: SECURITY & AUDIT CONSTRAINT FIXES
-- =============================================================================
-- 1. Permits legitimate QR token rotation (`rotateBookingToken`) when
--    `booking_token_rotated_at` is updated simultaneously, while keeping
--    `id`, `booking_number`, and `customer_id` strictly immutable.
-- 2. Allows `qr_scan_logs.booking_id` to be nullable so failed/invalid QR scan
--    attempts (where no booking matches) can be recorded for security auditing.
-- 3. Expands `qr_scan_logs.scan_result` constraint to include `'DELETED_PASS'`.
-- =============================================================================

-- ── 1. Update Booking Security Trigger to Permit Explicit Token Rotation ─────
create or replace function public.trg_secure_booking_update()
returns trigger as $$
begin
  if (NEW.id IS DISTINCT FROM OLD.id OR 
      NEW.booking_number IS DISTINCT FROM OLD.booking_number OR 
      NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
      (NEW.booking_token IS DISTINCT FROM OLD.booking_token AND NEW.booking_token_rotated_at IS NOT DISTINCT FROM OLD.booking_token_rotated_at)) then
    raise exception 'SECURITY VIOLATION: Attempted to modify immutable booking identity fields.';
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- ── 2. Relax qr_scan_logs Constraints for Security Telemetry ─────────────────
alter table if exists public.qr_scan_logs
  alter column booking_id drop not null;

alter table if exists public.qr_scan_logs
  drop constraint if exists qr_scan_logs_scan_result_check;

alter table if exists public.qr_scan_logs
  add constraint qr_scan_logs_scan_result_check
  check (scan_result in ('SUCCESS', 'EXPIRED', 'INVALID', 'REVOKED', 'DELETED_PASS'));

