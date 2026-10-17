import React, { useState, useEffect, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { 
  Layers, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  CalendarClock,
  Check,
  MapPin, 
  Truck, 
  Save, 
  Loader2, 
  QrCode, 
  ArrowRight, 
  ShieldCheck, 
  Package, 
  Camera, 
  Sparkles, 
  Printer, 
  ChevronRight,
  ExternalLink,
  Phone,
  User,
  Building,
  AlertCircle,
  CreditCard,
  MonitorSmartphone,
  Wand2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCustomerBookings } from '../../services/bookingService';
import { recordCustomerAction } from '../../services/customerAuditService';
import Toast from '../../components/ui/Toast';
import QRPass from '../../components/booking/QRPass';
import StudioDropdown from '../../components/ui/StudioDropdown';
import { motion } from 'framer-motion';
import ClientHeroBanner from '../../components/dashboard/ClientHeroBanner';

export default function BookingProgressPage() {
  const { user, profile } = useAuth();
  const outletContext = useOutletContext();

  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  // Load bookings
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function loadData() {
      try {
        const { data } = await getCustomerBookings(user.id);
        if (isMounted) {
          const loadedBookings = data || [];
          setBookings(loadedBookings);
          if (loadedBookings.length > 0) {
            setSelectedBookingId(loadedBookings[0].id);
          }
        }
      } catch (err) {
        console.warn('BookingProgressPage error loading bookings:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [user]);

  // Active Selected Booking
  const activeBooking = useMemo(() => {
    if (!bookings || bookings.length === 0) return null;
    return bookings.find(b => b.id.toString() === selectedBookingId?.toString()) || bookings[0];
  }, [bookings, selectedBookingId]);

  // Determine if admin has completed adding a schedule and confirming the session:
  // Requires confirmed status AND both event_date and preferred_time populated
  const isSessionScheduledAndConfirmed = useMemo(() => {
    if (!activeBooking) return false;
    const s = (activeBooking.status || 'PENDING').toUpperCase();
    if (['REJECTED', 'CANCELLED', 'PENDING', 'RESERVED'].includes(s)) return false;
    // For CONFIRMED or PHOTOGRAPHER_ASSIGNED, admin must have completed event_date & preferred_time
    if (s === 'CONFIRMED' || s === 'PHOTOGRAPHER_ASSIGNED') {
      return Boolean(activeBooking.event_date && activeBooking.preferred_time);
    }
    // Advanced stages (CAPTURE, EDITING, RETOUCHING, FINALIZED, PRINTING, READY, UNDER_DELIVERY, COMPLETED)
    return true;
  }, [activeBooking]);

  // Compute concise progress metrics across 7 stages
  const progressStage = useMemo(() => {
    if (!activeBooking) return { stage: 1, pct: 15, label: 'Stage 1/7 · Booking Received', isAwaitingSchedule: false };
    const s = (activeBooking.status || 'PENDING').toUpperCase();
    
    if (s === 'REJECTED' || s === 'CANCELLED') return { stage: 1, pct: 0, label: 'Order Concluded', isAwaitingSchedule: false };
    if (s === 'COMPLETED') return { stage: 7, pct: 100, label: 'Stage 7/7 · Studio Ready & Handover', isAwaitingSchedule: false };
    if (s === 'READY' || s === 'UNDER_DELIVERY') {
      const isDel = activeBooking.delivery_address || activeBooking.fulfillment_type === 'DELIVERY' || s === 'UNDER_DELIVERY';
      return { stage: 7, pct: 95, label: isDel ? 'Stage 7/7 · Booking under delivery' : 'Stage 7/7 · Booking ready to pick-up (studio)', isAwaitingSchedule: false };
    }
    if (s === 'FINALIZED' || s === 'PRINTING') return { stage: 6, pct: 85, label: 'Stage 6/7 · Booking Finalized', isAwaitingSchedule: false };
    if (s === 'RETOUCHING') return { stage: 5, pct: 70, label: 'Stage 5/7 · Retouching', isAwaitingSchedule: false };
    if (s === 'EDITING') return { stage: 4, pct: 55, label: 'Stage 4/7 · Editing', isAwaitingSchedule: false };
    if (s === 'CAPTURE' || s === 'IN_PROGRESS') return { stage: 3, pct: 45, label: 'Stage 3/7 · Ongoing Pictorial', isAwaitingSchedule: false };
    
    // Only jump into Stage 2 (Booking Approved & Reserved) once admin has completed scheduling & session confirmation!
    if (isSessionScheduledAndConfirmed) {
      if (s === 'PHOTOGRAPHER_ASSIGNED') return { stage: 2, pct: 35, label: 'Stage 2/7 · Booking Approved & Reserved', isAwaitingSchedule: false };
      return { stage: 2, pct: 30, label: 'Stage 2/7 · Booking Approved & Reserved', isAwaitingSchedule: false };
    }

    // Admin has not finished adding a schedule and confirming the session yet
    return { 
      stage: 1, 
      pct: 20, 
      label: 'Stage 1/7 · Awaiting Schedule & Session Confirmation',
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
    // Downpayment prompt becomes actionable once admin has scheduled & confirmed session (Stage 2+)
    const canPayDownpayment = isSessionScheduledAndConfirmed || (progressStage.stage >= 2);
    const needsDownpayment = canPayDownpayment && (isUnpaid || remBalance > 0) && (!activeBooking.down_payment_confirmed && downPaid === 0);
    const downRequired = Math.min(remBalance, Math.max(500, Math.round(totalAmount * 0.5)));
    return { totalAmount, downPaid, remBalance, needsDownpayment, downRequired };
  }, [activeBooking, isSessionScheduledAndConfirmed, progressStage.stage]);

  const stagesTimeline = useMemo(() => {
    if (!activeBooking) return [];
    
    const isDelivery = Boolean(
      activeBooking.delivery_address ||
      activeBooking.fulfillment_type === 'DELIVERY' ||
      activeBooking.status === 'UNDER_DELIVERY' ||
      profile?.studio_specs?.fulfillment_mode === 'DELIVERY'
    );

    const getStatus = (step) => {
      const s = progressStage.stage;
      if (s === 0) return 'UPCOMING'; // cancelled
      if (step < s) return 'COMPLETED';
      if (step === s) {
        // If step 1 and awaiting schedule confirmation, step 1 (received) was already reached
        if (step === 1 && progressStage.isAwaitingSchedule) return 'COMPLETED';
        return 'IN_PROGRESS';
      }
      return 'UPCOMING';
    };

    return [
      {
        step: 1,
        title: 'Booking Received',
        icon: CheckCircle2,
        status: getStatus(1),
        dateStr: activeBooking.created_at ? new Date(activeBooking.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified'
      },
      {
        step: 2,
        title: 'Approved & Reserved',
        icon: Calendar,
        status: getStatus(2),
        dateStr: isSessionScheduledAndConfirmed
          ? (activeBooking.event_date ? new Date(activeBooking.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Reserved')
          : 'Pending Schedule'
      },
      {
        step: 3,
        title: 'Ongoing Pictorial',
        icon: Camera,
        status: getStatus(3),
        dateStr: activeBooking.preferred_time ? `${activeBooking.preferred_time.slice(0, 5)} Call Time` : 'Active Session'
      },
      {
        step: 4,
        title: 'Editing',
        icon: Sparkles,
        status: getStatus(4),
        dateStr: 'Studio Quality Processing'
      },
      {
        step: 5,
        title: 'Retouching',
        icon: Wand2,
        status: getStatus(5),
        dateStr: 'Fine-Art Calibration'
      },
      {
        step: 6,
        title: 'Booking Finalized',
        icon: Printer,
        status: getStatus(6),
        dateStr: 'Final Output Assembly'
      },
      {
        step: 7,
        title: isDelivery ? 'Booking under delivery' : 'Booking ready to pick-up (studio)',
        icon: isDelivery ? Truck : Package,
        status: getStatus(7),
        dateStr: activeBooking.status === 'COMPLETED' ? 'Fulfilled' : (isDelivery ? 'Direct Delivery' : 'Studio Pickup')
      }
    ];
  }, [activeBooking, profile, progressStage, isSessionScheduledAndConfirmed]);

  if (loading) {
    return (
      <div className="h-full min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={32} />
        <span className="text-xs font-body text-neutral-400 mt-2">Loading Studio Pipeline...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-screen-2xl mx-auto w-full pb-10 space-y-5 font-body">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* -- Unified Luxury Dark Hero Banner with Live Philippine Time & Quick Tools -- */}
      <ClientHeroBanner bookings={bookings} selectedBooking={activeBooking} />

      {/* Order Selector (when multiple bookings exist) */}
      {bookings.length > 1 && (
        <div className="flex justify-end mb-4 relative z-40">
          <div className="flex items-center gap-3 bg-[#faf9f6] dark:bg-neutral-900 p-1.5 pr-2 pl-4 rounded-full border border-gold/20 shadow-sm shrink-0">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 font-body uppercase tracking-widest">Order:</span>
            <div className="relative z-50">
              <StudioDropdown
                value={activeBooking?.id || ''}
                onChange={(val) => setSelectedBookingId(val)}
                options={bookings.map(b => {
                  const customerName = profile?.first_name 
                    ? `${profile.first_name} ${profile.last_name || ''}`.trim() 
                    : (profile?.full_name || user?.user_metadata?.full_name || 'Customer');
                  return {
                    value: b.id,
                    label: `#${b.booking_number} · ${customerName}`
                  };
                })}
                align="right"
                triggerClassName="text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-[#fdfbf7] dark:bg-neutral-800 hover:bg-white transition-colors py-2 pl-3 pr-8 rounded-xl border-2 border-gold/20 focus:outline-none focus:border-gold/40 cursor-pointer font-body w-full sm:w-auto min-w-[320px] shadow-xs"
              />
            </div>
          </div>
        </div>
      )}

      {activeBooking ? (
        <>
          {/* Active Booking Banner - Original Header Style */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-primary text-white border border-neutral-800 shadow-lg relative overflow-hidden space-y-3.5 mb-4">
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-body text-gold font-bold">
                    #{activeBooking.booking_number}
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-body font-bold text-white leading-snug">
                  {activeBooking.service?.name || activeBooking.tier_name || 'Senior High Packages and sets'}
                  {activeBooking.tier_name ? ` · ${activeBooking.tier_name}` : ''}
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-300 font-body">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-gold" />
                    {activeBooking.event_date ? new Date(activeBooking.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date Pending'}
                  </span>
                  <span className="opacity-50">•</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-gold" />
                    {activeBooking.preferred_time ? activeBooking.preferred_time.substring(0, 5) : 'Time Pending'}
                  </span>
                  <span className="opacity-50">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-gold" />
                    {activeBooking.location?.split(',')[0] || 'Cebu Studio'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Extracted Cards for Progress & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Card 1: Progress */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-center shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center font-body">
                  <span className="text-neutral-400 font-bold uppercase tracking-widest text-xs">Progress</span>
                  <div className="flex items-baseline gap-0.5 drop-shadow-md">
                    <span className="text-gold font-black text-4xl tracking-tighter">{progressStage.pct}</span>
                    <span className="text-gold/70 font-bold text-xl">%</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-gold-dark via-gold to-yellow-200 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(212,175,55,0.3)] relative"
                    style={{ width: `${progressStage.pct}%` }}
                  >
                    <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-transparent to-white/40" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Actions */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center justify-center gap-4 shadow-md">
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-semibold flex items-center justify-center gap-2 border border-neutral-700 transition-colors font-body shadow-sm"
              >
                <QrCode size={18} className="text-gold" />
                <span>QR Pass</span>
              </button>
              <Link
                to={`/dashboard/bookings/${activeBooking.id}`}
                className="flex-1 py-3 px-4 rounded-xl bg-gold hover:bg-gold-light text-primary text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm font-body"
              >
                <span>Record</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Downpayment Attention Callout */}
          {financialInfo.needsDownpayment && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-gold/10 to-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <CreditCard size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Downpayment Due
                    </span>
                    <span className="text-xs font-bold text-primary dark:text-white">#{activeBooking.booking_number}</span>
                  </div>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                    A 50% reservation downpayment of <strong className="text-primary dark:text-gold font-bold">₱{financialInfo.downRequired.toLocaleString()}</strong> is required to lock in wardrobe fitting and studio bay scheduling.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  to="/dashboard/payments"
                  className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                >
                  <CreditCard size={14} />
                  <span>Pay Downpayment ₱{financialInfo.downRequired.toLocaleString()}</span>
                </Link>
              </div>
            </div>
          )}

          {/* Full-Width Horizontal Pipeline */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-8 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-heading text-base sm:text-lg font-bold text-primary dark:text-neutral-100">
                    7-Stage Packages & Sets Pipeline
                  </h3>
                  <p className="text-[11px] sm:text-xs text-neutral-400 font-body">
                    Step-by-step progress from studio calibration to direct handover.
                  </p>
                </div>
              </div>
              <span className="text-xs font-body font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full whitespace-nowrap">
                Stage {progressStage.stage} / 7
              </span>
            </div>

            {/* Responsive Timeline: Horizontal on sm+, Vertical on mobile */}
            <div className="relative pb-6 w-full">
              {/* DESKTOP/TABLET HORIZONTAL TIMELINE */}
              <div className="hidden sm:block relative overflow-x-auto hide-scrollbar pb-6">
                <div className="min-w-[800px] xl:min-w-full flex items-start justify-between relative px-4">
                  {/* Background Connecting Line */}
                  <div className="absolute top-8 left-[3%] right-[3%] h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full" />
                  
                  {/* Active Progress Line */}
                  <motion.div 
                    className="absolute top-8 left-[3%] h-1 bg-gradient-to-r from-gold-dark via-gold to-gold-light rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ 
                      width: progressStage.isAwaitingSchedule 
                        ? '8.3%' 
                        : `${Math.max(0, (progressStage.stage - 1) * (100 / 6))}%` 
                    }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                  />

                  {/* Small Status Icon on the middle of Booking Received (Step 1) & Approved & Reserved (Step 2) */}
                  <div 
                    className="absolute top-8 left-[11%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group cursor-pointer"
                    title={isSessionScheduledAndConfirmed ? "Pictorial schedule & session confirmed" : "Awaiting admin schedule assignment & session confirmation"}
                  >
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ 
                        scale: progressStage.isAwaitingSchedule ? [1, 1.15, 1] : 1,
                      }}
                      transition={{ duration: 2, repeat: progressStage.isAwaitingSchedule ? Infinity : 0, ease: "easeInOut" }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm relative ${
                        isSessionScheduledAndConfirmed
                          ? 'bg-emerald-500 border-emerald-300 dark:border-emerald-700 text-white shadow-emerald-500/20'
                          : progressStage.isAwaitingSchedule
                          ? 'bg-amber-500 border-amber-300 text-stone-950 shadow-md shadow-amber-500/40 ring-4 ring-amber-500/20'
                          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-400'
                      }`}
                    >
                      {progressStage.isAwaitingSchedule && (
                        <span className="absolute -inset-1 rounded-full border border-amber-400/60 animate-ping pointer-events-none opacity-75" />
                      )}
                      {isSessionScheduledAndConfirmed ? (
                        <Check size={13} strokeWidth={3} />
                      ) : (
                        <CalendarClock size={13} strokeWidth={2.5} className={progressStage.isAwaitingSchedule ? "animate-pulse" : ""} />
                      )}
                    </motion.div>
                    <div className="absolute top-8 flex flex-col items-center opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-xs border ${
                        isSessionScheduledAndConfirmed 
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : progressStage.isAwaitingSchedule
                          ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
                      }`}>
                        {isSessionScheduledAndConfirmed ? 'Schedule Confirmed' : 'Admin Scheduling'}
                      </span>
                    </div>
                  </div>

                  {stagesTimeline.map((item, index) => {
                    const isDone = item.status === 'COMPLETED';
                    const isCurrent = item.status === 'IN_PROGRESS';
                    const Icon = item.icon;

                    return (
                      <div key={item.step} className="relative z-10 flex flex-col items-center w-28 group">
                        {isCurrent && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-20">
                            <span className="bg-primary dark:bg-gold dark:text-primary text-gold text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md border border-gold/30">
                              CURRENT
                            </span>
                            <div className="w-1.5 h-1.5 bg-primary dark:bg-gold rotate-45 -mt-1 border-r border-b border-gold/30"></div>
                          </div>
                        )}
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.1, type: "spring", stiffness: 200, damping: 15 }}
                          className={`w-16 h-16 rounded-full flex items-center justify-center border-4 transition-colors duration-300 shadow-sm
                            ${isDone 
                              ? 'bg-emerald-500 border-emerald-100 dark:border-emerald-950 text-white shadow-emerald-500/30' 
                              : isCurrent
                              ? 'bg-gold border-gold/30 text-primary shadow-gold/50'
                              : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-400'
                            }
                          `}
                        >
                          {isCurrent ? (
                            <motion.div
                              animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <Icon size={24} strokeWidth={2.5} />
                            </motion.div>
                          ) : (
                            <Icon size={24} strokeWidth={isDone ? 2.5 : 2} />
                          )}
                        </motion.div>

                        <div className="mt-4 text-center">
                          <h4 className={`text-[11px] font-heading font-bold leading-tight uppercase transition-colors
                            ${isDone ? 'text-emerald-600 dark:text-emerald-400' : isCurrent ? 'text-primary dark:text-gold' : 'text-neutral-500 dark:text-neutral-400'}
                          `}>
                            {item.title}
                          </h4>
                          <span className="block mt-1 text-[11px] font-body text-neutral-400 opacity-80 group-hover:opacity-100 transition-opacity">
                            {item.dateStr}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MOBILE VERTICAL TIMELINE */}
              <div className="block sm:hidden relative px-2 pt-2">
                {/* Background Connecting Line */}
                <div className="absolute top-6 bottom-6 left-[2.25rem] w-1 bg-neutral-100 dark:bg-neutral-800 rounded-full" />
                
                {/* Active Progress Line */}
                <motion.div 
                  className="absolute top-6 left-[2.25rem] w-1 bg-gradient-to-b from-gold-dark via-gold to-gold-light rounded-full"
                  initial={{ height: '0%' }}
                  animate={{ 
                    height: progressStage.isAwaitingSchedule
                      ? '7%'
                      : `${Math.max(0, (progressStage.stage - 1) * (100 / 6))}%` 
                  }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />

                <div className="space-y-7 relative z-10">
                  {stagesTimeline.map((item, index) => {
                    const isDone = item.status === 'COMPLETED';
                    const isCurrent = item.status === 'IN_PROGRESS';
                    const Icon = item.icon;

                    return (
                      <React.Fragment key={item.step}>
                        <div className="flex items-center gap-4 group relative">
                          {isCurrent && (
                            <div className="absolute -left-5 top-1/2 -translate-y-1/2 animate-bounce z-20">
                              <div className="bg-primary dark:bg-gold dark:text-primary text-gold text-[10px] font-bold px-1.5 py-1.5 rounded-full flex items-center justify-center shadow-md border border-gold/30">
                                <MapPin size={10} />
                              </div>
                            </div>
                          )}
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.1, type: "spring", stiffness: 200, damping: 15 }}
                            className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center border-4 transition-colors duration-300 shadow-sm relative z-10
                              ${isDone 
                                ? 'bg-emerald-500 border-emerald-100 dark:border-emerald-950 text-white shadow-emerald-500/30' 
                                : isCurrent
                                ? 'bg-gold border-gold/30 text-primary shadow-gold/50'
                                : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-400'
                              }
                            `}
                          >
                            {isCurrent ? (
                              <motion.div
                                animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              >
                                <Icon size={22} strokeWidth={2.5} />
                              </motion.div>
                            ) : (
                              <Icon size={22} strokeWidth={isDone ? 2.5 : 2} />
                            )}
                          </motion.div>

                          <div className="flex-1">
                            <h4 className={`text-[11px] font-heading font-bold leading-tight uppercase transition-colors
                              ${isDone ? 'text-emerald-600 dark:text-emerald-400' : isCurrent ? 'text-primary dark:text-gold' : 'text-neutral-500 dark:text-neutral-400'}
                            `}>
                              {item.title}
                            </h4>
                            <span className="block mt-0.5 text-xs font-body text-neutral-400">
                              {item.dateStr}
                            </span>
                          </div>
                        </div>

                        {/* Small intermediate status between step 1 and step 2 in vertical timeline */}
                        {index === 0 && (
                          <div className="flex items-center gap-3 pl-3.5 -my-2 relative z-10">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                              isSessionScheduledAndConfirmed
                                ? 'bg-emerald-500 border-emerald-200 text-white shadow-sm'
                                : progressStage.isAwaitingSchedule
                                ? 'bg-amber-500 border-amber-300 text-stone-950 animate-pulse ring-2 ring-amber-500/30'
                                : 'bg-white dark:bg-neutral-800 border-neutral-300 text-neutral-400'
                            }`}>
                              {isSessionScheduledAndConfirmed ? (
                                <Check size={12} strokeWidth={3} />
                              ) : (
                                <CalendarClock size={12} strokeWidth={2.5} />
                              )}
                            </div>
                            <div className="flex-1">
                              <span className={`text-xs font-bold ${
                                isSessionScheduledAndConfirmed 
                                  ? 'text-emerald-600 dark:text-emerald-400' 
                                  : progressStage.isAwaitingSchedule
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-neutral-400'
                              }`}>
                                {isSessionScheduledAndConfirmed 
                                  ? 'Pictorial Schedule Confirmed' 
                                  : 'Admin Adding Schedule & Confirming Session'}
                              </span>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* New Active Tracker Details */}
          <motion.div 
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-5 font-body relative overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Background vector decoration */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-5 pointer-events-none scale-150 origin-top-right">
                <Camera size={200} />
            </div>

            <div className="flex items-center gap-2 mb-2 relative z-10">
              <ShieldCheck className="text-gold" size={18} />
              <h3 className="font-heading text-sm font-bold text-primary dark:text-neutral-100 uppercase tracking-wide">
                Live Status Tracker
              </h3>
            </div>

            {(() => {
              const status = (activeBooking.status || 'PENDING').toUpperCase();
              const isDelivery = Boolean(
                activeBooking.delivery_address ||
                activeBooking.fulfillment_type === 'DELIVERY' ||
                status === 'UNDER_DELIVERY' ||
                profile?.studio_specs?.fulfillment_mode === 'DELIVERY'
              );

              // ── 1 & Intermediate: Booking Received / Awaiting Admin Schedule & Session Confirmation ──
              // If admin is NOT done yet adding a schedule and confirming the session:
              if (!isSessionScheduledAndConfirmed && !['REJECTED', 'CANCELLED', 'COMPLETED', 'READY', 'UNDER_DELIVERY', 'FINALIZED', 'PRINTING', 'RETOUCHING', 'EDITING', 'CAPTURE', 'IN_PROGRESS'].includes(status)) {
                return (
                  <motion.div 
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-gradient-to-r from-amber-500/10 via-gold/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 p-6 rounded-2xl relative z-10 shadow-lg shadow-amber-500/5"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <div className="relative shrink-0">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center shadow-inner border border-amber-500/30 text-amber-600 dark:text-amber-400"
                        animate={{ scale: [1, 1.04, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <CalendarClock size={32} />
                      </motion.div>
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-white dark:border-neutral-900"></span>
                      </span>
                    </div>

                    <div className="space-y-2 flex-1">
                      {/* Intermediate Status Stepper Pill between Booking Received and Approved & Reserved */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider bg-gold/20 text-gold-dark dark:text-gold px-2.5 py-0.5 rounded-full border border-gold/30">
                          Stage 1 of 7
                        </span>

                        {/* Small status indicator in the middle of Booking Received and Approved & Reserved */}
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <CheckCircle2 size={12} />
                            Booking Received
                          </span>
                          <ChevronRight size={11} className="text-amber-500/60" />
                          <span className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300">
                            <CalendarClock size={12} className="animate-pulse text-amber-500" />
                            Awaiting Admin Schedule
                          </span>
                          <ChevronRight size={11} className="text-neutral-400/60" />
                          <span className="opacity-50 text-neutral-500 dark:text-neutral-400">
                            Approved & Reserved
                          </span>
                        </div>
                      </div>

                      <h4 className="font-heading font-black text-xl text-primary dark:text-white">
                        Awaiting Pictorial Schedule & Session Confirmation
                      </h4>

                      <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-xl">
                        Your booking has been received! Our studio administrators are currently scheduling your pictorial date, call time slot, and session bay. Your reservation will automatically advance to <strong className="text-primary dark:text-gold font-bold">Booking Approved & Reserved</strong> once the schedule is completed and confirmed by admin.
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-200/50 dark:border-neutral-800/80 mt-2">
                        <span className="flex items-center gap-1 font-medium">
                          <MapPin size={13} className="text-gold" />
                          <span>Venue: <strong>{activeBooking.location || 'Studio Campus (Pending Assignment)'}</strong></span>
                        </span>
                        <span className="opacity-40">•</span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock size={13} className="text-amber-500" />
                          <span>Session Time: <strong className="text-amber-600 dark:text-amber-400">Pending Admin Schedule</strong></span>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              // ── 2. Booking Approved and Reserved ──
              // ONLY reached once admin has completed schedule assignment & session confirmation!
              if (status === 'CONFIRMED' || status === 'PHOTOGRAPHER_ASSIGNED') {
                const photographer = activeBooking.photographer?.profile;
                const formattedDate = activeBooking.event_date
                  ? new Date(activeBooking.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Confirmed Date';
                const formattedTime = activeBooking.preferred_time
                  ? activeBooking.preferred_time.slice(0, 5)
                  : 'Scheduled Slot';

                return (
                  <motion.div 
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-gradient-to-r from-gold/15 via-gold/5 to-transparent border border-gold/35 p-6 rounded-2xl relative z-10 shadow-lg shadow-gold/5"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-gold/20 flex items-center justify-center shrink-0 shadow-inner border border-gold/30"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Calendar className="text-gold" size={32} />
                    </motion.div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider bg-primary text-gold px-2 py-0.5 rounded-full border border-gold/30">
                          Stage 2 of 7
                        </span>
                        <h4 className="font-heading font-black text-xl text-primary dark:text-white">Booking Approved & Reserved</h4>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-xl">
                        Your reservation has been confirmed! Pictorial schedule: <strong className="text-primary dark:text-gold">{formattedDate}</strong> at <strong className="text-primary dark:text-gold">{formattedTime}</strong> ({activeBooking.location || 'E-Kodak Studio'}).
                      </p>
                      {photographer && (
                        <p className="text-xs text-neutral-500 flex items-center gap-1.5 pt-1">
                          <Camera size={13} className="text-gold" />
                          <span>Assigned Lead Photographer: <strong>{photographer.first_name} {photographer.last_name || ''}</strong></span>
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              }

              // ── 3. Ongoing Pictorial ──
              if (status === 'CAPTURE' || status === 'IN_PROGRESS') {
                return (
                  <motion.div 
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-gradient-to-r from-amber-500/15 via-gold/10 to-transparent border border-amber-500/30 p-5 rounded-2xl relative z-10 shadow-lg shadow-amber-500/5"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 shadow-inner border border-amber-500/30"
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Camera className="text-amber-600 dark:text-amber-400" size={32} />
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider bg-gold/20 text-gold-dark px-2 py-0.5 rounded-full border border-gold/30">
                          Stage 3 of 7
                        </span>
                        <h4 className="font-heading font-black text-xl text-primary dark:text-white">Ongoing Pictorial</h4>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed max-w-lg">
                        Photoshoot session actively underway in the studio bay. Smile, strike your best poses, and capture milestone memories!
                      </p>
                    </div>
                  </motion.div>
                );
              }

              // ── 4. Editing ──
              if (status === 'EDITING') {
                return (
                  <motion.div 
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white p-5 rounded-2xl border border-gold/30 relative z-10 shadow-lg shadow-gold/5"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-gold/20 flex items-center justify-center shrink-0 shadow-inner border border-gold/40"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="text-gold" size={32} />
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider bg-gold/20 text-gold px-2 py-0.5 rounded-full border border-gold/30">
                          Stage 4 of 7
                        </span>
                        <h4 className="font-heading font-black text-xl text-white">Editing in Progress</h4>
                      </div>
                      <p className="text-sm text-neutral-300 mt-1 leading-relaxed max-w-lg">
                        Studio processing in progress — as part of our studio commitment to craftsmanship, our darkroom team takes meticulous time and care with each photograph to ensure heirloom portrait perfection.
                      </p>
                    </div>
                  </motion.div>
                );
              }

              // ── 5. Retouching ──
              if (status === 'RETOUCHING') {
                return (
                  <motion.div 
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent border border-gold/30 p-5 rounded-2xl relative z-10 shadow-lg"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-gold/20 flex items-center justify-center shrink-0 shadow-inner border border-gold/40"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Wand2 className="text-gold" size={32} />
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider bg-gold/20 text-gold-dark px-2 py-0.5 rounded-full border border-gold/30">
                          Stage 5 of 7
                        </span>
                        <h4 className="font-heading font-black text-xl text-primary dark:text-white">Master Retouching</h4>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed max-w-lg">
                        Fine-art skin grading, blemish refinement, and studio lighting calibration proofs are undergoing master retouching.
                      </p>
                    </div>
                  </motion.div>
                );
              }

              // ── 6. Booking Finalized ──
              if (status === 'FINALIZED' || status === 'PRINTING') {
                return (
                  <motion.div 
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-900/20 dark:to-emerald-900/10 border border-emerald-500/30 p-5 rounded-2xl relative z-10 shadow-lg"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0 shadow-inner border border-emerald-500/30"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Printer className="text-emerald-600 dark:text-emerald-400" size={32} />
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Stage 6 of 7
                        </span>
                        <h4 className="font-heading font-black text-xl text-emerald-800 dark:text-emerald-300">Booking Finalized</h4>
                      </div>
                      <p className="text-sm text-emerald-700/90 dark:text-emerald-400/90 mt-1 leading-relaxed max-w-lg">
                        All selected portraits have been finalized, printed, and assembled into your chosen physical packages and frames.
                      </p>
                    </div>
                  </motion.div>
                );
              }

              // ── 7. Fulfillment: Pickup vs Delivery ──
              if (status === 'READY' || status === 'UNDER_DELIVERY') {
                if (isDelivery) {
                  // Delivery Sub-Phases: 1: preparing delivery, 2: ongoing delivery, 3: delivery is near, 4: delivery confirmed
                  const rawDelStatus = (activeBooking.delivery_status || activeBooking.deliveries?.[0]?.status || 'PREPARING').toUpperCase();
                  const delSubPhaseIdx = 
                    ['DELIVERED', 'CONFIRMED'].includes(rawDelStatus) ? 3 :
                    rawDelStatus === 'NEAR' ? 2 :
                    ['DISPATCHED', 'ONGOING'].includes(rawDelStatus) ? 1 : 0;

                  const subPhases = [
                    { title: 'preparing delivery', desc: 'Outputs packaged and sealed' },
                    { title: 'ongoing delivery', desc: 'Courier in transit' },
                    { title: 'delivery is near', desc: 'Rider nearby your location' },
                    { title: 'delivery confirmed', desc: 'Safely handed over' },
                  ];

                  return (
                    <motion.div 
                      className="space-y-4 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white p-6 rounded-2xl border border-gold/40 relative z-10 shadow-xl"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider bg-gold/20 text-gold px-2 py-0.5 rounded-full border border-gold/30">
                            Stage 7 of 7 · Active Fulfillment
                          </span>
                          <h4 className="font-heading font-black text-xl text-white">Booking under delivery</h4>
                        </div>
                        <span className="text-xs text-gold font-bold flex items-center gap-1.5">
                          <Truck size={14} />
                          <span>Sub-Phase {delSubPhaseIdx + 1} of 4: {subPhases[delSubPhaseIdx].title}</span>
                        </span>
                      </div>

                      {/* 4 Delivery Sub-Phases Stepper */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                        {subPhases.map((sp, idx) => {
                          const isDone = idx < delSubPhaseIdx;
                          const isCurrent = idx === delSubPhaseIdx;
                          return (
                            <div 
                              key={sp.title}
                              className={`p-3 rounded-xl border transition-all ${
                                isCurrent
                                  ? 'bg-gold/15 border-gold shadow-md'
                                  : isDone
                                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                                  : 'bg-neutral-800/40 border-neutral-700 text-neutral-400'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                {isDone ? (
                                  <CheckCircle2 size={13} className="text-emerald-400" />
                                ) : isCurrent ? (
                                  <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-neutral-600" />
                                )}
                                <span className={`text-[11px] font-bold capitalize ${isCurrent ? 'text-gold' : isDone ? 'text-emerald-300' : 'text-neutral-400'}`}>
                                  {sp.title}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-400 line-clamp-1">{sp.desc}</p>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                }

                // Studio Pickup
                return (
                  <motion.div 
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-gradient-to-br from-gold/20 via-gold/10 to-amber-500/10 border border-gold/40 p-6 rounded-2xl relative z-10 shadow-xl"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-gold text-primary flex items-center justify-center shrink-0 shadow-lg shadow-gold/30"
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Package size={34} />
                    </motion.div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider bg-primary text-gold px-2 py-0.5 rounded-full border border-gold/30">
                          Stage 7 of 7 · Studio Reception
                        </span>
                        <h4 className="font-heading font-black text-xl text-primary dark:text-white">
                          Booking ready to pick-up (studio)
                        </h4>
                      </div>
                      <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed max-w-xl">
                        Your physical portrait package is complete and ready for pickup at <strong className="text-gold-dark font-bold">E-Kodak Studio (311 Rizal Street, City of Naga, Cebu)</strong>. Please present your QR Studio Pass upon claiming.
                      </p>
                    </div>
                  </motion.div>
                );
              }

              // Default fallback for completed/cancelled
              return (
                <motion.div 
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-neutral-100 dark:bg-neutral-800/80 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 relative z-10"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <motion.div 
                    className="w-16 h-16 rounded-2xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <ShieldCheck className="text-neutral-500 dark:text-neutral-400" size={32} />
                  </motion.div>
                  <div>
                    <h4 className="font-heading font-black text-xl text-primary dark:text-white">Status: {status}</h4>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed max-w-lg">
                      Your booking is currently marked as {status.toLowerCase()}.
                    </p>
                  </div>
                </motion.div>
              );
            })()}
          </motion.div>
        </>
      ) : (
        /* Empty State */
        <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3 font-body">
          <div className="w-12 h-12 rounded-xl bg-gold/10 text-gold flex items-center justify-center mx-auto">
            <Camera size={24} />
          </div>
          <div className="max-w-sm mx-auto space-y-0.5">
            <h3 className="font-heading text-base font-bold text-primary dark:text-neutral-100">
              No Active Booking Dispatched
            </h3>
            <p className="text-xs text-neutral-500 font-body">
              Book a session now to view live session progress and studio claiming.
            </p>
          </div>
          <Link to="/dashboard/book" className="btn-primary inline-flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-body">
            <span>Book A Studio Session</span>
            <ChevronRight size={13} />
          </Link>
        </div>
      )}

      {/* QR Pass Modal */}
      {showQRModal && activeBooking && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div 
            className="bg-white dark:bg-neutral-900 p-5 rounded-2xl max-w-xs w-full border border-gold/40 shadow-2xl space-y-3 font-body"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-0.5 font-body">
              <span className="text-[11px] font-body text-gold uppercase tracking-widest font-bold">E-Kodak Studio Pass</span>
              <h3 className="font-heading text-base font-bold text-primary dark:text-white">Studio Gate QR Pass</h3>
              <p className="text-xs text-neutral-400 font-body">Present upon arrival at studio reception counter.</p>
            </div>
            
            <div className="flex justify-center p-3 bg-white rounded-xl border border-neutral-200">
              <QRPass bookingId={activeBooking.id} bookingNumber={activeBooking.booking_number} />
            </div>

            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              className="w-full py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-bold hover:bg-neutral-200 transition-colors font-body"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
