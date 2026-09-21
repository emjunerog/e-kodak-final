import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'motion/react';
import {
  CalendarDays, Clock, CheckCircle2, Camera,
  CreditCard, AlertCircle, Package,
} from 'lucide-react';
import AnimatedCounter from '../ui/AnimatedCounter';

/**
 * CategorizedMetricStrip — 3-color palette (primary / gold / neutral).
 * 6 status cards clickable to filter the booking queue with motion micro-interactions.
 * 2 finance tiles below.
 */
export default function CategorizedMetricStrip({
  stats,
  loading = false,
  onSelectFilter,
  activeFilter = 'ALL',
}) {
  const s = stats || {};
  const activeJobs = s.active_jobs ?? 0;

  // ── 3 visual tiers using only: primary, gold, neutral ──────────────
  const statusCards = [
    {
      key: 'ALL',
      label: 'Total',
      value: s.total,
      icon: CalendarDays,
      tier: 'neutral',
    },
    {
      key: 'PENDING',
      label: 'Pending',
      value: s.pending,
      icon: Clock,
      tier: 'gold',
      alert: (s.pending ?? 0) > 0,
    },
    {
      key: 'CONFIRMED',
      label: 'Confirmed',
      value: s.confirmed,
      icon: CheckCircle2,
      tier: 'primary',
    },
    {
      key: 'CAPTURE',
      label: 'Active',
      value: activeJobs,
      icon: Camera,
      tier: 'primary',
    },
    {
      key: 'READY',
      label: 'Ready',
      value: s.ready,
      icon: Package,
      tier: 'gold',
    },
    {
      key: 'COMPLETED',
      label: 'Done',
      value: s.completed,
      icon: CheckCircle2,
      tier: 'neutral',
    },
  ];

  // Resolve tier-based classes
  const tierClasses = {
    neutral: {
      icon:       'bg-neutral-100 text-neutral-600',
      number:     'text-neutral-900',
      activeRing: 'ring-neutral-400',
      activeBg:   'bg-neutral-100',
    },
    gold: {
      icon:       'bg-gold/15 text-gold-dark',
      number:     'text-gold-dark',
      activeRing: 'ring-gold',
      activeBg:   'bg-gold/10',
    },
    primary: {
      icon:       'bg-neutral-900/8 text-neutral-900',
      number:     'text-neutral-900',
      activeRing: 'ring-neutral-900/40',
      activeBg:   'bg-neutral-900/5',
    },
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[105px] bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-[100px] bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const isClearedActive = activeFilter === 'PAID' || activeFilter === 'CLEARED';
  const isUnpaidActive = activeFilter === 'UNPAID';

  return (
    <div className="space-y-4 font-body">

      {/* ── Status KPI Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {statusCards.map((card) => {
          const isActive = activeFilter === card.key;
          const Icon = card.icon;
          const t = tierClasses[card.tier];

          return (
            <motion.button
              key={card.key}
              type="button"
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectFilter?.(card.key)}
              title={`Filter: ${card.label}`}
              className={`group relative p-3.5 sm:p-4 rounded-2xl border text-left transition-shadow cursor-pointer select-none min-h-[105px] flex flex-col justify-between ${
                isActive
                  ? `${t.activeBg} border-transparent ring-2 ${t.activeRing} shadow-xs`
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300 hover:shadow-md'
              }`}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-xl ${t.icon} flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs`}>
                <Icon size={16} />
              </div>

              <div>
                {/* Value */}
                <p className={`text-2xl font-heading font-bold leading-none ${t.number}`}>
                  <AnimatedCounter value={card.value ?? 0} />
                </p>

                {/* Label */}
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mt-1 truncate">
                  {card.label}
                </p>
              </div>

              {/* Pending alert pulse */}
              {card.alert && (card.value ?? 0) > 0 && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-gold animate-pulse" />
              )}

              {/* Active dot */}
              {isActive && !(card.alert && (card.value ?? 0) > 0) && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary/40" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ── Prominent Finance Overview Cards ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Cleared / Settled Card */}
        <motion.button
          type="button"
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectFilter?.(isClearedActive ? 'ALL' : 'PAID')}
          title="Filter by Cleared & Settled bookings"
          className={`group p-4 sm:p-5 rounded-2xl border text-left transition-shadow cursor-pointer select-none flex items-center justify-between min-h-[100px] ${
            isClearedActive
              ? 'bg-neutral-900 text-white border-neutral-900 ring-2 ring-neutral-900 shadow-md'
              : 'bg-white border-neutral-200/80 hover:border-neutral-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs ${
              isClearedActive ? 'bg-white/10 text-gold' : 'bg-neutral-100 text-neutral-900'
            }`}>
              <CreditCard size={20} />
            </div>
            <div>
              <p className={`text-2xl sm:text-3xl font-heading font-bold leading-none ${
                isClearedActive ? 'text-white' : 'text-neutral-900'
              }`}>
                <AnimatedCounter value={s.cleared ?? s.total_payments_recorded ?? 0} />
              </p>
              <p className={`text-[11px] font-bold uppercase tracking-wider mt-1 ${
                isClearedActive ? 'text-neutral-300' : 'text-neutral-500'
              }`}>
                Cleared Payments
              </p>
            </div>
          </div>

          <div className="text-right flex flex-col items-end gap-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              isClearedActive
                ? 'bg-gold/20 text-gold border-gold/40'
                : 'bg-neutral-100 text-neutral-600 border-neutral-200'
            }`}>
              {isClearedActive ? 'Filtered' : 'Verified'}
            </span>
            <span className="text-[11px] font-medium text-neutral-400">
              Fully settled
            </span>
          </div>
        </motion.button>

        {/* Unpaid / Pending Clearance Card */}
        <motion.button
          type="button"
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectFilter?.(isUnpaidActive ? 'ALL' : 'UNPAID')}
          title="Filter by Unpaid & Partial bookings"
          className={`group p-4 sm:p-5 rounded-2xl border text-left transition-shadow cursor-pointer select-none flex items-center justify-between min-h-[100px] ${
            isUnpaidActive
              ? 'bg-gold/15 border-gold ring-2 ring-gold shadow-md'
              : (s.unpaid_partial ?? 0) > 0
                ? 'bg-amber-50/40 border-amber-200/80 hover:border-gold hover:shadow-md'
                : 'bg-white border-neutral-200/80 hover:border-neutral-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs ${
              isUnpaidActive
                ? 'bg-gold text-white'
                : (s.unpaid_partial ?? 0) > 0
                  ? 'bg-gold/20 text-gold-dark'
                  : 'bg-neutral-100 text-neutral-400'
            }`}>
              <AlertCircle size={20} />
            </div>
            <div>
              <p className={`text-2xl sm:text-3xl font-heading font-bold leading-none ${
                isUnpaidActive
                  ? 'text-gold-dark'
                  : (s.unpaid_partial ?? 0) > 0
                    ? 'text-gold-dark'
                    : 'text-neutral-900'
              }`}>
                <AnimatedCounter value={s.unpaid_partial ?? 0} />
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mt-1">
                Pending Clearance
              </p>
            </div>
          </div>

          <div className="text-right flex flex-col items-end gap-1">
            {(s.unpaid_partial ?? 0) > 0 ? (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isUnpaidActive
                  ? 'bg-gold text-white border-gold'
                  : 'bg-gold/15 text-gold-dark border-gold/30'
              }`}>
                {isUnpaidActive ? 'Filtered' : 'Action'}
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-neutral-100 text-neutral-500 border-neutral-200">
                Cleared
              </span>
            )}
            <span className="text-[11px] font-medium text-neutral-400">
              Unpaid / partial
            </span>
          </div>
        </motion.button>

      </div>
    </div>
  );
}

CategorizedMetricStrip.propTypes = {
  stats: PropTypes.object,
  loading: PropTypes.bool,
  onSelectFilter: PropTypes.func,
  activeFilter: PropTypes.string,
};
