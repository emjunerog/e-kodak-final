import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getPhotographerProfileData, toggleGeneralAvailability } from '../../services/photographerService';
import PhotographerNotificationDropdown from './PhotographerNotificationDropdown';

const LABELS = {
  photographer: 'Dashboard',
  bookings:     'My Assigned Shoots',
  availability: 'Availability Schedule',
  uploads:      'Upload Photos',
  settings:     'Studio Settings',
};

function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs text-neutral-500 font-body">
      <Link to="/photographer" className="hover:text-primary transition-colors font-medium flex items-center gap-1.5">
        <i className="bi bi-camera text-gold"></i>
        <span>Studio Bay</span>
      </Link>
      {segments.slice(1).map((seg, i) => (
        <React.Fragment key={seg}>
          <i className="bi bi-chevron-right text-[10px] text-neutral-300"></i>
          <span className={i === segments.length - 2 ? 'text-primary font-bold' : 'text-neutral-500'}>
            {LABELS[seg] || seg}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}

export default function PhotographerHeader({ onMenuClick }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [isAvailable, setIsAvailable] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      getPhotographerProfileData(user.id).then(({ data }) => {
        if (data) {
          setIsAvailable(data.is_available ?? true);
        }
      });
    }
  }, [user?.id]);

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

  const handleToggle = async () => {
    if (!user?.id || updating) return;
    const nextVal = !isAvailable;
    setUpdating(true);
    const { error } = await toggleGeneralAvailability(user.id, nextVal);
    if (!error) {
      setIsAvailable(nextVal);
    }
    setUpdating(false);
  };

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
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 flex-shrink-0 font-body">
      
      {/* Left: Mobile menu button + Breadcrumb */}
      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-neutral-500 hover:text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="Open sidebar"
        >
          <i className="bi bi-list text-xl"></i>
        </motion.button>
        <Breadcrumb />
      </div>

      {/* Right: Availability Toggle + Notifications + User Menu */}
      <div className="flex items-center gap-2.5">
        
        {/* Availability Quick Toggle */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleToggle}
          disabled={updating}
          title="Click to toggle shoot availability"
          className={`h-9 flex items-center gap-2 px-3.5 rounded-full text-xs font-semibold transition-all border outline-none cursor-pointer shadow-xs ${
            isAvailable
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200'
          }`}
        >
          {updating ? (
            <i className="bi bi-arrow-repeat animate-spin text-neutral-500"></i>
          ) : (
            <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
          )}
          <span className="hidden sm:inline">
            {isAvailable ? 'Available for Shoots' : 'Off Duty / Busy'}
          </span>
          <span className="sm:hidden">
            {isAvailable ? 'Available' : 'Busy'}
          </span>
        </motion.button>

        {/* Live Notification Dropdown */}
        <PhotographerNotificationDropdown />

        {/* Interactive Photographer Profile Dropdown */}
        <div className="relative pl-1 border-l border-neutral-200" ref={profileMenuRef}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            aria-expanded={profileMenuOpen}
            aria-label="Open photographer menu"
            className="flex items-center gap-2 p-1 rounded-full hover:bg-neutral-100 transition-all outline-none cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gold/15 ring-1 ring-gold/30 flex items-center justify-center text-xs font-bold text-gold overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <span className="text-xs font-bold text-neutral-900 hidden sm:block max-w-[130px] truncate">
              {displayName}
            </span>
            <i
              className={`bi bi-chevron-down text-[11px] text-neutral-400 group-hover:text-primary transition-transform duration-200 hidden sm:block ${
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
                className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200/90 shadow-xl overflow-hidden z-50 p-1.5 font-body"
              >
                
                {/* User Identity Card */}
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 mb-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gold/15 ring-1 ring-gold/30 flex items-center justify-center text-gold font-heading font-bold overflow-hidden flex-shrink-0 shadow-xs">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs">{initial}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-neutral-900 truncate">
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
                    to="/photographer/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors text-left"
                  >
                    <i className="bi bi-person text-gold text-sm"></i>
                    <span>Profile &amp; Settings</span>
                  </Link>

                  <Link
                    to="/photographer/bookings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors text-left"
                  >
                    <i className="bi bi-calendar2-check text-neutral-400 text-sm"></i>
                    <span>My Assigned Shoots</span>
                  </Link>

                  <Link
                    to="/photographer/availability"
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors text-left"
                  >
                    <i className="bi bi-calendar-week text-neutral-400 text-sm"></i>
                    <span>Availability Schedule</span>
                  </Link>

                  <Link
                    to="/photographer/uploads"
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors text-left"
                  >
                    <i className="bi bi-cloud-arrow-up text-neutral-400 text-sm"></i>
                    <span>Upload Deliverables</span>
                  </Link>
                </div>

                {/* Sign Out */}
                <div className="border-t border-neutral-100 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
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
};
