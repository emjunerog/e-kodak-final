import React from 'react';
import PropTypes from 'prop-types';

/**
 * SummaryStrip
 * Calm, customer-facing overview: one slim card with a few key figures
 * separated by hairlines (replaces the admin-style stat-card grid).
 */
export default function SummaryStrip({ items, className = '' }) {
  return (
    <section
      aria-label="Summary"
      className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs grid grid-cols-2 lg:grid-cols-4 divide-neutral-100 dark:divide-neutral-800 ${className}`}
    >
      {items.map((it, i) => (
        <div
          key={it.label}
          className={`px-5 py-4 min-w-0 ${i % 2 === 1 ? 'border-l' : ''} ${i > 0 ? 'lg:border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} border-neutral-100 dark:border-neutral-800`}
        >
          <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">{it.label}</p>
          <p
            className={`mt-1 font-heading text-xl font-bold truncate ${
              it.tone === 'warn'
                ? 'text-amber-600 dark:text-amber-400'
                : it.tone === 'good'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-primary dark:text-neutral-100'
            }`}
          >
            {it.value}
          </p>
          {it.hint && <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{it.hint}</p>}
        </div>
      ))}
    </section>
  );
}

SummaryStrip.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.node.isRequired,
      hint: PropTypes.string,
      tone: PropTypes.oneOf(['warn', 'good']),
    })
  ).isRequired,
  className: PropTypes.string,
};
