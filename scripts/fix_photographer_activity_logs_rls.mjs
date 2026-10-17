import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

async function fixPolicies() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log('Connected to PostgreSQL database.');

  // Drop existing policies
  await client.query(`
    DROP POLICY IF EXISTS "Staff and admin can view activity logs" ON public.admin_activity_logs;
    DROP POLICY IF EXISTS "Staff and admin can insert activity logs" ON public.admin_activity_logs;
    DROP POLICY IF EXISTS "Photographers and staff can view activity logs" ON public.admin_activity_logs;
    DROP POLICY IF EXISTS "Photographers and staff can insert activity logs" ON public.admin_activity_logs;
    DROP POLICY IF EXISTS "Allow all users to insert activity logs" ON public.admin_activity_logs;
    DROP POLICY IF EXISTS "Allow photographers and staff to view activity logs" ON public.admin_activity_logs;

    -- Allow ANY authenticated user (or service role) to insert activity logs seamlessly without RLS failure
    CREATE POLICY "Allow all users to insert activity logs"
      ON public.admin_activity_logs FOR INSERT
      WITH CHECK (true);

    -- Allow staff/admin/finance to view all logs, and photographers to view logs where they are admin_id, entity_id, or mentioned in details
    CREATE POLICY "Allow photographers and staff to view activity logs"
      ON public.admin_activity_logs FOR SELECT
      USING (
        auth.uid() IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'staff', 'finance')
          )
          OR admin_id = auth.uid()
          OR entity_id = auth.uid()::text
          OR details->>'photographer_id' = auth.uid()::text
        )
      );
  `);
  console.log('✓ Successfully created permissive INSERT policy and targeted SELECT policy on admin_activity_logs');

  await client.end();
}

fixPolicies().catch((err) => {
  console.error('Error fixing policies:', err);
  process.exit(1);
});
