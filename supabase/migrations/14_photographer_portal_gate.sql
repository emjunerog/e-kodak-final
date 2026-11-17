-- 14_photographer_portal_gate.sql
-- Locks the mobile Photographer & Staff Portal behind:
-- 1. A server-verified Studio Staff Passcode stored only as a bcrypt hash
--    in an RLS-locked table (never readable from client/anon keys).
-- 2. Strict server-side photographer verification (role = 'photographer' AND is_active = true)
--    so web-registered customers or disabled staff accounts cannot access staff screens.

-- 1. Private secrets table (RLS enabled, ZERO public policies)
create table if not exists public.studio_portal_secrets (
  key text primary key,
  secret_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.studio_portal_secrets enable row level security;

revoke all on table public.studio_portal_secrets from anon, authenticated;

-- Seed initial Studio Staff Passcode ('EKODAK2026') if not already set.
-- Studio admins can rotate this anytime via SQL:
--   update public.studio_portal_secrets
--   set secret_hash = extensions.crypt('NEW_CODE', extensions.gen_salt('bf', 10)),
--       updated_at = now()
--   where key = 'staff_portal_passcode';
insert into public.studio_portal_secrets (key, secret_hash)
values (
  'staff_portal_passcode',
  extensions.crypt('EKODAK2026', extensions.gen_salt('bf', 10))
)
on conflict (key) do nothing;

-- 2. Server-side RPC to verify the Studio Staff Passcode without exposing it
create or replace function public.verify_staff_portal_passcode(input_code text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_clean text;
begin
  v_clean := btrim(coalesce(input_code, ''));
  if length(v_clean) = 0 then
    return false;
  end if;

  select secret_hash
    into v_hash
  from public.studio_portal_secrets
  where key = 'staff_portal_passcode';

  if v_hash is null then
    return false;
  end if;

  return (extensions.crypt(v_clean, v_hash) = v_hash);
end;
$$;

revoke all on function public.verify_staff_portal_passcode(text) from public;
grant execute on function public.verify_staff_portal_passcode(text) to anon, authenticated;

-- 3. Strict RPC to verify that the currently signed-in user is an active photographer
create or replace function public.verify_current_photographer_access()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_profile record;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object(
      'authorized', false,
      'reason', 'No active session. Please sign in with your studio photographer account.'
    );
  end if;

  select id, first_name, last_name, email, role, avatar_url, phone, is_active
    into v_profile
  from public.profiles
  where id = v_uid;

  if not found then
    return jsonb_build_object(
      'authorized', false,
      'reason', 'Staff profile was not found. This portal is restricted to verified studio photographers.'
    );
  end if;

  if v_profile.role <> 'photographer' then
    return jsonb_build_object(
      'authorized', false,
      'reason', 'This account is not a studio photographer account. Customers do not need to sign in — use your booking QR pass instead.'
    );
  end if;

  if coalesce(v_profile.is_active, false) is false then
    return jsonb_build_object(
      'authorized', false,
      'reason', 'This photographer account is currently inactive. Contact studio management for access.'
    );
  end if;

  return jsonb_build_object(
    'authorized', true,
    'reason', null,
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'email', v_profile.email,
      'role', v_profile.role,
      'avatar_url', v_profile.avatar_url,
      'phone', v_profile.phone,
      'is_active', v_profile.is_active
    )
  );
end;
$$;

revoke all on function public.verify_current_photographer_access() from public;
grant execute on function public.verify_current_photographer_access() to authenticated;

-- 4. Tighten photographer_availability RLS so customers cannot write availability rows
drop policy if exists "Photographers can manage their own availability" on public.photographer_availability;
create policy "Photographers can manage their own availability"
  on public.photographer_availability
  for all
  to authenticated
  using (
    auth.uid() = photographer_id
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'photographer'
        and p.is_active = true
    )
  )
  with check (
    auth.uid() = photographer_id
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'photographer'
        and p.is_active = true
    )
  );
