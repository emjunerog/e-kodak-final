import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PhotographerNotificationDropdown from './PhotographerNotificationDropdown';

const LABELS = {
  photographer: 'Dashboard',
  bookings:     'My Assigned Shoots',
  availability: 'Availability Schedule',
  uploads:      'Upload Photos',
  'activity-logs': 'Activity Logs',
  settings:     'Station Settings',
  profile:      'Photographer Profile',
};

function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs text-neutral-500 font-body">
      <Link to="/photographer" className="hover:text-primary dark:hover:text-gold transition-colors font-medium flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-md bg-neutral-950 flex items-center justify-center p-0.5 border border-neutral-800 shrink-0">
          <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain" />
        </div>
        <span>Studio Portal</span>
      </Link>
      {segments.slice(1).map((seg, i) => (
        <React.Fragment key={seg}>
          <i className="bi bi-chevron-right text-xs text-neutral-300"></i>
          <span className={i === segments.length - 2 ? 'text-primary font-bold' : 'text-neutral-500'}>
            {LABELS[seg] || seg}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}

export default function PhotographerHeader({ onMenuClick, isSidebarCollapsed, onToggleSidebar }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await signOut();
    navigate('/login');
  };

  const initial = (profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'P').toUpperCase();
  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'Studio Photographer';

  return (
    <header className="h-16 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 flex-shrink-0 font-body transition-colors">
      
      {/* Left: Mobile menu button + Breadcrumb */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Mobile menu drawer trigger */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-neutral-500 hover:text-primary dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Open sidebar"
        >
          <i className="bi bi-list text-xl"></i>
        </motion.button>

        <Link
          to="/photographer"
          className="flex sm:hidden items-center gap-2 text-primary dark:text-neutral-100 hover:text-gold transition-colors group shrink-0"
        >
          <div className="w-7 h-7 rounded-lg bg-neutral-950 flex items-center justify-center p-1 shadow-xs border border-neutral-800 shrink-0">
            <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain" />
          </div>
          <span className="font-heading text-sm font-bold tracking-wide">E-KODAK</span>
        </Link>

        <Breadcrumb />
      </div>

      {/* Right: Notifications + User Menu */}
      <div className="flex items-center gap-2.5">
        {/* Live Notification Dropdown */}
        <PhotographerNotificationDropdown />

        {/* Interactive Photographer Profile Dropdown */}
        <div className="relative pl-1 border-l border-neutral-200 dark:border-neutral-800" ref={profileMenuRef}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            aria-expanded={profileMenuOpen}
            aria-label="Open photographer menu"
            className="flex items-center gap-2 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all outline-none cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gold/15 ring-1 ring-gold/30 flex items-center justify-center text-xs font-bold text-gold overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 hidden sm:block max-w-[130px] truncate">
              {displayName}
            </span>
            <i
              className={`bi bi-chevron-down text-[11px] text-neutral-400 group-hover:text-primary dark:group-hover:text-white transition-transform duration-200 hidden sm:block ${
                profileMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </motion.button>

          {/* Clean Studio Dropdown Menu */}
          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2 w-64 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xl overflow-hidden z-50 p-1.5 font-body"
              >
                
                {/* User Identity Card */}
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/80 rounded-xl border border-neutral-100 dark:border-neutral-700/60 mb-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gold/15 ring-1 ring-gold/30 flex items-center justify-center text-gold font-heading font-bold overflow-hidden flex-shrink-0 shadow-xs">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs">{initial}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {user?.email || 'photographer@ekodak.studio'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="space-y-0.5">
                  <Link
                    to="/photographer/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-left"
                  >
                    <i className="bi bi-person text-gold text-sm"></i>
                    <span>Photographer Profile</span>
                  </Link>

                  <Link
                    to="/photographer/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-left"
                  >
                    <i className="bi bi-sliders text-neutral-400 text-sm"></i>
                    <span>Station Settings</span>
                  </Link>

                  <Link
                    to="/photographer/bookings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-left"
                  >
                    <i className="bi bi-calendar2-check text-neutral-400 text-sm"></i>
                    <span>My Assigned Shoots</span>
                  </Link>

                  <Link
                    to="/photographer/availability"
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-left"
                  >
                    <i className="bi bi-calendar-week text-neutral-400 text-sm"></i>
                    <span>Availability Schedule</span>
                  </Link>

                  <Link
                    to="/photographer/uploads"
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-left"
                  >
                    <i className="bi bi-cloud-arrow-up text-neutral-400 text-sm"></i>
                    <span>Upload Deliverables</span>
                  </Link>
                </div>

                {/* Sign Out */}
                <div className="border-t border-neutral-100 dark:border-neutral-800 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <i className="bi bi-box-arrow-right text-sm text-rose-500"></i>
                    <span>Sign Out</span>
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </header>
  );
}

PhotographerHeader.propTypes = {
  onMenuClick: PropTypes.func.isRequired,
  isSidebarCollapsed: PropTypes.bool,
  onToggleSidebar: PropTypes.func,
};
