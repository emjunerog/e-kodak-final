import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Upload,
  CalendarCheck,
  CalendarClock,
  History,
  ChevronRight,
} from 'lucide-react';

const SHORTCUTS = [
  {
    key: 'uploads',
    label: 'Upload Outputs',
    description: 'Deliver finished session photos',
    to: '/photographer/uploads',
    icon: Upload,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/70',
  },
  {
    key: 'bookings',
    label: 'All Bookings',
    description: 'Browse assigned shoot archive',
    to: '/photographer/bookings',
    icon: CalendarCheck,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/70',
  },
  {
    key: 'availability',
    label: 'Working Hours',
    description: 'Manage calendar & daily shifts',
    to: '/photographer/availability',
    icon: CalendarClock,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
  },
  {
    key: 'logs',
    label: 'Activity Logs',
    description: 'Review station history & audit',
    to: '/photographer/activity-logs',
    icon: History,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/70',
  },
];

/**
 * StationShortcutsCard
 * ====================
 * Warm editorial Studio Shortcuts card matching PhotographerDashboard styling.
 */
export default function StationShortcutsCard({ embedded = false }) {
  return (
    <div
      className={
        embedded
          ? 'font-body space-y-3.5'
          : 'relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-white via-surface-warm to-amber-50/20 border border-neutral-200/90 shadow-xs font-body space-y-3.5'
      }
    >
      {!embedded && (
        <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-gradient-to-tl from-gold/15 via-amber-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
      )}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-neutral-200/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold/25 via-gold/10 to-transparent text-gold-dark border border-gold/30 flex items-center justify-center shadow-2xs">
            <Layers size={15} />
          </div>
          <h3 className="font-heading text-base font-bold text-primary leading-tight">
            Station <span className="text-gold-dark italic font-normal">Shortcuts</span>
          </h3>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
          Quick Access
        </span>
      </div>

      {/* 2x2 Lively Studio Navigation Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {SHORTCUTS.map((item) => {
          const ItemIcon = item.icon;
          return (
            <Link
              key={item.key}
              to={item.to}
              className="group p-3.5 rounded-xl bg-white hover:bg-gradient-to-br hover:from-white hover:to-amber-50/50 border border-neutral-200/85 hover:border-gold/75 shadow-2xs hover:shadow-sm transition-all duration-200 flex items-start justify-between gap-2.5"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${item.badgeClass}`}
                >
                  <ItemIcon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-primary group-hover:text-gold-dark transition-colors leading-snug truncate">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
              <ChevronRight
                size={14}
                className="text-neutral-300 group-hover:text-gold group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
