import { broadcastAvailabilityChange } from './liveAvailabilityService';
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { generateAndStoreQRCode, rotateBookingToken } from './qrService';
import { getCustomerAuditLogs, recordCustomerAction } from './customerAuditService';
import {
  validateUploadFile,
  sanitizeFileName,
  sanitizeText,
  validateBookingSecurity
} from '../lib/securityValidator';

export const SERVICE_SLUG_TO_UUID = {
  "senior-high-packages": "1471388e-b74f-41ec-96c8-1d220d557a89",
  "studio-packages": "1471388e-b74f-41ec-96c8-1d220d557a89",
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

/**
 * Normalizes any user/UI time string (e.g. "8:00 AM – 9:00 AM", "1:00 PM – 2:00 PM",
 * "Full-Day School Batch Pictorial (8:00 AM – 5:00 PM)", "08:00") into a PostgreSQL-compatible
 * TIME format ("HH:MM:SS").
 */
export function toDatabaseTime(timeStr) {
  if (!timeStr) return null;
  const s = String(timeStr).trim();
  // Already in HH:MM:SS or HH:MM 24-hour format
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    return s.length === 5 ? `${s}:00` : s;
  }
  // Extract first time sequence (e.g. "8:00 AM", "1:00 PM", "8:00")
  const match = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] || "00";
  const modifier = match[3] ? match[3].toLowerCase() : null;

  if (modifier === "pm" && hours < 12) {
    hours += 12;
  } else if (modifier === "am" && hours === 12) {
    hours = 0;
  }

  if (isNaN(hours) || hours < 0 || hours > 23) return null;
  return `${String(hours).padStart(2, '0')}:${minutes}:00`;
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
      preferred_time: toDatabaseTime(bookingData.preferred_time),
      location: bookingData.location || "Studio",
      notes: consolidatedNotes || null,
      total_amount: bookingData.total_amount || 0,
      down_payment_amount: bookingData.down_payment_amount || 0,
      remaining_balance: Math.max(0, (parseFloat(bookingData.total_amount) || 0) - (parseFloat(bookingData.down_payment_amount) || 0)),
      status: 'PENDING',
      payment_status: 'UNPAID',
      reference_images: uploadedPaths,
      booking_token: generatedToken,
      booking_for: bookingData.participant_details?.booking_for || (bookingData.notes?.includes('• Booking For: Someone Else') ? 'someone_else' : 'myself'),
      participant_name: bookingData.participant_details?.full_name || null,
      participant_phone: bookingData.participant_details?.phone || null,
      participant_email: bookingData.participant_details?.email || null,
      participant_relationship: bookingData.participant_details?.relationship || null,
      participant_details: bookingData.participant_details || null,
      student_details: bookingData.student_details || null,
      school: bookingData.student_details?.school || null,
      school_address: bookingData.student_details?.school_address || null,
      track: bookingData.student_details?.course || null,
      batch: bookingData.student_details?.batch || null,
      section: bookingData.student_details?.section || null,
      student_id: bookingData.student_details?.student_id || null,
      yearbook_motto: bookingData.student_details?.yearbook_motto || null,
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
            .eq('role', 'admin');

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

    invalidateCustomerBookingsCache(bookingData.customer_id);

    return { data, error: null };
  } catch (error) {
    console.error("Booking creation failed:", error);
    return { data: null, error };
  }
}

