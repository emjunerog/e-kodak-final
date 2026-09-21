import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, Bell, Search, Camera, Sparkles, User, Settings, 
  LogOut, ChevronDown, Award, ShieldCheck, HelpCircle,
  CalendarDays
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import LiveClock from './LiveClock';

export default function Header({ 
  onMenuClick, 
  unreadCount = 1, 
  onRequestLogout,
  onToggleSchedule,
  hasActiveBooking = false
}) {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    <header className="h-16 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-xs transition-colors">

      {/* Left: Mobile menu + greeting */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-neutral-600 dark:text-neutral-300 hover:text-primary dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-primary dark:text-neutral-100 flex items-center gap-1.5">
            <span>{getGreeting()},</span>
            <span className="text-gold font-heading">{profile?.first_name || 'there'}</span>
          </p>
          <p className="text-[11px] text-neutral-400 font-body flex items-center gap-1">
            <Sparkles size={10} className="text-gold" />
            <span>E-Kodak Studio Client Portal</span>
          </p>
        </div>
      </div>

      {/* Center: Live Time & Date Indicator */}
      <div className="hidden md:flex items-center">
        <LiveClock variant="compact" />
      </div>

      {/* Right: Quick Book + Bell + Profile Menu Dropdown */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Book Button */}
        <Link
          to="/dashboard/book"
          className="btn-primary py-1.5 px-3 text-xs hidden lg:inline-flex items-center gap-1.5 shadow-xs"
        >
          <Camera size={14} /> Book Session
        </Link>

        {/* Schedule & Progress Drawer Trigger */}
        <button
          type="button"
          onClick={onToggleSchedule}
          className="relative p-2 text-neutral-600 dark:text-neutral-300 hover:text-primary dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
          aria-label="Studio Schedule & Progress"
          title="Schedule & Active Session Progress"
        >
          <CalendarDays size={18} />
          {hasActiveBooking && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-neutral-900 animate-pulse" />
          )}
        </button>

        {/* Notification bell */}
        <Link
          to="/dashboard/notifications"
          className="relative p-2 text-neutral-600 dark:text-neutral-300 hover:text-primary dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
          aria-label="Notifications"
          title={unreadCount > 0 ? `${unreadCount} unread notices` : 'Studio Notifications'}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-bold font-body px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-xs animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* ── Luxury User Profile Dropdown Menu ────────────────────────────── */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(prev => !prev)}
            aria-haspopup="true"
            aria-expanded={profileDropdownOpen}
            className={`flex items-center gap-1.5 p-1 rounded-xl transition-all border outline-none ${
              profileDropdownOpen
                ? 'bg-neutral-100 dark:bg-neutral-800 border-gold shadow-xs ring-2 ring-gold/20'
                : 'border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
            }`}
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
                      <span className="text-[10px] font-body font-bold text-gold bg-gold/15 px-2 py-0.5 rounded-full border border-gold/30">
                        #EK-{user?.id?.slice(0, 6)?.toUpperCase() || '2026'}
                      </span>
                      <span className="text-[10px] font-body text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
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
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 hover:text-primary dark:hover:text-white transition-all font-medium"
                >
                  <User size={16} className="text-gold" />
                  <span>My Profile & Badges</span>
                </Link>

                <Link
                  to="/dashboard/book"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 hover:text-primary dark:hover:text-white transition-all font-medium"
                >
                  <Camera size={16} className="text-gold" />
                  <span>Book Studio Session</span>
                </Link>

                <Link
                  to="/dashboard/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 hover:text-primary dark:hover:text-white transition-all font-medium"
                >
                  <Settings size={16} className="text-gold" />
                  <span>Settings & Transparency</span>
                </Link>

                <Link
                  to="/dashboard/notifications"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 hover:text-primary dark:hover:text-white transition-all font-medium"
                >
                  <div className="flex items-center gap-3">
                    <Bell size={16} className="text-gold" />
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
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
