-- =============================================================================
-- E-KODAK STUDIO — MIGRATION 18: UPDATE MOBILE PASS RPC WITH FULL STATUS & DETAILS
-- =============================================================================
-- Updates `public.get_booking_by_pass_token(lookup_token text)` so the mobile app
-- and public QR pass page receive:
--  1. Live status, payment_status, down_payment_confirmed, payment_confirmed_at, updated_at
--  2. Structured academic & participant columns (school, school_address, track, batch,
--     section, student_id, yearbook_motto, student_details, participant_details, etc.)
--  3. Full service details (id, name, category, base_price, tiers, inclusions)
--  4. Assigned photographer details (id, specialization, profile: { first_name, last_name, avatar_url })
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
    'updated_at', b.updated_at,
    'confirmed_at', b.confirmed_at,
    'down_payment_confirmed', b.down_payment_confirmed,
    'payment_confirmed_at', b.payment_confirmed_at,
    'booking_for', b.booking_for,
    'participant_name', b.participant_name,
    'participant_phone', b.participant_phone,
    'participant_email', b.participant_email,
    'participant_relationship', b.participant_relationship,
    'participant_details', b.participant_details,
    'student_details', b.student_details,
    'school', b.school,
    'school_address', b.school_address,
    'track', b.track,
    'batch', b.batch,
    'section', b.section,
    'student_id', b.student_id,
    'yearbook_motto', b.yearbook_motto,
    'service', (
      select jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'category', s.category,
        'base_price', s.base_price,
        'tiers', s.tiers,
        'inclusions', s.inclusions
      )
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
    'photographer', (
      select jsonb_build_object(
        'id', pp.id,
        'specialization', pp.specialization,
        'profile', (
          select jsonb_build_object(
            'first_name', ph_p.first_name,
            'last_name', ph_p.last_name,
            'avatar_url', ph_p.avatar_url
          )
          from profiles ph_p where ph_p.id = pp.id
        )
      )
      from photographer_profiles pp where pp.id = b.photographer_id
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

grant execute on function public.get_booking_by_pass_token(text) to anon, authenticated;
