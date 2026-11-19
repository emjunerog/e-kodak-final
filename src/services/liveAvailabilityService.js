/**
 * liveAvailabilityService.js
 * ==========================
 * Real-Time Booking & Scheduling Availability Engine for E-Kodak Studio.
 *
 * Core Business Rules (Ordinates):
 * 1. Hourly Slot Sessions (Individual Academic College/SHS, Portraits):
 *    - 8 discrete 1-hour camera bay slots (8:00 AM – 5:00 PM).
 *    - Live Slot Locking: If a slot (e.g., 10:00 AM – 11:00 AM) is booked for Date X,
 *      that slot becomes unavailable/disabled for all other customers booking on that day.
 * 2. School Section Orders (Academic Batch Pictorials):
 *    - Graduation batch shoots take the entire day.
 *    - When booked, the ENTIRE DAY is blocked from all other customers.
 *    - Admin can edit and extend this if the pictorial takes 2 or more days.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";

export const STUDIO_OPERATING_HOURS = "8:00 AM – 5:00 PM";
export const STUDIO_WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/**
 * Calculates the next open studio date (strictly Monday to Friday, 8:00 AM - 5:00 PM).
 * If today is a weekday and before 5:00 PM, returns today.
 * If today is after 5:00 PM or a weekend (Sat/Sun), advances to the next open studio weekday.
 */
