import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * getDashboardStats
 * -----------------
 * Returns booking counts grouped by status for the admin dashboard overview.
 * Requires staff/admin role — RLS enforces this on the server.
 */
export async function getDashboardStats() {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: new Error('Database connection is not configured. Real stats require active database credentials.'),
    };
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('status, payment_status');

    if (error) throw error;

    const counts = {
      total: data.length,
      pending: 0,
      confirmed: 0,
      photographer_assigned: 0,
      capture: 0,
      editing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
      // Aggregates based on Phase 4.1 requirements
      active_jobs: 0,
      unpaid_partial: 0,
      cleared_bookings: 0,
    };

    data.forEach(({ status, payment_status }) => {
      const key = status?.toLowerCase();
      if (key && key in counts) counts[key]++;
      
      // Calculate active jobs (assigned -> ready)
      if (['PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 'EDITING', 'READY'].includes(status)) {
        counts.active_jobs++;
      }

      // Calculate unpaid/partial bookings
      if (['UNPAID', 'PARTIAL'].includes(payment_status)) {
        counts.unpaid_partial++;
      }

      // Calculate cleared (fully paid) bookings
      if (payment_status === 'PAID') {
        counts.cleared_bookings++;
      }
    });

    // Also get total recorded payments count
    const { count: paymentsCount } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true });

    counts.total_payments_recorded = paymentsCount || 0;
    // Cleared total: either fully paid bookings or total payments recorded
    counts.cleared = counts.cleared_bookings > 0 ? counts.cleared_bookings : (paymentsCount || 0);

    return { data: counts, error: null };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return { data: null, error };
  }
}

/**
 * getRecentBookings
 * -----------------
 * Returns the latest bookings with joined service and customer profiles.
 * @param {number} limit — number of rows (default 50)
 */
export async function getRecentBookings(limit = 50) {
  if (!isSupabaseConfigured) {
    return {
      data: [],
      error: new Error('Database connection is not configured.'),
    };
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        status,
        payment_status,
        tier_name,
        event_date,
        preferred_time,
        location,
        notes,
        total_amount,
        down_payment_amount,
        remaining_balance,
        down_payment_confirmed,
        created_at,
        service:services(id, name, base_price, category),
        customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, email, phone)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('getRecentBookings error:', error);
    return { data: null, error };
  }
}

/**
 * getPendingBookings
 * ------------------
 * Returns only PENDING bookings for the action-required section.
 */
export async function getPendingBookings(limit = 5) {
  if (!isSupabaseConfigured) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        status,
        payment_status,
        event_date,
        service:services(name),
        customer:profiles!bookings_customer_id_fkey(first_name, last_name)
      `)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('getPendingBookings error:', error);
    return { data: null, error };
  }
}

/**
 * getCustomers
 * ------------
 * Returns a paginated list of customer profiles.
 */
export async function getCustomers({ page = 1, pageSize = 20, search = '' } = {}) {
  if (!isSupabaseConfigured) return { data: [], count: 0, error: null };
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('profiles')
      .select(`
        id, first_name, last_name, middle_name, phone, address, avatar_url, is_active, created_at, updated_at, role, badges, bio, studio_specs,
        bookings(id, booking_number, status, payment_status, total_amount, event_date, created_at)
      `, { count: 'exact' })
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (search.trim()) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count, error: null };
  } catch (error) {
    console.error('getCustomers error:', error);
    return { data: null, count: 0, error };
  }
}

/**
 * getCustomerDetail
 * -----------------
 * Returns a single customer profile with their booking summary.
 */
export async function getCustomerDetail(id) {
  if (!isSupabaseConfigured) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, first_name, last_name, middle_name, phone, address, avatar_url, is_active, created_at, role, badges, bio, studio_specs,
        bookings(id, booking_number, status, payment_status, event_date, created_at, total_amount, service:services(name))
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('getCustomerDetail error:', error);
    return { data: null, error };
  }
}

/**
 * deleteCustomer
 * --------------
 * Deletes a customer profile record from the database.
 * Cascading constraints will clean up related records.
 */
export async function deleteCustomer(id) {
  if (!isSupabaseConfigured) {
    return { error: new Error('Database connection is not configured.') };
  }
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('deleteCustomer error:', error);
    return { error };
  }
}

/**
 * getStaffMembers
 * ---------------
 * Returns all admin and staff accounts.
 */
export async function getStaffMembers() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, avatar_url, role, is_active, created_at')
      .in('role', ['admin', 'staff', 'finance'])
      .order('role', { ascending: true });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('getStaffMembers error:', error);
    return { data: null, error };
  }
}

/**
 * getPhotographers
 * ----------------
 * Returns all photographer profiles with their base profile details.
 */
export async function getPhotographers() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, first_name, last_name, phone, avatar_url, is_active, created_at,
        photographer_profile:photographer_profiles(specialization, bio, is_available)
      `)
      .eq('role', 'photographer')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Map to the expected format
    const mapped = data.map(p => ({
      id: p.id,
      specialization: p.photographer_profile?.[0]?.specialization || null,
      bio: p.photographer_profile?.[0]?.bio || null,
      is_available: p.photographer_profile?.[0]?.is_available ?? false,
      created_at: p.created_at,
      profile: {
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone,
        avatar_url: p.avatar_url,
        is_active: p.is_active
      }
    }));
    
    return { data: mapped, error: null };
  } catch (error) {
    console.error('getPhotographers error:', error);
    return { data: null, error };
  }
}

