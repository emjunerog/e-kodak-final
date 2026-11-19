-- Populate first_name, last_name, and avatar_url from Google OAuth metadata
-- (`given_name`, `family_name`, `full_name`, `name`, `avatar_url`, `picture`)
-- on new signups and backfill any existing Google OAuth profiles missing names.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_role text;
  v_is_active boolean;
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_avatar_url text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'customer');

  if v_role in ('admin', 'staff', 'finance') then
    v_role := 'customer';
  end if;

  if v_role = 'photographer' then
    v_is_active := false;
  else
    v_is_active := true;
  end if;

  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), '')
  );

  v_first_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'given_name'), ''),
    case
      when v_full_name is not null then nullif(split_part(v_full_name, ' ', 1), '')
      else null
    end
  );

  v_last_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'last_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'family_name'), ''),
    case
      when v_full_name is not null and position(' ' in v_full_name) > 0
      then nullif(trim(substring(v_full_name from position(' ' in v_full_name) + 1)), '')
      else null
    end
  );

  v_avatar_url := coalesce(
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data->>'picture'), '')
  );

  insert into public.profiles (id, email, first_name, last_name, avatar_url, role, is_active)
  values (
    new.id,
    new.email,
    v_first_name,
    v_last_name,
    v_avatar_url,
    v_role,
    v_is_active
  )
  on conflict (id) do update
  set email = coalesce(public.profiles.email, excluded.email),
      first_name = coalesce(nullif(public.profiles.first_name, ''), excluded.first_name),
      last_name = coalesce(nullif(public.profiles.last_name, ''), excluded.last_name),
      avatar_url = coalesce(nullif(public.profiles.avatar_url, ''), excluded.avatar_url);

  return new;
end;
$function$;

-- Backfill existing profiles that lack first_name / last_name / avatar_url (e.g. Google OAuth logins)
UPDATE public.profiles p
SET
  first_name = coalesce(
    nullif(trim(p.first_name), ''),
    nullif(trim(u.raw_user_meta_data->>'first_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'given_name'), ''),
    nullif(split_part(coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), nullif(trim(u.raw_user_meta_data->>'name'), '')), ' ', 1), '')
  ),
  last_name = coalesce(
    nullif(trim(p.last_name), ''),
    nullif(trim(u.raw_user_meta_data->>'last_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'family_name'), ''),
    CASE
      WHEN coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), nullif(trim(u.raw_user_meta_data->>'name'), '')) IS NOT NULL
        AND position(' ' in coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), nullif(trim(u.raw_user_meta_data->>'name'), ''))) > 0
      THEN nullif(trim(substring(coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), nullif(trim(u.raw_user_meta_data->>'name'), '')) from position(' ' in coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), nullif(trim(u.raw_user_meta_data->>'name'), ''))) + 1)), '')
      ELSE null
    END
  ),
  avatar_url = coalesce(
    nullif(trim(p.avatar_url), ''),
    nullif(trim(u.raw_user_meta_data->>'avatar_url'), ''),
    nullif(trim(u.raw_user_meta_data->>'picture'), '')
  )
FROM auth.users u
WHERE p.id = u.id
  AND (
    p.first_name IS NULL OR btrim(p.first_name) = '' OR
    p.avatar_url IS NULL OR btrim(p.avatar_url) = ''
  );

-- Permanently delete a customer account, all associated booking orders, profile,
-- active auth sessions, and auth.users credentials in one atomic transaction.
CREATE OR REPLACE FUNCTION public.admin_delete_customer_account(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_target_role text;
  v_deleted_orders integer := 0;
begin
  if v_caller_id is null then
    raise exception 'Authentication required';
  end if;

  select lower(coalesce(role, '')) into v_caller_role
  from public.profiles
  where id = v_caller_id;

  if v_caller_role <> 'admin' then
    raise exception 'Forbidden: Admin privileges required';
  end if;

  if p_customer_id is null then
    raise exception 'Customer ID is required';
  end if;

  if p_customer_id = v_caller_id then
    raise exception 'Administrators cannot delete their own account';
  end if;

  select lower(coalesce(role, '')) into v_target_role
  from public.profiles
  where id = p_customer_id;

  if v_target_role = 'admin' then
    raise exception 'Administrator accounts cannot be deleted from customer management';
  end if;

  select count(*)::integer into v_deleted_orders
  from public.bookings
  where customer_id = p_customer_id;

  -- Delete all bookings belonging to the customer (cascades payments, deliverables, scan logs, etc.)
  delete from public.bookings
  where customer_id = p_customer_id;

  -- Clear non-cascading foreign key references pointing to profiles(id)
  update public.booking_status_history set changed_by = null where changed_by = p_customer_id;
  update public.payments set recorded_by = null where recorded_by = p_customer_id;
  update public.photo_outputs set uploaded_by = null where uploaded_by = p_customer_id;
  update public.workstation_transfers set sender_id = null where sender_id = p_customer_id;
  update public.workstation_transfers set resolved_by = null where resolved_by = p_customer_id;

  delete from public.notifications where user_id = p_customer_id;
  delete from public.profiles where id = p_customer_id;

  -- Revoke sessions and delete auth.users login so customer dashboard is permanently inaccessible
  delete from auth.sessions where user_id = p_customer_id;
  delete from auth.users where id = p_customer_id;

  return jsonb_build_object(
    'success', true,
    'deleted_orders', v_deleted_orders
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_customer_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_customer_account(uuid) TO authenticated;

