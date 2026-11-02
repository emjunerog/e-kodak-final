import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getAvailability,
  setAvailability,
  setBatchAvailability,
  getAssignedBookings,
  toggleGeneralAvailability,
  getPhotographerProfileData,
  aiAutoRescheduleBooking,
  clearMonthAvailability,
  clearAllPhotographerAvailability,
  getStudioTeamAvailabilityForDate,
  normalizeDateStr,
  recordPhotographerActivity,
} from '../../services/photographerService';
import { getSmartRescheduleSlots } from '../../services/optimizerService';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Camera,
  Clock,
  Sparkles,
  Info,
  Bot,
  ArrowRight,
  CalendarDays,
  Ban,
  Briefcase,
  RotateCcw,
  Users,
  Wand2,
  Star,
  X,
  CalendarRange,
  Undo2,
  ChevronDown,
} from 'lucide-react';
import Toast from '../../components/ui/Toast';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CategorizedMetricStrip from '../../components/admin/CategorizedMetricStrip';
import StudioAiAssistantHub from '../../components/photographer/StudioAiAssistantHub';

/* ── time helpers ─────────────────────────────────────────── */
function extractTimeHM(t, defaultVal = '08:00') {
  if (!t) return defaultVal;
  const parts = String(t).trim().split(':');
  if (parts.length < 2) return defaultVal;
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  return `${h}:${m}`;
}

function formatTime12Hour(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = String(timeStr).slice(0, 5).split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (Number.isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}
function formatTime12Compact(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = String(timeStr).slice(0, 5).split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (Number.isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return m === '00' ? `${h} ${ampm}` : `${h}:${m} ${ampm}`;
}
const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => toISODate(new Date());

function getPhilippineHoliday(year, month0, day) {
  const m = month0 + 1;
  const mmdd = `${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const fixed = {
    '01-01': 'New Year’s Day', '04-09': 'Day of Valor', '05-01': 'Labor Day',
    '06-12': 'Independence Day', '08-21': 'Ninoy Aquino Day', '11-01': 'All Saints’ Day',
    '11-30': 'Bonifacio Day', '12-08': 'Immaculate Conception', '12-24': 'Christmas Eve',
    '12-25': 'Christmas Day', '12-30': 'Rizal Day', '12-31': 'New Year’s Eve',
  };
  if (fixed[mmdd]) return { name: fixed[mmdd] };
  if (m === 8) {
    const d = new Date(year, 7, day);
    if (d.getDay() === 1 && day >= 25) return { name: 'Heroes Day' };
  }
  if (year === 2026) {
    if (mmdd === '04-02') return { name: 'Maundy Thursday' };
    if (mmdd === '04-03') return { name: 'Good Friday' };
    if (mmdd === '04-04') return { name: 'Black Saturday' };
  }
  return null;
}

const FULL_START = '08:00';
const FULL_END = '17:00';
const isWeekendDay = (dateStr) => {
  const dow = new Date(`${dateStr}T00:00:00`).getDay();
  return dow === 0 || dow === 6;
};

function getDatesInRange(a, b) {
  const out = [];
  const curr = new Date(`${a}T00:00:00`);
  const end = new Date(`${b}T00:00:00`);
  while (curr <= end) {
    out.push(toISODate(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return out;
}

function getQuickRange(preset, baseDateStr = todayStr()) {
  const base = new Date(`${baseDateStr || todayStr()}T00:00:00`);
  if (preset === 'week-7') {
    const end = new Date(base);
    end.setDate(end.getDate() + 6);
    return { start: toISODate(base), end: toISODate(end) };
  }
  if (preset === 'this-week') {
    const d = new Date(base);
    const day = d.getDay(); // 0 is Sun, 1 is Mon
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: toISODate(mon), end: toISODate(sun) };
  }
  if (preset === 'next-week') {
    const d = new Date(base);
    const day = d.getDay();
    const diffToNextMon = day === 0 ? 1 : 8 - day;
    const nextMon = new Date(d);
    nextMon.setDate(d.getDate() + diffToNextMon);
    const nextSun = new Date(nextMon);
    nextSun.setDate(nextMon.getDate() + 6);
    return { start: toISODate(nextMon), end: toISODate(nextSun) };
  }
  if (preset === 'days-14') {
    const end = new Date(base);
    end.setDate(end.getDate() + 13);
    return { start: toISODate(base), end: toISODate(end) };
  }
  return null;
}

/* Resolve effective schedule for a date from saved records + weekend rule */
function getDaySchedule(dateStr, availabilityList) {
  const record = (availabilityList || []).find(
    (r) => normalizeDateStr(r.availability_date) === dateStr || normalizeDateStr(r.date) === dateStr
  );
  if (record) {
    const st = String(record.status || '').toUpperCase();
    const isOff = st === 'UNAVAILABLE' || st === 'BLOCKED' || record.is_available === false;
    if (isOff) return { status: 'off', startTime: FULL_START, endTime: FULL_END, notes: record.notes || '', source: 'you', isSaved: true, scheduledLabel: 'Off-duty Scheduled', record };
    const s = record.start_time ? extractTimeHM(record.start_time, FULL_START) : FULL_START;
    const e = record.end_time ? extractTimeHM(record.end_time, FULL_END) : FULL_END;
    const isFullDay = s === FULL_START && e === FULL_END;
    if (!isFullDay && (st === 'CUSTOM' || s !== FULL_START || e !== FULL_END))
      return { status: 'partial', startTime: s, endTime: e, notes: record.notes || '', source: 'you', isSaved: true, scheduledLabel: 'Partial Scheduled', record };
    return { status: 'available', startTime: FULL_START, endTime: FULL_END, notes: record.notes || '', source: 'you', isSaved: true, scheduledLabel: 'Scheduled Available', record };
  }
  if (isWeekendDay(dateStr))
    return { status: 'off', startTime: FULL_START, endTime: FULL_END, notes: '', source: 'weekend rule', isSaved: false, scheduledLabel: null, record: null };
  return { status: 'available', startTime: FULL_START, endTime: FULL_END, notes: '', source: 'Mon–Fri rule', isSaved: false, scheduledLabel: null, record: null };
}

function findConflicts(bookings, daySchedule) {
  const active = (bookings || []).filter((b) => b?.event_date && !['CANCELLED', 'DECLINED'].includes(b.status));
  const list = [];
  if (daySchedule.status === 'off') {
    active.forEach((b) =>
      list.push({ id: `off-${b.id}`, booking: b, description: `Shoot #${b.booking_number} on off-duty day.` })
    );
    return list;
  }
  active.forEach((b) => {
    const t = b.preferred_time ? String(b.preferred_time).slice(0, 5) : null;
    if (t && (t < daySchedule.startTime || t > daySchedule.endTime)) {
      list.push({ id: `hrs-${b.id}`, booking: b, description: `Shoot #${b.booking_number} (${formatTime12Hour(t)}) outside your hours.` });
    }
  });
  const byTime = {};
  active.forEach((b) => {
    const t = b.preferred_time ? String(b.preferred_time).slice(0, 5) : 'flex';
    (byTime[t] = byTime[t] || []).push(b);
  });
  Object.entries(byTime).forEach(([t, arr]) => {
    if (t !== 'flex' && arr.length > 1)
      list.push({ id: `dbl-${t}`, booking: arr[0], description: `Double-booked at ${formatTime12Hour(t)} (${arr.length} shoots).` });
  });
  return list;
}

