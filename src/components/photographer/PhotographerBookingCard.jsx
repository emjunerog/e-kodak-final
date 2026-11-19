import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  GraduationCap,
  IdCard,
  Image as ImageIcon,
  Link2,
  Loader2,
  Package,
  Phone,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  parseBookingBrief,
  resolveEditingWorkflowState,
  uploadPhotoOutput,
  submitDriveFolderOutput,
  submitSamplesToAdmin,
  parseGoogleDriveFolderUrl,
  resolvePhotoOutputDisplay,
  resolvePhotoOutputUrls,
} from '../../services/photographerService';
import { getStatusLabel } from '../../lib/bookingUtils';
import ConfirmDialog from '../ui/ConfirmDialog';

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

  const folderInputRef = useRef(null);
  const [extraOutputs, setExtraOutputs] = useState([]);
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [selectedFolderMeta, setSelectedFolderMeta] = useState(null);
  const [testingDriveId, setTestingDriveId] = useState(null);
  const [previewedFolderIds, setPreviewedFolderIds] = useState({});
  const [verifiedFolderIds, setVerifiedFolderIds] = useState({});
  const [localPhotosConfirmed, setLocalPhotosConfirmed] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [savingDriveLink, setSavingDriveLink] = useState(false);
  const [sendingToAdmin, setSendingToAdmin] = useState(false);
  const [sentLocally, setSentLocally] = useState(false);
  const [uploadNotice, setUploadNotice] = useState(null);
  const [confirmDoneDialog, setConfirmDoneDialog] = useState(null);

  const editingState = resolveEditingWorkflowState(booking);
  // Deduplicate by record ID first, then deduplicate Google Drive folders by canonical folderId
  const { driveFolderOutputs, fileOutputs } = useMemo(() => {
    const seenOutputIds = new Set();
    const mergedOutputs = [...extraOutputs, ...(Array.isArray(booking.photo_outputs) ? booking.photo_outputs : [])].filter(
      (o) => {
        if (!o) return false;
        if (o.id && seenOutputIds.has(o.id)) return false;
        if (o.id) seenOutputIds.add(o.id);
        return true;
      }
    );

    const seenDriveFolderIds = new Set();
    const folders = [];
    const files = [];
    mergedOutputs.forEach((o) => {
      const isDrive =
        o.file_type === 'gdrive_folder' ||
        o.file_type === 'gdrive_link' ||
        String(o.file_path || '').includes('drive.google.com');
      if (isDrive) {
        const parsedDrive = parseGoogleDriveFolderUrl(o.file_path);
        const dedupeKey = parsedDrive.valid ? parsedDrive.folderId : o.file_path;
        if (dedupeKey && seenDriveFolderIds.has(dedupeKey)) return;
        if (dedupeKey) seenDriveFolderIds.add(dedupeKey);
        folders.push(o);
      } else {
        files.push(o);
      }
    });
    return { driveFolderOutputs: folders, fileOutputs: files };
  }, [extraOutputs, booking.photo_outputs]);
  const allOutputs = [...driveFolderOutputs, ...fileOutputs];
  const allDriveFoldersPreviewed =
    driveFolderOutputs.length === 0 ||
    driveFolderOutputs.every((o) => {
      const p = parseGoogleDriveFolderUrl(o.file_path);
      return p?.valid && Boolean(previewedFolderIds[p.folderId]);
    });
  const allDriveFoldersConfirmed =
    driveFolderOutputs.length === 0 ||
    driveFolderOutputs.every((o) => {
      const p = parseGoogleDriveFolderUrl(o.file_path);
      return p?.valid && Boolean(verifiedFolderIds[p.folderId]);
    });
  const allFileBatchesConfirmed = fileOutputs.length === 0 || localPhotosConfirmed;
  const [signedFilesState, setSignedFilesState] = useState({ key: '', items: [] });
  const [failedThumbKeys, setFailedThumbKeys] = useState({});
  const fileOutputsKey = useMemo(
    () => fileOutputs.map((f) => `${f?.id || ''}:${f?.file_path || ''}`).join('|'),
    [fileOutputs]
  );
  const displayFileOutputs = useMemo(() => {
    if (signedFilesState.key === fileOutputsKey && signedFilesState.items.length > 0) {
      return signedFilesState.items;
    }
    return fileOutputs.map(resolvePhotoOutputDisplay);
  }, [fileOutputs, fileOutputsKey, signedFilesState]);

  useEffect(() => {
    if (!fileOutputsKey) return undefined;
    let mounted = true;
    resolvePhotoOutputUrls(fileOutputs).then((resolved) => {
      if (!mounted) return;
      setSignedFilesState({ key: fileOutputsKey, items: resolved });
    });
    return () => {
      mounted = false;
    };
  }, [fileOutputs, fileOutputsKey]);
  const arePhotosConfirmed =
    allOutputs.length > 0 && allDriveFoldersConfirmed && allFileBatchesConfirmed;
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

  const handleUploadEditedFolder = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    const validFiles = rawFiles.filter((f) => /\.(jpe?g|png|webp|pdf)$/i.test(f.name));
    if (!validFiles.length) {
      if (rawFiles.length > 0) {
        setUploadNotice({
          type: 'error',
          text: 'The selected folder has no supported image files (.jpg, .png, .webp).',
        });
      }
      if (folderInputRef.current) folderInputRef.current.value = '';
      return;
    }

    const folderName = validFiles[0]?.webkitRelativePath?.split('/')?.[0] || 'Edited Photos Folder';
    setSelectedFolderMeta({ name: folderName, count: validFiles.length });
    setLocalPhotosConfirmed(false);
    setUploadingFiles(true);
    setUploadNotice(null);
    try {
      const uploaded = [];
      for (let i = 0; i < validFiles.length; i += 1) {
        const { data, error } = await uploadPhotoOutput(
          validFiles[i],
          booking.id,
          `Folder: ${folderName}`
        );
        if (error) throw error;
        if (data) uploaded.push(data);
      }
      setExtraOutputs((prev) => [...uploaded, ...prev]);
      setUploadNotice({
        type: 'success',
        text: `Folder "${folderName}" uploaded (${uploaded.length} photo${uploaded.length === 1 ? '' : 's'}). Click Send Photos to Admin when ready.`,
      });
    } catch (err) {
      setUploadNotice({
        type: 'error',
        text: err?.message || 'Failed to upload folder photos.',
      });
    } finally {
      setUploadingFiles(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleAttachDriveFolderLink = async () => {
    const parsedDrive = parseGoogleDriveFolderUrl(driveFolderUrl);
    if (!parsedDrive.valid) {
      setUploadNotice({
        type: 'error',
        text: parsedDrive.reason,
      });
      return null;
    }
    const alreadyLinked = driveFolderOutputs.find(
      (o) => parseGoogleDriveFolderUrl(o.file_path)?.folderId === parsedDrive.folderId
    );
    if (alreadyLinked) {
      setDriveFolderUrl('');
      setUploadNotice({
        type: 'success',
        text: `Folder ID ${parsedDrive.folderId} is linked. Click Preview to inspect it before confirming.`,
      });
      return alreadyLinked;
    }
    setSavingDriveLink(true);
    setUploadNotice(null);
    try {
      const { data, error } = await submitDriveFolderOutput({
        bookingId: booking.id,
        folderUrl: parsedDrive.cleanUrl,
      });
      if (error) throw error;
      if (data) setExtraOutputs((prev) => [data, ...prev]);
      setDriveFolderUrl('');
      setUploadNotice({
        type: 'success',
        text: 'Google Drive folder linked! Click Preview to check the folder before confirming.',
      });
      return data;
    } catch (err) {
      setUploadNotice({
        type: 'error',
        text: err?.message || 'Failed to attach Google Drive folder link.',
      });
      return null;
    } finally {
      setSavingDriveLink(false);
    }
  };

  const executeSendPhotosToAdmin = async (outputsToSend) => {
    setSendingToAdmin(true);
    setUploadNotice(null);
    try {
      const hasDrive = outputsToSend.some((o) => o.file_type === 'gdrive_folder');
      const { error } = await submitSamplesToAdmin({
        bookingId: booking.id,
        photographerId: booking.photographer_id || null,
        photographerName: 'Studio Photographer',
        bookingNumber: booking.booking_number || '',
        photoCount: outputsToSend.length,
        setsSummary: hasDrive ? 'Edited Photos Folder / Google Drive Batch' : 'Edited Session Folder',
      });
      if (error) throw error;
      setSentLocally(true);
      setUploadNotice({
        type: 'success',
        text: 'Edited photo batch sent to Admin! Admin must receive and review the order to confirm retouching.',
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

  const handleConfirmSameFolder = () => {
    if (!allDriveFoldersPreviewed) {
      const firstUnpreviewed = driveFolderOutputs.find((o) => {
        const p = parseGoogleDriveFolderUrl(o.file_path);
        return p?.valid && !previewedFolderIds[p.folderId];
      });
      const p = firstUnpreviewed ? parseGoogleDriveFolderUrl(firstUnpreviewed.file_path) : null;
      if (p?.folderId) {
        setTestingDriveId(p.folderId);
        setPreviewedFolderIds((prev) => ({ ...prev, [p.folderId]: true }));
      }
      setUploadNotice({
        type: 'error',
        text: 'Preview the folder first to verify the photos match before confirming.',
      });
      return;
    }

    const nextVerified = { ...verifiedFolderIds };
    driveFolderOutputs.forEach((o) => {
      const p = parseGoogleDriveFolderUrl(o.file_path);
      if (p?.valid) nextVerified[p.folderId] = true;
    });
    setVerifiedFolderIds(nextVerified);
    if (fileOutputs.length > 0) setLocalPhotosConfirmed(true);
    setUploadNotice({
      type: 'success',
      text: 'Confirmed same folder! You can now send the photos to Admin.',
    });
  };

  const handleSendPhotosToAdmin = async () => {
    if (sendingToAdmin || uploadingFiles || savingDriveLink) return;
    let currentOutputs = allOutputs;

    if (driveFolderUrl.trim()) {
      const added = await handleAttachDriveFolderLink();
      if (!added) return;
      return;
    }

    if (currentOutputs.length === 0) {
      setUploadNotice({
        type: 'error',
        text: 'Please select a file folder or insert a Google Drive folder link before sending to Admin.',
      });
      return;
    }

    if (!allDriveFoldersPreviewed) {
      const firstUnpreviewed = driveFolderOutputs.find((o) => {
        const p = parseGoogleDriveFolderUrl(o.file_path);
        return p?.valid && !previewedFolderIds[p.folderId];
      });
      const p = firstUnpreviewed ? parseGoogleDriveFolderUrl(firstUnpreviewed.file_path) : null;
      if (p?.folderId) {
        setTestingDriveId(p.folderId);
        setPreviewedFolderIds((prev) => ({ ...prev, [p.folderId]: true }));
      }
      setUploadNotice({
        type: 'error',
        text: 'Please preview the folder first and confirm it matches before sending to Admin.',
      });
      return;
    }

    if (!arePhotosConfirmed) {
      setUploadNotice({
        type: 'error',
        text: 'Please click "Confirm Same Folder" first before sending to Admin.',
      });
      return;
    }

    setConfirmDoneDialog({
      title: 'Transfer Confirmed Photos to Admin?',
      message: `You confirmed ${currentOutputs.length} batch item${currentOutputs.length === 1 ? '' : 's'} for booking #${booking.booking_number || 'Order'}. Send this confirmed batch to Admin for receipt & retouching review?`,
      confirmLabel: 'Confirm & Transfer to Admin',
      cancelLabel: 'Review Again',
      confirmClass: 'bg-neutral-900 text-white hover:bg-black',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      onConfirm: async () => {
        await executeSendPhotosToAdmin(currentOutputs);
      },
    });
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

          {/* ── Sole Card for Upload Edited Photos (File Folder or Google Drive Folder Link) ── */}
          {isEditingStage && (
            <div className="p-4 sm:p-5 rounded-xl bg-white border border-gold/35 space-y-3.5">
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                accept="image/*"
                onChange={handleUploadEditedFolder}
                className="hidden"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gold-dark">
                    {isSentToAdmin
                      ? isReceivedByAdmin
                        ? 'Received by Admin · Awaiting Retouching Confirmation'
                        : 'Edited Photos Sent · Waiting for Admin to Receive'
                      : 'Upload Edited Photos (Batch Folder or Drive Link)'}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {isSentToAdmin
                      ? `${allOutputs.length} batch item${allOutputs.length === 1 ? '' : 's'} submitted to Admin.`
                      : 'Insert a photo file folder or paste a Google Drive folder link to batch your edited photos.'}
                  </p>
                </div>

                {!isSentToAdmin && (
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={uploadingFiles || savingDriveLink || sendingToAdmin}
                    className="h-9 px-3.5 rounded-xl border border-gold/40 bg-gold/10 hover:bg-gold/20 text-neutral-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {uploadingFiles ? <Loader2 size={13} className="animate-spin" /> : <FolderOpen size={13} className="text-gold-dark" />}
                    <span>{uploadingFiles ? 'Uploading Folder…' : `Select File Folder (${fileOutputs.length})`}</span>
                  </button>
                )}
              </div>

              {!isSentToAdmin && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Link2 size={14} className="text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="url"
                      value={driveFolderUrl}
                      onChange={(e) => setDriveFolderUrl(e.target.value)}
                      disabled={uploadingFiles || savingDriveLink || sendingToAdmin}
                      placeholder="Paste Google Drive folder link (https://drive.google.com/drive/folders/...)"
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-neutral-200/90 bg-neutral-50/70 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAttachDriveFolderLink}
                    disabled={!driveFolderUrl.trim() || savingDriveLink || uploadingFiles || sendingToAdmin}
                    className="h-10 px-3.5 rounded-xl border border-neutral-200 bg-white hover:border-gold hover:bg-neutral-50 text-xs font-bold text-neutral-800 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-45 shrink-0"
                  >
                    {savingDriveLink ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} className="text-gold-dark" />}
                    <span>{savingDriveLink ? 'Linking…' : 'Link Drive Folder'}</span>
                  </button>
                </div>
              )}

              {driveFolderOutputs.length > 0 && (
                <div className="space-y-2">
                  {driveFolderOutputs.map((item, idx) => {
                    const parsedItem = parseGoogleDriveFolderUrl(item.file_path);
                    const folderId = parsedItem?.folderId || `drive-${idx}`;
                    const isTestingThis = testingDriveId === folderId;
                    const isVerified = Boolean(verifiedFolderIds[folderId]);

                    return (
                      <div
                        key={item.id || idx}
                        className="rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <FolderOpen size={14} className="text-emerald-700 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <a
                                href={item.file_path}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-emerald-900 hover:underline inline-flex items-center gap-1 max-w-full"
                              >
                                <span className="truncate">{item.file_path}</span>
                                <ExternalLink size={11} className="shrink-0" />
                              </a>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-emerald-800/80">
                                {parsedItem?.valid && (
                                  <span className="font-mono">ID: {parsedItem.folderId}</span>
                                )}
                                {selectedFolderMeta && (
                                  <span>
                                    · Local Folder: <strong>{selectedFolderMeta.name}</strong> ({selectedFolderMeta.count} photos)
                                  </span>
                                )}
                                {isVerified && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                                    <ShieldCheck size={10} /> Verified Same Folder
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {parsedItem?.valid && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextOpen = isTestingThis ? null : folderId;
                                setTestingDriveId(nextOpen);
                                if (nextOpen) {
                                  setPreviewedFolderIds((prev) => ({ ...prev, [folderId]: true }));
                                }
                              }}
                              className="h-8 px-2.5 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                            >
                              <Eye size={12} className="text-emerald-700" />
                              <span>{isTestingThis ? 'Hide Preview' : 'Preview'}</span>
                            </button>
                          )}
                        </div>

                        {isTestingThis && parsedItem?.valid && (
                          <div className="border-t border-emerald-200 bg-white p-3 space-y-2">
                            <iframe
                              title={`Google Drive Folder Preview ${parsedItem.folderId}`}
                              src={parsedItem.embedUrl}
                              className="w-full h-56 rounded-lg border border-neutral-200 bg-neutral-50"
                            />
                            <p className="text-[11px] text-neutral-500">
                              If the Drive preview above appears blank, ensure the folder sharing setting is{' '}
                              <strong>&ldquo;Anyone with the link&rdquo;</strong> or click the link above to open in Google Drive.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {displayFileOutputs.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                  {displayFileOutputs.slice(0, 6).map((item, idx) => {
                    const thumbKey = item.id || `${idx}:${item.resolvedUrl}`;
                    const showFallback =
                      item.isPdf || Boolean(failedThumbKeys[thumbKey]) || !item.resolvedUrl;

                    return (
                      <a
                        key={thumbKey}
                        href={item.openUrl || item.resolvedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="aspect-square rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 block relative group"
                        title={item.cleanName || item.file_name}
                      >
                        {showFallback ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-1.5 text-center bg-neutral-100">
                            {item.isPdf ? (
                              <FileText size={16} className="text-gold-dark mb-1 shrink-0" />
                            ) : (
                              <ImageIcon size={16} className="text-neutral-500 mb-1 shrink-0" />
                            )}
                            <span className="text-[10px] font-medium text-neutral-600 leading-tight line-clamp-2 break-all">
                              {item.cleanName || 'View File'}
                            </span>
                          </div>
                        ) : (
                          <img
                            src={item.resolvedUrl}
                            alt={item.cleanName || item.file_name || 'Edited output'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={() =>
                              setFailedThumbKeys((prev) =>
                                prev[thumbKey] ? prev : { ...prev, [thumbKey]: true }
                              )
                            }
                          />
                        )}
                      </a>
                    );
                  })}
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
          <div
            className={`grid gap-3 pt-1 ${
              isEditingStage || isPostEditingStage ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
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
                onClick={() =>
                  setConfirmDoneDialog({
                    title: 'Finish Pictorial & Start Editing?',
                    message:
                      'This confirms that the pictorial session for this order is finished. You will now start editing the photos before sending them to Admin.',
                    confirmLabel: 'Confirm & Start Editing',
                    cancelLabel: 'Not Yet',
                    confirmClass: 'bg-emerald-600 text-white hover:bg-emerald-700',
                    icon: CheckCircle2,
                    iconColor: 'text-emerald-600',
                    iconBg: 'bg-emerald-50',
                    onConfirm: async () => {
                      await onAdvanceStatus(booking.id, 'EDITING');
                    },
                  })
                }
                disabled={isUpdating}
                className="w-full h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>Confirm Pictorial Done</span>
              </motion.button>
            )}

            {isEditingWithPhotographer && (
              <>
                {allOutputs.length > 0 && allDriveFoldersPreviewed && !arePhotosConfirmed ? (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirmSameFolder}
                    disabled={sendingToAdmin || uploadingFiles || savingDriveLink}
                    className="w-full h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck size={15} />
                    <span>Confirm Same Folder</span>
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSendPhotosToAdmin}
                    disabled={sendingToAdmin || uploadingFiles || savingDriveLink}
                    className={`w-full h-11 px-4 rounded-xl text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                      allOutputs.length === 0 || !allDriveFoldersPreviewed
                        ? 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700'
                        : 'bg-neutral-900 hover:bg-black text-white'
                    }`}
                  >
                    {sendingToAdmin ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Send
                        size={15}
                        className={arePhotosConfirmed ? 'text-gold' : 'text-neutral-600'}
                      />
                    )}
                    <span>
                      {sendingToAdmin
                        ? 'Sending Photos to Admin…'
                        : allOutputs.length > 0 && !allDriveFoldersPreviewed
                          ? 'Preview Folder First to Send Photos to Admin'
                          : 'Send Photos to Admin'}
                    </span>
                  </motion.button>
                )}
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

      {typeof document !== 'undefined' &&
        confirmDoneDialog &&
        createPortal(
          <ConfirmDialog
            dialog={confirmDoneDialog}
            onClose={() => setConfirmDoneDialog(null)}
            loading={isUpdating}
          />,
          document.body
        )}
    </motion.div>
  );
}
