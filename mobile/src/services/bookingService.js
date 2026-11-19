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
import {
  getPhotographerQRToken,
  savePhotographerSessionData,
  clearPhotographerSessionData,
  getCachedPhotographerProfile,
  setUserRole,
} from './storageService';

// ── QR Payload Parser ────────────────────────────────────────────────────────

/**
 * Parse the QR payload from either an E-Kodak booking QR pass or a
 * Photographer Login QR pass.
 *
 * Supported formats:
 *  Photographer Login QR:
 *   1. URL with ?ph_token=<uuid> / ?photographer_token=<uuid> / ?ptoken=<uuid>
 *   2. URL path /photographer-pass?token=<uuid>
 *   3. JSON {"typ":"photographer_login","token":"<uuid>"}
 *  Booking Pass QR:
 *   1. URL:  https://e-kodak.com/pass?token=<token>
 *   2. JSON: {"v":1,"bid":"<token>","typ":"booking"…}
 *   3. Raw:  <token>
 */
export function parseQRPayload(rawString) {
  if (!rawString || typeof rawString !== 'string') {
    return { valid: false, token: null, kind: null, error: 'Empty QR code.' };
  }

  const raw = rawString.trim();

  // 1. URL format
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
    try {
      const url = raw.startsWith('/')
        ? new URL(`https://ekodak.local${raw}`)
        : new URL(raw);

      const phToken =
        url.searchParams.get('ph_token') ||
        url.searchParams.get('photographer_token') ||
        url.searchParams.get('ptoken');
      if (phToken && phToken.length >= 4) {
        return {
          valid: true,
          kind: 'photographer',
          token: decodeURIComponent(phToken),
          error: null,
        };
      }

      const pathLower = (url.pathname || '').toLowerCase();
      const genericToken =
        url.searchParams.get('token') ||
        url.searchParams.get('id') ||
        url.searchParams.get('bid');
      if (genericToken && genericToken.length >= 4) {
        const kind = pathLower.includes('photographer') ? 'photographer' : 'booking';
        return {
          valid: true,
          kind,
          token: decodeURIComponent(genericToken),
          error: null,
        };
      }
    } catch {}
    return {
      valid: false,
      kind: null,
      token: null,
      error: 'This QR code link does not contain a valid studio pass token.',
    };
  }

  // 2. JSON format
  try {
    const payload = JSON.parse(raw);
    if (
      (payload?.typ === 'photographer_login' || payload?.typ === 'photographer') &&
      typeof (payload?.token || payload?.ph_token || payload?.pid) === 'string'
    ) {
      return {
        valid: true,
        kind: 'photographer',
        token: payload.token || payload.ph_token || payload.pid,
        error: null,
      };
    }

    if (payload?.v === 1 && payload?.typ === 'booking' && typeof payload?.bid === 'string') {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return { valid: false, kind: null, token: null, error: 'This studio pass has expired. Please request a new QR code.' };
      }
      return { valid: true, kind: 'booking', token: payload.bid, error: null };
    }
  } catch {}

  // 3. Raw token fallback
  if (raw.length >= 4 && raw.length <= 200 && !raw.includes('\n')) {
    return { valid: true, kind: 'unknown', token: raw, error: null };
  }

  return { valid: false, kind: null, token: null, error: 'Invalid QR code. Please scan your E-Kodak studio pass.' };
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
  tier_name,
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
  updated_at,
  confirmed_at,
  down_payment_confirmed,
  payment_confirmed_at,
  booking_for,
  participant_name,
  participant_phone,
  participant_email,
  participant_relationship,
  participant_details,
  student_details,
  school,
  school_address,
  track,
  batch,
  section,
  student_id,
  yearbook_motto,
  service:services (
    id, name, category, base_price, tiers, inclusions
  ),
  customer:profiles!bookings_customer_id_fkey (
    id, first_name, last_name, email, phone, address, avatar_url, studio_specs
  ),
  photographer:photographer_profiles!bookings_photographer_id_fkey (
    id,
    specialization,
    profile:profiles(first_name, last_name, avatar_url)
  ),
  booking_deliveries (
    id, delivery_type, status, tracking_number, carrier, dispatch_address,
    notes, dispatched_at, delivered_at, confirmed_by_customer_at,
    digital_access_expires_at, created_at, updated_at
  )
