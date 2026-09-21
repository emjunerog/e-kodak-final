/**
 * bookingUtils.js
 * ===============
 * SHARED BOOKING STATUS / PAYMENT / PROGRESS HELPERS
 *
 * Single source of truth for:
 *  - Booking status badge styling + human labels (3-color palette: primary, gold, neutral)
 *  - Payment status labels
 *  - Booking progress stepper steps
 *
 * Used by DashboardHome, BookingDetailsPage, BookingCard, AdminDashboard, PhotographerDashboard,
 * and anywhere else that renders booking status.
 */

// ── 3-Color Palette Status System ─────────────────────────────────────────────
// Colors: primary (#1a1a1a), gold (#c9a96e), neutral
// Tier mapping: primary = active/in-progress, gold = attention/pending, neutral = complete/idle
const STATUS_META = {
  PENDING:              { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',    label: 'Pending Review' },
  CONFIRMED:            { tier: 'primary', badge: 'bg-primary/10 text-primary border-primary/30',  label: 'Confirmed' },
  PHOTOGRAPHER_ASSIGNED:{ tier: 'primary', badge: 'bg-primary/10 text-primary border-primary/30',  label: 'Photographer Assigned' },
  CAPTURE:              { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',      label: 'In Studio Bay' },
  IN_PROGRESS:          { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',      label: 'In Progress' },
  EDITING:              { tier: 'primary', badge: 'bg-primary/10 text-primary border-primary/30',   label: 'Editing' },
  PRINTING:             { tier: 'primary', badge: 'bg-primary/10 text-primary border-primary/30',   label: 'Printing' },
  READY:                { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',      label: 'Ready for Pickup' },
  COMPLETED:            { tier: 'neutral', badge: 'bg-neutral-100 text-neutral-700 border-neutral-200', label: 'Completed' },
  REJECTED:             { tier: 'neutral', badge: 'bg-neutral-100 text-neutral-500 border-neutral-200', label: 'Rejected' },
  CANCELLED:            { tier: 'neutral', badge: 'bg-neutral-100 text-neutral-500 border-neutral-200', label: 'Cancelled' },
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
export function getStatusLabel(status) {
  const key = String(status || 'PENDING').toUpperCase();
  return (STATUS_META[key] || STATUS_META.PENDING).label;
}

// ── Payment status labels ─────────────────────────────────────────────────────
// Supports legacy (DOWNPAYMENT_PAID, FULLY_PAID) and migration 02
// (PARTIAL, PAID, REFUNDED) payment statuses.
const PAYMENT_META = {
  UNPAID:           { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',      label: 'Unpaid' },
  DOWNPAYMENT_PAID: { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',      label: 'Downpayment Paid' },
  PARTIAL:          { tier: 'gold',   badge: 'bg-gold/10 text-gold-dark border-gold/30',      label: 'Partially Paid' },
  PAID:             { tier: 'neutral', badge: 'bg-neutral-900 text-gold border-neutral-800',    label: 'Paid' },
  FULLY_PAID:       { tier: 'neutral', badge: 'bg-neutral-900 text-gold border-neutral-800',    label: 'Paid' },
  REFUNDED:         { tier: 'neutral', badge: 'bg-neutral-100 text-neutral-500 border-neutral-200', label: 'Refunded' },
};

/** Normalize a raw payment status to its human-readable label. */
export function getPaymentLabel(status) {
  const key = String(status || 'UNPAID').toUpperCase();
  return PAYMENT_META[key]?.label || status || 'Unpaid';
}

/** Get payment status badge class (3-color palette). */
export function getPaymentBadge(status) {
  const key = String(status || 'UNPAID').toUpperCase();
  return PAYMENT_META[key]?.badge || PAYMENT_META.UNPAID.badge;
}

/** Get payment status tier (primary | gold | neutral). */
export function getPaymentTier(status) {
  const key = String(status || 'UNPAID').toUpperCase();
  return PAYMENT_META[key]?.tier || PAYMENT_META.UNPAID.tier;
}

// ── Booking progress stepper ──────────────────────────────────────────────────
// Order of steps. Legacy and migration-02 statuses are mapped onto the
// completed/active index so the timeline shows the right position.
const PROGRESS_STEPS = [
  'Submitted',
  'Confirmed',
  'Photographer Assigned',
  'Capture & Editing',
  'Ready for Pickup',
];

// Map every known status to how many steps are "done".
const STEP_INDEX = {
  PENDING: 0,
  CONFIRMED: 1,
  PHOTOGRAPHER_ASSIGNED: 2,
  IN_PROGRESS: 3,
  CAPTURE: 3,
  EDITING: 3,
  PRINTING: 4,
  READY: 4,
  COMPLETED: 5,
  REJECTED: 0,
  CANCELLED: 0,
};

/**
 * Builds the progress step list for a booking status.
 * @param {string} status - raw booking status
 * @param {boolean} [hasPhotographer=false] - whether a photographer is assigned
 * @returns {Array<{label: string, done: boolean, active: boolean}>}
 */
export function getProgressSteps(status, hasPhotographer = false) {
  const key = String(status || 'PENDING').toUpperCase();
  let doneIdx = STEP_INDEX[key] ?? 0;
  
  if (key === 'CONFIRMED' && hasPhotographer) {
    doneIdx = Math.max(doneIdx, 2); // Jump to Photographer Assigned
  }
  
  const terminal = key === 'CANCELLED' || key === 'COMPLETED' || key === 'REJECTED';

  return PROGRESS_STEPS.map((label, i) => ({
    label,
    done:   i < doneIdx,
    active: i === doneIdx && !terminal,
  }));
}
