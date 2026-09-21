import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  User,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
  Calendar,
  Layers,
  Upload,
  CalendarClock,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  School,
  GraduationCap,
  Shirt,
  Palette,
  MessageSquare,
  FileImage,
} from 'lucide-react';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import StatCard from '../../components/admin/StatCard';
import BookingLifecycleBadge from '../../components/admin/BookingLifecycleBadge';
import PhotographerBookingCard from '../../components/photographer/PhotographerBookingCard';
import { supabase } from '../../lib/supabase';
import {
  getAssignedBookings,
  getPhotographerStats,
  updateBookingStatusByPhotographer,
  acceptAssignment,
  declineAssignment,
  requestRescheduleByPhotographer,
  toggleGeneralAvailability,
  getPhotographerProfileData,
} from '../../services/photographerService';

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
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

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

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [statsRes, bookingsRes, profileRes] = await Promise.all([
        getPhotographerStats(user.id),
        getAssignedBookings(user.id),
        getPhotographerProfileData(user.id),
      ]);

      if (statsRes.data) {
        setStats(statsRes.data);
      }

      if (profileRes?.data) {
        setIsAvailable(profileRes.data.is_available ?? true);
      }

      if (bookingsRes.data) {
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
    ? 'Loading assigned sessions…'
    : `${stats.todayShoots} session${stats.todayShoots !== 1 ? 's' : ''} today · ${stats.inProgress} in progress · ${isAvailable ? 'Available' : 'Off Duty'}`;

  return (
    <div className="space-y-8 animate-fade-in max-w-screen-2xl mx-auto pb-12 font-body">

      {/* ── 1. Hero Banner ──────────────────────────────────────────────── */}
      <AdminHeroBanner
        station="photographer"
        userName={displayName}
        statusSummary={operationalSummary}
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
        onRefresh={loadData}
        isRefreshing={loading}
        extraTools={[
          {
            label: isAvailable ? 'Status: Available' : 'Status: Off Duty',
            sublabel: isAvailable ? 'Click to set off duty' : 'Click to set available',
            icon: isAvailable ? CheckCircle2 : AlertCircle,
            iconColor: isAvailable ? 'text-emerald-400' : 'text-neutral-400',
            onClick: handleToggleAvailability,
          },
          {
            label: 'Availability Schedule',
            sublabel: 'Update working slots',
            icon: CalendarClock,
            onClick: () => navigate('/photographer/availability'),
          },
          {
            label: 'Workstation Hub',
            sublabel: 'View studio transfers',
            icon: Layers,
            onClick: () => navigate('/admin/workstation'),
          },
        ]}
      />

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

      {/* ── 2. KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Today's Shoots"
          value={loading ? '—' : stats.todayShoots}
          icon={CalendarDays}
          color="blue"
          loading={loading}
          subtitle="Scheduled for today"
          badgeText={stats.todayShoots > 0 ? `${stats.todayShoots} Today` : undefined}
          onClick={() => navigate('/photographer/bookings')}
        />

        <StatCard
          label="Upcoming (7 Days)"
          value={loading ? '—' : stats.upcomingWeek}
          icon={Clock}
          color="amber"
          loading={loading}
          subtitle="Next seven days"
          onClick={() => navigate('/photographer/bookings')}
        />

        <StatCard
          label="In Production"
          value={loading ? '—' : stats.inProgress}
          icon={Camera}
          color="gold"
          loading={loading}
          subtitle="Capture or editing"
          badgeText={stats.inProgress > 0 ? 'Active' : undefined}
          onClick={() => navigate('/photographer/bookings')}
        />

        <StatCard
          label="Completed Shoots"
          value={loading ? '—' : stats.completed}
          icon={CheckCircle2}
          color="green"
          loading={loading}
          subtitle="Finished sessions"
          onClick={() => navigate('/photographer/bookings')}
        />
      </div>

      {/* ── 3. Main Schedule & Actions Section ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left 8 Cols: Upcoming Assigned Shoots */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="font-heading text-xl text-primary font-bold tracking-tight">
                  Upcoming Assigned Shoots
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Click any order to view specifications and shoot progression
                </p>
              </div>
              {upcomingBookings.length > 0 && (
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-gold/15 text-gold border border-gold/30">
                  {upcomingBookings.length} Active
                </span>
              )}
            </div>
            <Link
              to="/photographer/bookings"
              className="text-xs font-semibold text-gold hover:text-primary transition-colors flex items-center gap-1 group"
            >
              <span>View All in My Bookings</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
              <Loader2 size={28} className="animate-spin text-gold mx-auto mb-2" />
              <p className="text-xs text-neutral-400">Loading assigned sessions…</p>
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="relative overflow-hidden bg-white rounded-2xl border border-neutral-200/80 shadow-xs p-8 sm:p-10 text-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

              <div className="relative z-10 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gold/10 ring-8 ring-gold/5 flex items-center justify-center text-gold mx-auto shadow-xs">
                  <Camera size={30} />
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
                    className="btn-outline py-2 px-4 text-xs flex items-center gap-1.5"
                  >
                    <CalendarClock size={14} />
                    <span>Check Working Schedule</span>
                  </Link>
                  <Link
                    to="/photographer/uploads"
                    className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <Upload size={14} />
                    <span>Upload Session Output</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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

        {/* Right 4 Cols: Bay Status & Quick Tools */}
        <div className="lg:col-span-4 space-y-5">

          {/* Card 2: Availability & Shift */}
          <div className="rounded-2xl p-5 bg-white border border-neutral-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-heading text-sm sm:text-base text-neutral-900 font-bold flex items-center gap-2">
                <CalendarClock size={16} className="text-gold" />
                <span>Shoot Availability</span>
              </h3>
              {isAvailable ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Available
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                  Off Duty
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              {isAvailable
                ? "Marked as available. Front desk can schedule bookings to your bay."
                : "Marked as off duty. Admins and staff will see you as unavailable."}
            </p>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleToggleAvailability}
              disabled={togglingAvailability}
              className={`w-full h-9 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isAvailable
                  ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              }`}
            >
              {togglingAvailability ? (
                <Loader2 size={13} className="animate-spin" />
              ) : isAvailable ? (
                <X size={14} className="text-neutral-500" />
              ) : (
                <Check size={14} />
              )}
              <span>{isAvailable ? "Set Status to Off Duty" : "Set Status to Available"}</span>
            </motion.button>

            <Link
              to="/photographer/availability"
              className="w-full h-9 px-3 rounded-xl border border-neutral-200 hover:border-gold text-neutral-700 hover:text-primary text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5"
            >
              <span>Manage Working Schedule</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Card 3: Session Outputs Uploads */}
          <div className="rounded-2xl p-5 bg-white border border-neutral-200/80 shadow-xs space-y-3.5">
            <h3 className="font-heading text-sm sm:text-base text-neutral-900 font-bold flex items-center gap-2">
              <Upload size={16} className="text-gold" />
              <span>Deliver Session Outputs</span>
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Upload raw or edited high-resolution shoot files directly to bookings for studio verification.
            </p>
            <Link
              to="/photographer/uploads"
              className="w-full h-9 px-4 rounded-xl bg-neutral-900 text-white hover:bg-black text-xs font-bold text-center transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <Upload size={13} className="text-gold" />
              <span>Upload Photo Files</span>
            </Link>
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