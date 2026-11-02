import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share2, Smartphone, Check } from 'lucide-react';

/**
 * AppInstallReminder
 * ------------------
 * Featured promotional card for the E-Kodak mobile app, sitting in the dashboard
 * sidebar and faithfully reproducing the reference layout and phone mockup:
 * - Brand badge: E E-KODAK
 * - Eyebrow: THE E-KODAK, IN YOUR POCKET
 * - Editorial serif heading: "From call time to final selects."
 * - Realistic smartphone showcase ("A REAL LOOK INSIDE THE APP") with the exact session portrait,
 *   live gallery status, and floating "Checked in" & "84 Photos delivered" badges.
 * - 3-item feature checklist with circular amber checkmarks.
 * - Action button: "Get the E-kodak app" + "Available on iOS and Android".
 */
export default function AppInstallReminder({ className = '', featured = false }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setInstallPrompt(null);
    } else {
      setModalOpen(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.origin + '/dashboard');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className={className}>
      {/* Installed confirmation strip */}
      {isInstalled ? (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
          <Smartphone size={16} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-emerald-400">
            E-Kodak app installed
          </span>
        </div>
      ) : featured ? (
        /* ── Sidebar Featured App Card (Light & Dark Frosted Glassmorphism matching reference) ── */
        <div className="relative h-full rounded-[32px] overflow-hidden bg-white/90 dark:bg-[#111215]/90 backdrop-blur-xl text-neutral-900 dark:text-white pt-8 pb-8 sm:pt-9 sm:pb-9 lg:pt-11 lg:pb-11 px-6 sm:px-7 lg:px-8 border border-neutral-200/80 dark:border-white/[0.08] shadow-xs dark:shadow-xl select-none transition-colors flex flex-col justify-between">
          {/* Ambient Warm Amber Glow */}
          <div
            className="absolute -top-12 -right-12 w-64 h-64 pointer-events-none blur-3xl opacity-25 dark:opacity-35"
            style={{
              background: 'radial-gradient(circle at 75% 25%, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.06) 50%, transparent 75%)',
            }}
          />

          <div className="flex flex-col flex-1 min-h-0">
            {/* ── Top Typography ── */}
            <div className="shrink-0 mb-2">
              {/* Eyebrow */}
              <p className="relative z-10 text-[10px] sm:text-[11px] font-light uppercase tracking-[0.22em] text-[#d97706] dark:text-amber-500 mb-1.5">
                E-KODAK, IN YOUR POCKET
              </p>

              {/* Light Playfair Serif Headline */}
              <h3 className="relative z-10 font-heading font-light text-2xl sm:text-3xl lg:text-[34px] text-neutral-900 dark:text-white leading-[1.08] tracking-tight mt-1 mb-2">
                Take the studio with you
              </h3>

              {/* Subtitle */}
              <p className="relative z-10 text-xs sm:text-[13px] text-neutral-600 dark:text-neutral-400 font-sans font-light leading-relaxed">
                Check bookings, follow your shoot, and receive every photo directly on your phone.
              </p>
            </div>

            {/* ── Center Warm Showcase Box (Expands to occupy middle space) ── */}
            <div className="relative z-10 flex-1 my-2 sm:my-3 rounded-[26px] sm:rounded-[30px] border border-neutral-200/70 dark:border-white/[0.06] bg-[#f8f6f0] dark:bg-[#16181d] p-5 sm:p-6 lg:p-7 overflow-hidden shadow-2xs flex items-center">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-6 items-center w-full">
                {/* Left: Phone Preview Mockup (Enlarged) */}
                <div className="sm:col-span-5 flex items-center justify-center">
                  <motion.div
                    initial={{ y: 0 }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative flex items-center justify-center"
                  >
                    <img
                      src="/images/app-preview/phone-sienna-transparent.png"
                      alt="E-Kodak app preview showing gallery and session photos"
                      className="max-h-[225px] xs:max-h-[245px] sm:max-h-[265px] lg:max-h-[285px] w-auto object-contain drop-shadow-2xl select-none"
                      loading="eager"
                    />
                  </motion.div>
                </div>

                {/* Right: 3 Feature Items (Enlarged & Generously Spaced) */}
                <div className="sm:col-span-7 flex flex-col justify-center space-y-4 sm:space-y-5 lg:space-y-6">
                  {/* Feature 1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border border-amber-500/80 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} className="text-[#d97706] dark:text-amber-400 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-[14px] font-normal text-neutral-900 dark:text-white leading-tight">
                        One-tap access
                      </h4>
                      <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-light mt-1 leading-snug">
                        Your bookings in one place
                      </p>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border border-amber-500/80 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} className="text-[#d97706] dark:text-amber-400 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-[14px] font-normal text-neutral-900 dark:text-white leading-tight">
                        Instant updates
                      </h4>
                      <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-light mt-1 leading-snug">
                        Never miss a status change
                      </p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border border-amber-500/80 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} className="text-[#d97706] dark:text-amber-400 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-[14px] font-normal text-neutral-900 dark:text-white leading-tight">
                        Private galleries
                      </h4>
                      <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-light mt-1 leading-snug">
                        View, select, and download
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom Action Row: Button on Left, Subtext on Right ── */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-1 w-full">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleInstall}
              className="py-3 px-6 sm:px-7 rounded-xl bg-[#d97706] hover:bg-[#b45309] active:bg-[#92400e] text-neutral-950 font-normal text-xs sm:text-[13px] tracking-wide inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Download size={14} className="stroke-[2.5]" />
              <span>Get the E-Kodak app</span>
            </motion.button>

            <span className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-light">
              Available on iOS and Android
            </span>
          </div>
        </div>
      ) : (
        /* Compact Install Reminder Strip */
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#17130f] via-[#241a12] to-[#0f1828] text-white p-3.5 ring-1 ring-gold/25">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-500/25 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/15 text-gold border border-gold/30 flex items-center justify-center shrink-0">
              <Smartphone size={16} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white leading-tight">E-Kodak mobile app</p>
              <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                1-tap check-in, shoot alerts, gallery delivery
              </p>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={handleInstall}
              className="h-8.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:brightness-105 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download size={12} />
              <span>Install</span>
            </motion.button>
          </div>
        </div>
      )}

      {/* Install guide modal (when no native prompt is available) */}
      <AnimatePresence>
        {modalOpen && (
          <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-neutral-900 dark:text-neutral-100 font-body"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-gold/15 text-gold flex items-center justify-center border border-gold/30">
                  <Smartphone size={22} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold">Install E-Kodak App</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Add the studio to your home screen
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row items-center gap-4 mb-5">
                <div className="p-2.5 bg-white rounded-xl shadow-xs border border-neutral-200 shrink-0">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.origin + '/dashboard')}&color=1a1a1a&bgcolor=ffffff`}
                    alt="Scan to install the E-Kodak app"
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <div className="space-y-2 text-center sm:text-left min-w-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gold">Scan with iPhone or Android</h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    Open your camera and scan the code to open the E-Kodak app on your phone.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:border-gold cursor-pointer"
                  >
                    <Share2 size={12} className="text-gold" />
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Portal URL'}</span>
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1.5">
                  <span className="font-bold text-primary dark:text-gold block">Apple iOS (Safari)</span>
                  <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-300 text-[11px] leading-relaxed">
                    <li>Tap the <strong>Share</strong> button at bottom</li>
                    <li>Tap <strong>Add to Home Screen</strong></li>
                    <li>Confirm <strong>Add</strong> to launch anytime</li>
                  </ol>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1.5">
                  <span className="font-bold text-primary dark:text-gold block">Android (Chrome)</span>
                  <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-300 text-[11px] leading-relaxed">
                    <li>Tap the <strong>⋮ Menu</strong> top right</li>
                    <li>Select <strong>Install app</strong> or <strong>Add to Home Screen</strong></li>
                    <li>Follow the prompt to add the icon</li>
                  </ol>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

AppInstallReminder.propTypes = {
  className: PropTypes.string,
  featured: PropTypes.bool,
};
