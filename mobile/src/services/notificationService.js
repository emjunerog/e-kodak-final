/**
 * notificationService.js — Mobile Unified Notifications (Orders + In-App)
 * Aggregates live order milestone updates, Supabase database notifications,
 * photographer workstation alerts, and studio announcements with persistent
 * read/cleared tracking and sound-announcement deduplication.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { fetchBookingByToken } from './bookingService';
import { fetchPhotographerAlerts, formatReadableDate, formatTime12 } from './photographerService';
import { getAppSettings, getSavedBookings, saveBookingToken } from './storageService';
import { playMascotSound } from '../utils/mascotAudio';

const KEYS = {
  READ_IDS: '@ekodak:notif_read_ids',
  CLEARED_IDS: '@ekodak:notif_cleared_ids',
  SOUND_SEEN_IDS: '@ekodak:notif_sound_seen_ids',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readIdSet(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

async function addIdsToStorage(key, ids) {
  try {
    const existing = await readIdSet(key);
    let changed = false;
    for (const id of ids) {
      if (id && !existing.has(id)) {
        existing.add(id);
        changed = true;
      }
    }
    if (changed) {
      const trimmed = Array.from(existing).slice(-250);
      await AsyncStorage.setItem(key, JSON.stringify(trimmed));
    }
    return existing;
  } catch {
    return new Set();
  }
}

function cleanNotificationTitle(rawTitle) {
  const base = String(rawTitle || 'Studio Notification')
    .replace(/\s*[·•-]\s*(?:Tracking\s*)?#[A-Z0-9-]+$/i, '')
    .trim();
  const lower = base.toLowerCase();

  if (lower.includes('photographer assigned') || lower.includes('photographer is ready')) {
    return 'Your order has been assigned to a photographer';
  }
  if (lower.includes('payment confirmed') || lower.includes('payment acknowledged')) {
    return 'Your payment is now confirmed';
  }
  if (lower.includes('order received')) {
    return 'Your order has been received';
  }
  if (lower.includes('schedule confirmed') || lower.includes('approved & reserved')) {
    return 'Your order is approved and reserved';
  }
  if (lower.includes('photographs are ready') || lower.includes('completed')) {
    return 'Your order is completed';
  }
  return base || 'Studio Notification';
}

function getOrderStatusCopy(statusRaw, serviceName) {
  const s = String(statusRaw || 'PENDING').toUpperCase();
  const pkg = serviceName || 'Studio Package';

  switch (s) {
    case 'CONFIRMED':
      return {
        title: 'Your order is approved and reserved',
        message: `Your order is now approved and reserved for ${pkg}. Present your Studio QR Pass on arrival.`,
        tone: 'confirmed',
      };
    case 'PHOTOGRAPHER_ASSIGNED':
      return {
        title: 'Your order has been assigned to a photographer',
        message: `Your order has been assigned to a photographer for your ${pkg} session.`,
        tone: 'confirmed',
      };
    case 'CAPTURE':
    case 'IN_PROGRESS':
      return {
        title: 'Your pictorial session is ongoing',
        message: `Your order session for ${pkg} is now ongoing at the studio bay.`,
        tone: 'inProgress',
      };
    case 'EDITING':
      return {
        title: 'Your photos are now in editing',
        message: `Your order for ${pkg} is now in darkroom editing and curation.`,
        tone: 'editing',
      };
    case 'RETOUCHING':
      return {
        title: 'Your photos are in retouching',
        message: `Your order for ${pkg} is now undergoing color grading and retouching.`,
        tone: 'editing',
      };
    case 'FINALIZED':
    case 'PRINTING':
      return {
        title: 'Your prints are finalized',
        message: `Your order for ${pkg} is now finalized and awaiting release.`,
        tone: 'confirmed',
      };
    case 'READY':
      return {
        title: 'Your order is ready for studio pickup',
        message: `Your order for ${pkg} is now ready for studio pickup at E-Kodak.`,
        tone: 'ready',
      };
    case 'UNDER_DELIVERY':
      return {
        title: 'Your order is out for delivery',
        message: `Your order for ${pkg} is now out for delivery to your address.`,
        tone: 'inProgress',
      };
    case 'COMPLETED':
      return {
        title: 'Your order is completed',
        message: `Your order for ${pkg} is now completed. Thank you for choosing E-Kodak!`,
        tone: 'completed',
      };
    case 'CANCELLED':
    case 'REJECTED':
      return {
        title: s === 'REJECTED' ? 'Your order was declined' : 'Your order was cancelled',
        message: `Your order for ${pkg} has been ${s === 'REJECTED' ? 'declined' : 'cancelled'}. Contact studio support if needed.`,
        tone: 'cancelled',
      };
    case 'PENDING':
    case 'RESERVED':
    default:
      return {
        title: 'Your order has been received',
        message: `Your order has been received for ${pkg} and queued for confirmation.`,
        tone: 'pending',
      };
  }
}

export async function fetchCustomerNotificationsFeed({ syncLive = true } = {}) {
  const [savedList, readSet, clearedSet] = await Promise.all([
    getSavedBookings(),
    readIdSet(KEYS.READ_IDS),
    readIdSet(KEYS.CLEARED_IDS),
  ]);

  let latestBookings = savedList;
  const liveBookingsMap = new Map();

  // Refresh the latest 3 saved bookings so order statuses match the studio database
  if (syncLive && Array.isArray(savedList) && savedList.length > 0) {
    const toRefresh = savedList.slice(0, 3);
    const refreshed = await Promise.all(
      toRefresh.map(async (b) => {
        try {
          const res = await fetchBookingByToken(b.token || b.bookingNumber);
          if (res?.data) {
            liveBookingsMap.set(b.token, res.data);
            await saveBookingToken(b.token, res.data);
            return res.data;
          }
        } catch { }
        return null;
      })
    );
    if (refreshed.some(Boolean)) {
      latestBookings = await getSavedBookings();
    }
  }

  const bookingIds = Array.from(
    new Set(
      [
        ...latestBookings.map((b) => b.bookingId),
        ...Array.from(liveBookingsMap.values()).map((b) => b.id),
      ].filter((id) => UUID_RE.test(String(id || '')))
    )
  );
  const customerIds = Array.from(
    new Set(
      [
        ...latestBookings.map((b) => b.customerId),
        ...Array.from(liveBookingsMap.values()).map((b) => b.customer_id),
      ].filter((id) => UUID_RE.test(String(id || '')))
    )
  );

  const items = [];
  const seenKeys = new Set();

  // 1. Live Database `notifications` rows (in-app & order records)
  if (isSupabaseConfigured && supabase && (bookingIds.length > 0 || customerIds.length > 0)) {
    try {
      const queries = [];
      if (customerIds.length > 0) {
        queries.push(
          supabase
            .from('notifications')
            .select('id, title, message, notification_type, is_read, created_at, booking_id, booking:bookings(id, booking_number)')
            .in('user_id', customerIds)
            .order('created_at', { ascending: false })
            .limit(30)
        );
      }
      if (bookingIds.length > 0) {
        queries.push(
          supabase
            .from('notifications')
            .select('id, title, message, notification_type, is_read, created_at, booking_id, booking:bookings(id, booking_number)')
            .in('booking_id', bookingIds)
            .order('created_at', { ascending: false })
            .limit(30)
        );
      }
      const results = await Promise.all(queries);
      for (const res of results) {
        if (!res?.error && Array.isArray(res.data)) {
          for (const row of res.data) {
            if (!row?.id || clearedSet.has(row.id) || seenKeys.has(row.id)) continue;
            seenKeys.add(row.id);
            const t = String(row.notification_type || '').toLowerCase();
            const isOrderNotif = Boolean(row.booking_id) || t.includes('booking') || t.includes('payment') || t.includes('delivery');
            const matchedSaved = latestBookings.find(
              (b) => b.bookingId === row.booking_id || (row.booking?.booking_number && b.bookingNumber === row.booking.booking_number)
            );
            items.push({
              id: row.id,
              channel: isOrderNotif ? 'order' : 'in_app',
              title: cleanNotificationTitle(row.title),
              message: row.message || '',
              createdAt: row.created_at || new Date().toISOString(),
              isRead: Boolean(row.is_read) || readSet.has(row.id),
              tone: isOrderNotif ? 'confirmed' : 'gold',
              bookingToken: matchedSaved?.token || matchedSaved?.bookingNumber || row.booking?.booking_number || null,
              bookingNumber: row.booking?.booking_number || matchedSaved?.bookingNumber || null,
              status: matchedSaved?.status || null,
              source: 'database',
            });
          }
        }
      }
    } catch { }
  }

  // 2. Order Status & Delivery Notifications synthesized from real active orders
  for (const b of latestBookings) {
    const statusKey = String(b.status || 'PENDING').toUpperCase();
    const orderNotifId = `order_status_${b.token || b.bookingNumber}_${statusKey}`;
    if (!clearedSet.has(orderNotifId) && !seenKeys.has(orderNotifId)) {
      seenKeys.add(orderNotifId);
      const copy = getOrderStatusCopy(statusKey, b.serviceName);
      items.push({
        id: orderNotifId,
        channel: 'order',
        title: copy.title,
        message: copy.message,
        createdAt: b.savedAt || b.createdAt || new Date().toISOString(),
        isRead: readSet.has(orderNotifId),
        tone: copy.tone,
        bookingToken: b.token || b.bookingNumber,
        bookingNumber: b.bookingNumber,
        status: statusKey,
        source: 'order',
      });
    }

    if (b.downPaymentConfirmed || b.paymentStatus === 'PAID') {
      const payNotifId = `order_payment_${b.token || b.bookingNumber}_PAID`;
      if (!clearedSet.has(payNotifId) && !seenKeys.has(payNotifId)) {
        seenKeys.add(payNotifId);
        items.push({
          id: payNotifId,
          channel: 'order',
          title: 'Your payment is now confirmed',
          message: `Your payment is now confirmed for ${b.serviceName || 'Studio Package'}. Your studio slot is secured.`,
          createdAt: b.savedAt || b.createdAt || new Date().toISOString(),
          isRead: readSet.has(payNotifId),
          tone: 'ready',
          bookingToken: b.token || b.bookingNumber,
          bookingNumber: b.bookingNumber,
          status: statusKey,
          source: 'order',
        });
      }
    }
  }

  // 3. In-app studio announcements (live connection notices)
  const inAppLiveId = 'inapp_studio_companion_live';
  if (!clearedSet.has(inAppLiveId) && !seenKeys.has(inAppLiveId)) {
    seenKeys.add(inAppLiveId);
    items.push({
      id: inAppLiveId,
      channel: 'in_app',
      title: latestBookings.length > 0 ? 'Live Order Tracking Connected' : 'Scan Your Booking QR Pass',
      message:
        latestBookings.length > 0
          ? 'Real-time studio updates and sound alerts are active for your saved orders.'
          : 'Scan your receipt or email QR code to receive live order updates here.',
      createdAt: latestBookings[0]?.savedAt || new Date().toISOString(),
      isRead: readSet.has(inAppLiveId),
      tone: 'ready',
      bookingToken: latestBookings[0]?.token || null,
      source: 'in_app',
    });
  }

  const sorted = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadCount = sorted.filter((n) => !n.isRead).length;

  return {
    items: sorted,
    unreadCount,
    bookings: latestBookings,
  };
}

export async function fetchPhotographerNotificationsFeed({ bookings = [], alerts: initialAlerts = null } = {}) {
  const [readSet, clearedSet, fetchedAlerts] = await Promise.all([
    readIdSet(KEYS.READ_IDS),
    readIdSet(KEYS.CLEARED_IDS),
    initialAlerts ? Promise.resolve({ data: initialAlerts }) : fetchPhotographerAlerts(),
  ]);

  const rawAlerts = Array.isArray(fetchedAlerts?.data) ? fetchedAlerts.data : [];
  const items = [];
  const seenKeys = new Set();

  // 1. Live In-App Dispatch / Workstation Alerts
  for (const al of rawAlerts) {
    const id = `ph_alert_${al.id}`;
    if (clearedSet.has(id) || seenKeys.has(id)) continue;
    seenKeys.add(id);
    items.push({
      id,
      channel: 'in_app',
      title: al.title || 'Studio Dispatch Alert',
      message: al.message || 'Check your dispatch updates in the studio portal.',
      createdAt: al.created_at || new Date().toISOString(),
      isRead: readSet.has(id),
      tone: String(al.priority || '').toUpperCase() === 'HIGH' ? 'editing' : 'gold',
      source: 'dispatch',
    });
  }

  // 2. Order / Shoot Assignment Notifications from assigned bookings
  const activeShoots = (Array.isArray(bookings) ? bookings : []).slice(0, 12);
  for (const b of activeShoots) {
    const statusKey = String(b.status || 'CONFIRMED').toUpperCase();
    const id = `ph_shoot_${b.id}_${statusKey}`;
    if (clearedSet.has(id) || seenKeys.has(id)) continue;
    seenKeys.add(id);

    const client = b.profile?.full_name || 'Studio Client';
    const pkg = b.services?.name || 'Portrait Session';
    const dateStr = formatReadableDate(b.session_date);
    const timeStr = formatTime12(b.session_time);

    const actionTitle =
      statusKey === 'CONFIRMED'
        ? `New shoot ready for ${client}`
        : statusKey === 'PHOTOGRAPHER_ASSIGNED'
          ? `You are assigned to ${client}'s shoot`
          : statusKey === 'CAPTURE' || statusKey === 'IN_PROGRESS'
            ? `Pictorial session in progress for ${client}`
            : statusKey === 'EDITING'
              ? `${client}'s photos are in editing`
              : `Shoot update for ${client}`;

    items.push({
      id,
      channel: 'order',
      title: actionTitle,
      message: `${client} — ${pkg} (${dateStr} at ${timeStr})`,
      createdAt: b.updated_at || b.created_at || new Date().toISOString(),
      isRead: readSet.has(id),
      tone: statusKey === 'CONFIRMED' ? 'confirmed' : statusKey === 'EDITING' ? 'editing' : 'ready',
      booking: b,
      bookingNumber: b.booking_number,
      status: statusKey,
      source: 'order',
    });
  }

  // 3. In-app baseline studio portal confirmation when no dispatch alerts
  if (rawAlerts.length === 0) {
    const syncId = 'ph_inapp_floor_synced';
    if (!clearedSet.has(syncId) && !seenKeys.has(syncId)) {
      seenKeys.add(syncId);
      items.push({
        id: syncId,
        channel: 'in_app',
        title: 'Studio Floor Connected',
        message: 'Assigned shoots and dispatch alerts sync in real time with sound cues.',
        createdAt: new Date().toISOString(),
        isRead: readSet.has(syncId),
        tone: 'ready',
        source: 'in_app',
      });
    }
  }

  const sorted = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadCount = sorted.filter((n) => !n.isRead).length;

  return {
    items: sorted,
    unreadCount,
  };
}

export async function markNotificationRead(id) {
  if (!id) return;
  await addIdsToStorage(KEYS.READ_IDS, [id]);
  if (isSupabaseConfigured && supabase && UUID_RE.test(String(id))) {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch { }
  }
}

export async function markAllNotificationsRead(items = []) {
  const ids = items.map((n) => n?.id).filter(Boolean);
  if (ids.length === 0) return;
  await addIdsToStorage(KEYS.READ_IDS, ids);

  const uuidIds = ids.filter((id) => UUID_RE.test(String(id)));
  if (isSupabaseConfigured && supabase && uuidIds.length > 0) {
    try {
      await supabase.from('notifications').update({ is_read: true }).in('id', uuidIds);
    } catch { }
  }
}

export async function clearNotificationsList(items = []) {
  const ids = items.map((n) => n?.id).filter(Boolean);
  if (ids.length === 0) return;
  await Promise.all([
    addIdsToStorage(KEYS.CLEARED_IDS, ids),
    addIdsToStorage(KEYS.READ_IDS, ids),
  ]);
}

/**
 * Announces brand-new unread notifications with sound once per notification ID,
 * respecting user Settings toggles (`notifications` & `sound`).
 */
