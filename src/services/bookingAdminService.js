/**
 * bookingAdminService.js
 * ======================
 * All Supabase queries for the Admin/Staff Booking Management module.
 * RLS enforces that only staff/admin roles can access these endpoints.
 * Never bypasses Row Level Security — uses the standard anon client only.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateAndStoreQRCode } from './qrService';
import { parseStudentDetailsFromNotes, parseAddOnsFromNotes, parseParticipantDetailsFromNotes } from './bookingService';
import { recordAdminActivity } from './workstationService';

// ── Constants ──────────────────────────────────────────────────────────────────

export const ALL_BOOKING_STATUSES = [
  'PENDING', 'CONFIRMED', 'PHOTOGRAPHER_ASSIGNED',
  'CAPTURE', 'EDITING', 'PRINTING', 'READY', 'COMPLETED',
  'REJECTED', 'CANCELLED',
];

export const ALL_PAYMENT_STATUSES = ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED'];

export const PENDING_ACTIONS = ['CONFIRMED', 'REJECTED'];
export const CONFIRMED_ACTIONS = []; // Photographer assignment is a future module

// Statuses that a staff member can advance to from a given status.
// Only linear transitions through the backend lifecycle are allowed.
// The DB constraint (bookings_status_check) guards the values, but ordering
// is an application-level rule — not a DB-enforced trigger in the current schema.
export const NEXT_STATUS_MAP = {
  CONFIRMED:             'PHOTOGRAPHER_ASSIGNED',
  PHOTOGRAPHER_ASSIGNED: 'CAPTURE',
  CAPTURE:               'EDITING',
  EDITING:               'PRINTING',
  PRINTING:              'READY',
  READY:                 'COMPLETED',
};

// ── List Queries ───────────────────────────────────────────────────────────────

/**
 * getAdminBookings
 * ----------------
 * Returns a paginated, filtered, searched list of bookings for admin/staff.
 * All filtering is done server-side via PostgREST to avoid loading the full table.
 *
 * @param {object} opts
 *   @param {number}  opts.page         1-indexed page number
 *   @param {number}  opts.pageSize     rows per page
 *   @param {string}  opts.search       free-text search (booking_number match)
 *   @param {string}  opts.statusFilter booking status to filter by ('' = all)
 *   @param {string}  opts.paymentFilter payment status to filter by ('' = all)
 *   @param {string}  opts.sortBy       column to sort by
 *   @param {boolean} opts.sortAsc      sort direction
 */
