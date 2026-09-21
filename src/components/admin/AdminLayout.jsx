import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AdminProfileModal from './AdminProfileModal';
import { useAuth } from '../../context/AuthContext';
import { trackCustomerPresence } from '../../services/presenceService';
import ErrorBoundary from '../common/ErrorBoundary';

export default function AdminLayout() {
  const { user, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Broadcast staff/admin active presence while in admin portal
  useEffect(() => {
    if (user && profile) {
      const cleanup = trackCustomerPresence(user, profile);
      return cleanup;
    }
  }, [user, profile]);

  // Fallback guard (AdminProtectedRoute handles primary check)
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !['admin', 'staff', 'finance'].includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden dashboard-gradient-bg flex font-body selection:bg-gold/20 selection:text-primary">

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 h-screen flex-shrink-0 bg-white border-r border-neutral-200/80 shadow-xs
        transform transition-transform duration-300 ease-smooth
        lg:translate-x-0 lg:static lg:h-screen lg:flex lg:flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <AdminSidebar 
          onClose={() => setSidebarOpen(false)} 
          onOpenProfile={() => setProfileModalOpen(true)}
        />
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <AdminHeader 
          onMenuClick={() => setSidebarOpen(true)} 
          onOpenProfile={() => setProfileModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-5 sm:p-7 lg:p-10 dashboard-gradient-bg">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Administrator / Staff Profile Edit Modal */}
      <AdminProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

    </div>
  );
}
