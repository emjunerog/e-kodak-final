import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X, Mail, MapPin, Calendar, Clock, CreditCard, ExternalLink,
  Check, Copy, GraduationCap, Camera, Package, ChevronRight, ArrowRight, User,
  Loader2, Banknote, Wallet, Receipt, Building, CheckCircle2, FolderPlus, Sparkles, Send,
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
  getPhotographersWithWorkloadAndAvailability,
  assignPhotographerToBooking,
} from '../../services/bookingAdminService';
import { uploadAdminPhotoOutput } from '../../services/adminService';
import { createTransferLog, getTransfersByBooking } from '../../services/workstationService';
import { getStatusLabel } from '../../lib/bookingUtils';
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

  // Inline Quick-Operations State (Photographer, Stage Advance, Soft Copy Link)
  const [advancingStage, setAdvancingStage] = useState(false);
  const [showPhotographerPicker, setShowPhotographerPicker] = useState(false);
  const [photographers, setPhotographers] = useState([]);
  const [loadingPhotographers, setLoadingPhotographers] = useState(false);
  const [selectedPhotographerId, setSelectedPhotographerId] = useState('');
  const [assigningPhotographer, setAssigningPhotographer] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [attachingDrive, setAttachingDrive] = useState(false);
  const [handoffTarget, setHandoffTarget] = useState('photographer');
  const [handoffNote, setHandoffNote] = useState('');
  const [sendingHandoff, setSendingHandoff] = useState(false);
  const [transfers, setTransfers] = useState([]);

  // Fetch full live database details on modal open
  const refreshDetail = () => {
    if (!booking?.id) return;
    getBookingDetail(booking.id)
      .then(({ data, error }) => {
        if (data && !error) {
          setDetailedBooking(data);
          if (data.photographer?.id || data.photographer_id) {
            setSelectedPhotographerId(data.photographer?.id || data.photographer_id);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load full booking details:', err);
      });
    getTransfersByBooking(booking.id)
      .then(({ data }) => {
        if (data) setTransfers(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!booking?.id || !isOpen) return;
    setShowPhotographerPicker(false);
    setDriveUrlInput('');
    refreshDetail();
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
        }).catch(() => { });
      }

      setPaymentToast(`${peso(amt)} recorded successfully`);
      setTimeout(() => setPaymentToast(''), 4000);
      setPaymentModalOpen(false);
      refreshDetail();
      if (onStatusUpdated) onStatusUpdated(active.id, active.status);
    } catch (err) {
      console.error('Failed to record payment:', err);
      alert(err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // ── 1-Click Stage Advance & Direct Stepper Jump Handlers ─────────────────
  const currentStatusUpper = String(active.status || 'PENDING').toUpperCase();
  const nextStatus = NEXT_STATUS_MAP[currentStatusUpper] || null;

  const handleSetStage = async (targetStatus) => {
    if (!targetStatus || targetStatus === currentStatusUpper || advancingStage) return;
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
      setPaymentToast(`Moved to ${getStatusLabel(targetStatus)}`);
      setTimeout(() => setPaymentToast(''), 4000);
      if (onStatusUpdated) onStatusUpdated(active.id, targetStatus);
    } catch (err) {
      console.error('Stage update failed:', err);
      alert(err.message || 'Could not update booking status');
    } finally {
      setAdvancingStage(false);
    }
  };

  const handleAdvanceStage = () => handleSetStage(nextStatus);

  // ── Send to Team Handler ─────────────────────────────────────────────────
  const handleSendWorkstationHandoff = async (e) => {
    e.preventDefault();
    if (sendingHandoff) return;
    setSendingHandoff(true);
    const deptLabels = {
      photographer: 'Photographer',
      editing: 'Editor',
      print_lab: 'Printing',
    };
    const targetRoleMap = {
      photographer: 'photographer',
      editing: 'admin',
      print_lab: 'admin',
    };
    const statusForDept = {
      photographer: 'PHOTOGRAPHER_ASSIGNED',
      editing: 'EDITING',
      print_lab: 'PRINTING',
    };
    try {
      const label = deptLabels[handoffTarget] || 'Team';
      await createTransferLog({
        bookingId: active.id,
        senderId: profile?.id || null,
        senderRole: profile?.role || 'admin',
        targetRole: targetRoleMap[handoffTarget] || 'admin',
        transferType: 'ORDER_HANDOFF',
        priority: 'NORMAL',
        title: `Sent to ${label} (#${active.booking_number})`,
        message: handoffNote.trim() || `Booking #${active.booking_number} sent to ${label}.`,
        payload: { department: handoffTarget, booking_number: active.booking_number },
      });

      const mappedStatus = statusForDept[handoffTarget];
      if (mappedStatus && mappedStatus !== currentStatusUpper) {
        await updateBookingStatus(
          active.id,
          mappedStatus,
          `Sent to ${label}${handoffNote.trim() ? `: ${handoffNote.trim()}` : ''}`,
          profile?.id || null
        );
        setDetailedBooking((prev) => ({ ...(prev || active), status: mappedStatus, updated_at: new Date().toISOString() }));
        if (onStatusUpdated) onStatusUpdated(active.id, mappedStatus);
      }

      setHandoffNote('');
      setPaymentToast(`Sent to ${label}`);
      setTimeout(() => setPaymentToast(''), 4000);
      refreshDetail();
    } catch (err) {
      console.error('Workstation handoff error:', err);
    } finally {
      setSendingHandoff(false);
    }
  };

  // ── Inline Photographer Assignment Handler ───────────────────────────────
  const handleTogglePhotographerPicker = async () => {
    const nextOpen = !showPhotographerPicker;
    setShowPhotographerPicker(nextOpen);
    if (nextOpen && photographers.length === 0) {
      setLoadingPhotographers(true);
      const { data } = await getPhotographersWithWorkloadAndAvailability(active.event_date, active.preferred_time);
      setPhotographers(data || []);
      if (!selectedPhotographerId && (active.photographer?.id || active.photographer_id)) {
        setSelectedPhotographerId(active.photographer?.id || active.photographer_id);
      } else if (!selectedPhotographerId && data?.length > 0) {
        setSelectedPhotographerId(data[0].id);
      }
      setLoadingPhotographers(false);
    }
  };

  const handleAssignPhotographerInline = async () => {
    if (!selectedPhotographerId || assigningPhotographer) return;
    const chosen = photographers.find((p) => p.id === selectedPhotographerId);
    const chosenName = chosen ? `${chosen.first_name || ''} ${chosen.last_name || ''}`.trim() : 'Studio Photographer';
    setAssigningPhotographer(true);
    try {
      const { error } = await assignPhotographerToBooking({
        bookingId: active.id,
        photographerId: selectedPhotographerId,
        photographerName: chosenName,
        changedById: profile?.id || null,
        customerId: active.customer?.id || active.customer_id || null,
        bookingNumber: active.booking_number,
        eventDate: active.event_date,
      });
      if (error) throw error;
      setShowPhotographerPicker(false);
      setPaymentToast(`Assigned ${chosenName} to #${active.booking_number}`);
      setTimeout(() => setPaymentToast(''), 4000);
      refreshDetail();
      if (onStatusUpdated) onStatusUpdated(active.id, 'PHOTOGRAPHER_ASSIGNED');
    } catch (err) {
      console.error('Photographer assign error:', err);
      alert(err.message || 'Failed to assign photographer');
    } finally {
      setAssigningPhotographer(false);
    }
  };

  // ── Inline Google Drive Soft-Copy Quick Attach ───────────────────────────
  const handleAttachDriveLink = async (e) => {
    e.preventDefault();
    const cleanUrl = driveUrlInput.trim();
    if (!cleanUrl || attachingDrive) return;
    setAttachingDrive(true);
    try {
      const { error } = await uploadAdminPhotoOutput({
        bookingId: active.id,
        deliverableType: 'Soft Copies (Google Drive Folder)',
        filePathOrUrl: cleanUrl,
        isGoogleDrive: true,
        uploadedBy: profile?.id || null,
      });
      if (error) throw error;

      if (active.customer?.id || active.customer_id) {
        createNotification({
          userId: active.customer?.id || active.customer_id,
          bookingId: active.id,
          title: `Digital Soft Copies Released (#${active.booking_number})`,
          message: `Your edited digital photos and Google Drive folder for #${active.booking_number} are now available in your Soft Copies gallery!`,
          notificationType: 'photos_released',
        }).catch(() => { });
      }

      setDriveUrlInput('');
      setPaymentToast('Google Drive soft-copy folder linked & released to client');
      setTimeout(() => setPaymentToast(''), 4000);
      refreshDetail();
      if (onStatusUpdated) onStatusUpdated(active.id, active.status);
    } catch (err) {
      console.error('Attach drive link error:', err);
      alert(err.message || 'Failed to attach Google Drive link');
    } finally {
      setAttachingDrive(false);
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
  const isSomeoneElse = active.booking_for === 'someone_else' || participant.booking_for === 'someone_else' || /•\s*Booking\s*For:\s*Someone\s*Else/i.test(active.notes || '');

  const { school, campus, venueAddress, mapUrl } = cleanSchoolAndLocation(
    active.school || student.school || (!isSomeoneElse ? specs.university : ''),
    active.school_address || student.school_address || (!isSomeoneElse ? specs.campus : ''),
    active.location
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
  const fullName = isSomeoneElse && participantName
    ? participantName
    : `${active.customer?.first_name || ''} ${active.customer?.last_name || ''}`.trim() ||
      participantName ||
      'Unspecified Client';
  const email = (isSomeoneElse ? (active.participant_email || participant.email || active.customer?.email) : (active.customer?.email || participant.email || '') || '').trim();
  const hasEmail = isReal(email);
  const phone = (isSomeoneElse ? (active.participant_phone || participant.phone || active.customer?.phone) : (active.customer?.phone || participant.phone || '') || '').trim();
  const hasPhone = isReal(phone);

  const initials =
    ((active.customer?.first_name?.[0] || '') + (active.customer?.last_name?.[0] || '')).toUpperCase() ||
    (fullName !== 'Unspecified Client' ? fullName.slice(0, 2).toUpperCase() : 'EK');

  const photographerName = active.photographer
    ? `${active.photographer.first_name || active.photographer.profile?.first_name || ''} ${active.photographer.last_name || active.photographer.profile?.last_name || ''
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
      onClick: () => handleSetStage('PENDING'),
    },
    {
      id: 'approved',
      title: 'Approved',
      sub: isApproved ? (shortDate(active.updated_at) || 'Approved') : 'Click to approve',
      state: isApproved ? 'done' : 'pending',
      onClick: () => handleSetStage('CONFIRMED'),
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
      sub: shootDone ? 'Done' : shootActive ? 'In progress' : 'Start shoot',
      state: shootDone ? 'done' : shootActive ? 'current' : 'pending',
      onClick: () => handleSetStage('CAPTURE'),
    },
    {
      id: 'editing',
      title: 'Editing',
      sub: editDone ? 'Done' : editActive ? 'In progress' : 'Move to edit',
      state: editDone ? 'done' : editActive ? 'current' : 'pending',
      onClick: () => handleSetStage('EDITING'),
    },
    {
      id: 'pickup',
      title: 'Pickup',
      sub: completed ? 'Claimed' : ready ? 'Ready' : 'Mark ready',
      state: completed ? 'done' : ready ? 'current' : 'pending',
      onClick: () => handleSetStage('READY'),
    },
    {
      id: 'completed',
      title: 'Completed',
      sub: completed ? 'Fulfilled' : 'Complete',
      state: completed ? 'done' : 'pending',
      onClick: () => handleSetStage('COMPLETED'),
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
                    className={`relative flex flex-col items-center text-center px-1 ${s.onClick ? 'cursor-pointer group' : ''
                      }`}
                  >
                    {/* Connecting Line */}
                    {i < stages.length - 1 && (
                      <span
                        className={`absolute top-[8px] left-[calc(50%+10px)] right-[calc(-50%+10px)] h-[1px] ${isLineActive ? 'bg-teal-400' : 'bg-neutral-700/60'
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
                      className={`mt-1.5 text-xs leading-tight ${isCurrent
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
                      className={`text-[11.5px] mt-0.5 leading-tight ${isCurrent
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
                      onClick={handleTogglePhotographerPicker}
                      className="text-xs font-medium text-[#c9a96e] hover:text-[#b89555] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {photographerName ? 'Change photographer' : 'Assign photographer'} <ArrowRight size={12} />
                    </button>
                  }
                >
                  SESSION LOGISTICS
                </SectionTitle>

                {showPhotographerPicker && (
                  <div className="mb-4 p-3 rounded-xl bg-white border border-[#c9a96e]/40 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">
                        Select Studio Photographer
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPhotographerPicker(false)}
                        className="text-neutral-400 hover:text-neutral-700 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    {loadingPhotographers ? (
                      <div className="flex items-center gap-2 text-xs text-neutral-500 py-1">
                        <Loader2 size={13} className="animate-spin text-[#c9a96e]" /> Loading available roster…
                      </div>
                    ) : photographers.length === 0 ? (
                      <div className="flex items-center justify-between text-xs text-neutral-500 py-1">
                        <span>No registered photographers found in roster.</span>
                        <button
                          type="button"
                          onClick={goBooking}
                          className="text-[#a8843a] font-semibold underline cursor-pointer"
                        >
                          Manage in Full Order
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedPhotographerId}
                          onChange={(e) => setSelectedPhotographerId(e.target.value)}
                          className="flex-1 h-9 px-3 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-900 bg-neutral-50 focus:bg-white focus:border-[#c9a96e] outline-none"
                        >
                          {photographers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.first_name} {p.last_name} — {p.specialization || 'Photographer'} ({p.activeWorkloadCount || 0} active)
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAssignPhotographerInline}
                          disabled={assigningPhotographer || !selectedPhotographerId}
                          className="h-9 px-3.5 rounded-lg bg-[#0b0f17] hover:bg-neutral-800 text-[#c9a96e] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {assigningPhotographer ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Assign
                        </button>
                      </div>
                    )}
                  </div>
                )}

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
                    <CreditCard size={13} className="shrink-0" />
                    {remainingBal > 0 ? `Settle Balance (${peso(remainingBal)})` : 'Record Payment'}
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

              {/* 1B. SOFT COPIES (GOOGLE DRIVE) CARD */}
              <div className="rounded-[20px] bg-white border border-[#ece6da] p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FolderPlus size={13} className="text-[#c9a96e]" />
                    <h3 className="font-heading uppercase tracking-[0.16em] text-xs font-bold text-neutral-800">
                      SOFT COPIES (GOOGLE DRIVE)
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-neutral-500">
                    {(active.photo_outputs || []).length} saved
                  </span>
                </div>

                {(active.photo_outputs || []).length > 0 && (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {(active.photo_outputs || []).slice(0, 3).map((out) => (
                      <div
                        key={out.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#faf8f5] border border-[#ece6da] text-xs"
                      >
                        <span className="truncate font-medium text-neutral-700">{out.file_name}</span>
                        {out.file_path?.startsWith('http') && (
                          <a
                            href={out.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#a8843a] hover:underline font-semibold flex items-center gap-1 shrink-0"
                          >
                            Open <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAttachDriveLink} className="flex items-center gap-1.5">
                  <input
                    type="url"
                    value={driveUrlInput}
                    onChange={(e) => setDriveUrlInput(e.target.value)}
                    placeholder="Paste Google Drive link here…"
                    className="flex-1 h-8 px-2.5 rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-[#c9a96e] text-xs outline-none"
                  />
                  <button
                    type="submit"
                    disabled={attachingDrive || !driveUrlInput.trim()}
                    className="h-8 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    {attachingDrive ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} className="text-[#c9a96e]" />}
                    Save Link
                  </button>
                </form>
              </div>

              {/* 1C. SEND TO TEAM CARD */}
              <div className="rounded-[20px] bg-white border border-[#ece6da] p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Send size={12} className="text-[#c9a96e]" />
                    <h3 className="font-heading uppercase tracking-[0.16em] text-xs font-bold text-neutral-800">
                      SEND TO TEAM
                    </h3>
                  </div>
                  {transfers.length > 0 && (
                    <span className="text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                      {transfers[transfers.length - 1]?.title?.replace(/\s*\(#.*\)/, '')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'photographer', label: 'Photographer' },
                    { id: 'editing', label: 'Editor' },
                    { id: 'print_lab', label: 'Printing' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setHandoffTarget(d.id)}
                      className={`h-7 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                        handoffTarget === d.id
                          ? 'bg-neutral-900 text-[#c9a96e] border-neutral-900'
                          : 'bg-[#faf8f5] text-neutral-600 border-[#ece6da] hover:text-neutral-900'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSendWorkstationHandoff} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={handoffNote}
                    onChange={(e) => setHandoffNote(e.target.value)}
                    placeholder="Add a note for the team…"
                    className="flex-1 h-8 px-2.5 rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-[#c9a96e] text-xs outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingHandoff}
                    className="h-8 px-3 rounded-lg bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    {sendingHandoff ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
                    Send
                  </button>
                </form>
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
        <footer className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 sm:px-8 py-3 bg-white border-t border-[#ece6da]">
          <span className="text-[11px] text-neutral-400">{lastUpdated}</span>

          <div className="flex items-center gap-2 shrink-0">
            {nextStatus && (
              <button
                type="button"
                onClick={handleAdvanceStage}
                disabled={advancingStage}
                className="h-9 px-4 rounded-lg bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title={`Advance order from ${getStatusLabel(currentStatusUpper)} to ${getStatusLabel(nextStatus)}`}
              >
                {advancingStage ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                <span>Move to {getStatusLabel(nextStatus)}</span>
              </button>
            )}

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