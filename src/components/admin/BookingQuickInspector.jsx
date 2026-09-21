import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
  X,
  Phone,
  MapPin,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ExternalLink,
  Save,
  Check,
  Loader2,
  Copy,
  GraduationCap,
  Layers,
  Building2,
  BookOpen,
  Users,
  IdCard,
  ChevronDown,
  ChevronUp,
  Camera,
  Sparkles,
  Package,
  XCircle,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateBookingStatus } from '../../services/bookingAdminService';
import BookingLifecycleBadge from './BookingLifecycleBadge';
import CustomDropdown from '../ui/CustomDropdown';

/**
 * Helper to format 24-hr time '09:00:00' to '9:00 AM'
 */
function formatTime(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Helper to split location string into address and Google Maps URL if present
 */
function parseLocation(locStr) {
  if (!locStr) return { address: null, mapUrl: null };
  const urlMatch = locStr.match(/https?:\/\/[^\s,]+/);
  if (urlMatch) {
    const mapUrl = urlMatch[0];
    const address = locStr.replace(mapUrl, '').replace(/,\s*$/, '').trim();
    return { address: address || 'Studio Location', mapUrl };
  }
  return { address: locStr, mapUrl: null };
}

/**
 * Helper to parse student & yearbook notes into structured key-values
 */
function parseStudentDetails(notes) {
  if (!notes) return { parsed: {}, hasParsed: false, rawRemaining: '' };

  const parsed = {};
  const lines = notes.split('\n');
  const remainingLines = [];
  let inSystemBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^\[(?:STUDENT & YEARBOOK DETAILS|SELECTED ADD-ONS|SYSTEM METADATA)\]/i.test(trimmed)) {
      inSystemBlock = true;
      continue;
    }

    if (/^\[(?:SPECIAL INSTRUCTIONS|CLIENT REMARKS|NOTES|INSTRUCTIONS)\]/i.test(trimmed)) {
      inSystemBlock = false;
      continue;
    }

    if (/^\[.*?\]$/.test(trimmed)) {
      inSystemBlock = false;
      continue;
    }

    if (inSystemBlock) {
      if (trimmed.startsWith('•')) {
        const match = trimmed.replace(/^•\s*/, '').match(/^([^:]+):\s*(.+)$/);
        if (match) {
          let key = match[1].trim();
          const val = match[2].trim();

          if (/school/i.test(key)) key = 'School';
          else if (/campus|address/i.test(key)) key = 'Campus';
          else if (/degree|program|strand|course/i.test(key)) key = 'Program / Strand';
          else if (/section|batch/i.test(key)) key = 'Section / Batch';
          else if (/student\s*id/i.test(key)) key = 'Student ID';
          else if (/toga/i.test(key)) key = 'Toga Size';
          else if (/height/i.test(key)) key = 'Height';
          else if (/type/i.test(key)) key = 'Level';

          if (val && val !== 'N/A' && val !== 'null') {
            parsed[key] = val;
          }
        }
        continue;
      }
      inSystemBlock = false;
    }

    const match = trimmed.match(/^[•\-\*]?\s*([^:]+):\s*(.+)$/);
    if (match && /school|campus|address|degree|program|strand|course|section|batch|student\s*id|toga|height|level|type/i.test(match[1])) {
      let key = match[1].trim();
      const val = match[2].trim();

      if (/school/i.test(key)) key = 'School';
      else if (/campus|address/i.test(key)) key = 'Campus';
      else if (/degree|program|strand|course/i.test(key)) key = 'Program / Strand';
      else if (/section|batch/i.test(key)) key = 'Section / Batch';
      else if (/student\s*id/i.test(key)) key = 'Student ID';
      else if (/toga/i.test(key)) key = 'Toga Size';
      else if (/height/i.test(key)) key = 'Height';
      else if (/type/i.test(key)) key = 'Level';

      if (val && val !== 'N/A' && val !== 'null' && (!parsed[key] || val.length > parsed[key].length)) {
        parsed[key] = val;
      }
    } else {
      remainingLines.push(trimmed);
    }
  }

  const hasParsed = Object.keys(parsed).length > 0;
  return { parsed, hasParsed, rawRemaining: remainingLines.join('\n').trim() };
}

