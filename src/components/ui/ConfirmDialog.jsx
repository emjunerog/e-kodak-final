import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * ConfirmDialog — modal confirmation dialog.
 *
 * Usage:
 *   const [dialog, setDialog] = useState(null);
 *   setDialog({
 *     title: 'Cancel Booking?',
 *     message: 'This cannot be undone.',
 *     confirmLabel: 'Yes, Cancel',
 *     confirmClass: 'bg-red-600 text-white hover:bg-red-700',
 *     requireNote: true,          // optional — shows a remarks textarea
 *     notePlaceholder: 'Reason…', // placeholder for the textarea
 *     onConfirm: async (note) => { await doSomething(note); }
 *   });
 *
 * Props:
 *   dialog   — config object | null
 *   onClose  — called after confirm or cancel
 *   loading  — shows spinner on confirm button
 */
export default function ConfirmDialog({ dialog, onClose, loading = false }) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (dialog) setNote('');
  }, [dialog]);

  if (!dialog) return null;

  const {
    title        = 'Are you sure?',
    message      = 'This action cannot be undone.',
    confirmLabel = 'Confirm',
    cancelLabel  = 'Cancel',
    confirmClass = 'bg-red-600 text-white hover:bg-red-700',
    requireNote  = false,
    notePlaceholder = 'Add a remark (optional)…',
    onConfirm,
    icon: Icon   = AlertTriangle,
    iconColor    = 'text-red-500',
    iconBg       = 'bg-red-50',
  } = dialog;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-primary/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 ${iconBg}`}>
          <Icon size={28} className={iconColor} />
        </div>

        <h2 className="font-heading text-2xl text-primary text-center mb-2">{title}</h2>
        <p className="font-body text-neutral-500 text-sm text-center mb-6 leading-relaxed">{message}</p>

        {/* Optional remarks textarea */}
        {requireNote && (
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={notePlaceholder}
            rows={3}
            className="w-full mb-6 border border-neutral-200 rounded-lg px-3 py-2.5 text-sm font-body text-primary placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold resize-none"
          />
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 btn-outline py-2.5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={async () => {
              if (onConfirm) await onConfirm(note);
              onClose();
            }}
            disabled={loading}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-lg font-body font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
