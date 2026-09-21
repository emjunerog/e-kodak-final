import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}

async function fixPaymentsRLS() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log('Connected to PostgreSQL.');

  // 1. Ensure RLS on payments allows Customers to INSERT for their own bookings
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Customers can insert payments for own bookings'
      ) THEN
        CREATE POLICY "Customers can insert payments for own bookings" ON public.payments
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = payments.booking_id AND b.customer_id = auth.uid()
          )
        );
      END IF;
    END
    $$;
  `);
  console.log('✓ Ensured Customers can insert payments for own bookings policy.');

  // 2. Ensure Customers can view own payments
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Customers view own payments'
      ) THEN
        CREATE POLICY "Customers view own payments" ON public.payments
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = payments.booking_id AND b.customer_id = auth.uid()
          )
        );
      END IF;
    END
    $$;
  `);
  console.log('✓ Ensured Customers view own payments policy.');

  // 3. Update trigger function with SECURITY DEFINER
  await client.query(`
    CREATE OR REPLACE FUNCTION public.update_booking_balance()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $function$
    declare
      total_paid numeric(12,2);
      b_total numeric(12,2);
    begin
      -- Get total paid for the booking
      select coalesce(sum(amount), 0) into total_paid from public.payments 
      where booking_id = coalesce(new.booking_id, old.booking_id);
      
      -- Get total required amount
      select coalesce(total_amount, 0) into b_total from public.bookings 
      where id = coalesce(new.booking_id, old.booking_id);
      
      -- Update booking remaining_balance, down_payment_amount, down_payment_confirmed, payment_status, payment_confirmed_at
      update public.bookings 
      set remaining_balance = greatest(0, b_total - total_paid),
          down_payment_amount = total_paid,
          down_payment_confirmed = (total_paid > 0),
          payment_confirmed_at = case when total_paid > 0 then coalesce(payment_confirmed_at, now()) else payment_confirmed_at end,
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
  `);
  console.log('✓ Updated update_booking_balance trigger with SECURITY DEFINER.');

  // 4. Verify policies on payments
  const polRes = await client.query(`
    SELECT policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'payments';
  `);
  console.log('Payments policies:', polRes.rows.map(r => `${r.cmd}: ${r.policyname}`));

  await client.end();
}

fixPaymentsRLS().catch(err => {
  console.error('Failed to fix payments RLS:', err);
  process.exit(1);
});
