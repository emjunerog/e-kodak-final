import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export default function InteractiveCalendar({ value, onChange, minDate }) {
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

  const monthYearLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Days grid calculation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

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
      const isDisabled = dateStr < effectiveMinDate;
      days.push({
        dateNumber: d,
        dateStr,
        isCurrentMonth: true,
        disabled: isDisabled,
        isToday: dateStr === todayStr,
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
  }, [currentMonth, effectiveMinDate, todayStr, value]);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm select-none">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <CalendarIcon size={16} className="text-gold" />
          <span className="font-heading text-sm font-bold text-primary">
            {monthYearLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-primary hover:bg-neutral-100 transition-colors"
            title="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-primary hover:bg-neutral-100 transition-colors"
            title="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((wd, i) => (
          <div key={i} className="text-[11px] font-bold text-neutral-400 py-1 uppercase">
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar Days Matrix */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          if (!day.isCurrentMonth) {
            return (
              <div
                key={idx}
                className="h-9 flex items-center justify-center text-xs text-neutral-300 pointer-events-none"
              >
                {day.dateNumber}
              </div>
            );
          }

          if (day.disabled) {
            return (
              <div
                key={idx}
                className="h-9 flex items-center justify-center text-xs text-neutral-300 line-through cursor-not-allowed"
                title="Date not available"
              >
                {day.dateNumber}
              </div>
            );
          }

          const isSelected = day.isSelected;
          const isToday = day.isToday;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(day.dateStr)}
              className={`h-9 w-full rounded-xl text-xs font-medium transition-all flex flex-col items-center justify-center relative ${
                isSelected
                  ? 'bg-primary text-white font-bold shadow-sm ring-2 ring-primary/20 scale-105 z-10'
                  : 'hover:bg-gold/10 hover:text-primary text-neutral-700'
              }`}
            >
              <span>{day.dateNumber}</span>
              {isToday && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-gold absolute bottom-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Date Summary bar */}
      <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-xs font-body text-neutral-500">
        <span>Selected:</span>
        <span className="font-semibold text-primary">
          {value
            ? new Date(value + 'T00:00:00').toLocaleDateString('en-PH', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'None chosen'}
        </span>
      </div>
    </div>
  );
}
