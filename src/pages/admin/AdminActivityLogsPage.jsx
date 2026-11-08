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
        title="Administrative Activity Logs"
        subtitle="Comprehensive studio movement detection and verified audit stream across all stations."
        onRefresh={handleManualRefresh}
        isRefreshing={false}
        extraTools={[
          { label: 'Studio Settings', href: '/admin/settings', icon: Layers, iconColor: 'text-gold' },
          { label: 'Studio Team', href: '/admin/staff', icon: UserCheck, iconColor: 'text-gold' },
          { label: 'Security & Access', href: '/admin/security', icon: ShieldCheck, iconColor: 'text-neutral-400' },
        ]}
      />

      {/* ── 2. Main Activity Logs Stream & Filtering Dashboard (Full Width Edge-to-Edge) ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-5 mt-2.5 sm:mt-3">
        <AdminActivityLogs key={refreshTrigger} />
      </div>

    </div>
  );
}