/**
 * togglePhotographerAvailability
 * -------------------------------
 * Flips the is_available flag for a photographer.
 */
export async function togglePhotographerAvailability(id, newValue) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase
      .from('photographer_profiles')
      .update({ is_available: newValue, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}

/**
 * approvePhotographer
 * -------------------
 * Sets a photographer's is_active status to true, approving them for portal access.
 * Also ensures they have a photographer_profiles record.
 */
export async function approvePhotographer(id) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    // 1. Set is_active = true in profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (profileError) throw profileError;

    // 2. Ensure photographer_profiles record exists
    const { data: existing } = await supabase
      .from('photographer_profiles')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      const { error: insertError } = await supabase
        .from('photographer_profiles')
        .insert([{ id, is_available: true }]);
      if (insertError && insertError.code !== '23505') { // Ignore unique violation if it sneaks in
        throw insertError;
      }
    }

    return { error: null };
  } catch (error) {
    console.error('approvePhotographer error:', error);
    return { error };
  }
}

/**
 * deletePhotographer
 * ------------------
 * Deletes a photographer record from profiles (cascades to photographer_profiles).
 */
export async function deletePhotographer(id) {
  if (!isSupabaseConfigured) {
    return { error: new Error('Database connection is not configured.') };
  }
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('deletePhotographer error:', error);
    return { error };
  }
}

/**
 * getPhotographerAvailabilityRecords
 * -----------------------------------
 * Fetches availability records for a specific photographer.
 */
export async function getPhotographerAvailabilityRecords(photographerId) {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('photographer_availability')
      .select('*')
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('getPhotographerAvailabilityRecords error:', error);
    return { data: [], error };
  }
}

/**
 * getPhotographerBookings
 * ------------------------
 * Fetches bookings assigned to a specific photographer.
 */
