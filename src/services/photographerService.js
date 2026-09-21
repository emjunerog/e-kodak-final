import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { validateUploadFile, sanitizeFileName } from '../lib/securityValidator';
import { createTransferLog } from './workstationService';

// ── Bookings ─────────────────────────────────────────────────────────────────

/**
 * getAssignedBookings
 * -------------------
 * Fetches bookings assigned to the current photographer.
 * Joins service and customer profiles with correct schema column names.
 */
export async function getAssignedBookings(photographerId = null) {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    let query = supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        status,
        payment_status,
        event_date,
        preferred_time,
        location,
        tier_name,
        notes,
        reference_images,
        total_amount,
        down_payment_amount,
        remaining_balance,
        created_at,
        updated_at,
        service:services!bookings_service_id_fkey(
          id,
          name,
          tagline,
          description,
          category,
          base_price,
          inclusions,
          tiers,
          cover_image
        ),
        customer:profiles!bookings_customer_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone,
          avatar_url,
          studio_specs
        ),
        payments(
          id,
          amount,
          payment_type,
          payment_method,
          reference_number,
          payment_date,
          created_at
        )
      `)
      .order('event_date', { ascending: true });

    if (photographerId) {
      query = query.eq('photographer_id', photographerId);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  } catch (err) {
    console.error('getAssignedBookings error:', err);
    return { data: [], error: err };
  }
}

/**
 * getBookingDetails
 * -----------------
 * Full booking record with status history and customer details.
 */
export async function getBookingDetails(bookingId) {
  if (!isSupabaseConfigured) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        status,
        payment_status,
        event_date,
        preferred_time,
        location,
        tier_name,
        notes,
        reference_images,
        total_amount,
        down_payment_amount,
        remaining_balance,
        created_at,
        updated_at,
        service:services!bookings_service_id_fkey(
          id,
          name,
          description,
          category,
          base_price
        ),
        customer:profiles!bookings_customer_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone,
          studio_specs
        ),
        booking_status_history(
          id,
          status,
          remarks,
          created_at,
          changed_by
        )
      `)
      .eq('id', bookingId)
      .single();

    return { data, error };
  } catch (err) {
    console.error('getBookingDetails error:', err);
    return { data: null, error: err };
  }
}

/**
 * updateBookingStatusByPhotographer
 * ---------------------------------
 * Photographers can progress their assigned shoot (e.g. CAPTURE when shooting starts).
 * Supports both destructured object or positional parameters.
 */
export async function updateBookingStatusByPhotographer(bookingIdOrOptions, maybeStatus, maybeRemarks, maybePhotographerId) {
  let bookingId, newStatus, remarks = '', photographerId = null;
  if (typeof bookingIdOrOptions === 'object' && bookingIdOrOptions !== null) {
    ({ bookingId, newStatus, remarks = '', photographerId = null } = bookingIdOrOptions);
  } else {
    bookingId = bookingIdOrOptions;
    newStatus = maybeStatus;
    remarks = typeof maybeRemarks === 'string' ? maybeRemarks : (maybeRemarks?.notes || '');
    photographerId = maybePhotographerId;
  }

  if (!isSupabaseConfigured || !bookingId || !newStatus) return { data: null, error: null };
  try {
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log in booking_status_history
    await supabase.from('booking_status_history').insert({
      booking_id: bookingId,
      status: newStatus,
      remarks: remarks.trim() || `Status updated to ${newStatus} by photographer.`,
      changed_by: photographerId,
    });

    return { data: updatedBooking, error: null };
  } catch (err) {
    console.error('updateBookingStatusByPhotographer error:', err);
    return { data: null, error: err };
  }
}

/**
 * acceptAssignment
 * ----------------
 * Workflow Step 4: Photographer confirms and locks in assignment.
 */
export async function acceptAssignment({
  bookingId,
  photographerId,
  photographerName = 'Studio Photographer',
  bookingNumber = ''
}) {
  if (!isSupabaseConfigured || !bookingId) return { data: null, error: null };
  try {
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'CONFIRMED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) throw updateError;

    const bNum = bookingNumber || updatedBooking.booking_number;

    // Log in history
    await supabase.from('booking_status_history').insert({
      booking_id: bookingId,
      status: 'CONFIRMED',
      remarks: `Assignment accepted and confirmed by ${photographerName}. Session locked in.`,
      changed_by: photographerId,
    });

    // Notify Admin via Workstation Transfer
    await createTransferLog({
      bookingId,
      senderId: photographerId,
      senderRole: 'photographer',
      targetRole: 'admin',
      transferType: 'ORDER_HANDOFF',
      priority: 'NORMAL',
      title: `Assignment Accepted: #${bNum}`,
      message: `${photographerName} has accepted the shoot assignment for booking #${bNum}. Session is confirmed.`,
      payload: {
        booking_number: bNum,
        action: 'ASSIGNMENT_ACCEPTED',
      },
    });

    return { data: updatedBooking, error: null };
  } catch (err) {
    console.error('acceptAssignment error:', err);
    return { data: null, error: err };
  }
}

/**
 * declineAssignment
 * -----------------
 * Workflow Step 4: Photographer declines assignment with reason.
 * Reverts booking to PENDING and notifies Admin for reassignment.
 */