// Status options for the CustomDropdown
const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending Review (Intake)', icon: Clock, dotColor: 'bg-gold' },
  { value: 'CONFIRMED', label: 'Confirmed (Approved)', icon: CheckCircle2, dotColor: 'bg-neutral-900' },
  { value: 'PHOTOGRAPHER_ASSIGNED', label: 'Photographer Assigned', icon: Camera, dotColor: 'bg-primary' },
  { value: 'CAPTURE', label: 'In Studio Bay (Capture)', icon: Camera, dotColor: 'bg-gold' },
  { value: 'EDITING', label: 'In Post-Processing (Editing)', icon: Sparkles, dotColor: 'bg-primary' },
  { value: 'PRINTING', label: 'Printing & Lab Output', icon: Layers, dotColor: 'bg-primary' },
  { value: 'READY', label: 'Ready for Client Pickup', icon: Package, dotColor: 'bg-gold' },
  { value: 'COMPLETED', label: 'Completed & Released', icon: CheckCircle2, dotColor: 'bg-neutral-900' },
  { value: 'CANCELLED', label: 'Cancelled', icon: XCircle, dotColor: 'bg-neutral-300' },
  { value: 'REJECTED', label: 'Rejected', icon: XCircle, dotColor: 'bg-neutral-500' },
];

/**
 * BookingQuickInspector.jsx
 * -------------------------
 * Slide-over inspector panel for administrators to inspect, manage, update status,
 * view student/intake specifications, and manage financial clearance.
 */
