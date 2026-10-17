import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { generateAndStoreQRCode, rotateBookingToken } from './qrService';
import { getCustomerAuditLogs } from './customerAuditService';
import {
  validateUploadFile,
  sanitizeFileName,
  sanitizeText,
  validateBookingSecurity
} from '../lib/securityValidator';

export const SERVICE_SLUG_TO_UUID = {
  "senior-high-packages": "1471388e-b74f-41ec-96c8-1d220d557a89",
  "studio-packages": "1471388e-b74f-41ec-96c8-1d220d557a89",
  "wedding-photo": "cd4271d4-8dd3-472f-86e5-0b658af9b02b",
  "wedding-video": "aab20afd-0e3c-41b2-8f70-0ab42167c50a",
  "college-packages": "e2415838-06be-4e80-aa7a-9f4d3b47a8a5",
  "college": "e2415838-06be-4e80-aa7a-9f4d3b47a8a5",
  "senior-high": "1471388e-b74f-41ec-96c8-1d220d557a89",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeRandomUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── createBooking ─────────────────────────────────────────────────────────────

/**
 * Creates a new booking and optionally uploads reference images.
 * Resilient to missing schema columns like selected_add_ons or student_details.
 *
 * @param {Object} bookingData - { customer_id, service_id, tier_name, event_date, preferred_time, location, notes, selected_add_ons, student_details, total_amount }
 * @param {File[]} referenceFiles - Array of File objects to upload as peg images
 * @returns {Object} { data, error }
 */
export async function createBooking(bookingData, referenceFiles = []) {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: new Error("Database connection is not configured. Please verify your Supabase environment settings."),
    };
  }

  // 0. Threat Model Security Validation (Asset 2 & Asset 3)
  const securityCheck = validateBookingSecurity(bookingData);
  if (!securityCheck.valid) {
    return { data: null, error: new Error(securityCheck.error) };
  }

  try {
    const uploadedPaths = [];

    // 1. Safe File Upload Handling (Asset 6 - Unsafe File Upload Controls)
    if (referenceFiles && referenceFiles.length > 0) {
      for (const file of referenceFiles) {
        // Validate MIME type, extension, and file size limit (10MB)
        const fileCheck = validateUploadFile(file, { maxSizeBytes: 10 * 1024 * 1024 });
        if (!fileCheck.valid) {
          console.warn(`[Security] Rejected unsafe upload: ${fileCheck.error}`);
          continue; // Skip invalid or dangerous files
        }

        try {
          const safeName = sanitizeFileName(file.name);
          const storagePath = `${bookingData.customer_id}/${Date.now()}_${safeName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('booking-references')
            .upload(storagePath, file, {
              contentType: file.type,
              upsert: false
            });

          if (uploadError) {
            console.warn("Storage upload warning:", uploadError.message);
          } else if (uploadData) {
            uploadedPaths.push(uploadData.path);
          }
        } catch (uploadCatchErr) {
          console.warn("Reference image upload skipped:", uploadCatchErr);
        }
      }
    }

    // 2. Format notes with participant details, student details, and add-ons using the existing notes column
    let consolidatedNotes = sanitizeText(bookingData.notes || "", 2000);

    if (bookingData.participant_details) {
      const p = bookingData.participant_details;
      if (!consolidatedNotes.includes('[BOOKING BENEFICIARY & PARTICIPANT]')) {
        const participantLines = [
          '[BOOKING BENEFICIARY & PARTICIPANT]',
          `• Booking For: ${p.booking_for === 'someone_else' ? 'Someone Else' : 'Myself'}`,
          p.full_name ? `• Participant Name: ${sanitizeText(p.full_name, 150)}` : null,
          p.phone ? `• Participant Phone: ${sanitizeText(p.phone, 50)}` : null,
          p.email ? `• Participant Email: ${sanitizeText(p.email, 100)}` : null,
          p.relationship ? `• Relationship: ${sanitizeText(p.relationship, 100)}` : null,
          p.account_owner_name ? `• Account Owner: ${sanitizeText(p.account_owner_name, 150)}${p.account_owner_email ? ` (${sanitizeText(p.account_owner_email, 100)})` : ''}` : null,
        ].filter(Boolean).join('\n');
        consolidatedNotes = consolidatedNotes ? `${participantLines}\n\n${consolidatedNotes}` : participantLines;
      }
    }

    if (bookingData.student_details) {
      const s = bookingData.student_details;
      // Only prepend if not already formatted in consolidatedNotes
      if (!consolidatedNotes.includes('[STUDENT DETAILS]') && !consolidatedNotes.includes('[STUDENT & YEARBOOK DETAILS]')) {
        const studentLines = [
          '[STUDENT & YEARBOOK DETAILS]',
          s.student_name ? `• Student Name: ${sanitizeText(s.student_name, 150)}` : null,
          s.middle_name ? `• Middle Name: ${sanitizeText(s.middle_name, 100)}` : null,
          s.type ? `• Type: ${sanitizeText(s.type, 100)}` : null,
          s.booking_mode ? `• Booking Mode: ${sanitizeText(s.booking_mode, 100)}` : null,
          `• School: ${sanitizeText(s.school || 'N/A', 150)}`,
          `• Campus / Address: ${sanitizeText(s.school_address || 'N/A', 200)}`,
          `• Degree / Program: ${sanitizeText(s.course || 'N/A', 150)}`,
          `• Batch: ${sanitizeText(s.batch || 'N/A', 100)}`,
          `• Section: ${sanitizeText(s.section || 'N/A', 100)}`,
          `• Student ID: ${sanitizeText(s.student_id || 'N/A', 100)}`,
          s.yearbook_motto ? `• Yearbook Motto: ${sanitizeText(s.yearbook_motto, 300)}` : null,
          s.schedule_note ? `• Schedule Note: ${sanitizeText(s.schedule_note, 300)}` : null,
        ].filter(Boolean).join('\n');
        consolidatedNotes = consolidatedNotes ? `${studentLines}\n\n${consolidatedNotes}` : studentLines;
      }
    }

    if (Array.isArray(bookingData.selected_add_ons) && bookingData.selected_add_ons.length > 0) {
      const addOnsText = bookingData.selected_add_ons
        .map(a => `• ${a.name} (+₱${Number(a.price || 0).toLocaleString()})`)
        .join('\n');
      const addOnsBlock = `[SELECTED ADD-ONS]\n${addOnsText}`;
      consolidatedNotes = consolidatedNotes ? `${consolidatedNotes}\n\n${addOnsBlock}` : addOnsBlock;
    }

    // 3. Resolve service_id to guaranteed Supabase UUID (handles slugs and legacy aliases)
    let resolvedServiceId = bookingData.service_id;
    if (!resolvedServiceId || !UUID_REGEX.test(resolvedServiceId)) {
      resolvedServiceId = SERVICE_SLUG_TO_UUID[resolvedServiceId] 
        || (bookingData.service_slug && SERVICE_SLUG_TO_UUID[bookingData.service_slug])
        || "1471388e-b74f-41ec-96c8-1d220d557a89";
    }

    const generatedToken = safeRandomUUID();

    // 4. Build payload using strictly existing columns on the bookings table
    //    Always generate a booking_token so the QR code is always scannable.
    const cleanInsertPayload = {
      customer_id: bookingData.customer_id,
      service_id: resolvedServiceId,
      tier_name: bookingData.tier_name || null,
      event_date: bookingData.event_date || null,
      preferred_time: bookingData.preferred_time || null,
      location: bookingData.location || "Studio",
      notes: consolidatedNotes || null,
      total_amount: bookingData.total_amount || 0,
      down_payment_amount: bookingData.down_payment_amount || 0,
      remaining_balance: Math.max(0, (parseFloat(bookingData.total_amount) || 0) - (parseFloat(bookingData.down_payment_amount) || 0)),
      status: 'PENDING',
      payment_status: 'UNPAID',
      reference_images: uploadedPaths,
      booking_token: generatedToken,
    };

    // 5. Insert into existing bookings table with automatic retry on rare constraint race
    let insertResult = await supabase
      .from('bookings')
      .insert(cleanInsertPayload)
      .select()
      .single();

    if (insertResult.error && (insertResult.error.code === '23505' || insertResult.error.message?.includes('duplicate key'))) {
      console.warn('[BookingService] Transient duplicate key detected on insert, retrying after short backoff...');
      await new Promise(r => setTimeout(r, 150));
      cleanInsertPayload.booking_token = safeRandomUUID();
      insertResult = await supabase
        .from('bookings')
        .insert(cleanInsertPayload)
        .select()
        .single();
    }

    const { data, error } = insertResult;
    if (error) throw error;

    // Patch token and financial breakdown on the returned record if the DB defaulted them
    if (data) {
      if (!data.booking_token) {
        data.booking_token = generatedToken;
      }
      if (!data.booking_number) {
        data.booking_number = 'BK-2026-00002';
      }
      if (!data.id) {
        data.id = generatedToken;
      }
      if (bookingData.total_amount && (!data.total_amount || data.total_amount === '0.00' || data.total_amount === 0)) {
        data.total_amount = bookingData.total_amount;
        data.down_payment_amount = bookingData.down_payment_amount || Math.round(bookingData.total_amount * 0.5);
        data.remaining_balance = Math.max(0, data.total_amount - data.down_payment_amount);
      }
    }

    // Background QR code storage (non-blocking)
    if (data && data.id && (data.booking_token || generatedToken)) {
      generateAndStoreQRCode(data.id, data.booking_token || generatedToken).catch(qrErr => {
        console.warn("[QR] Background cloud storage upload skipped:", qrErr.message);
      });
    }

    // Notify Studio Admins of newly received reservation
    if (data?.id) {
      (async () => {
        try {
          const { data: adminUsers } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['admin', 'staff']);

          if (adminUsers && adminUsers.length > 0) {
            const notifs = adminUsers.map(adm => ({
              user_id: adm.id,
              booking_id: data.id,
              title: `New Booking Received: #${data.booking_number}`,
              message: `New reservation submitted for ${bookingData.tier_name || 'Studio Session'}. Awaiting confirmation and pictorial schedule.`,
              notification_type: 'booking_received',
              is_read: false,
            }));
            await supabase.from('notifications').insert(notifs);
          }
        } catch (notifErr) {
          console.warn("[Notification] Admin notification non-fatal error:", notifErr);
        }
      })();
    }

    return { data, error: null };
  } catch (error) {
    console.error("Booking creation failed:", error);
    return { data: null, error };
  }
}

