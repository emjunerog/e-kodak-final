import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}

async function fix() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  console.log('--- Inspecting triggers on profiles ---');
  const trgs = await client.query(`
    SELECT tgname, pg_get_triggerdef(oid) as def 
    FROM pg_trigger 
    WHERE tgrelid = 'public.profiles'::regclass
  `);
  console.log(JSON.stringify(trgs.rows, null, 2));

  console.log('--- Inspecting trg_enforce_profile_security definition ---');
  const fn = await client.query(`
    SELECT proname, prosrc 
    FROM pg_proc 
    WHERE proname = 'trg_enforce_profile_security'
  `);
  console.log(fn.rows[0]?.prosrc);

  await client.end();
}

fix().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
