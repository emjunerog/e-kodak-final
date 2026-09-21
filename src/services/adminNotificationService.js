import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getAiClient, isAiConfigured } from '../lib/ai';

// ─── Local Storage Keys ──────────────────────────────────────────────────────
const BROADCASTS_KEY        = 'ekodak_admin_broadcasts';
const READ_ADMIN_NOTIFS_KEY = 'ekodak_read_admin_notifications';

// ─── Read / Write Helpers ────────────────────────────────────────────────────

export function getReadAdminNotificationIds() {
  try { return JSON.parse(localStorage.getItem(READ_ADMIN_NOTIFS_KEY) || '[]'); }
  catch { return []; }
}

export function saveReadAdminNotificationId(id) {
  try {
    const list = getReadAdminNotificationIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(READ_ADMIN_NOTIFS_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('ekodak:admin_notifications_updated'));
    }
  } catch (e) { console.warn('saveReadAdminNotificationId:', e); }
}

export function saveAllReadAdminNotificationIds(ids = []) {
  try {
    const merged = Array.from(new Set([...getReadAdminNotificationIds(), ...ids]));
    localStorage.setItem(READ_ADMIN_NOTIFS_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('ekodak:admin_notifications_updated'));
  } catch (e) { console.warn('saveAllReadAdminNotificationIds:', e); }
}

export function getLocalBroadcasts() {
  try { return JSON.parse(localStorage.getItem(BROADCASTS_KEY) || '[]'); }
  catch { return []; }
}

export function saveLocalBroadcast(item) {
  try {
    const list = getLocalBroadcasts();
    list.unshift(item);
    // Keep last 100 broadcasts to avoid bloating storage
    localStorage.setItem(BROADCASTS_KEY, JSON.stringify(list.slice(0, 100)));
    window.dispatchEvent(new CustomEvent('ekodak:admin_notifications_updated'));
  } catch (e) { console.warn('saveLocalBroadcast:', e); }
}

// ─── Recipient Resolution ─────────────────────────────────────────────────────
/**
 * Resolves recipient profile rows from Supabase based on the dispatch group.
 * Returns an array of { id, first_name, last_name, email, phone, role }
 */
async function resolveRecipients(recipientGroup, specificCustomerId = null) {
  if (!isSupabaseConfigured) return [];

  try {
    if (recipientGroup === 'SPECIFIC_CUSTOMER' && specificCustomerId) {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, role')
        .eq('id', specificCustomerId)
        .single();
      return data ? [data] : [];
    }

    if (recipientGroup === 'ALL_CUSTOMERS') {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, role')
        .eq('role', 'customer');
      return data || [];
    }

    if (recipientGroup === 'ALL_STAFF') {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, role')
        .in('role', ['admin', 'staff', 'finance']);
      return data || [];
    }

    if (recipientGroup === 'FINANCE_TEAM') {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, role')
        .eq('role', 'finance');
      return data || [];
    }

    if (recipientGroup === 'STAFF_ONLY') {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, role')
        .eq('role', 'staff');
      return data || [];
    }

    if (recipientGroup === 'ALL_PHOTOGRAPHERS') {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, role')
        .eq('role', 'photographer');
      return data || [];
    }

    if (recipientGroup === 'ALL_USERS') {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, role');
      return data || [];
    }

    return [];
  } catch (err) {
    console.warn('[resolveRecipients] error:', err);
    return [];
  }
}

// ─── Email Logging & Dispatch Hook ───────────────────────────────────────────
/**
 * Queues an email by inserting a row into `email_logs`.
 * Also attempts to invoke the Supabase Edge Function `send-email` if deployed.
 *
 * To activate real sending:
 *   1. Deploy scripts/edge-function-send-email.js as a Supabase Edge Function.
 *   2. Add RESEND_API_KEY to your Supabase project secrets.
 *   3. No frontend code changes needed — the invoke call below will work.
 */
