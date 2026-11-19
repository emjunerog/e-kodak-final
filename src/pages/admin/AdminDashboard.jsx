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
  RefreshCw,
  GraduationCap,
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
  Camera,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CategorizedMetricStrip from '../../components/admin/CategorizedMetricStrip';
import BookingLifecycleBadge from '../../components/admin/BookingLifecycleBadge';
import AssignPhotographerModal from '../../components/admin/AssignPhotographerModal';
import BookingQuickInspector from '../../components/admin/BookingQuickInspector';
import CustomDropdown from '../../components/ui/CustomDropdown';
import StudioRevenueTrendChart from '../../components/admin/dashboard/StudioRevenueTrendChart';
import StudioPackageShareChart from '../../components/admin/dashboard/StudioPackageShareChart';
import { supabase } from '../../lib/supabase';
import StudioOperationsHub from '../../components/admin/dashboard/StudioOperationsHub';
import StudioBookingBreakdownHub from '../../components/admin/dashboard/StudioBookingBreakdownHub';
import { getDashboardStats, getRecentBookings, getPendingBookings } from '../../services/adminService';
import {
  updateBookingStatus,
  confirmAndScheduleBooking,
  getPhotographersWithWorkloadAndAvailability,
  assignPhotographerToBooking,
} from '../../services/bookingAdminService';
import {
  getEffectivePaymentStatus,
  getNextBookingAction,
  getPhotographerDisplayName,
  hasAssignedPhotographer,
  isPaymentVerifiedByAdmin,
} from '../../lib/bookingUtils';
import { localDateKey } from '../../components/admin/dashboard/chartUtils';

// ── Date formatting helper ─────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const STUDIO_TIME_SLOT_LABELS = {
  '08:00': '8:00 AM – 9:00 AM',
  '09:00': '9:00 AM – 10:00 AM',
  '10:00': '10:00 AM – 11:00 AM',
  '11:00': '11:00 AM – 12:00 PM',
  '13:00': '1:00 PM – 2:00 PM',
  '14:00': '2:00 PM – 3:00 PM',
  '15:00': '3:00 PM – 4:00 PM',
  '16:00': '4:00 PM – 5:00 PM',
};

