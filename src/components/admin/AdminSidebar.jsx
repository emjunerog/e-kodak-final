import React from 'react';
import PropTypes from 'prop-types';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
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
  UserCheck,
  Edit3,
  Layers,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ── Reusable Nav Link ─────────────────────────────────────────────────────────
function SidebarLink({ item, onClose, isCollapsed }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.exact}
      onClick={onClose}
      title={isCollapsed ? item.name : undefined}
      className={({ isActive }) =>
        `group relative flex items-center h-10 w-full rounded-xl select-none px-2.5 transition-all duration-150 font-body ${
          isActive
            ? 'bg-neutral-900 text-white shadow-xs font-semibold'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Rock-solid anchor slot - precisely 36x36 at X=40px midpoint in both collapsed & expanded states */}
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <Icon
              size={17}
              strokeWidth={isActive ? 2.2 : 1.9}
              className={`shrink-0 transition-colors duration-150 ${
                isActive ? 'text-gold' : 'text-neutral-400 group-hover:text-gold'
              }`}
            />
          </div>

          {/* Smooth Sliding Label (GPU-accelerated transform + opacity) */}
          <div
            className={`ml-2.5 flex-1 min-w-0 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
              isCollapsed
                ? 'opacity-0 max-w-0 -translate-x-3 pointer-events-none'
                : 'opacity-100 max-w-[170px] translate-x-0'
            }`}
          >
            <span className="text-[13px] font-medium tracking-tight truncate">{item.name}</span>
            {item.badge && (
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ml-1.5 shrink-0 transition-colors ${
                  isActive
                    ? 'bg-gold/25 text-gold'
                    : item.badgeVariant === 'danger'
                    ? 'bg-rose-100 text-rose-700 border border-rose-200/60'
                    : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {item.badge}
              </span>
            )}
            {isActive && (
              <ChevronRight size={13} className="text-gold shrink-0 ml-1.5" />
            )}
          </div>

          {/* Collapsed dot badge indicator */}
          {isCollapsed && item.badge && (
            <span
              className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                item.badgeVariant === 'danger' ? 'bg-rose-500' : 'bg-gold'
              } ring-2 ring-white`}
            />
          )}
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
    badgeVariant: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func,
  isCollapsed: PropTypes.bool,
};

