import React from 'react';
import PropTypes from 'prop-types';
import { NavLink, Link } from 'react-router-dom';
import { 
  Camera, 
  LayoutDashboard, 
  CalendarPlus, 
  CalendarDays, 
  History,
  Image as ImageIcon, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  X,
  Layers,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ onClose, bookings = [], onRequestLogout }) {
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

  const navSections = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
      ]
    },
    {
      title: 'Sessions & Bookings',
      items: [
        { name: 'Book a Session', path: '/dashboard/book', icon: CalendarPlus },
        { 
          name: 'Booking Progress', 
          path: '/dashboard/progress', 
          icon: Layers,
          status: hasActiveBooking ? 'active' : (latestBooking?.status === 'COMPLETED' ? 'completed' : null),
          statusColor: hasActiveBooking ? 'emerald' : 'sky',
          tooltip: hasActiveBooking ? `Active session #${latestBooking.booking_number}` : (latestBooking?.status === 'COMPLETED' ? 'Session completed' : null),
        },
        { name: 'Booking Records', path: '/dashboard/bookings', icon: CalendarDays },
      ]
    },
    {
      title: 'Billing & Media',
      items: [
        { 
          name: 'Billing & Payments', 
          path: '/dashboard/payments', 
          icon: CreditCard,
          status: pendingDownpaymentBooking ? 'deposit_due' : (hasPendingPayment ? 'due' : null),
          statusColor: 'amber',
          tooltip: pendingDownpaymentBooking ? 'Reservation deposit due' : (hasPendingPayment ? 'Pending balance' : null),
        },
        { name: 'Photo Deliverables', path: '/dashboard/gallery', icon: ImageIcon },
      ]
    },
    {
      title: 'Activity & Updates',
      items: [
        { name: 'Activity Trail', path: '/dashboard/activity', icon: History },
        { name: 'Notifications', path: '/dashboard/notifications', icon: Bell },
      ]
    }
  ];

  const accountItems = [
    { name: 'Profile', path: '/dashboard/profile', icon: User },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">
      {/* Sidebar Header with subtle studio gradient branding */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-100 dark:border-neutral-800 bg-gradient-to-r from-white via-neutral-50/50 to-white dark:from-neutral-900 dark:via-neutral-800/40 dark:to-neutral-900 shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2.5 text-primary dark:text-neutral-100 hover:text-gold transition-colors group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neutral-900 to-primary flex items-center justify-center shadow-xs border border-neutral-800">
            <Camera size={16} className="text-gold group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <span className="font-heading text-lg font-bold tracking-wide block leading-none">E-KODAK</span>
            <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-body">Studio</span>
          </div>
        </Link>
        <button 
          onClick={onClose} 
          className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-primary dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Navigation with organized sections and dividers */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-3.5 scrollbar-thin">
        {navSections.map((section, idx) => (
          <div key={section.title} className={idx > 0 ? "pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80" : ""}>
            <p className="px-3 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5 font-body">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.exact}
                  onClick={onClose}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group/item
                    ${isActive 
                      ? 'bg-gradient-to-r from-neutral-900 to-primary text-white shadow-sm ring-1 ring-neutral-800 dark:ring-neutral-700' 
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 hover:text-primary dark:hover:text-white'}
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={16} className={`shrink-0 transition-colors ${isActive ? 'text-gold' : 'text-neutral-400 group-hover/item:text-primary dark:group-hover/item:text-white'}`} />
                      <span className="flex-1 truncate leading-tight">{item.name}</span>
                      {item.status && (
                        <div 
                          className="relative flex items-center justify-center shrink-0 ml-auto group/tip"
                          title={item.tooltip}
                        >
                          {item.statusColor === 'emerald' && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-xs" />
                            </span>
                          )}
                          {item.statusColor === 'amber' && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-xs" />
                            </span>
                          )}
                          {item.statusColor === 'sky' && (
                            <span className="inline-flex rounded-full h-2 w-2 bg-sky-500 shadow-xs" />
                          )}
                          {/* Hoverable tooltip */}
                          {item.tooltip && (
                            <span className="pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 hidden group-hover/tip:flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-900 text-neutral-100 border border-neutral-700/80 shadow-xl whitespace-nowrap z-50 animate-fade-in">
                              {item.tooltip}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* Account Section */}
        <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80">
          <p className="px-3 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5 font-body">Account</p>
          <div className="space-y-0.5">
            {accountItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all
                  ${isActive 
                    ? 'bg-gradient-to-r from-neutral-900 to-primary text-white shadow-sm ring-1 ring-neutral-800 dark:ring-neutral-700' 
                    : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 hover:text-primary dark:hover:text-white'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={16} className={`shrink-0 ${isActive ? 'text-gold' : 'text-neutral-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut size={16} className="text-red-400 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Footer Profile Summary */}
      <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 shrink-0">
        <Link to="/dashboard/profile" className="flex items-center gap-3 hover:bg-white dark:hover:bg-neutral-800/60 p-2 rounded-xl transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 hover:shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center text-gold font-heading font-bold overflow-hidden border border-gold/30 shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs">{profile?.first_name?.charAt(0) || 'U'}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary dark:text-neutral-100 truncate leading-tight">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-[10px] text-neutral-400 font-body truncate">Client Account</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
  bookings: PropTypes.array,
  onRequestLogout: PropTypes.func
};