export async function getPhotographerBookings(photographerId) {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, booking_number, event_date, preferred_time, status, location,
        service:services(name),
        customer:profiles!bookings_customer_id_fkey(first_name, last_name, phone)
      `)
      .eq('photographer_id', photographerId)
      .order('event_date', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('getPhotographerBookings error:', error);
    return { data: [], error };
  }
}

/**
 * getPayments

 * -----------
 * Returns paginated payments with booking and customer info.
 */
export async function getPayments({ page = 1, pageSize = 20, search = '' } = {}) {
  if (!isSupabaseConfigured) return { data: [], count: 0, error: null };
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('payments')
      .select(`
        id, amount, payment_type, payment_method, reference_number, payment_date, notes, created_at,
        booking:bookings(id, booking_number, customer_id, total_amount, remaining_balance, payment_status,
          customer:profiles!bookings_customer_id_fkey(first_name, last_name, phone)
        ),
        recorder:profiles!payments_recorded_by_fkey(first_name, last_name)
      `, { count: 'exact' })
      .order('payment_date', { ascending: false })
      .range(from, to);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count, error: null };
  } catch (error) {
    console.error('getPayments error:', error);
    return { data: null, count: 0, error };
  }
}

/**
 * getPaymentStats
 * ---------------
 * Returns comprehensive aggregate payment and treasury money totals
 * by querying both recorded payments and active studio booking receivables.
 */
export async function getPaymentStats() {
  if (!isSupabaseConfigured) {
    return {
      data: {
        total: 0,
        down: 0,
        final: 0,
        other: 0,
        grossBookings: 0,
        outstanding: 0,
        paidCount: 0,
        partialCount: 0,
        unpaidCount: 0,
        realizationRate: 0,
        count: 0
      },
      error: null
    };
  }
  try {
    const [paymentsRes, bookingsRes] = await Promise.all([
      supabase.from('payments').select('amount, payment_type, payment_method'),
      supabase.from('bookings').select('total_amount, remaining_balance, payment_status, is_deleted').or('is_deleted.is.null,is_deleted.eq.false')
    ]);

    const stats = {
      total: 0,
      down: 0,
      final: 0,
      other: 0,
      byMethod: { E_WALLET: 0, BANK_TRANSFER: 0, CASH: 0, OTHER: 0 },
      grossBookings: 0,
      outstanding: 0,
      paidCount: 0,
      partialCount: 0,
      unpaidCount: 0,
      realizationRate: 0,
      count: 0
    };

    if (paymentsRes.data) {
      stats.count = paymentsRes.data.length;
      paymentsRes.data.forEach(({ amount, payment_type, payment_method }) => {
        const a = Number(amount) || 0;
        stats.total += a;
        if (payment_type === 'DOWN_PAYMENT') stats.down += a;
        else if (payment_type === 'FINAL_PAYMENT') stats.final += a;
        else stats.other += a;

        if (payment_method && stats.byMethod[payment_method] !== undefined) {
          stats.byMethod[payment_method] += a;
        } else {
          stats.byMethod.OTHER += a;
        }
      });
    }

    if (bookingsRes.data) {
      bookingsRes.data.forEach(({ total_amount, remaining_balance, payment_status }) => {
        stats.grossBookings += (Number(total_amount) || 0);
        stats.outstanding += (Number(remaining_balance) || 0);
        if (payment_status === 'PAID') stats.paidCount++;
        else if (payment_status === 'PARTIAL') stats.partialCount++;
        else stats.unpaidCount++;
      });
    }

    if (stats.grossBookings > 0) {
      stats.realizationRate = Math.min(100, Math.round((stats.total / stats.grossBookings) * 100));
    } else if (stats.total > 0) {
      stats.realizationRate = 100;
    }

    return { data: stats, error: null };
  } catch (error) {
    console.error('getPaymentStats error:', error);
    return { data: null, error };
  }
}

/**
 * deletePayment
 * -------------
 * Voids or deletes an erroneous payment entry.
 * Note: trg_update_booking_balance automatically recalculates remaining balance.
 */
export async function deletePayment(paymentId) {
  if (!isSupabaseConfigured) return { error: new Error('Database not configured') };
  try {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('deletePayment error:', error);
    return { error };
  }
}

/**
 * getAdminNotifications
 * ---------------------
 * Returns notifications for all staff/admin — readable by staff via admin service.
 */
export async function getAdminNotifications({ page = 1, pageSize = 25 } = {}) {
  if (!isSupabaseConfigured) return { data: [], count: 0, error: null };
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await supabase
      .from('notifications')
      .select(`
        id, title, message, notification_type, is_read, created_at,
        booking:bookings(id, booking_number),
        user:profiles!notifications_user_id_fkey(first_name, last_name, role)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { data, count, error: null };
  } catch (error) {
    console.error('getAdminNotifications error:', error);
    return { data: null, count: 0, error };
  }
}

/**
 * getSmsLogs
 * ----------
 * Returns paginated SMS log records with local sync fallback.
 */
