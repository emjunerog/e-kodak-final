import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Camera, CalendarDays, CreditCard } from 'lucide-react';
import LiveClock from './LiveClock';

const DEFAULT_ROLE_CONFIG = {
  client: {
    badgeLabel: 'E-KODAK Studio Client Portal',
    badgeIcon: Sparkles,
  },
  admin: {
    badgeLabel: 'E-Kodak Studio Admin',
    badgeIcon: ShieldCheck,
  },
  photographer: {
    badgeLabel: 'Photographer Production Station',
    badgeIcon: Camera,
  },
};

/**
 * DashboardHero
 * -------------
 * Unified, compact, high-impact hero banner for all E-KODAK Studio dashboards
 * (Admin, Client, Photographer).
 *
 * Preserves the premium photography-studio identity:
 * - Obsidian/dark slate gradient background with subtle gold ambient glows
 * - Space-efficient horizontal layout to bring vital dashboard content higher
 * - Dynamic personalized greeting ("Welcome back, [Name]")
 * - Compact studio operations pill (PHT time + Studio Open status)
 * - Flexible role-based actions and integrated tool docks
 */
export default function DashboardHero({
  role = 'client',
  userName = '',
  greeting = 'Welcome back',
  title,
  subtitle,
  badgeLabel,
  badgeIcon: CustomBadgeIcon,
  primaryAction,
  secondaryAction,
  extraActions,
  showStudioStatus = true,
  className = '',
  children,
}) {
  const isStationBanner = role !== 'client';
  const roleConfig = DEFAULT_ROLE_CONFIG[role] || DEFAULT_ROLE_CONFIG.client;
  const BadgeIcon = CustomBadgeIcon || roleConfig.badgeIcon;
  const resolvedBadgeLabel = isStationBanner
    ? null
    : ((badgeLabel === null || badgeLabel === false || badgeLabel === '')
      ? null
      : (badgeLabel !== undefined ? badgeLabel : roleConfig.badgeLabel));

  // Format title or greeting with signature E-KODAK gold italic accent
  const renderHeading = () => {
    if (title) {
      if (typeof title === 'string' && title.includes(' ')) {
        const lastSpaceIndex = title.lastIndexOf(' ');
        const firstPart = title.substring(0, lastSpaceIndex);
        const lastWord = title.substring(lastSpaceIndex + 1);
        return (
          <span className="inline-flex items-baseline flex-wrap gap-x-2.5">
            <span className="text-white font-light drop-shadow-xs">{firstPart}</span>{' '}
            <span className="font-heading italic font-light bg-gradient-to-r from-amber-200 via-gold to-amber-300 bg-clip-text text-transparent drop-shadow-sm">
              {lastWord}
            </span>
          </span>
        );
      }
      return (
        <span className="inline-flex items-baseline flex-wrap gap-x-2.5">
          <span className="text-white font-light drop-shadow-xs">{title}</span>
        </span>
      );
    }

    // Dynamic artistic time-based greeting if greeting is default
    const dynamicGreeting = (() => {
      if (greeting && greeting !== 'Welcome back') return greeting;
      const hour = new Date().getHours();
      if (hour < 12) return 'Good morning';
      if (hour < 17) return 'Good afternoon';
      return 'Good evening';
    })();

    return (
      <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-1">
        <span className="text-white font-light drop-shadow-xs">{dynamicGreeting},</span>
        <span className="font-heading italic font-light bg-gradient-to-r from-amber-200 via-gold to-amber-300 bg-clip-text text-transparent drop-shadow-sm">
          {userName || 'Member'}
        </span>
      </div>
    );
  };

  const renderAction = (action, isPrimary = true) => {
    if (!action) return null;

    // Direct React Node
    if (React.isValidElement(action)) return action;

    const {
      label,
      href,
      onClick,
      icon: ActionIcon,
      className: actionClassName = '',
      title: tooltipTitle,
      ariaLabel,
      type = 'button',
      disabled = false,
    } = action;

    const baseClasses = isPrimary
      ? 'h-[44px] px-3.5 sm:px-4 rounded-2xl text-xs font-normal flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap'
      : 'h-[44px] px-3 sm:px-3.5 rounded-2xl text-xs font-normal flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 hover:text-white backdrop-blur-md shadow-sm shadow-black/20 active:scale-[0.98]';

    const content = (
      <>
        {ActionIcon && <ActionIcon size={14} className={isPrimary ? 'text-neutral-950' : 'text-gold'} />}
        <span>{label}</span>
      </>
    );

    if (href) {
      return (
        <Link
          to={href}
          className={`${baseClasses} ${actionClassName}`}
          title={tooltipTitle || label}
          aria-label={ariaLabel || label}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${actionClassName}`}
        title={tooltipTitle || label}
        aria-label={ariaLabel || label}
      >
        {content}
      </button>
    );
  };

  const containerClasses = `w-full mt-0 rounded-none border-t-0 border-x-0 rounded-b-2xl sm:rounded-b-3xl border-b border-amber-500/20 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8),0_0_25px_rgba(201,169,110,0.12)] px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 mb-2.5 sm:mb-3 font-body font-light transition-all`;

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-r from-[#14100c] via-[#21180f] via-[#16151a] to-[#0f1726] ${containerClasses} ${className}`}
    >
      {/* ── Photographic Studio Background Texture with Soft Blend ── */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-luminosity pointer-events-none transition-opacity duration-500"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1600&q=80&auto=format&fit=crop')`,
        }}
      />

      {/* ── Rich Radiant Multi-Stop Gradient Overlays ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_100%_at_5%_0%,rgba(217,119,6,0.35),transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_35%_0%,rgba(180,83,9,0.25),transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_80%_at_95%_0%,rgba(30,58,138,0.25),transparent_60%)] pointer-events-none" />

      {/* ── Studio Ambient Glow Orbs ─────────────────────────────────────────── */}
      <div className="absolute -top-20 -left-16 w-80 h-80 bg-gradient-to-br from-amber-500/30 via-gold/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-16 w-80 h-80 bg-gradient-to-tl from-sky-600/20 via-amber-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-2.5 sm:gap-3">
        {/* ── Top Row: Optional Station Badge (Only rendered if explicit badgeLabel is provided) ─ */}
        {resolvedBadgeLabel && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[11px] font-light uppercase tracking-wider text-gold bg-gold/15 border border-gold/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
              <BadgeIcon size={12} className="text-gold shrink-0" />
              <span className="truncate max-w-[240px] sm:max-w-none">{resolvedBadgeLabel}</span>
            </span>
          </div>
        )}

        {/* ── Main Row: Left (Creative Welcome Remarks) + Right (Arranged Time & Icons Control Dock) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-h-[46px] pt-0.5">
          {/* Left Column: Heading and Contextual Subtitle occupying the space */}
          <div className="space-y-1 min-w-0 flex-1 pr-2 sm:pr-4">
            <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-heading text-white font-light tracking-tight leading-tight">
              {renderHeading()}
            </h1>

            {subtitle && (
              <p className="text-xs sm:text-[13px] text-neutral-300 font-body leading-relaxed max-w-2xl font-light mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Right Column: Time & Icons Control Dock (Anchored in decent place on the right) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 self-start sm:self-center">
            {(primaryAction || secondaryAction) && (
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                {renderAction(primaryAction, true)}
                {renderAction(secondaryAction, false)}
              </div>
            )}

            {showStudioStatus && (
              <LiveClock variant="pill" />
            )}

            {extraActions}
          </div>
        </div>

        {/* Optional Custom Injected Children */}
        {children && <div className="pt-2">{children}</div>}
      </div>
    </div>
  );
}

DashboardHero.propTypes = {
  role: PropTypes.oneOf(['client', 'admin', 'photographer']),
  userName: PropTypes.string,
  greeting: PropTypes.string,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  badgeLabel: PropTypes.string,
  badgeIcon: PropTypes.elementType,
  primaryAction: PropTypes.oneOfType([
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string,
      onClick: PropTypes.func,
      icon: PropTypes.elementType,
      className: PropTypes.string,
    }),
    PropTypes.node,
  ]),
  secondaryAction: PropTypes.oneOfType([
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string,
      onClick: PropTypes.func,
      icon: PropTypes.elementType,
      className: PropTypes.string,
    }),
    PropTypes.node,
  ]),
  extraActions: PropTypes.node,
  showStudioStatus: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