export async function getAdminBookings({
  page = 1,
  pageSize = 15,
  search = '',
  statusFilter = '',
  paymentFilter = '',
  sortBy = 'created_at',
  sortAsc = false,
  isDeleted = false,
} = {}) {
  if (!isSupabaseConfigured) {
    return { data: [], count: 0, error: new Error("Database connection is not configured.") };
  }

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('bookings')
      .select(
        `id,
         booking_number,
         status,
         payment_status,
         event_date,
         preferred_time,
         location,
         notes,
         reference_images,
         tier_name,
         customer_id,
         service_id,
         photographer_id,
         is_deleted,
         deleted_at,
         deletion_reason,
         created_at,
         updated_at,
         confirmed_at,
         payment_confirmed_at,
         total_amount,
         down_payment_amount,
         remaining_balance,
         service:services(id, name, category, base_price, tiers, inclusions),
         customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, email, phone, address, studio_specs),
         photographer:photographer_profiles!bookings_photographer_id_fkey(
           id,
           specialization,
           profile:profiles(first_name, last_name)
         )`,
        { count: 'exact' }
      )
      .order(sortBy, { ascending: sortAsc })
      .range(from, to);

    if (isDeleted) {
      query = query.eq('is_deleted', true);
    } else {
      query = query.or('is_deleted.is.null,is_deleted.eq.false');
    }

    if (statusFilter)  query = query.eq('status', statusFilter);
    if (paymentFilter) query = query.eq('payment_status', paymentFilter);

    if (search.trim()) {
      const term = search.trim().replace(/[,()*\\]/g, '');
      if (term) {
        try {
          const { data: matchedProfiles } = await supabase
            .from('profiles')
            .select('id')
            .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`);

          const profileIds = (matchedProfiles || []).map(p => p.id);
          if (profileIds.length > 0) {
            query = query.or(`booking_number.ilike.%${term}%,notes.ilike.%${term}%,customer_id.in.(${profileIds.join(',')})`);
          } else {
            query = query.or(`booking_number.ilike.%${term}%,notes.ilike.%${term}%`);
          }
        } catch {
          query = query.or(`booking_number.ilike.%${term}%,notes.ilike.%${term}%`);
        }
      }
    }

    const { data, error, count } = await query;
    if (error) throw error;

    if (Array.isArray(data)) {
      data.forEach(b => {
        b.student_details = parseStudentDetailsFromNotes(b.notes);
        b.selected_add_ons = parseAddOnsFromNotes(b.notes);
        b.participant_details = parseParticipantDetailsFromNotes(b.notes);
        if (b.photographer) {
          b.photographer.first_name = b.photographer.first_name || b.photographer.profile?.first_name || '';
          b.photographer.last_name = b.photographer.last_name || b.photographer.profile?.last_name || '';
        }
      });
    }

    return { data, count, error: null };
  } catch (error) {
    console.error('getAdminBookings error:', error);
    return { data: null, count: 0, error };
  }
}

// ── Detail Query ───────────────────────────────────────────────────────────────

/**
 * getBookingDetail
 * ----------------
 * Returns the full detail of a single booking by its UUID.
 * Joins profiles, services, photographer_profiles, payments,
 * and booking_status_history.
 */
export async function getBookingDetail(id) {
  if (!id) return { data: null, error: new Error('Booking ID is required') };

  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Database connection is not configured.') };
  }

  try {
    // 1. Primary booking fetch with clean column references (strictly existing schema)
    let { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        booking_token,
        status,
        payment_status,
        event_date,
        preferred_time,
        location,
        notes,
        reference_images,
        total_amount,
        down_payment_amount,
        remaining_balance,
        qr_code_path,
        created_at,
        updated_at,
        tier_name,
        confirmed_at,
        payment_confirmed_at,
        customer:profiles!bookings_customer_id_fkey(
          id, first_name, last_name, email, phone, address, studio_specs, avatar_url, bio, is_active, created_at
        ),
        service:services(
          id, name, description, category, cover_image, inclusions, tiers
        ),
        photographer:photographer_profiles!bookings_photographer_id_fkey(
          id,
          specialization,
          bio,
          is_available,
          profile:profiles(first_name, last_name, phone, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (bookingErr) {
      console.warn('Complex join failed, falling back to simple query:', bookingErr.message);
      const { data: fallbackBooking, error: fallbackErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

      if (fallbackErr) throw fallbackErr;

      // Populate relations safely
      if (fallbackBooking?.customer_id) {
        const { data: cust } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone, address, studio_specs, avatar_url, bio, is_active, created_at')
          .eq('id', fallbackBooking.customer_id)
          .maybeSingle();
        fallbackBooking.customer = cust;
      }
      if (fallbackBooking?.service_id) {
        const { data: srv } = await supabase
          .from('services')
          .select('id, name, description, category, cover_image, inclusions, tiers')
          .eq('id', fallbackBooking.service_id)
          .maybeSingle();
        fallbackBooking.service = srv;
      }
      if (fallbackBooking?.photographer_id) {
        const { data: ph } = await supabase
          .from('photographer_profiles')
          .select('id, specialization, bio, is_available, profile:profiles(first_name, last_name, phone, avatar_url)')
          .eq('id', fallbackBooking.photographer_id)
          .maybeSingle();
        fallbackBooking.photographer = ph;
      }

      booking = fallbackBooking;
    }

    if (!booking) {
      return { data: null, error: new Error('Booking not found.') };
    }

    // 2. Fetch payments separately so a payment relation issue never breaks the entire booking view
    try {
      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, payment_type, payment_method, reference_number, payment_date, notes, created_at')
        .eq('booking_id', id)
        .order('payment_date', { ascending: true });
      booking.payments = payments || [];
    } catch {
      booking.payments = [];
    }

    // 3. Fetch status history separately
    try {
      const { data: history } = await supabase
        .from('booking_status_history')
        .select(`
          id, status, remarks, created_at, changed_by,
          changed_by_profile:profiles!booking_status_history_changed_by_fkey(first_name, last_name)
        `)
        .eq('booking_id', id)
        .order('created_at', { ascending: true });
      booking.booking_status_history = history || [];
    } catch {
      booking.booking_status_history = [];
    }

    // Parse add-ons, student details & participant details from notes
    booking.selected_add_ons = parseAddOnsFromNotes(booking.notes);
    booking.student_details = parseStudentDetailsFromNotes(booking.notes);
    booking.participant_details = parseParticipantDetailsFromNotes(booking.notes);

    return { data: booking, error: null };
  } catch (error) {
    console.error('getBookingDetail error:', error);
    return { data: null, error };
  }
}

export const getBookingDetailsAdmin = getBookingDetail;

// ── Mutation Queries ───────────────────────────────────────────────────────────

/**
 * updateBookingStatus
 * -------------------
 * Updates a booking's status and appends a history record.
 * This is the ONLY function that should mutate booking status on the frontend.
 * RLS enforces that only staff/admin can call this.
 *
 * @param {string} bookingId
 * @param {string} newStatus   — must be a value in ALL_BOOKING_STATUSES
 * @param {string} remarks     — optional notes for the history record
 * @param {string} changedById — UUID of the staff member making the change
 */
export async function updateBookingStatus(bookingId, newStatus, remarks = '', changedById) {
  try {
    // 1. Fetch current booking to get token for QR generation
    let bookingToken = null;
    if (newStatus === 'CONFIRMED') {
      const { data: booking } = await supabase
        .from('bookings')
        .select('booking_token')
        .eq('id', bookingId)
        .single();
      bookingToken = booking?.booking_token;
    }

    // 2. Update the booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // 3. Append a history record
    const { error: historyError } = await supabase
      .from('booking_status_history')
      .insert({
        booking_id: bookingId,
        status: newStatus,
        remarks: remarks || null,
        changed_by: changedById || null,
      });

    if (historyError) throw historyError;

    // 4. Generate QR code on confirmation
    if (newStatus === 'CONFIRMED' && bookingToken) {
      await generateAndStoreQRCode(bookingId, bookingToken);
    }

    // 5. Detect and log movement to admin_activity_logs
    try {
      const { data: bInfo } = await supabase
        .from('bookings')
        .select('booking_number, customer:customer_id(first_name, last_name)')
        .eq('id', bookingId)
        .maybeSingle();

      const bNum = bInfo?.booking_number || 'Order';
      const cName = bInfo?.customer ? `${bInfo.customer.first_name || ''} ${bInfo.customer.last_name || ''}`.trim() : '';

      let actType = 'STATUS_CHANGE';
      let cleanDesc = `Updated status of #${bNum} to ${newStatus.replace(/_/g, ' ')}`;
      if (newStatus === 'DELETED') {
        actType = 'BOOKING_SOFT_DELETED';
        cleanDesc = `Moved #${bNum} to Trash`;
      } else if (newStatus === 'CONFIRMED') {
        cleanDesc = `Confirmed booking #${bNum}`;
      } else if (newStatus === 'COMPLETED') {
        cleanDesc = `Marked photoshoot #${bNum} completed`;
      } else if (newStatus === 'IN_PROGRESS') {
        cleanDesc = `Started photoshoot session for #${bNum}`;
      } else if (newStatus === 'CANCELLED') {
        cleanDesc = `Cancelled booking #${bNum}`;
      }

      await recordAdminActivity({
        adminId: changedById,
        actionType: actType,
        entityType: 'booking',
        entityId: bookingId,
        entityLabel: bNum,
        description: cleanDesc,
        details: {
          status: newStatus,
          new_status: newStatus,
          remarks: remarks || null,
          booking_id: bookingId,
          booking_number: bNum,
          customer_name: cName,
        },
      });
    } catch (logErr) {
      console.warn('updateBookingStatus recordAdminActivity error:', logErr);
    }

    return { error: null };
  } catch (error) {
    console.error('updateBookingStatus error:', error);
    return { error };
  }
}

/**
 * getBookingStatusHistory
 * -----------------------
 * Fetches booking_status_history for a single booking (standalone query,
 * useful for refreshing history panel without reloading the full detail).
 */
export async function getBookingStatusHistory(bookingId) {
  try {
    const { data, error } = await supabase
      .from('booking_status_history')
      .select(`
        id, status, remarks, created_at,
        changed_by_profile:profiles!booking_status_history_changed_by_fkey(first_name, last_name)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('getBookingStatusHistory error:', error);
    return { data: null, error };
  }
}

/**
 * getStorageUrl
 * -------------
 * Returns a signed URL for a private file in the booking-references bucket.
 * The URL is valid for 60 minutes.
 */
export async function getStorageUrl(filePath, bucket = 'booking-references') {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600);

    if (error) throw error;
    return { url: data.signedUrl, error: null };
  } catch (error) {
    return { url: null, error };
  }
}

/**
 * recordPayment
 * -------------
 * Inserts a new payment record into the `payments` table.
 * Supabase DB trigger `trg_update_booking_balance` automatically recalculates
 * `remaining_balance` and `payment_status` on the parent booking.
 *
 * @param {object} paymentData
 *   @param {string} paymentData.bookingId
 *   @param {number} paymentData.amount
 *   @param {string} paymentData.paymentType - 'DOWN_PAYMENT' | 'FINAL_PAYMENT' | 'OTHER'
 *   @param {string} paymentData.paymentMethod - 'CASH' | 'BANK_TRANSFER' | 'E_WALLET' | 'OTHER'
 *   @param {string} [paymentData.referenceNumber]
 *   @param {string} [paymentData.notes]
 *   @param {string} [paymentData.recordedBy] - UUID of admin/staff profile
 */
export async function recordPayment({
  bookingId,
  amount,
  paymentType = 'DOWN_PAYMENT',
  paymentMethod = 'CASH',
  referenceNumber = '',
  notes = '',
  recordedBy = null,
}) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        amount: Number(amount),
        payment_type: paymentType,
        payment_method: paymentMethod,
        reference_number: referenceNumber?.trim() || null,
        notes: notes?.trim() || null,
        recorded_by: recordedBy || null,
        payment_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Detect and log movement to admin_activity_logs
    try {
      const { data: bInfo } = await supabase
        .from('bookings')
        .select('booking_number')
        .eq('id', bookingId)
        .maybeSingle();
      const bNum = bInfo?.booking_number || 'Order';

      await recordAdminActivity({
        adminId: recordedBy,
        actionType: 'PAYMENT_RECORD',
        entityType: 'payment',
        entityId: data?.id || null,
        entityLabel: bNum,
        description: `Recorded ${paymentType.replace(/_/g, ' ')} of ₱${Number(amount).toLocaleString()} via ${paymentMethod} for #${bNum}`,
        details: {
          payment_id: data?.id,
          booking_id: bookingId,
          booking_number: bNum,
          amount: Number(amount),
          payment_type: paymentType,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          notes,
        },
      });
    } catch (payLogErr) {
      console.warn('recordPayment recordAdminActivity error:', payLogErr);
    }

    return { data, error: null };
  } catch (error) {
    console.error('recordPayment error:', error);
    return { data: null, error };
  }
}