export async function getSmsLogs({ page = 1, pageSize = 50 } = {}) {
  let dbLogs = [];
  let dbCount = 0;

  if (isSupabaseConfigured) {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let { data, error, count } = await supabase
        .from('sms_logs')
        .select(`
          id, phone_number, message, notification_type, status, error_message, sent_at, created_at, customer_id, booking_id, provider_message_id,
          booking:bookings(id, booking_number, service_id),
          customer:profiles!sms_logs_customer_id_fkey(id, first_name, last_name, email, phone)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        // Fallback without foreign key hint if schema alias differs
        const fb = await supabase
          .from('sms_logs')
          .select(`
            id, phone_number, message, notification_type, status, error_message, sent_at, created_at, customer_id, booking_id, provider_message_id,
            booking:bookings(id, booking_number)
          `, { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to);
        data = fb.data;
        count = fb.count;
      }
      dbLogs = data || [];
      dbCount = count || 0;
    } catch (error) {
      console.warn('getSmsLogs query warning:', error);
    }
  }

  // Merge with local storage SMS logs
  try {
    const localLogs = JSON.parse(localStorage.getItem('ekodak_local_sms_logs') || '[]');
    const existingIds = new Set(dbLogs.map(l => String(l.id)));
    const uniqueLocal = localLogs.filter(l => !existingIds.has(String(l.id)));
    const merged = [...uniqueLocal, ...dbLogs].sort(
      (a, b) => new Date(b.created_at || b.sent_at || 0) - new Date(a.created_at || a.sent_at || 0)
    );
    return { data: merged, count: merged.length, error: null };
  } catch {
    return { data: dbLogs, count: dbCount, error: null };
  }
}

/**
 * dispatchManualSms
 * -----------------
 * Dispatches an SMS record to Supabase and local cache.
 */
export async function dispatchManualSms({
  phoneNumber,
  message,
  notificationType = 'MANUAL_DISPATCH',
  bookingId = null,
  customerId = null,
  customerName = '',
  bookingNumber = '',
  gateway = 'semaphore'
}) {
  const now = new Date().toISOString();
  const record = {
    phone_number: phoneNumber,
    message,
    notification_type: notificationType,
    booking_id: bookingId || null,
    customer_id: customerId || null,
    provider_message_id: `${gateway.toUpperCase()}_${Date.now()}`,
    status: 'SENT',
    sent_at: now,
    created_at: now
  };

  let dbResult = null;
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('sms_logs')
        .insert(record)
        .select()
        .single();
      if (!error && data) dbResult = data;
    } catch (e) {
      console.warn('Supabase sms_logs insert warning:', e);
    }
  }

  const finalRecord = {
    ...(dbResult || record),
    id: dbResult?.id || `local_sms_${Date.now()}`,
    customer: customerName ? { first_name: customerName, last_name: '' } : null,
    booking: bookingNumber ? { booking_number: bookingNumber } : null,
    gateway
  };

  // Cache locally
  try {
    const localLogs = JSON.parse(localStorage.getItem('ekodak_local_sms_logs') || '[]');
    localLogs.unshift(finalRecord);
    localStorage.setItem('ekodak_local_sms_logs', JSON.stringify(localLogs.slice(0, 200)));
  } catch {}

  window.dispatchEvent(new CustomEvent('ekodak:sms_logs_updated'));
  return finalRecord;
}

/**
 * deleteSmsLog
 * ------------
 * Deletes an SMS log entry from Supabase and local cache.
 */
export async function deleteSmsLog(id) {
  if (isSupabaseConfigured && id && !String(id).startsWith('local_')) {
    try {
      await supabase.from('sms_logs').delete().eq('id', id);
    } catch (e) {
      console.warn('deleteSmsLog Supabase error:', e);
    }
  }
  try {
    const localLogs = JSON.parse(localStorage.getItem('ekodak_local_sms_logs') || '[]');
    const filtered = localLogs.filter(l => String(l.id) !== String(id));
    localStorage.setItem('ekodak_local_sms_logs', JSON.stringify(filtered));
  } catch {}
  window.dispatchEvent(new CustomEvent('ekodak:sms_logs_updated'));
}

/**
 * getAdminServices
 * ----------------
 * Returns all photography services with their categories.
 */
export async function getAdminServices() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('getAdminServices error:', error);
    return { data: [], error };
  }
}

export async function createService(serviceData) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase
      .from('services')
      .insert([serviceData]);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('createService error:', error);
    return { error };
  }
}

export async function updateService(id, serviceData) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase
      .from('services')
      .update({ ...serviceData, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('updateService error:', error);
    return { error };
  }
}

export async function deleteService(id) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('deleteService error:', error);
    return { error };
  }
}

/**
 * getPhotoOutputs
 * ---------------
 * Returns photo output records for admin review.
 */
export async function getPhotoOutputs({ page = 1, pageSize = 50 } = {}) {
  if (!isSupabaseConfigured) return { data: [], count: 0, error: null };
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await supabase
      .from('photo_outputs')
      .select(`
        id, file_path, file_name, file_type, file_size, status, created_at, updated_at,
        booking:bookings(id, booking_number, event_date, status,
          customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, phone)
        ),
        uploader:profiles!photo_outputs_uploaded_by_fkey(first_name, last_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { data: data || [], count: count || 0, error: null };
  } catch (error) {
    console.error('getPhotoOutputs error:', error);
    return { data: [], count: 0, error };
  }
}

/**
 * updatePhotoOutputStatus
 * -----------------------
 * Updates the lifecycle status of a photo deliverable.
 */
export async function updatePhotoOutputStatus(outputId, newStatus) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { data, error } = await supabase
      .from('photo_outputs')
      .update({ 
        status: newStatus, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', outputId)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('updatePhotoOutputStatus error:', error);
    return { data: null, error };
  }
}

/**
 * updatePhotoOutputDetails
 * ------------------------
 * Updates general fields of a photo output.
 */
export async function updatePhotoOutputDetails(outputId, updates) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { data, error } = await supabase
      .from('photo_outputs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', outputId)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('updatePhotoOutputDetails error:', error);
    return { data: null, error };
  }
}

