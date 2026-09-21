/**
 * bookingService.js — Mobile
 * Fetches booking data and subscribes to real-time updates via Supabase.
 */

import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Parse the QR payload produced by the web app's qr.tsx.
 * Format: {"v":1,"bid":"<booking_token>","typ":"booking","iat":..., "exp":...}
 */
export function parseQRPayload(rawString) {
  try {
    const payload = JSON.parse(rawString);
    if (
      payload?.v === 1 &&
      payload?.typ === 'booking' &&
      typeof payload?.bid === 'string'
    ) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return { valid: false, token: null, error: 'QR code has expired.' };
      }
      return { valid: true, token: payload.bid, error: null };
    }
    return { valid: false, token: null, error: 'Invalid QR code format.' };
  } catch {
    return { valid: false, token: null, error: 'Could not read QR code.' };
  }
}

/**
 * Fetch full booking details by booking_token OR booking id.
 * Mirrors the web's qrService.js lookupBookingByQRPayload.
 */
export async function fetchBookingByToken(lookupToken) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        booking_token,
        status,
        session_date,
        session_time,
        location_type,
        location_address,
        qr_code_path,
        payment_status,
        total_price,
        down_payment_amount,
        down_payment_confirmed,
        photographer_id,
        created_at,
        confirmed_at,
        notes,
        services:service_id (
          id, name, category, tagline
        ),
        profile:customer_id (
          id, full_name, email, phone
        ),
        photographer:photographer_id (
          id, full_name, avatar_url
        ),
        booking_deliveries (
          id, delivery_type, status, tracking_number, carrier,
          dispatched_at, delivered_at, digital_access_expires_at
        )
      `)
      .or(`booking_token.eq.${lookupToken},id.eq.${lookupToken}`)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Log QR scan analytics to qr_scan_logs table.
 */
export async function logQRScan({ bookingId, scanResult = 'SUCCESS' }) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('qr_scan_logs').insert({
      booking_id: bookingId,
      scan_type: 'COMPANION_APP',
      scan_result: scanResult,
      user_agent: 'E-Kodak Companion App / Android',
    });
  } catch {
    // Non-critical — silently fail
  }
}

/**
 * Subscribe to real-time booking status changes.
 * Returns an unsubscribe function.
 */
export function subscribeToBookingUpdates(bookingId, onUpdate) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel(`booking-${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `id=eq.${bookingId}`,
      },
      (payload) => {
        if (payload.new) onUpdate(payload.new);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Fetch photographer's assigned bookings for today and upcoming week.
 */
export async function fetchPhotographerSchedule(photographerId) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, booking_number, status, session_date, session_time,
        location_type, location_address, notes,
        services:service_id (id, name, category),
        profile:customer_id (id, full_name, phone),
        booking_addons (id, add_on_name, quantity)
      `)
      .eq('photographer_id', photographerId)
      .gte('session_date', today)
      .lte('session_date', weekAhead)
      .in('status', ['CONFIRMED', 'PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 'IN_PROGRESS'])
      .order('session_date', { ascending: true })
      .order('session_time', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Sign in a photographer/staff with email & password.
 */
export async function signInWithEmail(email, password) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }
  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  if (!isSupabaseConfigured || !supabase) return;
  return supabase.auth.signOut();
}

/**
 * Get the current authenticated session.
 */
export async function getSession() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

/**
 * Get the current user's profile (role, full_name, avatar_url).
 */
export async function getProfile(userId) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url, phone')
    .eq('id', userId)
    .single();
  return data;
}
