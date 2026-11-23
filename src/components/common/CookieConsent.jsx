/**
 * CookieConsent.jsx
 * =================
 * Minimal, non-repetitive Cookie Notice banner and native `<dialog>`
 * Cookie Settings modal for E-Kodak Studio.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import {
  COOKIE_CONSENT_UPDATED_EVENT,
  OPEN_COOKIE_PREFERENCES_EVENT,
  getCookieConsent,
  saveCookieConsent,
} from "../../lib/cookies";

const OPTIONAL_CATEGORIES = [
  {
    key: "preferences",
    title: "Studio Preferences",
    description: "Theme appearance, gallery filters, and form selections.",
  },
  {
    key: "analytics",
    title: "Site Insights",
    description: "Anonymous visit trends to help improve our services.",
  },
];

export default function CookieConsent() {
  const [consent, setConsent] = useState(() => getCookieConsent());
  const [preferencesDraft, setPreferencesDraft] = useState(
    () => consent?.preferences ?? false
  );
  const [analyticsDraft, setAnalyticsDraft] = useState(
    () => consent?.analytics ?? false
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dialogRef = useRef(null);

  const openModal = () => {
    const current = getCookieConsent();
    setPreferencesDraft(Boolean(current?.preferences));
    setAnalyticsDraft(Boolean(current?.analytics));
    setIsModalOpen(true);
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  };

  const closeModal = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    }
    setIsModalOpen(false);
  };

  useEffect(() => {
    const handleOpenRequest = () => openModal();
    const handleConsentSync = (event) => {
      if (event?.detail) {
        setConsent(event.detail);
      }
    };

    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handleOpenRequest);
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, handleConsentSync);

    return () => {
      window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handleOpenRequest);
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, handleConsentSync);
    };
  }, []);

  // Native <dialog> close + pointer light-dismiss fallback where `closedby` is unsupported
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const handleNativeClose = () => {
      dialog.returnValue = "";
      setIsModalOpen(false);
    };
    dialog.addEventListener("close", handleNativeClose);

    if ("closedBy" in HTMLDialogElement.prototype) {
      return () => dialog.removeEventListener("close", handleNativeClose);
    }

    const isOutsideDialog = (event) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };

    let pressedOutside = false;
    const handlePointerDown = (event) => {
      pressedOutside = isOutsideDialog(event);
    };
    const handlePointerUp = (event) => {
      if (pressedOutside && isOutsideDialog(event)) {
        dialog.close();
      }
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);

    return () => {
      dialog.removeEventListener("close", handleNativeClose);
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handleAcceptAll = () => {
    const saved = saveCookieConsent({ preferences: true, analytics: true });
    setConsent(saved);
    closeModal();
  };

  const handleEssentialOnly = () => {
    const saved = saveCookieConsent({ preferences: false, analytics: false });
    setConsent(saved);
    closeModal();
  };

  const handleSaveCustom = () => {
    const saved = saveCookieConsent({
      preferences: preferencesDraft,
      analytics: analyticsDraft,
    });
    setConsent(saved);
    closeModal();
  };

  return (
    <>
      {!consent && !isModalOpen && (
        <aside
          aria-label="Cookie notice"
          className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-40 rounded-2xl border border-gold/25 bg-neutral-950/95 text-neutral-100 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <Cookie size={18} className="text-gold shrink-0 mt-0.5" aria-hidden="true" />

            <div className="min-w-0 flex-1 space-y-3">
              <p className="font-body text-xs leading-relaxed text-neutral-300">
                We use cookies to keep sign-in and bookings secure, plus optional storage to remember your experience.{" "}
                <Link
                  to="/privacy"
                  className="text-gold underline underline-offset-2 hover:text-gold-light"
                >
                  Privacy Policy
                </Link>
              </p>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={openModal}
                  className="mr-auto font-body text-xs font-medium text-neutral-400 hover:text-gold transition-colors cursor-pointer"
                >
                  Manage
                </button>
                <button
                  type="button"
                  onClick={handleEssentialOnly}
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold font-body text-neutral-200 transition-colors hover:bg-white/[0.09] cursor-pointer"
                >
                  Essential Only
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="rounded-xl bg-gradient-to-r from-[#e5be70] via-[#c9a96e] to-[#e8d5b0] px-3.5 py-1.5 text-xs font-bold font-body text-neutral-950 transition-opacity hover:opacity-95 cursor-pointer"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      <dialog
        ref={dialogRef}
        closedby="any"
        aria-labelledby="cookie-modal-title"
        className="studio-dialog m-auto w-[min(92vw,29rem)] rounded-3xl border border-gold/25 bg-neutral-950 text-neutral-100 p-0 shadow-2xl"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2
                id="cookie-modal-title"
                className="font-heading text-xl font-semibold text-white"
              >
                Cookie Settings
              </h2>
              <p className="font-body text-xs text-neutral-400">
                Sign-in sessions, Turnstile checks, and active bookings remain enabled.
              </p>
            </div>

            <button
              type="button"
              onClick={closeModal}
              autoFocus
              aria-label="Close cookie settings"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300 transition-colors hover:bg-white/[0.1] hover:text-white cursor-pointer"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>

          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
            {OPTIONAL_CATEGORIES.map((category) => {
              const checked =
                category.key === "preferences"
                  ? preferencesDraft
                  : analyticsDraft;

              const toggle = () => {
                if (category.key === "preferences") {
                  setPreferencesDraft((prev) => !prev);
                } else {
                  setAnalyticsDraft((prev) => !prev);
                }
              };

              return (
                <li
                  key={category.key}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="space-y-0.5">
                    <span className="block font-body text-sm font-medium text-white">
                      {category.title}
                    </span>
                    <p className="font-body text-xs leading-relaxed text-neutral-400">
                      {category.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={`Toggle ${category.title}`}
                    onClick={toggle}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      checked ? "bg-gold" : "bg-neutral-800 border border-white/15"
                    }`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full transition-transform shadow-xs ${
                        checked
                          ? "translate-x-5 bg-neutral-950"
                          : "translate-x-0 bg-neutral-300"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between gap-3 pt-1">
            <Link
              to="/privacy"
              onClick={closeModal}
              className="font-body text-xs text-neutral-400 hover:text-gold transition-colors"
            >
              Privacy Policy
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold font-body text-neutral-200 transition-colors hover:bg-white/[0.09] cursor-pointer"
              >
                Decline Optional
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="rounded-xl bg-gradient-to-r from-[#e5be70] via-[#c9a96e] to-[#e8d5b0] px-4 py-2 text-xs font-bold font-body text-neutral-950 transition-opacity hover:opacity-95 cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
