import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import PhotographerSidebar from './PhotographerSidebar';
import PhotographerHeader from './PhotographerHeader';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { trackCustomerPresence } from '../../services/presenceService';
import ErrorBoundary from '../common/ErrorBoundary';

export default function PhotographerLayout() {
  const { user, profile, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Broadcast live presence while browsing photographer portal
  useEffect(() => {
    if (!user) return;
    const cleanup = trackCustomerPresence(user, profile);
    return cleanup;
  }, [user, profile]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-100">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="h-screen w-screen overflow-hidden dashboard-gradient-bg flex font-body selection:bg-gold/20 selection:text-primary">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Fixed Full-Height Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 h-screen flex-shrink-0 bg-white border-r border-neutral-200/80 shadow-xs
        transform transition-transform duration-300 ease-smooth
        lg:translate-x-0 lg:static lg:h-screen lg:flex lg:flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <PhotographerSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <PhotographerHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-5 sm:p-7 lg:p-10 scrollbar-smooth dashboard-gradient-bg">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