// ── Service Categories ────────────────────────────────────────────────────────

export async function getServiceCategories() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('getServiceCategories error:', error);
    return { data: null, error };
  }
}

export async function createServiceCategory(categoryData) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase
      .from('service_categories')
      .insert([categoryData]);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('createServiceCategory error:', error);
    return { error };
  }
}

export async function updateServiceCategory(id, categoryData) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase
      .from('service_categories')
      .update({ ...categoryData, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('updateServiceCategory error:', error);
    return { error };
  }
}

export async function deleteServiceCategory(id) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase
      .from('service_categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('deleteServiceCategory error:', error);
    return { error };
  }
}

// ── Add-Ons ───────────────────────────────────────────────────────────────────

export async function getAddOns() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('add_ons')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    // Strictly deduplicate by normalized name to eliminate repetitive entries
    const seen = new Set();
    const unique = [];
    for (const item of (data || [])) {
      const norm = (item.name || '').trim().toLowerCase();
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        unique.push(item);
      }
    }
    return { data: unique, error: null };
  } catch (error) {
    console.error('getAddOns error:', error);
    return { data: null, error };
  }
}

export async function createAddOn(addOnData) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase
      .from('add_ons')
      .insert([addOnData]);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('createAddOn error:', error);
    return { error };
  }
}

export async function updateAddOn(id, addOnData) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase
      .from('add_ons')
      .update({ ...addOnData, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('updateAddOn error:', error);
    return { error };
  }
}

export async function deleteAddOn(id) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase
      .from('add_ons')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('deleteAddOn error:', error);
    return { error };
  }
}

export async function deleteAddOnsBatch(ids = []) {
  if (!isSupabaseConfigured || !ids || ids.length === 0) return { error: null };
  try {
    const { error } = await supabase
      .from('add_ons')
      .delete()
      .in('id', ids);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('deleteAddOnsBatch error:', error);
    return { error };
  }
}

/**
 * Fetch recent QR scan logs for Security & Audit monitoring
 */