/**
 * confirmAndScheduleBooking
 * -------------------------
 * Approves a reserved booking, sets its pictorial schedule (date & time) and location,
 * records status history, generates QR pass, and dispatches customer notification
 * instructing them to pay downpayment in the payment dashboard.
 */
export async function confirmAndScheduleBooking({
  bookingId,
  eventDate,
  preferredTime,
  location,
  remarks = '',
  changedById = null,
}) {
  try {
    // 1. Fetch current booking to get token, booking number, customer ID
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, booking_number, booking_token, customer_id, total_amount, down_payment_amount')
      .eq('id', bookingId)
      .single();

    if (fetchErr) throw fetchErr;

    // 2. Update booking status, schedule & location
    const updatePayload = {
      status: 'CONFIRMED',
      event_date: eventDate ? eventDate.split('T')[0] : null,
      preferred_time: preferredTime || null,
      location: location || 'E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId);

    if (updateErr) throw updateErr;

    // 3. Append to status history
    await supabase.from('booking_status_history').insert({
      booking_id: bookingId,
      status: 'CONFIRMED',
      remarks: remarks || `Booking approved & pictorial scheduled for ${eventDate || 'confirmed date'} at ${location || 'Studio'}`,
      changed_by: changedById || null,
    });

    // 4. Generate & store QR pass in background
    if (booking?.booking_token) {
      generateAndStoreQRCode(bookingId, booking?.booking_token).catch(() => {});
    }

    // 5. Create customer notification
    if (booking?.customer_id) {
      await createNotification({
        userId: booking.customer_id,
        bookingId: bookingId,
        title: `Booking Approved & Reserved (#${booking.booking_number})`,
        message: `Your photoshoot session has been approved and scheduled for ${eventDate || 'confirmed date'}${location ? ` at ${location}` : ''}! Please settle your downpayment in the Payment Dashboard to finalize your reservation.`,
        notificationType: 'booking_confirmed',
      });
    }

    // 6. Detect and log movement to admin_activity_logs
    try {
      await recordAdminActivity({
        adminId: changedById,
        actionType: 'STATUS_CHANGE',
        entityType: 'booking',
        entityId: bookingId,
        entityLabel: booking.booking_number,
        description: `Approved & scheduled #${booking.booking_number} for ${eventDate || 'confirmed date'} at ${location || 'Studio'}`,
        details: {
          status: 'CONFIRMED',
          event_date: eventDate,
          preferred_time: preferredTime,
          location,
          remarks,
          booking_id: bookingId,
          booking_number: booking.booking_number,
        },
      });
    } catch (schedLogErr) {
      console.warn('confirmAndScheduleBooking recordAdminActivity error:', schedLogErr);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('confirmAndScheduleBooking error:', error);
    return { success: false, error };
  }
}

/**
 * createNotification
 * ------------------
 * Inserts a notification record into the `notifications` table for a user.
 */
export async function createNotification({
  userId,
  bookingId,
  title,
  message,
  notificationType = 'booking_status',
}) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        booking_id: bookingId || null,
        title,
        message,
        notification_type: notificationType,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.warn('createNotification error (non-fatal):', error);
    return { data: null, error };
  }
}

// ── Photographer Management & Assignment (Phase 4.4) ───────────────────────────

/**
 * getPhotographersWithWorkloadAndAvailability
 * -------------------------------------------
 * Returns photographers with their profile, specialization, active workload count,
 * next upcoming booking, and potential date/time conflicts for a target booking.
 *
 * @param {string} [eventDate]      — Target booking event_date (YYYY-MM-DD)
 * @param {string} [preferredTime]  — Target booking preferred_time
 */
// Helper to normalize any date representation (including UTC-shifted ISO timestamps) into clean 'YYYY-MM-DD'
function normalizeDateStr(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    if (val.includes('T')) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
    return val.substring(0, 10);
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return String(val).substring(0, 10);
}

/**
 * getPhotographersWithWorkloadAndAvailability
 * -------------------------------------------
 * Fetches all registered photographers (STRICTLY excluding admin accounts) with their:
 * - Active workload count (assigned active bookings)
 * - Conflict status for a target eventDate & preferredTime (checks both assigned bookings and availability records)
 * - Next upcoming shoot
 */
