import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X, Mail, Calendar, CreditCard, Camera,
  GraduationCap, ChevronRight, ArrowRight, User,
  Loader2, Banknote, Wallet, Receipt, Building, CheckCircle2, Sparkles, AlertCircle,
} from 'lucide-react';
import {
  parseStudentDetailsFromNotes,
  parseParticipantDetailsFromNotes,
} from '../../services/bookingService';
import {
  recordPayment,
  createNotification,
  getBookingDetail,
  updateBookingStatus,
  NEXT_STATUS_MAP,
} from '../../services/bookingAdminService';
import {
  getStatusLabel,
  hasAssignedPhotographer,
} from '../../lib/bookingUtils';
import { supabase } from '../../lib/supabase';
import { createTransferLog, recordAdminActivity } from '../../services/workstationService';
import { useAuth } from '../../context/AuthContext';
import AssignPhotographerModal from './AssignPhotographerModal';

const INVALID = ['n/a', 'na', 'none', 'null', '—', '-', '""', "''"];
const isReal = (v) => Boolean(v && !INVALID.includes(String(v).trim().toLowerCase()));
const peso = (n, d = 0) =>
  `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: d, maximumFractionDigits: 2 })}`;

const GATEWAY_METHODS = ['E_WALLET', 'BANK_TRANSFER', 'CREDIT_CARD', 'GCASH', 'MAYA', 'PAYMAYA', 'ONLINE'];

function formatGatewayLabel(rawMethod) {
  const m = String(rawMethod || '').toUpperCase().trim();
  if (m === 'GCASH') return 'GCash';
  if (m === 'MAYA' || m === 'PAYMAYA') return 'Maya';
  if (m === 'E_WALLET') return 'GCash / Maya';
  if (m === 'BANK_TRANSFER') return 'Bank Transfer';
  if (m === 'CREDIT_CARD') return 'Card';
  if (m === 'ONLINE') return 'Online Gateway';
  return rawMethod || 'Payment Gateway';
}

function detectGatewayPayment(active, paidTotal, remainingBal) {
  const paymentsList = Array.isArray(active?.payments) ? active.payments : [];
  const rawNotes = String(active?.notes || '');

  const noteGatewayMatch = rawNotes.match(/•\s*Gateway:\s*([^\n\r]+)/i);
  const noteRefMatch = rawNotes.match(/•\s*Reference\s*No:\s*([^\n\r]+)/i);
  const noteGateway = noteGatewayMatch ? noteGatewayMatch[1].trim() : '';
  const noteRef = noteRefMatch ? noteRefMatch[1].trim() : '';

  const gatewayPayments = paymentsList.filter((p) => {
    const method = String(p?.payment_method || '').toUpperCase().trim();
    const ref = String(p?.reference_number || '').toUpperCase().trim();
    const pNotes = String(p?.notes || '').toLowerCase();
    return (
      GATEWAY_METHODS.includes(method) ||
      ref.startsWith('XND-') ||
      ref.startsWith('EK-INV-') ||
      pNotes.includes('checkout') ||
      pNotes.includes('gateway') ||
      pNotes.includes('xendit') ||
      pNotes.includes('gcash') ||
      pNotes.includes('maya') ||
      pNotes.includes('customer registered payment')
    );
  });

  const latestGatewayPayment = gatewayPayments[gatewayPayments.length - 1] || null;
  const gatewayAmountPaid = gatewayPayments.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
  const hasGatewayRecord =
    gatewayPayments.length > 0 ||
    Boolean(noteGateway) ||
    Boolean(noteRef && /^(XND-|EK-INV-)/i.test(noteRef)) ||
    (paidTotal > 0 && Boolean(active?.payment_confirmed_at));

  const channelLabel = noteGateway
    ? formatGatewayLabel(noteGateway)
    : latestGatewayPayment
      ? formatGatewayLabel(latestGatewayPayment.payment_method)
      : 'Payment Gateway';

  const referenceNumber = latestGatewayPayment?.reference_number || noteRef || '';
  const noteAccountMatch = rawNotes.match(/•\s*(?:Account\s*(?:No|Number)|Mobile|GCash\s*No):\s*([^\n\r]+)/i);
  const rawAccountNo =
    (noteAccountMatch ? noteAccountMatch[1].trim() : '') ||
    (isReal(active?.customer?.phone) ? String(active.customer.phone).trim() : '');

  const paidDateRaw = latestGatewayPayment?.payment_date || latestGatewayPayment?.created_at || active?.payment_confirmed_at || null;
  const paidDateLabel = paidDateRaw
    ? new Date(paidDateRaw).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return {
    hasGatewayRecord,
    isFullyPaid: remainingBal <= 0 && (paidTotal > 0 || hasGatewayRecord),
    gatewayPayments,
    gatewayAmountPaid: gatewayAmountPaid > 0 ? gatewayAmountPaid : paidTotal,
    channelLabel,
    accountNumber: rawAccountNo,
    referenceNumber,
    paidDateLabel,
  };
}

