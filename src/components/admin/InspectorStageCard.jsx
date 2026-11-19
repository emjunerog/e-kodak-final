import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  FolderOpen,
  Link2,
  Loader2,
  PackageCheck,
  Printer,
  Receipt,
  RotateCcw,
  Send,
  Sparkles,
  Truck,
  UserCheck,
  X,
} from 'lucide-react';
import {
  getPhotographersWithWorkloadAndAvailability,
  assignPhotographerToBooking,
  reassignPhotographer,
  unassignPhotographer,
  checkPhotographerScheduleConflict,
  createNotification,
} from '../../services/bookingAdminService';
import {
  returnSamplesToPhotographer,
  resolveEditingWorkflowState,
  receiveEditedPhotosByAdmin,
} from '../../services/photographerService';
import { uploadAdminPhotoOutput } from '../../services/adminService';
import { createTransferLog } from '../../services/workstationService';
import { supabase } from '../../lib/supabase';
import { getStatusLabel } from '../../lib/bookingUtils';

const peso = (n, d = 0) =>
  `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: d, maximumFractionDigits: 2 })}`;

function resolvePhotographerName(active) {
  const p = active?.photographer;
  const nested = p?.profile;
  return (
    `${nested?.first_name || p?.first_name || ''} ${nested?.last_name || p?.last_name || ''}`.trim() ||
    p?.name ||
    ''
  );
}

function resolveInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || 'PH').toUpperCase();
}

/**
 * InspectorStageCard
 * ------------------
 * Stage-smart obsidian action card for BookingQuickInspector.
 * Only renders the Remaining Balance summary when payment verification or final
 * claiming settlement is the active bottleneck; every intermediate production
 * stage replaces that real estate with the tools needed for that exact step.
 */