function formatBookingTime(booking) {
  const noteTime =
    booking?.notes?.match?.(/•\s*(?:Preferred\s*Time|Time\s*Slot|Session\s*Time|Schedule\s*Time):\s*([^\n\r]+)/i)?.[1]?.trim() ||
    '';
  const raw =
    booking?.preferred_time ||
    booking?.student_details?.preferred_time ||
    booking?.participant_details?.preferred_time ||
    noteTime;
  if (!raw) return '';

  const trimmed = String(raw).trim();
  const isFullDayOrder =
    /full[-\s]*day|school batch/i.test(trimmed) ||
    /•\s*(?:Booking\s*Mode|Academic\s*Mode):\s*School\s*Section/i.test(booking?.notes || '');

  if (/full[-\s]*day|school batch/i.test(trimmed)) {
    const timeMatch = trimmed.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)\s*[–-]\s*\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    return timeMatch ? timeMatch[1] : '8:00 AM – 5:00 PM';
  }
  if (/am|pm/i.test(trimmed)) return trimmed;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return trimmed;

  const rawHours = parseInt(match[1], 10);
  const minutes = match[2];
  const slotKey = `${String(rawHours).padStart(2, '0')}:${minutes}`;
  if (isFullDayOrder && slotKey === '08:00') {
    return '8:00 AM – 5:00 PM';
  }
  if (STUDIO_TIME_SLOT_LABELS[slotKey]) {
    return STUDIO_TIME_SLOT_LABELS[slotKey];
  }

  const ampm = rawHours >= 12 ? 'PM' : 'AM';
  const h12 = rawHours % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
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
function RowActionDropdown({ booking, onStageAction, isBusy = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nextAction = getNextBookingAction(booking);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!nextAction) {
    return (
      <button
        type="button"
        disabled
        aria-label={`No stage actions available for booking #${booking.booking_number}`}
        title="No stage action available for this status"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 cursor-not-allowed"
      >
        <MoreVertical size={15} aria-hidden="true" />
      </button>
    );
  }

  const ActionIcon =
    nextAction.type === 'APPROVE_AND_RESERVE' || nextAction.type === 'CONFIRM_PAYMENT'
      ? CheckCircle2
      : nextAction.type === 'ASSIGN_PHOTOGRAPHER'
        ? Camera
        : ArrowRight;

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        disabled={isBusy}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Order progress action for booking #${booking.booking_number}`}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-primary hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
        title={nextAction.label}
      >
        {isBusy ? <Loader2 size={15} className="animate-spin text-amber-700" aria-hidden="true" /> : <MoreVertical size={15} aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-neutral-200/80 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 font-body"
        >
          <button
            type="button"
            role="menuitem"
            disabled={isBusy}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onStageAction?.(booking, nextAction);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-800 hover:bg-amber-50/70 hover:text-amber-950 font-semibold text-left cursor-pointer disabled:opacity-50"
          >
            <ActionIcon size={13} className="text-amber-700 shrink-0" aria-hidden="true" />
            <span>{nextAction.label}</span>
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
  const [viewMode, setViewMode] = useState('table');
  const [activePreset, setActivePreset] = useState('ALL');

  // Pagination State for All Records
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Direct Management State
  const [inspectingBooking, setInspectingBooking] = useState(null);
  const [openPaymentOnInspect, setOpenPaymentOnInspect] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);

  // Confirm & Schedule Pictorial Modal State
  const [schedulingBooking, setSchedulingBooking] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00:00');
  const [scheduleLocation, setScheduleLocation] = useState('E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu');
  const [scheduleRemarks, setScheduleRemarks] = useState('');
  const [schedulePhotographerId, setSchedulePhotographerId] = useState('');
  const [schedulePhotographers, setSchedulePhotographers] = useState([]);
  const [loadingSchedulePhotographers, setLoadingSchedulePhotographers] = useState(false);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Photographer Assignment Modal & Row Stage Progression
  const [assigningBooking, setAssigningBooking] = useState(null);
  const [advancingBookingId, setAdvancingBookingId] = useState(null);

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

    const freshRecent = recentRes.data ? (recentRes.data || []).filter(b => !b.is_deleted) : recentRef.current;
    if (statsRes.data) setStats(statsRes.data);
    if (recentRes.data) setRecent(freshRecent);
    if (pendingRes.data) setPending((pendingRes.data || []).filter(b => !b.is_deleted));
    if (servicesRes?.data) setServicesList(servicesRes.data);
    if (logsRes?.data) setActivityLogs(logsRes.data);
    setLoadingStats(false);
    setLoadingTables(false);
    setIsRefreshing(false);
    return freshRecent;
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!schedulingBooking) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmittingSchedule) {
        setSchedulingBooking(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [schedulingBooking, isSubmittingSchedule]);

  // Fetch available photographers for Confirm & Schedule modal
  useEffect(() => {
    if (!schedulingBooking) {
      setSchedulePhotographers([]);
      return;
    }
    let active = true;
    setLoadingSchedulePhotographers(true);
    getPhotographersWithWorkloadAndAvailability(scheduleDate || schedulingBooking.event_date, scheduleTime)
      .then(({ data }) => {
        if (active) setSchedulePhotographers(Array.isArray(data) ? data : []);
      })
      .finally(() => {
        if (active) setLoadingSchedulePhotographers(false);
      });
    return () => {
      active = false;
    };
  }, [schedulingBooking?.id, scheduleDate, scheduleTime]);

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
    setSchedulePhotographerId(booking.photographer_id || booking.photographer?.id || '');
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

  // Single stage-corresponding action triggered from the 3-dot Quick Action menu
  const handleRowStageAction = async (booking, nextAction) => {
    if (!booking || !nextAction) return;
    const paymentConfirmed = isPaymentVerifiedByAdmin(booking);

    if (nextAction.type === 'CONFIRM_PAYMENT') {
      setOpenPaymentOnInspect(true);
      setInspectingBooking(booking);
      return;
    }

    if (nextAction.type === 'APPROVE_AND_RESERVE') {
      if (!paymentConfirmed) {
        showToast(`Confirm downpayment for #${booking.booking_number} first.`);
        setOpenPaymentOnInspect(true);
        setInspectingBooking(booking);
        return;
      }
      handleFastConfirm(booking);
      return;
    }
    if (nextAction.type === 'ASSIGN_PHOTOGRAPHER') {
      if (!paymentConfirmed) {
        showToast(`Confirm payment for #${booking.booking_number} first before assigning a photographer.`);
        setOpenPaymentOnInspect(true);
        setInspectingBooking(booking);
        return;
      }
      setAssigningBooking(booking);
      return;
    }
    if (nextAction.type === 'ADVANCE_STAGE' && nextAction.nextStatus) {
      if (!paymentConfirmed) {
        showToast(`Confirm payment for #${booking.booking_number} first before proceeding.`);
        setOpenPaymentOnInspect(true);
        setInspectingBooking(booking);
        return;
      }
      if (!hasAssignedPhotographer(booking)) {
        showToast(`Assign a photographer first before moving #${booking.booking_number} to ${nextAction.nextLabel}.`);
        setAssigningBooking(booking);
        return;
      }
      setAdvancingBookingId(booking.id);
      try {
        const { error: statusErr } = await updateBookingStatus(
          booking.id,
          nextAction.nextStatus,
          `Updated to ${nextAction.nextLabel} from All Bookings`,
          profile?.id || null
        );
        if (statusErr) throw statusErr;
        showToast(`✓ Booking #${booking.booking_number} moved to ${nextAction.nextLabel}.`);
        await load(true);
      } catch (err) {
        console.error('Stage advance failed:', err);
        showToast('Error updating booking: ' + (err?.message || 'Database error'));
      } finally {
        setAdvancingBookingId(null);
      }
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

      if (schedulePhotographerId) {
        const chosen = schedulePhotographers.find((p) => p.id === schedulePhotographerId);
        const chosenName = chosen
          ? `${chosen.first_name || ''} ${chosen.last_name || ''}`.trim() || chosen.email
          : 'Studio Photographer';
        const { error: assignErr } = await assignPhotographerToBooking({
          bookingId: schedulingBooking.id,
          photographerId: schedulePhotographerId,
          photographerName: chosenName,
          changedById: profile?.id || null,
          remarks: scheduleRemarks,
          customerId: schedulingBooking.customer?.id || schedulingBooking.customer_id || null,
          bookingNumber: schedulingBooking.booking_number,
          eventDate: scheduleDate,
        });
        if (assignErr) throw assignErr;
        showToast(`✓ Booking #${schedulingBooking.booking_number} approved & assigned to ${chosenName}!`);
      } else {
        showToast(`✓ Booking #${schedulingBooking.booking_number} approved & reserved! Assign a photographer before pictorial.`);
      }

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
    const freshRecent = await load(true);
    const updatedItem = freshRecent.find((b) => b.id === bookingId);
    if (updatedItem) {
      setInspectingBooking(updatedItem);
    } else {
      setInspectingBooking((prev) => (prev && prev.id === bookingId ? { ...prev, status: newStatus } : prev));
    }
  };

  // Filtered recent bookings based on search, dropdowns, and presets
  const filteredBookings = useMemo(() => {
    const todayIso = localDateKey();
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
      const statusUpper = String(b.status || '').toUpperCase();
      let matchesStatus = true;
      if (effectiveFilter === 'PAID' || effectiveFilter === 'CLEARED') {
        matchesStatus = effPayStatus === 'PAID';
      } else if (effectiveFilter === 'DOWNPAYMENT') {
        matchesStatus = effPayStatus === 'DOWNPAYMENT';
      } else if (effectiveFilter === 'UNPAID') {
        matchesStatus = effPayStatus === 'UNPAID';
      } else if (effectiveFilter === 'BALANCE_DUE') {
        matchesStatus = !['PAID', 'REFUNDED'].includes(effPayStatus) && !['CANCELLED', 'REJECTED'].includes(statusUpper);
      } else if (effectiveFilter === 'ASSIGNED_PHOTOGRAPHER') {
        matchesStatus = !['CANCELLED', 'REJECTED'].includes(statusUpper) && hasAssignedPhotographer(b);
      } else if (effectiveFilter === 'UNASSIGNED_PHOTOGRAPHER') {
        matchesStatus = !['CANCELLED', 'REJECTED'].includes(statusUpper) && !hasAssignedPhotographer(b);
      } else if (effectiveFilter === 'SOFT_COPIES_SENT') {
        matchesStatus = !['CANCELLED', 'REJECTED'].includes(statusUpper) && Array.isArray(b.photo_outputs) && b.photo_outputs.length > 0;
      } else if (effectiveFilter === 'AWAITING_SOFT_COPIES') {
        matchesStatus = ['CAPTURE', 'IN_PROGRESS', 'EDITING', 'RETOUCHING'].includes(statusUpper) && (!b.photo_outputs || b.photo_outputs.length === 0);
      } else if (effectiveFilter === 'TODAY_SHOOTS') {
        matchesStatus = Boolean(b.event_date && localDateKey(b.event_date) === todayIso) && !['CANCELLED', 'REJECTED'].includes(statusUpper);
      } else if (effectiveFilter === 'PENDING') {
        matchesStatus = ['PENDING', 'RESERVED'].includes(statusUpper);
      } else if (effectiveFilter === 'PAYMENT_UNCONFIRMED') {
        matchesStatus = ['PENDING', 'RESERVED', 'CONFIRMED', 'PHOTOGRAPHER_ASSIGNED'].includes(statusUpper) && !isPaymentVerifiedByAdmin(b);
      } else if (effectiveFilter === 'STAGE_CONFIRMED') {
        matchesStatus = ['CONFIRMED', 'PHOTOGRAPHER_ASSIGNED'].includes(statusUpper);
      } else if (effectiveFilter === 'CONFIRMED') {
        matchesStatus = statusUpper === 'CONFIRMED';
      } else if (effectiveFilter === 'PHOTOGRAPHER_PENDING') {
        matchesStatus = statusUpper === 'PHOTOGRAPHER_ASSIGNED' && !hasAssignedPhotographer(b);
      } else if (effectiveFilter === 'PHOTOGRAPHER_ASSIGNED') {
        matchesStatus = statusUpper === 'PHOTOGRAPHER_ASSIGNED' && hasAssignedPhotographer(b);
      } else if (effectiveFilter === 'CAPTURE' || effectiveFilter === 'PRODUCTION') {
        matchesStatus = ['CAPTURE', 'IN_PROGRESS'].includes(statusUpper);
      } else if (effectiveFilter === 'EDITING') {
        matchesStatus = statusUpper === 'EDITING';
      } else if (effectiveFilter === 'RETOUCHING') {
        matchesStatus = statusUpper === 'RETOUCHING';
      } else if (effectiveFilter === 'FINALIZED') {
        matchesStatus = ['FINALIZED', 'PRINTING'].includes(statusUpper);
      } else if (effectiveFilter === 'READY') {
        matchesStatus = ['READY', 'UNDER_DELIVERY'].includes(statusUpper);
      } else if (effectiveFilter === 'COMPLETED') {
        matchesStatus = statusUpper === 'COMPLETED';
      } else if (effectiveFilter !== 'ALL') {
        matchesStatus = statusUpper === effectiveFilter;
      }

      // Category filter (College, Senior High)
      let matchesCategory = true;
      if (categoryFilter !== 'ALL') {
        const cat = (b.service?.category || '').toLowerCase();
        const servName = (b.service?.name || '').toLowerCase();
        const notes = (b.notes || '').toLowerCase();

        if (categoryFilter === 'college') {
          matchesCategory = cat === 'college' || servName.includes('college') || notes.includes('college');
        } else if (categoryFilter === 'senior-high') {
          matchesCategory = cat === 'senior-high' || servName.includes('senior high') || notes.includes('senior high') || notes.includes('shs');
        }
      }

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [recent, searchQuery, statusFilter, categoryFilter, activePreset]);

  // Live Proactive KPI Queue Counts
  const actionCenterBuckets = useMemo(() => {
    const todayIso = localDateKey();
    const activeNonCancelled = (b) => !['CANCELLED', 'REJECTED'].includes(String(b.status || '').toUpperCase());

    const pendingList = recent.filter((b) => ['PENDING', 'RESERVED'].includes(String(b.status || '').toUpperCase()));
    const assignedPhotographerList = recent.filter((b) => activeNonCancelled(b) && hasAssignedPhotographer(b));
    const unassignedList = recent.filter((b) => activeNonCancelled(b) && !hasAssignedPhotographer(b));
    const softCopiesSentList = recent.filter(
      (b) => activeNonCancelled(b) && Array.isArray(b.photo_outputs) && b.photo_outputs.length > 0
    );
    const todayShootsList = recent.filter(
      (b) => activeNonCancelled(b) && b.event_date && localDateKey(b.event_date) === todayIso
    );
    const balanceDueList = recent.filter(
      (b) => activeNonCancelled(b) && !['PAID', 'REFUNDED'].includes(getEffectivePaymentStatus(b))
    );
    const readyList = recent.filter((b) => ['READY', 'UNDER_DELIVERY'].includes(String(b.status || '').toUpperCase()));

    return {
      pendingList,
      assignedPhotographerList,
      unassignedList,
      softCopiesSentList,
      todayShootsList,
      balanceDueList,
      readyList,
    };
  }, [recent]);

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
  }, [searchQuery, statusFilter, categoryFilter, activePreset, pageSize]);

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
  ];

  // Status filter options matching Order Progress steps
  const statusOptions = useMemo(() => {
    const countOf = (pred) => recent.filter(pred).length;
    const upper = (b) => String(b.status || '').toUpperCase();

    return [
      { value: 'ALL', label: 'All Statuses', dotColor: 'bg-neutral-400', badge: recent.length },
      { value: 'PENDING', label: 'Booking Received', dotColor: 'bg-gold', badge: countOf((b) => ['PENDING', 'RESERVED'].includes(upper(b))) },
      { value: 'PAYMENT_UNCONFIRMED', label: 'Confirm Payment', dotColor: 'bg-amber-500', badge: countOf((b) => ['PENDING', 'RESERVED', 'CONFIRMED', 'PHOTOGRAPHER_ASSIGNED'].includes(upper(b)) && !isPaymentVerifiedByAdmin(b)) },
      { value: 'CONFIRMED', label: 'Approved & Reserved', dotColor: 'bg-primary', badge: countOf((b) => upper(b) === 'CONFIRMED') },
      { value: 'PHOTOGRAPHER_PENDING', label: 'Photographer Pending', dotColor: 'bg-amber-500', badge: countOf((b) => upper(b) === 'PHOTOGRAPHER_ASSIGNED' && !hasAssignedPhotographer(b)) },
      { value: 'PHOTOGRAPHER_ASSIGNED', label: 'Photographer Assigned', dotColor: 'bg-primary', badge: countOf((b) => upper(b) === 'PHOTOGRAPHER_ASSIGNED' && hasAssignedPhotographer(b)) },
      { value: 'CAPTURE', label: 'Ongoing Pictorial', dotColor: 'bg-gold', badge: countOf((b) => ['CAPTURE', 'IN_PROGRESS'].includes(upper(b))) },
      { value: 'EDITING', label: 'Editing', dotColor: 'bg-primary', badge: countOf((b) => upper(b) === 'EDITING') },
      { value: 'RETOUCHING', label: 'Retouching', dotColor: 'bg-gold', badge: countOf((b) => upper(b) === 'RETOUCHING') },
      { value: 'FINALIZED', label: 'Booking Finalized', dotColor: 'bg-primary', badge: countOf((b) => ['FINALIZED', 'PRINTING'].includes(upper(b))) },
      { value: 'READY', label: 'Ready for Pickup', dotColor: 'bg-gold', badge: countOf((b) => ['READY', 'UNDER_DELIVERY'].includes(upper(b))) },
      { value: 'COMPLETED', label: 'Completed', dotColor: 'bg-neutral-400', badge: countOf((b) => upper(b) === 'COMPLETED') },
    ];
  }, [recent]);

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

        {/* ── Secondary KPI Status Cards (Photographers, Soft Copies, Balance Due, Today's Shoots) ── */}
        <CategorizedMetricStrip
          loading={loadingTables}
          activeFilter={activePreset}
          cards={[
            {
              key: 'ASSIGNED_PHOTOGRAPHER',
              label: 'Photographers',
              value: actionCenterBuckets.assignedPhotographerList.length,
              onClick: () => {
                setStatusFilter('ALL');
                setActivePreset((prev) => (prev === 'ASSIGNED_PHOTOGRAPHER' ? 'ALL' : 'ASSIGNED_PHOTOGRAPHER'));
                setPage(1);
              },
            },
            {
              key: 'SOFT_COPIES_SENT',
              label: 'Soft Copies',
              value: actionCenterBuckets.softCopiesSentList.length,
              onClick: () => {
                setStatusFilter('ALL');
                setActivePreset((prev) => (prev === 'SOFT_COPIES_SENT' ? 'ALL' : 'SOFT_COPIES_SENT'));
                setPage(1);
              },
            },
            {
              key: 'BALANCE_DUE',
              label: 'Balance Due',
              value: actionCenterBuckets.balanceDueList.length,
              onClick: () => {
                setStatusFilter('ALL');
                setActivePreset((prev) => (prev === 'BALANCE_DUE' ? 'ALL' : 'BALANCE_DUE'));
                setPage(1);
              },
            },
            {
              key: 'TODAY_SHOOTS',
              label: "Today's Shoots",
              value: actionCenterBuckets.todayShootsList.length,
              onClick: () => {
                setStatusFilter('ALL');
                setActivePreset((prev) => (prev === 'TODAY_SHOOTS' ? 'ALL' : 'TODAY_SHOOTS'));
                setPage(1);
              },
            },
          ]}
        />


        {/* ── Master Operational Bookings & Production Queue (Prioritized Above Charts) ── */}
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
                  All Bookings
                </h3>
              </div>

              <div className="flex items-center gap-2.5">
                {/* View switcher */}
                <div className="flex items-center bg-neutral-100/90 p-0.5 rounded-xl border border-neutral-200/70 h-9">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${viewMode === 'table'
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
                    className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${viewMode === 'cards'
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

            {/* Filter Controls Row: Prioritized Search Bar + Compact Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">

              {/* Prioritized Search Bar */}
              <div className="relative flex-1 min-w-0">
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

              {/* Compact Filter Dropdowns */}
              <div className="flex items-center gap-2 shrink-0">
                <CustomDropdown
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={categoryOptions}
                  placeholder="Categories"
                  size="sm"
                  className="w-36 sm:w-40"
                  popoverWidth="w-56"
                  align="right"
                />

                <CustomDropdown
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setActivePreset('ALL');
                  }}
                  options={statusOptions}
                  placeholder="Status"
                  size="sm"
                  className="w-40 sm:w-44"
                  popoverWidth="w-60"
                  align="right"
                />
              </div>

            </div>

            {/* Active Filter Summary & 1-Click Reset */}
            {(searchQuery.trim() || statusFilter !== 'ALL' || activePreset !== 'ALL' || categoryFilter !== 'ALL') && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex flex-wrap items-center gap-1.5 text-neutral-600">
                  <span className="font-semibold text-neutral-700">
                    Showing {filteredBookings.length} of {recent.length} bookings
                  </span>
                  {searchQuery.trim() && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 font-medium">
                      Filter: &ldquo;{searchQuery.trim()}&rdquo;
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search filter"
                        className="hover:text-amber-700 cursor-pointer"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setActivePreset('ALL');
                    setCategoryFilter('ALL');
                    setPage(1);
                  }}
                  className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2 cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>

          {/* Queue View: Table vs Cards */}
          <div className="overflow-x-auto">
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
                    <th className="px-4 py-3.5 min-w-[170px] w-56">Client</th>
                    <th className="px-4 py-3.5 w-48 hidden sm:table-cell whitespace-nowrap">Time Schedule</th>
                    <th className="px-4 py-3.5 w-44 hidden md:table-cell whitespace-nowrap">Schedule</th>
                    <th className="px-4 py-3.5 min-w-[190px]">Order Progress</th>
                    <th className="px-4 py-3.5 w-24 text-right">Quick Action</th>
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
                        className={`transition-colors duration-150 group cursor-pointer ${isChecked
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

                        {/* Customer */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5">
                            <p
                              className="font-semibold text-neutral-900 text-sm group-hover:text-amber-900 transition-colors truncate"
                              title={`Client: ${booking.customer?.first_name} ${booking.customer?.last_name || ''} (${booking.customer?.email || 'No email'})`}
                            >
                              {booking.customer?.first_name} {booking.customer?.last_name}
                            </p>
                            {Number(booking.total_amount) > 0 && (
                              <p className="text-[11px] text-neutral-400 font-mono">
                                ₱{Number(booking.total_amount).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Time Schedule */}
                        <td className="px-4 py-3.5 hidden sm:table-cell whitespace-nowrap text-xs font-medium text-neutral-700">
                          {(() => {
                            const timeLabel = formatBookingTime(booking);
                            return timeLabel ? (
                              <div
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-800"
                                title={`Selected booking time schedule: ${timeLabel}`}
                              >
                                <Clock size={13} className="text-amber-700 shrink-0" />
                                <span>{timeLabel}</span>
                              </div>
                            ) : (
                              <div
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400"
                                title="No booking time slot selected"
                              >
                                <Clock size={13} className="text-neutral-400 shrink-0" />
                                <span>Not set</span>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Schedule */}
                        <td className="px-4 py-3.5 hidden md:table-cell whitespace-nowrap text-xs font-medium text-neutral-700">
                          {booking.event_date ? (
                            <div
                              className="flex items-center gap-1.5 text-xs font-medium text-neutral-800"
                              title={`Session Date: ${new Date(booking.event_date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}${formatBookingTime(booking) ? ` · ${formatBookingTime(booking)}` : ''}`}
                            >
                              <CalendarDays size={13} className="text-amber-700 shrink-0" />
                              <span>{formatDate(booking.event_date)}</span>
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
                          <div className="flex flex-col items-start">
                            <BookingLifecycleBadge
                              booking={booking}
                              status={booking.status}
                              showStatus={true}
                              showClearance={false}
                              variant="text"
                            />
                            {String(booking.status || '').toUpperCase() === 'PHOTOGRAPHER_ASSIGNED' && hasAssignedPhotographer(booking) && (
                              <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600">
                                <Camera size={11} className="text-amber-700 shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[175px]">
                                  {getPhotographerDisplayName(booking) || 'Assigned'}
                                </span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Direct Actions Cell */}
                        <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end">
                            <RowActionDropdown
                              booking={booking}
                              onStageAction={handleRowStageAction}
                              isBusy={advancingBookingId === booking.id}
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
                      className={`rounded-2xl p-4 border transition-all space-y-3 cursor-pointer ${isChecked
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
                            onStageAction={handleRowStageAction}
                            isBusy={advancingBookingId === booking.id}
                          />
                        </div>
                      </div>

                      <div className="text-xs text-neutral-500 space-y-1.5">
                        {Number(booking.total_amount) > 0 && (
                          <p className="text-[11px] text-neutral-400 font-mono">
                            ₱{Number(booking.total_amount).toLocaleString()}
                          </p>
                        )}
                        <div
                          className="flex flex-wrap items-center gap-x-2.5 gap-y-1"
                          title={booking.event_date ? `Reserved session date: ${new Date(booking.event_date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}${formatBookingTime(booking) ? ` · ${formatBookingTime(booking)}` : ''}` : 'No date scheduled yet'}
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
                          {(() => {
                            const timeLabel = formatBookingTime(booking);
                            return timeLabel ? (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-600">
                                <Clock size={11} className="text-amber-700 shrink-0" />
                                <span>{timeLabel}</span>
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <div className="flex flex-col items-start min-w-0">
                          <BookingLifecycleBadge
                            booking={booking}
                            status={booking.status}
                            showStatus={true}
                            showClearance={false}
                            variant="text"
                          />
                          {String(booking.status || '').toUpperCase() === 'PHOTOGRAPHER_ASSIGNED' && hasAssignedPhotographer(booking) && (
                            <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600">
                              <Camera size={11} className="text-amber-700 shrink-0" aria-hidden="true" />
                              <span className="truncate max-w-[165px]">
                                {getPhotographerDisplayName(booking) || 'Assigned'}
                              </span>
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingBooking(booking);
                          }}
                          className="text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 transition-colors cursor-pointer group shrink-0"
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

        {/* ── Visual Divider Heading: Separates Bookings Table from Analytics Graphs ── */}
        <div className="pt-4 pb-1 flex items-center gap-4">
          <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-display font-bold tracking-tight text-neutral-900 shrink-0">
            Studio Analytics &amp; Graphs
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-[#c9a96e]/55 via-neutral-200 to-transparent" />
        </div>

        {/* ── Master Studio Intelligence Hub (Revenue & Booking Trajectory + Service Demand) ── */}
        <div className="relative rounded-3xl border border-[#c9a96e]/35 bg-white shadow-xs overflow-hidden font-body ring-1 ring-[#c9a96e]/15">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-600 via-[#c9a96e] to-amber-600" />
          <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-neutral-200/80 items-stretch bg-white">
            {/* Left: Revenue & Booking Trajectory */}
            <div className="xl:col-span-6 min-w-0 p-4 sm:p-5 xl:p-6 flex flex-col justify-between bg-white">
              <StudioRevenueTrendChart bookings={recent} loading={loadingTables} isEmbedded />
            </div>

            {/* Right: Service Demand */}
            <div className="xl:col-span-6 min-w-0 p-4 sm:p-5 xl:p-6 flex flex-col justify-between bg-white">
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
            if (key === 'CONFIRMED') {
              setStatusFilter('ALL');
              setActivePreset((prev) => (prev === 'STAGE_CONFIRMED' ? 'ALL' : 'STAGE_CONFIRMED'));
            } else {
              setActivePreset('ALL');
              setStatusFilter((prev) => (prev === key ? 'ALL' : key));
            }
            setPage(1);
          }}
        />

        {/* ── Studio Breakdown Hub: Package Sets (SHS A-D / College A-B), Order Types & Schools ── */}
        <StudioBookingBreakdownHub bookings={recent} />

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
        initialOpenPayment={openPaymentOnInspect}
        onClose={() => {
          setInspectingBooking(null);
          setOpenPaymentOnInspect(false);
        }}
        onStatusUpdated={handleInspectorStatusUpdated}
      />

      {/* ── 6. Confirm & Schedule Pictorial Session Modal ───────────────────── */}
      <AnimatePresence>
        {schedulingBooking && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overscroll-contain"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm and schedule pictorial session"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmittingSchedule && setSchedulingBooking(null)}
              className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm"
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg max-h-[90dvh] bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-y-auto z-10 font-body overscroll-contain"
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

                  {/* Assign Photographer (Optional during Approval; Required before Pictorial) */}
                  <div>
                    <label
                      htmlFor="schedule-photographer-select"
                      className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5 flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={13} className="text-gold" />
                        <span>Assign Photographer (Required before Pictorial)</span>
                      </span>
                      {loadingSchedulePhotographers && (
                        <Loader2 size={12} className="animate-spin text-gold" aria-hidden="true" />
                      )}
                    </label>
                    <select
                      id="schedule-photographer-select"
                      value={schedulePhotographerId}
                      onChange={(e) => setSchedulePhotographerId(e.target.value)}
                      className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all cursor-pointer"
                    >
                      <option value="">Assign later (Approve &amp; Reserve first)</option>
                      {schedulePhotographers.map((ph) => {
                        const phName = `${ph.first_name || ''} ${ph.last_name || ''}`.trim() || ph.email;
                        const statusNote = ph.is_available && !ph.hasConflict
                          ? `Available · ${ph.activeWorkloadCount || 0} shoots`
                          : ph.conflictReason || ph.availability_status || 'Check schedule';
                        return (
                          <option key={ph.id} value={ph.id}>
                            {phName} ({statusNote})
                          </option>
                        );
                      })}
                    </select>
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

      {/* ── 7. Assign Photographer Modal (Required before Pictorial) ───────── */}
      <AssignPhotographerModal
        booking={assigningBooking}
        changedById={profile?.id}
        isOpen={!!assigningBooking}
        onClose={() => setAssigningBooking(null)}
        onAssigned={async (b, chosenName) => {
          showToast(`✓ ${chosenName} assigned to #${b.booking_number}.`);
          await load(true);
        }}
        onError={(msg) => showToast(msg)}
      />

    </div>
  );
}