const STATUS_META = {
  available: { label: 'Available', pill: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  partial: { label: 'Partial', pill: 'bg-amber-100 text-amber-900 border-amber-200', dot: 'bg-amber-400' },
  off: { label: 'Off-duty', pill: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500' },
};
const FULLY_BOOKED_THRESHOLD = 3;

export default function PhotographerAvailability() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const queryDate = searchParams.get('date');
  const queryConfirmed = searchParams.get('confirmed');

  const [currentDate, setCurrentDate] = useState(() => {
    if (queryDate) {
      const parsed = new Date(queryDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });
  const [availability, setAvailabilityState] = useState([]);
  const [bookedShoots, setBookedShoots] = useState([]);
  const [generalAvailable, setGeneralAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingGeneral, setTogglingGeneral] = useState(false);
  const [toast, setToast] = useState(null);

  const [selectedDate, setSelectedDate] = useState(() => {
    if (queryDate) return normalizeDateStr(queryDate);
    return todayStr();
  });
  const [draft, setDraft] = useState({ status: 'available', startTime: FULL_START, endTime: FULL_END, notes: '' });
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);

  const [teamCoverage, setTeamCoverage] = useState([]);
  const [_loadingTeam, setLoadingTeam] = useState(false);
  const [history, setHistory] = useState([]);
  const [_aiFeedback, setAiFeedback] = useState(null);


  const [legendOpen, setLegendOpen] = useState(false);
  const legendRef = React.useRef(null);
  const [rangeDropdownOpen, setRangeDropdownOpen] = useState(false);
  const rangeDropdownRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (legendRef.current && !legendRef.current.contains(e.target)) {
        setLegendOpen(false);
      }
      if (rangeDropdownRef.current && !rangeDropdownRef.current.contains(e.target)) {
        setRangeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (queryDate && queryConfirmed) {
      setToast({
        type: 'success',
        message: `Schedule confirmed: ${queryDate} availability updated successfully!`,
      });
    }
  }, [queryDate, queryConfirmed]);

  // AI reschedule modal (previously dead — now actually wired)
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiStep, setAiStep] = useState('ASK');
  const [activeConflict, setActiveConflict] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('09:00');
  const [rescheduleReason, setRescheduleReason] = useState('Photographer schedule blocked');
  const [executingAi, setExecutingAi] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);
  const isoOf = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  /* ── data loading ─────────────────────────────────────── */
  const loadTeamCoverage = useCallback(async (dateStr) => {
    if (!dateStr) return;
    setLoadingTeam(true);
    try {
      const { data } = await getStudioTeamAvailabilityForDate(dateStr);
      setTeamCoverage(data || []);
    } catch (e) {
      console.warn('team coverage:', e?.message);
    } finally {
      setLoadingTeam(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [availRes, bookingsRes, profileRes] = await Promise.all([
        getAvailability(user.id, month + 1, year),
        getAssignedBookings(user.id),
        getPhotographerProfileData(user.id),
      ]);
      const rawRows = (availRes.data || []).filter((a) => a.notes !== 'All days set available');
      // Deduplicate rows by normalized date (guarantee clean, zero duplicate records in state)
      const seenDates = new Set();
      const uniqueRows = [];
      for (const r of rawRows) {
        const d = normalizeDateStr(r.availability_date || r.date);
        if (d && !seenDates.has(d)) {
          seenDates.add(d);
          uniqueRows.push({
            ...r,
            availability_date: d,
            date: d,
          });
        }
      }
      setAvailabilityState(uniqueRows);

      // Deduplicate bookings by ID
      const seenBookings = new Set();
      const uniqueBookings = [];
      for (const b of (bookingsRes.data || [])) {
        if (b?.id && !seenBookings.has(b.id)) {
          seenBookings.add(b.id);
          uniqueBookings.push(b);
        }
      }
      setBookedShoots(uniqueBookings);

      if (profileRes.data) setGeneralAvailable(profileRes.data.is_available ?? true);
      const sched = getDaySchedule(selectedDate, uniqueRows);
      setDraft({ status: sched.status, startTime: sched.startTime, endTime: sched.endTime, notes: sched.status === 'available' ? 'Scheduled Available' : sched.notes });
      loadTeamCoverage(selectedDate);
    } catch (err) {
      console.error('availability load:', err);
      setToast({ type: 'error', message: 'Could not load your schedule. Please refresh.' });
    } finally {
      setLoading(false);
    }
  }, [user?.id, month, year, selectedDate, loadTeamCoverage]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  // recent changes from local cache (DB log is best-effort)
  useEffect(() => {
    if (!user?.id) return;
    try {
      const local = JSON.parse(localStorage.getItem(`ekodak_photographer_recent_changes_${user.id}`) || '[]');
      setHistory(local.slice(0, 5));
    } catch { /* ignore */ }
  }, [user?.id]);

  const logActivity = async ({ label, description, details }) => {
    if (!user?.id) return;
    const name = `${user.first_name || profile?.first_name || ''} ${user.last_name || profile?.last_name || ''}`.trim() || user.email || 'Photographer';
    await recordPhotographerActivity({
      photographerId: user.id,
      photographerName: name,
      actionType: 'PHOTOGRAPHER_AVAILABILITY',
      entityType: 'photographer_availability',
      entityId: user.id,
      entityLabel: label,
      description,
      details,
    });
    try {
      const key = `ekodak_photographer_recent_changes_${user.id}`;
      const cache = JSON.parse(localStorage.getItem(key) || '[]');
      setHistory(cache.slice(0, 5));
    } catch {}
  };

  /* ── derived ──────────────────────────────────────────── */
  const shootsByDate = useMemo(() => {
    const map = {};
    bookedShoots.forEach((b) => {
      if (!b.event_date || ['CANCELLED', 'DECLINED', 'COMPLETED'].includes(b.status)) return;
      const d = normalizeDateStr(b.event_date);
      (map[d] = map[d] || []).push(b);
    });
    return map;
  }, [bookedShoots]);

  const conflicts = useMemo(() => {
    const out = [];
    Object.entries(shootsByDate).forEach(([dateStr, shoots]) => {
      findConflicts(shoots, getDaySchedule(dateStr, availability)).forEach((c) => {
        if (!out.some((x) => x.booking?.id === c.booking?.id)) out.push(c);
      });
    });
    return out;
  }, [shootsByDate, availability]);

  const metrics = useMemo(() => {
    let avail = 0, blocked = 0, sessions = 0, scheduledDays = 0;
    daysArray.forEach((d) => {
      const ds = isoOf(d);
      const sched = getDaySchedule(ds, availability);
      if ((shootsByDate[ds] || []).length) sessions += 1;
      // Only count days that the photographer has explicitly set / saved
      if (sched.isSaved) {
        scheduledDays += 1;
        if (sched.status === 'off') {
          blocked += 1;
        } else {
          avail += 1;
        }
      }
    });
    return { avail, blocked, sessions, conflicts: conflicts.length, scheduledDays };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysArray, shootsByDate, availability, conflicts.length, year, month]);

  const workload = useMemo(() => {
    let assigned = 0, openLeft = 0;
    let busiest = null;
    const venues = {};
    daysArray.forEach((d) => {
      const ds = isoOf(d);
      const shoots = shootsByDate[ds] || [];
      assigned += shoots.length;
      if (shoots.length > (busiest?.count || 0)) busiest = { date: ds, count: shoots.length };
      const sched = getDaySchedule(ds, availability);
      // Only count open capacity on dates explicitly scheduled by the photographer as available
      if (!shoots.length && sched.isSaved && sched.status !== 'off' && ds >= todayStr()) openLeft += 1;
      shoots.forEach((s) => {
        const v = (s.location || '').trim() || 'Venue TBD';
        venues[v] = (venues[v] || 0) + 1;
      });
    });
    const venueEntries = Object.entries(venues).sort((a, b) => b[1] - a[1]);
    return {
      assigned,
      openLeft,
      busiest: busiest && busiest.count > 0 ? busiest : null,
      topVenue: venueEntries[0] || null,
      underusedVenue: venueEntries.length > 1 ? venueEntries[venueEntries.length - 1] : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysArray, shootsByDate, availability, year, month]);

  const selectedShoots = shootsByDate[selectedDate] || [];
  const selectedSched = getDaySchedule(selectedDate, availability);
  const selectedConflicts = findConflicts(selectedShoots, selectedSched);
  const isPastSelected = selectedDate < todayStr();
  const inRange = (ds) => rangeStart && rangeEnd && ds >= rangeStart && ds <= rangeEnd;
  const rangeDates = rangeStart && rangeEnd ? getDatesInRange(rangeStart, rangeEnd) : [];

  const handleQuickRangePreset = (preset, baseDateStr = null) => {
    const base = baseDateStr || rangeStart || selectedDate || todayStr();
    const res = getQuickRange(preset, base);
    if (res) {
      setRangeMode(true);
      setRangeStart(res.start);
      setRangeEnd(res.end);
      setSelectedDate(res.start);
      const s = getDaySchedule(res.start, availability);
      const isAvail = s.status === 'available';
      setDraft({
        date: res.start,
        status: s.status,
        startTime: isAvail ? FULL_START : s.startTime,
        endTime: isAvail ? FULL_END : s.endTime,
        notes: isAvail ? 'Full Day Available' : s.notes,
        slots: isAvail ? ['am', 'pm'] : s.status === 'partial' ? ['am'] : [],
      });
      setAiFeedback({
        type: 'info',
        text: `Selected ${preset === 'week-7' ? '1 Week (7 Days)' : preset === 'this-week' ? 'This Week' : 'Next Week'}: ${res.start} to ${res.end}.`,
      });
    }
  };

  const pickDay = (day) => {
    const ds = isoOf(day);
    setSelectedDate(ds);
    const s = getDaySchedule(ds, availability);
    const isAvail = s.status === 'available';
    setDraft({
      date: ds,
      status: s.status,
      startTime: isAvail ? FULL_START : s.startTime,
      endTime: isAvail ? FULL_END : s.endTime,
      notes: isAvail ? 'Full Day Available' : s.notes,
      slots: isAvail ? ['am', 'pm'] : s.status === 'partial' ? ['am'] : [],
    });
    setAiFeedback(null);
    if (rangeMode) {
      if (!rangeStart) {
        setRangeStart(ds);
        setRangeEnd(null);
      } else if (!rangeEnd) {
        if (ds === rangeStart) {
          setRangeEnd(ds);
        } else {
          const [a, b] = rangeStart <= ds ? [rangeStart, ds] : [ds, rangeStart];
          setRangeStart(a);
          setRangeEnd(b);
        }
      } else {
        // Range was already fully set; start a new range from clicked date
        setRangeStart(ds);
        setRangeEnd(null);
      }
    } else {
      loadTeamCoverage(ds);
    }
  };

  /* ── mutations ────────────────────────────────────────── */
  const persistOne = async (dateStr, uiStatus, start, end, notes) => {
    const isAvail = uiStatus === 'available';
    const isOff = uiStatus === 'off';
    const dbStatus = isOff ? 'UNAVAILABLE' : isAvail ? 'AVAILABLE' : 'CUSTOM';
    const s = isAvail ? FULL_START : (start || FULL_START);
    const e = isAvail ? FULL_END : (end || FULL_END);
    const note = isAvail ? 'Full Day Available' : isOff ? 'Off-duty / Blocked' : (notes && !notes.includes('Full Day') ? notes : `Custom hours: ${formatTime12Hour(s)} – ${formatTime12Hour(e)}`);
    if (s >= e) throw new Error('Start time must be before end time.');
    return setAvailability({ photographer_id: user.id, date: dateStr, is_available: !isOff, status: dbStatus, start_time: s, end_time: e, notes: note });
  };

  const optimisticUpsert = (dates, uiStatus, start, end, notes) => {
    setAvailabilityState((prev) => {
      const uniqueDates = Array.from(new Set((dates || []).map(normalizeDateStr))).filter(Boolean);
      const keep = prev.filter((a) => {
        const d = normalizeDateStr(a.availability_date || a.date);
        return !uniqueDates.includes(d);
      });
      const isAvail = uiStatus === 'available';
      const isOff = uiStatus === 'off';
      const s = isAvail ? FULL_START : (start || FULL_START);
      const e = isAvail ? FULL_END : (end || FULL_END);
      const note = isAvail ? 'Full Day Available' : isOff ? 'Off-duty / Blocked' : notes;
      const rows = uniqueDates.map((d) => ({
        photographer_id: user?.id,
        availability_date: d,
        date: d,
        is_available: !isOff,
        status: isOff ? 'UNAVAILABLE' : isAvail ? 'AVAILABLE' : 'CUSTOM',
        start_time: `${s}:00`,
        end_time: `${e}:00`,
        notes: note,
      }));
      const merged = [...keep, ...rows];
      const seen = new Set();
      const deduped = [];
      for (const item of merged) {
        const d = normalizeDateStr(item.availability_date || item.date);
        if (d && !seen.has(d)) {
          seen.add(d);
          deduped.push(item);
        }
      }
      return deduped;
    });
  };

  const handleSaveDay = async (e) => {
    e?.preventDefault?.();
    if (!user?.id) return setToast({ type: 'error', message: 'Please sign in to update your schedule.' });

    const isRangeActive = rangeMode && rangeStart && rangeEnd && rangeDates.length > 0;
    const targetDates = isRangeActive
      ? rangeDates.filter((d) => d >= todayStr())
      : [draft.date || selectedDate];

    if (!targetDates.length) {
      return setToast({ type: 'warning', message: 'Selected date(s) are in the past and read-only.' });
    }

    setSaving(true);
    const s = draft.status === 'available' ? FULL_START : (draft.startTime || FULL_START);
    const eTime = draft.status === 'available' ? FULL_END : (draft.endTime || FULL_END);
    const isAvail = draft.status === 'available';
    const isOff = draft.status === 'off';
    const isCustom = !isOff && !isAvail && (s !== FULL_START || eTime !== FULL_END);
    const note = isAvail
      ? 'Full Day Available'
      : isOff
      ? 'Off-duty / Blocked'
      : (draft.notes || `Custom hours: ${formatTime12Hour(s)} – ${formatTime12Hour(eTime)}`);

    const desc = isOff
      ? 'Off-duty Scheduled'
      : isAvail
      ? 'Full Day Scheduled (8:00 AM – 5:00 PM)'
      : `Partial Scheduled (${formatTime12Hour(s)} – ${formatTime12Hour(eTime)})`;

    try {
      // 1. Optimistic update in state
      optimisticUpsert(targetDates, draft.status, s, eTime, note);

      // 2. Persist to Supabase in a single batch query
      const dbStatus = isOff ? 'UNAVAILABLE' : isAvail ? 'AVAILABLE' : 'CUSTOM';
      const { error } = await setBatchAvailability({
        photographer_id: user.id,
        dates: targetDates,
        is_available: isAvail,
        status: dbStatus,
        start_time: s,
        end_time: eTime,
        notes: note,
      });
      if (error) throw error;

      const label = targetDates.length === 1
        ? new Date(`${targetDates[0]}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : `${targetDates.length} days (${rangeStart} to ${rangeEnd})`;

      await logActivity({
        label: `${label} → ${desc}`,
        description: `${user.email || 'Photographer'} scheduled ${label} as ${desc}`,
        details: { targetDates, status: draft.status },
      });

      setToast({
        type: 'success',
        message: targetDates.length === 1
          ? `${label} successfully scheduled: ${desc}.`
          : `${targetDates.length} dates successfully scheduled: ${desc}.`,
      });

      setAiFeedback({
        type: isOff ? 'warning' : 'success',
        text: `${targetDates.length === 1 ? label : `${targetDates.length} days`} scheduled as ${desc}.`,
      });

      // Clear range mode if active
      if (isRangeActive) {
        setRangeMode(false);
        setRangeStart(null);
        setRangeEnd(null);
      }

      await loadData();

      if (draft.status === 'off' && selectedShoots.length > 0) {
        openAiReschedule(selectedShoots[0]);
      }
    } catch (err) {
      console.error('Save schedule error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to save schedule.' });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleApplyRange = (e) => handleSaveDay(e);

  const handleBatch = async (kind) => {
    if (!user?.id) return setToast({ type: 'error', message: 'Please sign in to update your schedule.' });
    const dates = daysArray.map(isoOf).filter((d) => {
      const wk = isWeekendDay(d);
      return kind === 'weekends-off' ? wk : !wk;
    }).filter((d) => d >= todayStr());
    if (!dates.length) return setToast({ type: 'info', message: 'No upcoming days in this month to update.' });
    setSaving(true);
    try {
      const prevRecords = availability.filter((a) => dates.includes(normalizeDateStr(a.availability_date)) || dates.includes(normalizeDateStr(a.date)));
      if (kind === 'weekends-off') {
        optimisticUpsert(dates, 'off', FULL_START, FULL_END, 'Weekend off-duty');
        const { error } = await setBatchAvailability({ photographer_id: user.id, dates, is_available: false, notes: 'Weekend off-duty' });
        if (error) throw error;
      } else {
        optimisticUpsert(dates, 'available', FULL_START, FULL_END, 'Full Day Available');
        const { error } = await setBatchAvailability({ photographer_id: user.id, dates, is_available: true, notes: 'Full Day Available' });
        if (error) throw error;
      }
      await logActivity({
        label: kind === 'weekends-off' ? `${dates.length} weekends → Off-duty` : `${dates.length} weekdays → Available`,
        description: `Batch update`,
        details: { targetDates: dates, previousRecords: prevRecords },
      });
      setToast({ type: 'success', message: `${dates.length} dates updated.` });
      await loadData();
    } catch (err) {
      console.warn('Batch update failed:', err?.message);
      setToast({ type: 'error', message: 'Batch update failed.' });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleClearMonth = async () => {
    if (!user?.id) return setToast({ type: 'error', message: 'Please sign in to manage schedule.' });
    const dates = daysArray.map(isoOf);
    const existingForMonth = availability.filter((a) => dates.includes(normalizeDateStr(a.availability_date)) || dates.includes(normalizeDateStr(a.date)));
    if (!existingForMonth.length) {
      return setToast({ type: 'info', message: `${monthLabel} has no saved schedules to reset.` });
    }
    setSaving(true);
    try {
      setAvailabilityState((prev) => prev.filter((a) => !dates.includes(normalizeDateStr(a.availability_date)) && !dates.includes(normalizeDateStr(a.date))));
      const { error } = await clearMonthAvailability({ photographer_id: user.id, dates });
      if (error) throw error;
      await logActivity({
        label: `Reset ${monthLabel}`,
        description: `Reset all availability schedules for ${monthLabel}`,
        details: { targetDates: dates, previousRecords: existingForMonth },
      });
      setToast({ type: 'success', message: `${monthLabel} schedules reset to clean state.` });
      await loadData();
    } catch {
      setToast({ type: 'error', message: 'Could not reset month.' });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleClearAllSchedules = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await clearAllPhotographerAvailability(user.id);
      if (error) throw error;
      setAvailabilityState([]);
      setDraft({
        status: 'available',
        startTime: FULL_START,
        endTime: FULL_END,
        notes: 'Full Day Available',
        slots: ['am', 'pm'],
      });
      setRangeMode(false);
      setRangeStart(null);
      setRangeEnd(null);
      setAiFeedback(null);
      try {
        localStorage.removeItem(`ekodak_photographer_recent_changes_${user.id}`);
      } catch { /* ignore */ }
      setHistory([]);
      await logActivity({
        label: 'All Schedules Cleaned',
        description: `${user.email || 'Photographer'} cleaned all schedule records and reset states to 0`,
        details: { action: 'CLEAN_ALL_STATES' },
      });
      setToast({ type: 'success', message: 'All schedules and states cleaned. Calendar is clean and ready.' });
      await loadData();
    } catch (err) {
      console.error('Clean all schedules error:', err);
      setToast({ type: 'error', message: 'Failed to clean all schedules.' });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleGeneral = async () => {
    if (!user?.id || togglingGeneral) return;
    setTogglingGeneral(true);
    const next = !generalAvailable;
    const { error } = await toggleGeneralAvailability(user.id, next);
    if (!error) {
      setGeneralAvailable(next);
      setToast({ type: 'success', message: next ? 'You are now open for assignments.' : 'You are now off-duty for new assignments.' });
      await logActivity({
        label: next ? 'Shift Status: Open for Assignments' : 'Shift Status: Off-Duty for Assignments',
        description: next ? 'Photographer set availability status to OPEN for new bookings.' : 'Photographer set availability status to OFF-DUTY.',
        details: { is_available: next }
      });
    } else setToast({ type: 'error', message: 'Could not update shift status.' });
    setTogglingGeneral(false);
  };

  const handleUndo = async () => {
    const last = history[0];
    if (!last?.targetDates?.length && !last?.previousRecords?.length) {
      return setToast({ type: 'info', message: 'Nothing to undo.' });
    }
    setSaving(true);
    try {
      if (last.previousRecords && last.previousRecords.length > 0) {
        // Restore previous records
        const rows = last.previousRecords.map((r) => ({
          photographer_id: user.id,
          availability_date: normalizeDateStr(r.availability_date || r.date),
          status: r.status,
          start_time: r.start_time || '08:00:00',
          end_time: r.end_time || '17:00:00',
          notes: r.notes || 'Restored via undo',
        }));
        await supabase
          .from('photographer_availability')
          .upsert(rows, { onConflict: 'photographer_id,availability_date' });
      } else if (last.targetDates && last.targetDates.length > 0) {
        // Revert added records by clearing them
        await clearMonthAvailability({ photographer_id: user.id, dates: last.targetDates });
      }

      // Pop from history
      const nextHistory = history.slice(1);
      setHistory(nextHistory);
      try {
        localStorage.setItem(`ekodak_photographer_recent_changes_${user.id}`, JSON.stringify(nextHistory));
      } catch { /* ignore */ }

      setToast({ type: 'success', message: `Reverted: ${last.text}` });
      await loadData();
    } catch (err) {
      console.warn('Undo error:', err);
      setToast({ type: 'error', message: 'Undo failed.' });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  /* ── AI reschedule (fixed: modal actually opens) ───────── */
  const openAiReschedule = async (booking) => {
    if (!booking) return;
    setActiveConflict(booking);
    setAiStep('ASK');
    setRescheduleReason(`Photographer schedule blocked on ${booking.event_date}`);
    const slots = (await getSmartRescheduleSlots({ booking, allBookings: bookedShoots, availabilityList: availability, daysToScan: 30 })) || [];
    setAiSuggestions(slots);
    if (slots[0]) {
      setCustomDate(slots[0].date);
      setCustomTime(slots[0].time ? String(slots[0].time).slice(0, 5) : '09:00');
    } else {
      setCustomDate('');
      setCustomTime(booking.preferred_time ? String(booking.preferred_time).slice(0, 5) : '09:00');
    }
    setAiModalOpen(true);
  };

  const handleExecuteAi = async () => {
    if (!activeConflict || !customDate || !customTime) return setToast({ type: 'error', message: 'Pick a valid date and time.' });
    setExecutingAi(true);
    const name = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : user?.email?.split('@')[0] || 'Studio Photographer';
    const { error, proposedDate, proposedTime } = await aiAutoRescheduleBooking({
      bookingId: activeConflict.id, bookingNumber: activeConflict.booking_number,
      proposedDate: customDate, proposedTime: customTime,
      reason: rescheduleReason.trim() || 'Photographer schedule adjustment',
      photographerId: user.id, photographerName: name, customerId: activeConflict.customer?.id,
    });
    if (error) setToast({ type: 'error', message: error.message || 'Reschedule failed.' });
    else {
      setAiFeedback({ type: 'success', text: `Booking #${activeConflict.booking_number} moved to ${proposedDate} at ${formatTime12Hour(proposedTime)}. Schedule re-checked — open Studio AI to review any remaining conflicts.` });
      setToast({ type: 'success', message: `Booking #${activeConflict.booking_number} moved to ${proposedDate} (${proposedTime}).` });
      setAiStep('DONE');
      await loadData();
    }
    setExecutingAi(false);
  };



  const displayName = profile?.first_name || user?.email?.split('@')[0] || 'Photographer';
  const summary = loading ? 'Syncing calendar…' : `${metrics.scheduledDays ? `${metrics.scheduledDays} scheduled · ` : 'Clean schedule · '}${metrics.avail} open · ${metrics.blocked} off · ${metrics.sessions} session days · ${metrics.conflicts ? `${metrics.conflicts} conflict${metrics.conflicts > 1 ? 's' : ''}` : 'no conflicts'}`;

  return (
    <div className="w-full space-y-6 pb-16 font-body animate-fade-in">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ── Page Hero Banner (Restored Header) ───────────────────────────── */}
      <AdminHeroBanner
        station="photographer"
        userName={displayName}
        title="Availability & Smart Calendar"
        subtitle="Set working hours, declare off-duty days, and coordinate team coverage."
        primaryAction={{ label: 'My Bookings', href: '/photographer/bookings', icon: CalendarDays }}
        secondaryAction={{ label: 'Dashboard', href: '/photographer', icon: Briefcase }}
        onRefresh={loadData}
        isRefreshing={loading}
        extraTools={[
          {
            label: generalAvailable ? 'Shift: Available' : 'Shift: Off duty',
            icon: generalAvailable ? CheckCircle2 : XCircle,
            iconColor: generalAvailable ? 'text-emerald-400' : 'text-neutral-400',
            onClick: handleToggleGeneral,
          },
          {
            label: metrics.scheduledDays > 0 ? `Clean State (${metrics.scheduledDays})` : 'Clean All Records',
            icon: RotateCcw,
            iconColor: metrics.scheduledDays > 0 ? 'text-amber-400' : 'text-neutral-400',
            onClick: handleClearAllSchedules,
          },
        ]}
      />

      {/* ── Page Content Wrapper (Full Width Edge-to-Edge) ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-5 mt-2.5 sm:mt-3">

      {/* ── Metric Summary Cards (Unified Luxury Studio KPI Cards) ────────── */}
      <CategorizedMetricStrip
        loading={loading}
        columns="grid-cols-2 lg:grid-cols-4"
        cards={[
          {
            key: 'records',
            label: 'ROSTER',
            subtitle: 'SCHEDULED ENTRIES',
            value: metrics.scheduledDays,
          },
          {
            key: 'open',
            label: 'ACTIVE',
            subtitle: 'OPEN SHIFTS',
            value: metrics.avail,
          },
          {
            key: 'offduty',
            label: 'BLOCKED',
            subtitle: 'OFF-DUTY LEAVE',
            value: metrics.blocked,
          },
          {
            key: 'shoots',
            label: 'ASSIGNMENTS',
            subtitle: 'CONFIRMED SHOOTS',
            value: workload.assigned,
          }
        ]}
      />

      {/* main deck */}
      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-12">
        {/* calendar */}
        <section className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-7 flex flex-col justify-between" aria-label="Monthly availability calendar">
          <div className="space-y-3.5">
            {/* Header: Centered Month Navigation with Modern UI Capsule */}
            <div className="relative flex items-center justify-between border-b border-neutral-100 pb-3.5 min-h-[46px]">
              {/* Left: Quick 'Today' jump button with amber status accent */}
              <button
                type="button"
                onClick={() => {
                  const n = new Date();
                  setCurrentDate(new Date(n.getFullYear(), n.getMonth(), 1));
                  setSelectedDate(toISODate(n));
                }}
                className="h-9 px-3.5 rounded-xl border border-neutral-200/90 bg-white hover:bg-neutral-50 hover:border-amber-400 text-xs font-bold text-neutral-800 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex items-center gap-2 active:scale-95 group shrink-0"
                title="Jump to current date"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-100 group-hover:scale-110 transition-transform" />
                <span>Today</span>
              </button>

              {/* Center: Premium Month & Year Navigation Capsule */}
              <div className="sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center p-1 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-shadow">
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="h-8 w-8 flex items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-all active:scale-90 cursor-pointer"
                  aria-label="Previous month"
                  title="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="px-3.5 py-0.5 flex items-center gap-2 select-none">
                  <h2 className="font-heading text-lg sm:text-xl font-bold text-primary tracking-tight">
                    {currentDate.toLocaleDateString('en-US', { month: 'long' })}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-extrabold tracking-tight">
                    {year}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="h-8 w-8 flex items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-all active:scale-90 cursor-pointer"
                  aria-label="Next month"
                  title="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Right: Symmetrical month indicator pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs font-bold text-neutral-600 shadow-2xs shrink-0 select-none">
                <CalendarDays size={13} className="text-neutral-400" />
                <span>{daysInMonth} Days</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 border-b border-neutral-100 pb-2 text-center text-[11px] font-bold uppercase tracking-wider text-neutral-400" aria-hidden="true">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-1">{d}</div>)}
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <Loader2 size={30} className="mx-auto mb-2 animate-spin text-amber-500" />
                <p className="text-xs text-neutral-400">Syncing schedule…</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="grid" aria-label={monthLabel}>
                {Array.from({ length: firstDow }).map((_, i) => (
                  <div key={`pad-${i}`} className="min-h-[86px] rounded-2xl border border-dashed border-neutral-100 bg-neutral-50/50 sm:min-h-[98px]" />
                ))}
                {daysArray.map((day) => {
                  const ds = isoOf(day);
                  const sched = getDaySchedule(ds, availability);
                  const shoots = shootsByDate[ds] || [];
                  const holiday = getPhilippineHoliday(year, month, day);
                  const isToday = ds === todayStr();
                  const isPast = ds < todayStr();
                  const isSel = ds === selectedDate;
                  const hasConflict = findConflicts(shoots, sched).length > 0 && !isPast;
                  const isFull = sched.status !== 'off' && shoots.length >= FULLY_BOOKED_THRESHOLD;
                  const meta = STATUS_META[sched.status];

                  let cellStyles = '';
                  if (hasConflict) {
                    cellStyles = 'border-rose-400 bg-gradient-to-br from-rose-100 via-amber-100/90 to-rose-200 text-rose-950 ring-2 ring-rose-400 shadow-xs';
                  } else if (isFull) {
                    cellStyles = 'border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 text-white shadow-md';
                  } else if (sched.status === 'off') {
                    cellStyles = sched.isSaved
                      ? 'border-rose-400/90 bg-gradient-to-br from-rose-100 via-rose-50/90 to-red-100 text-rose-950 hover:border-rose-500 shadow-2xs'
                      : 'border-neutral-200/80 bg-neutral-50/70 text-neutral-600 hover:border-neutral-300 shadow-2xs';
                  } else if (sched.status === 'partial') {
                    cellStyles = sched.isSaved
                      ? 'border-amber-400 bg-gradient-to-br from-amber-100 via-amber-50/90 to-orange-100 text-amber-950 hover:border-amber-500 shadow-2xs'
                      : 'border-amber-200 bg-amber-50/50 text-amber-900 hover:border-amber-300 shadow-2xs';
                  } else {
                    // available full day: emerald gradient if saved, clean white if default unscheduled
                    cellStyles = sched.isSaved
                      ? 'border-emerald-400/90 bg-gradient-to-br from-emerald-100 via-emerald-50/90 to-teal-100 text-emerald-950 hover:border-emerald-500 shadow-2xs'
                      : 'border-neutral-200/90 bg-white text-neutral-800 hover:border-emerald-200 shadow-2xs';
                  }

                  const isStartOfRange = rangeMode && rangeStart && ds === rangeStart;
                  const isEndOfRange = rangeMode && rangeEnd && ds === rangeEnd;
                  const isInRange = rangeMode && rangeStart && rangeEnd && ds >= rangeStart && ds <= rangeEnd;

                  if (isStartOfRange && rangeDates.length > 1) {
                    cellStyles += ' ring-3 ring-amber-500 border-amber-500 bg-amber-100/95 font-bold shadow-sm scale-[1.01] z-10';
                  } else if (isEndOfRange && rangeDates.length > 1) {
                    cellStyles += ' ring-3 ring-amber-500 border-amber-500 bg-amber-100/95 font-bold shadow-sm scale-[1.01] z-10';
                  } else if (isInRange) {
                    cellStyles += ' ring-1 ring-amber-400 border-amber-300 bg-amber-50/90 text-amber-950';
                  } else if (isSel) {
                    cellStyles += ' ring-3 ring-amber-500 border-amber-500 shadow-lg scale-[1.02] z-10';
                  }

                  const dow = (firstDow + day - 1) % 7;
                  const isDetected = rangeMode && (
                    hoveredDate === ds ||
                    (!hoveredDate && (rangeStart === ds || (!rangeStart && isSel)))
                  );

                  return (
                    <div
                      key={day}
                      className={`relative ${isDetected ? 'z-40' : isSel ? 'z-10' : 'z-0'}`}
                      onMouseEnter={() => setHoveredDate(ds)}
                      onMouseLeave={() => setHoveredDate(null)}
                    >
                      <button
                        type="button"
                        role="gridcell"
                        aria-selected={isSel}
                        aria-label={`${ds}, ${sched.isSaved ? `${sched.scheduledLabel} (Saved), ` : ''}${meta.label}${isFull ? ', fully booked' : ''}${shoots.length ? `, ${shoots.length} shoots` : ''}${hasConflict ? ', conflict' : ''}${holiday ? `, ${holiday.name}` : ''}`}
                        title={`${ds} · ${sched.isSaved ? `${sched.scheduledLabel} (Scheduled) · ` : ''}${meta.label}${isFull ? ' · fully booked' : ''}${shoots.length ? ` · ${shoots.length} shoot${shoots.length > 1 ? 's' : ''}` : ''}${hasConflict ? ' · conflict' : ''}${holiday ? ` · ${holiday.name}` : ''}`}
                        onClick={() => pickDay(day)}
                        className={`w-full group flex min-h-[86px] flex-col justify-between rounded-2xl border p-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:min-h-[98px] sm:p-2 ${cellStyles} ${isPast ? 'opacity-50' : ''}`}
                      >
                        <span className="flex items-center justify-between gap-1 w-full">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                              isToday
                                ? 'bg-neutral-900 text-white'
                                : isSel
                                ? 'bg-amber-400 text-neutral-950 font-black'
                                : sched.status === 'off'
                                ? 'text-neutral-400'
                                : 'text-neutral-700'
                            }`}
                          >
                            {day}
                          </span>
                          <span className="flex items-center gap-1">
                            {holiday && <Star size={10} className="fill-purple-500 text-purple-500" aria-label={holiday.name} />}
                            {sched.isSaved ? (
                              <span
                                className={`h-2.5 w-2.5 rounded-full ring-1 ring-white ${
                                  sched.status === 'off'
                                    ? 'bg-rose-500'
                                    : sched.status === 'partial'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                title={sched.scheduledLabel}
                              />
                            ) : hasConflict ? (
                              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" title="Conflict detected" />
                            ) : sched.status === 'off' ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" title="Off-duty" />
                            ) : sched.status === 'partial' ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Partial hours" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/70" title="Available (8 AM–5 PM)" />
                            )}
                          </span>
                        </span>

                        <span className="space-y-1 w-full">
                          {/* Range indicator pills */}
                          {isStartOfRange && rangeDates.length > 1 && (
                            <span className="flex items-center gap-1 w-full rounded px-1.5 py-0.5 text-[10.5px] font-bold bg-amber-400 text-neutral-950 border border-amber-500/90 shadow-2xs">
                              <CalendarRange size={9} className="shrink-0 stroke-[2.5]" />
                              <span className="truncate">Range Start</span>
                            </span>
                          )}
                          {isEndOfRange && rangeDates.length > 1 && (
                            <span className="flex items-center gap-1 w-full rounded px-1.5 py-0.5 text-[10.5px] font-bold bg-amber-400 text-neutral-950 border border-amber-500/90 shadow-2xs">
                              <CalendarRange size={9} className="shrink-0 stroke-[2.5]" />
                              <span className="truncate">Range End ({rangeDates.length}d)</span>
                            </span>
                          )}
                          {rangeMode && rangeStart && !rangeEnd && ds === rangeStart && (
                            <span className="flex items-center gap-1 w-full rounded px-1.5 py-0.5 text-[10.5px] font-bold bg-amber-400 text-neutral-950 border border-amber-500/90 shadow-2xs animate-pulse">
                              <CalendarRange size={9} className="shrink-0 stroke-[2.5]" />
                              <span className="truncate">Pick End Date</span>
                            </span>
                          )}

                          {/* Display word showing that that date has been scheduled for all options */}
                          {sched.isSaved && (
                            <span
                              className={`flex items-center gap-1 w-full rounded px-1.5 py-0.5 text-[10.5px] sm:text-[11px] font-bold leading-tight shadow-2xs border ${
                                sched.status === 'off'
                                  ? 'bg-rose-600 text-white border-rose-700/90'
                                  : sched.status === 'partial'
                                  ? 'bg-amber-500 text-neutral-950 border-amber-600/90 font-black'
                                  : 'bg-emerald-600 text-white border-emerald-700/90'
                              }`}
                              title={`This date has been scheduled: ${sched.scheduledLabel}`}
                            >
                              <CheckCircle2 size={9} className="shrink-0 stroke-[2.5]" />
                              <span className="truncate">
                                {sched.scheduledLabel || 'Scheduled'}
                              </span>
                            </span>
                          )}

                          {shoots.slice(0, sched.isSaved ? 1 : 2).map((s) => (
                            <span key={s.id} className={`flex items-center justify-between gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold truncate shadow-2xs ${hasConflict ? 'bg-rose-200 text-rose-950' : 'bg-neutral-900 text-white'}`}>
                              <span className="truncate">{s.service?.name?.slice(0, 11) || 'Shoot'}</span>
                              <span className="shrink-0 font-mono text-[10px] text-amber-300">{formatTime12Compact(s.preferred_time)}</span>
                            </span>
                          ))}
                          {shoots.length > (sched.isSaved ? 1 : 2) && (
                            <span className="block text-right text-[10px] font-bold text-neutral-500">
                              +{shoots.length - (sched.isSaved ? 1 : 2)} more
                            </span>
                          )}
                          {isFull && <span className="block rounded bg-neutral-900 px-1 py-0.5 text-center text-[10px] font-black uppercase text-white">Full</span>}
                          {sched.isSaved && sched.status === 'partial' && (
                            <span className="inline-flex items-center rounded border border-amber-300/80 bg-amber-100/90 px-1 py-0.5 font-mono text-[10px] sm:text-[10.5px] font-bold text-amber-950 truncate max-w-full">
                              {formatTime12Compact(sched.startTime)}–{formatTime12Compact(sched.endTime)}
                            </span>
                          )}
                          {!sched.isSaved && !shoots.length && !isPast && isWeekendDay(ds) && (
                            <span className="text-[11.5px] font-medium text-neutral-300 group-hover:text-neutral-400 transition-colors">
                              Weekend
                            </span>
                          )}
                          {hasConflict && <span className="block rounded bg-rose-600 px-1 py-0.5 text-center text-[10px] font-black uppercase text-white">Conflict</span>}
                        </span>
                      </button>

                      {/* Canva-Style Floating Toolbar that floats right on the detected date cell */}
                      {rangeMode && !isPast && isDetected && (
                        <div
                          className={`absolute bottom-full mb-2.5 z-50 flex items-center gap-1 px-1.5 py-1 rounded-2xl bg-white/98 backdrop-blur-md border border-neutral-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.16)] text-neutral-800 select-none whitespace-nowrap animate-fade-in after:absolute after:top-full after:left-0 after:right-0 after:h-3 after:content-[''] ${
                            dow === 0
                              ? 'left-0 translate-x-0'
                              : dow === 6
                              ? 'right-0 translate-x-0'
                              : 'left-1/2 -translate-x-1/2'
                          }`}
                          role="toolbar"
                          aria-label={`Quick range presets for ${ds}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickRangePreset('week-7', ds);
                            }}
                            className="px-2.5 py-1 rounded-xl text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 transition-all flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                            title="Select 1 week (7 days) starting here"
                          >
                            <Sparkles size={11} className="stroke-[2.5]" />
                            <span>1 Week</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickRangePreset('this-week', ds);
                            }}
                            className="px-2.5 py-1 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 transition-all active:scale-95 cursor-pointer"
                            title="Select Monday to Sunday of this week"
                          >
                            This Week
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickRangePreset('next-week', ds);
                            }}
                            className="px-2.5 py-1 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 transition-all active:scale-95 cursor-pointer"
                            title="Select Monday to Sunday of next week"
                          >
                            Next Week
                          </button>
                          {(rangeStart || rangeEnd) && (
                            <>
                              <div className="w-px h-3.5 bg-neutral-200 mx-0.5" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRangeStart(null);
                                  setRangeEnd(null);
                                }}
                                className="px-2 py-1 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                                title="Clear range selection"
                              >
                                <X size={12} className="stroke-[2.5]" />
                                <span>Clear</span>
                              </button>
                            </>
                          )}
                          {/* Triangle pointer pointing down to date cell */}
                          <div
                            className={`absolute -bottom-1 w-2.5 h-2.5 bg-white rotate-45 border-r border-b border-neutral-200/90 pointer-events-none ${
                              dow === 0
                                ? 'left-5'
                                : dow === 6
                                ? 'right-5'
                                : 'left-1/2 -translate-x-1/2'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Functional Toolbar Under the Calendar (Legends & Quick Tools) ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-100">
              {/* Left: Interactive Legend Pill (Popover opens upwards) */}
              <div ref={legendRef} className="relative group inline-block">
                <button
                  type="button"
                  onClick={() => setLegendOpen((v) => !v)}
                  aria-expanded={legendOpen}
                  className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs select-none ${
                    legendOpen
                      ? 'border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-300'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-amber-300 text-neutral-700'
                  }`}
                  aria-label="Toggle Calendar Legend"
                >
                  <span className="flex items-center -space-x-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                    <span className="h-2 w-2 rounded-full bg-amber-400 ring-1 ring-white" />
                    <span className="h-2 w-2 rounded-full bg-rose-500 ring-1 ring-white" />
                  </span>
                  <span className="text-[11px] font-semibold text-neutral-700">Calendar Legend</span>
                  <Info size={12} className={`transition-colors ${legendOpen ? 'text-amber-700' : 'text-neutral-400 group-hover:text-primary'}`} />
                </button>

                {/* Floating Popover opening upwards */}
                <div
                  className={`absolute left-0 bottom-full mb-2 w-80 p-4 bg-white/98 backdrop-blur-md rounded-2xl border border-neutral-200 shadow-xl transition-all duration-200 z-50 ${
                    legendOpen
                      ? 'opacity-100 visible pointer-events-auto'
                      : 'opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-bold text-primary">Calendar Legend</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                        8 AM – 5 PM
                      </span>
                    </div>
                    {legendOpen && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLegendOpen(false);
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                        aria-label="Close legend"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Clean structured rows */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between py-1 px-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 transition">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold">
                        <CheckCircle2 size={13} className="text-emerald-600 stroke-[2.5]" />
                        <span>Scheduled Date</span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">Full / Partial / Off</span>
                    </div>

                    <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-neutral-50 transition">
                      <div className="flex items-center gap-2 text-neutral-800 font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>Available</span>
                      </div>
                      <span className="text-[11px] text-neutral-500">8 AM–5 PM shift</span>
                    </div>

                    <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-neutral-50 transition">
                      <div className="flex items-center gap-2 text-neutral-800 font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
                        <span>Partial Shift</span>
                      </div>
                      <span className="text-[11px] text-neutral-500">Custom hours</span>
                    </div>

                    <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-neutral-50 transition">
                      <div className="flex items-center gap-2 text-neutral-800 font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Off-Duty</span>
                      </div>
                      <span className="text-[11px] text-neutral-500">Day off</span>
                    </div>

                    <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-neutral-50 transition">
                      <div className="flex items-center gap-2 text-neutral-800 font-semibold">
                        <Camera size={13} className="text-neutral-700 shrink-0" />
                        <span>Has Shoot</span>
                      </div>
                      <span className="text-[11px] text-neutral-500">Confirmed booking</span>
                    </div>

                    <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-neutral-50 transition">
                      <div className="flex items-center gap-2 text-neutral-800 font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full border-2 border-neutral-800 shrink-0" />
                        <span>Fully Booked</span>
                      </div>
                      <span className="text-[11px] text-neutral-500">{FULLY_BOOKED_THRESHOLD}+ sessions</span>
                    </div>

                    <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-rose-50/50 transition">
                      <div className="flex items-center gap-2 text-rose-700 font-semibold">
                        <span className="w-3.5 h-3.5 rounded bg-rose-500 text-white flex items-center justify-center text-[10px] font-black leading-none shrink-0">!</span>
                        <span>Conflict</span>
                      </div>
                      <span className="text-[11px] text-rose-600 font-medium">Double-booked</span>
                    </div>

                    <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-purple-50/50 transition">
                      <div className="flex items-center gap-2 text-purple-700 font-semibold">
                        <Star size={13} className="text-purple-600 shrink-0" />
                        <span>Holiday</span>
                      </div>
                      <span className="text-[11px] text-purple-600 font-medium">Regular holiday</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Functional Action Tools (No refresh icon) */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:ml-auto">
                {/* 1. Range Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setRangeMode((prev) => {
                      const next = !prev;
                      if (next && !rangeStart) {
                        setRangeStart(selectedDate || todayStr());
                      }
                      if (!next) {
                        setRangeStart(null);
                        setRangeEnd(null);
                      }
                      return next;
                    });
                  }}
                  aria-pressed={rangeMode}
                  title="Select a date range (e.g. 1 week), then save in inspector"
                  className={`hover-reveal-pill h-9 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                    rangeMode
                      ? 'border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-300'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-amber-300 hover:bg-neutral-50'
                  }`}
                >
                  <CalendarRange size={15} className="shrink-0 text-amber-700" />
                  <span className="reveal-label">Range</span>
                </button>

                {/* 2. Weekends Off */}
                <button
                  type="button"
                  onClick={() => handleBatch('weekends-off')}
                  disabled={saving}
                  title="Mark all future weekends off-duty"
                  className="hover-reveal-pill h-9 px-2.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:border-rose-300 disabled:opacity-50"
                >
                  <Ban size={15} className="text-rose-500 shrink-0" />
                  <span className="reveal-label">Weekends off</span>
                </button>

                {/* 3. Weekdays Open */}
                <button
                  type="button"
                  onClick={() => handleBatch('weekdays-on')}
                  disabled={saving}
                  title="Mark all future weekdays available"
                  className="hover-reveal-pill h-9 px-2.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:border-emerald-300 disabled:opacity-50"
                >
                  <Briefcase size={15} className="text-emerald-600 shrink-0" />
                  <span className="reveal-label">Weekdays open</span>
                </button>

                {/* 4. Reset Month */}
                <button
                  type="button"
                  onClick={handleClearMonth}
                  disabled={saving}
                  title="Reset all schedule overrides this month"
                  className="hover-reveal-pill h-9 px-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:border-neutral-300 disabled:opacity-50"
                  aria-label="Reset month"
                >
                  <RotateCcw size={15} className="text-neutral-500 shrink-0" />
                  <span className="reveal-label">Reset month</span>
                </button>

                {/* 5. Undo */}
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={saving || history.length === 0}
                  title={history[0]?.text ? `Undo: ${history[0].text}` : 'Nothing to undo'}
                  className="hover-reveal-pill h-9 px-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Undo2 size={15} className={`shrink-0 ${history.length > 0 ? 'text-amber-700' : 'text-neutral-400'}`} />
                  <span className="reveal-label">{history[0]?.text ? `Undo: ${history[0].text}` : 'Undo'}</span>
                </button>
              </div>
            </div>
          </div>

          {rangeMode && (
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 via-amber-100/40 to-white p-3.5 sm:p-4 text-xs mt-3 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-neutral-950 flex items-center justify-center shrink-0 shadow-2xs">
                  <CalendarRange size={17} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading text-sm font-bold text-neutral-900 tracking-tight">
                      {rangeStart && rangeEnd
                        ? `${rangeStart} → ${rangeEnd}`
                        : rangeStart
                        ? `${rangeStart} → Pick end date`
                        : 'Select start & end dates on calendar'}
                    </span>
                    {rangeDates.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-neutral-950 shadow-2xs tracking-wide">
                        {rangeDates.length} Days ({rangeDates.length === 7 ? '1 Week' : `${rangeDates.length}d`})
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-600 block mt-0.5 truncate">
                    {rangeDates.length > 0
                      ? 'Shift choices apply to all selected dates. Click Save Range when ready.'
                      : 'Hover over dates on calendar to quick-pick 1 week, or use Presets.'}
                  </span>
                </div>
              </div>

              {/* Clean Controls — Dropdown tool + Save action */}
              <div className="flex items-center gap-2 shrink-0 xl:ml-auto">
                <div className="relative" ref={rangeDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setRangeDropdownOpen((prev) => !prev)}
                    className="h-8 sm:h-8.5 px-3 rounded-xl border border-amber-300/90 bg-white hover:bg-amber-50 text-neutral-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                    title="Quick range presets"
                    aria-expanded={rangeDropdownOpen}
                  >
                    <Sparkles size={13} className="text-amber-600" />
                    <span>Presets</span>
                    <ChevronDown size={13} className={`text-neutral-500 transition-transform duration-200 ${rangeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {rangeDropdownOpen && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 rounded-2xl bg-white border border-neutral-200/90 shadow-xl p-1.5 z-50 space-y-0.5 animate-fade-in text-neutral-800">
                      <div className="px-2.5 py-1 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        Range Presets
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleQuickRangePreset('week-7');
                          setRangeDropdownOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between transition cursor-pointer"
                      >
                        <span>1 Week</span>
                        <span className="text-xs text-neutral-400 font-normal">7 days</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleQuickRangePreset('this-week');
                          setRangeDropdownOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between transition cursor-pointer"
                      >
                        <span>This Week</span>
                        <span className="text-xs text-neutral-400 font-normal">Mon–Sun</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleQuickRangePreset('next-week');
                          setRangeDropdownOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-amber-50 hover:text-amber-950 flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Next Week</span>
                        <span className="text-xs text-neutral-400 font-normal">Mon–Sun</span>
                      </button>
                      {(rangeStart || rangeEnd) && (
                        <>
                          <div className="my-1 border-t border-neutral-100" />
                          <button
                            type="button"
                            onClick={() => {
                              setRangeStart(null);
                              setRangeEnd(null);
                              setRangeDropdownOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer flex items-center justify-between"
                          >
                            <span>Clear Selection</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveDay}
                  disabled={saving || !rangeStart || !rangeEnd}
                  className="h-8 sm:h-8.5 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-gold font-bold text-xs flex items-center gap-1.5 shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  <Sparkles size={13} className="text-gold" />
                  <span>Save {rangeDates.length > 0 ? `${rangeDates.length} Days` : 'Range'}</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Studio AI Assistant Hub — Cockpit with prioritized availability, spacious cards, and matching calendar height */}
        <aside className="xl:col-span-5 flex flex-col h-full xl:sticky xl:top-6 xl:self-start" aria-label="Studio AI Assistant and Day Inspector">
          <StudioAiAssistantHub
            currentDateStr={selectedDate}
            selectedDayData={{
              date: selectedDate,
              schedule: selectedSched,
              shoots: selectedShoots,
              conflicts: selectedConflicts,
              isPast: isPastSelected,
            }}
            onSelectDate={(ds) => {
              if (ds) {
                const parts = ds.split('-');
                if (parts.length === 3) {
                  const y = parseInt(parts[0], 10);
                  const m = parseInt(parts[1], 10) - 1;
                  const d = parseInt(parts[2], 10);
                  if (y !== year || m !== month) {
                    setCurrentDate(new Date(y, m, 1));
                  }
                  pickDay(d);
                }
              }
            }}
            photographer={profile || user}
            photographers={teamCoverage}
            bookings={bookedShoots}
            availability={availability}
            conflicts={conflicts}
            scheduleState={draft}
            setScheduleState={setDraft}
            onApplySchedule={handleSaveDay}
            onResolveConflict={openAiReschedule}
            onRefresh={loadData}
          />
        </aside>
      </div>
      </div>

      {/* AI reschedule modal */}
      {aiModalOpen && activeConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-sm" onClick={() => setAiModalOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-900 text-amber-400"><Bot size={20} /></div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-primary">Studio AI · Reschedule</h3>
                  <p className="text-xs text-neutral-500">Booking #{activeConflict.booking_number} — {activeConflict.service?.name || 'Session'}</p>
                </div>
              </div>
              <button type="button" onClick={() => setAiModalOpen(false)} className="rounded-xl p-1.5 text-neutral-400 hover:text-primary" aria-label="Close"><X size={18} /></button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] font-semibold text-neutral-500">
              <span className={aiStep === 'ASK' ? 'font-bold text-primary' : ''}>1 · Pick slot</span>
              <ArrowRight size={12} className="text-neutral-300" />
              <span className={aiStep === 'CONFIRM' ? 'font-bold text-primary' : ''}>2 · Confirm</span>
              <ArrowRight size={12} className="text-neutral-300" />
              <span className={aiStep === 'DONE' ? 'font-bold text-emerald-700' : ''}>Done</span>
            </div>

            {aiStep === 'ASK' && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-neutral-900 p-4 text-xs leading-relaxed text-neutral-200">
                  <p className="mb-1 flex items-center gap-1.5 font-bold text-amber-400"><Sparkles size={13} /> Conflict found</p>
                  <p>“<strong className="text-white">#{activeConflict.booking_number}</strong> on <strong className="text-white">{activeConflict.event_date} at {formatTime12Hour(activeConflict.preferred_time) || 'TBD'}</strong> collides with your new hours. Pick a collision-free slot below or set your own.”</p>
                </div>
                {aiSuggestions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {aiSuggestions.slice(0, 6).map((slot, i) => {
                      const sel = customDate === slot.date && customTime === String(slot.time || '').slice(0, 5);
                      return (
                        <button key={i} type="button" onClick={() => { setCustomDate(slot.date); setCustomTime(String(slot.time || '09:00').slice(0, 5)); }}
                          className={`rounded-2xl border p-3 text-left transition ${sel ? 'border-neutral-900 bg-neutral-900 text-white ring-2 ring-amber-400' : 'border-neutral-200 bg-white hover:border-amber-300'}`}>
                          <span className={`inline-block rounded px-2 py-0.5 font-mono text-xs font-bold ${sel ? 'bg-amber-400 text-neutral-900' : 'bg-amber-100 text-amber-900'}`}>{slot.score ?? '—'}% match</span>
                          <span className="mt-1.5 block text-xs font-bold">{slot.formattedDate || slot.date}</span>
                          <span className={`mt-0.5 flex items-center gap-1.5 font-mono text-[11px] ${sel ? 'text-amber-300' : 'text-neutral-600'}`}><Clock size={11} />{formatTime12Hour(slot.time)}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">No auto slots found — set a date and time manually.</p>
                )}
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5">
                  <label className="block text-[11px] font-bold uppercase text-neutral-500">Date<input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold" /></label>
                  <label className="block text-[11px] font-bold uppercase text-neutral-500">Time<input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold" /></label>
                  <label className="col-span-2 block text-[11px] font-bold uppercase text-neutral-500">Note for client<input type="text" value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs" /></label>
                </div>
                <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
                  <button type="button" onClick={() => setAiModalOpen(false)} className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600">Cancel</button>
                  <button type="button" disabled={!customDate || !customTime} onClick={() => setAiStep('CONFIRM')} className="btn-primary px-5 py-2 text-xs disabled:opacity-50">Review slot <ArrowRight size={13} /></button>
                </div>
              </div>
            )}

            {aiStep === 'CONFIRM' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-rose-200 bg-white p-3"><span className="block text-xs font-bold uppercase text-rose-600">Before</span><p className="font-bold">{activeConflict.event_date}</p><p className="font-mono text-neutral-500">{formatTime12Hour(activeConflict.preferred_time)}</p></div>
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 ring-1 ring-emerald-200"><span className="flex items-center gap-1 text-xs font-bold uppercase text-emerald-700"><CheckCircle2 size={11} /> After</span><p className="font-bold text-emerald-900">{customDate}</p><p className="font-mono font-bold text-emerald-700">{formatTime12Hour(customTime)}</p></div>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                  <button type="button" onClick={() => setAiStep('ASK')} className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600"><ChevronLeft size={13} /> Change</button>
                  <button type="button" disabled={executingAi} onClick={handleExecuteAi} className="btn-primary px-5 py-2 text-xs disabled:opacity-50">{executingAi ? <><Loader2 size={13} className="animate-spin" /> Moving…</> : <><Wand2 size={13} /> Confirm reschedule</>}</button>
                </div>
              </div>
            )}

            {aiStep === 'DONE' && (
              <div className="py-6 text-center">
                <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
                <h4 className="mt-2 font-heading text-lg font-bold text-primary">Reschedule complete</h4>
                <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">Booking #{activeConflict.booking_number} is now {customDate} at {formatTime12Hour(customTime)}. Client and bay schedules are synced.</p>
                <button type="button" onClick={() => { setAiModalOpen(false); setActiveConflict(null); }} className="btn-primary mt-4 px-6 py-2.5 text-xs">Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
