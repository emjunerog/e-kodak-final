import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle } from 'lucide-react';

export default function InteractiveCalendar({ value, onChange, minDate, blockedDates = {}, onMonthChange }) {
  // Base date parsing
  const initialDate = useMemo(() => {
    if (value) {
      const parsed = new Date(value + 'T00:00:00');
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [value]);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  // Notify parent whenever current month changes
  useEffect(() => {
    if (onMonthChange) {
      onMonthChange(currentMonth.getFullYear(), currentMonth.getMonth());
    }
  }, [currentMonth, onMonthChange]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const effectiveMinDate = minDate || todayStr;

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long' });
  const yearNumber = currentMonth.getFullYear();

  const prevMonthName = useMemo(() => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long' });
  }, [currentMonth]);

  const nextMonthName = useMemo(() => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long' });
  }, [currentMonth]);

  // Days grid calculation (Mon - Sun starting from Monday)
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();



    // Sunday is index 0 (Sun on left, Sat on right - balanced week)
    const firstDayIndex = new Date(year, month, 1).getDay();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const now = new Date();
    const isAfterClosing = now.getHours() >= 17; // Studio closes at 5:00 PM (17:00)

    const days = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateNumber: d,
        dateStr,
        isCurrentMonth: false,
        disabled: true,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(year, month, d);
      const dayOfWeek = dayDate.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const isPast = dateStr < effectiveMinDate;
      const isToday = dateStr === todayStr;
      const isTodayClosed = isToday && isAfterClosing;

      const blockInfo = blockedDates[dateStr];
      const isBlocked = !!blockInfo?.isFullDayBlocked;

      let blockReason = null;
      if (isWeekend) {
        blockReason = "Studio Closed (Weekdays Only: Mon-Fri)";
      } else if (isTodayClosed) {
        blockReason = "Studio Closed for Today (Hours: 8:00 AM - 5:00 PM)";
      } else if (isPast) {
        blockReason = "Past Date Unavailable";
      } else if (isBlocked) {
        blockReason = blockInfo?.reason || "Date Unavailable";
      }

      // Strictly unavailable if past, weekend, closed today, or blocked
      const isDisabled = isPast || isWeekend || isTodayClosed || isBlocked;

      days.push({
        dateNumber: d,
        dateStr,
        isCurrentMonth: true,
        disabled: isDisabled,
        isWeekend,
        isPast,
        isBlocked,
        blockReason,
        isToday,
        isSelected: dateStr === value,
      });
    }

    // Next month filler days to complete grid (multiples of 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextDate = new Date(year, month + 1, d);
        const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({
          dateNumber: d,
          dateStr,
          isCurrentMonth: false,
          disabled: true,
        });
      }
    }

    return days;
  }, [currentMonth, effectiveMinDate, todayStr, value, blockedDates]);

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl border border-neutral-200/90 shadow-2xs select-none overflow-hidden">
      {/* Website Luxury Theme Banner Header */}
      <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-gold/20 shrink-0">
        <button
          type="button"
          onClick={prevMonth}
          className="text-xs font-semibold text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl border border-white/15 transition-all flex items-center gap-1 cursor-pointer"
          title={`Go to ${prevMonthName}`}
        >
          <span>← {prevMonthName}</span>
        </button>

        <h3 className="font-heading font-extrabold text-base sm:text-xl text-white tracking-tight drop-shadow-xs">
          {monthName} <span className="font-bold text-gold">{yearNumber}</span>
        </h3>

        <button
          type="button"
          onClick={nextMonth}
          className="text-xs font-semibold text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl border border-white/15 transition-all flex items-center gap-1 cursor-pointer"
          title={`Go to ${nextMonthName}`}
        >
          <span>{nextMonthName} →</span>
        </button>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3 sm:gap-4">
        {/* Weekday Column Headers (Sun - Sat: Balanced Week) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center font-heading font-bold text-xs text-neutral-700 py-1 shrink-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((wd, i) => {
            const isWeekendHeader = i === 0 || i === 6;
            return (
              <div
                key={i}
                className={`py-1 ${isWeekendHeader ? 'text-neutral-400' : 'text-neutral-800'}`}
                title={isWeekendHeader ? 'Closed on Weekends' : 'Studio Open (8AM - 5PM)'}
              >
                {wd}
              </div>
            );
          })}
        </div>

        {/* Calendar Days Matrix (Categorized into Selected / Available / Unavailable) */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 flex-1 auto-rows-fr">
          {calendarDays.map((day, idx) => {
            if (!day.isCurrentMonth) {
              return (
                <div
                  key={idx}
                  className="h-full min-h-[44px] sm:min-h-[50px] lg:min-h-[56px] flex items-center justify-center text-xs text-neutral-300 rounded-xl sm:rounded-2xl font-medium pointer-events-none select-none"
                >
                  {day.dateNumber}
                </div>
              );
            }

            // Unavailable Days (past, weekends, closed today, or booked)
            if (day.disabled) {
              return (
                <div
                  key={idx}
                  className="h-full min-h-[44px] sm:min-h-[50px] lg:min-h-[56px] flex items-center justify-center text-xs sm:text-sm text-neutral-400 font-medium bg-neutral-50/70 border border-neutral-100 rounded-xl sm:rounded-2xl cursor-not-allowed select-none opacity-50"
                  title={day.blockReason || "Date unavailable (Studio Closed)"}
                >
                  {day.dateNumber}
                </div>
              );
            }

            const isSelected = day.isSelected;
            const isToday = day.isToday;

            // Selected Day (Warm Kodak Gold)
            if (isSelected) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange(day.dateStr)}
                  className="h-full min-h-[44px] sm:min-h-[50px] lg:min-h-[56px] w-full rounded-xl sm:rounded-2xl text-xs sm:text-sm font-extrabold bg-gradient-to-br from-amber-400 via-gold to-amber-500 hover:from-amber-500 hover:to-gold-dark text-neutral-950 shadow-md shadow-amber-500/25 ring-2 ring-gold transition-all flex items-center justify-center cursor-pointer scale-102 z-10"
                >
                  <span>{day.dateNumber}</span>
                </button>
              );
            }

            // Today indicator (if open and not selected)
            if (isToday) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange(day.dateStr)}
                  className="h-full min-h-[44px] sm:min-h-[50px] lg:min-h-[56px] w-full rounded-xl sm:rounded-2xl text-xs sm:text-sm font-extrabold bg-neutral-900 hover:bg-black text-gold border border-gold/40 shadow-xs transition-all flex items-center justify-center cursor-pointer hover:scale-102"
                  title="Today (Studio Open)"
                >
                  <span>{day.dateNumber}</span>
                </button>
              );
            }

            // Available Days (Mon - Fri: Soft Warm Neutral with Gold Border)
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onChange(day.dateStr)}
                className="h-full min-h-[44px] sm:min-h-[50px] lg:min-h-[56px] w-full rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold bg-amber-50/40 hover:bg-amber-100/60 border-2 border-amber-300/80 hover:border-amber-400 text-neutral-900 transition-all flex items-center justify-center cursor-pointer hover:scale-102 shadow-2xs"
              >
                <span>{day.dateNumber}</span>
              </button>
            );
          })}
        </div>

        {/* Status & Categorization Legend in Website Theme */}
        <div className="pt-3 border-t border-neutral-100 shrink-0 mt-auto">
          <div className="bg-neutral-50/80 rounded-2xl p-3 border border-neutral-100 flex items-center justify-start gap-4 sm:gap-5 text-xs text-neutral-600 font-medium flex-wrap">
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-gold inline-block shadow-xs border border-amber-500/40" />
              <span className="font-semibold text-neutral-900">Selected</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md border-2 border-amber-300 bg-amber-50/60 inline-block" />
              <span className="font-semibold text-neutral-900">Available (Mon–Fri)</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-neutral-100 border border-neutral-200 inline-block opacity-60" />
              <span className="text-neutral-400 font-medium">Unavailable (Weekends Closed)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
