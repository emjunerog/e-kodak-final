import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons = {
  success: { Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
  error:   { Icon: XCircle,     color: 'text-red-500',     bg: 'bg-red-50 border-red-200' },
  warning: { Icon: AlertTriangle,color: 'text-amber-500',  bg: 'bg-amber-50 border-amber-200' },
  info:    { Icon: Info,         color: 'text-blue-500',   bg: 'bg-blue-50 border-blue-200' },
};

/**
 * Toast — lightweight notification popup.
 *
 * Usage:
 *   const [toast, setToast] = useState(null);
 *   setToast({ type: 'success', message: 'Saved!' });
 *   // clear with setToast(null) or auto-clears after `duration` ms
 *
 * Props:
 *   toast    — { type, message } | null
 *   onClose  — called when dismissed
 *   duration — auto-dismiss ms (default 3500)
 */
export default function Toast({ toast, onClose, duration = 3500 }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [toast, onClose, duration]);

  if (!toast) return null;

  const { type = 'info', message } = toast;
  const { Icon, color, bg } = icons[type] || icons.info;

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-[9999]
        flex items-center gap-3
        px-4 py-3 rounded-xl shadow-lg border
        font-body text-sm font-medium text-primary
        animate-slide-up
        ${bg}
      `}
      role="alert"
      aria-live="polite"
    >
      <Icon size={18} className={color} />
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-neutral-400 hover:text-primary transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
