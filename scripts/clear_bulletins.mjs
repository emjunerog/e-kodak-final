import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}

async function clearBulletins() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log('Connected to Postgres.');

  // 1. Delete all notifications (bulletins shown in activity trail & customer dashboard)
  const notifResult = await client.query('DELETE FROM public.notifications RETURNING id, title;');
  console.log(`✓ Deleted ${notifResult.rowCount} rows from notifications table:`);
  notifResult.rows.forEach(r => console.log(`  - [${r.id}] ${r.title}`));

  // 2. Also clear pictorial bulletin announcement from announcements table if present
  const annResult = await client.query("DELETE FROM public.announcements WHERE text ILIKE '%Alpaco%' OR text ILIKE '%Pictorial%' RETURNING id, text;");
  console.log(`✓ Deleted ${annResult.rowCount} rows from announcements table:`);
  annResult.rows.forEach(r => console.log(`  - [${r.id}] ${r.text}`));

  // 3. Verify counts
  const countNotifs = await client.query('SELECT count(*) FROM public.notifications;');
  console.log(`Remaining notifications count: ${countNotifs.rows[0].count}`);

  const countAnn = await client.query('SELECT count(*) FROM public.announcements;');
  console.log(`Remaining announcements count: ${countAnn.rows[0].count}`);

  await client.end();
}

clearBulletins().catch(err => {
  console.error('Failed to clear bulletins:', err);
  process.exit(1);
});
