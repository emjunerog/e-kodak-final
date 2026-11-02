import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * StudioExperienceBanner
 * Faithful recreation of the reference design (media_1793062248373.png):
 * - Left column:
 *   - Eyebrow: THE E-KODAK STANDARD
 *   - Grand serif headline: "Less waiting." + golden italic "More creating."
 *   - Description: "Simple tools that keep your shoot organized from booking through final delivery."
 *   - Bottom guarantee mark: Circular amber 'E' badge + "Designed around you / Clear, private, and always accessible"
 * - Right column:
 *   - 3 stacked rows separated by clean dividing rules:
 *     01 · IN PROGRESS · Follow every milestone · Track your order →
 *     02 · PRIVATE BY DEFAULT · Review your gallery · Open gallery →
 *     03 · ALWAYS WITH YOU · Manage it on mobile · Get the app →
 * - Full Light Theme & Dark Theme with frosted glassmorphism blur.
 */
export default function StudioExperienceBanner({ className = '', bookings = [] }) {
  const activeBooking =
    bookings.find((b) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status)) ||
    bookings[0] ||
    null;

  const milestones = [
    {
      num: '01',
      eyebrow: activeBooking ? 'IN PROGRESS' : 'ACTIVE WORKFLOW',
      title: 'Follow every milestone',
      desc: 'See booking, shoot, editing, and release updates as they happen.',
      linkText: 'Track your order',
      to: '/dashboard/bookings',
    },
    {
      num: '02',
      eyebrow: 'PRIVATE BY DEFAULT',
      title: 'Review your gallery',
      desc: 'Favorite your best frames and download finished photos securely.',
      linkText: 'Open gallery',
      to: '/dashboard/gallery',
    },
    {
      num: '03',
      eyebrow: 'ALWAYS WITH YOU',
      title: 'Manage it on mobile',
      desc: 'Keep bookings, receipts, updates, and photos together in the app.',
      linkText: 'Get the app',
      to: '/dashboard/bookings',
    },
  ];

  return (
    <section
      aria-label="The E-Kodak Standard"
      className={`relative rounded-[32px] overflow-hidden bg-white/90 dark:bg-[#0e0f13]/90 backdrop-blur-xl border border-neutral-200/80 dark:border-white/[0.08] p-6 sm:p-8 lg:p-9 shadow-xs dark:shadow-xl select-none transition-colors ${className}`}
    >
      {/* ── Warm ambient flare in bottom-left corner ── */}
      <div
        className="absolute -bottom-16 -left-16 w-72 h-72 pointer-events-none blur-3xl opacity-35 dark:opacity-25"
        style={{
          background: 'radial-gradient(circle at 25% 75%, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.08) 50%, transparent 75%)',
        }}
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        {/* ── Left Column: Editorial Headline Centered (Light Font Weights) ── */}
        <div className="lg:col-span-5 flex flex-col justify-center min-w-0 pr-0 lg:pr-2">
          {/* Eyebrow */}
          <p className="text-[10px] sm:text-[11px] font-light uppercase tracking-[0.24em] text-[#d97706] dark:text-amber-500 mb-2.5">
            THE E-KODAK STANDARD
          </p>

          {/* Headline: Less waiting. More creating. (Light Serif) */}
          <h3 className="font-heading font-light text-3xl sm:text-4xl lg:text-[44px] leading-[1.04] tracking-tight text-neutral-900 dark:text-white">
            <span className="font-light">Less waiting.</span>
            <span className="font-heading italic font-light text-[#d97706] dark:text-amber-400 block mt-0.5">
              More creating.
            </span>
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-[13px] text-neutral-600 dark:text-neutral-400 font-sans font-light leading-relaxed mt-3.5 max-w-[340px]">
            Simple tools that keep your shoot organized from booking through final delivery.
          </p>
        </div>

        {/* ── Right Column: 3 Horizontal Milestone Rows (Light Font Weights) ── */}
        <div className="lg:col-span-7 flex flex-col justify-center border-t border-b border-neutral-200/70 dark:border-neutral-800/80 divide-y divide-neutral-200/70 dark:divide-neutral-800/80 min-w-0">
          {milestones.map((item) => (
            <div
              key={item.num}
              className="py-4 sm:py-5 flex items-start sm:items-center justify-between gap-4 min-w-0"
            >
              {/* Left group: Number + Text */}
              <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
                <span className="font-mono font-light text-xs text-[#d97706] dark:text-amber-500 shrink-0 pt-0.5 w-5">
                  {item.num}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[9.5px] font-light uppercase tracking-[0.2em] text-[#d97706] dark:text-amber-500 mb-0.5">
                    {item.eyebrow}
                  </p>
                  <h4 className="font-heading font-light text-base sm:text-lg text-neutral-900 dark:text-white leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-sans font-light mt-0.5 leading-relaxed max-w-md">
                    {item.desc}
                  </p>
                </div>
              </div>

              {/* Right action link */}
              <Link
                to={item.to}
                className="text-xs font-light text-neutral-700 hover:text-[#d97706] dark:text-neutral-300 dark:hover:text-amber-400 inline-flex items-center gap-1.5 transition-colors shrink-0 group/link whitespace-nowrap pt-1 sm:pt-0"
              >
                <span>{item.linkText}</span>
                <ArrowRight size={13} className="group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

StudioExperienceBanner.propTypes = {
  className: PropTypes.string,
  bookings: PropTypes.arrayOf(PropTypes.object),
};
