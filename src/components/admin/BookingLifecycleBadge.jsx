import React from 'react';
import PropTypes from 'prop-types';
import {
  Check,
  Clock,
  AlertCircle,
  Camera,
  CheckCircle2,
  Sparkles,
  Layers,
  Package,
  XCircle,
  CreditCard,
  Truck,
  Wand2,
} from 'lucide-react';
import { 
  getStatusLabel, 
  getStatusTier, 
  getPaymentLabel, 
  getPaymentTier,
  getEffectivePaymentStatus,
} from '../../lib/bookingUtils';

/**
 * BookingLifecycleBadge.jsx
 * -------------------------
 * Clean, icon-rich status & clearance indicator adhering strictly to the 3-color palette
 * (primary #1a1a1a, gold #c9a96e, neutral).
 * Now uses unified bookingUtils as single source of truth.
 */

const STATUS_ICONS = {
  PENDING: Clock,
  RESERVED: Clock,
  CONFIRMED: CheckCircle2,
  PHOTOGRAPHER_ASSIGNED: Camera,
  CAPTURE: Camera,
  IN_PROGRESS: Camera,
  EDITING: Sparkles,
  RETOUCHING: Wand2,
  FINALIZED: Layers,
  PRINTING: Layers,
  READY: Package,
  UNDER_DELIVERY: Truck,
  COMPLETED: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: XCircle,
};

const PAYMENT_ICONS = {
  UNPAID: AlertCircle,
  DOWNPAYMENT: Clock,
  DOWN_PAYMENT: Clock,
  DOWNPAYMENT_PAID: Clock,
  PARTIAL: Clock,
  PAID: Check,
  FULLY_PAID: Check,
  REFUNDED: CreditCard,
};

const TIER_CLASSES = {
  primary: { iconBg: 'bg-primary/10', iconColor: 'text-primary', textColor: 'text-primary', border: 'border-primary/30' },
  gold: { iconBg: 'bg-gold/10', iconColor: 'text-gold-dark', textColor: 'text-gold-dark', border: 'border-gold/30' },
  neutral: { iconBg: 'bg-neutral-100', iconColor: 'text-neutral-500', textColor: 'text-neutral-700', border: 'border-neutral-200' },
};

const PAYMENT_TIER_CLASSES = {
  primary: { classes: 'bg-primary/10 text-primary border-primary/30', iconColor: 'text-primary' },
  gold: { classes: 'bg-gold/10 text-gold-dark border-gold/30', iconColor: 'text-gold-dark' },
  neutral: { classes: 'bg-neutral-900 text-gold border-neutral-800', iconColor: 'text-gold' },
  neutralMuted: { classes: 'bg-neutral-100 text-neutral-500 border-neutral-200', iconColor: 'text-neutral-400' },
};

export default function BookingLifecycleBadge({
  status = 'PENDING',
  paymentStatus = 'UNPAID',
  booking = null,
  layout = 'stacked', // 'stacked' | 'inline'
  showStatus = true,
  showClearance = true,
  showPayment,
}) {
  const clearanceVisible = showPayment !== undefined ? showPayment : showClearance;
  const rawStatus = booking?.status || status || 'PENDING';
  const effectivePayStatus = getEffectivePaymentStatus(booking || paymentStatus);

  const statusKey = String(rawStatus).toUpperCase();
  const paymentKey = String(effectivePayStatus).toUpperCase();

  const statusLabel = getStatusLabel(rawStatus);
  const statusTier = getStatusTier(rawStatus);
  const paymentLabel = getPaymentLabel(effectivePayStatus);
  const paymentTier = getPaymentTier(effectivePayStatus);

  const StatusIcon = STATUS_ICONS[statusKey] || Clock;
  const PaymentIcon = PAYMENT_ICONS[paymentKey] || AlertCircle;

  const sTier = TIER_CLASSES[statusTier] || TIER_CLASSES.neutral;
  const pTier = PAYMENT_TIER_CLASSES[paymentTier] || PAYMENT_TIER_CLASSES.gold;

  // 1. Only render Status
  if (showStatus && !clearanceVisible) {
    return (
      <div className="inline-flex items-center gap-1.5 font-body" title={statusLabel}>
        <div className={`w-5 h-5 rounded-md ${sTier.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
          <StatusIcon size={11} className={sTier.iconColor} />
        </div>
        <span className={`text-xs font-semibold truncate ${sTier.textColor}`}>
          {statusLabel}
        </span>
      </div>
    );
  }

  // 2. Only render Clearance / Payment
  if (!showStatus && clearanceVisible) {
    return (
      <div className="inline-flex items-center font-body" title={`Payment: ${paymentLabel}`}>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${pTier.classes}`}>
          {PaymentIcon && <PaymentIcon size={10} className={pTier.iconColor} />}
          <span>{paymentLabel}</span>
        </span>
      </div>
    );
  }

  // 3. Inline Layout (both status & clearance)
  if (layout === 'inline') {
    return (
      <div className="inline-flex items-center gap-2 flex-wrap font-body text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-neutral-800" title={statusLabel}>
          <span className={`w-4 h-4 rounded-md ${sTier.iconBg} flex items-center justify-center shrink-0`}>
            <StatusIcon size={10} className={sTier.iconColor} />
          </span>
          <span className={sTier.textColor}>{statusLabel}</span>
        </span>

        <span className="text-neutral-300">·</span>

        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${pTier.classes}`}>
          {PaymentIcon && <PaymentIcon size={10} className={pTier.iconColor} />}
          <span>{paymentLabel}</span>
        </span>
      </div>
    );
  }

  // 4. Stacked Layout (both status & clearance)
  return (
    <div className="space-y-1.5 font-body">
      <div className="flex items-center gap-1.5" title={statusLabel}>
        <div className={`w-5 h-5 rounded-md ${sTier.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
          <StatusIcon size={11} className={sTier.iconColor} />
        </div>
        <span className={`text-xs font-semibold truncate ${sTier.textColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${pTier.classes}`}>
          {PaymentIcon && <PaymentIcon size={9} className={pTier.iconColor} />}
          <span>{paymentLabel}</span>
        </span>
      </div>
    </div>
  );
}

BookingLifecycleBadge.propTypes = {
  status: PropTypes.string,
  paymentStatus: PropTypes.string,
  layout: PropTypes.oneOf(['stacked', 'inline']),
  showStatus: PropTypes.bool,
  showClearance: PropTypes.bool,
};