export async function getPhotographersWithWorkloadAndAvailability(eventDate = null, preferredTime = null) {
  try {
    // 1. Fetch photographer accounts ONLY (strictly role = photographer, never admin or staff)
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select(`
        id, first_name, last_name, phone, email, avatar_url, is_active, created_at, role,
        photographer_profile:photographer_profiles(specialization, bio, is_available)
      `)
      .eq('role', 'photographer')
      .neq('role', 'admin')
      .order('first_name', { ascending: true });

    if (profError) throw profError;

    // 2. Fetch all active bookings assigned to any photographer
    // Active statuses: neither completed, rejected, nor cancelled
    const activeStatuses = ['CONFIRMED', 'PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 'EDITING', 'PRINTING', 'READY'];
    const { data: assignedBookings, error: bError } = await supabase
      .from('bookings')
      .select('id, booking_number, photographer_id, event_date, preferred_time, status, service:services(name)')
      .in('status', activeStatuses)
      .not('photographer_id', 'is', null);

    if (bError) throw bError;

    // 3. Fetch availability records if an eventDate is given
    let availabilityRecords = [];
    if (eventDate) {
      const cleanEventDate = normalizeDateStr(eventDate);
      const { data: avData, error: avError } = await supabase
        .from('photographer_availability')
        .select('*');
      
      if (!avError && avData) {
        availabilityRecords = avData.filter(r => {
          const dStr = normalizeDateStr(r.availability_date || r.date);
          return dStr === cleanEventDate;
        });
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 4. Synthesize photographer workload and conflict data (strictly exclude admin accounts)
    const photographers = (profiles || [])
      .filter(p => p.role === 'photographer' && p.role !== 'admin' && !p.email?.toLowerCase().includes('admin'))
      .map(p => {
        const phProfile = Array.isArray(p.photographer_profile) ? p.photographer_profile[0] : p.photographer_profile;
        const avRecord = availabilityRecords.find(r => r.photographer_id === p.id);
        const specialization = phProfile?.specialization || 'Portrait & Studio Photography';
        const bio = phProfile?.bio || '';

        // All active bookings assigned to this photographer
        const myBookings = (assignedBookings || []).filter(b => b.photographer_id === p.id);
        const activeWorkloadCount = myBookings.length;

        // Find upcoming bookings (event_date >= today) sorted by date ascending
        const upcoming = myBookings
          .filter(b => b.event_date && b.event_date >= todayStr)
          .sort((a, b) => (a.event_date > b.event_date ? 1 : -1));
        const nextUpcoming = upcoming[0] || null;

        let isAvailable = false;
        let availabilityStatus = 'UNAVAILABLE';
        let hasConflict = false;
        let conflictReason = null;
        let sameDateBookings = [];

        if (!eventDate) {
          // General roster overview without a target date
          isAvailable = p.is_active && (phProfile?.is_available !== false);
          availabilityStatus = isAvailable ? 'AVAILABLE' : 'UNAVAILABLE';
        } else {
          // Specific eventDate provided: photographer MUST be active, have an explicit shift entry marked AVAILABLE for that date, and no conflicts
          const isGeneralActive = p.is_active && (phProfile?.is_available !== false);
          const cleanEventDate = normalizeDateStr(eventDate);

          if (!isGeneralActive) {
            isAvailable = false;
            hasConflict = true;
            conflictReason = !p.is_active ? 'Account inactive' : 'Photographer profile unavailable';
            availabilityStatus = 'UNAVAILABLE';
          } else if (!avRecord) {
            // No schedule shift set for this date!
            isAvailable = false;
            hasConflict = true;
            conflictReason = `No scheduled shift on ${cleanEventDate}`;
            availabilityStatus = 'OFF_DUTY';
          } else {
            // Explicit schedule record exists for eventDate
            const isOffDuty = avRecord.is_available === false || avRecord.status === 'UNAVAILABLE' || avRecord.status === 'BLOCKED';
            if (isOffDuty) {
              isAvailable = false;
              hasConflict = true;
              conflictReason = `Marked off-duty on ${cleanEventDate}${avRecord.notes ? ` (${avRecord.notes})` : ''}`;
              availabilityStatus = 'UNAVAILABLE';
            } else {
              // Record is AVAILABLE or CUSTOM
              const sTime = (avRecord.start_time || '08:00').substring(0, 5);
              const eTime = (avRecord.end_time || '17:00').substring(0, 5);

              let outsideCustomHours = false;
              if (preferredTime && (avRecord.status === 'CUSTOM' || avRecord.start_time || avRecord.end_time)) {
                const pTime = preferredTime.substring(0, 5);
                if (pTime < sTime || pTime > eTime) {
                  outsideCustomHours = true;
                  hasConflict = true;
                  conflictReason = `Outside shift hours (${sTime}–${eTime})`;
                  availabilityStatus = 'CUSTOM_HOURS';
                }
              }

              // Check existing bookings on that date
              sameDateBookings = myBookings.filter(b => normalizeDateStr(b.event_date) === cleanEventDate);
              if (sameDateBookings.length > 0) {
                const timeMatch = preferredTime
                  ? sameDateBookings.some(b => b.preferred_time && b.preferred_time.substring(0, 5) === preferredTime.substring(0, 5))
                  : false;

                if (timeMatch) {
                  hasConflict = true;
                  conflictReason = `Direct conflict: Already booked on ${cleanEventDate} at ${preferredTime}.`;
                  availabilityStatus = 'BOOKED';
                } else {
                  const times = sameDateBookings.map(b => b.preferred_time || 'time TBD').join(', ');
                  conflictReason = `Notice: Has ${sameDateBookings.length} other booking(s) on ${cleanEventDate} (${times}).`;
                }
              }

              if (!outsideCustomHours && !hasConflict) {
                isAvailable = true;
                availabilityStatus = 'AVAILABLE';
              } else {
                isAvailable = false;
              }
            }
          }
        }

        const workingHours = avRecord?.start_time && avRecord?.end_time
          ? `${avRecord.start_time.substring(0, 5)}–${avRecord.end_time.substring(0, 5)}`
          : null;

        return {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          role: p.role || 'photographer',
          email: p.email,
          phone: p.phone,
          avatar_url: p.avatar_url,
          is_active: p.is_active,
          created_at: p.created_at,
          specialization,
          bio,
          is_available: isAvailable,
          availability_status: availabilityStatus,
          working_hours: workingHours,
          activeWorkloadCount,
          nextUpcoming,
          hasConflict,
          conflictReason,
          sameDateBookingsCount: sameDateBookings.length,
        };
      });

    return { data: photographers, error: null };
  } catch (error) {
    console.error('getPhotographersWithWorkloadAndAvailability error:', error);
    return { data: [], error };
  }
}

/**
 * assignPhotographerToBooking
 * ---------------------------
 * Assigns a photographer to a confirmed booking, transitions status to
 * PHOTOGRAPHER_ASSIGNED, records the audit trail in booking_status_history,
 * and emits notifications.
 */
export async function assignPhotographerToBooking({
  bookingId,
  photographerId,
  photographerName,
  changedById,
  remarks = '',
  customerId = null,
  bookingNumber = '',
  eventDate = '',
}) {
  try {
    // 1. Update the booking record
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        photographer_id: photographerId,
        status: 'PHOTOGRAPHER_ASSIGNED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Append history record
    const histRemarks = remarks.trim()
      ? remarks.trim()
      : `Photographer assigned: ${photographerName || 'Studio Photographer'}`;

    const { error: histError } = await supabase
      .from('booking_status_history')
      .insert({
        booking_id: bookingId,
        status: 'PHOTOGRAPHER_ASSIGNED',
        remarks: histRemarks,
        changed_by: changedById || null,
      });

    if (histError) console.warn('booking_status_history insert warning:', histError);

    // 3. Emit notification to customer
    if (customerId) {
      await createNotification({
        userId: customerId,
        bookingId,
        title: 'Photographer Assigned',
        message: `Photographer ${photographerName || 'from our team'} has been assigned to your booking #${bookingNumber}.`,
        notificationType: 'booking_status',
      });
    }

    // 4. Emit notification to photographer
    if (photographerId) {
      await createNotification({
        userId: photographerId,
        bookingId,
        title: 'New Booking Assignment',
        message: `You have been assigned to booking #${bookingNumber}${eventDate ? ` scheduled for ${eventDate}` : ''}.`,
        notificationType: 'booking_status',
      });
    }

    // 5. Detect and log movement to admin_activity_logs
    try {
      await recordAdminActivity({
        adminId: changedById,
        actionType: 'PHOTOGRAPHER_ASSIGNED',
        entityType: 'booking',
        entityId: bookingId,
        entityLabel: bookingNumber || `Booking`,
        description: `Assigned photographer ${photographerName || 'Studio Photographer'} to #${bookingNumber || bookingId}`,
        details: {
          photographer_id: photographerId,
          photographer_name: photographerName,
          booking_id: bookingId,
          booking_number: bookingNumber,
          event_date: eventDate,
          remarks: histRemarks,
        },
      });
    } catch (assignLogErr) {
      console.warn('assignPhotographerToBooking recordAdminActivity error:', assignLogErr);
    }

    return { data: updatedBooking, error: null };
  } catch (error) {
    console.error('assignPhotographerToBooking error:', error);
    return { data: null, error };
  }
}

/**
 * reassignPhotographer
 * --------------------
 * Changes the assigned photographer on a booking, records the change
 * in booking_status_history, and notifies both parties.
 */
export async function reassignPhotographer({
  bookingId,
  newPhotographerId,
  newPhotographerName,
  oldPhotographerName = '',
  changedById,
  remarks = '',
  customerId = null,
  bookingNumber = '',
  eventDate = '',
}) {
  try {
    // 1. Update the booking record
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        photographer_id: newPhotographerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Append history record
    const histRemarks = remarks.trim()
      ? remarks.trim()
      : `Photographer reassigned${oldPhotographerName ? ` from ${oldPhotographerName}` : ''} to ${newPhotographerName}`;

    const { error: histError } = await supabase
      .from('booking_status_history')
      .insert({
        booking_id: bookingId,
        status: 'PHOTOGRAPHER_ASSIGNED',
        remarks: histRemarks,
        changed_by: changedById || null,
      });

    if (histError) console.warn('booking_status_history insert warning:', histError);

    // 3. Emit notification to customer
    if (customerId) {
      await createNotification({
        userId: customerId,
        bookingId,
        title: 'Photographer Update',
        message: `Your booking #${bookingNumber} has been reassigned to photographer ${newPhotographerName}.`,
        notificationType: 'booking_status',
      });
    }

    // 4. Emit notification to new photographer
    if (newPhotographerId) {
      await createNotification({
        userId: newPhotographerId,
        bookingId,
        title: 'New Booking Assignment',
        message: `You have been assigned to booking #${bookingNumber}${eventDate ? ` scheduled for ${eventDate}` : ''}.`,
        notificationType: 'booking_status',
      });
    }

    return { data: updatedBooking, error: null };
  } catch (error) {
    console.error('reassignPhotographer error:', error);
    return { data: null, error };
  }
}

/**
 * unassignPhotographer
 * --------------------
 * Removes the assigned photographer from a booking, reverts status to CONFIRMED,
 * and appends an audit record to booking_status_history.
 */
export async function unassignPhotographer({
  bookingId,
  oldPhotographerName = '',
  changedById,
  remarks = '',
}) {
  try {
    // 1. Update the booking record
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        photographer_id: null,
        status: 'CONFIRMED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Append history record
    const histRemarks = remarks.trim()
      ? remarks.trim()
      : `Photographer ${oldPhotographerName ? oldPhotographerName : ''} unassigned. Booking reverted to CONFIRMED.`;

    const { error: histError } = await supabase
      .from('booking_status_history')
      .insert({
        booking_id: bookingId,
        status: 'CONFIRMED',
        remarks: histRemarks,
        changed_by: changedById || null,
      });

    if (histError) console.warn('booking_status_history insert warning:', histError);

    return { data: updatedBooking, error: null };
  } catch (error) {
    console.error('unassignPhotographer error:', error);
    return { data: null, error };
  }
}

/**
 * softDeleteBooking
 * -----------------
 * Soft-deletes a booking by setting is_deleted=true, deleted_at=now(),
 * status='CANCELLED', and recording deletion details, status history,
 * customer notification, and activity log without destroying database relationships.
 */
export async function softDeleteBooking({
  bookingId,
  deletedById = null,
  deletedByName = 'Staff/Admin',
  reason = 'Archived by Admin',
}) {
  if (!isSupabaseConfigured) return { success: true, error: null };

  try {
    // 1. Fetch full snapshot of the booking first so we have customer_id and details
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id, booking_number, customer_id, total_amount, service:services(name), customer:profiles!bookings_customer_id_fkey(first_name, last_name, email)')
      .eq('id', bookingId)
      .maybeSingle();

    // 2. Clear payments associated with this booking
    try {
      await supabase
        .from('payments')
        .delete()
        .eq('booking_id', bookingId);
    } catch (payDelErr) {
      console.warn('Could not delete booking payments on soft delete:', payDelErr);
    }

    // 3. Update booking record: mark deleted and clear payment balances
    const { data: booking, error: updateErr } = await supabase
      .from('bookings')
      .update({
        is_deleted: true,
        status: 'CANCELLED',
        payment_status: 'UNPAID',
        down_payment_amount: 0,
        down_payment_confirmed: false,
        remaining_balance: existingBooking?.total_amount || 0,
        deleted_at: new Date().toISOString(),
        deleted_by: deletedById,
        deletion_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select('id, booking_number, customer_id')
      .single();

    if (updateErr) throw updateErr;

    const bNumber = booking?.booking_number || existingBooking?.booking_number || 'N/A';
    const cId = booking?.customer_id || existingBooking?.customer_id;
    const sName = existingBooking?.service?.name || 'Studio Session';

    // 3. Insert customer notification so the customer is formally informed their order was removed
    if (cId) {
      try {
        await supabase.from('notifications').insert([{
          user_id: cId,
          booking_id: bookingId,
          title: `Booking #${bNumber} Removed`,
          message: `Your booking order #${bNumber} (${sName}) has been cancelled and removed from active studio records. Reason: "${reason || 'Cancelled by studio administration'}".`,
          notification_type: 'BOOKING_CANCELLED',
          is_read: false,
          created_at: new Date().toISOString(),
        }]);
      } catch (notifErr) {
        console.warn('Could not insert customer deletion notification:', notifErr);
      }
    }

    // 4. Record in status history for audit trail
    try {
      await supabase.from('booking_status_history').insert([{
        booking_id: bookingId,
        status: 'CANCELLED',
        remarks: `Moved to Trash: "${reason}". Performed by ${deletedByName}.`,
        changed_by: deletedById,
      }]);
    } catch (histErr) {
      console.warn('Could not insert status history for deletion:', histErr);
    }

    const logEntry = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
      action: 'BOOKING_SOFT_DELETED',
      booking_id: bookingId,
      booking_number: bNumber,
      client_name: existingBooking?.customer ? `${existingBooking.customer.first_name || ''} ${existingBooking.customer.last_name || ''}`.trim() : 'Client',
      deleted_by_name: deletedByName,
      reason: reason,
      deleted_at: new Date().toISOString(),
    };

    try {
      const existingLogs = JSON.parse(localStorage.getItem('ekodak_admin_activity_logs') || '[]');
      existingLogs.unshift(logEntry);
      localStorage.setItem('ekodak_admin_activity_logs', JSON.stringify(existingLogs.slice(0, 200)));
    } catch {}

    // 5. Persist to database admin_activity_logs
    try {
      await supabase.from('admin_activity_logs').insert([{
        admin_id: deletedById || null,
        admin_name: deletedByName,
        admin_role: 'admin',
        action_type: 'BOOKING_SOFT_DELETED',
        entity_type: 'booking',
        entity_id: bookingId,
        entity_label: bNumber,
        description: `Moved booking #${bNumber} to Trash. Reason: "${reason || 'Administrative cleanup'}"`,
        details: { reason, booking_id: bookingId },
        created_at: new Date().toISOString(),
      }]);
    } catch (dbErr) {
      console.warn('Could not write soft delete to admin_activity_logs DB:', dbErr);
    }

    return { success: true, data: booking || existingBooking, logEntry, error: null };
  } catch (err) {
    console.error('softDeleteBooking error:', err);
    return { success: false, error: err };
  }
}

/**
 * restoreBooking
 * --------------
 * Recovers a soft-deleted booking, clearing is_deleted flag and
 * restoring it to active queue, updating status history and notifying customer.
 */
export async function restoreBooking({
  bookingId,
  restoredById = null,
  restoredByName = 'Staff/Admin',
}) {
  if (!isSupabaseConfigured) return { success: true, error: null };

  try {
    const { data: booking, error: updateErr } = await supabase
      .from('bookings')
      .update({
        is_deleted: false,
        status: 'CONFIRMED',
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select(`
        id,
        booking_number,
        customer_id,
        service:services(name),
        customer:profiles!bookings_customer_id_fkey(first_name, last_name, email)
      `)
      .single();

    if (updateErr) throw updateErr;

    const bNumber = booking?.booking_number || 'N/A';
    const sName = booking?.service?.name || 'Studio Session';

    // Notify customer that booking has been restored
    if (booking?.customer_id) {
      try {
        await supabase.from('notifications').insert([{
          user_id: booking.customer_id,
          booking_id: bookingId,
          title: `Booking #${bNumber} Restored`,
          message: `Your booking order #${bNumber} (${sName}) has been restored to active studio records by administration.`,
          notification_type: 'BOOKING_CONFIRMED',
          is_read: false,
          created_at: new Date().toISOString(),
        }]);
      } catch (notifErr) {
        console.warn('Could not insert customer restore notification:', notifErr);
      }
    }

    // Record in status history
    try {
      await supabase.from('booking_status_history').insert([{
        booking_id: bookingId,
        status: 'CONFIRMED',
        remarks: `Restored from Trash to active queue by ${restoredByName}.`,
        changed_by: restoredById,
      }]);
    } catch (histErr) {
      console.warn('Could not insert status history for restore:', histErr);
    }

    const logEntry = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
      action: 'BOOKING_RESTORED',
      booking_id: bookingId,
      booking_number: bNumber,
      restored_by_name: restoredByName,
      restored_at: new Date().toISOString(),
    };

    try {
      const existingLogs = JSON.parse(localStorage.getItem('ekodak_admin_activity_logs') || '[]');
      existingLogs.unshift(logEntry);
      localStorage.setItem('ekodak_admin_activity_logs', JSON.stringify(existingLogs.slice(0, 200)));
    } catch {}

    // Persist to database admin_activity_logs
    try {
      await supabase.from('admin_activity_logs').insert([{
        admin_id: restoredById || null,
        admin_name: restoredByName,
        admin_role: 'admin',
        action_type: 'BOOKING_RESTORED',
        entity_type: 'booking',
        entity_id: bookingId,
        entity_label: bNumber,
        description: `Recovered #${bNumber} from Trash back to active queue.`,
        details: { booking_id: bookingId },
        created_at: new Date().toISOString(),
      }]);
    } catch (dbErr) {
      console.warn('Could not write restore to admin_activity_logs DB:', dbErr);
    }

    return { success: true, data: booking, logEntry, error: null };
  } catch (err) {
    console.error('restoreBooking error:', err);
    return { success: false, error: err };
  }
}

/**
 * deleteBookingPermanently
 * ------------------------
 * Systematically deletes a booking from the database, cascading related child
 * records, and archives a complete audit trail in admin activity logs.
 */
export async function deleteBookingPermanently({
  bookingId,
  deletedById = null,
  deletedByName = 'Staff/Admin',
  reason = 'Admin deletion request'
}) {
  if (!isSupabaseConfigured) return { success: true, error: null };

  try {
    // 1. Fetch full snapshot of the booking before deletion for the activity log
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        status,
        payment_status,
        total_amount,
        event_date,
        preferred_time,
        notes,
        created_at,
        customer_id,
        service:services(name),
        customer:profiles!bookings_customer_id_fkey(first_name, last_name, email)
      `)
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchErr) {
      console.warn('Error retrieving booking snapshot prior to deletion:', fetchErr);
    }

    const logEntry = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
      action: 'BOOKING_PURGED',
      booking_id: bookingId,
      booking_number: booking?.booking_number || 'N/A',
      client_name: booking?.customer ? `${booking.customer.first_name || ''} ${booking.customer.last_name || ''}`.trim() : 'Guest',
      client_email: booking?.customer?.email || 'N/A',
      service_name: booking?.service?.name || 'Studio Photography',
      total_amount: booking?.total_amount || 0,
      event_date: booking?.event_date || null,
      deleted_by_id: deletedById,
      deleted_by_name: deletedByName,
      reason: reason,
      deleted_at: new Date().toISOString()
    };

    // Store log in localStorage for persistent admin activity dashboard viewing
    try {
      const existingLogs = JSON.parse(localStorage.getItem('ekodak_admin_activity_logs') || '[]');
      existingLogs.unshift(logEntry);
      localStorage.setItem('ekodak_admin_activity_logs', JSON.stringify(existingLogs.slice(0, 200)));
    } catch (e) {
      console.warn('Could not write to local admin activity logs storage', e);
    }

    // Persist to DB audit logs
    try {
      await supabase.from('admin_activity_logs').insert([{
        admin_id: deletedById || null,
        admin_name: deletedByName,
        admin_role: 'admin',
        action_type: 'BOOKING_PURGED',
        entity_type: 'booking',
        entity_id: bookingId,
        entity_label: booking?.booking_number || 'Booking',
        description: `Permanently purged #${booking?.booking_number || 'booking'} and all linked records. Reason: "${reason}"`,
        details: logEntry,
        created_at: new Date().toISOString()
      }]);
    } catch (e) {
      console.warn('admin_activity_logs DB write error:', e);
    }

    // 2. Notify customer if not already notified and decouple notifications from booking_id
    // to prevent FK constraint errors while preserving customer's notification history
    if (booking?.customer_id) {
      try {
        await supabase.from('notifications').insert([{
          user_id: booking.customer_id,
          booking_id: null,
          title: `Booking #${booking?.booking_number || 'N/A'} Cleared`,
          message: `Your booking order #${booking?.booking_number || 'N/A'} (${booking?.service?.name || 'Studio Session'}) has been permanently cleared from studio records. Reason: "${reason || 'Administrative cleanup'}".`,
          notification_type: 'BOOKING_DELETED',
          is_read: false,
          created_at: new Date().toISOString(),
        }]);
      } catch (nErr) {
        console.warn('Could not insert permanent deletion customer notice:', nErr);
      }
    }

    // Cascade delete child dependencies to avoid foreign key violation
    await Promise.allSettled([
      supabase.from('booking_addons').delete().eq('booking_id', bookingId),
      supabase.from('booking_status_history').delete().eq('booking_id', bookingId),
      supabase.from('qr_scan_logs').delete().eq('booking_id', bookingId),
      supabase.from('booking_deliveries').delete().eq('booking_id', bookingId),
      supabase.from('payments').delete().eq('booking_id', bookingId),
      supabase.from('photo_outputs').delete().eq('booking_id', bookingId),
      supabase.from('workstation_transfers').delete().eq('booking_id', bookingId),
      supabase.from('notifications').update({ booking_id: null }).eq('booking_id', bookingId),
    ]);

    // 3. Delete the booking record itself
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (deleteError) throw deleteError;

    return { success: true, logEntry, error: null };
  } catch (err) {
    console.error('deleteBookingPermanently error:', err);
    return { success: false, error: err };
  }
}

/**
 * emptyTrash
 * ----------
 * Permanently removes all soft-deleted bookings from the database in bulk,
 * cascading child dependencies and recording a single bulk purge audit log.
 */
export async function emptyTrash({ deletedById = null, deletedByName = 'Staff/Admin' } = {}) {
  if (!isSupabaseConfigured) return { success: true, count: 0, error: null };

  try {
    const { data: deletedList, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, booking_number')
      .eq('is_deleted', true);

    if (fetchErr) throw fetchErr;
    if (!deletedList || deletedList.length === 0) {
      return { success: true, count: 0, message: 'Trash is already empty.', error: null };
    }

    const ids = deletedList.map(b => b.id);

    // Cascade delete child records while unlinking notifications so customers keep their records
    await Promise.allSettled([
      supabase.from('booking_addons').delete().in('booking_id', ids),
      supabase.from('booking_status_history').delete().in('booking_id', ids),
      supabase.from('qr_scan_logs').delete().in('booking_id', ids),
      supabase.from('booking_deliveries').delete().in('booking_id', ids),
      supabase.from('payments').delete().in('booking_id', ids),
      supabase.from('photo_outputs').delete().in('booking_id', ids),
      supabase.from('workstation_transfers').delete().in('booking_id', ids),
      supabase.from('notifications').update({ booking_id: null }).in('booking_id', ids),
    ]);

    // Delete booking records
    const { error: delErr } = await supabase
      .from('bookings')
      .delete()
      .in('id', ids);

    if (delErr) throw delErr;

    // Log bulk purge to admin activity logs
    try {
      await supabase.from('admin_activity_logs').insert([{
        admin_id: deletedById || null,
        admin_name: deletedByName,
        admin_role: 'admin',
        action_type: 'TRASH_EMPTIED',
        entity_type: 'booking',
        entity_label: `${ids.length} Bookings`,
        description: `Permanently purged ${ids.length} record(s) from the Trash Cycle.`,
        details: { count: ids.length, booking_numbers: deletedList.map(b => b.booking_number) },
        created_at: new Date().toISOString()
      }]);
    } catch (logErr) {
      console.warn('Could not record bulk purge to admin_activity_logs:', logErr);
    }

    return { success: true, count: ids.length, error: null };
  } catch (err) {
    console.error('emptyTrash error:', err);
    return { success: false, count: 0, error: err };
  }
}

/**
 * getAdminActivityLogs
 * --------------------
 * Reads organized administrative activity logs from persistent storage.
 */
export function getAdminActivityLogs() {
  try {
    return JSON.parse(localStorage.getItem('ekodak_admin_activity_logs') || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * adminCreateBooking
 * ------------------
 * Allows admin to directly insert a new customer booking record.
 */
export async function adminCreateBooking(bookingData) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Database connection is not configured.') };
  }

  try {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });
    const nextSeq = String((count || 0) + 1).padStart(5, '0');
    const bookingNumber = `BK-${year}-${nextSeq}`;

    const total = Number(bookingData.total_amount || 0);
    const down = Number(bookingData.down_payment_amount || 0);
    const balance = Number(bookingData.remaining_balance ?? (total - down));

    const payload = {
      booking_number: bookingNumber,
      customer_id: bookingData.customer_id,
      service_id: bookingData.service_id,
      tier_name: bookingData.tier_name || null,
      event_date: bookingData.event_date || null,
      preferred_time: bookingData.preferred_time || null,
      location: bookingData.location || 'Studio Location',
      notes: bookingData.notes || null,
      status: bookingData.status || 'PENDING',
      payment_status: bookingData.payment_status || 'UNPAID',
      total_amount: total,
      down_payment_amount: down,
      remaining_balance: balance,
      photographer_id: bookingData.photographer_id || null,
    };

    const { data, error } = await supabase
      .from('bookings')
      .insert(payload)
      .select(`
        id,
        booking_number,
        status,
        payment_status,
        event_date,
        preferred_time,
        location,
        service:services(name),
        customer:profiles!bookings_customer_id_fkey(first_name, last_name)
      `)
      .single();

    if (error) throw error;

    // The DB insert trigger forces status=PENDING, payment_status=UNPAID, photographer=NULL.
    // If admin explicitly requested a different status, payment, or photographer, update it now:
    if (
      (bookingData.status && bookingData.status !== 'PENDING') ||
      (bookingData.payment_status && bookingData.payment_status !== 'UNPAID') ||
      bookingData.photographer_id ||
      (bookingData.total_amount && Number(bookingData.total_amount) !== Number(data.total_amount))
    ) {
      await supabase
        .from('bookings')
        .update({
          status: bookingData.status || 'PENDING',
          payment_status: bookingData.payment_status || 'UNPAID',
          photographer_id: bookingData.photographer_id || null,
          total_amount: total,
          down_payment_amount: down,
          remaining_balance: balance,
        })
        .eq('id', data.id);
    }

    return { data, error: null };
  } catch (error) {
    console.error('adminCreateBooking error:', error);
    return { data: null, error };
  }
}

/**
 * adminUpdateBooking
 * ------------------
 * Allows admin to update booking details (status, payment, date, notes, etc.).
 */
export async function adminUpdateBooking(bookingId, updates) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Database connection is not configured.') };
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('adminUpdateBooking error:', error);
    return { data: null, error };
  }
}

