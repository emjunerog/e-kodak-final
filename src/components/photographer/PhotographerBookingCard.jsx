import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Sparkles,
  Loader2,
  Upload,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GraduationCap,
  Palette,
  MessageSquare,
  FileImage,
  IdCard,
  Building2,
  BookOpen,
  Wallet,
  Eye,
  Shirt,
  AlertCircle,
  Camera,
  CheckCircle2,
  PackageCheck,
  UserCheck,
  CalendarCheck,
  Copy,
  Package,
  CheckSquare,
} from 'lucide-react';
import BookingLifecycleBadge from '../admin/BookingLifecycleBadge';
import { parseBookingBrief } from '../../services/photographerService';
import { getReferenceImageUrl } from '../../services/bookingService';

// Format time from 24h (e.g. 09:00:00) to 12h (9:00 AM)
function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return timeStr;
  const minute = parts[1] || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}

// Format date to human readable (e.g. Fri, Sep 25, 2026)
function formatDatePretty(dateStr) {
  if (!dateStr) return 'Date TBD';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format raw strings like 'classic_grey' to 'Classic Grey'
function formatSpecName(str) {
  if (!str) return '';
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PhotographerBookingCard({
  booking,
  isExpanded,
  onToggleExpand,
  updatingId,
  onAccept,
  onDecline,
  onAdvanceStatus,
  onReschedule,
  onReportIssue,
}) {
  const [previewImage, setPreviewImage] = useState(null);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const brief = parseBookingBrief(booking);
  const { academicSpecs, hasAcademicSpecs, _weddingSpecs, _corporateSpecs, stylePegs, cleanNotes, clientName, cleanLocation } = brief;

  const isUpdating = updatingId === booking.id;

  const totalAmount = Number(booking.total_amount || 0);
  const remainingBalance = Number(booking.remaining_balance ?? Math.max(0, totalAmount - Number(booking.down_payment_amount || 0)));
  const downPayment = Math.max(0, totalAmount - remainingBalance);

  // Grab active tier details and highlights directly from database
  const tierList = Array.isArray(booking.service?.tiers) ? booking.service.tiers : [];
  const selectedTier = tierList.find(
    t => t.name?.toLowerCase().trim() === booking.tier_name?.toLowerCase().trim()
  ) || tierList[0] || null;

  const tierHighlights = Array.isArray(selectedTier?.highlights) ? selectedTier.highlights : [];
  const serviceInclusions = Array.isArray(booking.service?.inclusions) ? booking.service.inclusions : [];

  // Payments recorded from database
  const paymentsList = Array.isArray(booking.payments) ? booking.payments : [];
  const latestPayment = paymentsList[0] || null;

  const handleCopyBookingNumber = (e) => {
    e.stopPropagation();
    if (booking.booking_number) {
      navigator.clipboard?.writeText(booking.booking_number);
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    }
  };

  // Modern 6-Step Shoot Pipeline with Icons
  const LIFECYCLE_STEPS = [
    { key: 'PHOTOGRAPHER_ASSIGNED', label: 'Assigned', Icon: UserCheck },
    { key: 'CONFIRMED', label: 'Confirmed', Icon: CalendarCheck },
    { key: 'CAPTURE', label: 'Shoot', Icon: Camera },
    { key: 'EDITING', label: 'Editing', Icon: Sparkles },
    { key: 'READY', label: 'Ready', Icon: CheckCircle2 },
    { key: 'COMPLETED', label: 'Released', Icon: PackageCheck },
  ];

  const orderKeys = ['PENDING', 'PHOTOGRAPHER_ASSIGNED', 'CONFIRMED', 'CAPTURE', 'EDITING', 'PRINTING', 'READY', 'COMPLETED'];
  const currentIndex = orderKeys.indexOf(booking.status);

  return (
    <motion.div
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white shadow-xs w-full ${
        isExpanded
          ? 'border-gold ring-2 ring-gold/15 shadow-sm'
          : 'border-neutral-200/80 hover:border-gold/50 hover:shadow-xs'
      }`}
    >
      {/* ── 1. Clean Compact Header Bar ── */}
      <div
        onClick={onToggleExpand}
        className="p-4 sm:p-5 cursor-pointer select-none hover:bg-neutral-50/60 transition-colors"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Service Title, Badges & Booking Number */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold-dark shrink-0">
              {hasAcademicSpecs ? <GraduationCap size={20} /> : <Camera size={20} />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyBookingNumber}
                  className="font-mono text-[11px] font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 px-2 py-0.5 rounded-md border border-neutral-200/80 inline-flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copy booking number"
                >
                  <span>#{booking.booking_number}</span>
                  {copiedNumber ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} className="text-neutral-400" />}
                </button>

                <BookingLifecycleBadge
                  status={booking.status}
                  paymentStatus={booking.payment_status}
                  layout="inline"
                />

                {booking.tier_name && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gold/10 text-gold-dark border border-gold/25 flex items-center gap-1">
                    <Package size={11} />
                    <span>{booking.tier_name}</span>
                  </span>
                )}

                {academicSpecs?.isSchoolPartner && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <GraduationCap size={11} />
                    <span>School Partner</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <h3 className="font-heading text-base sm:text-lg font-bold text-primary tracking-tight truncate">
                  {booking.service?.name || 'Photoshoot Session'}
                </h3>
                {isExpanded && (
                  <>
                    <span className="text-neutral-300 hidden sm:inline">·</span>
                    <span className="text-xs font-semibold text-neutral-600 flex items-center gap-1">
                      <User size={12} className="text-gold" />
                      <span>{clientName}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Date, Time & Collapse Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200/80">
              <Calendar size={13} className="text-gold shrink-0" />
              <span>{formatDatePretty(booking.event_date)}</span>
              {booking.preferred_time && (
                <>
                  <span className="text-neutral-300">·</span>
                  <Clock size={12} className="text-neutral-400 shrink-0" />
                  <span className="font-mono text-[11px] text-neutral-600 font-bold">
                    {formatTime12h(booking.preferred_time)}
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                isExpanded
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200 hover:text-primary'
              }`}
              aria-label={isExpanded ? 'Collapse brief' : 'Expand full order details'}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {/* Quick Identity Strip - Show only when collapsed to prevent duplicate information */}
        {!isExpanded && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-neutral-100 text-xs text-neutral-600 font-body">
            {/* Client Name & Phone */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-bold text-primary">
                <User size={14} className="text-gold" />
                <span>{clientName}</span>
              </div>
              {booking.customer?.phone && (
                <a
                  href={`tel:${booking.customer.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-neutral-500 hover:text-gold transition-colors inline-flex items-center gap-1 font-mono text-[11px]"
                  title="Call client"
                >
                  <Phone size={11} className="text-neutral-400" />
                  <span>{booking.customer.phone}</span>
                </a>
              )}
            </div>

            {/* Location & Quick Balance */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-neutral-500">
                <MapPin size={13} className="text-gold shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-none">{cleanLocation.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-primary">₱{totalAmount.toLocaleString()}</span>
                {remainingBalance > 0 ? (
                  <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    Due: ₱{remainingBalance.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Paid
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Expanded Order Dossier ── */}
      {isExpanded && (
        <div className="px-4 sm:px-6 pb-5 pt-3 border-t border-neutral-200/80 bg-neutral-50/40 space-y-4 animate-fade-in text-xs font-body">
          
          {/* ── Visual Shoot Pipeline (Connected Icons) ── */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-neutral-200/80 shadow-2xs">
            <div className="flex items-center justify-between relative px-2 sm:px-6">
              {/* Background track */}
              <div className="absolute left-6 right-6 top-4 h-0.5 bg-neutral-200 -z-0" />
              
              {LIFECYCLE_STEPS.map((step) => {
                const stepIdx = orderKeys.indexOf(step.key);
                const isDone = currentIndex > stepIdx;
                const isCurrent = booking.status === step.key;

                return (
                  <div key={step.key} className="flex flex-col items-center gap-1 relative z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-neutral-900 text-gold ring-4 ring-gold/20 shadow-xs'
                          : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border-2 border-neutral-300 text-neutral-400'
                      }`}
                      title={`${step.label}: ${isCurrent ? 'Active Stage' : isDone ? 'Completed' : 'Upcoming'}`}
                    >
                      {isDone ? <Check size={14} className="stroke-[3]" /> : <step.Icon size={14} />}
                    </div>
                    <span
                      className={`text-[10px] font-semibold transition-colors ${
                        isCurrent ? 'text-primary font-bold' : isDone ? 'text-emerald-700' : 'text-neutral-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 3-Column Core Information Deck ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* Box 1: Customer & Studio Bay */}
            <div className="p-3.5 rounded-xl bg-white border border-neutral-200/80 space-y-2.5">
              <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-bold uppercase tracking-wider border-b border-neutral-100 pb-1.5">
                <User size={12} className="text-gold" />
                <span>Customer & Studio Bay</span>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-primary text-sm flex items-center gap-1.5">
                  <span>{clientName}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {booking.customer?.phone && (
                    <a
                      href={`tel:${booking.customer.phone}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 text-neutral-700 font-mono text-[11px] transition-colors"
                      title="Call client"
                    >
                      <Phone size={11} className="text-neutral-400" />
                      <span>{booking.customer.phone}</span>
                    </a>
                  )}

                  {booking.customer?.email && (
                    <a
                      href={`mailto:${booking.customer.email}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 text-neutral-700 text-[11px] transition-colors truncate max-w-full"
                      title="Email client"
                    >
                      <Mail size={11} className="text-neutral-400 shrink-0" />
                      <span className="truncate">{booking.customer.email}</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1 text-neutral-600 text-[11px] pt-1.5 border-t border-neutral-100">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin size={12} className="text-gold shrink-0" />
                    <span className="truncate">{cleanLocation.name}</span>
                  </div>
                  {cleanLocation.mapUrl && (
                    <a
                      href={cleanLocation.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-gold hover:text-gold-dark bg-gold/10 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 shrink-0"
                    >
                      <span>Map</span>
                      <ExternalLink size={9} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Box 2: Payment & Balance */}
            <div className="p-3.5 rounded-xl bg-white border border-neutral-200/80 space-y-2.5">
              <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-bold uppercase tracking-wider border-b border-neutral-100 pb-1.5">
                <Wallet size={12} className="text-gold" />
                <span>Payment & Balance</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Package Total:</span>
                  <span className="font-bold text-primary">₱{totalAmount.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Down Payment:</span>
                  <span className="font-medium text-emerald-700">
                    ₱{downPayment.toLocaleString()} {latestPayment?.payment_method ? `(${latestPayment.payment_method})` : ''}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-neutral-100">
                  {remainingBalance > 0 ? (
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200/70 flex items-center justify-between text-rose-700">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Balance Due:</span>
                      <span className="font-mono text-sm font-bold">₱{remainingBalance.toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200/70 flex items-center justify-between text-emerald-700">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Status:</span>
                      <span className="text-xs font-bold">Fully Paid</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Box 3: Session & Academic Specifications */}
            <div className="p-3.5 rounded-xl bg-white border border-neutral-200/80 space-y-2.5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap size={13} className="text-gold" />
                  <span>Session Specifications</span>
                </span>
                {academicSpecs?.type && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-gold/10 text-gold-dark">
                    {academicSpecs.type}
                  </span>
                )}
              </div>

              {hasAcademicSpecs ? (
                <div className="space-y-1.5">
                  {academicSpecs.school && (
                    <div className="flex items-start gap-1.5">
                      <Building2 size={12} className="text-neutral-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-primary text-xs block leading-tight truncate" title={academicSpecs.school}>
                          {academicSpecs.school}
                        </span>
                        {academicSpecs.campus && (
                          <span className="text-[10px] text-neutral-500 block truncate">{academicSpecs.campus}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {academicSpecs.degree && (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-700">
                      <BookOpen size={12} className="text-neutral-400 shrink-0" />
                      <span className="font-medium truncate">{academicSpecs.degree}</span>
                    </div>
                  )}

                  {(academicSpecs.section || academicSpecs.studentId) && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-600 pt-1 border-t border-neutral-100">
                      <IdCard size={12} className="text-neutral-400 shrink-0" />
                      {academicSpecs.section && (
                        <span className="px-1.5 py-0.5 rounded bg-neutral-100 font-medium">Sec: {academicSpecs.section}</span>
                      )}
                      {academicSpecs.studentId && (
                        <span className="px-1.5 py-0.5 rounded bg-neutral-100 font-mono font-medium">ID: {academicSpecs.studentId}</span>
                      )}
                    </div>
                  )}

                  {(academicSpecs.togaSize || academicSpecs.backdrop) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {academicSpecs.togaSize && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-medium">
                          <Shirt size={11} className="text-amber-700" />
                          <span>Toga: {academicSpecs.togaSize}</span>
                        </span>
                      )}
                      {academicSpecs.backdrop && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200 text-[11px] font-medium">
                          <Palette size={11} className="text-gold" />
                          <span>{formatSpecName(academicSpecs.backdrop)}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1 text-neutral-600 text-xs py-1">
                  <div className="font-bold text-primary">{booking.service?.name}</div>
                  <div className="text-[11px] text-neutral-500 line-clamp-2">
                    {booking.service?.tagline || booking.service?.description || 'Standard Studio Portrait Session'}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ── Package Inclusions & Deliverables (Compact Chips) ── */}
          {(tierHighlights.length > 0 || serviceInclusions.length > 0) && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-neutral-200/80 space-y-2">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <CheckSquare size={13} className="text-gold" />
                  <span>Session Deliverables ({booking.tier_name || 'Standard'})</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-medium">
                  {tierHighlights.length > 0 ? `${tierHighlights.length} items` : `${serviceInclusions.length} items`}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {(tierHighlights.length > 0 ? tierHighlights : serviceInclusions).map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200/70 text-[11px] font-medium text-neutral-800 transition-colors"
                  >
                    <Check size={12} className="text-emerald-600 shrink-0 stroke-[2.5]" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Customer Instructions & Style Pegs (If any exist) ── */}
          {(cleanNotes || stylePegs.length > 0 || booking.reference_images?.length > 0) && (
            <div className="p-3.5 rounded-xl bg-white border border-neutral-200/80 space-y-2.5">
              <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-bold uppercase tracking-wider border-b border-neutral-100 pb-1.5">
                <Palette size={12} className="text-gold" />
                <span>Client Notes & Style Pegs</span>
              </div>

              <div className="space-y-2.5">
                {cleanNotes && (
                  <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/70 text-xs text-neutral-700 flex items-start gap-2">
                    <MessageSquare size={13} className="text-amber-700 mt-0.5 shrink-0" />
                    <span className="leading-relaxed">"{cleanNotes}"</span>
                  </div>
                )}

                {stylePegs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {stylePegs.map((peg, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-[11px] font-medium border border-neutral-200"
                      >
                        {peg}
                      </span>
                    ))}
                  </div>
                )}

                {/* Reference Photo Thumbnails (Only rendered if images actually exist) */}
                {booking.reference_images?.length > 0 && (
                  <div className="pt-1">
                    <div className="text-[10px] text-neutral-400 font-semibold mb-1.5 flex items-center gap-1">
                      <FileImage size={11} className="text-gold" />
                      <span>Reference Photos ({booking.reference_images.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {booking.reference_images.map((img, idx) => {
                        const url = getReferenceImageUrl(img);
                        return (
                          <div
                            key={idx}
                            onClick={() => setPreviewImage(url)}
                            className="w-16 h-16 rounded-xl overflow-hidden border border-neutral-200 hover:border-gold transition-all relative group cursor-pointer"
                            title="Click to zoom reference photo"
                          >
                            <img src={url} alt={`Peg ${idx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye size={14} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Operational Action Toolbar ── */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
            {/* Left: Studio Bay Status & Escalation */}
            <div className="flex items-center gap-2">
              <div className="text-[11px] text-neutral-600 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Assigned to your bay</span>
              </div>

              {onReportIssue && (
                <button
                  type="button"
                  onClick={() => onReportIssue(booking)}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-neutral-600 hover:text-rose-700 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Report wardrobe, technical, or customer issue to front desk"
                >
                  <AlertCircle size={12} className="text-rose-500" />
                  <span>Report Bay Issue</span>
                </button>
              )}
            </div>

            {/* Right: Progression Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Newly Assigned: Accept / Decline */}
              {booking.status === 'PHOTOGRAPHER_ASSIGNED' && (
                <>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onAccept(booking)}
                    disabled={isUpdating}
                    className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Accept</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onDecline(booking)}
                    disabled={isUpdating}
                    className="h-9 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <X size={13} />
                    <span>Decline</span>
                  </motion.button>
                </>
              )}

              {/* Confirmed: Start Photoshoot */}
              {booking.status === 'CONFIRMED' && (
                <>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onAdvanceStatus(booking.id, 'CAPTURE')}
                    disabled={isUpdating}
                    className="h-9 px-3.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} className="text-gold" />}
                    <span>Start Shoot</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onDecline(booking)}
                    disabled={isUpdating}
                    className="h-9 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                    title="Decline and return to admin"
                  >
                    <X size={13} />
                    <span>Decline</span>
                  </motion.button>
                </>
              )}

              {/* In Capture: Send to Editing */}
              {booking.status === 'CAPTURE' && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onAdvanceStatus(booking.id, 'EDITING')}
                  disabled={isUpdating}
                  className="h-9 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} className="text-gold" />}
                  <span>To Editing</span>
                </motion.button>
              )}

              {/* In Editing: Mark Ready */}
              {booking.status === 'EDITING' && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onAdvanceStatus(booking.id, 'READY')}
                  disabled={isUpdating}
                  className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  <span>Mark Ready</span>
                </motion.button>
              )}

              {/* Reschedule */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onReschedule(booking)}
                className="h-9 px-3 rounded-xl border border-neutral-200/80 hover:border-gold bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                title="Send reschedule request to Admin"
              >
                <Clock size={12} className="text-neutral-400" />
                <span>Reschedule</span>
              </motion.button>

              {/* Upload Photos */}
              <Link
                to={`/photographer/uploads?booking=${booking.id}`}
                className="h-9 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Upload size={12} className="text-neutral-600" />
                <span>Upload Photos</span>
              </Link>
            </div>
          </div>

        </div>
      )}

      {/* ── Reference Photo Full-Screen Lightbox Modal ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-neutral-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-neutral-950/80">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileImage size={14} className="text-gold" />
                <span>Client Reference Photo</span>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ExternalLink size={15} />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto bg-black/40">
              <img
                src={previewImage}
                alt="Reference full size"
                className="max-h-[78vh] max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}