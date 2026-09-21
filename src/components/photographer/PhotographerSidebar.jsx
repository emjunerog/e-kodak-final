import React from 'react';
import PropTypes from 'prop-types';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/photographer', iconClass: 'bi-grid-1x2', exact: true },
  { name: 'My Bookings', path: '/photographer/bookings', iconClass: 'bi-calendar2-check' },
  { name: 'Availability', path: '/photographer/availability', iconClass: 'bi-calendar-week' },
  { name: 'Upload Photos', path: '/photographer/uploads', iconClass: 'bi-cloud-arrow-up' },
  { name: 'Settings', path: '/photographer/settings', iconClass: 'bi-sliders' },
];

function SidebarLink({ item, onClose }) {
  return (
    <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
      <NavLink
        to={item.path}
        end={item.exact}
        onClick={onClose}
        className={({ isActive }) =>
          `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 font-body select-none ${
            isActive
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <i
              className={`bi ${item.iconClass} text-base transition-colors flex-shrink-0 ${
                isActive ? 'text-gold' : 'text-neutral-400 group-hover:text-gold'
              }`}
            />
            <span className="flex-1 truncate">{item.name}</span>
            {isActive && (
              <i className="bi bi-chevron-right text-[11px] text-gold/80 flex-shrink-0"></i>
            )}
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
    iconClass: PropTypes.string.isRequired,
    exact: PropTypes.bool,
  }).isRequired,
  onClose: PropTypes.func,
};

export default function PhotographerSidebar({ onClose }) {
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

  return (
    <div className="h-full flex flex-col bg-white border-r border-neutral-200/80 select-none font-body">
      
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-neutral-200/80 flex-shrink-0">
        <Link to="/photographer" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-neutral-900 flex items-center justify-center text-gold shadow-xs group-hover:scale-105 transition-transform ring-1 ring-gold/30">
            <i className="bi bi-camera text-base"></i>
          </div>
          <div>
            <span className="font-heading text-base tracking-wider text-primary font-bold block leading-tight">
              E-KODAK
            </span>
            <span className="text-[10px] font-body font-semibold text-gold tracking-widest uppercase block">
              Creative Bay
            </span>
          </div>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden text-neutral-400 hover:text-primary p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          aria-label="Close sidebar"
        >
          <i className="bi bi-x-lg text-sm"></i>
        </button>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
        <p className="px-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
          Station Workflow
        </p>
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.path} item={item} onClose={onClose} />
          ))}
        </div>
      </div>

      {/* Profile & Session Footer */}
      <div className="flex-shrink-0 border-t border-neutral-200/80 p-3 bg-neutral-50/70 space-y-1.5">
        <Link
          to="/photographer/settings"
          onClick={onClose}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white active:bg-neutral-100 transition-all text-left group cursor-pointer border border-transparent hover:border-neutral-200/80 hover:shadow-2xs block"
          title="Edit photographer profile"
        >
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gold/15 flex items-center justify-center text-gold font-heading font-bold overflow-hidden ring-1 ring-gold/30 group-hover:ring-gold/60 transition-all">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{initial}</span>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-bold text-neutral-900 truncate group-hover:text-gold-dark transition-colors font-body">
                  {displayName}
                </p>
                <i className="bi bi-pencil text-[11px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"></i>
              </div>
              <p className="text-[11px] text-neutral-500 truncate font-body">
                Photographer
              </p>
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer font-body"
        >
          <i className="bi bi-box-arrow-right text-sm text-red-500"></i>
          <span>Sign Out</span>
        </button>
      </div>

    </div>
  );
}

PhotographerSidebar.propTypes = {
  onClose: PropTypes.func,
};