export async function announceNewNotificationsWithSound(items = [], { playIfUnread = false } = {}) {
  const unread = items.filter((n) => !n.isRead);
  if (unread.length === 0) return false;

  const settings = await getAppSettings().catch(() => ({ notifications: true, sound: true }));
  if (settings?.notifications === false) return false;

  const seenSoundSet = await readIdSet(KEYS.SOUND_SEEN_IDS);
  const newlyDetected = unread.filter((n) => n?.id && !seenSoundSet.has(n.id));

  if (newlyDetected.length === 0 && !playIfUnread) {
    return false;
  }

  if (newlyDetected.length > 0) {
    await addIdsToStorage(
      KEYS.SOUND_SEEN_IDS,
      newlyDetected.map((n) => n.id)
    );
  }

  const hasUrgentOrReady = (newlyDetected.length > 0 ? newlyDetected : unread).some(
    (n) => n.tone === 'ready' || n.tone === 'completed' || n.channel === 'order'
  );
  await playMascotSound(hasUrgentOrReady ? 'success' : 'alert');
  return true;
}

/**
 * Plays crisp tactile/audio cue when opening the Notifications Bell drawer,
 * respecting the Sound Notification setting.
 */
export async function playNotificationBellCue(hasUnread = false) {
  const settings = await getAppSettings().catch(() => ({ sound: true }));
  if (settings?.sound === false) {
    return;
  }
  await playMascotSound(hasUnread ? 'alert' : 'pop');
}