// ── Metadata Parsers for Notes fallback ───────────────────────────────────────
export function parseStudentDetailsFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return null;

  const cleanVal = (v) => {
    if (!v) return '';
    const trimmed = v.trim();
    if (/^(?:n\/?a|none|null|—|-)$/i.test(trimmed)) return '';
    return trimmed;
  };

  const student_name = cleanVal(notes.match(/•\s*Student\s*Name:\s*([^\n\r]+)/i)?.[1]);
  const middle_name = cleanVal(notes.match(/•\s*Middle\s*Name:\s*([^\n\r]+)/i)?.[1]);
  const education_type = cleanVal(notes.match(/•\s*Type:\s*([^\n\r]+)/i)?.[1]);
  const booking_mode = cleanVal(notes.match(/•\s*(?:Booking\s*Mode|Agreement(?:\s*Status)?):\s*([^\n\r]+)/i)?.[1]);
  const school = cleanVal(notes.match(/•\s*(?:School|University|College|Institution):\s*([^\n\r]+)/i)?.[1]);
  const school_address = cleanVal(notes.match(/•\s*(?:Campus(?:\s*(?:\/|&)\s*(?:Address|Branch))?|School\s*Address):\s*([^\n\r]+)/i)?.[1]);
  const course = cleanVal(notes.match(/•\s*(?:Track|Degree|Program|Strand|Course)(?:\s*(?:\/|&)\s*(?:Track|Degree|Program|Strand|Course))*:\s*([^\n\r]+)/i)?.[1]);
  const grade_year = cleanVal(notes.match(/•\s*Grade(?:\s*\/\s*Year)?:\s*([^\n\r]+)/i)?.[1]);
  const batch = cleanVal(notes.match(/•\s*(?:Batch|Graduation\s*Year|Graduating\s*Batch):\s*([^\n\r]+)/i)?.[1]);
  const section = cleanVal(notes.match(/•\s*Section(?:\s*(?:\/|&)\s*Batch)?:\s*([^\n\r]+)/i)?.[1]);
  const student_id = cleanVal(notes.match(/•\s*Student\s*ID(?:\s*Number)?:\s*([^\n\r]+)/i)?.[1]);
  const yearbook_motto = cleanVal(notes.match(/•\s*(?:Yearbook\s*)?Motto:\s*([^\n\r]+)/i)?.[1]);
  const schedule_note = cleanVal(notes.match(/•\s*(?:Schedule\s*)?Note:\s*([^\n\r]+)/i)?.[1]);

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

