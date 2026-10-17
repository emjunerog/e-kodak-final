import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu,
  Search,
  ChevronRight,
  User,
  Settings,
  UserCheck,
  ShieldCheck,
  LogOut,
  ChevronDown,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AdminNotificationDropdown from './AdminNotificationDropdown';
import StaffQRScannerModal from './StaffQRScannerModal';

// ── Breadcrumb label map ──────────────────────────────────────────────────────
const LABELS = {
  admin:         'Command Center',
  bookings:      'Bookings',
  customers:     'Customers',
  photographers: 'Photographers',
  payments:      'Payments & Ledger',
  photos:        'Photo Outputs',
  notifications: 'Notifications',
  sms:           'SMS Logs',
  services:      'Services Catalog',
  settings:      'Settings',
  'activity-logs': 'Activity Logs',
  security:      'Security & Access',
  cms:           'CMS & Content',
  staff:         'Worker Active Status',
  yearbook:      'Yearbook Studio',
};

function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-400 font-body">
      <Link to="/admin" className="hover:text-gold text-neutral-300 transition-colors font-medium">Admin</Link>
      {segments.slice(1).map((seg, i) => (
        <React.Fragment key={seg}>
          <ChevronRight size={13} className="text-neutral-600 flex-shrink-0" />
          <span className={i === segments.length - 2 ? 'text-white font-semibold' : 'text-neutral-400'}>
            {LABELS[seg] || seg}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
export default function AdminHeader({ onMenuClick, onOpenProfile }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile dropdown when clicking outside
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
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const initial = (profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'A').toUpperCase();
  const roleLabel = profile?.role === 'admin'
    ? 'Admin'
    : (profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Staff');

  return (
    <header className="relative h-16 bg-gradient-to-r from-[#14100c] via-[#21180f] via-[#16151a] to-[#0f1726] border-none px-4 sm:px-6 sticky top-0 z-30 flex-shrink-0 font-body before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-gold/50 before:to-transparent">
      {/* ── Photographic Studio Background Texture & Ambient Lights (Clipped within header bounds) ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-luminosity transition-opacity duration-500"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1600&q=80&auto=format&fit=crop')`,
          }}
        />

        {/* ── Rich Radiant Multi-Stop Gradient Overlays (Seamless continuation of Hero Banner) ── */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_100%_at_5%_100%,rgba(217,119,6,0.35),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_35%_100%,rgba(180,83,9,0.25),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_80%_at_95%_100%,rgba(30,58,138,0.25),transparent_60%)]" />

        {/* ── Ambient Gold Orbs ── */}
        <div className="absolute -top-12 -left-10 w-60 h-60 bg-gradient-to-br from-amber-500/25 via-gold/15 to-transparent rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -right-10 w-60 h-60 bg-gradient-to-tl from-sky-600/15 via-amber-600/10 to-transparent rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 w-full h-full flex items-center justify-between">

      {/* Left: Mobile menu + logo + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-neutral-300 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors flex-shrink-0"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </motion.button>

        <Link
          to="/admin"
          className="flex lg:hidden items-center gap-2 text-white hover:text-gold transition-colors group shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-neutral-950 flex items-center justify-center p-1 shadow-xs border border-neutral-800 shrink-0">
            <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain" />
          </div>
          <span className="font-heading text-sm font-bold tracking-wide">E-KODAK</span>
        </Link>

        <Breadcrumb />
      </div>

      {/* Right: Search, Notifications & Interactive User Profile */}
      <div className="flex items-center gap-2.5">

        {/* Global Search Input */}
        <div className="hidden sm:flex items-center relative">
          <Search size={14} className="absolute left-3 text-neutral-400 pointer-events-none" />
          <input
            type="search"
            name="admin_record_search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            placeholder="Search records..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                navigate(`/admin/bookings?search=${encodeURIComponent(e.target.value.trim())}`);
              }
            }}
            className="pl-8 pr-3 h-9 bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] rounded-full text-xs font-body text-white placeholder:text-neutral-400 focus:bg-white/[0.1] focus:border-gold/50 focus:ring-2 focus:ring-gold/15 transition-all outline-none w-44 md:w-52"
          />
        </div>

        {/* Quick Staff / Admin QR Scanner Pass Verification */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setQrScannerOpen(true)}
          className="h-9 flex items-center gap-1.5 px-3 bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.08] rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          title="Scan or Verify Customer QR Pass"
        >
          <QrCode size={13} className="text-gold" />
          <span className="hidden sm:inline">Scan QR</span>
        </motion.button>

        {/* Interactive Notification Modal Dropdown */}
        <AdminNotificationDropdown />

        {/* Interactive User Avatar & Profile Dropdown */}
        <div className="relative pl-1 border-l border-white/[0.1]" ref={profileMenuRef}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            aria-expanded={profileMenuOpen}
            aria-label="Open admin profile menu"
            className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-gold/30 transition-all outline-none cursor-pointer group"
          >
            <div 
              className="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center text-gold font-heading font-bold overflow-hidden ring-2 ring-gold/30 flex-shrink-0 group-hover:scale-105 transition-transform"
              title={`${profile?.first_name || 'User'} (${roleLabel})`}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs">{initial}</span>
              )}
            </div>
            <ChevronDown 
              size={12} 
              className={`text-neutral-400 group-hover:text-white transition-transform duration-200 hidden sm:block ${
                profileMenuOpen ? 'rotate-180' : ''
              }`} 
            />
          </motion.button>

          {/* Luxury Dropdown Menu with Motion */}
          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2.5 w-72 bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200/90 shadow-2xl shadow-neutral-900/15 overflow-hidden z-50 font-body p-2"
              >
                
                {/* Profile Card Header */}
                <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-100 mb-1.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold font-heading font-bold overflow-hidden flex-shrink-0 ring-2 ring-gold/20 shadow-xs">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm">{initial}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {profile?.first_name} {profile?.last_name || ''}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {user?.email || 'studio@ekodak.com'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gold/15 text-gold-dark border border-gold/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu Actions */}
                <div className="space-y-0.5">
                  <button
                    id="admin-header-profile-btn"
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onOpenProfile?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100/80 rounded-xl transition-colors text-left cursor-pointer group"
                  >
                    <User size={14} className="text-gold group-hover:scale-110 transition-transform" />
                    <span>Profile &amp; Photo</span>
                  </button>

                  {profile?.role === 'admin' && (
                    <>
                      <Link
                        to="/admin/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100/80 rounded-xl transition-colors text-left"
                      >
                        <Settings size={14} className="text-neutral-400" />
                        <span>Settings</span>
                      </Link>

                      <Link
                        to="/admin/staff"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100/80 rounded-xl transition-colors text-left"
                      >
                        <UserCheck size={14} className="text-neutral-400" />
                        <span>Staff &amp; Personnel</span>
                      </Link>

                      <Link
                        to="/admin/security"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100/80 rounded-xl transition-colors text-left"
                      >
                        <ShieldCheck size={14} className="text-neutral-400" />
                        <span>Security &amp; Logs</span>
                      </Link>
                    </>
                  )}
                </div>

                {/* Divider & Sign Out */}
                <div className="border-t border-neutral-100 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
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

      {/* Staff Desk QR Scanner Modal */}
      <StaffQRScannerModal
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
      />
    </header>
  );
}

AdminHeader.propTypes = {
  onMenuClick: PropTypes.func.isRequired,
  onOpenProfile: PropTypes.func,
};
