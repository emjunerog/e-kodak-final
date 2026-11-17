-- =============================================================================
-- E-KODAK STUDIO — MIGRATION 13: MOBILE PROFILE AVATAR & DELIVERY PROCESSES RPC
-- =============================================================================
-- 1. Updates `get_booking_by_pass_token` so mobile receives customer
--    `studio_specs`, `address`, and full `booking_deliveries` fields.
-- 2. Adds `update_customer_avatar_by_pass_token` (SECURITY DEFINER) so a
--    customer scanning their booking pass on mobile can update their avatar
--    directly in `public.profiles.avatar_url`, syncing straight to Web.
-- =============================================================================

create or replace function public.get_booking_by_pass_token(lookup_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_booking jsonb;
  v_trimmed text;
  v_is_uuid boolean;
begin
  if lookup_token is null or trim(lookup_token) = '' then
    return null;
  end if;

  v_trimmed := trim(lookup_token);
  v_is_uuid := v_trimmed ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  select jsonb_build_object(
    'id', b.id,
    'booking_number', b.booking_number,
    'booking_token', b.booking_token,
    'tier_name', b.tier_name,
    'status', b.status,
    'payment_status', b.payment_status,
    'event_date', b.event_date,
    'preferred_time', b.preferred_time,
    'location', b.location,
    'total_amount', b.total_amount,
    'down_payment_amount', b.down_payment_amount,
    'remaining_balance', b.remaining_balance,
    'photographer_id', b.photographer_id,
    'customer_id', b.customer_id,
    'service_id', b.service_id,
    'qr_code_path', b.qr_code_path,
    'notes', b.notes,
    'is_deleted', b.is_deleted,
    'deleted_at', b.deleted_at,
    'deletion_reason', b.deletion_reason,
    'created_at', b.created_at,
    'confirmed_at', b.confirmed_at,
    'down_payment_confirmed', b.down_payment_confirmed,
    'service', (
      select jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category)
      from services s where s.id = b.service_id
    ),
    'customer', (
      select jsonb_build_object(
        'id', p.id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'email', p.email,
        'phone', p.phone,
        'address', p.address,
        'avatar_url', p.avatar_url,
        'studio_specs', p.studio_specs
      )
      from profiles p where p.id = b.customer_id
    ),
    'booking_deliveries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', bd.id,
        'delivery_type', bd.delivery_type,
        'status', bd.status,
        'tracking_number', bd.tracking_number,
        'carrier', bd.carrier,
        'dispatch_address', bd.dispatch_address,
        'notes', bd.notes,
        'dispatched_at', bd.dispatched_at,
        'delivered_at', bd.delivered_at,
        'confirmed_by_customer_at', bd.confirmed_by_customer_at,
        'digital_access_expires_at', bd.digital_access_expires_at,
        'created_at', bd.created_at,
        'updated_at', bd.updated_at
      ) order by bd.created_at desc)
      from booking_deliveries bd where bd.booking_id = b.id
    ), '[]'::jsonb)
  )
  into v_booking
  from bookings b
  where
    (v_is_uuid and (b.booking_token = v_trimmed::uuid or b.id = v_trimmed::uuid))
    or (not v_is_uuid and (b.booking_token::text = v_trimmed or b.booking_number ilike v_trimmed or b.booking_number ilike '%' || v_trimmed || '%'))
  limit 1;

  return v_booking;
end;
$function$;

create or replace function public.update_customer_avatar_by_pass_token(
  lookup_token text,
  new_avatar_url text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_trimmed text;
  v_is_uuid boolean;
  v_customer_id uuid;
begin
  if lookup_token is null or trim(lookup_token) = '' then
    raise exception 'Missing booking pass token.';
  end if;

  if new_avatar_url is not null and new_avatar_url <> '' then
    if length(new_avatar_url) > 500000 then
      raise exception 'Avatar payload exceeds maximum allowed size.';
    end if;
    if not (
      new_avatar_url ~* '^data:image/(jpeg|jpg|png|webp);base64,'
      or new_avatar_url ~* '^https://'
    ) then
      raise exception 'Invalid avatar format.';
    end if;
  end if;

  v_trimmed := trim(lookup_token);
  v_is_uuid := v_trimmed ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  select b.customer_id
  into v_customer_id
  from bookings b
  where b.is_deleted = false
    and (
      (v_is_uuid and (b.booking_token = v_trimmed::uuid or b.id = v_trimmed::uuid))
      or (not v_is_uuid and (b.booking_token::text = v_trimmed or b.booking_number ilike v_trimmed))
    )
  limit 1;

  if v_customer_id is null then
    raise exception 'No matching active customer profile found for this pass.';
  end if;

  update public.profiles
  set avatar_url = nullif(new_avatar_url, ''),
      updated_at = now()
  where id = v_customer_id;

  return jsonb_build_object(
    'success', true,
    'customer_id', v_customer_id,
    'avatar_url', nullif(new_avatar_url, '')
  );
end;
$function$;

grant execute on function public.get_booking_by_pass_token(text) to anon, authenticated;
grant execute on function public.update_customer_avatar_by_pass_token(text, text) to anon, authenticated;

-- Enable Realtime broadcasts on public.profiles so web dashboard reflects mobile avatar edits live
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
  when others then null;
end $$;