export function parseDeliveryDetailsFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return null;

  const match = notes.match(/\[DELIVERY\s*&\s*CLAIMING\s*DETAILS\]([\s\S]*?)(?=\n\n\[|$)/i);
  if (!match) return null;

  const block = match[1];
  const modeRaw = block.match(/•\s*Fulfillment\s*Mode:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const recipient_name = block.match(/•\s*Recipient\s*Name:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const recipient_phone = block.match(/•\s*Recipient\s*Phone:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const region = block.match(/•\s*Region:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const province = block.match(/•\s*Province:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const city = block.match(/•\s*City\s*\/\s*Municipality:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const barangay = block.match(/•\s*Barangay:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const street = block.match(/•\s*Street\s*\/\s*House\s*No\.:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const delivery_address = block.match(/•\s*Delivery\s*Address:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const delivery_instructions = block.match(/•\s*Delivery\s*Instructions:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const saved_at = block.match(/•\s*Saved\s*At:\s*([^\n\r]+)/i)?.[1]?.trim() || '';

  const fulfillment_mode = /delivery|courier|shipping/i.test(modeRaw) ? 'STUDIO_DELIVERY' : 'STUDIO_PICKUP';

  return {
    fulfillment_mode,
    recipient_name: recipient_name === 'N/A' ? '' : recipient_name,
    recipient_phone: recipient_phone === 'N/A' ? '' : recipient_phone,
    region: region === 'N/A' ? '' : region,
    province: province === 'N/A' ? '' : province,
    city: city === 'N/A' ? '' : city,
    barangay: barangay === 'N/A' ? '' : barangay,
    street: street === 'N/A' ? '' : street,
    delivery_address: delivery_address === 'N/A' ? '' : delivery_address,
    delivery_instructions: delivery_instructions === 'N/A' ? '' : delivery_instructions,
    saved_at: saved_at === 'N/A' ? '' : saved_at,
  };
}

// ── In-Memory Booking Cache ──────────────────────────────────────────────────
const customerBookingsCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function getCachedCustomerBookings(customerId) {
  if (!customerId) return null;
  const entry = customerBookingsCache.get(customerId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
  return entry.data;
}

export function invalidateCustomerBookingsCache(customerId = null) {
  if (customerId) {
    customerBookingsCache.delete(customerId);
  } else {
    customerBookingsCache.clear();
  }
}

// ── getCustomerBookings ───────────────────────────────────────────────────────

/**
 * Retrieves all bookings for a specific customer, ordered by newest first.
 * Supports smart in-memory caching to avoid skeleton flashing on stable networks.
 */
export async function getCustomerBookings(customerId, { forceRefresh = false } = {}) {
  if (!isSupabaseConfigured) {
    return { data: [], error: new Error("Database connection is not configured.") };
  }

  // Fast-path: return cached data immediately if available and fresh
  if (!forceRefresh) {
    const cached = getCachedCustomerBookings(customerId);
    if (cached) {
      return { data: cached, error: null, fromCache: true };
    }
  }

  try {
    let bookings = [];
    // Try clean join with services and photographer (filtering out soft-deleted bookings)
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(id, name, category, cover_image, inclusions, tiers),
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
          service:services(id, name, category, cover_image, inclusions, tiers)
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

      // Batch load photo_outputs so every booking knows if soft-copies are ready
      if (bookings.length > 0) {
        const bIds = bookings.map(b => b.id).filter(Boolean);
        try {
          const { data: outputs } = await supabase
            .from('photo_outputs')
            .select('id, booking_id, file_name, file_path, file_type, file_size, status, created_at')
            .in('booking_id', bIds)
            .order('created_at', { ascending: false });

          if (outputs) {
            const outputsByBooking = {};
            outputs.forEach(o => {
              if (!outputsByBooking[o.booking_id]) outputsByBooking[o.booking_id] = [];
              outputsByBooking[o.booking_id].push(o);
            });
            bookings.forEach(b => {
              b.photo_outputs = outputsByBooking[b.id] || [];
              b.has_soft_copies = b.photo_outputs.length > 0;
            });
          }
        } catch (oErr) {
          console.warn("[getCustomerBookings] photo_outputs batch lookup skipped:", oErr);
        }
      }

      bookings.forEach(b => {
        if (!b.selected_add_ons || b.selected_add_ons.length === 0) {
          b.selected_add_ons = parseAddOnsFromNotes(b.notes);
        }
        if (!b.student_details || typeof b.student_details !== 'object') {
          b.student_details = parseStudentDetailsFromNotes(b.notes) || {};
        }
        if (b.school) b.student_details.school = b.school;
        if (b.school_address) b.student_details.school_address = b.school_address;
        if (b.track) b.student_details.course = b.track;
        if (b.batch) b.student_details.batch = b.batch;
        if (b.section) b.student_details.section = b.section;
        if (b.student_id) b.student_details.student_id = b.student_id;
        if (b.yearbook_motto) b.student_details.yearbook_motto = b.yearbook_motto;

        if (!b.participant_details || typeof b.participant_details !== 'object') {
          b.participant_details = parseParticipantDetailsFromNotes(b.notes) || {};
        }
        if (b.participant_name) b.participant_details.full_name = b.participant_name;
        if (b.participant_phone) b.participant_details.phone = b.participant_phone;
        if (b.participant_email) b.participant_details.email = b.participant_email;
        if (b.participant_relationship) b.participant_details.relationship = b.participant_relationship;
        if (b.booking_for) b.participant_details.booking_for = b.booking_for;

        if (!b.delivery_details) {
          b.delivery_details = parseDeliveryDetailsFromNotes(b.notes);
        }
      });
    }
    if (customerId && Array.isArray(bookings)) {
      customerBookingsCache.set(customerId, { data: bookings, timestamp: Date.now() });
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

    // 2.1 Safely resolve customer profile (avatar, email, phone, name)
    if (booking.customer_id) {
      try {
        const { data: custProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone, avatar_url')
          .eq('id', booking.customer_id)
          .maybeSingle();

        if (custProfile) {
          booking.customer = custProfile;
        }
      } catch (cErr) {
        console.warn("[getBookingById] Customer profile lookup skipped:", cErr);
      }
    }

    // 3. Attach photo_outputs if present in database
    try {
      const { data: outputs } = await supabase
        .from('photo_outputs')
        .select('id, booking_id, file_name, file_path, file_type, file_size, status, created_at')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false });
      if (outputs) {
        booking.photo_outputs = outputs;
        booking.has_soft_copies = outputs.length > 0;
      }
    } catch (oErr) {
      console.warn("[getBookingById] photo_outputs lookup skipped:", oErr);
    }

    // 4. Metadata parsers
    if (!booking.selected_add_ons || booking.selected_add_ons.length === 0) {
      booking.selected_add_ons = parseAddOnsFromNotes(booking.notes);
    }
    if (!booking.student_details || typeof booking.student_details !== 'object') {
      booking.student_details = parseStudentDetailsFromNotes(booking.notes) || {};
    }
    if (booking.school) booking.student_details.school = booking.school;
    if (booking.school_address) booking.student_details.school_address = booking.school_address;
    if (booking.track) booking.student_details.course = booking.track;
    if (booking.batch) booking.student_details.batch = booking.batch;
    if (booking.section) booking.student_details.section = booking.section;
    if (booking.student_id) booking.student_details.student_id = booking.student_id;
    if (booking.yearbook_motto) booking.student_details.yearbook_motto = booking.yearbook_motto;

    if (!booking.participant_details || typeof booking.participant_details !== 'object') {
      booking.participant_details = parseParticipantDetailsFromNotes(booking.notes) || {};
    }
    if (booking.participant_name) booking.participant_details.full_name = booking.participant_name;
    if (booking.participant_phone) booking.participant_details.phone = booking.participant_phone;
    if (booking.participant_email) booking.participant_details.email = booking.participant_email;
    if (booking.participant_relationship) booking.participant_details.relationship = booking.participant_relationship;
    if (booking.booking_for) booking.participant_details.booking_for = booking.booking_for;

    if (!booking.delivery_details) {
      booking.delivery_details = parseDeliveryDetailsFromNotes(booking.notes);
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
    invalidateCustomerBookingsCache(data?.customer_id);
    broadcastAvailabilityChange();

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

// ── updateBookingYearbookMotto ────────────────────────────────────────────────

/**
 * Updates the yearbook motto in a booking's notes field and saves to Supabase.
 *
 * @param {string} bookingId - Booking UUID
 * @param {string} newMotto - New motto string
 * @param {string} currentNotes - Existing booking notes string
 * @param {string} [userId] - Optional auth user ID for customer audit logging
 * @returns {Promise<{ data: Object|null, updatedNotes: string|null, error: Error|null }>}
 */
export async function updateBookingYearbookMotto(bookingId, newMotto, currentNotes = '', userId = null) {
  if (!isSupabaseConfigured) {
    return { data: null, updatedNotes: null, error: new Error("Database connection is not configured.") };
  }

  const cleanMotto = String(newMotto || '').trim();
  let updatedNotes = currentNotes || '';

  if (/•\s*Yearbook\s*Motto:\s*([^\n\r]*)/i.test(updatedNotes)) {
    updatedNotes = updatedNotes.replace(
      /•\s*Yearbook\s*Motto:\s*([^\n\r]*)/i,
      `• Yearbook Motto: ${cleanMotto || 'N/A'}`
    );
  } else if (updatedNotes.includes('[STUDENT DETAILS]')) {
    updatedNotes = updatedNotes.replace(
      '[STUDENT DETAILS]',
      `[STUDENT DETAILS]\n• Yearbook Motto: ${cleanMotto || 'N/A'}`
    );
  } else {
    updatedNotes = `${updatedNotes}\n\n[STUDENT DETAILS]\n• Yearbook Motto: ${cleanMotto || 'N/A'}`.trim();
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        notes: updatedNotes,
        yearbook_motto: cleanMotto || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    if (userId) {
      try {
        recordCustomerAction({
          userId,
          category: 'PROFILE_UPDATE',
          title: 'Yearbook Motto Updated',
          description: cleanMotto ? `Yearbook motto saved: "${cleanMotto}"` : 'Yearbook motto reset.',
          bookingId,
          bookingNumber: data?.booking_number,
          changes: [`Yearbook Motto: ${cleanMotto || 'N/A'}`]
        });
      } catch (err) {
        console.warn('recordCustomerAction error:', err);
      }
    }

    if (userId) {
      invalidateCustomerBookingsCache(userId);
    }
    return { data, updatedNotes, error: null };
  } catch (error) {
    console.error("Failed to update yearbook motto:", error);
    return { data: null, updatedNotes: null, error };
  }
}

// ── updateBookingAcademicDetails ──────────────────────────────────────────────

/**
 * Updates academic profile details (School, Course/Strand, Section, Batch, Student ID, Motto)
 * directly in the booking's notes column in Supabase with atomic consistency.
 *
 * @param {string} bookingId - Booking UUID
 * @param {Object} academicData - { school, school_address, course, batch, section, student_id, yearbook_motto, student_name, education_type }
 * @param {string} currentNotes - Existing booking notes string
 * @param {string} [userId] - Optional auth user ID for cache invalidation
 * @returns {Promise<{ data: Object|null, updatedNotes: string|null, error: Error|null }>}
 */
export async function updateBookingAcademicDetails(bookingId, academicData = {}, currentNotes = '', userId = null) {
  if (!isSupabaseConfigured) {
    return { data: null, updatedNotes: null, error: new Error("Database connection is not configured.") };
  }

  const school = sanitizeText(academicData.school || '', 150);
  const schoolAddress = sanitizeText(academicData.school_address || '', 200);
  const course = sanitizeText(academicData.course || '', 150);
  const batch = sanitizeText(academicData.batch || '', 50);
  const section = sanitizeText(academicData.section || '', 100);
  const studentId = sanitizeText(academicData.student_id || '', 100);
  const motto = sanitizeText(academicData.yearbook_motto || '', 300);
  const studentName = sanitizeText(academicData.student_name || '', 150);
  const educationType = sanitizeText(academicData.education_type || '', 100);

  const lines = [
    '[STUDENT & YEARBOOK DETAILS]',
    studentName ? `• Student Name: ${studentName}` : null,
    educationType ? `• Type: ${educationType}` : null,
    `• School: ${school || 'N/A'}`,
    schoolAddress ? `• Campus / Address: ${schoolAddress}` : null,
    `• Track / Strand / Program: ${course || 'N/A'}`,
    `• Batch: ${batch || 'N/A'}`,
    `• Section: ${section || 'N/A'}`,
    `• Student ID: ${studentId || 'N/A'}`,
    motto ? `• Yearbook Motto: ${motto}` : null,
  ].filter(Boolean);

  const newBlock = lines.join('\n');
  let updatedNotes = currentNotes || '';

  const blockRegex = /\[(?:STUDENT & YEARBOOK DETAILS|STUDENT DETAILS)\][\s\S]*?(?=\n\n\[|$)/i;
  if (blockRegex.test(updatedNotes)) {
    updatedNotes = updatedNotes.replace(blockRegex, newBlock);
  } else {
    updatedNotes = updatedNotes ? `${newBlock}\n\n${updatedNotes}` : newBlock;
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        notes: updatedNotes,
        school: school || null,
        school_address: schoolAddress || null,
        track: course || null,
        batch: batch || null,
        section: section || null,
        student_id: studentId || null,
        yearbook_motto: motto || null,
        student_details: {
          student_name: studentName,
          education_type: educationType,
          school,
          school_address: schoolAddress,
          course,
          batch,
          section,
          student_id: studentId,
          yearbook_motto: motto
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    if (userId) {
      invalidateCustomerBookingsCache(userId);
    }
    return { data, updatedNotes, error: null };
  } catch (error) {
    console.error("Failed to update academic details:", error);
    return { data: null, updatedNotes: null, error };
  }
}

// ── updateBookingDeliveryDetails ──────────────────────────────────────────────

/**
 * Saves delivery & claiming details into the booking's notes column in Supabase
 * and syncs with the customer's profile studio_specs for studio-wide visibility.
 *
 * @param {string} bookingId - Booking UUID
 * @param {Object} deliveryData - { fulfillment_mode, recipient_name, recipient_phone, delivery_address, delivery_instructions }
 * @param {string} currentNotes - Existing booking notes string
 * @param {string} [userId] - Optional auth user ID for profile sync & customer audit logging
 * @returns {Promise<{ data: Object|null, updatedNotes: string|null, deliveryDetails: Object|null, error: Error|null }>}
 */
export async function updateBookingDeliveryDetails(bookingId, deliveryData = {}, currentNotes = '', userId = null) {
  if (!isSupabaseConfigured) {
    return { data: null, updatedNotes: null, deliveryDetails: null, error: new Error("Database connection is not configured.") };
  }

  const mode = deliveryData.fulfillment_mode === 'STUDIO_DELIVERY' ? 'STUDIO_DELIVERY' : 'STUDIO_PICKUP';
  const cleanRecipient = sanitizeText(deliveryData.recipient_name || '', 150);
  const cleanPhone = sanitizeText(deliveryData.recipient_phone || '', 50);
  const cleanRegion = sanitizeText(deliveryData.region || '', 120);
  const cleanProvince = sanitizeText(deliveryData.province || '', 120);
  const cleanCity = sanitizeText(deliveryData.city || '', 120);
  const cleanBarangay = sanitizeText(deliveryData.barangay || '', 120);
  const cleanStreet = sanitizeText(deliveryData.street || '', 200);
  const cleanAddress = sanitizeText(deliveryData.delivery_address || '', 350);
  const cleanInstructions = sanitizeText(deliveryData.delivery_instructions || '', 300);
  const savedAtIso = deliveryData.saved_at || new Date().toISOString();

  const deliveryBlock = [
    '[DELIVERY & CLAIMING DETAILS]',
    `• Fulfillment Mode: ${mode === 'STUDIO_DELIVERY' ? 'Direct Delivery' : 'Studio Pickup'}`,
    `• Recipient Name: ${cleanRecipient || 'N/A'}`,
    `• Recipient Phone: ${cleanPhone || 'N/A'}`,
    ...(mode === 'STUDIO_DELIVERY'
      ? [
          `• Region: ${cleanRegion || 'N/A'}`,
          `• Province: ${cleanProvince || 'N/A'}`,
          `• City / Municipality: ${cleanCity || 'N/A'}`,
          `• Barangay: ${cleanBarangay || 'N/A'}`,
          `• Street / House No.: ${cleanStreet || 'N/A'}`,
        ]
      : []),
    `• Delivery Address: ${mode === 'STUDIO_DELIVERY' ? (cleanAddress || 'N/A') : 'Studio Counter (311 Rizal Street, City of Naga, Cebu)'}`,
    `• Delivery Instructions: ${cleanInstructions || 'N/A'}`,
    `• Saved At: ${savedAtIso}`,
  ].join('\n');

  let updatedNotes = currentNotes || '';
  if (/\[DELIVERY\s*&\s*CLAIMING\s*DETAILS\][\s\S]*?(?=\n\n\[|$)/i.test(updatedNotes)) {
    updatedNotes = updatedNotes.replace(
      /\[DELIVERY\s*&\s*CLAIMING\s*DETAILS\][\s\S]*?(?=\n\n\[|$)/i,
      deliveryBlock
    );
  } else {
    updatedNotes = updatedNotes ? `${updatedNotes.trim()}\n\n${deliveryBlock}` : deliveryBlock;
  }

  const deliveryDetails = {
    fulfillment_mode: mode,
    recipient_name: cleanRecipient,
    recipient_phone: cleanPhone,
    region: mode === 'STUDIO_DELIVERY' ? cleanRegion : '',
    province: mode === 'STUDIO_DELIVERY' ? cleanProvince : '',
    city: mode === 'STUDIO_DELIVERY' ? cleanCity : '',
    barangay: mode === 'STUDIO_DELIVERY' ? cleanBarangay : '',
    street: mode === 'STUDIO_DELIVERY' ? cleanStreet : '',
    delivery_address: mode === 'STUDIO_DELIVERY' ? cleanAddress : 'Studio Counter (311 Rizal Street, City of Naga, Cebu)',
    delivery_instructions: cleanInstructions,
    saved_at: savedAtIso,
  };

  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    if (userId) {
      try {
        recordCustomerAction({
          userId,
          category: 'DELIVERY_UPDATE',
          title: mode === 'STUDIO_DELIVERY' ? 'Booking Delivery Address Saved' : 'Studio Counter Pickup Selected',
          description: mode === 'STUDIO_DELIVERY'
            ? `Saved delivery destination: ${cleanAddress || 'Specified address'}`
            : 'Selected in-person claiming at E-Kodak Studio counter.',
          bookingId,
          bookingNumber: data?.booking_number,
          changes: [
            `Fulfillment: ${mode === 'STUDIO_DELIVERY' ? 'Direct Delivery' : 'Studio Pickup'}`,
            cleanRecipient ? `Recipient: ${cleanRecipient}${cleanPhone ? ` (${cleanPhone})` : ''}` : null,
            cleanAddress && mode === 'STUDIO_DELIVERY' ? `Address: ${cleanAddress}` : null,
            cleanInstructions ? `Notes: ${cleanInstructions}` : null,
          ].filter(Boolean),
        });
      } catch (err) {
        console.warn('recordCustomerAction error:', err);
      }
    }

    if (userId) {
      invalidateCustomerBookingsCache(userId);
    }
    return { data, updatedNotes, deliveryDetails, error: null };
  } catch (error) {
    console.error("Failed to update booking delivery details:", error);
    return { data: null, updatedNotes: null, deliveryDetails: null, error };
  }
}
