/**
 * bookingService.js — Mobile
 * Fetches booking data and subscribes to real-time updates via Supabase.
 *
 * COLUMN MAPPING — actual web DB columns:
 *   event_date       (not session_date)
 *   preferred_time   (not session_time)
 *   location         (not location_type / location_address)
 *   total_amount     (not total_price)
 *   profiles join    uses first_name + last_name (not full_name)
 */

import { supabase, isSupabaseConfigured } from './supabase';

// ── QR Payload Parser ────────────────────────────────────────────────────────

/**
 * Parse the QR payload from a web-generated E-Kodak booking QR code.
 * Supported formats (priority order):
 *  1. URL:  https://e-kodak.com/pass?token=<token>   ← current web format
 *  2. JSON: {"v":1,"bid":"<token>","typ":"booking"…} ← legacy format
 *  3. Raw:  <booking_token>                           ← direct token string
 */
export function parseQRPayload(rawString) {
  if (!rawString || typeof rawString !== 'string') {
    return { valid: false, token: null, error: 'Empty QR code.' };
  }

  const raw = rawString.trim();

  // 1. URL format
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const url = new URL(raw);
      const token =
        url.searchParams.get('token') ||
        url.searchParams.get('id') ||
        url.searchParams.get('bid');
      if (token && token.length >= 4) {
        return { valid: true, token: decodeURIComponent(token), error: null };
      }
    } catch {}
    return {
      valid: false,
      token: null,
      error: 'This QR code link does not contain a valid studio pass token.',
    };
  }

  // 2. Legacy JSON format
  try {
    const payload = JSON.parse(raw);
    if (payload?.v === 1 && payload?.typ === 'booking' && typeof payload?.bid === 'string') {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return { valid: false, token: null, error: 'This studio pass has expired. Please request a new QR code.' };
      }
      return { valid: true, token: payload.bid, error: null };
    }
  } catch {}

  // 3. Raw token fallback
  if (raw.length >= 4 && raw.length <= 200 && !raw.includes('\n')) {
    return { valid: true, token: raw, error: null };
  }

  return { valid: false, token: null, error: 'Invalid QR code. Please scan your E-Kodak studio pass.' };
}

// ── Select Fields ─────────────────────────────────────────────────────────────

/**
 * Actual column names from the web Supabase schema.
 * Joins use the correct FK constraint names.
 */
const BOOKING_SELECT = `
  id,
  booking_number,
  booking_token,
  status,
  payment_status,
  event_date,
  preferred_time,
  location,
  total_amount,
  down_payment_amount,
  remaining_balance,
  photographer_id,
  customer_id,
  service_id,
  qr_code_path,
  notes,
  is_deleted,
  deleted_at,
  deletion_reason,
  created_at,
  confirmed_at,
  down_payment_confirmed,
  service:services (
    id, name, category
  ),
  customer:profiles!bookings_customer_id_fkey (
    id, first_name, last_name, email, phone, avatar_url
  ),
  booking_deliveries (
    id, delivery_type, status, tracking_number, carrier,
    dispatched_at, delivered_at, digital_access_expires_at
  )
`;


// ── Normalizer ────────────────────────────────────────────────────────────────

/**
 * Normalize a raw DB booking row to the shape expected by the mobile UI.
 * Aliases web column names to the old mobile field names so screens don't break.
 */
function normalizeBooking(raw) {
  if (!raw) return null;

  const c = raw.customer;
  const fullName = c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '';
  const loc = (raw.location || '').toLowerCase();
  const isStudio = loc.includes('e-kodak') || loc.includes('studio') || loc.includes('311 rizal');

  return {
    ...raw,
    // Alias actual DB columns to mobile UI field names
    session_date: raw.event_date,
    session_time: raw.preferred_time,
    location_type: isStudio ? 'STUDIO' : 'OUTDOOR',
    location_address: raw.location || '',
    total_price: raw.total_amount,
    // Normalize profile shape
    profile: c
      ? {
          id: c.id,
          full_name: fullName,
          email: c.email || '',
          phone: c.phone || '',
          avatar_url: c.avatar_url || null,
        }
      : null,
    // Normalize service join (aliased as 'service' from Supabase)
    services: raw.service || null,
  };
}

// ── Fetch Booking ─────────────────────────────────────────────────────────────

/**
 * Fetch a booking by token, booking_number, or booking id.
 * Uses 4 fallback strategies to handle:
 *   - New bookings with booking_token set
 *   - Old bookings where booking_token is null (QR was generated from booking.id)
 *   - Manual entry using booking_number (e.g. BK-000042)
 */
