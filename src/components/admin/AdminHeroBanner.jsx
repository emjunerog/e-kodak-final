import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import {
  ChevronDown,
  ShieldCheck,
  Camera,
  CalendarDays,
  CreditCard,
  ArrowRightLeft,
  RefreshCw,
  Download,
} from 'lucide-react';
import LiveClock from '../dashboard/LiveClock';

/**
 * AdminHeroBanner
 * ---------------
 * Unified dashboard hero banner featuring live Philippine Standard Time,
 * station badge, greeting, status summary, and actions dropdown with GSAP animations.
 */
export default function AdminHeroBanner({
  station = 'admin', // 'admin' | 'staff' | 'finance' | 'photographer'
  badgeLabel,
  badgeIcon: CustomIcon,
  userName = 'Administrator',
  title,
  subtitle,
  statusSummary,
  primaryAction,
  secondaryAction,
  onRefresh,
  isRefreshing = false,
  onExport,
  extraTools = [],
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bannerRef = useRef(null);

  useEffect(() => {
    if (bannerRef.current) {
      gsap.fromTo(
        bannerRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Station metadata defaults (3-color palette: primary, gold, neutral)
  const stationConfig = {
    admin: {
      label: 'E-Kodak Admin',
      icon: ShieldCheck,
      color: 'text-gold',
      bg: 'bg-gold/15',
      border: 'border-gold/30',
      defaultSummary: 'Admin dashboard operational.',
    },
    staff: {
      label: 'Front Desk',
      icon: CalendarDays,
      color: 'text-neutral-600',
      bg: 'bg-neutral-100',
      border: 'border-neutral-300',
      defaultSummary: 'Front desk intake station active.',
    },
    finance: {
      label: 'Finance Desk',
      icon: CreditCard,
      color: 'text-gold',
      bg: 'bg-gold/15',
      border: 'border-gold/30',
      defaultSummary: 'Payment verification active.',
    },
    photographer: {
      label: 'Photographer Bay',
      icon: Camera,
      color: 'text-gold',
      bg: 'bg-gold/15',
      border: 'border-gold/30',
      defaultSummary: 'Production bay operational.',
    },
  };

  const currentStation = stationConfig[station] || stationConfig.admin;
  const BadgeIcon = CustomIcon || currentStation.icon;
  const displayLabel = badgeLabel || currentStation.label;
  const displaySummary = statusSummary || subtitle || currentStation.defaultSummary;

  return (
    <div ref={bannerRef} className="relative rounded-2xl overflow-hidden bg-neutral-950 p-6 sm:p-8 shadow-xl border border-neutral-800">
      {/* Subtle ambient glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl translate-y-1/3 pointer-events-none" />

      <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-center">
        {/* Left: Welcome & Operational Controls */}
        <div className="lg:col-span-7 space-y-4">
          {/* Station Badge */}
          <span className={`text-[11px] font-bold uppercase tracking-wider ${currentStation.color} ${currentStation.bg} border ${currentStation.border} px-3 py-1 rounded-full inline-flex items-center gap-1.5`}>
            <BadgeIcon size={12} />
            <span>{displayLabel}</span>
          </span>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading text-white font-bold tracking-tight">
            {title ? (
              typeof title === 'string' && title.includes(' ') ? (
                <>
                  {title.substring(0, title.lastIndexOf(' '))}{' '}
                  <span className="text-gold italic font-normal">
                    {title.substring(title.lastIndexOf(' ') + 1)}
                  </span>
                </>
              ) : (
                title
              )
            ) : (
              <>
                Welcome back,{' '}
                <span className="text-gold italic font-normal">
                  {userName}
                </span>
              </>
            )}
          </h1>

          {/* Status summary */}
          {displaySummary && (
            <p className="text-sm text-neutral-300 max-w-xl font-body leading-relaxed">
              {displaySummary}
            </p>
          )}

          {/* Action Bar & Dropdown Tools */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {/* Primary Action Button */}
            {primaryAction && (
              primaryAction.href ? (
                <Link
                  to={primaryAction.href}
                  className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2 shadow-lg shadow-gold/20"
                >
                  {primaryAction.icon && <primaryAction.icon size={16} />}
                  <span>{primaryAction.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2 shadow-lg shadow-gold/20"
                >
                  {primaryAction.icon && <primaryAction.icon size={16} />}
                  <span>{primaryAction.label}</span>
                </button>
              )
            )}

            {/* Secondary Action Button */}
            {secondaryAction && (
              secondaryAction.href ? (
                <Link
                  to={secondaryAction.href}
                  className="btn-ghost-white py-2.5 px-4 text-sm flex items-center gap-2"
                >
                  {secondaryAction.icon && <secondaryAction.icon size={16} className="text-gold" />}
                  <span>{secondaryAction.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={secondaryAction.onClick}
                  className="btn-ghost-white py-2.5 px-4 text-sm flex items-center gap-2"
                >
                  {secondaryAction.icon && <secondaryAction.icon size={16} className="text-gold" />}
                  <span>{secondaryAction.label}</span>
                </button>
              )
            )}

            {/* Tools & Operations Dropdown List */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all hover:border-neutral-600 shadow-sm"
              >
                <ArrowRightLeft size={15} className="text-gold" />
                <span>Station Tools</span>
                <ChevronDown size={14} className={`text-neutral-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-56 backdrop-blur-md bg-neutral-950/95 border border-neutral-800/90 ring-1 ring-white/10 rounded-2xl shadow-2xl shadow-black/80 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Navigation links */}
                  {[
                    { label: 'Workstation Hub',   href: '/admin/workstation',  icon: ArrowRightLeft, iconColor: 'text-gold' },
                    { label: 'Record Payment',     href: '/admin/payments',     icon: CreditCard,    iconColor: 'text-gold' },
                    { label: 'Manage Bookings',    href: '/admin/bookings',     icon: CalendarDays,  iconColor: 'text-neutral-400' },
                    { label: 'Photographers',      href: '/admin/photographers',icon: Camera,        iconColor: 'text-neutral-400' },
                    { label: 'Security',           href: '/admin/security',     icon: ShieldCheck,   iconColor: 'text-neutral-400' },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-neutral-200 hover:bg-neutral-800/80 hover:text-white transition-all font-body"
                    >
                      <item.icon size={15} className={item.iconColor} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}

                  {/* Extra custom tools */}
                  {extraTools.map((tool, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { tool.onClick?.(); setDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors text-left"
                    >
                      {tool.icon && <tool.icon size={14} className="text-neutral-400" />}
                      <span className="font-medium">{tool.label}</span>
                    </button>
                  ))}

                  {/* Divider actions */}
                  <div className="border-t border-neutral-800 mt-1 pt-1">
                    {onExport && (
                      <button
                        type="button"
                        onClick={() => { onExport(); setDropdownOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors text-left"
                      >
                        <Download size={14} className="text-neutral-500" />
                        <span className="font-medium">Export CSV</span>
                      </button>
                    )}
                    {onRefresh && (
                      <button
                        type="button"
                        onClick={() => { onRefresh(); setDropdownOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors text-left"
                      >
                        <RefreshCw size={14} className={`text-neutral-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="font-medium">Refresh</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Refresh Icon Button */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh live metrics"
                className="bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white p-2.5 rounded-xl border border-neutral-700 transition-colors"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-gold' : ''} />
              </button>
            )}
          </div>
        </div>

        {/* Right: Live Philippine Time & Date Operations Card */}
        <div className="lg:col-span-5">
          <LiveClock variant="card" />
        </div>
      </div>
    </div>
  );
}

AdminHeroBanner.propTypes = {
  station: PropTypes.oneOf(['admin', 'staff', 'finance', 'photographer']),
  badgeLabel: PropTypes.string,
  badgeIcon: PropTypes.elementType,
  userName: PropTypes.string,
  statusSummary: PropTypes.string,
  primaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    href: PropTypes.string,
    icon: PropTypes.elementType,
    onClick: PropTypes.func,
  }),
  secondaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    href: PropTypes.string,
    icon: PropTypes.elementType,
    onClick: PropTypes.func,
  }),
  onRefresh: PropTypes.func,
  isRefreshing: PropTypes.bool,
  onExport: PropTypes.func,
  extraTools: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    sublabel: PropTypes.string,
    icon: PropTypes.elementType,
    onClick: PropTypes.func,
  })),
};