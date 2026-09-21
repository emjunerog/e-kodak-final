/**
 * storageService.js — Mobile
 * Persists saved bookings to device storage using AsyncStorage.
 * Photographers can also save their auth state across app restarts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SAVED_BOOKINGS: 'ekodak:saved_bookings',
  LAST_SCAN_TOKEN: 'ekodak:last_scan_token',
};

/**
 * Save a booking token to the saved bookings list.
 * De-duplicates automatically.
 */
export async function saveBookingToken(token, bookingData = {}) {
  try {
    const existing = await getSavedBookings();
    const filtered = existing.filter((b) => b.token !== token);
    const updated = [
      {
        token,
        bookingNumber: bookingData.booking_number || '',
        clientName: bookingData.profile?.full_name || '',
        serviceName: bookingData.services?.name || '',
        sessionDate: bookingData.session_date || '',
        status: bookingData.status || 'PENDING',
        savedAt: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 10); // max 10 saved passes

    await AsyncStorage.setItem(KEYS.SAVED_BOOKINGS, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Get all saved booking passes.
 */
export async function getSavedBookings() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SAVED_BOOKINGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Remove a saved booking by token.
 */
export async function removeSavedBooking(token) {
  try {
    const existing = await getSavedBookings();
    const updated = existing.filter((b) => b.token !== token);
    await AsyncStorage.setItem(KEYS.SAVED_BOOKINGS, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Persist the last scanned token for quick re-open.
 */
export async function setLastScanToken(token) {
  try {
    await AsyncStorage.setItem(KEYS.LAST_SCAN_TOKEN, token);
  } catch {}
}

export async function getLastScanToken() {
  try {
    return await AsyncStorage.getItem(KEYS.LAST_SCAN_TOKEN);
  } catch {
    return null;
  }
}
