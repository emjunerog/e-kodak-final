import React from 'react';
import PropTypes from 'prop-types';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarPlus, 
  CalendarDays, 
  History,
  FolderDown, 
  User, 
  Settings, 
  LogOut,
  X,
  Layers,
  CreditCard,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ 
  onClose, 
  bookings = [], 
  unreadCount = 0, 
  onRequestLogout,
  isCollapsed = false,
  onToggleCollapse
}) {
  const { profile } = useAuth();

  const handleLogout = () => {
    if (onRequestLogout) {
      onRequestLogout();
    } else {
      window.dispatchEvent(new CustomEvent('open-logout-confirm'));
    }
  };

  const latestBooking = bookings && bookings.length > 0 ? bookings[0] : null;
  const hasActiveBooking = Boolean(
    latestBooking && 
    latestBooking.status !== 'CANCELLED' && 
    latestBooking.status !== 'REJECTED' &&
    latestBooking.status !== 'COMPLETED'
  );

  // Soft-copies indicator: true if any booking has uploaded photo outputs / Google Drive link
  const hasSoftCopies = Boolean(
    bookings && bookings.some(b => 
      (b.photo_outputs && b.photo_outputs.length > 0) || b.has_soft_copies
    )
  );

  const pendingDownpaymentBooking = bookings && bookings.find(b => {
    if (b.status === 'CANCELLED' || b.status === 'REJECTED') return false;
    const s = (b.payment_status || '').toUpperCase();
    const rem = Number(b.remaining_balance ?? b.total_amount ?? 0);
    const isUnpaid = s === 'UNPAID' || s === '';
    const downPaid = Number(b.down_payment_amount || 0);
    return (isUnpaid || rem > 0) && (!b.down_payment_confirmed && downPaid === 0);
  });

  const hasPendingPayment = Boolean(pendingDownpaymentBooking || (bookings && bookings.some(b => {
    const s = (b.payment_status || '').toUpperCase();
    return s !== 'PAID' && s !== 'SETTLED' && Number(b.remaining_balance ?? b.total_amount ?? 0) > 0;
  })));

  // Navigation sections prioritizing core customer actions
  const navSections = [
    {
      title: 'Studio Services',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
        { 
          name: 'Book a Session', 
          path: '/dashboard/book', 
          icon: CalendarPlus,
          isHighlight: true 
        },
        { 
          name: 'Booking Progress', 
          path: '/dashboard/progress', 
          icon: Layers,
          status: hasActiveBooking ? 'active' : (latestBooking?.status === 'COMPLETED' ? 'completed' : null),
        },
        { name: 'Booking Records', path: '/dashboard/bookings', icon: CalendarDays },
        { 
          name: 'Soft-copies', 
          path: '/dashboard/soft-copies', 
          icon: FolderDown,
          status: hasSoftCopies ? 'soft_copies_ready' : null,
        },
        { 
          name: 'Billing & Payments', 
          path: '/dashboard/payments', 
          icon: CreditCard,
          status: pendingDownpaymentBooking ? 'deposit_due' : (hasPendingPayment ? 'due' : null),
        },
      ]
    },
    {
      title: 'Activity & Updates',
      items: [
        { name: 'Activity Logs', path: '/dashboard/activity', icon: History }
      ]
    }
  ];

  const accountItems = [
    { name: 'Profile', path: '/dashboard/profile', icon: User },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 select-none overflow-hidden">
      {/* Brand Header */}
      <div className="h-16 border-b border-neutral-100 dark:border-neutral-800 px-3 flex items-center justify-between relative overflow-hidden flex-shrink-0">
        {/* Brand Logo & Name */}
        <div
          className={`flex items-center min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
            isCollapsed
              ? 'opacity-0 max-w-0 -translate-x-3 pointer-events-none'
              : 'opacity-100 max-w-[170px] translate-x-0'
          }`}
        >
          <Link 
            to="/dashboard" 
            onClick={onClose}
            className="flex items-center gap-2.5 text-primary dark:text-neutral-100 hover:text-gold transition-colors min-w-0 pl-1 group"
          >
            <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center p-1 shadow-xs border border-neutral-800 shrink-0 group-hover:border-gold/40 transition-colors">
              <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
            </div>
            <div>
              <span className="font-heading text-base font-light tracking-wider block leading-none">E-KODAK</span>
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-body font-light">Studio</span>
            </div>
          </Link>
        </div>

        {/* Action Controls: Collapse Toggle & Mobile Close */}
        <div className={`flex items-center shrink-0 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
          isCollapsed ? 'w-full justify-center' : 'ml-auto'
        }`}>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`hidden lg:flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer select-none transition-colors duration-150 shrink-0 ${
                isCollapsed
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-gold hover:bg-neutral-200/80 hover:text-gold-dark ring-1 ring-gold/20'
                  : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title={isCollapsed ? 'Expand sidebar (show full menu)' : 'Collapse sidebar (icons only)'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeftOpen size={18} className="text-gold" strokeWidth={2.2} />
              ) : (
                <PanelLeftClose size={18} strokeWidth={2} />
              )}
            </button>
          )}

          {/* Mobile Close Button */}
          <button 
            type="button"
            onClick={onClose} 
            className="lg:hidden text-neutral-400 hover:text-primary dark:hover:text-white p-1.5 rounded-lg transition-colors ml-1 cursor-pointer" 
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col justify-between scrollbar-hide space-y-3">
        {/* Top Section: Studio Services & Activity */}
        <div className="space-y-3">
          {navSections.map((section, idx) => (
            <div key={section.title} className={idx > 0 ? "pt-3 border-t border-neutral-100 dark:border-neutral-800/80" : ""}>
              {/* Section Header */}
              <div className="h-5 px-3 flex items-center relative overflow-hidden mb-1.5">
                <p
                  className={`text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.14em] whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                    isCollapsed
                      ? 'opacity-0 -translate-x-2 pointer-events-none'
                      : 'opacity-100 translate-x-0'
                  }`}
                >
                  {section.title}
                </p>
                <div
                  className={`absolute inset-x-3.5 top-2.5 h-px bg-neutral-100 dark:bg-neutral-800 transition-opacity duration-300 ${
                    isCollapsed ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </div>

              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    end={item.exact}
                    onClick={onClose}
                    title={isCollapsed ? item.name : undefined}
                    className={({ isActive }) => `
                      group relative flex items-center h-10 w-full rounded-xl select-none px-2.5 transition-all duration-150 font-body
                      ${isActive 
                        ? 'bg-neutral-900 dark:bg-neutral-800 text-white shadow-xs font-normal' 
                        : item.isHighlight
                          ? 'text-primary dark:text-neutral-100 hover:bg-gold/10 hover:text-gold-dark font-light'
                          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 hover:text-neutral-900 dark:hover:text-white font-light'}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Anchor slot - precisely 36x36 (w-9 h-9) */}
                        <div className="w-9 h-9 flex items-center justify-center shrink-0">
                          <item.icon 
                            size={17} 
                            strokeWidth={isActive ? 2.2 : 1.9}
                            className={`shrink-0 transition-colors duration-150 ${
                              isActive 
                                ? 'text-gold' 
                                : item.isHighlight 
                                  ? 'text-gold' 
                                  : 'text-neutral-400 group-hover:text-gold'
                            }`} 
                          />
                        </div>

                        {/* Sliding Label */}
                        <div
                          className={`ml-2.5 flex-1 min-w-0 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                            isCollapsed
                              ? 'opacity-0 max-w-0 -translate-x-3 pointer-events-none'
                              : 'opacity-100 max-w-[170px] translate-x-0'
                          }`}
                        >
                          <span className="text-[13px] font-normal tracking-tight truncate">{item.name}</span>
                          
                          {/* Soft-copies Availability Badge */}
                          {item.status === 'soft_copies_ready' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0 ml-1.5 uppercase tracking-wider">
                              Ready
                            </span>
                          ) : isActive ? (
                            <ChevronRight size={13} className="text-gold shrink-0 ml-1.5" />
                          ) : null}
                        </div>

                        {/* Collapsed dot badge indicator if active booking / pending payment / soft-copies */}
                        {isCollapsed && item.status && (
                          <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-white dark:ring-neutral-900 animate-pulse ${
                            item.status === 'soft_copies_ready' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section: Account Navigation */}
        <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
          <div className="h-5 px-3 flex items-center relative overflow-hidden mb-1.5">
            <p
              className={`text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.1em] whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                isCollapsed
                  ? 'opacity-0 -translate-x-2 pointer-events-none'
                  : 'opacity-100 translate-x-0'
              }`}
            >
              Account
            </p>
            <div
              className={`absolute inset-x-3.5 top-2.5 h-px bg-neutral-100 dark:bg-neutral-800 transition-opacity duration-300 ${
                isCollapsed ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>

          <div className="space-y-1">
            {accountItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={onClose}
                title={isCollapsed ? item.name : undefined}
                className={({ isActive }) => `
                  group relative flex items-center h-10 w-full rounded-xl select-none px-2.5 transition-all duration-150 font-body
                  ${isActive 
                    ? 'bg-neutral-900 dark:bg-neutral-800 text-white shadow-xs font-semibold' 
                    : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 hover:text-neutral-900 dark:hover:text-white'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <div className="w-9 h-9 flex items-center justify-center shrink-0">
                      <item.icon 
                        size={17} 
                        strokeWidth={isActive ? 2.2 : 1.9}
                        className={`shrink-0 transition-colors duration-150 ${
                          isActive ? 'text-gold' : 'text-neutral-400 group-hover:text-gold'
                        }`} 
                      />
                    </div>
                    <div
                      className={`ml-2.5 flex-1 min-w-0 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                        isCollapsed
                          ? 'opacity-0 max-w-0 -translate-x-3 pointer-events-none'
                          : 'opacity-100 max-w-[170px] translate-x-0'
                      }`}
                    >
                      <span className="text-[13px] font-medium tracking-tight truncate">{item.name}</span>
                      {isActive && (
                        <ChevronRight size={13} className="text-gold shrink-0 ml-1.5" />
                      )}
                    </div>
                  </>
                )}
              </NavLink>
            ))}

            <button
              type="button"
              onClick={handleLogout}
              title={isCollapsed ? 'Sign Out' : undefined}
              className="group relative flex items-center h-10 w-full rounded-xl select-none px-2.5 transition-all duration-150 font-body text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/30 cursor-pointer text-left"
            >
              <div className="w-9 h-9 flex items-center justify-center shrink-0">
                <LogOut size={17} className="text-red-400 group-hover:text-red-500 transition-colors" />
              </div>
              <div
                className={`ml-2.5 flex-1 min-w-0 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                  isCollapsed
                    ? 'opacity-0 max-w-0 -translate-x-3 pointer-events-none'
                    : 'opacity-100 max-w-[170px] translate-x-0'
                }`}
              >
                <span className="text-[13px] font-medium tracking-tight truncate">Sign Out</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Footer Mini Profile Summary */}
      <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 shrink-0">
        <Link 
          to="/dashboard/profile" 
          onClick={onClose}
          title={isCollapsed ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Client Account' : undefined}
          className={`flex items-center gap-2.5 hover:bg-white dark:hover:bg-neutral-800/60 p-1.5 rounded-xl transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 hover:shadow-xs group ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold/25 via-gold/15 to-neutral-900 flex items-center justify-center text-gold font-heading font-bold overflow-hidden border border-gold/30 shrink-0 shadow-3xs group-hover:scale-105 transition-transform">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs">{profile?.first_name?.charAt(0) || 'C'}</span>
            )}
          </div>
          <div
            className={`min-w-0 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
              isCollapsed
                ? 'opacity-0 max-w-0 -translate-x-3 pointer-events-none'
                : 'opacity-100 max-w-[150px] translate-x-0'
            }`}
          >
            <p className="text-xs font-bold text-primary dark:text-neutral-100 truncate leading-tight group-hover:text-gold transition-colors">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-[11px] text-neutral-400 font-body truncate">{profile?.email || 'Client Account'}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
  bookings: PropTypes.array,
  unreadCount: PropTypes.number,
  onRequestLogout: PropTypes.func,
  isCollapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func
};