/**
 * batchScheduleSchoolPictorial
 * ----------------------------
 * Sets confirmed pictorial schedule (date, time, venue) and optional photographer
 * for all pending student bookings of a specific school / section batch.
 * Inserts in-app notifications and client banner announcement.
 */
export async function batchScheduleSchoolPictorial({
  schoolName,
  sectionName = null,
  bookingIds: explicitBookingIds = null,
  eventDate,
  preferredTime = '09:00:00',
  location,
  photographerId = null,
  announcementMessage = '',
  adminId = null,
  adminName = 'Studio Admin',
  allowRescheduleProtection = true,
}) {
  if (!isSupabaseConfigured) {
    return { success: false, count: 0, message: 'Database connection is not configured.' };
  }

  try {
    let targetBookings = [];

    if (explicitBookingIds && explicitBookingIds.length > 0) {
      const { data: byIds, error: byIdsErr } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          customer_id,
          status,
          event_date,
          preferred_time,
          location,
          notes,
          customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, email)
        `)
        .in('id', explicitBookingIds);
      if (byIdsErr) throw byIdsErr;
      targetBookings = byIds || [];
    } else {
      // 1. Fetch bookings matching schoolName
      const { data: matchedBookings, error: fetchErr } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          customer_id,
          status,
          event_date,
          preferred_time,
          location,
          notes,
          customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, email)
        `)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .ilike('notes', `%${schoolName}%`);

      if (fetchErr) throw fetchErr;

      // Filter to those that are part of school agreement or awaiting schedule confirmation
      targetBookings = (matchedBookings || []).filter(b => {
        const notes = b.notes || '';
        const matchesSchool = notes.toLowerCase().includes(schoolName.toLowerCase());
        const matchesSection = sectionName && sectionName !== 'All Sections'
          ? notes.toLowerCase().includes(sectionName.toLowerCase())
          : true;
        const isPendingSchedule = !b.event_date || b.status === 'PENDING' || notes.includes('SCHOOL_PARTNER') || notes.includes('School Pictorial');
        return matchesSchool && matchesSection && isPendingSchedule;
      });
    }

    if (targetBookings.length === 0) {
      return { success: false, count: 0, message: 'No student bookings found to schedule for this batch.' };
    }

    const bookingIds = targetBookings.map(b => b.id);
    const newStatus = photographerId ? 'PHOTOGRAPHER_ASSIGNED' : 'CONFIRMED';

    // 2. Batch update bookings
    const updates = {
      event_date: eventDate,
      preferred_time: preferredTime,
      location: location || 'E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu',
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (photographerId) {
      updates.photographer_id = photographerId;
    }

    const { error: updateErr } = await supabase
      .from('bookings')
      .update(updates)
      .in('id', bookingIds);

    if (updateErr) throw updateErr;

    // 3. Record in status history for audit trail
    const historyRows = bookingIds.map(id => ({
      booking_id: id,
      status: newStatus,
      remarks: `School pictorial schedule confirmed for ${eventDate} at ${preferredTime} (${location}). Set by ${adminName}.${allowRescheduleProtection ? ' [Student Reschedule Safety Protection Active: eligible for makeup/batch rollover]' : ''}`,
      changed_by: adminId,
    }));
    await supabase.from('booking_status_history').insert(historyRows);

    // 4. Send in-app notification to all affected students
    const studentUserIds = [...new Set(targetBookings.map(b => b.customer_id).filter(Boolean))];
    if (studentUserIds.length > 0) {
      const notifRows = studentUserIds.map(uid => {
        const studentBooking = targetBookings.find(b => b.customer_id === uid);
        return {
          user_id: uid,
          booking_id: studentBooking?.id || null,
          title: `Pictorial Schedule Confirmed: ${schoolName}`,
          message: announcementMessage.trim() || `Your graduation photoshoot has been confirmed for ${eventDate} at ${preferredTime}. Venue: ${location}.`,
          notification_type: 'SCHEDULE_CONFIRMED',
          is_read: false,
        };
      });
      await supabase.from('notifications').insert(notifRows);
    }

    // 5. Post to announcements table for client banner visibility
    const bannerText = `Graduation Pictorial confirmed for ${schoolName}${sectionName ? ` (${sectionName})` : ''} on ${eventDate} at ${location}. Please check your booking details.`;
    await supabase.from('announcements').insert([{
      text: bannerText,
      cta_text: 'View My Booking',
      cta_link: '/dashboard/bookings',
      type: 'INFO',
      is_active: true,
      sort_order: 1,
    }]);

    return {
      success: true,
      count: targetBookings.length,
      bookings: targetBookings,
      message: `Successfully scheduled ${targetBookings.length} student bookings and broadcasted the pictorial announcement.`
    };
  } catch (err) {
    console.error('batchScheduleSchoolPictorial error:', err);
    return { success: false, error: err, message: err.message };
  }
}

