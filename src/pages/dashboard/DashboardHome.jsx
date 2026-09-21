import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCustomerBookings } from '../../services/bookingService';
import { getCustomerUnifiedNotifications } from '../../services/customerNotificationService';
import { getStatusBadge, getStatusLabel, getPaymentLabel, getProgressSteps } from '../../lib/bookingUtils';
import {
  Camera, Calendar, Clock, MapPin, ArrowRight,
  CalendarDays, CheckCircle, Loader2, CalendarPlus,
  QrCode, CheckSquare, Calculator, ExternalLink,
  History, Bell, ChevronRight, Filter, RefreshCw,
  CreditCard, AlertCircle, Palette, PackageCheck,
  Sparkles, User, Layers, Tag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import LiveClock from '../../components/dashboard/LiveClock';
import ClientToolsHub from '../../components/dashboard/ClientToolsHub';
import StatCard from '../../components/admin/StatCard';
import SidebarOrderCalendar from '../../components/dashboard/SidebarOrderCalendar';
import StudioDropdown from '../../components/ui/StudioDropdown';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

const QUICK_TOOLS = [
  { id: 'qr',        label: 'Studio QR Pass',          icon: QrCode },
  { id: 'checklist', label: 'Prep Checklist',          icon: CheckSquare },
  { id: 'estimator', label: 'Cost Estimator',          icon: Calculator },
  { id: 'activity',  label: 'Activity Audit',          icon: History },
];

export default function DashboardHome() {
  const { profile, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [activeTool, setActiveTool] = useState('qr');
  const [qrModalBooking, setQrModalBooking] = useState(null);
  const [selectedTrackingId, setSelectedTrackingId] = useState(null);

  const [dateFilter, setDateFilter] = useState('ALL');
  const [customMonth, setCustomMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rightTab, setRightTab] = useState('calendar'); // 'calendar' | 'bulletins'

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    async function loadData() {
      try {
        const [bRes, nRes] = await Promise.all([
          getCustomerBookings(user.id),
          getCustomerUnifiedNotifications(user.id)
        ]);
        if (isMounted) {
          setBookings(bRes?.data || []);
          setNotifications(nRes?.data || []);
        }
      } catch (err) {
        console.warn('Dashboard data load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [user]);

  const total     = bookings.length;
  const pending   = bookings.filter(b => b.status === 'PENDING').length;
  const upcoming  = bookings.filter(b => b.status === 'CONFIRMED').length;
  const completed = bookings.filter(b => b.status === 'COMPLETED').length;

  const activeBookings = bookings.filter(
    b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && b.status !== 'REJECTED'
  );

  const filteredBookings = useMemo(() => {
    if (dateFilter === 'ALL') return activeBookings;
    const now = new Date();
    return activeBookings.filter((b) => {
      const td = b.event_date ? new Date(b.event_date) : (b.created_at ? new Date(b.created_at) : null);
      if (!td) return true;
      if (dateFilter === 'THIS_MONTH') return td.getFullYear() === now.getFullYear() && td.getMonth() === now.getMonth();
      if (dateFilter === 'NEXT_30') { const d = Math.ceil((td - now) / 864e5); return d >= 0 && d <= 30; }
      if (dateFilter === 'PAST') return td < now;
      if (dateFilter === 'CUSTOM' && customMonth) {
        const [y, m] = customMonth.split('-').map(Number);
        return td.getFullYear() === y && td.getMonth() === m - 1;
      }
      return true;
    });
  }, [activeBookings, dateFilter, customMonth]);

  const filteredTotalValue = filteredBookings.reduce((s, b) => s + (Number(b.total_amount) || 0), 0);

  const nextBooking = activeBookings
    .filter(b => b.event_date)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))[0] || activeBookings[0] || bookings[0] || null;

  const trackedSession = bookings.find(b => b.id === selectedTrackingId) || nextBooking;

  // Detect active session requiring downpayment settlement (> 0)
  const pendingDownpaymentBooking = useMemo(() => {
    return bookings.find(b => {
      if (b.status === 'CANCELLED' || b.status === 'REJECTED') return false;
      const status = (b.payment_status || '').toUpperCase();
      const rem = Number(b.remaining_balance ?? b.total_amount ?? 0);
      const isUnpaid = status === 'UNPAID' || status === '';
      const downPaid = Number(b.down_payment_amount || 0);
      return rem > 0 && (isUnpaid || rem > 0) && (!b.down_payment_confirmed && downPaid === 0);
    }) || null;
  }, [bookings]);

  const pendingDownpaymentAmount = useMemo(() => {
    if (!pendingDownpaymentBooking) return 0;
    const total = Number(pendingDownpaymentBooking.total_amount || 0);
    const rem = Number(pendingDownpaymentBooking.remaining_balance ?? total);
    return rem > 0 ? Math.min(rem, Math.max(500, Math.round(total * 0.5))) : 0;
  }, [pendingDownpaymentBooking]);

  const stats = [
    { label: 'Total Sessions', value: total,     icon: CalendarDays, tier: 'blue' },
    { label: 'Pending Review', value: pending,   icon: Clock,        tier: 'amber' },
    { label: 'Confirmed Shoots',value: upcoming,  icon: Camera,       tier: 'gold' },
    { label: 'Completed',      value: completed, icon: CheckCircle,  tier: 'green' },
  ];

  const handleOpenTool = (toolName, specificBooking = null) => {
    setActiveTool(toolName);
    setQrModalBooking(specificBooking || trackedSession || bookings[0] || null);
    setToolsModalOpen(true);
  };

  const clientFullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Valued Client';

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-gold" size={36} />
        <p className="text-xs text-neutral-400 font-body tracking-wider uppercase">Loading studio dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-screen-2xl mx-auto pb-12 font-body">

      {/* ── 1. Top Editorial Hero Banner with Integrated Quick Tools ──────── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-[#121c2d] p-6 sm:p-7 shadow-xl border border-neutral-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-primary/25 rounded-full blur-3xl translate-y-1/3 pointer-events-none" />

        <div className="relative z-10 grid lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gold bg-gold/15 border border-gold/30 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
              <Sparkles size={12} className="text-gold" /> E-Kodak Studio Client Portal
            </span>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-white font-bold tracking-tight">
              Welcome back,{' '}
              <span className="text-gold italic font-normal">{profile?.first_name || 'Client'}</span>
            </h1>

            <p className="text-neutral-300 font-body text-xs sm:text-sm max-w-lg leading-relaxed">
              {activeBookings.length > 0 ? (
                <>
                  You have <strong className="text-white font-semibold">{activeBookings.length} active session{activeBookings.length !== 1 ? 's' : ''}</strong> on record.
                  {upcoming > 0 && <span> · <strong className="text-gold">{upcoming} confirmed shoot{upcoming !== 1 ? 's' : ''}</strong></span>}
                </>
              ) : (
                'Review your photo deliverables, schedule your next photoshoot, or track studio order milestones.'
              )}
            </p>

            {/* Actions + Integrated Quick Tools Dock */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                to="/dashboard/book"
                className="btn-primary py-2 px-4 text-xs flex items-center gap-2 shadow-lg shadow-gold/20 hover:scale-105 transition-all"
              >
                <Camera size={15} /> Book a Session
              </Link>

              {/* Minimalist Quick Tools Dock */}
              <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-700/80 rounded-xl p-1 backdrop-blur-md shadow-xs">
                {QUICK_TOOLS.map((tool) => (
                  <div key={tool.id} className="relative group/tool">
                    <button
                      type="button"
                      onClick={() => handleOpenTool(tool.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-gold hover:bg-neutral-800 transition-all hover:scale-110 active:scale-95"
                      aria-label={tool.label}
                    >
                      <tool.icon size={15} />
                    </button>
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tool:flex items-center px-2 py-1 rounded-md text-[10px] font-semibold bg-neutral-900 text-white shadow-xl whitespace-nowrap z-50 animate-fade-in border border-neutral-700">
                      {tool.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <LiveClock variant="card" />
          </div>
        </div>
      </div>

      {/* ── 2. Pending Downpayment Notice Banner (Strictly > ₱0) ─────────── */}
      {pendingDownpaymentBooking && pendingDownpaymentAmount > 0 && (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-700/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
              <CreditCard size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                  Downpayment Required
                </span>
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  #{pendingDownpaymentBooking.booking_number}
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                A 50% reservation downpayment of <strong className="text-amber-700 dark:text-amber-400 font-bold">₱{pendingDownpaymentAmount.toLocaleString()}</strong> is required to lock in your camera bay slot.
              </p>
            </div>
          </div>

          <Link
            to="/dashboard/payments"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center gap-1.5"
          >
            <CreditCard size={14} />
            <span>Pay ₱{pendingDownpaymentAmount.toLocaleString()}</span>
          </Link>
        </div>
      )}

      {/* ── 3. Overview Metrics Strip ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <StatCard
            key={i}
            label={s.label}
            value={s.value}
            icon={s.icon}
            color={s.tier}
          />
        ))}
      </div>

      {/* ── 4. Main Balanced Operations Grid ────────────────────────────── */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Active Sessions (7 cols for balanced proportions) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs overflow-hidden">

            {/* Section Header */}
            <div className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Calendar size={17} className="text-gold" />
                <h3 className="font-heading text-base font-bold text-primary dark:text-neutral-100">
                  Active Sessions
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gold/15 text-gold border border-gold/30">
                  {filteredBookings.length}
                </span>
              </div>
              <Link
                to="/dashboard/bookings"
                className="text-xs font-semibold text-neutral-500 hover:text-gold flex items-center gap-1 transition-colors group/link"
              >
                <span>All Records</span>
                <ChevronRight size={13} className="transition-transform group-hover/link:translate-x-0.5" />
              </Link>
            </div>

            {/* Filter Strip & Dropdowns */}
            <div className="px-5 py-3 bg-neutral-50/30 dark:bg-neutral-900/30 border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter size={13} className="text-gold shrink-0" />
                {[
                  { id: 'ALL',        label: 'All' },
                  { id: 'THIS_MONTH', label: 'This Month' },
                  { id: 'NEXT_30',    label: 'Next 30d' },
                  { id: 'PAST',       label: 'Past' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDateFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      dateFilter === tab.id
                        ? 'bg-neutral-900 dark:bg-neutral-800 text-white shadow-2xs font-semibold'
                        : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200/80 dark:border-neutral-800 hover:border-gold/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}

                {/* Month Dropdown Selector */}
                <div className="inline-flex items-center gap-1.5 z-50">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase whitespace-nowrap">Month:</span>
                  <StudioDropdown
                    value={customMonth}
                    onChange={(val) => { setCustomMonth(val); setDateFilter('CUSTOM'); }}
                    options={Array.from({ length: 13 }).map((_, i) => {
                      const d = new Date();
                      d.setMonth(d.getMonth() - 6 + i);
                      return {
                        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                        label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      };
                    })}
                    placeholder="Select Month"
                    className="w-36"
                    triggerClassName="py-1 px-3 text-xs bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-400">
                  Total: <strong className="text-primary dark:text-neutral-200 font-bold">₱{filteredTotalValue.toLocaleString()}</strong>
                </span>
                {dateFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setDateFilter('ALL')}
                    className="text-gold hover:text-gold-dark text-xs font-semibold flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw size={11} /> Reset
                  </button>
                )}
              </div>
            </div>

            {/* Session Cards */}
            <div className="p-4 sm:p-5 space-y-4">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((b) => {
                  const days = daysUntil(b.event_date);
                  const steps = getProgressSteps(b.status);
                  const currentStep = steps.find(s => s.current || s.active) || steps.find(s => !s.completed) || steps[steps.length - 1];
                  const doneCount = steps.filter(s => s.completed || s.done).length;
                  const isTracked = trackedSession?.id === b.id;
                  const isUnpaid = !b.payment_status || b.payment_status.toUpperCase() === 'UNPAID';
                  const remBal = Number(b.remaining_balance ?? b.total_amount ?? 0);
                  
                  // Downpayment is only due if balance is strictly > 0 AND downpayment amount > 0
                  const needsDownpayment = remBal > 0 && (isUnpaid || remBal > 0) && (!b.down_payment_confirmed && Number(b.down_payment_amount || 0) === 0);
                  const cardDownAmount = remBal > 0 ? Math.min(remBal, Math.max(500, Math.round(Number(b.total_amount || 0) * 0.5))) : 0;

                  // Customer Name (Primary Identifier)
                  const bookingCustomer = b.student_details?.full_name || b.student_details?.name || b.customer_name || clientFullName;

                  // Acquired Set Tier
                  const acquiredSet = b.tier_name || 'Standard Set';

                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedTrackingId(b.id)}
                      className={`rounded-3xl border transition-all cursor-pointer p-5 space-y-4 ${
                        isTracked
                          ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.06] border-gold shadow-md ring-2 ring-gold/30'
                          : 'bg-white dark:bg-neutral-900 border-neutral-200/90 dark:border-neutral-800 hover:border-gold/50 hover:shadow-sm'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Left Side: Avatar & Name */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-neutral-900 dark:bg-neutral-800 text-gold font-body font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                            {bookingCustomer.charAt(0) || 'C'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold font-body">Client</span>
                              {isTracked && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full font-body" title="Currently Tracking">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                </span>
                              )}
                            </div>
                            <h4 className="font-body text-base font-bold text-primary dark:text-neutral-100 leading-none">
                              {bookingCustomer}
                            </h4>
                          </div>
                        </div>

                        {/* Middle: Status & ID */}
                        <div className="flex items-center gap-3 ml-auto mr-auto pl-4 border-l border-transparent sm:border-neutral-200 dark:sm:border-neutral-800">
                          {b.status === 'PHOTOGRAPHER_ASSIGNED' ? (
                            <span className="px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border bg-primary/10 text-primary border-primary/30 flex items-center gap-1.5 font-body">
                              <Camera size={12} /> Assigned
                            </span>
                          ) : (
                            <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border ${getStatusBadge(b.status)} font-body flex items-center gap-1.5`}>
                              {getStatusLabel(b.status)}
                            </span>
                          )}
                          <span className="text-[11px] text-neutral-400 font-medium font-body">#{b.booking_number}</span>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {days !== null && days >= 0 && (
                            <span className="px-3 py-1.5 rounded-full text-xs font-bold text-gold-dark dark:text-gold bg-gold/10 border border-gold/20 flex items-center gap-1">
                              <Clock size={13} /> {days === 0 ? 'Today' : `${days}d`}
                            </span>
                          )}
                          <button onClick={() => handleOpenTool('qr', b)} className="w-9 h-9 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-gold hover:text-gold flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-neutral-600 dark:text-neutral-300 shadow-xs">
                            <QrCode size={14} />
                          </button>
                          <Link to={`/dashboard/bookings/${b.id}`} className="w-9 h-9 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-primary dark:hover:border-neutral-400 hover:text-primary dark:hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-neutral-600 dark:text-neutral-300 shadow-xs">
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </div>

                      <div className="w-full h-px bg-neutral-100 dark:bg-neutral-800/80" />

                      {/* Bottom Section */}
                      <div className="flex flex-wrap items-start justify-between gap-5 w-full">
                        {/* Left: Package & Set Info */}
                        <div className="space-y-3 font-body">
                           <div className="flex items-center gap-2 text-primary dark:text-neutral-100 font-bold text-sm">
                             <Layers size={14} className="text-gold shrink-0" />
                             <span>{b.service?.name || 'Studio Portrait Session'}</span>
                           </div>
                           <span className="inline-flex items-center gap-1.5 text-gold-dark dark:text-gold bg-gold/10 border border-gold/20 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs">
                             <Tag size={12} /> Set: {acquiredSet}
                           </span>
                        </div>

                        {/* Right: Date & Payment Info */}
                        <div className="space-y-3 text-right font-body flex flex-col items-end">
                           <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 p-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                             <Calendar size={13} className="text-gold" /> 
                             {b.event_date ? new Date(b.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
                           </div>
                           <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                             <CreditCard size={13} className="text-gold" />
                             <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                               {getPaymentLabel(b.payment_status)}
                             </span>
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mx-auto mb-3">
                    <Calendar size={22} />
                  </div>
                  <h4 className="font-heading text-base font-bold text-primary dark:text-neutral-100 mb-1">
                    {dateFilter !== 'ALL' ? 'No Sessions in Range' : 'No Active Sessions'}
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto mb-4">
                    {dateFilter !== 'ALL' ? 'Try adjusting your date filter.' : 'Your active photo sessions will appear here.'}
                  </p>
                  {dateFilter !== 'ALL' ? (
                    <button type="button" onClick={() => setDateFilter('ALL')} className="btn-outline inline-flex text-xs items-center gap-1.5 py-1.5 px-3.5">
                      <RefreshCw size={12} /> Reset Filter
                    </button>
                  ) : (
                    <Link to="/dashboard/book" className="btn-primary inline-flex text-xs py-2 px-4">
                      Book a Session
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Status Tracker & Tabbed Studio Hub (5 cols for perfect balanced height) */}
        <div className="lg:col-span-5 space-y-4">

          {/* A. Status Tracker */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/90 dark:border-neutral-800 shadow-xs">
            <div className="flex justify-between items-center mb-5 font-body">
              <h3 className="text-neutral-400 font-bold uppercase tracking-widest text-xs">
                Progress
              </h3>
              {trackedSession && (
                <span className="text-[11px] font-mono font-bold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                  #{trackedSession.booking_number}
                </span>
              )}
            </div>

            {trackedSession ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1 font-body">
                    <p className="text-sm font-bold text-primary dark:text-neutral-100 truncate">
                      {trackedSession.service?.name || 'Studio Session'}
                    </p>
                    {trackedSession.status === 'PHOTOGRAPHER_ASSIGNED' ? (
                      <span className="px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border bg-primary/10 text-primary border-primary/30 flex items-center gap-1.5">
                        <Camera size={12} /> Assigned
                      </span>
                    ) : (
                      <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border ${getStatusBadge(trackedSession.status)}`}>
                        {getStatusLabel(trackedSession.status)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gold-dark dark:text-gold font-bold">
                    Set: {trackedSession.tier_name || 'Standard'}
                  </p>
                </div>

                {/* Interactive Visual Stage Pipeline */}
                <div className="py-2">
                  <div className="flex items-center justify-between relative px-2">
                    {/* Background line */}
                    <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-neutral-100 dark:bg-neutral-800 z-0" />
                    
                    {getProgressSteps(trackedSession.status, !!trackedSession.photographer || !!trackedSession.photographer_id).map((step, idx) => {
                      const icons = [CheckSquare, Calendar, Camera, Palette, PackageCheck];
                      const StepIcon = icons[idx] || CheckCircle;
                      const isComplete = step.completed || step.done;
                      const isActive = step.current || step.active;

                      return (
                        <div key={idx} className="relative group/step z-10 flex flex-col items-center">
                          <div
                            className={`w-9 h-9 flex items-center justify-center transition-all duration-300 ${
                              isComplete
                                ? 'bg-emerald-500 text-white rounded-xl shadow-xs scale-100'
                                : isActive
                                ? 'bg-amber-100 dark:bg-amber-900/40 text-gold-dark dark:text-gold rounded-full ring-4 ring-amber-50 dark:ring-amber-900/20 scale-110 shadow-sm'
                                : 'bg-white dark:bg-neutral-900 text-neutral-300 dark:text-neutral-600 rounded-full border-2 border-neutral-100 dark:border-neutral-800'
                            }`}
                          >
                            <StepIcon size={isComplete ? 16 : 14} />
                          </div>
                          
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/step:flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold bg-neutral-900 text-white shadow-xl whitespace-nowrap z-50 animate-fade-in border border-neutral-700">
                            {step.label} {isComplete ? '✓' : isActive ? '(Active)' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-neutral-400 font-medium">
                    Stage {getProgressSteps(trackedSession.status, !!trackedSession.photographer || !!trackedSession.photographer_id).filter(s => s.completed || s.done).length} of 5 Complete
                  </span>
                  <Link
                    to="/dashboard/progress"
                    className="text-gold font-bold hover:underline flex items-center gap-1 text-[11px] group/arrow"
                  >
                    <span>Timeline</span>
                    <ArrowRight size={12} className="transition-transform group-hover/arrow:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-neutral-400">
                <CalendarPlus size={20} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-xs">No active session selected</p>
              </div>
            )}
          </div>

          {/* B. Tabbed Studio Schedule & Bulletins Hub (Harmonizes height with left column) */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/90 dark:border-neutral-800 shadow-xs">
            {/* Tab Controller */}
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRightTab('calendar')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    rightTab === 'calendar'
                      ? 'bg-white dark:bg-neutral-900 text-primary dark:text-white shadow-2xs'
                      : 'text-neutral-500 hover:text-primary dark:hover:text-white'
                  }`}
                >
                  <CalendarDays size={13} className={rightTab === 'calendar' ? 'text-gold' : ''} />
                  <span>Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab('bulletins')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    rightTab === 'bulletins'
                      ? 'bg-white dark:bg-neutral-900 text-primary dark:text-white shadow-2xs'
                      : 'text-neutral-500 hover:text-primary dark:hover:text-white'
                  }`}
                >
                  <Bell size={13} className={rightTab === 'bulletins' ? 'text-gold' : ''} />
                  <span>Bulletins</span>
                  {notifications.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-gold/20 text-gold text-[9px] font-bold flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
              </div>

              {rightTab === 'bulletins' && (
                <Link to="/dashboard/notifications" className="text-xs font-semibold text-gold hover:underline">
                  View All
                </Link>
              )}
            </div>

            {/* Content: Calendar View */}
            {rightTab === 'calendar' && (
              <div className="animate-fade-in">
                <SidebarOrderCalendar bookings={bookings} />
              </div>
            )}

            {/* Content: Bulletins View */}
            {rightTab === 'bulletins' && (
              <div className="space-y-2.5 animate-fade-in py-1">
                {notifications.length > 0 ? (
                  notifications.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      className="relative group/bulletin p-3 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/40 hover:bg-gold/10 dark:hover:bg-gold/10 border border-neutral-100 dark:border-neutral-800/80 hover:border-gold/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-primary dark:text-neutral-200 truncate group-hover/bulletin:text-gold transition-colors">
                          {n.title}
                        </p>
                        <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                          {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-400 text-center py-6">No bulletins at this time</p>
                )}
              </div>
            )}
          </div>

          {/* C. Assigned Photographer (Hover Bulletin) */}
          {trackedSession?.photographer && (
            <div className="relative group/photographer-bulletin">
              <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 flex items-center justify-between cursor-pointer hover:border-gold/50 hover:shadow-sm transition-all shadow-xs">
                 <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shrink-0 overflow-hidden">
                      {trackedSession.photographer.profile?.avatar_url ? (
                        <img src={trackedSession.photographer.profile.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                      ) : (
                        <Camera size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-0.5">Assigned Photographer</p>
                      <p className="text-sm font-bold text-primary dark:text-neutral-100 truncate">
                        {trackedSession.photographer.profile?.first_name} {trackedSession.photographer.profile?.last_name}
                      </p>
                    </div>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-400 group-hover/photographer-bulletin:text-gold transition-colors">
                   <User size={14} />
                 </div>
              </div>

              {/* Hover Dropdown / Bulletin Description */}
              <div className="absolute bottom-full left-0 right-0 mb-3 opacity-0 invisible group-hover/photographer-bulletin:opacity-100 group-hover/photographer-bulletin:visible transition-all duration-300 z-50">
                 <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-3xl shadow-xl p-5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-xl pointer-events-none" />
                   <div className="flex flex-col gap-4 relative z-10">
                      <div className="flex items-center gap-4">
                         <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm shrink-0 border border-neutral-100 dark:border-neutral-800">
                            {trackedSession.photographer.profile?.avatar_url ? (
                               <img 
                                 src={trackedSession.photographer.profile.avatar_url} 
                                 className="w-full h-full object-cover" 
                               />
                            ) : (
                               <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                                 <Camera size={20} />
                               </div>
                            )}
                         </div>
                         <div>
                           <h5 className="font-heading font-bold text-base text-primary dark:text-neutral-100">
                             {trackedSession.photographer.profile?.first_name} {trackedSession.photographer.profile?.last_name}
                           </h5>
                           <p className="text-[11px] uppercase tracking-wider text-gold font-bold mt-0.5">
                             {trackedSession.photographer.specialization || 'Lead Photographer'}
                           </p>
                         </div>
                      </div>
                      {trackedSession.photographer.bio && (
                         <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                           <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed italic">
                             "{trackedSession.photographer.bio}"
                           </p>
                         </div>
                      )}
                   </div>
                 </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── 5. Tools Modal ─────────────────────────────────────────────── */}
      <ClientToolsHub
        isOpen={toolsModalOpen}
        onClose={() => setToolsModalOpen(false)}
        initialTool={activeTool}
        bookings={bookings}
        selectedBooking={qrModalBooking}
      />

    </div>
  );
}