import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AdminProfileModal from './AdminProfileModal';
import { useAuth } from '../../context/AuthContext';
import { trackCustomerPresence } from '../../services/presenceService';
import ErrorBoundary from '../common/ErrorBoundary';

export default function AdminLayout() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('ekodak_admin_sidebar_collapsed');
      return saved === 'true' || (saved !== null && JSON.parse(saved) === true);
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Synchronize collapsed state with localStorage safely without re-entrancy
  useEffect(() => {
    try {
      localStorage.setItem('ekodak_admin_sidebar_collapsed', JSON.stringify(sidebarCollapsed));
    } catch (e) {
      console.warn('Failed to persist admin sidebar collapsed state:', e);
    }
  }, [sidebarCollapsed]);

  // Broadcast staff/admin active presence while in admin portal
  useEffect(() => {
    if (user && profile) {
      const cleanup = trackCustomerPresence(user, profile);
      return cleanup;
    }
  }, [user, profile]);

  // Admin Dashboard is strictly light theme — never affected by other dashboards
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const isAdminRoot = location.pathname === '/admin' || location.pathname === '/admin/';

  // Memoize the main dashboard column so sidebar collapse/expand never triggers costly re-renders of the inner page
  const memoizedContent = useMemo(() => (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
      <main className="flex-1 overflow-x-hidden overflow-y-auto no-scrollbar dashboard-gradient-bg admin-main-container w-full min-w-0">
        <AdminHeader 
          onMenuClick={() => setSidebarOpen(true)} 
          onOpenProfile={() => setProfileModalOpen(true)}
        />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  ), [location.pathname, isAdminRoot]);

  // Fallback guard (AdminProtectedRoute handles primary check)
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !['admin', 'staff', 'finance'].includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={`h-screen w-full overflow-hidden dashboard-gradient-bg flex font-body selection:bg-gold/20 selection:text-primary ${sidebarCollapsed ? 'admin-sidebar-collapsed' : ''}`}>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with Collapsible Rail */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 h-screen flex-shrink-0 bg-white border-r border-neutral-200/80 shadow-xs
        overflow-hidden admin-sidebar-rail
        ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
        w-64
        lg:translate-x-0 lg:static lg:h-screen lg:flex lg:flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <AdminSidebar 
          onClose={() => setSidebarOpen(false)} 
          onOpenProfile={() => setProfileModalOpen(true)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />
      </aside>

      {/* Main Content Column (Memoized for silky-smooth animation performance) */}
      {memoizedContent}

      {/* Administrator / Staff Profile Edit Modal */}
      <AdminProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

    </div>
  );
}
