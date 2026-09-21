import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'motion/react';
import AnimatedCounter from '../ui/AnimatedCounter';

/**
 * StatCard.jsx
 * ------------
 * Modernized metric card with subtle gradients, ambient border styling,
 * micro-interactions via motion/react, uniform sizing, and optional badge or sublabel.
 */
const COLOR_SCHEMES = {
  gold: {
    gradient: 'from-white via-white to-amber-500/[0.06]',
    border: 'border-amber-200/80 hover:border-gold hover:shadow-amber-500/10',
    iconBg: 'bg-gold/15 ring-1 ring-gold/30',
    iconColor: 'text-gold',
    badgeBg: 'bg-gold/10 text-gold border-gold/20',
  },
  blue: {
    gradient: 'from-white via-white to-blue-500/[0.06]',
    border: 'border-blue-200/80 hover:border-blue-400 hover:shadow-blue-500/10',
    iconBg: 'bg-blue-50 ring-1 ring-blue-200',
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  green: {
    gradient: 'from-white via-white to-emerald-500/[0.06]',
    border: 'border-emerald-200/80 hover:border-emerald-400 hover:shadow-emerald-500/10',
    iconBg: 'bg-emerald-50 ring-1 ring-emerald-200',
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  amber: {
    gradient: 'from-white via-white to-orange-500/[0.06]',
    border: 'border-orange-200/80 hover:border-orange-400 hover:shadow-orange-500/10',
    iconBg: 'bg-amber-50 ring-1 ring-amber-200',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  red: {
    gradient: 'from-white via-white to-rose-500/[0.06]',
    border: 'border-rose-200/80 hover:border-rose-400 hover:shadow-rose-500/10',
    iconBg: 'bg-rose-50 ring-1 ring-rose-200',
    iconColor: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  neutral: {
    gradient: 'from-white via-white to-neutral-500/[0.04]',
    border: 'border-neutral-200/80 hover:border-neutral-400 hover:shadow-neutral-500/10',
    iconBg: 'bg-neutral-100 ring-1 ring-neutral-200',
    iconColor: 'text-neutral-600',
    badgeBg: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  color = 'neutral',
  loading = false,
  badgeText,
  subtitle,
  onClick,
}) {
  const scheme = COLOR_SCHEMES[color] || COLOR_SCHEMES.neutral;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-xs p-5 min-h-[110px] animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-2.5">
            <div className="h-3 w-24 bg-neutral-200 rounded" />
            <div className="h-7 w-16 bg-neutral-200 rounded" />
            <div className="h-2.5 w-28 bg-neutral-100 rounded" />
          </div>
          <div className="w-11 h-11 bg-neutral-200 rounded-xl" />
        </div>
      </div>
    );
  }

  // Support both Lucide component (Icon) and Bootstrap icon class string (Icon)
  const isBootstrapIcon = typeof Icon === 'string';

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -3, transition: { duration: 0.2, ease: 'easeOut' } }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={`bg-gradient-to-br ${scheme.gradient} rounded-2xl border ${scheme.border} p-5 shadow-xs hover:shadow-md transition-shadow duration-300 relative overflow-hidden group min-h-[110px] flex flex-col justify-between ${
        onClick ? 'cursor-pointer select-none' : ''
      }`}
    >
      {/* Corner subtle light bloom */}
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-current opacity-[0.03] rounded-full blur-xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider font-body truncate">
              {label}
            </p>
            {badgeText && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scheme.badgeBg}`}>
                {badgeText}
              </span>
            )}
          </div>

          <p className="text-2xl sm:text-3xl font-heading font-bold text-neutral-900 tracking-tight leading-none mt-1">
            <AnimatedCounter value={value} />
          </p>

          {subtitle && (
            <p className="text-[11px] text-neutral-400 font-body truncate mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`w-11 h-11 rounded-xl ${scheme.iconBg} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-xs`}>
            {isBootstrapIcon ? (
              <i className={`${Icon} text-lg ${scheme.iconColor}`}></i>
            ) : (
              <Icon size={20} className={scheme.iconColor} />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.oneOfType([PropTypes.elementType, PropTypes.string]),
  color: PropTypes.oneOf(['gold', 'blue', 'green', 'amber', 'red', 'neutral']),
  loading: PropTypes.bool,
  badgeText: PropTypes.string,
  subtitle: PropTypes.string,
  onClick: PropTypes.func,
};
