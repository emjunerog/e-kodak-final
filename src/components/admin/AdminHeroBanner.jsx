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
      label: 'Photographer Station',
      icon: Camera,
      defaultSummary: 'Photographer studio workspace active.',
      links: [
        { label: 'My Bookings',        href: '/photographer/bookings',      icon: CalendarDays,  iconColor: 'text-gold' },
        { label: 'Availability Calendar', href: '/photographer/availability', icon: ArrowRightLeft, iconColor: 'text-gold' },
        { label: 'Deliver Outputs',    href: '/photographer/uploads',       icon: Download,      iconColor: 'text-neutral-400' },
      ],
    },
  };

  const currentStation = stationConfig[station] || stationConfig.admin;
  const BadgeIcon = CustomIcon || currentStation.icon;
  // 1. Suppress station badge text above dashboard title in all headers
  const displayLabel = null;

  // 2. Clean, relevant subtitle below title to balance out the space and make each dashboard relevant
  // Filter out any raw database count strings
  const rawSummary = subtitle || creativeRemark || null;
  const isDatabaseCount = typeof rawSummary === 'string' && (
    rawSummary.includes('Total in Database') ||
    rawSummary.includes('Awaiting Review') ||
    rawSummary.includes('Ready for Release') ||
    rawSummary.includes('Published to Portals') ||
    rawSummary.includes('Recorded Transactions') ||
    rawSummary.includes('Registered Photographers') ||
    rawSummary.includes('Registered Clients') ||
    rawSummary.includes('Total Personnel') ||
    rawSummary.includes('Total Packages') ||
    rawSummary.includes('Total Transmissions') ||
    rawSummary.includes('Total Alerts')
  );
  const displaySummary = isDatabaseCount ? null : rawSummary;
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
        primaryAction={null}
        secondaryAction={null}
        showStudioStatus={true}
        extraActions={
          <button
            type="button"
            onClick={onRefresh || (() => window.location.reload())}
            disabled={isRefreshing}
            title="Refresh live metrics"
            className="bg-white/[0.05] hover:bg-white/[0.09] active:scale-[0.98] text-neutral-300 hover:text-gold w-[48px] h-[48px] rounded-2xl transition-all backdrop-blur-md cursor-pointer flex items-center justify-center shadow-sm shadow-black/20 shrink-0"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-gold' : ''} />
          </button>
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