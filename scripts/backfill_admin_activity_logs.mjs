import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}

async function backfillActivityLogs() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log('Connected to PostgreSQL.');

  // 1. Backfill from booking_status_history
  const historyRes = await client.query(`
    SELECT 
      bsh.id,
      bsh.booking_id,
      bsh.status,
      bsh.changed_by,
      bsh.remarks,
      bsh.created_at,
      p.first_name,
      p.last_name,
      p.role,
      b.booking_number
    FROM public.booking_status_history bsh
    LEFT JOIN public.profiles p ON bsh.changed_by = p.id
    LEFT JOIN public.bookings b ON bsh.booking_id = b.id
    ORDER BY bsh.created_at ASC;
  `);

  console.log(`Found ${historyRes.rows.length} booking status history records.`);

  for (const row of historyRes.rows) {
    const adminName = row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : 'Studio Staff';
    const adminRole = row.role || 'staff';
    const bookingNum = row.booking_number || 'Booking';
    const desc = row.remarks 
      ? `Updated status of ${bookingNum} to ${row.status}: "${row.remarks}"`
      : `Updated status of ${bookingNum} to ${row.status}`;

    await client.query(`
      INSERT INTO public.admin_activity_logs (
        admin_id, admin_name, admin_role, action_type, entity_type, entity_id, entity_label, description, details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT DO NOTHING;
    `, [
      row.changed_by,
      adminName,
      adminRole,
      row.status === 'PHOTOGRAPHER_ASSIGNED' ? 'PHOTOGRAPHER_ASSIGNED' : 'STATUS_CHANGE',
      'booking',
      row.booking_id,
      bookingNum,
      desc,
      JSON.stringify({ status: row.status, remarks: row.remarks }),
      row.created_at
    ]);
  }

  // 2. Backfill from workstation_transfers if any
  const transfersRes = await client.query(`
    SELECT 
      wt.id,
      wt.booking_id,
      wt.sender_id,
      wt.sender_role,
      wt.target_role,
      wt.transfer_type,
      wt.priority,
      wt.title,
      wt.message,
      wt.created_at,
      p.first_name,
      p.last_name,
      b.booking_number
    FROM public.workstation_transfers wt
    LEFT JOIN public.profiles p ON wt.sender_id = p.id
    LEFT JOIN public.bookings b ON wt.booking_id = b.id
    ORDER BY wt.created_at ASC;
  `);

  console.log(`Found ${transfersRes.rows.length} workstation transfer records.`);
  for (const row of transfersRes.rows) {
    const adminName = row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : 'Studio Staff';
    const bookingNum = row.booking_number || 'Booking';
    const desc = `Dispatched ${row.transfer_type} handoff (${row.priority}): "${row.title}" for ${bookingNum}`;

    await client.query(`
      INSERT INTO public.admin_activity_logs (
        admin_id, admin_name, admin_role, action_type, entity_type, entity_id, entity_label, description, details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT DO NOTHING;
    `, [
      row.sender_id,
      adminName,
      row.sender_role || 'staff',
      'TRANSFER_DISPATCH',
      'transfer',
      row.id,
      bookingNum,
      desc,
      JSON.stringify({ transfer_type: row.transfer_type, priority: row.priority, target_role: row.target_role }),
      row.created_at
    ]);
  }

  // 3. Backfill any soft-deleted bookings
  const deletedBookings = await client.query(`
    SELECT 
      b.id,
      b.booking_number,
      b.deleted_by,
      b.deleted_at,
      b.deletion_reason,
      p.first_name,
      p.last_name,
      p.role
    FROM public.bookings b
    LEFT JOIN public.profiles p ON b.deleted_by = p.id
    WHERE b.is_deleted = true;
  `);

  console.log(`Found ${deletedBookings.rows.length} soft deleted bookings.`);
  for (const row of deletedBookings.rows) {
    const adminName = row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : 'Studio Director';
    const desc = `Moved ${row.booking_number} to Trash. Reason: "${row.deletion_reason || 'Administrative cleanup'}"`;
    await client.query(`
      INSERT INTO public.admin_activity_logs (
        admin_id, admin_name, admin_role, action_type, entity_type, entity_id, entity_label, description, details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT DO NOTHING;
    `, [
      row.deleted_by,
      adminName,
      row.role || 'admin',
      'BOOKING_SOFT_DELETED',
      'booking',
      row.id,
      row.booking_number,
      desc,
      JSON.stringify({ reason: row.deletion_reason }),
      row.deleted_at || new Date().toISOString()
    ]);
  }

  // 4. Also record system initialization log so there is always clear admin context
  const countRes = await client.query('SELECT count(*) FROM public.admin_activity_logs');
  console.log(`✓ Total admin activity logs now in DB: ${countRes.rows[0].count}`);

  await client.end();
}

backfillActivityLogs().catch(err => {
  console.error('Backfill error:', err);
  process.exit(1);
});