`;


// ── Normalizer ────────────────────────────────────────────────────────────────

/**
 * Parses structured bullet points from booking notes into key-value pairs
 */
function parseBookingNotes(notes) {
  if (!notes || typeof notes !== 'string') return {};
  const details = {};
  const lines = notes.split('\n');
  lines.forEach((line) => {
    const match = line.match(/^[•\-*]?\s*([^:]+):\s*(.+)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim();
      details[key] = val;
    }
  });
  return details;
}

/**
 * Parses the [DELIVERY & CLAIMING DETAILS] block from bookings.notes if present.
 */
function parseDeliveryDetailsFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return {};
  const marker = '[DELIVERY & CLAIMING DETAILS]';
  const startIdx = notes.indexOf(marker);
  if (startIdx === -1) return {};

  const section = notes.slice(startIdx + marker.length);
  const extract = (label) => {
    const regex = new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(.+)$`, 'im');
    const match = section.match(regex);
    return match ? match[1].trim() : '';
  };

  return {
    fulfillmentMode: extract('Fulfillment Mode'),
    preferredCourier: extract('Preferred Courier'),
    recipientName: extract('Recipient Name'),
    recipientPhone: extract('Recipient Phone'),
    region: extract('Region'),
    province: extract('Province'),
    city: extract('City / Municipality'),
    barangay: extract('Barangay'),
    street: extract('Street / House No.'),
    address: extract('Delivery Address'),
    instructions: extract('Delivery Instructions'),
    savedAt: extract('Saved At'),
  };
}

/**
 * Resolves customer delivery choice & studio dispatch records from DB sources.
 */
function resolveDeliveryInfo(raw) {
  const c = raw?.customer || {};
  const specs = (c.studio_specs && typeof c.studio_specs === 'object') ? c.studio_specs : {};
  const fromNotes = parseDeliveryDetailsFromNotes(raw?.notes);
  const deliveries = Array.isArray(raw?.booking_deliveries) ? raw.booking_deliveries : [];
  const latestDelivery = deliveries[0] || null;

  const streetParts = [
    fromNotes.street || specs.delivery_street,
    fromNotes.barangay || specs.delivery_barangay,
    fromNotes.city || specs.delivery_city,
    fromNotes.province || specs.delivery_province,
    fromNotes.region || specs.delivery_region,
  ].filter(Boolean);

  const resolvedAddress =
    fromNotes.address ||
    latestDelivery?.dispatch_address ||
    specs.shipping_address ||
    (streetParts.length > 0 ? streetParts.join(', ') : '') ||
    c.address ||
    '';

  const rawMode =
    fromNotes.fulfillmentMode ||
    specs.fulfillment_mode ||
    latestDelivery?.delivery_type ||
    '';

  return {
    fulfillmentMode: rawMode,
    preferredCourier: fromNotes.preferredCourier || specs.preferred_courier || latestDelivery?.carrier || '',
    recipientName:
      fromNotes.recipientName ||
      specs.courier_recipient_name ||
      `${c.first_name || ''} ${c.last_name || ''}`.trim(),
    recipientPhone: fromNotes.recipientPhone || specs.courier_phone || c.phone || '',
    address: resolvedAddress,
    instructions: fromNotes.instructions || specs.delivery_instructions || latestDelivery?.notes || '',
    savedAt: fromNotes.savedAt || specs.delivery_saved_at || latestDelivery?.updated_at || latestDelivery?.created_at || '',
    deliveryStatus: latestDelivery?.status || '',
    trackingNumber: latestDelivery?.tracking_number || '',
    carrier: latestDelivery?.carrier || specs.preferred_courier || fromNotes.preferredCourier || '',
    dispatchedAt: latestDelivery?.dispatched_at || '',
    deliveredAt: latestDelivery?.delivered_at || '',
    confirmedByCustomerAt: latestDelivery?.confirmed_by_customer_at || '',
    digitalAccessExpiresAt: latestDelivery?.digital_access_expires_at || '',
  };
}

