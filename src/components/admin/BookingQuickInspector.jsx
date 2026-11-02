import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X, Mail, MapPin, Calendar, Clock, CreditCard, ExternalLink,
  Check, Copy, GraduationCap, Camera, Package, ChevronRight, ArrowRight, User,
  Loader2, Banknote, Wallet, Receipt, Building, CheckCircle2,
} from 'lucide-react';
import {
  parseStudentDetailsFromNotes,
  parseParticipantDetailsFromNotes,
} from '../../services/bookingService';
import {
  recordPayment,
  createNotification,
  getBookingDetail,
} from '../../services/bookingAdminService';
import { useAuth } from '../../context/AuthContext';

const INVALID = ['n/a', 'na', 'none', 'null', '—', '-', '""', "''"];
const isReal = (v) => Boolean(v && !INVALID.includes(String(v).trim().toLowerCase()));
const peso = (n, d = 0) =>
  `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: d, maximumFractionDigits: 2 })}`;

function formatTime(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${parts[1]} ${ampm}`;
}

function cleanSchoolAndLocation(rawSchool, rawCampus, rawLocation) {
  let school = (rawSchool || '').replace(/\bC[lI]ty\b/gi, 'City').trim();
  let campus = (rawCampus || '').replace(/\bC[lI]ty\b/gi, 'City').trim();
  let loc = (rawLocation || '').replace(/\bC[lI]ty\b/gi, 'City').trim();

  // Normalize partner schools if raw address was stored in school name
  if (/^uling\b/i.test(school) && !/(?:school|high|academy|college|university|institute)/i.test(school)) {
    school = 'Uling National High School';
    if (!campus || /uling/i.test(campus)) campus = 'City of Naga, Cebu';
  } else if (/^alpaco\b/i.test(school) && !/(?:school|high|academy|college|university|institute)/i.test(school)) {
    school = 'Alpaco Senior High School';
    if (!campus || /alpaco/i.test(campus)) campus = 'City of Naga, Cebu';
  }

  // Deduplicate campus if it's already contained in or matches school name
  if (campus && (campus.toLowerCase() === school.toLowerCase() || school.toLowerCase().includes(campus.toLowerCase()))) {
    campus = '';
  }

  // Extract external map URL if embedded in location string
  const urlMatch = loc.match(/https?:\/\/[^\s,]+/);
  let mapUrl = urlMatch ? urlMatch[0] : null;
  let cleanLoc = loc.replace(/https?:\/\/[^\s,]+/, '').replace(/,\s*$/, '').trim();
  cleanLoc = cleanLoc.replace(/\s*\([^)]*(?:city of naga|cebu|uling|alpaco|same as above)[^)]*\)/gi, '').trim();

  const isSchoolCampus =
    /^School Campus:/i.test(cleanLoc) || /School Campus/i.test(loc) || /School Campus/i.test(rawSchool);
  cleanLoc = cleanLoc.replace(/^School Campus:\s*/i, '').trim();

  let venueAddress = '';
  if (isSchoolCampus) {
    venueAddress = `${school}${campus ? ' · ' + campus : ' · City of Naga, Cebu'}`;
  } else if (cleanLoc) {
    venueAddress = cleanLoc.replace(/^Studio:\s*/i, '').trim();
  } else {
    venueAddress = 'E-Kodak Studio · 311 Rizal Street, City of Naga, Cebu';
  }

  if (!mapUrl && venueAddress) {
    mapUrl = `https://maps.google.com/?q=${encodeURIComponent(venueAddress.replace('·', ','))}`;
  }

  return {
    school: school || 'Not specified',
    campus: campus || (school ? 'City of Naga, Cebu' : ''),
    venueAddress: venueAddress || 'E-Kodak Studio · 311 Rizal Street, City of Naga, Cebu',
    mapUrl,
    isSchoolCampus,
  };
}

const DEFAULT_SET_A_HIGHLIGHTS = [
  '1 piece 10×12" colored portrait with crystal wood frame',
  '1 piece 8×10" Filipiniana or Barong portrait (unframed)',
  '4 pieces Wallet-size colored prints with academic cap (2R)',
  '4 pieces Wallet-size colored prints in Filipiniana or Barong (2R)',
  '6 pieces Passport-size colored ID prints (TESDA standard)',
  '6 pieces 2×2" colored ID prints in formal attire',
  'Free professional makeup session (studio pictorial only)',
];

