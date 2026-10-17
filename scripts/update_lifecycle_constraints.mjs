import pg from 'pg';
import { getDatabaseUrl } from './envHelper.mjs';

const { Pool } = pg;
const dbUrl = getDatabaseUrl();

if (!dbUrl) {
  console.error('DATABASE_URL not found in environment.');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function run() {
  const client = await pool.connect();
  try {
    console.log('Updating bookings_status_check constraint...');
    await client.query(`
      ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
      ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (
        status IN (
          'PENDING', 'CONFIRMED', 'PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 'IN_PROGRESS',
          'EDITING', 'RETOUCHING', 'FINALIZED', 'PRINTING', 'READY', 'UNDER_DELIVERY',
          'COMPLETED', 'REJECTED', 'CANCELLED'
        )
      );
    `);
    console.log('✓ bookings_status_check updated successfully.');

    await client.query(`
      ALTER TABLE public.booking_deliveries DROP CONSTRAINT IF EXISTS booking_deliveries_status_check;
      ALTER TABLE public.booking_deliveries ADD CONSTRAINT booking_deliveries_status_check CHECK (
        status IN (
          'PENDING', 'PREPARING', 'DISPATCHED', 'ONGOING', 'NEAR', 'DELIVERED', 'CONFIRMED', 'READY', 'FAILED', 'CANCELLED'
        )
      );
    `);
    console.log('✓ booking_deliveries_status_check updated successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