async function queueEmail({ recipientEmail, subject, html, bookingId = null, recipientName = '', notificationType = 'BROADCAST' }) {
  if (!recipientEmail || !isSupabaseConfigured) return { success: false, reason: 'no_email_or_db' };

  const now = new Date().toISOString();

  // 1. Log to email_logs table (for audit & tracking in AdminSmsLogs-style views)
  let logId = null;
  try {
    const { data: logRow, error: logErr } = await supabase
      .from('email_logs')
      .insert({
        recipient_email:   recipientEmail,
        recipient_name:    recipientName || null,
        subject,
        html_body:         html || null,
        notification_type: notificationType,
        booking_id:        bookingId || null,
        status:            'QUEUED',
        queued_at:         now,
      })
      .select('id')
      .single();

    if (!logErr && logRow) logId = logRow.id;
  } catch (e) {
    console.warn('[queueEmail] email_logs insert error (table may not exist yet):', e.message);
  }

  // 2. Attempt to invoke Supabase Edge Function `send-email`
  try {
    const { data: fnData, error: fnErr } = await supabase.functions.invoke('send-email', {
      body: { to: recipientEmail, subject, html, recipientName, bookingId, notificationType }
    });

    if (!fnErr && fnData?.success) {
      // Update log status to SENT
      if (logId) {
        await supabase.from('email_logs').update({ status: 'SENT', sent_at: new Date().toISOString() }).eq('id', logId);
      }
      return { success: true, method: 'edge_function' };
    }
    // Edge function not deployed or returned error — that's OK, email is still queued
  } catch {
    // Edge function not deployed yet — silently continue
  }

  return { success: true, method: 'queued', logId };
}

// ─── Systematic Admin Notifications Synthesizer ──────────────────────────────
/**
 * Synthesizes automatic real-time operational notifications from live bookings & payments.
 */