export function getNextOpenStudioDate() {
  const now = new Date();
  let target = new Date(now);
  // If current local time is at or after 5:00 PM (17:00), today is closed, so look starting tomorrow
  if (target.getHours() >= 17) {
    target.setDate(target.getDate() + 1);
  }
  // Advance while target is Saturday (6) or Sunday (0)
  while (target.getDay() === 0 || target.getDay() === 6) {
    target.setDate(target.getDate() + 1);
  }
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getInitialStudioBookingDate() {
  return getNextOpenStudioDate();
}

export const STUDIO_HOURLY_SLOTS = [
  { time: "08:00", label: "8:00 AM – 9:00 AM", period: "Morning", display: "8:00 AM" },
  { time: "09:00", label: "9:00 AM – 10:00 AM", period: "Morning", display: "9:00 AM" },
  { time: "10:00", label: "10:00 AM – 11:00 AM", period: "Morning", display: "10:00 AM" },
  { time: "11:00", label: "11:00 AM – 12:00 PM", period: "Morning", display: "11:00 AM" },
  { time: "13:00", label: "1:00 PM – 2:00 PM", period: "Afternoon", display: "1:00 PM" },
  { time: "14:00", label: "2:00 PM – 3:00 PM", period: "Afternoon", display: "2:00 PM" },
  { time: "15:00", label: "3:00 PM – 4:00 PM", period: "Afternoon", display: "3:00 PM" },
  { time: "16:00", label: "4:00 PM – 5:00 PM", period: "Afternoon", display: "4:00 PM" },
];

const LOCAL_STORAGE_BLOCKS_KEY = "ekodak_admin_date_blocks_v1";
const LOCAL_STORAGE_MULTIDAY_KEY = "ekodak_multiday_school_bookings_v1";

/**
 * Normalizes a time string to "HH:MM" 24h slot format
 */
export function normalizeSlotTime(str) {
  if (!str) return null;
  const trimmed = str.trim();
  // Exact match with slot keys
  const exact = STUDIO_HOURLY_SLOTS.find(s => s.time === trimmed || s.display.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact.time;

  // Extract hour & minute
  const m = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const rawH = parseInt(m[1], 10);
  const min = m[2];

  let h = rawH;
  if (/pm/i.test(trimmed) && rawH < 12) h += 12;
  if (/am/i.test(trimmed) && rawH === 12) h = 0;

  const hStr = String(h).padStart(2, '0');
  const candidate = `${hStr}:00`;
  const matched = STUDIO_HOURLY_SLOTS.find(s => s.time === candidate);
  return matched ? matched.time : `${hStr}:${min}`;
}

/**
 * Parses a 24h/12h time string ("10:00", "10:00:00", "10:00 AM") into minutes since midnight.
 */
export function parseTimeToMinutes(str) {
  if (!str) return null;
  const trimmed = String(str).trim();
  const m = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);
  if (!m) {
    const slotKey = normalizeSlotTime(trimmed);
    if (!slotKey) return null;
    const [sh, sm] = slotKey.split(':').map(Number);
    return Number.isFinite(sh) && Number.isFinite(sm) ? sh * 60 + sm : null;
  }
  let hours = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const mod = m[3]?.toLowerCase();
  if (mod === 'pm' && hours < 12) hours += 12;
  if (mod === 'am' && hours === 12) hours = 0;
  if (Number.isNaN(hours) || Number.isNaN(mins) || hours < 0 || hours > 23 || mins < 0 || mins > 59) {
    return null;
  }
  return hours * 60 + mins;
}

export function minutesToHHMM(totalMinutes) {
  if (totalMinutes == null || Number.isNaN(totalMinutes)) return '';
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime24To12(hhmm) {
  const mins = parseTimeToMinutes(hhmm);
  if (mins == null) return hhmm || '';
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Extracts the active schedule window for a booking, honoring admin time/duration adjustments
 * saved in student_details.schedule_adjustment (or participant_details.schedule_adjustment).
 */
export function getBookingTimeWindow(booking) {
  const adj = booking?.student_details?.schedule_adjustment || booking?.participant_details?.schedule_adjustment || null;
  const rawStart = adj?.start_time || booking?.preferred_time || '';
  const startMinutes = parseTimeToMinutes(rawStart);
  if (startMinutes == null) {
    return {
      startTime: '',
      endTime: '',
      startMinutes: null,
      endMinutes: null,
      durationMinutes: 60,
      isAdjusted: false,
      note: adj?.note || '',
    };
  }

  let endMinutes = adj?.end_time ? parseTimeToMinutes(adj.end_time) : null;
  if (endMinutes == null || endMinutes <= startMinutes) {
    const dur = Number(adj?.duration_minutes) > 0 ? Number(adj.duration_minutes) : 60;
    endMinutes = Math.min(23 * 60 + 59, startMinutes + dur);
  }

  const durationMinutes = Math.max(15, endMinutes - startMinutes);
  const isAdjusted = Boolean(
    adj && (
      adj.end_time ||
      (Number(adj.duration_minutes) && Number(adj.duration_minutes) !== 60) ||
      adj.note ||
      adj.updated_at
    )
  );

  return {
    startTime: minutesToHHMM(startMinutes),
    endTime: minutesToHHMM(endMinutes),
    startMinutes,
    endMinutes,
    durationMinutes,
    isAdjusted,
    note: adj?.note || '',
  };
}

/**
 * Returns all STUDIO_HOURLY_SLOTS keys overlapped by a booking's time window.
 */
export function getBookingOccupiedSlotKeys(booking) {
  const windowInfo = getBookingTimeWindow(booking);
  if (windowInfo.startMinutes == null || windowInfo.endMinutes == null) {
    const fallback = normalizeSlotTime(booking?.preferred_time);
    return fallback ? [fallback] : [];
  }
  const overlapped = [];
  for (const slot of STUDIO_HOURLY_SLOTS) {
    const [sh, sm] = slot.time.split(':').map(Number);
    const slotStart = sh * 60 + sm;
    const slotEnd = slotStart + 60;
    if (windowInfo.startMinutes < slotEnd && windowInfo.endMinutes > slotStart) {
      overlapped.push(slot.time);
    }
  }
  if (overlapped.length === 0) {
    const fallback = normalizeSlotTime(booking?.preferred_time);
    if (fallback) overlapped.push(fallback);
  }
  return overlapped;
}

/**
 * Reads local admin blocks from storage
 */
export function getLocalAdminBlocks() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BLOCKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Reads multi-day school bookings from storage
 */
export function getLocalMultiDayBookings() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MULTIDAY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Determines whether a booking order has been cancelled, rejected, declined, or deleted.
 * Handles both boolean flags (is_deleted, deleted_at) and various status casings
 * ('CANCELLED', 'cancelled', 'REJECTED', 'rejected', 'DECLINED', 'declined', 'DELETED', 'deleted').
 */
export function isOrderCancelledOrDeleted(booking) {
  if (!booking) return false;
  if (booking.is_deleted === true || booking.is_deleted === "true" || !!booking.deleted_at) {
    return true;
  }
  const st = String(booking.status || "").trim().toUpperCase();
  return ["CANCELLED", "CANCELED", "REJECTED", "DECLINED", "DELETED"].includes(st);
}

/**
 * Checks if a booking object constitutes a full-day block
 */
export function isFullDayBooking(b) {
  if (!b || isOrderCancelledOrDeleted(b)) return { isBlocked: false, reason: null };
  const notes = (b.notes || "").toLowerCase();
  const serviceSlug = (b.service_slug || b.service?.slug || "").toLowerCase();
  const serviceName = (b.service?.name || "").toLowerCase();
  const tierName = (b.tier_name || "").toLowerCase();

  // 1. School Section booking
  if (
    notes.includes("school section representative") ||
    notes.includes("[school_partner]") ||
    serviceSlug.includes("school") ||
    serviceName.includes("school") ||
    (b.participant_details && b.participant_details.booking_for === "school_section") ||
    (b.student_details && b.student_details.booking_mode === "SCHOOL_PARTNER")
  ) {
    return { isBlocked: true, reason: "School Batch Pictorial Session" };
  }

  // 2. Admin date blackout
  if (tierName === "admin_block" || notes.includes("[admin_block]")) {
    return { isBlocked: true, reason: b.notes || "Studio Maintenance / Reserved Date" };
  }

  return { isBlocked: false, reason: null };
}

/**
 * Fetches live availability for a single date
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {object} context - { isSchoolSection, serviceSlug }
 */
export async function fetchDateAvailability(dateStr, context = {}) {
  if (!dateStr) {
    return {
      date: dateStr,
      isFullDayBlocked: false,
      fullDayReason: null,
      bookedSlots: [],
      availableSlots: STUDIO_HOURLY_SLOTS.map(s => s.time),
      totalAvailable: STUDIO_HOURLY_SLOTS.length,
      totalSlots: STUDIO_HOURLY_SLOTS.length,
      isSchoolBatchDay: false,
      isWeddingDay: false,
    };
  }

  // 0. Weekdays-only check: Saturdays (6) and Sundays (0) are strictly unavailable
  const parsedDate = new Date(dateStr + "T00:00:00");
  const dayOfWeek = parsedDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      date: dateStr,
      isFullDayBlocked: true,
      fullDayReason: "Studio Closed (Weekdays Only: Mon-Fri)",
      bookedSlots: STUDIO_HOURLY_SLOTS.map(s => s.time),
      availableSlots: [],
      totalAvailable: 0,
      totalSlots: STUDIO_HOURLY_SLOTS.length,
      isSchoolBatchDay: false,
      isWeddingDay: false,
      isWeekendClosed: true,
    };
  }

  // 0b. Past date check & current day operating hours (8:00 AM - 5:00 PM)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dateStr < todayStr) {
    return {
      date: dateStr,
      isFullDayBlocked: true,
      fullDayReason: "Past Date Unavailable",
      bookedSlots: STUDIO_HOURLY_SLOTS.map(s => s.time),
      availableSlots: [],
      totalAvailable: 0,
      totalSlots: STUDIO_HOURLY_SLOTS.length,
      isSchoolBatchDay: false,
      isWeddingDay: false,
      isPastDate: true,
    };
  }

  if (dateStr === todayStr && now.getHours() >= 17) {
    return {
      date: dateStr,
      isFullDayBlocked: true,
      fullDayReason: "Studio Closed for Today (Hours: 8:00 AM - 5:00 PM)",
      bookedSlots: STUDIO_HOURLY_SLOTS.map(s => s.time),
      availableSlots: [],
      totalAvailable: 0,
      totalSlots: STUDIO_HOURLY_SLOTS.length,
      isSchoolBatchDay: false,
      isWeddingDay: false,
      isTodayClosed: true,
    };
  }

  // 1. Check local admin blocks for this date
  const localBlocks = getLocalAdminBlocks();
  const adminBlock = localBlocks.find(b => b.date === dateStr);
  if (adminBlock) {
    return {
      date: dateStr,
      isFullDayBlocked: true,
      fullDayReason: adminBlock.reason || "Studio Reserved / Unavailable",
      bookedSlots: STUDIO_HOURLY_SLOTS.map(s => s.time),
      availableSlots: [],
      totalAvailable: 0,
      totalSlots: STUDIO_HOURLY_SLOTS.length,
      isSchoolBatchDay: false,
      isWeddingDay: false,
    };
  }

  // 2. Check local multi-day school bookings spanning this date
  const multiDayList = getLocalMultiDayBookings();
  const activeMultiDay = multiDayList.find(m => {
    return dateStr >= m.startDate && dateStr <= m.endDate;
  });
  if (activeMultiDay) {
    return {
      date: dateStr,
      isFullDayBlocked: true,
      fullDayReason: `School Batch Pictorial (${activeMultiDay.schoolName || "Academic Partner"} · Day ${activeMultiDay.dayNumber || 1})`,
      bookedSlots: STUDIO_HOURLY_SLOTS.map(s => s.time),
      availableSlots: [],
      totalAvailable: 0,
      totalSlots: STUDIO_HOURLY_SLOTS.length,
      isSchoolBatchDay: true,
      isWeddingDay: false,
    };
  }

  // 3. Query Supabase active bookings for this date
  let dbBookings = [];
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_number,
          event_date,
          preferred_time,
          status,
          notes,
          tier_name,
          service_id,
          student_details,
          participant_details,
          service:services(id, name, slug)
        `)
        .eq("event_date", dateStr)
        .not("status", "in", '("CANCELLED","cancelled","CANCELED","canceled","REJECTED","rejected","DECLINED","declined","DELETED","deleted")')
        .or("is_deleted.is.null,is_deleted.eq.false");

      if (!error && data) {
        dbBookings = data.filter(b => !isOrderCancelledOrDeleted(b));
      }
    } catch (err) {
      console.warn("[LiveAvailability] Query error:", err);
    }
  }

  // 4. Analyze DB bookings for full-day locks, occupied time windows, & booked hourly slots
  let fullDayLock = null;
  const bookedSlotsSet = new Set();
  const bookedSlotDetails = {};
  const occupiedWindows = [];

  for (const b of dbBookings) {
    // If order was cancelled, rejected, or deleted by admin or user, skip it so the slot opens up
    if (isOrderCancelledOrDeleted(b)) continue;

    const fullCheck = isFullDayBooking(b);
    if (fullCheck.isBlocked) {
      fullDayLock = fullCheck.reason;
      break;
    }

    const win = getBookingTimeWindow(b);
    if (win.startMinutes != null && win.endMinutes != null) {
      occupiedWindows.push({
        id: b.id,
        booking_number: b.booking_number || '',
        startTime: win.startTime,
        endTime: win.endTime,
        startMinutes: win.startMinutes,
        endMinutes: win.endMinutes,
        durationMinutes: win.durationMinutes,
        isAdjusted: win.isAdjusted,
      });
    }

    // Hourly slot check (supports extended / adjusted multi-hour sessions)
    const occupiedKeys = getBookingOccupiedSlotKeys(b);
    for (const slotKey of occupiedKeys) {
      bookedSlotsSet.add(slotKey);
      bookedSlotDetails[slotKey] = {
        isBooked: true,
        isAdjusted: win.isAdjusted,
        windowLabel: win.startTime && win.endTime
          ? `${formatTime24To12(win.startTime)} – ${formatTime24To12(win.endTime)}`
          : null,
      };
    }
  }

  if (fullDayLock) {
    return {
      date: dateStr,
      isFullDayBlocked: true,
      fullDayReason: fullDayLock,
      bookedSlots: STUDIO_HOURLY_SLOTS.map(s => s.time),
      bookedSlotDetails,
      occupiedWindows,
      availableSlots: [],
      totalAvailable: 0,
      totalSlots: STUDIO_HOURLY_SLOTS.length,
      isSchoolBatchDay: fullDayLock.toLowerCase().includes("school"),
      isWeddingDay: false,
    };
  }

  const bookedSlots = Array.from(bookedSlotsSet);
  const availableSlots = STUDIO_HOURLY_SLOTS
    .map(s => s.time)
    .filter(time => !bookedSlotsSet.has(time));

  return {
    date: dateStr,
    isFullDayBlocked: false,
    fullDayReason: null,
    bookedSlots,
    bookedSlotDetails,
    occupiedWindows,
    availableSlots,
    totalAvailable: availableSlots.length,
    totalSlots: STUDIO_HOURLY_SLOTS.length,
    isSchoolBatchDay: false,
    isWeddingDay: false,
  };
}

/**
 * Synchronous interval-overlap check against preloaded bookings or occupiedWindows on a date.
 */
export function findTimeWindowOverlap({
  dateStr,
  startTime,
  endTime = null,
  durationMinutes = 60,
  excludeBookingId = null,
  bookingsOrWindows = [],
}) {
  if (!dateStr) return { hasConflict: false, conflictType: null, reason: null };

  const adminBlock = getLocalAdminBlocks().find((b) => b.date === dateStr);
  if (adminBlock) {
    return {
      hasConflict: true,
      conflictType: 'blackout',
      reason: `Date ${dateStr} is blacked out (${adminBlock.reason || 'Studio Maintenance'}).`,
    };
  }

  const multiDay = getLocalMultiDayBookings().find(
    (m) => dateStr >= m.startDate && dateStr <= m.endDate
  );
  if (multiDay) {
    return {
      hasConflict: true,
      conflictType: 'full_day',
      reason: `Date ${dateStr} is reserved for School Batch (${multiDay.schoolName || 'Partner Campus'}).`,
    };
  }

  const reqStart = parseTimeToMinutes(startTime);
  if (reqStart == null) {
    return { hasConflict: false, conflictType: null, reason: null };
  }

  let reqEnd = endTime ? parseTimeToMinutes(endTime) : null;
  if (reqEnd == null || reqEnd <= reqStart) {
    reqEnd = reqStart + (Number(durationMinutes) > 0 ? Number(durationMinutes) : 60);
  }

  for (const item of bookingsOrWindows || []) {
    if (!item) continue;
    if (excludeBookingId && item.id === excludeBookingId) continue;

    // Support both raw booking records and pre-extracted occupiedWindow objects
    const isWindowObj = typeof item.startMinutes === 'number' && typeof item.endMinutes === 'number';
    if (!isWindowObj) {
      if (isOrderCancelledOrDeleted(item)) continue;
      const itemDate = item.event_date ? String(item.event_date).split('T')[0] : '';
      if (itemDate && itemDate !== dateStr) continue;
      const fullCheck = isFullDayBooking(item);
      if (fullCheck.isBlocked) {
        return {
          hasConflict: true,
          conflictType: 'full_day',
          conflictingBooking: item,
          reason: fullCheck.reason || 'This date has a full-day reservation.',
        };
      }
    }

    const win = isWindowObj ? item : getBookingTimeWindow(item);
    if (win.startMinutes == null || win.endMinutes == null) continue;

    if (reqStart < win.endMinutes && reqEnd > win.startMinutes) {
      const ref = item.booking_number ? `#${item.booking_number}` : 'an existing booking';
      return {
        hasConflict: true,
        conflictType: 'time_overlap',
        conflictingBooking: item,
        window: win,
        reason: `Time conflicts with ${ref} (${formatTime24To12(win.startTime)} – ${formatTime24To12(win.endTime)}) and cannot be booked.`,
      };
    }
  }

  return { hasConflict: false, conflictType: null, reason: null };
}