export async function fetchBookingByToken(lookupToken) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }

  if (!lookupToken) {
    return { data: null, error: new Error('No token provided.') };
  }

  const token = String(lookupToken).trim();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

  try {
    async function handleMatchedBooking(b) {
      if (!b) return null;
      if (b.is_deleted) {
        await logQRScan({ bookingId: b.id, scanResult: 'DELETED_PASS' });
        return {
          data: null,
          error: new Error(`This booking order (#${b.booking_number || 'N/A'}) has been cancelled and removed from active studio records.${b.deletion_reason ? ` Reason: "${b.deletion_reason}"` : ''}`),
        };
      }
      return { data: normalizeBooking(b), error: null };
    }

    // Strategy 0: Secure Definitive RPC for mobile pass scanning (bypasses RLS safely for exact token/booking_number)
    try {
      const { data: rpcBooking, error: rpcError } = await supabase.rpc('get_booking_by_pass_token', {
        lookup_token: token,
      });
      if (rpcBooking && !rpcError) {
        return await handleMatchedBooking(rpcBooking);
      }
    } catch (rpcErr) {
      console.warn('RPC pass lookup fallback:', rpcErr);
    }

    // Strategy 1: booking_token exact match
    const { data: byToken } = await supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('booking_token', token)
      .maybeSingle();
    if (byToken) return await handleMatchedBooking(byToken);

    // Strategy 2: booking_number exact match (case-insensitive)
    const { data: byNumber } = await supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .ilike('booking_number', token)
      .maybeSingle();
    if (byNumber) return await handleMatchedBooking(byNumber);

    // Strategy 3: booking id (UUID) match — handles old QRs generated from booking.id
    if (isUUID) {
      const { data: byId } = await supabase
        .from('bookings')
        .select(BOOKING_SELECT)
        .eq('id', token)
        .maybeSingle();
      if (byId) return await handleMatchedBooking(byId);
    }

    // Strategy 4: partial booking_number match (for manual entry)
    const { data: byPartial } = await supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .ilike('booking_number', `%${token}%`)
      .limit(1)
      .maybeSingle();
    if (byPartial) return await handleMatchedBooking(byPartial);

    return {
      data: null,
      error: new Error(
        'No booking found for this pass. If this is an older booking, try entering your booking number (e.g. BK-000042) manually.'
      ),
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ── QR Scan Log ───────────────────────────────────────────────────────────────

export async function logQRScan({ bookingId, scanResult = 'SUCCESS' }) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('qr_scan_logs').insert({
      booking_id: bookingId,
      scan_type: 'COMPANION_APP',
      scan_result: scanResult,
      user_agent: 'E-Kodak Companion App',
    });
  } catch {
    // Non-critical
  }
}

// ── Real-time Subscription ────────────────────────────────────────────────────

export function subscribeToBookingUpdates(bookingId, onUpdate) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel(`booking-${bookingId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
      (payload) => {
        if (payload.new) onUpdate(normalizeBooking(payload.new));
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ── Photographer Schedule ─────────────────────────────────────────────────────

export async function fetchPhotographerSchedule(photographerId) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, booking_number, booking_token, status, event_date, preferred_time,
        location, notes,
        service:services (id, name, category),
        customer:profiles!bookings_customer_id_fkey (id, first_name, last_name, phone)
      `)
      .eq('photographer_id', photographerId)
      .gte('event_date', today)
      .lte('event_date', weekAhead)
      .in('status', ['CONFIRMED', 'PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 'IN_PROGRESS'])
      .order('event_date', { ascending: true })
      .order('preferred_time', { ascending: true });

    if (error) throw error;

    const normalized = (data || []).map((b) => ({
      ...b,
      booking_token: b.booking_token || b.booking_number || b.id,
      session_date: b.event_date,
      session_time: b.preferred_time,
      location_address: b.location || '',
      profile: b.customer
        ? {
            id: b.customer.id,
            full_name: `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim(),
            phone: b.customer.phone || '',
          }
        : null,
      services: b.service || null,
    }));

    return { data: normalized, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signInWithEmail(email, password) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!isSupabaseConfigured || !supabase) return;
  return supabase.auth.signOut();
}

export async function getSession() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

export async function getProfile(userId) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, avatar_url, phone')
    .eq('id', userId)
    .single();
  if (!data) return null;
  return {
    ...data,
    full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
  };
}