export async function declineAssignment({
  bookingId,
  photographerId,
  photographerName = 'Studio Photographer',
  bookingNumber = '',
  reason = 'Unavailable for requested slot'
}) {
  if (!isSupabaseConfigured || !bookingId) return { data: null, error: null };
  try {
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        photographer_id: null,
        status: 'PENDING',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) throw updateError;

    const bNum = bookingNumber || updatedBooking.booking_number;

    // Log decline in status history
    await supabase.from('booking_status_history').insert({
      booking_id: bookingId,
      status: 'PENDING',
      remarks: `Assignment declined by ${photographerName}. Reason: "${reason}". Returned to pending queue for admin reassignment.`,
      changed_by: photographerId,
    });

    // Dispatch urgent handoff to Admin
    await createTransferLog({
      bookingId,
      senderId: photographerId,
      senderRole: 'photographer',
      targetRole: 'admin',
      transferType: 'ISSUE_ESCALATION',
      priority: 'URGENT',
      title: `Assignment Declined: #${bNum}`,
      message: `${photographerName} declined booking #${bNum}. Reason: "${reason}". Booking unassigned and awaiting admin reassignment.`,
      payload: {
        booking_number: bNum,
        action: 'ASSIGNMENT_DECLINED',
        reason,
      },
    });

    return { data: updatedBooking, error: null };
  } catch (err) {
    console.error('declineAssignment error:', err);
    return { data: null, error: err };
  }
}

/**
 * requestRescheduleByPhotographer
 * -------------------------------
 * Workflow Step 5: Photographer requests session reschedule from Admin.
 */
export async function requestRescheduleByPhotographer({
  bookingId,
  photographerId,
  photographerName = 'Studio Photographer',
  bookingNumber = '',
  proposedDate = '',
  proposedTime = '',
  reason = ''
}) {
  if (!isSupabaseConfigured || !bookingId) return { error: null };
  try {
    const msg = `Photographer ${photographerName} requested reschedule for #${bookingNumber}. Proposed: ${proposedDate} at ${proposedTime}. Reason: "${reason}".`;

    await supabase.from('booking_status_history').insert({
      booking_id: bookingId,
      status: 'CONFIRMED',
      remarks: msg,
      changed_by: photographerId,
    });

    await createTransferLog({
      bookingId,
      senderId: photographerId,
      senderRole: 'photographer',
      targetRole: 'admin',
      transferType: 'ISSUE_ESCALATION',
      priority: 'HIGH',
      title: `Reschedule Request: #${bookingNumber}`,
      message: msg,
      payload: {
        booking_number: bookingNumber,
        proposed_date: proposedDate,
        proposed_time: proposedTime,
        reason,
        requested_by: photographerName,
      },
    });

    return { error: null };
  } catch (err) {
    console.error('requestRescheduleByPhotographer error:', err);
    return { error: err };
  }
}

// ── Real Photographer KPI Metrics ──────────────────────────────────────────

/**
 * getPhotographerStats
 * --------------------
 * Calculates real counts for today's shoots, upcoming this week, in progress, and completed.
 */
