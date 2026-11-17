-- =============================================================================
-- E-KODAK STUDIO — MIGRATION 15: PHOTOGRAPHER QR CODE LOGIN
-- =============================================================================
-- Replaces password/passkey photographer portal login with a unique scannable
-- QR login token stored per photographer in `public.photographer_profiles`.
--   1. Adds `qr_login_token` (UUID, unique, default gen_random_uuid()).
--   2. Backfills `photographer_profiles` rows & unique QR tokens for every
--      existing photographer in `public.profiles`.
--   3. Adds a trigger so every newly added or promoted photographer receives
--      a `photographer_profiles` row and unique `qr_login_token` automatically.
--   4. Exposes SECURITY DEFINER RPCs so the mobile companion app authenticates
--      via scanned QR token and immediately loads/updates the photographer's
--      credentials, assigned shoots, availability schedules, and profile.
-- =============================================================================

-- 1. Add unique QR login token column
alter table public.photographer_profiles
  add column if not exists qr_login_token uuid;

update public.photographer_profiles
set qr_login_token = gen_random_uuid()
where qr_login_token is null;

alter table public.photographer_profiles
  alter column qr_login_token set default gen_random_uuid();

alter table public.photographer_profiles
  alter column qr_login_token set not null;

create unique index if not exists idx_photographer_profiles_qr_login_token
  on public.photographer_profiles (qr_login_token);

-- 2. Ensure every existing photographer account has a photographer_profiles row + QR token
insert into public.photographer_profiles (id, specialization, bio, is_available, qr_login_token)
select
  p.id,
  'General Photography',
  p.bio,
  true,
  gen_random_uuid()
from public.profiles p
where p.role = 'photographer'
  and not exists (
    select 1 from public.photographer_profiles pp where pp.id = p.id
  )
on conflict (id) do nothing;

