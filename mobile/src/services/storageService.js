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

export async function resetOnboarding() {
  try {
    await AsyncStorage.removeItem(KEYS.USER_ROLE);
    await AsyncStorage.removeItem('ekodak:tutorial_done');
    return true;
  } catch {
    return false;
  }
}

// ── Studio Gallery Items (Connected to Supabase) ──────────────

const FALLBACK_GALLERY = [
  {
    id: 'g1',
    title: 'Editorial Natural Light',
    category: 'Portrait',
    image_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80&auto=format&fit=crop',
    before_image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80&auto=format&fit=crop&sepia=1',
    description: 'Fine art portraiture with soft directional lighting in Studio Bay A.',
    likes: 142,
    badges: ['Featured', 'Client Favorite'],
    is_featured: true,
  },
  {
    id: 'g2',
    title: 'Graduation Commemorative',
    category: 'Graduation',
    image_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80&auto=format&fit=crop',
    before_image: null,
    description: 'Academic honors and commencement portraits with museum canvas backdrops.',
    likes: 98,
    badges: ['Top Pick'],
    is_featured: false,
  },
  {
    id: 'g3',
    title: 'Wedding & Bridal Radiance',
    category: 'Event',
    image_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80&auto=format&fit=crop',
    before_image: null,
    description: 'Sculpted romantic backlight, color graded for archival gallery prints.',
    likes: 215,
    badges: ['Editorial'],
    is_featured: true,
  },
  {
    id: 'g4',
    title: 'Family Legacy Shoot',
    category: 'Family',
    image_url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&q=80&auto=format&fit=crop',
    before_image: null,
    description: 'Generational family moments captured with warmth and timeless framing.',
    likes: 87,
    badges: ['Studio Bay B'],
    is_featured: false,
  },
  {
    id: 'g5',
    title: 'Couple Intimate Portrait',
    category: 'Couple',
    image_url: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=800&q=80&auto=format&fit=crop',
    before_image: null,
    description: 'Cinematic romance with textured shadow gradients.',
    likes: 110,
    badges: [],
    is_featured: false,
  },
];

