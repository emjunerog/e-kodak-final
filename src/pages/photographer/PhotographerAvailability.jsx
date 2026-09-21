import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getAvailability,
  setAvailability,
  setBatchAvailability,
  getAssignedBookings,
  toggleGeneralAvailability,
  getPhotographerProfileData,
  findOptimalRescheduleSlots,
  aiAutoRescheduleBooking,
} from '../../services/photographerService';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Camera,
  Clock,
  MapPin,
  Sparkles,
  Info,
  AlertCircle,
  Bot,
  ArrowRight,
  RefreshCw,
  Sliders,
  CalendarDays,
  Check,
  X,
  User,
  Phone,
  Layers,
  ShieldCheck,
  Wand2,
  Star,
  Ban,
  Briefcase,
  RotateCcw,
  Coffee,
} from 'lucide-react';
import Toast from '../../components/ui/Toast';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CustomDropdown from '../../components/ui/CustomDropdown';

// ── Reusable Icon with Hover-Revealed Tooltip (100% Reliable Pure CSS + Native Title Fallback) ──
function IconHoverTooltip({
  icon,
  text,
  subtext,
  position = 'top',
  className = '',
}) {
  return (
    <div
      className={`has-tooltip ${position === 'bottom' ? 'has-tooltip-bottom' : ''} ${className}`}
      title={text ? `${text}${subtext ? ` — ${subtext}` : ''}` : undefined}
    >
      {icon}
      {text && (
        <div className="tooltip-bubble">
          <span className="font-semibold block">{text}</span>
          {subtext && (
            <span className="block text-[10px] text-neutral-300 font-normal leading-tight mt-0.5">
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Smart Philippine National & Special Non-Working Holidays declaration
function getPhilippineHoliday(year, month0, day) {
  const m = month0 + 1; // 1-12
  const mmdd = `${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const fixedHolidays = {
    '01-01': 'New Year’s Day',
    '01-02': 'Special Non-Working',
    '02-25': 'EDSA Revolution',
    '04-09': 'Day of Valor',
    '05-01': 'Labor Day',
    '06-12': 'Independence Day',
    '08-21': 'Ninoy Aquino Day',
    '09-03': 'Victory Day',
    '09-21': 'Martial Law Memorial',
    '11-01': 'All Saints’ Day',
    '11-02': 'All Souls’ Day',
    '11-30': 'Bonifacio Day',
    '12-08': 'Immaculate Conception',
    '12-24': 'Christmas Eve',
    '12-25': 'Christmas Day',
    '12-30': 'Rizal Day',
    '12-31': 'New Year’s Eve',
  };

  if (fixedHolidays[mmdd]) {
    return { name: fixedHolidays[mmdd], isHoliday: true };
  }

  // National Heroes Day (Last Monday of August)
  if (m === 8) {
    const d = new Date(year, 7, day);
    if (d.getDay() === 1 && day >= 25) {
      return { name: 'Heroes Day', isHoliday: true };
    }
  }

  // Maundy Thursday & Good Friday for 2026
  if (year === 2026) {
    if (mmdd === '04-02') return { name: 'Maundy Thursday', isHoliday: true };
    if (mmdd === '04-03') return { name: 'Good Friday', isHoliday: true };
    if (mmdd === '04-04') return { name: 'Black Saturday', isHoliday: true };
  }

  return null;
}

// Studio Operating Hours & Rules
const STUDIO_HOURS = {
  open: '09:00',
  close: '18:00',
  label: '9:00 AM – 6:00 PM',
  days: 'Mon – Sat',
  sundayNotice: 'Sun: Closed / By Appt',
};

export default function PhotographerAvailability() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailabilityState] = useState([]);
  const [bookedShoots, setBookedShoots] = useState([]);
  const [generalAvailable, setGeneralAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingDate, setSavingDate] = useState(null);
  const [togglingGeneral, setTogglingGeneral] = useState(false);
  const [toast, setToast] = useState(null);

  // Day Inspector Modal
  const [selectedDayData, setSelectedDayData] = useState(null);

  // Smart AI Reschedule Assistant Modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [activeConflictBooking, setActiveConflictBooking] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [customRescheduleDate, setCustomRescheduleDate] = useState('');
  const [customRescheduleTime, setCustomRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('Photographer schedule blocked');
  const [executingAiReschedule, setExecutingAiReschedule] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [availRes, bookingsRes, profileRes] = await Promise.all([
        getAvailability(user.id, month + 1, year),
        getAssignedBookings(user.id),
        getPhotographerProfileData(user.id),
      ]);

      setAvailabilityState(availRes.data || []);
      setBookedShoots(bookingsRes.data || []);
      if (profileRes.data) {
        setGeneralAvailable(profileRes.data.is_available ?? true);
      }
    } catch (err) {
      console.error('Failed to load availability calendar:', err);
      setToast({ type: 'error', message: 'Failed to synchronize availability schedule.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, month, year]);

  // Global shift status toggle
  const handleToggleGeneral = async () => {
    if (!user?.id || togglingGeneral) return;
    setTogglingGeneral(true);
    const nextVal = !generalAvailable;
    const { error } = await toggleGeneralAvailability(user.id, nextVal);
    if (!error) {
      setGeneralAvailable(nextVal);
      setToast({
        type: 'success',
        message: `Working status updated: ${nextVal ? 'Available for shoot assignments' : 'Off-Duty / Unavailable'}`,
      });
    } else {
      setToast({ type: 'error', message: 'Failed to update working status.' });
    }
    setTogglingGeneral(false);
  };

  // Calendar Geometry
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Identify all active booking conflicts on blocked days
  const conflicts = useMemo(() => {
    const list = [];
    bookedShoots.forEach(booking => {
      if (!booking.event_date || ['CANCELLED', 'DECLINED', 'COMPLETED'].includes(booking.status)) return;
      const bDate = booking.event_date;
      const customAvail = availability.find(
        a => (a.availability_date === bDate || a.date === bDate)
      );
      const isBlocked = customAvail && (
        customAvail.status?.toLowerCase() === 'unavailable' ||
        customAvail.status?.toLowerCase() === 'blocked' ||
        customAvail.is_available === false
      );
      if (isBlocked) {
        list.push(booking);
      }
    });
    return list;
  }, [bookedShoots, availability]);

  // KPI Metrics
  const metrics = useMemo(() => {
    let availableCount = 0;
    let blockedCount = 0;
    let shootCount = 0;

    daysArray.forEach(day => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasShoots = bookedShoots.some(b => b.event_date === dateStr && !['CANCELLED', 'DECLINED'].includes(b.status));
      if (hasShoots) shootCount++;

      const customAvail = availability.find(a => (a.availability_date === dateStr || a.date === dateStr));
      const isBlocked = customAvail && (
        customAvail.status?.toLowerCase() === 'unavailable' ||
        customAvail.status?.toLowerCase() === 'blocked' ||
        customAvail.is_available === false
      );

      if (isBlocked) {
        blockedCount++;
      } else {
        availableCount++;
      }
    });

    return {
      availableCount,
      blockedCount,
      shootCount,
      conflictCount: conflicts.length,
    };
  }, [daysArray, year, month, bookedShoots, availability, conflicts]);

  // Open AI Reschedule Engine for a Conflicting Booking
  const triggerAiReschedule = (booking) => {
    setActiveConflictBooking(booking);
    setRescheduleReason(`Photographer schedule blocked on ${booking.event_date}`);

    // Compute optimal slots with zero collisions
    const slots = findOptimalRescheduleSlots({
      booking,
      allBookings: bookedShoots,
      availabilityList: availability,
      daysToScan: 30,
    });

    setAiSuggestions(slots);
    if (slots.length > 0) {
      setSelectedSlot(slots[0]);
      setCustomRescheduleDate(slots[0].date);
      setCustomRescheduleTime(slots[0].time);
    } else {
      setSelectedSlot(null);
      setCustomRescheduleDate('');
      setCustomRescheduleTime(booking.preferred_time || '09:00:00');
    }

    setAiModalOpen(true);
  };

  // Toggle Single Day Availability
  const toggleDayAvailability = async (day) => {
    if (!user?.id) {
      setToast({ type: 'error', message: 'You must be logged in to update your availability schedule.' });
      return;
    }

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = availability.find(a => (a.availability_date === dateStr || a.date === dateStr));
    const wasBlocked = existing && (
      existing.status?.toUpperCase() === 'UNAVAILABLE' ||
      existing.status?.toUpperCase() === 'BLOCKED' ||
      existing.is_available === false
    );

    const newIsAvailable = wasBlocked ? true : false; // If was blocked, make available. Otherwise make blocked.
    const newStatus = newIsAvailable ? 'AVAILABLE' : 'UNAVAILABLE';
    const dayShoots = bookedShoots.filter(
      b => b.event_date === dateStr && !['CANCELLED', 'DECLINED'].includes(b.status)
    );

    setSavingDate(day);

    // Optimistic UI update so the user IMMEDIATELY sees the toggle switch
    setAvailabilityState(prev => {
      const filtered = prev.filter(a => a.availability_date !== dateStr && a.date !== dateStr);
      return [
        ...filtered,
        {
          availability_date: dateStr,
          date: dateStr,
          is_available: newIsAvailable,
          status: newStatus,
        },
      ];
    });

    try {
      const { error } = await setAvailability({
        photographer_id: user.id,
        date: dateStr,
        is_available: newIsAvailable,
        notes: newIsAvailable ? 'Marked available' : 'Marked off-duty',
      });

      if (error) {
        console.error('setAvailability error:', error);
        setToast({ type: 'error', message: `Failed to update ${dateStr}: ${error.message || 'Database error'}` });
        await loadData();
      } else {
        setToast({
          type: 'success',
          message: `${dateStr} is now marked as ${newIsAvailable ? 'Available' : 'Blocked / Off-Duty'}.`,
        });

        // If newly marked blocked and has confirmed bookings, trigger Smart AI Assistant!
        if (!newIsAvailable && dayShoots.length > 0) {
          triggerAiReschedule(dayShoots[0]);
        }
      }
    } catch (err) {
      console.error('toggleDayAvailability error:', err);
      setToast({ type: 'error', message: 'An unexpected error occurred while updating availability.' });
      await loadData();
    } finally {
      setSavingDate(null);
    }
  };

  // Execute AI Auto-Reschedule
  const handleExecuteAiReschedule = async (e) => {
    e?.preventDefault();
    if (!activeConflictBooking || !customRescheduleDate || !customRescheduleTime) {
      setToast({ type: 'error', message: 'Please select a valid reschedule date and time slot.' });
      return;
    }

    setExecutingAiReschedule(true);
    const photographerName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : user?.email?.split('@')[0] || 'Studio Photographer';

    const { error, oldDate, proposedDate, proposedTime } = await aiAutoRescheduleBooking({
      bookingId: activeConflictBooking.id,
      bookingNumber: activeConflictBooking.booking_number,
      proposedDate: customRescheduleDate,
      proposedTime: customRescheduleTime,
      reason: rescheduleReason.trim() || 'Photographer schedule adjustment',
      photographerId: user.id,
      photographerName,
      customerId: activeConflictBooking.customer_id,
    });

    if (error) {
      setToast({ type: 'error', message: error.message || 'Failed to auto-reschedule booking.' });
    } else {
      setToast({
        type: 'success',
        message: `Booking #${activeConflictBooking.booking_number} moved from ${oldDate} to ${proposedDate} (${proposedTime}) via Studio AI!`,
      });

      // Refresh data to reflect new booking date
      setAiModalOpen(false);
      setActiveConflictBooking(null);
      await loadData();
    }
    setExecutingAiReschedule(false);
  };

  // Batch Availability Controls (Weekends off, etc.)
  const handleBatchBlockWeekends = async () => {
    if (!user?.id) {
      setToast({ type: 'error', message: 'You must be logged in to update schedule.' });
      return;
    }
    const weekendDates = [];
    daysArray.forEach(d => {
      const checkDate = new Date(year, month, d);
      if (checkDate.getDay() === 0 || checkDate.getDay() === 6) {
        weekendDates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
    });

    if (weekendDates.length === 0) return;

    // Optimistic batch update so UI updates instantly
    setAvailabilityState(prev => {
      const filtered = prev.filter(a => !weekendDates.includes(a.availability_date) && !weekendDates.includes(a.date));
      const newRows = weekendDates.map(d => ({
        availability_date: d,
        date: d,
        is_available: false,
        status: 'UNAVAILABLE',
      }));
      return [...filtered, ...newRows];
    });

    const { error } = await setBatchAvailability({
      photographer_id: user.id,
      dates: weekendDates,
      is_available: false,
      notes: 'Weekend off-duty',
    });

    if (error) {
      setToast({ type: 'error', message: 'Failed to batch update weekend schedule.' });
      await loadData();
    } else {
      setToast({ type: 'success', message: `Marked ${weekendDates.length} weekend dates as off-duty.` });
    }
  };

  const handleBatchSetWeekdaysAvailable = async () => {
    if (!user?.id) {
      setToast({ type: 'error', message: 'You must be logged in to update schedule.' });
      return;
    }
    const weekdayDates = [];
    daysArray.forEach(d => {
      const checkDate = new Date(year, month, d);
      if (checkDate.getDay() !== 0 && checkDate.getDay() !== 6) {
        weekdayDates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
    });

    // Optimistic batch update
    setAvailabilityState(prev => {
      const filtered = prev.filter(a => !weekdayDates.includes(a.availability_date) && !weekdayDates.includes(a.date));
      const newRows = weekdayDates.map(d => ({
        availability_date: d,
        date: d,
        is_available: true,
        status: 'AVAILABLE',
      }));
      return [...filtered, ...newRows];
    });

    const { error } = await setBatchAvailability({
      photographer_id: user.id,
      dates: weekdayDates,
      is_available: true,
      notes: 'Weekday regular availability',
    });

    if (error) {
      setToast({ type: 'error', message: 'Failed to set weekday availability.' });
      await loadData();
    } else {
      setToast({ type: 'success', message: `Set ${weekdayDates.length} weekday dates as available.` });
    }
  };

  const handleClearMonthBlocks = async () => {
    if (!user?.id) {
      setToast({ type: 'error', message: 'You must be logged in to update schedule.' });
      return;
    }
    const allDates = daysArray.map(
      d => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    );

    // Optimistic batch reset
    setAvailabilityState(prev => {
      const filtered = prev.filter(a => !allDates.includes(a.availability_date) && !allDates.includes(a.date));
      const newRows = allDates.map(d => ({
        availability_date: d,
        date: d,
        is_available: true,
        status: 'AVAILABLE',
      }));
      return [...filtered, ...newRows];
    });

    const { error } = await setBatchAvailability({
      photographer_id: user.id,
      dates: allDates,
      is_available: true,
      notes: 'All days set available',
    });

    if (error) {
      setToast({ type: 'error', message: 'Failed to reset month schedule.' });
      await loadData();
    } else {
      setToast({ type: 'success', message: 'All dates this month reset to available.' });
    }
  };

  const displayName = profile?.first_name
    ? `${profile.first_name}`
    : user?.email?.split('@')[0] || 'Photographer';

  const operationalSummary = loading
    ? 'Synchronizing calendar & shoot schedule…'
    : `${metrics.availableCount} available days · ${metrics.blockedCount} blocked · ${metrics.shootCount} session days · ${metrics.conflictCount > 0 ? `${metrics.conflictCount} AI conflicts detected` : 'Zero collisions'}`;

  return (
    <div className="space-y-8 animate-fade-in max-w-screen-2xl mx-auto pb-16 font-body">
      {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}

      {/* ── 1. Luxury Dark Hero Banner with Live Philippine Studio Clock ──────── */}
      <AdminHeroBanner
        station="photographer"
        userName={displayName}
        title="Availability & Smart Calendar"
        subtitle="Manage working shifts, declare off-duty days, and automatically resolve booking collisions with Studio AI."
        statusSummary={operationalSummary}
        primaryAction={{
          label: 'My Bookings',
          href: '/photographer/bookings',
          icon: CalendarDays,
        }}
        secondaryAction={{
          label: 'Studio Dashboard',
          href: '/photographer/dashboard',
          icon: Layers,
        }}
        onRefresh={loadData}
        isRefreshing={loading}
        extraTools={[
          {
            label: generalAvailable ? 'Shift: Available' : 'Shift: Off Duty',
            sublabel: generalAvailable ? 'Click to set off duty' : 'Click to set available',
            icon: generalAvailable ? CheckCircle2 : AlertCircle,
            iconColor: generalAvailable ? 'text-emerald-400' : 'text-neutral-400',
            onClick: handleToggleGeneral,
          },
          {
            label: 'AI Conflict Resolver',
            sublabel: conflicts.length > 0 ? `${conflicts.length} shoots need reschedule` : 'All slots aligned',
            icon: Wand2,
            iconColor: conflicts.length > 0 ? 'text-amber-400' : 'text-gold',
            onClick: () => {
              if (conflicts.length > 0) {
                triggerAiReschedule(conflicts[0]);
              } else {
                setToast({ type: 'info', message: 'No schedule conflicts detected! All active shoots are on available bay days.' });
              }
            },
          },
        ]}
      />

      {/* ── 2. KPI Metric Cards Strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Available Days</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-emerald-700">
            {loading ? '—' : metrics.availableCount}
          </p>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">Accepting shoots</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Blocked / Off-Duty</span>
            <XCircle size={16} className="text-rose-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-rose-600">
            {loading ? '—' : metrics.blockedCount}
          </p>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">Unavailable bay dates</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Booked Sessions</span>
            <Camera size={16} className="text-gold-dark" />
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-primary">
            {loading ? '—' : metrics.shootCount}
          </p>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">Assigned photoshoot days</span>
        </div>

        <div
          onClick={() => {
            if (conflicts.length > 0) triggerAiReschedule(conflicts[0]);
          }}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none ${
            metrics.conflictCount > 0
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-300/40 shadow-xs'
              : 'bg-white border-neutral-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <Bot size={13} className="text-gold" />
              <span>AI Conflicts</span>
            </span>
            <Sparkles size={16} className={metrics.conflictCount > 0 ? 'text-amber-600 animate-pulse' : 'text-neutral-400'} />
          </div>
          <p className={`text-2xl sm:text-3xl font-heading font-bold ${metrics.conflictCount > 0 ? 'text-amber-900' : 'text-neutral-400'}`}>
            {loading ? '—' : metrics.conflictCount}
          </p>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">
            {metrics.conflictCount > 0 ? 'Click to auto-reschedule via AI' : 'All shoots fully aligned'}
          </span>
        </div>
      </div>

      {/* ── 3. Smart Calendar Deck ────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-white border border-neutral-200/80 shadow-xs p-5 sm:p-7 space-y-6">
        
        {/* Month Navigation, Batch Tools & Studio Schedule Declaration */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
          
          {/* Month Stepper & Studio Hours (Icon-First with Hover Reveal) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 text-neutral-600 hover:text-primary transition-colors bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="font-heading text-xl sm:text-2xl text-primary font-bold min-w-[170px]">
                {monthNames[month]} {year}
              </h2>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 text-neutral-600 hover:text-primary transition-colors bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Studio Hours & Sunday Info Badges (Hover to Reveal Text) */}
            <div className="flex items-center gap-1.5">
              <div
                className="hover-reveal-pill p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-medium shadow-2xs cursor-help border border-neutral-800"
                title={`Studio Hours: ${STUDIO_HOURS.label} (${STUDIO_HOURS.days})`}
              >
                <Clock size={14} className="text-gold shrink-0" />
                <span className="reveal-label">
                  Studio: {STUDIO_HOURS.label} ({STUDIO_HOURS.days})
                </span>
              </div>

              <div
                className="hover-reveal-pill p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-50 text-amber-900 text-xs font-medium border border-amber-200/80 cursor-help"
                title="Sundays: Closed / Shoots by Special Appointment Only"
              >
                <Coffee size={14} className="text-amber-600 shrink-0" />
                <span className="reveal-label">
                  {STUDIO_HOURS.sundayNotice}
                </span>
              </div>
            </div>
          </div>

          {/* Smart Batch Schedule Presets (Hover to Reveal Text) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleBatchBlockWeekends}
              title="Block Weekends (Mark Saturdays & Sundays Off-Duty)"
              className="hover-reveal-pill p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:border-gold/60"
            >
              <Ban size={14} className="text-rose-600 shrink-0" />
              <span className="reveal-label">
                Block Weekends
              </span>
            </button>

            <button
              type="button"
              onClick={handleBatchSetWeekdaysAvailable}
              title="Weekdays Available (Mark Monday-Friday Available)"
              className="hover-reveal-pill p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:border-gold/60"
            >
              <Briefcase size={14} className="text-emerald-600 shrink-0" />
              <span className="reveal-label">
                Weekdays Available
              </span>
            </button>

            <button
              type="button"
              onClick={handleClearMonthBlocks}
              title="Reset Month (Clear All Custom Schedule Blocks)"
              className="hover-reveal-pill p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:border-gold/60"
            >
              <RotateCcw size={14} className="text-neutral-500 shrink-0" />
              <span className="reveal-label">
                Reset Month
              </span>
            </button>
          </div>

          {/* Visual Legend (Compact Icons with Hover Tooltips) */}
          <div className="flex items-center gap-2.5 p-1.5 px-2.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <IconHoverTooltip
              icon={<div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500 cursor-help transition-transform hover:scale-125" />}
              text="Booked Shoot"
              subtext="Photoshoot session confirmed on this date"
            />
            <IconHoverTooltip
              icon={<div className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600 cursor-help transition-transform hover:scale-125" />}
              text="Available"
              subtext="Photographer on-duty and accepting shoots"
            />
            <IconHoverTooltip
              icon={<div className="w-3 h-3 rounded-full bg-rose-500 border border-rose-600 cursor-help transition-transform hover:scale-125" />}
              text="Blocked / Off-Duty"
              subtext="Photographer unavailable for bookings"
            />
            <IconHoverTooltip
              icon={
                <div className="w-4 h-4 rounded bg-purple-100 border border-purple-200 flex items-center justify-center cursor-help transition-transform hover:scale-125">
                  <Star size={10} className="text-purple-700 fill-purple-700" />
                </div>
              }
              text="Philippine Holiday"
              subtext="Declared national or special holiday"
              badgeColor="bg-purple-950"
            />
          </div>
        </div>

        {/* Days of Week Header with Weekend Declarations */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold font-body uppercase tracking-wider">
          {[
            { label: 'Sun', isWeekend: true },
            { label: 'Mon', isWeekend: false },
            { label: 'Tue', isWeekend: false },
            { label: 'Wed', isWeekend: false },
            { label: 'Thu', isWeekend: false },
            { label: 'Fri', isWeekend: false },
            { label: 'Sat', isWeekend: true },
          ].map(col => (
            <div
              key={col.label}
              className={`py-1.5 rounded-xl text-xs font-semibold ${
                col.isWeekend
                  ? 'text-amber-800 bg-amber-50/60 border border-amber-200/50'
                  : 'text-neutral-500'
              }`}
            >
              <span>{col.label}</span>
              {col.isWeekend && (
                <IconHoverTooltip
                  className="ml-1"
                  icon={<span className="inline-block text-[9px] text-amber-600/70 font-normal cursor-help">(Wknd)</span>}
                  text={col.label === 'Sun' ? 'Sunday: Studio Closed' : 'Saturday: Studio Hours 9 AM – 6 PM'}
                  subtext={col.label === 'Sun' ? 'Shoots by appointment only' : 'Regular weekend schedule'}
                  badgeColor="bg-amber-950"
                />
              )}
            </div>
          ))}
        </div>

        {/* Interactive Month Grid */}
        {loading ? (
          <div className="py-24 text-center">
            <Loader2 size={32} className="animate-spin text-gold mx-auto mb-2" />
            <p className="text-xs text-neutral-400 font-body">Synchronizing smart schedule grid…</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2 sm:gap-2.5">
            {/* Offset empty slots before 1st day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div
                key={`offset-${i}`}
                className="h-24 sm:h-28 bg-neutral-50/40 rounded-2xl border border-dashed border-neutral-100"
              />
            ))}

            {/* Calendar Days */}
            {daysArray.map(day => {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayDate = new Date(year, month, day);
              const dayOfWeek = dayDate.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const isSunday = dayOfWeek === 0;
              const holiday = getPhilippineHoliday(year, month, day);

              const dayShoots = bookedShoots.filter(
                b => b.event_date === dateStr && !['CANCELLED', 'DECLINED'].includes(b.status)
              );
              const customAvail = availability.find(
                a => (a.availability_date === dateStr || a.date === dateStr)
              );

              const isBlocked = customAvail && (
                customAvail.status?.toUpperCase() === 'UNAVAILABLE' ||
                customAvail.status?.toUpperCase() === 'BLOCKED' ||
                customAvail.status?.toLowerCase() === 'unavailable' ||
                customAvail.status?.toLowerCase() === 'blocked' ||
                customAvail.is_available === false
              );
              const isAvailableExplicit = customAvail && (
                customAvail.status?.toUpperCase() === 'AVAILABLE' ||
                customAvail.status?.toLowerCase() === 'available' ||
                customAvail.is_available === true
              );
              const hasShoots = dayShoots.length > 0;
              const hasConflict = isBlocked && hasShoots;

              return (
                <div
                  key={day}
                  onClick={() => toggleDayAvailability(day)}
                  className={`h-24 sm:h-28 p-2 sm:p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative select-none hover:z-30 ${
                    hasConflict
                      ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/50 shadow-sm'
                      : isBlocked
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                      : hasShoots
                      ? 'bg-gold/10 border-gold/60 shadow-2xs hover:border-gold'
                      : holiday
                      ? 'bg-purple-50/40 border-purple-200/80 hover:border-purple-300'
                      : isWeekend
                      ? 'bg-amber-50/20 border-neutral-200/80 hover:border-gold/50'
                      : isAvailableExplicit
                      ? 'bg-emerald-50/30 border-emerald-200/80 hover:border-emerald-300'
                      : 'bg-white border-neutral-200/80 hover:border-gold/50 shadow-2xs'
                  }`}
                >
                  {/* Top Day Header */}
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs sm:text-sm font-bold font-body ${
                      hasConflict
                        ? 'text-amber-900'
                        : isBlocked
                        ? 'text-rose-700'
                        : holiday
                        ? 'text-purple-900'
                        : hasShoots
                        ? 'text-primary'
                        : 'text-neutral-700'
                    }`}>
                      {day}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Holiday: Icon-First with Hover-Revealed Tooltip */}
                      {holiday && (
                        <IconHoverTooltip
                          icon={
                            <span className="p-1 rounded-md bg-purple-100 text-purple-800 border border-purple-200 cursor-help transition-transform hover:scale-110">
                              <Star size={10} className="fill-purple-600 text-purple-600" />
                            </span>
                          }
                          text={`★ ${holiday.name}`}
                          subtext="Philippine National / Special Holiday"
                          badgeColor="bg-purple-950"
                        />
                      )}

                      {/* Sunday: Icon-First with Hover-Revealed Tooltip */}
                      {!holiday && isSunday && (
                        <IconHoverTooltip
                          icon={
                            <span className="p-1 rounded-md bg-amber-100/70 text-amber-800 border border-amber-200/60 cursor-help transition-transform hover:scale-110">
                              <Coffee size={10} className="text-amber-700" />
                            </span>
                          }
                          text="Sunday · Closed / By Appt"
                          subtext="Studio closed; shoots by appointment only"
                          badgeColor="bg-neutral-900"
                        />
                      )}

                      {savingDate === day && <Loader2 size={10} className="animate-spin text-gold" />}

                      {/* Status Indicator Dot with Tooltip */}
                      <IconHoverTooltip
                        icon={
                          <span className={`w-2 h-2 rounded-full cursor-help transition-transform hover:scale-125 ${
                            hasConflict
                              ? 'bg-amber-500 ring-2 ring-amber-300 animate-pulse'
                              : isBlocked
                              ? 'bg-rose-500 ring-2 ring-rose-200'
                              : 'bg-emerald-500 ring-2 ring-emerald-200'
                          }`} />
                        }
                        text={
                          hasConflict
                            ? 'Conflict Detected'
                            : isBlocked
                            ? 'Off-Duty / Blocked'
                            : 'Available for Shoots'
                        }
                        subtext={
                          hasConflict
                            ? 'Photoshoot booked on off-duty day'
                            : isBlocked
                            ? 'Click to set available'
                            : 'Click to mark off-duty'
                        }
                        badgeColor={
                          hasConflict
                            ? 'bg-amber-950'
                            : isBlocked
                            ? 'bg-rose-950'
                            : 'bg-emerald-950'
                        }
                      />
                    </div>
                  </div>

                  {/* Day Content Badges (Icon-First with Hover Tooltips) */}
                  <div className="space-y-1.5 my-auto">
                    {hasShoots && (
                      <IconHoverTooltip
                        className="w-full"
                        icon={
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDayData({ day, dateStr, dayShoots, isBlocked });
                            }}
                            className={`w-full px-2 py-1 rounded-lg text-xs font-bold flex items-center justify-between gap-1 cursor-pointer transition-transform hover:scale-[1.02] shadow-2xs ${
                              hasConflict
                                ? 'bg-amber-200 text-amber-950 border border-amber-400'
                                : 'bg-neutral-900 text-white hover:bg-black'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Camera size={11} className="shrink-0 text-gold" />
                              <span>{dayShoots.length}</span>
                            </span>
                            <ChevronRight size={10} className="text-neutral-400 shrink-0" />
                          </button>
                        }
                        text={`${dayShoots.length} Photoshoot Session${dayShoots.length > 1 ? 's' : ''}`}
                        subtext="Click to view full booking details"
                      />
                    )}

                    {hasConflict ? (
                      <IconHoverTooltip
                        className="w-full"
                        icon={
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (dayShoots[0]) triggerAiReschedule(dayShoots[0]);
                            }}
                            className="w-full px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300 animate-pulse flex items-center justify-center gap-1 cursor-pointer hover:bg-amber-300 transition-colors"
                          >
                            <Wand2 size={10} className="text-amber-800 shrink-0" />
                            <span className="hidden group-hover:inline text-[9px]">AI Fix</span>
                          </div>
                        }
                        text="Off-Duty Shoot Conflict"
                        subtext="Click to auto-reschedule via Studio AI"
                        badgeColor="bg-amber-950"
                      />
                    ) : isBlocked && !hasShoots ? (
                      <IconHoverTooltip
                        icon={
                          <span className="p-0.5 rounded bg-rose-100 text-rose-700 inline-flex items-center">
                            <Ban size={10} />
                          </span>
                        }
                        text="Off-Duty"
                        subtext="Blocked date"
                        badgeColor="bg-rose-950"
                      />
                    ) : null}
                  </div>

                  {/* Bottom Day Status Indicator (Silent by Default, Reveals Details on Hover) */}
                  <div className="text-[9px] font-medium flex items-center justify-between min-h-[14px]">
                    {hasShoots ? (
                      <span className="text-gold font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        Details &rarr;
                      </span>
                    ) : (
                      <span className="text-neutral-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {isBlocked ? 'Blocked' : 'Open'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Studio Guideline Bar (Icon-First with Expandable Button) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-600 font-body flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconHoverTooltip
              icon={<Info size={15} className="text-gold shrink-0 cursor-help" />}
              text="Studio Operating Schedule"
              subtext="Mon – Sat: 9:00 AM – 6:00 PM · Sunday: By Appointment Only"
            />
            <span className="text-[11px] sm:text-xs text-neutral-600">
              Hours: <strong className="text-primary">{STUDIO_HOURS.label}</strong> ({STUDIO_HOURS.days}). Tap any date to toggle off-duty.
            </span>
          </div>

          {conflicts.length > 0 && (
            <button
              type="button"
              onClick={() => triggerAiReschedule(conflicts[0])}
              title={`Resolve ${conflicts.length} photoshoot schedule conflict(s) with AI`}
              className="hover-reveal-pill gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Wand2 size={14} className="shrink-0 animate-pulse" />
              <span className="reveal-label">
                Resolve {conflicts.length} AI Conflict{conflicts.length > 1 ? 's' : ''}
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-mono shrink-0 ml-1">
                {conflicts.length}
              </span>
            </button>
          )}
        </div>

      </div>

      {/* ── 4. Day Inspector Drawer / Modal ───────────────────────────────────── */}
      {selectedDayData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-fade-in font-body"
          onClick={() => setSelectedDayData(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-neutral-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold-dark flex items-center justify-center font-bold text-sm">
                  {selectedDayData.day}
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-primary">
                    Day Schedule · {selectedDayData.dateStr}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {selectedDayData.dayShoots.length} assigned photoshoot session{selectedDayData.dayShoots.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayData(null)}
                className="text-neutral-400 hover:text-primary p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Day Shift Status Control */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-primary block">Day Shift Status</span>
                <span className="text-[11px] text-neutral-500">
                  {selectedDayData.isBlocked ? 'Marked as Off-Duty / Blocked' : 'Marked as Available for Shoots'}
                </span>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await toggleDayAvailability(selectedDayData.day);
                  setSelectedDayData(prev => ({ ...prev, isBlocked: !prev.isBlocked }));
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedDayData.isBlocked
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                }`}
              >
                {selectedDayData.isBlocked ? <Check size={12} /> : <X size={12} />}
                <span>{selectedDayData.isBlocked ? 'Set Available' : 'Set Blocked'}</span>
              </button>
            </div>

            {/* Assigned Shoots on this Date */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                Assigned Bookings on this Date
              </span>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {selectedDayData.dayShoots.map(shoot => (
                  <div
                    key={shoot.id}
                    className="p-3.5 rounded-2xl border border-neutral-200/80 bg-white hover:border-gold/60 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                          #{shoot.booking_number}
                        </span>
                        <span className="text-xs font-bold text-primary truncate">
                          {shoot.service?.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-neutral-500 text-[11px] mt-1">
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-gold" />
                          <span>{shoot.preferred_time || 'Studio Slot'}</span>
                        </span>
                        {shoot.customer?.first_name && (
                          <span className="flex items-center gap-1 truncate">
                            <User size={11} className="text-neutral-400" />
                            <span className="truncate">{shoot.customer.first_name}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDayData(null);
                          triggerAiReschedule(shoot);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Reschedule this session using Studio AI"
                      >
                        <Wand2 size={12} className="text-amber-700" />
                        <span>AI Reschedule</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/photographer/bookings?id=${shoot.id}`)}
                        className="p-1.5 rounded-xl text-neutral-400 hover:text-primary hover:bg-neutral-100 border border-neutral-200 cursor-pointer"
                        title="View Full Booking Details"
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayData(null)}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Smart AI Auto-Reschedule Assistant Modal ──────────────────────── */}
      {aiModalOpen && activeConflictBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-fade-in font-body"
          onClick={() => setAiModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 border border-neutral-200 overflow-hidden relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Top AI Badge & Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gold/15 text-gold-dark flex items-center justify-center shadow-xs">
                  <Wand2 size={20} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-primary flex items-center gap-2">
                    <span>Studio AI Auto-Reschedule</span>
                    <span className="px-2 py-0.5 rounded-md bg-gold/15 text-gold-dark text-[10px] font-bold">
                      AI Assistant
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Conflict detected on #{activeConflictBooking.booking_number} · Proposing best bay slots
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="text-neutral-400 hover:text-primary p-1.5 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Conflicting Booking Card */}
            <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200/80 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary text-sm truncate">
                    {activeConflictBooking.service?.name || 'Studio Session'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                    Off-Duty
                  </span>
                </div>
                <div className="flex items-center gap-3 text-neutral-500 text-xs mt-1 flex-wrap">
                  <span className="flex items-center gap-1 font-mono text-rose-700 font-semibold">
                    <CalendarDays size={12} />
                    <span>{activeConflictBooking.event_date}</span>
                  </span>
                  <span className="flex items-center gap-1 font-mono text-neutral-600">
                    <Clock size={12} />
                    <span>{(activeConflictBooking.preferred_time || '09:00').slice(0, 5)}</span>
                  </span>
                  {activeConflictBooking.customer?.first_name && (
                    <span className="flex items-center gap-1 text-neutral-600 truncate">
                      <User size={12} className="text-neutral-400" />
                      <span className="truncate">{activeConflictBooking.customer.first_name} {activeConflictBooking.customer.last_name || ''}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* AI Recommendation Deck */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-gold" />
                  <span>AI Recommended Slots (0 Collisions)</span>
                </span>
                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <Clock size={10} className="text-gold" />
                  <span>Hours: 9 AM – 6 PM</span>
                </span>
              </div>

              {aiSuggestions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {aiSuggestions.map((slot, idx) => {
                    const isSelected = selectedSlot?.date === slot.date;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedSlot(slot);
                          setCustomRescheduleDate(slot.date);
                          setCustomRescheduleTime(slot.time?.slice(0, 5) || '09:00');
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? 'bg-neutral-900 text-white border-neutral-900 ring-2 ring-gold/50 shadow-sm'
                            : 'bg-white border-neutral-200 hover:border-gold/50 text-neutral-800 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            isSelected ? 'bg-gold text-neutral-950' : 'bg-gold/15 text-gold-dark'
                          }`}>
                            {slot.score}% MATCH
                          </span>
                          <span className={`text-[10px] font-mono font-medium ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                            +{slot.daysFromOriginal}d
                          </span>
                        </div>

                        <div>
                          <div className="font-bold text-xs">{slot.formattedDate}</div>
                          <div className={`text-[11px] font-mono flex items-center gap-1.5 mt-0.5 ${
                            isSelected ? 'text-gold' : 'text-neutral-600'
                          }`}>
                            <Clock size={11} />
                            <span>{slot.time?.slice(0, 5) || '09:00'}</span>
                            {slot.holiday && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border truncate max-w-[120px] ${
                                isSelected ? 'bg-purple-900/60 text-purple-200 border-purple-700' : 'bg-purple-50 text-purple-700 border-purple-200'
                              }`} title={`Holiday: ${slot.holiday}`}>
                                ★ {slot.holiday}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Clean status tags instead of wordy paragraphs */}
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-white/10 text-neutral-200' : 'bg-neutral-100 text-neutral-600'
                          }`}>
                            {slot.isSunday ? 'Sun (By Appt)' : 'Studio Hours (9-6)'}
                          </span>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-emerald-900/60 text-emerald-200' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            0 Collisions
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  No automated slots found within 30 days. Please pick a manual date and time below.
                </div>
              )}
            </div>

            {/* Override & Confirmation Form */}
            <form onSubmit={handleExecuteAiReschedule} className="space-y-3 pt-2 border-t border-neutral-100 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                    Confirmed Date
                  </label>
                  <input
                    type="date"
                    required
                    value={customRescheduleDate}
                    onChange={e => setCustomRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                    Time (Studio: 9 AM – 6 PM)
                  </label>
                  <input
                    type="time"
                    required
                    min="09:00"
                    max="18:00"
                    step="1800"
                    value={customRescheduleTime}
                    onChange={e => setCustomRescheduleTime(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Note to Client
                </label>
                <input
                  type="text"
                  required
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Schedule adjustment resolved; moved to next available bay slot"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setAiModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 font-semibold text-xs hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={executingAiReschedule || !customRescheduleDate}
                  className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {executingAiReschedule ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Rescheduling…</span>
                    </>
                  ) : (
                    <>
                      <Wand2 size={13} />
                      <span>Confirm AI Reschedule</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