/**
 * rescheduleStudentBooking
 * ------------------------
 * Admin action to reschedule an individual student who cannot attend the scheduled school batch.
 * Moves them to a makeup pictorial date, alternate batch, or studio session.
 * Records the change in status history and notifies the student.
 */
export async function rescheduleStudentBooking({
  bookingId,
  newDate = null,
  newTime = null,
  newLocation = null,
  reason = 'Unable to attend scheduled school pictorial batch',
  adminId = null,
  adminName = 'Studio Admin',
}) {
  if (!isSupabaseConfigured) {
    return { success: false, message: 'Database connection is not configured.' };
  }

  try {
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, booking_number, customer_id, notes, status, event_date')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      throw new Error('Student booking not found.');
    }

    const currentNotes = booking.notes || '';
    const updatedNotes = currentNotes.includes('[RESCHEDULED_MAKEUP]')
      ? currentNotes
      : `${currentNotes}\n• [RESCHEDULED_MAKEUP]: ${reason} (Rescheduled by ${adminName} on ${new Date().toLocaleDateString()})`.trim();

    const updates = {
      event_date: newDate || null,
      preferred_time: newTime || null,
      location: newLocation || 'E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu (Makeup Session)',
      status: newDate ? 'CONFIRMED' : 'PENDING',
      notes: updatedNotes,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId);

    if (updateErr) throw updateErr;

    // Status audit trail
    await supabase.from('booking_status_history').insert({
      booking_id: bookingId,
      status: updates.status,
      remarks: `Student rescheduled for makeup session: ${newDate || 'Pending Alternate Batch'} (${updates.location}). Reason: ${reason}. Handled by ${adminName}.`,
      changed_by: adminId,
    });

    // Notify student
    if (booking.customer_id) {
      await supabase.from('notifications').insert([{
        user_id: booking.customer_id,
        booking_id: bookingId,
        title: 'Photoshoot Schedule Updated (Makeup / Reschedule)',
        message: newDate
          ? `Your graduation pictorial has been rescheduled to ${newDate} at ${updates.location}. Please present your updated QR pass on your new schedule.`
          : `Your request to reschedule has been approved. You have been placed into the makeup rollover batch. Our team will notify you once the makeup date is confirmed.`,
        notification_type: 'SCHEDULE_UPDATED',
        is_read: false,
      }]);
    }

    return {
      success: true,
      message: newDate 
        ? `Successfully rescheduled student to ${newDate} makeup session.`
        : `Successfully placed student into pending makeup rollover batch.`,
    };
  } catch (err) {
    console.error('rescheduleStudentBooking error:', err);
    return { success: false, message: err.message || 'Failed to reschedule student.' };
  }
}