export async function getQRScanAuditLogs({ limit = 30 } = {}) {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('qr_scan_logs')
      .select(`
        id,
        booking_id,
        scanned_by,
        scan_type,
        scan_result,
        user_agent,
        ip_address,
        created_at,
        booking:bookings(tracking_number, status, scheduled_date),
        scanned_by_profile:profiles!qr_scan_logs_scanned_by_fkey(first_name, last_name, role)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('getQRScanAuditLogs error:', error);
    return { data: [], error };
  }
}

/**
 * Fetch recent booking status history for Security & Audit trail
 */
export async function getBookingAuditLogs({ limit = 30 } = {}) {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('booking_status_history')
      .select(`
        id,
        booking_id,
        status,
        changed_by,
        remarks,
        created_at,
        booking:bookings(tracking_number, scheduled_date),
        changed_by_profile:profiles!booking_status_history_changed_by_fkey(first_name, last_name, role)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('getBookingAuditLogs error:', error);
    return { data: [], error };
  }
}

/**
 * updateCustomerBadges
 * --------------------
 * Allows studio administrators to award or revoke official studio recognitions for a client.
 */
export async function updateCustomerBadges(customerId, badges) {
  if (!isSupabaseConfigured) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        badges: badges || [], 
        updated_at: new Date().toISOString() 
      })
      .eq('id', customerId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('updateCustomerBadges error:', error);
    return { data: null, error };
  }
}

/**
 * uploadAdminPhotoOutput
 * ----------------------
 * Allows studio administrators or photographers to upload edited package deliverable photos
 * for a specific customer booking (e.g. 2x2 ID, Passport photo, Toga master, Barong formal).
 */