export async function getPhotographerStats(photographerId) {
  if (!isSupabaseConfigured) {
    return {
      todayShoots: 0,
      upcomingWeek: 0,
      inProgress: 0,
      completed: 0,
    };
  }

  try {
    const { data: bookings } = await getAssignedBookings(photographerId);
    if (!bookings || bookings.length === 0) {
      return {
        todayShoots: 0,
        upcomingWeek: 0,
        inProgress: 0,
        completed: 0,
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const nextWeekStr = sevenDaysFromNow.toISOString().split('T')[0];

    const todayShoots = bookings.filter(
      b => b.event_date === todayStr && !['CANCELLED', 'REJECTED'].includes(b.status)
    ).length;

    const upcomingWeek = bookings.filter(
      b => b.event_date >= todayStr && b.event_date <= nextWeekStr && !['CANCELLED', 'REJECTED', 'COMPLETED'].includes(b.status)
    ).length;

    const inProgress = bookings.filter(
      b => ['PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 'EDITING', 'PRINTING', 'READY'].includes(b.status)
    ).length;

    const completed = bookings.filter(b => b.status === 'COMPLETED').length;

    return {
      todayShoots,
      upcomingWeek,
      inProgress,
      completed,
    };
  } catch (err) {
    console.error('getPhotographerStats error:', err);
    return {
      todayShoots: 0,
      upcomingWeek: 0,
      inProgress: 0,
      completed: 0,
    };
  }
}

// ── Availability ─────────────────────────────────────────────────────────────

/**
 * getAvailability
 * ---------------
 * Fetches photographer_availability records for a given month/year,
 * supporting both schema date column variants.
 */
export async function getAvailability(photographerId, month, year) {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayNum = new Date(year, month, 0).getDate();
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

    let query = supabase
      .from('photographer_availability')
      .select('*');

    if (photographerId) {
      query = query.eq('photographer_id', photographerId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filter to the month range in memory safely without UTC offset shifts
    const records = (data || []).filter(r => {
      const d = (r.availability_date || r.date || '').toString().substring(0, 10);
      return d >= startStr && d <= endStr;
    });

    return { data: records, error: null };
  } catch (err) {
    console.error('getAvailability error:', err);
    return { data: [], error: err };
  }
}

/**
 * setAvailability
 * ---------------
 * Saves or toggles custom availability for a specific date.
 */
export async function setAvailability({ photographer_id, date, is_available, notes = null, start_time = '09:00:00', end_time = '18:00:00' }) {
  if (!isSupabaseConfigured) return { data: null, error: null };
  try {
    // Delete existing records for that date and photographer
    const { error: delError } = await supabase
      .from('photographer_availability')
      .delete()
      .eq('photographer_id', photographer_id)
      .eq('availability_date', date);

    if (delError) {
      console.warn('Delete previous availability warning:', delError);
    }

    const statusVal = is_available ? 'AVAILABLE' : 'UNAVAILABLE';

    const { data, error } = await supabase
      .from('photographer_availability')
      .insert([{
        photographer_id,
        availability_date: date,
        status: statusVal,
        start_time,
        end_time,
        notes,
      }])
      .select();

    return { data: data?.[0] || null, error };
  } catch (err) {
    console.error('setAvailability error:', err);
    return { data: null, error: err };
  }
}

/**
 * setBatchAvailability
 * ---------------------
 * Saves or toggles custom availability for an array of dates.
 */
export async function setBatchAvailability({ photographer_id, dates = [], is_available, notes = null }) {
  if (!isSupabaseConfigured || !dates || dates.length === 0) return { data: null, error: null };
  try {
    const { error: delError } = await supabase
      .from('photographer_availability')
      .delete()
      .eq('photographer_id', photographer_id)
      .in('availability_date', dates);

    if (delError) {
      console.warn('Batch delete previous availability warning:', delError);
    }

    const statusVal = is_available ? 'AVAILABLE' : 'UNAVAILABLE';
    const rows = dates.map(d => ({
      photographer_id,
      availability_date: d,
      status: statusVal,
      start_time: '09:00:00',
      end_time: '18:00:00',
      notes,
    }));

    const { data, error } = await supabase
      .from('photographer_availability')
      .insert(rows)
      .select();

    return { data: data || [], error };
  } catch (err) {
    console.error('setBatchAvailability error:', err);
    return { data: null, error: err };
  }
}

/**
 * toggleGeneralAvailability
 * -------------------------
 * Updates is_available flag in photographer_profiles table.
 */
export async function toggleGeneralAvailability(photographerId, isAvailable) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase
      .from('photographer_profiles')
      .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
      .eq('id', photographerId);
    return { error };
  } catch (err) {
    console.error('toggleGeneralAvailability error:', err);
    return { error: err };
  }
}

// ── Profile Management ───────────────────────────────────────────────────────

/**
 * getPhotographerProfileData
 * --------------------------
 * Fetches photographer profile and related photographer_profiles record.
 */
export async function getPhotographerProfileData(photographerId) {
  if (!isSupabaseConfigured) return { data: null, error: null };
  try {
    const { data: profile, error: pError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, avatar_url, is_active, role')
      .eq('id', photographerId)
      .single();

    if (pError) throw pError;

    const { data: phProfile } = await supabase
      .from('photographer_profiles')
      .select('specialization, bio, is_available')
      .eq('id', photographerId)
      .single();

    return {
      data: {
        ...profile,
        specialization: phProfile?.specialization || '',
        bio: phProfile?.bio || '',
        is_available: phProfile?.is_available ?? true,
      },
      error: null,
    };
  } catch (err) {
    console.error('getPhotographerProfileData error:', err);
    return { data: null, error: err };
  }
}

/**
 * updatePhotographerProfileData
 * -----------------------------
 * Updates profiles and photographer_profiles in tandem.
 */
export async function updatePhotographerProfileData(photographerId, {
  first_name,
  last_name,
  phone,
  specialization,
  bio,
  is_available,
  is_active,
}) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    // 1. Update profiles table
    const profileUpdates = {
      first_name,
      last_name,
      phone,
      updated_at: new Date().toISOString(),
    };
    if (typeof is_active === 'boolean') {
      profileUpdates.is_active = is_active;
    }

    const { error: pError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', photographerId);

    if (pError) throw pError;

    // 2. Upsert photographer_profiles
    const phUpdates = {
      id: photographerId,
      specialization,
      bio,
      updated_at: new Date().toISOString(),
    };
    if (typeof is_available === 'boolean') {
      phUpdates.is_available = is_available;
    }

    const { error: phError } = await supabase
      .from('photographer_profiles')
      .upsert(phUpdates);

    if (phError) throw phError;

    return { error: null };
  } catch (err) {
    console.error('updatePhotographerProfileData error:', err);
    return { error: err };
  }
}

// ── Photo Outputs ────────────────────────────────────────────────────────────

export async function getPhotoOutputs(bookingId) {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('photo_outputs')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    const enriched = (data || []).map(item => ({
      ...item,
      file_url: item.file_url || item.file_path,
      setName: extractSetName(item.file_name),
      cleanFileName: getCleanFileName(item.file_name)
    }));

    return { data: enriched, error };
  } catch (err) {
    console.error('getPhotoOutputs error:', err);
    return { data: [], error: err };
  }
}

export function extractSetName(fileName) {
  if (!fileName) return 'Main Set';
  const match = fileName.match(/^\[(.*?)\]/);
  return match ? match[1] : 'Main Set';
}

export function getCleanFileName(fileName) {
  if (!fileName) return '';
  return fileName.replace(/^\[(.*?)\]\s*/, '');
}

export async function uploadPhotoOutput(file, bookingId, setName = 'Main Set') {
  if (!isSupabaseConfigured) return { data: null, error: null };
  try {
    // Validate file security: max 25MB, images or PDF deliverables
    const validation = validateUploadFile(file, {
      maxSizeBytes: 25 * 1024 * 1024,
      allowedExts: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    });

    if (!validation.valid) {
      return { data: null, error: new Error(validation.error) };
    }

    const safeName = sanitizeFileName(file.name);
    const taggedName = setName ? `[${setName.trim()}] ${safeName}` : safeName;
    const filePath = `outputs/${bookingId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('outputs')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) return { data: null, error: uploadError };

    const { data: urlData } = supabase.storage
      .from('outputs')
      .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl || filePath;

    const { data, error } = await supabase
      .from('photo_outputs')
      .insert([{
        booking_id: bookingId,
        file_path: publicUrl,
        file_name: taggedName,
        file_type: file.type || 'image/jpeg',
        file_size: file.size || 0,
        status: 'UPLOADED',
      }])
      .select()
      .single();

    if (error) {
      // Fallback try with minimal fields if table constraint differs
      console.warn('First insert attempt warning:', error);
      const fallback = await supabase
        .from('photo_outputs')
        .insert([{
          booking_id: bookingId,
          file_path: publicUrl,
          file_name: taggedName,
        }])
        .select()
        .single();
      return fallback;
    }

    return { data, error };
  } catch (err) {
    console.error('uploadPhotoOutput error:', err);
    return { data: null, error: err };
  }
}

/**
 * deletePhotoOutput
 * -----------------
 * Deletes a photo deliverable output.
 */
export async function deletePhotoOutput(outputId) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase
      .from('photo_outputs')
      .delete()
      .eq('id', outputId);
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('deletePhotoOutput error:', err);
    return { error: err };
  }
}

/**
 * getRequiredSetsForBooking
 * -------------------------
 * Identifies the exact sample photo sets needed depending on the client's order package & tier.
 */
export function getRequiredSetsForBooking(booking) {
  if (!booking) return [];

  const serviceName = (booking.service?.name || '').toLowerCase();
  const tier = (booking.tier_name || '').trim();
  const category = (booking.service?.category || '').toLowerCase();

  // 1. Senior High School Packages
  if (serviceName.includes('senior high') || category.includes('senior-high')) {
    if (tier.toLowerCase().includes('set a')) {
      return [
        { id: 'set-1', name: 'Set 1: Toga / Cap Portrait', description: 'Framed master portrait with graduation cap', icon: 'bi-mortarboard' },
        { id: 'set-2', name: 'Set 2: Filipiniana / Barong', description: 'Traditional Filipino formal attire portrait', icon: 'bi-person-badge' },
        { id: 'set-3', name: 'Set 3: Formal Attire / ID', description: '2x2 and passport size formal shots', icon: 'bi-person-square' },
      ];
    }
    if (tier.toLowerCase().includes('set b')) {
      return [
        { id: 'set-1', name: 'Set 1: Toga / Cap Portrait', description: '8x10 crystal wood toga portrait', icon: 'bi-mortarboard' },
        { id: 'set-2', name: 'Set 2: Formal Attire', description: '2x2 studio formal attire photo', icon: 'bi-person-square' },
        { id: 'set-3', name: 'Set 3: Passport / ID Spec', description: 'Official passport size photo spec', icon: 'bi-person-badge' },
      ];
    }
    if (tier.toLowerCase().includes('set c')) {
      return [
        { id: 'set-1', name: 'Set 1: Toga / Cap Portrait', description: '8x10 toga portrait without frame', icon: 'bi-mortarboard' },
        { id: 'set-2', name: 'Set 2: Formal Attire / ID', description: '2x2 and passport formal shots', icon: 'bi-person-square' },
      ];
    }
    if (tier.toLowerCase().includes('set d')) {
      return [
        { id: 'set-1', name: 'Set 1: Toga / Cap Portrait', description: '8x10 graduation toga portrait', icon: 'bi-mortarboard' },
        { id: 'set-2', name: 'Set 2: 2x2 Formal Attire', description: 'Formal attire for records', icon: 'bi-person-square' },
      ];
    }
    return [
      { id: 'set-1', name: 'Set 1: Toga / Cap Portrait', description: 'Graduation toga and cap master', icon: 'bi-mortarboard' },
      { id: 'set-2', name: 'Set 2: Filipiniana / Barong', description: 'Traditional formal attire portrait', icon: 'bi-person-badge' },
      { id: 'set-3', name: 'Set 3: Formal Attire', description: 'Formal portrait and 2x2 ID', icon: 'bi-person-square' },
    ];
  }

  // 2. College / University Packages
  if (serviceName.includes('college') || category.includes('college')) {
    if (tier.toLowerCase().includes('set a')) {
      return [
        { id: 'set-1', name: 'Set 1: Toga / Academic Robe Master', description: '12x18 crystal wood master portrait', icon: 'bi-mortarboard' },
        { id: 'set-2', name: 'Set 2: Filipiniana / Barong', description: '8x10 crystal frame traditional attire', icon: 'bi-person-badge' },
        { id: 'set-3', name: 'Set 3: Family Portrait', description: '8x10 crystal frame family keepsake', icon: 'bi-people' },
        { id: 'set-4', name: 'Set 4: Casual / Milestone Look', description: '2x2 casual attire and creative pose', icon: 'bi-camera' },
        { id: 'set-5', name: 'Set 5: Formal 2x2 & Passport ID', description: 'Official graduation ID credentials', icon: 'bi-person-square' },
      ];
    }
    if (tier.toLowerCase().includes('set b')) {
      return [
        { id: 'set-1', name: 'Set 1: Toga / Academic Robe Master', description: '12x16 crystal wood master portrait', icon: 'bi-mortarboard' },
        { id: 'set-2', name: 'Set 2: Filipiniana / Barong', description: '8x10 traditional attire portrait', icon: 'bi-person-badge' },
        { id: 'set-3', name: 'Set 3: Family Portrait', description: 'Family commemorative portrait', icon: 'bi-people' },
        { id: 'set-4', name: 'Set 4: Formal Attire & ID', description: '2x2 and passport size photo shots', icon: 'bi-person-square' },
      ];
    }
    return [
      { id: 'set-1', name: 'Set 1: Toga / Academic Robe Master', description: 'Collegiate toga master portrait', icon: 'bi-mortarboard' },
      { id: 'set-2', name: 'Set 2: Filipiniana / Barong', description: 'Traditional Filipino formal portrait', icon: 'bi-person-badge' },
      { id: 'set-3', name: 'Set 3: Family / Group Portrait', description: 'Commemorative studio portrait', icon: 'bi-people' },
      { id: 'set-4', name: 'Set 4: Formal 2x2 & ID', description: 'Graduation credential photo set', icon: 'bi-person-square' },
    ];
  }

  // 3. Wedding Services
  if (serviceName.includes('wedding') || category.includes('wedding')) {
    return [
      { id: 'set-1', name: 'Set 1: Bridal & Groom Preparation', description: 'Morning details, attire, and prep', icon: 'bi-flower1' },
      { id: 'set-2', name: 'Set 2: Ceremony & Vows', description: 'Solemn ceremony exchange and rings', icon: 'bi-heart' },
      { id: 'set-3', name: 'Set 3: Couple Portraits', description: 'Formal bride & groom portraits', icon: 'bi-people' },
      { id: 'set-4', name: 'Set 4: Reception & Highlights', description: 'Reception banquet, toasts, and cake', icon: 'bi-stars' },
    ];
  }

  // 4. Default / General Studio
  return [
    { id: 'set-1', name: 'Set 1: Primary Master Portrait', description: 'Main hero studio look', icon: 'bi-camera' },
    { id: 'set-2', name: 'Set 2: Secondary Look', description: 'Alternative outfit or pose', icon: 'bi-person' },
    { id: 'set-3', name: 'Set 3: Formal / ID Detail', description: 'Close-up formal crop', icon: 'bi-person-square' },
  ];
}

/**
 * submitSamplesToAdmin
 * --------------------
 * Photographer submits uploaded sample photo sets to Admin for quality review.
 */
export async function submitSamplesToAdmin({
  bookingId,
  photographerId,
  photographerName = 'Photographer',
  bookingNumber = '',
  photoCount = 0,
  setsSummary = ''
}) {
  if (!isSupabaseConfigured || !bookingId) return { data: null, error: null };
  try {
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'EDITING',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) console.warn('Status update note:', updateError);

    const bNum = bookingNumber || updatedBooking?.booking_number || '';

    // Record in booking_status_history
    await supabase.from('booking_status_history').insert({
      booking_id: bookingId,
      status: 'EDITING',
      remarks: `Photographer ${photographerName} submitted ${photoCount} sample photo(s) (${setsSummary || 'All Sets'}) for Admin Review.`,
      changed_by: photographerId,
    });

    // Create Workstation Transfer to Admin
    const { data: transfer, error: transferError } = await createTransferLog({
      bookingId,
      senderId: photographerId,
      senderRole: 'photographer',
      targetRole: 'admin',
      transferType: 'OUTPUT_SUBMISSION',
      priority: 'HIGH',
      title: `Sample Photos Submitted for Review: #${bNum}`,
      message: `Photographer ${photographerName} uploaded ${photoCount} sample photo(s) (${setsSummary || 'Sets'}) for booking #${bNum}. Pending Admin review and confirmation before staff finalization.`,
      payload: {
        booking_number: bNum,
        photo_count: photoCount,
        sets_summary: setsSummary,
        stage: 'PENDING_ADMIN_REVIEW'
      }
    });

    return { data: updatedBooking, transfer, error: transferError };
  } catch (err) {
    console.error('submitSamplesToAdmin error:', err);
    return { data: null, error: err };
  }
}