export function synthesizeSystematicAdminNotifications(bookings = [], payments = []) {
  const readIds = getReadAdminNotificationIds();
  const notifs  = [];

  bookings.forEach((b) => {
    const bNumber    = b.booking_number || 'EK-SESSION';
    const clientName = b.customer
      ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim()
      : (b.customer_name || 'Studio Client');
    const serviceName = b.service?.name || b.tier_name || 'Graduation Portrait';

    // Orders / Photo proofs ready
    if (b.status === 'READY' || b.status === 'COMPLETED') {
      const nId = `auto_order_ready_${b.id}`;
      notifs.push({
        id: nId, booking_id: b.id,
        booking:           { id: b.id, booking_number: bNumber },
        notification_type: 'ORDER_READY',
        title:             `Deliverables Ready: ${bNumber}`,
        message:           `High-resolution retouched photographs for ${clientName} (${serviceName}) are ready for client download and print release.`,
        created_at:        b.updated_at || b.created_at || new Date().toISOString(),
        is_read:           readIds.includes(nId),
        category:          'ORDERS',
        priority:          'high',
        recipient_group:   'CUSTOMER & ADMIN',
        recipient_name:    clientName,
        recipient_email:   b.customer?.email || '',
        recipient_phone:   b.customer?.phone || '',
        channels:          ['In-App', 'Email'],
        action_url:        '/admin/photos'
      });
    }

    // Booking confirmed
    if (b.status === 'CONFIRMED') {
      const nId = `auto_booking_conf_${b.id}`;
      const dateStr = b.event_date
        ? new Date(b.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Confirmed date';
      notifs.push({
        id: nId, booking_id: b.id,
        booking:           { id: b.id, booking_number: bNumber },
        notification_type: 'BOOKING_CONFIRMED',
        title:             `Photoshoot Confirmed: ${bNumber}`,
        message:           `Session for ${clientName} scheduled for ${dateStr}${b.preferred_time ? ` at ${b.preferred_time}` : ''}. Studio bay & call-time assigned.`,
        created_at:        b.updated_at || b.created_at || new Date().toISOString(),
        is_read:           readIds.includes(nId),
        category:          'BOOKINGS',
        priority:          'normal',
        recipient_group:   'CUSTOMER & STAFF',
        recipient_name:    clientName,
        recipient_email:   b.customer?.email || '',
        recipient_phone:   b.customer?.phone || '',
        channels:          ['In-App', 'Email', 'SMS'],
        action_url:        '/admin/bookings'
      });
    }

    // New booking pending
    if (b.status === 'PENDING') {
      const nId = `auto_booking_pend_${b.id}`;
      notifs.push({
        id: nId, booking_id: b.id,
        booking:           { id: b.id, booking_number: bNumber },
        notification_type: 'BOOKING_PENDING',
        title:             `New Reservation Request: ${bNumber}`,
        message:           `${clientName} requested a ${serviceName} booking. Downpayment verification & photographer assignment required.`,
        created_at:        b.created_at || new Date().toISOString(),
        is_read:           readIds.includes(nId),
        category:          'BOOKINGS',
        priority:          'high',
        recipient_group:   'ADMIN & STAFF',
        recipient_name:    clientName,
        recipient_email:   b.customer?.email || '',
        recipient_phone:   b.customer?.phone || '',
        channels:          ['In-App'],
        action_url:        '/admin/bookings'
      });
    }
  });

  // Payment verifications
  payments.forEach((p) => {
    const nId       = `auto_payment_${p.id}`;
    const bNumber   = p.booking?.booking_number || 'N/A';
    const clientName = p.booking?.customer
      ? `${p.booking.customer.first_name || ''} ${p.booking.customer.last_name || ''}`.trim()
      : 'Client';
    const amountStr = `₱${Number(p.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

    notifs.push({
      id: nId, booking_id: p.booking_id,
      booking:           { id: p.booking_id, booking_number: bNumber },
      notification_type: 'PAYMENT_RECEIVED',
      title:             `Payment Verified: ${amountStr} (${bNumber})`,
      message:           `${p.payment_type || 'Payment'} of ${amountStr} received from ${clientName} via ${p.payment_method || 'GCash'}${p.reference_number ? ` (Ref: ${p.reference_number})` : ''}.`,
      created_at:        p.payment_date || p.created_at || new Date().toISOString(),
      is_read:           readIds.includes(nId),
      category:          'PAYMENTS',
      priority:          'normal',
      recipient_group:   'CUSTOMER & FINANCE',
      recipient_name:    clientName,
      recipient_email:   p.booking?.customer?.email || '',
      recipient_phone:   p.booking?.customer?.phone || '',
      channels:          ['In-App', 'Email', 'SMS'],
      action_url:        '/admin/payments'
    });
  });

  return notifs;
}

// ─── Unified Admin Notifications Fetch ───────────────────────────────────────
export async function getUnifiedAdminNotifications() {
  const readIds = getReadAdminNotificationIds();
  let dbRows = [], bookings = [], payments = [];

  if (isSupabaseConfigured) {
    try {
      const [notifRes, bookRes, payRes] = await Promise.all([
        supabase
          .from('notifications')
          .select(`
            id, title, message, notification_type, is_read, created_at, booking_id,
            booking:bookings(id, booking_number),
            user:profiles!notifications_user_id_fkey(first_name, last_name, role, email, phone)
          `)
          .order('created_at', { ascending: false })
          .limit(80),
        supabase
          .from('bookings')
          .select(`
            id, booking_number, status, payment_status, tier_name, event_date, preferred_time,
            total_amount, down_payment_amount, remaining_balance, created_at, updated_at,
            service:services(id, name),
            customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, email, phone)
          `)
          .order('created_at', { ascending: false })
          .limit(40),
        supabase
          .from('payments')
          .select(`
            id, booking_id, amount, payment_method, payment_type, reference_number, payment_date, created_at,
            booking:bookings(id, booking_number,
              customer:profiles!bookings_customer_id_fkey(first_name, last_name, email, phone))
          `)
          .order('created_at', { ascending: false })
          .limit(30)
      ]);

      if (notifRes.data) dbRows   = notifRes.data;
      if (bookRes.data)  bookings = bookRes.data;
      if (payRes.data)   payments = payRes.data;
    } catch (err) {
      console.warn('[getUnifiedAdminNotifications] fetch error:', err);
    }
  }

  // Categorize DB rows (filtering out customer activity/preference updates)
  const normalizedDbRows = dbRows
    .filter(n => 
      n.notification_type !== 'CUSTOMER_AUDIT' && 
      n.notification_type !== 'PREFERENCE_UPDATE' &&
      n.notification_type !== 'SPEC_UPDATE'
    )
    .map(n => ({
    id:                n.id,
    booking_id:        n.booking_id,
    booking:           n.booking,
    notification_type: n.notification_type || 'SYSTEM_BULLETIN',
    title:             n.title,
    message:           n.message,
    created_at:        n.created_at,
    is_read:           n.is_read || readIds.includes(n.id),
    category:          n.notification_type?.includes('PAYMENT') ? 'PAYMENTS'
                     : n.notification_type?.includes('BOOKING')  ? 'BOOKINGS'
                     : n.notification_type === 'ORDER_READY'     ? 'ORDERS'
                     : 'BROADCASTS',
    priority:          'normal',
    recipient_group:   n.user ? `${n.user.first_name || ''} ${n.user.last_name || ''}`.trim() || n.user.role : 'System Wide',
    recipient_name:    n.user ? `${n.user.first_name || ''} ${n.user.last_name || ''}`.trim() : 'All Users',
    recipient_role:    n.user?.role || null,
    recipient_email:   n.user?.email || '',
    recipient_phone:   n.user?.phone || '',
    channels:          ['In-App'],
    action_url:        n.booking_id ? '/admin/bookings' : '/admin/notifications'
  }));

  const systematicRows = synthesizeSystematicAdminNotifications(bookings, payments);

  const localBroadcasts = getLocalBroadcasts().map(b => ({
    ...b,
    is_read: readIds.includes(b.id)
  }));

  const deletedIds = getDeletedAdminNotificationIds();

  // Merge & deduplicate
  const map = new Map();
  [...localBroadcasts, ...normalizedDbRows, ...systematicRows].forEach(item => {
    if (!map.has(item.id) && !deletedIds.includes(item.id)) {
      map.set(item.id, item);
    }
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return {
    notifications:   merged,
    totalCount:      merged.length,
    unreadCount:     merged.filter(n => !n.is_read).length,
    ordersReadyCount: merged.filter(n => n.notification_type === 'ORDER_READY').length,
    paymentsCount:   merged.filter(n => n.notification_type === 'PAYMENT_RECEIVED').length,
    bookingsCount:   merged.filter(n => n.category === 'BOOKINGS').length,
    broadcastsCount: localBroadcasts.filter(b => !deletedIds.includes(b.id)).length + merged.filter(n => n.category === 'BROADCASTS' && !n.id.startsWith('local_')).length,
    staffCount:      merged.filter(n => n.recipient_role && ['admin','staff','finance','photographer'].includes(n.recipient_role)).length
  };
}

// ─── Local Storage Deleted Notifs Key ────────────────────────────────────────
const DELETED_ADMIN_NOTIFS_KEY = 'ekodak_deleted_admin_notifications';

export function getDeletedAdminNotificationIds() {
  try { return JSON.parse(localStorage.getItem(DELETED_ADMIN_NOTIFS_KEY) || '[]'); }
  catch { return []; }
}

export function saveDeletedAdminNotificationId(id) {
  try {
    const list = getDeletedAdminNotificationIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(DELETED_ADMIN_NOTIFS_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('ekodak:admin_notifications_updated'));
      window.dispatchEvent(new CustomEvent('ekodak:customer_notifications_updated'));
    }
  } catch (e) { console.warn('saveDeletedAdminNotificationId:', e); }
}

// ─── Delete Admin Notification ───────────────────────────────────────────────
export async function deleteAdminNotification(id) {
  saveDeletedAdminNotificationId(id);

  // If local broadcast, remove from broadcasts list
  if (id.startsWith('local_')) {
    try {
      const list = getLocalBroadcasts().filter(b => b.id !== id);
      localStorage.setItem(BROADCASTS_KEY, JSON.stringify(list));
    } catch (e) { console.warn('[deleteAdminNotification] local remove error:', e); }
  }

  // If database row, delete from public.notifications
  if (isSupabaseConfigured && !id.startsWith('auto_') && !id.startsWith('local_')) {
    try {
      await supabase.from('notifications').delete().eq('id', id);
    } catch (e) {
      console.warn('[deleteAdminNotification] db delete error:', e);
    }
  }

  window.dispatchEvent(new CustomEvent('ekodak:admin_notifications_updated'));
  window.dispatchEvent(new CustomEvent('ekodak:customer_notifications_updated'));
  return { success: true };
}

// ─── Mark Read ────────────────────────────────────────────────────────────────
export async function markNotificationAsRead(id) {
  saveReadAdminNotificationId(id);
  if (isSupabaseConfigured && !id.startsWith('auto_') && !id.startsWith('local_')) {
    try { await supabase.from('notifications').update({ is_read: true }).eq('id', id); }
    catch (e) { console.warn('[markNotificationAsRead]', e); }
  }
  return { success: true };
}

export async function markAllNotificationsAsRead(notifications = []) {
  saveAllReadAdminNotificationIds(notifications.map(n => n.id));
  if (isSupabaseConfigured) {
    try { await supabase.from('notifications').update({ is_read: true }).eq('is_read', false); }
    catch (e) { console.warn('[markAllNotificationsAsRead]', e); }
  }
  return { success: true };
}

// ─── Multi-Channel Dispatch ──────────────────────────────────────────────────
/**
 * Dispatches a multi-channel notification:
 *  - In-App:  Inserts a `notifications` row PER RECIPIENT with correct user_id (fan-out)
 *  - Email:   Inserts to `email_logs` + invokes Supabase Edge Function `send-email` if deployed
 *  - SMS:     Inserts to `sms_logs` table
 *  - Broadcast: Saves to local cache for admin feed
 */
export async function dispatchMultiChannelNotification({
  recipientGroup    = 'ALL_CUSTOMERS',
  recipientName     = '',
  recipientEmail    = '',
  recipientPhone    = '',
  specificCustomerId = null,  // The profile ID of the specific customer (if SPECIFIC_CUSTOMER)
  bookingId         = null,
  bookingNumber     = '',
  title,
  message,
  notificationType  = 'BROADCAST',
  priority          = 'normal',
  channels          = { inApp: true, email: true, sms: false },
  emailSubject      = '',
  emailHtml         = '',
  smsMessage        = '',
  smsGateway        = 'semaphore'
}) {
  const now = new Date().toISOString();
  const dispatchId = `local_broadcast_${Date.now()}`;
  const activeChannels = [
    channels.inApp  && 'In-App',
    channels.email  && 'Email',
    channels.sms    && 'SMS',
  ].filter(Boolean);

  // ── 1. Resolve actual recipient profiles ──────────────────────────────────
  let recipients = [];
  if (isSupabaseConfigured) {
    recipients = await resolveRecipients(recipientGroup, specificCustomerId);
  }

  // If Supabase not configured or no profiles found but we have explicit email/phone, still proceed
  if (recipients.length === 0 && (recipientEmail || recipientName)) {
    recipients = [{ id: null, first_name: recipientName, last_name: '', email: recipientEmail, phone: recipientPhone }];
  }

  // ── 2. In-App: Insert per-recipient notification rows with user_id ─────────
  if (isSupabaseConfigured && channels.inApp && recipients.length > 0) {
    const rows = recipients
      .filter(r => r.id) // Only insert for profiles with a real user_id
      .map(r => ({
        user_id:           r.id,
        title,
        message,
        notification_type: notificationType,
        booking_id:        bookingId || null,
        is_read:           false,
      }));

    if (rows.length > 0) {
      try {
        await supabase.from('notifications').insert(rows);
        // Notify customer dashboard to refresh
        window.dispatchEvent(new CustomEvent('ekodak:customer_notifications_updated'));
      } catch (e) {
        console.warn('[dispatch] notifications insert error:', e.message);
      }
    }

    // If no profiles found but we have a recipientGroup — insert one generic row for admin feed
    if (rows.length === 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase.from('notifications').insert({
            user_id:           user.id,
            title,
            message,
            notification_type: notificationType,
            booking_id:        bookingId || null,
            is_read:           false
          });
        }
      } catch (e) {
        console.warn('[dispatch] generic notifications insert error:', e.message);
      }
    }
  }

  // ── 3. Email: Queue per recipient ─────────────────────────────────────────
  const emailResults = [];
  if (channels.email) {
    const emailTargets = recipients.filter(r => r.email);

    if (emailTargets.length > 0) {
      // Send to each recipient (batched, with 50ms stagger to be respectful)
      for (const r of emailTargets) {
        const rName  = `${r.first_name || ''} ${r.last_name || ''}`.trim() || recipientName;
        const rEmail = r.email || recipientEmail;
        const result = await queueEmail({
          recipientEmail:    rEmail,
          recipientName:     rName,
          subject:           emailSubject || title,
          html:              emailHtml    || `<p>${message}</p>`,
          bookingId:         bookingId,
          notificationType,
        });
        emailResults.push({ email: rEmail, ...result });
      }
    } else if (recipientEmail) {
      // Fallback if no profiles resolved but explicit email was provided
      const result = await queueEmail({
        recipientEmail,
        recipientName: recipientName,
        subject:       emailSubject || title,
        html:          emailHtml    || `<p>${message}</p>`,
        bookingId,
        notificationType,
      });
      emailResults.push({ email: recipientEmail, ...result });
    }
  }

  // ── 4. SMS: Insert to sms_logs per recipient ──────────────────────────────
  if (isSupabaseConfigured && channels.sms) {
    const smsTargets = recipients.filter(r => r.phone).map(r => ({
      phone_number:      r.phone || recipientPhone,
      message:           smsMessage || message,
      notification_type: notificationType,
      status:            'QUEUED',
      sent_at:           now,
      booking_id:        bookingId || null
    }));

    if (smsTargets.length === 0 && recipientPhone) {
      smsTargets.push({
        phone_number:      recipientPhone,
        message:           smsMessage || message,
        notification_type: notificationType,
        status:            'QUEUED',
        sent_at:           now,
        booking_id:        bookingId || null
      });
    }

    if (smsTargets.length > 0) {
      try { await supabase.from('sms_logs').insert(smsTargets); }
      catch (e) { console.warn('[dispatch] sms_logs insert error:', e.message); }
    }
  }

  // ── 5. Audit log ──────────────────────────────────────────────────────────
  try {
    const activityLogs = JSON.parse(localStorage.getItem('ekodak_admin_activity_logs') || '[]');
    activityLogs.unshift({
      id:              `act_${Date.now()}`,
      action:          'NOTIFICATION_DISPATCH',
      booking_number:  bookingNumber || 'SYSTEM',
      client_name:     recipientName || recipientGroup,
      deleted_by_name: 'Admin',
      reason:          `${recipientGroup} — ${activeChannels.join(', ')} — "${title}" (${recipients.length} recipient${recipients.length !== 1 ? 's' : ''})`,
      created_at:      now
    });
    localStorage.setItem('ekodak_admin_activity_logs', JSON.stringify(activityLogs));
  } catch { /* non-fatal */ }

  // ── 6. Cache for local admin broadcast feed ────────────────────────────────
  // Note: Outbound messages sent by admin are marked as is_read: true so they
  // do NOT toggle the admin's unread notification badge or alert the sender.
  const record = {
    id:                dispatchId,
    booking_id:        bookingId,
    booking:           bookingNumber ? { id: bookingId, booking_number: bookingNumber } : null,
    notification_type: notificationType,
    title,
    message,
    created_at:        now,
    is_read:           true,
    is_outbound:       true,
    category:          'BROADCASTS',
    priority,
    recipient_group:   recipientGroup,
    recipient_name:    recipientName || recipientGroup,
    recipient_count:   recipients.length,
    recipient_email:   recipientEmail,
    recipient_phone:   recipientPhone,
    channels:          activeChannels,
    email_details:     channels.email ? {
      subject:   emailSubject || title,
      html:      emailHtml || message,
      status:    emailResults.some(r => r.method === 'edge_function') ? 'SENT' : 'QUEUED',
      sent_at:   now,
      count:     emailResults.length
    } : null,
    sms_details: channels.sms ? {
      phone:    recipientPhone,
      message:  smsMessage || message,
      gateway:  smsGateway,
      status:   'QUEUED',
      sent_at:  now
    } : null,
    action_url: bookingId ? '/admin/bookings' : '/admin/notifications'
  };

  saveLocalBroadcast(record);

  // Notify admin feed
  window.dispatchEvent(new CustomEvent('ekodak:admin_notifications_updated'));

  return {
    success:       true,
    record,
    recipientsHit: recipients.length,
    emailResults,
    emailStatus:   emailResults.some(r => r.method === 'edge_function') ? 'sent' : 'queued'
  };
}

// ─── AI Email Template Generator ─────────────────────────────────────────────
export async function generateAIEmailTemplate({
  type             = 'ORDER_READY',
  prompt           = '',
  customerName     = 'Valued Client',
  bookingNumber    = 'BK-2026-001',
  serviceName      = 'Graduation Portrait Session',
  eventDate        = 'September 25, 2026',
  amount           = '₱1,500.00',
  remainingBalance = '₱0.00',
  studioAddress    = 'E-Kodak Studio, 3rd Floor Colon Heritage Bldg, Cebu City'
}) {
  // Use Gemini if API key is set and user gave a custom prompt
  if (isAiConfigured() && prompt) {
    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model:    'gemini-2.5-flash',
        contents: `You are the lead client communications manager for E-Kodak Studio, a premier graduation portrait studio in Cebu, Philippines.
Write a professional, warm, and polished customer email notification.

Context:
- Customer Name: ${customerName}
- Booking Reference: #${bookingNumber}
- Service: ${serviceName}
- Scheduled Date: ${eventDate}
- Remaining Balance: ${remainingBalance}
- Studio Address: ${studioAddress}
- Instruction: ${prompt}

Respond with a JSON object strictly in this format:
{
  "subject": "Email Subject Line",
  "headline": "Greeting or Main Headline",
  "body": "Detailed paragraph with clear studio instructions.",
  "callToAction": "Button Label",
  "smsText": "SMS version under 150 characters with booking # and key instruction."
}
Return only valid JSON.`
      });

      const text = response.text?.trim() || '';
      const cleanJson = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        subject:      parsed.subject,
        headline:     parsed.headline,
        body:         parsed.body,
        callToAction: parsed.callToAction,
        smsText:      parsed.smsText,
        html:         buildStudioEmailHtml({
          subject:      parsed.subject,
          headline:     parsed.headline,
          body:         parsed.body,
          callToAction: parsed.callToAction,
          customerName,
          bookingNumber
        })
      };
    } catch (e) {
      console.warn('[generateAIEmailTemplate] Gemini error, using fallback:', e);
    }
  }

  // ── Curated studio templates ──────────────────────────────────────────────
  const TEMPLATES = {
    ORDER_READY: {
      subject:      `Your Graduation Portrait Proofs & Soft Copies are Ready! (#${bookingNumber})`,
      headline:     `Good news, ${customerName}! Your Portraits are Ready for Proofing`,
      body:         `Our creative editing team has finalized your photographs for ${serviceName}. High-resolution retouched soft copies and print-ready proofs are now uploaded to your private client portal. You may review your proofs, download your digital album, and confirm final yearbook inclusion.`,
      callToAction: 'View & Download Gallery',
      smsText:      `E-KODAK: Hi ${customerName}, your ${serviceName} proofs (#${bookingNumber}) are now ready for download. Check your portal today!`
    },
    PAYMENT_CONFIRMED: {
      subject:      `Official Receipt & Payment Confirmation (#${bookingNumber})`,
      headline:     `Payment Confirmed · Official Studio Receipt`,
      body:         `We have verified your payment of ${amount} for ${serviceName} (Booking #${bookingNumber}). Your slot is confirmed in our studio schedule. ${remainingBalance === '₱0.00' ? 'Your booking is fully paid with zero remaining balance.' : `Remaining balance due upon session completion: ${remainingBalance}.`}`,
      callToAction: 'View Digital Receipt',
      smsText:      `E-KODAK: Payment of ${amount} for #${bookingNumber} verified. Remaining balance: ${remainingBalance}. Thank you!`
    },
    SHOOT_REMINDER: {
      subject:      `Photoshoot Reminder: Call-Time Protocol (#${bookingNumber})`,
      headline:     `Get Ready for Your Photoshoot on ${eventDate}`,
      body:         `This is a reminder for your upcoming ${serviceName} scheduled on ${eventDate}. Please arrive at least 15 minutes before your time slot at ${studioAddress}. Bring your school toga/hood or prescribed attire and a valid ID for studio check-in.`,
      callToAction: 'View Studio QR Pass',
      smsText:      `E-KODAK REMINDER: Your shoot for #${bookingNumber} is on ${eventDate}. Arrive 15 mins early with attire & QR pass. See you!`
    },
    SCHEDULE_UPDATE: {
      subject:      `Schedule Update & Confirmation for Booking #${bookingNumber}`,
      headline:     `Schedule Update for Your Studio Session`,
      body:         `Please take note of an updated schedule for your ${serviceName}. Your session has been confirmed for ${eventDate}. If you need adjustments or have special attire queries, please contact our support desk immediately.`,
      callToAction: 'Confirm Studio Schedule',
      smsText:      `E-KODAK: Schedule update for #${bookingNumber}. Session set for ${eventDate}. Check portal for full details.`
    },
    STUDIO_ANNOUNCEMENT: {
      subject:      `Special Studio Advisory: 2026 Graduation Season Slots Open`,
      headline:     `E-Kodak Studio Advisory & Priority Booking`,
      body:         `We are pleased to announce extended studio operating hours and expedited retouching turnarounds for the 2026 graduation season. University packages include complimentary hair & makeup touch-up and high-res digital proofs.`,
      callToAction: 'Explore Studio Packages',
      smsText:      `E-KODAK ADVISORY: 2026 graduation slots open with expedited turnaround & digital proofs. Visit your portal to book!`
    }
  };

  const selected = TEMPLATES[type] || TEMPLATES.ORDER_READY;
  return {
    ...selected,
    html: buildStudioEmailHtml({
      subject:      selected.subject,
      headline:     selected.headline,
      body:         selected.body,
      callToAction: selected.callToAction,
      customerName,
      bookingNumber
    })
  };
}

// ─── Branded HTML Email Builder (100% Gmail & Client Compatible) ─────────────
export function buildStudioEmailHtml({
  subject,
  headline,
  body,
  callToAction = 'View & Download Gallery',
  customerName = 'Valued Client',
  bookingNumber = 'STUDIO',
  ctaUrl = 'https://e-kodak.com/dashboard'
}) {
  const safeSubject = subject || 'E-Kodak Studio Notification';
  const safeHeadline = headline || safeSubject;
  const safeBody = body || '';
  const safeBadge = bookingNumber ? `Booking #${bookingNumber}` : 'Official Studio Notice';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f2; margin: 0; padding: 28px 12px; color: #1a1a1a;">
  <!-- Main Email Card Container -->
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e8e5dc; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border-collapse: separate;">
    <!-- Dark Luxury Header -->
    <tr>
      <td align="center" style="background-color: #121212; padding: 32px 24px; text-align: center; border-bottom: 2px solid #c9a96e;">
        <h2 style="font-family: 'Georgia', serif, Times, 'Times New Roman'; font-size: 24px; color: #ffffff !important; letter-spacing: 3px; text-transform: uppercase; margin: 0; font-weight: 700;">E-KODAK</h2>
        <div style="font-size: 11px; color: #c9a96e !important; letter-spacing: 3px; text-transform: uppercase; margin-top: 6px; font-weight: 600;">STUDIO &amp; CREATIVE LAB · CEBU</div>
      </td>
    </tr>
    <!-- Content Body -->
    <tr>
      <td style="padding: 36px 32px 28px 32px; background-color: #ffffff;">
        <!-- Booking / Announcement Pill Badge -->
        <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
          <tr>
            <td style="background-color: #faf5eb; border: 1px solid #e8d7b3; color: #8a641b !important; font-size: 11px; font-weight: 700; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1.2px; font-family: monospace, sans-serif;">
              ${safeBadge}
            </td>
          </tr>
        </table>
        
        <!-- Serif Headline -->
        <h1 style="font-family: 'Georgia', serif, Times, 'Times New Roman'; font-size: 22px; color: #1a1a1a !important; margin: 0 0 16px 0; line-height: 1.35; font-weight: 700;">
          ${safeHeadline}
        </h1>

        <!-- Message Body -->
        <p style="font-size: 14px; line-height: 1.7; color: #4a4a4a !important; margin: 0 0 28px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${safeBody}
        </p>

        <!-- CTA Action Button -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 32px auto 16px auto;">
          <tr>
            <td align="center" style="background-color: #1a1a1a; border-radius: 8px; border: 1px solid #c9a96e; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
              <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 700; color: #ffffff !important; text-decoration: none; text-transform: uppercase; letter-spacing: 0.8px;">
                ${callToAction}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Luxury Footer -->
    <tr>
      <td style="background-color: #fcfbf9; padding: 24px 32px; border-top: 1px solid #ede9e1; text-align: center; font-size: 11px; color: #8a8780 !important; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 8px 0; color: #666666 !important;">
          <strong style="color: #333333 !important;">E-Kodak Photography Studio</strong> · 3rd Floor Colon Heritage Bldg, Cebu City, Philippines
        </p>
        <p style="margin: 0; color: #888888 !important;">
          This official notification was generated automatically by the E-Kodak Studio Operations Dispatch System.
          <span style="display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534 !important; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px; margin-left: 6px;">
            ✓ Studio Official
          </span>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