/* ── Presentational Helper Components Matching Screenshot ──────────────────── */
function SectionTitle({ icon: Icon, children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg bg-[#c9a96e]/10 ring-1 ring-[#c9a96e]/25 flex items-center justify-center shrink-0">
          <Icon size={12} className="text-[#a8843a]" />
        </span>
        <h3 className="font-heading uppercase tracking-[0.2em] text-xs font-bold text-neutral-800">
          {children}
        </h3>
      </div>
      {action}
    </div>
  );
}
SectionTitle.propTypes = {
  icon: PropTypes.elementType.isRequired,
  children: PropTypes.node,
  action: PropTypes.node,
};

function Field({ label, children, muted }) {
  return (
    <div className="min-w-0">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-neutral-400 leading-none">{label}</p>
      <div className={`mt-1.5 text-[13px] ${muted ? 'text-neutral-400 font-normal' : 'font-bold text-neutral-900'} truncate`}>
        {children}
      </div>
    </div>
  );
}
Field.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node,
  muted: PropTypes.bool,
};

export default function BookingQuickInspector({
  booking,
  isOpen,
  onClose,
  onStatusUpdated,
}) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [detailedBooking, setDetailedBooking] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [additionalPaid, setAdditionalPaid] = useState(0);

  // Sync state when incoming booking changes
  const [currentBookingId, setCurrentBookingId] = useState(booking?.id);
  if (booking?.id !== currentBookingId) {
    setCurrentBookingId(booking?.id);
    setAdditionalPaid(0);
    setDetailedBooking(null);
  }

  // Fetch full live database details on modal open
  useEffect(() => {
    if (!booking?.id || !isOpen) return;

    let isCurrent = true;
    getBookingDetail(booking.id)
      .then(({ data, error }) => {
        if (isCurrent && data && !error) {
          setDetailedBooking(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load full booking details:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [booking?.id, isOpen]);

  // Payment Recording Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentType, setPaymentType] = useState('DOWN_PAYMENT');
  const [paymentRefNumber, setPaymentRefNumber] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentToast, setPaymentToast] = useState('');

  if (!isOpen || !booking) return null;

  // Active consolidated booking record
  const active = detailedBooking || booking;

  // ── Financial Calculations ───────────────────────────────────────────────
  const totalAmount = parseFloat(active.total_amount || active.service?.base_price || 1750);
  const baseDown = parseFloat(active.down_payment_amount || 0);
  const downPayment = baseDown + additionalPaid;
  const remainingBal = Math.max(0, parseFloat(active.remaining_balance ?? (totalAmount - baseDown)) - additionalPaid);
  const isPaid = (active.payment_status === 'PAID' && additionalPaid === 0) || remainingBal <= 0;
  const paidPercent =
    totalAmount > 0 ? Math.min(100, Math.round((downPayment / totalAmount) * 100)) : isPaid ? 100 : 0;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const goBooking = () => {
    onClose();
    navigate(`/admin/bookings/${active.id}`);
  };

  const goPayments = () => {
    onClose();
    navigate(`/admin/payments?booking_id=${active.id}&search=${active.booking_number}`);
  };

  const handleCopyRef = (e) => {
    e.stopPropagation();
    if (!active.booking_number) return;
    navigator.clipboard.writeText(active.booking_number);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 1500);
  };

  const openRecordPayment = (e) => {
    e.stopPropagation();
    setPaymentAmount(remainingBal > 0 ? remainingBal.toFixed(2) : '');
    setPaymentType(downPayment > 0 ? 'FINAL_PAYMENT' : 'DOWN_PAYMENT');
    setPaymentMethod('CASH');
    setPaymentRefNumber('');
    setPaymentModalOpen(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    setSubmittingPayment(true);
    try {
      const { error } = await recordPayment({
        bookingId: active.id,
        amount: amt,
        paymentType,
        paymentMethod,
        referenceNumber: paymentRefNumber,
        notes: '',
        recordedBy: profile?.id || null,
      });
      if (error) throw error;
      setAdditionalPaid((p) => p + amt);

      if (active.customer_id) {
        createNotification({
          userId: active.customer_id,
          bookingId: active.id,
          title: 'Payment Recorded',
          message: `A payment of ${peso(amt, 2)} was recorded for booking #${active.booking_number}.`,
          notificationType: 'payment_recorded',
        }).catch(() => {});
      }

      setPaymentToast(`${peso(amt)} recorded successfully`);
      setTimeout(() => setPaymentToast(''), 4000);
      setPaymentModalOpen(false);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      console.error('Failed to record payment:', err);
      alert(err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // ── Derived Data from Database & Notes ────────────────────────────────────
  const formattedDate = active.event_date
    ? new Date(active.event_date).toLocaleDateString('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date pending';
  const timeSlot = formatTime(active.preferred_time);

  const specs = active.customer?.studio_specs || {};
  const student = active.student_details || parseStudentDetailsFromNotes(active.notes) || {};
  const participant = active.participant_details || parseParticipantDetailsFromNotes(active.notes) || {};

  const { school, campus, venueAddress, mapUrl } = cleanSchoolAndLocation(
    student.school || specs.university,
    student.school_address || specs.campus,
    active.location
  );

  const strand = student.course || specs.degree || specs.course || '—';
  const studentId = student.student_id || specs.student_id || '—';

  // Format section and batch cleanly without repeating "Batch"
  const rawBatch = (student.batch || '').replace(/^Batch\s*/i, '').trim();
  const rawSection = student.section || specs.section || '';
  const sectionGrade = rawSection
    ? (rawBatch ? `Batch ${rawBatch} · ${rawSection}` : rawSection)
    : (rawBatch ? `Batch ${rawBatch}` : '—');

  const fullName =
    `${active.customer?.first_name || ''} ${active.customer?.last_name || ''}`.trim() ||
    participant.full_name ||
    'Unspecified Client';
  const email = (active.customer?.email || participant.email || '').trim();
  const hasEmail = isReal(email);
  const phone = (active.customer?.phone || participant.phone || '').trim();
  const hasPhone = isReal(phone);
  const isSomeoneElse = participant.booking_for === 'someone_else' && isReal(participant.full_name);

  const initials =
    ((active.customer?.first_name?.[0] || '') + (active.customer?.last_name?.[0] || '')).toUpperCase() ||
    (fullName !== 'Unspecified Client' ? fullName.slice(0, 2).toUpperCase() : 'EK');

  const photographerName = active.photographer
    ? `${active.photographer.first_name || active.photographer.profile?.first_name || ''} ${
        active.photographer.last_name || active.photographer.profile?.last_name || ''
      }`.trim()
    : '';

  // Service tiers and exact inclusions from DB
  const tiers = active.service?.tiers || [];
  const tier = tiers.find(
    (t) => t.name?.toLowerCase().trim() === (active.tier_name || 'Set A').toLowerCase().trim()
  ) || null;
  const tierHighlights =
    tier?.highlights && tier.highlights.length > 0
      ? tier.highlights
      : DEFAULT_SET_A_HIGHLIGHTS;

  // ── Pipeline Stepper Stages Matching Screenshot ──────────────────────────
  const shortDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
  const st = String(active.status || 'CONFIRMED').toUpperCase();
  const isApproved = !['PENDING', 'CANCELLED', 'REJECTED'].includes(st);
  const isScheduled = Boolean(active.event_date);
  const shootDone = ['EDITING', 'RETOUCHING', 'FINALIZED', 'READY', 'UNDER_DELIVERY', 'COMPLETED'].includes(st);
  const shootActive = ['CAPTURE', 'IN_PROGRESS'].includes(st);
  const editDone = ['READY', 'UNDER_DELIVERY', 'COMPLETED'].includes(st);
  const editActive = ['EDITING', 'RETOUCHING', 'FINALIZED'].includes(st);
  const ready = ['READY', 'UNDER_DELIVERY'].includes(st);
  const completed = st === 'COMPLETED';

  const stages = [
    {
      id: 'received',
      title: 'Received',
      sub: shortDate(active.created_at) || 'Recorded',
      state: 'done',
    },
    {
      id: 'approved',
      title: 'Approved',
      sub: isApproved ? (shortDate(active.updated_at) || 'Approved') : 'Pending',
      state: isApproved ? 'done' : 'pending',
    },
    {
      id: 'schedule',
      title: 'Schedule',
      sub: isScheduled ? (shortDate(active.event_date) || 'Scheduled') : (isApproved ? 'Next step' : 'Pending'),
      state: isScheduled ? 'done' : (isApproved ? 'current' : 'pending'),
      onClick: goBooking,
    },
    {
      id: 'shoot',
      title: 'Shoot',
      sub: shootDone ? 'Done' : shootActive ? 'In progress' : 'Pending',
      state: shootDone ? 'done' : shootActive ? 'current' : 'pending',
    },
    {
      id: 'editing',
      title: 'Editing',
      sub: editDone ? 'Done' : editActive ? 'In progress' : 'Pending',
      state: editDone ? 'done' : editActive ? 'current' : 'pending',
    },
    {
      id: 'pickup',
      title: 'Pickup',
      sub: completed ? 'Claimed' : ready ? 'Ready' : 'Pending',
      state: completed ? 'done' : ready ? 'current' : 'pending',
    },
    {
      id: 'completed',
      title: 'Completed',
      sub: completed ? 'Fulfilled' : 'Pending',
      state: completed ? 'done' : 'pending',
    },
  ];

  const updated = active.updated_at ? new Date(active.updated_at) : new Date();
  const lastUpdated = `Updated ${updated.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} · ${updated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

  const paymentMethods = [
    { id: 'CASH', label: 'Cash', icon: Banknote },
    { id: 'E_WALLET', label: 'GCash / Maya', icon: Wallet },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building },
    { id: 'CREDIT_CARD', label: 'Card', icon: CreditCard },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 font-body animate-fade-in overflow-hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md cursor-pointer" onClick={onClose} />

      {/* Main Luxury Modal Canvas: Matches Screenshot Completely */}
      <div className="relative w-full max-w-[1020px] max-h-[calc(100dvh-2.5rem)] flex flex-col bg-[#faf8f5] rounded-[28px] shadow-[0_32px_100px_-20px_rgba(0,0,0,0.65)] border border-white/20 overflow-hidden z-10 animate-in zoom-in-95 duration-200">

        {/* ── 1. HEADER (Dark Section) ────────────────────────────────────── */}
        <header className="relative shrink-0 bg-[#0b0f17] text-white px-6 sm:px-7 pt-4 pb-3.5 overflow-hidden border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Circular Serif Initials Avatar */}
              <div className="w-10 h-10 rounded-full border border-neutral-700/80 bg-[#111622] text-[#c9a96e] font-heading font-medium text-xs flex items-center justify-center shrink-0 shadow-inner">
                {initials}
              </div>

              <div className="min-w-0">
                {/* Reference, Set, Status Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyRef}
                    title="Click to copy booking reference"
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] text-neutral-200 hover:text-white transition-colors cursor-pointer"
                  >
                    #{active.booking_number || (active.id ? String(active.id).slice(0, 8).toUpperCase() : 'UNASSIGNED')}
                    {copiedRef ? (
                      <Check size={11} className="text-[#c9a96e]" />
                    ) : (
                      <Copy size={11} className="text-neutral-400" />
                    )}
                  </button>

                  <span className="text-[11.5px] font-bold uppercase tracking-wider text-[#c9a96e] px-1.5 py-0.5 rounded-md border border-[#c9a96e]/50 bg-transparent leading-none">
                    {active.tier_name || 'SET A'}
                  </span>

                  <span className="text-[11.5px] font-bold uppercase tracking-wider text-[#38bdf8] px-1.5 py-0.5 rounded-md border border-[#38bdf8]/60 bg-[#38bdf8]/10 leading-none">
                    {st}
                  </span>
                </div>

                {/* Service Title */}
                <h2 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5 leading-snug truncate">
                  {active.service?.name || 'Senior High Packages and Sets'}
                </h2>

                {/* Subtitle */}
                <p className="text-xs text-neutral-400 mt-0.5 truncate leading-tight">
                  <span>Booked by <strong className="text-white font-semibold">{fullName}</strong></span>
                  <span className="mx-2 text-neutral-500">•</span>
                  <span>{venueAddress}</span>
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Session Date Card */}
              <button
                type="button"
                onClick={goBooking}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer text-left group"
                title="Open booking record to schedule or edit"
              >
                <Calendar size={13} className="text-[#c9a96e]" />
                <span className="leading-tight">
                  <span className="block text-[10.5px] uppercase tracking-[0.16em] text-neutral-400 font-bold">
                    SESSION DATE
                  </span>
                  <span className="block text-xs font-semibold text-[#c9a96e] mt-0.5">
                    {formattedDate}
                  </span>
                </span>
                <ChevronRight size={13} className="text-neutral-400 group-hover:text-white transition-colors" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close inspector"
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Stepper / Progress Bar (Exactly Matches Screenshot) */}
          <div className="relative mt-3 pt-2.5 border-t border-white/10 overflow-x-auto scrollbar-none">
            <ol className="grid grid-cols-7 min-w-[540px] sm:min-w-0">
              {stages.map((s, i) => {
                const isDone = s.state === 'done';
                const isCurrent = s.state === 'current';
                const isLineActive = isDone;

                return (
                  <li
                    key={s.id}
                    onClick={s.onClick}
                    title={`${s.title}: ${s.sub}`}
                    className={`relative flex flex-col items-center text-center px-1 ${
                      s.onClick ? 'cursor-pointer group' : ''
                    }`}
                  >
                    {/* Connecting Line */}
                    {i < stages.length - 1 && (
                      <span
                        className={`absolute top-[8px] left-[calc(50%+10px)] right-[calc(-50%+10px)] h-[1px] ${
                          isLineActive ? 'bg-teal-400' : 'bg-neutral-700/60'
                        }`}
                      />
                    )}

                    {/* Step Circle Indicator */}
                    <div className="relative z-10 h-4 flex items-center justify-center">
                      {isDone ? (
                        <span className="w-4 h-4 rounded-full border border-teal-400 bg-[#0b0f17] flex items-center justify-center text-teal-400">
                          <Check size={9} strokeWidth={3} />
                        </span>
                      ) : isCurrent ? (
                        <span className="w-4 h-4 rounded-full border border-[#c9a96e] bg-[#0b0f17] flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c9a96e]" />
                        </span>
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-neutral-600 bg-[#0b0f17] flex items-center justify-center">
                          <span className="w-1 h-1 rounded-full bg-neutral-600" />
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <span
                      className={`mt-1.5 text-xs leading-tight ${
                        isCurrent
                          ? 'font-bold text-[#c9a96e]'
                          : isDone
                          ? 'font-bold text-white'
                          : 'font-medium text-neutral-400'
                      }`}
                    >
                      {s.title}
                    </span>

                    {/* Subtitle */}
                    <span
                      className={`text-[11.5px] mt-0.5 leading-tight ${
                        isCurrent
                          ? 'font-medium text-[#c9a96e]'
                          : isDone
                          ? 'text-neutral-400'
                          : 'text-neutral-500'
                      }`}
                    >
                      {s.sub}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </header>

        {/* Toast if payment recorded */}
        {paymentToast && (
          <div className="shrink-0 flex items-center justify-between gap-3 bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-xs font-semibold text-emerald-800">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              {paymentToast}
            </span>
            <button type="button" onClick={() => setPaymentToast('')} className="cursor-pointer">
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── 2. SCROLLABLE CONTENT BODY (Ivory Section) ───────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-6 sm:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Column (Approx 60%): Order Information */}
            <div className="lg:col-span-7 space-y-5 lg:pr-2">

              {/* 1. CLIENT IDENTITY */}
              <section>
                <SectionTitle icon={User}>CLIENT IDENTITY</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="ACCOUNT OWNER">{fullName}</Field>

                  <Field label="EMAIL ADDRESS">
                    {hasEmail ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-[12.5px] text-neutral-900">
                        <Mail size={12} className="text-[#c9a96e] shrink-0" />
                        <span className="truncate">{email}</span>
                      </span>
                    ) : (
                      <span className="text-neutral-400 font-normal">Not provided</span>
                    )}
                  </Field>

                  <Field label="CONTACT PHONE" muted={!hasPhone}>
                    {hasPhone ? phone : 'Not provided'}
                  </Field>

                  <Field label="BENEFICIARY TYPE">
                    {isSomeoneElse ? (
                      <span className="text-neutral-900 font-semibold">
                        {participant.full_name}
                        {participant.relationship ? ` (${participant.relationship})` : ''}
                      </span>
                    ) : (
                      <span className="text-neutral-800 font-medium">Self (Account Owner)</span>
                    )}
                  </Field>
                </div>
              </section>

              {/* Hairline Divider */}
              <div className="border-b border-[#ece6da]" />

              {/* 2. ACADEMIC & INSTITUTION */}
              <section>
                <SectionTitle icon={GraduationCap}>ACADEMIC & INSTITUTION</SectionTitle>
                <div className="mb-4">
                  <h4 className="font-heading font-bold text-[17px] text-neutral-900 leading-snug">
                    {school}
                  </h4>
                  {campus && <p className="text-xs text-neutral-500 font-normal mt-1 leading-none">{campus}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="TRACK / STRAND">
                    {strand}
                  </Field>
                  <Field label="SECTION / GRADE">
                    {sectionGrade}
                  </Field>
                  <Field label="STUDENT ID">
                    <span className="font-mono tabular-nums">{studentId}</span>
                  </Field>
                </div>
              </section>

              {/* Hairline Divider */}
              <div className="border-b border-[#ece6da]" />

              {/* 3. SESSION LOGISTICS */}
              <section>
                <SectionTitle
                  icon={Camera}
                  action={
                    <button
                      type="button"
                      onClick={goBooking}
                      className="text-xs font-medium text-[#c9a96e] hover:text-[#b89555] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      Assign photographer <ArrowRight size={12} />
                    </button>
                  }
                >
                  SESSION LOGISTICS
                </SectionTitle>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="EVENT DATE" muted={!active.event_date}>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={12} className="text-[#c9a96e]" />
                      {formattedDate}
                    </span>
                  </Field>
                  <Field label="PREFERRED TIME" muted={!timeSlot}>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={12} className="text-neutral-400" />
                      {timeSlot || 'Flexible'}
                    </span>
                  </Field>
                  <Field label="PHOTOGRAPHER" muted={!photographerName}>
                    {photographerName || 'Unassigned'}
                  </Field>
                  <Field label="STUDIO BAY" muted={!active.bay_number}>
                    {active.bay_number ? `Bay ${active.bay_number}` : 'Campus / Standard Bay'}
                  </Field>
                </div>

                {/* Location Container */}
                <div className="mt-4 bg-white rounded-xl border border-[#ece6da] px-4 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <MapPin size={13} className="text-[#c9a96e] shrink-0" />
                    <span className="text-xs font-medium text-neutral-800 truncate">
                      {venueAddress}
                    </span>
                  </span>
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-neutral-700 hover:text-black flex items-center gap-1 shrink-0"
                    >
                      Map <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column (Approx 40%): Financial Settlement & Package Details */}
            <aside className="lg:col-span-5 space-y-3">

              {/* 1. FINANCIAL SETTLEMENT CARD (Obsidian Black) */}
              <div className="rounded-[20px] bg-[#0b0f17] text-white p-4.5 sm:p-5 shadow-xl border border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans uppercase tracking-[0.16em] text-xs font-bold text-neutral-300">
                    FINANCIAL SETTLEMENT
                  </span>
                  <span className="font-sans uppercase tracking-wider text-[11.5px] font-bold text-[#c9a96e] px-2 py-0.5 rounded-full border border-[#c9a96e]/60 bg-transparent leading-none">
                    {isPaid ? 'PAID' : (downPayment > 0 ? 'DOWNPAYMENT PAID' : 'UNPAID')}
                  </span>
                </div>

                <div className="mt-2.5">
                  <p className="font-sans uppercase tracking-[0.16em] text-[11.5px] font-semibold text-neutral-400">
                    REMAINING BALANCE
                  </p>
                  <p className="font-sans font-bold text-3xl sm:text-[32px] text-white tracking-tight mt-0.5 leading-none">
                    {peso(remainingBal, remainingBal % 1 ? 2 : 0)}
                  </p>
                </div>

                {/* Gold Progress Bar */}
                <div className="mt-2.5 h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#c9a96e] transition-all duration-500"
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>

                {/* Paid vs Total */}
                <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums">
                  <span className="text-neutral-400">
                    Paid <strong className="text-white font-bold">{peso(downPayment)}</strong>
                  </span>
                  <span className="text-neutral-400">
                    Total <strong className="text-white font-bold">{peso(totalAmount)}</strong> · {paidPercent}%
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openRecordPayment}
                    className="flex-1 h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-[0.99]"
                  >
                    <CreditCard size={13} className="shrink-0" /> Record Payment
                  </button>

                  <button
                    type="button"
                    onClick={goPayments}
                    title="Open full payment ledger"
                    className="h-9 px-3.5 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    Ledger <ArrowRight size={12} />
                  </button>
                </div>
              </div>

              {/* 2. PACKAGE INCLUSIONS CARD (Pure White) */}
              <div className="rounded-[20px] bg-white border border-[#ece6da] p-4.5 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package size={13} className="text-[#c9a96e]" />
                    <h3 className="font-heading uppercase tracking-[0.18em] text-xs font-bold text-neutral-800">
                      PACKAGE INCLUSIONS
                    </h3>
                  </div>
                  <span className="font-bold text-xs text-neutral-900 tabular-nums">
                    {peso(totalAmount)}
                  </span>
                </div>

                <ul className="space-y-2 mt-3.5 pt-3 border-t border-[#f1ece2]">
                  {tierHighlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-700 leading-tight">
                      <Check size={12} className="text-[#c9a96e] mt-0.5 shrink-0" strokeWidth={2.5} />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>

        {/* ── 3. FIXED FOOTER (Pure White) ─────────────────────────────────── */}
        <footer className="shrink-0 flex items-center justify-between gap-4 px-6 sm:px-8 py-3 bg-white border-t border-[#ece6da]">
          <span className="text-[11px] text-neutral-400">{lastUpdated}</span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={goBooking}
              className="h-9 px-4 rounded-lg border border-neutral-300 hover:border-neutral-400 bg-white text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Full Order <ArrowRight size={12} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-9 px-6 rounded-lg bg-[#0b0f17] hover:bg-neutral-800 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            >
              Done
            </button>
          </div>
        </footer>
      </div>

      {/* ── RECORD PAYMENT DIALOG ─────────────────────────────────────────── */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-fade-in">
          <form onSubmit={submitPayment} className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading text-lg font-bold text-neutral-900">Record Payment</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {fullName} · #{active.booking_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Payment Amount
              </label>
              <div className="relative mt-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-semibold text-base">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full h-11 pl-8 pr-4 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#c9a96e] text-base font-bold tabular-nums"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Balance due {peso(remainingBal, 2)}</p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Payment Channel
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {paymentMethods.map((m) => {
                  const Icon = m.icon;
                  const on = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors ${
                        on
                          ? 'border-[#c9a96e] bg-[#faf5ec] text-neutral-900 font-semibold'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <Icon size={13} className={on ? 'text-[#a8843a]' : 'text-neutral-400'} /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Settlement Type
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  ['DOWN_PAYMENT', 'Down Payment'],
                  ['FINAL_PAYMENT', 'Final Settlement'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentType(id)}
                    className={`h-9 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      paymentType === id
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Reference / Receipt Number
              </label>
              <input
                type="text"
                value={paymentRefNumber}
                onChange={(e) => setPaymentRefNumber(e.target.value)}
                placeholder="e.g. GCash Ref / Bank OR#"
                className="w-full h-9 px-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#c9a96e] text-xs mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPayment}
                className="h-9 px-5 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {submittingPayment ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Recording…
                  </>
                ) : (
                  <>
                    <Receipt size={13} /> Confirm Payment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>,
    document.body
  );
}

BookingQuickInspector.propTypes = {
  booking: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onStatusUpdated: PropTypes.func,
  onRestore: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};