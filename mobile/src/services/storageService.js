/**
 * storageService.js — Mobile
 * Persists saved bookings, customer profile, and app preferences.
 * Connects to Supabase to fetch live studio showcase gallery items.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const KEYS = {
  SAVED_BOOKINGS:    'ekodak:saved_bookings',
  LAST_SCAN_TOKEN:   'ekodak:last_scan_token',
  CUSTOMER_PROFILE:  'ekodak:customer_profile',
  USER_ROLE:         'ekodak:user_role',
  SETTINGS:          'ekodak:settings',
};

// ── Booking Passes ───────────────────────────────────────────

export async function saveBookingToken(token, bookingData = {}) {
  try {
    const existing = await getSavedBookings();
    const filtered = existing.filter((b) => b.token !== token);
    const updated = [
      {
        token,
        bookingNumber: bookingData.booking_number || '',
        clientName:    bookingData.profile?.full_name || bookingData.client_name || '',
        serviceName:   bookingData.services?.name || '',
        sessionDate:   bookingData.session_date || '',
        status:        bookingData.status || 'PENDING',
        savedAt:       new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 10);

    await AsyncStorage.setItem(KEYS.SAVED_BOOKINGS, JSON.stringify(updated));

    // Also auto-save customer profile from this booking
    await saveCustomerProfileFromBooking(bookingData);

    return updated;
  } catch {
    return [];
  }
}

export async function getSavedBookings() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SAVED_BOOKINGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

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

export async function clearAllSavedBookings() {
  try {
    await AsyncStorage.removeItem(KEYS.SAVED_BOOKINGS);
    await AsyncStorage.removeItem(KEYS.CUSTOMER_PROFILE);
    return true;
  } catch {
    return false;
  }
}

// ── Customer Profile (Auto-loaded from QR) ────────────────────

export async function saveCustomerProfileFromBooking(bookingData) {
  if (!bookingData) return null;
  try {
    const profile = {
      fullName:          bookingData.profile?.full_name || bookingData.client_name || 'Studio Guest',
      email:             bookingData.profile?.email || '',
      phone:             bookingData.profile?.phone || '',
      lastBookingNumber: bookingData.booking_number || '',
      lastServiceName:   bookingData.services?.name || 'Studio Session',
      lastSessionDate:   bookingData.session_date || '',
      lastSessionTime:   bookingData.session_time || '',
      lastStatus:        bookingData.status || 'PENDING',
      location:          bookingData.location_type === 'STUDIO' ? 'E-Kodak Main Studio Bay' : bookingData.location_address || 'Studio Bay',
      updatedAt:         new Date().toISOString(),
    };
    await AsyncStorage.setItem(KEYS.CUSTOMER_PROFILE, JSON.stringify(profile));
    return profile;
  } catch {
    return null;
  }
}

export async function getCustomerProfile() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CUSTOMER_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── User Role (Customer vs Photographer) ─────────────────────

export async function setUserRole(role) {
  try {
    await AsyncStorage.setItem(KEYS.USER_ROLE, role);
  } catch {}
}

export async function getUserRole() {
  try {
    return await AsyncStorage.getItem(KEYS.USER_ROLE);
  } catch {
    return 'customer';
  }
}

// ── Settings Preferences ──────────────────────────────────────

export async function getAppSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : {
      notifications: true,
      haptics: true,
      highContrast: false,
    };
  } catch {
    return { notifications: true, haptics: true, highContrast: false };
  }
}

export async function saveAppSettings(settings) {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch {}
}

// ── Studio Gallery Items (Connected to Supabase) ──────────────

const FALLBACK_GALLERY = [
  {
    id: 'g1',
    title: 'Editorial Natural Light',
    category: 'Portrait',
    image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80&auto=format&fit=crop',
    description: 'Fine art portraiture with soft directional lighting in Studio Bay A.',
  },
  {
    id: 'g2',
    title: 'Graduation Commemorative',
    category: 'Graduation',
    image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80&auto=format&fit=crop',
    description: 'Academic honors and commencement portraits with museum canvas backdrops.',
  },
  {
    id: 'g3',
    title: 'Studio Dramatic Profile',
    category: 'Studio',
    image_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80&auto=format&fit=crop',
    description: 'Sculpted rim lighting, color graded for exhibition prints.',
  },
  {
    id: 'g4',
    title: 'Family Legacy Shoot',
    category: 'Family',
    image_url: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800&q=80&auto=format&fit=crop',
    description: 'Generational family moments captured with warmth and timeless framing.',
  },
];

export async function fetchStudioGallery() {
  try {
    const { data, error } = await supabase
      .from('gallery_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .limit(10);

    if (error || !data || data.length === 0) {
      return FALLBACK_GALLERY;
    }

    return data.map((item) => ({
      id: item.id,
      title: item.title || 'Studio Showcase',
      category: item.category || 'Portfolio',
      image_url: item.image_url || item.image || FALLBACK_GALLERY[0].image_url,
      description: item.description || '',
    }));
  } catch {
    return FALLBACK_GALLERY;
  }
}
