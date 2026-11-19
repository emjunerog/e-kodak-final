import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCustomerBookings, getCachedCustomerBookings } from '../../services/bookingService';
import {
  CreditCard, Camera, Images, ClipboardList, ArrowUpRight, Clock,
} from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import ClientHeroBanner from '../../components/dashboard/ClientHeroBanner';
import LookbookAppReminder from '../../components/dashboard/LookbookAppReminder';
import UpcomingDatesCard from '../../components/dashboard/UpcomingDatesCard';
import AppInstallReminder from '../../components/dashboard/AppInstallReminder';
import OrderTrackerCard from '../../components/dashboard/OrderTrackerCard';
import SessionCredentialsCard from '../../components/dashboard/SessionCredentialsCard';
import StudioExperienceBanner from '../../components/dashboard/StudioExperienceBanner';
import { DashboardHomeSkeleton, SmartLoadingContainer } from '../../components/dashboard/skeletons';

const SURFACE =
  'bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs';

export default function DashboardHome() {
  const { user } = useAuth();
  const outletContext = useOutletContext();

  // Instant state resolution from outlet context or in-memory cache to prevent skeleton flash
  const initialBookings = useMemo(() => {
    if (outletContext?.bookings && Array.isArray(outletContext.bookings)) {
      return outletContext.bookings.filter((b) => !b.is_deleted);
    }
    const cached = getCachedCustomerBookings(user?.id);
    if (cached && Array.isArray(cached)) {
      return cached.filter((b) => !b.is_deleted);
    }
    return [];
  }, [outletContext?.bookings, user?.id]);

  const [bookings, setBookings] = useState(initialBookings);
  const [loading, setLoading] = useState(initialBookings.length === 0);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // Sync if outlet context updates
  useEffect(() => {
    if (outletContext?.bookings && Array.isArray(outletContext.bookings)) {
      const filtered = outletContext.bookings.filter((b) => !b.is_deleted);
      setBookings(filtered);
      setLoading(false);
      setError(null);
    }
  }, [outletContext?.bookings]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setError(null);
      const bRes = await getCustomerBookings(user.id);
      if (bRes?.error) {
        setError(bRes.error);
      } else if (bRes?.data) {
        setBookings((bRes.data || []).filter((b) => !b.is_deleted));
      }
    } catch (err) {
      console.warn('Dashboard data load error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    // If we already have initial bookings from context/cache, load in background
    if (initialBookings.length > 0) {
      setBookings(initialBookings);
      setLoading(false);
    }
    loadData();
  }, [user?.id, loadData]);

  const pendingApprovalBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const st = String(b.status || '').toUpperCase();
        return st === 'PENDING' || st === 'RESERVED';
      }),
    [bookings]
  );

  const approvedBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const st = String(b.status || '').toUpperCase();
        return !['PENDING', 'RESERVED'].includes(st);
      }),
    [bookings]
  );

  const activeBookings = useMemo(
    () => approvedBookings.filter((b) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(String(b.status || '').toUpperCase())),
    [approvedBookings]
  );
  const completedCount = approvedBookings.filter((b) => String(b.status || '').toUpperCase() === 'COMPLETED').length;

  // Orders shown in the tracker: admin-approved active ones first, else most recent approved
  const trackerSessions = activeBookings.length > 0 ? activeBookings : approvedBookings.slice(0, 1);

  // Outstanding balance across live orders (approved + pending)
  const outstanding = useMemo(
    () =>
      bookings
        .filter((b) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(String(b.status || '').toUpperCase()))
        .reduce((sum, b) => sum + Math.max(0, Number(b.remaining_balance ?? 0)), 0),
    [bookings]
  );

  // Downpayment still required (only when customer has NOT paid yet)
  const pendingDownpaymentBooking = useMemo(() => {
    return bookings.find((b) => {
      const st = String(b.status || '').toUpperCase();
      if (st === 'CANCELLED' || st === 'REJECTED') return false;
      const rem = Number(b.remaining_balance ?? b.total_amount ?? 0);
      const downPaid = Number(b.down_payment_amount || 0);
      return rem > 0 && !b.down_payment_confirmed && downPaid === 0;
    }) || null;
  }, [bookings]);

  const pendingDownpaymentAmount = useMemo(() => {
    if (!pendingDownpaymentBooking) return 0;
    const tot = Number(pendingDownpaymentBooking.total_amount || 0);
    const rem = Number(pendingDownpaymentBooking.remaining_balance ?? tot);
    return rem > 0 ? Math.min(rem, Math.max(500, Math.round(tot * 0.5))) : 0;
  }, [pendingDownpaymentBooking]);

  const quickActions = [
    { to: '/dashboard/book', icon: Camera, label: 'Book a session', hint: 'Pick a package & date' },
    {
      to: '/dashboard/payments',
      icon: CreditCard,
      label: 'Payments',
      hint: outstanding > 0 ? `₱${outstanding.toLocaleString()} balance` : 'All settled',
    },
    {
      to: '/dashboard/soft-copies',
      icon: Images,
      label: 'Soft-copies',
      hint: completedCount > 0 ? `${completedCount} session archive${completedCount !== 1 ? 's' : ''}` : 'Photos & Drive links appear here',
    },
    {
      to: '/dashboard/bookings',
      icon: ClipboardList,
      label: 'Booking records',
      hint: `${bookings.length} order${bookings.length !== 1 ? 's' : ''} on file`,
    },
  ];


  return (
    <SmartLoadingContainer
      loading={loading}
      hasData={bookings.length > 0}
      error={error}
      onRetry={loadData}
      skeleton={<DashboardHomeSkeleton />}
      delayMs={220}
      title="Studio Dashboard"
    >
      <div className="w-full pb-16 font-body">

        <ClientHeroBanner bookings={bookings} />

        <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6 pt-3 animate-fade-in">

          {/* Pending Admin Approval Notice (customer paid, awaiting studio admin approval) */}
          {pendingApprovalBookings.length > 0 && (
            <div
              role="status"
              className="rounded-2xl px-4 py-3.5 bg-[#fdfaf3] dark:bg-amber-950/30 border border-[#e2cfa7] dark:border-amber-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Pending Studio Approval ({pendingApprovalBookings.map((b) => `#${b.booking_number}`).join(', ')})
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5 leading-relaxed">
                    Your booking and payment have been received by the studio. Once an administrator approves it, your confirmed order, schedule, and QR pass will update here automatically.
                  </p>
                </div>
              </div>
              <Link
                to={`/dashboard/bookings/${pendingApprovalBookings[0].id}`}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-[#e8cf9d] dark:text-neutral-950 text-xs font-semibold transition-colors shrink-0 text-center"
              >
                View submission
              </Link>
            </div>
          )}

          {/* Payment reminder */}
          {pendingDownpaymentBooking && pendingDownpaymentAmount > 0 && (
            <div
              role="status"
              className="rounded-2xl px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300/70 dark:border-amber-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <p className="text-xs text-neutral-700 dark:text-neutral-200">
                <strong className="text-amber-700 dark:text-amber-400">Downpayment needed</strong> for #{pendingDownpaymentBooking.booking_number} &mdash;
                pay <strong>₱{pendingDownpaymentAmount.toLocaleString()}</strong> to reserve your slot.
              </p>
              <Link
                to="/dashboard/payments"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-colors shrink-0 text-center"
              >
                Pay now
              </Link>
            </div>
          )}

          <div className="grid lg:grid-cols-12 gap-6 items-stretch">

            {/* ── Main column ─────────────────────────────────────────── */}
            <div className="lg:col-span-8 flex flex-col gap-6 h-full min-w-0">
              <OrderTrackerCard
                sessions={trackerSessions}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />

              {/* Quick actions */}
              <nav aria-label="Quick actions" className="grid grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
                {quickActions.map(({ to, icon: Icon, label, hint }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`${SURFACE} group p-4 hover:border-gold/60 hover:-translate-y-0.5 transition-all`}
                  >
                    <div className="flex items-start justify-between">
                      <Icon size={18} className="text-gold" />
                      <ArrowUpRight size={14} className="text-neutral-300 group-hover:text-gold transition-colors" />
                    </div>
                    <p className="mt-3 text-sm font-light text-primary dark:text-neutral-100">{label}</p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate font-light">{hint}</p>
                  </Link>
                ))}
              </nav>

              <StudioExperienceBanner bookings={approvedBookings} className="shrink-0" />

              <SessionCredentialsCard
                bookings={approvedBookings}
                selectedId={selectedId}
                onSelect={setSelectedId}
                className="lg:h-[660px] mt-auto shrink-0"
              />
            </div>

            {/* ── Side column ─────────────────────────────────────────── */}
            <aside className="lg:col-span-4 flex flex-col gap-6 h-full min-w-0">
              <UpcomingDatesCard bookings={approvedBookings} className="shrink-0" />

              <LookbookAppReminder className="flex-1 min-h-[260px]" />

              <AppInstallReminder featured className="lg:h-[660px] mt-auto shrink-0" />
            </aside>
          </div>
        </div>
      </div>
    </SmartLoadingContainer>
  );
}
