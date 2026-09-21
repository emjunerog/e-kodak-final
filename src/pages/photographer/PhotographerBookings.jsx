import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getAssignedBookings,
  updateBookingStatusByPhotographer,
  acceptAssignment,
  declineAssignment,
  requestRescheduleByPhotographer,
  parseBookingBrief,
  getCleanLocation,
  toggleGeneralAvailability,
  getPhotographerProfileData,
} from '../../services/photographerService';
import {
  CalendarDays,
  MapPin,
  Clock,
  Camera,
  FileImage,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  User,
  Phone,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Upload,
  CalendarClock,
  Check,
  Send,
  MessageSquare,
  ExternalLink,
  Layers,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import Toast from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { createTransferLog } from '../../services/workstationService';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import PhotographerBookingCard from '../../components/photographer/PhotographerBookingCard';
import CustomDropdown from '../../components/ui/CustomDropdown';
import BookingLifecycleBadge from '../../components/admin/BookingLifecycleBadge';

export default function PhotographerBookings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetBookingId = searchParams.get('id') || searchParams.get('booking');

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Shift & Availability Status
  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  // Search, Filters & Sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | upcoming | in_progress | completed | [specific]
  const [sortBy, setSortBy] = useState('date_asc');
  const [viewMode, setViewMode] = useState('detailed'); // 'detailed' | 'grid'
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [updatingId, setUpdatingId] = useState(null);

  // Modal inspection
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Decline Modal State
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);

  // Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  // Issue Escalation State
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueMessage, setIssueMessage] = useState('');
  const [issuePriority, setIssuePriority] = useState('HIGH');
  const [reportingIssue, setReportingIssue] = useState(false);

  const loadBookings = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const [bookingsRes, profileRes] = await Promise.all([
        getAssignedBookings(user.id),
        getPhotographerProfileData(user.id),
      ]);

      if (bookingsRes.error) {
        setError(bookingsRes.error.message || 'Failed to load assigned bookings.');
      } else {
        const data = bookingsRes.data || [];
        setBookings(data);
        // In My Bookings, expand all booking cards by default so full order details are visible and wide immediately
        if (data.length > 0) {
          setExpandedIds(new Set(data.map(b => b.id)));
        }
      }

      if (profileRes?.data) {
        setIsAvailable(profileRes.data.is_available ?? true);
      }
    } catch (err) {
      console.error('loadBookings error:', err);
      setError('An unexpected error occurred while loading bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [user?.id]);

  // Deep link auto-selection from URL (?id=... or ?booking=...)
  useEffect(() => {
    if (targetBookingId && bookings.length > 0) {
      const match = bookings.find(
        b => b.id === targetBookingId || b.booking_number?.toLowerCase() === targetBookingId.toLowerCase()
      );
      if (match) {
        setSelectedBooking(match);
        setExpandedIds(prev => new Set([...prev, match.id]));
      }
    }
  }, [targetBookingId, bookings]);

  // Toggle general shift availability
  const handleToggleAvailability = async () => {
    if (!user?.id || togglingAvailability) return;
    setTogglingAvailability(true);
    const nextVal = !isAvailable;
    const { error: err } = await toggleGeneralAvailability(user.id, nextVal);
    if (err) {
      setToast({ type: 'error', message: 'Failed to update availability status.' });
    } else {
      setIsAvailable(nextVal);
      setToast({
        type: 'success',
        message: `Shift status updated: You are now ${nextVal ? 'AVAILABLE for shoots' : 'OFF DUTY / UNAVAILABLE'}.`,
      });
    }
    setTogglingAvailability(false);
  };

  // KPI Metrics Calculation
  const counts = useMemo(() => {
    const total = bookings.length;
    const upcoming = bookings.filter(b => ['CONFIRMED', 'PHOTOGRAPHER_ASSIGNED'].includes(b.status)).length;
    const inProgress = bookings.filter(b => ['CAPTURE', 'EDITING', 'PRINTING'].includes(b.status)).length;
    const completed = bookings.filter(b => ['READY', 'COMPLETED'].includes(b.status)).length;
    return { total, upcoming, inProgress, completed };
  }, [bookings]);

  // Filter & Sort Bookings
  const filteredBookings = useMemo(() => {
    let list = bookings.filter(b => {
      const s = search.trim().toLowerCase();
      const brief = parseBookingBrief(b);
      const matchSearch =
        !s ||
        b.booking_number?.toLowerCase().includes(s) ||
        b.service?.name?.toLowerCase().includes(s) ||
        b.tier_name?.toLowerCase().includes(s) ||
        brief.clientName?.toLowerCase().includes(s) ||
        brief.cleanLocation?.name?.toLowerCase().includes(s) ||
        brief.academicSpecs?.school?.toLowerCase().includes(s) ||
        brief.academicSpecs?.degree?.toLowerCase().includes(s) ||
        brief.academicSpecs?.section?.toLowerCase().includes(s);

      if (!matchSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'upcoming') {
        return ['CONFIRMED', 'PHOTOGRAPHER_ASSIGNED'].includes(b.status);
      }
      if (statusFilter === 'in_progress') {
        return ['CAPTURE', 'EDITING', 'PRINTING'].includes(b.status);
      }
      if (statusFilter === 'completed') {
        return ['READY', 'COMPLETED'].includes(b.status);
      }
      return b.status === statusFilter;
    });

    list.sort((a, b) => {
      if (sortBy === 'date_asc') {
        return new Date(a.event_date || '9999-12-31') - new Date(b.event_date || '9999-12-31');
      }
      if (sortBy === 'date_desc') {
        return new Date(b.event_date || '0000-01-01') - new Date(a.event_date || '0000-01-01');
      }
      if (sortBy === 'booking_asc') {
        return (a.booking_number || '').localeCompare(b.booking_number || '');
      }
      if (sortBy === 'booking_desc') {
        return (b.booking_number || '').localeCompare(a.booking_number || '');
      }
      return 0;
    });

    return list;
  }, [bookings, search, statusFilter, sortBy]);

  // Card Expand Controls (Detailed in a click)
  const handleToggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allExpanded = filteredBookings.length > 0 && filteredBookings.every(b => expandedIds.has(b.id));

  const handleToggleExpandAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filteredBookings.map(b => b.id)));
    }
  };

  // Workflow Step 4: Accept Assignment
  const handleAccept = async (booking) => {
    setUpdatingId(booking.id);
    try {
      const { error: err } = await acceptAssignment({
        bookingId: booking.id,
        photographerId: user.id,
        photographerName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Photographer',
        bookingNumber: booking.booking_number,
      });

      if (err) throw err;
      setToast({ type: 'success', message: `Assignment accepted for #${booking.booking_number}! Session locked in.` });
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(prev => ({ ...prev, status: 'CONFIRMED' }));
      }
      await loadBookings();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to accept assignment.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Workflow Step 4: Confirm Decline
  const handleConfirmDecline = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setDeclining(true);
    try {
      const { error: err } = await declineAssignment({
        bookingId: selectedBooking.id,
        photographerId: user.id,
        photographerName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Photographer',
        bookingNumber: selectedBooking.booking_number,
        reason: declineReason.trim() || 'Unavailable for requested slot',
      });

      if (err) throw err;
      setToast({ type: 'success', message: `Assignment declined. #${selectedBooking.booking_number} returned to admin queue for reassignment.` });
      setDeclineModalOpen(false);
      setDeclineReason('');
      setSelectedBooking(null);
      await loadBookings();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to decline assignment.' });
    } finally {
      setDeclining(false);
    }
  };

  // Workflow Step 5: Confirm Reschedule Request
  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setRescheduling(true);
    try {
      const { error: err } = await requestRescheduleByPhotographer({
        bookingId: selectedBooking.id,
        photographerId: user.id,
        photographerName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Photographer',
        bookingNumber: selectedBooking.booking_number,
        proposedDate,
        proposedTime,
        reason: rescheduleReason.trim() || 'Schedule conflict',
      });

      if (err) throw err;
      setToast({ type: 'success', message: `Reschedule request for #${selectedBooking.booking_number} sent to studio admin.` });
      setRescheduleModalOpen(false);
      setProposedDate('');
      setProposedTime('');
      setRescheduleReason('');
      await loadBookings();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to submit reschedule request.' });
    } finally {
      setRescheduling(false);
    }
  };

  // Workflow Step 6: Advance Session Status
  const handleAdvanceStatus = async (bookingId, targetStatus) => {
    setUpdatingId(bookingId);
    try {
      const logRemarks = remarks.trim() || `Status updated to ${targetStatus} by studio photographer.`;
      const { error: updateErr } = await updateBookingStatusByPhotographer(
        bookingId,
        targetStatus,
        logRemarks,
        user.id
      );

      if (updateErr) throw updateErr;

      setToast({ type: 'success', message: `Photoshoot status progressed to ${targetStatus}!` });
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(prev => ({ ...prev, status: targetStatus }));
      }

      // Emit synchronized transfer log to Front Desk Staff
      const targetBk = bookings.find(b => b.id === bookingId);
      if (targetBk) {
        await createTransferLog({
          bookingId: targetBk.id,
          senderId: user.id,
          senderRole: 'photographer',
          targetRole: 'staff',
          transferType: targetStatus === 'READY' ? 'OUTPUT_SUBMISSION' : 'ORDER_HANDOFF',
          priority: 'NORMAL',
          title: `Studio Bay Update: #${targetBk.booking_number} -> ${targetStatus}`,
          message: logRemarks,
          payload: {
            new_status: targetStatus,
            booking_number: targetBk.booking_number,
          },
        });
      }

      setRemarks('');
      await loadBookings();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update photoshoot status.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Issue Escalation to Desk
  const handleReportIssue = async (e) => {
    e.preventDefault();
    if (!issueTitle.trim() || !issueMessage.trim() || !selectedBooking) return;

    setReportingIssue(true);
    const { error: err } = await createTransferLog({
      bookingId: selectedBooking.id,
      senderId: user.id,
      senderRole: 'photographer',
      targetRole: 'staff',
      transferType: 'ISSUE_ESCALATION',
      priority: issuePriority,
      title: issueTitle,
      message: issueMessage,
      payload: {
        booking_number: selectedBooking.booking_number,
        reported_by: 'Studio Photographer',
      },
    });
    setReportingIssue(false);

    if (err) {
      setToast({ type: 'error', message: 'Failed to escalate issue: ' + err.message });
    } else {
      setToast({ type: 'success', message: 'Studio issue transmitted to Front Desk Staff!' });
      setIssueModalOpen(false);
      setIssueTitle('');
      setIssueMessage('');
    }
  };

  const getReferenceImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('references').getPublicUrl(path);
    return data?.publicUrl || '';
  };

  const displayName = profile?.first_name
    ? `${profile.first_name}`
    : user?.email?.split('@')[0] || 'Photographer';

  const operationalSummary = loading
    ? 'Synchronizing assigned studio sessions…'
    : `${counts.total} assigned shoot${counts.total !== 1 ? 's' : ''} · ${counts.upcoming} upcoming · Status: ${isAvailable ? 'Available' : 'Off Duty'}`;

  return (
    <div className="space-y-8 animate-fade-in max-w-screen-2xl mx-auto pb-16 font-body">
      {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}

      {/* ── 1. Luxury Dark Hero Banner with Live Philippine Studio Clock ──────── */}
      <AdminHeroBanner
        station="photographer"
        userName={displayName}
        title="My Assigned Bookings"
        subtitle="Manage your scheduled photoshoot assignments, review client briefs, and coordinate with admin."
        statusSummary={operationalSummary}
        primaryAction={{
          label: 'Availability Schedule',
          href: '/photographer/availability',
          icon: CalendarDays,
        }}
        secondaryAction={{
          label: 'Upload Outputs',
          href: '/photographer/uploads',
          icon: Upload,
        }}
        onRefresh={loadBookings}
        isRefreshing={loading}
        extraTools={[
          {
            label: isAvailable ? 'Shift: Available' : 'Shift: Off Duty',
            sublabel: isAvailable ? 'Click to set off duty' : 'Click to set available',
            icon: isAvailable ? CheckCircle2 : AlertCircle,
            iconColor: isAvailable ? 'text-emerald-400' : 'text-neutral-400',
            onClick: handleToggleAvailability,
          },
          {
            label: 'Availability Calendar',
            sublabel: 'Manage day blocks',
            icon: CalendarClock,
            onClick: () => navigate('/photographer/availability'),
          },
          {
            label: 'Studio Dashboard',
            sublabel: 'Overview & metrics',
            icon: Layers,
            onClick: () => navigate('/photographer/dashboard'),
          },
        ]}
      />

      {/* ── 2. KPI Metric Strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { key: 'all', label: 'Total Assigned', count: counts.total, sub: 'All assigned shoots', icon: CalendarDays, color: 'text-primary' },
          { key: 'upcoming', label: 'Upcoming / Confirmed', count: counts.upcoming, sub: 'Ready for capture', icon: Clock, color: 'text-gold-dark' },
          { key: 'in_progress', label: 'In Production', count: counts.inProgress, sub: 'Capture or editing', icon: Camera, color: 'text-primary' },
          { key: 'completed', label: 'Ready & Completed', count: counts.completed, sub: 'Finished sessions', icon: CheckCircle2, color: 'text-emerald-600' },
        ].map(kpi => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => setStatusFilter(kpi.key)}
            className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none bg-white hover:border-gold/60 hover:shadow-xs ${
              statusFilter === kpi.key
                ? 'border-gold ring-2 ring-gold/20 bg-gold/5'
                : 'border-neutral-200/90 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {kpi.label}
              </span>
              <kpi.icon size={16} className={kpi.color} />
            </div>
            <p className={`text-2xl sm:text-3xl font-heading font-bold ${kpi.color}`}>
              {loading ? '—' : kpi.count}
            </p>
            <span className="text-[11px] text-neutral-500 mt-0.5 block font-body">
              {kpi.sub}
            </span>
          </button>
        ))}
      </div>

      {/* ── 3. Streamlined Search & Filter Toolbar ─────────────────────────── */}
      <div className="rounded-2xl p-3 sm:p-4 bg-white border border-neutral-200/80 shadow-2xs">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search booking #, client, service, school, or strand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Clean Controls Row */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/80 overflow-x-auto">
              {[
                { key: 'all', label: 'All', count: counts.total },
                { key: 'upcoming', label: 'Upcoming', count: counts.upcoming },
                { key: 'in_progress', label: 'In Bay', count: counts.inProgress },
                { key: 'completed', label: 'Ready', count: counts.completed },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    statusFilter === tab.key
                      ? 'bg-white text-primary shadow-2xs'
                      : 'text-neutral-500 hover:text-primary'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    statusFilter === tab.key ? 'bg-neutral-900 text-white' : 'bg-neutral-200/70 text-neutral-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <CustomDropdown
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'date_asc', label: 'Earliest Shoot' },
                { value: 'date_desc', label: 'Latest Shoot' },
                { value: 'booking_asc', label: 'Booking # (Asc)' },
                { value: 'booking_desc', label: 'Booking # (Desc)' },
              ]}
              label=""
              placeholder="Sort..."
              className="w-36 sm:w-40"
              popoverWidth="w-44"
            />

            {/* Expand / Collapse All Details */}
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title={allExpanded ? 'Collapse all' : 'Expand all'}
            >
              {allExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span className="hidden sm:inline">{allExpanded ? 'Collapse All' : 'Expand All'}</span>
            </button>

            {/* Layout Toggle (Stack vs 2-Col Grid) */}
            <div className="flex items-center rounded-xl bg-neutral-100 p-0.5 border border-neutral-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('detailed')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'detailed'
                    ? 'bg-white text-primary shadow-2xs'
                    : 'text-neutral-500 hover:text-primary'
                }`}
                title="Full-Width Stack View"
              >
                <LayoutList size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-primary shadow-2xs'
                    : 'text-neutral-500 hover:text-primary'
                }`}
                title="2-Column Grid View"
              >
                <LayoutGrid size={14} />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-semibold">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── 4. Detailed Bookings Feed (In a click inspection) ────────────────── */}
      {loading ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-neutral-200/80 shadow-xs">
          <Loader2 size={32} className="animate-spin text-gold mx-auto mb-3" />
          <p className="text-xs text-neutral-400 font-body">Synchronizing assigned shoot records…</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-neutral-300 p-8 shadow-xs max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 ring-8 ring-gold/5 flex items-center justify-center text-gold mx-auto mb-3 shadow-xs">
            <Camera size={28} />
          </div>
          <h3 className="font-heading text-lg font-bold text-primary">No Matching Bookings Found</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto leading-relaxed font-body">
            {search
              ? `No shoots matched "${search}". Try adjusting your keywords or clearing the status filter.`
              : 'There are currently no photoshoot orders assigned to your bay under this filter. New bookings will appear here once scheduled by studio administration.'}
          </p>
          {(search || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
              className="mt-4 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-gold text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-5' : 'space-y-4'}>
          {filteredBookings.map(b => (
            <PhotographerBookingCard
              key={b.id}
              booking={b}
              isExpanded={expandedIds.has(b.id)}
              onToggleExpand={() => handleToggleExpand(b.id)}
              updatingId={updatingId}
              onAccept={handleAccept}
              onDecline={(booking) => {
                setSelectedBooking(booking);
                setDeclineReason('');
                setDeclineModalOpen(true);
              }}
              onAdvanceStatus={(targetId, targetStatus) => handleAdvanceStatus(targetId, targetStatus)}
              onReschedule={(booking) => {
                setSelectedBooking(booking);
                setProposedDate(booking.event_date || '');
                setProposedTime(booking.preferred_time || '');
                setRescheduleReason('');
                setRescheduleModalOpen(true);
              }}
              onReportIssue={(booking) => {
                setSelectedBooking(booking);
                setIssueTitle(`Bay Issue - #${booking.booking_number}`);
                setIssueMessage('');
                setIssuePriority('HIGH');
                setIssueModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* ── Decline Assignment Modal Dialog ─────────────────────────────────── */}
      {declineModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-fade-in font-body">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle size={20} />
                <h3 className="font-heading text-base font-bold">Decline Shoot Assignment</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeclineModalOpen(false)}
                className="text-neutral-400 hover:text-primary p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to decline booking <strong className="text-primary font-bold">#{selectedBooking.booking_number}</strong>? 
              This will unassign your bay and return the booking to the Admin dashboard for urgent reassignment.
            </p>

            <form onSubmit={handleConfirmDecline} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 uppercase tracking-wider mb-1">
                  Reason for Declining <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, equipment calibration, out of town..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-body focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setDeclineModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={declining}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {declining ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                  <span>Confirm Decline &amp; Return to Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Request Reschedule Modal Dialog ─────────────────────────────────── */}
      {rescheduleModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-fade-in font-body">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-primary font-bold">
                <CalendarClock size={20} className="text-gold" />
                <h3 className="font-heading text-base font-bold">Request Session Reschedule</h3>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="text-neutral-400 hover:text-primary p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Propose an alternate shooting slot for booking <strong className="text-primary font-bold">#{selectedBooking.booking_number}</strong>. An official handoff ticket will be sent to the studio admin.
            </p>

            <form onSubmit={handleConfirmReschedule} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 uppercase tracking-wider mb-1">
                    Proposed Date
                  </label>
                  <input
                    type="date"
                    required
                    value={proposedDate}
                    onChange={(e) => setProposedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-body focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 uppercase tracking-wider mb-1">
                    Proposed Time
                  </label>
                  <input
                    type="time"
                    required
                    value={proposedTime}
                    onChange={(e) => setProposedTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-body focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 uppercase tracking-wider mb-1">
                  Reason for Reschedule <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Inclement weather, lighting maintenance, customer request..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-body focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduling}
                  className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {rescheduling ? <Loader2 size={13} className="animate-spin" /> : <CalendarClock size={13} />}
                  <span>Submit to Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Studio Issue Reporting Modal ──────────────────────────────────────── */}
      {issueModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-fade-in font-body">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold">
                <AlertCircle size={18} />
                <h3 className="font-heading text-base font-bold">Report Bay Issue to Front Desk</h3>
              </div>
              <button
                type="button"
                onClick={() => setIssueModalOpen(false)}
                className="text-neutral-400 hover:text-primary p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleReportIssue} className="space-y-3 font-body text-xs">
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Issue Summary
                </label>
                <input
                  type="text"
                  value={issueTitle}
                  onChange={e => setIssueTitle(e.target.value)}
                  placeholder="e.g. Toga Robe Size L Needed / Client Late"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Priority
                </label>
                <select
                  value={issuePriority}
                  onChange={e => setIssuePriority(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 outline-none"
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent (Bay Blocked)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Floor Instructions &amp; Details
                </label>
                <textarea
                  value={issueMessage}
                  onChange={e => setIssueMessage(e.target.value)}
                  rows={3}
                  placeholder="Explain what is needed from front desk..."
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 outline-none resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 font-semibold text-xs hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportingIssue}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  {reportingIssue ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  <span>Transmit to Front Desk</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
