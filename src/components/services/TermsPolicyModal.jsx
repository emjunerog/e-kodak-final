/**
 * TermsPolicyModal.jsx
 * ====================
 * High-end studio booking and payment rules modal.
 * Opens from the "Review Full Policy" button on the services page.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Check, X, CreditCard, Calendar, Clock } from "lucide-react";
import { ease } from "../../lib/motion";

export default function TermsPolicyModal({ isOpen, onClose, onAgree }) {
  const [agreed, setAgreed] = useState(true);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onAgree) onAgree();
    onClose();
  };

  const policies = [
    {
      icon: CreditCard,
      title: "50% Down Payment to Secure Slot",
      desc: "A non-refundable 50% reservation fee is required upon booking to officially confirm and lock your preferred studio schedule, creative team, and stylist.",
    },
    {
      icon: Check,
      title: "Remaining 50% Balance on Shoot Day",
      desc: "The remaining balance must be settled on the day of your session prior to commencing the photoshoot. Accepted: GCash, Maya, Bank Transfer (BPI, BDO), or Cash.",
    },
    {
      icon: Calendar,
      title: "Flexible Rescheduling Notice",
      desc: "Rescheduling is honored free of charge if requested at least 3 business days prior to your session date, subject to studio slot availability.",
    },
    {
      icon: Clock,
      title: "Punctuality & Studio Call Time",
      desc: "Please arrive 15 minutes before your booked time. For sets that include hair & makeup styling (HMUA), styling commences right on your reserved start hour.",
    },
    {
      icon: Shield,
      title: "Digital Delivery & Turnaround",
      desc: "High-resolution edited portraits and soft copies undergo thorough color-grading and quality control. Standard turnaround is 5–7 business days via our secure client portal.",
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.35, ease: ease.expo }}
          className="relative w-full max-w-xl bg-neutral-950 border border-gold/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-white overflow-hidden my-auto z-10"
        >
          {/* Subtle gold ambient glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-gold/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="space-y-2 mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-[11px] font-body font-semibold uppercase tracking-wider">
              <Shield size={12} />
              Studio Rules & Payment Policy
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Booking Policy & Payment Terms
            </h2>
            <p className="font-body text-neutral-400 text-xs sm:text-sm leading-relaxed">
              Please review our studio payment requirements and reservation policies before browsing our photography packages.
            </p>
          </div>

          {/* Policy items */}
          <div className="space-y-3.5 max-h-[46vh] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
            {policies.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/5 hover:border-gold/20 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-gold/15 border border-gold/30 text-gold flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={16} />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-body text-sm font-semibold text-neutral-100">
                      {item.title}
                    </h4>
                    <p className="font-body text-xs text-neutral-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Agreement Checkbox & Confirm CTA */}
          <div className="mt-6 pt-5 border-t border-white/10 space-y-4">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-neutral-700 bg-neutral-900 text-gold focus:ring-gold accent-[#d4af37] w-4 h-4 cursor-pointer"
              />
              <span className="font-body text-xs text-neutral-300 leading-snug">
                I have read, understood, and agree to the 50% reservation deposit rule and studio policies.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!agreed}
                className={`w-full py-3.5 px-6 rounded-xl font-body text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                  agreed
                    ? "bg-gradient-to-r from-gold to-gold-light text-primary shadow-gold hover:shadow-gold-lg hover:from-gold-light hover:to-gold active:scale-98 cursor-pointer"
                    : "bg-white/10 text-neutral-500 cursor-not-allowed"
                }`}
              >
                <Check size={16} />
                <span>Acknowledge & View Services</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
