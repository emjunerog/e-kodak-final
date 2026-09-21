import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertCircle,
  BookOpen,
  Search,
  Download,
  LayoutGrid,
  Table as TableIcon,
  MoreVertical,
  ArrowRightLeft,
  CreditCard,
  Copy,
  Check,
  Eye,
  Camera,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CategorizedMetricStrip from '../../components/admin/CategorizedMetricStrip';
import BookingLifecycleBadge from '../../components/admin/BookingLifecycleBadge';
import BookingQuickInspector from '../../components/admin/BookingQuickInspector';
import CustomDropdown from '../../components/ui/CustomDropdown';
import { getDashboardStats, getRecentBookings, getPendingBookings } from '../../services/adminService';
import { updateBookingStatus } from '../../services/bookingAdminService';

// ── Date formatting helper ─────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon = BookOpen, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon size={32} className="text-neutral-300 mb-3" />
      <p className="text-sm text-neutral-400 font-body">{message}</p>
    </div>
  );
}

// ── Row Action Dropdown ────────────────────────────────────────────────────────
function RowActionDropdown({ booking, onInspect, onFastConfirm }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(booking.booking_number);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 1200);
  };

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-primary hover:bg-neutral-100 transition-colors"
        title="Direct booking tools"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-neutral-200/80 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 font-body">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspect?.(booking);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-primary font-medium text-left"
          >
            <Eye size={13} className="text-gold" />
            <span>Quick Inspect & Edit</span>
          </button>

          {booking.status === 'PENDING' && onFastConfirm && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFastConfirm(booking.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-blue-700 hover:bg-blue-50 font-semibold text-left"
            >
              <CheckCircle2 size={13} className="text-blue-600" />
              <span>1-Click Confirm Schedule</span>
            </button>
          )}

          <Link
            to={`/admin/workstation?bookingId=${booking.id}`}
            className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-primary font-medium"
            onClick={() => setOpen(false)}
          >
            <ArrowRightLeft size={13} className="text-blue-500" />
            <span>Transfer to Workstation</span>
          </Link>

          <Link
            to={`/admin/payments`}
            className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-primary font-medium"
            onClick={() => setOpen(false)}
          >
            <CreditCard size={13} className="text-emerald-500" />
            <span>Record Payment</span>
          </Link>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-primary font-medium border-t border-neutral-100 mt-1 text-left"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-500" />
                <span className="text-emerald-600 font-semibold">Copied Ref!</span>
              </>
            ) : (
              <>
                <Copy size={13} className="text-neutral-400" />
                <span>Copy Ref #{booking.booking_number}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [pending, setPending] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTables, setLoadingTables] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modular Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table');
  const [activePreset, setActivePreset] = useState('ALL');

  // Direct Management State
  const [inspectingBooking, setInspectingBooking] = useState(null);
  const [selectedBookingIds, setSelectedBookingIds] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);

  const load = async () => {
    setIsRefreshing(true);
    setLoadingStats(true);
    setLoadingTables(true);
    setError(null);

    const [statsRes, recentRes, pendingRes] = await Promise.all([
      getDashboardStats(),
      getRecentBookings(15),
      getPendingBookings(6),
    ]);

    if (statsRes.error || recentRes.error || pendingRes.error) {
      const errDetail = statsRes.error?.message || recentRes.error?.message || pendingRes.error?.message;
      setError(`Database notice: ${errDetail || 'Live metrics require active database credentials.'}`);
    }

    setStats(statsRes.data);
    setRecent(recentRes.data || []);
    setPending(pendingRes.data || []);
    setLoadingStats(false);
    setLoadingTables(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1-Click fast confirm action
  const handleFastConfirm = async (bookingId) => {
    setRecent((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b))
    );
    try {
      const { error } = await updateBookingStatus(bookingId, 'CONFIRMED', 'Quick Confirmed via Dashboard Action', profile?.id);
      if (error) throw error;
      showToast('✓ Booking successfully confirmed!');
      await load();
    } catch (err) {
      console.error('Fast confirm failed:', err);
      showToast('Failed to confirm booking.');
      await load();
    }
  };

  // Status updated from inspector drawer
  const handleInspectorStatusUpdated = async (bookingId, newStatus) => {
    showToast(`Status updated to ${newStatus}`);
    await load();
    const updatedItem = recent.find((b) => b.id === bookingId);
    if (updatedItem) {
      setInspectingBooking({ ...updatedItem, status: newStatus });
    }
  };

  // Filtered recent bookings based on search, dropdowns, and presets
  const filteredBookings = useMemo(() => {
    return recent.filter((b) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const numMatch = b.booking_number?.toLowerCase().includes(q);
      const nameMatch = `${b.customer?.first_name || ''} ${b.customer?.last_name || ''}`.toLowerCase().includes(q);
      const serviceMatch = b.service?.name?.toLowerCase().includes(q);
      const matchesSearch = !q || numMatch || nameMatch || serviceMatch;

      // Status & Clearance filter (or smart preset)
      const effectiveFilter = statusFilter !== 'ALL' ? statusFilter : activePreset;
      let matchesStatus = true;
      if (effectiveFilter === 'PAID' || effectiveFilter === 'CLEARED') {
        matchesStatus = b.payment_status === 'PAID';
      } else if (effectiveFilter === 'UNPAID') {
        matchesStatus = ['UNPAID', 'PARTIAL'].includes(b.payment_status);
      } else if (effectiveFilter === 'PENDING') {
        matchesStatus = b.status?.toUpperCase() === 'PENDING';
      } else if (effectiveFilter === 'CONFIRMED') {
        matchesStatus = b.status?.toUpperCase() === 'CONFIRMED';
      } else if (effectiveFilter === 'CAPTURE' || effectiveFilter === 'PRODUCTION') {
        matchesStatus = ['PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 'EDITING', 'PRINTING', 'READY'].includes(b.status?.toUpperCase());
      } else if (effectiveFilter === 'READY') {
        matchesStatus = b.status?.toUpperCase() === 'READY';
      } else if (effectiveFilter === 'COMPLETED') {
        matchesStatus = b.status?.toUpperCase() === 'COMPLETED';
      } else if (effectiveFilter !== 'ALL') {
        matchesStatus = b.status?.toUpperCase() === effectiveFilter;
      }

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'ALL' && b.event_date) {
        const eventDate = new Date(b.event_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'TODAY') {
          const checkDate = new Date(eventDate);
          checkDate.setHours(0, 0, 0, 0);
          matchesDate = checkDate.getTime() === today.getTime();
        } else if (dateFilter === 'NEXT_7') {
          const next7 = new Date(today);
          next7.setDate(next7.getDate() + 7);
          matchesDate = eventDate >= today && eventDate <= next7;
        } else if (dateFilter === 'THIS_MONTH') {
          matchesDate = eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear();
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [recent, searchQuery, statusFilter, dateFilter, activePreset]);

  // Export to CSV function
  const handleExportCSV = (recordsToExport = filteredBookings) => {
    if (recordsToExport.length === 0) return;
    const headers = ['Booking Number', 'Customer First Name', 'Customer Last Name', 'Service', 'Event Date', 'Status', 'Payment Status'];
    const rows = recordsToExport.map((b) => [
      b.booking_number || '',
      b.customer?.first_name || '',
      b.customer?.last_name || '',
      b.service?.name || '',
      b.event_date || '',
      b.status || '',
      b.payment_status || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ekodak_operational_queue_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Multi-select helpers
  const handleToggleSelectAll = () => {
    if (selectedBookingIds.size === filteredBookings.length) {
      setSelectedBookingIds(new Set());
    } else {
      setSelectedBookingIds(new Set(filteredBookings.map((b) => b.id)));
    }
  };

  const handleToggleSelectRow = (id) => {
    const next = new Set(selectedBookingIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedBookingIds(next);
  };

  // Batch confirm
  const handleBatchConfirm = async () => {
    const ids = Array.from(selectedBookingIds);
    const pendingToConfirm = recent.filter((b) => ids.includes(b.id) && b.status === 'PENDING');
    if (pendingToConfirm.length === 0) {
      showToast('No pending bookings selected to confirm.');
      return;
    }

    try {
      await Promise.all(
        pendingToConfirm.map((b) =>
          updateBookingStatus(b.id, 'CONFIRMED', 'Batch Confirmed via Dashboard Toolbar', profile?.id)
        )
      );
      showToast(`Batch confirmed ${pendingToConfirm.length} bookings!`);
      setSelectedBookingIds(new Set());
      await load();
    } catch (err) {
      console.error('Batch confirm error:', err);
      showToast('Error during batch confirmation.');
    }
  };

  // Status & Clearance Filter Options with 3-color palette
  const statusOptions = [
    { value: 'ALL', label: 'All Statuses & Payments', dotColor: 'bg-neutral-400', badge: stats?.total },
    { value: 'PENDING', label: 'Pending Review', dotColor: 'bg-gold', badge: stats?.pending },
    { value: 'CONFIRMED', label: 'Confirmed', dotColor: 'bg-primary', badge: stats?.confirmed },
    { value: 'PHOTOGRAPHER_ASSIGNED', label: 'Photographer Assigned', dotColor: 'bg-primary' },
    { value: 'CAPTURE', label: 'In Studio Bay', dotColor: 'bg-gold' },
    { value: 'EDITING', label: 'In Post-Processing', dotColor: 'bg-primary' },
    { value: 'READY', label: 'Ready for Pickup', dotColor: 'bg-gold', badge: stats?.ready },
    { value: 'COMPLETED', label: 'Completed', dotColor: 'bg-neutral-400', badge: stats?.completed },
    { value: 'PAID', label: 'Cleared (Paid Only)', dotColor: 'bg-neutral-400', badge: stats?.cleared },
    { value: 'UNPAID', label: 'Pending Clearance (Unpaid)', dotColor: 'bg-gold', badge: stats?.unpaid_partial },
    { value: 'CANCELLED', label: 'Cancelled / Void', dotColor: 'bg-neutral-300' },
  ];

  // Date Filter Options
  const dateOptions = [
    { value: 'ALL', label: 'All Calendar Dates' },
    { value: 'TODAY', label: "Today's Schedule Only" },
    { value: 'NEXT_7', label: 'Next 7 Days' },
    { value: 'THIS_MONTH', label: 'This Month' },
  ];

  const operationalSummary = stats
    ? `${stats.pending || 0} bookings awaiting review · ${stats.active_jobs || 0} active photo sessions · All departmental logs synchronized.`
    : 'Admin dashboard operational.';

  const userRole = profile?.role || 'admin';

  return (
    <div className="space-y-7 animate-fade-in max-w-screen-2xl mx-auto pb-16 font-body">

      {/* ── 1. Hero Banner ─────────────────────────────────────────────── */}
      <AdminHeroBanner
        station={userRole}
        userName={profile?.first_name || 'Administrator'}
        statusSummary={operationalSummary}
        primaryAction={{
          label: 'Manage Bookings',
          href: '/admin/bookings',
          icon: CalendarDays,
        }}
        secondaryAction={{
          label: 'Record Payment',
          href: '/admin/payments',
          icon: CreditCard,
        }}
        onRefresh={load}
        isRefreshing={isRefreshing}
        onExport={() => handleExportCSV()}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-neutral-700 flex items-center gap-2 text-xs font-semibold"
          >
            <CheckCircle2 size={16} className="text-gold" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4 text-sm font-body shadow-xs">
          <AlertCircle size={18} className="flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-semibold">Notice</p>
            <p className="text-xs text-amber-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── 2. Categorized Key Metrics ─────────────────────────────────── */}
      <CategorizedMetricStrip
        stats={stats}
        loading={loadingStats}
        activeFilter={statusFilter}
        onSelectFilter={(filterKey) => {
          setActivePreset('ALL');
          setStatusFilter((prev) => (prev === filterKey ? 'ALL' : filterKey));
        }}
      />

      {/* ── 3. Operational Queue & Needs Attention Split Layout ─────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 items-start">

        {/* Main Queue: 2-Columns */}
        <div className="xl:col-span-2 space-y-4">

          {/* Section Header & Modular Control Bar */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs p-4 sm:p-5 space-y-4">

            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div>
                <h3 className="font-heading text-base text-primary font-bold">
                  Bookings & Production Queue
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* View switcher */}
                <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/60 h-9">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`h-7 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                      viewMode === 'table'
                        ? 'bg-white text-primary shadow-xs'
                        : 'text-neutral-500 hover:text-primary'
                    }`}
                    title="Table View"
                  >
                    <TableIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`h-7 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                      viewMode === 'cards'
                        ? 'bg-white text-primary shadow-xs'
                        : 'text-neutral-500 hover:text-primary'
                    }`}
                    title="Grid Cards View"
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportCSV()}
                  disabled={filteredBookings.length === 0}
                  className="btn-ghost h-9 px-3 text-xs flex items-center gap-1.5 border border-neutral-200 rounded-xl"
                  title="Export to CSV"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>

                <Link
                  to="/admin/bookings"
                  className="h-9 flex items-center gap-1 text-xs font-semibold text-gold hover:text-primary transition-colors px-2"
                >
                  <span>All Records</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1 border-t border-neutral-100">

              {/* Search Bar */}
              <div className="sm:col-span-5 relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search client, ref #, service..."
                  className="w-full h-9 pl-9 pr-4 bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white rounded-xl text-xs font-body border border-neutral-200/80 focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-all shadow-2xs"
                />
              </div>

              {/* Status Custom Dropdown */}
              <div className="sm:col-span-4">
                <CustomDropdown
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setActivePreset('ALL');
                  }}
                  options={statusOptions}
                  placeholder="Filter by Status"
                  className="w-full"
                  popoverWidth="w-60"
                />
              </div>

              {/* Date Horizon Custom Dropdown */}
              <div className="sm:col-span-3">
                <CustomDropdown
                  value={dateFilter}
                  onChange={setDateFilter}
                  options={dateOptions}
                  placeholder="Filter Dates"
                  className="w-full"
                  popoverWidth="w-52"
                />
              </div>

            </div>

            {/* Active Filter Indicator Bar */}
            {(statusFilter !== 'ALL' || dateFilter !== 'ALL' || searchQuery) && (
              <div className="flex items-center justify-between gap-2 pt-2 text-xs bg-amber-50/70 border border-amber-200/70 px-3.5 py-2 rounded-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neutral-800">Active Filter:</span>
                  {statusFilter !== 'ALL' && (
                    <span className="px-2 py-0.5 rounded-md bg-gold/20 text-gold-dark font-bold text-[11px] flex items-center gap-1">
                      Status: {statusFilter}
                    </span>
                  )}
                  {dateFilter !== 'ALL' && (
                    <span className="px-2 py-0.5 rounded-md bg-neutral-200 text-neutral-800 font-bold text-[11px]">
                      Date: {dateFilter}
                    </span>
                  )}
                  {searchQuery && (
                    <span className="px-2 py-0.5 rounded-md bg-neutral-200 text-neutral-800 font-bold text-[11px]">
                      "{searchQuery}"
                    </span>
                  )}
                  <span className="text-neutral-500 font-medium">
                    ({filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} shown)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setDateFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="text-xs font-bold text-neutral-700 hover:text-neutral-950 underline cursor-pointer shrink-0"
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>

          {/* Queue View: Table vs Cards */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            {loadingTables ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-neutral-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredBookings.length === 0 ? (
              <EmptyState message="No matching bookings found for the selected filter." />
            ) : viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="bg-gradient-to-r from-neutral-50 to-neutral-100/70 border-b border-neutral-200/80 text-left text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                      <th className="px-4 py-3.5 w-10">
                        <input
                          type="checkbox"
                          checked={selectedBookingIds.size > 0 && selectedBookingIds.size === filteredBookings.length}
                          onChange={handleToggleSelectAll}
                          className="rounded border-neutral-300 text-gold focus:ring-gold/30 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3.5">Ref #</th>
                      <th className="px-4 py-3.5">Client & Package</th>
                      <th className="px-4 py-3.5 hidden md:table-cell">Schedule</th>
                      <th className="px-4 py-3.5">Status & Clearance</th>
                      <th className="px-4 py-3.5 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredBookings.map((booking) => {
                      const isChecked = selectedBookingIds.has(booking.id);
                      return (
                        <tr
                          key={booking.id}
                          onClick={() => setInspectingBooking(booking)}
                          title="Click row to inspect booking details"
                          className={`hover:bg-gold/8 hover:shadow-xs transition-all duration-150 group cursor-pointer ${
                            isChecked ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectRow(booking.id)}
                              className="rounded border-neutral-300 text-gold focus:ring-gold/30 cursor-pointer"
                            />
                          </td>

                          {/* Reference Number */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs font-bold text-gold group-hover:text-primary group-hover:underline transition-colors">
                              #{booking.booking_number}
                            </span>
                          </td>

                          {/* Customer & Service (Combined for high readability) */}
                          <td className="px-4 py-3.5">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-neutral-900 text-xs sm:text-sm group-hover:text-primary transition-colors">
                                {booking.customer?.first_name} {booking.customer?.last_name}
                              </p>
                              <p className="text-[11px] text-neutral-500 truncate max-w-[220px]">
                                {booking.service?.name || 'Studio Session'}
                              </p>
                            </div>
                          </td>

                          {/* Schedule */}
                          <td className="px-4 py-3.5 hidden md:table-cell text-xs text-neutral-600">
                            <div className="flex items-center gap-1.5">
                              <CalendarDays size={13} className="text-neutral-400 flex-shrink-0" />
                              <span>{formatDate(booking.event_date)}</span>
                            </div>
                          </td>

                          {/* Redesigned Clean Status & Payment Indicator */}
                          <td className="px-4 py-3.5">
                            <BookingLifecycleBadge
                              status={booking.status}
                              paymentStatus={booking.payment_status}
                              layout="stacked"
                            />
                          </td>

                          {/* Direct Actions Cell */}
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1-Click Fast Confirm on Pending */}
                              {booking.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => handleFastConfirm(booking.id)}
                                  className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-primary hover:bg-neutral-800 text-gold border border-gold/30 transition-all shadow-2xs flex items-center gap-1.5"
                                  title="1-Click Approve"
                                >
                                  <Check size={12} className="text-gold" />
                                  <span>Confirm</span>
                                </button>
                              )}

                              {/* Inspect button */}
                              <button
                                type="button"
                                onClick={() => setInspectingBooking(booking)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-gold-dark hover:bg-gold/10 transition-colors"
                                title="Inspect & Edit"
                              >
                                <Eye size={15} />
                              </button>

                              {/* 3-Dot Action Menu */}
                              <RowActionDropdown
                                booking={booking}
                                onInspect={(b) => setInspectingBooking(b)}
                                onFastConfirm={handleFastConfirm}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Modular Cards View */
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredBookings.map((booking) => {
                  const isChecked = selectedBookingIds.has(booking.id);
                  return (
                    <motion.div
                      key={booking.id}
                      whileHover={{ y: -2 }}
                      onClick={() => setInspectingBooking(booking)}
                      className={`rounded-2xl p-4 border transition-all space-y-3 cursor-pointer ${
                        isChecked
                          ? 'border-gold bg-amber-50/20 shadow-sm'
                          : 'border-neutral-200/80 bg-white hover:border-gold/50 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSelectRow(booking.id);
                            }}
                            className="rounded border-neutral-300 text-gold focus:ring-gold/30 cursor-pointer"
                          />
                          <div>
                            <span className="font-mono text-[11px] font-bold text-gold block">
                              #{booking.booking_number}
                            </span>
                            <h4 className="font-semibold text-primary text-sm">
                              {booking.customer?.first_name} {booking.customer?.last_name}
                            </h4>
                          </div>
                        </div>

                        <div onClick={(e) => e.stopPropagation()}>
                          <RowActionDropdown
                            booking={booking}
                            onInspect={(b) => setInspectingBooking(b)}
                            onFastConfirm={handleFastConfirm}
                          />
                        </div>
                      </div>

                      <div className="text-xs text-neutral-500 space-y-1">
                        <p className="truncate font-medium text-neutral-700">
                          {booking.service?.name || 'Photography Session'}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <CalendarDays size={12} className="text-neutral-400" />
                          <span>{formatDate(booking.event_date)}</span>
                        </p>
                      </div>

                      <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                        <BookingLifecycleBadge
                          status={booking.status}
                          paymentStatus={booking.payment_status}
                          layout="inline"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingBooking(booking);
                          }}
                          className="text-xs text-gold hover:text-primary font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Manage</span>
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Table footer */}
            <div className="p-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400 font-body">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold inline-block animate-pulse" />
                <span className="font-medium text-neutral-600">
                  {filteredBookings.length} {filteredBookings.length === 1 ? 'record' : 'records'} loaded from live database
                </span>
              </div>
              <Link
                to="/admin/bookings"
                className="flex items-center gap-1 text-gold hover:text-primary font-semibold transition-colors"
              >
                <span>Full Bookings Management</span>
                <ArrowRight size={12} />
              </Link>
            </div>

          </div>

        </div>

        {/* Side Panel: Needs Attention & Department Handover Desk (1-Column) */}
        <div className="space-y-6">

          {/* Needs Attention Panel */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-amber-50">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-sm text-primary font-bold">Needs Attention</h3>
                {!loadingTables && pending.length > 0 && (
                  <span className="text-xs font-bold text-white bg-amber-500 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                    {pending.length}
                  </span>
                )}
              </div>
            </div>

            {loadingTables ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : pending.length === 0 ? (
              <EmptyState icon={CheckCircle2} message="No pending items. All bookings processed!" />
            ) : (
              <div className="divide-y divide-neutral-100">
                {pending.map((booking) => (
                  <div
                    key={booking.id}
                    onClick={() => setInspectingBooking(booking)}
                    className="p-4 hover:bg-neutral-50/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] font-bold text-gold tracking-wide mb-0.5">
                          #{booking.booking_number}
                        </p>
                        <p className="text-sm font-semibold text-primary truncate">
                          {booking.service?.name || 'Session Intake'}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {booking.customer?.first_name} {booking.customer?.last_name}
                          {booking.event_date && ` · ${formatDate(booking.event_date)}`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingBooking(booking);
                        }}
                        className="flex-shrink-0 h-8 text-xs font-semibold text-primary border border-neutral-200 hover:bg-primary hover:text-white hover:border-primary px-2.5 rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="px-5 py-3.5 border-t border-neutral-100 bg-neutral-50/50">
              <Link
                to="/admin/bookings"
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-primary transition-colors py-0.5"
              >
                <span>Process all queue requests</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <h3 className="font-heading text-sm text-primary font-bold">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-px bg-neutral-100">
              {[
                { label: 'Record Payment', icon: CreditCard, href: '/admin/payments', color: 'text-gold-dark' },
                { label: 'Manage Bookings', icon: CalendarDays, href: '/admin/bookings', color: 'text-primary' },
                { label: 'Photographers', icon: Camera, href: '/admin/photographers', color: 'text-primary' },
                { label: 'Export CSV', icon: Download, action: true, color: 'text-neutral-600' },
              ].map((item, i) => {
                const Icon = item.icon;
                if (item.action) {
                  return (
                    <motion.button
                      key={i}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => handleExportCSV()}
                      className="flex flex-col items-center justify-center gap-2 py-5 bg-white hover:bg-neutral-50 transition-colors cursor-pointer group"
                    >
                      <div className={`w-9 h-9 rounded-xl bg-neutral-100 group-hover:bg-neutral-200 ${item.color} flex items-center justify-center transition-colors`}>
                        <Icon size={17} />
                      </div>
                      <span className="text-[11px] font-semibold text-neutral-600 text-center leading-tight">{item.label}</span>
                    </motion.button>
                  );
                }
                return (
                  <motion.div
                    key={i}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col"
                  >
                    <Link
                      to={item.href}
                      className="flex flex-col items-center justify-center gap-2 py-5 bg-white hover:bg-neutral-50 transition-colors group h-full"
                    >
                      <div className={`w-9 h-9 rounded-xl bg-neutral-100 group-hover:bg-neutral-200 ${item.color} flex items-center justify-center transition-colors`}>
                        <Icon size={17} />
                      </div>
                      <span className="text-[11px] font-semibold text-neutral-600 text-center leading-tight">{item.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* ── 4. Floating Multi-Select Direct Management Toolbar ─────────────── */}
      <AnimatePresence>
        {selectedBookingIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 25, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 25, x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-6 left-1/2 z-40 bg-neutral-950/95 backdrop-blur-xl text-white px-5 py-3 rounded-2xl shadow-2xl border border-neutral-700/80 flex items-center gap-4"
          >
            <div className="flex items-center gap-2 pr-3 border-r border-neutral-800">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span className="text-xs font-semibold">
                {selectedBookingIds.size} Selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchConfirm}
                className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 font-semibold"
              >
                <CheckCircle2 size={13} />
                <span>Batch Confirm</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const selectedList = recent.filter((b) => selectedBookingIds.has(b.id));
                  handleExportCSV(selectedList);
                }}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 border border-neutral-700 transition-colors"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedBookingIds(new Set())}
                className="text-neutral-400 hover:text-white text-xs px-2 py-1 transition-colors"
              >
                Deselect All
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 5. Direct Booking Quick Inspector Slide-Over Drawer ────────────── */}
      <BookingQuickInspector
        booking={inspectingBooking}
        isOpen={!!inspectingBooking}
        onClose={() => setInspectingBooking(null)}
        onStatusUpdated={handleInspectorStatusUpdated}
      />

    </div>
  );
}