/**
 * AdminBookingDetail.jsx
 * ======================
 * Comprehensive Studio Master Record & Full Document Overview (/admin/bookings/:id)
 *
 * Sections:
 *  1. Master Document Header & Quick Actions (Print Sheet, Refresh, Stage Advancement)
 *  2. Session Vitals Quick Strip (Schedule, Studio Location, Financial Clearance, Photographer)
 *  3. Customer & Contact Information (Name, phone, address, emergency contact)
 *  4. Student & Academic Details (School, campus, degree, student ID, section, honors, regalia sizing)
 *  5. Session Logistics & Creative Specifications (Date/time, venue, cleaned notes, styling, pegs lightbox)
 *  6. Service Package & Financial Settlement (Tier, itemized add-ons, balance sheet, payments ledger)
 *  7. Studio Operations & Workstation Custody (Departmental pipeline, assigned photographer, handoff logs)
 *  8. Studio Fulfillment & Legal Compliance (Pickup/delivery, recipient, model release, signature audit)
 *  9. Booking Pass & Status History (QR pass, chronological audit timeline)
 *
 * Sizing & Typography:
 *  • Sized generously to seamlessly adapt the current scale, padding, and font of all admin dashboards.
 *  • Uses max-w-screen-2xl container, font-heading text-lg/xl headings, text-sm body/labels, and robust cards.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, XCircle,
  Calendar, Clock, MapPin, FileText, User, Camera, CreditCard,
  Image as ImageIcon, History, ChevronRight, Loader2, ExternalLink, Tag, Plus,
  UserCheck, Briefcase, AlertTriangle, ShieldAlert, QrCode, GraduationCap, Phone, Mail,
  Trash2, Truck, Scissors, Award, Sparkles, ShieldCheck, Layers, FileCheck, Check,
  ArrowRightLeft, Send, ArrowRight, Printer, Copy, Maximize2, Building2, BookOpen, Archive, RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, PaymentBadge } from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import {
  getTransfersByBooking,
  createTransferLog,
  TRANSFER_TYPES,
  PRIORITY_CONFIG
} from '../../services/workstationService';
import QRPass from '../../components/booking/QRPass';
import { getQRCodePublicUrl, generateAndStoreQRCode } from '../../services/qrService';
import {
  getBookingDetail,
  updateBookingStatus,
  getStorageUrl,
  NEXT_STATUS_MAP,
  recordPayment,
  createNotification,
  getPhotographersWithWorkloadAndAvailability,
  assignPhotographerToBooking,
  reassignPhotographer,
  unassignPhotographer,
  deleteBookingPermanently,
  softDeleteBooking,
  restoreBooking,
} from '../../services/bookingAdminService';
import {
  getPhotoOutputs,
  confirmSamplesAndForwardToStaff,
  returnSamplesToPhotographer,
  getRequiredSetsForBooking,
  extractSetName,
  getCleanFileName
} from '../../services/photographerService';

// ── Human-Readable Studio Labels ─────────────────────────────────────────────
const BACKDROP_LABELS = {
  classic_grey: 'Classic Studio Grey',
  pure_white: 'Clean Editorial White',
  warm_cream: 'Warm Ivory Cream',
  studio_canvas: 'Textured Academic Canvas',
  midnight_navy: 'Formal Midnight Navy'
};

const RETOUCH_LABELS = {
  natural_texture: 'Natural Texture & Subtle Polish',
  glamour_glow: 'Radiant Glow & Skin Softening',
  editorial_clean: 'High-Fashion Editorial Finish'
};

const HOOD_LABELS = {
  it_cs: 'Computer Science & Information Tech (Gold/Orange)',
  business: 'Business, Accountancy & Management (Drab/Brown)',
  education: 'Education & Pedagogy (Light Blue)',
  engineering: 'Engineering & Architecture (Orange)',
  arts_sciences: 'Liberal Arts & Social Sciences (White)',
  nursing_health: 'Nursing & Allied Health (Apricot/Green)',
  criminology: 'Criminology & Law Enforcement (Purple)',
  hospitality: 'Hospitality & Tourism Management (Golden Yellow)'
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(dateStr, opts = {}) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', ...opts,
  });
}

function fmtDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function currency(val) {
  if (val === null || val === undefined || isNaN(val)) return '₱0.00';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', minimumFractionDigits: 2,
  }).format(Number(val));
}

function getCleanClientNotes(notes) {
  if (!notes) return '';
  return notes
    .replace(/\[(?:STUDENT & YEARBOOK DETAILS|SELECTED ADD-ONS|SYSTEM METADATA)\][\s\S]*?(?=(\n\n\[|$))/gi, '')
    .trim();
}

// ── Standardized Section Card Wrapper (Adapted to Admin Dashboard Scale) ──────
function SectionCard({ icon: Icon, title, subtitle, action, children, className = '', headerClassName = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden print:border-neutral-300 print:shadow-none ${className}`}>
      <div className={`flex items-center justify-between px-6 py-4 sm:py-5 border-b border-neutral-100 bg-neutral-50/60 print:bg-white print:border-neutral-300 ${headerClassName}`}>
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-gold flex items-center justify-center shrink-0 shadow-xs print:border print:border-neutral-300">
            <Icon size={18} />
          </div>
          <div>
            <h2 className="font-heading text-base sm:text-lg font-bold text-neutral-900 leading-tight">{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm text-neutral-500 font-body print:hidden mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="print:hidden">{action}</div>}
      </div>
      <div className="p-6 sm:p-7">{children}</div>
    </div>
  );
}

// ── Detail Key-Value Row (Larger text-sm scale) ────────────────────────────────
function DetailRow({ label, value, mono = false, className = '' }) {
  return (
    <div className={`flex justify-between items-center gap-4 py-3 border-b border-neutral-100/80 last:border-0 text-sm font-body ${className}`}>
      <span className="text-neutral-500 font-medium shrink-0">{label}</span>
      <span className={`text-neutral-900 text-right ${mono ? 'font-mono' : 'font-semibold'}`}>
        {value || <span className="text-neutral-300 font-normal">—</span>}
      </span>
    </div>
  );
}

// ── Toast Alert ────────────────────────────────────────────────────────────────
function Toast({ type, message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const isSuccess = type === 'success';
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold print:hidden animate-fade-in ${isSuccess ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}>
      {isSuccess ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      {message}
    </div>
  );
}

// ── Reference Image Item (Larger 96x96 preview) ────────────────────────────────
function RefImage({ filePath, onPreview }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    getStorageUrl(filePath).then(({ url, error }) => {
      if (error) setErr(true);
      else setUrl(url);
    });
  }, [filePath]);

  if (err) return (
    <div className="w-24 h-24 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-300 border border-neutral-200">
      <ImageIcon size={22} />
    </div>
  );
  if (!url) return (
    <div className="w-24 h-24 rounded-2xl bg-neutral-100 animate-pulse border border-neutral-200" />
  );
  return (
    <div className="relative group cursor-pointer" onClick={() => onPreview?.(url)}>
      <img
        src={url}
        alt={filePath}
        className="w-24 h-24 object-cover rounded-2xl border border-neutral-200 group-hover:border-gold group-hover:scale-105 transition-all shadow-xs"
      />
      <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
        <Maximize2 size={18} />
      </div>
    </div>
  );
}

// ── Status History Entry ───────────────────────────────────────────────────────
function HistoryItem({ entry, isLast }) {
  const changer = entry.changed_by_profile;
  const name = changer ? `${changer.first_name} ${changer.last_name}` : 'Studio Admin / System';
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-gold mt-1.5 shrink-0 ring-4 ring-gold/20" />
        {!isLast && <div className="w-px flex-1 bg-neutral-200 my-1.5" />}
      </div>
      <div className={`pb-5 flex-1 ${isLast ? '' : ''}`}>
        <div className="flex items-center gap-2.5 flex-wrap">
          <StatusBadge status={entry.status} />
          <span className="text-xs font-mono text-neutral-400">{fmtDateTime(entry.created_at)}</span>
        </div>
        <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 font-body">Recorded by: <strong className="text-neutral-900 font-semibold">{name}</strong></p>
        {entry.remarks && (
          <p className="text-xs sm:text-sm text-neutral-700 mt-1.5 italic bg-neutral-50 px-3.5 py-2.5 rounded-xl border border-neutral-100 font-body leading-relaxed">
            "{entry.remarks}"
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const [copiedRef, setCopiedRef] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const showToast = (type, message) => setToast({ type, message });

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedRef(label);
    showToast('success', `Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Departmental Transfers State
  const [transfers, setTransfers] = useState([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [tfTargetRole, setTfTargetRole] = useState('photographer');
  const [tfType, setTfType] = useState('ORDER_HANDOFF');
  const [tfPriority, setTfPriority] = useState('NORMAL');
  const [tfTitle, setTfTitle] = useState('');
  const [tfMessage, setTfMessage] = useState('');
  const [tfSubmitting, setTfSubmitting] = useState(false);

  // Photo Samples & Review State
  const [photoOutputs, setPhotoOutputs] = useState([]);
  const [activePhotoSetFilter, setActivePhotoSetFilter] = useState('ALL');
  const [confirmForwardModalOpen, setConfirmForwardModalOpen] = useState(false);
  const [forwardNotes, setForwardNotes] = useState('');
  const [forwardSubmitting, setForwardSubmitting] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);

  // Load booking, transfers, and photo outputs
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [bRes, tfRes, poRes] = await Promise.all([
      getBookingDetail(id),
      getTransfersByBooking(id),
      getPhotoOutputs(id)
    ]);
    if (bRes.error) {
      if (bRes.error.code === 'PGRST116') setError('Booking not found.');
      else setError('Failed to load booking details. Please try again.');
    } else {
      setBooking(bRes.data);
      setTransfers(tfRes.data || []);
      setPhotoOutputs(poRes.data || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Admin Review Handlers
  const handleConfirmAndForwardToStaff = async () => {
    setForwardSubmitting(true);
    const { error } = await confirmSamplesAndForwardToStaff({
      bookingId: id,
      adminId: user?.id || profile?.id,
      adminName: `${profile?.first_name || 'Admin'} ${profile?.last_name || ''}`.trim(),
      bookingNumber: booking?.booking_number,
      photoCount: photoOutputs.length,
      notes: forwardNotes.trim()
    });
    setForwardSubmitting(false);
    if (error) {
      showToast('error', 'Failed to confirm samples: ' + error.message);
    } else {
      showToast('success', 'Samples confirmed! Forwarded to staff for finalization.');
      setConfirmForwardModalOpen(false);
      setForwardNotes('');
      await load();
    }
  };

  const handleReturnToPhotographer = async () => {
    if (!revisionNotes.trim()) {
      showToast('error', 'Please specify revision details for the photographer.');
      return;
    }
    setRevisionSubmitting(true);
    const { error } = await returnSamplesToPhotographer({
      bookingId: id,
      adminId: user?.id || profile?.id,
      adminName: `${profile?.first_name || 'Admin'} ${profile?.last_name || ''}`.trim(),
      bookingNumber: booking?.booking_number,
      notes: revisionNotes.trim()
    });
    setRevisionSubmitting(false);
    if (error) {
      showToast('error', 'Failed to send revision request: ' + error.message);
    } else {
      showToast('success', 'Revision request sent to photographer.');
      setRevisionModalOpen(false);
      setRevisionNotes('');
      await load();
    }
  };

  // Handoff Handlers
  const handleOpenTransferModal = (target = 'photographer', type = 'ORDER_HANDOFF', defaultTitle = '', defaultMsg = '') => {
    setTfTargetRole(target);
    setTfType(type);
    setTfPriority(type === 'ISSUE_ESCALATION' ? 'HIGH' : 'NORMAL');
    setTfTitle(defaultTitle || `Handoff for #${booking?.booking_number || 'Order'}`);
    setTfMessage(defaultMsg);
    setTransferModalOpen(true);
  };

  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!tfTitle.trim() || !tfMessage.trim()) return;
    setTfSubmitting(true);
    const { error } = await createTransferLog({
      bookingId: id,
      senderId: user?.id || profile?.id,
      senderRole: profile?.role || 'staff',
      targetRole: tfTargetRole,
      transferType: tfType,
      priority: tfPriority,
      title: tfTitle,
      message: tfMessage,
      payload: {
        booking_number: booking?.booking_number,
        customer_name: `${booking?.customer?.first_name || ''} ${booking?.customer?.last_name || ''}`.trim()
      }
    });
    setTfSubmitting(false);
    if (error) {
      showToast('error', 'Failed to dispatch transfer: ' + error.message);
    } else {
      showToast('success', `Departmental handoff dispatched to ${tfTargetRole.toUpperCase()}!`);
      setTransferModalOpen(false);
      const { data: updatedTf } = await getTransfersByBooking(id);
      setTransfers(updatedTf || []);
    }
  };

  // Payment State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_type: 'DOWN_PAYMENT',
    payment_method: 'CASH',
    reference_number: '',
    notes: '',
  });

  // Photographer Assignment State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [loadingPhotographers, setLoadingPhotographers] = useState(false);
  const [eligiblePhotographers, setEligiblePhotographers] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [assignmentRemarks, setAssignmentRemarks] = useState('');
  const [assignConfirmOpen, setAssignConfirmOpen] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Deletion & Trash State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [softDeleteModalOpen, setSoftDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Cancelled / Removed by studio admin');
  const [deleting, setDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleSoftDeleteBooking = async () => {
    setDeleting(true);
    const { success, error } = await softDeleteBooking({
      bookingId: booking.id,
      deletedById: profile?.id,
      deletedByName: `${profile?.first_name || ''} ${profile?.last_name || 'Staff'}`.trim(),
      reason: deleteReason || 'Moved to Trash by Admin'
    });
    setDeleting(false);
    if (!success || error) {
      showToast('error', `Failed to move booking to trash: ${error?.message || 'Unknown error'}`);
    } else {
      setSoftDeleteModalOpen(false);
      navigate('/admin/bookings', {
        state: { flashMessage: `Booking #${booking.booking_number} moved to Trash. Client has been notified.` }
      });
    }
  };

  const handleRestoreBooking = async () => {
    setIsRestoring(true);
    const { success, error } = await restoreBooking({
      bookingId: booking.id,
      restoredById: profile?.id,
      restoredByName: `${profile?.first_name || ''} ${profile?.last_name || 'Staff'}`.trim(),
    });
    setIsRestoring(false);
    if (!success || error) {
      showToast('error', `Failed to restore booking: ${error?.message || 'Unknown error'}`);
    } else {
      showToast('success', `Booking #${booking.booking_number} restored to active queue! Client notified.`);
      const { data } = await getBookingDetail(id);
      if (data) setBooking(data);
    }
  };

  const handleDeleteBooking = async () => {
    setDeleting(true);
    const { success, error } = await deleteBookingPermanently({
      bookingId: booking.id,
      deletedById: profile?.id,
      deletedByName: `${profile?.first_name || ''} ${profile?.last_name || 'Staff'}`.trim(),
      reason: deleteReason || 'Admin deletion request'
    });
    setDeleting(false);
    if (!success || error) {
      showToast('error', `Failed to delete booking: ${error?.message || 'Unknown error'}`);
    } else {
      setDeleteModalOpen(false);
      navigate('/admin/bookings', {
        state: { flashMessage: `Booking #${booking.booking_number} was permanently removed from active records.` }
      });
    }
  };

  // Status Lifecycle Updater
  const doStatusUpdate = async (newStatus, remarks = '') => {
    setActing(true);
    const { error: err } = await updateBookingStatus(id, newStatus, remarks, profile?.id);
    if (err) {
      setActing(false);
      showToast('error', `Failed to update status: ${err.message || 'Unknown error'}`);
    } else {
      if (booking?.customer_id) {
        let msg = `Your booking #${booking.booking_number} status has been updated to ${newStatus}.`;
        if (newStatus === 'CONFIRMED') msg = `Your booking #${booking.booking_number} has been confirmed by our studio team!`;
        if (newStatus === 'READY') msg = `Your photos for booking #${booking.booking_number} are ready for claiming!`;
        if (newStatus === 'COMPLETED') msg = `Booking #${booking.booking_number} has been marked as completed. Thank you!`;
        if (newStatus === 'REJECTED') msg = `Booking #${booking.booking_number} was rejected. ${remarks ? `Reason: ${remarks}` : ''}`;

        await createNotification({
          userId: booking.customer_id,
          bookingId: booking.id,
          title: `Booking ${newStatus}`,
          message: msg,
          notificationType: newStatus === 'CONFIRMED' ? 'booking_confirmed' : 'booking_status',
        });
      }
      setActing(false);
      showToast('success', `Booking updated to ${newStatus}.`);
      await load();
    }
  };

  // Record Payment
  const openRecordPayment = () => {
    const defAmount = (booking?.payment_status === 'UNPAID' && Number(booking?.down_payment_amount) > 0)
      ? booking.down_payment_amount
      : (booking?.remaining_balance > 0 ? booking.remaining_balance : '');
    const defType = booking?.payment_status === 'UNPAID' ? 'DOWN_PAYMENT' : 'FINAL_PAYMENT';
    setPaymentForm({
      amount: defAmount,
      payment_type: defType,
      payment_method: 'CASH',
      reference_number: '',
      notes: '',
    });
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      showToast('error', 'Please enter a valid payment amount.');
      return;
    }
    setPaymentSubmitting(true);
    const { error: err } = await recordPayment({
      bookingId: booking.id,
      amount: paymentForm.amount,
      paymentType: paymentForm.payment_type,
      paymentMethod: paymentForm.payment_method,
      referenceNumber: paymentForm.reference_number,
      notes: paymentForm.notes,
      recordedBy: profile?.id,
    });
    if (err) {
      setPaymentSubmitting(false);
      showToast('error', `Failed to record payment: ${err.message || 'Unknown error'}`);
    } else {
      if (booking?.customer_id) {
        await createNotification({
          userId: booking.customer_id,
          bookingId: booking.id,
          title: 'Payment Recorded',
          message: `A payment of ₱${Number(paymentForm.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} was recorded for booking #${booking.booking_number}.`,
          notificationType: 'payment_recorded',
        });
      }
      setPaymentSubmitting(false);
      setPaymentModalOpen(false);
      showToast('success', 'Payment recorded successfully.');
      await load();
    }
  };

  // Photographer Modal Handlers
  const openAssignModal = async () => {
    setAssignModalOpen(true);
    setLoadingPhotographers(true);
    setSelectedCandidate(null);
    setAssignmentRemarks('');
    const { data, error: phErr } = await getPhotographersWithWorkloadAndAvailability(
      booking?.event_date,
      booking?.preferred_time
    );
    if (!phErr) {
      setEligiblePhotographers(data || []);
    } else {
      showToast('error', 'Failed to load photographers.');
    }
    setLoadingPhotographers(false);
  };

  const handleSelectCandidate = (candidate) => {
    setSelectedCandidate(candidate);
    setAssignConfirmOpen(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedCandidate) return;
    setAssignSubmitting(true);
    const isReassignment = !!booking.photographer_id;
    const candidateName = `${selectedCandidate.first_name} ${selectedCandidate.last_name}`;
    const oldPhotographerName = phProfile ? `${phProfile.first_name} ${phProfile.last_name}` : '';

    let res;
    if (isReassignment) {
      res = await reassignPhotographer({
        bookingId: id,
        newPhotographerId: selectedCandidate.id,
        newPhotographerName: candidateName,
        oldPhotographerName,
        changedById: profile?.id,
        remarks: assignmentRemarks,
        customerId: booking.customer_id,
        bookingNumber: booking.booking_number,
        eventDate: booking.event_date,
      });
    } else {
      res = await assignPhotographerToBooking({
        bookingId: id,
        photographerId: selectedCandidate.id,
        photographerName: candidateName,
        changedById: profile?.id,
        remarks: assignmentRemarks,
        customerId: booking.customer_id,
        bookingNumber: booking.booking_number,
        eventDate: booking.event_date,
      });
    }

    setAssignSubmitting(false);

    if (res.error) {
      showToast('error', `Assignment failed: ${res.error.message || 'Unknown error'}`);
    } else {
      showToast('success', `Photographer ${candidateName} successfully ${isReassignment ? 'reassigned' : 'assigned'}!`);
      setAssignConfirmOpen(false);
      setAssignModalOpen(false);
      setSelectedCandidate(null);
      await load();
    }
  };

  const handleUnassignClick = () => {
    setDialog({
      title: 'Unassign Photographer?',
      message: `Are you sure you want to remove the assigned photographer from booking #${booking.booking_number}? The booking status will revert to CONFIRMED.`,
      confirmLabel: 'Confirm Unassign',
      isDestructive: true,
      onConfirm: async () => {
        setActing(true);
        const oldName = phProfile ? `${phProfile.first_name} ${phProfile.last_name}` : '';
        const { error: unErr } = await unassignPhotographer({
          bookingId: id,
          oldPhotographerName: oldName,
          changedById: profile?.id,
          remarks: 'Photographer unassigned by studio admin.',
        });
        setActing(false);
        setDialog(null);
        if (unErr) {
          showToast('error', `Failed to unassign: ${unErr.message}`);
        } else {
          showToast('success', 'Photographer unassigned. Booking reverted to CONFIRMED.');
          await load();
        }
      },
    });
  };

  // Status Action Dialogs
  const openConfirmAction = () => setDialog({
    title: 'Confirm Booking?',
    message: `This will update booking ${booking?.booking_number} from PENDING to CONFIRMED. The customer will receive an instant notification.`,
    confirmLabel: 'Yes, Confirm',
    confirmClass: 'bg-primary text-white hover:bg-primary/90',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    requireNote: false,
    onConfirm: async () => doStatusUpdate('CONFIRMED'),
  });

  const openRejectAction = () => setDialog({
    title: 'Reject Booking?',
    message: `This will mark booking ${booking?.booking_number} as REJECTED. Please provide clear remarks for the customer.`,
    confirmLabel: 'Yes, Reject',
    confirmClass: 'bg-red-600 text-white hover:bg-red-700',
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50',
    requireNote: true,
    notePlaceholder: 'Reason for rejection (schedule conflict, service unavailable, etc.)…',
    onConfirm: async (note) => doStatusUpdate('REJECTED', note),
  });

  const openAdvanceAction = (nextStatus) => setDialog({
    title: `Advance to ${nextStatus}?`,
    message: `This will progress booking ${booking?.booking_number} forward to stage ${nextStatus}.`,
    confirmLabel: 'Yes, Advance',
    confirmClass: 'bg-primary text-white hover:bg-primary/90',
    requireNote: true,
    notePlaceholder: 'Add operational remarks or notes (optional)…',
    onConfirm: async (note) => doStatusUpdate(nextStatus, note),
  });

  // ── Loading & Error States ──────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3.5">
      <Loader2 size={36} className="animate-spin text-gold" />
      <p className="text-sm font-semibold text-neutral-500 uppercase tracking-widest">Loading Booking Record…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 max-w-lg mx-auto text-center font-body">
      <AlertCircle size={40} className="text-red-500" />
      <h2 className="font-heading text-2xl text-primary font-bold">Failed to Load Booking</h2>
      <p className="text-sm text-neutral-600 leading-relaxed">{error}</p>
      <div className="flex gap-3 mt-2">
        <button onClick={() => navigate('/admin/bookings')} className="btn-outline text-sm py-2.5 px-5">
          ← Back to Bookings
        </button>
        <button onClick={load} className="btn-primary text-sm py-2.5 px-5">
          Try Again
        </button>
      </div>
    </div>
  );

  if (!booking) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 max-w-md mx-auto text-center font-body">
      <AlertCircle size={40} className="text-amber-500" />
      <h2 className="font-heading text-2xl text-primary font-bold">Booking Not Found</h2>
      <p className="text-sm text-neutral-500">The requested booking record does not exist or has been removed.</p>
      <button onClick={() => navigate('/admin/bookings')} className="btn-primary text-sm py-2.5 px-6 mt-3">
        Return to Bookings
      </button>
    </div>
  );

  // ── Calculated Values ───────────────────────────────────────────────────────
  const { status } = booking;
  const nextStatus = NEXT_STATUS_MAP[status];
  const customer = booking.customer;
  const specs = customer?.studio_specs || {};
  const service = booking.service;
  const ph = booking.photographer;
  const phProfile = ph?.profile;
  const history = booking.booking_status_history || [];
  const payments = booking.payments || [];
  const refImages = booking.reference_images || [];
  const addOns = Array.isArray(booking.selected_add_ons) ? booking.selected_add_ons : [];

  // Financial calculations
  const addOnsTotal = addOns.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const totalAmount = Number(booking.total_amount) || 0;
  const packageBasePrice = Math.max(0, totalAmount - addOnsTotal);
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBal = booking.remaining_balance !== undefined && booking.remaining_balance !== null
    ? Number(booking.remaining_balance)
    : Math.max(0, totalAmount - totalPaid);

  // Notes cleaning
  const clientCleanNotes = getCleanClientNotes(booking.notes);

  // Academic & Student details merged
  const isSchoolPartner = booking.student_details?.booking_mode === 'SCHOOL_PARTNER' ||
    (booking.notes || '').includes('School Pictorial') ||
    (booking.notes || '').includes('Official School Partner') ||
    (booking.notes || '').includes('School Partner Agreement');

  const studentInfo = {
    bookingMode: booking.student_details?.booking_mode || (isSchoolPartner ? 'SCHOOL_PARTNER' : 'INDIVIDUAL'),
    isSchoolPartner,
    school: specs.university || booking.student_details?.school,
    campus: specs.campus || booking.student_details?.school_address,
    degree: specs.degree || booking.student_details?.course,
    gradYear: specs.gradYear,
    batch: booking.student_details?.batch || (booking.notes?.match(/• Batch:\s*(.*)/i)?.[1]?.trim()),
    honors: specs.honors,
    studentId: booking.student_details?.student_id,
    section: booking.student_details?.section,
    scheduleNote: booking.student_details?.schedule_note,
    togaSize: specs.togaSize || booking.student_details?.toga_size,
    innerAttireSize: specs.innerAttireSize,
    hoodDiscipline: specs.hoodDiscipline,
    height: booking.student_details?.height,
  };

  const hasStudentData = Boolean(
    studentInfo.school || studentInfo.degree || studentInfo.studentId ||
    studentInfo.section || studentInfo.togaSize || studentInfo.hoodDiscipline
  );

  return (
    <div className="space-y-7 animate-fade-in w-full max-w-screen-2xl mx-auto pb-20 font-body">

      {/* ── Global UI Feedback & Overlays ────────────────────────────────────── */}
      {toast && (
        <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
      )}
      <ConfirmDialog dialog={dialog} onClose={() => setDialog(null)} loading={acting} />

      {/* ── Image Lightbox Modal ────────────────────────────────────────────── */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xs flex items-center justify-center p-6 cursor-pointer print:hidden"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt="Reference Preview"
            className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl border border-white/20"
          />
        </div>
      )}

      {/* ── Printable Formal Studio Header (Shown ONLY on print) ─────────────── */}
      <div className="hidden print:block mb-8 border-b-2 border-neutral-900 pb-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-black uppercase tracking-wider">E-Kodak Photography Studio</h1>
            <p className="text-sm text-neutral-600 font-medium mt-0.5">Official Session Record & Service Manifest</p>
            <p className="text-xs text-neutral-500 mt-1">Cebu City, Philippines · Contact: hello@ekodak.ph</p>
          </div>
          <div className="text-right">
            <span className="font-mono text-lg font-bold text-black">#{booking.booking_number}</span>
            <p className="text-xs text-neutral-600 mt-0.5">Token: {booking.booking_token || '—'}</p>
            <p className="text-xs text-neutral-500 mt-1">Printed on {new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })}</p>
          </div>
        </div>
      </div>

      {/* ── 1. Master Document Header Bar (Screen Only) ──────────────────────── */}
      <div className="print:hidden space-y-4">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/bookings')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-primary transition-colors group cursor-pointer py-1"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform text-gold" />
            Back to Bookings
          </button>

          <div className="flex items-center gap-2.5">
            {/* Print Official Document Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-primary rounded-xl text-sm font-semibold shadow-2xs transition-all cursor-pointer"
              title="Print official studio session sheet / A4 voucher"
            >
              <Printer size={15} className="text-neutral-500" />
              <span>Print Sheet</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-primary rounded-xl text-sm font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <RefreshCw size={15} className={acting ? 'animate-spin text-gold' : 'text-neutral-500'} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Primary Booking Identifiers Header Box */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-wider bg-gold/15 text-gold-dark border border-gold/30 uppercase">
                Official Studio Record
              </span>
              <span className="text-sm text-neutral-300">·</span>
              <span className="font-mono text-xs sm:text-sm text-neutral-500">
                Verification Token: <strong className="text-neutral-900 font-semibold">{booking.booking_token || '—'}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(booking.booking_token, 'Booking Token')}
                className="text-neutral-400 hover:text-gold transition-colors p-1 cursor-pointer"
                title="Copy Token"
              >
                {copiedRef === 'Booking Token' ? <Check size={14} className="text-gold" /> : <Copy size={14} />}
              </button>
            </div>

            <div className="flex items-center gap-3.5 flex-wrap pt-0.5">
              <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-neutral-900 font-bold tracking-tight flex items-center gap-2.5">
                <span>{booking.booking_number}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(booking.booking_number, 'Booking Number')}
                  className="text-neutral-300 hover:text-gold transition-colors p-1 cursor-pointer"
                  title="Copy Booking Number"
                >
                  {copiedRef === 'Booking Number' ? <Check size={18} className="text-gold" /> : <Copy size={18} />}
                </button>
              </h1>
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                <PaymentBadge status={booking.payment_status} />
              </div>
            </div>

            <p className="text-xs sm:text-sm text-neutral-400 font-body">
              Registered on {fmtDateTime(booking.created_at)} · Last synchronized {fmtDateTime(booking.updated_at)}
            </p>
          </div>

          {/* Top Quick Status Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {status === 'PENDING' && (
              <>
                <button
                  type="button"
                  onClick={openConfirmAction}
                  disabled={acting}
                  className="h-10 px-4 sm:px-5 bg-neutral-900 text-gold hover:bg-neutral-800 rounded-xl text-sm font-bold border border-gold/30 transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <CheckCircle2 size={16} />
                  <span>Confirm Booking</span>
                </button>
                <button
                  type="button"
                  onClick={openRejectAction}
                  disabled={acting}
                  className="h-10 px-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <XCircle size={16} />
                  <span>Reject</span>
                </button>
              </>
            )}

            {nextStatus && status !== 'PENDING' && (
              <button
                type="button"
                onClick={() => openAdvanceAction(nextStatus)}
                disabled={acting}
                className="h-10 px-4 sm:px-5 bg-neutral-900 text-gold hover:bg-neutral-800 rounded-xl text-sm font-bold border border-gold/40 transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <ChevronRight size={16} />
                <span>Advance to {nextStatus}</span>
              </button>
            )}

            {status !== 'CANCELLED' && status !== 'REJECTED' && (
              <button
                type="button"
                onClick={openRecordPayment}
                disabled={acting}
                className="h-10 px-4 sm:px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <CreditCard size={16} />
                <span>Record Payment</span>
              </button>
            )}

            {/* Quick QR Pass Modal Button */}
            {booking.booking_token && (
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="h-10 px-4 bg-white border border-neutral-200 hover:border-gold/60 text-neutral-800 hover:text-gold rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer whitespace-nowrap"
                title="Open Scannable QR Pass"
              >
                <QrCode size={16} className="text-gold" />
                <span>QR Pass</span>
              </button>
            )}

            {/* Actions for Deleted vs Active Booking */}
            {booking.is_deleted ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreBooking}
                  disabled={isRestoring}
                  className="h-10 px-4 bg-neutral-900 hover:bg-neutral-800 text-gold font-bold text-sm rounded-xl border border-gold/40 flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  title="Restore booking back to active studio records"
                >
                  {isRestoring ? <Loader2 size={16} className="animate-spin text-gold" /> : <RotateCcw size={16} />}
                  <span>Restore Order</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  disabled={deleting}
                  className="h-10 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs rounded-xl border border-red-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Directly clear out from database"
                >
                  <Trash2 size={15} />
                  <span>Clear Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Move to Trash (Soft Delete) */}
                <button
                  type="button"
                  onClick={() => setSoftDeleteModalOpen(true)}
                  disabled={acting || deleting}
                  className="w-10 h-10 inline-flex items-center justify-center shrink-0 border border-neutral-200 hover:border-amber-300 text-neutral-400 hover:text-amber-700 bg-white hover:bg-amber-50 rounded-xl text-sm transition-colors cursor-pointer"
                  title="Move Booking to Trash"
                >
                  <Archive size={16} />
                </button>

                {/* Permanent Deletion */}
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  disabled={acting || deleting}
                  className="w-10 h-10 inline-flex items-center justify-center shrink-0 border border-neutral-200 hover:border-red-200 text-neutral-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-xl text-sm transition-colors cursor-pointer"
                  title="Delete Booking Permanently"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TRASH CYCLE WARNING BANNER (When order is deleted) ───────────── */}
      {booking.is_deleted && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-800 flex items-center justify-center shrink-0 border border-rose-500/30">
              <Trash2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-heading font-bold text-primary">
                  Order is in Trash Cycle
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-900 border border-rose-500/40">
                  DELETED RECORD
                </span>
              </div>
              <p className="text-xs text-neutral-600 font-body mt-0.5">
                Deleted on {fmt(booking.deleted_at)} {booking.deletion_reason ? `— Reason: "${booking.deletion_reason}"` : ''}. This booking is hidden from active studio queues and client records.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              disabled={isRestoring}
              onClick={handleRestoreBooking}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 hover:bg-neutral-800 text-gold border border-gold/40 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              {isRestoring ? <Loader2 size={14} className="animate-spin text-gold" /> : <RotateCcw size={14} />}
              <span>Restore Order</span>
            </button>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Directly Clear Out</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Session Vitals Quick Strip (4 Large KPI Cells) ───────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 font-body">
        {/* Date & Schedule */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
            <Calendar size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">Session Date</span>
            <span className="font-bold text-sm sm:text-base text-neutral-900 block truncate mt-0.5">
              {booking.event_date ? fmt(booking.event_date) : (isSchoolPartner ? 'School Agreement (Batch TBD)' : 'Date Pending')}
            </span>
            <span className="text-xs text-neutral-500 font-mono block mt-0.5">
              {booking.preferred_time ? `Time: ${booking.preferred_time.substring(0, 5)}` : (isSchoolPartner ? 'Coordinated by Studio & School' : 'Time Pending')}
            </span>
          </div>
        </div>

        {/* Venue & Studio */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
            <MapPin size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">Studio Location</span>
            <span className="font-bold text-sm sm:text-base text-neutral-900 block truncate mt-0.5" title={booking.location || 'E-Kodak Studio'}>
              {booking.location || 'E-Kodak Studio'}
            </span>
            {booking.location && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(booking.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gold hover:underline inline-flex items-center gap-1 print:hidden font-medium mt-0.5"
              >
                Open Google Maps <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>

        {/* Financial Clearance */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <CreditCard size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">Balance Due</span>
            <span className="font-bold text-base sm:text-lg text-emerald-700 font-mono block mt-0.5">
              {currency(remainingBal)}
            </span>
            <span className="text-xs text-neutral-500 block mt-0.5">
              Total Order: {currency(totalAmount)}
            </span>
          </div>
        </div>

        {/* Assigned Photographer */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
            <Camera size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">Assigned Bay</span>
            {ph && phProfile ? (
              <>
                <span className="font-bold text-sm sm:text-base text-neutral-900 block truncate mt-0.5">
                  {phProfile.first_name} {phProfile.last_name}
                </span>
                <span className="text-xs text-purple-700 font-semibold block truncate mt-0.5">
                  {ph.specialization || 'Studio Specialist'}
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-sm text-neutral-400 block italic mt-0.5">Not Yet Assigned</span>
                <button
                  type="button"
                  onClick={openAssignModal}
                  className="text-xs text-gold hover:underline block font-bold print:hidden cursor-pointer mt-0.5"
                >
                  + Assign Photographer
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. MAIN DOCUMENT BODY: 2-COLUMN STRUCTURE ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

        {/* ── LEFT COLUMN (7 COLS ON LG): Operations, Specs & Custody ──────── */}
        <div className="lg:col-span-7 space-y-7">

          {/* Section A: Customer & Contact Information */}
          <SectionCard
            icon={User}
            title="Customer & Contact Information"
            subtitle="Verified client identity, direct phone contact, and residential address"
          >
            {customer ? (
              <div className="space-y-1">
                <DetailRow label="Full Legal Name" value={`${customer.first_name} ${customer.last_name}`} />
                <DetailRow
                  label="Contact Phone"
                  value={
                    customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="text-gold hover:underline flex items-center gap-1.5 justify-end font-semibold">
                        <Phone size={13} /> {customer.phone}
                      </a>
                    ) : null
                  }
                />
                <DetailRow label="Residential Address" value={customer.address} />
                {customer.bio && <DetailRow label="Customer Profile Notes" value={customer.bio} />}
                {specs.emergencyContactName && (
                  <DetailRow
                    label="Emergency Contact"
                    value={`${specs.emergencyContactName} (${specs.emergencyContactPhone || 'No phone set'})`}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 italic">No customer profile linked to this order.</p>
            )}
          </SectionCard>

          {/* Section B: Student & Academic Details */}
          {hasStudentData && (
            <SectionCard
              icon={GraduationCap}
              title="Student & Academic Details"
              subtitle="Institution, degree program, regalia fitting & disciplinary hood specifications"
              className="border-amber-200/80 bg-gradient-to-br from-amber-500/[0.04] via-white to-amber-500/[0.02]"
            >
              <div className="space-y-1">
                <DetailRow
                  label="Scheduling"
                  value={
                    <span className={`font-semibold text-xs px-2.5 py-0.5 rounded-md border ${isSchoolPartner
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-emerald-100 text-emerald-900 border-emerald-300"
                      }`}>
                      {isSchoolPartner ? "School Pictorial (Date set by school)" : "Individual Booking"}
                    </span>
                  }
                />
                <DetailRow label="School" value={studentInfo.school} />
                {studentInfo.campus && <DetailRow label="Campus" value={studentInfo.campus} />}
                <DetailRow label="Course / Strand" value={studentInfo.degree} />
                {studentInfo.studentId && <DetailRow label="Student ID" value={studentInfo.studentId} mono />}
                {studentInfo.batch && (
                  <DetailRow
                    label="Batch"
                    value={
                      <span className="font-semibold text-xs px-2.5 py-0.5 rounded bg-gold/15 text-gold-darker border border-gold/30">
                        {studentInfo.batch}
                      </span>
                    }
                  />
                )}
                {studentInfo.section && (
                  <DetailRow
                    label="Section"
                    value={
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-neutral-900 text-white">
                        {studentInfo.section}
                      </span>
                    }
                  />
                )}
                {studentInfo.scheduleNote && (
                  <DetailRow label="Batch Scheduling Preference" value={studentInfo.scheduleNote} />
                )}
                {studentInfo.gradYear && (
                  <DetailRow label="Graduation Class Term" value={`Class of ${studentInfo.gradYear}`} />
                )}
                {studentInfo.honors && (
                  <DetailRow
                    label="Academic Honors"
                    value={
                      <span className="font-bold text-xs bg-gold/20 text-gold-darker border border-gold/30 px-3 py-1 rounded-md uppercase tracking-wide">
                        {studentInfo.honors}
                      </span>
                    }
                  />
                )}

                {/* Regalia & Robe Sizing */}
                <div className="pt-4 mt-3 border-t border-amber-200/70">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-950/80 flex items-center gap-2 mb-3">
                    <Scissors size={14} className="text-gold-dark" />
                    Tailoring, Robe Sizing & Regalia
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-white rounded-xl border border-neutral-200/80 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Toga Robe Size</span>
                      <span className="font-bold text-sm text-neutral-900 block mt-1">
                        {studentInfo.togaSize || 'Studio Standard'}
                      </span>
                    </div>
                    <div className="p-3.5 bg-white rounded-xl border border-neutral-200/80 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Inner Attire Fit</span>
                      <span className="font-bold text-sm text-neutral-900 block mt-1">
                        {studentInfo.innerAttireSize || 'Standard Fit'}
                      </span>
                    </div>
                    <div className="p-3.5 bg-white rounded-xl border border-neutral-200/80 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Academic Hood</span>
                      <span className="font-semibold text-sm text-neutral-900 block mt-1 truncate" title={HOOD_LABELS[studentInfo.hoodDiscipline] || studentInfo.hoodDiscipline}>
                        {HOOD_LABELS[studentInfo.hoodDiscipline] || studentInfo.hoodDiscipline || 'Program Standard'}
                      </span>
                    </div>
                  </div>
                  {studentInfo.height && (
                    <div className="mt-2.5 text-right">
                      <span className="text-xs text-neutral-500">Client Stature / Height: </span>
                      <strong className="text-sm text-neutral-900 font-bold">{studentInfo.height}</strong>
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {/* Section C: Session Logistics & Creative Specifications */}
          <SectionCard
            icon={Sparkles}
            title="Session & Creative Specifications"
            subtitle="Artistic direction, backdrop preference, retouch calibration, and client instructions"
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <DetailRow label="Scheduled Date" value={fmt(booking.event_date)} />
                <DetailRow label="Preferred Time Slot" value={booking.preferred_time || 'Pending'} />
                <DetailRow
                  label="Shoot Location"
                  value={
                    booking.location ? (
                      <div className="text-right">
                        <span>{booking.location}</span>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(booking.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gold hover:underline inline-flex items-center gap-1 print:hidden ml-2 font-semibold"
                        >
                          <ExternalLink size={12} /> View Map
                        </a>
                      </div>
                    ) : 'E-Kodak Studio'
                  }
                />
                {specs.backdrop && (
                  <DetailRow
                    label="Backdrop Selection"
                    value={
                      <span className="font-semibold text-neutral-900 flex items-center gap-2 justify-end">
                        <span className="w-3 h-3 rounded-full bg-neutral-800 inline-block shrink-0 ring-2 ring-neutral-300" />
                        {BACKDROP_LABELS[specs.backdrop] || specs.backdrop}
                      </span>
                    }
                  />
                )}
                {specs.retouch && (
                  <DetailRow
                    label="Retouching Finish"
                    value={RETOUCH_LABELS[specs.retouch] || specs.retouch}
                  />
                )}
                {specs.makeupPreference && (
                  <DetailRow label="Grooming & Makeup Style" value={specs.makeupPreference} />
                )}
                {specs.photographerNotes && (
                  <DetailRow
                    label="Photographer Guidance"
                    value={
                      <span className="italic text-neutral-800 bg-amber-50/80 px-3 py-2 rounded-xl border border-amber-200/70 block text-left font-body">
                        "{specs.photographerNotes}"
                      </span>
                    }
                  />
                )}
              </div>

              {/* Client Notes (Cleaned) */}
              <div className="pt-3 border-t border-neutral-100">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                  Client Remarks & Special Instructions
                </span>
                {clientCleanNotes ? (
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap font-body">
                    {clientCleanNotes}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400 italic">No additional custom notes specified by client.</p>
                )}
              </div>

              {/* Reference Pegs */}
              {refImages.length > 0 && (
                <div className="pt-3 border-t border-neutral-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Client Reference Pegs ({refImages.length})
                    </span>
                    <span className="text-xs text-neutral-400 print:hidden">Click image to inspect</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {refImages.map((path, i) => (
                      <RefImage key={i} filePath={path} onPreview={(u) => setLightboxImg(u)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Section: Photo Samples & Set Review */}
          <SectionCard
            icon={Camera}
            title="Photo Samples & Set Review"
            subtitle="Review deliverable photo samples per set uploaded by photographer before staff finalization"
            action={
              photoOutputs.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {['EDITING', 'CAPTURE', 'CONFIRMED', 'PHOTOGRAPHER_ASSIGNED'].includes(status) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmForwardModalOpen(true)}
                        className="text-xs font-bold text-neutral-950 bg-gold hover:bg-gold-dark px-3 py-1.5 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                        title="Confirm sample photos and forward to staff for printing and finalization"
                      >
                        <CheckCircle2 size={13} /> Confirm & Send to Staff
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevisionModalOpen(true)}
                        className="text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        title="Return photos to photographer for reshoot or adjustments"
                      >
                        <AlertTriangle size={13} /> Request Revision
                      </button>
                    </>
                  )}
                  {['PRINTING', 'READY', 'COMPLETED'].includes(status) && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                      <CheckCircle2 size={13} /> Samples Confirmed for Staff Finalization
                    </span>
                  )}
                </div>
              ) : null
            }
          >
            <div className="space-y-4 font-body">
              {/* Review Status Alert */}
              {photoOutputs.length > 0 ? (
                status === 'EDITING' ? (
                  <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
                    <Clock size={18} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-950">Awaiting Admin Confirmation</h4>
                      <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                        Photographer uploaded {photoOutputs.length} sample photo(s) across sets. Review the samples below. Once verified, confirm the sets to forward to staff for final retouching, print lab production, and packaging.
                      </p>
                    </div>
                  </div>
                ) : ['PRINTING', 'READY', 'COMPLETED'].includes(status) ? (
                  <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-emerald-950">Confirmed & Dispatched to Staff</h4>
                      <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                        Admin confirmed sample photos. Order is currently in staff custody for final printing, framing, and client pickup/courier release.
                      </p>
                    </div>
                  </div>
                ) : null
              ) : (
                <div className="p-6 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200 text-neutral-500">
                  <Camera size={32} className="mx-auto text-neutral-300 mb-2" />
                  <p className="text-xs sm:text-sm font-semibold text-neutral-700">No photo samples uploaded yet</p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                    The assigned photographer will upload shoot samples categorized per set following studio capture.
                  </p>
                </div>
              )}

              {/* Order Sets Requirements Checklist */}
              {(() => {
                const orderSets = getRequiredSetsForBooking(booking);
                if (orderSets.length === 0) return null;
                const uploadedSetNames = new Set(photoOutputs.map(p => extractSetName(p.file_name)));
                return (
                  <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/90 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-700 uppercase tracking-wider">
                        Order Set Requirements ({booking?.tier_name ? booking.tier_name : 'Package Spec'}):
                      </span>
                      <span className="font-bold text-neutral-900">
                        {orderSets.filter(s => uploadedSetNames.has(s.name)).length} of {orderSets.length} Sets Uploaded (1 Photo Per Set)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {orderSets.map(s => {
                        const isDone = uploadedSetNames.has(s.name);
                        return (
                          <span
                            key={s.id}
                            className={`text-xs px-2.5 py-1 rounded-lg border font-medium inline-flex items-center gap-1.5 ${isDone
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-white text-neutral-500 border-neutral-200'
                              }`}
                          >
                            <i className={`bi ${isDone ? 'bi-check-circle-fill text-emerald-600' : 'bi-circle text-neutral-300'}`}></i>
                            <span>{s.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Set Filters */}
              {photoOutputs.length > 0 && (() => {
                const uniqueSets = Array.from(new Set(photoOutputs.map(p => extractSetName(p.file_name))));
                const displayedPhotos = activePhotoSetFilter === 'ALL'
                  ? photoOutputs
                  : photoOutputs.filter(p => extractSetName(p.file_name) === activePhotoSetFilter);

                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-xs font-semibold text-neutral-400">Photo Set:</span>
                      <button
                        type="button"
                        onClick={() => setActivePhotoSetFilter('ALL')}
                        className={`text-xs px-2.5 py-1 rounded-md transition-all font-body ${activePhotoSetFilter === 'ALL'
                          ? 'bg-primary text-white font-semibold'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                      >
                        All Sets ({photoOutputs.length})
                      </button>
                      {uniqueSets.map(s => {
                        const count = photoOutputs.filter(p => extractSetName(p.file_name) === s).length;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setActivePhotoSetFilter(s)}
                            className={`text-xs px-2.5 py-1 rounded-md transition-all font-body ${activePhotoSetFilter === s
                              ? 'bg-primary text-white font-semibold'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                              }`}
                          >
                            {s} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Photos Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 pt-2">
                      {displayedPhotos.map(p => {
                        const sName = extractSetName(p.file_name);
                        const cName = getCleanFileName(p.file_name);
                        const imgUrl = p.file_url || p.file_path;
                        return (
                          <div
                            key={p.id}
                            className="group relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 aspect-square shadow-2xs"
                          >
                            <img
                              src={imgUrl}
                              alt={cName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=400&q=80';
                              }}
                            />
                            {/* Set Badge */}
                            <div className="absolute top-2 left-2 z-10">
                              <span className="bg-black/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/20 truncate max-w-[120px] block">
                                {sName}
                              </span>
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end text-white">
                              <p className="text-[11px] font-medium truncate">{cName}</p>
                              <div className="flex items-center justify-between mt-1">
                                <a
                                  href={imgUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-gold underline hover:text-white"
                                >
                                  Open full size
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setLightboxImg(imgUrl)}
                                  className="text-[10px] bg-white/20 hover:bg-white/40 px-1.5 py-0.5 rounded text-white"
                                >
                                  Inspect
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </SectionCard>

          {/* Section D: Workstation Custody & Departmental Handoffs */}
          <SectionCard
            icon={ArrowRightLeft}
            title="Workstation Flow & Departmental Handoffs"
            subtitle="Synchronized chain of custody across Front Desk, Bay, Treasury & Command"
            action={
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenTransferModal('photographer', 'ORDER_HANDOFF', `Handoff to Bay: #${booking.booking_number}`, 'Customer checked in. Ready for studio portrait bay.')}
                  className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera size={13} /> Pass to Bay
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenTransferModal('finance', 'PAYMENT_VERIFICATION', `Verify Balance: #${booking.booking_number}`, 'Please verify customer downpayment/remaining balance before print release.')}
                  className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard size={13} /> Ask Finance
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenTransferModal('admin', 'ISSUE_ESCALATION', `Escalation: #${booking.booking_number}`, 'Reporting an operational issue or exception.')}
                  className="text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle size={13} /> Escalate
                </button>
              </div>
            }
          >
            <div className="space-y-5">
              {/* Departmental Pipeline Stages */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3.5 rounded-xl border text-sm font-body ${['CONFIRMED', 'PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 'EDITING', 'PRINTING', 'READY', 'COMPLETED'].includes(status)
                  ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-400'
                  }`}>
                  <span className="block text-[10px] uppercase font-bold text-blue-600 mb-0.5">Stage 1</span>
                  Front Desk Intake
                </div>
                <div className={`p-3.5 rounded-xl border text-sm font-body ${booking.payment_status === 'PAID' || booking.payment_status === 'PARTIAL'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-400'
                  }`}>
                  <span className="block text-[10px] uppercase font-bold text-emerald-600 mb-0.5">Stage 2</span>
                  Finance Cleared
                </div>
                <div className={`p-3.5 rounded-xl border text-sm font-body ${['CAPTURE', 'EDITING', 'PRINTING', 'READY', 'COMPLETED'].includes(status)
                  ? 'bg-purple-50 border-purple-200 text-purple-900 font-bold'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-400'
                  }`}>
                  <span className="block text-[10px] uppercase font-bold text-purple-600 mb-0.5">Stage 3</span>
                  Creative Bay
                </div>
                <div className={`p-3.5 rounded-xl border text-sm font-body ${['READY', 'COMPLETED'].includes(status)
                  ? 'bg-gold/15 border-gold/40 text-gold-darker font-bold'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-400'
                  }`}>
                  <span className="block text-[10px] uppercase font-bold text-gold-dark mb-0.5">Stage 4</span>
                  Print & Release
                </div>
              </div>

              {/* Transfers List */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Departmental Handoff Logs ({transfers.length})
                </span>
                {transfers.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic py-1">
                    No cross-departmental handoffs recorded yet for this order. Use the action buttons to pass custody.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {transfers.map((tf) => {
                      const typeCfg = TRANSFER_TYPES[tf.transfer_type] || TRANSFER_TYPES.GENERAL_NOTE;
                      return (
                        <div key={tf.id} className="p-4 rounded-xl bg-neutral-50/80 border border-neutral-200/80 text-sm font-body">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${typeCfg.badge}`}>
                                {typeCfg.label}
                              </span>
                              <span className="font-bold text-neutral-900 capitalize text-xs">
                                {tf.sender_role} &rarr; {tf.target_role}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-neutral-400">
                              {fmtDateTime(tf.created_at)}
                            </span>
                          </div>
                          <h4 className="font-bold text-neutral-900 text-sm">{tf.title}</h4>
                          <p className="text-neutral-600 mt-1 whitespace-pre-wrap leading-relaxed">{tf.message}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

        </div>

        {/* ── RIGHT COLUMN (5 COLS ON LG): Pass, Financial Ledger, Team & Audits ──── */}
        <div className="lg:col-span-5 space-y-7">

          {/* Section E: Official QR Pass & Admission Verification (Top Position for Instant Optical Scanning) */}
          <SectionCard
            id="official-qr-pass"
            icon={QrCode}
            title="Official QR Pass & Admission Verification"
            subtitle="High-contrast digital pass for front-desk reception & mobile check-in"
            action={!booking.qr_code_path && booking.booking_token ? (
              <button
                type="button"
                onClick={async () => {
                  const { data } = await generateAndStoreQRCode(booking.id, booking.booking_token);
                  if (data?.qr_public_url) window.open(data.qr_public_url, '_blank');
                  load();
                }}
                className="text-xs font-semibold text-gold hover:text-primary flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode size={14} /> Generate QR
              </button>
            ) : null}
          >
            <div className="p-4 sm:p-5 bg-neutral-50/80 rounded-2xl border border-neutral-200/70 flex flex-col items-center justify-center">
              <QRPass
                bookingToken={booking.booking_token}
                bookingNumber={booking.booking_number}
                qrCodePath={booking.qr_code_path}
                size={220}
                showActions={true}
              />
              <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 size={13} />
                <span>Ready for Instant Entrance Scan</span>
              </div>
            </div>
          </SectionCard>

          {/* Section F: Service Package & Financial Settlement */}
          <SectionCard
            icon={CreditCard}
            title="Service & Financial Settlement"
            subtitle="Itemized package tier, selected add-ons, balance sheet & payment history"
            action={
              status !== 'CANCELLED' && status !== 'REJECTED' ? (
                <button
                  type="button"
                  onClick={openRecordPayment}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> Record
                </button>
              ) : null
            }
          >
            <div className="space-y-5">
              {/* Service Info */}
              <div className="space-y-1">
                <DetailRow label="Service Package" value={service?.name || 'Studio Session'} />
                <DetailRow label="Category" value={service?.category_data?.name || service?.category || 'Photography'} />
                {booking.tier_name && <DetailRow label="Selected Tier" value={booking.tier_name} />}
                <DetailRow label="Package Base Price" value={currency(packageBasePrice)} />
              </div>

              {/* Selected Add-Ons Table */}
              {addOns.length > 0 && (
                <div className="pt-3 border-t border-neutral-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                    Selected Add-Ons ({addOns.length})
                  </span>
                  <div className="space-y-2 bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200/70">
                    {addOns.map((a, i) => (
                      <div key={i} className="flex justify-between items-center text-sm font-body">
                        <span className="text-neutral-700">{a.name}</span>
                        <span className="font-semibold text-neutral-900">{currency(a.price)}</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-1.5 border-t border-neutral-200 flex justify-between text-sm font-bold">
                      <span className="text-neutral-500">Add-Ons Subtotal</span>
                      <span className="text-neutral-900">{currency(addOnsTotal)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Accounting Summary Balance Sheet */}
              <div className="p-5 bg-neutral-900 text-white rounded-2xl space-y-2.5 shadow-sm">
                <div className="flex justify-between items-center text-sm text-neutral-400">
                  <span>Grand Total Order:</span>
                  <strong className="text-white font-mono text-base">{currency(totalAmount)}</strong>
                </div>
                <div className="flex justify-between items-center text-sm text-neutral-400">
                  <span>Total Payments Cleared:</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">{currency(totalPaid)}</span>
                </div>
                <div className="pt-2.5 border-t border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-gold uppercase tracking-wider block">Remaining Balance</span>
                    <span className="text-xs text-neutral-400">Due before output release</span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold font-mono text-gold">{currency(remainingBal)}</span>
                </div>
              </div>

              {/* Recorded Payments Ledger */}
              <div className="pt-3 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Recorded Payments ({payments.length})
                  </span>
                  <PaymentBadge status={booking.payment_status} />
                </div>
                {payments.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic py-1">No payments recorded yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {payments.map((p) => (
                      <div key={p.id} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 text-sm font-body">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-neutral-900 font-mono text-base">{currency(p.amount)}</span>
                          <span className="text-xs font-mono text-neutral-400">{fmt(p.payment_date)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-neutral-500 mt-1">
                          <span className="font-medium">{p.payment_type?.replace('_', ' ')} · {p.payment_method}</span>
                          {p.reference_number && <span className="font-mono">Ref: {p.reference_number}</span>}
                        </div>
                        {p.notes && <p className="text-xs text-neutral-500 mt-1 italic leading-relaxed">{p.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Section F: Assigned Photographer */}
          <SectionCard
            icon={Camera}
            title="Photographer Assignment"
            subtitle="Designated studio photographer & shoot bay availability"
            action={
              ph && phProfile && ['CONFIRMED', 'PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 'EDITING', 'PRINTING', 'READY'].includes(status) ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openAssignModal}
                    className="text-xs font-semibold text-gold hover:text-primary transition-colors cursor-pointer"
                  >
                    Reassign
                  </button>
                  <span className="text-neutral-300">·</span>
                  <button
                    type="button"
                    onClick={handleUnassignClick}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    Unassign
                  </button>
                </div>
              ) : null
            }
          >
            {ph && phProfile ? (
              <div className="space-y-4 font-body">
                <div className="flex items-center gap-3.5 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100">
                  {phProfile.avatar_url ? (
                    <img
                      src={phProfile.avatar_url}
                      alt={phProfile.first_name}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-gold/30 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-neutral-900 text-gold flex items-center justify-center font-heading font-bold text-base ring-2 ring-gold/20 shrink-0">
                      {phProfile.first_name?.[0]}{phProfile.last_name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading text-base font-bold text-neutral-900 truncate">
                        {phProfile.first_name} {phProfile.last_name}
                      </h4>
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                        Active
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gold-dark font-semibold truncate mt-0.5">
                      {ph.specialization || "Studio Photographer"}
                    </p>
                    {phProfile.phone && (
                      <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                        <Phone size={11} /> {phProfile.phone}
                      </p>
                    )}
                  </div>
                </div>

                <DetailRow label="Specialization" value={ph.specialization || 'General Photography'} />
                <DetailRow
                  label="Bay Availability"
                  value={
                    ph.is_available ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={13} /> Ready & Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full">
                        <XCircle size={13} /> Busy / On Schedule
                      </span>
                    )
                  }
                />
              </div>
            ) : (
              <div className="text-center py-6 font-body">
                <Camera size={32} className="mx-auto text-neutral-300 mb-2" />
                <p className="text-sm font-bold text-neutral-700">No Photographer Assigned</p>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                  Assign a photographer to synchronize session specifications with the studio camera bay.
                </p>
                {['CONFIRMED', 'PHOTOGRAPHER_ASSIGNED'].includes(status) && (
                  <button
                    type="button"
                    onClick={openAssignModal}
                    className="btn-primary text-xs px-4 py-2 mt-4 inline-flex items-center gap-1.5 cursor-pointer font-semibold"
                  >
                    <UserCheck size={15} /> Assign Photographer
                  </button>
                )}
              </div>
            )}
          </SectionCard>

          {/* Section G: Studio Fulfillment & Handover Protocols */}
          {(specs.fulfillment_mode || specs.shipping_address || specs.delivery_instructions) && (
            <SectionCard
              icon={Truck}
              title="Studio Fulfillment & Dispatch"
              subtitle="Output claiming method, courier delivery address, and gate instructions"
            >
              <div className="space-y-1">
                <DetailRow
                  label="Fulfillment Method"
                  value={
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${specs.fulfillment_mode === 'STUDIO_DELIVERY'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                      <Truck size={14} />
                      {specs.fulfillment_mode === 'STUDIO_DELIVERY'
                        ? 'Direct Delivery (Courier Dispatch)'
                        : 'In-Person Studio Counter Claim'}
                    </span>
                  }
                />
                <DetailRow
                  label="Recipient Contact"
                  value={specs.courier_recipient_name || `${customer?.first_name} ${customer?.last_name}`}
                />
                <DetailRow
                  label="Recipient Phone"
                  value={specs.courier_phone || customer?.phone}
                />
                {specs.shipping_address && (
                  <DetailRow label="Delivery Address" value={specs.shipping_address} />
                )}
                {specs.delivery_instructions && (
                  <DetailRow
                    label="Gate / Dispatch Notes"
                    value={
                      <span className="text-neutral-800 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 block text-left font-body text-xs">
                        {specs.delivery_instructions}
                      </span>
                    }
                  />
                )}
              </div>
            </SectionCard>
          )}

          {/* Section H: Compliance & Digital Signatures */}
          {(specs.termsSignatureHash || specs.agreedModelRelease !== undefined) && (
            <SectionCard
              icon={ShieldCheck}
              title="Service Agreement & Compliance"
              subtitle="Model release authorization, digital terms signature audit trail"
            >
              <div className="space-y-1">
                <DetailRow
                  label="Model Release Consent"
                  value={
                    specs.agreedModelRelease ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1.5 justify-end">
                        <CheckCircle2 size={14} /> Authorized & Signed
                      </span>
                    ) : (
                      <span className="text-neutral-500 flex items-center gap-1.5 justify-end">
                        <XCircle size={14} /> Restricted / Private
                      </span>
                    )
                  }
                />
                {specs.termsSignatureHash && (
                  <DetailRow
                    label="Signature Hash"
                    value={
                      <span className="font-mono font-bold text-xs bg-neutral-100 text-neutral-800 px-2.5 py-1 rounded-md border border-neutral-200">
                        {specs.termsSignatureHash}
                      </span>
                    }
                  />
                )}
                {specs.termsSignedTimestamp && (
                  <DetailRow
                    label="Signed Timestamp (PHT)"
                    value={fmtDateTime(specs.termsSignedTimestamp)}
                  />
                )}
              </div>
            </SectionCard>
          )}

          {/* Section H: Status Change Audit Trail */}
          <SectionCard
            icon={History}
            title="Booking Status History"
            subtitle="Chronological audit trail of lifecycle progression"
          >
            {history.length === 0 ? (
              <p className="text-sm text-neutral-400 italic">No status history recorded yet.</p>
            ) : (
              <div className="mt-2">
                {history.map((entry, i) => (
                  <HistoryItem
                    key={entry.id}
                    entry={entry}
                    isLast={i === history.length - 1}
                  />
                ))}
              </div>
            )}
          </SectionCard>

        </div>
      </div>

      {/* ── HIGH-RESOLUTION QUICK SCAN QR PASS MODAL ─────────────────────── */}
      {qrModalOpen && (
        <Modal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          title={`Official Studio QR Admission Pass — ${booking.booking_number}`}
        >
          <div className="p-4 flex flex-col items-center justify-center font-body">
            <div className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-sm flex flex-col items-center justify-center">
              <QRPass
                bookingToken={booking.booking_token}
                bookingNumber={booking.booking_number}
                qrCodePath={booking.qr_code_path}
                size={260}
                showActions={true}
              />
            </div>
            <div className="mt-4 text-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
                <CheckCircle2 size={14} /> Ready for Optical & Mobile Scan
              </span>
              <p className="text-xs text-neutral-400 mt-2.5">
                Point any mobile camera or handheld 2D barcode scanner directly at the code above
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* ── RECORD PAYMENT MODAL ────────────────────────────────────────────── */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => !paymentSubmitting && setPaymentModalOpen(false)}
        title={`Record Payment — ${booking.booking_number}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 font-body">
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 flex justify-between items-center text-sm">
            <span className="text-neutral-500">Order Total: <strong className="text-neutral-900 text-base">{currency(totalAmount)}</strong></span>
            <span className="text-neutral-500">Remaining: <strong className="text-emerald-700 font-bold text-base">{currency(remainingBal)}</strong></span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Payment Amount (₱) *
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:border-gold focus:outline-none font-semibold"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Payment Type *
              </label>
              <select
                value={paymentForm.payment_type}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
              >
                <option value="DOWN_PAYMENT">Down Payment</option>
                <option value="FINAL_PAYMENT">Final Payment</option>
                <option value="OTHER">Full / Advance Settlement</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Payment Method *
              </label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
              >
                <option value="CASH">Cash Over Counter</option>
                <option value="BANK_TRANSFER">Bank Transfer (BDO/BPI)</option>
                <option value="E_WALLET">E-Wallet (GCash / Maya)</option>
                <option value="OTHER">Credit / Debit Card / Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Reference / Transaction No. (optional)
            </label>
            <input
              type="text"
              value={paymentForm.reference_number}
              onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
              className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:border-gold focus:outline-none font-mono"
              placeholder="e.g. GCash 104829104"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:border-gold focus:outline-none"
              placeholder="Received by cashier desk, official receipt #..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100">
            <button
              type="button"
              disabled={paymentSubmitting}
              onClick={() => setPaymentModalOpen(false)}
              className="px-4 py-2.5 border border-neutral-200 rounded-xl text-sm text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={paymentSubmitting}
              className="btn-primary px-5 py-2.5 text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {paymentSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Saving…
                </>
              ) : (
                'Save Payment'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── PHOTOGRAPHER SELECTION MODAL ─────────────────────────────────────── */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={booking.photographer_id ? `Reassign Photographer — ${booking.booking_number}` : `Assign Photographer — ${booking.booking_number}`}
      >
        <div className="space-y-4 font-body">
          {/* Booking Context Banner */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-neutral-400">Customer:</span>
              <span className="font-semibold text-neutral-900">{customer?.first_name} {customer?.last_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Service:</span>
              <span className="font-semibold text-neutral-900">{service?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Date & Time:</span>
              <span className="font-medium text-neutral-800">{fmt(booking.event_date)} {booking.preferred_time ? `at ${booking.preferred_time.substring(0, 5)}` : ''}</span>
            </div>
          </div>

          <p className="text-sm text-neutral-500">
            Select a photographer from the active team. The schedule engine cross-references real-time availability.
          </p>

          {/* Photographers Candidate List */}
          {loadingPhotographers ? (
            <div className="py-12 text-center">
              <Loader2 size={28} className="animate-spin text-gold mx-auto mb-2.5" />
              <p className="text-sm text-neutral-400">Analyzing team availability and conflict schedules…</p>
            </div>
          ) : eligiblePhotographers.length === 0 ? (
            <div className="text-center py-10 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
              <Camera size={30} className="mx-auto text-neutral-300 mb-2" />
              <p className="text-sm text-neutral-600 font-bold">No active photographers found</p>
              <p className="text-xs text-neutral-400 mt-1">Ensure team members have an approved photographer profile.</p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {eligiblePhotographers.map(candidate => {
                const isCurrentlyAssigned = booking.photographer_id === candidate.id;
                const isPending = !candidate.is_active;

                return (
                  <div
                    key={candidate.id}
                    className={`p-4 rounded-xl border transition-all text-left ${isCurrentlyAssigned
                      ? 'border-gold bg-gold/5'
                      : candidate.hasConflict
                        ? 'border-red-200 bg-red-50/30'
                        : 'border-neutral-200 hover:border-gold/60 bg-white hover:bg-neutral-50/50'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-neutral-900 text-gold flex items-center justify-center font-heading font-bold text-sm ring-1 ring-gold/20 shrink-0 overflow-hidden">
                          {candidate.avatar_url ? (
                            <img src={candidate.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            `${candidate.first_name?.[0] || ''}${candidate.last_name?.[0] || ''}`.toUpperCase() || 'P'
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900">
                            {candidate.first_name} {candidate.last_name}
                            {isCurrentlyAssigned && (
                              <span className="ml-2 text-[10px] font-bold text-gold bg-gold/15 px-2 py-0.5 rounded-full uppercase">
                                Current
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {candidate.specialization || 'General Photography'}
                          </p>
                        </div>
                      </div>

                      <div>
                        {isPending ? (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Pending
                          </span>
                        ) : candidate.is_available ? (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Available
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                            Busy
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between gap-2 text-xs">
                      <span className="text-neutral-500">
                        Active shoots: <strong className="text-neutral-900 font-bold">{candidate.activeWorkloadCount}</strong>
                      </span>
                      {candidate.phone && <span className="text-neutral-400">{candidate.phone}</span>}
                    </div>

                    {candidate.conflictReason && (
                      <div className="mt-2.5 p-2.5 rounded-lg text-xs bg-red-50 text-red-700 border border-red-200 flex items-start gap-2">
                        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                        <span>{candidate.conflictReason}</span>
                      </div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSelectCandidate(candidate)}
                        disabled={isCurrentlyAssigned || isPending}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer ${isCurrentlyAssigned || isPending
                          ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                          : candidate.hasConflict
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                            : 'btn-primary'
                          }`}
                      >
                        {isCurrentlyAssigned ? 'Currently Assigned' : candidate.hasConflict ? 'Assign Despite Warning' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-neutral-100 flex justify-end">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── ASSIGNMENT CONFIRMATION DIALOG ──────────────────────────────────── */}
      {assignConfirmOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-neutral-100 space-y-4 font-body">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center shrink-0">
                <UserCheck size={24} />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-neutral-900">
                  {booking.photographer_id ? 'Confirm Reassignment?' : 'Confirm Assignment?'}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                  Please review the operational details before confirming.
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">Booking:</span>
                <span className="font-mono font-bold text-neutral-900">#{booking.booking_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Customer:</span>
                <span className="font-semibold text-neutral-900">{customer?.first_name} {customer?.last_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Photographer:</span>
                <span className="font-bold text-neutral-900">{selectedCandidate.first_name} {selectedCandidate.last_name}</span>
              </div>
            </div>

            {selectedCandidate.hasConflict && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{selectedCandidate.conflictReason}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Assignment Remarks (optional)
              </label>
              <textarea
                rows={2}
                value={assignmentRemarks}
                onChange={e => setAssignmentRemarks(e.target.value)}
                placeholder="e.g. Lead studio photographer assigned for portrait bay"
                className="w-full text-sm p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:border-gold outline-none font-body"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                disabled={assignSubmitting}
                onClick={() => setAssignConfirmOpen(false)}
                className="px-4 py-2 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assignSubmitting}
                onClick={handleConfirmAssignment}
                className="btn-primary px-5 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {assignSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SOFT DELETE (MOVE TO TRASH) MODAL ────────────────────────────────── */}
      <Modal
        isOpen={softDeleteModalOpen}
        onClose={() => !deleting && setSoftDeleteModalOpen(false)}
        title={`Move Booking #${booking?.booking_number} to Trash`}
        size="md"
      >
        <div className="space-y-4 font-body text-sm">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3.5 text-amber-900">
            <Archive size={22} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm sm:text-base">Move Order to Trash Cycle</span>
              <p className="mt-1 leading-relaxed text-xs sm:text-sm text-neutral-600">
                This booking will be cancelled and removed from active studio records and the customer's portal. The customer will receive an immediate in-app notification. You can restore this order at any time from the Trash Cycle.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1.5">
              Reason for Cancellation / Removal
            </label>
            <input
              type="text"
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              placeholder="e.g. Customer cancelled / schedule conflict / duplicate entry"
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-gold outline-none font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setSoftDeleteModalOpen(false)}
              disabled={deleting}
              className="btn-outline text-xs sm:text-sm px-4 py-2 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSoftDeleteBooking}
              disabled={deleting}
              className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-gold font-bold text-xs sm:text-sm flex items-center gap-2 border border-gold/40 shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              {deleting ? <Loader2 size={15} className="animate-spin text-gold" /> : <Archive size={15} />}
              Move to Trash
            </button>
          </div>
        </div>
      </Modal>

      {/* ── DELETE BOOKING MODAL ────────────────────────────────────────────── */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        title={`Permanently Delete Booking #${booking?.booking_number}`}
        size="md"
      >
        <div className="space-y-4 font-body text-sm">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3.5 text-red-800">
            <AlertTriangle size={22} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm sm:text-base">Permanent Database Deletion</span>
              <p className="mt-1 leading-relaxed text-xs sm:text-sm">
                This will delete the booking record from the active database. Associated payments, passes, and transfers will be cleaned up, and an archived audit record will be created in Security & Activity Logs.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1.5">
              Reason for Deletion <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              placeholder="e.g. Customer cancelled / duplicate test booking"
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 outline-none font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
              className="btn-outline text-xs sm:text-sm px-4 py-2 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteBooking}
              disabled={deleting}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Confirm Deletion
            </button>
          </div>
        </div>
      </Modal>

      {/* ── WORKSTATION TRANSFER DISPATCH MODAL ─────────────────────────────── */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => !tfSubmitting && setTransferModalOpen(false)}
        title={`Workstation Handoff — #${booking?.booking_number}`}
        size="md"
      >
        <form onSubmit={handleSubmitTransfer} className="space-y-4 font-body text-sm">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Target Department / Station
            </label>
            <select
              value={tfTargetRole}
              onChange={e => setTfTargetRole(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-gold outline-none font-medium"
              required
            >
              <option value="photographer">Studio Bay (Photographer)</option>
              <option value="staff">Front Desk & Reception (Staff)</option>
              <option value="finance">Treasury & Payments (Finance)</option>
              <option value="admin">Command Hub (Admin Escalation)</option>
              <option value="all">Broadcast to All Stations</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Handoff Type
              </label>
              <select
                value={tfType}
                onChange={e => setTfType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-gold outline-none"
                required
              >
                <option value="ORDER_HANDOFF">Order Handoff</option>
                <option value="PAYMENT_VERIFICATION">Payment Verification</option>
                <option value="ISSUE_ESCALATION">Issue Escalation</option>
                <option value="OUTPUT_SUBMISSION">Output Submission</option>
                <option value="DISPATCH_CLEARANCE">Dispatch Clearance</option>
                <option value="GENERAL_NOTE">General Memo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={tfPriority}
                onChange={e => setTfPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-gold outline-none"
                required
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent Escalation</option>
                <option value="LOW">Low / Information</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Subject
            </label>
            <input
              type="text"
              value={tfTitle}
              onChange={e => setTfTitle(e.target.value)}
              placeholder="e.g., Client checked in / Toga robe fitted"
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-gold outline-none font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Instructions & Notes
            </label>
            <textarea
              value={tfMessage}
              onChange={e => setTfMessage(e.target.value)}
              rows={3}
              placeholder="Specify shoot bay notes, attire adjustments, balance clearance or customer requirements..."
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-gold outline-none resize-none leading-relaxed"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setTransferModalOpen(false)}
              className="btn-outline text-xs sm:text-sm px-4 py-2 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={tfSubmitting}
              className="btn-primary text-xs sm:text-sm px-5 py-2.5 font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {tfSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Transmit Handoff
            </button>
          </div>
        </form>
      </Modal>

      {/* ── CONFIRM SAMPLES & FORWARD TO STAFF MODAL ───────────────────────── */}
      <Modal
        isOpen={confirmForwardModalOpen}
        onClose={() => !forwardSubmitting && setConfirmForwardModalOpen(false)}
        title={`Confirm Photo Samples & Forward to Staff — #${booking.booking_number}`}
      >
        <div className="space-y-4 font-body">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm">
            <p className="font-semibold">
              Confirming will verify that all sample photo sets meet studio standards and forward the booking directly to Staff for final retouching, print production, and packaging.
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Deliverables: <strong>{photoOutputs.length} sample photo(s)</strong> across sets.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Production Notes for Staff (Optional)
            </label>
            <textarea
              rows={3}
              value={forwardNotes}
              onChange={(e) => setForwardNotes(e.target.value)}
              placeholder="e.g. Please proceed with matte 8x10 print for Set 1 and 2R prints for Set 2..."
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-gold outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
            <button
              type="button"
              disabled={forwardSubmitting}
              onClick={() => setConfirmForwardModalOpen(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-600 hover:bg-neutral-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={forwardSubmitting}
              onClick={handleConfirmAndForwardToStaff}
              className="btn-primary text-xs font-bold px-5 py-2.5 flex items-center gap-2 disabled:opacity-50"
            >
              {forwardSubmitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Confirm & Forward to Staff
            </button>
          </div>
        </div>
      </Modal>

      {/* ── REQUEST SAMPLE REVISION MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={revisionModalOpen}
        onClose={() => !revisionSubmitting && setRevisionModalOpen(false)}
        title={`Request Sample Revisions — #${booking.booking_number}`}
      >
        <div className="space-y-4 font-body">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
            <p className="font-semibold">
              Returning to photographer will revert status to studio capture and notify the assigned photographer with your revision notes.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Revision Details & Guidance *
            </label>
            <textarea
              rows={4}
              required
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Specify which set requires adjustments (e.g. Set 1: lighting too dark on toga, Set 2: retake portrait angle)..."
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-gold outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
            <button
              type="button"
              disabled={revisionSubmitting}
              onClick={() => setRevisionModalOpen(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-600 hover:bg-neutral-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={revisionSubmitting}
              onClick={handleReturnToPhotographer}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-xs"
            >
              {revisionSubmitting ? <Loader2 size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
              Send Revision Request
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
