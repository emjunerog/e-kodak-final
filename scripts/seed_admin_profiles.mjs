import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please set it in .env or your environment.');
  process.exit(1);
}

async function seedAdminProfiles() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  await client.query('RESET ROLE;');

  console.log('Connected as postgres on port 5432.');

  // 1. Update trg_enforce_profile_security to allow postgres / superuser / service_role
  console.log('Updating trg_enforce_profile_security...');
  await client.query(`
    CREATE OR REPLACE FUNCTION public.trg_enforce_profile_security()
    RETURNS TRIGGER AS $$
    DECLARE
      v_caller_role text;
    BEGIN
      -- Allow postgres and superuser
      IF (current_user IN ('postgres', 'supabase_admin') OR session_user IN ('postgres', 'supabase_admin')) THEN
        RETURN NEW;
      END IF;

      -- Allow service_role
      IF (coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role') THEN
        RETURN NEW;
      END IF;

      -- Prevent unauthorized role escalation by non-admin authenticated users
      IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
        SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
        IF (v_caller_role != 'admin' AND (OLD.role NOT IN ('admin', 'staff') AND auth.uid() = OLD.id)) THEN
          RAISE EXCEPTION 'SECURITY VIOLATION: Unauthorized attempt to modify protected profile fields (role or is_active).';
        END IF;
      END IF;

      -- Protect the ID
      IF (NEW.id IS DISTINCT FROM OLD.id) THEN
        RAISE EXCEPTION 'SECURITY VIOLATION: Cannot modify profile ID.';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);
  console.log('✓ Trigger function updated successfully.');

  // 2. Insert or update profiles for all admin and staff auth users
  const staffAccounts = [
    {
      id: 'adcc286d-d6bb-4753-8b8b-25dc7b1f441d',
      first_name: 'Studio',
      last_name: 'Admin',
      role: 'admin',
      phone: '09170000001'
    },
    {
      id: 'c0921f2f-9194-4a58-9700-7836ff53ecd5',
      first_name: 'Super',
      last_name: 'Admin',
      role: 'admin',
      phone: '09170000002'
    },
    {
      id: 'cd6ed460-22ee-4abb-93e8-f9bf14088782',
      first_name: 'Studio',
      last_name: 'Staff',
      role: 'staff',
      phone: '09170000003'
    },
    {
      id: '73771082-598a-4965-a200-6bf004382bbf',
      first_name: 'Lead',
      last_name: 'Photographer',
      role: 'photographer',
      phone: '09170000004'
    },
    {
      id: 'e79e026f-e105-4348-99a4-efdfecbaafa9',
      first_name: 'Mark June',
      last_name: 'Repunte',
      role: 'admin',
      phone: '09102949414'
    }
  ];

  console.log('Upserting staff and admin profiles...');
  for (const s of staffAccounts) {
    const res = await client.query(`
      INSERT INTO public.profiles (id, first_name, last_name, role, is_active, phone, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, $5, now(), now())
      ON CONFLICT (id) DO UPDATE 
      SET role = EXCLUDED.role, 
          is_active = true,
          updated_at = now()
      RETURNING id, first_name, last_name, role, is_active;
    `, [s.id, s.first_name, s.last_name, s.role, s.phone]);
    console.log(` - Upserted: ${s.first_name} ${s.last_name} (${s.role}) ->`, res.rows[0]);
  }

  // 3. Verify photographer_profiles has entry for photographer
  console.log('Ensuring photographer_profiles has entry for photographer account...');
  await client.query(`
    INSERT INTO public.photographer_profiles (id, specialization, bio, is_available, created_at)
    VALUES ('73771082-598a-4965-a200-6bf004382bbf', 'Portraiture & Creative Graduation', 'Lead studio photographer specialized in university graduation portraits.', true, now())
    ON CONFLICT (id) DO NOTHING;
  `);

  // 4. Verify all profiles currently in public.profiles
  const all = await client.query(`
    SELECT p.id, p.first_name, p.last_name, p.role, p.is_active, u.email
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.id = u.id
    ORDER BY p.role, p.created_at;
  `);
  console.log('\nAll profiles in database:');
  console.table(all.rows);

  await client.end();
}

seedAdminProfiles().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
