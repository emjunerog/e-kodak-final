-- Ensure handle_new_user populates profiles.email on signup, and backfill any missing profile emails from auth.users.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role text;
  v_is_active boolean;
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

  insert into public.profiles (id, email, first_name, last_name, role, is_active)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    v_role,
    v_is_active
  )
  on conflict (id) do update
  set email = coalesce(public.profiles.email, excluded.email),
      first_name = coalesce(nullif(public.profiles.first_name, ''), excluded.first_name),
      last_name = coalesce(nullif(public.profiles.last_name, ''), excluded.last_name);

  return new;
end;
$function$;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR btrim(p.email) = '');
