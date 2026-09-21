import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import WorkstationHub from '../../components/admin/WorkstationHub';
import { ArrowRightLeft, CreditCard, CalendarDays } from 'lucide-react';

export default function AdminWorkstation() {
  const { profile } = useAuth();
  const userRole = profile?.role || 'admin';

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Unified Luxury Hero Banner with Live Studio Clock */}
      <AdminHeroBanner
        station={userRole}
        badgeLabel="Departmental Workstation Hub"
        userName={profile?.first_name || 'Administrator'}
        statusSummary="Real-time administrator activity audit stream, operational logs, and cross-departmental handoffs."
        primaryAction={{
          label: 'Bookings Queue',
          href: '/admin/bookings',
          icon: CalendarDays,
        }}
        secondaryAction={{
          label: 'Payment Ledger',
          href: '/admin/payments',
          icon: CreditCard,
        }}
      />

      {/* Central Workstation Operations Hub */}
      <WorkstationHub />
    </div>
  );
}
