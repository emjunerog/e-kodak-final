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
  GraduationCap, Sparkles, CheckCircle2,
  Plus, Lock, Unlock, X, RefreshCw, CalendarDays,
  ShieldAlert, Save, Loader2, AlertTriangle
} from "lucide-react";
import {
  STUDIO_HOURLY_SLOTS,
  MAX_SAME_DAY_ADJUSTMENT_MINUTES,
  parseTimeToMinutes,
  minutesToHHMM,
  formatTime24To12,
  getBookingTimeWindow,
  getBookingOccupiedSlotKeys,
  planDayReorganization,
  getLocalAdminBlocks,
  getLocalMultiDayBookings,
  adminBlockDate,
  adminUnblockDate,
  adminSetSchoolBatchMultiDay,
  isFullDayBooking,
  isOrderCancelledOrDeleted,
  subscribeToAvailabilityUpdates,
} from "../../services/liveAvailabilityService";
import { reorganizeDayScheduleWithAdjustment, getAdminBookings } from "../../services/bookingAdminService";
import { getPhotographerDisplayName, getStatusLabel } from "../../lib/bookingUtils";

const DURATION_PRESETS = [
  { label: "1 hr", minutes: 60 },
  { label: "1.5 hrs", minutes: 90 },
  { label: "2 hrs", minutes: 120 },
  { label: "2.5 hrs", minutes: 150 },
  { label: "3 hrs", minutes: 180 },
];

