import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}

async function createAdminActivityLogsTable() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log('Connected to PostgreSQL.');

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      admin_name text,
      admin_role text,
      action_type text NOT NULL,
      entity_type text NOT NULL,
      entity_id text,
      entity_label text,
      description text NOT NULL,
      details jsonb DEFAULT '{}'::jsonb,
      ip_address text,
      created_at timestamptz DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id);
    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action_type ON public.admin_activity_logs(action_type);

    -- Enable RLS
    ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if any
    DROP POLICY IF EXISTS "Staff and admin can view activity logs" ON public.admin_activity_logs;
    DROP POLICY IF EXISTS "Staff and admin can insert activity logs" ON public.admin_activity_logs;

    -- Re-create policies for staff and admin
    CREATE POLICY "Staff and admin can view activity logs"
      ON public.admin_activity_logs FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'staff', 'finance')
        )
      );

    CREATE POLICY "Staff and admin can insert activity logs"
      ON public.admin_activity_logs FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'staff', 'finance')
        )
      );
  `);

  console.log('✓ Created public.admin_activity_logs table and RLS policies.');

  // Check columns
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'admin_activity_logs' 
    ORDER BY ordinal_position;
  `);
  console.table(res.rows);

  await client.end();
}

createAdminActivityLogsTable().catch(err => {
  console.error('Error creating admin_activity_logs:', err);
  process.exit(1);
});
