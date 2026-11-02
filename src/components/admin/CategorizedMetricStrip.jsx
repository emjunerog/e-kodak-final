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
      value: s.total,
    },
    {
      key: 'PENDING',
      label: 'PENDING',
      value: s.pending,
    },
    {
      key: 'CONFIRMED',
      label: 'APPROVED',
      value: s.confirmed,
    },
    {
      key: 'COMPLETED',
      label: 'COMPLETED',
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
            className="p-4.5 sm:p-5 min-h-[102px] sm:min-h-[108px] bg-gradient-to-br from-[#fcf9f2] via-[#faf5eb] to-[#f4ebe0] dark:from-neutral-900 dark:via-neutral-900/90 dark:to-neutral-950 rounded-2xl border border-amber-200/70 dark:border-neutral-800 animate-pulse flex flex-col justify-center shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-20 sm:w-24 h-3.5 rounded bg-amber-200/60 dark:bg-neutral-800" />
              <div className="w-2 h-2 rounded-full bg-amber-200/60 dark:bg-neutral-700" />
            </div>
            <div className="w-12 sm:w-14 h-8 rounded bg-amber-200/50 dark:bg-neutral-800 mb-2" />
            <div className="w-9 sm:w-10 h-[2.5px] rounded-full bg-amber-300/70 dark:bg-neutral-700" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`font-body ${className}`}>
      {/* ── Responsive KPI Cards (Direct Title Above Number, Minimal, No Descriptions Below) ──── */}
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
          const cardTitle = card.title || card.label;

          return (
            <motion.button
              key={card.key}
              type="button"
              whileHover={{ y: -2, transition: { duration: 0.16, ease: 'easeOut' } }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClick}
              title={`Click to filter bookings queue by ${cardTitle} (${rawVal} ${rawVal === 1 ? 'order' : 'orders'})`}
              className={`group relative p-4.5 sm:p-5 min-h-[102px] sm:min-h-[108px] rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none flex flex-col justify-center overflow-hidden shadow-xs ${
                isActive
                  ? 'bg-gradient-to-br from-[#faf3e3] via-[#f7ebd1] to-[#f2dfbe] dark:from-neutral-800 dark:via-neutral-850 dark:to-neutral-900 border-gold ring-2 ring-gold/45 shadow-md shadow-amber-950/10'
                  : 'bg-gradient-to-br from-[#fcf9f2] via-[#faf5eb] to-[#f4ebe0] dark:from-neutral-900 dark:via-neutral-900/90 dark:to-neutral-950 border-amber-200/80 dark:border-neutral-800 hover:border-gold/60 dark:hover:border-neutral-700 hover:shadow-md hover:shadow-amber-950/5'
              }`}
            >
              {/* Organic Fluid Corner Wave & Botanical Leaf Silhouette in bottom-right */}
              <svg
                className="absolute bottom-0 right-0 w-20 h-20 sm:w-26 sm:h-26 pointer-events-none transition-transform duration-300 group-hover:scale-105"
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

              {/* Card Content with balanced horizontal and vertical presence */}
              <div className="relative z-10 w-full space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-body group-hover:text-amber-950 dark:group-hover:text-amber-200 transition-colors truncate">
                    {cardTitle}
                  </h4>
                  <span className={`h-2 w-2 rounded-full transition-all ${
                    isActive 
                      ? 'bg-amber-600 dark:bg-amber-400 shadow-[0_0_6px_rgba(217,119,6,0.6)]' 
                      : 'bg-amber-400/40 dark:bg-neutral-600 group-hover:bg-amber-500/70'
                  }`} />
                </div>

                {/* Content Area: Playfair Display Number and Accent Bar */}
                <p className={`font-heading font-extrabold text-neutral-900 dark:text-neutral-100 leading-none tracking-tight pt-1 ${
                  isLongString 
                    ? 'text-2xl sm:text-3xl' 
                    : isStringVal 
                      ? 'text-3xl sm:text-4xl' 
                      : 'text-3xl sm:text-[38px] lg:text-[42px]'
                }`}>
                  {isNumeric ? (
                    <AnimatedCounter value={Number(rawVal)} />
                  ) : (
                    rawVal
                  )}
                </p>

                {/* Horizontal Accent Line underneath number */}
                <div className="w-8 sm:w-10 h-[2.5px] rounded-full bg-amber-600/75 dark:bg-amber-500/70 !mt-2 transition-all group-hover:w-13 group-hover:bg-amber-700 dark:group-hover:bg-amber-400" />
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
    subtitle: PropTypes.string,
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
