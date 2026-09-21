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
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
    
    -- Backfill emails from auth.users
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

    -- Create or update trigger to automatically sync email on signup
    CREATE OR REPLACE FUNCTION public.handle_user_email_sync()
    RETURNS trigger AS $$
    BEGIN
      UPDATE public.profiles
      SET email = NEW.email
      WHERE id = NEW.id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  await client.query(sql);
  console.log('Added email column and backfilled emails from auth.users successfully!');

  const check = await client.query(`
    SELECT id, first_name, last_name, email, role, phone FROM public.profiles LIMIT 10;
  `);
  console.log('Sample profiles with email:');
  console.table(check.rows);

  await client.end();
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
