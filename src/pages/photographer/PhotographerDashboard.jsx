import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CalendarCheck,
  CalendarClock,
  Camera,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
  Layers,
  Upload,
  Check,
  X,
  Edit3,
} from 'lucide-react';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CategorizedMetricStrip from '../../components/admin/CategorizedMetricStrip';
import StatCard from '../../components/admin/StatCard';
import BookingLifecycleBadge from '../../components/admin/BookingLifecycleBadge';
import PhotographerBookingCard from '../../components/photographer/PhotographerBookingCard';
import { supabase } from '../../lib/supabase';
import {
  getAssignedBookings,
  calculatePhotographerStats,
  updateBookingStatusByPhotographer,
  acceptAssignment,
  declineAssignment,
  requestRescheduleByPhotographer,
  toggleGeneralAvailability,
  getPhotographerProfileData,
  setAvailability,
} from '../../services/photographerService';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getTodayFormatted = () => {
  const d = new Date();
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function PhotographerDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    todayShoots: 0,
    upcomingWeek: 0,
    inProgress: 0,
    completed: 0,
  });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const upcomingRef = useRef(upcomingBookings);
  upcomingRef.current = upcomingBookings;

  const [updatingId, setUpdatingId] = useState(null);
  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  // Today's Availability State
  const [todayStatus, setTodayStatus] = useState('AVAILABLE'); // 'AVAILABLE' | 'UNAVAILABLE'
  const [isSavingToday, setIsSavingToday] = useState(false);
  const [isTodaySaved, setIsTodaySaved] = useState(false);

  // Decline Modal State
  const [declineModalBooking, setDeclineModalBooking] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);

  // Reschedule Modal State
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState(null);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  const loadData = async (isManual = false) => {
    if (!user?.id) return;
    const hasData = upcomingRef.current.length > 0;
    if (!isManual && !hasData) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const [bookingsRes, profileRes] = await Promise.all([
        getAssignedBookings(user.id),
        getPhotographerProfileData(user.id),
      ]);

      if (profileRes?.data) {
        const isGeneralAvail = profileRes.data.is_available ?? true;
        setIsAvailable(isGeneralAvail);
        setTodayStatus(isGeneralAvail ? 'AVAILABLE' : 'UNAVAILABLE');
      }

      // Check for explicit today schedule entry
      try {
        const todayStr = getTodayStr();
        const { data: todayRecords } = await supabase
          .from('photographer_availability')
          .select('status, is_available, availability_date, date')
          .eq('photographer_id', user.id);

        if (todayRecords && todayRecords.length > 0) {
          const match = todayRecords.find(
            (r) => (r.availability_date && r.availability_date.substring(0, 10) === todayStr) ||
                   (r.date && r.date.substring(0, 10) === todayStr)
          );
          if (match) {
            const isUnavail = match.status?.toUpperCase() === 'UNAVAILABLE' ||
                              match.status?.toUpperCase() === 'BLOCKED' ||
                              match.is_available === false;
            setTodayStatus(isUnavail ? 'UNAVAILABLE' : 'AVAILABLE');
            setIsTodaySaved(true);
          }
        }
      } catch (err) {
        // Fallback to profile general availability
      }

      if (bookingsRes.data) {
        const computedStats = calculatePhotographerStats(bookingsRes.data || []);
        setStats(computedStats);

        const sorted = (bookingsRes.data || [])
          .filter(b => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status))
          .sort((a, b) => new Date(a.event_date || 0) - new Date(b.event_date || 0));
        setUpcomingBookings(sorted.slice(0, 8));
        if (sorted.length > 0 && !expandedBookingId) {
          setExpandedBookingId(sorted[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load photographer dashboard data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleToggleAvailability = async () => {
    if (!user?.id || togglingAvailability) return;
    setTogglingAvailability(true);
    const nextVal = !isAvailable;
    const { error: err } = await toggleGeneralAvailability(user.id, nextVal);
    if (err) {
      setFeedback({ type: 'error', message: 'Failed to update availability status.' });
    } else {
      setIsAvailable(nextVal);
      setTodayStatus(nextVal ? 'AVAILABLE' : 'UNAVAILABLE');
      setFeedback({
        type: 'success',
        message: `Status updated: You are now ${nextVal ? 'AVAILABLE for assignments' : 'OFF DUTY / UNAVAILABLE'}.`
      });
    }
    setTogglingAvailability(false);
  };

  // Accept Assignment
  const handleAcceptAssignment = async (booking) => {
    setUpdatingId(booking.id);
    setFeedback(null);
    try {
      const { error } = await acceptAssignment({
        bookingId: booking.id,
        photographerId: user.id,
        photographerName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Photographer',
        bookingNumber: booking.booking_number,
      });

      if (error) throw error;
      setFeedback({ type: 'success', message: `Assignment accepted for #${booking.booking_number}! Session confirmed.` });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to accept assignment.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Confirm Decline
  const handleConfirmDecline = async (e) => {
    e.preventDefault();
    if (!declineModalBooking) return;
    setIsDeclining(true);
    setFeedback(null);
    try {
      const { error } = await declineAssignment({
        bookingId: declineModalBooking.id,
        photographerId: user.id,
        photographerName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Photographer',
        bookingNumber: declineModalBooking.booking_number,
        reason: declineReason.trim() || 'Schedule conflict / Unavailable',
      });

      if (error) throw error;
      setFeedback({ type: 'success', message: `Assignment declined. #${declineModalBooking.booking_number} returned to admin queue.` });
      setDeclineModalBooking(null);
      setDeclineReason('');
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to decline assignment.' });
    } finally {
      setIsDeclining(false);
    }
  };

  // Request Reschedule
  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleModalBooking) return;
    setIsRescheduling(true);
    setFeedback(null);
    try {
      const { error } = await requestRescheduleByPhotographer({
        bookingId: rescheduleModalBooking.id,
        photographerId: user.id,
        photographerName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Photographer',
        bookingNumber: rescheduleModalBooking.booking_number,
        proposedDate,
        proposedTime,
        reason: rescheduleReason.trim() || 'Photographer schedule adjustment',
      });

      if (error) throw error;
      setFeedback({ type: 'success', message: `Reschedule request for #${rescheduleModalBooking.booking_number} sent to Admin.` });
      setRescheduleModalBooking(null);
      setProposedDate('');
      setProposedTime('');
      setRescheduleReason('');
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit reschedule request.' });
    } finally {
      setIsRescheduling(false);
    }
  };

  // Advance Session Status
  const handleAdvanceStatus = async (bookingId, targetStatus) => {
    setUpdatingId(bookingId);
    setFeedback(null);
    try {
      const remarks = `Status updated to ${targetStatus} by photographer.`;
      const { error } = await updateBookingStatusByPhotographer(bookingId, targetStatus, remarks, user.id);
      if (error) throw error;
      setFeedback({ type: 'success', message: `Session status progressed to ${targetStatus}!` });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update session status.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Save Today's Availability Directly
  const handleSaveTodayAvailability = async () => {
    if (!user?.id || isSavingToday) return;
    setIsSavingToday(true);
    const todayStr = getTodayStr();
    const isAvail = todayStatus === 'AVAILABLE';
    try {
      const [availRes] = await Promise.all([
        setAvailability({
          photographer_id: user.id,
          date: todayStr,
          is_available: isAvail,
          status: todayStatus,
          start_time: '08:00:00',
          end_time: '17:00:00',
          notes: isAvail ? 'Full Day Available' : 'Off Duty / Blocked',
        }),
        toggleGeneralAvailability(user.id, isAvail),
      ]);

      if (availRes?.error) throw availRes.error;

      setIsAvailable(isAvail);
      setIsTodaySaved(true);
      setFeedback({
        type: 'success',
        message: `Today's schedule saved! Marked as ${isAvail ? 'Available (8:00 AM – 5:00 PM)' : 'Off Duty / Unavailable'}.`,
      });
    } catch (err) {
      console.error('Failed to save today availability:', err);
      setFeedback({
        type: 'error',
        message: 'Failed to save today\'s availability. Please try again.',
      });
    } finally {
      setIsSavingToday(false);
    }
  };
  const displayName = profile?.first_name
    ? `${profile.first_name}`
    : user?.email?.split('@')[0] || 'Photographer';

  const operationalSummary = loading
    ? 'Loading assigned sessions…'
    : `${stats.todayShoots} session${stats.todayShoots !== 1 ? 's' : ''} today · ${stats.inProgress} in progress · ${isAvailable ? 'Available' : 'Off Duty'}`;

  return (
    <div className="w-full pb-16 animate-fade-in font-body">

      {/* ── 1. Hero Banner ──────────────────────────────────────────────── */}
      <AdminHeroBanner
        station="photographer"
        userName={displayName}
        creativeRemark="Where creative vision meets studio excellence · Ready for today's productions."
        primaryAction={{
          label: 'My Assigned Shoots',
          href: '/photographer/bookings',
          icon: CalendarDays,
        }}
        secondaryAction={{
          label: 'Upload Outputs',
          href: '/photographer/uploads',
          icon: Upload,
        }}
        onRefresh={() => loadData(true)}
        isRefreshing={isRefreshing || loading}
        extraTools={[
          {
            label: isAvailable ? 'Set to Off Duty' : 'Set to Available',
            sublabel: isAvailable ? 'Mark bay unavailable' : 'Mark bay ready for shoots',
            icon: isAvailable ? AlertCircle : CheckCircle2,
            iconColor: isAvailable ? 'text-neutral-400' : 'text-emerald-400',
            onClick: handleToggleAvailability,
          },
          {
            label: 'Activity Logs',
            sublabel: 'View history trail',
            icon: Layers,
            onClick: () => navigate('/photographer/activity-logs'),
          },
        ]}
      />

      {/* ── Page Content Wrapper (Full Width Edge-to-Edge) ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-5 mt-2.5 sm:mt-3">

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold shadow-xs animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-neutral-400 hover:text-neutral-700 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── 2. KPI Cards (Unified Luxury Studio KPI Cards) ───────────────── */}
      <CategorizedMetricStrip
        loading={loading && upcomingBookings.length === 0}
        columns="grid-cols-2 lg:grid-cols-4"
        cards={[
          {
            key: 'today',
            label: stats.todayShoots > 0 ? `${stats.todayShoots} TODAY` : 'TODAY',
            subtitle: "TODAY'S BAY LINEUP",
            value: stats.todayShoots,
            onClick: () => navigate('/photographer/bookings')
          },
          {
            key: 'upcoming',
            label: '7 DAYS',
            subtitle: 'NEXT 7 DAYS PIPELINE',
            value: stats.upcomingWeek,
            onClick: () => navigate('/photographer/bookings')
          },
          {
            key: 'production',
            label: stats.inProgress > 0 ? 'ACTIVE' : 'PRODUCTION',
            subtitle: 'CAPTURE & EDITING',
            value: stats.inProgress,
            onClick: () => navigate('/photographer/bookings')
          },
          {
            key: 'completed',
            label: 'DELIVERED',
            subtitle: 'FINISHED & DELIVERED',
            value: stats.completed,
            onClick: () => navigate('/photographer/bookings')
          }
        ]}
      />

      {/* ── 3. Main Schedule & Actions Section ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">

        {/* Left 7 Cols: Upcoming Assigned Shoots */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Header Box (enclosing section title and view-all link in a card) */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg sm:text-xl text-primary font-bold tracking-tight">
                Upcoming Assigned Shoots
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Click any order to view specifications and shoot progression
              </p>
            </div>
            <div className="flex items-center gap-2">
              {upcomingBookings.length > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gold/15 text-gold border border-gold/30">
                  {upcomingBookings.length} Active
                </span>
              )}
              <Link
                to="/photographer/bookings"
                className="text-xs font-semibold text-neutral-700 hover:text-primary transition-colors flex items-center gap-1.5 group bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/90 px-3.5 py-2 rounded-xl shadow-2xs"
              >
                <span>View All in My Bookings</span>
                <ArrowRight size={13} className="text-gold group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {loading && upcomingBookings.length === 0 ? (
            <div className="flex-1 min-h-[360px] flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
              <Loader2 size={28} className="animate-spin text-gold mx-auto mb-2" />
              <p className="text-xs text-neutral-400">Loading assigned sessions…</p>
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="flex-1 min-h-[380px] flex flex-col items-center justify-center relative overflow-hidden bg-white rounded-2xl border border-neutral-200/80 shadow-xs p-8 sm:p-10 text-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

              <div className="relative z-10 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gold/10 ring-8 ring-gold/5 flex items-center justify-center text-gold mx-auto shadow-xs">
                  <Camera size={28} />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-primary font-bold">
                    No Active Shoots Assigned
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                    No active shoots are assigned to you right now. When the studio assigns appointments, your lineup will appear here automatically.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/photographer/availability"
                    className="h-9 px-4 rounded-xl border border-neutral-200 hover:border-gold bg-white hover:bg-neutral-50 text-neutral-700 hover:text-primary text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <CalendarClock size={13} className="text-gold" />
                    <span>Check Working Schedule</span>
                  </Link>
                  <Link
                    to="/photographer/uploads"
                    className="h-9 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Upload size={13} className="text-gold" />
                    <span>Upload Session Output</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className={`space-y-4 ${isRefreshing ? 'opacity-70 transition-opacity' : 'opacity-100 transition-opacity'}`}>
              {upcomingBookings.map(b => (
                <PhotographerBookingCard
                  key={b.id}
                  booking={b}
                  isExpanded={expandedBookingId === b.id}
                  onToggleExpand={() => setExpandedBookingId(expandedBookingId === b.id ? null : b.id)}
                  updatingId={updatingId}
                  onAccept={handleAcceptAssignment}
                  onDecline={(booking) => {
                    setDeclineModalBooking(booking);
                    setDeclineReason('');
                  }}
                  onAdvanceStatus={handleAdvanceStatus}
                  onReschedule={(booking) => {
                    setRescheduleModalBooking(booking);
                    setProposedDate(booking.event_date || '');
                    setProposedTime(booking.preferred_time || '');
                    setRescheduleReason('');
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Clean Station Boxes & Cards */}
        <div className="lg:col-span-5 flex flex-col space-y-4">

          {/* Card 1: Today's Availability with Dynamic Saved State & Rich Aesthetics */}
          <AnimatePresence mode="wait">
            {isTodaySaved ? (
              /* ── BRAND NEW SAVED STATE UI ── */
              <motion.div
                key="saved-view"
                initial={{ opacity: 0, scale: 0.97, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -8 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-neutral-950 via-neutral-900 to-[#0e1713] text-white border border-gold/35 shadow-xl space-y-4 font-body"
              >
                {/* Ambient Radial Gradient Glows */}
                <div
                  className={`absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
                    todayStatus === 'AVAILABLE' ? 'bg-emerald-500/20' : 'bg-rose-500/15'
                  }`}
                />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-gold/15 blur-3xl pointer-events-none" />

                {/* Top: Date & Status */}
                <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <p className="text-xs font-semibold text-neutral-400">
                    {getTodayFormatted()}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide border shadow-2xs ${
                      todayStatus === 'AVAILABLE'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        todayStatus === 'AVAILABLE' ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    {todayStatus === 'AVAILABLE' ? 'Available' : 'Off Duty'}
                  </span>
                </div>

                {/* Direct Status & Time */}
                <div className="relative z-10 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-between gap-3 shadow-inner">
                  <div className="space-y-1">
                    <h3 className="font-heading text-2xl font-bold tracking-tight text-white leading-none">
                      {todayStatus === 'AVAILABLE' ? (
                        <>Available <span className="text-gold italic font-normal">Today</span></>
                      ) : (
                        <>Off Duty <span className="text-amber-200 italic font-normal">Today</span></>
                      )}
                    </h3>
                    <p className="text-xs font-bold text-neutral-300 font-mono pt-1">
                      {todayStatus === 'AVAILABLE' ? '8:00 AM – 5:00 PM' : 'Blocked'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-gold bg-gold/15 border border-gold/30 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-gold" />
                      Saved
                    </span>
                  </div>
                </div>

                {/* Actions Footer: Update Status + Full Calendar */}
                <div className="relative z-10 pt-1 flex items-center justify-between gap-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsTodaySaved(false)}
                    className="h-8.5 px-3 rounded-lg text-xs font-bold text-neutral-300 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Edit3 size={13} className="text-gold" />
                    <span>Update Status</span>
                  </button>

                  <Link
                    to="/photographer/availability"
                    className="text-xs font-bold text-gold hover:text-gold-light transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Calendar</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </motion.div>
            ) : (
              /* ── ELEVATED EDITING / SELECTOR UI ── */
              <motion.div
                key="editing-view"
                initial={{ opacity: 0, scale: 0.97, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -8 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-white via-surface-warm to-amber-50/20 border border-neutral-200/90 shadow-sm space-y-4 font-body"
              >
                {/* Subtle Ambient Warm Glow */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-gold/15 via-amber-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between border-b border-neutral-200/70 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold/25 via-gold/10 to-transparent text-gold border border-gold/30 flex items-center justify-center shadow-2xs">
                      <CalendarCheck size={17} />
                    </div>
                    <div>
                      <h3 className="font-heading text-base sm:text-lg font-bold text-neutral-900 leading-tight">
                        Today's Availability
                      </h3>
                      <p className="text-[11px] font-semibold text-neutral-500 tracking-wide">
                        {getTodayFormatted()}
                      </p>
                    </div>
                  </div>

                  {/* Live Status Pill */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors shadow-2xs ${
                      todayStatus === 'AVAILABLE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        todayStatus === 'AVAILABLE' ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
                      }`}
                    />
                    {todayStatus === 'AVAILABLE' ? 'Available Today' : 'Off Duty Today'}
                  </span>
                </div>

                {/* Gradient Option Selector Cards */}
                <div className="relative z-10 grid grid-cols-2 gap-2.5">
                  {/* Option 1: Available */}
                  <button
                    type="button"
                    onClick={() => setTodayStatus('AVAILABLE')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                      todayStatus === 'AVAILABLE'
                        ? 'border-emerald-500 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/30 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-neutral-200/80 bg-white/90 hover:bg-neutral-50 text-neutral-600 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-heading text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-emerald-950">
                        Available
                      </span>
                      <CheckCircle2
                        size={15}
                        className={todayStatus === 'AVAILABLE' ? 'text-emerald-600' : 'text-neutral-300'}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-emerald-800 tracking-wide font-mono">
                        8:00 AM – 5:00 PM
                      </p>
                      <p className="text-xs text-neutral-500 font-medium">
                        Full day intake open
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Off Duty */}
                  <button
                    type="button"
                    onClick={() => setTodayStatus('UNAVAILABLE')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                      todayStatus === 'UNAVAILABLE'
                        ? 'border-rose-400 bg-gradient-to-br from-rose-50/90 via-white to-amber-50/30 ring-2 ring-rose-400/20 shadow-xs'
                        : 'border-neutral-200/80 bg-white/90 hover:bg-neutral-50 text-neutral-600 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-heading text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-rose-950">
                        Off Duty
                      </span>
                      <AlertCircle
                        size={15}
                        className={todayStatus === 'UNAVAILABLE' ? 'text-rose-600' : 'text-neutral-300'}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-neutral-800 tracking-wide">
                        Block Bay
                      </p>
                      <p className="text-xs text-neutral-500 font-medium">
                        No appointments
                      </p>
                    </div>
                  </button>
                </div>

                {/* Direct Save Button with Gradient and Typography */}
                <div className="relative z-10 pt-1 space-y-2">
                  <button
                    type="button"
                    onClick={handleSaveTodayAvailability}
                    disabled={isSavingToday}
                    className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-primary hover:from-black hover:to-neutral-900 text-white font-heading font-semibold text-xs tracking-wider shadow-md shadow-neutral-900/15 border border-gold/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSavingToday ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-gold" />
                        <span>Confirming Today's Schedule...</span>
                      </>
                    ) : (
                      <>
                        <Check size={15} className="text-gold" />
                        <span>Save Today's Availability</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-500">
                    <span className="text-neutral-400">Need to schedule future dates?</span>
                    <Link
                      to="/photographer/availability"
                      className="font-bold text-gold hover:text-gold-dark flex items-center gap-1 transition-colors"
                    >
                      <span>Full Calendar</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card 2: Station Shortcuts */}
          <div className="rounded-2xl p-5 bg-white border border-neutral-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-gold" />
                <h3 className="font-heading text-sm font-bold text-neutral-900">
                  Station Shortcuts
                </h3>
              </div>
              <span className="text-xs font-semibold text-neutral-400">
                Quick Access
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              <Link
                to="/photographer/uploads"
                className="p-3 rounded-xl border border-neutral-200/80 hover:border-gold hover:bg-neutral-50/80 transition-all text-left flex flex-col justify-between group shadow-2xs"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2 border border-amber-200/60">
                  <Upload size={13} />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900 group-hover:text-primary leading-tight">
                    Upload Outputs
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Deliver photos
                  </p>
                </div>
              </Link>

              <Link
                to="/photographer/bookings"
                className="p-3 rounded-xl border border-neutral-200/80 hover:border-gold hover:bg-neutral-50/80 transition-all text-left flex flex-col justify-between group shadow-2xs"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-2 border border-blue-200/60">
                  <CalendarCheck size={13} />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900 group-hover:text-primary leading-tight">
                    All Bookings
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Shoot archive
                  </p>
                </div>
              </Link>

              <Link
                to="/photographer/availability"
                className="p-3 rounded-xl border border-neutral-200/80 hover:border-gold hover:bg-neutral-50/80 transition-all text-left flex flex-col justify-between group shadow-2xs"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 border border-emerald-200/60">
                  <CalendarClock size={13} />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900 group-hover:text-primary leading-tight">
                    Working Hours
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Calendar & shifts
                  </p>
                </div>
              </Link>

              <Link
                to="/photographer/activity-logs"
                className="p-3 rounded-xl border border-neutral-200/80 hover:border-gold hover:bg-neutral-50/80 transition-all text-left flex flex-col justify-between group shadow-2xs"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-2 border border-purple-200/60">
                  <Layers size={13} />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900 group-hover:text-primary leading-tight">
                    Activity Logs
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    History & audit
                  </p>
                </div>
              </Link>
            </div>
          </div>

        </div>

      </div>
      </div>

      {/* ── Decline Assignment Modal Dialog ──────────────────────────────── */}
      <AnimatePresence>
        {declineModalBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-neutral-200 font-body"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertCircle size={20} />
                  <h3 className="font-heading text-base font-bold">Decline Shoot Assignment</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDeclineModalBooking(null)}
                  className="text-neutral-400 hover:text-primary p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                Are you sure you want to decline booking <strong className="text-primary font-bold">#{declineModalBooking.booking_number}</strong>?
                This will unassign your bay and return the booking to the Admin dashboard for reassignment.
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
                    placeholder="e.g. Prior external commitment, emergency, equipment calibration..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-body focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setDeclineModalBooking(null)}
                    className="h-9 px-4 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.97 }}
                    disabled={isDeclining}
                    className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isDeclining ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                    <span>Confirm Decline</span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Request Reschedule Modal Dialog ──────────────────────────────── */}
      <AnimatePresence>
        {rescheduleModalBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-neutral-200 font-body"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <CalendarClock size={20} className="text-gold" />
                  <h3 className="font-heading text-base font-bold">Request Session Reschedule</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRescheduleModalBooking(null)}
                  className="text-neutral-400 hover:text-primary p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                Propose an alternate shooting slot for booking <strong className="text-primary font-bold">#{rescheduleModalBooking.booking_number}</strong>. A handoff ticket will be sent to the studio admin.
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
                    placeholder="e.g. Severe weather, equipment delay, student client request..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-body focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setRescheduleModalBooking(null)}
                    className="h-9 px-4 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.97 }}
                    disabled={isRescheduling}
                    className="h-9 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isRescheduling ? <Loader2 size={13} className="animate-spin" /> : <CalendarClock size={13} className="text-gold" />}
                    <span>Submit to Admin</span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}