/**
 * confirmSamplesAndForwardToStaff
 * -------------------------------
 * Admin reviews and confirms sample photos, forwarding order to Staff for finalizations.
 */
export async function confirmSamplesAndForwardToStaff({
  bookingId,
  adminId,
  adminName = 'Studio Admin',
  bookingNumber = '',
  photoCount = 0,
  notes = ''
}) {
  if (!isSupabaseConfigured || !bookingId) return { data: null, error: null };
  try {
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'PRINTING',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) console.warn('Status update note:', updateError);

    // Update photo outputs status to READY
    await supabase
      .from('photo_outputs')
      .update({ status: 'READY', updated_at: new Date().toISOString() })
      .eq('booking_id', bookingId);

    const bNum = bookingNumber || updatedBooking?.booking_number || '';

    // Record in history
    await supabase.from('booking_status_history').insert({
      booking_id: bookingId,
      status: 'PRINTING',
      remarks: `Admin ${adminName} confirmed sample photo sets. Forwarded to staff for finalization and print production.${notes ? ` Notes: ${notes}` : ''}`,
      changed_by: adminId,
    });

    // Create Workstation Transfer to Staff
    const { data: transfer, error: transferError } = await createTransferLog({
      bookingId,
      senderId: adminId,
      senderRole: 'admin',
      targetRole: 'staff',
      transferType: 'ORDER_HANDOFF',
      priority: 'HIGH',
      title: `Approved Photo Sets for Finalization: #${bNum}`,
      message: `Admin ${adminName} confirmed sample photo sets for booking #${bNum}. Forwarded to staff for final retouching, print production, and packaging.${notes ? ` Admin Notes: ${notes}` : ''}`,
      payload: {
        booking_number: bNum,
        photo_count: photoCount,
        stage: 'STAFF_FINALIZATION',
        notes
      }
    });

    return { data: updatedBooking, transfer, error: transferError };
  } catch (err) {
    console.error('confirmSamplesAndForwardToStaff error:', err);
    return { data: null, error: err };
  }
}

