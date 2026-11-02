import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, Search, Camera, User, Settings, 
  LogOut, ChevronDown, ChevronRight, CalendarDays,
  LayoutDashboard, Layers, CreditCard, Sparkles, History,
  Sun, Moon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import CustomerNotificationDropdown from './CustomerNotificationDropdown';

// ── Customer Breadcrumb label map ─────────────────────────────────────────────
const LABELS = {
  dashboard:     'Client Portal',
  book:          'Book a Session',
  bookings:      'Booking Records',
  progress:      'Production Progress',
  payments:      'Billing & Payments',
  'soft-copies': 'Soft-copies',
  gallery:       'Soft-copies',
  activity:      'Activity Logs',
  profile:       'My Profile & Badges',
  settings:      'Settings & Transparency',
  notifications: 'Notifications',
};

function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-400 font-body font-light select-none">
      <Link to="/dashboard" className="hover:text-gold text-neutral-300 transition-colors font-light">
        Client Portal
      </Link>
      {segments.length === 1 && segments[0] === 'dashboard' ? (
        <>
          <ChevronRight size={13} className="text-neutral-600 flex-shrink-0" />
          <span className="text-white font-light">Dashboard</span>
        </>
      ) : (
        segments.slice(1).map((seg, i) => (
          <React.Fragment key={seg}>
            <ChevronRight size={13} className="text-neutral-600 flex-shrink-0" />
            <span className={i === segments.length - 2 ? 'text-white font-light' : 'text-neutral-400 font-light'}>
              {LABELS[seg] || seg}
            </span>
          </React.Fragment>
        ))
      )}
    </nav>
  );
}

