import React from 'react';
import PropTypes from 'prop-types';
import { ArrowRight, Camera, CheckCircle2, Play, Sparkles } from 'lucide-react';
import BookingLifecycleBadge from './BookingLifecycleBadge';
import {
  getNextBookingAction,
  hasAssignedPhotographer,
} from '../../lib/bookingUtils';

const BUTTON_TONE_CLASSES = {
  gold: 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300/80 hover:border-amber-400',
  primary: 'bg-neutral-900 hover:bg-black text-gold border-gold/40 hover:border-gold shadow-2xs',
  dark: 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-800 shadow-2xs',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs',
};

function renderActionIcon(action) {
  const iconClass =
    action?.tone === 'gold'
      ? 'text-amber-700'
      : action?.tone === 'primary'
        ? 'text-gold'
        : '';
  if (action?.type === 'APPROVE_AND_RESERVE') {
    return <CheckCircle2 size={11} className={iconClass} aria-hidden="true" />;
  }
  if (action?.type === 'ASSIGN_PHOTOGRAPHER') {
    return <Camera size={11} className={iconClass} aria-hidden="true" />;
  }
  if (action?.nextStatus === 'CAPTURE') {
    return <Play size={11} className={iconClass} aria-hidden="true" />;
  }
  if (action?.nextStatus === 'COMPLETED') {
    return <CheckCircle2 size={11} className={iconClass} aria-hidden="true" />;
  }
  return <Sparkles size={11} className={iconClass} aria-hidden="true" />;
}

/**
 * OrderProgressControl
 * --------------------
 * Renders the current Order Progress status alongside a direct, confirmation-gated
 * action button to move the booking to its next required studio stage.
 */
export default function OrderProgressControl({
  booking,
  statusOverride = null,
  onTriggerAction,
  badgeVariant = 'text',
  compact = false,
}) {
  const rawStatus = statusOverride || booking?.status || 'PENDING';
  const statusUpper = String(rawStatus).toUpperCase();
  const hasPhotog = hasAssignedPhotographer(booking);

  // If status says PHOTOGRAPHER_ASSIGNED but no photographer_id is attached, show Approved & Reserved
  const displayStatus =
    statusUpper === 'PHOTOGRAPHER_ASSIGNED' && !hasPhotog ? 'CONFIRMED' : rawStatus;

  const effectiveBooking = { ...booking, status: displayStatus };
  const action = getNextBookingAction(effectiveBooking);
  const needsPhotographer = Boolean(action?.requiresPhotographer && !hasPhotog);

  return (
    <div className={`flex ${compact ? 'flex-col items-start gap-1.5' : 'flex-wrap items-center justify-between gap-2'}`}>
      <div className="min-w-0">
        <BookingLifecycleBadge
          status={displayStatus}
          showStatus={true}
          showClearance={false}
          variant={badgeVariant}
        />
      </div>

      {action && onTriggerAction && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTriggerAction(booking, action);
          }}
          aria-label={`${action.label} for booking #${booking?.booking_number || ''}`.trim()}
          title={
            needsPhotographer
              ? 'Assign a photographer first before proceeding to pictorial'
              : action.isPhotographerAction
                ? `${action.label} (${action.overrideHint || 'With photographer — click to override as Admin'})`
                : `${action.label} (moves to ${action.nextLabel})`
          }
          className={`h-7 px-2.5 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-[0.98] ${
            needsPhotographer || action.isPhotographerAction
              ? 'bg-neutral-100 text-neutral-400 border-neutral-200 opacity-70 hover:opacity-100 hover:bg-neutral-200/70 hover:text-neutral-700'
              : BUTTON_TONE_CLASSES[action.tone] || BUTTON_TONE_CLASSES.dark
          }`}
        >
          {renderActionIcon(action)}
          <span>{action.label}</span>
          <ArrowRight size={10} className="opacity-75" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

OrderProgressControl.propTypes = {
  booking: PropTypes.object.isRequired,
  statusOverride: PropTypes.string,
  onTriggerAction: PropTypes.func,
  badgeVariant: PropTypes.oneOf(['text', 'badge']),
  compact: PropTypes.bool,
};