export default function InspectorStageCard({
  active,
  profile,
  currentStatusUpper,
  nextStatus,
  hasPhotographer,
  hasPaymentConfirmed,
  needsDownpaymentConfirmation,
  gatewayStatus,
  downPayment,
  totalAmount,
  remainingBal,
  paidPercent,
  isPaid,
  formattedDate,
  advancingStage,
  onOpenPayment,
  onOpenPaymentsPage,
  onOpenPhotosPage,
  onOpenFullOrder,
  onAdvanceStage,
  onSetStage,
  onBookingMutated,
  onShowToast,
}) {
  const [reassignMode, setReassignMode] = useState(false);
  const [photographers, setPhotographers] = useState([]);
  const [loadedCrewKey, setLoadedCrewKey] = useState('');
  const [selectedCrewId, setSelectedCrewId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [assigningCrew, setAssigningCrew] = useState(false);

  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [sendingRevision, setSendingRevision] = useState(false);

  const [driveUrl, setDriveUrl] = useState('');
  const [savingDrive, setSavingDrive] = useState(false);

  const [dispatchingCrew, setDispatchingCrew] = useState(false);
  const [movedLocally, setMovedLocally] = useState(false);
  const [receivedLocally, setReceivedLocally] = useState(false);
  const [receivingPhotos, setReceivingPhotos] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const assignedPhotographerName = resolvePhotographerName(active);
  const photoOutputs = useMemo(
    () => (Array.isArray(active?.photo_outputs) ? active.photo_outputs : []),
    [active]
  );

  const isClosedStage = currentStatusUpper === 'CANCELLED' || currentStatusUpper === 'REJECTED';
  const isPaymentStage = !isClosedStage && !hasPaymentConfirmed && !isPaid;
  const isAssignStage =
    !isClosedStage &&
    !isPaymentStage &&
    ((!hasPhotographer && ['CONFIRMED', 'PENDING', 'RESERVED'].includes(currentStatusUpper)) || reassignMode);

  const crewQueryKey =
    isAssignStage && active?.id
      ? `${active.id}:${active.event_date || ''}:${active.preferred_time || ''}`
      : '';
  const loadingCrew = Boolean(crewQueryKey && loadedCrewKey !== crewQueryKey);

  // Load studio photographer roster whenever crew assignment view is active
  useEffect(() => {
    if (!crewQueryKey || !active?.id) return;
    let mounted = true;
    const existingId = active.photographer_id || active.photographer?.id;

    getPhotographersWithWorkloadAndAvailability(active.event_date, active.preferred_time, active.id)
      .then(({ data }) => {
        if (!mounted) return;
        const crew = (Array.isArray(data) ? data : []).filter(
          (p) =>
            (!p.role || p.role.toLowerCase() === 'photographer') &&
            p.role?.toLowerCase() !== 'admin' &&
            p.role?.toLowerCase() !== 'staff'
        );
        setPhotographers(crew);
        if (existingId && crew.some((p) => p.id === existingId && p.availability_status !== 'BOOKED')) {
          setSelectedCrewId(existingId);
        } else {
          const best =
            crew.find((p) => p.is_available && !p.hasConflict) ||
            crew.find((p) => p.availability_status !== 'BOOKED') ||
            '';
          setSelectedCrewId(best?.id || '');
        }
        setLoadedCrewKey(crewQueryKey);
      })
      .catch((err) => {
        if (!mounted) return;
        onShowToast?.(err?.message || 'Unable to load photographers.', 'error');
        setLoadedCrewKey(crewQueryKey);
      });

    return () => {
      mounted = false;
    };
  }, [crewQueryKey, active?.id, active?.event_date, active?.preferred_time, active?.photographer_id, active?.photographer?.id, onShowToast]);

  const handleAssignSubmit = async () => {
    if (!active?.id || !selectedCrewId || assigningCrew) return;
    const chosen = photographers.find((p) => p.id === selectedCrewId);
    const chosenName = chosen
      ? `${chosen.first_name || ''} ${chosen.last_name || ''}`.trim() || chosen.email
      : 'Studio Photographer';

    setAssigningCrew(true);
    try {
      const isReassign = Boolean(reassignMode && hasPhotographer);
      const moveRemark = assignNote.trim()
        ? `Order moved to photographer ${chosenName} · ${assignNote.trim()}`
        : `Order moved to photographer ${chosenName}`;
      const res = isReassign
        ? await reassignPhotographer({
          bookingId: active.id,
          newPhotographerId: selectedCrewId,
          newPhotographerName: chosenName,
          oldPhotographerName: assignedPhotographerName,
          changedById: profile?.id || null,
          remarks: moveRemark,
          customerId: active.customer?.id || active.customer_id || null,
          bookingNumber: active.booking_number || '',
          eventDate: active.event_date || '',
          preferredTime: active.preferred_time || null,
        })
        : await assignPhotographerToBooking({
          bookingId: active.id,
          photographerId: selectedCrewId,
          photographerName: chosenName,
          changedById: profile?.id || null,
          remarks: moveRemark,
          customerId: active.customer?.id || active.customer_id || null,
          bookingNumber: active.booking_number || '',
          eventDate: active.event_date || '',
          preferredTime: active.preferred_time || null,
        });

      if (res.error) throw res.error;

      const nextSt = isReassign ? currentStatusUpper : 'PHOTOGRAPHER_ASSIGNED';
      setReassignMode(false);
      setMovedLocally(true);
      setAssignNote('');
      onBookingMutated?.({
        nextStatus: nextSt,
        patch: {
          status: nextSt,
          photographer_id: selectedCrewId,
          photographer: {
            ...(active.photographer || {}),
            id: selectedCrewId,
            specialization: chosen?.specialization || 'Studio Photographer',
            first_name: chosen?.first_name || chosenName.split(' ')[0] || chosenName,
            last_name: chosen?.last_name || chosenName.split(' ').slice(1).join(' ') || '',
          },
        },
        toastMessage: isReassign
          ? `Order moved to ${chosenName}`
          : `Order moved to ${chosenName}`,
      });
    } catch (err) {
      onShowToast?.(err?.message || 'Failed to assign photographer.', 'error');
    } finally {
      setAssigningCrew(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionNote.trim() || sendingRevision) {
      onShowToast?.('Please enter brief revision instructions for the photographer.', 'error');
      return;
    }
    setSendingRevision(true);
    try {
      const { error } = await returnSamplesToPhotographer({
        bookingId: active.id,
        adminId: profile?.id || null,
        adminName: `${profile?.first_name || 'Admin'} ${profile?.last_name || ''}`.trim(),
        bookingNumber: active.booking_number || '',
        notes: revisionNote.trim(),
      });
      if (error) throw error;
      setRevisionOpen(false);
      setRevisionNote('');
      onBookingMutated?.({
        nextStatus: 'CAPTURE',
        patch: { status: 'CAPTURE' },
        toastMessage: 'Revision note sent. Returned to Ongoing Pictorial.',
      });
    } catch (err) {
      onShowToast?.(err?.message || 'Unable to send revision request.', 'error');
    } finally {
      setSendingRevision(false);
    }
  };

  const handleAttachDriveAndRelease = async () => {
    const cleanUrl = driveUrl.trim();
    if (!cleanUrl || savingDrive) {
      onShowToast?.('Paste a Google Drive folder or file link first.', 'error');
      return;
    }
    setSavingDrive(true);
    try {
      const { data, error } = await uploadAdminPhotoOutput({
        bookingId: active.id,
        deliverableType: 'Soft Copies (Google Drive Folder)',
        filePathOrUrl: cleanUrl,
        isGoogleDrive: true,
        uploadedBy: profile?.id || null,
      });
      if (error) throw error;
      setDriveUrl('');
      onBookingMutated?.({
        nextStatus: 'FINALIZED',
        patch: {
          status: 'FINALIZED',
          photo_outputs: data ? [data, ...photoOutputs] : photoOutputs,
        },
        toastMessage: 'Soft-copy Drive folder released & moved to Finalized.',
      });
    } catch (err) {
      onShowToast?.(err?.message || 'Failed to attach Google Drive link.', 'error');
    } finally {
      setSavingDrive(false);
    }
  };

  const handleCopyToken = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 1800);
    } catch {
      onShowToast?.('Clipboard access blocked.', 'error');
    }
  };

  const handleDispatchToPhotographer = async () => {
    if (!active?.id || dispatchingCrew) return;
    const targetPhotographerId = active.photographer_id || active.photographer?.id;
    if (!targetPhotographerId) {
      setReassignMode(true);
      return;
    }
    setDispatchingCrew(true);
    try {
      // Smart schedule conflict check before handoff
      const { conflict } = await checkPhotographerScheduleConflict({
        photographerId: targetPhotographerId,
        bookingId: active.id,
        eventDate: active.event_date,
        preferredTime: active.preferred_time,
      });

      if (conflict) {
        const declineMsg = `Auto-declined: conflicting shoot hours with #${conflict.booking_number} on ${conflict.event_date}.`;
        await unassignPhotographer({
          bookingId: active.id,
          oldPhotographerName: assignedPhotographerName,
          changedById: profile?.id || null,
          remarks: declineMsg,
        });
        onShowToast?.(
          `Smartly declined: ${assignedPhotographerName || 'Photographer'} already has #${conflict.booking_number} at conflicting hours.`,
          'error'
        );
        onBookingMutated?.({
          nextStatus: 'CONFIRMED',
          patch: { status: 'CONFIRMED', photographer_id: null, photographer: null },
        });
        return;
      }

      const movedRemark = `Order moved to photographer ${assignedPhotographerName || 'Studio Photographer'}`;
      await Promise.all([
        supabase.from('booking_status_history').insert({
          booking_id: active.id,
          status: 'PHOTOGRAPHER_ASSIGNED',
          remarks: movedRemark,
          changed_by: profile?.id || null,
        }),
        createTransferLog({
          bookingId: active.id,
          senderId: profile?.id || null,
          senderRole: profile?.role || 'admin',
          targetRole: 'photographer',
          transferType: 'ORDER_HANDOFF',
          priority: 'HIGH',
          title: `Order Dispatched to Photographer: #${active.booking_number || 'Booking'}`,
          message: `${movedRemark}. Ready to start pictorial.`,
          payload: {
            photographer_id: targetPhotographerId,
            photographer_name: assignedPhotographerName,
            booking_number: active.booking_number,
            event_date: active.event_date,
          },
        }),
        createNotification({
          userId: targetPhotographerId,
          bookingId: active.id,
          title: 'Order Moved to Your Bay',
          message: `Admin dispatched booking #${active.booking_number || ''} to your queue. Open My Shoots to start pictorial.`,
          notificationType: 'booking_status',
        }),
      ]);

      setMovedLocally(true);
      onBookingMutated?.({
        nextStatus: 'PHOTOGRAPHER_ASSIGNED',
        toastMessage: `Order moved to ${assignedPhotographerName || 'photographer'}`,
      });
    } catch (err) {
      onShowToast?.(err?.message || 'Failed to move order to photographer.', 'error');
    } finally {
      setDispatchingCrew(false);
    }
  };

  const handleReceiveEditedPhotos = async () => {
    if (!active?.id || receivingPhotos) return;
    setReceivingPhotos(true);
    try {
      const adminName = `${profile?.first_name || 'Admin'} ${profile?.last_name || ''}`.trim();
      const { data: newHistoryRow, error } = await receiveEditedPhotosByAdmin({
        bookingId: active.id,
        adminId: profile?.id || null,
        adminName,
        bookingNumber: active.booking_number || '',
        photographerId: active.photographer_id || active.photographer?.id || null,
      });
      if (error) throw error;
      setReceivedLocally(true);
      onBookingMutated?.({
        nextStatus: 'EDITING',
        patch: {
          booking_status_history: [
            ...(Array.isArray(active.booking_status_history) ? active.booking_status_history : []),
            newHistoryRow || {
              id: `local-${Date.now()}`,
              status: 'EDITING',
              remarks: `Admin ${adminName} received edited photos from photographer for review.`,
              created_at: new Date().toISOString(),
            },
          ],
        },
        toastMessage: 'Edited photos received from photographer. Review order to confirm retouching.',
      });
    } catch (err) {
      onShowToast?.(err?.message || 'Failed to receive edited photos.', 'error');
    } finally {
      setReceivingPhotos(false);
    }
  };

  const accountSpecs = active?.customer?.studio_specs || {};
  const isDeliveryOrder =
    accountSpecs.fulfillment_mode === 'STUDIO_DELIVERY' ||
    active?.fulfillment_type === 'DELIVERY' ||
    Boolean(active?.delivery_address || accountSpecs.shipping_address) ||
    currentStatusUpper === 'UNDER_DELIVERY';

  const driveOutputs = useMemo(
    () =>
      photoOutputs.filter(
        (p) =>
          p.file_type === 'gdrive_folder' ||
          p.file_type === 'gdrive_link' ||
          String(p.file_path || '').includes('drive.google.com')
      ),
    [photoOutputs]
  );

  const editingWorkflow = useMemo(() => resolveEditingWorkflowState(active), [active]);
  const isPhotosSentToAdmin = editingWorkflow.isSentToAdmin;
  const isPhotosReceivedByAdmin = editingWorkflow.isReceivedByAdmin || receivedLocally;

  const hasMovedHistory =
    Array.isArray(active?.booking_status_history) &&
    active.booking_status_history.some((h) =>
      /order\s+moved\s+to\s+photographer/i.test(String(h?.remarks || ''))
    );
  const isWaitingForSession = movedLocally || hasMovedHistory;

  // Resolve header eyebrow, primary/secondary actions, and body content per stage
  let headerEyebrow = 'STUDIO WORKSPACE';
  if (isClosedStage) headerEyebrow = 'ORDER CLOSED';
  else if (isPaymentStage) headerEyebrow = isPaid ? 'BALANCE SETTLED' : 'REMAINING BALANCE';
  else if (isAssignStage) headerEyebrow = reassignMode ? 'REASSIGN STUDIO CREW' : 'CREW ASSIGNMENT';
  else if (currentStatusUpper === 'PHOTOGRAPHER_ASSIGNED')
    headerEyebrow = isWaitingForSession ? 'This order is already moved to photographer' : 'STUDIO CREW';
  else if (currentStatusUpper === 'CAPTURE' || currentStatusUpper === 'IN_PROGRESS')
    headerEyebrow = 'This order is currently under pictorial session';
  else if (currentStatusUpper === 'EDITING')
    headerEyebrow = !isPhotosSentToAdmin
      ? 'PICTORIAL DONE · PHOTOGRAPHER EDITING'
      : !isPhotosReceivedByAdmin
        ? 'EDITED PHOTOS SENT · AWAITING RECEIPT'
        : 'PHOTOS RECEIVED · REVIEW FOR RETOUCHING';
  else if (currentStatusUpper === 'RETOUCHING') headerEyebrow = 'RETOUCHING & SOFT COPIES';
  else if (currentStatusUpper === 'FINALIZED' || currentStatusUpper === 'PRINTING') headerEyebrow = 'PRINT LAB & PACKAGING';
  else if (currentStatusUpper === 'READY' || currentStatusUpper === 'UNDER_DELIVERY') headerEyebrow = 'FULFILLMENT & HANDOVER';
  else if (currentStatusUpper === 'COMPLETED') headerEyebrow = 'ORDER COMPLETED';

  const nextLabel = nextStatus ? getStatusLabel(nextStatus) : 'Next Stage';
  const isPictorialActive = currentStatusUpper === 'CAPTURE' || currentStatusUpper === 'IN_PROGRESS';
  const showTopStageBadge = !(
    !isClosedStage &&
    !isPaymentStage &&
    !isAssignStage &&
    (currentStatusUpper === 'PHOTOGRAPHER_ASSIGNED' || isPictorialActive)
  );

  return (
    <aside className="lg:col-span-6 flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-between rounded-[22px] bg-[#0b0f17] text-white p-5 shadow-xl border border-white/10 gap-3.5">
        {/* ── Top Stage Header ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-sans uppercase text-[11px] font-semibold tracking-wider text-neutral-400 leading-none">
            {headerEyebrow}
          </p>
          {showTopStageBadge && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border border-white/15 bg-white/[0.06] text-[#e8cf9d] shrink-0 whitespace-nowrap">
              {getStatusLabel(currentStatusUpper)}
            </span>
          )}
        </div>

        {/* ── Stage-Smart Body ────────────────────────────────────────────── */}
        {isClosedStage && (
          <div className="flex-1 flex flex-col justify-center space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <AlertCircle size={12} className="shrink-0" />
                <span>Order Closed</span>
              </p>
              <p className="text-sm font-semibold text-white">
                Booking {getStatusLabel(currentStatusUpper)}
              </p>
            </div>
          </div>
        )}

        {isPaymentStage && (
          <div className="flex-1 flex flex-col justify-between gap-3.5">
            <div>
              <p className="font-sans font-bold text-3xl sm:text-[34px] text-white tracking-tight leading-none tabular-nums">
                {peso(remainingBal, remainingBal % 1 ? 2 : 0)}
              </p>
              <div className="mt-3 h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isPaid ? 'bg-emerald-400' : 'bg-[#c9a96e]'
                    }`}
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs tabular-nums">
                <span className="text-neutral-400">
                  Paid <strong className="text-white font-bold">{peso(downPayment)}</strong>
                </span>
                <span className="text-neutral-400">
                  Total <strong className="text-white font-bold">{peso(totalAmount)}</strong> · {paidPercent}%
                </span>
              </div>
            </div>

            <div
              className={`rounded-2xl border p-3.5 space-y-1 ${needsDownpaymentConfirmation
                  ? 'bg-emerald-500/10 border-emerald-400/25'
                  : 'bg-amber-500/10 border-amber-400/25'
                }`}
            >
              <p
                className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${needsDownpaymentConfirmation ? 'text-emerald-300' : 'text-amber-300'
                  }`}
              >
                <AlertCircle size={12} className="shrink-0" />
                <span>Action Required · Payment</span>
              </p>
              <p className="text-sm font-semibold text-white leading-snug">
                {needsDownpaymentConfirmation
                  ? `${gatewayStatus.channelLabel} Payment Detected · ${peso(gatewayStatus.gatewayAmountPaid, 2)}`
                  : 'Awaiting Payment Verification'}
              </p>
              {needsDownpaymentConfirmation && gatewayStatus.referenceNumber && (
                <p className="text-xs font-mono text-emerald-200/90">
                  Ref: {gatewayStatus.referenceNumber}
                </p>
              )}
            </div>
          </div>
        )}

        {isAssignStage && (
          <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-snug">
                  {reassignMode ? 'Select Replacement Photographer' : 'Assign Studio Photographer'}
                </p>
                <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                  Session: <span className="text-[#e8cf9d] font-medium">{formattedDate}</span>
                  {active.preferred_time ? ` · ${String(active.preferred_time).slice(0, 5)}` : ''}
                </p>
              </div>
              {reassignMode && (
                <button
                  type="button"
                  onClick={() => setReassignMode(false)}
                  className="text-[11px] text-neutral-400 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 hover:bg-white/10 cursor-pointer shrink-0"
                >
                  <X size={11} /> Back
                </button>
              )}
            </div>

            {loadingCrew ? (
              <div className="flex-1 min-h-[130px] flex items-center justify-center gap-2 text-xs text-neutral-400 rounded-2xl border border-white/10 bg-white/[0.03]">
                <Loader2 size={14} className="animate-spin text-[#c9a96e]" />
                <span>Checking studio crew schedules…</span>
              </div>
            ) : photographers.length === 0 ? (
              <div className="flex-1 min-h-[120px] flex flex-col items-center justify-center text-center p-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.02]">
                <Camera size={22} className="text-neutral-500 mb-1.5" />
                <p className="text-xs font-medium text-neutral-300">No photographers found in roster.</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Add photographers in Studio Team first.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[168px] overflow-y-auto pr-1 scrollbar-thin">
                {photographers.map((ph) => {
                  const name = `${ph.first_name || ''} ${ph.last_name || ''}`.trim() || ph.email;
                  const selected = selectedCrewId === ph.id;
                  const isBookedConflict = ph.availability_status === 'BOOKED';
                  const ok = Boolean(ph.is_available && !ph.hasConflict);
                  return (
                    <label
                      key={ph.id}
                      className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition-all ${isBookedConflict
                          ? 'bg-rose-500/10 border-rose-400/25 opacity-60 cursor-not-allowed'
                          : selected
                            ? 'bg-[#c9a96e]/15 border-[#c9a96e] ring-1 ring-[#c9a96e]/35 cursor-pointer'
                            : 'bg-white/[0.04] border-white/10 hover:border-white/25 cursor-pointer'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="radio"
                          name="inspector_photographer_pick"
                          value={ph.id}
                          checked={selected}
                          disabled={isBookedConflict}
                          onChange={() => !isBookedConflict && setSelectedCrewId(ph.id)}
                          className="accent-[#c9a96e] cursor-pointer shrink-0 disabled:cursor-not-allowed"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{name}</p>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {ph.activeWorkloadCount || 0} active shoot
                            {ph.activeWorkloadCount === 1 ? '' : 's'}
                          </p>
                          {ph.conflictReason && (
                            <p className={`text-[10px] truncate ${isBookedConflict ? 'text-rose-300' : 'text-amber-300/90'}`}>
                              {ph.conflictReason}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase shrink-0 border ${isBookedConflict
                            ? 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                            : ok
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                          }`}
                      >
                        {isBookedConflict ? 'Conflict' : ok ? 'Available' : 'Busy'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <input
              type="text"
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
              placeholder="Optional note for photographer (bay, props, outfit)…"
              className="w-full h-8 px-3 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#c9a96e]"
            />
          </div>
        )}

        {!isClosedStage && !isPaymentStage && !isAssignStage && currentStatusUpper === 'PHOTOGRAPHER_ASSIGNED' && (
          <div className="flex-1 flex flex-col justify-center gap-3">
            <div className="rounded-2xl border border-[#c9a96e]/30 bg-[#c9a96e]/10 p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-[#c9a96e]/40 text-[#e8cf9d] font-heading font-bold text-sm flex items-center justify-center shrink-0">
                {resolveInitials(assignedPhotographerName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#e8cf9d]">
                  Studio Crew
                </p>
                <p className="text-base font-bold text-white truncate">
                  {assignedPhotographerName || 'Studio Photographer'}
                </p>
                <p className="text-xs text-neutral-300 truncate mt-0.5">
                  {formattedDate}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isClosedStage &&
          !isPaymentStage &&
          !isAssignStage &&
          (currentStatusUpper === 'CAPTURE' || currentStatusUpper === 'IN_PROGRESS') && (
            <div className="flex-1 flex flex-col justify-center gap-3">
              <div className="rounded-2xl border border-[#c9a96e]/30 bg-[#c9a96e]/10 p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-[#c9a96e]/40 text-[#e8cf9d] font-heading font-bold text-sm flex items-center justify-center shrink-0">
                  {resolveInitials(assignedPhotographerName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#e8cf9d]">
                    Studio Crew
                  </p>
                  <p className="text-base font-bold text-white truncate">
                    {assignedPhotographerName || 'Studio Photographer'}
                  </p>
                  <p className="text-xs text-neutral-300 truncate mt-0.5">
                    {formattedDate}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3.5 flex items-center gap-2.5">
                <Camera size={15} className="text-emerald-300 shrink-0" />
                <p className="text-xs font-semibold text-emerald-200 leading-snug">
                  This order is currently under pictorial session
                </p>
              </div>
            </div>
          )}

        {!isClosedStage && !isPaymentStage && !isAssignStage && currentStatusUpper === 'EDITING' && (
          <div className="flex-1 flex flex-col justify-between gap-3">
            {!isPhotosSentToAdmin ? (
              <div className="flex-1 flex flex-col justify-center gap-3">
                <div className="rounded-2xl border border-[#c9a96e]/30 bg-[#c9a96e]/10 p-4 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-[#c9a96e]/40 text-[#e8cf9d] font-heading font-bold text-sm flex items-center justify-center shrink-0">
                    {resolveInitials(assignedPhotographerName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#e8cf9d]">
                      With Photographer · Editing
                    </p>
                    <p className="text-base font-bold text-white truncate">
                      {assignedPhotographerName || 'Studio Photographer'}
                    </p>
                    <p className="text-xs text-neutral-300 truncate mt-0.5">
                      Pictorial confirmed done · Editing in progress
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3.5 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Clock size={12} className="shrink-0" />
                    <span>Photographer Editing Photos</span>
                  </p>
                  <p className="text-xs text-neutral-200 leading-relaxed">
                    The photographer confirmed the pictorial is done and is currently editing the photos. Progress stays with the photographer until the edited photos are sent to Admin.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-[#c9a96e]/25 bg-[#c9a96e]/10 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#e8cf9d]">
                      {isPhotosReceivedByAdmin
                        ? 'Edited Photos Received · Review Order'
                        : 'Edited Photos Sent by Photographer'}
                    </p>
                    <span className="text-[11px] font-semibold text-white tabular-nums">
                      {photoOutputs.length} file{photoOutputs.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-200 leading-snug">
                    {isPhotosReceivedByAdmin
                      ? 'You have received the edited photos. Review the order and confirm to move into Retouching.'
                      : `${assignedPhotographerName || 'Photographer'} sent the edited photos to Admin. Click Receive Edited Photos below to review and confirm retouching.`}
                  </p>

                  {photoOutputs.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {photoOutputs.slice(0, 4).map((p) => (
                        <a
                          key={p.id}
                          href={p.file_path}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative aspect-square rounded-lg overflow-hidden border border-white/15 bg-neutral-900"
                          title={p.file_name}
                        >
                          <img
                            src={p.file_path}
                            alt={p.file_name || 'Sample'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {revisionOpen && (
                  <div className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-2.5">
                    <input
                      type="text"
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                      placeholder="Revision details for photographer…"
                      className="w-full h-8 px-2.5 rounded-lg bg-neutral-950/70 border border-white/15 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRevisionOpen(false)}
                        className="h-7 px-2.5 rounded-lg text-[11px] text-neutral-300 hover:bg-white/10 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleRequestRevision}
                        disabled={sendingRevision}
                        className="h-7 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {sendingRevision ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                        Send Back
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!isClosedStage && !isPaymentStage && !isAssignStage && currentStatusUpper === 'RETOUCHING' && (
          <div className="flex-1 flex flex-col justify-between gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#e8cf9d] flex items-center gap-1.5">
                <FolderOpen size={12} /> Soft Copies &amp; Client Drive Release
              </p>
              {driveOutputs.length > 0 && (
                <div className="space-y-1 pt-0.5">
                  {driveOutputs.slice(0, 2).map((d) => (
                    <a
                      key={d.id}
                      href={d.file_path}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-400/25 text-xs text-emerald-200 hover:bg-emerald-500/20"
                    >
                      <span className="truncate flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                        Drive Soft Copies Linked
                      </span>
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Link2 size={11} className="text-[#c9a96e]" /> Google Drive Folder URL
              </label>
              <input
                type="url"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#c9a96e]"
              />
            </div>
          </div>
        )}

        {!isClosedStage &&
          !isPaymentStage &&
          !isAssignStage &&
          (currentStatusUpper === 'FINALIZED' || currentStatusUpper === 'PRINTING') && (
            <div className="flex-1 flex flex-col justify-between gap-3">
              <div className="rounded-2xl border border-[#c9a96e]/25 bg-[#c9a96e]/10 p-3.5 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#e8cf9d] flex items-center gap-1.5">
                  <Printer size={12} /> Print Production &amp; Packaging
                </p>
                <p className="text-sm font-semibold text-white">
                  {active.tier_name || active.service?.name || 'Studio Print Set'}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.08] border border-white/15 text-neutral-200">
                    {isDeliveryOrder ? 'Fulfillment: Delivery' : 'Fulfillment: Studio Pickup'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.08] border border-white/15 text-neutral-200">
                    {photoOutputs.length} Output File{photoOutputs.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>
          )}

        {!isClosedStage &&
          !isPaymentStage &&
          !isAssignStage &&
          (currentStatusUpper === 'READY' || currentStatusUpper === 'UNDER_DELIVERY') && (
            <div className="flex-1 flex flex-col justify-between gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#e8cf9d] flex items-center gap-1.5 shrink-0">
                    {currentStatusUpper === 'UNDER_DELIVERY' ? <Truck size={12} /> : <PackageCheck size={12} />}
                    <span>
                      {currentStatusUpper === 'UNDER_DELIVERY' ? 'Courier Dispatch' : 'Studio Pickup'}
                    </span>
                  </p>
                  {active.booking_token && (
                    <button
                      type="button"
                      onClick={() => handleCopyToken(active.booking_token)}
                      className="text-[11px] font-mono text-neutral-300 hover:text-white inline-flex items-center gap-1 cursor-pointer min-w-0"
                    >
                      <span className="truncate">{active.booking_token}</span>
                      {copiedToken ? <Check size={10} className="shrink-0" /> : <Copy size={10} className="shrink-0" />}
                    </button>
                  )}
                </div>
                <p className="text-xs text-neutral-200 font-medium">
                  Recipient: {accountSpecs.courier_recipient_name || `${active.customer?.first_name || ''} ${active.customer?.last_name || ''}`.trim() || 'Client'}
                </p>
                {accountSpecs.shipping_address && (
                  <p className="text-[11px] text-neutral-400 truncate">{accountSpecs.shipping_address}</p>
                )}
              </div>

              {remainingBal > 0 ? (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3.5 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Receipt size={12} /> Balance Due on Release
                  </p>
                  <p className="text-sm font-bold text-white tabular-nums">
                    {peso(remainingBal, 2)}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-2.5 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-300 shrink-0" />
                  <p className="text-xs font-semibold text-emerald-200">
                    100% Settled · Cleared for Handover
                  </p>
                </div>
              )}
            </div>
          )}

        {!isClosedStage && !isPaymentStage && !isAssignStage && currentStatusUpper === 'COMPLETED' && (
          <div className="flex-1 flex flex-col justify-between gap-3">
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Production &amp; Delivery Complete
              </p>
              <p className="text-sm font-semibold text-white">Order Delivered &amp; Archived</p>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {assignedPhotographerName ? `Shot by ${assignedPhotographerName} · ` : ''}
                {photoOutputs.length > 0
                  ? `${photoOutputs.length} deliverable${photoOutputs.length === 1 ? '' : 's'} attached · `
                  : ''}
                {isPaid ? 'All payments settled.' : `Open balance: ${peso(remainingBal, 2)}.`}
              </p>
            </div>
          </div>
        )}

        {/* ── Bottom Fitted 2-Button Row + Full Order Below ───────────────── */}
        <div className="space-y-2">
          {isClosedStage && (
            <div className="grid grid-cols-1 gap-2 w-full">
              <button
                type="button"
                onClick={onOpenPaymentsPage}
                className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                <CreditCard size={13} className="shrink-0" />
                <span>Payments Dashboard</span>
              </button>
            </div>
          )}

          {isPaymentStage && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              <button
                type="button"
                onClick={onOpenPayment}
                className="w-full h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap"
              >
                {needsDownpaymentConfirmation ? <CheckCircle2 size={13} /> : <CreditCard size={13} />}
                <span>{needsDownpaymentConfirmation ? 'Confirm Downpayment' : 'Record Payment'}</span>
              </button>
              <button
                type="button"
                onClick={onOpenPaymentsPage}
                className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                <span>Payments Dashboard</span>
                <ArrowRight size={12} className="shrink-0" />
              </button>
            </div>
          )}

          {isAssignStage && (
            <div className="space-y-2 w-full">
              <button
                type="button"
                onClick={handleAssignSubmit}
                disabled={assigningCrew || loadingCrew || !selectedCrewId}
                className="w-full h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap disabled:opacity-50"
              >
                {assigningCrew ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                <span>{reassignMode ? 'Move to Replacement Photographer' : 'Move this order to Photographer'}</span>
              </button>
              {reassignMode && (
                <button
                  type="button"
                  onClick={() => setReassignMode(false)}
                  className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                >
                  <X size={12} className="shrink-0" />
                  <span>Cancel Reassign</span>
                </button>
              )}
            </div>
          )}

          {!isClosedStage && !isPaymentStage && !isAssignStage && currentStatusUpper === 'PHOTOGRAPHER_ASSIGNED' && (
            <div className="space-y-2 w-full">
              {isWaitingForSession ? (
                <div className="w-full min-h-9 px-3.5 py-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 font-semibold text-xs flex items-center justify-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-300 shrink-0" />
                  <span>This order is already moved to photographer</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDispatchToPhotographer}
                  disabled={dispatchingCrew}
                  className="w-full h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap disabled:opacity-60"
                >
                  {dispatchingCrew ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{dispatchingCrew ? 'Moving Order…' : 'Move this order to Photographer'}</span>
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setReassignMode(true)}
                  className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                >
                  <UserCheck size={12} className="shrink-0" />
                  <span>Reassign Crew</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenPaymentsPage}
                  className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                >
                  <CreditCard size={12} className="shrink-0" />
                  <span>Payments</span>
                </button>
              </div>
            </div>
          )}

          {!isClosedStage &&
            !isPaymentStage &&
            !isAssignStage &&
            (currentStatusUpper === 'CAPTURE' || currentStatusUpper === 'IN_PROGRESS') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setReassignMode(true)}
                  className="w-full h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap"
                >
                  <UserCheck size={13} className="shrink-0" />
                  <span>Reassign Crew</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenPhotosPage}
                  className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                >
                  <FolderOpen size={12} className="shrink-0" />
                  <span>Photo Studio</span>
                </button>
              </div>
            )}

          {!isClosedStage && !isPaymentStage && !isAssignStage && currentStatusUpper === 'EDITING' && (
            <div className="space-y-2 w-full">
              {!isPhotosSentToAdmin ? (
                <>
                  <div className="w-full min-h-9 px-3.5 py-2 rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-200 font-semibold text-xs flex items-center justify-center gap-2">
                    <Clock size={13} className="text-amber-300 shrink-0" />
                    <span>With Photographer · Waiting for Edited Photos</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => setReassignMode(true)}
                      className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <UserCheck size={12} className="shrink-0" />
                      <span>Reassign Crew</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenPhotosPage}
                      className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <FolderOpen size={12} className="shrink-0" />
                      <span>Photo Studio</span>
                    </button>
                  </div>
                </>
              ) : !isPhotosReceivedByAdmin ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleReceiveEditedPhotos}
                    disabled={receivingPhotos}
                    className="w-full h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap disabled:opacity-60"
                  >
                    {receivingPhotos ? <Loader2 size={13} className="animate-spin" /> : <PackageCheck size={13} />}
                    <span>{receivingPhotos ? 'Receiving…' : 'Receive Edited Photos'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenPhotosPage}
                    className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <FolderOpen size={12} className="shrink-0" />
                    <span>Review in Photo Studio</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  <button
                    type="button"
                    onClick={onAdvanceStage}
                    disabled={advancingStage}
                    className="w-full h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap disabled:opacity-60"
                  >
                    {advancingStage ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    <span>{advancingStage ? 'Confirming…' : 'Confirm Retouching'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevisionOpen((v) => !v)}
                    className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <RotateCcw size={12} className="shrink-0" />
                    <span>Request Revision</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {!isClosedStage && !isPaymentStage && !isAssignStage && currentStatusUpper === 'RETOUCHING' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              <button
                type="button"
                onClick={driveUrl.trim() ? handleAttachDriveAndRelease : onAdvanceStage}
                disabled={savingDrive || advancingStage}
                className="w-full h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap disabled:opacity-60"
              >
                {savingDrive || advancingStage ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>
                  {driveUrl.trim()
                    ? savingDrive
                      ? 'Saving…'
                      : 'Release & Finalize'
                    : advancingStage
                      ? 'Updating…'
                      : `Move to ${nextLabel}`}
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenPhotosPage}
                className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                <FolderOpen size={12} className="shrink-0" />
                <span>Photo Studio</span>
              </button>
            </div>
          )}

          {!isClosedStage &&
            !isPaymentStage &&
            !isAssignStage &&
            (currentStatusUpper === 'FINALIZED' || currentStatusUpper === 'PRINTING') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {currentStatusUpper === 'FINALIZED' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onSetStage('PRINTING')}
                      disabled={advancingStage}
                      className="w-full h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap disabled:opacity-60"
                    >
                      {advancingStage ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
                      <span>{advancingStage ? 'Updating…' : 'Start Print Lab'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetStage(isDeliveryOrder ? 'UNDER_DELIVERY' : 'READY')}
                      disabled={advancingStage}
                      className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap disabled:opacity-60"
                    >
                      {isDeliveryOrder ? <Truck size={12} /> : <PackageCheck size={12} />}
                      <span>{isDeliveryOrder ? 'Under Delivery' : 'Ready for Pickup'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSetStage(isDeliveryOrder ? 'UNDER_DELIVERY' : 'READY')}
                      disabled={advancingStage}
                      className="w-full h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap disabled:opacity-60"
                    >
                      {advancingStage ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : isDeliveryOrder ? (
                        <Truck size={13} />
                      ) : (
                        <PackageCheck size={13} />
                      )}
                      <span>{isDeliveryOrder ? 'Dispatch Delivery' : 'Ready for Pickup'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenPhotosPage}
                      className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <FolderOpen size={12} className="shrink-0" />
                      <span>Deliverables</span>
                    </button>
                  </>
                )}
              </div>
            )}

          {!isClosedStage &&
            !isPaymentStage &&
            !isAssignStage &&
            (currentStatusUpper === 'READY' || currentStatusUpper === 'UNDER_DELIVERY') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {remainingBal > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={onOpenPayment}
                      className="w-full h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap"
                    >
                      <CreditCard size={13} />
                      <span>Collect Balance</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetStage('COMPLETED')}
                      disabled={advancingStage}
                      className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap disabled:opacity-60"
                    >
                      <Sparkles size={12} className="shrink-0" />
                      <span>{advancingStage ? 'Updating…' : 'Complete Order'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSetStage('COMPLETED')}
                      disabled={advancingStage}
                      className="w-full h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap disabled:opacity-60"
                    >
                      {advancingStage ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      <span>{advancingStage ? 'Completing…' : 'Complete Order'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenPhotosPage}
                      className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <FolderOpen size={12} className="shrink-0" />
                      <span>Soft Copies</span>
                    </button>
                  </>
                )}
              </div>
            )}

          {!isClosedStage && !isPaymentStage && !isAssignStage && currentStatusUpper === 'COMPLETED' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {remainingBal > 0 ? (
                <button
                  type="button"
                  onClick={onOpenPayment}
                  className="w-full h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap"
                >
                  <CreditCard size={13} />
                  <span>Record Balance</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenPhotosPage}
                  className="w-full h-9 px-3 rounded-xl bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap"
                >
                  <FolderOpen size={13} />
                  <span>Open Deliverables</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenPaymentsPage}
                className="w-full h-9 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                <Receipt size={12} className="shrink-0" />
                <span>Payments Dashboard</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenFullOrder}
            className="w-full h-9 px-3 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Full Order</span>
            <ArrowRight size={13} className="shrink-0" />
          </button>
        </div>
      </div>
    </aside>
  );
}

InspectorStageCard.propTypes = {
  active: PropTypes.object.isRequired,
  profile: PropTypes.object,
  currentStatusUpper: PropTypes.string.isRequired,
  nextStatus: PropTypes.string,
  hasPhotographer: PropTypes.bool.isRequired,
  hasPaymentConfirmed: PropTypes.bool.isRequired,
  needsDownpaymentConfirmation: PropTypes.bool.isRequired,
  gatewayStatus: PropTypes.object.isRequired,
  downPayment: PropTypes.number.isRequired,
  totalAmount: PropTypes.number.isRequired,
  remainingBal: PropTypes.number.isRequired,
  paidPercent: PropTypes.number.isRequired,
  isPaid: PropTypes.bool.isRequired,
  formattedDate: PropTypes.string.isRequired,
  advancingStage: PropTypes.bool.isRequired,
  onOpenPayment: PropTypes.func.isRequired,
  onOpenPaymentsPage: PropTypes.func.isRequired,
  onOpenPhotosPage: PropTypes.func.isRequired,
  onOpenFullOrder: PropTypes.func.isRequired,
  onAdvanceStage: PropTypes.func.isRequired,
  onSetStage: PropTypes.func.isRequired,
  onBookingMutated: PropTypes.func.isRequired,
  onShowToast: PropTypes.func,
};
