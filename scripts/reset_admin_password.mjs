import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

async function resetAdminPassword() {
  const client = new pg.Client({ connectionString: getDatabaseUrl() });
  await client.connect();

  console.log('Ensuring pgcrypto extension is active...');
  await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  console.log('Updating password for admine_kodak@gmail.com to admin123...');
  const res = await client.query(`
    UPDATE auth.users 
    SET encrypted_password = crypt('admin123', gen_salt('bf', 10)),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    WHERE email = 'admine_kodak@gmail.com'
    RETURNING id, email, updated_at;
  `);

  console.log('Updated user:', res.rows[0]);

  // Also ensure profile exists and has role admin and is_active true
  const profRes = await client.query(`
    UPDATE public.profiles
    SET role = 'admin', is_active = true, updated_at = now()
    WHERE id = $1
    RETURNING id, first_name, last_name, role, is_active;
  `, [res.rows[0].id]);

  console.log('Profile verified:', profRes.rows[0]);

  // Test bcrypt validation
  const testRes = await client.query(`
    SELECT crypt('admin123', encrypted_password) = encrypted_password as valid
    FROM auth.users
    WHERE email = 'admine_kodak@gmail.com';
  `);
  console.log('Verification check: is admin123 valid?', testRes.rows[0].valid);

  await client.end();
}

resetAdminPassword().catch(err => {
  console.error('Failed to reset admin password:', err);
  process.exit(1);
});
