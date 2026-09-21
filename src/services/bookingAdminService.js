/**
 * bookingAdminService.js
 * ======================
 * All Supabase queries for the Admin/Staff Booking Management module.
 * RLS enforces that only staff/admin roles can access these endpoints.
 * Never bypasses Row Level Security — uses the standard anon client only.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateAndStoreQRCode } from './qrService';

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
         total_amount,
         down_payment_amount,
         remaining_balance,
         service:services(id, name, category, base_price),
         customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, phone, address, studio_specs),
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
      const term = search.trim();
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

    const { data, error, count } = await query;
    if (error) throw error;

    return { data, count, error: null };
  } catch (error) {
    console.error('getAdminBookings error:', error);
    return { data: null, count: 0, error };
  }
}

import { parseStudentDetailsFromNotes, parseAddOnsFromNotes } from './bookingService';

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
        customer:profiles!bookings_customer_id_fkey(
          id, first_name, last_name, phone, address, studio_specs, badges, avatar_url, bio, is_active, created_at
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
          .select('id, first_name, last_name, phone, address, studio_specs, badges, avatar_url, bio, is_active, created_at')
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

    // Parse add-ons & student details from notes
    booking.selected_add_ons = parseAddOnsFromNotes(booking.notes);
    booking.student_details = parseStudentDetailsFromNotes(booking.notes);

    return { data: booking, error: null };
  } catch (error) {
    console.error('getBookingDetail error:', error);
    return { data: null, error };
  }
}

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
    return { data, error: null };
  } catch (error) {
    console.error('recordPayment error:', error);
    return { data: null, error };
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
export async function getPhotographersWithWorkloadAndAvailability(eventDate = null, preferredTime = null) {
  try {
    // 1. Fetch photographer accounts with profile details
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select(`
        id, first_name, last_name, phone, avatar_url, is_active, created_at,
        photographer_profile:photographer_profiles(specialization, bio, is_available)
      `)
      .eq('role', 'photographer')
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
      // Support both schema variants: availability_date and date
      const { data: avData, error: avError } = await supabase
        .from('photographer_availability')
        .select('*');
      
      if (!avError && avData) {
        availabilityRecords = avData.filter(
          r => (r.availability_date === eventDate || r.date === eventDate)
        );
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 4. Synthesize photographer workload and conflict data
    const photographers = (profiles || []).map(p => {
      const phProfile = p.photographer_profile?.[0] || null;
      const isAvailable = phProfile ? phProfile.is_available : false;
      const specialization = phProfile?.specialization || 'General Photography';
      const bio = phProfile?.bio || '';

      // All active bookings assigned to this photographer
      const myBookings = (assignedBookings || []).filter(b => b.photographer_id === p.id);
      const activeWorkloadCount = myBookings.length;

      // Find upcoming bookings (event_date >= today) sorted by date ascending
      const upcoming = myBookings
        .filter(b => b.event_date && b.event_date >= todayStr)
        .sort((a, b) => (a.event_date > b.event_date ? 1 : -1));
      const nextUpcoming = upcoming[0] || null;

      // Conflict detection for target eventDate / preferredTime
      let hasConflict = false;
      let conflictReason = null;
      let sameDateBookings = [];

      if (eventDate) {
        sameDateBookings = myBookings.filter(b => b.event_date === eventDate);
        if (sameDateBookings.length > 0) {
          // Check if time overlaps or matches
          const timeMatch = preferredTime
            ? sameDateBookings.some(b => b.preferred_time && b.preferred_time.substring(0, 5) === preferredTime.substring(0, 5))
            : false;

          if (timeMatch) {
            hasConflict = true;
            conflictReason = `Direct conflict: Already booked on ${eventDate} at ${preferredTime}.`;
          } else {
            // Same date, but different or unspecified time
            const times = sameDateBookings.map(b => b.preferred_time || 'time TBD').join(', ');
            conflictReason = `Notice: Has ${sameDateBookings.length} other booking(s) on ${eventDate} (${times}).`;
          }
        }

        // Check explicit availability table record
        const avRecord = availabilityRecords.find(r => r.photographer_id === p.id);
        if (avRecord) {
          const status = avRecord.status || (avRecord.is_available ? 'AVAILABLE' : 'UNAVAILABLE');
          if (status === 'UNAVAILABLE' || status === 'BLOCKED') {
            hasConflict = true;
            conflictReason = `Marked unavailable on ${eventDate}${avRecord.notes ? ` (${avRecord.notes})` : ''}.`;
          }
        }
      }

      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        phone: p.phone,
        avatar_url: p.avatar_url,
        is_active: p.is_active,
        created_at: p.created_at,
        specialization,
        bio,
        is_available: isAvailable,
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
 * and recording deletion details and activity log without destroying database relationships.
 */
