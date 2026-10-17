import React, { useState } from 'react';
import { History, CalendarDays, Camera, Sliders } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import Toast from '../../components/ui/Toast';
import AdminActivityLogs from '../../components/admin/AdminActivityLogs';

export default function PhotographerActivityLogs() {
  const { user, profile } = useAuth();
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'Studio Photographer';

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setToast({ type: 'info', message: 'Activity logs refreshed.' });
  };

  return (
    <div className="w-full space-y-6 pb-16 font-body animate-fade-in">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* ── Page Hero Header ─────────────────────────────────────────────── */}
      <AdminHeroBanner
        station="photographer"
        userName={displayName}
        title="Photographer Activity Logs"
        subtitle="Live activity trail of your working schedule changes, shift commitments, and booking sessions."
        statusSummary="Photographer Activity History Active"
        primaryAction={{
          label: 'Shoot Calendar',
          href: '/photographer/availability',
          icon: CalendarDays,
        }}
        secondaryAction={{
          label: 'My Bookings',
          href: '/photographer/bookings',
          icon: Camera,
        }}
        onRefresh={handleRefresh}
        isRefreshing={false}
      />

      {/* ── Unified Activity Logs Dashboard ──────────────────────────────── */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 mt-4 sm:mt-5">
        <AdminActivityLogs key={refreshKey} />
      </div>
    </div>
  );
}
