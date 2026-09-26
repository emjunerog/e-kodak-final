import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Calendar, Clock, MapPin, QrCode,
  FileImage, Info, Loader2, CheckCircle, XCircle, Camera,
  GraduationCap, ExternalLink, Building, Truck, ShieldCheck,
  Layers, ChevronRight, Download, Sparkles, CreditCard,
  CheckCircle2, AlertCircle, School, Receipt
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getBookingById, getReferenceImageUrl, cancelBooking, parseStudentDetailsFromNotes } from "../../services/bookingService";
import { getStatusBadge, getStatusLabel, getPaymentLabel } from "../../lib/bookingUtils";
import QRPass from "../../components/booking/QRPass";
import Toast from "../../components/ui/Toast";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

// Extract clean studio name and Google Maps URL without raw link clutter
function getCleanLocation(locStr) {
  if (!locStr) {
    return {
      name: "E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=311+Rizal+Street,+City+of+Naga,+Cebu"
    };
  }
  const match = locStr.match(/(https?:\/\/[^\s,]+)/i);
  const mapUrl = match ? match[1] : `https://maps.google.com/?q=${encodeURIComponent(locStr)}`;
  const cleanName = locStr
    .replace(/(https?:\/\/[^\s,]+)/ig, "")
    .trim()
    .replace(/,\s*$/, "")
    .trim() || "E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu";

  return { name: cleanName, mapUrl };
}