// ── Clinging Studio Header ───────────────────────────────────────────────────
export default function Header({ 
  onMenuClick, 
  unreadCount = 0, 
  onRequestLogout,
  onToggleSchedule,
  hasActiveBooking = false
}) {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isBookingPage = location.pathname === '/dashboard/book' || location.pathname.startsWith('/dashboard/book/');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // General Dark/Light Theme state synchronized with documentElement and localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('ekodak_darkMode');
      if (saved !== null) return JSON.parse(saved);
      return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handleThemeUpdate = (e) => {
      if (typeof e.detail?.darkMode === 'boolean') {
        setIsDarkMode(e.detail.darkMode);
      }
    };
    window.addEventListener('ekodak-theme-update', handleThemeUpdate);
    return () => window.removeEventListener('ekodak-theme-update', handleThemeUpdate);
  }, []);

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('ekodak_darkMode', JSON.stringify(nextMode));
      window.dispatchEvent(new CustomEvent('ekodak-theme-update', { detail: { darkMode: nextMode } }));
    } catch {}
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Close profile dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && profileDropdownOpen) {
        setProfileDropdownOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profileDropdownOpen]);

  const handleSignOut = () => {
    setProfileDropdownOpen(false);
    if (onRequestLogout) {
      onRequestLogout();
    } else {
      window.dispatchEvent(new CustomEvent('open-logout-confirm'));
    }
  };

  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Valued Client';
  const initial = (profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'C').toUpperCase();
  const initials = `${profile?.first_name?.charAt(0) || ''}${profile?.last_name?.charAt(0) || ''}`.toUpperCase() || 'EK';

  return (
    <header className="relative h-16 bg-gradient-to-r from-[#14100c] via-[#21180f] via-[#16151a] to-[#0f1726] border-none px-4 sm:px-6 lg:px-8 sticky top-0 z-30 flex-shrink-0 font-body before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-gold/50 before:to-transparent">
      {/* ── Photographic Studio Background Texture & Ambient Lights (Clipped within header bounds) ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-luminosity transition-opacity duration-500"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1600&q=80&auto=format&fit=crop')`,
          }}
        />

        {/* ── Rich Radiant Multi-Stop Gradient Overlays ── */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_100%_at_5%_100%,rgba(217,119,6,0.35),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_35%_100%,rgba(180,83,9,0.25),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_80%_at_95%_100%,rgba(30,58,138,0.25),transparent_60%)]" />

        {/* ── Ambient Gold Orbs ── */}
        <div className="absolute -top-12 -left-10 w-60 h-60 bg-gradient-to-br from-amber-500/25 via-gold/15 to-transparent rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -right-10 w-60 h-60 bg-gradient-to-tl from-sky-600/15 via-amber-600/10 to-transparent rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 w-full h-full flex items-center justify-between">
        {/* Left: Mobile/Tablet Hamburger + Mobile Logo + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onMenuClick}
            className={`${isBookingPage ? 'flex' : 'lg:hidden flex'} p-2 -ml-2 text-neutral-300 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors flex-shrink-0 cursor-pointer`}
            aria-label={isBookingPage ? "Reveal dashboard navigation" : "Open navigation menu"}
            title={isBookingPage ? "Reveal dashboard navigation" : "Open navigation menu"}
          >
            {isBookingPage ? <LayoutDashboard size={20} className="text-gold" /> : <Menu size={20} />}
          </motion.button>

          {/* Compact Logo for Tablet and Mobile (when sidebar is hidden) */}
          {!isBookingPage && (
            <Link 
              to="/dashboard" 
              className="flex lg:hidden items-center gap-2 text-white hover:text-gold transition-colors group shrink-0"
            >
              <div className="w-8 h-8 rounded-xl bg-neutral-950 flex items-center justify-center p-1 shadow-xs border border-neutral-800 shrink-0">
                <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
              </div>
              <span className="font-heading text-sm font-light tracking-wide">E-KODAK</span>
            </Link>
          )}

          {/* Customer Breadcrumbs Navigation */}
          <Breadcrumb />
        </div>

        {/* Right Controls: Search, Quick Book, Schedule Drawer, Notifications & User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick Search Input */}
          <div className="hidden sm:flex items-center relative">
            <Search size={14} className="absolute left-3 text-neutral-400 pointer-events-none" />
            <input
              type="search"
              name="customer_record_search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              placeholder="Search bookings, receipts..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  navigate(`/dashboard/bookings?search=${encodeURIComponent(e.target.value.trim())}`);
                }
              }}
              className="pl-8 pr-3 h-9 bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] rounded-full text-xs font-body text-white placeholder:text-neutral-400 focus:bg-white/[0.1] focus:border-gold/50 focus:ring-2 focus:ring-gold/15 transition-all outline-none w-36 md:w-52"
            />
          </div>

          {/* Studio Notifications Dropdown */}
          <CustomerNotificationDropdown unreadCount={unreadCount} />

          {/* General Dark/Light Mode Toggle Icon beside profile */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-gold/40 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer shrink-0"
            title={isDarkMode ? "Switch to Light theme" : "Switch to Dark theme"}
            aria-label={isDarkMode ? "Switch to Light theme" : "Switch to Dark theme"}
          >
            {isDarkMode ? (
              <Sun size={15} className="text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon size={15} className="text-amber-300 hover:-rotate-12 transition-transform" />
            )}
          </motion.button>

          {/* User Profile Avatar & Dropdown Menu */}
          <div className="relative pl-1 border-l border-white/[0.1]" ref={dropdownRef}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setProfileDropdownOpen(prev => !prev)}
              aria-haspopup="true"
              aria-expanded={profileDropdownOpen}
              className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-gold/30 transition-all outline-none cursor-pointer group"
              title="Client Account Menu"
            >
              <div 
                className="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center text-gold font-heading font-bold overflow-hidden ring-2 ring-gold/30 flex-shrink-0 group-hover:scale-105 transition-transform"
                title={`${fullName} (#EK-${user?.id?.slice(0, 6)?.toUpperCase() || '2026'})`}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs">{initials || initial}</span>
                )}
              </div>
              <ChevronDown
                size={12}
                className={`text-neutral-400 group-hover:text-white transition-transform duration-200 hidden sm:block ${
                  profileDropdownOpen ? 'rotate-180 text-gold' : ''
                }`}
              />
            </motion.button>

            {/* Luxury Profile Dropdown Popover */}
            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2.5 w-72 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl border border-neutral-200/90 dark:border-neutral-700/80 shadow-2xl shadow-neutral-900/15 dark:shadow-black/60 overflow-hidden z-50 font-body p-2"
                >
                  {/* Account Card Header */}
                  <div className="p-3 bg-neutral-50/80 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-800 mb-1.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center text-gold font-heading font-bold overflow-hidden flex-shrink-0 ring-2 ring-gold/30 shadow-xs">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm">{initials || initial}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                          {fullName}
                        </h4>
                        <p className="text-[11px] text-neutral-400 font-body truncate">
                          {user?.email || 'Authenticated Client'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold/15 text-gold-dark dark:text-gold border border-gold/30">
                            #EK-{user?.id?.slice(0, 6)?.toUpperCase() || '2026'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Client
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Actions */}
                  <div className="space-y-0.5">
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 rounded-xl transition-colors text-left group"
                    >
                      <User size={14} className="text-gold group-hover:scale-110 transition-transform" />
                      <span>My Profile &amp; Badges</span>
                    </Link>

                    <Link
                      to="/dashboard/book"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 rounded-xl transition-colors text-left group"
                    >
                      <Camera size={14} className="text-gold group-hover:scale-110 transition-transform" />
                      <span>Book Studio Session</span>
                    </Link>

                    <Link
                      to="/dashboard/progress"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 rounded-xl transition-colors text-left group"
                    >
                      <Layers size={14} className="text-gold group-hover:scale-110 transition-transform" />
                      <span>Production Progress</span>
                    </Link>

                    <Link
                      to="/dashboard/payments"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 rounded-xl transition-colors text-left group"
                    >
                      <CreditCard size={14} className="text-gold group-hover:scale-110 transition-transform" />
                      <span>Billing &amp; Payments</span>
                    </Link>

                    <Link
                      to="/dashboard/activity"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 rounded-xl transition-colors text-left group"
                    >
                      <History size={14} className="text-gold group-hover:scale-110 transition-transform" />
                      <span>Activity Audit</span>
                    </Link>

                    <Link
                      to="/dashboard/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 rounded-xl transition-colors text-left group"
                    >
                      <Settings size={14} className="text-gold group-hover:scale-110 transition-transform" />
                      <span>Settings &amp; Transparency</span>
                    </Link>
                  </div>

                  {/* Divider & Sign Out */}
                  <div className="border-t border-neutral-100 dark:border-neutral-800 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <LogOut size={14} className="text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

Header.propTypes = {
  onMenuClick: PropTypes.func,
  unreadCount: PropTypes.number,
  onRequestLogout: PropTypes.func,
  onToggleSchedule: PropTypes.func,
  hasActiveBooking: PropTypes.bool
};