function formatDurationLabel(minutes) {
  const mins = Number(minutes) || 60;
  if (mins < 60) return `${mins} mins`;
  const hrs = mins / 60;
  if (mins % 60 === 0) return `${hrs} ${hrs === 1 ? "hr" : "hrs"}`;
  if (mins % 30 === 0) return `${hrs} hrs`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${h}h ${rem}m`;
}

function formatPackageName(service) {
  const text = `${service?.name || ""} ${service?.category || ""}`.toLowerCase();
  if (text.includes("senior") || text.includes("shs")) return "Senior High Package";
  if (text.includes("college")) return "College Package";
  return service?.name || "Studio Portrait";
}

function getCustomerDisplayName(b) {
  if (b?.participant_details?.booking_for === "someone_else" && b?.participant_details?.full_name) {
    return b.participant_details.full_name;
  }
  if (b?.customer) {
    const full = `${b.customer.first_name || ""} ${b.customer.last_name || ""}`.trim();
    if (full) return full;
  }
  return b?.participant_details?.full_name || b?.student_details?.student_name || "Client";
}

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

  // Full live scheduled bookings (unpaginated, merged with parent bookings prop)
  const [allScheduledBookings, setAllScheduledBookings] = useState(bookings);
  const [panelScope, setPanelScope] = useState("all"); // 'all' | 'selected'
  const [calendarToast, setCalendarToast] = useState(null);

  // Inline Time Adjustment State
  const [editingTimeBookingId, setEditingTimeBookingId] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    event_date: "",
    start_time: "",
    end_time: "",
    note: "",
  });
  const [savingTimeId, setSavingTimeId] = useState(null);

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

  const showCalendarToast = useCallback((text, type = "success") => {
    setCalendarToast({ text, type });
    setTimeout(() => setCalendarToast(null), 3500);
  }, []);

  const loadCalendarBookings = useCallback(async () => {
    const { data, error } = await getAdminBookings({
      page: 1,
      pageSize: 500,
      sortBy: "event_date",
      sortAsc: true,
      isDeleted: false,
    });
    if (!error && Array.isArray(data)) {
      setAllScheduledBookings(data);
    } else {
      setAllScheduledBookings(bookings);
    }
  }, [bookings]);

  useEffect(() => {
    loadCalendarBookings();
  }, [loadCalendarBookings]);

  // Reload local blocks & bookings on live update event
  const refreshLocalState = useCallback(() => {
    setLocalBlocks(getLocalAdminBlocks());
    setMultiDayList(getLocalMultiDayBookings());
    loadCalendarBookings();
  }, [loadCalendarBookings]);

  useEffect(() => {
    const unsub = subscribeToAvailabilityUpdates(refreshLocalState);
    return unsub;
  }, [refreshLocalState]);

  // Merge prop updates with unpaginated calendar bookings by id
  const mergedBookings = useMemo(() => {
    const byId = new Map();
    for (const b of allScheduledBookings || []) {
      if (b?.id) byId.set(b.id, b);
    }
    for (const b of bookings || []) {
      if (b?.id && !byId.has(b.id)) byId.set(b.id, b);
    }
    return Array.from(byId.values());
  }, [allScheduledBookings, bookings]);

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

  // Group active bookings by normalized YYYY-MM-DD event_date
  const bookingsByDate = useMemo(() => {
    const map = {};
    for (const b of mergedBookings) {
      if (!b?.event_date) continue;
      if (isOrderCancelledOrDeleted(b)) continue;
      const dateKey = String(b.event_date).split("T")[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(b);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const wa = getBookingTimeWindow(a);
        const wb = getBookingTimeWindow(b);
        return (wa.startMinutes ?? 9999) - (wb.startMinutes ?? 9999);
      });
    }
    return map;
  }, [mergedBookings]);

  // Chronological list of booked dates (upcoming/today first, then past dates newest first)
  const bookedDateGroups = useMemo(() => {
    const keys = Object.keys(bookingsByDate);
    const upcoming = keys.filter((d) => d >= todayStr).sort();
    const past = keys.filter((d) => d < todayStr).sort((a, b) => b.localeCompare(a));
    return [...upcoming, ...past].map((dateStr) => ({
      dateStr,
      bookings: bookingsByDate[dateStr] || [],
    }));
  }, [bookingsByDate, todayStr]);

  const visibleBookedDateGroups = useMemo(() => {
    if (panelScope === "selected") {
      return bookedDateGroups.filter((g) => g.dateStr === selectedDate);
    }
    return bookedDateGroups;
  }, [bookedDateGroups, panelScope, selectedDate]);

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

      const adminBlock = localBlocks.find((b) => b.date === dateStr);
      const activeMultiDay = multiDayList.find((m) => dateStr >= m.startDate && dateStr <= m.endDate);
      const fullDayBooking = dayBookings.find((b) => isFullDayBooking(b).isBlocked);

      const bookedSlotKeys = new Set();
      for (const b of dayBookings) {
        const occupied = getBookingOccupiedSlotKeys(b);
        for (const slotKey of occupied) bookedSlotKeys.add(slotKey);
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

  const openSlotsOnSelectedDate = useMemo(() => {
    if (selectedDateAdminBlock || selectedDateMultiDay || selectedDateFullDayBooking) {
      return [];
    }
    const occupied = new Set();
    for (const b of selectedDateBookings) {
      for (const k of getBookingOccupiedSlotKeys(b)) {
        occupied.add(k);
      }
    }
    return STUDIO_HOURLY_SLOTS.filter((slot) => !occupied.has(slot.time));
  }, [selectedDateBookings, selectedDateAdminBlock, selectedDateMultiDay, selectedDateFullDayBooking]);

  const focusCalendarOnDate = (dateStr) => {
    if (!dateStr) return;
    setSelectedDate(dateStr);
    const parsed = new Date(dateStr + "T00:00:00");
    if (!isNaN(parsed.getTime())) {
      setCurrentMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  };

  // Start inline time adjustment for a booking
  const handleStartAdjustTime = (booking) => {
    if (editingTimeBookingId === booking.id) {
      setEditingTimeBookingId(null);
      return;
    }
    const win = getBookingTimeWindow(booking);
    const fallbackStart = win.startTime || "09:00";
    const startMins = parseTimeToMinutes(fallbackStart) ?? 9 * 60;
    const endTime = win.endTime || minutesToHHMM(startMins + 60);
    setEditingTimeBookingId(booking.id);
    setAdjustForm({
      event_date: booking.event_date ? String(booking.event_date).split("T")[0] : todayStr,
      start_time: fallbackStart,
      end_time: endTime,
      note: win.note || "",
    });
  };

  const handleApplyDurationPreset = (presetMinutes) => {
    const startMins = parseTimeToMinutes(adjustForm.start_time) ?? 9 * 60;
    const boundedDur = Math.min(MAX_SAME_DAY_ADJUSTMENT_MINUTES, Math.max(60, presetMinutes));
    const cappedEnd = Math.min(20 * 60, startMins + boundedDur);
    setAdjustForm((prev) => ({
      ...prev,
      end_time: minutesToHHMM(cappedEnd),
    }));
  };

  const handleSaveTimeAdjustment = async (booking) => {
    const startMins = parseTimeToMinutes(adjustForm.start_time);
    const endMins = parseTimeToMinutes(adjustForm.end_time);
    const bookingDateStr = booking.event_date ? String(booking.event_date).split("T")[0] : "";
    if (!bookingDateStr) {
      showCalendarToast("Booking does not have a scheduled date.", "error");
      return;
    }
    if (startMins == null || endMins == null || endMins <= startMins) {
      showCalendarToast("End time must be later than start time.", "error");
      return;
    }

    const durationMinutes = endMins - startMins;
    if (durationMinutes > MAX_SAME_DAY_ADJUSTMENT_MINUTES) {
      showCalendarToast("Hour adjustments are limited to 3 hours max within the same day.", "error");
      return;
    }

    const startHHMM = minutesToHHMM(startMins);
    const endHHMM = minutesToHHMM(endMins);

    setSavingTimeId(booking.id);
    const result = await reorganizeDayScheduleWithAdjustment({
      targetBooking: booking,
      startTime: startHHMM,
      endTime: endHHMM,
      note: adjustForm.note,
    });
    setSavingTimeId(null);

    if (!result.success) {
      showCalendarToast(result.error?.message || "Failed to update booking time.", "error");
      return;
    }

    if (result.updatedMap) {
      setAllScheduledBookings((prev) =>
        prev.map((row) => result.updatedMap[row.id] || row)
      );
    }

    focusCalendarOnDate(bookingDateStr);
    setEditingTimeBookingId(null);

    const movedCount = result.plan?.reorganized?.length || 0;
    const movedNote = movedCount > 0
      ? ` Auto-organized ${movedCount} affected ${movedCount === 1 ? "booking" : "bookings"} into open slots.`
      : "";
    showCalendarToast(
      `Updated #${booking.booking_number} to ${formatTime24To12(startHHMM)} – ${formatTime24To12(endHHMM)} (${formatDurationLabel(durationMinutes)}).${movedNote}`
    );
    if (onRefresh) onRefresh();
  };

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
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  return (
    <div className="animate-fade-in">
      {/* ── Unified Calendar & Schedule Card ── */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-2xs overflow-hidden">
        {/* Top Header Strip */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/20 text-gold-dark flex items-center justify-center shrink-0 border border-gold/40 shadow-xs">
              <CalendarDays size={20} className="text-amber-900" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-base sm:text-lg text-neutral-950 tracking-tight leading-none">
                Live Studio Booking &amp; Capacity Calendar
              </h2>
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
                onClick={() => { refreshLocalState(); if (onRefresh) onRefresh(); }}
                className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-all cursor-pointer border border-neutral-200"
                title="Refresh database bookings"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Master Calendar Grid + Selected Day Inspector Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 items-start divide-y lg:divide-y-0 lg:divide-x divide-neutral-100">
          {/* Left Side: Month Grid (7 Cols on LG) */}
          <div className="lg:col-span-7 p-4 sm:p-5 space-y-4">
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
              const hasBookings = day.bookingsCount > 0;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`min-h-18 p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${isSelected
                      ? hasBookings
                        ? "border-emerald-600 bg-neutral-950 text-white shadow-md ring-2 ring-emerald-400/70 scale-102 z-10"
                        : "border-neutral-950 bg-neutral-950 text-white shadow-md ring-2 ring-gold/60 scale-102 z-10"
                      : day.isBlackout
                        ? "border-rose-300 bg-rose-50/80 hover:bg-rose-100/70"
                        : hasBookings
                          ? "border-emerald-300 bg-emerald-50/85 hover:bg-emerald-100/80"
                          : isToday
                            ? "border-gold/80 bg-amber-50/40 hover:bg-gold/20"
                            : "border-neutral-200/70 bg-white hover:border-gold/50 hover:bg-amber-50/20"
                    }`}
                >
                  {/* Top Day Number & Badges */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold leading-none ${isSelected
                          ? hasBookings
                            ? "text-emerald-300"
                            : "text-gold"
                          : day.isBlackout
                            ? "text-rose-900 font-extrabold"
                            : hasBookings
                              ? "text-emerald-950 font-extrabold"
                              : isToday
                                ? "text-amber-900 font-extrabold"
                                : "text-neutral-800"
                        }`}
                    >
                      {day.dateNumber}
                    </span>

                    {/* Bookings Count Pill */}
                    {hasBookings && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight ${isSelected
                            ? "bg-emerald-500 text-neutral-950"
                            : "bg-emerald-600 text-white shadow-2xs"
                          }`}
                      >
                        {day.bookingsCount}
                      </span>
                    )}
                  </div>

                  {/* Date Status Badges */}
                  <div className="space-y-0.5 mt-1">
                    {day.isBlackout && (
                      <span className={`block truncate text-[9px] font-bold uppercase tracking-tight px-1 py-0.2 rounded border ${isSelected
                          ? "bg-rose-500/20 text-rose-300 border-rose-400/30"
                          : "bg-rose-100 text-rose-800 border-rose-200"
                        }`}>
                        Blackout
                      </span>
                    )}

                    {day.isSchoolBatch && (
                      <span className="block truncate text-[9px] font-bold uppercase tracking-tight px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                        🎓 School
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Booked Dates Schedule & Editable Time Adjuster (5 Cols on LG) */}
        <div className="lg:col-span-5 p-4 sm:p-5 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
            <div>
              <h3 className="font-heading font-extrabold text-base sm:text-lg text-neutral-950 leading-tight">
                Scheduled Bookings &amp; Time Adjustments
              </h3>
            </div>

            {/* Scope Filter Toggle: All Booked Dates vs Selected Day */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-neutral-100 border border-neutral-200/80 shrink-0 self-start">
              <button
                type="button"
                onClick={() => setPanelScope("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  panelScope === "all"
                    ? "bg-white text-neutral-950 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                All Booked
              </button>
              <button
                type="button"
                onClick={() => setPanelScope("selected")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  panelScope === "selected"
                    ? "bg-white text-neutral-950 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                Selected Day
              </button>
            </div>
          </div>

          {/* Selected Date Action Bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarIcon size={13} className="text-neutral-600 shrink-0" />
              <span className="text-xs font-semibold text-neutral-800 truncate">
                {formattedSelected}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onCreateBooking && (
                <button
                  type="button"
                  disabled={openSlotsOnSelectedDate.length === 0}
                  onClick={() =>
                    onCreateBooking({
                      date: selectedDate,
                      time: `${openSlotsOnSelectedDate[0].time}:00`,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-100 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed text-neutral-900 border border-neutral-200 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title={
                    openSlotsOnSelectedDate.length === 0
                      ? "All times on this date are booked or blocked"
                      : `Create booking at next open slot (${openSlotsOnSelectedDate[0].display})`
                  }
                >
                  <Plus size={12} />
                  <span>
                    {selectedDateAdminBlock || selectedDateMultiDay || selectedDateFullDayBooking
                      ? "Date Blocked"
                      : openSlotsOnSelectedDate.length === 0
                        ? "Fully Booked"
                        : "Book Date"}
                  </span>
                </button>
              )}
              {selectedDateAdminBlock ? (
                <button
                  type="button"
                  onClick={handleUnblock}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Unblock date and restore bay availability"
                >
                  <Unlock size={12} />
                  <span>Unblock</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsBlackoutModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Blackout this date for studio maintenance or closure"
                >
                  <Lock size={12} />
                  <span>Blackout Date</span>
                </button>
              )}
            </div>
          </div>

          {/* Inline Toast Feedback */}
          {calendarToast && (
            <div
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border ${
                calendarToast.type === "error"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {calendarToast.type === "error" ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                {calendarToast.text}
              </span>
              <button
                type="button"
                onClick={() => setCalendarToast(null)}
                className="opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Full-Day Lock Banner (if active on selected calendar day) */}
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

          {/* Booked Dates List */}
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {visibleBookedDateGroups.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/60 text-center space-y-2">
                <CalendarDays size={24} className="mx-auto text-neutral-400" />
                <p className="text-xs font-bold text-neutral-800">
                  {panelScope === "selected"
                    ? `No bookings scheduled for ${formattedSelected}`
                    : "No booked dates found"}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {panelScope === "selected"
                    ? "Select a highlighted date on the calendar or switch to All Booked Dates."
                    : "Bookings with a scheduled event date will appear here for time and duration adjustments."}
                </p>
                <div className="pt-1 flex items-center justify-center gap-2">
                  {panelScope === "selected" && bookedDateGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPanelScope("all")}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                    >
                      Show All Booked Dates ({bookedDateGroups.length})
                    </button>
                  )}
                  {onCreateBooking && (
                    <button
                      type="button"
                      onClick={() => onCreateBooking({ date: selectedDate, time: "09:00:00" })}
                      className="px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-neutral-800 text-xs font-bold cursor-pointer hover:bg-neutral-100 transition-colors inline-flex items-center gap-1"
                    >
                      <Plus size={12} />
                      <span>New Booking</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              visibleBookedDateGroups.map(({ dateStr, bookings: dayList }) => {
                const parsedDate = new Date(dateStr + "T00:00:00");
                const dateHeading = !isNaN(parsedDate.getTime())
                  ? parsedDate.toLocaleDateString("en-PH", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : dateStr;
                const isDateSelected = dateStr === selectedDate;
                const isTodayDate = dateStr === todayStr;
                const isPastDate = dateStr < todayStr;
                const isDayBlackout = localBlocks.some((blk) => blk.date === dateStr);

                return (
                  <div
                    key={dateStr}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isDateSelected
                        ? "border-neutral-900 ring-1 ring-amber-400/50 bg-amber-50/15 shadow-xs"
                        : "border-neutral-200/90 bg-neutral-50/40 hover:border-neutral-300"
                    }`}
                  >
                    {/* Date Group Header */}
                    <button
                      type="button"
                      onClick={() => focusCalendarOnDate(dateStr)}
                      className="w-full px-3.5 py-2.5 bg-white/90 border-b border-neutral-100 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-neutral-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-heading font-extrabold text-xs sm:text-sm text-neutral-950">
                          {dateHeading}
                        </span>
                        {isTodayDate && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                            Today
                          </span>
                        )}
                        {isPastDate && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                            Past
                          </span>
                        )}
                        {isDayBlackout && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                            Blackout
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full shrink-0">
                        {dayList.length} {dayList.length === 1 ? "Booking" : "Bookings"}
                      </span>
                    </button>

                    {/* Bookings inside Date Group */}
                    <div className="p-2.5 space-y-2">
                      {dayList.map((b) => {
                        const timeWin = getBookingTimeWindow(b);
                        const isAdjusting = editingTimeBookingId === b.id;
                        const isSavingTime = savingTimeId === b.id;
                        const photographerName = getPhotographerDisplayName(b);

                        // Same-day reorganization plan (max 3 hrs)
                        const draftStartMins = isAdjusting ? parseTimeToMinutes(adjustForm.start_time) : null;
                        const draftEndMins = isAdjusting ? parseTimeToMinutes(adjustForm.end_time) : null;
                        const draftDuration =
                          draftStartMins != null && draftEndMins != null && draftEndMins > draftStartMins
                            ? draftEndMins - draftStartMins
                            : null;
                        const isDraftDateBlackout = isAdjusting
                          ? localBlocks.some((blk) => blk.date === dateStr)
                          : false;
                        const reorgPlan =
                          isAdjusting && draftDuration != null
                            ? planDayReorganization({
                                targetBooking: b,
                                startTime: adjustForm.start_time,
                                endTime: adjustForm.end_time,
                                dayBookings: bookingsByDate[dateStr] || [],
                              })
                            : null;
                        const saveDisabled =
                          isSavingTime ||
                          draftDuration == null ||
                          isDraftDateBlackout ||
                          Boolean(reorgPlan?.exceedsMaxHours) ||
                          Boolean(reorgPlan && !reorgPlan.isValid);

                        return (
                          <div
                            key={b.id}
                            className={`p-3 rounded-xl bg-white border transition-all space-y-2.5 ${
                              isAdjusting
                                ? "border-amber-400 ring-1 ring-amber-300/60 shadow-sm"
                                : "border-neutral-200/80 hover:border-neutral-300"
                            }`}
                          >
                            {/* Top Booking Info Row */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-neutral-900">
                                    #{b.booking_number}
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold text-neutral-950 truncate">
                                    {getCustomerDisplayName(b)}
                                  </span>
                                </div>

                                <div className="text-xs text-neutral-600 flex items-center gap-1.5 flex-wrap">
                                  <span>{formatPackageName(b.service)}</span>
                                  <span className="text-neutral-300">·</span>
                                  <span>{getStatusLabel(b.status)}</span>
                                  {photographerName && photographerName !== "Unassigned" && (
                                    <>
                                      <span className="text-neutral-300">·</span>
                                      <span className="text-neutral-700">{photographerName}</span>
                                    </>
                                  )}
                                </div>

                                {/* Scheduled Time Range & Duration */}
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-lg">
                                    <Clock size={12} className="text-neutral-600" />
                                    {timeWin.startTime
                                      ? `${formatTime24To12(timeWin.startTime)} – ${formatTime24To12(timeWin.endTime)}`
                                      : "Time TBD"}
                                  </span>
                                  {timeWin.startTime && (
                                    <span
                                      className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                                        timeWin.isAdjusted
                                          ? "bg-amber-100 text-amber-950 border border-amber-200"
                                          : "bg-neutral-50 text-neutral-600 border border-neutral-200"
                                      }`}
                                    >
                                      {formatDurationLabel(timeWin.durationMinutes)}
                                      {timeWin.isAdjusted ? " · Adjusted" : ""}
                                    </span>
                                  )}
                                </div>

                                {timeWin.note && !isAdjusting && (
                                  <p className="text-[11px] text-neutral-500 italic">
                                    Note: {timeWin.note}
                                  </p>
                                )}
                              </div>

                              {/* Action Controls */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartAdjustTime(b)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                                    isAdjusting
                                      ? "bg-neutral-900 text-white border-neutral-900"
                                      : "bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-200"
                                  }`}
                                  title="Adjust session duration up to 3 hrs within the day"
                                >
                                  <Clock size={12} />
                                  <span>{isAdjusting ? "Close" : "Adjust Time"}</span>
                                </button>
                              </div>
                            </div>

                            {/* Inline Time & Duration Adjustment Form */}
                            {isAdjusting && (
                              <div className="pt-2.5 border-t border-neutral-100 space-y-2.5 animate-fade-in">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-[11px] font-bold text-neutral-700">
                                    Duration Templates (within day, max 3 hrs):
                                  </span>
                                  {draftDuration != null && (
                                    <span
                                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                        reorgPlan?.exceedsMaxHours
                                          ? "text-rose-800 bg-rose-50 border-rose-200"
                                          : "text-amber-900 bg-amber-50 border-amber-200"
                                      }`}
                                    >
                                      {formatTime24To12(adjustForm.start_time)} – {formatTime24To12(adjustForm.end_time)} · {formatDurationLabel(draftDuration)}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 flex-wrap">
                                  {DURATION_PRESETS.map((preset) => {
                                    const active = draftDuration === preset.minutes;
                                    return (
                                      <button
                                        key={preset.minutes}
                                        type="button"
                                        onClick={() => handleApplyDurationPreset(preset.minutes)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                          active
                                            ? "bg-neutral-950 text-white border-neutral-950"
                                            : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200"
                                        }`}
                                      >
                                        {preset.label}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div>
                                  <input
                                    type="text"
                                    value={adjustForm.note}
                                    onChange={(e) =>
                                      setAdjustForm((prev) => ({ ...prev, note: e.target.value }))
                                    }
                                    placeholder="Adjustment note (optional, e.g. Extended session up to 3 hrs)"
                                    className="w-full h-8 px-2.5 rounded-lg border border-neutral-300 text-xs text-neutral-900 placeholder:text-neutral-400 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500"
                                  />
                                </div>

                                {isDraftDateBlackout && (
                                  <div className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-1.5 font-medium">
                                    <AlertTriangle size={13} className="shrink-0 mt-0.5 text-rose-600" />
                                    <span>Selected date ({dateStr}) is blacked out.</span>
                                  </div>
                                )}

                                {reorgPlan?.exceedsMaxHours && (
                                  <div className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-1.5 font-medium">
                                    <AlertTriangle size={13} className="shrink-0 mt-0.5 text-rose-600" />
                                    <span>Hour adjustments are limited to a maximum of 3 hours within the same day.</span>
                                  </div>
                                )}

                                {reorgPlan && !reorgPlan.exceedsMaxHours && reorgPlan.reorganized.length > 0 && (
                                  <div className="px-2.5 py-2 rounded-lg bg-amber-50/90 border border-amber-200 text-[11px] text-amber-950 space-y-1">
                                    <div className="font-bold flex items-center gap-1.5">
                                      <Clock size={12} className="text-amber-700 shrink-0" />
                                      <span>Affected Bookings Auto-Organized to Available Time:</span>
                                    </div>
                                    <div className="space-y-0.5 pl-4">
                                      {reorgPlan.reorganized.map((m) => (
                                        <div key={m.booking.id} className="font-medium">
                                          #{m.booking.booking_number} ({getCustomerDisplayName(m.booking)}):{" "}
                                          <span className="line-through text-neutral-500">
                                            {formatTime24To12(m.oldWindow.startTime)}
                                          </span>{" "}
                                          →{" "}
                                          <span className="font-bold text-neutral-950">
                                            {formatTime24To12(m.newStartTime)} – {formatTime24To12(m.newEndTime)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {reorgPlan && reorgPlan.unplaced.length > 0 && (
                                  <div className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-1.5 font-medium">
                                    <AlertTriangle size={13} className="shrink-0 mt-0.5 text-rose-600" />
                                    <span>
                                      Not enough open studio slots remaining on this day to reorganize{" "}
                                      {reorgPlan.unplaced.map((u) => `#${u.booking.booking_number}`).join(", ")}.
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingTimeBookingId(null)}
                                    disabled={isSavingTime}
                                    className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveTimeAdjustment(b)}
                                    disabled={saveDisabled}
                                    className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                                  >
                                    {isSavingTime ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      <Save size={12} />
                                    )}
                                    <span>{isSavingTime ? "Saving..." : "Save Time"}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
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

