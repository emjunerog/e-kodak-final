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

// ── 7-Stage Studio Production Pipeline ─────────────────────────────────────────
export const PROGRESS_STEPS_7 = [
  'Booking Received',
  'Approved & Reserved',
  'Ongoing Pictorial',
  'Editing',
  'Retouching',
  'Booking Finalized',
  'Booking ready to pick-up (studio)',
];

// Map raw status to stage index (0 to 6)
export const STEP_INDEX_7 = {
  PENDING: 0,
  RESERVED: 0,
  CONFIRMED: 1,
  PHOTOGRAPHER_ASSIGNED: 1,
  CAPTURE: 2,
  IN_PROGRESS: 2,
  EDITING: 3,
  RETOUCHING: 4,
  FINALIZED: 5,
  PRINTING: 5,
  READY: 6,
  UNDER_DELIVERY: 6,
  COMPLETED: 7,
  REJECTED: 0,
  CANCELLED: 0,
};

// ── 4 Delivery Sub-Phases ──────────────────────────────────────────────────────
export const DELIVERY_SUBPHASES = [
  { key: 'PREPARING', label: 'preparing delivery', description: 'Studio packaging and secure parcel seal in progress' },
  { key: 'ONGOING',   label: 'ongoing delivery',   description: 'Courier transit underway to destination' },
  { key: 'NEAR',      label: 'delivery is near',    description: 'Courier in your local barangay / vicinity' },
  { key: 'CONFIRMED', label: 'delivery confirmed', description: 'Safely delivered and received' },
];

/**
 * Builds the progress step list for a booking status across the 7 stages.
 * If booking object is passed, verifies that admin has added schedule before advancing to stage 2.
 * @param {string|object} bookingOrStatus - raw booking status or booking record object
 * @param {boolean} [isDelivery=false] - whether order is for delivery instead of pickup
 * @returns {Array<{label: string, done: boolean, active: boolean, step: number, isAwaitingSchedule?: boolean}>}
 */
export function getProgressSteps(bookingOrStatus, isDelivery = false) {
  let key = 'PENDING';
  let hasSchedule = true;
  let deliveryFlag = isDelivery;

  if (typeof bookingOrStatus === 'object' && bookingOrStatus !== null) {
    key = String(bookingOrStatus.status || 'PENDING').toUpperCase();
    if ((key === 'CONFIRMED' || key === 'PHOTOGRAPHER_ASSIGNED') && (!bookingOrStatus.event_date || !bookingOrStatus.preferred_time)) {
      hasSchedule = false;
    }
    if (bookingOrStatus.delivery_address || bookingOrStatus.fulfillment_type === 'DELIVERY' || key === 'UNDER_DELIVERY') {
      deliveryFlag = true;
    }
  } else {
    key = String(bookingOrStatus || 'PENDING').toUpperCase();
  }

  let doneIdx = STEP_INDEX_7[key] ?? 0;
  // If status is CONFIRMED but admin hasn't added schedule yet, remain at stage 1 checkpoint
  if (!hasSchedule && doneIdx === 1) {
    doneIdx = 0;
  }
  const terminal = key === 'CANCELLED' || key === 'COMPLETED' || key === 'REJECTED';

  const steps = [
    'Booking Received',
    'Approved & Reserved',
    'Ongoing Pictorial',
    'Editing',
    'Retouching',
    'Booking Finalized',
    deliveryFlag ? 'Booking under delivery' : 'Booking ready to pick-up (studio)',
  ];

  return steps.map((label, i) => ({
    label,
    step: i + 1,
    done: i < doneIdx,
    active: i === doneIdx && !terminal,
    isAwaitingSchedule: i === 0 && !hasSchedule && (key === 'CONFIRMED' || key === 'PENDING' || key === 'RESERVED'),
  }));
}

