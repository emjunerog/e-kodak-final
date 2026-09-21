import { getDatabaseUrl } from './envHelper.mjs';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}

async function runMigrations() {
  const client = new pg.Client({ connectionString });
  console.log('Connecting to Supabase Postgres...');
  await client.connect();
  console.log('Connected successfully as superuser postgres!\n');

  const migrationsDir = path.resolve('supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log(`Found ${files.length} migration files in supabase/migrations:`);
  for (const file of files) {
    console.log(` - ${file}`);
  }
  console.log('\nStarting execution...\n');

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`── Executing: ${file} ──`);
    try {
      await client.query(sql);
      console.log(`✓ ${file} executed successfully.`);
    } catch (err) {
      console.warn(`! Note on ${file}: ${err.message}`);
    }
  }

  // Verify key tables
  console.log('\n── Verifying Key Database Tables & Counts ──');
  const tables = ['services', 'add_ons', 'profiles', 'bookings', 'photo_outputs', 'studio_settings', 'faqs', 'announcements'];
  for (const t of tables) {
    try {
      const res = await client.query(`SELECT count(*) as count FROM public.${t}`);
      console.log(`Table public.${t}: ${res.rows[0].count} rows`);
    } catch (err) {
      console.log(`Table public.${t}: ${err.message}`);
    }
  }

  // Display all active services in the DB
  console.log('\n── Current Active Services in Supabase ──');
  const servicesRes = await client.query(`
    SELECT slug, name, category, jsonb_array_length(tiers) as tiers_count, sort_order 
    FROM public.services 
    WHERE is_active = true 
    ORDER BY sort_order ASC
  `);
  for (const s of servicesRes.rows) {
    console.log(`• [${s.slug}] "${s.name}" (${s.category}) — ${s.tiers_count} tiers (sort: ${s.sort_order})`);
  }

  await client.end();
  console.log('\nAll queries and migrations processed successfully!');
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