// ── Nav Section with Header ──────────────────────────────────────────────────
function NavSection({ label, items, onClose, isCollapsed }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="pt-3.5 mt-1 border-t border-neutral-100">
      <div className="h-5 px-3 flex items-center relative overflow-hidden mb-1.5">
        <p
          className={`text-[10px] font-bold text-neutral-400 uppercase tracking-[0.1em] whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
            isCollapsed
              ? 'opacity-0 -translate-x-2 pointer-events-none'
              : 'opacity-100 translate-x-0'
          }`}
        >
          {label}
        </p>
        <div
          className={`absolute inset-x-3.5 top-2.5 h-px bg-neutral-100 transition-opacity duration-300 ${
            isCollapsed ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <SidebarLink
            key={item.path}
            item={item}
            onClose={onClose}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>
    </div>
  );
}

NavSection.propTypes = {
  label: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onClose: PropTypes.func,
  isCollapsed: PropTypes.bool,
};

// ── Main Sidebar Component ────────────────────────────────────────────────────
export default function AdminSidebar({ onClose, onOpenProfile, isCollapsed = false, onToggleCollapse }) {
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
    coreNav = [
      { name: 'Dashboard',         path: '/admin',             icon: LayoutDashboard, exact: true },
      { name: 'Active Bookings',   path: '/admin/bookings',    icon: CalendarDays     },
      { name: 'Photo Outputs',     path: '/admin/photos',      icon: ImageIcon        },
      { name: 'Payments & Ledger', path: '/admin/payments',    icon: CreditCard       },
      { name: 'Customers',         path: '/admin/customers',   icon: Users            },
    ];

    teamNav = [
      { name: 'Staff & Active Workers', path: '/admin/staff',         icon: UserCheck  },
      { name: 'Photographers',          path: '/admin/photographers', icon: CameraIcon },
    ];

    opsNav = [
      { name: 'Notifications',     path: '/admin/notifications', icon: Bell          },
      { name: 'SMS Dispatch Logs', path: '/admin/sms',           icon: MessageSquare },
      { name: 'Security & Audit',  path: '/admin/security',      icon: ShieldCheck   },
    ];

    mgmtNav = [
      { name: 'Yearbook Studio',    path: '/admin/yearbook',      icon: BookOpen    },
      { name: 'Activity Logs',      path: '/admin/activity-logs', icon: History     },
      { name: 'Services & Pricing', path: '/admin/services',      icon: ShoppingBag },
      { name: 'CMS & Content',      path: '/admin/cms',           icon: Layers      },
      { name: 'Studio Settings',    path: '/admin/settings',      icon: Settings    },
    ];
  } else if (role === 'finance') {
    coreNav = [
      { name: 'Finance Overview',  path: '/admin',             icon: LayoutDashboard, exact: true },
      { name: 'Payments & Ledger', path: '/admin/payments',    icon: CreditCard       },
      { name: 'Active Bookings',   path: '/admin/bookings',    icon: CalendarDays     },
      { name: 'Customer Accounts', path: '/admin/customers',   icon: Users            },
    ];
    teamNav = [
      { name: 'Staff Roster',      path: '/admin/staff',         icon: UserCheck      },
      { name: 'Photographers',     path: '/admin/photographers', icon: CameraIcon     },
    ];
    opsNav = [
      { name: 'Notifications',     path: '/admin/notifications', icon: Bell           },
      { name: 'SMS Dispatch Logs', path: '/admin/sms',           icon: MessageSquare  },
    ];
    mgmtNav = [
      { name: 'Yearbook Studio',   path: '/admin/yearbook',      icon: BookOpen       },
      { name: 'Activity Logs',     path: '/admin/activity-logs', icon: History        },
    ];
  } else {
    coreNav = [
      { name: 'Desk Overview',     path: '/admin',             icon: LayoutDashboard, exact: true },
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
    mgmtNav = [
      { name: 'Yearbook Studio',   path: '/admin/yearbook',      icon: BookOpen      },
      { name: 'Activity Logs',     path: '/admin/activity-logs', icon: History       },
    ];
  }

  const initial = profile?.first_name?.charAt(0) || 'A';

  return (
    <div className="h-full flex flex-col bg-white select-none">

      {/* Brand Header */}
      <div className="h-16 border-b border-neutral-100 px-3 flex items-center justify-between relative overflow-hidden flex-shrink-0">
        {/* Brand Logo & Name */}
        <div
          className={`flex items-center min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
            isCollapsed
              ? 'opacity-0 max-w-0 -translate-x-3 pointer-events-none'
              : 'opacity-100 max-w-[170px] translate-x-0'
          }`}
        >
          <Link
            to="/admin"
            className="flex items-center gap-2.5 text-primary hover:text-gold transition-colors min-w-0 pl-1 group"
          >
            <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center p-1 shadow-xs border border-neutral-800 shrink-0 group-hover:border-gold/40 transition-colors">
              <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
            </div>
            <span className="font-heading text-base font-semibold tracking-wider truncate">
              E-KODAK
            </span>
          </Link>
        </div>

        {/* Action Controls */}
        <div className={`flex items-center shrink-0 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
          isCollapsed ? 'w-full justify-center' : 'ml-auto'
        }`}>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`hidden lg:flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer select-none transition-colors duration-150 shrink-0 ${
                isCollapsed
                  ? 'bg-neutral-100 text-gold hover:bg-neutral-200/80 hover:text-gold-dark ring-1 ring-gold/20'
                  : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
              title={isCollapsed ? 'Expand sidebar (show full menu)' : 'Collapse sidebar (icons only)'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeftOpen size={18} className="text-gold" strokeWidth={2.2} />
              ) : (
                <PanelLeftClose size={18} strokeWidth={2} />
              )}
            </button>
          )}

          {/* Mobile Close Button */}
          <button 
            type="button"
            onClick={onClose} 
            className="lg:hidden text-neutral-400 hover:text-primary p-1.5 rounded-lg transition-colors ml-1" 
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto py-3.5 px-3.5 scrollbar-hide space-y-3.5">
        
        {/* 1. Core Daily Workflow */}
        <div>
          <div className="h-5 px-3 flex items-center relative overflow-hidden mb-1.5">
            <p
              className={`text-[10px] font-bold text-neutral-400 uppercase tracking-[0.1em] whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                isCollapsed
                  ? 'opacity-0 -translate-x-2 pointer-events-none'
                  : 'opacity-100 translate-x-0'
              }`}
            >
              Core Operations
            </p>
          </div>
          <div className="space-y-1">
            {coreNav.map((item) => (
              <SidebarLink
                key={item.path}
                item={item}
                onClose={onClose}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        </div>

        {/* 2. Team & Personnel */}
        <NavSection label="Team & Personnel" items={teamNav} onClose={onClose} isCollapsed={isCollapsed} />

        {/* 3. Operations & Audit */}
        <NavSection label="Operations & Audit" items={opsNav} onClose={onClose} isCollapsed={isCollapsed} />

        {/* 4. Studio Management */}
        <NavSection label="Studio Management" items={mgmtNav} onClose={onClose} isCollapsed={isCollapsed} />

      </div>

      {/* Profile Footer */}
      <div className="flex-shrink-0 border-t border-neutral-100 p-3 pt-3 pb-3.5 bg-neutral-50/70 space-y-2 overflow-hidden">
        {/* Profile Card */}
        <div
          onClick={() => {
            onClose?.();
            onOpenProfile?.();
          }}
          className="h-12 w-full rounded-xl flex items-center px-2.5 transition-all duration-150 hover:bg-white hover:shadow-xs cursor-pointer select-none group min-w-0"
          title={`${profile?.first_name || 'Admin'} ${profile?.last_name || ''} (${roleLabel}) - Edit Profile`}
        >
          {/* Avatar slot - exactly anchored at 40px center */}
          <div className="w-9 h-9 flex items-center justify-center shrink-0 relative">
            <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center text-gold font-heading font-bold overflow-hidden ring-2 ring-gold/25 group-hover:ring-gold/60 transition-all shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-full block"
                />
              ) : (
                <span className="text-xs">{initial}</span>
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

          {/* Sliding profile info */}
          <div
            className={`ml-2.5 flex-1 min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
              isCollapsed
                ? 'opacity-0 max-w-0 -translate-x-3 pointer-events-none'
                : 'opacity-100 max-w-[130px] translate-x-0'
            }`}
          >
            <p className="text-[13px] font-semibold text-neutral-900 truncate group-hover:text-gold-dark transition-colors font-body leading-tight">
              {profile?.first_name || 'Admin'} {profile?.last_name || ''}
            </p>
            <p className="text-[11px] text-gold font-medium truncate font-body mt-0.5">
              {roleLabel}
            </p>
          </div>

          {/* Edit Profile Icon Button */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] shrink-0 ${
              isCollapsed
                ? 'opacity-0 max-w-0 pointer-events-none'
                : 'opacity-100 max-w-[32px] ml-1'
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose?.();
                onOpenProfile?.();
              }}
              className="p-1.5 text-neutral-400 hover:text-gold hover:bg-neutral-200/60 rounded-lg transition-colors cursor-pointer border-0 outline-none"
              title="Edit Profile"
              aria-label="Edit Profile"
            >
              <Edit3 size={13} />
            </button>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="h-10 w-full flex items-center px-2.5 rounded-xl hover:bg-rose-50 text-rose-600 transition-colors duration-150 cursor-pointer select-none border-0 outline-none group"
          title={isCollapsed ? 'Sign Out' : undefined}
          aria-label="Sign Out"
        >
          {/* Anchor slot - exactly centered at 40px */}
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <LogOut size={15} strokeWidth={2} className="text-rose-500 shrink-0 group-hover:scale-105 transition-transform" />
          </div>

          <span
            className={`ml-2.5 text-xs font-semibold overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
              isCollapsed
                ? 'opacity-0 max-w-0 -translate-x-3 pointer-events-none'
                : 'opacity-100 max-w-[100px] translate-x-0'
            }`}
          >
            Sign Out
          </span>
        </button>
      </div>

    </div>
  );
}

AdminSidebar.propTypes = {
  onClose: PropTypes.func,
  onOpenProfile: PropTypes.func,
  isCollapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
};