/**
 * Normalize a raw DB booking row to the shape expected by the mobile UI.
 * Aliases web column names to the old mobile field names so screens don't break.
 */
function normalizeBooking(raw) {
  if (!raw) return null;

  const c = raw.customer;
  const fullName = c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '';
  const loc = (raw.location || '').toLowerCase();
  const isStudio =
    loc.includes('e-kodak') ||
    loc.includes('studio') ||
    loc.includes('331 rizal') ||
    loc.includes('311 rizal');

  // Parse structured notes and overlay top-level DB academic/participant columns
  const parsedNotes = parseBookingNotes(raw.notes);
  const dbStudent = (raw.student_details && typeof raw.student_details === 'object') ? raw.student_details : {};
  const dbParticipant = (raw.participant_details && typeof raw.participant_details === 'object') ? raw.participant_details : {};

  if (raw.school || dbStudent.school) parsedNotes['School'] = raw.school || dbStudent.school;
  if (raw.school_address || dbStudent.school_address) parsedNotes['Campus / Address'] = raw.school_address || dbStudent.school_address;
  if (raw.track || dbStudent.course || dbStudent.track) parsedNotes['Degree / Program'] = raw.track || dbStudent.course || dbStudent.track;
  if (raw.section || dbStudent.section) parsedNotes['Section'] = raw.section || dbStudent.section;
  if (raw.batch || dbStudent.batch) parsedNotes['Batch'] = raw.batch || dbStudent.batch;
  if (raw.student_id || dbStudent.student_id) parsedNotes['Student ID'] = raw.student_id || dbStudent.student_id;
  if (raw.yearbook_motto || dbStudent.yearbook_motto) parsedNotes['Yearbook Motto'] = raw.yearbook_motto || dbStudent.yearbook_motto;
  if (raw.participant_name || dbParticipant.full_name) parsedNotes['Participant Name'] = raw.participant_name || dbParticipant.full_name;
  if (raw.participant_phone || dbParticipant.phone) parsedNotes['Participant Phone'] = raw.participant_phone || dbParticipant.phone;
  if (raw.participant_email || dbParticipant.email) parsedNotes['Participant Email'] = raw.participant_email || dbParticipant.email;

  const deliveryDetails = resolveDeliveryInfo(raw);

  // Match selected tier from services.tiers
  const serviceTiers = Array.isArray(raw.service?.tiers) ? raw.service.tiers : [];
  const selectedTierName = raw.tier_name || parsedNotes['Set'] || parsedNotes['Selected Set'] || '';
  const matchedTier = serviceTiers.find(
    (t) => String(t.name || '').toLowerCase() === String(selectedTierName).toLowerCase()
  ) || null;

  // Resolve pricing: If total_amount is 0 or missing, grab tier price (e.g. "₱1,750.00" -> 1750)
  let resolvedPrice = Number(raw.total_amount ?? 0);
  if (resolvedPrice <= 0 && matchedTier?.price) {
    const num = Number(String(matchedTier.price).replace(/[^0-9.]/g, ''));
    if (num > 0) resolvedPrice = num;
  }
  if (resolvedPrice <= 0 && raw.service?.base_price) {
    resolvedPrice = Number(raw.service.base_price);
  }

  return {
    ...raw,
    // Alias actual DB columns to mobile UI field names
    session_date: raw.event_date,
    session_time: raw.preferred_time,
    location_type: isStudio ? 'STUDIO' : 'OUTDOOR',
    location_address: raw.location || parsedNotes['Campus / Address'] || parsedNotes['School'] || '',
    studio_location: '331 Rizal Street, City of Naga, Cebu, 6037',
    total_price: resolvedPrice,
    tier_name: selectedTierName || matchedTier?.name || '',
    tier_details: matchedTier,
    parsed_notes: parsedNotes,
    delivery_details: deliveryDetails,
    booking_deliveries: Array.isArray(raw.booking_deliveries) ? raw.booking_deliveries : [],
    // Normalize profile shape
    profile: c
      ? {
          id: c.id,
          full_name: fullName || parsedNotes['Participant Name'] || parsedNotes['Student Name'] || '',
          email: c.email || parsedNotes['Participant Email'] || '',
          phone: c.phone || parsedNotes['Participant Phone'] || '',
          address: c.address || '',
          avatar_url: c.avatar_url || null,
          studio_specs: c.studio_specs || null,
        }
      : {
          full_name: parsedNotes['Participant Name'] || parsedNotes['Student Name'] || '',
          email: parsedNotes['Participant Email'] || '',
          phone: parsedNotes['Participant Phone'] || '',
        },
    // Normalize service join (support both service and services)
    service: raw.service || null,
    services: raw.service || null,
  };
}