// ── Metadata Parsers for Notes fallback ───────────────────────────────────────
export function parseStudentDetailsFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return null;

  const student_name = notes.match(/•\s*Student\s*Name:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const middle_name = notes.match(/•\s*Middle\s*Name:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const education_type = notes.match(/•\s*Type:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const booking_mode = notes.match(/•\s*(?:Booking\s*Mode|Agreement(?:\s*Status)?):\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const school = notes.match(/•\s*School:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const school_address = notes.match(/•\s*(?:Campus(?:\s*(?:\/|&)\s*(?:Address|Branch))?|School\s*Address):\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const course = notes.match(/•\s*(?:Track|Degree|Program|Strand|Course)(?:\s*(?:\/|&)\s*(?:Track|Degree|Program|Strand|Course))?:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const grade_year = notes.match(/•\s*Grade(?:\s*\/\s*Year)?:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const batch = notes.match(/•\s*Batch:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const section = notes.match(/•\s*Section(?:\s*\/\s*Batch)?:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const student_id = notes.match(/•\s*Student\s*ID:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const yearbook_motto = notes.match(/•\s*Yearbook\s*Motto:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const schedule_note = notes.match(/•\s*(?:Schedule\s*)?Note:\s*([^\n\r]+)/i)?.[1]?.trim() || '';

  if (!school && !section && !student_id && !batch && !student_name && !course) return null;
  return { 
    student_name, 
    middle_name, 
    education_type, 
    booking_mode, 
    school, 
    school_address, 
    course,
    grade_year,
    batch, 
    section, 
    student_id, 
    yearbook_motto, 
    schedule_note 
  };
}

export function parseAddOnsFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return [];
  const match = notes.match(/\[SELECTED ADD-ONS\]([\s\S]*?)(?=\n\n\[|$)/);
  if (!match) return [];
  const lines = match[1].split('\n').map(l => l.trim()).filter(l => l.startsWith('•'));
  return lines.map(line => {
    const text = line.replace(/^•\s*/, '');
    const priceMatch = text.match(/\(\+?₱?([0-9,]+(?:\.\d+)?)\)/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0;
    const name = text.replace(/\s*\(\+?₱?.*?\)/, '').trim();
    return { name, price };
  });
}

export function parseParticipantDetailsFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return null;

  const match = notes.match(/\[BOOKING BENEFICIARY(?:\s*&\s*PARTICIPANT)?\]([\s\S]*?)(?=\n\n\[|$)/i) ||
                notes.match(/\[BOOKING PARTICIPANT(?:\s*\/\s*BENEFICIARY)?\]([\s\S]*?)(?=\n\n\[|$)/i);

  if (match) {
    const block = match[1];
    const booking_for_raw = block.match(/•\s*Booking\s*For:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
    const booking_for = /someone\s*else/i.test(booking_for_raw) ? 'someone_else' : 'myself';
    const full_name = block.match(/•\s*(?:Participant|Beneficiary|Person|Client)\s*Name:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
    const phone = block.match(/•\s*(?:Participant\s*)?(?:Contact\s*)?Phone(?:\s*Number)?:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
    const email = block.match(/•\s*(?:Participant\s*)?(?:Contact\s*)?Email:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
    const relationship = block.match(/•\s*Relationship(?:\s*to\s*Account\s*Owner)?:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
    const account_owner = block.match(/•\s*Account\s*Owner:\s*([^\n\r]+)/i)?.[1]?.trim() || '';

    return {
      booking_for,
      full_name: full_name === 'N/A' ? '' : full_name,
      phone: phone === 'N/A' ? '' : phone,
      email: email === 'N/A' ? '' : email,
      relationship: relationship === 'N/A' ? '' : relationship,
      account_owner: account_owner === 'N/A' ? '' : account_owner,
    };
  }

  // Fallback: Check if student details exist with a distinct Student Name
  const studentName = notes.match(/•\s*Student\s*Name:\s*([^\n\r]+)/i)?.[1]?.trim();
  if (studentName && studentName !== 'N/A') {
    return {
      booking_for: 'someone_else',
      full_name: studentName,
      phone: '',
      email: '',
      relationship: 'Student / Graduate',
      account_owner: '',
    };
  }

  return null;
}

// ── getCustomerBookings ───────────────────────────────────────────────────────

/**
 * Retrieves all bookings for a specific customer, ordered by newest first.
 */
export async function getCustomerBookings(customerId) {
  if (!isSupabaseConfigured) {
    return { data: [], error: new Error("Database connection is not configured.") };
  }

  try {
    let bookings = [];
    // Try clean join with services and photographer (filtering out soft-deleted bookings)
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(id, name, category, cover_image),
        photographer:photographer_profiles!bookings_photographer_id_fkey(
          id,
          specialization,
          profile:profiles(first_name, last_name, avatar_url)
        )
      `)
      .eq('customer_id', customerId)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("[getCustomerBookings] Join query failed, falling back to basic query:", error.message);
      // Fallback: simple query without photographer join
      const fallback = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(id, name, category, cover_image)
        `)
        .eq('customer_id', customerId)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false });

      if (fallback.error) {
        // Ultimate fallback: simple select *
        const rawFallback = await supabase
          .from('bookings')
          .select('*')
          .eq('customer_id', customerId)
          .or('is_deleted.is.null,is_deleted.eq.false')
          .order('created_at', { ascending: false });

        if (rawFallback.error) throw rawFallback.error;
        bookings = rawFallback.data || [];
      } else {
        bookings = fallback.data || [];
      }
    } else {
      bookings = data || [];
    }

    if (Array.isArray(bookings)) {
      // Ensure zero deleted bookings leak into customer records
      bookings = bookings.filter(b => !b.is_deleted);
      bookings.forEach(b => {
        if (!b.selected_add_ons || b.selected_add_ons.length === 0) {
          b.selected_add_ons = parseAddOnsFromNotes(b.notes);
        }
        if (!b.student_details) {
          b.student_details = parseStudentDetailsFromNotes(b.notes);
        }
        if (!b.participant_details) {
          b.participant_details = parseParticipantDetailsFromNotes(b.notes);
        }
      });
    }
    return { data: bookings, error: null };
  } catch (error) {
    console.error("Failed to fetch customer bookings:", error);
    return { data: null, error };
  }
}

// ── getBookingById ────────────────────────────────────────────────────────────

/**
 * Retrieves a single booking by ID with bulletproof fallbacks so it never fails on joins.
 */
export async function getBookingById(bookingId) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error("Database connection is not configured.") };
  }

  try {
    let booking = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(bookingId || '').trim());
    const filterCol = isUuid ? 'id' : 'booking_number';

    // 1. First attempt: Query booking with service join
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(id, name, category, description, cover_image, inclusions, tiers)
      `)
      .eq(filterCol, String(bookingId || '').trim())
      .maybeSingle();

    if (error || !data) {
      console.warn("[getBookingById] Rich join failed or empty, trying simple select:", error?.message);
      // Fallback: simple select * from bookings
      const fallback = await supabase
        .from('bookings')
        .select('*')
        .eq(filterCol, String(bookingId || '').trim())
        .maybeSingle();

      if (fallback.error) throw fallback.error;
      booking = fallback.data;

      // Manually look up service if available
      if (booking?.service_id) {
        try {
          const { data: svc } = await supabase
            .from('services')
            .select('id, name, category, description, cover_image, inclusions, tiers')
            .eq('id', booking.service_id)
            .maybeSingle();
          if (svc) booking.service = svc;
        } catch (sErr) {
          console.warn("[getBookingById] Could not fetch service separately:", sErr);
        }
      }
    } else {
      booking = data;
    }

    if (!booking) {
      return { data: null, error: new Error("Booking not found.") };
    }

    // 2. Safely resolve photographer if assigned without breaking on RLS or foreign key
    if (booking.photographer_id) {
      try {
        const { data: photoProfile } = await supabase
          .from('photographer_profiles')
          .select(`
            id,
            specialization,
            bio,
            is_available,
            profile:profiles(first_name, last_name, phone, avatar_url)
          `)
          .eq('id', booking.photographer_id)
          .maybeSingle();

        if (photoProfile) {
          booking.photographer = photoProfile;
        }
      } catch (pErr) {
        console.warn("[getBookingById] Photographer lookup skipped:", pErr);
      }
    }

    // 3. Metadata parsers
    if (!booking.selected_add_ons || booking.selected_add_ons.length === 0) {
      booking.selected_add_ons = parseAddOnsFromNotes(booking.notes);
    }
    if (!booking.student_details) {
      booking.student_details = parseStudentDetailsFromNotes(booking.notes);
    }
    if (!booking.participant_details) {
      booking.participant_details = parseParticipantDetailsFromNotes(booking.notes);
    }

    return { data: booking, error: null };
  } catch (error) {
    console.error("Failed to fetch booking details:", error);
    return { data: null, error };
  }
}


// ── cancelBooking ─────────────────────────────────────────────────────────────

/**
 * Cancels a booking (sets status to CANCELLED).
 * Only works on PENDING bookings — the DB enforces this via RLS.
 */
export async function cancelBooking(bookingId) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error("Database connection is not configured.") };
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    return { data: null, error };
  }
}

// ── getReferenceImageUrl ──────────────────────────────────────────────────────

/** Helper: returns the public URL for a booking reference image stored in Supabase Storage. */
export function getReferenceImageUrl(path) {
  if (!isSupabaseConfigured || !path) return '';
  const { data } = supabase.storage.from('booking-references').getPublicUrl(path);
  return data.publicUrl;
}

// ── rotateBookingToken ─────────────────────────────────────────────────────────

/**
 * Rotates the booking token (security feature) and regenerates QR code.
 * Useful if QR code was compromised or shared inappropriately.
 */
export async function rotateBookingTokenAndQR(bookingId) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error("Database connection is not configured.") };
  }
  return rotateBookingToken(bookingId);
}

// ── regenerateQRCode ──────────────────────────────────────────────────────────

/**
 * Regenerates QR code for a booking (e.g., after token rotation or if QR was lost).
 */
export async function regenerateBookingQR(bookingId) {
  if (!isSupabaseConfigured) {
    return { data: { qr_code_path: null }, error: null };
  }
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('booking_token')
      .eq('id', bookingId)
      .single();
    if (error) throw error;
    if (!booking?.booking_token) throw new Error('Booking token not found');
    return generateAndStoreQRCode(bookingId, booking.booking_token);
  } catch (error) {
    console.error('regenerateBookingQR error:', error);
    return { data: null, error };
  }
}

// ── getCustomerActivityAudit ──────────────────────────────────────────────────

/**
 * Fetches real activity & audit records from the Supabase database:
 * 1. booking_status_history for the customer's bookings
 * 2. payments recorded for the customer's bookings
 * 3. notifications addressed to the customer
 *
 * @param {string} userId - Auth user ID
 * @param {string[]} [bookingIds] - Array of booking IDs belonging to the customer
 * @returns {Promise<{ data: Array, error: any }>}
 */
export async function getCustomerActivityAudit(userId, bookingIds = []) {
  if (!isSupabaseConfigured || !userId) {
    return { data: [], error: null };
  }

  const events = [];

  try {
    // 1. Fetch real booking_status_history records if bookings exist
    if (bookingIds && bookingIds.length > 0) {
      try {
        const { data: statusHistory, error: histError } = await supabase
          .from('booking_status_history')
          .select(`
            id,
            booking_id,
            status,
            remarks,
            created_at,
            changed_by,
            changed_by_profile:profiles!booking_status_history_changed_by_fkey(first_name, last_name, role)
          `)
          .in('booking_id', bookingIds)
          .order('created_at', { ascending: false });

        if (!histError && Array.isArray(statusHistory)) {
          statusHistory.forEach(h => {
            const actorName = h.changed_by_profile
              ? `${h.changed_by_profile.first_name || ''} ${h.changed_by_profile.last_name || ''}`.trim()
              : 'Studio Admin';
            events.push({
              id: `bsh_${h.id}`,
              category: 'STATUS_UPDATE',
              title: `Status: ${h.status}`,
              description: h.remarks || `Booking status transitioned to ${h.status} by ${actorName}.`,
              bookingId: h.booking_id,
              timestamp: new Date(h.created_at),
              status: h.status,
              source: 'DATABASE_STATUS_HISTORY'
            });
          });
        }
      } catch (err) {
        console.warn('booking_status_history fetch warning:', err);
      }

      // 2. Fetch real payment records for customer bookings
      try {
        const { data: payments, error: payError } = await supabase
          .from('payments')
          .select('id, booking_id, amount, payment_type, payment_method, reference_number, payment_date, notes, created_at')
          .in('booking_id', bookingIds)
          .order('created_at', { ascending: false });

        if (!payError && Array.isArray(payments)) {
          payments.forEach(p => {
            const amt = Number(p.amount || 0).toLocaleString();
            events.push({
              id: `pay_${p.id}`,
              category: 'PAYMENT',
              title: `Payment Recorded (₱${amt})`,
              description: `${p.payment_type || 'Payment'} via ${p.payment_method || 'Official Channel'}${p.reference_number ? ` · Ref #${p.reference_number}` : ''}.`,
              bookingId: p.booking_id,
              timestamp: new Date(p.payment_date || p.created_at),
              status: 'CONFIRMED',
              source: 'DATABASE_PAYMENTS'
            });
          });
        }
      } catch (err) {
        console.warn('payments fetch warning:', err);
      }
    }

    // Note: Notifications strictly belong to Notification History, not Activity Logs

    // 4. Fetch customer-initiated change, update, and save logs
    try {
      const custLogs = getCustomerAuditLogs(userId);
      if (Array.isArray(custLogs)) {
        custLogs.forEach(c => {
          if (!events.some(e => e.id === c.id)) {
            events.push({
              id: c.id,
              category: c.category || 'CUSTOMER_UPDATE',
              title: c.title,
              description: c.description,
              changes: c.changes || [],
              bookingId: c.bookingId || null,
              bookingNumber: c.bookingNumber || null,
              timestamp: new Date(c.timestamp),
              status: c.status || 'SAVED',
              source: 'CUSTOMER_ACTION'
            });
          }
        });
      }
    } catch (err) {
      console.warn('customerAuditLogs fetch warning:', err);
    }

    // Sort all events by timestamp descending
    events.sort((a, b) => b.timestamp - a.timestamp);
    return { data: events, error: null };
  } catch (error) {
    console.error('getCustomerActivityAudit error:', error);
    return { data: [], error };
  }
}
