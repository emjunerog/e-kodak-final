/**
 * orderLifecycleNotificationService.js
 * ====================================
 * Unified, non-blocking dispatcher for:
 *  1) Branded E-Kodak Studios HTML Email notifications on every order progress update
 *  2) Automatic TextBee SMS notifications with short studio-branded templates on
 *     major booking upgrades (downpayment received, booking confirmed, digital copies
 *     sent from Admin, order finalized/ready, order received & complete).
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getStatusLabel } from '../lib/bookingUtils';
import { sendTextBeeSms, normalizePhPhone, isValidPhMobile } from './textbeeService';

const STUDIO_NAME = 'E-Kodak Studios';
const recentDispatchTimestamps = new Map();
const DEDUPE_WINDOW_MS = 8000;

function shouldSkipDuplicateDispatch(bookingId, key) {
  if (!bookingId || !key) return false;
  const cacheKey = `${bookingId}:${key}`;
  const now = Date.now();
  const prev = recentDispatchTimestamps.get(cacheKey);
  if (prev && now - prev < DEDUPE_WINDOW_MS) {
    return true;
  }
  recentDispatchTimestamps.set(cacheKey, now);
  if (recentDispatchTimestamps.size > 100) {
    for (const [k, ts] of recentDispatchTimestamps.entries()) {
      if (now - ts > DEDUPE_WINDOW_MS * 3) recentDispatchTimestamps.delete(k);
    }
  }
  return false;
}

function escapeHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: Number(amount || 0) % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateReadable(dateStr) {
  if (!dateStr) return 'To Be Scheduled';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return String(dateStr);
  return parsed.toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function resolvePortalBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://e-kodak.ph';
}

function extractPhoneFromNotes(notes) {
  const text = String(notes || '');
  const match = text.match(/•\s*(?:Phone|Mobile|Contact(?:\s*Phone)?)\s*:\s*([^\n\r]+)/i);
  return match?.[1]?.trim() || '';
}

function extractEmailFromNotes(notes) {
  const text = String(notes || '');
  const match = text.match(/•\s*(?:Account\s*Owner\s*)?Email\s*:\s*([^\s\n\r]+@[^\s\n\r]+)/i);
  return match?.[1]?.trim() || '';
}

/**
 * Resolves the target customer email, account phone number, and booking metadata
 * directly from a booking ID.
 */
async function fetchBookingNotificationTarget(bookingId) {
  if (!isSupabaseConfigured || !bookingId) return null;
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_number,
      status,
      event_date,
      preferred_time,
      location,
      tier_name,
      total_amount,
      down_payment_amount,
      remaining_balance,
      participant_name,
      participant_phone,
      notes,
      customer_id,
      service:services(id, name),
      customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, email, phone)
    `)
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !booking) return null;

  const customer = booking.customer || {};
  const fullName =
    `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
    booking.participant_name ||
    'Valued Client';
  const firstName =
    String(customer.first_name || '').trim() ||
    fullName.split(/\s+/)[0] ||
    'Valued Client';

  const rawEmail = String(customer.email || extractEmailFromNotes(booking.notes) || '').trim();
  const rawPhoneCandidates = [
    customer.phone,
    booking.participant_phone,
    extractPhoneFromNotes(booking.notes),
  ];
  let resolvedPhone = '';
  for (const candidate of rawPhoneCandidates) {
    const clean = String(candidate || '').trim();
    if (!clean) continue;
    const normalized = normalizePhPhone(clean);
    if (isValidPhMobile(normalized)) {
      resolvedPhone = normalized;
      break;
    }
  }

  const packageName =
    [booking.service?.name, booking.tier_name].filter(Boolean).join(' · ') ||
    'Studio Photography Session';

  return {
    booking,
    bookingId: booking.id,
    bookingNumber: booking.booking_number || String(booking.id).slice(0, 8).toUpperCase(),
    customerId: booking.customer_id || customer.id || null,
    fullName,
    firstName,
    email: rawEmail,
    phoneNumber: resolvedPhone,
    packageName,
    eventDateFormatted: formatDateReadable(booking.event_date),
    preferredTime: booking.preferred_time ? String(booking.preferred_time).slice(0, 5) : '',
    location: booking.location || 'E-Kodak Studios, City of Naga, Cebu',
  };
}

