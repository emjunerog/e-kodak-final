/**
 * StatusBadge.jsx
 * ----------------
 * Reusable booking status and payment status badge.
 * Keeps status color logic in one place — never duplicated across pages.
 *
 * Usage:
 *   <StatusBadge status="PENDING" />
 *   <PaymentBadge status="PARTIAL" />
 */

// ── Booking Status Badge ───────────────────────────────────────────────────────

const BOOKING_CONFIG = {
  PENDING:              { label: 'Pending',              classes: 'bg-amber-50 text-amber-700 border-amber-200'     },
  CONFIRMED:            { label: 'Confirmed',            classes: 'bg-blue-50 text-blue-700 border-blue-200'        },
  PHOTOGRAPHER_ASSIGNED:{ label: 'Photographer Assigned',classes: 'bg-indigo-50 text-indigo-700 border-indigo-200'  },
  CAPTURE:              { label: 'Capture',              classes: 'bg-violet-50 text-violet-700 border-violet-200'  },
  EDITING:              { label: 'Editing',              classes: 'bg-purple-50 text-purple-700 border-purple-200'  },
  PRINTING:             { label: 'Printing',             classes: 'bg-cyan-50 text-cyan-700 border-cyan-200'        },
  READY:                { label: 'Ready',                classes: 'bg-emerald-50 text-emerald-700 border-emerald-200'},
  COMPLETED:            { label: 'Completed',            classes: 'bg-green-50 text-green-700 border-green-200'     },
  REJECTED:             { label: 'Rejected',             classes: 'bg-red-50 text-red-700 border-red-200'           },
  CANCELLED:            { label: 'Cancelled',            classes: 'bg-neutral-100 text-neutral-500 border-neutral-200'},
};

// ── Payment Status Badge ───────────────────────────────────────────────────────

const PAYMENT_CONFIG = {
  UNPAID:   { label: 'Unpaid',   classes: 'bg-red-50 text-red-700 border-red-200'          },
  PARTIAL:  { label: 'Partial',  classes: 'bg-amber-50 text-amber-700 border-amber-200'    },
  PAID:     { label: 'Paid',     classes: 'bg-emerald-50 text-emerald-700 border-emerald-200'},
  REFUNDED: { label: 'Refunded', classes: 'bg-neutral-100 text-neutral-500 border-neutral-200'},
};

export function StatusBadge({ status }) {
  const config = BOOKING_CONFIG[status] || { label: status || 'Unknown', classes: 'bg-neutral-100 text-neutral-500 border-neutral-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}>
      {config.label}
    </span>
  );
}

export function PaymentBadge({ status }) {
  const config = PAYMENT_CONFIG[status] || { label: status || 'Unknown', classes: 'bg-neutral-100 text-neutral-500 border-neutral-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}>
      {config.label}
    </span>
  );
}
