-- Ensure customer-submitted gateway payments wait for explicit admin approval
-- before marking down_payment_confirmed / payment_confirmed_at on public.bookings.

CREATE OR REPLACE FUNCTION public.update_booking_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  total_paid numeric(12,2);
  b_total numeric(12,2);
  recorder_role text;
  is_admin_recorded boolean := false;
begin
  select coalesce(sum(amount), 0) into total_paid
  from public.payments
  where booking_id = coalesce(new.booking_id, old.booking_id);

  select coalesce(total_amount, 0) into b_total
  from public.bookings
  where id = coalesce(new.booking_id, old.booking_id);

  if tg_op in ('INSERT', 'UPDATE') and new.recorded_by is not null then
    select lower(coalesce(role, '')) into recorder_role
    from public.profiles
    where id = new.recorded_by;
    is_admin_recorded := recorder_role in ('admin', 'staff');
  end if;

  update public.bookings
  set remaining_balance = greatest(0, b_total - total_paid),
      down_payment_amount = total_paid,
      down_payment_confirmed = case
        when total_paid <= 0 then false
        when is_admin_recorded then true
        else coalesce(down_payment_confirmed, false)
      end,
      payment_confirmed_at = case
        when total_paid <= 0 then null
        when is_admin_recorded then coalesce(payment_confirmed_at, now())
        else payment_confirmed_at
      end,
      payment_status = case
        when (b_total - total_paid) <= 0 and total_paid > 0 then 'PAID'
        when total_paid > 0 then 'PARTIAL'
        else 'UNPAID'
      end,
      updated_at = now()
  where id = coalesce(new.booking_id, old.booking_id);

  return coalesce(new, old);
end;
$function$;
