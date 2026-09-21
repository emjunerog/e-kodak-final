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

  console.log('--- Updating trg_enforce_profile_security ---');
  await client.query(`
    create or replace function public.trg_enforce_profile_security()
    returns trigger as $$
    declare
      v_caller_role text;
    begin
      -- If running as postgres / superuser / session_user postgres, allow all
      if (current_user IN ('postgres', 'supabase_admin') OR session_user IN ('postgres', 'supabase_admin')) then
        return NEW;
      end if;

      -- If calling via service_role, allow all
      if (coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role') then
        return NEW;
      end if;

      -- Prevent self-escalation if client is not an admin
      if (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) then
        select role into v_caller_role from public.profiles where id = auth.uid();
        if (v_caller_role != 'admin' AND (OLD.role NOT IN ('admin', 'staff') AND auth.uid() = OLD.id)) then
          raise exception 'SECURITY VIOLATION: Unauthorized attempt to modify protected profile fields (role or is_active).';
        end if;
      end if;

      -- Protect the ID
      if (NEW.id IS DISTINCT FROM OLD.id) then
        raise exception 'SECURITY VIOLATION: Cannot modify profile ID.';
      end if;

      return NEW;
    end;
    $$ language plpgsql security definer;
  `);
  console.log('✓ Trigger function updated successfully.');

  console.log('--- Elevating Mark June to Admin ---');
  const res = await client.query(`
    UPDATE public.profiles 
    SET role = 'admin', is_active = true 
    WHERE id = 'e79e026f-e105-4348-99a4-efdfecbaafa9'
    RETURNING id, first_name, last_name, role, is_active;
  `);
  console.log('Updated profile:', res.rows[0]);

  await client.end();
}

run().catch(err => {
  console.error('Run failed:', err);
  process.exit(1);
});