-- 3. Auto-provision photographer_profiles + unique qr_login_token when a new photographer is added
create or replace function public.ensure_photographer_profile_qr_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'photographer' then
    insert into public.photographer_profiles (id, specialization, bio, is_available, qr_login_token)
    values (
      new.id,
      'General Photography',
      new.bio,
      true,
      gen_random_uuid()
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ensure_photographer_profile_qr_token on public.profiles;
create trigger trg_ensure_photographer_profile_qr_token
  after insert or update of role on public.profiles
  for each row
  execute function public.ensure_photographer_profile_qr_token();

-- 4. RPC: Authenticate Photographer via Scanned QR Token
create or replace function public.login_photographer_by_qr_token(lookup_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed text;
  v_uuid uuid;
  v_row record;
begin
  v_trimmed := btrim(coalesce(lookup_token, ''));
  if v_trimmed = '' or not (v_trimmed ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    return jsonb_build_object(
      'authorized', false,
      'reason', 'Invalid photographer QR pass format.'
    );
  end if;

  v_uuid := v_trimmed::uuid;

  select
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.address,
    p.avatar_url,
    p.role,
    p.is_active,
    p.created_at,
    p.updated_at,
    coalesce(nullif(btrim(pp.specialization), ''), 'Studio Photographer') as specialization,
    coalesce(pp.bio, p.bio, '') as bio,
    coalesce(pp.is_available, true) as is_available,
    pp.qr_login_token
  into v_row
  from public.photographer_profiles pp
  join public.profiles p on p.id = pp.id
  where pp.qr_login_token = v_uuid
  limit 1;

  if not found then
    return jsonb_build_object(
      'authorized', false,
      'reason', 'Photographer QR pass was not recognized or has been rotated. Ask studio admin for your current QR pass.'
    );
  end if;

  if v_row.role <> 'photographer' then
    return jsonb_build_object(
      'authorized', false,
      'reason', 'This QR pass does not belong to an active studio photographer account.'
    );
  end if;

  if coalesce(v_row.is_active, false) is false then
    return jsonb_build_object(
      'authorized', false,
      'reason', 'This photographer account is currently inactive or awaiting approval.'
    );
  end if;

  return jsonb_build_object(
    'authorized', true,
    'reason', null,
    'qr_login_token', v_row.qr_login_token::text,
    'profile', jsonb_build_object(
      'id', v_row.id,
      'first_name', v_row.first_name,
      'last_name', v_row.last_name,
      'full_name', trim(coalesce(v_row.first_name, '') || ' ' || coalesce(v_row.last_name, '')),
      'email', v_row.email,
      'phone', v_row.phone,
      'address', v_row.address,
      'avatar_url', v_row.avatar_url,
      'role', v_row.role,
      'is_active', v_row.is_active,
      'specialization', v_row.specialization,
      'bio', v_row.bio,
      'is_available', v_row.is_available,
      'qr_login_token', v_row.qr_login_token::text,
      'created_at', v_row.created_at,
      'updated_at', v_row.updated_at
    )
  );
end;
$$;

revoke all on function public.login_photographer_by_qr_token(text) from public;
grant execute on function public.login_photographer_by_qr_token(text) to anon, authenticated;

-- 5. RPC: Regenerate a Photographer's QR Token (Admin Tool)
create or replace function public.regenerate_photographer_qr_token(target_photographer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_new_token uuid;
begin
  v_uid := auth.uid();
  if v_uid is null or (
    v_uid <> target_photographer_id
    and not exists (
      select 1 from public.profiles
      where id = v_uid and role in ('admin', 'staff')
    )
  ) then
    return jsonb_build_object('error', 'Only studio admins or the account owner can rotate photographer QR tokens.');
  end if;

  if not exists (
    select 1 from public.profiles
    where id = target_photographer_id and role = 'photographer'
  ) then
    return jsonb_build_object('error', 'Photographer profile not found.');
  end if;

  insert into public.photographer_profiles (id, specialization, is_available, qr_login_token)
  values (target_photographer_id, 'General Photography', true, gen_random_uuid())
  on conflict (id) do update
    set qr_login_token = gen_random_uuid(),
        updated_at = now()
  returning qr_login_token into v_new_token;

  return jsonb_build_object('qr_login_token', v_new_token::text, 'error', null);
end;
$$;

revoke all on function public.regenerate_photographer_qr_token(uuid) from public;
grant execute on function public.regenerate_photographer_qr_token(uuid) to authenticated;

-- 6. RPC: Fetch Assigned Shoots by QR Token
create or replace function public.get_photographer_assigned_shoots_by_token(lookup_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed text;
  v_ph_id uuid;
  v_shoots jsonb;
begin
  v_trimmed := btrim(coalesce(lookup_token, ''));
  if not (v_trimmed ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    return '[]'::jsonb;
  end if;

  select pp.id
    into v_ph_id
  from public.photographer_profiles pp
  join public.profiles p on p.id = pp.id
  where pp.qr_login_token = v_trimmed::uuid
    and p.role = 'photographer'
    and coalesce(p.is_active, false) = true
  limit 1;

  if v_ph_id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'booking_number', b.booking_number,
      'booking_token', b.booking_token,
      'tier_name', b.tier_name,
      'status', b.status,
      'payment_status', b.payment_status,
      'event_date', b.event_date,
      'preferred_time', b.preferred_time,
      'location', b.location,
      'notes', b.notes,
      'total_amount', b.total_amount,
      'remaining_balance', b.remaining_balance,
      'created_at', b.created_at,
      'updated_at', b.updated_at,
      'is_deleted', b.is_deleted,
      'service', (
        select jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'category', s.category,
          'tagline', s.tagline,
          'inclusions', s.inclusions,
          'tiers', s.tiers
        )
        from public.services s where s.id = b.service_id
      ),
      'customer', (
        select jsonb_build_object(
          'id', c.id,
          'first_name', c.first_name,
          'last_name', c.last_name,
          'email', c.email,
          'phone', c.phone,
          'avatar_url', c.avatar_url
        )
        from public.profiles c where c.id = b.customer_id
      )
    )
    order by b.event_date asc nulls last, b.preferred_time asc nulls last
  ), '[]'::jsonb)
  into v_shoots
  from public.bookings b
  where b.photographer_id = v_ph_id
    and coalesce(b.is_deleted, false) = false;

  return coalesce(v_shoots, '[]'::jsonb);
end;
$$;

revoke all on function public.get_photographer_assigned_shoots_by_token(text) from public;
grant execute on function public.get_photographer_assigned_shoots_by_token(text) to anon, authenticated;

-- 7. RPC: Fetch & Save Photographer Availability Schedule by QR Token
create or replace function public.get_photographer_availability_by_token(lookup_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed text;
  v_ph_id uuid;
  v_rows jsonb;
begin
  v_trimmed := btrim(coalesce(lookup_token, ''));
  if not (v_trimmed ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    return '[]'::jsonb;
  end if;

  select pp.id
    into v_ph_id
  from public.photographer_profiles pp
  join public.profiles p on p.id = pp.id
  where pp.qr_login_token = v_trimmed::uuid
    and p.role = 'photographer'
    and coalesce(p.is_active, false) = true
  limit 1;

  if v_ph_id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(to_jsonb(pa) order by pa.created_at desc), '[]'::jsonb)
    into v_rows
  from public.photographer_availability pa
  where pa.photographer_id = v_ph_id;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

revoke all on function public.get_photographer_availability_by_token(text) from public;
grant execute on function public.get_photographer_availability_by_token(text) to anon, authenticated;

create or replace function public.save_photographer_availability_by_token(
  lookup_token text,
  target_date date,
  new_status text,
  new_start_time time,
  new_end_time time,
  new_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed text;
  v_ph_id uuid;
  v_inserted public.photographer_availability%rowtype;
begin
  v_trimmed := btrim(coalesce(lookup_token, ''));
  if not (v_trimmed ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    return jsonb_build_object('error', 'Invalid photographer QR token.');
  end if;

  select pp.id
    into v_ph_id
  from public.photographer_profiles pp
  join public.profiles p on p.id = pp.id
  where pp.qr_login_token = v_trimmed::uuid
    and p.role = 'photographer'
    and coalesce(p.is_active, false) = true
  limit 1;

  if v_ph_id is null then
    return jsonb_build_object('error', 'Unauthorized photographer QR pass.');
  end if;

  delete from public.photographer_availability
  where photographer_id = v_ph_id
    and availability_date = target_date;

  insert into public.photographer_availability (
    photographer_id,
    availability_date,
    status,
    start_time,
    end_time,
    notes
  )
  values (
    v_ph_id,
    target_date,
    new_status,
    new_start_time,
    new_end_time,
    new_notes
  )
  returning * into v_inserted;

  return jsonb_build_object('data', to_jsonb(v_inserted), 'error', null);
end;
$$;

revoke all on function public.save_photographer_availability_by_token(text, date, text, time, time, text) from public;
grant execute on function public.save_photographer_availability_by_token(text, date, text, time, time, text) to anon, authenticated;

-- 8. RPCs: Duty Toggle, Profile Update & Avatar Update by QR Token
create or replace function public.toggle_photographer_duty_by_token(
  lookup_token text,
  next_available boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed text;
  v_ph_id uuid;
begin
  v_trimmed := btrim(coalesce(lookup_token, ''));
  if not (v_trimmed ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    return jsonb_build_object('error', 'Invalid photographer QR token.');
  end if;

  select pp.id
    into v_ph_id
  from public.photographer_profiles pp
  join public.profiles p on p.id = pp.id
  where pp.qr_login_token = v_trimmed::uuid
    and p.role = 'photographer'
    and coalesce(p.is_active, false) = true
  limit 1;

  if v_ph_id is null then
    return jsonb_build_object('error', 'Unauthorized photographer QR pass.');
  end if;

  update public.photographer_profiles
  set is_available = coalesce(next_available, true),
      updated_at = now()
  where id = v_ph_id;

  return jsonb_build_object('error', null, 'is_available', coalesce(next_available, true));
end;
$$;

revoke all on function public.toggle_photographer_duty_by_token(text, boolean) from public;
grant execute on function public.toggle_photographer_duty_by_token(text, boolean) to anon, authenticated;

create or replace function public.update_photographer_profile_by_token(
  lookup_token text,
  new_first_name text,
  new_last_name text,
  new_phone text,
  new_specialization text,
  new_bio text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed text;
  v_ph_id uuid;
begin
  v_trimmed := btrim(coalesce(lookup_token, ''));
  if not (v_trimmed ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    return jsonb_build_object('error', 'Invalid photographer QR token.');
  end if;

  select pp.id
    into v_ph_id
  from public.photographer_profiles pp
  join public.profiles p on p.id = pp.id
  where pp.qr_login_token = v_trimmed::uuid
    and p.role = 'photographer'
    and coalesce(p.is_active, false) = true
  limit 1;

  if v_ph_id is null then
    return jsonb_build_object('error', 'Unauthorized photographer QR pass.');
  end if;

  update public.profiles
  set first_name = btrim(coalesce(new_first_name, '')),
      last_name = btrim(coalesce(new_last_name, '')),
      phone = nullif(btrim(coalesce(new_phone, '')), ''),
      bio = nullif(btrim(coalesce(new_bio, '')), ''),
      updated_at = now()
  where id = v_ph_id;

  update public.photographer_profiles
  set specialization = coalesce(nullif(btrim(coalesce(new_specialization, '')), ''), 'Studio Photographer'),
      bio = nullif(btrim(coalesce(new_bio, '')), ''),
      updated_at = now()
  where id = v_ph_id;

  return jsonb_build_object('error', null);
end;
$$;

revoke all on function public.update_photographer_profile_by_token(text, text, text, text, text, text) from public;
grant execute on function public.update_photographer_profile_by_token(text, text, text, text, text, text) to anon, authenticated;

create or replace function public.update_photographer_avatar_by_token(
  lookup_token text,
  new_avatar_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed text;
  v_ph_id uuid;
begin
  v_trimmed := btrim(coalesce(lookup_token, ''));
  if not (v_trimmed ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    return jsonb_build_object('error', 'Invalid photographer QR token.');
  end if;

  select pp.id
    into v_ph_id
  from public.photographer_profiles pp
  join public.profiles p on p.id = pp.id
  where pp.qr_login_token = v_trimmed::uuid
    and p.role = 'photographer'
    and coalesce(p.is_active, false) = true
  limit 1;

  if v_ph_id is null then
    return jsonb_build_object('error', 'Unauthorized photographer QR pass.');
  end if;

  update public.profiles
  set avatar_url = nullif(new_avatar_url, ''),
      updated_at = now()
  where id = v_ph_id;

  return jsonb_build_object('error', null);
end;
$$;

revoke all on function public.update_photographer_avatar_by_token(text, text) from public;
grant execute on function public.update_photographer_avatar_by_token(text, text) to anon, authenticated;

-- 9. RPC: Update Shoot Status / Accept / Decline / Reschedule by QR Token
create or replace function public.update_photographer_shoot_by_token(
  lookup_token text,
  target_booking_id uuid,
  action_type text,
  new_status text default null,
  remarks_text text default null,
  proposed_date text default null,
  proposed_time text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed text;
  v_ph_id uuid;
  v_ph_name text;
  v_booking public.bookings%rowtype;
  v_bnum text;
  v_note text;
begin
  v_trimmed := btrim(coalesce(lookup_token, ''));
  if not (v_trimmed ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    return jsonb_build_object('error', 'Invalid photographer QR token.');
  end if;

  select pp.id, coalesce(nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''), 'Studio Photographer')
    into v_ph_id, v_ph_name
  from public.photographer_profiles pp
  join public.profiles p on p.id = pp.id
  where pp.qr_login_token = v_trimmed::uuid
    and p.role = 'photographer'
    and coalesce(p.is_active, false) = true
  limit 1;

  if v_ph_id is null then
    return jsonb_build_object('error', 'Unauthorized photographer QR pass.');
  end if;

  select *
    into v_booking
  from public.bookings
  where id = target_booking_id
    and photographer_id = v_ph_id
  limit 1;

  if not found then
    return jsonb_build_object('error', 'Assigned shoot not found for this photographer.');
  end if;

  v_bnum := coalesce(v_booking.booking_number, '');

  if action_type = 'accept' then
    update public.bookings
    set status = 'PHOTOGRAPHER_ASSIGNED',
        updated_at = now()
    where id = target_booking_id
    returning * into v_booking;

    insert into public.booking_status_history (booking_id, status, remarks, changed_by)
    values (target_booking_id, 'PHOTOGRAPHER_ASSIGNED', format('Assignment accepted and locked in by %s.', v_ph_name), v_ph_id);

    insert into public.workstation_transfers (booking_id, sender_id, sender_role, target_role, transfer_type, priority, title, message, payload, status)
    values (
      target_booking_id,
      v_ph_id,
      'photographer',
      'admin',
      'ORDER_HANDOFF',
      'NORMAL',
      format('Assignment Accepted: #%s', v_bnum),
      format('%s accepted shoot #%s.', v_ph_name, v_bnum),
      jsonb_build_object('booking_number', v_bnum, 'action', 'ASSIGNMENT_ACCEPTED'),
      'PENDING'
    );

  elsif action_type = 'decline' then
    v_note := coalesce(nullif(btrim(coalesce(remarks_text, '')), ''), 'Schedule conflict / Unavailable');

    update public.bookings
    set photographer_id = null,
        status = 'CONFIRMED',
        updated_at = now()
    where id = target_booking_id
    returning * into v_booking;

    insert into public.booking_status_history (booking_id, status, remarks, changed_by)
    values (target_booking_id, 'CONFIRMED', format('Assignment declined by %s. Reason: "%s".', v_ph_name, v_note), v_ph_id);

    insert into public.workstation_transfers (booking_id, sender_id, sender_role, target_role, transfer_type, priority, title, message, payload, status)
    values (
      target_booking_id,
      v_ph_id,
      'photographer',
      'admin',
      'ISSUE_ESCALATION',
      'URGENT',
      format('Assignment Declined: #%s', v_bnum),
      format('%s declined #%s. Reason: "%s".', v_ph_name, v_bnum, v_note),
      jsonb_build_object('booking_number', v_bnum, 'action', 'ASSIGNMENT_DECLINED', 'reason', v_note),
      'PENDING'
    );

  elsif action_type = 'status' then
    if coalesce(new_status, '') = '' then
      return jsonb_build_object('error', 'Missing new status.');
    end if;

    v_note := coalesce(nullif(btrim(coalesce(remarks_text, '')), ''), format('Status updated to %s by %s.', new_status, v_ph_name));

    update public.bookings
    set status = new_status,
        updated_at = now()
    where id = target_booking_id
    returning * into v_booking;

    insert into public.booking_status_history (booking_id, status, remarks, changed_by)
    values (target_booking_id, new_status, v_note, v_ph_id);

    if new_status in ('FINALIZED', 'READY') then
      insert into public.workstation_transfers (booking_id, sender_id, sender_role, target_role, transfer_type, priority, title, message, payload, status)
      values (
        target_booking_id,
        v_ph_id,
        'photographer',
        'admin',
        'OUTPUT_SUBMISSION',
        'NORMAL',
        format('Shoot Finalized: #%s', v_bnum),
        format('%s marked #%s as %s.', v_ph_name, v_bnum, new_status),
        jsonb_build_object('booking_number', v_bnum, 'newStatus', new_status),
        'PENDING'
      );
    end if;

  elsif action_type = 'reschedule' then
    v_note := coalesce(nullif(btrim(coalesce(remarks_text, '')), ''), 'Photographer schedule adjustment');

    insert into public.booking_status_history (booking_id, status, remarks, changed_by)
    values (
      target_booking_id,
      coalesce(v_booking.status, 'PHOTOGRAPHER_ASSIGNED'),
      format('%s requested reschedule for #%s. Proposed: %s %s. Reason: "%s".', v_ph_name, v_bnum, coalesce(nullif(proposed_date, ''), 'TBD'), coalesce(proposed_time, ''), v_note),
      v_ph_id
    );

    insert into public.workstation_transfers (booking_id, sender_id, sender_role, target_role, transfer_type, priority, title, message, payload, status)
    values (
      target_booking_id,
      v_ph_id,
      'photographer',
      'admin',
      'ISSUE_ESCALATION',
      'HIGH',
      format('Reschedule Request: #%s', v_bnum),
      format('%s requested reschedule for #%s. Proposed: %s %s. Reason: "%s".', v_ph_name, v_bnum, coalesce(nullif(proposed_date, ''), 'TBD'), coalesce(proposed_time, ''), v_note),
      jsonb_build_object('booking_number', v_bnum, 'proposed_date', proposed_date, 'proposed_time', proposed_time, 'reason', v_note),
      'PENDING'
    );
  end if;

  return jsonb_build_object('data', to_jsonb(v_booking), 'error', null);
end;
$$;

revoke all on function public.update_photographer_shoot_by_token(text, uuid, text, text, text, text, text) from public;
grant execute on function public.update_photographer_shoot_by_token(text, uuid, text, text, text, text, text) to anon, authenticated;

-- 10. RPC: Fetch Studio Alerts by QR Token
create or replace function public.get_photographer_alerts_by_token(lookup_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed text;
  v_ph_id uuid;
  v_alerts jsonb;
begin
  v_trimmed := btrim(coalesce(lookup_token, ''));
  if not (v_trimmed ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    return '[]'::jsonb;
  end if;

  select pp.id
    into v_ph_id
  from public.photographer_profiles pp
  join public.profiles p on p.id = pp.id
  where pp.qr_login_token = v_trimmed::uuid
    and p.role = 'photographer'
    and coalesce(p.is_active, false) = true
  limit 1;

  if v_ph_id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', wt.id,
    'title', wt.title,
    'message', wt.message,
    'priority', wt.priority,
    'transfer_type', wt.transfer_type,
    'status', wt.status,
    'created_at', wt.created_at
  ) order by wt.created_at desc), '[]'::jsonb)
  into v_alerts
  from (
    select id, title, message, priority, transfer_type, status, created_at
    from public.workstation_transfers
    where target_role in ('photographer', 'all')
    order by created_at desc
    limit 10
  ) wt;

  return coalesce(v_alerts, '[]'::jsonb);
end;
$$;

revoke all on function public.get_photographer_alerts_by_token(text) from public;
grant execute on function public.get_photographer_alerts_by_token(text) to anon, authenticated;
