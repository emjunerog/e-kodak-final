import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  GraduationCap,
  IdCard,
  Loader2,
  Package,
  Phone,
  Send,
  Upload,
  User,
} from 'lucide-react';
import {
  parseBookingBrief,
  resolveEditingWorkflowState,
  uploadPhotoOutput,
  submitSamplesToAdmin,
} from '../../services/photographerService';
import { getStatusLabel } from '../../lib/bookingUtils';

function formatTime12h(timeStr) {
  if (!timeStr) return '';
  if (/am|pm|full/i.test(String(timeStr))) return String(timeStr);
  const parts = String(timeStr).split(':');
  const hour = parseInt(parts[0], 10);
  if (Number.isNaN(hour)) return timeStr;
  const minute = parts[1] || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}

function formatDatePretty(dateStr) {
  if (!dateStr) return 'Date TBD';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function resolveFormDetails(booking) {
  const brief = parseBookingBrief(booking);
  const { academicSpecs, participantDetails } = brief;
  const studioSpecs = booking?.customer?.studio_specs || {};
  const studentObj = booking?.student_details || {};
  const participantObj = booking?.participant_details || {};

  const isSomeoneElse =
    booking?.booking_for === 'someone_else' ||
    participantObj?.booking_for === 'someone_else' ||
    participantDetails?.bookingFor === 'someone_else';

  const accountOwnerName =
    `${booking?.customer?.first_name || ''} ${booking?.customer?.last_name || ''}`.trim() || 'Client';

  const name = isSomeoneElse
    ? booking?.participant_name || participantObj?.full_name || participantDetails?.participantName || accountOwnerName
    : academicSpecs?.studentName || studentObj?.student_name || accountOwnerName;

  const number = isSomeoneElse
    ? booking?.participant_phone || participantObj?.phone || participantDetails?.phone || booking?.customer?.phone || '—'
    : booking?.customer?.phone || booking?.participant_phone || participantObj?.phone || '—';

  const school =
    booking?.school ||
    studentObj?.school ||
    academicSpecs?.school ||
    (!isSomeoneElse ? studioSpecs?.university : '') ||
    '—';

  const trackOrCourse =
    booking?.track ||
    studentObj?.track ||
    studentObj?.course ||
    academicSpecs?.degree ||
    (!isSomeoneElse ? studioSpecs?.degree || studioSpecs?.course : '') ||
    '';
  const rawBatch = (
    booking?.batch ||
    studentObj?.batch ||
    academicSpecs?.batch ||
    (!isSomeoneElse ? studioSpecs?.gradYear : '') ||
    ''
  )
    .toString()
    .replace(/^Batch\s*/i, '')
    .trim();

  const classLabel =
    trackOrCourse && rawBatch
      ? `${trackOrCourse} · Batch ${rawBatch}`
      : trackOrCourse || (rawBatch ? `Batch ${rawBatch}` : '—');

  const section =
    booking?.section ||
    studentObj?.section ||
    academicSpecs?.section ||
    (!isSomeoneElse ? studioSpecs?.section : '') ||
    '—';

  const idNumber =
    booking?.student_id ||
    studentObj?.student_id ||
    academicSpecs?.studentId ||
    (!isSomeoneElse ? studioSpecs?.student_id : '') ||
    '—';

  const serviceName = booking?.service?.name || 'Photoshoot Session';
  const selectedPackage = booking?.tier_name ? `${serviceName} — ${booking.tier_name}` : serviceName;

  return {
    name,
    number,
    school,
    classLabel,
    section,
    idNumber,
    selectedPackage,
  };
}

export default function PhotographerBookingCard({
  booking,
  isExpanded,
  onToggleExpand,
  updatingId,
  conflictBooking = null,
  embedded = false,
  fillHeight = false,
  onAdvanceStatus,
  onReschedule,
  onPhotosSubmitted,
}) {
  const isUpdating = updatingId === booking.id;
  const details = resolveFormDetails(booking);
  const statusUpper = String(booking.status || 'PENDING').toUpperCase();

  const fileInputRef = useRef(null);
  const [extraOutputs, setExtraOutputs] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [sendingToAdmin, setSendingToAdmin] = useState(false);
  const [sentLocally, setSentLocally] = useState(false);
  const [uploadNotice, setUploadNotice] = useState(null);

  const editingState = resolveEditingWorkflowState(booking);
  const existingOutputs = Array.isArray(booking.photo_outputs) ? booking.photo_outputs : [];
  const allOutputs = [...extraOutputs, ...existingOutputs];
  const isSentToAdmin = editingState.isSentToAdmin || sentLocally;
  const isReceivedByAdmin = editingState.isReceivedByAdmin;

  const canStartPictorial = statusUpper === 'PHOTOGRAPHER_ASSIGNED' || statusUpper === 'CONFIRMED';
  const isOngoingPictorial = statusUpper === 'CAPTURE' || statusUpper === 'IN_PROGRESS';
  const isEditingStage = statusUpper === 'EDITING';
  const isEditingWithPhotographer = isEditingStage && !isSentToAdmin;
  const isPostEditingStage = [
    'RETOUCHING',
    'FINALIZED',
    'PRINTING',
    'READY',
    'UNDER_DELIVERY',
    'COMPLETED',
  ].includes(statusUpper);

  const sessionStatusLabel = canStartPictorial
    ? 'Your assigned sessions'
    : isOngoingPictorial
      ? 'Ongoing Pictorial'
      : isEditingWithPhotographer
        ? 'Pictorial Done · Editing Photos'
        : isEditingStage && !isReceivedByAdmin
          ? 'Edited Photos Sent to Admin'
          : isEditingStage && isReceivedByAdmin
            ? 'Received by Admin · Under Review'
            : isPostEditingStage
              ? 'Confirmed by Admin · Retouching'
              : getStatusLabel(statusUpper);

  const handleUploadEditedFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingFiles(true);
    setUploadNotice(null);
    try {
      const uploaded = [];
      for (let i = 0; i < files.length; i += 1) {
        const setLabel = `Edited Photo ${allOutputs.length + i + 1}`;
        const { data, error } = await uploadPhotoOutput(files[i], booking.id, setLabel);
        if (error) throw error;
        if (data) uploaded.push(data);
      }
      setExtraOutputs((prev) => [...uploaded, ...prev]);
      setUploadNotice({
        type: 'success',
        text: `${uploaded.length} edited photo${uploaded.length === 1 ? '' : 's'} uploaded. Ready to send to Admin.`,
      });
    } catch (err) {
      setUploadNotice({
        type: 'error',
        text: err?.message || 'Failed to upload edited photo.',
      });
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendPhotosToAdmin = async () => {
    if (sendingToAdmin) return;
    if (allOutputs.length === 0) {
      setUploadNotice({
        type: 'error',
        text: 'Please upload at least one edited photo before sending to Admin.',
      });
      fileInputRef.current?.click();
      return;
    }
    setSendingToAdmin(true);
    setUploadNotice(null);
    try {
      const { error } = await submitSamplesToAdmin({
        bookingId: booking.id,
        photographerId: booking.photographer_id || null,
        photographerName: 'Studio Photographer',
        bookingNumber: booking.booking_number || '',
        photoCount: allOutputs.length,
        setsSummary: 'Edited Session Photos',
      });
      if (error) throw error;
      setSentLocally(true);
      setUploadNotice({
        type: 'success',
        text: 'Edited photos sent to Admin! Admin must receive and review the order to confirm retouching.',
      });
      onPhotosSubmitted?.(booking.id);
    } catch (err) {
      setUploadNotice({
        type: 'error',
        text: err?.message || 'Failed to send photos to Admin.',
      });
    } finally {
      setSendingToAdmin(false);
    }
  };

  return (
    <motion.div
      whileHover={embedded ? undefined : { y: -1, transition: { duration: 0.15 } }}
      className={`overflow-hidden w-full transition-all duration-200 ${fillHeight ? 'flex-1 flex flex-col' : ''
        } ${embedded
          ? conflictBooking
            ? 'bg-rose-50/25'
            : 'bg-transparent'
          : `rounded-2xl border bg-white shadow-xs ${conflictBooking
            ? 'border-rose-300 ring-1 ring-rose-200'
            : isExpanded
              ? 'border-gold ring-2 ring-gold/15 shadow-sm'
              : 'border-neutral-200/80 hover:border-gold/50 hover:shadow-xs'
          }`
        }`}
    >
      {/* ── Compact Header Bar ── */}
      <div
        onClick={onToggleExpand}
        className="px-5 py-4 sm:px-6 sm:py-5 cursor-pointer select-none hover:bg-neutral-50/60 transition-colors shrink-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold-dark shrink-0">
              <GraduationCap size={22} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading text-lg sm:text-xl font-bold text-primary tracking-tight truncate">
                  {sessionStatusLabel}
                </h3>

                {conflictBooking && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertTriangle size={12} />
                    <span>Conflicts with #{conflictBooking.booking_number}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-800 bg-neutral-50 px-3.5 py-2 rounded-xl border border-neutral-200/80">
              <Calendar size={14} className="text-gold shrink-0" />
              <span>{formatDatePretty(booking.event_date)}</span>
              {booking.preferred_time && (
                <>
                  <span className="text-neutral-300">·</span>
                  <Clock size={13} className="text-neutral-400 shrink-0" />
                  <span className="font-mono text-xs sm:text-sm text-neutral-700 font-bold">
                    {formatTime12h(booking.preferred_time)}
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${isExpanded
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200 hover:text-primary'
                }`}
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {!isExpanded && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 mt-3.5 border-t border-neutral-100 text-sm text-neutral-600 font-body">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 font-bold text-primary">
                <User size={14} className="text-gold" />
                <span>{details.name}</span>
              </span>
              {details.number !== '—' && (
                <a
                  href={`tel:${details.number}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-neutral-600 hover:text-gold transition-colors inline-flex items-center gap-1 font-mono text-xs sm:text-sm"
                >
                  <Phone size={12} className="text-neutral-400" />
                  <span>{details.number}</span>
                </a>
              )}
            </div>

            <div className="inline-flex items-center gap-1.5 text-neutral-700 font-medium truncate max-w-sm">
              <Building2 size={14} className="text-gold shrink-0" />
              <span className="truncate">{details.school}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Expanded Essential Form Details Only ── */}
      {isExpanded && (
        <div
          className={`px-5 sm:px-6 py-5 sm:py-6 border-t border-neutral-200/80 bg-neutral-50/40 animate-fade-in font-body ${fillHeight ? 'flex-1 flex flex-col justify-between gap-4 sm:gap-5' : 'space-y-4'
            }`}
        >
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 ${fillHeight ? 'flex-1 content-stretch' : 'lg:grid-cols-3'
              }`}
          >
            <div className="p-4 sm:p-5 rounded-xl bg-white border border-neutral-200/80 flex flex-col justify-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <User size={12} className="text-gold" /> Name
              </span>
              <p className="font-bold text-base sm:text-lg text-neutral-900 leading-snug">{details.name}</p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white border border-neutral-200/80 flex flex-col justify-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Phone size={12} className="text-gold" /> Contact Number
              </span>
              {details.number !== '—' ? (
                <a
                  href={`tel:${details.number}`}
                  className="font-mono font-bold text-base sm:text-lg text-neutral-900 hover:text-gold leading-snug block truncate"
                >
                  {details.number}
                </a>
              ) : (
                <p className="text-base sm:text-lg text-neutral-400">—</p>
              )}
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white border border-neutral-200/80 flex flex-col justify-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <IdCard size={12} className="text-gold" /> ID Number
              </span>
              <p className="font-mono font-bold text-base sm:text-lg text-neutral-900 leading-snug truncate">
                {details.idNumber}
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white border border-neutral-200/80 flex flex-col justify-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Building2 size={12} className="text-gold" /> School
              </span>
              <p className="font-bold text-base sm:text-lg text-neutral-900 leading-snug" title={details.school}>
                {details.school}
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white border border-neutral-200/80 flex flex-col justify-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <BookOpen size={12} className="text-gold" /> Class
              </span>
              <p className="font-bold text-base sm:text-lg text-neutral-900 leading-snug" title={details.classLabel}>
                {details.classLabel}
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white border border-neutral-200/80 flex flex-col justify-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <GraduationCap size={12} className="text-gold" /> Section
              </span>
              <p className="font-bold text-base sm:text-lg text-neutral-900 leading-snug">{details.section}</p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-white border border-neutral-200/80 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 shrink-0">
              <Package size={13} className="text-gold" /> Selected Package
            </span>
            <p className="font-bold text-sm sm:text-base text-neutral-900 text-right">
              {details.selectedPackage}
            </p>
          </div>

          {/* ── Edited Photos Workspace (when pictorial is done & photographer is editing) ── */}
          {isEditingStage && (
            <div className="p-4 sm:p-5 rounded-xl bg-white border border-gold/35 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleUploadEditedFiles}
                className="hidden"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gold-dark">
                    {isSentToAdmin
                      ? isReceivedByAdmin
                        ? 'Received by Admin · Awaiting Retouching Confirmation'
                        : 'Edited Photos Sent · Waiting for Admin to Receive'
                      : 'Photographer Editing · Upload & Send Edited Photos'}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {isSentToAdmin
                      ? `${allOutputs.length} edited photo${allOutputs.length === 1 ? '' : 's'} submitted to Admin.`
                      : 'Pictorial is confirmed done. Edit the session photos, upload them here, then send to Admin.'}
                  </p>
                </div>

                {!isSentToAdmin && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFiles || sendingToAdmin}
                    className="h-9 px-3.5 rounded-xl border border-gold/40 bg-gold/10 hover:bg-gold/20 text-neutral-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {uploadingFiles ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} className="text-gold-dark" />}
                    <span>{uploadingFiles ? 'Uploading…' : `Upload Edited Photos (${allOutputs.length})`}</span>
                  </button>
                )}
              </div>

              {allOutputs.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                  {allOutputs.slice(0, 6).map((item, idx) => (
                    <a
                      key={item.id || idx}
                      href={item.file_path}
                      target="_blank"
                      rel="noreferrer"
                      className="aspect-square rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 block"
                    >
                      <img
                        src={item.file_path}
                        alt={item.file_name || 'Edited output'}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}

              {uploadNotice && (
                <p
                  className={`text-xs font-semibold px-3 py-2 rounded-lg border ${uploadNotice.type === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                >
                  {uploadNotice.text}
                </p>
              )}
            </div>
          )}

          {/* ── Actions Toolbar ── */}
          <div className={`grid gap-3 pt-1 ${(isEditingStage && isSentToAdmin) || isPostEditingStage ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {canStartPictorial && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => onAdvanceStatus(booking.id, 'CAPTURE', conflictBooking)}
                disabled={isUpdating}
                className="w-full h-11 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} className="text-gold" />}
                <span>Start Pictorial</span>
              </motion.button>
            )}

            {isOngoingPictorial && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => onAdvanceStatus(booking.id, 'EDITING')}
                disabled={isUpdating}
                className="w-full h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>Confirm Pictorial Done</span>
              </motion.button>
            )}

            {isEditingWithPhotographer && (
              <>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSendPhotosToAdmin}
                  disabled={sendingToAdmin || uploadingFiles}
                  className="w-full h-11 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {sendingToAdmin ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} className="text-gold" />}
                  <span>{sendingToAdmin ? 'Sending Photos to Admin…' : 'Send Photos to Admin'}</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFiles || sendingToAdmin}
                  className="w-full h-11 px-4 rounded-xl border border-neutral-200/80 hover:border-gold bg-white hover:bg-neutral-50 text-neutral-800 text-sm font-semibold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploadingFiles ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} className="text-gold" />}
                  <span>{uploadingFiles ? 'Uploading…' : 'Upload Edited Photos'}</span>
                </motion.button>
              </>
            )}

            {isEditingStage && isSentToAdmin && (
              <span className="w-full h-11 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold inline-flex items-center justify-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>
                  {isReceivedByAdmin
                    ? 'Admin Received Photos · Under Review for Retouching'
                    : 'Edited Photos Sent to Admin · Waiting for Admin to Receive'}
                </span>
              </span>
            )}

            {isPostEditingStage && (
              <span className="w-full h-11 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold inline-flex items-center justify-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Confirmed by Admin · Proceeded to Retouching</span>
              </span>
            )}

            {(canStartPictorial || isOngoingPictorial) && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => onReschedule(booking)}
                disabled={isUpdating}
                className="w-full h-11 px-4 rounded-xl border border-neutral-200/80 hover:border-gold bg-white hover:bg-neutral-50 text-neutral-800 text-sm font-semibold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Clock size={14} className="text-neutral-400" />
                <span>Reschedule</span>
              </motion.button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
