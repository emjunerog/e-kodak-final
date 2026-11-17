/**
 * textbeeService.js
 * =================
 * Live integration with TextBee Android SMS Gateway (https://api.textbee.dev/api/v1)
 * plus automatic Supabase customer/booking phone detection and sms_logs persistence.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

const TEXTBEE_BASE_URL = 'https://api.textbee.dev/api/v1';
const LOCAL_SMS_LOGS_KEY = 'ekodak_local_sms_logs';
const TEXTBEE_OVERRIDE_KEY = 'ekodak_textbee_config_override';

// ── Configuration Helpers ────────────────────────────────────────────────────

export function getTextBeeConfig() {
  let override = {};
  try {
    const raw = localStorage.getItem(TEXTBEE_OVERRIDE_KEY);
    if (raw) override = JSON.parse(raw) || {};
  } catch {
    override = {};
  }

  const apiKey = (override.apiKey || import.meta.env.VITE_TEXTBEE_API_KEY || '').trim();
  const deviceId = (override.deviceId || import.meta.env.VITE_TEXTBEE_DEVICE_ID || '').trim();

  return {
    apiKey,
    deviceId,
    isConfigured: Boolean(apiKey),
    hasOverride: Boolean(override.apiKey || override.deviceId),
  };
}

export function saveTextBeeConfigOverride({ apiKey = '', deviceId = '' }) {
  try {
    const cleanKey = apiKey.trim();
    const cleanDevice = deviceId.trim();
    if (!cleanKey && !cleanDevice) {
      localStorage.removeItem(TEXTBEE_OVERRIDE_KEY);
    } else {
      localStorage.setItem(
        TEXTBEE_OVERRIDE_KEY,
        JSON.stringify({ apiKey: cleanKey, deviceId: cleanDevice })
      );
    }
    return getTextBeeConfig();
  } catch (err) {
    console.warn('[textbeeService] Failed to save config override:', err);
    return getTextBeeConfig();
  }
}

export function clearTextBeeConfigOverride() {
  try {
    localStorage.removeItem(TEXTBEE_OVERRIDE_KEY);
  } catch {}
  return getTextBeeConfig();
}

// ── Philippine Mobile Number Normalization & Carrier Detection ───────────────

export function normalizePhPhone(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('09') && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }
  if (digits.startsWith('639') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith('9') && digits.length === 10) {
    return `+63${digits}`;
  }
  if (raw.startsWith('+') && digits.length >= 10) {
    return `+${digits}`;
  }
  return raw;
}

export function isValidPhMobile(phone) {
  const normalized = normalizePhPhone(phone);
  return /^\+639\d{9}$/.test(normalized) || /^\+\d{10,15}$/.test(normalized);
}

export function detectPhilippineCarrier(phone) {
  if (!phone) return 'Unknown';
  const clean = String(phone).replace(/\D/g, '');
  let prefix = '';
  if (clean.startsWith('639') && clean.length >= 5) {
    prefix = `09${clean.slice(3, 5)}`;
  } else if (clean.startsWith('09') && clean.length >= 4) {
    prefix = clean.slice(0, 4);
  } else if (clean.startsWith('9') && clean.length >= 3) {
    prefix = `0${clean.slice(0, 3)}`;
  }

  const globePrefixes = [
    '0905', '0906', '0915', '0916', '0917', '0926', '0927', '0935', '0936',
    '0945', '0953', '0954', '0955', '0956', '0965', '0966', '0967', '0975',
    '0976', '0977', '0978', '0979', '0995', '0996', '0997',
  ];
  const smartPrefixes = [
    '0907', '0908', '0909', '0910', '0911', '0912', '0913', '0914', '0918',
    '0919', '0920', '0921', '0922', '0923', '0924', '0925', '0928', '0929',
    '0930', '0931', '0932', '0933', '0934', '0938', '0939', '0940', '0941',
    '0942', '0943', '0944', '0946', '0947', '0948', '0949', '0950', '0951',
    '0961', '0962', '0963', '0964', '0968', '0969', '0970', '0971', '0981',
    '0989', '0998', '0999',
  ];
  const ditoPrefixes = ['0991', '0992', '0993', '0994', '0895', '0896', '0897', '0898'];

  if (globePrefixes.includes(prefix)) return 'Globe / TM';
  if (smartPrefixes.includes(prefix)) return 'Smart / TNT / Sun';
  if (ditoPrefixes.includes(prefix)) return 'DITO Telco';
  return 'PH Mobile';
}

// ── TextBee Device Telemetry ─────────────────────────────────────────────────

export async function getTextBeeDeviceStatus(overrideDeviceId = null) {
  const { apiKey, deviceId } = getTextBeeConfig();
  const targetId = (overrideDeviceId || deviceId || '').trim();

  if (!apiKey) {
    return {
      success: false,
      error: 'TextBee API key is not configured.',
      device: null,
      devices: [],
    };
  }

  try {
    const res = await fetch(`${TEXTBEE_BASE_URL}/gateway/devices`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: json?.message || json?.error || `HTTP ${res.status}`,
        device: null,
        devices: [],
      };
    }

    const devices = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    const matched =
      (targetId && devices.find((d) => String(d._id || d.id) === String(targetId))) ||
      devices.find((d) => d.isDefault) ||
      devices[0] ||
      null;

    return {
      success: true,
      device: matched,
      devices,
      error: null,
    };
  } catch (err) {
    console.warn('[textbeeService] getTextBeeDeviceStatus error:', err);
    return {
      success: false,
      error: err.message || 'Unable to reach TextBee API.',
      device: null,
      devices: [],
    };
  }
}

// ── TextBee Cloud Message History (Sent & Received) ──────────────────────────

export async function getTextBeeMessages({
  direction = 'all', // 'all' | 'sent' | 'received'
  limit = 50,
  page = 1,
  deviceId = null,
} = {}) {
  const { apiKey, deviceId: configuredDeviceId } = getTextBeeConfig();
  if (!apiKey) {
    return { success: false, data: [], meta: null, error: 'TextBee API key is not configured.' };
  }

  try {
    const params = new URLSearchParams();
    if (direction && direction !== 'all') {
      params.set('direction', direction);
    }
    params.set('limit', String(Math.min(100, Math.max(1, limit))));
    params.set('page', String(Math.max(1, page)));
    const effectiveDevice = (deviceId || configuredDeviceId || '').trim();
    if (effectiveDevice) {
      params.set('deviceIds', effectiveDevice);
    }

    const res = await fetch(`${TEXTBEE_BASE_URL}/gateway/messages?${params.toString()}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        data: [],
        meta: null,
        error: json?.message || json?.error || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      data: Array.isArray(json?.data) ? json.data : [],
      meta: json?.meta || null,
      error: null,
    };
  } catch (err) {
    console.warn('[textbeeService] getTextBeeMessages error:', err);
    return {
      success: false,
      data: [],
      meta: null,
      error: err.message || 'Failed to fetch TextBee messages.',
    };
  }
}

// ── Local & Supabase SMS Logging Helper ──────────────────────────────────────

function cacheLocalSmsLog(entry) {
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_SMS_LOGS_KEY) || '[]');
    existing.unshift(entry);
    localStorage.setItem(LOCAL_SMS_LOGS_KEY, JSON.stringify(existing.slice(0, 250)));
  } catch {}
}

async function persistSmsLogs({
  recipients = [],
  message,
  notificationType = 'MANUAL_DISPATCH',
  bookingId = null,
  customerId = null,
  customerName = '',
  bookingNumber = '',
  batchId = null,
  status = 'SENT',
  errorMessage = null,
  recipientContextMap = null,
}) {
  const now = new Date().toISOString();
  const providerId = batchId ? `TEXTBEE_${batchId}` : `TEXTBEE_${Date.now()}`;
  const persistedRows = [];

  for (const phone of recipients) {
    const ctx = recipientContextMap?.get(phone) || {};
    const rowPayload = {
      phone_number: phone,
      message,
      notification_type: notificationType,
      booking_id: ctx.bookingId ?? bookingId ?? null,
      customer_id: ctx.customerId ?? customerId ?? null,
      provider_message_id: providerId,
      status,
      error_message: errorMessage,
      sent_at: now,
      created_at: now,
    };

    let dbRow = null;
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('sms_logs')
          .insert(rowPayload)
          .select()
          .single();
        if (!error && data) dbRow = data;
      } catch (err) {
        console.warn('[textbeeService] sms_logs insert warning:', err);
      }
    }

    const finalEntry = {
      ...(dbRow || rowPayload),
      id: dbRow?.id || `local_sms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      customer: (ctx.customerName || customerName)
        ? { first_name: ctx.customerName || customerName, last_name: '' }
        : null,
      booking: (ctx.bookingNumber || bookingNumber)
        ? { booking_number: ctx.bookingNumber || bookingNumber }
        : null,
      gateway: 'textbee',
    };

    cacheLocalSmsLog(finalEntry);
    persistedRows.push(finalEntry);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ekodak:sms_logs_updated'));
  }

  return persistedRows;
}

// ── Send SMS via TextBee Gateway ─────────────────────────────────────────────

export async function sendTextBeeSms({
  recipients = [],
  phoneNumber = '',
  message = '',
  deviceId = null,
  bookingId = null,
  customerId = null,
  customerName = '',
  bookingNumber = '',
  notificationType = 'MANUAL_DISPATCH',
  recipientContextMap = null,
}) {
  const { apiKey, deviceId: configuredDeviceId } = getTextBeeConfig();
  const rawList = Array.isArray(recipients) && recipients.length > 0
    ? recipients
    : phoneNumber
      ? [phoneNumber]
      : [];

  const normalizedRecipients = Array.from(
    new Set(rawList.map(normalizePhPhone).filter(Boolean))
  );

  const cleanMessage = String(message || '').trim();
  if (normalizedRecipients.length === 0) {
    return { success: false, error: 'Please provide at least one valid mobile number.' };
  }
  if (!cleanMessage) {
    return { success: false, error: 'SMS message cannot be empty.' };
  }
  if (!apiKey) {
    return { success: false, error: 'TextBee API key is missing. Configure it in Gateway Settings.' };
  }

  const effectiveDeviceId = (deviceId || configuredDeviceId || '').trim();
  const payload = {
    recipients: normalizedRecipients,
    message: cleanMessage,
  };
  if (effectiveDeviceId) {
    payload.deviceId = effectiveDeviceId;
  }

  try {
    const res = await fetch(`${TEXTBEE_BASE_URL}/gateway/send-sms`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    const batchId = json?.data?.smsBatchId || json?.smsBatchId || null;

    if (!res.ok) {
      const errMsg = json?.message || json?.error || `TextBee API error (${res.status})`;
      await persistSmsLogs({
        recipients: normalizedRecipients,
        message: cleanMessage,
        notificationType,
        bookingId,
        customerId,
        customerName,
        bookingNumber,
        batchId: null,
        status: 'FAILED',
        errorMessage: errMsg,
        recipientContextMap,
      });
      return { success: false, error: errMsg, data: json };
    }

    const logs = await persistSmsLogs({
      recipients: normalizedRecipients,
      message: cleanMessage,
      notificationType,
      bookingId,
      customerId,
      customerName,
      bookingNumber,
      batchId,
      status: 'SENT',
      errorMessage: null,
      recipientContextMap,
    });

    return {
      success: true,
      smsBatchId: batchId,
      recipientCount: json?.data?.recipientCount || normalizedRecipients.length,
      recipients: normalizedRecipients,
      logs,
      data: json,
    };
  } catch (err) {
    const errMsg = err.message || 'Network error while reaching TextBee gateway.';
    await persistSmsLogs({
      recipients: normalizedRecipients,
      message: cleanMessage,
      notificationType,
      bookingId,
      customerId,
      customerName,
      bookingNumber,
      batchId: null,
      status: 'FAILED',
      errorMessage: errMsg,
      recipientContextMap,
    });
    return { success: false, error: errMsg };
  }
}

// ── Personalized Template Interpolation & Multi-Customer Send ────────────────

export function interpolateSmsTemplate(template, customerEntry = {}) {
  const firstName = customerEntry.firstName || customerEntry.name?.split(' ')[0] || 'Valued Client';
  const fullName = customerEntry.name || 'Valued Client';
  const booking = customerEntry.latestBooking || {};
  const bNum = booking.booking_number || 'STUDIO';
  const service = booking.serviceName || 'Studio Session';
  const dateStr = booking.event_date
    ? new Date(booking.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'your scheduled date';
  const timeStr = booking.preferred_time ? String(booking.preferred_time).slice(0, 5) : 'your scheduled slot';
  const balance = Number(booking.remaining_balance || 0);
  const balanceStr = `₱${balance.toLocaleString()}`;

  return String(template || '')
    .replace(/\{firstName\}/gi, firstName)
    .replace(/\{name\}/gi, fullName)
    .replace(/\{bookingNumber\}/gi, bNum)
    .replace(/\{service\}/gi, service)
    .replace(/\{date\}/gi, dateStr)
    .replace(/\{time\}/gi, timeStr)
    .replace(/\{balance\}/gi, balanceStr);
}

export async function sendPersonalizedBatchToCustomers({
  customers = [],
  template = '',
  notificationType = 'MANUAL_DISPATCH',
}) {
  const validTargets = customers.filter((c) => c.normalizedPhone && c.isValidPhone);
  if (validTargets.length === 0) {
    return { success: false, sentCount: 0, failedCount: 0, error: 'No valid customer mobile numbers selected.' };
  }

  const hasVariables = /\{(firstName|name|bookingNumber|service|date|time|balance)\}/i.test(template);

  // If no per-customer template tokens, send as one efficient TextBee batch
  if (!hasVariables) {
    const recipientContextMap = new Map();
    const phones = [];
    validTargets.forEach((c) => {
      phones.push(c.normalizedPhone);
      recipientContextMap.set(c.normalizedPhone, {
        customerId: c.customerId || null,
        customerName: c.name,
        bookingId: c.latestBooking?.id || null,
        bookingNumber: c.latestBooking?.booking_number || '',
      });
    });
    const res = await sendTextBeeSms({
      recipients: phones,
      message: template,
      notificationType,
      recipientContextMap,
    });
    return {
      success: res.success,
      sentCount: res.success ? phones.length : 0,
      failedCount: res.success ? 0 : phones.length,
      smsBatchId: res.smsBatchId,
      error: res.error,
    };
  }

  // Otherwise personalize per customer
  let sentCount = 0;
  let failedCount = 0;
  let lastBatchId = null;
  let lastError = null;

  for (const c of validTargets) {
    const personalized = interpolateSmsTemplate(template, c);
    const res = await sendTextBeeSms({
      recipients: [c.normalizedPhone],
      message: personalized,
      bookingId: c.latestBooking?.id || null,
      customerId: c.customerId || null,
      customerName: c.name,
      bookingNumber: c.latestBooking?.booking_number || '',
      notificationType,
    });
    if (res.success) {
      sentCount += 1;
      lastBatchId = res.smsBatchId || lastBatchId;
    } else {
      failedCount += 1;
      lastError = res.error;
    }
  }

  return {
    success: sentCount > 0,
    sentCount,
    failedCount,
    smsBatchId: lastBatchId,
    error: sentCount === 0 ? lastError : null,
  };
}

// ── Automatic Customer Phone Number Detection from Supabase ──────────────────

const INACTIVE_ORDER_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED'];

function extractParticipantPhoneFromNotes(notes) {
  if (!notes) return '';
  const match = String(notes).match(/Participant Phone:\s*([^\n\r]+)/i);
  return match ? match[1].trim() : '';
}

function formatOrderStatusLabel(status) {
  return String(status || 'PENDING')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Live pull of current (non-completed/cancelled/rejected) orders that have a valid phone number.
 * Returns per-order selectable recipients ordered newest-first.
 */
