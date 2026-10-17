import { supabase } from '../lib/supabase';
import { getCustomerBookings } from './bookingService';

const READ_STORAGE_KEY = 'ekodak_read_notifications';
const CLEARED_STORAGE_KEY = 'ekodak_cleared_notifications';

export function getReadNotificationIds() {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveReadNotificationId(id) {
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

export function saveAllReadNotificationIds(ids) {
  try {
    const current = getReadNotificationIds();
    const merged = Array.from(new Set([...current, ...ids]));
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Failed to save all read notifications:', err);
  }
}

export function getClearedNotificationIds() {
  try {
    const raw = localStorage.getItem(CLEARED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveClearedNotificationId(id) {
  try {
    const ids = getClearedNotificationIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(CLEARED_STORAGE_KEY, JSON.stringify(ids));
    }
  } catch (err) {
    console.warn('Failed to save cleared notification:', err);
  }
}

export function saveAllClearedNotificationIds(ids) {
  try {
    const current = getClearedNotificationIds();
    const merged = Array.from(new Set([...current, ...ids]));
    localStorage.setItem(CLEARED_STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Failed to save all cleared notifications:', err);
  }
}

/**
 * Synthesizes smart, friendly conversational notifications ONLY when an actual order (booking) has been detected.
 * Zero mocked notifications are displayed if no customer booking exists.
 */
export function generateSystematicNotifications(bookings = [], user = null) {
  if (!bookings || bookings.length === 0) {
    return [];
  }

  const readIds = getReadNotificationIds();
  const clearedIds = getClearedNotificationIds();
  const notifs = [];
  const firstName = user?.user_metadata?.first_name || user?.first_name || 'there';

  // Process detected orders/bookings
  bookings.forEach((b) => {
    // Skip cancelled or soft-deleted bookings
    if (b.is_deleted) return;

    const bNumber = b.booking_number || 'EK-SESSION';
    const sName = b.service?.name || b.tier_name || 'Studio Portrait Session';
    const eventDateStr = b.event_date ? new Date(b.event_date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : 'your scheduled date';
    const timeStr = b.preferred_time ? `at ${b.preferred_time.substring(0, 5)}` : '';

    // 1. Order Received & Tracking Notice
    const regId = `booking_logged_${b.id}`;
    if (!clearedIds.includes(regId)) {
      notifs.push({
        id: regId,
        booking_id: b.id,
        booking: { id: b.id, booking_number: bNumber },
        notification_type: 'booking_submitted',
        title: `Order Received · Tracking #${bNumber}`,
        message: `Hi ${firstName}! Your order with a tracking number of #${bNumber} for ${sName} has been received. Our studio team has prepared your session queue and is excited to work with you!`,
        created_at: b.created_at || new Date().toISOString(),
        is_read: readIds.includes(regId),
        category: 'BOOKINGS',
        priority: 'normal',
        action_url: `/dashboard/bookings/${b.id}`
      });
    }

    // 2. Pictorial Schedule Confirmed
    if (b.status === 'CONFIRMED') {
      const confId = `booking_confirmed_${b.id}`;
      if (!clearedIds.includes(confId)) {
        notifs.push({
          id: confId,
          booking_id: b.id,
          booking: { id: b.id, booking_number: bNumber },
          notification_type: 'booking_confirmed',
          title: `Pictorial Schedule Confirmed · #${bNumber}`,
          message: `Great news, ${firstName}! Your pictorial schedule has been confirmed for ${eventDateStr} ${timeStr}. We have everything reserved for you. Your Studio QR pass is ready for hassle-free check-in!`,
          created_at: b.updated_at || b.created_at || new Date().toISOString(),
          is_read: readIds.includes(confId),
          category: 'BOOKINGS',
          priority: 'high',
          action_url: `/dashboard/bookings/${b.id}`
        });
      }

      // 3. Smart Photoshoot Call-time Reminder
      const reminderId = `photoshoot_reminder_${b.id}`;
      if (!clearedIds.includes(reminderId)) {
        notifs.push({
          id: reminderId,
          booking_id: b.id,
          booking: { id: b.id, booking_number: bNumber },
          notification_type: 'protocol',
          title: `Photoshoot Reminder & Call-Time · #${bNumber}`,
          message: `Friendly reminder for your upcoming session on ${eventDateStr} ${timeStr}! Please arrive 10–15 minutes early at our studio so our styling crew can assist with your hair, toga, and wardrobe fitting.`,
          created_at: b.updated_at || b.created_at || new Date().toISOString(),
          is_read: readIds.includes(reminderId),
          category: 'STUDIO',
          priority: 'normal',
          action_url: `/dashboard/bookings/${b.id}`
        });
      }
    }

    // 4. Payment Receipt or Downpayment Reminder
    if (b.payment_status === 'PAID' || b.payment_status === 'DOWNPAYMENT_PAID') {
      const payId = `payment_ack_${b.id}`;
      if (!clearedIds.includes(payId)) {
        const downAmount = b.downpayment_amount || Math.round((Number(b.total_amount) || 0) * 0.5);
        notifs.push({
          id: payId,
          booking_id: b.id,
          booking: { id: b.id, booking_number: bNumber },
          notification_type: 'payment_recorded',
          title: `Payment Acknowledged · #${bNumber}`,
          message: `Thank you, ${firstName}! We've successfully acknowledged your downpayment of ₱${Number(downAmount).toLocaleString()} for order #${bNumber}. Your slot is safely locked in.`,
          created_at: b.updated_at || b.created_at || new Date().toISOString(),
          is_read: readIds.includes(payId),
          category: 'PAYMENTS',
          priority: 'high',
          action_url: `/dashboard/payments`
        });
      }
    } else if (b.status !== 'CANCELLED' && b.status !== 'REJECTED') {
      const isUnpaid = !b.payment_status || b.payment_status === 'UNPAID';
      const remBalance = Number(b.remaining_balance ?? b.total_amount ?? 0);
      if (isUnpaid || remBalance > 0) {
        const payDueId = `payment_due_${b.id}`;
        if (!clearedIds.includes(payDueId)) {
          const totalAmt = Number(b.total_amount) || 0;
          const downRequired = Math.min(remBalance, Math.max(500, Math.round(totalAmt * 0.5)));
          notifs.push({
            id: payDueId,
            booking_id: b.id,
            booking: { id: b.id, booking_number: bNumber },
            notification_type: 'payment_required',
            title: `Reservation Deposit Pending · #${bNumber}`,
            message: `Hi ${firstName}! Your order with tracking number #${bNumber} is registered. To ensure your preferred time slot isn't reallocated, please settle your 50% reservation deposit of ₱${downRequired.toLocaleString()} via Billing & Payments.`,
            created_at: b.created_at || new Date().toISOString(),
            is_read: readIds.includes(payDueId),
            category: 'PAYMENTS',
            priority: 'high',
            action_url: `/dashboard/payments`
          });
        }
      }
    }

    // 5. Photographer Assignment Notification
    if (b.photographer) {
      const photogId = `photog_assigned_${b.id}`;
      if (!clearedIds.includes(photogId)) {
        const pName = `${b.photographer.profile?.first_name || 'Studio'} ${b.photographer.profile?.last_name || 'Photographer'}`.trim();
        notifs.push({
          id: photogId,
          booking_id: b.id,
          booking: { id: b.id, booking_number: bNumber },
          notification_type: 'message',
          title: `Your Photographer is Ready · #${bNumber}`,
          message: `Meet your photographer! ${pName} has been assigned to direct and photograph your session for order #${bNumber}. Feel free to prepare any pose ideas you'd love to try!`,
          created_at: b.updated_at || b.created_at || new Date().toISOString(),
          is_read: readIds.includes(photogId),
          category: 'BOOKINGS',
          priority: 'normal',
          action_url: `/dashboard/bookings/${b.id}`
        });
      }
    }

    // 6. Photographs & Deliverables Ready
    if (b.status === 'COMPLETED') {
      const compId = `gallery_ready_${b.id}`;
      if (!clearedIds.includes(compId)) {
        notifs.push({
          id: compId,
          booking_id: b.id,
          booking: { id: b.id, booking_number: bNumber },
          notification_type: 'booking_status',
          title: `Your Studio Photographs are Ready! · #${bNumber}`,
          message: `Wonderful news, ${firstName}! Your high-resolution proofs and edited photos for order #${bNumber} are now available for viewing and download in your deliverables gallery. Enjoy!`,
          created_at: b.updated_at || new Date().toISOString(),
          is_read: readIds.includes(compId),
          category: 'GALLERY',
          priority: 'high',
          action_url: '/dashboard/gallery'
        });
      }
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
  const clearedIds = getClearedNotificationIds();

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
    const existingBookingIds = new Set((userBookings || []).map(b => b.id));
    const hasAnyBookings = existingBookingIds.size > 0;

    if (!dbError && Array.isArray(dbNotifs) && dbNotifs.length > 0) {
      // Filter out cleared notices and any booking notifications for bookings that no longer exist
      const validDbNotifs = dbNotifs
        .filter(n => !clearedIds.includes(n.id))
        .filter(n => {
          const type = (n.notification_type || '').toLowerCase();
          const isBookingNotif = type.startsWith('booking') || Boolean(n.booking_id) || type === 'booking_submitted' || type === 'booking_confirmed';
          if (isBookingNotif) {
            if (!hasAnyBookings) return false; // All bookings deleted in database
            if (n.booking_id && !existingBookingIds.has(n.booking_id)) return false;
          }
          return true;
        });

      const dbIds = new Set(validDbNotifs.map(n => n.id));
      const sysNotifs = hasAnyBookings ? generateSystematicNotifications(userBookings, { id: userId }) : [];
      const uniqueSys = sysNotifs.filter(s => !dbIds.has(s.id));
      const combined = [...validDbNotifs, ...uniqueSys].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      const unreadCount = combined.filter(n => !n.is_read && !readIds.includes(n.id)).length;
      return { data: combined, unreadCount, isFromDatabase: true };
    }

    // 2. Fallback to systematic notifications generated from actual bookings
    const generated = generateSystematicNotifications(userBookings || [], { id: userId });
    const unreadCount = generated.filter(n => !n.is_read && !readIds.includes(n.id)).length;
    return { data: generated, unreadCount, isFromDatabase: false };

  } catch (err) {
    console.warn('[customerNotificationService] Fallback to generated notifications:', err);
    const { data: userBookings } = await getCustomerBookings(userId);
    const fallback = generateSystematicNotifications(userBookings || [], { id: userId });
    return { data: fallback, unreadCount: fallback.filter(n => !n.is_read && !readIds.includes(n.id)).length, isFromDatabase: false };
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

  window.dispatchEvent(new CustomEvent('ekodak:customer_notifications_updated'));
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

  window.dispatchEvent(new CustomEvent('ekodak:customer_notifications_updated'));
  return true;
}

/**
 * Clears/Dismisses a single notification
 */
export async function clearCustomerNotification(id, userId) {
  saveClearedNotificationId(id);
  saveReadNotificationId(id);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUuid && userId) {
    try {
      await supabase.from('notifications').delete().eq('id', id);
    } catch {
      // handled
    }
  }

  window.dispatchEvent(new CustomEvent('ekodak:customer_notifications_updated'));
  return true;
}

/**
 * Clears all existing notifications for the user
 */
export async function clearAllCustomerNotifications(userId, notifIds = []) {
  // Also clear any legacy mock notices explicitly
  const legacyMockIds = ['studio_advisory_2026', 'studio_protocol_prep'];
  const allToClear = Array.from(new Set([...notifIds, ...legacyMockIds]));

  saveAllClearedNotificationIds(allToClear);
  saveAllReadNotificationIds(allToClear);

  if (userId) {
    try {
      await supabase.from('notifications').delete().eq('user_id', userId);
    } catch {
      // handled
    }
  }

  window.dispatchEvent(new CustomEvent('ekodak:customer_notifications_updated'));
  return true;
}
