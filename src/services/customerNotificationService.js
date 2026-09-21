import { supabase } from '../lib/supabase';
import { getCustomerBookings } from './bookingService';

const READ_STORAGE_KEY = 'ekodak_read_notifications';

function getReadNotificationIds() {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReadNotificationId(id) {
  try {
    const ids = getReadNotificationIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ids));
    }
  } catch (err) {
    console.warn('Failed to save read notification:', err);
  }
}

function saveAllReadNotificationIds(ids) {
  try {
    const current = getReadNotificationIds();
    const merged = Array.from(new Set([...current, ...ids]));
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Failed to save all read notifications:', err);
  }
}

/**
 * Synthesizes systematic, operational notifications from customer bookings
 * ensuring notifications are NEVER empty even if database table has no rows.
 */
export function generateSystematicNotifications(bookings = [], user = null) {
  const readIds = getReadNotificationIds();
  const notifs = [];

  // Studio operational bulletins
  notifs.push({
    id: 'studio_advisory_2026',
    notification_type: 'system_advisory',
    title: 'Graduation Season 2026 Studio Slots Open',
    message: 'Advance scheduling is open for CTU Main, CTU Naga, and university partners. Toga and formal styling queues are ready.',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    is_read: readIds.includes('studio_advisory_2026'),
    category: 'STUDIO',
    priority: 'info',
    action_url: '/dashboard/book'
  });

  notifs.push({
    id: 'studio_protocol_prep',
    notification_type: 'protocol',
    title: 'Shoot Day Call-Time Protocol',
    message: 'Please arrive 15 minutes before your scheduled studio slot with valid school or government ID for verification.',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    is_read: readIds.includes('studio_protocol_prep'),
    category: 'STUDIO',
    priority: 'info',
    action_url: '/dashboard'
  });

  // Notifications generated from actual customer bookings
  bookings.forEach((b) => {
    const bNumber = b.booking_number || 'EK-SESSION';
    const sName = b.service?.name || b.tier_name || 'Studio Portrait Session';

    // 1. Booking registration notice
    const regId = `booking_logged_${b.id}`;
    notifs.push({
      id: regId,
      booking_id: b.id,
      booking: { id: b.id, booking_number: bNumber },
      notification_type: 'booking_submitted',
      title: `Booking Request Registered: #${bNumber}`,
      message: `Your reservation request for ${sName} has been recorded in the studio queue.`,
      created_at: b.created_at || new Date().toISOString(),
      is_read: readIds.includes(regId),
      category: 'BOOKINGS',
      priority: 'normal',
      action_url: `/dashboard/bookings/${b.id}`
    });

    // 2. Status specific notice
    if (b.status === 'CONFIRMED') {
      const confId = `booking_confirmed_${b.id}`;
      const eventDateStr = b.event_date ? new Date(b.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'confirmed date';
      const timeStr = b.preferred_time ? `at ${b.preferred_time.substring(0, 5)}` : '';
      notifs.push({
        id: confId,
        booking_id: b.id,
        booking: { id: b.id, booking_number: bNumber },
        notification_type: 'booking_confirmed',
        title: `Studio Session Confirmed: #${bNumber}`,
        message: `Your photoshoot is confirmed for ${eventDateStr} ${timeStr}. Studio QR pass has been generated.`,
        created_at: b.updated_at || b.created_at || new Date().toISOString(),
        is_read: readIds.includes(confId),
        category: 'BOOKINGS',
        priority: 'high',
        action_url: `/dashboard/bookings/${b.id}`
      });
    }

    // 3. Payment acknowledgment or pending downpayment notice
    if (b.payment_status === 'PAID' || b.payment_status === 'DOWNPAYMENT_PAID') {
      const payId = `payment_ack_${b.id}`;
      const downAmount = b.downpayment_amount || Math.round((Number(b.total_amount) || 0) * 0.5);
      notifs.push({
        id: payId,
        booking_id: b.id,
        booking: { id: b.id, booking_number: bNumber },
        notification_type: 'payment_recorded',
        title: `Payment Receipt Acknowledged: #${bNumber}`,
        message: `Downpayment of ₱${Number(downAmount).toLocaleString()} acknowledged. Official studio booking voucher issued.`,
        created_at: b.updated_at || b.created_at || new Date().toISOString(),
        is_read: readIds.includes(payId),
        category: 'PAYMENTS',
        priority: 'high',
        action_url: `/dashboard/payments`
      });
    } else if (b.status !== 'CANCELLED' && b.status !== 'REJECTED') {
      const isUnpaid = !b.payment_status || b.payment_status === 'UNPAID';
      const remBalance = Number(b.remaining_balance ?? b.total_amount ?? 0);
      if (isUnpaid || remBalance > 0) {
        const payDueId = `payment_due_${b.id}`;
        const totalAmt = Number(b.total_amount) || 0;
        const downRequired = Math.min(remBalance, Math.max(500, Math.round(totalAmt * 0.5)));
        notifs.push({
          id: payDueId,
          booking_id: b.id,
          booking: { id: b.id, booking_number: bNumber },
          notification_type: 'payment_required',
          title: `Reservation Downpayment Pending: #${bNumber}`,
          message: `A 50% reservation downpayment of ₱${downRequired.toLocaleString()} is required for ${sName} to lock in your studio bay and photographer schedule.`,
          created_at: b.created_at || new Date().toISOString(),
          is_read: readIds.includes(payDueId),
          category: 'PAYMENTS',
          priority: 'high',
          action_url: `/dashboard/payments`
        });
      }
    }

    // 4. Photographer assignment
    if (b.photographer) {
      const photogId = `photog_assigned_${b.id}`;
      const pName = `${b.photographer.profile?.first_name || 'Studio'} ${b.photographer.profile?.last_name || 'Photographer'}`.trim();
      notifs.push({
        id: photogId,
        booking_id: b.id,
        booking: { id: b.id, booking_number: bNumber },
        notification_type: 'message',
        title: `Photographer Assigned: #${bNumber}`,
        message: `${pName} has been assigned as your session photographer.`,
        created_at: b.updated_at || b.created_at || new Date().toISOString(),
        is_read: readIds.includes(photogId),
        category: 'BOOKINGS',
        priority: 'normal',
        action_url: `/dashboard/bookings/${b.id}`
      });
    }

    // 5. Completion / gallery ready
    if (b.status === 'COMPLETED') {
      const compId = `gallery_ready_${b.id}`;
      notifs.push({
        id: compId,
        booking_id: b.id,
        booking: { id: b.id, booking_number: bNumber },
        notification_type: 'booking_status',
        title: `Proofs & Soft Copies Ready: #${bNumber}`,
        message: `High-resolution photographs from your session are ready for client proofing in your gallery.`,
        created_at: b.updated_at || new Date().toISOString(),
        is_read: readIds.includes(compId),
        category: 'GALLERY',
        priority: 'high',
        action_url: '/dashboard/gallery'
      });
    }
  });

  // Sort by date descending
  return notifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Unified fetch for customer notifications with database priority and systematic fallback
 */
export async function getCustomerUnifiedNotifications(userId) {
  if (!userId) return { data: [], unreadCount: 0 };

  const readIds = getReadNotificationIds();

  try {
    // 1. Attempt live database fetch
    const { data: dbNotifs, error: dbError } = await supabase
      .from('notifications')
      .select(`
        id, title, message, notification_type, is_read, created_at,
        booking:bookings(id, booking_number)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: userBookings } = await getCustomerBookings(userId);

    if (!dbError && Array.isArray(dbNotifs) && dbNotifs.length > 0) {
      // Merge db notifications with any booking milestones not already in DB
      const dbIds = new Set(dbNotifs.map(n => n.id));
      const sysNotifs = generateSystematicNotifications(userBookings || [], { id: userId });
      const uniqueSys = sysNotifs.filter(s => !dbIds.has(s.id));
      const combined = [...dbNotifs, ...uniqueSys].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      const unreadCount = combined.filter(n => !n.is_read && !readIds.includes(n.id)).length;
      return { data: combined, unreadCount, isFromDatabase: true };
    }

    // 2. Fallback to systematic notifications generated from actual bookings
    const generated = generateSystematicNotifications(userBookings || [], { id: userId });
    const unreadCount = generated.filter(n => !n.is_read).length;
    return { data: generated, unreadCount, isFromDatabase: false };

  } catch (err) {
    console.warn('[customerNotificationService] Fallback to generated notifications:', err);
    const { data: userBookings } = await getCustomerBookings(userId);
    const fallback = generateSystematicNotifications(userBookings || [], { id: userId });
    return { data: fallback, unreadCount: fallback.filter(n => !n.is_read).length, isFromDatabase: false };
  }
}

/**
 * Marks a single notification as read
 */
export async function markCustomerNotificationAsRead(id, userId) {
  saveReadNotificationId(id);

  // Try updating in Supabase if valid UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUuid && userId) {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch {
      // local fallback handled
    }
  }
  return true;
}

/**
 * Marks all notifications as read
 */
export async function markAllCustomerNotificationsAsRead(userId, notifIds = []) {
  saveAllReadNotificationIds(notifIds);

  if (userId) {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    } catch {
      // local fallback handled
    }
  }
  return true;
}