export async function uploadAdminPhotoOutput({ 
  bookingId, 
  file = null, 
  deliverableType = '2x2 ID Photo', 
  filePathOrUrl = '', 
  uploadedBy = null 
}) {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Supabase not configured') };
  try {
    let resolvedPath = filePathOrUrl;
    let fileName = `[${deliverableType}] Studio_Output_${Date.now().toString(36).toUpperCase()}.jpg`;
    let fileSize = 1500000;
    let fileType = 'image/jpeg';

    if (file) {
      fileName = `[${deliverableType}] ${file.name}`;
      fileSize = file.size;
      fileType = file.type;
      const safeBookingId = bookingId || 'general';
      const storagePath = `${safeBookingId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('outputs')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: true
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('outputs')
            .getPublicUrl(storagePath);
          resolvedPath = urlData?.publicUrl || storagePath;
        } else {
          console.warn('Storage upload error notice:', uploadError);
        }
      } catch (stgErr) {
        console.warn('Storage attempt caught:', stgErr);
      }
    }

    if (!resolvedPath) {
      resolvedPath = filePathOrUrl || 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=1200&q=85&auto=format&fit=crop';
    }

    const { data, error } = await supabase
      .from('photo_outputs')
      .insert({
        booking_id: bookingId,
        file_path: resolvedPath,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        status: 'READY',
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('uploadAdminPhotoOutput error:', error);
    return { data: null, error };
  }
}

/**
 * deleteAdminPhotoOutput
 * ----------------------
 */
export async function deleteAdminPhotoOutput(outputId) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase
      .from('photo_outputs')
      .delete()
      .eq('id', outputId);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('deleteAdminPhotoOutput error:', error);
    return { error };
  }
}

// ── Worker & Staff Personnel Management ──────────────────────────────────────

/**
 * getAllWorkers
 * -------------
 * Returns all non-customer profiles (admin, staff, finance, photographer)
 * joined with photographer profile metadata and assigned workload counts.
 */
export async function getAllWorkers() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  try {
    let { data, error } = await supabase
      .from('profiles')
      .select(`
        id, first_name, last_name, email, phone, avatar_url, role, is_active, bio, created_at, updated_at,
        photographer_profile:photographer_profiles(specialization, bio, is_available)
      `)
      .in('role', ['admin', 'staff', 'finance', 'photographer'])
      .order('created_at', { ascending: false });

    // Fallback if join is not established in schema cache
    if (error) {
      console.warn('getAllWorkers: Foreign key join fallback to base profiles query:', error.message);
      const fallback = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, avatar_url, role, is_active, bio, created_at, updated_at')
        .in('role', ['admin', 'staff', 'finance', 'photographer'])
        .order('created_at', { ascending: false });

      if (fallback.error) throw fallback.error;
      data = fallback.data;
    }

    const mapped = (data || []).map(w => {
      const ph = Array.isArray(w.photographer_profile)
        ? w.photographer_profile[0]
        : (w.photographer_profile || null);

      return {
        id: w.id,
        first_name: w.first_name || '',
        last_name: w.last_name || '',
        email: w.email || '',
        phone: w.phone || '',
        avatar_url: w.avatar_url || null,
        role: w.role || 'staff',
        is_active: w.is_active !== false,
        bio: w.bio || ph?.bio || '',
        specialization: ph?.specialization || null,
        is_available: ph?.is_available ?? true,
        created_at: w.created_at,
        updated_at: w.updated_at
      };
    });

    return { data: mapped, error: null };
  } catch (err) {
    console.error('getAllWorkers error:', err);
    return { data: [], error: err };
  }
}

/**
 * createWorkerProfile
 * -------------------
 * Inserts a new worker profile record (photographer, staff, finance) into public.profiles
 * and creates a photographer_profiles row if role === 'photographer'.
 */
export async function createWorkerProfile({
  firstName,
  lastName,
  email,
  role = 'staff',
  phone = '',
  specialization = '',
  bio = '',
  isActive = true
}) {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Database not configured') };
  try {
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `wk_${Date.now()}`;
    const now = new Date().toISOString();

    const profilePayload = {
      id: newId,
      first_name: firstName?.trim() || '',
      last_name: lastName?.trim() || '',
      email: email?.trim().toLowerCase() || null,
      phone: phone?.trim() || null,
      role: role || 'staff',
      is_active: isActive,
      bio: bio?.trim() || null,
      created_at: now,
      updated_at: now
    };

    const { data: createdProfile, error: profErr } = await supabase
      .from('profiles')
      .insert([profilePayload])
      .select()
      .single();

    if (profErr) throw profErr;

    // If photographer, ensure photographer_profiles record exists
    if (role === 'photographer') {
      const { error: phErr } = await supabase
        .from('photographer_profiles')
        .insert([{
          id: newId,
          specialization: specialization?.trim() || 'General Photography',
          bio: bio?.trim() || null,
          is_available: true
        }]);
      if (phErr) console.warn('createWorkerProfile photographer_profiles insert warning:', phErr);
    }

    return { data: createdProfile, error: null };
  } catch (err) {
    console.error('createWorkerProfile error:', err);
    return { data: null, error: err };
  }
}

/**
 * updateWorkerProfile
 * -------------------
 * Updates a worker's details in public.profiles and photographer_profiles.
 */
export async function updateWorkerProfile(id, {
  firstName,
  lastName,
  email,
  role,
  phone,
  specialization,
  bio,
  isActive,
  isAvailable
}) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    const updates = { updated_at: new Date().toISOString() };
    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (phone !== undefined) updates.phone = phone;
    if (bio !== undefined) updates.bio = bio;
    if (isActive !== undefined) updates.is_active = isActive;

    const { error: profErr } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (profErr) throw profErr;

    // If photographer metadata updated
    if (specialization !== undefined || isAvailable !== undefined || bio !== undefined) {
      const { data: existing } = await supabase
        .from('photographer_profiles')
        .select('id')
        .eq('id', id)
        .single();

      if (existing) {
        const phUpdates = { updated_at: new Date().toISOString() };
        if (specialization !== undefined) phUpdates.specialization = specialization;
        if (isAvailable !== undefined) phUpdates.is_available = isAvailable;
        if (bio !== undefined) phUpdates.bio = bio;
        await supabase.from('photographer_profiles').update(phUpdates).eq('id', id);
      } else if (role === 'photographer') {
        await supabase.from('photographer_profiles').insert([{
          id,
          specialization: specialization || 'General Photography',
          bio: bio || null,
          is_available: isAvailable ?? true
        }]);
      }
    }

    return { error: null };
  } catch (err) {
    console.error('updateWorkerProfile error:', err);
    return { error: err };
  }
}

/**
 * deleteWorkerProfile
 * -------------------
 * Removes a worker record from profiles.
 */
export async function deleteWorkerProfile(id) {
  if (!isSupabaseConfigured) return { error: null };
  try {
    // Delete photographer_profiles if present
    await supabase.from('photographer_profiles').delete().eq('id', id);

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('deleteWorkerProfile error:', err);
    return { error: err };
  }
}

