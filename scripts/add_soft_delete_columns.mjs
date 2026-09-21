import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}

async function addSoftDeleteColumns() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log('Connected to Postgres.');

  await client.query(`
    ALTER TABLE public.bookings 
      ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
      ADD COLUMN IF NOT EXISTS deleted_by uuid,
      ADD COLUMN IF NOT EXISTS deletion_reason text;
  `);
  console.log('✓ Added soft delete columns to bookings.');

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_bookings_is_deleted ON public.bookings(is_deleted);
  `);
  console.log('✓ Created index on is_deleted.');

  // Verify columns
  const res = await client.query(`
    SELECT column_name, data_type, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name IN ('is_deleted', 'deleted_at', 'deleted_by', 'deletion_reason');
  `);
  console.table(res.rows);

  await client.end();
}

addSoftDeleteColumns().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