const STAGE_PROGRESS_CONTENT = {
  CONFIRMED: {
    badge: 'Approved & Reserved',
    stepPercent: 25,
    headline: 'Your Studio Booking Is Confirmed',
    message:
      'Great news! Your studio photoshoot reservation has been approved and locked into our production schedule. Your QR pass and session details are ready in your client dashboard.',
    ctaLabel: 'View Booking & QR Pass',
    ctaPath: '/dashboard/bookings',
  },
  PHOTOGRAPHER_ASSIGNED: {
    badge: 'Photographer Assigned',
    stepPercent: 35,
    headline: 'Your Studio Photographer Has Been Assigned',
    message:
      'Your order has been handed over to your assigned studio photographer in preparation for your pictorial session.',
    ctaLabel: 'Track Order Progress',
    ctaPath: '/dashboard/bookings',
  },
  CAPTURE: {
    badge: 'Ongoing Pictorial',
    stepPercent: 50,
    headline: 'Your Pictorial Session Is Underway',
    message:
      'Your photography session is now active in the studio! Once all sets are captured, your photos will proceed directly into post-production editing.',
    ctaLabel: 'Track Live Progress',
    ctaPath: '/dashboard/bookings',
  },
  IN_PROGRESS: {
    badge: 'Ongoing Pictorial',
    stepPercent: 50,
    headline: 'Your Pictorial Session Is Underway',
    message:
      'Your photography session is now active in the studio! Once all sets are captured, your photos will proceed directly into post-production editing.',
    ctaLabel: 'Track Live Progress',
    ctaPath: '/dashboard/bookings',
  },
  EDITING: {
    badge: 'Post-Production Editing',
    stepPercent: 65,
    headline: 'Pictorial Complete · Editing In Progress',
    message:
      'Your pictorial session is complete! Our photography team is currently culling and editing your photographs before studio quality review.',
    ctaLabel: 'Track Order Progress',
    ctaPath: '/dashboard/bookings',
  },
  RETOUCHING: {
    badge: 'Final Review & Soft Copy Prep',
    stepPercent: 78,
    headline: 'Edited Photos Received · Preparing Soft Copies',
    message:
      'Your edited photos have passed studio review and are now undergoing final retouching and digital soft-copy preparation.',
    ctaLabel: 'Check Order Status',
    ctaPath: '/dashboard/bookings',
  },
  FINALIZED: {
    badge: 'Booking Finalized',
    stepPercent: 88,
    headline: 'Your Booking Order Has Been Finalized',
    message:
      'Everything for your order is now finalized! Please watch for your digital soft copies link and final release update in your portal.',
    ctaLabel: 'Open Soft Copies Vault',
    ctaPath: '/dashboard/soft-copies',
  },
  PRINTING: {
    badge: 'Preparing Release',
    stepPercent: 88,
    headline: 'Your Booking Order Is Being Finalized',
    message:
      'Your deliverables are being assembled for digital soft copy release. Open your portal anytime for live updates.',
    ctaLabel: 'Open Client Portal',
    ctaPath: '/dashboard/soft-copies',
  },
  READY: {
    badge: 'Walk-In Ready to Receive',
    stepPercent: 95,
    headline: 'Your Order Is Ready to Receive (Walk-In)',
    message:
      'Your booking order is ready to receive! Claim via walk-in at E-Kodak Studio Counter (311 Rizal Street, City of Naga, Cebu) or open your portal to access your released digital soft copies.',
    ctaLabel: 'View Soft Copies',
    ctaPath: '/dashboard/soft-copies',
  },
  UNDER_DELIVERY: {
    badge: 'Walk-In Ready to Receive',
    stepPercent: 95,
    headline: 'Your Order Is Ready to Receive (Walk-In)',
    message:
      'Your booking order is ready to receive at E-Kodak Studio Counter (Walk-In). Visit our studio reception or open your client portal for details.',
    ctaLabel: 'Open Soft Copies Vault',
    ctaPath: '/dashboard/soft-copies',
  },
  COMPLETED: {
    badge: 'Order Ready to Receive',
    stepPercent: 100,
    headline: 'Order Completed · Ready to Receive',
    message:
      'Your booking order is completed and ready to receive! Visit E-Kodak Studios (Walk-In) or open your portal to view and download your soft copies. Thank you for choosing E-Kodak Studios!',
    ctaLabel: 'Open Soft Copies Vault',
    ctaPath: '/dashboard/soft-copies',
  },
  CANCELLED: {
    badge: 'Booking Cancelled',
    stepPercent: 0,
    headline: 'Booking Status Updated: Cancelled',
    message:
      'This booking has been updated to Cancelled. Please contact E-Kodak Studios if you need assistance or wish to rebook a session.',
    ctaLabel: 'View Booking History',
    ctaPath: '/dashboard/bookings',
  },
  REJECTED: {
    badge: 'Booking Declined',
    stepPercent: 0,
    headline: 'Booking Status Update',
    message:
      'There has been an administrative update regarding this booking reservation. Open your portal or contact E-Kodak Studios for assistance.',
    ctaLabel: 'View Booking History',
    ctaPath: '/dashboard/bookings',
  },
};