// ── Studio Settings ──────────────────────────────────────────────────────────

/**
 * Fetch real studio settings (flagship address, contact, hours) from database.
 */
export async function fetchStudioSettings() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: {
        address: '331 Rizal Street, City of Naga, Cebu, 6037',
        contact_phone: '+63 917 123 4567',
        contact_email: 'contact@e-kodak.com',
        business_hours: 'Mon – Sat: 8:00 AM – 6:00 PM | Sun: By Appointment',
      },
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from('studio_settings')
      .select('address, contact_phone, contact_email, business_hours, social_links')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return {
        data: {
          address: '331 Rizal Street, City of Naga, Cebu, 6037',
          contact_phone: '+63 917 123 4567',
          contact_email: 'contact@e-kodak.com',
          business_hours: 'Mon – Sat: 8:00 AM – 6:00 PM | Sun: By Appointment',
        },
        error: null,
      };
    }
    return { data, error: null };
  } catch (err) {
    return {
      data: {
        address: '331 Rizal Street, City of Naga, Cebu, 6037',
        contact_phone: '+63 917 123 4567',
        contact_email: 'contact@e-kodak.com',
        business_hours: 'Mon – Sat: 8:00 AM – 6:00 PM | Sun: By Appointment',
      },
      error: null,
    };
  }
}

// ── Fetch Booking ─────────────────────────────────────────────────────────────

/**
 * Build ordered, normalized lookup candidates from a scanned token or customer Booking ID.
 * Supports:
 *  - booking_token UUID (e.g. c18facb6-8c84-4eec-821d-8712f0f1f551)
 *  - booking_number (e.g. BK-2026-00001, #BK-2026-00001, bk-2026-1, 2026-00001, 00001)
 *  - booking id UUID
 */
