import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';
const { Client } = pg;
const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}
const client = new Client({ connectionString });
await client.connect();

const res = await client.query(`
  SELECT * FROM auth.users WHERE email = 'alimentomakie@gmail.com'
`);
console.log('Sample auth.users row:');
console.log(res.rows[0]);

// Also check auth.identities
const idRes = await client.query(`
  SELECT * FROM auth.identities;
`);
console.log('Sample auth.identities:');
console.table(idRes.rows);

await client.end();
