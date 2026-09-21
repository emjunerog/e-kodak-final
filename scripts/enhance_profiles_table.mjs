import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}

async function main() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log('Connected to Supabase Postgres.');

  const sql = `
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS studio_specs jsonb DEFAULT '{}'::jsonb;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges jsonb DEFAULT '[]'::jsonb;
    
    -- Ensure user can insert and update their profile
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    CREATE POLICY "Users can insert their own profile" ON public.profiles 
      FOR INSERT WITH CHECK (auth.uid() = id);

    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    CREATE POLICY "Users can update their own profile" ON public.profiles 
      FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

    -- Ensure staff/admin can manage all profiles
    DROP POLICY IF EXISTS "Staff can manage all profiles" ON public.profiles;
    CREATE POLICY "Staff can manage all profiles" ON public.profiles
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff', 'admin')
        )
      );
  `;

  await client.query(sql);
  console.log('ALTER TABLE public.profiles completed successfully!');

  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND table_schema = 'public' 
    ORDER BY ordinal_position;
  `);

  console.log('Current columns in public.profiles:');
  for (const row of res.rows) {
    console.log(` - ${row.column_name} (${row.data_type})`);
  }

  await client.end();
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
