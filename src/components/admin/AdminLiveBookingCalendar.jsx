/**
 * AdminLiveBookingCalendar.jsx
 * ============================
 * Live Studio Booking & Capacity Scheduling Engine for Admin Command Center.
 *
 * Capabilities:
 * • Visual month grid displaying live customer bookings across all packages.
 * • Strict scheduling enforcement:
 *    1. Hourly Camera Bay Slots: 8 discrete 1-hr sessions (8AM–5PM).
 *    2. School Section Pictorials: Locks entire date for cohort campus shoot.
 * • Admin Multi-Day Extension Manager: Extend school graduation batches to 2+ days.
 * • Admin Blackout / Studio Maintenance Lockout: 1-click date blocking.
 * • Real-time bay occupancy indicators and 1-click inspection / walk-in creation.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock,
  Camera, GraduationCap, Sparkles, AlertCircle, CheckCircle2,
  Plus, Eye, Edit3, Lock, Unlock, X, RefreshCw, CalendarDays,
  ShieldAlert, Building2, User, Phone, MapPin
} from "lucide-react";
import {
  STUDIO_HOURLY_SLOTS,
  STUDIO_OPERATING_HOURS,
  normalizeSlotTime,
  getLocalAdminBlocks,
  getLocalMultiDayBookings,
  adminBlockDate,
  adminUnblockDate,
  adminSetSchoolBatchMultiDay,
  isFullDayBooking,
  isOrderCancelledOrDeleted,
  subscribeToAvailabilityUpdates,
} from "../../services/liveAvailabilityService";

export default function AdminLiveBookingCalendar({
  bookings = [],
  onInspectBooking,
  onEditBooking,
  onCreateBooking,
  onRefresh,
}) {
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Local blocks & multi-day cached state
  const [localBlocks, setLocalBlocks] = useState(() => getLocalAdminBlocks());
  const [multiDayList, setMultiDayList] = useState(() => getLocalMultiDayBookings());

  // Modal states
  const [isMultiDayModalOpen, setIsMultiDayModalOpen] = useState(false);
  const [targetBatchForMultiDay, setTargetBatchForMultiDay] = useState(null);
  const [multiDayCount, setMultiDayCount] = useState(2);
  const [multiDayNote, setMultiDayNote] = useState("");

  const [isBlackoutModalOpen, setIsBlackoutModalOpen] = useState(false);
  const [blackoutReason, setBlackoutReason] = useState("Studio Maintenance / Reserved");

  // Reload local blocks on live update event
  const refreshLocalState = useCallback(() => {
    setLocalBlocks(getLocalAdminBlocks());
    setMultiDayList(getLocalMultiDayBookings());
  }, []);

  useEffect(() => {
    const unsub = subscribeToAvailabilityUpdates(refreshLocalState);
    return unsub;
  }, [refreshLocalState]);

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  const jumpToToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayStr);
  };

  // Group active bookings by event_date
  const bookingsByDate = useMemo(() => {
    const map = {};
    for (const b of bookings) {
      if (!b.event_date) continue;
      // Skip deleted or cancelled
      if (isOrderCancelledOrDeleted(b)) continue;
      if (!map[b.event_date]) map[b.event_date] = [];
      map[b.event_date].push(b);
    }
    return map;
  }, [bookings]);

  // Calendar days grid computation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateNumber: d,
        dateStr,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayBookings = bookingsByDate[dateStr] || [];

      // Check admin blackout block
      const adminBlock = localBlocks.find((b) => b.date === dateStr);

      // Check multi-day school spans
      const activeMultiDay = multiDayList.find((m) => dateStr >= m.startDate && dateStr <= m.endDate);

      // Check if any booking is full-day
      const fullDayBooking = dayBookings.find((b) => isFullDayBooking(b).isBlocked);

      // Check hourly booked slots
      const bookedSlotKeys = new Set();
      for (const b of dayBookings) {
        const slotKey = normalizeSlotTime(b.preferred_time);
        if (slotKey) bookedSlotKeys.add(slotKey);
      }

      const isSchoolBatch = !!activeMultiDay || (fullDayBooking && isFullDayBooking(fullDayBooking).reason?.toLowerCase().includes("school"));
      const isBlackout = !!adminBlock;
      const isFullDay = isSchoolBatch || isBlackout || bookedSlotKeys.size >= STUDIO_HOURLY_SLOTS.length;

      days.push({
        dateNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        bookingsCount: dayBookings.length,
        bookedSlotsCount: bookedSlotKeys.size,
        isFullDay,
        isSchoolBatch,
        isBlackout,
        fullDayReason: adminBlock?.reason || (activeMultiDay ? `School Batch: ${activeMultiDay.schoolName}` : fullDayBooking ? isFullDayBooking(fullDayBooking).reason : null),
      });
    }

    // Next month padding
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextDate = new Date(year, month + 1, d);
        const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({
          dateNumber: d,
          dateStr,
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [currentMonth, bookingsByDate, localBlocks, multiDayList, todayStr, selectedDate]);

  // Selected date data
  const selectedDateBookings = useMemo(() => {
    return bookingsByDate[selectedDate] || [];
  }, [bookingsByDate, selectedDate]);

  const selectedDateAdminBlock = useMemo(() => {
    return localBlocks.find((b) => b.date === selectedDate);
  }, [localBlocks, selectedDate]);

  const selectedDateMultiDay = useMemo(() => {
    return multiDayList.find((m) => selectedDate >= m.startDate && selectedDate <= m.endDate);
  }, [multiDayList, selectedDate]);

  const selectedDateFullDayBooking = useMemo(() => {
    return selectedDateBookings.find((b) => isFullDayBooking(b).isBlocked);
  }, [selectedDateBookings]);

  // Map hourly slots to bookings
  const hourlySlotAssignments = useMemo(() => {
    const assignments = {};
    for (const slot of STUDIO_HOURLY_SLOTS) {
      assignments[slot.time] = [];
    }

    for (const b of selectedDateBookings) {
      if (isOrderCancelledOrDeleted(b)) continue;
      const slotKey = normalizeSlotTime(b.preferred_time);
      if (slotKey && assignments[slotKey]) {
        assignments[slotKey].push(b);
      }
    }
    return assignments;
  }, [selectedDateBookings]);

  // Handle Multi-day Batch submission
  const handleSaveMultiDay = () => {
    if (!targetBatchForMultiDay || !targetBatchForMultiDay.startDate) return;
    adminSetSchoolBatchMultiDay({
      bookingId: targetBatchForMultiDay.id,
      schoolName: targetBatchForMultiDay.schoolName,
      startDate: targetBatchForMultiDay.startDate,
      daysCount: parseInt(multiDayCount, 10) || 2,
      note: multiDayNote,
    });
    refreshLocalState();
    setIsMultiDayModalOpen(false);
    setTargetBatchForMultiDay(null);
  };

  // Handle Blackout submission
  const handleConfirmBlackout = () => {
    if (!selectedDate) return;
    adminBlockDate(selectedDate, blackoutReason);
    refreshLocalState();
    setIsBlackoutModalOpen(false);
  };

  const handleUnblock = () => {
    if (!selectedDate) return;
    adminUnblockDate(selectedDate);
    refreshLocalState();
  };

  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long" });
  const yearNumber = currentMonth.getFullYear();

  const formattedSelected = useMemo(() => {
    if (!selectedDate) return "None selected";
    const parsed = new Date(selectedDate + "T00:00:00");
    if (isNaN(parsed.getTime())) return selectedDate;
    return parsed.toLocaleDateString("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Top Header Strip ── */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-neutral-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/20 text-gold-dark flex items-center justify-center shrink-0 border border-gold/40 shadow-xs">
            <CalendarDays size={20} className="text-amber-900" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading font-extrabold text-base sm:text-lg text-neutral-950 tracking-tight leading-none">
                Live Studio Booking &amp; Capacity Calendar
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-body mt-1">
              Real-time schedule coordinator across 8-hour studio bays and full-day school pictorial cohorts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={jumpToToday}
            className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all cursor-pointer border border-neutral-200"
          >
            Today
          </button>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-all cursor-pointer border border-neutral-200"
              title="Refresh database bookings"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Master Calendar Grid + Selected Day Inspector Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Month Grid (7 Cols on LG) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-extrabold text-lg sm:text-xl text-neutral-950">
                {monthName} <span className="text-gold font-bold">{yearNumber}</span>
              </h3>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="w-8 h-8 rounded-xl text-neutral-600 hover:text-neutral-950 bg-neutral-50 hover:bg-amber-500/15 border border-neutral-200/80 flex items-center justify-center transition-all cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="w-8 h-8 rounded-xl text-neutral-600 hover:text-neutral-950 bg-neutral-50 hover:bg-amber-500/15 border border-neutral-200/80 flex items-center justify-center transition-all cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Column Headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((wd, i) => (
              <div
                key={i}
                className={`text-[11px] font-heading font-bold py-1.5 uppercase tracking-wider rounded-lg ${i === 0 || i === 6 ? "text-amber-800 bg-amber-50/50" : "text-neutral-500 bg-neutral-50/40"
                  }`}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              if (!day.isCurrentMonth) {
                return (
                  <div
                    key={idx}
                    className="min-h-16 p-1.5 rounded-xl border border-dashed border-neutral-100 bg-neutral-50/20 text-neutral-300 text-xs font-medium pointer-events-none select-none"
                  >
                    {day.dateNumber}
                  </div>
                );
              }

              const isSelected = day.isSelected;
              const isToday = day.isToday;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`min-h-18 p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${isSelected
                      ? "border-neutral-950 bg-neutral-950 text-white shadow-md ring-2 ring-gold/60 scale-102 z-10"
                      : isToday
                        ? "border-gold/80 bg-amber-50/40 hover:bg-gold/20"
                        : "border-neutral-200/70 bg-white hover:border-gold/50 hover:bg-amber-50/20"
                    }`}
                >
                  {/* Top Day Number & Badges */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold leading-none ${isSelected
                          ? "text-gold"
                          : isToday
                            ? "text-amber-900 font-extrabold"
                            : "text-neutral-800"
                        }`}
                    >
                      {day.dateNumber}
                    </span>

                    {/* Bookings Count Pill */}
                    {day.bookingsCount > 0 && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight ${isSelected
                            ? "bg-gold text-neutral-950"
                            : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                          }`}
                      >
                        {day.bookingsCount}
                      </span>
                    )}
                  </div>

                  {/* Date Status Badges */}
                  <div className="space-y-0.5 mt-1">
                    {day.isBlackout && (
                      <span className="block truncate text-[9px] font-bold uppercase tracking-tight px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-400/30">
                        Blackout
                      </span>
                    )}

                    {day.isSchoolBatch && (
                      <span className="block truncate text-[9px] font-bold uppercase tracking-tight px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                        🎓 School
                      </span>
                    )}

                    {!day.isSchoolBatch && !day.isBlackout && day.bookedSlotsCount > 0 && (
                      <span
                        className={`block truncate text-[9px] font-semibold px-1 py-0.2 rounded ${isSelected
                            ? "bg-white/10 text-neutral-300"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                      >
                        {day.bookedSlotsCount}/8 Bays
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500 flex-wrap gap-2">
            <div className="flex items-center gap-3 text-[11px] flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Today</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>School Batch Lock</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Studio Blackout</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Hourly Slots Open</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Selected Day Schedule & Action Inspector (5 Cols on LG) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
          {/* Day Inspector Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-900 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 inline-block mb-1">
                Day Schedule Inspector
              </span>
              <h3 className="font-heading font-extrabold text-base sm:text-lg text-neutral-950 leading-tight">
                {formattedSelected}
              </h3>
            </div>

            {/* Quick Blackout / Unblock Buttons */}
            <div className="flex items-center gap-1.5">
              {selectedDateAdminBlock ? (
                <button
                  type="button"
                  onClick={handleUnblock}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Unblock date and restore bay availability"
                >
                  <Unlock size={13} />
                  <span>Unblock Date</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsBlackoutModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Blackout this date for studio maintenance or closure"
                >
                  <Lock size={13} />
                  <span>Blackout Date</span>
                </button>
              )}
            </div>
          </div>

          {/* Full-Day Lock Banner (if active) */}
          {(selectedDateAdminBlock || selectedDateMultiDay || selectedDateFullDayBooking) && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-gold/15 to-transparent border border-gold/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-neutral-950">
                  {selectedDateAdminBlock ? (
                    <>
                      <ShieldAlert size={15} className="text-rose-600" />
                      <span>Studio Blackout Active</span>
                    </>
                  ) : selectedDateMultiDay ? (
                    <>
                      <GraduationCap size={15} className="text-indigo-800" />
                      <span>Multi-Day School Cohort Lock</span>
                    </>
                  ) : isFullDayBooking(selectedDateFullDayBooking).reason?.toLowerCase().includes("school") ? (
                    <>
                      <GraduationCap size={15} className="text-indigo-800" />
                      <span>School Section Graduation Shoot</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} className="text-amber-800" />
                      <span>Full-Day Studio Session</span>
                    </>
                  )}
                </span>

                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-950 text-gold border border-gold/40">
                  Day Locked
                </span>
              </div>

              <p className="text-xs text-neutral-700 font-body">
                {selectedDateAdminBlock
                  ? selectedDateAdminBlock.reason
                  : selectedDateMultiDay
                    ? `Cohort: ${selectedDateMultiDay.schoolName} (${selectedDateMultiDay.daysCount} shoot days: ${selectedDateMultiDay.startDate} to ${selectedDateMultiDay.endDate})`
                    : isFullDayBooking(selectedDateFullDayBooking).reason}
              </p>

              {/* Multi-Day Extension Action (if school cohort) */}
              {(selectedDateMultiDay || (selectedDateFullDayBooking && isFullDayBooking(selectedDateFullDayBooking).reason?.toLowerCase().includes("school"))) && (
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-500 font-medium">Takes 2+ days?</span>
                  <button
                    type="button"
                    onClick={() => {
                      const b = selectedDateFullDayBooking;
                      setTargetBatchForMultiDay({
                        id: b?.id || selectedDateMultiDay?.bookingId || `batch-${Date.now()}`,
                        schoolName: b?.student_details?.school || selectedDateMultiDay?.schoolName || "Partner School",
                        startDate: selectedDateMultiDay?.startDate || selectedDate,
                      });
                      setMultiDayCount(selectedDateMultiDay?.daysCount || 2);
                      setMultiDayNote(selectedDateMultiDay?.note || "");
                      setIsMultiDayModalOpen(true);
                    }}
                    className="text-xs font-bold text-neutral-950 bg-gold hover:bg-gold/90 px-3 py-1 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CalendarDays size={12} />
                    <span>Manage Multi-Day Batch</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Hourly Timeline Slots Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-heading font-bold text-neutral-800">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-gold" />
                <span>Hourly Camera Bay Timeline</span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400 font-normal">
                {STUDIO_OPERATING_HOURS}
              </span>
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {STUDIO_HOURLY_SLOTS.map((slot, index) => {
                const assigned = hourlySlotAssignments[slot.time] || [];
                const isOccupied = assigned.length > 0;

                return (
                  <React.Fragment key={slot.time}>
                    {/* Lunch Break Divider after 4th slot */}
                    {index === 4 && (
                      <div className="py-1 px-3 rounded-xl bg-neutral-100/70 border border-neutral-200/50 text-[11px] text-neutral-400 font-medium flex items-center justify-between">
                        <span>Studio Disinfection &amp; Equipment Maintenance:</span>
                        <span className="font-mono text-neutral-600 font-semibold">12:00 PM – 1:00 PM</span>
                      </div>
                    )}

                    <div
                      className={`p-3 rounded-2xl border transition-all ${isOccupied
                          ? "bg-amber-50/20 border-amber-300/80 shadow-2xs"
                          : "bg-neutral-50/50 border-neutral-200/60"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-neutral-900">
                            {slot.label}
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase">
                            {slot.period}
                          </span>
                        </div>

                        {isOccupied ? (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-950 px-2 py-0.5 rounded-full border border-amber-400/40">
                            Bay Reserved
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Open Bay
                          </span>
                        )}
                      </div>

                      {/* If Occupied: Show Bookings in Slot */}
                      {isOccupied ? (
                        <div className="space-y-1.5 pt-1">
                          {assigned.map((b) => (
                            <div
                              key={b.id}
                              className="p-2.5 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-between gap-2 shadow-2xs hover:border-gold transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-gold">
                                    {b.booking_number}
                                  </span>
                                  <span className="font-bold text-neutral-900 text-xs truncate">
                                    {b.participant_details?.full_name || (b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : "Client")}
                                  </span>
                                </div>
                                <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                                  {b.service?.name || "Studio Portrait"}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {onInspectBooking && (
                                  <button
                                    type="button"
                                    onClick={() => onInspectBooking(b)}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                                    title="Inspect booking"
                                  >
                                    <Eye size={13} />
                                  </button>
                                )}
                                {onEditBooking && (
                                  <button
                                    type="button"
                                    onClick={() => onEditBooking(b)}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-gold hover:bg-gold/10 transition-colors cursor-pointer"
                                    title="Edit schedule or details"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* If Open: Walk-in Quick Booking Button */
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-neutral-400 italic">
                            Available for individual portraits &amp; graduation sessions
                          </span>
                          {onCreateBooking && (
                            <button
                              type="button"
                              onClick={() => onCreateBooking({ date: selectedDate, time: slot.label })}
                              className="text-[11px] font-bold text-neutral-800 hover:text-neutral-950 bg-white hover:bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={12} />
                              <span>Book Slot</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Multi-Day School Cohort Extension Modal ── */}
      {isMultiDayModalOpen && targetBatchForMultiDay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-neutral-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <GraduationCap size={18} />
                </div>
                <h3 className="font-heading font-extrabold text-base text-neutral-950">
                  Manage Multi-Day School Batch
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMultiDayModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-500 font-semibold mb-1">School Partner Campus</label>
                <div className="p-2.5 bg-neutral-50 rounded-xl font-bold text-neutral-950 border border-neutral-200">
                  {targetBatchForMultiDay.schoolName}
                </div>
              </div>

              <div>
                <label className="block text-neutral-500 font-semibold mb-1">Starting Photoshoot Date</label>
                <div className="p-2.5 bg-neutral-50 rounded-xl font-mono font-bold text-neutral-950 border border-neutral-200">
                  {targetBatchForMultiDay.startDate}
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">
                  Consecutive Days Count (e.g. 2 or 3 days)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setMultiDayCount(count)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${multiDayCount === count
                          ? "bg-neutral-950 text-white border-neutral-950 shadow-xs ring-2 ring-gold/40"
                          : "bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-50"
                        }`}
                    >
                      {count} Day{count > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">
                  Administrative Note / Cohort Size
                </label>
                <textarea
                  value={multiDayNote}
                  onChange={(e) => setMultiDayNote(e.target.value)}
                  placeholder="e.g. Graduating batch of 240 students across 6 sections requiring 2 consecutive shoot days."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-300 text-amber-950 text-[11px] leading-relaxed">
                <strong>Platform Lockout Effect:</strong> Saving this will lock all {multiDayCount} consecutive calendar days ({targetBatchForMultiDay.startDate} onwards) across the client portal so no other customers can book them.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsMultiDayModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMultiDay}
                className="px-4 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-900 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 size={13} className="text-gold" />
                <span>Confirm &amp; Lock Days</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Blackout Date Modal ── */}
      {isBlackoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-neutral-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                  <Lock size={18} />
                </div>
                <h3 className="font-heading font-extrabold text-base text-neutral-950">
                  Blackout Studio Date
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBlackoutModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-500 font-semibold mb-1">Target Date</label>
                <div className="p-2.5 bg-neutral-50 rounded-xl font-mono font-bold text-neutral-950 border border-neutral-200">
                  {selectedDate}
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">Blackout Reason</label>
                <input
                  type="text"
                  value={blackoutReason}
                  onChange={(e) => setBlackoutReason(e.target.value)}
                  placeholder="e.g. Studio Maintenance, Public Holiday, Private Event"
                  className="w-full p-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                />
              </div>

              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Blacking out this date prevents all clients from selecting it on the customer booking portal.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsBlackoutModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlackout}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Lock size={13} />
                <span>Lockout Date</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

