import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}

async function test() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const res = await client.query(`
      SELECT 
        auth.uid() as uid, 
        current_user as cur_user, 
        session_user as sess_user,
        current_setting('request.jwt.claim.sub', true) as jwt_sub;
    `);
    console.log(res.rows[0]);
  } catch (e) {
    console.error('Error:', e.message);
  }

  await client.end();
}

test();