/**
 * Queries active non-cancelled/non-deleted bookings on a specific date regardless of past/weekend cutoff.
 */
export async function fetchDateBookingRecords(dateStr) {
  if (!dateStr || !isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, booking_number, customer_id, event_date, preferred_time, status, notes, tier_name, service_id, student_details, participant_details, service:services(id, name, slug)')
      .eq('event_date', dateStr)
      .not('status', 'in', '("CANCELLED","cancelled","CANCELED","canceled","REJECTED","rejected","DECLINED","declined","DELETED","deleted")')
      .or('is_deleted.is.null,is_deleted.eq.false');

    if (!error && Array.isArray(data)) {
      return data.filter((b) => !isOrderCancelledOrDeleted(b));
    }
  } catch (err) {
    console.warn('[LiveAvailability] Booking records query error:', err);
  }
  return [];
}

export const MAX_SAME_DAY_ADJUSTMENT_MINUTES = 180;

/**
 * Plans within-the-day schedule reorganization when adjusting a booking's duration/time (up to 3 hrs).
 * Any existing bookings overlapped by the new window are automatically assigned into the next available
 * studio bay slots on the same date without colliding with unaffected bookings.
 */
export function planDayReorganization({
  targetBooking,
  startTime,
  endTime,
  dayBookings = [],
}) {
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  if (startMins == null || endMins == null || endMins <= startMins) {
    return {
      isValid: false,
      durationMinutes: 0,
      maxMinutes: MAX_SAME_DAY_ADJUSTMENT_MINUTES,
      exceedsMaxHours: false,
      affected: [],
      reorganized: [],
      unplaced: [],
    };
  }

  const durationMinutes = endMins - startMins;
  const exceedsMaxHours = durationMinutes > MAX_SAME_DAY_ADJUSTMENT_MINUTES;

  const otherBookings = (dayBookings || []).filter(
    (b) => b && b.id !== targetBooking?.id && !isOrderCancelledOrDeleted(b) && !isFullDayBooking(b).isBlocked
  );

  const affected = [];
  const occupiedIntervals = [{ start: startMins, end: endMins }];

  for (const b of otherBookings) {
    const ow = getBookingTimeWindow(b);
    if (ow.startMinutes == null || ow.endMinutes == null) continue;
    if (startMins < ow.endMinutes && endMins > ow.startMinutes) {
      affected.push({ booking: b, oldWindow: ow });
    } else {
      occupiedIntervals.push({ start: ow.startMinutes, end: ow.endMinutes });
    }
  }

  affected.sort((a, b) => a.oldWindow.startMinutes - b.oldWindow.startMinutes);

  // Build ordered candidate start minutes within studio operating day (prefer after adjusted end, then earlier open bays)
  const slotStarts = STUDIO_HOURLY_SLOTS.map((s) => {
    const [h, m] = s.time.split(':').map(Number);
    return h * 60 + m;
  });
  const candidateStarts = [
    ...slotStarts.filter((m) => m >= endMins),
    ...slotStarts.filter((m) => m < startMins),
  ];

  const reorganized = [];
  const unplaced = [];

  for (const { booking: affBooking, oldWindow } of affected) {
    const dur = Math.min(
      MAX_SAME_DAY_ADJUSTMENT_MINUTES,
      Math.max(30, oldWindow.durationMinutes || 60)
    );

    let chosenStart = null;
    for (const candStart of candidateStarts) {
      const candEnd = candStart + dur;
      if (candEnd > 17 * 60) continue; // Keep within 5:00 PM studio hours
      if (candStart < 12 * 60 && candEnd > 12 * 60 && candStart !== 12 * 60) continue; // Avoid crossing 12-1 PM lunch break
      const overlaps = occupiedIntervals.some(
        (iv) => candStart < iv.end && candEnd > iv.start
      );
      if (!overlaps) {
        chosenStart = candStart;
        break;
      }
    }

    if (chosenStart != null) {
      const chosenEnd = chosenStart + dur;
      occupiedIntervals.push({ start: chosenStart, end: chosenEnd });
      reorganized.push({
        booking: affBooking,
        oldWindow,
        newStartTime: minutesToHHMM(chosenStart),
        newEndTime: minutesToHHMM(chosenEnd),
        durationMinutes: dur,
      });
    } else {
      unplaced.push({ booking: affBooking, oldWindow, durationMinutes: dur });
    }
  }

  return {
    isValid: !exceedsMaxHours && unplaced.length === 0,
    durationMinutes,
    maxMinutes: MAX_SAME_DAY_ADJUSTMENT_MINUTES,
    exceedsMaxHours,
    affected,
    reorganized,
    unplaced,
  };
}