/**
 * returnSamplesToPhotographer
 * ---------------------------
 * Admin sends sample photos back to Photographer for corrections or reshoot.
 */
export async function returnSamplesToPhotographer({
  bookingId,
  adminId,
  adminName = 'Studio Admin',
  bookingNumber = '',
  notes = 'Please adjust or retake selected photo sets.'
}) {
  if (!isSupabaseConfigured || !bookingId) return { data: null, error: null };
  try {
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'CAPTURE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    const bNum = bookingNumber || updatedBooking?.booking_number || '';

    // Record in history
    await supabase.from('booking_status_history').insert({
      booking_id: bookingId,
      status: 'CAPTURE',
      remarks: `Admin ${adminName} requested sample revisions: "${notes}". Returned to photographer.`,
      changed_by: adminId,
    });

    // Create Workstation Transfer to Photographer
    const { data: transfer, error: transferError } = await createTransferLog({
      bookingId,
      senderId: adminId,
      senderRole: 'admin',
      targetRole: 'photographer',
      transferType: 'ISSUE_ESCALATION',
      priority: 'HIGH',
      title: `Sample Revision Needed: #${bNum}`,
      message: `Admin requested revisions on uploaded photo sets for #${bNum}: ${notes}`,
      payload: {
        booking_number: bNum,
        stage: 'REVISION_REQUESTED',
        notes
      }
    });

    return { data: updatedBooking, transfer, error: transferError };
  } catch (err) {
    console.error('returnSamplesToPhotographer error:', err);
    return { data: null, error: err };
  }
}

