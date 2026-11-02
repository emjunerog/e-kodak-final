import { getEffectivePaymentStatus } from '../../../lib/bookingUtils';

export const DAY_MS = 24 * 60 * 60 * 1000;

/* ── Number formatting ───────────────────────────────────────────────────── */
export const peso = (n) =>
  `₱${Number(n || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

/** Compact currency for axis ticks: ₱1.2M, ₱850k, ₱12.5k, with exact ₱1,750 under 10k */
export function compactPeso(n) {
  const value = Number(n || 0);
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `₱${trimZero(value / 1_000_000)}M`;
  }
  if (abs >= 10_000) {
    return `₱${trimZero(value / 1_000)}k`;
  }
  return `₱${Number(Math.round(value)).toLocaleString('en-PH')}`;
}

/** Compact plain number for axis ticks. */
export function compactNumber(n) {
  const value = Number(n || 0);
  if (Math.abs(value) >= 1_000_000) return `${trimZero(value / 1_000_000)}M`;
  if (Math.abs(value) >= 1_000) return `${trimZero(value / 1_000)}k`;
  return `${Math.round(value)}`;
}

function trimZero(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

/* ── Date helpers (defensive: ignore invalid timestamps) ─────────────────── */
export function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

/** Monday-first week start. */
export function startOfWeek(date) {
  const d = startOfDay(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export function startOfMonth(date) {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function addMonths(date, amount) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + amount, 1);
  return d;
}

function monthLabel(date) {
  return date.toLocaleDateString('en-PH', { month: 'short' });
}

function shortDay(date) {
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function fullDay(date) {
  return date.toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ── Booking date + payment helpers ──────────────────────────────────────── */
/** The date a booking should appear on the timeline. */
export function bookingDate(booking) {
  return safeDate(booking?.created_at) || safeDate(booking?.event_date);
}

export function collectedAmount(booking) {
  const total = Number(booking?.total_amount || 0);
  const status = getEffectivePaymentStatus(booking);
  if (status === 'PAID') return total;
  if (status === 'DOWNPAYMENT') {
    const down = Number(booking?.down_payment_amount || 0);
    if (down > 0) return Math.min(down, total || down);
    // Fall back to the settled portion when the downpayment column is empty.
    const remaining = Number(booking?.remaining_balance ?? total);
    return total > 0 ? Math.max(0, Math.min(total, total - remaining)) : 0;
  }
  return status === 'REFUNDED' ? 0 : 0;
}

/* ── Bucket engine ───────────────────────────────────────────────────────── */
const RANGE_CONFIG = {
  '7D': { label: 'Last 7 days', days: 7, size: 'day' },
  '30D': { label: 'Last 30 days', days: 30, size: 'day' },
  '90D': { label: 'Last 90 days', weeks: 13, size: 'week' },
  ALL: { label: 'All time', size: 'auto' },
};

export const RANGE_OPTIONS = [
  { key: '7D', label: '7D' },
  { key: '30D', label: '30D' },
  { key: 'ALL', label: 'All' },
];

/** Create empty bucket descriptors between two dates. */
export function bucketize(start, end, size) {
  const buckets = [];
  if (!start || !end || start > end) return buckets;

  let cursor =
    size === 'week'
      ? startOfWeek(start)
      : size === 'month'
        ? startOfMonth(start)
        : startOfDay(start);

  // Hard stop keeps a corrupt date from creating an infinite loop.
  let guard = 0;
  while (cursor <= end && guard < 400) {
    guard += 1;
    let next;
    if (size === 'week') next = addDays(cursor, 7);
    else if (size === 'month') next = addMonths(cursor, 1);
    else next = addDays(cursor, 1);

    const bucketEnd = new Date(next.getTime() - 1);
    buckets.push({
      start: new Date(cursor),
      end: bucketEnd,
      size,
      label:
        size === 'month'
          ? cursor.getMonth() === 0 || buckets.length === 0
            ? `${monthLabel(cursor)} ’${String(cursor.getFullYear()).slice(2)}`
            : monthLabel(cursor)
          : shortDay(cursor),
      fullLabel:
        size === 'month'
          ? cursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
          : size === 'week'
            ? `${shortDay(cursor)} – ${shortDay(bucketEnd)}`
            : fullDay(cursor),
      revenue: 0,
      collected: 0,
      count: 0,
      bookings: [],
    });
    cursor = next;
  }

  return buckets;
}

/** Populate buckets with real booking aggregates. */
export function aggregateBuckets(buckets, bookings) {
  if (!buckets.length) return buckets;

  bookings.forEach((booking) => {
    const date = bookingDate(booking);
    if (!date) return;
    const bucket = buckets.find((b) => date >= b.start && date <= b.end);
    if (!bucket) return;

    const amount = Number(booking.total_amount || 0);
    bucket.revenue += amount;
    bucket.collected += collectedAmount(booking);
    bucket.count += 1;
    bucket.bookings.push(booking);
  });

  return buckets;
}

/**
 * Build a complete, adapted timeline for the selected range.
 * Daily for short ranges, weekly for quarters, monthly for long histories.
 */
export function buildTimeline(bookings = [], range = '30D', now = new Date()) {
  const today = startOfDay(now);
  const dated = bookings.filter((b) => bookingDate(b));
  const dates = dated.map((b) => bookingDate(b));
  const earliest = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : today;

  const config = RANGE_CONFIG[range] || RANGE_CONFIG['30D'];
  let size = config.size;
  let start;
  let end = today;

  if (range === '7D') {
    start = addDays(today, -6);
  } else if (range === '30D') {
    start = addDays(today, -29);
  } else if (range === '90D') {
    start = addDays(startOfWeek(today), -12 * 7);
  } else {
    const spanDays = Math.max(0, Math.round((today - startOfDay(earliest)) / DAY_MS));
    if (spanDays <= 60) {
      size = 'day';
      start = startOfDay(earliest);
    } else if (spanDays <= 420) {
      size = 'week';
      start = startOfWeek(earliest);
    } else {
      size = 'month';
      // Keep long histories readable — cap at the last 36 months.
      start = addMonths(startOfMonth(today), -35);
      start = new Date(Math.max(start.getTime(), startOfMonth(earliest).getTime()));
    }
    end = today;
  }

  const buckets = aggregateBuckets(bucketize(start, end, size), dated);
  const rangeLabel =
    range === 'ALL'
      ? buckets.length
        ? `${buckets[0].fullLabel} — ${buckets[buckets.length - 1].fullLabel}`
        : 'All time'
      : config.label;

  return {
    buckets,
    size,
    start,
    end,
    rangeLabel,
    totalBookings: dated.length,
    visibleBookings: buckets.reduce((sum, b) => sum + b.count, 0),
  };
}

/**
 * Values for the equivalent previous window (used for the compare line).
 */
export function buildPreviousSeries(bookings, range, currentTimeline) {
  if (!currentTimeline?.buckets?.length) return null;

  const { buckets, size, start } = currentTimeline;
  const count = buckets.length;
  let prevStart;
  if (size === 'month') prevStart = addMonths(start, -count);
  else if (size === 'week') prevStart = addDays(start, -count * 7);
  else prevStart = addDays(start, -count);

  const prevEnd = new Date(start.getTime() - 1);
  const dated = bookings.filter((b) => bookingDate(b));
  const prevBuckets = aggregateBuckets(bucketize(prevStart, prevEnd, size), dated);

  const values = buckets.map((_, index) => {
    const bucket = prevBuckets[index];
    if (!bucket) return { revenue: 0, count: 0 };
    return { revenue: bucket.revenue, count: bucket.count };
  });

  return {
    values,
    hasData: values.some((v) => v.revenue > 0 || v.count > 0),
    label: `Previous ${count} ${size === 'month' ? 'months' : size === 'week' ? 'weeks' : 'days'}`,
  };
}

/* ── SVG path helpers ────────────────────────────────────────────────────── */
/**
 * Catmull-Rom → cubic Bezier. Produces a soft, premium curve without the
 * flat stair-steps of a polyline.
 */
export function smoothPath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    // Contain the vertical overshoot so the curve never cuts below the axis.
    const low = Math.min(p1.y, p2.y);
    const high = Math.max(p1.y, p2.y);
    const y1 = Math.min(high, Math.max(low, cp1y));
    const y2 = Math.min(high, Math.max(low, cp2y));

    path += ` C ${cp1x} ${y1}, ${cp2x} ${y2}, ${p2.x} ${p2.y}`;
  }
  return path;
}

/** Rounded, "nice" axis maximum (1/2/2.5/5/10 × power of ten). */
export function niceMax(value, divisions = 4) {
  const v = Number(value || 0);
  if (v <= 0) return divisions;
  const rough = v / divisions;
  const power = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / power;
  let step;
  if (normalized <= 1) step = 1;
  else if (normalized <= 2) step = 2;
  else if (normalized <= 2.5) step = 2.5;
  else if (normalized <= 5) step = 5;
  else step = 10;
  return step * power * divisions;
}

/** Clamp a number between bounds. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/* ── Status presentation ─────────────────────────────────────────────────── */
export const STATUS_META = [
  { key: 'PENDING', label: 'New requests', short: 'New', color: '#d97706' },
  { key: 'CONFIRMED', label: 'Reserved', short: 'Reserved', color: '#2563eb' },
  { key: 'PHOTOGRAPHER_ASSIGNED', label: 'Assigned', short: 'Assigned', color: '#7c3aed' },
  { key: 'CAPTURE', label: 'On shoot', short: 'On shoot', color: '#db2777' },
  { key: 'EDITING', label: 'Editing', short: 'Editing', color: '#0891b2' },
  { key: 'RETOUCHING', label: 'Retouching', short: 'Retouch', color: '#0d9488' },
  { key: 'FINALIZED', label: 'Finalized', short: 'Finalized', color: '#65a30d' },
  { key: 'PRINTING', label: 'Printing', short: 'Printing', color: '#ca8a04' },
  { key: 'READY', label: 'Ready for pickup', short: 'Ready', color: '#059669' },
  { key: 'UNDER_DELIVERY', label: 'Out for delivery', short: 'Delivery', color: '#0f766e' },
  { key: 'COMPLETED', label: 'Completed', short: 'Completed', color: '#16a34a' },
  { key: 'CANCELLED', label: 'Cancelled', short: 'Cancelled', color: '#a8a29e' },
  { key: 'REJECTED', label: 'Rejected', short: 'Rejected', color: '#ef4444' },
];

export const STATUS_LOOKUP = STATUS_META.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});
