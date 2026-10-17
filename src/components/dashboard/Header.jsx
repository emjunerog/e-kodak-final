import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Menu, Bell, Camera, Sparkles, User, Settings, 
  LogOut, ChevronDown, CalendarDays, LayoutDashboard,
  Moon, Sun, Minimize2, Maximize2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import LiveClock from './LiveClock';
import CustomerNotificationDropdown from './CustomerNotificationDropdown';

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

  // ── Dark Mode & Compact Density Reactive State ─────────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('ekodak_darkMode');
      return saved !== null ? JSON.parse(saved) : document.documentElement.classList.contains('dark');
    } catch {
      return document.documentElement.classList.contains('dark');
    }
  });

  const [isCompactView, setIsCompactView] = useState(() => {
    try {
      const saved = localStorage.getItem('ekodak_compactView');
      return saved !== null ? JSON.parse(saved) : document.documentElement.classList.contains('compact-layout');
    } catch {
      return document.documentElement.classList.contains('compact-layout');
    }
  });

  useEffect(() => {
    const handleThemeUpdate = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    const handleCompactUpdate = () => {
      setIsCompactView(document.documentElement.classList.contains('compact-layout'));
    };
    window.addEventListener('ekodak_theme_changed', handleThemeUpdate);
    window.addEventListener('ekodak_compact_changed', handleCompactUpdate);
    return () => {
      window.removeEventListener('ekodak_theme_changed', handleThemeUpdate);
      window.removeEventListener('ekodak_compact_changed', handleCompactUpdate);
    };
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ekodak_darkMode', JSON.stringify(nextDark));
    window.dispatchEvent(new CustomEvent('ekodak_theme_changed', { detail: { darkMode: nextDark } }));
  };

  const toggleCompactView = () => {
    const nextCompact = !isCompactView;
    setIsCompactView(nextCompact);
    if (nextCompact) {
      document.documentElement.classList.add('compact-layout');
    } else {
      document.documentElement.classList.remove('compact-layout');
    }
    localStorage.setItem('ekodak_compactView', JSON.stringify(nextCompact));
    window.dispatchEvent(new CustomEvent('ekodak_compact_changed', { detail: { compactView: nextCompact } }));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Click outside to close profile dropdown
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
  const initials = `${profile?.first_name?.charAt(0) || ''}${profile?.last_name?.charAt(0) || ''}`.toUpperCase() || 'EK';

  return (
    <header className="h-16 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shadow-xs transition-colors">
      {/* Left: Mobile/Tablet Hamburger + Logo OR Desktop Greeting */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        {/* Menu button: shown on mobile & tablet (<lg), or on booking page */}
        <button
          type="button"
          onClick={onMenuClick}
          className={`${isBookingPage ? 'flex' : 'lg:hidden flex'} items-center justify-center p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-primary dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/30 shrink-0`}
          aria-label={isBookingPage ? "Reveal dashboard navigation" : "Open navigation menu"}
          title={isBookingPage ? "Reveal dashboard navigation" : "Open navigation menu"}
        >
          {isBookingPage ? <LayoutDashboard size={20} className="text-gold" /> : <Menu size={20} />}
        </button>

        {/* Compact Logo for Tablet and Mobile (when sidebar is hidden) */}
        {!isBookingPage && (
          <Link 
            to="/dashboard" 
            className="flex lg:hidden items-center gap-2 text-primary dark:text-neutral-100 hover:text-gold transition-colors group shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-neutral-950 flex items-center justify-center p-1 shadow-xs border border-neutral-800 shrink-0">
              <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-sm font-bold tracking-wide leading-none">E-KODAK</span>
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-body">Studio</span>
            </div>
          </Link>
        )}

        {/* Desktop Greeting (lg and above, where sidebar is always visible) */}
        <div className="hidden lg:block truncate">
          <p className="text-sm font-semibold text-primary dark:text-neutral-100 flex items-center gap-1.5 truncate">
            <span>{getGreeting()},</span>
            <span className="text-gold font-heading">{profile?.first_name || 'there'}</span>
          </p>
          <p className="text-[11px] text-neutral-400 font-body flex items-center gap-1">
            <Sparkles size={10} className="text-gold" />
            <span>E-Kodak Studio Client Portal</span>
          </p>
        </div>
      </div>

      {/* Center: Live Time & Date Indicator on Desktop */}
      <div className="hidden md:flex items-center">
        <LiveClock variant="compact" />
      </div>

      {/* Right Controls: Quick Book + Schedule Drawer + Notifications + Profile Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Quick Book Button (Desktop shortcut) */}
        {!isBookingPage && (
          <Link
            to="/dashboard/book"
            className="btn-primary py-1.5 px-3 text-xs hidden lg:inline-flex items-center gap-1.5 shadow-xs"
          >
            <Camera size={14} /> Book Session
          </Link>
        )}

        {/* Schedule & Progress Drawer Trigger */}
        <button
          type="button"
          onClick={onToggleSchedule}
          className="relative p-2 text-neutral-600 dark:text-neutral-300 hover:text-primary dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 cursor-pointer"
          aria-label="Studio Schedule & Progress"
          title="Schedule & Active Session Progress"
        >
          <CalendarDays size={18} />
          {hasActiveBooking && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-neutral-900 animate-pulse" />
          )}
        </button>

        {/* Compact Density Mode Toggle */}
        <button
          type="button"
          onClick={toggleCompactView}
          className={`p-2 rounded-xl transition-all border cursor-pointer ${
            isCompactView
              ? 'bg-gold/15 text-gold border-gold/40 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-primary dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700'
          }`}
          aria-label={isCompactView ? "Switch to Standard Density" : "Switch to Compact Density"}
          title={isCompactView ? "Compact View: ON (Click to expand)" : "Compact View: OFF (Click to compress layout)"}
        >
          {isCompactView ? <Minimize2 size={18} className="text-gold" /> : <Maximize2 size={18} />}
        </button>

        {/* Theme Dark/Light Mode Toggle */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-primary dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 cursor-pointer"
          aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          title={isDarkMode ? "Active Theme: Dark Mode (Click for Light Mode)" : "Active Theme: Light Mode (Click for Dark Mode)"}
        >
          {isDarkMode ? (
            <Sun size={18} className="text-amber-400 hover:rotate-45 transition-transform" />
          ) : (
            <Moon size={18} className="text-neutral-600 hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* Studio Notifications Modal Panel */}
        <CustomerNotificationDropdown unreadCount={unreadCount} />

        {/* User Profile Avatar Dropdown Menu */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(prev => !prev)}
            aria-haspopup="true"
            aria-expanded={profileDropdownOpen}
            className={`flex items-center gap-1.5 p-1 rounded-xl transition-all border outline-none cursor-pointer ${
              profileDropdownOpen
                ? 'bg-neutral-100 dark:bg-neutral-800 border-gold shadow-xs ring-2 ring-gold/20'
                : 'border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
            }`}
            title="Account Menu"
          >
            <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center text-gold font-heading font-bold overflow-hidden border border-gold/30">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs">{initials}</span>
              )}
            </div>
            <ChevronDown
              size={13}
              className={`text-neutral-400 transition-transform duration-200 hidden sm:block ${
                profileDropdownOpen ? 'rotate-180 text-gold' : ''
              }`}
            />
          </button>

          {/* Profile Dropdown Popover */}
          {profileDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 backdrop-blur-md bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-700/80 ring-1 ring-black/5 dark:ring-white/10 rounded-2xl shadow-2xl shadow-neutral-900/15 dark:shadow-black/60 overflow-hidden z-50 animate-fade-in divide-y divide-neutral-100 dark:divide-neutral-800">
              {/* Account Header */}
              <div className="p-4 bg-neutral-50/70 dark:bg-neutral-900/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/30 to-gold/10 p-0.5 shadow-xs shrink-0">
                    <div className="w-full h-full rounded-[10px] bg-neutral-900 flex items-center justify-center text-gold font-heading font-bold text-sm overflow-hidden border border-gold/30">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-primary dark:text-neutral-100 truncate font-heading">
                      {fullName}
                    </h4>
                    <p className="text-xs text-neutral-400 font-body truncate">
                      {user?.email || 'Authenticated Client'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-xs font-body font-bold text-gold bg-gold/15 px-2 py-0.5 rounded-full border border-gold/30">
                        #EK-{user?.id?.slice(0, 6)?.toUpperCase() || '2026'}
                      </span>
                      <span className="text-xs font-body text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="p-2 space-y-0.5 text-sm font-body">
                <Link
                  to="/dashboard/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 hover:text-primary dark:hover:text-white transition-all font-medium text-xs"
                >
                  <User size={15} className="text-gold" />
                  <span>My Profile & Badges</span>
                </Link>

                <Link
                  to="/dashboard/book"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 hover:text-primary dark:hover:text-white transition-all font-medium text-xs"
                >
                  <Camera size={15} className="text-gold" />
                  <span>Book Studio Session</span>
                </Link>

                <Link
                  to="/dashboard/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 hover:text-primary dark:hover:text-white transition-all font-medium text-xs"
                >
                  <Settings size={15} className="text-gold" />
                  <span>Settings & Transparency</span>
                </Link>

                <Link
                  to="/dashboard/notifications"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 hover:text-primary dark:hover:text-white transition-all font-medium text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Bell size={15} className="text-gold" />
                    <span>Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="text-xs font-body font-bold text-red-500 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </div>

              {/* Sign out */}
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left cursor-pointer"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
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
