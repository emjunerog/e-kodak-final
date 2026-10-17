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
  History,
} from 'lucide-react';
import DashboardHero from '../dashboard/DashboardHero';

/**
 * AdminHeroBanner
 * ---------------
 * Unified compact hero banner for Admin, Staff, Finance, and Photographer stations.
 * Features live Philippine Standard Time operations pill, station badge,
 * dynamic greeting ("Welcome back, [Admin Name]"), operational status summary,
 * and station tools dropdown.
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
  showBadge = true,
  creativeRemark,
}) {
  const bannerRef = useRef(null);

  useEffect(() => {
    if (bannerRef.current) {
      gsap.fromTo(
        bannerRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, []);

  // Station metadata defaults
  const stationConfig = {
    admin: {
      label: 'E-Kodak Admin',
      icon: ShieldCheck,
      defaultSummary: 'Admin dashboard operational.',
      links: [
        { label: 'Activity Logs',      href: '/admin/activity-logs', icon: History,       iconColor: 'text-gold' },
        { label: 'Record Payment',     href: '/admin/payments',      icon: CreditCard,    iconColor: 'text-gold' },
        { label: 'Manage Bookings',    href: '/admin/bookings',      icon: CalendarDays,  iconColor: 'text-neutral-400' },
        { label: 'Photographers',      href: '/admin/photographers', icon: Camera,        iconColor: 'text-neutral-400' },
        { label: 'Security',           href: '/admin/security',      icon: ShieldCheck,   iconColor: 'text-neutral-400' },
      ],
    },
    staff: {
      label: 'Front Desk Intake',
      icon: CalendarDays,
      defaultSummary: 'Front desk intake station active.',
      links: [
        { label: 'Activity Logs',      href: '/admin/activity-logs', icon: History,       iconColor: 'text-gold' },
        { label: 'Bookings Intake',    href: '/admin/bookings',      icon: CalendarDays,  iconColor: 'text-neutral-400' },
      ],
    },
    finance: {
      label: 'Finance Desk',
      icon: CreditCard,
      defaultSummary: 'Payment verification active.',
      links: [
        { label: 'Record Payment',     href: '/admin/payments',      icon: CreditCard,    iconColor: 'text-gold' },
        { label: 'Activity Logs',      href: '/admin/activity-logs', icon: History,       iconColor: 'text-gold' },
      ],
    },
    photographer: {
      label: 'Photographer Bay',
      icon: Camera,
      defaultSummary: 'Production bay operational.',
      links: [
        { label: 'My Bookings',        href: '/photographer/bookings',      icon: CalendarDays,  iconColor: 'text-gold' },
        { label: 'Availability Calendar', href: '/photographer/availability', icon: ArrowRightLeft, iconColor: 'text-gold' },
        { label: 'Deliver Outputs',    href: '/photographer/uploads',       icon: Download,      iconColor: 'text-neutral-400' },
      ],
    },
  };

  const currentStation = stationConfig[station] || stationConfig.admin;
  const BadgeIcon = CustomIcon || currentStation.icon;
  // Only display badge if explicitly requested via badgeLabel (e.g. subpages) or if showBadge is true and not admin default
  const displayLabel = showBadge === false || badgeLabel === null 
    ? null 
    : (badgeLabel !== undefined ? badgeLabel : (station === 'admin' ? null : currentStation.label));
  const displaySummary = statusSummary || subtitle || creativeRemark || null;
  const stationLinks = currentStation.links || [];

  return (
    <div ref={bannerRef} className="w-full">
      <DashboardHero
        role={station}
        userName={userName}
        title={title}
        subtitle={displaySummary}
        badgeLabel={displayLabel}
        badgeIcon={BadgeIcon}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
        showStudioStatus={true}
        extraActions={
          onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh live metrics"
              className="bg-white/[0.05] hover:bg-white/[0.09] active:scale-[0.98] text-neutral-300 hover:text-gold w-[46px] h-[46px] rounded-2xl transition-all backdrop-blur-md cursor-pointer flex items-center justify-center shadow-sm shadow-black/20"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-gold' : ''} />
            </button>
          ) : null
        }
      />
    </div>
  );
}

AdminHeroBanner.propTypes = {
  station: PropTypes.oneOf(['admin', 'staff', 'finance', 'photographer']),
  badgeLabel: PropTypes.string,
  badgeIcon: PropTypes.elementType,
  userName: PropTypes.string,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  statusSummary: PropTypes.string,
  primaryAction: PropTypes.oneOfType([
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string,
      icon: PropTypes.elementType,
      onClick: PropTypes.func,
    }),
    PropTypes.node,
  ]),
  secondaryAction: PropTypes.oneOfType([
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string,
      icon: PropTypes.elementType,
      onClick: PropTypes.func,
    }),
    PropTypes.node,
  ]),
  onRefresh: PropTypes.func,
  isRefreshing: PropTypes.bool,
  onExport: PropTypes.func,
  extraTools: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    sublabel: PropTypes.string,
    icon: PropTypes.elementType,
    iconColor: PropTypes.string,
    onClick: PropTypes.func,
  })),
};