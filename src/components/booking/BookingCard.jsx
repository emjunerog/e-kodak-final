import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  ChevronRight, 
  Camera, 
  QrCode, 
  XCircle,
  Layers,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  Bell,
  Package
} from "lucide-react";
import { getStatusBadge, getPaymentLabel } from "../../lib/bookingUtils";
import QRPass from "./QRPass";

// ── Expandable Icon Badge (Space-saving: Icon-only by default, expands to full text on hover) ──
function ExpandableBadge({
  icon: Icon,
  text,
  className = "",
  iconClassName = "",
  title = ""
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onClick={() => setIsExpanded(prev => !prev)}
      className={`group/pill inline-flex items-center h-6 px-1.5 rounded-full border transition-all duration-300 ease-in-out cursor-pointer hover:px-2.5 overflow-hidden shadow-2xs select-none ${className}`}
      title={title || text}
    >
      <Icon size={12} className={`shrink-0 transition-transform duration-300 ${isExpanded ? 'scale-110' : 'group-hover/pill:scale-110'} ${iconClassName}`} />
      <span
        className={`overflow-hidden whitespace-nowrap text-[10px] font-body font-semibold tracking-wide transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'max-w-[450px] opacity-100 ml-1.5'
            : 'max-w-0 opacity-0 ml-0 group-hover/pill:max-w-[450px] group-hover/pill:opacity-100 group-hover/pill:ml-1.5'
        }`}
      >
        {text}
      </span>
    </div>
  );
}

