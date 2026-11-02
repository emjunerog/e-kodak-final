import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getStatusLabel } from '../../lib/bookingUtils';

function parseLocal(d) {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
  const date = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
  return isNaN(date.getTime()) ? null : date;
}

function fmtDate(d) {
  const dt = parseLocal(d);
  return dt
    ? dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date pending';
}

function peso(n) {
  return `₱${Number(n || 0).toLocaleString()}`;
}

function renderHeadline(text) {
  if (!text) return 'Studio Session';
  const parts = text.split(' ');
  if (parts.length <= 1) return text;
  const last = parts.pop();
  return (
    <>
      <span className="font-light">{parts.join(' ')} </span>
      <span className="font-heading italic font-light text-amber-300 drop-shadow-sm">{last}</span>
    </>
  );
}

/**
 * OrderTrackerCard
 * Editorial customer order card adapting the signature studio look:
 * - Full-card studio photograph background (camera, workspace, photo prints).
 * - Frosted glassmorphic optical blur and directional gradient wash to prioritize text legibility.
 * - Hand-crafted curved gold swoosh underline and sweeping corner arcs.
 * - Balanced facts strip with inline Track button.
 */
export default function OrderTrackerCard({ sessions, selectedId, onSelect }) {
  const session = sessions.find((s) => s.id === selectedId) || sessions[0] || null;

  if (!session) {
    return (
      <section className="rounded-3xl bg-gradient-to-br from-[#12100d] via-[#1a1510] to-[#251b12] text-white p-8 ring-1 ring-gold/30 shadow-2xl">
        <h2 className="font-heading text-3xl font-light">No orders yet</h2>
        <p className="text-sm text-neutral-400 mt-2 max-w-md font-light">
          When you book a session, your order summary and schedule will appear right here.
        </p>
        <Link
          to="/dashboard/book"
          className="mt-6 inline-flex px-7 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-neutral-950 text-xs font-normal uppercase tracking-wider shadow-md shadow-amber-500/20 hover:brightness-105 transition-all"
        >
          Book a session
        </Link>
      </section>
    );
  }

  const photographer = session.photographer?.profile
    ? `${session.photographer.profile.first_name || ''} ${session.photographer.profile.last_name || ''}`.trim()
    : (session.photographer?.name || '');

  const balance = Number(session.remaining_balance ?? 0);
  const totalAmt = Number(session.total_amount ?? 0);

  const scheduleDate = fmtDate(session.event_date);
  const scheduleTime = session.event_time ? session.event_time : (session.event_date ? 'Time TBD' : '');
  const shootSchedule = scheduleDate === 'Date pending'
    ? 'Date pending'
    : (scheduleTime ? `${scheduleDate} · ${scheduleTime}` : scheduleDate);

  const priceText = totalAmt > 0
    ? (balance > 0 ? `${peso(totalAmt)} (${peso(balance)} balance)` : `${peso(totalAmt)} · Settled`)
    : (balance > 0 ? `${peso(balance)} balance` : 'Settled');

  // The 3 core essentials
  const facts = [
    { label: 'Schedule', value: shootSchedule },
    { label: 'Price', value: priceText, isGold: true },
    { label: 'Photographer', value: photographer || 'To be assigned' },
  ];

  return (
    <section
      aria-label="Your Order"
      className="relative rounded-3xl overflow-hidden bg-[#12100d] text-white p-6 sm:p-8 lg:p-9 ring-1 ring-gold/30 shadow-2xl"
    >
      {/* ── Layer 1: Dark theme authentic studio photograph (warm wood, cameras, prints) ── */}
      <div 
        className="absolute inset-0 bg-cover bg-no-repeat pointer-events-none transition-opacity duration-700 ease-in-out hidden dark:block"
        style={{
          backgroundImage: "url('/images/login-dark.jpg')",
          backgroundPosition: "center 70%",
        }}
      />

      {/* ── Layer 2: Light theme authentic studio photograph (daylight studio, camera, prints) ── */}
      <div 
        className="absolute inset-0 bg-cover bg-no-repeat pointer-events-none transition-opacity duration-700 ease-in-out block dark:hidden"
        style={{
          backgroundImage: "url('/images/login-light.jpg')",
          backgroundPosition: "center 70%",
        }}
      />

      {/* ── Frosted Glassmorphic Optical Blur Wash (Over left half, softens photo behind text) ── */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.88) 45%, rgba(0,0,0,0) 78%)',
          WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.88) 45%, rgba(0,0,0,0) 78%)',
        }}
      />

      {/* ── Seamless Ambient Gradient Wash (Protects 100% text contrast on left, reveals photo on right) ── */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: `linear-gradient(to right, rgba(14,12,10,0.94) 0%, rgba(14,12,10,0.76) 48%, rgba(14,12,10,0.2) 78%, transparent 100%),
                       linear-gradient(to bottom, rgba(14,12,10,0.45) 0%, transparent 25%),
                       linear-gradient(to top, rgba(14,12,10,0.4) 0%, transparent 25%)`
        }}
      />

      {/* ── Ambient Gold Radial Flare on Right ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_80%_at_85%_25%,rgba(245,158,11,0.18),transparent_70%)] pointer-events-none" />

      {/* ── Decorative Sweeping Corner Arcs on Left Side ── */}
      <div className="absolute -bottom-24 -left-24 w-80 h-80 pointer-events-none opacity-25 select-none">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-amber-400">
          <circle cx="0" cy="200" r="140" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" />
          <circle cx="0" cy="200" r="180" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3" />
          <circle cx="0" cy="200" r="220" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.15" />
        </svg>
      </div>

      {/* Order switcher tabs (when multiple orders exist) */}
      {sessions.length > 1 && (
        <div className="relative z-10 flex gap-4 overflow-x-auto no-scrollbar mb-5 border-b border-white/10">
          {sessions.map((s) => {
            const on = s.id === session.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                className={`pb-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  on ? 'border-amber-400 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                #{s.booking_number}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Layout */}
      <div className="relative z-10 flex flex-col justify-between min-h-[160px]">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.24em] font-light text-amber-400 mb-2">
              <span className="text-amber-300">✦</span>
              <span>Your order</span>
            </div>

            {/* Large Editorial Headline with signature italic accent */}
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-[44px] font-light leading-[1.12] text-white tracking-tight drop-shadow-md truncate">
              {renderHeadline(session.service?.name || session.package_name || 'Studio session')}
            </h2>

            {/* Hand-crafted Curved Gold Swoosh Underline matching studio aesthetic */}
            <svg viewBox="0 0 280 18" fill="none" className="w-44 sm:w-56 h-auto text-amber-400 mt-1 opacity-85">
              <path d="M2 12 C 70 3, 200 3, 278 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M4 14 C 70 6, 200 6, 276 14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
            </svg>

            {/* Subtitle: Set & Booking Number */}
            <p className="text-sm sm:text-base text-neutral-300 mt-2.5 font-body flex items-center gap-2 flex-wrap font-light">
              <span className="text-amber-300 font-normal">{session.tier_name || 'Standard Set'}</span>
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-400 font-mono">#{session.booking_number}</span>
            </p>
          </div>

          {/* Top-Right Status Label */}
          <div className="shrink-0 text-right pt-0.5">
            <span className="text-xs sm:text-sm font-light text-amber-300 tracking-wider uppercase drop-shadow-sm">
              {getStatusLabel(session.status)}
            </span>
          </div>
        </div>

        {/* Bottom Row: 3 Core Facts & Track Button in a unified, balanced row */}
        <div className="mt-8 sm:mt-10 flex flex-wrap items-end gap-x-8 gap-y-5">
          {facts.map(({ label, value, isGold }) => (
            <div key={label} className="min-w-[110px]">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.24em] font-light text-neutral-400">
                {label}
              </p>
              <p
                className={`text-sm sm:text-base font-normal mt-1 truncate ${isGold ? 'text-amber-300' : 'text-neutral-100'}`}
                title={value}
              >
                {value}
              </p>
            </div>
          ))}

          <div className="pt-1">
            <Link
              to={`/dashboard/bookings/${session.id}`}
              className="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-neutral-950 text-xs sm:text-sm font-normal uppercase tracking-wider shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group whitespace-nowrap"
            >
              <span>Track</span>
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

OrderTrackerCard.propTypes = {
  sessions: PropTypes.array.isRequired,
  selectedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelect: PropTypes.func.isRequired,
};