const MILESTONE_EMAIL_CONFIG = {
  DOWNPAYMENT_RECEIVED: {
    badge: 'Downpayment Verified',
    stepPercent: 30,
    headline: 'Downpayment Received & Confirmed',
    ctaLabel: 'View Payment & Booking',
    ctaPath: '/dashboard/bookings',
  },
  PAYMENT_RECEIVED: {
    badge: 'Payment Verified',
    stepPercent: 90,
    headline: 'Payment Recorded & Verified',
    ctaLabel: 'View Payment Summary',
    ctaPath: '/dashboard/bookings',
  },
  DIGITAL_COPIES_SENT: {
    badge: 'Digital Copies Sent',
    stepPercent: 92,
    headline: 'Your Digital Soft Copies Are Ready',
    ctaLabel: 'Download Digital Copies',
    ctaPath: '/dashboard/soft-copies',
  },
};

/**
 * Renders an editorial E-Kodak Studios progress/milestone HTML email.
 */
export function renderOrderProgressEmailHtml({
  recipientName = 'Valued Client',
  bookingNumber = 'STUDIO',
  packageName = 'Studio Photography Session',
  statusLabel = 'In Progress',
  badgeLabel = 'Order Update',
  headline = 'Booking Order Update',
  messageBody = '',
  eventDate = '',
  preferredTime = '',
  location = '',
  stepPercent = 50,
  extraRows = [],
  ctaLabel = 'View Order Progress',
  ctaUrl = 'https://e-kodak.ph/dashboard/bookings',
}) {
  const pct = Math.max(0, Math.min(100, Number(stepPercent || 0)));
  const safeExtraRows = (Array.isArray(extraRows) ? extraRows : [])
    .filter((r) => r && r.label && r.value)
    .map(
      (r) => `
      <tr>
        <td style="font-size: 11px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.7px; padding: 6px 0;">${escapeHtml(r.label)}</td>
        <td align="right" style="font-size: 13px; font-weight: 700; color: #1a1714; padding: 6px 0; font-variant-numeric: lining-nums tabular-nums;">${escapeHtml(r.value)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(headline)} — ${STUDIO_NAME}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f6f4ee; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1714;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f4ee; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e7ded0; box-shadow: 0 12px 36px rgba(0,0,0,0.06);">
          <tr>
            <td style="background: #0d2a1c; padding: 30px 28px; text-align: center;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 800; letter-spacing: 3.5px; color: #ffffff; text-transform: uppercase;">
                E-KODAK STUDIOS
              </div>
              <div style="font-size: 10.5px; letter-spacing: 2px; color: #c9a96e; text-transform: uppercase; margin-top: 6px; font-weight: 700;">
                Editorial &amp; Commemorative Photography • Cebu
              </div>
            </td>
          </tr>
          <tr>
            <td style="height: 3px; background-color: #c9a96e; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 34px 30px 28px 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td style="background-color: #fbf7ef; border: 1px solid #e6d6b5; color: #8a641b; font-size: 11px; font-weight: 700; padding: 5px 14px; border-radius: 999px; text-transform: uppercase; letter-spacing: 1px;">
                    #${escapeHtml(bookingNumber)} &middot; ${escapeHtml(badgeLabel)}
                  </td>
                </tr>
              </table>

              <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; color: #0d2a1c; margin: 0 0 12px 0; line-height: 1.3;">
                ${escapeHtml(headline)}
              </h1>

              <p style="font-size: 14px; line-height: 1.65; color: #4a453e; margin: 0 0 22px 0;">
                Hi <strong>${escapeHtml(recipientName)}</strong>,<br><br>
                ${escapeHtml(messageBody)}
              </p>

              ${
                pct > 0
                  ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 22px;">
                      <tr>
                        <td style="font-size: 11px; font-weight: 700; color: #6e675e; text-transform: uppercase; letter-spacing: 0.8px; padding-bottom: 6px;">
                          Order Progress &mdash; ${escapeHtml(statusLabel)} (${pct}%)
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color: #ece6da; border-radius: 999px; height: 8px; overflow: hidden;">
                          <div style="width: ${pct}%; height: 8px; background-color: #c9a96e; border-radius: 999px;"></div>
                        </td>
                      </tr>
                    </table>`
                  : ''
              }

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf7f2; border: 1px solid #ece4d7; border-radius: 14px; padding: 16px 20px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 11px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.7px; padding-bottom: 6px;">Booking Ref</td>
                        <td align="right" style="font-size: 13px; font-weight: 700; color: #0d2a1c; padding-bottom: 6px; font-family: monospace;">#${escapeHtml(bookingNumber)}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 11px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.7px; padding-bottom: 6px;">Package</td>
                        <td align="right" style="font-size: 13px; font-weight: 700; color: #1a1714; padding-bottom: 6px;">${escapeHtml(packageName)}</td>
                      </tr>
                      ${
                        eventDate
                          ? `<tr>
                              <td style="font-size: 11px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.7px; padding-bottom: 6px;">Session Schedule</td>
                              <td align="right" style="font-size: 13px; font-weight: 600; color: #1a1714; padding-bottom: 6px;">${escapeHtml(eventDate)}${preferredTime ? ` &bull; ${escapeHtml(preferredTime)}` : ''}</td>
                            </tr>`
                          : ''
                      }
                      ${
                        location
                          ? `<tr>
                              <td style="font-size: 11px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.7px; padding-bottom: 6px;">Studio Location</td>
                              <td align="right" style="font-size: 12.5px; font-weight: 600; color: #1a1714; padding-bottom: 6px;">${escapeHtml(location)}</td>
                            </tr>`
                          : ''
                      }
                      ${safeExtraRows}
                      <tr>
                        <td style="font-size: 11px; font-weight: 700; color: #78716c; text-transform: uppercase; letter-spacing: 0.7px; border-top: 1px dashed #ded4c5; padding-top: 10px;">Current Stage</td>
                        <td align="right" style="font-size: 13.5px; font-weight: 800; color: #0d2a1c; border-top: 1px dashed #ded4c5; padding-top: 10px;">${escapeHtml(statusLabel)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin: 10px auto 4px auto;">
                <tr>
                  <td align="center" style="background-color: #0d2a1c; border-radius: 10px; border: 1px solid #c9a96e;">
                    <a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 12.5px; font-weight: 700; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 0.9px;">
                      ${escapeHtml(ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #faf8f4; padding: 18px 28px; text-align: center; border-top: 1px solid #eee7da;">
              <p style="margin: 0 0 4px 0; font-size: 11.5px; font-weight: 700; color: #3f3a34;">
                ${STUDIO_NAME} &middot; 311 Rizal Street, City of Naga, Cebu
              </p>
              <p style="margin: 0; font-size: 11px; color: #8c847a;">
                Automated order notification. Log in anytime at ${escapeHtml(resolvePortalBaseUrl())} for live updates.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

async function dispatchCustomerEmail({
  target,
  subject,
  htmlBody,
  plainText,
  notificationType,
}) {
  if (!target?.email || !isSupabaseConfigured) return { success: false };

  try {
    await supabase.from('email_logs').insert({
      recipient_email: target.email,
      recipient_name: target.fullName,
      subject,
      html_body: htmlBody,
      notification_type: notificationType,
      booking_id: target.bookingId,
      status: 'QUEUED',
      sent_at: new Date().toISOString(),
    });
  } catch (logErr) {
    console.warn('[orderLifecycleNotificationService] email_logs insert warning:', logErr?.message);
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: target.email,
        subject,
        html: htmlBody,
        text: plainText,
        recipientName: target.fullName,
        bookingId: target.bookingId,
        notificationType,
      },
    });
    if (error || (data && data.success === false)) {
      console.warn(
        '[orderLifecycleNotificationService] send-email notice:',
        error?.message || data?.error
      );
      return { success: false, error: error?.message || data?.error };
    }
    return { success: true, data };
  } catch (err) {
    console.warn('[orderLifecycleNotificationService] Edge email invoke skipped:', err?.message);
    return { success: false, error: err?.message };
  }
}

async function dispatchCustomerTextBeeSms({ target, message, notificationType }) {
  if (!target?.phoneNumber || !message) return { success: false };
  try {
    return await sendTextBeeSms({
      phoneNumber: target.phoneNumber,
      message,
      bookingId: target.bookingId,
      customerId: target.customerId,
      customerName: target.fullName,
      bookingNumber: target.bookingNumber,
      notificationType,
    });
  } catch (err) {
    console.warn('[orderLifecycleNotificationService] TextBee SMS notice:', err?.message);
    return { success: false, error: err?.message };
  }
}

function buildShortSmsTemplate({ milestoneType, target, amount = 0 }) {
  const bNum = target.bookingNumber;
  const first = target.firstName;
  const amtText = Number(amount || 0) > 0 ? ` (${formatPeso(amount)})` : '';

  switch (milestoneType) {
    case 'DOWNPAYMENT_RECEIVED':
      return `${STUDIO_NAME}: Hi ${first}, your downpayment${amtText} for Booking #${bNum} is received & confirmed! Thank you.`;
    case 'PAYMENT_RECEIVED':
      return `${STUDIO_NAME}: Hi ${first}, we received your payment${amtText} for Booking #${bNum}. Check your portal for your updated balance.`;
    case 'DIGITAL_COPIES_SENT':
      return `${STUDIO_NAME}: Hi ${first}, your digital soft copies for Booking #${bNum} have been sent! Open your client portal to view & download.`;
    case 'CONFIRMED':
      return `${STUDIO_NAME}: Hi ${first}, your Booking #${bNum} (${target.packageName}) is confirmed! View your schedule & QR pass in your portal.`;
    case 'FINALIZED':
      return `${STUDIO_NAME}: Hi ${first}, your Booking #${bNum} is finalized and being prepared for soft copy release.`;
    case 'READY':
    case 'UNDER_DELIVERY':
      return `${STUDIO_NAME}: Hi ${first}, your Booking #${bNum} is ready to receive (Walk-In at E-Kodak Studio)! Check your portal for claiming & soft copy details.`;
    case 'COMPLETED':
      return `${STUDIO_NAME}: Hi ${first}, your Booking #${bNum} is completed and ready to receive! Thank you for choosing ${STUDIO_NAME}.`;
    default:
      return '';
  }
}

/**
 * Sends a branded progress email on every order status update and automatically
 * dispatches a TextBee SMS to the booking account phone on major status upgrades.
 */
export async function notifyBookingProgressUpdate({
  bookingId,
  newStatus,
  remarks = '',
  skipSms = false,
}) {
  const statusUpper = String(newStatus || '').toUpperCase().trim();
  if (!bookingId || !statusUpper || statusUpper === 'DELETED') return { skipped: true };

  // Never blast undo/redo administrative reverts as fresh client milestone alerts
  if (/^admin\s+(undo|redo)\s*:/i.test(String(remarks || '').trim())) {
    return { skipped: true };
  }

  if (shouldSkipDuplicateDispatch(bookingId, `STATUS:${statusUpper}`)) {
    return { skipped: true, deduplicated: true };
  }

  const target = await fetchBookingNotificationTarget(bookingId);
  if (!target) return { skipped: true };

  const cfg = STAGE_PROGRESS_CONTENT[statusUpper];
  const statusLabel = getStatusLabel(statusUpper);
  const cleanNote =
    remarks && !/^updated to/i.test(remarks.trim()) ? remarks.trim() : '';

  const headline = cfg?.headline || `Order Update: ${statusLabel}`;
  const badgeLabel = cfg?.badge || statusLabel;
  const baseBody =
    cfg?.message ||
    `Your order #${target.bookingNumber} status has been updated to ${statusLabel}.`;
  const messageBody = cleanNote ? `${baseBody} (${cleanNote})` : baseBody;

  const ctaUrl = `${resolvePortalBaseUrl()}${cfg?.ctaPath || '/dashboard/bookings'}`;
  const subject = `${badgeLabel} (#${target.bookingNumber}) — ${STUDIO_NAME}`;
  const htmlBody = renderOrderProgressEmailHtml({
    recipientName: target.fullName,
    bookingNumber: target.bookingNumber,
    packageName: target.packageName,
    statusLabel,
    badgeLabel,
    headline,
    messageBody,
    eventDate: target.eventDateFormatted,
    preferredTime: target.preferredTime,
    location: target.location,
    stepPercent: cfg?.stepPercent ?? 50,
    ctaLabel: cfg?.ctaLabel || 'View Order Progress',
    ctaUrl,
  });

  const plainText = `${headline} (#${target.bookingNumber}) — ${STUDIO_NAME}. Hi ${target.firstName}, ${messageBody} Track at ${ctaUrl}`;

  const tasks = [
    dispatchCustomerEmail({
      target,
      subject,
      htmlBody,
      plainText,
      notificationType: `ORDER_STATUS_${statusUpper}`,
    }),
  ];

  // Auto TextBee SMS on major booking stage upgrades
  const MAJOR_SMS_STATUSES = new Set([
    'CONFIRMED',
    'FINALIZED',
    'READY',
    'UNDER_DELIVERY',
    'COMPLETED',
  ]);
  if (!skipSms && MAJOR_SMS_STATUSES.has(statusUpper)) {
    const smsText = buildShortSmsTemplate({ milestoneType: statusUpper, target });
    if (smsText) {
      tasks.push(
        dispatchCustomerTextBeeSms({
          target,
          message: smsText,
          notificationType: `BOOKING_${statusUpper}`,
        })
      );
    }
  }

  await Promise.allSettled(tasks);
  return { success: true };
}

/**
 * Dispatches branded Email + automatic TextBee SMS for major booking upgrades:
 * - DOWNPAYMENT_RECEIVED
 * - PAYMENT_RECEIVED
 * - DIGITAL_COPIES_SENT (sent from Admin via Photo Outputs)
 */
export async function notifyMajorBookingMilestone({
  bookingId,
  milestoneType,
  amount = 0,
  paymentMethod = '',
  deliverableName = '',
}) {
  if (!bookingId || !milestoneType) return { skipped: true };
  if (shouldSkipDuplicateDispatch(bookingId, `MILESTONE:${milestoneType}`)) {
    return { skipped: true, deduplicated: true };
  }

  const target = await fetchBookingNotificationTarget(bookingId);
  if (!target) return { skipped: true };

  const cfg = MILESTONE_EMAIL_CONFIG[milestoneType];
  if (!cfg) return { skipped: true };

  const statusLabel = getStatusLabel(target.booking.status);
  const extraRows = [];
  let messageBody = '';

  if (milestoneType === 'DOWNPAYMENT_RECEIVED') {
    messageBody = `We have received and verified your downpayment of ${formatPeso(amount)} for booking #${target.bookingNumber}. Your reservation is confirmed on our studio calendar.`;
    if (amount > 0) extraRows.push({ label: 'Amount Verified', value: formatPeso(amount) });
    if (paymentMethod) extraRows.push({ label: 'Payment Channel', value: paymentMethod });
    extraRows.push({
      label: 'Remaining Balance',
      value: formatPeso(target.booking.remaining_balance || 0),
    });
  } else if (milestoneType === 'PAYMENT_RECEIVED') {
    messageBody = `Your payment of ${formatPeso(amount)} for booking #${target.bookingNumber} has been recorded and verified.`;
    if (amount > 0) extraRows.push({ label: 'Amount Recorded', value: formatPeso(amount) });
    if (paymentMethod) extraRows.push({ label: 'Payment Channel', value: paymentMethod });
  } else if (milestoneType === 'DIGITAL_COPIES_SENT') {
    const cleanDeliverable = String(deliverableName || '').replace(/^\[.*?\]\s*/, '').trim();
    messageBody = `Your digital soft copies${cleanDeliverable ? ` (${cleanDeliverable})` : ''} for booking #${target.bookingNumber} have now been sent by E-Kodak Studios! You can open your client portal anytime to view and download them.`;
    if (cleanDeliverable) {
      extraRows.push({ label: 'Deliverable', value: cleanDeliverable });
    }
  }

  const ctaUrl = `${resolvePortalBaseUrl()}${cfg.ctaPath}`;
  const subject = `${cfg.badge} (#${target.bookingNumber}) — ${STUDIO_NAME}`;
  const htmlBody = renderOrderProgressEmailHtml({
    recipientName: target.fullName,
    bookingNumber: target.bookingNumber,
    packageName: target.packageName,
    statusLabel,
    badgeLabel: cfg.badge,
    headline: cfg.headline,
    messageBody,
    eventDate: target.eventDateFormatted,
    preferredTime: target.preferredTime,
    location: target.location,
    stepPercent: cfg.stepPercent,
    extraRows,
    ctaLabel: cfg.ctaLabel,
    ctaUrl,
  });

  const plainText = `${cfg.headline} (#${target.bookingNumber}) — ${STUDIO_NAME}. Hi ${target.firstName}, ${messageBody} Open your portal at ${ctaUrl}`;

  const smsText = buildShortSmsTemplate({
    milestoneType,
    target,
    amount,
  });

  await Promise.allSettled([
    dispatchCustomerEmail({
      target,
      subject,
      htmlBody,
      plainText,
      notificationType: milestoneType,
    }),
    smsText
      ? dispatchCustomerTextBeeSms({
          target,
          message: smsText,
          notificationType: milestoneType,
        })
      : Promise.resolve(),
  ]);

  return { success: true };
}
