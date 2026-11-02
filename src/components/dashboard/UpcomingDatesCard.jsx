import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { getStatusLabel } from '../../lib/bookingUtils';

function parseLocal(d) {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
  const date = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
  return isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

function countdown(date) {
  const days = Math.round((date - startOfToday()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

/**
 * UpcomingDatesCard
 * Studio Schedule card with glowing date squircle, camera watermark art,
 * and full Light & Dark theme support with frosted glassmorphism.
 */
export default function UpcomingDatesCard({ bookings = [], className = '' }) {
  const today = useMemo(() => new Date(), []);

  const upcomingSchedule = useMemo(() => {
    const todayStart = startOfToday();
    const live = bookings.filter((b) => !['CANCELLED', 'REJECTED', 'COMPLETED'].includes(b.status));
    const withDate = live
      .map((b) => ({ booking: b, date: parseLocal(b.event_date) }))
      .filter((x) => x.date && x.date >= todayStart)
      .sort((a, b) => a.date - b.date);
    return withDate[0] || null;
  }, [bookings]);

  // Display target date (either upcoming schedule or today)
  const displayDate = upcomingSchedule ? upcomingSchedule.date : today;
  const dayName = displayDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dayNum = displayDate.getDate();
  const monthYear = `${displayDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${displayDate.getFullYear()}`;

  return (
    <section
      aria-label="Studio Schedule"
      className={`relative rounded-3xl overflow-hidden bg-white/85 dark:bg-gradient-to-r dark:from-[#0f0e0d] dark:via-[#141312] dark:to-[#1e1810] backdrop-blur-xl border border-neutral-200/80 dark:border-amber-500/25 shadow-xs dark:shadow-xl p-4 sm:p-5 text-neutral-900 dark:text-white select-none transition-colors ${className}`}
    >
      {/* Warm ambient gold flare in top-right */}
      <div className="absolute -top-16 -right-16 w-60 h-60 bg-gradient-to-br from-amber-500/15 dark:from-amber-500/20 to-transparent blur-3xl rounded-full pointer-events-none" />

      {/* Subtle ambient amber rim behind the date card */}
      <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-amber-500/10 dark:bg-amber-500/15 blur-2xl rounded-full pointer-events-none" />

      {/* Decorative camera watermark outline on the right */}
      <svg
        className="absolute -right-2 -bottom-4 w-32 h-32 sm:w-36 sm:h-36 text-amber-500/10 dark:text-amber-500/15 pointer-events-none select-none"
        viewBox="0 0 140 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <rect x="12" y="32" width="116" height="80" rx="20" stroke="currentColor" strokeWidth="2.5" />
        <path d="M46 32 L54 18 H86 L94 32" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="70" cy="72" r="26" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="70" cy="72" r="15" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="106" cy="48" r="3.5" fill="currentColor" opacity="0.7" />
      </svg>

      {/* Golden 4-point sparkle star above the camera */}
      <svg
        className="absolute top-8 right-24 sm:right-28 w-4 h-4 text-amber-500/30 dark:text-amber-400/40 pointer-events-none select-none animate-pulse"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
      </svg>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between mb-3.5 sm:mb-4">
        <div className="flex items-center gap-2">
          {/* Outlined calendar icon */}
          <svg
            className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-500 dark:text-amber-400 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="4" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M7 14h3" strokeWidth="2.5" />
          </svg>
          <h3 className="font-sans text-base sm:text-lg font-light text-neutral-900 dark:text-white tracking-tight">
            Studio Schedule
          </h3>
        </div>

        <Link
          to="/dashboard/bookings"
          className="px-3 py-1 rounded-full border border-amber-500/30 dark:border-amber-500/50 hover:border-amber-500 bg-amber-500/10 dark:bg-neutral-900/60 hover:bg-amber-500/20 text-xs font-light text-amber-700 dark:text-amber-300 flex items-center gap-1 transition-all whitespace-nowrap shadow-xs"
        >
          <span>All records</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {/* ── Main Content Row ───────────────────────────────────── */}
      <div className="relative z-10 flex flex-row items-center gap-3.5 sm:gap-4.5">
        {/* Glowing Date Squircle Card (Proportionally Scaled) */}
        <div className="relative w-24 h-24 xs:w-28 xs:h-28 sm:w-30 sm:h-30 shrink-0 rounded-2xl sm:rounded-[22px] bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-white dark:from-white/[0.12] dark:via-neutral-900/95 dark:to-black border border-amber-500/30 dark:border-amber-300/40 shadow-xs dark:shadow-[0_0_25px_rgba(245,158,11,0.22),inset_0_1px_2px_rgba(255,255,255,0.35)] flex flex-col items-center justify-center p-2 select-none">
          {/* Subtle inner top-edge highlight */}
          <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 dark:via-white/50 to-transparent pointer-events-none" />

          {/* Day of Week */}
          <span className="font-sans text-[10px] sm:text-xs font-light tracking-[0.24em] text-neutral-600 dark:text-white/90 uppercase">
            {dayName}
          </span>

          {/* Big Number Date with Metallic Gold Gradient */}
          <span className="font-sans text-4xl xs:text-5xl sm:text-[52px] font-light leading-none my-0.5 tracking-tight bg-gradient-to-b from-neutral-950 via-amber-600 to-amber-700 dark:from-white dark:via-[#fae4a8] dark:to-[#e69f33] bg-clip-text text-transparent drop-shadow-xs">
            {dayNum}
          </span>

          {/* Month & Year */}
          <span className="font-sans text-[9px] sm:text-[10px] font-light tracking-[0.24em] text-neutral-500 dark:text-white/70 uppercase">
            {monthYear}
          </span>
        </div>

        {/* Right Details Column */}
        <div className="min-w-0 flex-1">
          {/* Hairline Divider with Calendar Icon & Label */}
          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
            <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-amber-500/10 dark:bg-white/[0.08] border border-amber-500/20 dark:border-white/15 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0 shadow-xs">
              <svg
                className="w-3 h-3 text-amber-500 dark:text-amber-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="3" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="9" x2="21" y2="9" />
              </svg>
            </div>
            <span className="text-[9px] sm:text-[10px] font-light uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-300">
              {upcomingSchedule ? countdown(upcomingSchedule.date) : 'TODAY'}
            </span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-white/15" />
          </div>

          {/* Status Text or Upcoming Booking */}
          {upcomingSchedule ? (
            <div>
              <p className="text-base sm:text-lg font-light text-neutral-900 dark:text-white font-sans leading-snug truncate">
                {upcomingSchedule.booking.service?.name || 'Photoshoot session'}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-sans font-light truncate">
                {upcomingSchedule.booking.event_time || 'Time to be confirmed'} &middot; {getStatusLabel(upcomingSchedule.booking.status)}
              </p>
              <Link
                to={`/dashboard/bookings/${upcomingSchedule.booking.id}`}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-light text-amber-600 dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-200 transition-colors"
              >
                <span>View session details</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          ) : (
            <p className="text-lg sm:text-xl font-sans leading-snug tracking-tight font-light">
              <span className="font-normal text-neutral-900 dark:text-white">No schedule</span>{' '}
              <span className="text-neutral-500 dark:text-neutral-400 font-light">for today.</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

UpcomingDatesCard.propTypes = {
  bookings: PropTypes.array,
  className: PropTypes.string,
};