export default function BookingQuickInspector({
  booking,
  isOpen,
  onClose,
  onStatusUpdated,
}) {
  const { profile } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState(booking?.status || 'PENDING');
  const [remarks, setRemarks] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedNotes, setCopiedNotes] = useState(false);
  const [isStudentDetailsOpen, setIsStudentDetailsOpen] = useState(true);

  // Sync selected status when booking changes
  React.useEffect(() => {
    if (booking) {
      setSelectedStatus(booking.status);
      setRemarks('');
      setUpdateSuccess(false);
      setErrorMessage(null);
    }
  }, [booking?.id, booking?.status]);

  if (!isOpen || !booking) return null;

  const handleCopyRef = () => {
    if (booking.booking_number) {
      navigator.clipboard.writeText(booking.booking_number);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 1500);
    }
  };

  const handleCopyNotes = () => {
    if (booking.notes) {
      navigator.clipboard.writeText(booking.notes);
      setCopiedNotes(true);
      setTimeout(() => setCopiedNotes(false), 1500);
    }
  };

  const handleSaveStatus = async () => {
    if (selectedStatus === booking.status && !remarks.trim()) {
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);
    setUpdateSuccess(false);

    try {
      const { error } = await updateBookingStatus(
        booking.id,
        selectedStatus,
        remarks || `Status updated to ${selectedStatus} via Quick Inspector`,
        profile?.id
      );

      if (error) throw error;

      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2000);
      onStatusUpdated?.(booking.id, selectedStatus);
    } catch (err) {
      console.error('Failed to update booking status:', err);
      setErrorMessage(err.message || 'Failed to update status. Check permissions.');
    } finally {
      setIsUpdating(false);
    }
  };

  const formattedDate = booking.event_date
    ? new Date(booking.event_date).toLocaleDateString('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date Pending';

  const formattedTimeSlot = formatTime(booking.preferred_time);
  const { address: studioAddress, mapUrl } = parseLocation(booking.location);

  const totalAmount = parseFloat(booking.total_amount || booking.service?.base_price || 0);
  const downPayment = parseFloat(booking.down_payment_amount || 0);
  const remainingBal = parseFloat(booking.remaining_balance ?? (totalAmount - downPayment));
  const isPaid = booking.payment_status === 'PAID';

  const specs = booking.customer?.studio_specs || {};
  const { parsed: parsedNotes, _hasParsed: hasParsedNotes, rawRemaining } = parseStudentDetails(booking.notes);

  const studentData = {
    ...parsedNotes,
    School: parsedNotes['School'] || specs.university || '',
    Campus: parsedNotes['Campus'] || specs.campus || '',
    'Program / Strand': parsedNotes['Program / Strand'] || specs.degree || specs.course || '',
    'Section / Batch': parsedNotes['Section / Batch'] || specs.section || '',
    'Student ID': parsedNotes['Student ID'] || specs.student_id || '',
    'Toga Size': parsedNotes['Toga Size'] || specs.toga_size || booking.toga_size || '',
    Height: parsedNotes['Height'] || (specs.height_cm ? `${specs.height_cm} cm` : '') || '',
  };

  const hasStudentData = Object.values(studentData).some(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in font-body">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl border-l border-neutral-200 flex flex-col z-10 animate-slide-left overflow-hidden">
        
        {/* ── 1. Header ─────────── */}
        <div className="px-5 py-4 bg-neutral-950 text-white border-b border-neutral-800 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-gold bg-gold/15 px-2.5 py-0.5 rounded-full border border-gold/30">
                Direct Inspector
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="text-xs font-mono text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-md border border-white/10 cursor-pointer"
                title="Click to copy ref #"
              >
                <span>#{booking.booking_number}</span>
                {copiedRef ? <Check size={12} className="text-gold" /> : <Copy size={12} className="text-neutral-400" />}
              </button>
              {booking.tier_name && (
                <span className="text-[10px] font-bold uppercase text-gold bg-gold/10 px-2 py-0.5 rounded-md border border-gold/20">
                  {booking.tier_name}
                </span>
              )}
            </div>

            <h3 className="font-heading text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {booking.service?.name || 'Studio Photography Session'}
            </h3>

            <p className="text-xs text-neutral-400 truncate">
              Client: <strong className="text-neutral-200 font-semibold">{booking.customer?.first_name} {booking.customer?.last_name}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer mt-0.5"
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable Inspector Content ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
          
          {/* ── 2. Current Operational State & Direct Status Change ──────── */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Operational State
              </span>
              <BookingLifecycleBadge
                status={booking.status}
                paymentStatus={booking.payment_status}
                layout="inline"
              />
            </div>

            {/* Custom Dropdown for Status Change */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                Direct Status Change
              </label>

              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <CustomDropdown
                    value={selectedStatus}
                    onChange={(val) => setSelectedStatus(val)}
                    options={STATUS_OPTIONS}
                    className="w-full"
                    popoverWidth="w-full"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveStatus}
                  disabled={isUpdating || (selectedStatus === booking.status && !remarks.trim())}
                  className="py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all bg-neutral-900 hover:bg-neutral-800 text-gold border border-gold/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
                >
                  {isUpdating ? (
                    <Loader2 size={13} className="animate-spin text-gold" />
                  ) : updateSuccess ? (
                    <Check size={13} className="text-gold" />
                  ) : (
                    <Save size={13} className="text-gold" />
                  )}
                  <span>Apply</span>
                </button>
              </div>

              {/* Status Remarks */}
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional audit log remark..."
                className="w-full px-3 py-2 bg-neutral-50 focus:bg-white rounded-xl text-xs border border-neutral-200 focus:border-gold focus:ring-1 focus:ring-gold/20 outline-none text-neutral-800 transition-colors"
              />

              {updateSuccess && (
                <p className="text-[11px] text-neutral-900 font-semibold flex items-center gap-1 bg-gold/10 px-2.5 py-1 rounded-lg border border-gold/30">
                  <CheckCircle2 size={12} className="text-gold-dark" /> Status successfully updated and logged!
                </p>
              )}

              {errorMessage && (
                <p className="text-[11px] text-neutral-900 font-semibold flex items-center gap-1 bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-300">
                  <AlertCircle size={12} className="text-primary" /> {errorMessage}
                </p>
              )}
            </div>
          </div>

          {/* ── 3. Student & Yearbook Details ── */}
          {(booking.notes || hasStudentData) && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs transition-all">
              {/* Card Header with Toggle */}
              <div className="p-3.5 flex items-center justify-between bg-neutral-50/70 border-b border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsStudentDetailsOpen(!isStudentDetailsOpen)}
                  className="flex items-center gap-2 text-left cursor-pointer group flex-1 min-w-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-gold/15 text-gold-dark flex items-center justify-center shrink-0 border border-gold/20">
                    <GraduationCap size={14} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-800 group-hover:text-gold-dark transition-colors truncate">
                      Student & Yearbook Details
                    </h4>
                    {hasStudentData && (
                      <p className="text-[10px] text-neutral-400 truncate">
                        {studentData['School'] || 'Student Details'} {studentData['Program / Strand'] ? `· ${studentData['Program / Strand']}` : ''}
                      </p>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyNotes}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors cursor-pointer text-xs"
                    title="Copy Details"
                  >
                    {copiedNotes ? <Check size={13} className="text-gold-dark" /> : <Copy size={13} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsStudentDetailsOpen(!isStudentDetailsOpen)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors cursor-pointer"
                    title={isStudentDetailsOpen ? 'Collapse' : 'Expand'}
                  >
                    {isStudentDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Collapsible Content Area */}
              {isStudentDetailsOpen && (
                <div className="p-3.5 space-y-3 animate-in fade-in duration-150">
                  {hasStudentData ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* School */}
                      {studentData['School'] && (
                        <div className="sm:col-span-2 p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 flex items-start gap-2.5">
                          <Building2 size={15} className="text-gold-dark shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                              School / University
                            </span>
                            <span className="font-semibold text-neutral-900 leading-snug break-words">
                              {studentData['School']}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Program / Strand */}
                      {studentData['Program / Strand'] && (
                        <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 flex items-start gap-2">
                          <BookOpen size={14} className="text-gold-dark shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                              Degree / Strand
                            </span>
                            <span className="font-semibold text-neutral-900">
                              {studentData['Program / Strand']}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Student ID */}
                      {studentData['Student ID'] && (
                        <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 flex items-start gap-2">
                          <IdCard size={14} className="text-gold-dark shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                              Student ID
                            </span>
                            <span className="font-mono font-bold text-neutral-900 bg-white px-1.5 py-0.5 rounded border border-neutral-200 inline-block mt-0.5">
                              {studentData['Student ID']}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Campus */}
                      {studentData['Campus'] && (
                        <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 flex items-start gap-2">
                          <MapPin size={14} className="text-neutral-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                              Campus / Location
                            </span>
                            <span className="font-medium text-neutral-800">
                              {studentData['Campus']}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Section / Batch */}
                      {studentData['Section / Batch'] && (
                        <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 flex items-start gap-2">
                          <Users size={14} className="text-neutral-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                              Section / Batch
                            </span>
                            <span className="font-semibold text-neutral-900">
                              {studentData['Section / Batch']}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Toga Size */}
                      {studentData['Toga Size'] && (
                        <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 flex items-start gap-2">
                          <Layers size={14} className="text-gold-dark shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                              Toga Size
                            </span>
                            <span className="font-semibold text-neutral-900">
                              {studentData['Toga Size']}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Height */}
                      {studentData['Height'] && (
                        <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 flex items-start gap-2">
                          <Layers size={14} className="text-neutral-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                              Height
                            </span>
                            <span className="font-semibold text-neutral-900">
                              {studentData['Height']}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Special Client Remarks / Instructions */}
                  {rawRemaining && (
                    <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-xs text-neutral-700 font-body whitespace-pre-line leading-relaxed">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                        <FileText size={11} />
                        <span>Special Instructions & Notes</span>
                      </div>
                      {rawRemaining}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── 4. Customer Information ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3 shadow-2xs">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Customer Information
            </h4>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/15 text-gold-dark font-heading font-bold flex items-center justify-center text-sm border border-gold/30 shrink-0">
                {booking.customer?.first_name?.charAt(0) || 'C'}
              </div>
              <div className="min-w-0">
                <h5 className="font-semibold text-neutral-900 text-sm truncate">
                  {booking.customer?.first_name} {booking.customer?.last_name}
                </h5>
                <p className="text-[11px] text-neutral-400">Verified Client Account</p>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 space-y-2 text-xs text-neutral-600">
              {booking.customer?.phone && (
                <div className="flex items-center justify-between">
                  <a
                    href={`tel:${booking.customer.phone}`}
                    className="flex items-center gap-2 hover:text-gold-dark transition-colors font-medium"
                  >
                    <Phone size={13} className="text-neutral-400" />
                    <span>{booking.customer.phone}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(booking.customer.phone)}
                    className="text-[10px] text-neutral-400 hover:text-primary font-medium cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              )}

              {studioAddress && (
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-neutral-50">
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin size={13} className="text-neutral-400 shrink-0 mt-0.5" />
                    <span className="text-neutral-700 leading-snug">{studioAddress}</span>
                  </div>
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-gold hover:text-primary shrink-0 flex items-center gap-1 transition-colors"
                    >
                      <span>Maps</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── 5. Session Schedule & Specifications ─────────────────────── */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-2.5 shadow-2xs text-xs">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Session Schedule & Specifications
            </h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Service Package:</span>
                <span className="font-semibold text-primary text-right truncate max-w-[240px]">
                  {booking.service?.name || 'Photography Session'}
                </span>
              </div>

              {booking.tier_name && (
                <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                  <span className="text-neutral-500">Selected Tier:</span>
                  <span className="font-semibold text-gold-dark bg-gold/10 px-2 py-0.5 rounded-md border border-gold/25">
                    {booking.tier_name}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Event Date:</span>
                <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-gold-dark" />
                  {formattedDate}
                </span>
              </div>

              {formattedTimeSlot && (
                <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                  <span className="text-neutral-500">Time Slot:</span>
                  <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                    <Clock size={13} className="text-neutral-400" />
                    {formattedTimeSlot}
                  </span>
                </div>
              )}

              {booking.created_at && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-neutral-500">Booking Intake Date:</span>
                  <span className="font-medium text-neutral-500">
                    {new Date(booking.created_at).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── 6. Financial Clearance & Ledger ─────────────────────────── */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CreditCard size={14} className="text-gold-dark" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Financial Clearance
                </h4>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isPaid
                  ? 'bg-neutral-900 text-gold border-neutral-800'
                  : 'bg-gold/10 text-gold-dark border-gold/30'
              }`}>
                {isPaid ? 'Cleared (Paid in Full)' : 'Pending Settlement'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                <p className="text-[10px] uppercase font-bold text-neutral-400">Total Price</p>
                <p className="text-sm font-heading font-bold text-primary mt-0.5">
                  ₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                <p className="text-[10px] uppercase font-bold text-neutral-400">Down Payment</p>
                <p className="text-sm font-heading font-bold text-neutral-800 mt-0.5">
                  ₱{downPayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className={`p-2.5 rounded-xl border ${
                remainingBal > 0 ? 'bg-gold/10 border-gold/30' : 'bg-neutral-50 border-neutral-100'
              }`}>
                <p className="text-[10px] uppercase font-bold text-neutral-400">Balance</p>
                <p className={`text-sm font-heading font-bold mt-0.5 ${
                  remainingBal > 0 ? 'text-gold-dark' : 'text-neutral-800'
                }`}>
                  ₱{remainingBal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* ── 7. Direct Quick Actions ───────────────────────────────────── */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Direct Quick Actions
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to={`/admin/bookings/${booking.id}`}
                className="p-3 rounded-xl border border-neutral-200 hover:border-gold hover:bg-white transition-all text-xs font-semibold text-primary flex items-center justify-between shadow-2xs"
              >
                <span>Full Record Page</span>
                <ExternalLink size={13} className="text-gold" />
              </Link>

              <Link
                to={`/admin/payments`}
                className="p-3 rounded-xl border border-neutral-200 hover:border-gold hover:bg-white transition-all text-xs font-semibold text-primary flex items-center justify-between shadow-2xs"
              >
                <span>Record Payment</span>
                <CreditCard size={13} className="text-gold" />
              </Link>

              <Link
                to="/admin/photographers"
                className="p-3 rounded-xl border border-neutral-200 hover:border-neutral-400 hover:bg-white transition-all text-xs font-semibold text-neutral-700 flex items-center justify-between shadow-2xs"
              >
                <span>Photographers Bay</span>
                <Layers size={13} className="text-neutral-400" />
              </Link>

              <button
                type="button"
                onClick={handleCopyRef}
                className="p-3 rounded-xl border border-neutral-200 hover:bg-white transition-all text-xs font-semibold text-neutral-700 flex items-center justify-between shadow-2xs cursor-pointer"
              >
                <span>{copiedRef ? 'Ref Copied!' : 'Copy Reference'}</span>
                <Copy size={13} className="text-neutral-400" />
              </button>
            </div>
          </div>

        </div>

        {/* ── 8. Drawer Footer ───────────────────────────────────────────── */}
        <div className="px-5 py-3.5 bg-white border-t border-neutral-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-medium text-neutral-400">
            E-Kodak Studio Admin
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer border border-neutral-200"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

BookingQuickInspector.propTypes = {
  booking: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onStatusUpdated: PropTypes.func,
};