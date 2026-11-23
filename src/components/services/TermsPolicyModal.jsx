/**
 * TermsPolicyModal.jsx
 * ====================
 * Full studio booking policy, terms, and Philippine legal protections presented
 * as one continuous, readable document inside a native <dialog>.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, ExternalLink } from "lucide-react";

const POLICY_SECTIONS = [
  {
    number: "01",
    title: "Transparent Pricing & Consumer Quality Guarantee",
    law: "Republic Act No. 7394 · Consumer Act of the Philippines (Arts. 81–83)",
    paragraphs: [
      "All package rates, set inclusions, downpayment requirements, and optional add-ons are disclosed upfront prior to booking with zero hidden fees.",
      "Delivered prints, frames, and edited digital copies must match the booked package specifications. If a material defect or missing deliverable occurs due to studio fault, the client is entitled to a complimentary re-edit, re-shoot, or proportionate price adjustment.",
    ],
  },
  {
    number: "02",
    title: "50% Reservation Downpayment & Shoot-Day Balance",
    law: "Republic Act No. 386 · Civil Code of the Philippines (Arts. 1159 & 1306)",
    paragraphs: [
      "Settling the 50% downpayment establishes a binding service contract that locks your chosen date, studio bay, photographer, and hair & makeup (HMUA) team.",
      "The remaining 50% balance must be paid on shoot day prior to starting the session. Because confirmed reservations block calendar capacity and turn away other clients, voluntary cancellations or no-shows initiated by the client make the reservation downpayment non-refundable and non-transferable.",
    ],
  },
  {
    number: "03",
    title: "Rescheduling, Force Majeure & Studio Cancellation",
    law: "Republic Act No. 386 · Civil Code (Art. 1174 · Fortuitous Events)",
    paragraphs: [
      "Clients may reschedule once free of charge when requested at least 72 hours (3 business days) before the scheduled session, subject to studio availability.",
      "Neither party is liable for delays or cancellations caused by fortuitous events—such as typhoons (PAGASA storm signals), earthquakes, flooding, utility outages, or government public health orders—in which case complimentary rebooking or fair studio credit applies. If E-Kodak must cancel or cannot fulfill a confirmed session without fault of the client, the client is entitled to priority rebooking or a full 100% refund of all amounts paid.",
    ],
  },
  {
    number: "04",
    title: "Electronic Bookings, Receipts & Anti-Fraud Protection",
    law: "Republic Act No. 8792 · E-Commerce Act & Republic Act No. 10175",
    paragraphs: [
      "Digital bookings, QR studio passes, and verified electronic transfers (GCash, Maya, BPI, BDO, or Cash) are legally recognized electronic records. E-Kodak issues electronic or official receipts upon verification and safeguards clients against duplicate charges.",
      "Submitting falsified or altered payment screenshots, initiating bad-faith chargebacks after services have been rendered, or tampering with portal or QR systems voids the booking immediately and subjects the offender to applicable civil and criminal remedies under Philippine law.",
    ],
  },
  {
    number: "05",
    title: "Punctuality, Studio Conduct & Equipment Care",
    law: "Civil Code · Obligations & Studio Premises Safety",
    paragraphs: [
      "Clients are advised to arrive 15 minutes before their reserved slot. HMUA styling and shooting time begin promptly at the booked start hour; late arrivals may result in reduced shoot duration without fee reduction so subsequent client bookings are not delayed.",
      "Clients and accompanying guests must handle studio cameras, lighting, backdrops, props, and rented toga or Filipiniana attire with reasonable care. Intentional or grossly negligent damage is chargeable at repair or replacement cost. E-Kodak commits to maintaining a safe, respectful, and non-discriminatory studio environment for every guest.",
    ],
  },
  {
    number: "06",
    title: "Copyright Ownership, RAW Files & Client License",
    law: "Republic Act No. 8293 · Intellectual Property Code (Secs. 172 & 178)",
    paragraphs: [
      "E-Kodak retains copyright and creative ownership over all captured photographs and unedited RAW files. Unedited RAW files are not included in standard packages unless separately contracted in writing.",
      "Upon full payment, clients receive a perpetual, royalty-free personal and family license to print, archive, and share delivered portraits. E-Kodak will never sell client photos to third parties; portfolio or promotional display requires client consent, and clients may opt out or request removal at any time.",
    ],
  },
  {
    number: "07",
    title: "Personal Data, Minor Consent & Image Privacy",
    law: "Republic Act No. 10173 · Data Privacy Act of 2012 (NPC Standards)",
    paragraphs: [
      "Personal contact information, school or graduation details, and session images are processed strictly to fulfill your booking, post-processing, and secure client-portal delivery.",
      "Under the Data Privacy Act, you hold the right to be informed, access, rectify inaccurate records, object to promotional use, or request erasure when data is no longer needed for contract or statutory purposes. Bookings and public image permissions involving minors require the authorization of a parent or legal guardian.",
    ],
  },
  {
    number: "08",
    title: "Delivery Timeline, Liability Cap & Dispute Resolution",
    law: "DTI Fair Trade Rules & Philippine Small Claims / Venue",
    paragraphs: [
      "Standard edited digital copies are delivered within 5–7 business days via the client portal (or faster where rush options apply). While E-Kodak maintains redundant backups, in the rare event of catastrophic hardware failure or accidental data loss, the studio's maximum liability is capped at a full refund of all amounts paid for the session plus a complimentary re-shoot where practicable.",
      "Any concern or dispute is addressed first through good-faith studio mediation within 5 business days. Nothing in these terms waives a consumer's statutory right to seek mediation or redress before the Department of Trade and Industry (DTI) Fair Trade Enforcement Bureau or competent Philippine courts.",
    ],
  },
];

export default function TermsPolicyModal({ isOpen, onClose, onAgree }) {
  const dialogRef = useRef(null);
  const [agreed, setAgreed] = useState(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return undefined;

    const isOutside = (event) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };

    let pressedOutside = false;
    const onPointerDown = (event) => {
      pressedOutside = isOutside(event);
    };
    const onPointerUp = (event) => {
      if (pressedOutside && isOutside(event)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const handleClose = () => {
    if (onClose) onClose();
  };

  const handleConfirm = () => {
    if (!agreed) return;
    if (onAgree) onAgree();
    handleClose();
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="policy-modal-title"
      onClose={handleClose}
      className="policy-dialog m-auto w-[min(94vw,46rem)] max-h-[90vh] rounded-3xl bg-neutral-950 border border-gold/30 p-0 text-white shadow-warm-xl overflow-hidden"
    >
      <div className="relative flex flex-col max-h-[90vh] p-6 sm:p-8">
        {/* Subtle gold ambient glow */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-gold/15 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-gold/10 blur-3xl pointer-events-none"
        />

        {/* Close button */}
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold cursor-pointer"
          aria-label="Close booking policy modal"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="relative pr-10 pb-4 mb-5 border-b border-white/10 shrink-0">
          <h2
            id="policy-modal-title"
            className="font-heading text-2xl sm:text-3xl font-semibold text-white tracking-tight"
          >
            Booking Policy, Consumer &amp; Business Terms
          </h2>
        </div>

        {/* Continuous Detailed Read */}
        <article className="relative flex-1 min-h-0 overflow-y-auto pr-2 sm:pr-3 custom-scrollbar">
          <div className="divide-y divide-white/10">
            {POLICY_SECTIONS.map((section, idx) => (
              <section
                key={section.number}
                className={idx === 0 ? "pb-6" : "py-6"}
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="font-body text-xs font-bold tracking-widest text-gold tabular-nums">
                    {section.number}
                  </span>
                  <h3 className="font-heading text-base sm:text-lg font-semibold text-white">
                    {section.title}
                  </h3>
                </div>
                <p className="mt-1 font-body text-xs font-medium text-gold/90">
                  {section.law}
                </p>
                <div className="mt-3 space-y-2.5">
                  {section.paragraphs.map((text, pIdx) => (
                    <p
                      key={pIdx}
                      className="font-body text-sm text-neutral-300 leading-relaxed"
                    >
                      {text}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        {/* Footer: Legal Page Links + Agreement Checkbox + Confirm CTA */}
        <div className="relative mt-5 pt-4 border-t border-white/10 space-y-3.5 shrink-0">
          <div className="flex flex-wrap items-center justify-end gap-4 text-xs font-body">
            <Link
              to="/terms"
              onClick={handleClose}
              className="inline-flex items-center gap-1 text-gold hover:text-gold-light transition-colors"
            >
              Full Terms of Service <ExternalLink size={12} />
            </Link>
            <Link
              to="/privacy"
              onClick={handleClose}
              className="inline-flex items-center gap-1 text-gold hover:text-gold-light transition-colors"
            >
              Privacy Policy <ExternalLink size={12} />
            </Link>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-neutral-700 bg-neutral-900 text-gold focus:ring-gold accent-gold w-4 h-4 cursor-pointer"
            />
            <span className="font-body text-xs text-neutral-300 leading-snug">
              I have read, understood, and agree to the 50% reservation policy, studio terms, and Philippine consumer &amp; data privacy notices.
            </span>
          </label>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!agreed}
            className={`w-full py-3.5 px-6 rounded-xl font-body text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
              agreed
                ? "bg-gradient-to-r from-gold to-gold-light text-primary shadow-gold hover:shadow-gold-lg hover:brightness-105 active:scale-[0.99] cursor-pointer"
                : "bg-white/10 text-neutral-500 cursor-not-allowed"
            }`}
          >
            <Check size={16} />
            <span>Acknowledge &amp; Continue Browsing</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
