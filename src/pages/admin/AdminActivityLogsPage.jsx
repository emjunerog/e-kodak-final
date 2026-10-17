import React, { useState } from 'react';
import {
  History,
  ShieldCheck,
  Layers,
  UserCheck,
} from 'lucide-react';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import AdminActivityLogs from '../../components/admin/AdminActivityLogs';

export default function AdminActivityLogsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleManualRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6 pb-12 font-body">
      
      {/* ── 1. Luxury Executive Hero Banner ────────────────────────────────── */}
      <AdminHeroBanner
        station="admin"
        badgeLabel="Studio Management • Audit Command"
        badgeIcon={History}
        title="Administrative Activity Logs"
        summary="Comprehensive movement detection and verified audit stream across all active studio administrators, staff, finance, and photographers."
        onRefresh={handleManualRefresh}
        isRefreshing={false}
        extraTools={[
          { label: 'Studio Settings', href: '/admin/settings', icon: Layers, iconColor: 'text-gold' },
          { label: 'Staff Roster', href: '/admin/staff', icon: UserCheck, iconColor: 'text-gold' },
          { label: 'Security & Access', href: '/admin/security', icon: ShieldCheck, iconColor: 'text-neutral-400' },
        ]}
      />

      {/* ── 2. Main Activity Logs Stream & Filtering Dashboard ───────────────── */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 mt-4 sm:mt-5">
        <AdminActivityLogs key={refreshTrigger} />
      </div>

    </div>
  );
}
