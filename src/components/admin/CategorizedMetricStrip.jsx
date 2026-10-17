import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'motion/react';
import AnimatedCounter from '../ui/AnimatedCounter';

/**
 * CategorizedMetricStrip
 * ----------------------
 * Unified 4-card KPI metric strip following luxury studio visual guidelines:
 * - Same cohesive warm cream/gold aesthetic across the entire card set
 * - Extra large elegant serif numerals (Playfair Display / Serif)
 * - Icons completely removed for clean, uncluttered minimalism
 * - Top-right status pill badge (TOTAL, PENDING, APPROVED, COMPLETED)
 * - Clear uppercase descriptive subtitle with matching horizontal accent bar
 * - Subtle botanical leaf & organic fluid wave in bottom-right corner
 */
export default function CategorizedMetricStrip({
  stats,
  cards,
  loading = false,
  onSelectFilter,
  activeFilter = 'ALL',
  columns,
  className = '',
}) {
  const s = stats || {};

  // ── Default 4 Studio KPI Cards if custom cards array not provided ──
  const defaultCards = [
    {
      key: 'ALL',
      label: 'TOTAL',
      subtitle: 'All studio bookings recorded',
      value: s.total,
    },
    {
      key: 'PENDING',
      label: 'PENDING',
      subtitle: 'Awaiting scheduling & review',
      value: s.pending,
    },
    {
      key: 'CONFIRMED',
      label: 'APPROVED',
      subtitle: 'Verified & ready for shooting',
      value: s.confirmed,
    },
    {
      key: 'COMPLETED',
      label: 'COMPLETED',
      subtitle: 'Fulfilled & outputs delivered',
      value: s.completed,
    },
  ];

  const effectiveCards = cards || defaultCards;

  // Auto-determine default grid columns based on card count if not specified
  const effectiveColumns = columns || (
    effectiveCards.length === 6
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
      : effectiveCards.length === 5
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
        : 'grid-cols-2 lg:grid-cols-4'
  );

  if (loading) {
    return (
      <div className={`grid ${effectiveColumns} gap-3 sm:gap-3.5 font-body ${className}`}>
        {[...Array(effectiveCards.length)].map((_, i) => (
          <div
            key={i}
            className="min-h-[135px] sm:min-h-[145px] bg-gradient-to-br from-[#fcf9f2] via-[#faf5eb] to-[#f4ebe0] rounded-2xl sm:rounded-3xl border border-amber-200/70 p-4 sm:p-5 animate-pulse flex flex-col justify-between shadow-xs"
          >
            <div className="flex justify-end">
              <div className="w-16 h-5 rounded-full bg-amber-200/60" />
            </div>
            <div>
              <div className="w-16 h-8 rounded bg-amber-200/50 mb-2.5" />
              <div className="w-28 h-3 rounded bg-amber-200/60 mb-2.5" />
              <div className="w-10 h-[3px] rounded-full bg-amber-300/70" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`font-body ${className}`}>
      {/* ── Responsive KPI Cards (Identical Luxury Cream/Gold Look Across Whole Set) ──── */}
      <div className={`grid ${effectiveColumns} gap-3 sm:gap-3.5`}>
        {effectiveCards.map((card) => {
          const isActive = card.isActive !== undefined 
            ? card.isActive 
            : (activeFilter !== undefined && activeFilter === card.key);

          const handleClick = () => {
            if (card.onClick) {
              card.onClick();
            } else if (onSelectFilter) {
              onSelectFilter(card.key);
            }
          };

          const rawVal = card.value ?? 0;
          const isNumeric = typeof rawVal === 'number' || (!isNaN(rawVal) && typeof rawVal !== 'string');
          const isStringVal = typeof rawVal === 'string';
          const isLongString = isStringVal && rawVal.length > 7;

          return (
            <motion.button
              key={card.key}
              type="button"
              whileHover={{ y: -2, transition: { duration: 0.16, ease: 'easeOut' } }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClick}
              title={`Filter: ${card.label}`}
              className={`group relative p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border text-left transition-all duration-200 cursor-pointer select-none min-h-[135px] sm:min-h-[145px] flex flex-col justify-between overflow-hidden shadow-xs ${
                isActive
                  ? 'bg-gradient-to-br from-[#faf3e3] via-[#f7ebd1] to-[#f2dfbe] border-gold ring-2 ring-gold/45 shadow-md shadow-amber-950/10'
                  : 'bg-gradient-to-br from-[#fcf9f2] via-[#faf5eb] to-[#f4ebe0] border-amber-200/80 hover:border-gold/60 hover:shadow-md hover:shadow-amber-950/5'
              }`}
            >
              {/* Organic Fluid Corner Wave & Botanical Leaf Silhouette in bottom-right */}
              <svg
                className="absolute bottom-0 right-0 w-20 h-20 sm:w-24 sm:h-24 pointer-events-none transition-transform duration-300 group-hover:scale-105"
                viewBox="0 0 160 160"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M160 25 C120 40 85 80 65 110 C50 130 35 150 0 160 L160 160 Z"
                  fill="url(#kpi-wave-gold)"
                />
                {/* Botanical leaves */}
                <path
                  d="M160 65 C140 70 125 90 120 112 C132 106 146 102 160 106 Z"
                  fill="#d97706"
                  fillOpacity="0.14"
                />
                <path
                  d="M135 105 C115 108 100 124 95 142 C108 137 122 133 135 137 Z"
                  fill="#d97706"
                  fillOpacity="0.12"
                />
                <defs>
                  <linearGradient id="kpi-wave-gold" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.08" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Top Row: Clean layout without icon, Right-aligned Status Pill Badge */}
              <div className="flex items-center justify-end relative z-10 w-full">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-bold tracking-wider uppercase border transition-colors shadow-3xs ${
                    isActive
                      ? 'bg-amber-200/90 text-amber-950 border-amber-300'
                      : 'bg-amber-100/75 text-amber-900 border-amber-200/70 group-hover:bg-amber-100 group-hover:border-amber-300'
                  }`}
                >
                  {card.label}
                </span>
              </div>

              {/* Content Area: Extra Large Playfair Display Number, Label, and Accent Bar */}
              <div className="relative z-10 mt-1">
                <p className={`font-heading font-bold text-neutral-900 leading-none tracking-tight ${
                  isLongString 
                    ? 'text-2xl sm:text-3xl lg:text-4xl' 
                    : isStringVal 
                      ? 'text-3xl sm:text-4xl lg:text-[42px]' 
                      : 'text-4xl sm:text-5xl lg:text-[52px]'
                }`}>
                  {isNumeric ? (
                    <AnimatedCounter value={Number(rawVal)} />
                  ) : (
                    rawVal
                  )}
                </p>

                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-600 font-body mt-2 leading-tight truncate">
                  {card.subtitle}
                </p>

                {/* Horizontal Accent Line underneath subtitle */}
                <div className="w-8 sm:w-10 h-[3px] rounded-full bg-amber-600/75 mt-1.5 transition-all group-hover:w-14 group-hover:bg-amber-700" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

CategorizedMetricStrip.propTypes = {
  stats: PropTypes.object,
  cards: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    subtitle: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    isActive: PropTypes.bool,
    onClick: PropTypes.func,
  })),
  loading: PropTypes.bool,
  onSelectFilter: PropTypes.func,
  activeFilter: PropTypes.string,
  columns: PropTypes.string,
  className: PropTypes.string,
};
