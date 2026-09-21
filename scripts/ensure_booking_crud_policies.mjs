import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}

async function setupPolicies() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log('Connected to Postgres.');

  // 1. Check existing policies on public.bookings
  const res = await client.query(`
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'bookings';
  `);
  console.log('Current bookings policies:', res.rows.map(r => `${r.cmd}: ${r.policyname}`));

  // 2. Add INSERT policy for Staff / Admin on bookings if not present
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Staff and Admin can insert bookings'
      ) THEN
        CREATE POLICY "Staff and Admin can insert bookings" ON public.bookings
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff')
          )
        );
      END IF;
    END
    $$;
  `);
  console.log('✓ Ensured Staff and Admin can insert bookings policy.');

  // 3. Add DELETE policy for Staff / Admin on bookings if not present
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Staff and Admin can delete bookings'
      ) THEN
        CREATE POLICY "Staff and Admin can delete bookings" ON public.bookings
        FOR DELETE USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff')
          )
        );
      END IF;
    END
    $$;
  `);
  console.log('✓ Ensured Staff and Admin can delete bookings policy.');

  // 4. Also ensure Staff / Admin have delete permissions on child tables for explicit cleanup if needed
  const childTables = ['booking_status_history', 'booking_deliveries', 'qr_scan_logs', 'payments', 'photo_outputs', 'notifications'];
  for (const table of childTables) {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = 'Staff and Admin can delete ${table}'
        ) THEN
          CREATE POLICY "Staff and Admin can delete ${table}" ON public.${table}
          FOR DELETE USING (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff')
            )
          );
        END IF;
      END
      $$;
    `);
    console.log(`✓ Ensured delete policy on ${table}`);
  }

  // 5. Verify final policies on bookings
  const updatedRes = await client.query(`
    SELECT policyname, cmd 
    FROM pg_policies 
    WHERE tablename = 'bookings';
  `);
  console.log('Updated bookings policies:', updatedRes.rows);

  await client.end();
}

setupPolicies().catch(err => {
  console.error('Policy setup failed:', err);
  process.exit(1);
});