// Strip machine-generated student details and add-on blocks from notes
function getCleanUserNotes(notes) {
  if (!notes) return "";
  return notes
    .replace(/\[STUDENT & YEARBOOK DETAILS\][\s\S]*?(?=(\n\n\[|$))/gi, "")
    .replace(/\[SELECTED ADD-ONS\][\s\S]*?(?=(\n\n\[|$))/gi, "")
    .trim();
}

// 7-Stage Studio Milestone definitions matching BookingProgressPage
const STUDIO_STAGES = [
  { step: 1, title: "Order Registered", desc: "Logged in studio calendar" },
  { step: 2, title: "Wardrobe & Sizing", desc: "Attire & toga allocation" },
  { step: 3, title: "Camera Bay Shoot", desc: "Studio portrait capture" },
  { step: 4, title: "Digital Proofing", desc: "Client gallery review" },
  { step: 5, title: "Master Retouching", desc: "High-end aesthetic polish" },
  { step: 6, title: "Print & Framing", desc: "Archival lab production" },
  { step: 7, title: "Studio Handover", desc: "In-person claiming at desk" },
];

export default function BookingDetailsPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    getBookingById(id).then(({ data, error }) => {
      if (error) setError(error.message);
      else setBooking(data);
      setLoading(false);
    });
  }, [user, id]);

  const handleCancelClick = () => {
    setDialog({
      title: "Cancel This Booking?",
      message: "This will permanently cancel your session. If you paid a downpayment, please contact our studio desk for the refund policy.",
      confirmLabel: "Yes, Cancel Booking",
      cancelLabel: "Keep Booking",
      confirmClass: "bg-red-600 text-white hover:bg-red-700",
      icon: XCircle,
      iconColor: "text-red-500",
      iconBg: "bg-red-50",
      onConfirm: async () => {
        setCancelling(true);
        const { error } = await cancelBooking(id);
        setCancelling(false);
        if (error) {
          setToast({ type: "error", message: "Failed to cancel booking. Please try again." });
        } else {
          setBooking(prev => ({ ...prev, status: "CANCELLED" }));
          setToast({ type: "success", message: "Booking cancelled successfully." });
        }
      },
    });
  };

  // Structured Student Dossier parsing
  const studentDossier = useMemo(() => {
    if (!booking) return null;
    const existing = booking.student_details || {};
    const parsed = parseStudentDetailsFromNotes(booking.notes) || {};

    const typeMatch = booking.notes?.match(/• Type:\s*(.*)/i);
    const strandMatch = booking.notes?.match(/• Degree \/ (?:Strand|Program):\s*(.*)/i);
    const campusMatch = booking.notes?.match(/• Campus \/ Address:\s*(.*)/i);
    const batchMatch = booking.notes?.match(/• Batch:\s*(.*)/i);

    const school = existing.school || parsed.school || "";
    const batch = existing.batch || parsed.batch || batchMatch?.[1]?.trim() || "";
    const section = existing.section || parsed.section || "";
    const student_id = existing.student_id || parsed.student_id || "";
    const course = existing.course || parsed.course || strandMatch?.[1]?.trim() || "";
    const school_address = existing.school_address || parsed.school_address || campusMatch?.[1]?.trim() || "";
    const education_type = existing.education_type || parsed.education_type || typeMatch?.[1]?.trim() || "";

    if (!school && !section && !student_id && !course && !batch) return null;

    return {
      school,
      batch,
      section,
      student_id,
      course,
      school_address,
      education_type
    };
  }, [booking]);

  // Clean notes without duplicate machine text
  const cleanNotes = useMemo(() => {
    return booking ? getCleanUserNotes(booking.notes) : "";
  }, [booking]);

  // Studio Fulfillment Mode from profile or default
  const fulfillmentMode = useMemo(() => {
    const specs = profile?.studio_specs || {};
    return specs.fulfillment_mode === "STUDIO_DELIVERY" || specs.preferred_courier === "studio_delivery"
      ? "STUDIO_DELIVERY"
      : "STUDIO_PICKUP";
  }, [profile]);

  // Current stage computation for the 7-stage pipeline
  const stageInfo = useMemo(() => {
    if (!booking) return { currentStep: 2, pct: 30, label: "Stage 2/7 · Wardrobe Calibration" };
    const s = (booking.status || "PENDING").toUpperCase();
    if (s === "COMPLETED") return { currentStep: 7, pct: 100, label: "Stage 7/7 · Studio Ready & Handover" };
    if (s === "CONFIRMED") return { currentStep: 3, pct: 50, label: "Stage 3/7 · Camera Bay Session Ready" };
    if (s === "IN_PROGRESS" || s === "CAPTURE" || s === "EDITING") return { currentStep: 5, pct: 70, label: "Stage 5/7 · Master Retouching & Polish" };
    if (s === "CANCELLED" || s === "REJECTED") return { currentStep: 1, pct: 10, label: "Order Concluded" };
    return { currentStep: 2, pct: 30, label: "Stage 2/7 · Wardrobe & Sizing Calibration" };
  }, [booking]);

  // Financial breakdown & downpayment state
  const financialInfo = useMemo(() => {
    if (!booking) return { totalAmount: 0, downPaid: 0, remBalance: 0, needsDownpayment: false, downRequired: 0 };
    const totalAmount = Number(booking.total_amount || 0);
    const downPaid = Number(booking.down_payment_amount || 0);
    const remBalance = booking.remaining_balance !== undefined && booking.remaining_balance !== null
      ? Number(booking.remaining_balance)
      : Math.max(0, totalAmount - downPaid);
    const isUnpaid = !booking.payment_status || (booking.payment_status || '').toUpperCase() === 'UNPAID';
    const needsDownpayment = (isUnpaid || remBalance > 0) && (!booking.down_payment_confirmed && downPaid === 0);
    const downRequired = Math.min(remBalance, Math.max(500, Math.round(totalAmount * 0.5)));
    return { totalAmount, downPaid, remBalance, needsDownpayment, downRequired };
  }, [booking]);

  if (loading) {
    return (
      <div className="h-full min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={36} />
        <span className="text-xs font-body text-neutral-400 mt-3">Loading Session Details...</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
          <AlertCircle size={28} />
        </div>
        <h1 className="text-2xl font-heading text-primary dark:text-white mb-2">Booking Not Found</h1>
        <p className="font-body text-neutral-500 max-w-md mb-6">{error || "The session record could not be located."}</p>
        <Link to="/dashboard/bookings" className="btn-primary">Back to My Bookings</Link>
      </div>
    );
  }

  if (booking.is_deleted) {
    return (
      <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center mb-4 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 mb-3">
          Order Removed / Cancelled
        </div>
        <h1 className="text-2xl font-heading text-primary dark:text-white font-bold mb-2">
          Order #{booking.booking_number || 'N/A'} Has Been Removed
        </h1>
        <p className="font-body text-neutral-600 dark:text-neutral-300 text-sm mb-4 leading-relaxed">
          This booking order has been cancelled and removed from active studio records by studio administration.
        </p>
        {booking.deletion_reason && (
          <div className="w-full bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3.5 text-xs text-neutral-600 dark:text-neutral-300 mb-6 text-left">
            <span className="font-bold text-neutral-800 dark:text-neutral-200 block mb-1">Reason provided:</span>
            <span>"{booking.deletion_reason}"</span>
          </div>
        )}
        <p className="font-body text-neutral-400 text-xs mb-6">
          If you have questions regarding this cancellation or have already submitted a downpayment, please visit or contact our studio reception desk with your booking reference.
        </p>
        <div className="flex items-center gap-3">
          <Link to="/dashboard/bookings" className="btn-primary text-xs">
            Return to My Bookings
          </Link>
          <Link to="/dashboard/notifications" className="btn-outline text-xs">
            View Notifications
          </Link>
        </div>
      </div>
    );
  }

  const status = booking.status?.toUpperCase() || "PENDING";
  const statusBadge = getStatusBadge(status);
  const statusLabel = getStatusLabel(status);

  const isSchoolPartner = booking.student_details?.booking_mode === 'SCHOOL_PARTNER' ||
    (booking.notes || '').includes('School Pictorial') ||
    (booking.notes || '').includes('Official School Partner') ||
    (booking.notes || '').includes('School Partner Agreement');

  const displayDate = booking.event_date
    ? new Date(booking.event_date).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
      })
    : (isSchoolPartner ? "Scheduled with school (TBD)" : "Date Pending");
  const displayTime = booking.preferred_time?.substring(0, 5) || (isSchoolPartner ? "Coordinated with school" : "TBD");

  const { name: cleanLocationName, mapUrl: googleMapsUrl } = getCleanLocation(booking.location);

  // Verification code formatted cleanly
  const formattedToken = booking.booking_token 
    ? `EK-VER-${booking.booking_token.slice(0, 8).toUpperCase()}`
    : `EK-VER-${booking.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-12 space-y-6">

      {/* Global UI helpers */}
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog dialog={dialog} onClose={() => setDialog(null)} loading={cancelling} />

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImg(null)}
        >
          <img src={lightboxImg} alt="Reference" className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl border border-white/20" />
        </div>
      )}

      {/* QR Code Quick Modal */}
      {showQRModal && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-gold/30 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-primary dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Close"
            >
              <XCircle size={20} />
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-bold font-body uppercase tracking-wider mb-2">
              <QrCode size={13} /> Official Studio Gate Pass
            </div>
            <h3 className="font-heading text-2xl text-primary dark:text-white font-bold">
              #{booking.booking_number}
            </h3>
            <p className="text-xs text-neutral-500 font-body mb-4">
              Present at studio front desk upon arrival for instant check-in
            </p>
            <div className="p-3 bg-white rounded-2xl border border-neutral-200">
              <QRPass
                bookingToken={booking.booking_token || booking.id}
                bookingNumber={booking.booking_number}
                qrCodePath={booking.qr_code_path}
                size={220}
                showActions={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Top Bar: Navigation & Quick Actions ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard/bookings"
          className="inline-flex items-center gap-2 text-xs font-body font-medium text-neutral-500 hover:text-primary dark:hover:text-white transition-colors bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-200/80 dark:border-neutral-700 shadow-2xs"
        >
          <ArrowLeft size={14} /> Back to My Bookings
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/progress"
            className="inline-flex items-center gap-1.5 text-xs font-body font-bold text-gold hover:text-gold-dark bg-gold/10 px-3 py-1.5 rounded-lg border border-gold/25 transition-colors shadow-2xs"
          >
            <Layers size={13} />
            <span>Open Session Tracker</span>
          </Link>
          {status !== "CANCELLED" && (
            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-body font-bold text-primary dark:text-white bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 px-3 py-1.5 rounded-lg border border-neutral-200/80 dark:border-neutral-700 transition-colors shadow-2xs"
            >
              <QrCode size={13} className="text-gold" />
              <span>QR Pass</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Two Column Space-Oriented Layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT COLUMN: Primary Dossier (8 cols) ─────────────────────────── */}
        <div className="lg:col-span-8 space-y-6">

          {/* 1. Master Session Hero Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xs border border-neutral-200/80 dark:border-neutral-800 overflow-hidden">
            
            {/* Elegant Header Banner with Ambient Backdrop */}
            <div className="relative h-44 sm:h-48 w-full bg-neutral-900 overflow-hidden">
              {booking.service?.cover_image ? (
                <img
                  src={booking.service.cover_image}
                  alt={booking.service.name}
                  className="w-full h-full object-cover opacity-60 scale-105 filter blur-xs"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-neutral-900 via-primary to-neutral-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-900/40 to-transparent" />

              {/* Badges on Banner */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-10">
                <span className="font-body text-xs font-bold text-white bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                  #{booking.booking_number}
                </span>
                <span className={`px-3 py-1 rounded-full border text-xs font-body font-bold uppercase tracking-wider backdrop-blur-md ${statusBadge}`}>
                  {statusLabel}
                </span>
              </div>

              {/* Title & Service Details overlaid on Banner Bottom */}
              <div className="absolute bottom-4 left-4 right-4 z-10">
                <div className="flex items-center gap-2 text-gold text-xs font-body font-medium mb-1">
                  <Camera size={13} />
                  <span>Graduation Studio Portfolio</span>
                  {booking.tier_name && <span>· Set {booking.tier_name}</span>}
                </div>
                <h1 className="font-heading text-xl sm:text-2xl text-white font-bold tracking-tight truncate drop-shadow-xs">
                  {booking.service?.name || "Senior High Graduation Package"}
                </h1>
                <p className="text-neutral-300 text-xs font-body mt-0.5">
                  Booked on {new Date(booking.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* 2. Structured 4-Pill Info Strip */}
            <div className="p-4 sm:p-6 bg-neutral-50/50 dark:bg-neutral-800/30 border-b border-neutral-100 dark:border-neutral-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-body">
                {/* Date & Time */}
                <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700 flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-gold/10 text-gold shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Session Schedule</span>
                    <p className="font-bold text-primary dark:text-white truncate mt-0.5">{displayDate}</p>
                    <span className="text-[11px] text-gold font-semibold">{displayTime}</span>
                  </div>
                </div>

                {/* Studio Location */}
                <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700 flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-gold/10 text-gold shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Studio Venue</span>
                    <p className="font-bold text-primary dark:text-white truncate mt-0.5" title={cleanLocationName}>
                      {cleanLocationName}
                    </p>
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-gold hover:underline inline-flex items-center gap-1 font-semibold mt-0.5"
                    >
                      <span>Google Maps</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Payment & Invoicing */}
                <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700 flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-gold/10 text-gold shrink-0">
                    <CreditCard size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Invoiced Amount</span>
                    <p className="font-bold text-primary dark:text-white truncate mt-0.5">
                      ₱{Number(booking.total_amount || 0).toLocaleString()}
                    </p>
                    <span className="text-[11px] text-neutral-500 font-semibold">
                      {getPaymentLabel(booking.payment_status)}
                    </span>
                  </div>
                </div>

                {/* Fulfillment / Handover */}
                <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700 flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-gold/10 text-gold shrink-0">
                    <Building size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Handover Mode</span>
                    <p className="font-bold text-primary dark:text-white truncate mt-0.5">
                      {fulfillmentMode === "STUDIO_DELIVERY" ? "Studio Dispatch" : "In-Person Claim"}
                    </p>
                    <span className="text-[11px] text-gold font-semibold truncate block">
                      {fulfillmentMode === "STUDIO_DELIVERY" ? "Direct Studio Courier" : "Cebu Front Counter"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Main Dossier Body */}
            <div className="p-6 space-y-6">

              {/* School Agreement Schedule Callout */}
              {isSchoolPartner && !booking.event_date && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300/80 dark:border-amber-800 flex items-start gap-3.5 text-xs font-body text-amber-950 dark:text-amber-200 animate-fade-in shadow-xs">
                  <div className="p-2 rounded-xl bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0">
                    <GraduationCap size={22} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold uppercase text-[10px] tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/80 px-2 py-0.5 rounded">
                        School Agreement Policy
                      </span>
                      <span className="font-bold text-amber-700 dark:text-amber-400 text-xs">
                        Coordinated Batch Scheduling
                      </span>
                    </div>
                    <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">
                      Your graduation shoot is part of an official agreement between E-Kodak Studio and <strong>{booking.student_details?.school || 'your institution'}</strong>. Exact photoshoot dates and batch time slots are designated by section in direct coordination with your school administration. Once finalized, your official schedule will be posted here and sent via SMS/notification.
                    </p>
                  </div>
                </div>
              )}

              {/* Academic & Yearbook Dossier Card */}
              {studentDossier && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gold/5 dark:bg-gold/10 border border-gold/30 space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-gold/20 pb-2.5">
                    <div className="flex items-center gap-2 text-gold font-heading font-bold text-sm">
                      <GraduationCap size={18} />
                      <span>Academic & Yearbook Batching Details</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {studentDossier.batch && (
                        <span className="text-[10px] font-body font-bold uppercase tracking-wider bg-gold text-primary px-2.5 py-0.5 rounded-md">
                          {studentDossier.batch}
                        </span>
                      )}
                      {studentDossier.section && (
                        <span className="text-[10px] font-body font-bold uppercase tracking-wider bg-neutral-900 text-white px-2.5 py-0.5 rounded-md">
                          Section {studentDossier.section}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-body">
                    <div className="bg-white/80 dark:bg-neutral-800/80 p-2.5 rounded-xl border border-gold/20">
                      <span className="text-neutral-400 text-[10px] uppercase block">Institution / School</span>
                      <span className="font-bold text-primary dark:text-white truncate block mt-0.5">
                        {studentDossier.school || "E-Kodak Partner Campus"}
                      </span>
                    </div>

                    <div className="bg-white/80 dark:bg-neutral-800/80 p-2.5 rounded-xl border border-gold/20">
                      <span className="text-neutral-400 text-[10px] uppercase block">Degree / Strand</span>
                      <span className="font-semibold text-primary dark:text-neutral-200 truncate block mt-0.5">
                        {studentDossier.course || "General Academic"}
                        {studentDossier.education_type ? ` (${studentDossier.education_type})` : ""}
                      </span>
                    </div>

                    <div className="bg-white/80 dark:bg-neutral-800/80 p-2.5 rounded-xl border border-gold/20">
                      <span className="text-neutral-400 text-[10px] uppercase block">Batch &amp; Section</span>
                      <span className="font-bold text-gold truncate block mt-0.5 font-body">
                        {studentDossier.batch ? `${studentDossier.batch} · ` : ''}{studentDossier.section ? `Sec ${studentDossier.section}` : '—'}
                      </span>
                    </div>

                    <div className="bg-white/80 dark:bg-neutral-800/80 p-2.5 rounded-xl border border-gold/20">
                      <span className="text-neutral-400 text-[10px] uppercase block">Student ID Number</span>
                      <span className="font-bold text-primary dark:text-neutral-200 truncate block mt-0.5 font-body">
                        {studentDossier.student_id || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Designated Studio Photographer */}
              <div>
                <span className="text-xs font-body text-neutral-400 uppercase tracking-wider block mb-2 font-semibold">
                  Designated Studio Photographer
                </span>
                {booking.photographer?.profile ? (
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200/70 dark:border-neutral-700 flex items-center gap-4">
                    {booking.photographer.profile.avatar_url ? (
                      <img 
                        src={booking.photographer.profile.avatar_url} 
                        alt={booking.photographer.profile.first_name} 
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-gold/40 shrink-0" 
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gold/15 text-gold flex items-center justify-center font-heading font-bold text-lg ring-2 ring-gold/30 shrink-0">
                        {booking.photographer.profile.first_name?.[0]}{booking.photographer.profile.last_name?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading text-base font-bold text-primary dark:text-white">
                          {booking.photographer.profile.first_name} {booking.photographer.profile.last_name}
                        </h4>
                        <span className="text-[10px] font-body font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                          Bay Assigned
                        </span>
                      </div>
                      <p className="text-xs text-gold font-body font-medium mt-0.5">
                        {booking.photographer.specialization || "Professional Graduation Portrait Artist"}
                      </p>
                      {booking.photographer.bio && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-body mt-1 italic line-clamp-1">
                          "{booking.photographer.bio}"
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center gap-3 text-xs font-body text-neutral-500 dark:text-neutral-400">
                    <div className="p-2 rounded-xl bg-neutral-200/50 dark:bg-neutral-700 text-neutral-400">
                      <Camera size={16} />
                    </div>
                    <span>A dedicated studio portrait artist will be designated to your bay once the schedule is verified.</span>
                  </div>
                )}
              </div>

              {/* Selected Add-ons Breakdown */}
              {Array.isArray(booking.selected_add_ons) && booking.selected_add_ons.length > 0 && (
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-xs font-body text-neutral-400 uppercase tracking-wider block mb-2.5 font-semibold">
                    Custom Studio Add-ons & Upgrades
                  </span>
                  <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
                    {booking.selected_add_ons.map((addon, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between items-center text-xs font-body">
                        <span className="text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-gold" />
                          {addon.name}
                        </span>
                        <span className="font-bold text-primary dark:text-white">
                          +₱{Number(addon.price || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Special Instructions (De-duplicated) */}
              {cleanNotes && (
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-xs font-body text-neutral-400 uppercase tracking-wider block mb-1.5 font-semibold">
                    Client Special Instructions & Requests
                  </span>
                  <p className="font-body text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {cleanNotes}
                  </p>
                </div>
              )}

              {/* Reference Peg Images (if uploaded) */}
              {booking.reference_images?.length > 0 && (
                <div>
                  <span className="text-xs font-body text-neutral-400 uppercase tracking-wider block mb-2.5 font-semibold">
                    Client Reference Pegs ({booking.reference_images.length})
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {booking.reference_images.map((path, idx) => {
                      const url = getReferenceImageUrl(path);
                      return (
                        <button
                          key={idx}
                          onClick={() => setLightboxImg(url)}
                          className="group relative w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:border-gold transition-colors"
                        >
                          <img src={url} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <FileImage size={18} className="text-white" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cancel Action (Only when PENDING) */}
              {status === "PENDING" && (
                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs font-body text-neutral-400">
                    Session schedule can be cancelled free of charge while under review.
                  </div>
                  <button
                    onClick={handleCancelClick}
                    disabled={cancelling}
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-body font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-3.5 py-2 rounded-xl transition-all"
                  >
                    <XCircle size={14} />
                    <span>Cancel This Booking</span>
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* 4. Unified 7-Stage Studio Milestone Pipeline Tracker */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-xs border border-neutral-200/80 dark:border-neutral-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="font-heading text-lg text-primary dark:text-white font-bold flex items-center gap-2">
                  <Layers size={18} className="text-gold" />
                  <span>Studio Production Pipeline</span>
                </h3>
                <p className="text-xs font-body text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Live status across our 7 official studio production milestones
                </p>
              </div>
              <Link
                to="/dashboard/progress"
                className="text-xs font-body font-bold text-gold hover:text-gold-dark inline-flex items-center gap-1"
              >
                <span>Interactive Tracker</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 pt-2">
              {STUDIO_STAGES.map((s) => {
                const isCompleted = s.step < stageInfo.currentStep || (stageInfo.currentStep === 7 && s.step === 7);
                const isCurrent = s.step === stageInfo.currentStep && stageInfo.currentStep !== 7;
                
                return (
                  <div
                    key={s.step}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isCompleted
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40"
                        : isCurrent
                        ? "bg-gold/10 dark:bg-gold/15 border-gold/40 ring-1 ring-gold/30 shadow-2xs"
                        : "bg-neutral-50/50 dark:bg-neutral-800/40 border-neutral-200/60 dark:border-neutral-800 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-body font-bold text-neutral-400">
                        0{s.step}
                      </span>
                      {isCompleted ? (
                        <CheckCircle size={13} className="text-emerald-600 dark:text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                      )}
                    </div>
                    <p className={`text-xs font-bold leading-snug font-heading truncate ${
                      isCurrent ? "text-gold-dark dark:text-gold" : isCompleted ? "text-emerald-900 dark:text-emerald-300" : "text-neutral-500 dark:text-neutral-400"
                    }`}>
                      {s.title}
                    </p>
                    <p className="text-[10px] font-body text-neutral-400 truncate mt-0.5">
                      {s.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── RIGHT SIDEBAR: Studio Gate Pass & Verification (4 cols) ───────── */}
        <div className="lg:col-span-4 space-y-6">

          {/* 1. Official Studio QR Pass Card */}
          {status !== "CANCELLED" && (booking.booking_token || booking.booking_number) && (
            <div className="bg-primary text-white rounded-3xl p-6 shadow-warm-md text-center relative overflow-hidden border border-neutral-800">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-gold text-[10px] font-bold font-body uppercase tracking-wider mb-4 border border-gold/20">
                  <QrCode size={12} />
                  {status === "PENDING" ? "Pre-Registration Studio Pass" : "Active Studio Gate Pass"}
                </div>
                
                <div className="p-3 bg-white rounded-2xl border border-white/20 shadow-inner inline-block mx-auto">
                  <QRPass
                    bookingToken={booking.booking_token || booking.id}
                    bookingNumber={booking.booking_number}
                    qrCodePath={booking.qr_code_path}
                    size={170}
                    showActions={true}
                  />
                </div>

                <p className="text-[11px] text-neutral-300 mt-4 font-body leading-relaxed">
                  Present this digital pass at the studio front desk upon arrival for instant check-in verification.
                </p>
              </div>
            </div>
          )}

          {/* 2. Studio Security & Verification Dossier */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-xs border border-neutral-200/80 dark:border-neutral-800 space-y-4">
            <h3 className="font-heading text-primary dark:text-white text-base font-bold flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <ShieldCheck size={18} className="text-gold" />
              <span>Studio Verification Info</span>
            </h3>

            <div className="space-y-3 font-body text-xs">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Security Token</span>
                <div className="mt-1 flex items-center justify-between p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700">
                  <span className="font-bold text-primary dark:text-white tracking-wider">{formattedToken}</span>
                  <span className="text-[9px] font-bold bg-gold/15 text-gold px-2 py-0.5 rounded">AUTHENTICATED</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Production State</span>
                <p className="font-body text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                  {status === "PENDING" && "Your session schedule is under studio desk review. We will confirm your bay slot shortly."}
                  {status === "CONFIRMED" && "Booking confirmed! Please arrive 15 minutes prior to your shoot for wardrobe calibration."}
                  {status === "COMPLETED" && "Session completed. Archival prints and framed packages are prepared for studio handover."}
                  {status === "CANCELLED" && "This session booking was cancelled."}
                  {status === "REJECTED" && "Studio could not accommodate the requested schedule. Please select an alternate date."}
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                <span className="text-neutral-400">Payment Status</span>
                <span className={`font-bold px-2.5 py-1 rounded-lg ${
                  financialInfo.needsDownpayment
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-primary dark:text-white'
                }`}>
                  {financialInfo.needsDownpayment ? 'Downpayment Pending' : getPaymentLabel(booking.payment_status)}
                </span>
              </div>
            </div>
          </div>

          {/* 2.5 Studio Financial & Downpayment Ledger Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-xs border border-neutral-200/80 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h3 className="font-heading text-primary dark:text-white text-base font-bold flex items-center gap-2">
                <CreditCard size={18} className="text-gold" />
                <span>Financial & Billing Status</span>
              </h3>
              <span className={`text-[10px] font-body font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                financialInfo.needsDownpayment
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : booking.payment_status === 'PAID'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
              }`}>
                {financialInfo.needsDownpayment ? 'Downpayment Pending' : getPaymentLabel(booking.payment_status)}
              </span>
            </div>

            <div className="space-y-2 text-xs font-body">
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-400">Total Session Fee</span>
                <span className="font-bold text-primary dark:text-white">₱{financialInfo.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-400">Required Downpayment (50%)</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">₱{financialInfo.downRequired.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-400">Amount Paid So Far</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₱{financialInfo.downPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 pt-1.5 font-bold text-sm">
                <span className="text-neutral-700 dark:text-neutral-300">Remaining Balance</span>
                <span className="text-primary dark:text-gold">₱{financialInfo.remBalance.toLocaleString()}</span>
              </div>
            </div>

            {financialInfo.needsDownpayment && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-body space-y-1">
                <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Downpayment Required
                </p>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Please deposit the ₱{financialInfo.downRequired.toLocaleString()} downpayment via GCash, Maya, or bank transfer to confirm studio bay assignment.
                </p>
              </div>
            )}

            {financialInfo.remBalance > 0 && (
              <div className="pt-2 flex flex-col gap-2">
                {financialInfo.needsDownpayment && (
                  <Link
                    to="/dashboard/payments"
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <CreditCard size={14} /> Pay Downpayment ₱{financialInfo.downRequired.toLocaleString()}
                  </Link>
                )}
                <Link
                  to="/dashboard/payments"
                  className="w-full py-2.5 px-3 rounded-xl bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 border border-neutral-700/60"
                >
                  <Receipt size={14} className="text-gold" />
                  <span>{financialInfo.needsDownpayment ? `Settle Full Balance ₱${financialInfo.remBalance.toLocaleString()}` : `Settle Remaining ₱${financialInfo.remBalance.toLocaleString()}`}</span>
                </Link>
              </div>
            )}
          </div>

          {/* 3. Studio Fulfillment & Handover (Strictly No 3rd Party Carriers) */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-xs border border-neutral-200/80 dark:border-neutral-800 space-y-3.5">
            <h3 className="font-heading text-primary dark:text-white text-base font-bold flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <Building size={18} className="text-gold" />
              <span>Studio Fulfillment & Handover</span>
            </h3>

            <div className="space-y-3 text-xs font-body">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400 uppercase">Selected Mode</span>
                  <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded">
                    {fulfillmentMode === "STUDIO_DELIVERY" ? "Direct Studio Dispatch" : "In-Person Studio Counter"}
                  </span>
                </div>
                <p className="text-primary dark:text-white font-bold pt-1">
                  {fulfillmentMode === "STUDIO_DELIVERY"
                    ? "Direct Studio Personnel Delivery"
                    : "Studio Counter Claiming"}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-body leading-relaxed">
                  {fulfillmentMode === "STUDIO_DELIVERY"
                    ? "Our in-house team directly delivers your framed prints and keepsake parcel."
                    : "Collect your packaged framed portraits at Cebu Studio front desk upon completion."}
                </p>
              </div>

              <Link
                to="/dashboard/progress"
                className="w-full text-center py-2 px-3 rounded-xl bg-gold/15 hover:bg-gold/25 text-gold font-body font-bold text-xs transition-colors border border-gold/30 flex items-center justify-center gap-1.5"
              >
                <span>Manage Claiming Preferences</span>
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* 4. Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <Link 
              to="/dashboard/progress" 
              className="btn-primary w-full py-2.5 text-xs text-center flex items-center justify-center gap-2"
            >
              <Layers size={14} />
              <span>Track 7-Stage Progress</span>
            </Link>
            <Link 
              to="/dashboard/book" 
              className="btn-outline w-full py-2.5 text-xs text-center flex items-center justify-center gap-2"
            >
              <Camera size={14} />
              <span>Book Another Session</span>
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}