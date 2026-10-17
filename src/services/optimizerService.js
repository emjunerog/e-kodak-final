/**
 * optimizerService
 * ----------------
 * Optional bridge to the OR-Tools (CP-SAT) solver in /optimizer.
 * If VITE_OPTIMIZER_URL is unset, or the solver is slow/unreachable/returns
 * nothing, we transparently fall back to the built-in JS heuristic so the
 * reschedule flow never breaks.
 */
import { findOptimalRescheduleSlots, checkPhilippineHoliday } from './photographerService';

const OPTIMIZER_URL = (import.meta.env.VITE_OPTIMIZER_URL || '').replace(/\/$/, '');
const TIMEOUT_MS = 4000;

function buildHolidayMap(booking, daysToScan) {
  const map = {};
  const base = booking?.event_date ? new Date(booking.event_date) : new Date();
  for (let i = 1; i <= daysToScan; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const name = checkPhilippineHoliday(d.getFullYear(), d.getMonth(), d.getDate());
    if (name) map[d.toISOString().split('T')[0]] = name;
  }
  return map;
}

export async function getSmartRescheduleSlots(params) {
  const fallback = () => findOptimalRescheduleSlots(params) || [];
  if (!OPTIMIZER_URL) return fallback();

  try {
    const daysToScan = params.daysToScan || 28;
    const res = await fetch(`${OPTIMIZER_URL}/reschedule-slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking: params.booking,
        allBookings: params.allBookings || [],
        availabilityList: params.availabilityList || [],
        holidays: buildHolidayMap(params.booking, daysToScan),
        daysToScan,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Optimizer HTTP ${res.status}`);
    const slots = await res.json();
    return Array.isArray(slots) && slots.length ? slots : fallback();
  } catch (err) {
    console.warn('[optimizer] OR-Tools unavailable, using built-in scheduler:', err?.message || err);
    return fallback();
  }
}
