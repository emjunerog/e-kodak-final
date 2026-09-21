import React, { useState, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
  Sparkles,
  Layers,
  ArrowRight,
  User,
  CreditCard,
  Camera
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPaymentLabel } from '../../lib/bookingUtils';

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Convert any date/timestamp into local YYYY-MM-DD key matching calendar cells
function toLocalDateKey(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function SidebarOrderCalendar({ bookings = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [hoveredDateKey, setHoveredDateKey] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const leaveTimeoutRef = useRef(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDateKey(null);
    setHoveredDateKey(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDateKey(null);
    setHoveredDateKey(null);
  };

  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateKey(toLocalDateKey(today));
    setHoveredDateKey(null);
  };

  // Map dates to bookings using local date representation
  const dateMap = useMemo(() => {
    const map = {};

    bookings.forEach((b) => {
      // 1. Order Placed Date
      if (b.created_at) {
        const createdKey = toLocalDateKey(b.created_at);
        if (createdKey) {
          if (!map[createdKey]) map[createdKey] = [];
          map[createdKey].push({
            type: 'ORDER_PLACED',
            label: 'Order Placed',
            booking: b
          });
        }
      }

      // 2. Scheduled Photoshoot Session Date
      if (b.event_date) {
        const eventKey = toLocalDateKey(b.event_date);
        if (eventKey) {
          if (!map[eventKey]) map[eventKey] = [];
          map[eventKey].push({
            type: 'SESSION_DATE',
            label: 'Photoshoot Session',
            booking: b
          });
        }
      }
    });

    return map;
  }, [bookings]);

  // Calendar Grid Calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const todayKey = toLocalDateKey(new Date());

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  // Active date (hovered takes preview priority, fallback to selected)
  const activeDateKey = hoveredDateKey || selectedDateKey;
  const activeEvents = activeDateKey ? (dateMap[activeDateKey] || []) : [];

  // Hover handlers with debounce grace period
  const handleMouseEnterDate = (dateStr) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setHoveredDateKey(dateStr);
  };

  const handleMouseLeaveDate = () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredDateKey(null);
    }, 350);
  };

  const handleMouseEnterDetails = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleMouseLeaveDetails = () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredDateKey(null);
    }, 250);
  };

  return (
    <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 p-2.5 transition-all">
      {/* Calendar Header: compact, single-line, zero overflow */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 hover:text-primary dark:hover:text-white transition-colors min-w-0"
        >
          <CalendarIcon size={12} className="text-gold shrink-0" />
          <span className="font-heading uppercase tracking-wider text-[10px] truncate">Calendar</span>
          {isExpanded ? <ChevronUp size={11} className="text-neutral-400 shrink-0" /> : <ChevronDown size={11} className="text-neutral-400 shrink-0" />}
        </button>

        {isExpanded && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={prevMonth}
              className="p-0.5 hover:bg-neutral-200/70 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-primary dark:hover:text-white transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft size={12} />
            </button>
            <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 font-body min-w-[54px] text-center whitespace-nowrap">
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              className="p-0.5 hover:bg-neutral-200/70 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-primary dark:hover:text-white transition-colors"
              aria-label="Next month"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-1.5 animate-fade-in">
          {/* Days of week */}
          <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-bold text-neutral-400 font-body">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center mt-1">
            {/* Empty offset days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <span key={`empty-${i}`} className="h-8" />
            ))}

            {/* Days of month */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const events = dateMap[dateStr] || [];
              const isToday = dateStr === todayKey;
              const isSelected = dateStr === selectedDateKey;
              const isHovered = dateStr === hoveredDateKey;

              const hasOrderPlaced = events.some((e) => e.type === 'ORDER_PLACED');
              const hasSessionDate = events.some((e) => e.type === 'SESSION_DATE');

              return (
                <button
                  key={dayNum}
                  type="button"
                  onMouseEnter={() => handleMouseEnterDate(dateStr)}
                  onMouseLeave={handleMouseLeaveDate}
                  onClick={() => setSelectedDateKey(isSelected ? null : dateStr)}
                  title={events.length > 0 ? `${events.length} event(s) on ${dateStr}` : `Date: ${dateStr}`}
                  className={`
                    h-8 w-full text-[11px] rounded font-medium transition-all relative flex flex-col items-center justify-center cursor-pointer select-none
                    ${isSelected ? 'bg-primary dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold ring-1.5 ring-gold shadow-xs z-10' : ''}
                    ${!isSelected && isHovered ? 'bg-gold text-primary dark:text-primary font-bold ring-1.5 ring-gold/80 scale-105 z-20 shadow-xs' : ''}
                    ${!isSelected && !isHovered && isToday ? 'bg-gold/15 text-gold-dark dark:text-gold font-bold ring-0.5 ring-gold/40' : ''}
                    ${!isSelected && !isHovered && !isToday && events.length > 0 ? 'bg-amber-100/80 dark:bg-amber-950/50 text-neutral-800 dark:text-neutral-200 font-semibold hover:bg-amber-200' : ''}
                    ${!isSelected && !isHovered && !isToday && events.length === 0 ? 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800' : ''}
                  `}
                >
                  <span className="leading-none">{dayNum}</span>

                  {/* Indicator Bars (Space Efficient) */}
                  {events.length > 0 && !isSelected && (
                    <div className="absolute bottom-0 left-0 right-0 flex h-1 pointer-events-none opacity-90 overflow-hidden rounded-b">
                      {hasOrderPlaced && (
                        <span className="flex-1 bg-amber-500" />
                      )}
                      {hasSessionDate && (
                        <span className="flex-1 bg-emerald-500" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-[9px] text-neutral-400 pt-1 px-0.5 border-t border-neutral-200/50 dark:border-neutral-800">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-0.5">
                <span className="w-2.5 h-1 rounded-sm bg-amber-500" /> Placed
              </span>
              <span className="flex items-center gap-0.5">
                <span className="w-2.5 h-1 rounded-sm bg-emerald-500" /> Session
              </span>
            </div>
            <button
              type="button"
              onClick={jumpToToday}
              className="text-gold font-bold hover:underline text-[9px]"
            >
              Today
            </button>
          </div>

          {/* ── Space-Efficient Hover & Pinned Date Details Display ──────────────── */}
          {activeDateKey && (
            <div 
              onMouseEnter={handleMouseEnterDetails}
              onMouseLeave={handleMouseLeaveDetails}
              className="mt-1.5 p-2 bg-white dark:bg-neutral-900 rounded-xl border border-gold/40 shadow-md text-xs space-y-1.5 animate-slide-up transition-all"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between font-semibold text-primary dark:text-neutral-100 border-b border-neutral-100 dark:border-neutral-800 pb-1 font-body">
                <div className="flex items-center gap-1 min-w-0">
                  <CalendarIcon size={11} className="text-gold shrink-0" />
                  <span className="text-[10px] font-body font-bold truncate">
                    {new Date(activeDateKey + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span className="text-[8px] font-body text-gold bg-gold/15 px-1 py-0.2 rounded border border-gold/30 font-bold shrink-0">
                  {hoveredDateKey && !selectedDateKey ? 'Hover' : selectedDateKey ? 'Pinned' : 'Details'}
                </span>
              </div>

              {/* Event Listings or Space-Efficient Empty Strip */}
              {activeEvents.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin font-body">
                  {activeEvents.map((evt, idx) => (
                    <div 
                      key={idx} 
                      className="p-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700/80 flex flex-col gap-1 shadow-2xs font-body"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase font-body ${
                          evt.type === 'ORDER_PLACED' 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' 
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                        }`}>
                          {evt.label}
                        </span>
                        <span className="text-[9px] text-neutral-400 font-body font-bold">
                          #{evt.booking.booking_number}
                        </span>
                      </div>
                      
                      <p className="text-[11px] font-bold text-primary dark:text-neutral-100 truncate leading-tight font-heading">
                        {evt.booking.service?.name || evt.booking.tier_name || 'Studio Session'}
                        {evt.booking.tier_name ? ` · ${evt.booking.tier_name}` : ''}
                      </p>

                      <div className="flex items-center justify-between text-[9px] text-neutral-500 dark:text-neutral-400 font-body">
                        <span className="truncate flex items-center gap-1">
                          <Clock size={9} />
                          {evt.booking.preferred_time ? evt.booking.preferred_time.substring(0, 5) : 'Any Time'}
                        </span>
                        <span className="text-gold font-bold">{evt.booking.status}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] font-body text-neutral-500">
                        <span className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                          <CreditCard size={9} className="text-neutral-400" />
                          {getPaymentLabel(evt.booking.payment_status)}
                        </span>
                        {evt.booking.photographer?.profile && (
                          <span className="flex items-center gap-1 bg-primary/5 dark:bg-primary/20 text-primary dark:text-primary-light px-1 py-0.5 rounded truncate">
                            <Camera size={9} />
                            {evt.booking.photographer.profile.first_name} {evt.booking.photographer.profile.last_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-0.5 border-t border-neutral-200/50 dark:border-neutral-700/60 text-[9px] font-body">
                        <Link
                          to="/dashboard/progress"
                          className="text-gold font-bold hover:underline flex items-center gap-0.5"
                        >
                          <span>Progress</span>
                          <ChevronRight size={9} />
                        </Link>
                        <Link
                          to={`/dashboard/bookings/${evt.booking.id}`}
                          className="text-neutral-500 hover:text-primary dark:hover:text-white font-bold flex items-center gap-0.5"
                        >
                          <span>Record</span>
                          <ExternalLink size={8} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between px-2 py-1 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg text-[10px] font-body text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="truncate">No scheduled shoots</span>
                  <Link
                    to={`/dashboard/book?date=${activeDateKey}`}
                    className="text-gold font-bold hover:underline shrink-0 pl-1 flex items-center gap-0.5 font-body"
                  >
                    <span>Book</span>
                    <ArrowRight size={9} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

SidebarOrderCalendar.propTypes = {
  bookings: PropTypes.array
};
