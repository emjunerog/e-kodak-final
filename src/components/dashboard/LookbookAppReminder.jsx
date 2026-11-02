import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Smartphone,
  Sparkles,
  Camera,
  ArrowRight,
  Bell,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';

const PORTRAITS = [
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1784967065292-bc024740c3a7?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1787652883101-cbf4dc92a9bb?w=600&auto=format&fit=crop&q=80',
];

/**
 * LookbookAppReminder
 * ===================
 * Customer dashboard promotional card announcing the Studio Lookbook
 * as an upcoming feature exclusive to the e-Kodak Android App:
 * - 3 Overlapping editorial portrait cards
 * - "ANDROID EXCLUSIVE" top badge
 * - Playfair serif headline: "Find your angle before shoot day."
 * - Subtitle highlighting the upcoming mobile experience
 * - Interactive "Notify Me" action with confirmation toast/modal
 * - Faint "LOOKBOOK" background typography
 */
export default function LookbookAppReminder({ className = '' }) {
  const [isNotified, setIsNotified] = useState(() => {
    try {
      return localStorage.getItem('ekodak_lookbook_android_notified') === 'true';
    } catch {
      return false;
    }
  });
  const [showModal, setShowModal] = useState(false);

  const handleNotifyToggle = () => {
    const nextState = !isNotified;
    setIsNotified(nextState);
    try {
      localStorage.setItem('ekodak_lookbook_android_notified', String(nextState));
    } catch {
      // Ignore localStorage errors
    }
    if (nextState) {
      setShowModal(true);
    }
  };

  return (
    <>
      <section
        aria-label="Studio Lookbook Android Exclusive Announcement"
        className={`relative rounded-[32px] overflow-hidden bg-gradient-to-b from-[#faf6ef]/95 via-[#fdfbf7]/90 to-white/95 dark:from-[#171614]/95 dark:via-[#111113]/90 dark:to-[#0d0e10]/95 backdrop-blur-xl border border-neutral-200/90 dark:border-white/[0.08] shadow-xs dark:shadow-2xl p-5 sm:p-6 select-none transition-colors flex flex-col justify-between ${className}`}
      >
        {/* ── Top-Left Ambient Warm Glow ── */}
        <div
          className="absolute top-0 left-0 w-60 h-60 pointer-events-none blur-3xl opacity-50 dark:opacity-35"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 15% 10%, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.06) 50%, transparent 75%)',
          }}
        />

        {/* ── Top Floating Badges ── */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10.5px] font-semibold tracking-wide shadow-2xs">
            <Smartphone size={12} className="stroke-[2.5]" />
            <span>ANDROID EXCLUSIVE</span>
          </div>

          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-600 dark:text-amber-400">
            <Sparkles size={11} />
            <span>Coming Soon</span>
          </span>
        </div>

        {/* ── 3 Overlapping Editorial Portrait Cards (Fan Showcase) ── */}
        <div className="relative pt-3 pb-2 sm:pt-4 sm:pb-3 flex items-center justify-center">
          {/* Card 1: Left (-7deg rotation) */}
          <div className="relative w-[110px] xs:w-[124px] sm:w-[138px] h-[195px] xs:h-[220px] sm:h-[245px] rounded-[22px] sm:rounded-[24px] border-[3.5px] border-white dark:border-neutral-800 shadow-xl shadow-neutral-900/15 dark:shadow-black/50 overflow-hidden -rotate-[7deg] -mr-6 xs:-mr-7 sm:-mr-8 shrink-0 transition-transform hover:-translate-y-1">
            <img
              src={PORTRAITS[0]}
              alt="Studio pose reference 01"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute bottom-2.5 right-2 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white font-mono text-[8.5px] sm:text-[9px] font-normal shadow-xs flex items-center gap-1">
              <Camera size={8} className="opacity-90" />
              <span>01</span>
            </div>
          </div>

          {/* Card 2: Center (tallest, upright) */}
          <div className="relative z-10 w-[126px] xs:w-[142px] sm:w-[158px] h-[224px] xs:h-[252px] sm:h-[280px] rounded-[26px] sm:rounded-[30px] border-[4px] border-white dark:border-neutral-800 shadow-2xl shadow-neutral-900/25 dark:shadow-black/70 overflow-hidden shrink-0 transition-transform hover:scale-105">
            <img
              src={PORTRAITS[1]}
              alt="Studio pose reference 02"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-xs text-amber-400 font-mono text-[8px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1">
              <Layers size={9} />
              <span>App Only</span>
            </div>
            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white font-mono text-[9px] sm:text-[9.5px] font-normal shadow-xs">
              02
            </div>
          </div>

          {/* Card 3: Right (+7deg rotation) */}
          <div className="relative w-[110px] xs:w-[124px] sm:w-[138px] h-[195px] xs:h-[220px] sm:h-[245px] rounded-[22px] sm:rounded-[24px] border-[3.5px] border-white dark:border-neutral-800 shadow-xl shadow-neutral-900/15 dark:shadow-black/50 overflow-hidden rotate-[7deg] -ml-6 xs:-ml-7 sm:-ml-8 shrink-0 transition-transform hover:-translate-y-1">
            <img
              src={PORTRAITS[2]}
              alt="Studio pose reference 03"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute bottom-2.5 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white font-mono text-[8.5px] sm:text-[9px] font-normal shadow-xs">
              03
            </div>
          </div>
        </div>

        {/* ── Editorial Content & Android Action Row ── */}
        <div className="relative z-10 mt-3 sm:mt-4">
          {/* Faint "LOOKBOOK" watermark typography in background */}
          <div
            aria-hidden="true"
            className="absolute -bottom-6 -left-3 right-0 font-heading font-light text-[95px] sm:text-[115px] text-neutral-900/[0.035] dark:text-white/[0.03] select-none pointer-events-none leading-none tracking-tighter overflow-hidden"
          >
            LOOKBOOK
          </div>

          {/* Eyebrow */}
          <p className="text-[9.5px] sm:text-[10px] font-light uppercase tracking-[0.24em] text-[#d97706] dark:text-amber-500 mb-1.5">
            THE STUDIO LOOKBOOK &middot; ANDROID EXCLUSIVE
          </p>

          {/* Headline */}
          <h3 className="font-heading font-light text-2xl xs:text-[26px] sm:text-[30px] lg:text-[32px] text-neutral-900 dark:text-white leading-[1.08] tracking-tight mb-2">
            Find your angle<br />before shoot day.
          </h3>

          {/* Subtitle */}
          <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-light mb-4 max-w-sm">
            Curated poses, styling inspiration, and lighting sets will be available exclusively on the upcoming <strong>e-Kodak Android App</strong>.
          </p>

          {/* Interactive Action Row */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-0.5">
            <button
              type="button"
              onClick={handleNotifyToggle}
              className={`text-xs px-5 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer font-medium group ${
                isNotified
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#d97706] hover:bg-[#b45309] text-neutral-950 hover:text-white'
              }`}
            >
              {isNotified ? (
                <>
                  <CheckCircle2 size={14} className="stroke-[2.5]" />
                  <span>You'll be notified</span>
                </>
              ) : (
                <>
                  <Bell size={13} className="stroke-[2.5] group-hover:rotate-12 transition-transform" />
                  <span>Notify me on launch</span>
                  <ArrowRight size={13} className="stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-light flex items-center gap-1">
              <Smartphone size={11} className="text-emerald-500" />
              <span>Android Exclusive</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Confirmation Modal ── */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#161513] border border-neutral-200 dark:border-neutral-800 p-6 sm:p-7 shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-white"
            >
              <X size={16} />
            </button>

            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Smartphone size={24} />
            </div>

            <h4 className="font-heading font-medium text-xl text-neutral-900 dark:text-white mb-2">
              Studio Lookbook for Android
            </h4>

            <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-5">
              You are on the priority list! As soon as the <strong>Studio Lookbook</strong> launches inside the official e-Kodak Android app, we'll notify your account so you can explore curated poses and styling references on the go.
            </p>

            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 mb-5 flex items-center justify-center gap-2">
              <Sparkles size={13} className="text-amber-500 shrink-0" />
              <span>Includes pose cards, outfit combinations, and bay previews.</span>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-neutral-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

LookbookAppReminder.propTypes = {
  className: PropTypes.string,
};