function cleanSchoolAndLocation(rawSchool, rawCampus) {
  let school = (rawSchool || '').replace(/\bC[lI]ty\b/gi, 'City').trim();
  let campus = (rawCampus || '').replace(/\bC[lI]ty\b/gi, 'City').trim();

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

  return {
    school: school || 'Not specified',
    campus: campus || (school ? 'City of Naga, Cebu' : ''),
  };
}

/* ── Presentational Helper Components Matching Screenshot ──────────────────── */
function SectionTitle({ icon: Icon, children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg bg-[#c9a96e]/10 ring-1 ring-[#c9a96e]/25 flex items-center justify-center shrink-0">
          <Icon size={12} className="text-[#a8843a]" />
        </span>
        <h3 className="font-heading uppercase text-xs font-bold text-neutral-800">
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
      <p className="text-xs font-bold uppercase text-neutral-400 leading-none">{label}</p>
      <div className={`mt-1 text-[13px] ${muted ? 'text-neutral-400 font-normal' : 'font-bold text-neutral-900'} truncate`}>
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
  initialOpenPayment = false,
}) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [detailedBooking, setDetailedBooking] = useState(null);
  const [additionalPaid, setAdditionalPaid] = useState(0);
  const [downpaymentConfirmedLocal, setDownpaymentConfirmedLocal] = useState(false);

  // Sync state when incoming booking changes
  const [currentBookingId, setCurrentBookingId] = useState(booking?.id);
  if (booking?.id !== currentBookingId) {
    setCurrentBookingId(booking?.id);
    setAdditionalPaid(0);
    setDetailedBooking(null);
    setDownpaymentConfirmedLocal(false);
  }

  // Inline Stage Advance State
  const [advancingStage, setAdvancingStage] = useState(false);

  // Fetch full live database details on modal open
  const refreshDetail = () => {
    if (!booking?.id) return;
    getBookingDetail(booking.id)
      .then(({ data, error }) => {
        if (data && !error) {
          setDetailedBooking(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load full booking details:', err);
      });
  };

  useEffect(() => {
    if (!booking?.id || !isOpen) return;
    refreshDetail();
  }, [booking?.id, isOpen]);

  // Payment Recording Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(Boolean(initialOpenPayment));
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentType, setPaymentType] = useState('DOWN_PAYMENT');
  const [paymentRefNumber, setPaymentRefNumber] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [confirmingDownpayment, setConfirmingDownpayment] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [paymentToast, setPaymentToast] = useState(null);

  useEffect(() => {
    if (isOpen && initialOpenPayment && booking) {
      setPaymentModalOpen(true);
    } else if (!isOpen) {
      setPaymentModalOpen(false);
      setAssignModalOpen(false);
    }
  }, [isOpen, initialOpenPayment, booking?.id]);

  const showInspectorToast = (message, type = 'success') => {
    setPaymentToast({ message, type });
    setTimeout(() => setPaymentToast(null), 4000);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (assignModalOpen) return;
        if (paymentModalOpen && !submittingPayment) {
          setPaymentModalOpen(false);
        } else if (!submittingPayment) {
          onClose?.();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, assignModalOpen, paymentModalOpen, submittingPayment, onClose]);

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
  const gatewayStatus = detectGatewayPayment(active, downPayment, remainingBal);
  const isDownpaymentConfirmedByAdmin = Boolean(active.payment_confirmed_at || active.down_payment_confirmed || downpaymentConfirmedLocal);
  const needsDownpaymentConfirmation = gatewayStatus.hasGatewayRecord && !isDownpaymentConfirmedByAdmin;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const goBooking = () => {
    onClose();
    navigate(`/admin/bookings/${active.id}`);
  };

  const goPayments = () => {
    onClose();
    navigate(`/admin/payments?booking_id=${active.id}&search=${active.booking_number}`);
  };

  const openRecordPayment = (e) => {
    e.stopPropagation();
    setPaymentAmount(remainingBal > 0 ? remainingBal.toFixed(2) : '');
    setPaymentType(downPayment > 0 ? 'FINAL_PAYMENT' : 'DOWN_PAYMENT');
    setPaymentMethod('CASH');
    setPaymentRefNumber('');
    setPaymentModalOpen(true);
  };

  const handleConfirmGatewayDownpayment = async () => {
    if (!active?.id || confirmingDownpayment) return;
    setConfirmingDownpayment(true);
    try {
      const nowIso = new Date().toISOString();
      const nextPayStatus = remainingBal <= 0 ? 'PAID' : 'PARTIAL';
      const currentSt = String(active.status || 'PENDING').toUpperCase();
      const nextBookingStatus = ['PENDING', 'RESERVED'].includes(currentSt) ? 'CONFIRMED' : currentSt;

      const { error: updErr } = await supabase
        .from('bookings')
        .update({
          status: nextBookingStatus,
          confirmed_at: active.confirmed_at || nowIso,
          down_payment_confirmed: true,
          payment_confirmed_at: nowIso,
          payment_status: nextPayStatus,
          down_payment_amount: downPayment,
          remaining_balance: remainingBal,
          updated_at: nowIso,
        })
        .eq('id', active.id);

      if (updErr) throw updErr;

      if (nextBookingStatus !== currentSt) {
        try {
          await supabase.from('booking_status_history').insert({
            booking_id: active.id,
            status: nextBookingStatus,
            remarks: `Downpayment confirmed (${gatewayStatus.channelLabel}). Proceed to assign photographer.`,
            changed_by: profile?.id || null,
          });
        } catch (histErr) {
          console.warn('booking_status_history insert warning:', histErr);
        }
      }

      try {
        await Promise.all([
          recordAdminActivity({
            adminId: profile?.id || null,
            actionType: 'DOWNPAYMENT_CONFIRMED',
            entityType: 'booking',
            entityId: active.id,
            entityLabel: active.booking_number || 'Booking',
            description: `Confirmed ${gatewayStatus.channelLabel} downpayment of ${peso(gatewayStatus.gatewayAmountPaid, 2)}${gatewayStatus.referenceNumber ? ` (Ref: ${gatewayStatus.referenceNumber})` : ''}. Remaining balance of ${peso(remainingBal, 2)} queued in Payments Dashboard.`,
            details: {
              booking_id: active.id,
              booking_number: active.booking_number,
              gateway: gatewayStatus.channelLabel,
              reference_number: gatewayStatus.referenceNumber || null,
              confirmed_amount: gatewayStatus.gatewayAmountPaid,
              remaining_balance: remainingBal,
            },
          }),
          createTransferLog({
            bookingId: active.id,
            senderId: profile?.id || null,
            senderRole: profile?.role || 'admin',
            targetRole: 'finance',
            transferType: 'PAYMENT_VERIFICATION',
            priority: 'NORMAL',
            title: `Downpayment Confirmed (#${active.booking_number})`,
            message:
              remainingBal > 0
                ? `${gatewayStatus.channelLabel} downpayment of ${peso(gatewayStatus.gatewayAmountPaid, 2)} confirmed. Remaining ${peso(remainingBal, 2)} moved to Payments Dashboard.`
                : `Full gateway payment of ${peso(gatewayStatus.gatewayAmountPaid, 2)} confirmed via ${gatewayStatus.channelLabel}.`,
            payload: {
              booking_id: active.id,
              booking_number: active.booking_number,
              remaining_balance: remainingBal,
              reference_number: gatewayStatus.referenceNumber || null,
            },
          }),
        ]);
      } catch (logErr) {
        console.warn('Downpayment confirm log warning:', logErr);
      }

      if (active.customer_id) {
        createNotification({
          userId: active.customer_id,
          bookingId: active.id,
          title: 'Booking & Payment Approved',
          message: `Your downpayment of ${peso(gatewayStatus.gatewayAmountPaid, 2)} for booking #${active.booking_number} has been verified and your booking is now approved!`,
          notificationType: 'booking_approved',
        }).catch(() => {});
      }

      setDownpaymentConfirmedLocal(true);
      setDetailedBooking((prev) => ({
        ...(prev || active),
        status: nextBookingStatus,
        confirmed_at: active.confirmed_at || nowIso,
        down_payment_confirmed: true,
        payment_confirmed_at: nowIso,
        payment_status: nextPayStatus,
        remaining_balance: remainingBal,
      }));
      setPaymentModalOpen(false);
      showInspectorToast(
        remainingBal > 0
          ? `Downpayment confirmed. Remaining ${peso(remainingBal, 2)} moved to Payments Dashboard.`
          : 'Gateway payment confirmed in full.'
      );
      refreshDetail();
      if (onStatusUpdated) onStatusUpdated(active.id, nextBookingStatus);
    } catch (err) {
      console.error('Failed to confirm gateway downpayment:', err);
      showInspectorToast(err.message || 'Failed to confirm downpayment', 'error');
    } finally {
      setConfirmingDownpayment(false);
    }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showInspectorToast('Please enter a valid payment amount.', 'error');
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
      const nowIso = new Date().toISOString();
      if (!active.payment_confirmed_at) {
        try {
          await supabase
            .from('bookings')
            .update({ down_payment_confirmed: true, payment_confirmed_at: nowIso, updated_at: nowIso })
            .eq('id', active.id);
        } catch (confirmErr) {
          console.warn('payment_confirmed_at update warning:', confirmErr);
        }
      }
      setDownpaymentConfirmedLocal(true);
      setAdditionalPaid((p) => p + amt);

      if (active.customer_id) {
        createNotification({
          userId: active.customer_id,
          bookingId: active.id,
          title: 'Payment Recorded',
          message: `A payment of ${peso(amt, 2)} was recorded for booking #${active.booking_number}.`,
          notificationType: 'payment_recorded',
        }).catch(() => { });
      }

      showInspectorToast(`${peso(amt)} recorded successfully`);
      setPaymentModalOpen(false);
      refreshDetail();
      if (onStatusUpdated) onStatusUpdated(active.id, active.status);
    } catch (err) {
      console.error('Failed to record payment:', err);
      showInspectorToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // ── 1-Click Stage Advance Verification & Handler ─────────────────────────
  const currentStatusUpper = String(active.status || 'PENDING').toUpperCase();
  const nextStatus = NEXT_STATUS_MAP[currentStatusUpper] || null;
  const hasPhotographer = hasAssignedPhotographer(active);
  const hasPaymentConfirmed =
    isDownpaymentConfirmedByAdmin ||
    additionalPaid > 0;

  const getMissingVerifications = (targetStatus) => {
    if (!targetStatus) return [];
    const missing = [];
    const needsPayment = [
      'CONFIRMED',
      'PHOTOGRAPHER_ASSIGNED',
      'CAPTURE',
      'IN_PROGRESS',
      'EDITING',
      'RETOUCHING',
      'FINALIZED',
      'PRINTING',
      'READY',
      'UNDER_DELIVERY',
      'COMPLETED',
    ].includes(targetStatus);
    const needsPhotographer = [
      'PHOTOGRAPHER_ASSIGNED',
      'CAPTURE',
      'IN_PROGRESS',
      'EDITING',
      'RETOUCHING',
      'FINALIZED',
      'PRINTING',
      'READY',
      'UNDER_DELIVERY',
      'COMPLETED',
    ].includes(targetStatus);

    if (needsPayment && !hasPaymentConfirmed) missing.push('confirmed payment');
    if (needsPhotographer && !hasPhotographer) missing.push('assigned photographer');
    return missing;
  };

  const missingForNext = getMissingVerifications(nextStatus);
  const isNextStageBlocked = missingForNext.length > 0;
  const needsAssignPhotographerCTA = Boolean(
    nextStatus &&
      hasPaymentConfirmed &&
      !hasPhotographer &&
      [
        'PHOTOGRAPHER_ASSIGNED',
        'CAPTURE',
        'IN_PROGRESS',
        'EDITING',
        'RETOUCHING',
        'FINALIZED',
        'PRINTING',
        'READY',
        'UNDER_DELIVERY',
        'COMPLETED',
      ].includes(nextStatus)
  );

  const handleSetStage = async (targetStatus) => {
    if (!targetStatus || targetStatus === currentStatusUpper || advancingStage) return;
    const missing = getMissingVerifications(targetStatus);
    if (missing.length > 0) {
      showInspectorToast(
        `Cannot proceed: missing ${missing.join(' and ')}.`,
        'error'
      );
      return;
    }
    setAdvancingStage(true);
    try {
      const { error } = await updateBookingStatus(
        active.id,
        targetStatus,
        `Updated to ${getStatusLabel(targetStatus)}`,
        profile?.id || null
      );
      if (error) throw error;
      setDetailedBooking((prev) => ({ ...(prev || active), status: targetStatus, updated_at: new Date().toISOString() }));
      showInspectorToast(`Moved to ${getStatusLabel(targetStatus)}`);
      if (onStatusUpdated) onStatusUpdated(active.id, targetStatus);
    } catch (err) {
      console.error('Stage update failed:', err);
      showInspectorToast(err.message || 'Could not update booking status', 'error');
    } finally {
      setAdvancingStage(false);
    }
  };

  const handleAdvanceStage = () => handleSetStage(nextStatus);

  // ── Derived Data from Database & Notes ────────────────────────────────────
  const formattedDate = active.event_date
    ? new Date(active.event_date).toLocaleDateString('en-PH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : 'Date pending';

  const specs = active.customer?.studio_specs || {};
  const student = active.student_details || parseStudentDetailsFromNotes(active.notes) || {};
  const participant = active.participant_details || parseParticipantDetailsFromNotes(active.notes) || {};
  const isSomeoneElse = active.booking_for === 'someone_else' || participant.booking_for === 'someone_else' || /•\s*Booking\s*For:\s*Someone\s*Else/i.test(active.notes || '');

  const { school, campus } = cleanSchoolAndLocation(
    active.school || student.school || (!isSomeoneElse ? specs.university : ''),
    active.school_address || student.school_address || (!isSomeoneElse ? specs.campus : '')
  );

  const strand = active.track || student.course || (!isSomeoneElse ? (specs.degree || specs.course) : '') || '—';
  const studentId = active.student_id || student.student_id || (!isSomeoneElse ? specs.student_id : '') || '—';

  // Format section and batch cleanly without repeating "Batch"
  const rawBatch = (active.batch || student.batch || (!isSomeoneElse ? specs.gradYear : '') || '').replace(/^Batch\s*/i, '').trim();
  const rawSection = active.section || student.section || (!isSomeoneElse ? specs.section : '') || '';
  const sectionGrade = rawSection
    ? (rawBatch ? `Batch ${rawBatch} · ${rawSection}` : rawSection)
    : (rawBatch ? `Batch ${rawBatch}` : '—');

  const participantName = active.participant_name || participant.full_name || '';
  const accountOwnerName =
    `${active.customer?.first_name || ''} ${active.customer?.last_name || ''}`.trim() ||
    participant.account_owner_name ||
    (!isSomeoneElse ? participantName : '') ||
    'Unspecified Client';
  const email = (
    active.customer?.email ||
    participant.account_owner_email ||
    (!isSomeoneElse ? (active.participant_email || participant.email) : '') ||
    active.participant_email ||
    participant.email ||
    ''
  ).trim();
  const hasEmail = isReal(email);
  const phone = (
    active.customer?.phone ||
    (!isSomeoneElse ? (active.participant_phone || participant.phone) : '') ||
    active.participant_phone ||
    participant.phone ||
    ''
  ).trim();
  const hasPhone = isReal(phone);

  const initials =
    ((active.customer?.first_name?.[0] || '') + (active.customer?.last_name?.[0] || '')).toUpperCase() ||
    (accountOwnerName !== 'Unspecified Client' ? accountOwnerName.slice(0, 2).toUpperCase() : 'EK');

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
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 font-body animate-fade-in overflow-hidden overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-label={`Booking details for #${active.booking_number || active.id}`}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md cursor-pointer" onClick={onClose} aria-hidden="true" />

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
                {/* Service Title */}
                <h2 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-white leading-snug truncate">
                  {active.service?.name || 'Senior High Packages and Sets'}
                </h2>

                {/* Subtitle */}
                <p className="text-xs text-neutral-400 mt-0.5 truncate leading-tight">
                  <span>Booked by <strong className="text-white font-semibold">{accountOwnerName}</strong></span>
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Session Date Card */}
              <button
                type="button"
                onClick={goBooking}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer text-left group"
                title="Open booking record to schedule or edit"
              >
                <Calendar size={14} className="text-[#c9a96e] shrink-0" />
                <span className="flex flex-col gap-1">
                  <span className="block text-xs uppercase text-neutral-400 font-bold leading-none">
                    SESSION DATE
                  </span>
                  <span className="block text-xs font-semibold text-[#c9a96e] leading-none">
                    {formattedDate}
                  </span>
                </span>
                <ChevronRight size={13} className="text-neutral-400 group-hover:text-white transition-colors shrink-0 ml-0.5" />
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
        </header>

        {/* Toast if payment recorded / error */}
        {paymentToast && (
          <div
            role={paymentToast.type === 'error' ? 'alert' : 'status'}
            className={`shrink-0 flex items-center justify-between gap-3 border-b px-6 py-2 text-xs font-semibold ${
              paymentToast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 size={14} className={paymentToast.type === 'error' ? 'text-rose-600' : 'text-emerald-600'} aria-hidden="true" />
              {typeof paymentToast === 'string' ? paymentToast : paymentToast.message}
            </span>
            <button
              type="button"
              onClick={() => setPaymentToast(null)}
              aria-label="Dismiss notification"
              className="cursor-pointer"
            >
              <X size={13} aria-hidden="true" />
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
                  <Field label="ACCOUNT OWNER">{accountOwnerName}</Field>

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
                        {participantName || participant.full_name || 'Beneficiary'}
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
            </div>

            {/* Right Column (Approx 40%): Balance & Payment Actions */}
            <aside className="lg:col-span-5 space-y-3">

              {/* REMAINING BALANCE CARD (Obsidian Black) */}
              <div className="rounded-[20px] bg-[#0b0f17] text-white p-4.5 sm:p-5 shadow-xl border border-white/10">
                <div>
                  <p className="font-sans uppercase text-xs font-semibold text-neutral-400 leading-none">
                    REMAINING BALANCE
                  </p>
                  <p className="font-sans font-bold text-3xl sm:text-[32px] text-white tracking-tight mt-1 leading-none">
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
                    {needsDownpaymentConfirmation ? (
                      <>
                        <CheckCircle2 size={13} className="shrink-0" />
                        Confirm Downpayment
                      </>
                    ) : (
                      <>
                        <CreditCard size={13} className="shrink-0" />
                        Update records
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={goPayments}
                    title="Open Payments Dashboard"
                    className="h-9 px-3.5 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
                  >
                    Payments Dashboard <ArrowRight size={12} />
                  </button>
                </div>
              </div>

              {isNextStageBlocked && (
                <div className="rounded-xl border border-amber-300/70 bg-amber-50/90 px-3.5 py-2.5 flex items-start gap-2 text-xs text-amber-950">
                  <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    {needsAssignPhotographerCTA ? (
                      <>
                        Missing <strong>assigned photographer</strong> — assign one below to move to{' '}
                        <strong>{getStatusLabel(nextStatus)}</strong>.
                      </>
                    ) : (
                      <>
                        Stage progression paused: missing <strong>{missingForNext.join(' and ')}</strong> verification.
                      </>
                    )}
                  </span>
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* ── 3. FIXED FOOTER (Pure White) ─────────────────────────────────── */}
        <footer className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 sm:px-8 py-3 bg-white border-t border-[#ece6da]">
          <span className="text-[11px] text-neutral-400">{lastUpdated}</span>

          <div className="flex items-center gap-2 shrink-0">
            {needsAssignPhotographerCTA ? (
              <button
                type="button"
                onClick={() => setAssignModalOpen(true)}
                className="h-9 px-4 rounded-lg bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title={`Assign a photographer before moving to ${getStatusLabel(nextStatus)}`}
              >
                <Camera size={13} />
                <span>Assign Photographer</span>
              </button>
            ) : (
              nextStatus && (
                <button
                  type="button"
                  onClick={handleAdvanceStage}
                  disabled={advancingStage || isNextStageBlocked}
                  className="h-9 px-4 rounded-lg bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-45 disabled:cursor-not-allowed"
                  title={
                    isNextStageBlocked
                      ? `Verification required: missing ${missingForNext.join(' and ')}`
                      : `Advance order from ${getStatusLabel(currentStatusUpper)} to ${getStatusLabel(nextStatus)}`
                  }
                >
                  {advancingStage ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  <span>Move to {getStatusLabel(nextStatus)}</span>
                </button>
              )
            )}

            <button
              type="button"
              onClick={goBooking}
              className="h-9 px-4 rounded-lg border border-neutral-300 hover:border-neutral-400 bg-white text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Full Order <ArrowRight size={12} />
            </button>
          </div>
        </footer>
      </div>

      {/* ── CONFIRM DOWNPAYMENT / UPDATE PAYMENT RECORDS DIALOG ──────────── */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-fade-in">
          <form onSubmit={submitPayment} className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading text-lg font-bold text-neutral-900">
                  {needsDownpaymentConfirmation
                    ? 'Confirm Downpayment'
                    : hasPaymentConfirmed || isPaid || gatewayStatus.isFullyPaid
                      ? 'Notice'
                      : 'Update records'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {accountOwnerName} · #{active.booking_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center cursor-pointer"
                aria-label="Close payment dialog"
              >
                <X size={14} />
              </button>
            </div>

            {/* Payment Gateway Detection Status (only shown while awaiting payment confirmation) */}
            {!hasPaymentConfirmed && !isPaid && !gatewayStatus.isFullyPaid && (
              gatewayStatus.hasGatewayRecord ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="inline-flex items-center gap-2 font-bold text-sm sm:text-base text-emerald-950 leading-snug">
                      <CheckCircle2 size={17} className="text-emerald-600 shrink-0" aria-hidden="true" />
                      <span>
                        Payment detected ({gatewayStatus.channelLabel})
                      </span>
                    </div>
                    {gatewayStatus.accountNumber && (
                      <p className="text-xs font-medium text-emerald-900">
                        Account No: <span className="font-mono font-semibold">{gatewayStatus.accountNumber}</span>
                      </p>
                    )}
                    <p className="text-xs text-emerald-800/90 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {gatewayStatus.referenceNumber && (
                        <span className="font-mono font-semibold">Ref: {gatewayStatus.referenceNumber}</span>
                      )}
                      {gatewayStatus.referenceNumber && gatewayStatus.paidDateLabel && (
                        <span aria-hidden="true">·</span>
                      )}
                      {gatewayStatus.paidDateLabel && <span>Paid {gatewayStatus.paidDateLabel}</span>}
                    </p>
                  </div>

                  <div className="text-right shrink-0 pl-2 border-l border-emerald-200/80">
                    <p className="text-lg sm:text-xl font-bold text-emerald-950 tabular-nums leading-tight">
                      {peso(gatewayStatus.gatewayAmountPaid, 2)}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                      Amount paid
                    </p>
                  </div>
                </div>
              ) : downPayment > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 size={14} className="text-amber-700 shrink-0" aria-hidden="true" />
                    Recorded payment on file (manual / studio)
                  </span>
                  <span className="font-bold tabular-nums shrink-0">{peso(downPayment, 2)}</span>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 flex items-center gap-2">
                  <AlertCircle size={14} className="text-neutral-400 shrink-0" aria-hidden="true" />
                  <span>No payment gateway transaction detected for this booking yet.</span>
                </div>
              )
            )}

            {needsDownpaymentConfirmation ? (
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={confirmingDownpayment}
                  className="h-9 px-4 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmGatewayDownpayment}
                  disabled={confirmingDownpayment}
                  className="h-9 px-4 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {confirmingDownpayment ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Confirming…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      {remainingBal > 0 ? 'Confirm & Move Balance' : 'Confirm Payment'}
                    </>
                  )}
                </button>
              </div>
            ) : gatewayStatus.isFullyPaid || isPaid ? (
              <>
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 space-y-1">
                  <p className="text-xs font-bold text-emerald-950">Full payment recorded</p>
                  <p className="text-xs text-emerald-900/85 leading-relaxed">
                    This customer&apos;s balance is fully paid. Open the Payments Dashboard to review payment logs or receipts.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPaymentModalOpen(false)}
                    className="h-9 px-4 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentModalOpen(false);
                      goPayments();
                    }}
                    className="h-9 px-4 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    Go to Payments Dashboard <ArrowRight size={13} />
                  </button>
                </div>
              </>
            ) : hasPaymentConfirmed ? (
              <>
                <div className="rounded-2xl border border-[#e6decb] bg-[#faf7f0] p-4 space-y-1">
                  <p className="text-xs font-bold text-neutral-900">
                    Customer downpayment is recorded
                  </p>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    This customer&apos;s downpayment has already been confirmed and recorded. Go to the Payments Dashboard to update the remaining {peso(remainingBal, 2)} balance.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPaymentModalOpen(false)}
                    className="h-9 px-4 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentModalOpen(false);
                      goPayments();
                    }}
                    className="h-9 px-4 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    Go to Payments Dashboard <ArrowRight size={13} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold uppercase text-neutral-500">
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
                  <label className="text-xs font-semibold uppercase text-neutral-500">
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
                          className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors ${on
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
                  <label className="text-xs font-semibold uppercase text-neutral-500">
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
                        className={`h-9 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${paymentType === id
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
                  <label className="text-xs font-semibold uppercase text-neutral-500">
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
                        <Loader2 size={13} className="animate-spin" /> Updating…
                      </>
                    ) : (
                      <>
                        <Receipt size={13} /> Confirm Payment
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* ── ASSIGN PHOTOGRAPHER MODAL ────────────────────────────────────── */}
      <AssignPhotographerModal
        booking={active}
        changedById={profile?.id || null}
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        zIndexClass="z-[10003]"
        onAssigned={async (_b, chosenName, selectedId) => {
          setDetailedBooking((prev) => ({
            ...(prev || booking),
            status: 'PHOTOGRAPHER_ASSIGNED',
            photographer_id: selectedId,
            photographer: {
              ...(prev?.photographer || booking?.photographer || {}),
              id: selectedId,
              first_name: chosenName.split(' ')[0] || chosenName,
              last_name: chosenName.split(' ').slice(1).join(' ') || '',
            },
          }));
          showInspectorToast(`${chosenName} assigned to #${active.booking_number}`);
          await refreshDetail();
          if (onStatusUpdated) onStatusUpdated(active.id, 'PHOTOGRAPHER_ASSIGNED');
        }}
        onError={(errMsg) => showInspectorToast(errMsg || 'Failed to assign photographer.', 'error')}
      />
    </div>,
    document.body
  );
}

BookingQuickInspector.propTypes = {
  booking: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onStatusUpdated: PropTypes.func,
  initialOpenPayment: PropTypes.bool,
  onRestore: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};