/**
 * Fetches occupied booking time windows for a specific date (regardless of past/weekend cutoff)
 * and checks whether a requested time window conflicts with any existing booking or blackout.
 */
export async function checkBookingTimeConflict({
  dateStr,
  startTime,
  endTime = null,
  durationMinutes = 60,
  excludeBookingId = null,
  existingBookings = null,
}) {
  if (!dateStr) return { hasConflict: false, conflictType: null, reason: null };

  const records = Array.isArray(existingBookings)
    ? existingBookings
    : await fetchDateBookingRecords(dateStr);

  return findTimeWindowOverlap({
    dateStr,
    startTime,
    endTime,
    durationMinutes,
    excludeBookingId,
    bookingsOrWindows: records || [],
  });
}

/**
 * Fetches a map of all full-day blocked dates for an entire month
 * @param {number} year 
 * @param {number} month (0-indexed, 0 = Jan, 11 = Dec)
 */
export async function fetchMonthBlockoutMap(year, month) {
  const blockMap = {};

  // 0. Automatically mark all weekends (Saturdays & Sundays) and past dates as unavailable
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dObj = new Date(year, month, d);
    const dow = dObj.getDay();
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    if (dow === 0 || dow === 6) {
      blockMap[dStr] = {
        isFullDayBlocked: true,
        reason: "Studio Closed (Weekdays Only: Mon-Fri)",
      };
    } else if (dStr < todayStr) {
      blockMap[dStr] = {
        isFullDayBlocked: true,
        reason: "Past Date Unavailable",
      };
    } else if (dStr === todayStr && now.getHours() >= 17) {
      blockMap[dStr] = {
        isFullDayBlocked: true,
        reason: "Studio Closed for Today (Hours: 8:00 AM - 5:00 PM)",
      };
    }
  }

  // 1. Local admin date blocks
  const localBlocks = getLocalAdminBlocks();
  for (const b of localBlocks) {
    if (b.date) {
      blockMap[b.date] = { isFullDayBlocked: true, reason: b.reason || "Studio Unavailable" };
    }
  }

  // 2. Multi-day school batch spans
  const multiDayList = getLocalMultiDayBookings();
  for (const m of multiDayList) {
    if (m.startDate && m.endDate) {
      let cur = new Date(m.startDate + "T00:00:00");
      const end = new Date(m.endDate + "T00:00:00");
      while (cur <= end) {
        const dStr = cur.toISOString().split("T")[0];
        blockMap[dStr] = {
          isFullDayBlocked: true,
          reason: `School Batch Pictorial (${m.schoolName || "Partner Campus"})`
        };
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  // 3. Supabase active bookings for month range
  if (isSupabaseConfigured && supabase) {
    try {
      const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          event_date,
          preferred_time,
          status,
          notes,
          tier_name,
          student_details,
          participant_details,
          service:services(id, name, slug)
        `)
        .gte("event_date", startStr)
        .lte("event_date", endStr)
        .not("status", "in", '("CANCELLED","cancelled","CANCELED","canceled","REJECTED","rejected","DECLINED","declined","DELETED","deleted")')
        .or("is_deleted.is.null,is_deleted.eq.false");

      if (!error && data) {
        // Group active, non-cancelled bookings by date
        const dateGroups = {};
        for (const b of data) {
          if (isOrderCancelledOrDeleted(b)) continue;
          const d = b.event_date;
          if (!dateGroups[d]) dateGroups[d] = [];
          dateGroups[d].push(b);
        }

        for (const [dStr, list] of Object.entries(dateGroups)) {
          // Check full-day booking
          const fullBooking = list.find(b => isFullDayBooking(b).isBlocked);
          if (fullBooking) {
            blockMap[dStr] = {
              isFullDayBlocked: true,
              reason: isFullDayBooking(fullBooking).reason
            };
            continue;
          }

          // Check if all 8 slots are occupied
          const slotSet = new Set();
          for (const b of list) {
            const occupiedKeys = getBookingOccupiedSlotKeys(b);
            for (const slotKey of occupiedKeys) {
              slotSet.add(slotKey);
            }
          }
          if (slotSet.size >= STUDIO_HOURLY_SLOTS.length) {
            blockMap[dStr] = {
              isFullDayBlocked: true,
              reason: "All Studio Camera Bay Slots Booked"
            };
          }
        }
      }
    } catch (err) {
      console.warn("[MonthBlockoutMap] Query error:", err);
    }
  }

  return blockMap;
}

/**
 * Admin action: Extend a School Batch Pictorial to 2 or more days
 */
export function adminSetSchoolBatchMultiDay({ bookingId, schoolName, startDate, daysCount = 2, note = "" }) {
  if (!startDate || daysCount < 1) return;
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + (daysCount - 1));
  const endDate = end.toISOString().split("T")[0];

  const currentList = getLocalMultiDayBookings();
  const filtered = currentList.filter(m => m.bookingId !== bookingId);

  filtered.push({
    bookingId: bookingId || `batch-${Date.now()}`,
    schoolName: schoolName || "Academic Partner School",
    startDate,
    endDate,
    daysCount,
    note,
    updatedAt: new Date().toISOString()
  });

  try {
    localStorage.setItem(LOCAL_STORAGE_MULTIDAY_KEY, JSON.stringify(filtered));
  } catch { }

  broadcastAvailabilityChange();
}

/**
 * Admin action: Block a specific date or time slot
 */
export function adminBlockDate(dateStr, reason = "Studio Blackout / Maintenance") {
  if (!dateStr) return;
  const current = getLocalAdminBlocks();
  const filtered = current.filter(b => b.date !== dateStr);
  filtered.push({
    date: dateStr,
    reason,
    blockedAt: new Date().toISOString()
  });

  try {
    localStorage.setItem(LOCAL_STORAGE_BLOCKS_KEY, JSON.stringify(filtered));
  } catch { }

  broadcastAvailabilityChange();
}

/**
 * Admin action: Unblock a date
 */
export function adminUnblockDate(dateStr) {
  if (!dateStr) return;
  const current = getLocalAdminBlocks();
  const filtered = current.filter(b => b.date !== dateStr);
  try {
    localStorage.setItem(LOCAL_STORAGE_BLOCKS_KEY, JSON.stringify(filtered));
  } catch { }

  // Also remove from multi-day list if matching startDate
  const multiDayList = getLocalMultiDayBookings();
  const filteredMulti = multiDayList.filter(m => m.startDate !== dateStr);
  try {
    localStorage.setItem(LOCAL_STORAGE_MULTIDAY_KEY, JSON.stringify(filteredMulti));
  } catch { }

  broadcastAvailabilityChange();
}

/**
 * Broadcasts an event to notify all components that availability changed
 */
export function broadcastAvailabilityChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ekodak_availability_updated"));
  }
}

/**
 * Subscribes to live availability updates
 */
export function subscribeToAvailabilityUpdates(callback) {
  if (typeof window === "undefined") return () => { };
  const handler = () => callback();
  window.addEventListener("ekodak_availability_updated", handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener("ekodak_availability_updated", handler);
    window.removeEventListener("storage", handler);
  };
}

