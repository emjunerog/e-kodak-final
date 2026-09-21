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

  try {
    const res = await client.query(`
      INSERT INTO photographer_availability (photographer_id, availability_date, status, start_time, end_time, notes)
      VALUES ('54503fc6-3a4c-45f4-a415-1089ddf79968', '2026-09-15', 'UNAVAILABLE', '09:00:00', '18:00:00', 'Test block')
      RETURNING *;
    `);
    console.log('Successfully inserted row:', res.rows[0]);
    await client.query(`DELETE FROM photographer_availability WHERE id = '${res.rows[0].id}';`);
    console.log('Successfully deleted test row.');
  } catch (err) {
    console.error('Insert error:', err);
  }

  // Also test what happens if status is lowercase 'unavailable'
  try {
    await client.query(`
      INSERT INTO photographer_availability (photographer_id, availability_date, status, start_time, end_time, notes)
      VALUES ('54503fc6-3a4c-45f4-a415-1089ddf79968', '2026-09-15', 'unavailable', '09:00:00', '18:00:00', 'Test block')
      RETURNING *;
    `);
  } catch (err) {
    console.log('Lowercase insert failed as expected with:', err.message);
  }

  await client.end();
}

run();