export default function BookingCard({ booking }) {
  const [showQR, setShowQR] = useState(false);
  const { 
    id, 
    booking_number, 
    booking_token, 
    qr_code_path, 
    service, 
    tier_name, 
    event_date, 
    preferred_time, 
    status, 
    payment_status,
    total_amount,
    created_at,
    student_details
  } = booking;
  
  const isSchoolPartner = student_details?.booking_mode === 'SCHOOL_PARTNER' || 
    (booking.notes || '').toLowerCase().includes('school pictorial') ||
    (booking.notes || '').toLowerCase().includes('official school partner') ||
    (booking.notes || '').toLowerCase().includes('school partner agreement');

  const isScheduleTBD = !event_date || (isSchoolPartner && !event_date);

  // Format dates
  const displayDate = event_date 
    ? new Date(event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : (isSchoolPartner ? 'School Schedule (TBD)' : 'Schedule To Be Announced');
    
  const displayTime = preferred_time ? preferred_time.substring(0, 5) : '';
  const statusClass = getStatusBadge(status);

  // Compute stage info
  const stageInfo = useMemo(() => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'COMPLETED') return { stage: 7, pct: 100 };
    if (s === 'READY') return { stage: 7, pct: 90 };
    if (s === 'PRINTING') return { stage: 6, pct: 85 };
    if (s === 'EDITING') return { stage: 5, pct: 70 };
    if (s === 'IN_PROGRESS') return { stage: 4, pct: 55 };
    if (s === 'CAPTURE') return { stage: 3, pct: 45 };
    if (s === 'PHOTOGRAPHER_ASSIGNED') return { stage: 3, pct: 40 };
    if (s === 'CONFIRMED') return { stage: 2, pct: 30 };
    if (s === 'CANCELLED' || s === 'REJECTED') return { stage: 1, pct: 0 };
    return { stage: 1, pct: 15 };
  }, [status]);

  // Academic batch tag text
  const academicTag = student_details?.section 
    ? `Batch ${student_details.section}${student_details.course ? ` · ${student_details.course}` : ''}`
    : student_details?.school || null;

  // Downpayment & balance calculation
  const totalAmt = Number(total_amount || 0);
  const downPaid = Number(booking.down_payment_amount || 0);
  const remBalance = booking.remaining_balance !== undefined && booking.remaining_balance !== null
    ? Number(booking.remaining_balance)
    : Math.max(0, totalAmt - downPaid);
  const isFullyPaid = (payment_status || '').toUpperCase() === 'PAID' || (payment_status || '').toUpperCase() === 'FULLY_PAID' || (totalAmt > 0 && remBalance === 0);
  const isUnpaid = !isFullyPaid && (!payment_status || (payment_status || '').toUpperCase() === 'UNPAID' || (payment_status || '').toUpperCase() === 'PARTIAL');
  const needsDownpayment = totalAmt > 0 && remBalance > 0 && isUnpaid && (!booking.down_payment_confirmed && downPaid === 0);
  const downAmount = needsDownpayment ? Math.min(remBalance, Math.max(500, Math.round(totalAmt * 0.5))) : 0;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-neutral-200/80 dark:border-neutral-800 hover:border-gold/40 dark:hover:border-gold/30 hover:shadow-md transition-all group space-y-4">
      
      {/* ── Top Row: Metadata & Timestamp ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="font-body text-xs font-bold text-neutral-800 dark:text-neutral-200 tracking-wide mr-1">
            #{booking_number}
          </span>

          {/* Status Badge */}
          {status === 'PHOTOGRAPHER_ASSIGNED' ? (
            <ExpandableBadge
              icon={Camera}
              text="Photographer Assigned"
              className="bg-primary/10 text-primary dark:text-gold border-primary/25 dark:border-gold/30 hover:border-gold/60 hover:bg-gold/15"
              iconClassName="text-gold"
              title="Photographer Assigned: Dedicated photographer reserved"
            />
          ) : (
            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-body font-bold uppercase tracking-wider ${statusClass}`}>
              {status}
            </span>
          )}

          {/* Schedule to be announced badge (Icon if not hovered, expands to full text on hover) */}
          {isScheduleTBD && status !== 'COMPLETED' && status !== 'CANCELLED' && (
            <ExpandableBadge
              icon={Clock}
              text="Schedule Pending"
              className="bg-amber-500/15 border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300"
              iconClassName="text-amber-600 dark:text-amber-400"
              title="Schedule Pending · Shoot date to be announced"
            />
          )}

          {/* Downpayment Due badge (Icon if not hovered, expands to full text on hover) */}
          {needsDownpayment && downAmount > 0 && (
            <ExpandableBadge
              icon={CreditCard}
              text={`₱${downAmount.toLocaleString()} Downpayment Due`}
              className="bg-amber-500/15 border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300"
              iconClassName="text-amber-600 dark:text-amber-400"
              title={`Downpayment Due: ₱${downAmount.toLocaleString()}`}
            />
          )}

          {/* Fully Paid badge (Icon if not hovered, expands to full text on hover) */}
          {isFullyPaid && totalAmt > 0 && (
            <ExpandableBadge
              icon={CheckCircle2}
              text="Fully Paid"
              className="bg-emerald-500/10 border-emerald-500/25 hover:border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              iconClassName="text-emerald-600 dark:text-emerald-400"
              title="Payment Status: Fully Paid"
            />
          )}

          {/* Academic Batch badge (Icon if not hovered, expands to full text on hover) */}
          {academicTag && (
            <ExpandableBadge
              icon={Building}
              text={academicTag}
              className="bg-gold/10 border-gold/25 hover:border-gold/50 hover:bg-gold/20 text-gold"
              iconClassName="text-gold"
              title={`Academic Cohort: ${academicTag}`}
            />
          )}
        </div>
        <span className="text-[10px] font-body text-neutral-400">
          Booked {created_at ? new Date(created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      </div>

      {/* ── Middle: Image + Details Grid ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        {/* Service Image with zoom hover */}
        <div className="w-full sm:w-24 h-24 sm:h-24 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200/70 dark:border-neutral-700 relative">
          {service?.cover_image ? (
            <img 
              src={service.cover_image} 
              alt={service.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-600">
              <Camera size={24} className="text-gold/60 mb-0.5" />
              <span className="text-[9px] font-body uppercase text-neutral-400">Portrait</span>
            </div>
          )}
        </div>

        {/* Details Column */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div>
            <h3 className="font-heading text-base sm:text-lg text-primary dark:text-neutral-100 font-bold leading-snug truncate">
              {service?.name || "Graduation Studio Package"}
              {tier_name && <span className="text-gold font-body font-semibold ml-2 text-sm">({tier_name})</span>}
            </h3>
          </div>

          {/* Structured 3-pill Grid (Hoverable Icons + Tooltips) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-body text-neutral-600 dark:text-neutral-400">
            {/* Shoot Schedule */}
            <div 
              className={`has-tooltip flex items-center gap-1.5 p-2 rounded-xl border truncate transition-all cursor-pointer group/pill ${
                isScheduleTBD 
                  ? 'bg-amber-500/10 border-amber-500/25 hover:border-amber-500/50 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300' 
                  : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-100 dark:border-neutral-800 hover:border-gold/40 hover:bg-gold/5'
              }`}
              title={isScheduleTBD ? "Shoot schedule to be announced" : `Scheduled: ${displayDate}`}
            >
              {isScheduleTBD ? (
                <Bell size={13} className="text-amber-500 shrink-0 transition-transform duration-200 group-hover/pill:scale-125 group-hover/pill:rotate-12" />
              ) : (
                <Calendar size={13} className="text-gold shrink-0 transition-transform duration-200 group-hover/pill:scale-125" />
              )}
              <span className="truncate font-medium">{displayDate} {displayTime && `· ${displayTime}`}</span>
              <div className="tooltip-bubble">
                <span className="font-semibold block text-gold">{isScheduleTBD ? 'Schedule Announcement' : 'Session Schedule'}</span>
                <span className="block text-[10px] text-neutral-300 font-normal leading-tight mt-0.5">
                  {isScheduleTBD ? 'To be announced · You will be notified via SMS & portal' : `${displayDate} at ${displayTime || 'Regular Session Slot'}`}
                </span>
              </div>
            </div>

            {/* Payment & Amount */}
            <div 
              className={`has-tooltip flex items-center gap-1.5 p-2 rounded-xl border truncate transition-all cursor-pointer group/pill ${
                needsDownpayment && downAmount > 0
                  ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold' 
                  : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-100 dark:border-neutral-800 hover:border-gold/40 hover:bg-gold/5'
              }`}
              title={`Total: ₱${totalAmt.toLocaleString()}`}
            >
              <CreditCard size={13} className={`${needsDownpayment ? "text-amber-600 dark:text-amber-400" : "text-gold"} shrink-0 transition-transform duration-200 group-hover/pill:scale-125`} />
              <span className="truncate">
                ₱{totalAmt.toLocaleString()} · {needsDownpayment && downAmount > 0 ? `₱${downAmount.toLocaleString()} Downpayment Due` : isFullyPaid ? 'Paid in Full' : getPaymentLabel(payment_status)}
              </span>
              <div className="tooltip-bubble">
                <span className="font-semibold block text-gold">Financial Details</span>
                <span className="block text-[10px] text-neutral-300 font-normal leading-tight mt-0.5">
                  Total: ₱{totalAmt.toLocaleString()} {remBalance > 0 ? `(₱${remBalance.toLocaleString()} remaining balance)` : '(Fully settled)'}
                </span>
              </div>
            </div>

            {/* Fulfillment / Handover */}
            <div 
              className="has-tooltip flex items-center gap-1.5 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 hover:border-gold/40 hover:bg-gold/5 truncate transition-all cursor-pointer group/pill"
              title="Studio In-Person Claiming"
            >
              <Package size={13} className="text-gold shrink-0 transition-transform duration-200 group-hover/pill:scale-125 group-hover/pill:rotate-6" />
              <span className="truncate font-medium">Studio In-Person Claiming</span>
              <div className="tooltip-bubble">
                <span className="font-semibold block text-gold">Handover Method</span>
                <span className="block text-[10px] text-neutral-300 font-normal leading-tight mt-0.5">
                  Pick up graduation portraits and framed prints at the studio counter
                </span>
              </div>
            </div>
          </div>

          {/* Schedule to be announced notice alert */}
          {isScheduleTBD && status !== 'COMPLETED' && status !== 'CANCELLED' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs font-body animate-fade-in">
              <Bell size={13} className="shrink-0 text-amber-500" />
              <span className="text-[11px] leading-tight">
                Schedule to be announced · You will be notified via SMS & portal once confirmed.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Toolbar: Mini Progress Bar + Action Buttons ──────────────── */}
      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Progress Bar Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0 space-y-1.5 flex-1 max-w-sm">
            <div className="flex justify-between items-center text-[10px] font-body">
              <span className="text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                <Layers size={11} className="text-gold" />
                <span>Progress</span>
              </span>
              <span className="text-gold font-bold text-xs">{stageInfo.pct}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-200/60 dark:border-neutral-700/60 shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-gold-dark via-gold to-yellow-300 rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${stageInfo.pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {status !== 'CANCELLED' && needsDownpayment && downAmount > 0 && (
            <Link
              to="/dashboard/payments"
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-body text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="Pay 50% reservation downpayment"
            >
              <CreditCard size={13} />
              <span>Pay Downpayment</span>
            </Link>
          )}

          {status !== 'CANCELLED' && (booking_token || booking_number) && (
            <button
              type="button"
              onClick={() => setShowQR(true)}
              className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-gold/15 hover:text-gold text-neutral-700 dark:text-neutral-300 font-body text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-200 dark:border-neutral-700"
              title="Studio Gate QR Pass"
            >
              <QrCode size={13} className="text-gold" />
              <span>QR Pass</span>
            </button>
          )}

          <Link
            to="/dashboard/progress"
            className="px-3 py-1.5 rounded-xl bg-gold/15 hover:bg-gold hover:text-primary text-gold font-body text-xs font-bold flex items-center gap-1.5 transition-colors border border-gold/30"
            title="Track Session Progress"
          >
            <Layers size={13} />
            <span>Track</span>
          </Link>

          <Link 
            to={`/dashboard/bookings/${id}`}
            className="px-3 py-1.5 rounded-xl bg-primary dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 font-body text-xs font-bold flex items-center gap-1 transition-colors shadow-xs"
          >
            <span>Details</span>
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── QR Pass Modal ────────────────────────────────────────────────────── */}
      {showQR && (
        <div
          className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-left"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-gold/30 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-primary dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Close"
            >
              <XCircle size={18} />
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-bold font-body uppercase tracking-wider mb-2">
              <QrCode size={13} /> Studio Session Pass
            </div>
            <h3 className="font-heading text-2xl text-primary dark:text-white font-bold">
              #{booking_number}
            </h3>
            <p className="text-xs text-neutral-500 font-body mb-4">
              {service?.name || 'Session'} · {displayDate}
            </p>
            <div className="p-3 bg-white rounded-2xl border border-neutral-200">
              <QRPass
                bookingToken={booking_token || id}
                bookingNumber={booking_number}
                qrCodePath={qr_code_path}
                size={200}
                showActions={true}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