/**
 * getCleanLocation
 * Extracts clean studio/venue name and maps link without raw URL clutter.
 */
export function getCleanLocation(locStr) {
  if (!locStr) {
    return {
      name: "E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=311+Rizal+Street,+City+of+Naga,+Cebu"
    };
  }
  const match = locStr.match(/(https?:\/\/[^\s,]+)/i);
  const mapUrl = match ? match[1] : null;
  let cleanName = locStr
    .replace(/(https?:\/\/[^\s,]+)/ig, "")
    .replace(/\(Cebu Branch\)/ig, "")
    .replace(/E-Kodak Photography Studio/ig, "E-Kodak Studio")
    .trim()
    .replace(/,\s*$/, "")
    .trim();

  if (!cleanName || cleanName === "E-Kodak Studio" || cleanName.toLowerCase() === "studio") {
    cleanName = "E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu";
  }

  return { 
    name: cleanName, 
    mapUrl: mapUrl || "https://www.google.com/maps/search/?api=1&query=311+Rizal+Street,+City+of+Naga,+Cebu" 
  };
}

function parseStudentDetailsFromNotes(notes) {
  const blockMatch = notes.match(/\[(?:STUDENT DETAILS|STUDENT & YEARBOOK DETAILS)\]([\s\S]*?)(?=(\n\s*\n\s*\[|$))/i);
  if (!blockMatch) return null;
  const block = blockMatch[1];
  return {
    type: block.match(/•\s*Type:\s*([^\n\r]+)/i)?.[1]?.trim(),
    mode: block.match(/•\s*(?:Booking\s*Mode|Agreement(?:\s*Status)?):\s*([^\n\r]+)/i)?.[1]?.trim(),
    school: block.match(/•\s*School:\s*([^\n\r]+)/i)?.[1]?.trim(),
    campus: block.match(/•\s*Campus\s*(?:\/\s*Address)?:\s*([^\n\r]+)/i)?.[1]?.trim(),
    degree: block.match(/•\s*(?:Degree|Program|Strand|Course)(?:\s*\/\s*(?:Program|Strand|Course))?:\s*([^\n\r]+)/i)?.[1]?.trim(),
    section: block.match(/•\s*Section\s*(?:\/\s*Batch)?:\s*([^\n\r]+)/i)?.[1]?.trim(),
    studentId: block.match(/•\s*Student\s*ID:\s*([^\n\r]+)/i)?.[1]?.trim(),
    scheduleNote: block.match(/•\s*Schedule\s*Note:\s*([^\n\r]+)/i)?.[1]?.trim(),
  };
}

/**
 * parseBookingBrief
 * Deeply extracts structured specifications (academic, wedding, corporate, pegs)
 * and cleans human notes so raw machine markdown blocks never pollute the UI.
 */
export function parseBookingBrief(booking) {
  const notes = booking?.notes || '';
  const studioSpecs = booking?.customer?.studio_specs || {};

  // 1. Academic & Yearbook Specs
  let studentData = parseStudentDetailsFromNotes(notes);

  const rawMode = studentData?.mode || booking?.student_details?.booking_mode || '';
  const isSchoolPartner = rawMode.toUpperCase() === 'SCHOOL_PARTNER' || 
    (rawMode.toLowerCase().includes('school') && !rawMode.toLowerCase().includes('individual')) ||
    notes.includes('School Pictorial') ||
    notes.includes('Official School Partner') ||
    notes.includes('School Partner Agreement');

  const academicSpecs = {
    school: studentData?.school || studioSpecs.university || null,
    campus: studentData?.campus || studioSpecs.campus || null,
    degree: studentData?.degree || studioSpecs.degree || null,
    section: studentData?.section || null,
    studentId: studentData?.studentId || null,
    type: studentData?.type || null,
    mode: rawMode || null,
    isSchoolPartner,
    scheduleNote: studentData?.scheduleNote || booking?.student_details?.schedule_note || null,
    togaSize: studioSpecs.togaSize || null,
    innerAttireSize: studioSpecs.innerAttireSize || null,
    backdrop: studioSpecs.backdrop || null,
    retouch: studioSpecs.retouch || null,
  };

  const hasAcademicSpecs = Object.values(academicSpecs).some(Boolean);

  // 2. Wedding Specs
  const weddingMatch = notes.match(/\[WEDDING DETAILS\]([\s\S]*?)(?=(\n\s*\n\s*\[|$))/i);
  let weddingSpecs = null;
  if (weddingMatch) {
    const block = weddingMatch[1];
    weddingSpecs = {
      couple: block.match(/•\s*Couple:\s*([^\n\r]+)/i)?.[1]?.trim(),
      theme: block.match(/•\s*Theme\s*(?:\/\s*Palette)?:\s*([^\n\r]+)/i)?.[1]?.trim(),
      venue: block.match(/•\s*Ceremony\s*Venue:\s*([^\n\r]+)/i)?.[1]?.trim(),
      coordinator: block.match(/•\s*Coordinator:\s*([^\n\r]+)/i)?.[1]?.trim(),
    };
  }

  // 3. Corporate Specs
  const corporateMatch = notes.match(/\[CORPORATE DETAILS\]([\s\S]*?)(?=(\n\s*\n\s*\[|$))/i);
  let corporateSpecs = null;
  if (corporateMatch) {
    const block = corporateMatch[1];
    corporateSpecs = {
      company: block.match(/•\s*Company:\s*([^\n\r]+)/i)?.[1]?.trim(),
      role: block.match(/•\s*Role:\s*([^\n\r]+)/i)?.[1]?.trim(),
      usage: block.match(/•\s*Intended\s*Photo\s*Usage:\s*([^\n\r]+)/i)?.[1]?.trim(),
    };
  }

  // 4. Style Pegs
  const pegsMatch = notes.match(/\[SELECTED STYLE PEGS\]([\s\S]*?)(?=(\n\s*\n\s*\[|$))/i);
  let stylePegs = [];
  if (pegsMatch) {
    stylePegs = pegsMatch[1]
      .split('\n')
      .map(l => l.trim().replace(/^•\s*/, ''))
      .filter(Boolean);
  }

  // 5. Clean Human Notes (Strip all machine generated blocks)
  const cleanNotes = notes
    .replace(/\[STUDENT & YEARBOOK DETAILS\][\s\S]*?(?=(\n\s*\n\s*\[|$))/gi, '')
    .replace(/\[WEDDING DETAILS\][\s\S]*?(?=(\n\s*\n\s*\[|$))/gi, '')
    .replace(/\[CORPORATE DETAILS\][\s\S]*?(?=(\n\s*\n\s*\[|$))/gi, '')
    .replace(/\[SELECTED STYLE PEGS\][\s\S]*?(?=(\n\s*\n\s*\[|$))/gi, '')
    .replace(/\[SELECTED ADD-ONS\][\s\S]*?(?=(\n\s*\n\s*\[|$))/gi, '')
    .trim();

  // 6. Client Name and Contact helper
  const clientName = [booking?.customer?.first_name, booking?.customer?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || booking?.customer?.email?.split('@')[0] || 'Studio Client';

  const cleanLocation = getCleanLocation(booking?.location);

  return {
    academicSpecs,
    hasAcademicSpecs,
    weddingSpecs,
    corporateSpecs,
    stylePegs,
    cleanNotes,
    clientName,
    cleanLocation,
  };
}

// ── Smart AI Conflict Resolver & Auto-Reschedule ─────────────────────────────

// Helper for Philippine holidays in AI schedule optimizer
function checkPhilippineHoliday(year, month0, day) {
  const m = month0 + 1;
  const mmdd = `${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const fixedHolidays = {
    '01-01': 'New Year’s Day',
    '01-02': 'Special Holiday',
    '02-25': 'EDSA Revolution',
    '04-09': 'Day of Valor',
    '05-01': 'Labor Day',
    '06-12': 'Independence Day',
    '08-21': 'Ninoy Aquino Day',
    '09-03': 'Victory Day',
    '09-21': 'Martial Law Memorial',
    '11-01': 'All Saints’ Day',
    '11-02': 'All Souls’ Day',
    '11-30': 'Bonifacio Day',
    '12-08': 'Immaculate Conception',
    '12-24': 'Christmas Eve',
    '12-25': 'Christmas Day',
    '12-30': 'Rizal Day',
    '12-31': 'New Year’s Eve',
  };
  if (fixedHolidays[mmdd]) return fixedHolidays[mmdd];
  if (m === 8) {
    const d = new Date(year, 7, day);
    if (d.getDay() === 1 && day >= 25) return 'National Heroes Day';
  }
  if (year === 2026) {
    if (mmdd === '04-02') return 'Maundy Thursday';
    if (mmdd === '04-03') return 'Good Friday';
    if (mmdd === '04-04') return 'Black Saturday';
  }
  return null;
}

/**
 * findOptimalRescheduleSlots
 * --------------------------
 * AI recommendation engine that scans upcoming calendar days for open bay slots,
 * matching client time preferences and photographer availability with 0 collisions.
 * Smarter with Philippine holidays, weekend declarations, and studio operating hours.
 */
export function findOptimalRescheduleSlots({
  booking,
  allBookings = [],
  availabilityList = [],
  daysToScan = 28,
}) {
  if (!booking) return [];

  const currentEventDate = booking.event_date ? new Date(booking.event_date) : new Date();
  const rawTime = booking.preferred_time || '09:00:00';
  const originalPreferredTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime;
  const originalDayOfWeek = currentEventDate.getDay();

  const suggestions = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Scan upcoming days starting from tomorrow
  for (let offset = 1; offset <= daysToScan; offset++) {
    const candidateDate = new Date(currentEventDate);
    candidateDate.setDate(candidateDate.getDate() + offset);

    if (candidateDate < now) continue;

    const dateStr = candidateDate.toISOString().split('T')[0];

    // Check if day is explicitly marked unavailable or blocked in availability table
    const availRecord = availabilityList.find(
      a => (a.availability_date === dateStr || a.date === dateStr)
    );
    const isExplicitlyBlocked = availRecord && (
      availRecord.status?.toLowerCase() === 'unavailable' ||
      availRecord.status?.toLowerCase() === 'blocked' ||
      availRecord.is_available === false
    );
    if (isExplicitlyBlocked) continue;

    // Check existing active bookings on candidate date
    const bookingsOnDate = allBookings.filter(
      b => b.event_date === dateStr &&
        b.id !== booking.id &&
        !['CANCELLED', 'DECLINED'].includes(b.status)
    );

    // Check if customer's preferred time slot collides
    const timeCollides = bookingsOnDate.some(b => b.preferred_time === originalPreferredTime);
    if (timeCollides) continue;

    // Limit to max 3 shoots per photographer per day
    if (bookingsOnDate.length >= 3) continue;

    // Calculate AI Compatibility Score (0-100)
    let score = 70;
    const candidateDayOfWeek = candidateDate.getDay();
    const dayDiff = offset;
    const isWeekend = candidateDayOfWeek === 0 || candidateDayOfWeek === 6;
    const isSunday = candidateDayOfWeek === 0;
    const holidayName = checkPhilippineHoliday(
      candidateDate.getFullYear(),
      candidateDate.getMonth(),
      candidateDate.getDate()
    );

    // Studio Operating Days: Mon-Sat 9 AM - 6 PM (Sunday closed/appointment only)
    if (isSunday) {
      score -= 15; // Sunday penalty
    } else {
      score += 5;  // Regular studio hours bonus
    }

    // National holiday adjustment
    if (holidayName) {
      score -= 8; // Slight penalty for holidays unless requested
    }

    // Bonus if same day-of-week (e.g., Friday customer wants another Friday)
    if (candidateDayOfWeek === originalDayOfWeek) score += 15;

    // Bonus for immediate proximity (within 3-8 days)
    if (dayDiff <= 7) score += 15;
    else if (dayDiff <= 14) score += 8;

    // Slight penalty if bay already has 2 shoots scheduled
    if (bookingsOnDate.length === 2) score -= 10;

    const dayName = candidateDate.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = candidateDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const tags = [
      holidayName ? `★ ${holidayName}` : null,
      isSunday ? 'Sun (By Appt)' : 'Studio Hours (9-6)',
      candidateDayOfWeek === originalDayOfWeek ? `Same Day (${dayName})` : null,
      '0 Collisions'
    ].filter(Boolean);

    suggestions.push({
      date: dateStr,
      time: originalPreferredTime.slice(0, 5), // 'HH:MM'
      fullTime: originalPreferredTime,
      formattedDate,
      dayName,
      dayOfWeek: candidateDayOfWeek,
      daysFromOriginal: dayDiff,
      existingShootCount: bookingsOnDate.length,
      isWeekend,
      isSunday,
      holiday: holidayName,
      score: Math.min(100, Math.max(50, score)),
      tags,
      rationale: holidayName ? `★ ${holidayName}` : isSunday ? 'Sun · By Appt' : `Studio Hours · ${dayName}`,
    });
  }

  // Sort by highest AI score, then earliest date
  suggestions.sort((a, b) => b.score - a.score || a.daysFromOriginal - b.daysFromOriginal);
  return suggestions.slice(0, 4);
}

/**
 * aiAutoRescheduleBooking
 * -----------------------
 * Automatically reschedules a conflicting booking to the AI-recommended date/time,
 * updates Supabase records, records audit trail, and notifies client and admin.
 */
export async function aiAutoRescheduleBooking({
  bookingId,
  bookingNumber,
  proposedDate,
  proposedTime,
  reason,
  photographerId,
  photographerName,
  customerId,
}) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    // 1. Fetch current booking state
    const { data: currentBooking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, booking_number, event_date, preferred_time, notes, customer_id, status')
      .eq('id', bookingId)
      .single();

    if (fetchErr) throw fetchErr;

    const oldDate = currentBooking.event_date;
    const oldTime = currentBooking.preferred_time;

    const auditEntry = `\n[AI AUTO-RESCHEDULE]: Shoot moved from ${oldDate || 'Date TBD'} ${oldTime || ''} to ${proposedDate} ${proposedTime}. Reason: "${reason || 'Photographer schedule adjustment'}". Executed via Studio AI by ${photographerName || 'Assigned Photographer'} at ${new Date().toISOString()}`;
    const updatedNotes = (currentBooking.notes || '') + auditEntry;

    // 2. Update booking schedule
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        event_date: proposedDate,
        preferred_time: proposedTime,
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateErr) throw updateErr;

    // 3. Notify customer
    const targetCustomer = customerId || currentBooking.customer_id;
    if (targetCustomer) {
      await supabase.from('notifications').insert([{
        user_id: targetCustomer,
        booking_id: bookingId,
        title: 'Photoshoot Schedule Updated by Studio AI',
        message: `Your booking #${bookingNumber || currentBooking.booking_number} has been automatically rescheduled to ${proposedDate} at ${proposedTime} due to bay scheduling adjustments.`,
        notification_type: 'BOOKING_RESCHEDULED',
        is_read: false,
      }]);
    }

    // 4. Log status history record
    await supabase.from('booking_status_history').insert([{
      booking_id: bookingId,
      status: currentBooking.status || 'CONFIRMED',
      changed_by: photographerId,
      remarks: `AI auto-rescheduled shoot to ${proposedDate} ${proposedTime}. Reason: ${reason || 'Off-duty date block'}`,
    }]).select();

    return { error: null, oldDate, proposedDate, proposedTime };
  } catch (err) {
    console.error('aiAutoRescheduleBooking error:', err);
    return { error: err };
  }
}


