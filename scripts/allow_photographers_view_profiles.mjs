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

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Photographers can view payments'
      ) THEN
        CREATE POLICY "Photographers can view payments" ON public.payments
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('photographer', 'admin', 'staff', 'finance')
          )
        );
      END IF;
    END
    $$;
  `);

  console.log('✓ Successfully created policy: Photographers can view payments');
  await client.end();
}

run().catch(console.error);