export async function getCustomerSmsDirectory() {
  if (!isSupabaseConfigured) {
    return {
      contacts: [],
      missingPhoneCustomers: [],
      phoneToCustomerMap: new Map(),
      stats: { totalCustomers: 0, reachableCount: 0, missingPhoneCount: 0, activeBookingPhones: 0, unpaidBalanceCount: 0 },
      error: null,
    };
  }

  try {
    const { data: bookingRows, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        customer_id,
        status,
        payment_status,
        tier_name,
        event_date,
        preferred_time,
        total_amount,
        remaining_balance,
        participant_name,
        participant_phone,
        participant_details,
        notes,
        is_deleted,
        created_at,
        customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, email, phone),
        service:services(id, name)
      `)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('created_at', { ascending: false })
      .limit(300);

    if (bookingsError) throw bookingsError;

    const allDbOrders = (bookingRows || []).filter((b) => !b.is_deleted);

    const contacts = [];
    const phoneToCustomerMap = new Map();

    allDbOrders.forEach((b) => {
      const accountCustomer = b.customer || null;
      const accountOwnerName = accountCustomer
        ? `${accountCustomer.first_name || ''} ${accountCustomer.last_name || ''}`.trim()
        : '';

      const participantPhone = String(
        b.participant_phone ||
        b.participant_details?.phone ||
        extractParticipantPhoneFromNotes(b.notes) ||
        ''
      ).trim();

      const accountPhone = String(accountCustomer?.phone || '').trim();
      const rawPhone = participantPhone || accountPhone;
      if (!rawPhone) return; // Only include orders that have a phone number

      const normalizedPhone = normalizePhPhone(rawPhone);
      if (!normalizedPhone || !isValidPhMobile(normalizedPhone)) return;

      const usesParticipantPhone = Boolean(participantPhone);
      const displayName = usesParticipantPhone
        ? (
            b.participant_name ||
            b.participant_details?.full_name ||
            accountOwnerName ||
            b.participant_details?.email ||
            'Studio Client'
          ).trim()
        : (accountOwnerName || b.participant_name || accountCustomer?.email || 'Studio Client').trim();

      const serviceName = b.service?.name || b.tier_name || 'Studio Session';
      const remainingBalance = Number(b.remaining_balance || 0);
      const upperStatus = String(b.status || '').toUpperCase();
      const isCurrentOrder = !INACTIVE_ORDER_STATUSES.includes(upperStatus);

      const entry = {
        id: `ord_${b.id}`,
        bookingId: b.id,
        customerId: b.customer_id || null,
        firstName: displayName.split(' ')[0] || displayName,
        name: displayName,
        email: (usesParticipantPhone ? b.participant_details?.email : accountCustomer?.email) || b.participant_details?.email || '',
        rawPhone,
        normalizedPhone,
        isValidPhone: true,
        carrier: detectPhilippineCarrier(normalizedPhone),
        source: formatOrderStatusLabel(b.status),
        bookingStatus: b.status,
        phoneOrigin: usesParticipantPhone ? 'Participant' : 'Account',
        isActive: isCurrentOrder,
        bookingsCount: 1,
        latestBooking: {
          ...b,
          serviceName,
        },
        hasUnpaidBalance: isCurrentOrder && remainingBalance > 0,
        hasActiveBooking: isCurrentOrder,
      };

      // Selection list is strictly exclusive to CURRENT active orders
      if (isCurrentOrder) {
        contacts.push(entry);
      }

      // Database phone lookup covers verified bookings in DB (active first since sorted desc)
      if (!phoneToCustomerMap.has(normalizedPhone)) {
        phoneToCustomerMap.set(normalizedPhone, entry);
      }

      // Also map account owner phone on the booking for inbox order matching
      if (accountPhone) {
        const normAccount = normalizePhPhone(accountPhone);
        if (normAccount && !phoneToCustomerMap.has(normAccount)) {
          phoneToCustomerMap.set(normAccount, {
            ...entry,
            name: accountOwnerName || displayName,
            firstName: (accountOwnerName || displayName).split(' ')[0],
            normalizedPhone: normAccount,
          });
        }
      }
    });

    const unpaidBalanceCount = contacts.filter((c) => c.hasUnpaidBalance).length;

    return {
      contacts,
      missingPhoneCustomers: [],
      phoneToCustomerMap,
      stats: {
        totalCustomers: contacts.length,
        reachableCount: contacts.length,
        missingPhoneCount: 0,
        activeBookingPhones: contacts.length,
        unpaidBalanceCount,
      },
      error: null,
    };
  } catch (err) {
    console.error('[textbeeService] getCustomerSmsDirectory error:', err);
    return {
      contacts: [],
      missingPhoneCustomers: [],
      phoneToCustomerMap: new Map(),
      stats: { totalCustomers: 0, reachableCount: 0, missingPhoneCount: 0, activeBookingPhones: 0, unpaidBalanceCount: 0 },
      error: err,
    };
  }
}

/**
 * Resolves a raw TextBee message ONLY if its sender/recipient exists in `phoneToCustomerMap`
 * (verified Supabase booking records). Returns `{ matchedCustomer: null }` for unverified/random SMS.
 */
export function resolveGatewayMessageContact(msg, phoneToCustomerMap) {
  const isReceived = msg?.direction === 'received' || msg?.type === 'RECEIVED';
  const rawCandidates = isReceived
    ? [msg?.sender, msg?.from]
    : [
        msg?.recipient,
        ...(Array.isArray(msg?.recipients) ? msg.recipients : []),
        msg?.to,
      ];

  const cleanCandidates = rawCandidates.map((v) => String(v || '').trim()).filter(Boolean);
  let matchedCustomer = null;
  let matchedRawPhone = cleanCandidates[0] || '';
  let matchedNormalized = '';

  if (phoneToCustomerMap && typeof phoneToCustomerMap.get === 'function') {
    for (const candidate of cleanCandidates) {
      const normalized = normalizePhPhone(candidate);
      const found =
        (normalized && phoneToCustomerMap.get(normalized)) ||
        phoneToCustomerMap.get(candidate) ||
        null;
      if (found) {
        matchedCustomer = found;
        matchedRawPhone = candidate;
        matchedNormalized = normalized || candidate;
        break;
      }
    }
  }

  return {
    isReceived,
    rawPhone: matchedRawPhone,
    normalizedPhone: matchedNormalized || normalizePhPhone(matchedRawPhone),
    matchedCustomer,
  };
}

/**
 * Subscribe to live PostgreSQL changes on current orders (`bookings`) and `profiles`
 * so the order phone selector pulls updates automatically in real time.
 */
export function subscribeLiveSmsDirectory(onChange) {
  if (!isSupabaseConfigured || typeof onChange !== 'function') return () => {};

  const channel = supabase
    .channel(`realtime:sms-orders:${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings' },
      () => onChange()
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles' },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
