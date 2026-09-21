import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}

async function syncPrices() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log('Connected to DB.');

  const res = await client.query(`
    SELECT b.id, b.booking_number, b.total_amount, b.remaining_balance, b.down_payment_amount, b.tier_name, s.name, s.base_price, s.tiers
    FROM bookings b
    LEFT JOIN services s ON b.service_id = s.id
    WHERE coalesce(b.total_amount, 0) <= 0
  `);

  console.log(`Found ${res.rows.length} bookings with 0 total_amount.`);

  for (const b of res.rows) {
    let resolvedPrice = 0;
    if (b.tiers && Array.isArray(b.tiers)) {
      const match = b.tiers.find(t => (t.name || '').trim().toLowerCase() === (b.tier_name || '').trim().toLowerCase());
      if (match && match.price) {
        resolvedPrice = parseFloat(String(match.price).replace(/[^0-9.]/g, '')) || 0;
      } else if (b.tiers[0] && b.tiers[0].price) {
        resolvedPrice = parseFloat(String(b.tiers[0].price).replace(/[^0-9.]/g, '')) || 0;
      }
    }
    if (resolvedPrice <= 0 && b.base_price) {
      resolvedPrice = parseFloat(b.base_price) || 0;
    }
    if (resolvedPrice <= 0) {
      resolvedPrice = 1750; // default studio package amount
    }

    const downPaid = parseFloat(b.down_payment_amount) || 0;
    const remaining = Math.max(0, resolvedPrice - downPaid);

    console.log(`Updating ${b.booking_number}: total=${resolvedPrice}, remaining=${remaining}`);
    await client.query(
      `UPDATE bookings SET total_amount = $1, remaining_balance = $2, updated_at = now() WHERE id = $3`,
      [resolvedPrice, remaining, b.id]
    );
  }

  // Also check if any booking has total_amount > 0 but remaining_balance is null or 0 when down_payment_amount is 0 and payment_status != 'PAID'
  await client.query(`
    UPDATE bookings
    SET remaining_balance = total_amount
    WHERE coalesce(remaining_balance, 0) <= 0 
      AND coalesce(total_amount, 0) > 0 
      AND coalesce(down_payment_amount, 0) <= 0 
      AND upper(coalesce(payment_status, 'UNPAID')) != 'PAID'
  `);

  console.log('Successfully synced booking prices.');
  await client.end();
}

syncPrices().catch(err => {
  console.error(err);
  process.exit(1);
});
