/**
 * bookingUtils.js
 * ===============
 * SHARED BOOKING STATUS / PAYMENT / PROGRESS HELPERS
 *
 * Single source of truth for:
 *  - Booking status badge styling + human labels (3-color palette: primary, gold, neutral)
 *  - Payment status labels
 *  - Booking progress stepper steps (7-stage studio production pipeline)
 *  - Delivery sub-phase tracker steps
 *
 * Used by DashboardHome, BookingProgressPage, BookingDetailsPage, AdminDashboard,
 * PhotographerDashboard, and mobile components.
 */

// ── 3-Color Palette Status System ─────────────────────────────────────────────
// Colors: primary (#1a1a1a), gold (#c9a96e), neutral
// Tier mapping: primary = active/in-progress, gold = attention/pending, neutral = complete/idle
const STATUS_META = {
  // Stage 1: Booking Received
  PENDING:              { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',            label: 'Booking Received' },
  RESERVED:             { tier: 'gold',   badge: 'bg-amber-500/15 text-amber-900 border-amber-500/30',   label: 'Booking Received' },
  // Stage 2: Approved & Reserved
  CONFIRMED:            { tier: 'primary', badge: 'bg-primary/10 text-primary border-primary/30',        label: 'Approved & Reserved' },
  PHOTOGRAPHER_ASSIGNED:{ tier: 'primary', badge: 'bg-primary/10 text-primary border-primary/30',        label: 'Photographer Assigned' },
  // Stage 3: Ongoing Pictorial
  CAPTURE:              { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',            label: 'Ongoing Pictorial' },
  IN_PROGRESS:          { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',            label: 'Ongoing Pictorial' },
  // Stage 4: Editing
  EDITING:              { tier: 'primary', badge: 'bg-primary/10 text-primary border-primary/30',         label: 'Editing' },
  // Stage 5: Retouching
  RETOUCHING:           { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',            label: 'Retouching' },
  // Stage 6: Booking Finalized / Print Lab
  FINALIZED:            { tier: 'primary', badge: 'bg-primary/10 text-primary border-primary/30',         label: 'Booking Finalized' },
  PRINTING:             { tier: 'primary', badge: 'bg-primary/10 text-primary border-primary/30',         label: 'In Print Lab' },
  // Stage 7: Fulfillment (Pickup vs Delivery)
  READY:                { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',            label: 'Ready for Pickup' },
  UNDER_DELIVERY:       { tier: 'primary', badge: 'bg-primary/10 text-primary border-primary/30',        label: 'Under Delivery' },
  // Terminals
  COMPLETED:            { tier: 'neutral', badge: 'bg-neutral-100 text-neutral-700 border-neutral-200',  label: 'Completed' },
  REJECTED:             { tier: 'neutral', badge: 'bg-neutral-100 text-neutral-500 border-neutral-200',  label: 'Rejected' },
  CANCELLED:            { tier: 'neutral', badge: 'bg-neutral-100 text-neutral-500 border-neutral-200',  label: 'Cancelled' },
};

/** Normalize a raw status to its CSS badge class (3-color palette). */
export function getStatusBadge(status) {
  const key = String(status || 'PENDING').toUpperCase();
  return (STATUS_META[key] || STATUS_META.PENDING).badge;
}

/** Normalize a raw status to its tier (primary | gold | neutral). */
export function getStatusTier(status) {
  const key = String(status || 'PENDING').toUpperCase();
  return (STATUS_META[key] || STATUS_META.PENDING).tier;
}

/** Normalize a raw status to its human-readable label. */
export function getStatusLabel(status, isDelivery = false) {
  const key = String(status || 'PENDING').toUpperCase();
  if (key === 'READY' && isDelivery) {
    return 'Booking under delivery';
  }
  return (STATUS_META[key] || STATUS_META.PENDING).label;
}

// ── Payment status labels ─────────────────────────────────────────────────────
const PAYMENT_META = {
  UNPAID:           { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',      label: 'Unpaid' },
  DOWNPAYMENT:      { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',      label: 'Downpayment' },
  DOWN_PAYMENT:     { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',      label: 'Downpayment' },
  DOWNPAYMENT_PAID: { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',      label: 'Downpayment' },
  PARTIAL:          { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',      label: 'Downpayment' },
  PARTIALLY_PAID:   { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',      label: 'Downpayment' },
  PAID:             { tier: 'neutral', badge: 'bg-neutral-900 text-gold border-neutral-800',    label: 'Paid' },
  FULLY_PAID:       { tier: 'neutral', badge: 'bg-neutral-900 text-gold border-neutral-800',    label: 'Paid' },
  REFUNDED:         { tier: 'neutral', badge: 'bg-neutral-100 text-neutral-500 border-neutral-200', label: 'Refunded' },
};

/**
 * Resolves the effective payment status for a booking.
 * Detects downpayment if down_payment_confirmed is true,
 * or if down_payment_amount > 0, or if remaining_balance < total_amount,
 * or if payment_status is PARTIAL / DOWNPAYMENT.
 *
 * @param {object|string} bookingOrStatus - booking object or raw payment status string
 * @returns {string} 'PAID' | 'DOWNPAYMENT' | 'UNPAID' | 'REFUNDED'
 */
export function getEffectivePaymentStatus(bookingOrStatus) {
  if (!bookingOrStatus) return 'UNPAID';

  if (typeof bookingOrStatus === 'string') {
    const raw = bookingOrStatus.toUpperCase().trim();
    if (['PAID', 'FULLY_PAID', 'CLEARED'].includes(raw)) return 'PAID';
    if (['DOWNPAYMENT', 'DOWN_PAYMENT', 'DOWNPAYMENT_PAID', 'PARTIAL', 'PARTIALLY_PAID'].includes(raw)) {
      return 'DOWNPAYMENT';
    }
    if (raw === 'REFUNDED') return 'REFUNDED';
    return 'UNPAID';
  }

  const b = bookingOrStatus;
  const rawStatus = String(b.payment_status || '').toUpperCase().trim();
  const total = Number(b.total_amount || 0);
  const remaining = Number(b.remaining_balance ?? total);
  const downAmount = Number(b.down_payment_amount || 0);
  const isDownConfirmed = Boolean(b.down_payment_confirmed);

  // 1. Fully paid check
  if (['PAID', 'FULLY_PAID'].includes(rawStatus) || (total > 0 && remaining <= 0)) {
    return 'PAID';
  }

  if (rawStatus === 'REFUNDED') {
    return 'REFUNDED';
  }

  // 2. Downpayment detected check:
  // - status says PARTIAL or DOWNPAYMENT
  // - or down_payment_confirmed flag is set
  // - or down_payment_amount > 0
  // - or remaining balance is less than total amount (partial settlement)
  if (
    ['DOWNPAYMENT', 'DOWN_PAYMENT', 'DOWNPAYMENT_PAID', 'PARTIAL', 'PARTIALLY_PAID'].includes(rawStatus) ||
    isDownConfirmed ||
    downAmount > 0 ||
    (total > 0 && remaining < total)
  ) {
    return 'DOWNPAYMENT';
  }

  return 'UNPAID';
}

/** Normalize a raw payment status to its human-readable label. */
export function getPaymentLabel(status) {
  const eff = getEffectivePaymentStatus(status);
  return PAYMENT_META[eff]?.label || status || 'Unpaid';
}

/** Get payment status badge class (3-color palette). */
export function getPaymentBadge(status) {
  const eff = getEffectivePaymentStatus(status);
  return PAYMENT_META[eff]?.badge || PAYMENT_META.UNPAID.badge;
}

/** Get payment status tier (primary | gold | neutral). */
export function getPaymentTier(status) {
  const eff = getEffectivePaymentStatus(status);
  return PAYMENT_META[eff]?.tier || PAYMENT_META.UNPAID.tier;
}

// ── 8-Stage Studio Production Pipeline ─────────────────────────────────────────
export const PROGRESS_STEPS_8 = [
  'Booking Received',
  'Approved & Reserved',
  'Photographer Assigned',
  'Ongoing Pictorial',
  'Editing',
  'Retouching',
  'Booking Finalized',
  'Booking ready to pick-up (studio)',
];
export const PROGRESS_STEPS_7 = PROGRESS_STEPS_8;

// Map raw status to stage index (0 to 7; 8 = COMPLETED)
export const STEP_INDEX_8 = {
  PENDING: 0,
  RESERVED: 0,
  CONFIRMED: 1,
  PHOTOGRAPHER_ASSIGNED: 2,
  CAPTURE: 3,
  IN_PROGRESS: 3,
  EDITING: 4,
  RETOUCHING: 5,
  FINALIZED: 6,
  PRINTING: 6,
  READY: 7,
  UNDER_DELIVERY: 7,
  COMPLETED: 8,
  REJECTED: 0,
  CANCELLED: 0,
};
export const STEP_INDEX_7 = STEP_INDEX_8;

// ── 4 Delivery Sub-Phases ──────────────────────────────────────────────────────
export const DELIVERY_SUBPHASES = [
  { key: 'PREPARING', label: 'preparing delivery', description: 'Studio packaging and secure parcel seal in progress' },
  { key: 'ONGOING',   label: 'ongoing delivery',   description: 'Courier transit underway to destination' },
  { key: 'NEAR',      label: 'delivery is near',    description: 'Courier in your local barangay / vicinity' },
  { key: 'CONFIRMED', label: 'delivery confirmed', description: 'Safely delivered and received' },
];

/**
 * Builds the progress step list for a booking status across the 8 stages
 * (including the dedicated Photographer Assigned milestone).
 * @param {string|object} bookingOrStatus - raw booking status or booking record object
 * @param {boolean} [isDelivery=false] - whether order is for delivery instead of pickup
 * @returns {Array<{label: string, done: boolean, active: boolean, step: number, isAwaitingSchedule?: boolean}>}
 */
export function getProgressSteps(bookingOrStatus, isDelivery = false) {
  let key = 'PENDING';
  let deliveryFlag = isDelivery;

  if (typeof bookingOrStatus === 'object' && bookingOrStatus !== null) {
    key = String(bookingOrStatus.status || 'PENDING').toUpperCase();
    if (bookingOrStatus.delivery_address || bookingOrStatus.fulfillment_type === 'DELIVERY' || key === 'UNDER_DELIVERY') {
      deliveryFlag = true;
    }
  } else {
    key = String(bookingOrStatus || 'PENDING').toUpperCase();
  }

  const doneIdx = STEP_INDEX_8[key] ?? 0;
  const terminal = key === 'CANCELLED' || key === 'COMPLETED' || key === 'REJECTED';

  const stage8Label =
    key === 'COMPLETED'
      ? 'Completed'
      : deliveryFlag
        ? 'Under Delivery'
        : 'Ready for Pickup';

  const steps = [
    'Booking Received',
    'Approved & Reserved',
    'Photographer Assigned',
    'Ongoing Pictorial',
    'Editing',
    'Retouching',
    'Booking Finalized',
    stage8Label,
  ];

  return steps.map((label, i) => ({
    label,
    step: i + 1,
    done: i < doneIdx,
    active: i === doneIdx && !terminal,
    isAwaitingSchedule: i === 0 && (key === 'PENDING' || key === 'RESERVED'),
  }));
}

/** Returns true if a booking already has an assigned photographer. */
export function hasAssignedPhotographer(booking) {
  return Boolean(booking?.photographer_id || booking?.photographer?.id);
}

/** Returns the assigned photographer's display name if available. */
export function getPhotographerDisplayName(booking) {
  if (!booking?.photographer) return '';
  const first = booking.photographer.first_name || booking.photographer.profile?.first_name || '';
  const last = booking.photographer.last_name || booking.photographer.profile?.last_name || '';
  return `${first} ${last}`.trim();
}

/**
 * Returns true once an admin has confirmed the booking's payment
 * (payment_confirmed_at set, or stage has already moved beyond photographer assignment).
 */
export function isPaymentVerifiedByAdmin(booking) {
  if (!booking) return false;
  if (booking.payment_confirmed_at || booking.down_payment_confirmed) return true;
  const status = String(booking.status || '').toUpperCase();
  if (['CAPTURE', 'IN_PROGRESS', 'EDITING', 'RETOUCHING', 'FINALIZED', 'PRINTING', 'READY', 'UNDER_DELIVERY', 'COMPLETED'].includes(status)) {
    return true;
  }
  return false;
}

/**
 * Resolves the next direct Order Progress stage action for a booking row.
 * Prioritizes payment confirmation BEFORE photographer assignment / pending steps:
 *   1. Customer booked -> Booking Received (PENDING / RESERVED)
 *   2. Payment submitted / detected -> Confirm Downpayment (CONFIRMED)
 *   3. Approved & Reserved (CONFIRMED) / missing photographer -> Assign Photographer (PHOTOGRAPHER_ASSIGNED)
 *   4. Photographer Assigned -> Start Pictorial (CAPTURE) -> Editing -> Retouching -> Finalized -> Ready -> Completed
 *
 * @param {object} booking
 * @returns {null | { type: 'CONFIRM_PAYMENT' | 'APPROVE_AND_RESERVE' | 'ASSIGN_PHOTOGRAPHER' | 'ADVANCE_STAGE', label: string, nextStatus: string, nextLabel: string }}
 */
/** Format HH:MM or HH:MM:SS into clean 12-hour studio display (e.g., 10:00 AM). */
export function formatBookingTime(value) {
  if (!value) return '';
  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return raw;
  const hour24 = Number(match[1]);
  const mins = match[2];
  if (Number.isNaN(hour24) || hour24 < 0 || hour24 > 23) return raw;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${mins} ${period}`;
}

function hasAdminReceivedEditedPhotos(booking) {
  const history = Array.isArray(booking?.booking_status_history)
    ? booking.booking_status_history
    : [];
  let sentAt = 0;
  let receivedAt = 0;
  let returnedAt = 0;
  history.forEach((h, idx) => {
    const r = String(h?.remarks || '');
    const ts = new Date(h?.created_at || 0).getTime() || idx + 1;
    if (/sent\s+(?:edited\s+)?photos\s+to\s+admin|submitted\s+\d+\s+sample\s+photo/i.test(r)) {
      sentAt = Math.max(sentAt, ts);
    }
    if (/admin\s+received\s+(?:edited\s+)?photos/i.test(r)) {
      receivedAt = Math.max(receivedAt, ts);
    }
    if (/requested\s+sample\s+revisions|returned\s+to\s+photographer/i.test(r)) {
      returnedAt = Math.max(returnedAt, ts);
    }
  });
  return Boolean(sentAt > 0 && sentAt >= returnedAt && receivedAt >= sentAt);
}

export function getNextBookingAction(booking) {
  if (!booking) return null;
  const status = String(booking.status || 'PENDING').toUpperCase();
  const hasPhotog = hasAssignedPhotographer(booking);
  const paymentVerified = isPaymentVerifiedByAdmin(booking);
  const hasDownpaymentOnFile =
    Number(booking.down_payment_amount || 0) > 0 ||
    ['PAID', 'DOWNPAYMENT'].includes(getEffectivePaymentStatus(booking));
  const isDelivery = Boolean(
    booking.delivery_address ||
    booking.fulfillment_type === 'DELIVERY' ||
    status === 'UNDER_DELIVERY'
  );

  if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(status)) {
    return null;
  }

  // Prioritize payment confirmation before photographer assignment / pending steps
  if (['PENDING', 'RESERVED', 'CONFIRMED', 'PHOTOGRAPHER_ASSIGNED'].includes(status) && !paymentVerified) {
    return {
      type: 'CONFIRM_PAYMENT',
      label: hasDownpaymentOnFile ? 'Confirm Downpayment' : 'Verify Payment',
      nextStatus: status === 'PENDING' || status === 'RESERVED' ? 'CONFIRMED' : status,
      nextLabel: getStatusLabel(status === 'PENDING' || status === 'RESERVED' ? 'CONFIRMED' : status),
    };
  }

  if (status === 'PENDING' || status === 'RESERVED') {
    return {
      type: 'APPROVE_AND_RESERVE',
      label: 'Confirm & Schedule',
      nextStatus: 'CONFIRMED',
      nextLabel: getStatusLabel('CONFIRMED'),
    };
  }

  if (status === 'CONFIRMED') {
    if (!hasPhotog) {
      return {
        type: 'ASSIGN_PHOTOGRAPHER',
        label: 'Move to Photographer',
        nextStatus: 'PHOTOGRAPHER_ASSIGNED',
        nextLabel: getStatusLabel('PHOTOGRAPHER_ASSIGNED'),
      };
    }
    return null;
  }

  if (status === 'PHOTOGRAPHER_ASSIGNED') {
    if (!hasPhotog) {
      return {
        type: 'ASSIGN_PHOTOGRAPHER',
        label: 'Move to Photographer',
        nextStatus: 'PHOTOGRAPHER_ASSIGNED',
        nextLabel: getStatusLabel('PHOTOGRAPHER_ASSIGNED'),
      };
    }
    return null;
  }

  if (status === 'CAPTURE' || status === 'IN_PROGRESS') {
    return null;
  }

  if (status === 'EDITING') {
    const adminReadyToConfirm = hasAdminReceivedEditedPhotos(booking);
    if (!adminReadyToConfirm) {
      return null;
    }
    return {
      type: 'ADVANCE_STAGE',
      label: 'Confirm Retouching',
      nextStatus: 'RETOUCHING',
      nextLabel: getStatusLabel('RETOUCHING'),
    };
  }

  if (status === 'RETOUCHING') {
    return {
      type: 'ADVANCE_STAGE',
      label: 'Finalize Order',
      nextStatus: 'FINALIZED',
      nextLabel: getStatusLabel('FINALIZED'),
    };
  }

  if (status === 'FINALIZED' || status === 'PRINTING') {
    const nextStatus = isDelivery ? 'UNDER_DELIVERY' : 'READY';
    return {
      type: 'ADVANCE_STAGE',
      label: isDelivery ? 'Move to Under Delivery' : 'Mark Ready for Pickup',
      nextStatus,
      nextLabel: getStatusLabel(nextStatus, isDelivery),
    };
  }

  if (status === 'READY' || status === 'UNDER_DELIVERY') {
    return {
      type: 'ADVANCE_STAGE',
      label: 'Complete Order',
      nextStatus: 'COMPLETED',
      nextLabel: getStatusLabel('COMPLETED'),
    };
  }

  return null;
}

const INACTIVE_CONFLICT_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);

/** Parses "09:00:00", "9:00 AM", etc. into minutes since midnight, or null for unparsed/full-day values. */
export function parseBookingTimeMinutes(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed || /full[-\s]*day|school/i.test(trimmed)) return null;
  const match = trimmed.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const mer = match[3]?.toLowerCase();
  if (mer === 'pm' && hours < 12) hours += 12;
  if (mer === 'am' && hours === 12) hours = 0;
  if (Number.isNaN(hours) || Number.isNaN(mins) || hours < 0 || hours > 23 || mins < 0 || mins > 59) {
    return null;
  }
  return hours * 60 + mins;
}

/** Returns true if two bookings share the same day and overlapping studio hours (< 60 mins apart or full-day). */
export function doBookingTimesConflict(a, b) {
  if (!a || !b) return false;
  const dA = String(a.event_date || '').slice(0, 10);
  const dB = String(b.event_date || '').slice(0, 10);
  if (!dA || !dB || dA !== dB) return false;

  const tA = parseBookingTimeMinutes(a.preferred_time);
  const tB = parseBookingTimeMinutes(b.preferred_time);
  if (tA === null || tB === null) return true;
  return Math.abs(tA - tB) < 60;
}

/** Finds any other active booking in `list` whose day/time conflicts with `target`. */
export function findConflictingBooking(target, list = []) {
  if (!target?.event_date || !Array.isArray(list)) return null;
  return (
    list.find((other) => {
      if (!other || other.id === target.id || other.is_deleted) return false;
      const st = String(other.status || '').toUpperCase();
      if (INACTIVE_CONFLICT_STATUSES.has(st)) return false;
      return doBookingTimesConflict(target, other);
    }) || null
  );
}


