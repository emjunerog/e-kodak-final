import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Camera,
  LayoutDashboard,
  CalendarDays,
  Users,
  Camera as CameraIcon,
  CreditCard,
  ImageIcon,
  Bell,
  MessageSquare,
  ShoppingBag,
  Settings,
  ShieldCheck,
  LogOut,
  X,
  ChevronRight,
  ArrowRightLeft,
  UserCheck,
  Edit3,
  Layers,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

// ── Reusable Nav Link ─────────────────────────────────────────────────────────
function SidebarLink({ item, onClose }) {
  return (
    <NavLink
      to={item.path}
      end={item.exact}
      onClick={onClose}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150
        ${isActive
          ? 'bg-neutral-900 text-white shadow-xs'
          : 'text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900'}`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            size={16}
            className={isActive ? 'text-gold' : 'text-neutral-400 group-hover:text-gold transition-colors flex-shrink-0'}
          />
          <span className="flex-1 truncate">{item.name}</span>
          {item.badge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
              isActive 
                ? 'bg-gold/25 text-gold' 
                : item.badgeVariant === 'danger'
                  ? 'bg-rose-100 text-rose-700 border border-rose-200/60'
                  : 'bg-neutral-100 text-neutral-500'
            }`}>
              {item.badge}
            </span>
          )}
          {isActive && <ChevronRight size={13} className="text-gold flex-shrink-0" />}
        </>
      )}
    </NavLink>
  );
}

SidebarLink.propTypes = {
  item: PropTypes.shape({
    name: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    exact: PropTypes.bool,
    badge: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func,
};

// ── Nav Section with Header ──────────────────────────────────────────────────
function NavSection({ label, items, onClose }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="pt-4 mt-2 border-t border-neutral-100/90">
      <p className="px-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map(item => (
          <SidebarLink key={item.path} item={item} onClose={onClose} />
        ))}
      </div>
    </div>
  );
}

NavSection.propTypes = {
  label: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onClose: PropTypes.func,
};

