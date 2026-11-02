import React, { useState, useEffect, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Check,
  ArrowRight,
  CreditCard,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCustomerBookings, getCachedCustomerBookings } from '../../services/bookingService';
import Toast from '../../components/ui/Toast';
import QRPass from '../../components/booking/QRPass';
import { motion } from 'framer-motion';
import ClientHeroBanner from '../../components/dashboard/ClientHeroBanner';
import { BookingProgressSkeleton, SmartLoadingContainer } from '../../components/dashboard/skeletons';

/**
 * Formats date into readable string (e.g., 'Oct 4' or 'Sat, Oct 24, 2026')
 */
function fmtShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BookingProgressPage() {
  const { user, profile } = useAuth();
  const outletContext = useOutletContext();

  // Instant data from outlet context or cache prevents skeleton flashing
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
  const [selectedBookingId, setSelectedBookingId] = useState(initialBookings[0]?.id || null);
  const [loading, setLoading] = useState(initialBookings.length === 0);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  // Sync if outlet context updates
  useEffect(() => {
    if (outletContext?.bookings && Array.isArray(outletContext.bookings)) {
      const loaded = outletContext.bookings.filter((b) => !b.is_deleted);
      setBookings(loaded);
      if (loaded.length > 0 && !selectedBookingId) {
        setSelectedBookingId(loaded[0].id);
      }
      setLoading(false);
      setError(null);
    }
  }, [outletContext?.bookings]);

  const loadData = React.useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const { data, error: bErr } = await getCustomerBookings(user.id);
      if (bErr) {
        setError(bErr);
      } else {
        const loadedBookings = (data || []).filter((b) => !b.is_deleted);
        setBookings(loadedBookings);
        if (loadedBookings.length > 0 && !selectedBookingId) {
          setSelectedBookingId(loadedBookings[0].id);
        }
      }
    } catch (err) {
      console.warn('BookingProgressPage error loading bookings:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedBookingId]);

  useEffect(() => {
    if (!user) return;
    if (initialBookings.length > 0) {
      setBookings(initialBookings);
      setLoading(false);
    }
    loadData();
  }, [user?.id, loadData]);

  // Active Selected Booking
  const activeBooking = useMemo(() => {
    if (!bookings || bookings.length === 0) return null;
    return bookings.find(b => b.id.toString() === selectedBookingId?.toString()) || bookings[0];
  }, [bookings, selectedBookingId]);

  // Determine if admin has finished scheduling and confirming session
  const isSessionScheduledAndConfirmed = useMemo(() => {
    if (!activeBooking) return false;
    const s = (activeBooking.status || 'PENDING').toUpperCase();
    if (['REJECTED', 'CANCELLED', 'PENDING', 'RESERVED'].includes(s)) return false;
    if (s === 'CONFIRMED' || s === 'PHOTOGRAPHER_ASSIGNED') {
      return Boolean(activeBooking.event_date && activeBooking.preferred_time);
    }
    return true; // CAPTURE, EDITING, RETOUCHING, FINALIZED, PRINTING, READY, UNDER_DELIVERY, COMPLETED
  }, [activeBooking]);

  // Compute overall progress metrics across 7 stages with realistic percentage measurement
  const progressStage = useMemo(() => {
    if (!activeBooking) return { stage: 1, pct: 10, isAwaitingSchedule: false };
    const s = (activeBooking.status || 'PENDING').toUpperCase();

    if (s === 'REJECTED' || s === 'CANCELLED') return { stage: 1, pct: 0, isAwaitingSchedule: false };
    if (s === 'COMPLETED') return { stage: 7, pct: 100, isAwaitingSchedule: false };
    if (s === 'READY' || s === 'UNDER_DELIVERY') return { stage: 7, pct: 95, isAwaitingSchedule: false };
    if (s === 'FINALIZED' || s === 'PRINTING') return { stage: 6, pct: 85, isAwaitingSchedule: false };
    if (s === 'RETOUCHING') return { stage: 5, pct: 70, isAwaitingSchedule: false };
    if (s === 'EDITING') return { stage: 4, pct: 55, isAwaitingSchedule: false };
    if (s === 'CAPTURE' || s === 'IN_PROGRESS') return { stage: 3, pct: 40, isAwaitingSchedule: false };

    // Stage 2 (Confirmed & Reserved) requires confirmed schedule
    if (isSessionScheduledAndConfirmed) {
      if (s === 'PHOTOGRAPHER_ASSIGNED') return { stage: 2, pct: 25, isAwaitingSchedule: false };
      return { stage: 2, pct: 20, isAwaitingSchedule: false };
    }

    // Step 2 is in progress: Admin is coordinating schedule (10% real measurement for 2 initial updates)
    return {
      stage: 1,
      pct: 10,
      isAwaitingSchedule: true
    };
  }, [activeBooking, isSessionScheduledAndConfirmed]);

  // Financial breakdown & downpayment state
  const financialInfo = useMemo(() => {
    if (!activeBooking) return { totalAmount: 0, downPaid: 0, remBalance: 0, needsDownpayment: false, downRequired: 0 };
    const totalAmount = Number(activeBooking.total_amount || 0);
    const downPaid = Number(activeBooking.down_payment_amount || 0);
    const remBalance = activeBooking.remaining_balance !== undefined && activeBooking.remaining_balance !== null
      ? Number(activeBooking.remaining_balance)
      : Math.max(0, totalAmount - downPaid);
    const isUnpaid = !activeBooking.payment_status || (activeBooking.payment_status || '').toUpperCase() === 'UNPAID';
    const canPayDownpayment = isSessionScheduledAndConfirmed || (progressStage.stage >= 2);
    const needsDownpayment = canPayDownpayment && (isUnpaid || remBalance > 0) && (!activeBooking.down_payment_confirmed && downPaid === 0);
    const downRequired = Math.min(remBalance, Math.max(500, Math.round(totalAmount * 0.5)));
    return { totalAmount, downPaid, remBalance, needsDownpayment, downRequired };
  }, [activeBooking, isSessionScheduledAndConfirmed, progressStage.stage]);

  // 7-step timeline matching the reference design exactly
  const timelineSteps = useMemo(() => {
    if (!activeBooking) return [];

    const isDelivery = Boolean(
      activeBooking.delivery_address ||
      activeBooking.fulfillment_type === 'DELIVERY' ||
      activeBooking.status === 'UNDER_DELIVERY' ||
      profile?.studio_specs?.fulfillment_mode === 'DELIVERY'
    );

    const s = progressStage.stage;

    // Step state calculation
    const getStepState = (stepNumber) => {
      if (progressStage.isAwaitingSchedule) {
        if (stepNumber === 1) return 'COMPLETED';
        if (stepNumber === 2) return 'CURRENT';
        return 'UPCOMING';
      }
      if (stepNumber < s) return 'COMPLETED';
      if (stepNumber === s) return 'CURRENT';
      return 'UPCOMING';
    };

    const createdFormatted = activeBooking.created_at ? fmtShortDate(activeBooking.created_at) : 'Oct 4';
    const eventFormatted = activeBooking.event_date ? fmtShortDate(activeBooking.event_date) : (isSessionScheduledAndConfirmed ? 'Confirmed' : 'Pending');

    return [
      {
        num: 1,
        title: 'Booking received',
        subtitle: createdFormatted,
        state: getStepState(1),
      },
      {
        num: 2,
        title: 'Schedule',
        subtitle: progressStage.isAwaitingSchedule ? 'In progress' : (isSessionScheduledAndConfirmed ? 'Confirmed' : 'Pending'),
        state: getStepState(2),
      },
      {
        num: 3,
        title: 'Reserved',
        subtitle: isSessionScheduledAndConfirmed ? eventFormatted : 'Pending',
        state: getStepState(3),
      },
      {
        num: 4,
        title: 'Pictorial',
        subtitle: 'Shoot day',
        state: getStepState(4),
      },
      {
        num: 5,
        title: 'Editing',
        subtitle: 'Studio edit',
        state: getStepState(5),
      },
      {
        num: 6,
        title: 'Finalizing',
        subtitle: 'Print & pack',
        state: getStepState(6),
      },
      {
        num: 7,
        title: 'Ready',
        subtitle: isDelivery ? 'Delivery' : 'Pickup',
        state: getStepState(7),
      },
    ];
  }, [activeBooking, progressStage, isSessionScheduledAndConfirmed, profile]);

  // Dynamic Current Milestone Box details & Top Headline
  const currentMilestoneInfo = useMemo(() => {
    if (!activeBooking) {
      return {
        badge: '01',
        headline: <>Your shoot is being<br className="hidden sm:inline" /> scheduled.</>,
        title: 'Awaiting schedule confirmation',
        desc: "Our studio team is coordinating your pictorial date. You'll receive an app notification as soon as it is confirmed.",
      };
    }

    const s = (activeBooking.status || 'PENDING').toUpperCase();
    const isDelivery = Boolean(
      activeBooking.delivery_address ||
      activeBooking.fulfillment_type === 'DELIVERY' ||
      s === 'UNDER_DELIVERY' ||
      profile?.studio_specs?.fulfillment_mode === 'DELIVERY'
    );

    // 1. Awaiting admin schedule & session confirmation
    if (progressStage.isAwaitingSchedule) {
      return {
        badge: '02',
        headline: <>Your shoot is being<br className="hidden sm:inline" /> scheduled.</>,
        title: 'Awaiting schedule confirmation',
        desc: "Our studio team is coordinating your pictorial date. You'll receive an app notification as soon as it is confirmed.",
      };
    }

    // 2. Confirmed & Reserved
    if (s === 'CONFIRMED' || s === 'PHOTOGRAPHER_ASSIGNED') {
      const photographerName = activeBooking.photographer?.profile
        ? `${activeBooking.photographer.profile.first_name || ''} ${activeBooking.photographer.profile.last_name || ''}`.trim()
        : (activeBooking.photographer?.name || '');
      const withPhotographer = photographerName ? ` with ${photographerName}` : '';

      return {
        badge: '03',
        headline: <>Your session is confirmed<br className="hidden sm:inline" /> & reserved.</>,
        title: 'Pictorial approved & reserved',
        desc: `Your studio pictorial session is officially reserved${withPhotographer}. Prepare your wardrobe, graduation toga, and visual pegs.`,
      };
    }

    // 3. Ongoing Pictorial
    if (s === 'CAPTURE' || s === 'IN_PROGRESS') {
      return {
        badge: '04',
        headline: <>Your pictorial is<br className="hidden sm:inline" /> underway.</>,
        title: 'Studio pictorial in session',
        desc: 'Your photoshoot is currently taking place in our studio camera bay. Strike your best poses and capture milestone memories!',
      };
    }

    // 4. Editing
    if (s === 'EDITING') {
      return {
        badge: '05',
        headline: <>Your photos are<br className="hidden sm:inline" /> being edited.</>,
        title: 'Digital curation & editing',
        desc: 'Our digital darkroom artists are reviewing RAW captures, balancing colors, and preparing proofs.',
      };
    }

    // 5. Retouching
    if (s === 'RETOUCHING') {
      return {
        badge: '05',
        headline: <>Master retouching<br className="hidden sm:inline" /> in progress.</>,
        title: 'Fine-art master retouching',
        desc: 'High-end aesthetic grading, blemish refinement, and portrait finishing are being applied to your proofs.',
      };
    }

    // 6. Finalized / Printing
    if (s === 'FINALIZED' || s === 'PRINTING') {
      return {
        badge: '06',
        headline: <>Finalizing prints<br className="hidden sm:inline" /> & packaging.</>,
        title: 'Print production & assembly',
        desc: 'Archival prints are coming off the press, framed, packaged, and inspected for delivery or pickup.',
      };
    }

    // 7. Ready / Under Delivery / Completed
    if (s === 'READY' || s === 'UNDER_DELIVERY' || s === 'COMPLETED') {
      if (isDelivery) {
        return {
          badge: '07',
          headline: <>Your order is<br className="hidden sm:inline" /> on its way.</>,
          title: 'Out for direct delivery',
          desc: 'Your packaged prints are in transit to your registered address. Keep your phone handy for rider updates.',
        };
      }
      return {
        badge: '07',
        headline: <>Your package is<br className="hidden sm:inline" /> ready for pickup!</>,
        title: 'Ready for studio claiming',
        desc: 'Your photo package is complete and waiting for you at our Naga City studio desk. Present your QR code to claim.',
      };
    }

    // Concluded / Rejected
    return {
      badge: '01',
      headline: <>Order concluded.</>,
      title: 'Booking status: ' + s.toLowerCase(),
      desc: 'This booking has concluded. Please contact our studio desk if you have any questions.',
    };
  }, [activeBooking, progressStage.isAwaitingSchedule, profile]);

  const effectiveBookingNumber = activeBooking?.booking_number || 'BK-2026-00002';

  return (
    <SmartLoadingContainer
      loading={loading}
      hasData={bookings.length > 0}
      error={error}
      onRetry={loadData}
      skeleton={<BookingProgressSkeleton />}
      delayMs={220}
      title="Order Progress"
    >
      <div className="w-full min-h-[calc(100vh-5rem)] flex flex-col font-body pb-6">
        <Toast toast={toast} onClose={() => setToast(null)} />

        {/* Hero Header with Live Time & Greeting */}
        <ClientHeroBanner bookings={bookings} selectedBooking={activeBooking} />

        <div className="w-full flex-1 flex flex-col px-4 sm:px-6 lg:px-8 space-y-6 pt-3 animate-fade-in">

          {/* Downpayment Due Alert (if applicable) */}
          {financialInfo.needsDownpayment && (
            <div
              role="status"
              className="rounded-2xl px-5 py-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300/70 dark:border-amber-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0">
                  <CreditCard size={18} />
                </div>
                <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-200 font-normal">
                  <strong className="font-semibold text-amber-700 dark:text-amber-400">Downpayment needed</strong> for #{effectiveBookingNumber} &mdash;
                  pay <strong>₱{financialInfo.downRequired.toLocaleString()}</strong> to reserve your studio slot.
                </p>
              </div>
              <Link
                to="/dashboard/payments"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold transition-all shrink-0 text-center shadow-xs"
              >
                Pay downpayment
              </Link>
            </div>
          )}

          {/* ── Main Production Progress Card (Faithful Reference Redesign) ───── */}
          {activeBooking ? (
            <section
              aria-label="Order Production Progress"
              className="flex-1 flex flex-col justify-between rounded-[36px] bg-white dark:bg-[#111215] border border-neutral-200/80 dark:border-neutral-800/80 p-8 sm:p-12 lg:p-16 shadow-xs relative overflow-hidden select-none transition-colors min-h-[580px] lg:min-h-[640px]"
            >
              {/* Multi-booking switcher floating in top-right (if customer has more than 1 order) */}
              {bookings.length > 1 && (
                <div className="absolute top-7 right-8 sm:top-9 sm:right-12 z-20">
                  <select
                    value={activeBooking.id}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    className="text-[11px] bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-300 font-normal px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 cursor-pointer focus:outline-hidden focus:border-amber-500 shadow-2xs"
                    aria-label="Select order to track"
                  >
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        #{b.booking_number} — {b.tier_name || 'Session'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── Top Row: Eyebrow + Bold Headline on left, Overall Progress on right ── */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 shrink-0">
                {/* Left Side: Eyebrow & Bold Playfair Headline */}
                <div className="max-w-3xl">
                  <p className="text-[10.5px] sm:text-[11.5px] font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-500 mb-2 sm:mb-2.5">
                    Order Progress · {effectiveBookingNumber}
                  </p>

                  <h2 className="font-heading font-bold text-4xl sm:text-5xl lg:text-[56px] text-neutral-900 dark:text-white leading-[1.08] tracking-tight">
                    {currentMilestoneInfo.headline}
                  </h2>
                </div>

                {/* Right Side: Overall Progress Label & Big Percentage */}
                <div className="text-left md:text-right shrink-0">
                  <p className="text-[10.5px] sm:text-[11.5px] font-semibold uppercase tracking-[0.24em] text-neutral-400 dark:text-neutral-500 mb-2 sm:mb-2.5">
                    Overall Progress
                  </p>
                  <div className="font-heading font-normal sm:font-medium italic text-5xl sm:text-6xl lg:text-[68px] text-amber-500 dark:text-amber-400 leading-none text-left md:text-right">
                    {progressStage.pct}%
                  </div>
                </div>
              </div>

              {/* ── The 7-Step Milestone Tracker (Centered in Available Space) ─── */}
              <div className="w-full relative my-auto py-8 sm:py-10 lg:py-12">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-6 lg:gap-3 w-full relative">
                  {timelineSteps.map((step, idx) => {
                    const isCompleted = step.state === 'COMPLETED';
                    const isCurrent = step.state === 'CURRENT';

                    return (
                      <div key={step.num} className="relative flex flex-col">
                        {/* Step Connecting Line (Desktop) */}
                        <div className="hidden lg:flex items-center w-full mb-3.5 relative">
                          <div className="relative w-full flex items-center">
                            {/* Dot node */}
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 z-10 ${isCompleted || isCurrent
                                  ? 'bg-amber-500'
                                  : 'bg-neutral-300 dark:bg-neutral-700'
                                }`}
                            />
                            {/* Connecting line to next step */}
                            {idx < timelineSteps.length - 1 && (
                              <div
                                className={`h-[2px] w-full ml-1 ${isCompleted ? 'bg-amber-500' : 'bg-neutral-200 dark:bg-neutral-800'
                                  }`}
                              />
                            )}
                          </div>
                        </div>

                        {/* Step Content: Circle Badge + Bold Title & Subtitle */}
                        <div className="flex items-center gap-3">
                          {/* Node Circle */}
                          {isCompleted ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                              <Check size={14} strokeWidth={3} className="text-white" />
                            </div>
                          ) : isCurrent ? (
                            <div className="w-8 h-8 rounded-full bg-amber-500 text-neutral-950 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {step.num}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500 font-semibold text-xs flex items-center justify-center shrink-0">
                              {step.num}
                            </div>
                          )}

                          {/* Text Placement & Boldness */}
                          <div className="min-w-0">
                            <p
                              className={`text-xs sm:text-[13px] leading-tight font-bold truncate ${isCurrent
                                  ? 'text-amber-600 dark:text-amber-500'
                                  : 'text-neutral-900 dark:text-white'
                                }`}
                            >
                              {step.title}
                            </p>
                            <p className="text-[11px] sm:text-xs text-neutral-400 dark:text-neutral-500 font-normal mt-0.5 truncate">
                              {step.subtitle}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Current Milestone Callout Card (Warm Sand) ────────────────── */}
              <div className="bg-[#fbf7ee] dark:bg-[#181613] border border-amber-200/80 dark:border-amber-900/40 rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs shrink-0">
                {/* Left: Milestone Number Badge + Details */}
                <div className="flex items-start sm:items-center gap-5 min-w-0">
                  {/* Amber Badge (e.g. 02) */}
                  <div className="w-14 h-14 rounded-2xl bg-amber-500 text-neutral-950 font-bold text-xl flex items-center justify-center shrink-0 shadow-xs">
                    {currentMilestoneInfo.badge}
                  </div>

                  {/* Text Details */}
                  <div className="min-w-0">
                    <p className="text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-500 mb-1">
                      Current Milestone
                    </p>
                    <h4 className="font-heading font-bold text-xl sm:text-2xl lg:text-[26px] text-neutral-900 dark:text-white leading-tight">
                      {currentMilestoneInfo.title}
                    </h4>
                    <p className="text-xs sm:text-[13.5px] text-neutral-600 dark:text-neutral-400 font-normal leading-relaxed mt-1.5 max-w-2xl">
                      {currentMilestoneInfo.desc}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-5 sm:gap-6 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => setShowQRModal(true)}
                    className="text-xs sm:text-sm font-normal text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Show order QR
                  </button>

                  <Link
                    to={`/dashboard/bookings/${activeBooking.id}`}
                    className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl inline-flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <span>Booking record</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

            </section>
          ) : (
            /* Empty State when customer has no bookings */
            <div className="rounded-[36px] bg-white dark:bg-[#111215] border border-neutral-200/80 dark:border-neutral-800/80 p-12 sm:p-16 text-center select-none">
              <p className="text-[10.5px] sm:text-[11px] font-medium uppercase tracking-[0.24em] text-amber-600 dark:text-amber-500 mb-2">
                Order Progress
              </p>
              <h3 className="font-heading font-bold text-2xl sm:text-3xl text-neutral-900 dark:text-white">
                No active orders found
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-2 max-w-md mx-auto font-normal leading-relaxed">
                Once you reserve a milestone pictorial, your production progress, schedule confirmation, and handover status will appear here.
              </p>
              <Link
                to="/dashboard/book"
                className="mt-6 inline-flex px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
              >
                Book a session
              </Link>
            </div>
          )}

        </div>

        {/* ── Order QR Pass Modal ────────────────────────────────────────── */}
        {showQRModal && activeBooking && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setShowQRModal(false)}
          >
            <div
              className="bg-white dark:bg-[#111215] rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl relative select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-500">
                  Studio Order Pass
                </p>
                <h3 className="font-heading font-bold text-xl text-neutral-900 dark:text-white mt-1">
                  Order Tracking Pass
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal mt-1">
                  Present at our studio desk or scan with the companion app.
                </p>
              </div>

              {/* QR Code Container */}
              <div className="my-5 flex justify-center">
                <QRPass booking={activeBooking} size={200} showActions={false} />
              </div>

              {/* Order Reference Badge */}
              <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-3 text-center border border-neutral-200/80 dark:border-neutral-800">
                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-neutral-400">Order Reference</p>
                <p className="font-mono font-medium text-sm text-neutral-900 dark:text-white mt-0.5 tracking-wider">
                  {effectiveBookingNumber}
                </p>
              </div>

              {/* Close action */}
              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
              >
                Close Pass
              </button>
            </div>
          </div>
        )}

      </div>
    </SmartLoadingContainer>
  );
}
