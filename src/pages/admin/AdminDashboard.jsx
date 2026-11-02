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
  Layers,
  Table as TableIcon,
  MoreVertical,
  CreditCard,
  History,
  Copy,
  Check,
  Eye,
  RefreshCw,
  GraduationCap,
  Heart,
  Video,
  Clock,
  Sparkles,
  X,
  Building2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Megaphone,
  MapPin,
  Activity,
  FolderPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CategorizedMetricStrip from '../../components/admin/CategorizedMetricStrip';
import BookingLifecycleBadge from '../../components/admin/BookingLifecycleBadge';
import BookingQuickInspector from '../../components/admin/BookingQuickInspector';
import CustomDropdown from '../../components/ui/CustomDropdown';
import StudioRevenueTrendChart from '../../components/admin/dashboard/StudioRevenueTrendChart';
import StudioPackageShareChart from '../../components/admin/dashboard/StudioPackageShareChart';
import { supabase } from '../../lib/supabase';
import StudioOperationsHub from '../../components/admin/dashboard/StudioOperationsHub';
import { getDashboardStats, getRecentBookings, getPendingBookings } from '../../services/adminService';
import { updateBookingStatus, confirmAndScheduleBooking } from '../../services/bookingAdminService';
import { getEffectivePaymentStatus } from '../../lib/bookingUtils';

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
                onFastConfirm(booking);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-blue-700 hover:bg-blue-50 font-semibold text-left"
            >
              <CheckCircle2 size={13} className="text-blue-600" />
              <span>Confirm & Schedule Session</span>
            </button>
          )}

          <Link
            to={`/admin/activity-logs?search=${encodeURIComponent(booking.booking_number || '')}`}
            className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-primary font-medium"
            onClick={() => setOpen(false)}
          >
            <History size={13} className="text-gold" />
            <span>View Activity Logs</span>
          </Link>

          <Link
            to={`/admin/payments`}
            className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-primary font-medium"
            onClick={() => setOpen(false)}
          >
            <CreditCard size={13} className="text-emerald-500" />
            <span>Record Payment</span>
          </Link>

          <Link
            to={`/admin/photos?bookingId=${booking.id}`}
            className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-amber-900 hover:bg-amber-50 font-semibold"
            onClick={() => setOpen(false)}
          >
            <FolderPlus size={13} className="text-amber-600" />
            <span>Upload Soft Copies / Drive Link</span>
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
  const [servicesList, setServicesList] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTables, setLoadingTables] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modular Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table');
  const [activePreset, setActivePreset] = useState('ALL');

  // Pagination State for All Records
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Direct Management State
  const [inspectingBooking, setInspectingBooking] = useState(null);
  const [selectedBookingIds, setSelectedBookingIds] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);

  // Confirm & Schedule Pictorial Modal State
  const [schedulingBooking, setSchedulingBooking] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00:00');
  const [scheduleLocation, setScheduleLocation] = useState('E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu');
  const [scheduleRemarks, setScheduleRemarks] = useState('');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  const statsRef = useRef(stats);
  statsRef.current = stats;
  const recentRef = useRef(recent);
  recentRef.current = recent;

  const load = async (forceFresh = false) => {
    const hasData = statsRef.current !== null || recentRef.current.length > 0;
    if (!hasData) {
      setLoadingStats(true);
      setLoadingTables(true);
    }
    setIsRefreshing(true);
    setError(null);

    const [statsRes, recentRes, pendingRes, servicesRes, logsRes] = await Promise.all([
      getDashboardStats({ forceFresh }),
      getRecentBookings(1000), // Ingest all active studio booking records for full dashboard analytics
      getPendingBookings(15),
      supabase
        .from('services')
        .select('id, name, slug, category, base_price, is_active')
        .order('sort_order', { ascending: true }),
      supabase
        .from('admin_activity_logs')
        .select('id, action_type, entity_label, description, created_at')
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

    if (statsRes.error || recentRes.error || pendingRes.error) {
      const errDetail = statsRes.error?.message || recentRes.error?.message || pendingRes.error?.message;
      setError(`Database notice: ${errDetail || 'Live metrics require active database credentials.'}`);
    }

    if (statsRes.data) setStats(statsRes.data);
    if (recentRes.data) setRecent((recentRes.data || []).filter(b => !b.is_deleted));
    if (pendingRes.data) setPending((pendingRes.data || []).filter(b => !b.is_deleted));
    if (servicesRes?.data) setServicesList(servicesRes.data);
    if (logsRes?.data) setActivityLogs(logsRes.data);
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

  // Open the Confirm & Schedule Pictorial Modal
  const handleOpenConfirmScheduleModal = (booking) => {
    setSchedulingBooking(booking);
    setScheduleDate(booking.event_date ? booking.event_date.split('T')[0] : '');
    setScheduleTime(booking.preferred_time || '09:00:00');
    setScheduleLocation(booking.location || 'E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu');
    setScheduleRemarks('');
  };

  // Fast confirm action (triggers modal so admin adds schedule & location)
  const handleFastConfirm = (bookingOrId) => {
    const b = typeof bookingOrId === 'object' && bookingOrId !== null
      ? bookingOrId
      : recent.find((item) => item.id === bookingOrId);
    if (b) {
      handleOpenConfirmScheduleModal(b);
    }
  };

  // Submit confirmed schedule
  const handleConfirmAndScheduleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!schedulingBooking) return;
    if (!scheduleDate) {
      showToast('Please select a confirmed pictorial date.');
      return;
    }

    setIsSubmittingSchedule(true);
    try {
      const res = await confirmAndScheduleBooking({
        bookingId: schedulingBooking.id,
        eventDate: scheduleDate,
        preferredTime: scheduleTime,
        location: scheduleLocation,
        remarks: scheduleRemarks,
        changedById: profile?.id,
      });

      if (!res.success) throw res.error || new Error('Failed to confirm and schedule booking');

      showToast(`✓ Booking #${schedulingBooking.booking_number} approved & scheduled! Downpayment notice sent to customer.`);
      setSchedulingBooking(null);
      await load(true);
    } catch (err) {
      console.error('Confirm and schedule failed:', err);
      showToast('Error confirming booking: ' + (err.message || 'Database error'));
    } finally {
      setIsSubmittingSchedule(false);
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
      const effPayStatus = getEffectivePaymentStatus(b);
      let matchesStatus = true;
      if (effectiveFilter === 'PAID' || effectiveFilter === 'CLEARED') {
        matchesStatus = effPayStatus === 'PAID';
      } else if (effectiveFilter === 'DOWNPAYMENT') {
        matchesStatus = effPayStatus === 'DOWNPAYMENT';
      } else if (effectiveFilter === 'UNPAID') {
        matchesStatus = effPayStatus === 'UNPAID';
      } else if (effectiveFilter === 'PENDING') {
        matchesStatus = ['PENDING', 'RESERVED'].includes(b.status?.toUpperCase());
      } else if (effectiveFilter === 'CONFIRMED') {
        matchesStatus = ['CONFIRMED', 'PHOTOGRAPHER_ASSIGNED'].includes(b.status?.toUpperCase());
      } else if (effectiveFilter === 'CAPTURE' || effectiveFilter === 'PRODUCTION') {
        matchesStatus = ['CAPTURE', 'IN_PROGRESS'].includes(b.status?.toUpperCase());
      } else if (effectiveFilter === 'EDITING') {
        matchesStatus = b.status?.toUpperCase() === 'EDITING';
      } else if (effectiveFilter === 'RETOUCHING') {
        matchesStatus = b.status?.toUpperCase() === 'RETOUCHING';
      } else if (effectiveFilter === 'FINALIZED') {
        matchesStatus = ['FINALIZED', 'PRINTING'].includes(b.status?.toUpperCase());
      } else if (effectiveFilter === 'READY') {
        matchesStatus = ['READY', 'UNDER_DELIVERY'].includes(b.status?.toUpperCase());
      } else if (effectiveFilter === 'COMPLETED') {
        matchesStatus = b.status?.toUpperCase() === 'COMPLETED';
      } else if (effectiveFilter !== 'ALL') {
        matchesStatus = b.status?.toUpperCase() === effectiveFilter;
      }

      // Category filter (College, Senior High, Wedding)
      let matchesCategory = true;
      if (categoryFilter !== 'ALL') {
        const cat = (b.service?.category || '').toLowerCase();
        const servName = (b.service?.name || '').toLowerCase();
        const notes = (b.notes || '').toLowerCase();

        if (categoryFilter === 'college') {
          matchesCategory = cat === 'college' || servName.includes('college') || notes.includes('college');
        } else if (categoryFilter === 'senior-high') {
          matchesCategory = cat === 'senior-high' || servName.includes('senior high') || notes.includes('senior high') || notes.includes('shs');
        } else if (categoryFilter === 'wedding') {
          matchesCategory = cat.startsWith('wedding') || servName.includes('wedding') || notes.includes('wedding');
        } else if (categoryFilter === 'wedding-photo') {
          matchesCategory = cat === 'wedding-photo' || (servName.includes('wedding') && servName.includes('photo'));
        } else if (categoryFilter === 'wedding-video') {
          matchesCategory = cat === 'wedding-video' || (servName.includes('wedding') && servName.includes('video'));
        }
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

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    });
  }, [recent, searchQuery, statusFilter, categoryFilter, dateFilter, activePreset]);

  // Calculate total pages and sliced records for pagination
  const totalPages = useMemo(() => {
    if (pageSize === 'ALL') return 1;
    return Math.max(1, Math.ceil(filteredBookings.length / Number(pageSize)));
  }, [filteredBookings.length, pageSize]);

  const paginatedBookings = useMemo(() => {
    if (pageSize === 'ALL') return filteredBookings;
    const size = Number(pageSize);
    const start = (page - 1) * size;
    return filteredBookings.slice(start, start + size);
  }, [filteredBookings, page, pageSize]);

  // Reset to first page when search or filter options change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, categoryFilter, dateFilter, activePreset, pageSize]);

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

  // Multi-select helpers (page-aware for paginated view)
  const handleToggleSelectAll = () => {
    const pageIds = paginatedBookings.map((b) => b.id);
    const allSelectedOnPage = pageIds.length > 0 && pageIds.every((id) => selectedBookingIds.has(id));
    const next = new Set(selectedBookingIds);
    if (allSelectedOnPage) {
      pageIds.forEach((id) => next.delete(id));
    } else {
      pageIds.forEach((id) => next.add(id));
    }
    setSelectedBookingIds(next);
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

  // Category Filter Options
  const categoryOptions = [
    { value: 'ALL', label: 'Categories' },
    { value: 'college', label: 'College Orders', icon: GraduationCap },
    { value: 'senior-high', label: 'Senior High School (SHS)', icon: Building2 },
    { value: 'wedding', label: 'Wedding (Photo & Video)', icon: Heart },
    { value: 'wedding-photo', label: 'Wedding — Photography', icon: Sparkles },
    { value: 'wedding-video', label: 'Wedding — Videography', icon: Video },
  ];

  // Status & Clearance Filter Options with 3-color palette
  const statusOptions = [
    { value: 'ALL', label: 'Status', dotColor: 'bg-neutral-400', badge: stats?.total },
    { value: 'PENDING', label: '1. Booking Received', dotColor: 'bg-gold', badge: stats?.pending },
    { value: 'CONFIRMED', label: '2. Approved & Reserved', dotColor: 'bg-primary', badge: stats?.confirmed },
    { value: 'PHOTOGRAPHER_ASSIGNED', label: '3. Photographer Assigned', dotColor: 'bg-indigo-600' },
    { value: 'CAPTURE', label: '4. Ongoing Pictorial', dotColor: 'bg-gold' },
    { value: 'EDITING', label: '5. Editing', dotColor: 'bg-primary' },
    { value: 'RETOUCHING', label: '6. Retouching', dotColor: 'bg-gold' },
    { value: 'FINALIZED', label: '7. Booking Finalized', dotColor: 'bg-primary' },
    { value: 'PRINTING', label: '8. Printing', dotColor: 'bg-gold' },
    { value: 'READY', label: '9. Ready for Pickup (Studio)', dotColor: 'bg-gold', badge: stats?.ready },
    { value: 'UNDER_DELIVERY', label: '10. Under Delivery', dotColor: 'bg-primary' },
    { value: 'COMPLETED', label: '11. Completed', dotColor: 'bg-neutral-400', badge: stats?.completed },
    { value: 'PAID', label: 'Cleared (Paid Only)', dotColor: 'bg-neutral-400', badge: stats?.cleared },
    { value: 'DOWNPAYMENT', label: 'Downpayment Received', dotColor: 'bg-gold' },
    { value: 'UNPAID', label: 'Pending Clearance (Unpaid)', dotColor: 'bg-gold', badge: stats?.unpaid_partial },
    { value: 'CANCELLED', label: 'Cancelled / Void', dotColor: 'bg-neutral-300' },
    { value: 'REJECTED', label: 'Rejected', dotColor: 'bg-rose-400' },
  ];

  // Date Filter Options
  const dateOptions = [
    { value: 'ALL', label: 'Calendar' },
    { value: 'TODAY', label: "Today's Schedule Only" },
    { value: 'NEXT_7', label: 'Next 7 Days' },
    { value: 'THIS_MONTH', label: 'This Month' },
  ];

  // Rows Per Page Options
  const pageSizeOptions = [
    { value: 10, label: '10 / page' },
    { value: 15, label: '15 / page' },
    { value: 25, label: '25 / page' },
    { value: 50, label: '50 / page' },
    { value: 100, label: '100 / page' },
    { value: 'ALL', label: `All (${filteredBookings.length})` },
  ];

  const userRole = profile?.role || 'admin';

  return (
    <div className="w-full pb-16 animate-fade-in font-body space-y-5">

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

      {/* ── 1. Hero Banner ─────────────── */}
      <AdminHeroBanner
        station={userRole}
        userName={profile?.first_name || 'Administrator'}
        showBadge={false}
        badgeLabel={null}
        creativeRemark="Where creative vision meets studio excellence · Ready for today's productions."
        onRefresh={() => load(true)}
        isRefreshing={isRefreshing}
      />

      {/* ── Main Executive Studio Dashboard Section (Full Width Edge-to-Edge) ───── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-5">
        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3.5 py-2 text-xs font-body shadow-xs">
            <AlertCircle size={15} className="flex-shrink-0 text-amber-600" />
            <div className="flex-1">
              <span className="font-semibold mr-1">Notice:</span>
              <span className="text-amber-700">{error}</span>
            </div>
          </div>
        )}

        {/* ── Primary KPI Status Cards (Clean, direct title above number) ───── */}
        <CategorizedMetricStrip
          stats={stats}
          loading={loadingStats}
          activeFilter={statusFilter}
          onSelectFilter={(filterKey) => {
            setActivePreset('ALL');
            setStatusFilter((prev) => (prev === filterKey ? 'ALL' : filterKey));
            setPage(1);
          }}
        />

        {/* ── Master Studio Intelligence Hub (Unified One Big Box Section) ── */}
        <div className="relative rounded-3xl border border-[#c9a96e]/35 bg-white shadow-xs overflow-hidden font-body ring-1 ring-[#c9a96e]/15">
          {/* Studio Signature Gold Top Accent Line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-600 via-[#c9a96e] to-amber-600" />


          {/* Main Box Interior: Two Main Engines with Clean Subtle Divider */}
          <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-neutral-200/80 items-stretch bg-white">
            {/* Left: Revenue & Booking Trajectory */}
            <div className="xl:col-span-6 p-4 sm:p-5 xl:p-6 flex flex-col justify-between bg-white">
              <StudioRevenueTrendChart bookings={recent} loading={loadingTables} isEmbedded />
            </div>

            {/* Right: Service Demand */}
            <div className="xl:col-span-6 p-4 sm:p-5 xl:p-6 flex flex-col justify-between bg-white">

              <StudioPackageShareChart
                bookings={recent}
                services={servicesList}
                loading={loadingTables}
                activeServiceFilter={searchQuery}
                onSelectService={(serviceName) => {
                  setSearchQuery((prev) => (prev === serviceName ? '' : serviceName));
                  setPage(1);
                }}
                isEmbedded
              />
            </div>
          </div>
        </div>

        {/* ── Studio Operations Hub: Weekly Intake, Workflow Line Chart & Collections (Single Card) ── */}
        <StudioOperationsHub
          bookings={recent}
          onSelectStatus={(key) => {
            setActivePreset('ALL');
            setStatusFilter((prev) => (prev === key ? 'ALL' : key));
            setPage(1);
          }}
        />


        {/* ── Master Operational Bookings & Production Queue (ALL Records with Pagination) ── */}
        <div className="relative rounded-3xl border border-[#c9a96e]/35 bg-white shadow-xs overflow-hidden font-body ring-1 ring-[#c9a96e]/15">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-600 via-[#c9a96e] to-amber-600" />

          {/* Section Header & Modular Control Bar */}
          <div className="p-4 sm:p-5 space-y-3.5 border-b border-neutral-100 flex-shrink-0 bg-white">

            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-sm ring-1 ring-amber-600/30 shrink-0">
                  <Layers size={18} />
                </div>
                <h3 className="font-heading text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
                  Bookings & Production Queue
                </h3>
              </div>

              <div className="flex items-center gap-2.5">
                {/* View switcher */}
                <div className="flex items-center bg-neutral-100/90 p-0.5 rounded-xl border border-neutral-200/70 h-9">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60 font-semibold'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                    title="Table View"
                  >
                    <TableIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${
                      viewMode === 'cards'
                        ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60 font-semibold'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                    title="Grid Cards View"
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={() => load(true)}
                  disabled={isRefreshing}
                  className="w-9 h-9 flex items-center justify-center border border-neutral-200/80 hover:border-amber-400/60 rounded-xl bg-white hover:bg-amber-50/40 transition-colors disabled:opacity-50 text-neutral-600 hover:text-neutral-900 cursor-pointer shadow-2xs"
                  title="Refresh operational queue"
                  aria-label="Refresh queue"
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-amber-600' : 'text-neutral-500'} />
                </button>

                {/* Export CSV Button */}
                <button
                  type="button"
                  onClick={() => handleExportCSV()}
                  disabled={filteredBookings.length === 0}
                  className="h-9 px-3.5 text-xs font-semibold flex items-center gap-1.5 border border-neutral-200/80 hover:border-amber-400/60 rounded-xl bg-white hover:bg-amber-50/40 text-neutral-700 hover:text-neutral-900 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Export filtered records to CSV"
                >
                  <Download size={13} className="text-amber-700" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </div>
            </div>

            {/* Filter Controls Row (Balanced 4-Column Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-center pt-1">

              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search client, ref #, service..."
                  className="w-full h-9 pl-9 pr-8 bg-neutral-50/80 hover:bg-neutral-100/60 focus:bg-white rounded-xl text-xs sm:text-sm font-body border border-neutral-200/80 focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 outline-none transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Category Dropdown */}
              <div>
                <CustomDropdown
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={categoryOptions}
                  placeholder="Categories"
                  className="w-full"
                  popoverWidth="w-full min-w-[220px]"
                />
              </div>

              {/* Status Custom Dropdown */}
              <div>
                <CustomDropdown
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setActivePreset('ALL');
                  }}
                  options={statusOptions}
                  placeholder="Status"
                  className="w-full"
                  popoverWidth="w-full min-w-[240px]"
                />
              </div>

              {/* Date Horizon Custom Dropdown */}
              <div>
                <CustomDropdown
                  value={dateFilter}
                  onChange={setDateFilter}
                  options={dateOptions}
                  placeholder="Calendar"
                  className="w-full"
                  popoverWidth="w-full min-w-[200px]"
                />
              </div>

            </div>
          </div>

          {/* Queue View: Table vs Cards */}
          <div className="overflow-x-auto min-h-[380px]">
            {loadingTables ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-neutral-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredBookings.length === 0 ? (
              <EmptyState message="No matching bookings found for the selected filter." />
            ) : viewMode === 'table' ? (
              <table className="w-full text-sm font-body">
                <thead className="sticky top-0 z-10 bg-[#faf7f2]/95 border-b border-[#c9a96e]/25 shadow-2xs backdrop-blur-md">
                  <tr className="text-left text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                    <th className="px-4 py-3.5 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedBookings.length > 0 && paginatedBookings.every((b) => selectedBookingIds.has(b.id))}
                        onChange={handleToggleSelectAll}
                        className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500/30 cursor-pointer accent-[#c9a96e]"
                        title="Select all on this page"
                      />
                    </th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Ref #</th>
                    <th className="px-4 py-3.5 min-w-[220px]">Client & Package</th>
                    <th className="px-4 py-3.5 w-48 hidden md:table-cell">Schedule</th>
                    <th className="px-4 py-3.5 min-w-[170px]">Order Progress</th>
                    <th className="px-4 py-3.5 w-40 whitespace-nowrap">Payment Status</th>
                    <th className="px-4 py-3.5 w-28 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100/90">
                  {paginatedBookings.map((booking) => {
                    const isChecked = selectedBookingIds.has(booking.id);
                    return (
                      <tr
                        key={booking.id}
                        onClick={() => setInspectingBooking(booking)}
                        title="Click row to inspect booking details"
                        className={`transition-colors duration-150 group cursor-pointer ${
                          isChecked
                            ? 'bg-amber-50/60 border-l-2 border-l-amber-500'
                            : 'hover:bg-[#faf7f2]/80'
                        }`}
                      >
                        {/* Selection Checkbox */}
                        <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectRow(booking.id)}
                            className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500/30 cursor-pointer accent-[#c9a96e]"
                          />
                        </td>

                        {/* Reference Number */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className="font-mono text-xs font-bold text-amber-800 group-hover:text-amber-950 group-hover:underline transition-colors cursor-pointer"
                            title={`Booking #${booking.booking_number} · Click row to inspect complete record`}
                          >
                            #{booking.booking_number}
                          </span>
                        </td>

                        {/* Customer & Service */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5">
                            <p
                              className="font-semibold text-neutral-900 text-sm group-hover:text-amber-900 transition-colors truncate"
                              title={`Client: ${booking.customer?.first_name} ${booking.customer?.last_name || ''} (${booking.customer?.email || 'No email'})`}
                            >
                              {booking.customer?.first_name} {booking.customer?.last_name}
                            </p>
                            <p
                              className="text-xs text-neutral-500 truncate max-w-[240px] flex items-center gap-1.5"
                              title={`Package: ${booking.service?.name || 'Studio Session'} · Total: ₱${Number(booking.total_amount || 0).toLocaleString()}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#c9a96e]/70 shrink-0" />
                              <span>{booking.service?.name || 'Studio Session'}</span>
                              {Number(booking.total_amount) > 0 && (
                                <span className="text-neutral-400 font-mono text-[11px]">· ₱{Number(booking.total_amount).toLocaleString()}</span>
                              )}
                            </p>
                          </div>
                        </td>

                        {/* Schedule */}
                        <td className="px-4 py-3.5 hidden md:table-cell text-xs font-medium text-neutral-700">
                          {booking.event_date ? (
                            <div
                              className="flex items-center gap-1.5 text-xs font-medium text-neutral-800"
                              title={`Session Date: ${new Date(booking.event_date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}${booking.preferred_time ? ` at ${String(booking.preferred_time).slice(0, 5)}` : ''}`}
                            >
                              <CalendarDays size={13} className="text-amber-700 shrink-0" />
                              <span>{formatDate(booking.event_date)}</span>
                              {booking.preferred_time && (
                                <span className="text-[11px] text-neutral-400 font-mono">· {String(booking.preferred_time).slice(0, 5)}</span>
                              )}
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-1.5 text-xs font-medium text-neutral-400"
                              title="Session date not yet scheduled"
                            >
                              <Clock size={13} className="text-neutral-400 shrink-0" />
                              <span>Unscheduled</span>
                            </div>
                          )}
                        </td>

                        {/* Order Progress */}
                        <td
                          className="px-4 py-3.5"
                          title={`Lifecycle stage: ${booking.status || 'PENDING'}`}
                        >
                          <BookingLifecycleBadge
                            status={booking.status}
                            showStatus={true}
                            showClearance={false}
                            variant="text"
                          />
                        </td>

                        {/* Payment Status */}
                        <td
                          className="px-4 py-3.5 whitespace-nowrap"
                          title={`Payment clearance: ${booking.payment_status || 'UNPAID'} (Total: ₱${Number(booking.total_amount || 0).toLocaleString()})`}
                        >
                          <BookingLifecycleBadge
                            booking={booking}
                            paymentStatus={booking.payment_status}
                            showStatus={false}
                            showClearance={true}
                            variant="text"
                          />
                        </td>

                        {/* Direct Actions Cell */}
                        <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {/* Inspect button */}
                            <button
                              type="button"
                              onClick={() => setInspectingBooking(booking)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-amber-900 hover:bg-amber-500/10 border border-transparent hover:border-amber-300/40 transition-all cursor-pointer"
                              title="Inspect Details"
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
            ) : (
              /* Modular Cards View */
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedBookings.map((booking) => {
                  const isChecked = selectedBookingIds.has(booking.id);
                  return (
                    <motion.div
                      key={booking.id}
                      whileHover={{ y: -2 }}
                      onClick={() => setInspectingBooking(booking)}
                      className={`rounded-2xl p-4 border transition-all space-y-3 cursor-pointer ${
                        isChecked
                          ? 'border-amber-500 bg-amber-50/30 shadow-xs'
                          : 'border-neutral-200/80 bg-white hover:border-[#c9a96e]/60 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSelectRow(booking.id);
                            }}
                            className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500/30 cursor-pointer accent-[#c9a96e]"
                          />
                          <div>
                            <span className="font-mono text-xs font-bold text-amber-800">
                              #{booking.booking_number}
                            </span>
                            <h4 className="font-semibold text-neutral-900 text-sm mt-0.5">
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

                      <div className="text-xs text-neutral-500 space-y-1.5">
                        <p
                          className="truncate font-medium text-neutral-700 flex items-center gap-1.5"
                          title={`Service Package: ${booking.service?.name || 'Photography Session'} · Total: ₱${Number(booking.total_amount || 0).toLocaleString()}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c9a96e]/70 shrink-0" />
                          <span>{booking.service?.name || 'Photography Session'}</span>
                        </p>
                        <div
                          className="flex items-center gap-1.5"
                          title={booking.event_date ? `Reserved session date: ${new Date(booking.event_date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : 'No date scheduled yet'}
                        >
                          {booking.event_date ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-800">
                              <CalendarDays size={12} className="text-amber-700 shrink-0" />
                              <span>{formatDate(booking.event_date)}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                              <Clock size={12} className="text-neutral-400 shrink-0" />
                              <span>Unscheduled</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                        <div title={`Status: ${booking.status || 'PENDING'} · Clearance: ${booking.payment_status || 'UNPAID'}`}>
                          <BookingLifecycleBadge
                            booking={booking}
                            status={booking.status}
                            paymentStatus={booking.payment_status}
                            layout="inline"
                            variant="text"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingBooking(booking);
                          }}
                          className="text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 transition-colors cursor-pointer group"
                          title={`Quick inspect & manage booking #${booking.booking_number}`}
                        >
                          <span>Manage</span>
                          <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Table pagination & footer bar */}
          <div className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-[#c9a96e]/20 bg-[#faf7f2]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600 font-body backdrop-blur-xs">
            {/* Left side: Navigation buttons if multiple pages */}
            <div className="flex items-center gap-2">
              {pageSize !== 'ALL' && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    className="w-7 h-7 rounded-lg border border-neutral-200/80 bg-white flex items-center justify-center text-neutral-600 hover:bg-amber-50/50 hover:text-amber-900 hover:border-amber-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="w-7 h-7 rounded-lg border border-neutral-200/80 bg-white flex items-center justify-center text-neutral-600 hover:bg-amber-50/50 hover:text-amber-900 hover:border-amber-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft size={13} />
                  </button>

                  <span className="px-2 text-xs font-medium text-neutral-600">
                    Page <strong className="text-neutral-900">{page}</strong> of <strong className="text-neutral-900">{totalPages}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="w-7 h-7 rounded-lg border border-neutral-200/80 bg-white flex items-center justify-center text-neutral-600 hover:bg-amber-50/50 hover:text-amber-900 hover:border-amber-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    className="w-7 h-7 rounded-lg border border-neutral-200/80 bg-white flex items-center justify-center text-neutral-600 hover:bg-amber-50/50 hover:text-amber-900 hover:border-amber-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Right side: Modern rows dropdown and Bookings Central link */}
            <div className="flex items-center gap-3.5 sm:gap-5 justify-end ml-auto">
              {/* Rows Per Page with Modern CustomDropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-neutral-500 font-medium">Rows:</span>
                <CustomDropdown
                  value={pageSize}
                  onChange={(val) => {
                    const parsed = val === 'ALL' ? 'ALL' : Number(val);
                    setPageSize(parsed);
                    setPage(1);
                  }}
                  options={pageSizeOptions}
                  popoverWidth="w-32"
                  align="right"
                  direction="up"
                  size="sm"
                  className="w-28"
                />
              </div>

              <Link
                to="/admin/bookings"
                className="flex items-center gap-1.5 text-amber-700 hover:text-amber-900 font-semibold transition-colors shrink-0 group"
              >
                <span>Bookings Central</span>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
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

      {/* ── 6. Confirm & Schedule Pictorial Session Modal ───────────────────── */}
      <AnimatePresence>
        {schedulingBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmittingSchedule && setSchedulingBooking(null)}
              className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden z-10 font-body"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gold/20 text-gold border border-gold/30">
                      Step 2 Approval · Schedule & Venue
                    </span>
                    <h3 className="text-lg font-heading font-black text-white">
                      Confirm & Schedule Pictorial Session
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      Ref #{schedulingBooking.booking_number} · {schedulingBooking.customer?.first_name} {schedulingBooking.customer?.last_name || ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSchedulingBooking(null)}
                    disabled={isSubmittingSchedule}
                    className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Informational Callout */}
              <div className="p-6 space-y-5">
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <Megaphone size={14} className="text-gold-dark" />
                    <span>Automated Customer Announcement</span>
                  </div>
                  <p className="text-neutral-600 leading-relaxed">
                    Approving this reservation will lock in the pictorial date and studio session venue. The system will immediately notify the client to settle their downpayment in their Payment Dashboard and dispatch their session schedule confirmation.
                  </p>
                </div>

                <form onSubmit={handleConfirmAndScheduleSubmit} className="space-y-4">
                  {/* Date Input */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock size={13} className="text-gold" />
                      <span>Pictorial Session Date *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                    />
                  </div>

                  {/* Preferred Time Slot */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock size={13} className="text-gold" />
                      <span>Preferred Call Time / Slot</span>
                    </label>
                    <select
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all cursor-pointer"
                    >
                      <option value="08:00:00">08:00 AM – Morning Session</option>
                      <option value="09:00:00">09:00 AM – Morning Slot 1</option>
                      <option value="10:00:00">10:00 AM – Morning Slot 2</option>
                      <option value="11:00:00">11:00 AM – Midday Slot</option>
                      <option value="13:00:00">01:00 PM – Afternoon Slot 1</option>
                      <option value="14:00:00">02:00 PM – Afternoon Slot 2</option>
                      <option value="15:00:00">03:00 PM – Afternoon Slot 3</option>
                      <option value="16:00:00">04:00 PM – Sunset Session</option>
                      <option value="17:00:00">05:00 PM – Evening Session</option>
                    </select>
                  </div>

                  {/* Pictorial Location */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <MapPin size={13} className="text-gold" />
                      <span>Pictorial Location / Venue</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={scheduleLocation}
                      onChange={(e) => setScheduleLocation(e.target.value)}
                      placeholder="e.g. E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu"
                      className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                    />
                  </div>

                  {/* Remarks / Shoot Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-gold" />
                      <span>Production Notes / Attire Guidelines (Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={scheduleRemarks}
                      onChange={(e) => setScheduleRemarks(e.target.value)}
                      placeholder="Add specific instructions for client (e.g. wear neutral inner shirt, arrive 15 minutes prior for hair styling)..."
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => setSchedulingBooking(null)}
                      disabled={isSubmittingSchedule}
                      className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingSchedule}
                      className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      {isSubmittingSchedule ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-gold" />
                          <span>Approving & Announcing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} className="text-gold" />
                          <span>Approve, Schedule & Notify</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}