// ── Main Sidebar Component ────────────────────────────────────────────────────
export default function AdminSidebar({ onClose, onOpenProfile }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const role = profile?.role || 'staff';
  
  let roleLabel = 'Staff';
  if (role === 'admin') {
    roleLabel = 'Administrator';
  } else if (role === 'finance') {
    roleLabel = 'Finance Officer';
  }

  // ── Hierarchical Navigation Groups (Prioritizing Daily Core Operations) ───
  let coreNav = [];
  let teamNav = [];
  let opsNav = [];
  let mgmtNav = [];

  if (role === 'admin') {
    // 1. Core Daily Workflow (comes first)
    coreNav = [
      { name: 'Dashboard',         path: '/admin',             icon: LayoutDashboard, exact: true },
      { name: 'Workstation Hub',   path: '/admin/workstation', icon: ArrowRightLeft   },
      { name: 'Active Bookings',   path: '/admin/bookings',    icon: CalendarDays     },
      { name: 'Photo Outputs',     path: '/admin/photos',      icon: ImageIcon        },
      { name: 'Payments & Ledger', path: '/admin/payments',    icon: CreditCard       },
      { name: 'Customers',         path: '/admin/customers',   icon: Users            },
    ];

    // 2. Team & Personnel (grouped logically with zero duplication)
    teamNav = [
      { name: 'Staff & Active Workers', path: '/admin/staff',         icon: UserCheck  },
      { name: 'Photographers',          path: '/admin/photographers', icon: CameraIcon },
    ];

    // 3. Operations & Audit
    opsNav = [
      { name: 'Notifications',     path: '/admin/notifications', icon: Bell          },
      { name: 'SMS Dispatch Logs', path: '/admin/sms',           icon: MessageSquare },
      { name: 'Security & Audit',  path: '/admin/security',      icon: ShieldCheck   },
    ];

    // 4. Studio Management
    mgmtNav = [
      { name: 'Services & Pricing', path: '/admin/services', icon: ShoppingBag },
      { name: 'CMS & Content',      path: '/admin/cms',      icon: Layers      },
      { name: 'Studio Settings',    path: '/admin/settings', icon: Settings    },
    ];
  } else if (role === 'finance') {
    coreNav = [
      { name: 'Finance Overview',  path: '/admin',             icon: LayoutDashboard, exact: true },
      { name: 'Workstation Hub',   path: '/admin/workstation', icon: ArrowRightLeft   },
      { name: 'Payments & Ledger', path: '/admin/payments',    icon: CreditCard       },
      { name: 'Active Bookings',   path: '/admin/bookings',    icon: CalendarDays     },
      { name: 'Customer Accounts', path: '/admin/customers',   icon: Users            },
    ];
    teamNav = [
      { name: 'Photographers',     path: '/admin/photographers', icon: CameraIcon     },
    ];
    opsNav = [
      { name: 'Notifications',     path: '/admin/notifications', icon: Bell           },
    ];
  } else {
    // Staff / Front Desk Operational Workflow
    coreNav = [
      { name: 'Desk Overview',     path: '/admin',             icon: LayoutDashboard, exact: true },
      { name: 'Workstation Hub',   path: '/admin/workstation', icon: ArrowRightLeft   },
      { name: 'Active Bookings',   path: '/admin/bookings',    icon: CalendarDays     },
      { name: 'Photo Outputs',     path: '/admin/photos',      icon: ImageIcon        },
      { name: 'Payments & Ledger', path: '/admin/payments',    icon: CreditCard       },
      { name: 'Customers',         path: '/admin/customers',   icon: Users            },
    ];
    teamNav = [
      { name: 'Photographers',     path: '/admin/photographers', icon: CameraIcon },
    ];
    opsNav = [
      { name: 'Notifications',     path: '/admin/notifications', icon: Bell          },
      { name: 'SMS Dispatch Logs', path: '/admin/sms',           icon: MessageSquare },
    ];
  }

  const initial = profile?.first_name?.charAt(0) || 'A';

  return (
    <div className="h-full flex flex-col bg-white">

      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-neutral-100 flex-shrink-0">
        <Link to="/admin" className="flex items-center gap-2.5 text-primary hover:text-gold transition-colors">
          <Camera size={20} className="text-gold" />
          <span className="font-heading text-base font-semibold tracking-wider">E-KODAK</span>
        </Link>
        <button 
          onClick={onClose} 
          className="lg:hidden text-neutral-400 hover:text-primary p-1 rounded transition-colors" 
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto py-3.5 px-3 scrollbar-hide space-y-1">
        
        {/* 1. Core Daily Workflow (Came First) */}
        <div>
          <p className="px-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
            Core Operations
          </p>
          <div className="space-y-0.5">
            {coreNav.map(item => (
              <SidebarLink key={item.path} item={item} onClose={onClose} />
            ))}
          </div>
        </div>

        {/* 2. Team & Personnel (Hierarchical Grouping) */}
        <NavSection label="Team & Personnel" items={teamNav} onClose={onClose} />

        {/* 3. Operations & Audit */}
        <NavSection label="Operations & Audit" items={opsNav} onClose={onClose} />

        {/* 4. Studio Management */}
        <NavSection label="Studio Management" items={mgmtNav} onClose={onClose} />

      </div>

      {/* Profile Footer */}
      <div className="flex-shrink-0 border-t border-neutral-100 p-3 bg-neutral-50/60">
        <button
          type="button"
          onClick={() => {
            onClose?.();
            onOpenProfile?.();
          }}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-neutral-100/90 active:bg-neutral-200/60 transition-all mb-1.5 text-left group cursor-pointer border border-transparent hover:border-neutral-200/80"
          title="Edit administrative profile"
        >
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center text-gold font-heading font-bold overflow-hidden ring-2 ring-gold/20 group-hover:ring-gold/50 transition-all">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm">{initial}</span>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-sm font-semibold text-primary truncate group-hover:text-gold-dark transition-colors">
                {profile?.first_name} {profile?.last_name || ''}
              </p>
              <Edit3 size={13} className="text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
            <p className="text-xs text-gold truncate flex items-center gap-1">
              <span>{roleLabel}</span>
              <span className="text-[10px] text-neutral-400 font-normal">· Edit Profile</span>
            </p>
          </div>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut size={16} className="text-red-400" />
          Sign Out
        </button>
      </div>

    </div>
  );
}

AdminSidebar.propTypes = {
  onClose: PropTypes.func,
  onOpenProfile: PropTypes.func,
};