export async function softDeleteBooking({
  bookingId,
  deletedById = null,
  deletedByName = 'Staff/Admin',
  reason = 'Archived by Admin',
}) {
  if (!isSupabaseConfigured) return { success: true, error: null };

  try {
    const { data: booking, error: updateErr } = await supabase
      .from('bookings')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: deletedById,
        deletion_reason: reason,
      })
      .eq('id', bookingId)
      .select('id, booking_number')
      .single();

    if (updateErr) throw updateErr;

    const logEntry = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
      action: 'BOOKING_SOFT_DELETED',
      booking_id: bookingId,
      booking_number: booking?.booking_number || 'N/A',
      deleted_by_name: deletedByName,
      reason: reason,
      deleted_at: new Date().toISOString(),
    };

    try {
      const existingLogs = JSON.parse(localStorage.getItem('ekodak_admin_activity_logs') || '[]');
      existingLogs.unshift(logEntry);
      localStorage.setItem('ekodak_admin_activity_logs', JSON.stringify(existingLogs.slice(0, 200)));
    } catch {}

    // Persist to database admin_activity_logs
    try {
      await supabase.from('admin_activity_logs').insert([{
        admin_id: deletedById || null,
        admin_name: deletedByName,
        admin_role: 'admin',
        action_type: 'BOOKING_SOFT_DELETED',
        entity_type: 'booking',
        entity_id: bookingId,
        entity_label: booking?.booking_number || 'Booking',
        description: `Moved ${booking?.booking_number || 'booking'} to Trash. Reason: "${reason || 'Administrative cleanup'}"`,
        details: { reason, booking_id: bookingId },
        created_at: new Date().toISOString(),
      }]);
    } catch (dbErr) {
      console.warn('Could not write soft delete to admin_activity_logs DB:', dbErr);
    }

    return { success: true, data: booking, logEntry, error: null };
  } catch (err) {
    console.error('softDeleteBooking error:', err);
    return { success: false, error: err };
  }
}

/**
 * restoreBooking
 * --------------
 * Recovers a soft-deleted booking, clearing is_deleted flag and
 * restoring it to active queue.
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
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
      })
      .eq('id', bookingId)
      .select('id, booking_number')
      .single();

    if (updateErr) throw updateErr;

    const logEntry = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
      action: 'BOOKING_RESTORED',
      booking_id: bookingId,
      booking_number: booking?.booking_number || 'N/A',
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
        entity_label: booking?.booking_number || 'Booking',
        description: `Recovered ${booking?.booking_number || 'booking'} from Trash back to active queue.`,
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
        customer:profiles!bookings_customer_id_fkey(first_name, last_name)
      `)
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchErr) {
      console.warn('Error retrieving booking snapshot prior to deletion:', fetchErr);
    }

    const logEntry = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
      action: 'BOOKING_DELETED',
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
        description: `Permanently purged ${booking?.booking_number || 'booking'} and all linked records. Reason: "${reason}"`,
        details: logEntry,
        created_at: new Date().toISOString()
      }]);
    } catch (e) {
      console.warn('admin_activity_logs DB write error:', e);
    }

    // 2. Cascade delete child dependencies to avoid foreign key violation
    await Promise.allSettled([
      supabase.from('booking_addons').delete().eq('booking_id', bookingId),
      supabase.from('booking_status_history').delete().eq('booking_id', bookingId),
      supabase.from('qr_scan_logs').delete().eq('booking_id', bookingId),
      supabase.from('booking_deliveries').delete().eq('booking_id', bookingId),
      supabase.from('payments').delete().eq('booking_id', bookingId),
      supabase.from('photo_outputs').delete().eq('booking_id', bookingId),
      supabase.from('notifications').delete().eq('booking_id', bookingId),
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
  eventDate,
  preferredTime = '09:00:00',
  location,
  photographerId = null,
  announcementMessage = '',
  adminId = null,
  adminName = 'Studio Admin',
}) {
  if (!isSupabaseConfigured) {
    return { success: false, count: 0, message: 'Database connection is not configured.' };
  }

  try {
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
    const targetBookings = (matchedBookings || []).filter(b => {
      const notes = b.notes || '';
      const matchesSchool = notes.toLowerCase().includes(schoolName.toLowerCase());
      const matchesSection = sectionName ? notes.toLowerCase().includes(sectionName.toLowerCase()) : true;
      const isPendingSchedule = !b.event_date || b.status === 'PENDING' || notes.includes('SCHOOL_PARTNER') || notes.includes('School Pictorial');
      return matchesSchool && matchesSection && isPendingSchedule;
    });

    if (targetBookings.length === 0) {
      return { success: false, count: 0, message: 'No pending student bookings found for this school batch.' };
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
      remarks: `School pictorial schedule confirmed for ${eventDate} at ${preferredTime} (${location}). Set by ${adminName}.`,
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