function buildBookingLookupCandidates(rawInput) {
  const cleaned = String(rawInput || '').trim().replace(/^#+\s*/, '').trim();
  if (!cleaned) return [];

  const candidates = [];
  const pushUnique = (val) => {
    const v = String(val || '').trim();
    if (v && !candidates.includes(v)) {
      candidates.push(v);
    }
  };

  pushUnique(cleaned);

  // Normalize BK-YYYY-NNNNN variants (e.g. "bk-2026-1", "BK 2026 00001", "BK202600001")
  const bkMatch = cleaned.match(/^bk[-\s]?(\d{4})[-\s]?(\d{1,6})$/i);
  if (bkMatch) {
    const [, year, seq] = bkMatch;
    pushUnique(`BK-${year}-${seq.padStart(5, '0')}`);
    pushUnique(`BK-${year}-${seq}`);
  } else {
    // Support YYYY-NNNNN shorthand (e.g. "2026-00001" or "2026-1")
    const yearSeqMatch = cleaned.match(/^(\d{4})[-\s](\d{1,6})$/);
    if (yearSeqMatch) {
      const [, year, seq] = yearSeqMatch;
      pushUnique(`BK-${year}-${seq.padStart(5, '0')}`);
    } else if (/^\d{1,5}$/.test(cleaned)) {
      // Support numeric sequence suffix (e.g. "00001" -> current year BK-YYYY-00001)
      const currentYear = new Date().getFullYear();
      pushUnique(`BK-${currentYear}-${cleaned.padStart(5, '0')}`);
    }
  }

  return candidates;
}

/**
 * Fetch a booking by token, customer booking ID (booking_number), or booking UUID id.
 */
export async function fetchBookingByToken(lookupToken) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }

  if (!lookupToken) {
    return { data: null, error: new Error('No booking code or Booking ID provided.') };
  }

  const candidates = buildBookingLookupCandidates(lookupToken);
  if (candidates.length === 0) {
    return { data: null, error: new Error('No booking code or Booking ID provided.') };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    for (const candidate of candidates) {
      const isUUID = uuidRegex.test(candidate);

      // Strategy 0: Secure Definitive RPC for mobile pass scanning & Booking ID lookup
      try {
        const { data: rpcBooking, error: rpcError } = await supabase.rpc('get_booking_by_pass_token', {
          lookup_token: candidate,
        });
        if (rpcBooking && !rpcError) {
          return await handleMatchedBooking(rpcBooking);
        }
      } catch (rpcErr) {
        console.warn('RPC pass lookup fallback:', rpcErr);
      }

      // Strategy 1 & 3: UUID columns (booking_token or bookings.id)
      if (isUUID) {
        const { data: byToken } = await supabase
          .from('bookings')
          .select(BOOKING_SELECT)
          .eq('booking_token', candidate)
          .maybeSingle();
        if (byToken) return await handleMatchedBooking(byToken);

        const { data: byId } = await supabase
          .from('bookings')
          .select(BOOKING_SELECT)
          .eq('id', candidate)
          .maybeSingle();
        if (byId) return await handleMatchedBooking(byId);
      }

      // Strategy 2: booking_number (Customer Booking ID, case-insensitive)
      const { data: byNumber } = await supabase
        .from('bookings')
        .select(BOOKING_SELECT)
        .ilike('booking_number', candidate)
        .maybeSingle();
      if (byNumber) return await handleMatchedBooking(byNumber);
    }

    // Strategy 4: Digits-only suffix fallback across any year (e.g. "00042" matching "%-00042")
    const cleanedRaw = candidates[0];
    if (/^\d{1,5}$/.test(cleanedRaw)) {
      const suffix = `-${cleanedRaw.padStart(5, '0')}`;
      const { data: bySuffix } = await supabase
        .from('bookings')
        .select(BOOKING_SELECT)
        .ilike('booking_number', `%${suffix}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (bySuffix) return await handleMatchedBooking(bySuffix);
    }

    logQRScan({ bookingId: null, scanResult: 'INVALID' });

    return {
      data: null,
      error: new Error(
        'No booking found. Please scan your official E-Kodak QR code or enter your Booking ID (e.g. BK-2026-00001) or pass code.'
      ),
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Fetch the latest active booking for a specific authenticated customer.
 * Never returns bookings without an explicit userId filter to prevent cross-customer data leaks.
 */
export async function fetchLatestActiveBooking(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return { data: null, error: new Error('User authentication is required to fetch bookings.') };
  }
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('customer_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { data: null, error };
    return { data: normalizeBooking(data), error: null };
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
  if (!isSupabaseConfigured || !supabase || !bookingId) return () => {};

  // Clean up any stale channels in the client registry matching this booking
  try {
    const existing = supabase.getChannels ? supabase.getChannels() : [];
    existing.forEach((ch) => {
      if (ch.topic && (ch.topic.includes(bookingId) || ch.topic.startsWith('realtime:booking'))) {
        try { supabase.removeChannel(ch); } catch {}
      }
    });
  } catch (cleanErr) {}

  let isActive = true;
  let lastSnapshotKey = '';

  const buildSnapshotKey = (b) => {
    if (!b) return '';
    return [
      b.status || '',
      b.payment_status || '',
      b.down_payment_confirmed ? '1' : '0',
      b.payment_confirmed_at || '',
      b.photographer_id || '',
      b.event_date || '',
      b.preferred_time || '',
      b.updated_at || '',
      b.school || '',
      b.track || '',
      b.section || '',
      b.student_id || '',
    ].join('|');
  };

  const syncFullBooking = async (fallbackRaw = null) => {
    if (!isActive) return;
    try {
      const { data: fullBooking } = await fetchBookingByToken(bookingId);
      if (!isActive) return;
      if (fullBooking) {
        const nextKey = buildSnapshotKey(fullBooking);
        if (nextKey && nextKey !== lastSnapshotKey) {
          const hadPrevious = Boolean(lastSnapshotKey);
          lastSnapshotKey = nextKey;
          if (hadPrevious || fallbackRaw) {
            onUpdate(fullBooking);
          }
        }
        return;
      }
    } catch {}
    if (fallbackRaw && isActive) {
      onUpdate(normalizeBooking(fallbackRaw));
    }
  };

  // Seed initial snapshot key
  fetchBookingByToken(bookingId)
    .then(({ data }) => {
      if (data && isActive && !lastSnapshotKey) {
        lastSnapshotKey = buildSnapshotKey(data);
      }
    })
    .catch(() => {});

  // 1. Supabase Realtime subscription (when RLS allows direct row events)
  const uniqueTopic = `booking-sub-${bookingId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  let channel = null;

  try {
    channel = supabase
      .channel(uniqueTopic)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        (payload) => {
          if (payload.new && isActive) {
            syncFullBooking(payload.new);
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscription initialization skipped:', err?.message);
  }

  // 2. Live RPC status sync poll (ensures anonymous QR-pass mobile users bypass RLS and receive admin status moves within seconds)
  const pollInterval = setInterval(() => {
    syncFullBooking(null);
  }, 4000);

  return () => {
    isActive = false;
    clearInterval(pollInterval);
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // Safe channel teardown
      }
    }
  };
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
  await clearPhotographerSessionData().catch(() => {});
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
    .select('id, first_name, last_name, email, role, avatar_url, phone, is_active')
    .eq('id', userId)
    .single();
  if (!data) return null;
  return {
    ...data,
    full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
  };
}

/**
 * Authenticates a photographer strictly using their unique Photographer Login QR token.
 * Persists the verified token & full credentials locally so schedules, shoots, and
 * profile load immediately on mobile without requiring a password.
 */
export async function loginPhotographerWithQRToken(rawTokenOrPayload, { persist = true } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      authorized: false,
      reason: 'Supabase is not configured. Please check your connection.',
      profile: null,
      qr_login_token: null,
    };
  }

  const parsed = parseQRPayload(rawTokenOrPayload);
  const cleanToken = (parsed.valid && parsed.token ? parsed.token : String(rawTokenOrPayload || '')).trim();
  if (!cleanToken) {
    return {
      authorized: false,
      reason: 'Invalid or empty photographer QR code.',
      profile: null,
      qr_login_token: null,
    };
  }

  try {
    const { data, error } = await supabase.rpc('login_photographer_by_qr_token', {
      lookup_token: cleanToken,
    });

    if (error) {
      return {
        authorized: false,
        reason: error.message || 'Unable to verify photographer QR pass.',
        profile: null,
        qr_login_token: null,
      };
    }

    if (!data || !data.authorized || !data.profile) {
      return {
        authorized: false,
        reason: data?.reason || 'Photographer QR pass not recognized.',
        profile: null,
        qr_login_token: null,
      };
    }

    const tokenToStore = data.qr_login_token || cleanToken;
    const normalizedProfile = {
      ...data.profile,
      qr_login_token: tokenToStore,
      full_name:
        data.profile.full_name ||
        `${data.profile.first_name || ''} ${data.profile.last_name || ''}`.trim(),
    };

    if (persist) {
      await Promise.all([
        savePhotographerSessionData(tokenToStore, normalizedProfile),
        setUserRole('photographer'),
      ]);
    }

    return {
      authorized: true,
      reason: null,
      profile: normalizedProfile,
      qr_login_token: tokenToStore,
    };
  } catch (err) {
    return {
      authorized: false,
      reason: err?.message || 'Unable to verify photographer QR pass.',
      profile: null,
      qr_login_token: null,
    };
  }
}

/**
 * Verifies that an active photographer session exists — either via the saved
 * Photographer QR Login token (primary passwordless flow) or a legacy Supabase Auth session.
 */
export async function verifyPhotographerSession() {
  const storedQRToken = await getPhotographerQRToken();
  if (storedQRToken) {
    if (!isSupabaseConfigured || !supabase) {
      const cached = await getCachedPhotographerProfile();
      if (cached?.id) {
        return {
          authorized: true,
          reason: null,
          profile: cached,
          qr_login_token: storedQRToken,
          authMode: 'qr-offline',
        };
      }
      return { authorized: false, reason: 'Supabase is not configured.', profile: null };
    }

    const { data, error } = await supabase.rpc('login_photographer_by_qr_token', {
      lookup_token: storedQRToken,
    });

    if (error) {
      // Only fall back to cached profile on transient RPC/network failures
      const cached = await getCachedPhotographerProfile();
      if (cached?.id) {
        return {
          authorized: true,
          reason: null,
          profile: cached,
          qr_login_token: storedQRToken,
          authMode: 'qr-cached',
        };
      }
      return {
        authorized: false,
        reason: error.message || 'Unable to verify photographer QR session.',
        profile: null,
      };
    }

    if (data?.authorized && data?.profile) {
      const normalizedProfile = {
        ...data.profile,
        qr_login_token: data.qr_login_token || storedQRToken,
        full_name:
          data.profile.full_name ||
          `${data.profile.first_name || ''} ${data.profile.last_name || ''}`.trim(),
      };
      await savePhotographerSessionData(normalizedProfile.qr_login_token, normalizedProfile);
      return {
        authorized: true,
        reason: null,
        profile: normalizedProfile,
        qr_login_token: normalizedProfile.qr_login_token,
        authMode: 'qr',
      };
    }

    // Server explicitly revoked or deactivated this QR token
    await clearPhotographerSessionData();
    return {
      authorized: false,
      reason: data?.reason || 'Photographer QR pass is no longer active.',
      profile: null,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return { authorized: false, reason: 'Supabase is not configured.', profile: null };
  }

  const session = await getSession();
  if (!session?.user) {
    return { authorized: false, reason: 'Scan your Photographer QR Pass to open studio access.', profile: null };
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc('verify_current_photographer_access');
  if (!rpcError && rpcData && typeof rpcData === 'object') {
    const profile = rpcData.profile
      ? {
          ...rpcData.profile,
          full_name: `${rpcData.profile.first_name || ''} ${rpcData.profile.last_name || ''}`.trim(),
        }
      : null;
    return {
      authorized: Boolean(rpcData.authorized),
      reason: rpcData.reason || null,
      profile,
    };
  }

  // Fallback query if RPC is unavailable: still enforces role === 'photographer' & is_active === true
  const profile = await getProfile(session.user.id);
  if (!profile) {
    return {
      authorized: false,
      reason: 'Staff profile was not found. This portal is restricted to verified studio photographers.',
      profile: null,
    };
  }
  if (profile.role !== 'photographer') {
    return {
      authorized: false,
      reason: 'This account is not a studio photographer account. Customers do not need to sign in — use your booking QR pass instead.',
      profile: null,
    };
  }
  if (!profile.is_active) {
    return {
      authorized: false,
      reason: 'This photographer account is currently inactive. Contact studio management for access.',
      profile: null,
    };
  }

  return { authorized: true, reason: null, profile };
}

/**
 * Updates the customer's `profiles.avatar_url` directly via booking pass token
 * so mobile profile photo edits sync immediately to the shared Supabase DB & web dashboard.
 */
export async function updateCustomerAvatarByPassToken(lookupToken, avatarDataUri) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }
  if (!lookupToken) {
    return { data: null, error: new Error('No booking pass token found.') };
  }
  try {
    const { data, error } = await supabase.rpc('update_customer_avatar_by_pass_token', {
      lookup_token: String(lookupToken).trim(),
      new_avatar_url: avatarDataUri || '',
    });
    if (error) return { data: null, error };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

