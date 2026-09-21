import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}

async function run() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log('Connected to Postgres.');

  // Ensure is_photographer_or_staff is SECURITY DEFINER
  await client.query(`
    CREATE OR REPLACE FUNCTION public.is_photographer_or_staff()
    RETURNS boolean
    LANGUAGE sql
    STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
      SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('photographer', 'admin', 'staff', 'finance')
      );
    $$;
  `);

  // Optimize payments policy
  await client.query(`
    DROP POLICY IF EXISTS "Photographers can view payments" ON public.payments;
    CREATE POLICY "Photographers can view payments" ON public.payments
    FOR SELECT USING (
      is_photographer_or_staff()
    );
  `);
  console.log('✓ Ensured payments policy uses SECURITY DEFINER function');

  await client.end();
}

run().catch(console.error);
