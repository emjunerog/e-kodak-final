import React from 'react';
import PropTypes from 'prop-types';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarClock,
  FolderUp,
  History,
  SlidersHorizontal,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/photographer', icon: LayoutDashboard, exact: true },
  { name: 'My Bookings', path: '/photographer/bookings', icon: CalendarCheck },
  { name: 'Availability', path: '/photographer/availability', icon: CalendarClock },
  { name: 'Upload Photos', path: '/photographer/uploads', icon: FolderUp },
  { name: 'Activity Logs', path: '/photographer/activity-logs', icon: History },
  { name: 'Settings', path: '/photographer/settings', icon: SlidersHorizontal },
];

function SidebarLink({ item, onClose, isCollapsed }) {
  const Icon = item.icon;

  return (
    <motion.div
      layout
      whileHover={{ scale: isCollapsed ? 1.06 : 1, x: isCollapsed ? 0 : 2 }}
      whileTap={{ scale: 0.92 }}
      transition={{
        layout: { type: 'spring', stiffness: 400, damping: 28 },
        scale: { type: 'spring', stiffness: 400, damping: 20 },
      }}
    >
      <NavLink
        to={item.path}
        end={item.exact}
        onClick={onClose}
        title={isCollapsed ? item.name : undefined}
        className={({ isActive }) =>
          `group relative flex items-center transition-all duration-300 ease-in-out font-body select-none ${
            isCollapsed
              ? `justify-center w-11 h-11 mx-auto my-1 rounded-2xl ${
                  isActive
                    ? 'bg-neutral-900 dark:bg-gold text-gold dark:text-neutral-950 ring-2 ring-gold/40 shadow-sm'
                    : 'bg-neutral-100/90 dark:bg-neutral-800/80 hover:bg-neutral-200/90 dark:hover:bg-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white border border-neutral-200/80 dark:border-neutral-700/70 shadow-2xs'
                }`
              : `gap-3 px-3 py-2 my-0.5 rounded-xl text-[13px] font-medium ${
                  isActive
                    ? 'bg-neutral-900 dark:bg-gold dark:text-neutral-950 text-white font-semibold shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                }`
          }`
        }
      >
        {({ isActive }) => (
          <>
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              animate={{ scale: isActive ? 1.05 : 1 }}
              className="shrink-0 flex items-center justify-center w-5 h-5"
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.9}
                className={`shrink-0 transition-colors ${
                  isActive
                    ? 'text-gold dark:text-neutral-950'
                    : 'group-hover:text-amber-600 dark:group-hover:text-gold'
                }`}
              />
            </motion.div>

            {/* Smooth Sliding Label (prevents text wrapping/jumping during opening) */}
            <div
              className={`min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out flex items-center justify-between flex-1 ${
                isCollapsed
                  ? 'max-w-0 opacity-0 -translate-x-2'
                  : 'max-w-[160px] opacity-100 translate-x-0 delay-75'
              }`}
            >
              <span className="truncate">{item.name}</span>
              {isActive && (
                <i className="bi bi-chevron-right text-[11px] text-gold/80 dark:text-neutral-950/80 shrink-0 ml-1"></i>
              )}
            </div>
          </>
        )}
      </NavLink>
    </motion.div>
  );
}

SidebarLink.propTypes = {
  item: PropTypes.shape({
    name: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    exact: PropTypes.bool,
  }).isRequired,
  onClose: PropTypes.func,
  isCollapsed: PropTypes.bool,
};

export default function PhotographerSidebar({ onClose, isCollapsed = false, onToggleCollapse }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const initial = (profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'P').toUpperCase();
  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'Studio Photographer';

  const location = useLocation();
  const isProfileActive = location.pathname === '/photographer/profile';

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 select-none font-body transition-colors overflow-hidden">
      
      {/* Brand Header */}
      <div className={`h-16 flex items-center border-b border-neutral-200/80 dark:border-neutral-800 shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
        isCollapsed ? 'px-2 justify-center' : 'px-4 sm:px-5 justify-between'
      }`}>
        {/* Brand Logo & Name (Smoothly slides in/out without unmounting) */}
        <div
          className={`min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out flex items-center ${
            isCollapsed
              ? 'max-w-0 opacity-0 -translate-x-4 pointer-events-none'
              : 'max-w-[180px] opacity-100 translate-x-0'
          }`}
        >
          <Link to="/photographer" className="flex items-center gap-2.5 group min-w-0">
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center p-1 shadow-xs border border-neutral-800 shrink-0 group-hover:border-gold/40 transition-colors"
            >
              <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
            </motion.div>
            <div className="min-w-0 overflow-hidden whitespace-nowrap">
              <span className="font-heading text-base tracking-wider text-primary dark:text-white font-bold block leading-tight truncate">
                E-KODAK
              </span>
              <span className="text-xs font-body font-semibold text-gold tracking-widest uppercase block truncate">
                Studio Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden text-neutral-400 hover:text-primary dark:hover:text-white p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
          aria-label="Close sidebar"
        >
          <i className="bi bi-x-lg text-sm"></i>
        </button>

        {/* Desktop Toggle Button: Persistent, layout-animated with fluid spring rotation on open/collapse */}
        {onToggleCollapse && (
          <motion.button
            layout
            type="button"
            whileHover={{ scale: 1.1, ringWidth: isCollapsed ? '3px' : '0px' }}
            whileTap={{ scale: 0.88, rotate: isCollapsed ? 18 : -18 }}
            transition={{
              layout: { type: 'spring', stiffness: 400, damping: 28 },
              scale: { type: 'spring', stiffness: 450, damping: 20 },
            }}
            onClick={onToggleCollapse}
            className={`hidden lg:flex items-center justify-center cursor-pointer select-none transition-colors duration-300 shrink-0 ${
              isCollapsed
                ? 'w-11 h-11 rounded-2xl bg-neutral-900 dark:bg-gold text-gold dark:text-neutral-950 shadow-md ring-2 ring-gold/40'
                : 'p-2 rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-gold hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title={isCollapsed ? 'Click to expand sidebar' : 'Collapse sidebar (icons only)'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isCollapsed ? 'icon-collapsed-open' : 'icon-expanded-close'}
                initial={{ rotate: isCollapsed ? -110 : 110, scale: 0.5, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: isCollapsed ? 110 : -110, scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                className="flex items-center justify-center shrink-0"
              >
                {isCollapsed ? (
                  <PanelLeftOpen size={20} strokeWidth={2.2} />
                ) : (
                  <PanelLeftClose size={18} strokeWidth={2} />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.button>
        )}
      </div>

      {/* Navigation Section */}
      <div className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? 'px-2' : 'px-3'} space-y-1 scrollbar-hide`}>
        <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'h-4' : 'h-6'}`}>
          {!isCollapsed ? (
            <p className="px-3 text-[10.5px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider truncate">
              Station Workflow
            </p>
          ) : (
            <div className="w-6 h-px bg-neutral-200/80 dark:bg-neutral-800 mx-auto my-1" />
          )}
        </div>
        
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.path}
              item={item}
              onClose={onClose}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      </div>

      {/* Profile & Session Footer */}
      <div className={`shrink-0 border-t border-neutral-200/80 dark:border-neutral-800 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'p-2.5 space-y-2' : 'p-3 space-y-1.5'
      } bg-neutral-50/70 dark:bg-neutral-950/60 overflow-hidden`}>
        {/* Profile Link */}
        <Link
          to="/photographer/profile"
          onClick={onClose}
          className={`flex items-center transition-all duration-300 ease-in-out group cursor-pointer border block ${
            isCollapsed
              ? 'justify-center w-11 h-11 mx-auto rounded-2xl p-0'
              : 'gap-3 px-2.5 py-2 rounded-xl'
          } ${
            isProfileActive
              ? 'bg-neutral-900 dark:bg-neutral-800 text-white shadow-xs border-neutral-900 dark:border-neutral-700'
              : 'hover:bg-white dark:hover:bg-neutral-800/80 active:bg-neutral-100 dark:active:bg-neutral-700 border-transparent hover:border-neutral-200/80 dark:hover:border-neutral-700 hover:shadow-2xs text-neutral-900 dark:text-neutral-100'
          }`}
          title={isCollapsed ? `Photographer Profile: ${displayName}` : "View & Edit Photographer Profile"}
        >
          <div className="flex items-center gap-3 w-full">
            <div className="relative shrink-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-heading font-bold overflow-hidden transition-all ${
                isProfileActive
                  ? 'bg-neutral-800 dark:bg-neutral-700 text-gold ring-1 ring-gold/60'
                  : 'bg-gold/15 text-gold ring-1 ring-gold/30 group-hover:ring-gold/60'
              }`}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{initial}</span>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
            </div>

            {/* Sliding Profile Label */}
            <div className={`min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out flex-1 ${
              isCollapsed
                ? 'max-w-0 opacity-0 -translate-x-2'
                : 'max-w-[160px] opacity-100 translate-x-0 delay-75'
            }`}>
              <div className="flex items-center justify-between gap-1">
                <p className={`text-xs font-bold truncate transition-colors font-body ${
                  isProfileActive ? 'text-white' : 'text-neutral-900 dark:text-neutral-100 group-hover:text-gold-dark'
                }`}>
                  {displayName}
                </p>
                <i className={`bi bi-person-badge text-[12px] shrink-0 transition-opacity ${
                  isProfileActive ? 'text-gold opacity-100' : 'text-neutral-400 opacity-0 group-hover:opacity-100'
                }`}></i>
              </div>
              <p className={`text-[11px] truncate font-body ${
                isProfileActive ? 'text-gold/90 font-medium' : 'text-neutral-500 dark:text-neutral-400'
              }`}>
                Photographer Profile
              </p>
            </div>
          </div>
        </Link>

        {/* Sign Out Button */}
        <motion.button
          layout
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.94 }}
          transition={{
            layout: { type: 'spring', stiffness: 400, damping: 28 },
          }}
          onClick={handleLogout}
          className={`flex items-center transition-all duration-300 ease-in-out text-xs font-semibold text-red-600 dark:text-red-400 cursor-pointer font-body ${
            isCollapsed
              ? 'justify-center w-11 h-11 mx-auto rounded-2xl bg-red-50/80 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200/60 dark:border-red-900/40 p-0'
              : 'w-full gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30'
          }`}
          title="Sign Out"
        >
          <LogOut size={16} strokeWidth={2} className="text-red-500 shrink-0" />
          <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
            isCollapsed
              ? 'max-w-0 opacity-0 -translate-x-2'
              : 'max-w-[100px] opacity-100 translate-x-0 delay-75'
          }`}>
            Sign Out
          </span>
        </motion.button>
      </div>

    </div>
  );
}

PhotographerSidebar.propTypes = {
  onClose: PropTypes.func,
  isCollapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
};