export async function fetchStudioGallery() {
  try {
    if (!supabase) return FALLBACK_GALLERY;

    const { data, error } = await supabase
      .from('gallery_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .limit(16);

    if (error || !data || data.length === 0) {
      return FALLBACK_GALLERY;
    }

    return data.map((item) => ({
      id:           item.id,
      title:        item.title || 'Studio Showcase',
      category:     item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Portfolio',
      image_url:    item.image_url || item.image || FALLBACK_GALLERY[0].image_url,
      before_image: item.before_image || null,
      description:  item.description || 'Mastercrafted in E-Kodak Studio Bay.',
      likes:        typeof item.likes === 'number' ? item.likes : 0,
      badges:       Array.isArray(item.badges) ? item.badges : [],
      is_featured:  Boolean(item.is_featured),
    }));
  } catch {
    return FALLBACK_GALLERY;
  }
}

/**
 * Subscribes to live database changes on gallery_items in Supabase.
 * Whenever an admin adds, edits, or removes photos via the web system,
 * the callback is invoked immediately with refreshed items.
 */
export function subscribeToGalleryChanges(onUpdate) {
  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel('mobile_gallery_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gallery_items' },
        async (payload) => {
          console.log('[E-Kodak Realtime] Gallery changed on web:', payload.eventType);
          const refreshed = await fetchStudioGallery();
          onUpdate(refreshed);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch {
    return () => {};
  }
}

/**
 * Increments like count on a photo item in Supabase gallery_items.
 */
export async function likeGalleryPhoto(photoId, currentLikes = 0) {
  const nextLikes = currentLikes + 1;
  if (!supabase) return nextLikes;
  try {
    await supabase
      .from('gallery_items')
      .update({ likes: nextLikes })
      .eq('id', photoId);
    return nextLikes;
  } catch {
    return nextLikes;
  }
}

// ── Studio Services & Sets (Live from Database) ───────────────

const FALLBACK_SERVICES = [
  {
    id: 's1',
    name: 'College Packages and sets',
    tagline: 'Celebrate your collegiate milestone in style.',
    category: 'college',
    cover_image: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=900&q=80&auto=format&fit=crop',
    inclusions: [
      'Free make-up and hair style',
      'Professionally edited digital files',
      'Crystal wood framed display portraits',
      'Mode of Payment: 50% Down payment upon booking. Full payment on event day.',
    ],
    tiers: [
      {
        name: 'Set A',
        price: '₱4,875.00',
        edited: 'All prints included',
        popular: true,
        duration: 'Studio Session',
        highlights: [
          '1-12x18 with crystal wood frame',
          '1-8x10 Filipiniana or barong (crystal frame)',
          '1-8x10 Family picture (crystal frame)',
          '6pcs. Wallet size colored (2r)',
          '6pcs. Wallet size colored with cap (2r)',
          '6pcs. Wallet size colored barong (2r)',
          '12pcs. 2x2 colored',
          '6pcs. Passport size',
          'Free make-up and hair style',
        ],
      },
      {
        name: 'Set B',
        price: '₱3,575.00',
        edited: 'All prints included',
        duration: 'Studio Session',
        highlights: [
          '1-12x16 with crystal wood frame',
          '1-8x10 Filipiniana or barong',
          '1-8x10 Family picture',
          '6pcs. Wallet size colored (2r)',
          '4pcs. Wallet size colored with cap (2r)',
          '12pcs. 2x2 ID colored',
          '6pcs. Passport size',
        ],
      },
    ],
  },
  {
    id: 's2',
    name: 'Senior High Packages and sets',
    tagline: 'Essential graduation & toga portraits for Senior High School.',
    category: 'senior-high',
    cover_image: 'https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=900&q=80&auto=format&fit=crop',
    inclusions: [
      'Free use of Toga',
      'Professionally edited digital files',
      'TESDA-compliant passport photos',
    ],
    tiers: [
      {
        name: 'Set A',
        price: '₱1,750.00',
        edited: 'Prints included',
        popular: true,
        duration: 'Studio Session',
        highlights: [
          '10x12 colored with crystal wood frame',
          '1-8x10 Filipiniana attire without frame',
          '4pcs. Wallet size colored with cap (2r)',
          '4pcs. Wallet size Filipiniana',
          '6pcs. Passport size (TESDA)',
          '6pcs. 2x2 formal attire',
          'Free make up during studio pictorial',
        ],
      },
      {
        name: 'Set B',
        price: '₱1,425.00',
        edited: 'Prints included',
        duration: 'Studio Session',
        highlights: [
          '8x10 colored with crystal wood',
          '4pcs. Wallet size colored with cap (2r)',
          '6pcs. 2x2 formal attire',
          '6pcs. Passport size (TESDA)',
          'Free make up during studio pictorial',
        ],
      },
      {
        name: 'Set C',
        price: '₱1,100.00',
        edited: 'Prints included',
        duration: 'Studio Session',
        highlights: [
          '8x10 colored without frame',
          '6pcs. Wallet size colored (2r)',
          '6pcs. 2x2 formal attire',
          '6pcs. Passport size (TESDA)',
          'Free make up during studio pictorial',
        ],
      },
      {
        name: 'Set D',
        price: '₱795.00',
        edited: 'Prints included',
        duration: 'Studio Session',
        highlights: [
          '8x10 colored without frame',
          '4pcs. Wallet size colored (2r)',
        ],
      },
    ],
  },
  {
    id: 's3',
    name: 'Photo / Wedding Services',
    tagline: 'Complete professional wedding photography.',
    category: 'wedding-photo',
    cover_image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=80&auto=format&fit=crop',
    inclusions: [
      'The Coverage, Preparation, Church and Reception',
      'Unlimited Shots with USB drive',
      'Framed Portraits & Photo Books',
      'Professional Lead & Assistant Photographers',
    ],
    tiers: [
      {
        name: 'Set A',
        price: '₱18,500.00',
        edited: 'Unlimited Shots with USB',
        duration: 'Full Wedding Day',
        highlights: [
          'Preparation, Church, Reception coverage',
          'Unlimited Shots with USB',
          '11x14 with frame',
          '150 prints 4x6 (4r)',
          '2 Photographers',
        ],
      },
      {
        name: 'Set C',
        price: '₱31,000.00',
        edited: 'Same Day Edit (SDE)',
        popular: true,
        duration: 'Prenup + Full Wedding Day',
        highlights: [
          'Full Day Coverage + Prenup Shoot with Teaser',
          'Unlimited Shots with USB',
          '30 pages Photo Book 10x10 collage',
          '1-16x20 with frame',
          'Same Day Edit (SDE)',
          '3 Photographers',
        ],
      },
      {
        name: 'Set D',
        price: '₱53,500.00',
        edited: 'Full Hardbound Album + Canvas + SDE + AVP',
        duration: 'Grand Wedding Master Suite',
        highlights: [
          'Full Coverage + Prenup with Teaser',
          '40 pages hard bound album 11x14 collage',
          '30 pages Photo Book 10x10 collage',
          '24x30 canvas with frame',
          '3 DSLR full HDMI 1080p Video Cameras',
          'Audio Video Presentation (AVP)',
          '4 Photographers',
        ],
      },
    ],
  },
  {
    id: 's4',
    name: 'Video / Wedding Packages',
    tagline: 'HD Cinematic Video coverage with drone and SDE.',
    category: 'wedding-video',
    cover_image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80&auto=format&fit=crop',
    inclusions: [
      'HD Video coverage',
      'Preparation, Church and Reception',
      'USB and Google Drive delivery',
      'PLAY MOVIE and MTV highlights',
    ],
    tiers: [
      {
        name: 'Set B',
        price: '₱18,500.00',
        edited: 'Play Movie & MTV',
        duration: 'Full Wedding Day',
        highlights: [
          '2 mirrorless camera videographers',
          'Preparation, Church and Reception',
          '1 USB and Google Drive delivery',
          'PLAY MOVIE and MTV highlights',
        ],
      },
      {
        name: 'Set C',
        price: '₱28,000.00',
        edited: 'Same Day Edit (SDE)',
        popular: true,
        duration: 'Full Wedding Day + Drone',
        highlights: [
          '2 mirrorless camera videographers with Drone',
          'Same Day Edit (SDE)',
          'Preparation, Church and Reception',
          '1 USB and Google Drive delivery',
          'PLAY MOVIE and MTV',
        ],
      },
      {
        name: 'Set D',
        price: '₱39,000.00',
        edited: 'Same Day Edit (SDE) & AVP',
        duration: 'Full Day + Drone + SDE + AVP',
        highlights: [
          '3 mirrorless camera videographers with Drone',
          'Teaser outdoor video shot',
          'Same Day Edit (SDE) + Audio Video Presentation (AVP)',
          'Full Coverage with USB and Google Drive',
          'PLAY MOVIE and MTV',
        ],
      },
    ],
  },
];

export async function fetchStudioServices() {
  try {
    if (!supabase) return FALLBACK_SERVICES;
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return FALLBACK_SERVICES;
    }

    return data.map((item) => ({
      id:          item.id,
      name:        item.name || 'Studio Package',
      tagline:     item.tagline || '',
      description: item.description || '',
      category:    item.category || 'studio',
      cover_image: item.cover_image || FALLBACK_SERVICES[0].cover_image,
      inclusions:  Array.isArray(item.inclusions) ? item.inclusions : [],
      tiers:       Array.isArray(item.tiers) ? item.tiers : [],
    }));
  } catch {
    return FALLBACK_SERVICES;
  }
}

// ── Studio Settings & Location (Live from Database) ───────────

const FALLBACK_SETTINGS = {
  address:        '311 Rizal Street, City of Naga, Cebu',
  contact_phone:  '+63 917 123 4567',
  contact_email:  'contact@e-kodak.com',
  business_hours: 'Mon – Sat: 8:00 AM – 6:00 PM | Sun: By Appointment',
  social_links: {
    facebook:  'https://facebook.com/ekodakcebu',
    instagram: 'https://instagram.com/ekodakcebu',
    tiktok:    'https://tiktok.com/@ekodakcebu',
  },
};

export async function fetchStudioSettings() {
  try {
    if (!supabase) return FALLBACK_SETTINGS;
    const { data, error } = await supabase
      .from('studio_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return FALLBACK_SETTINGS;
    }

    return {
      address:        data.address || FALLBACK_SETTINGS.address,
      contact_phone:  data.contact_phone || FALLBACK_SETTINGS.contact_phone,
      contact_email:  data.contact_email || FALLBACK_SETTINGS.contact_email,
      business_hours: data.business_hours || FALLBACK_SETTINGS.business_hours,
      social_links:   data.social_links || FALLBACK_SETTINGS.social_links,
    };
  } catch {
    return FALLBACK_SETTINGS;
  }
}

