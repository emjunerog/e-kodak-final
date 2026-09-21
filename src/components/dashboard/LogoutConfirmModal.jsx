import React, { useState } from 'react';
import { LogOut, AlertTriangle, ShieldAlert, Loader2, X } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * LogoutConfirmModal
 * Prompts customer with a clear warning before logging out of their portal session.
 * Warns about unsaved edits to shoot specifications, toga sizes, and delivery preferences.
 */
export default function LogoutConfirmModal({ isOpen, onClose, onConfirm, userEmail, userName }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await onConfirm();
    } finally {
      setIsLoggingOut(false);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-primary/60 backdrop-blur-sm px-4 animate-fade-in font-body"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
    >
      <div 
        className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 max-w-md w-full relative overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Decorative Background Accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Close Icon Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoggingOut}
          className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-primary dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400 shadow-sm">
          <LogOut size={26} className="translate-x-0.5" />
        </div>

        {/* Title & Context */}
        <h2 id="logout-dialog-title" className="font-heading text-xl sm:text-2xl font-bold text-primary dark:text-white text-center mb-2">
          Sign Out of Your Portal?
        </h2>
        
        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mb-5 leading-relaxed">
          You are currently signed in as{' '}
          <strong className="text-primary dark:text-neutral-200">
            {userName || userEmail || 'Valued Client'}
          </strong>.
        </p>

        {/* Warning Box */}
        <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 flex items-start gap-3 mb-6 text-left">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed font-body">
            <span className="font-semibold block mb-0.5">Unsaved Changes Notice:</span>
            Please make sure you have saved any recent updates to your <strong>toga sizing</strong>, <strong>academic details</strong>, or <strong>delivery address</strong>. Any uncommitted edits will be discarded.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Stay Signed In
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-red-600 dark:hover:bg-red-600 dark:hover:text-white text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isLoggingOut ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut size={14} />
                <span>Yes, Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

LogoutConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  userEmail: PropTypes.string,
  userName: PropTypes.string,
};
