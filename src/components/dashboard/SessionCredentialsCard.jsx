import React, { useState, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
  Download,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { QRCodeSVG } from '../../lib/qr.tsx';
import { getQRCodePublicUrl } from '../../services/qrService';
import { SERVICES } from '../../data/servicesData';

/**
 * Resolves the official deliverables and inclusions for this booking's specific tier.
 * Prioritizes live service tier definitions, with standard catalog fallback.
 */
function resolveTierHighlights(booking) {
  if (!booking?.tier_name) return [];

  const tierKey = booking.tier_name.trim().toLowerCase();

  // 1. Check live joined service tiers from database
  const liveTiers = booking?.service?.tiers || [];
  if (Array.isArray(liveTiers)) {
    const matched = liveTiers.find((t) => t.name?.trim().toLowerCase() === tierKey);
    if (matched?.highlights?.length) return matched.highlights;
    if (matched?.inclusions?.length) return matched.inclusions;
  }

  // 2. Check catalog services tiers
  for (const s of SERVICES) {
    if (Array.isArray(s.tiers)) {
      const matched = s.tiers.find((t) => t.name?.trim().toLowerCase() === tierKey);
      if (matched?.highlights?.length) return matched.highlights;
      if (matched?.inclusions?.length) return matched.inclusions;
    }
  }

  // 3. Service level inclusions fallback
  if (Array.isArray(booking?.service?.inclusions) && booking.service.inclusions.length > 0) {
    return booking.service.inclusions;
  }

  return [];
}

/**
 * Formats inclusion string into clean "X × Description" if possible
 */
function formatInclusionText(text) {
  if (!text) return '';
  const cleaned = text.replace(/^•\s*/, '').trim();
  const match = cleaned.match(/^(\d+)\s*(?:pieces?|pcs?)\s*(.*)/i);
  if (match) {
    return `${match[1]} × ${match[2]}`;
  }
  return cleaned;
}

/**
 * SessionCredentialsCard
 * Faithful recreation of the reference design:
 * - General Light & Dark theme support with frosted glassmorphism blur.
 * - Left column: ALL CENTER-ALIGNED with heavy extra-bold serif headline, centered reticle-framed QR code,
 *   centered order reference, and centered live scan status.
 * - Right column: ALL LEFT-ALIGNED with heavy extra-bold serif headline, bold tier title,
 *   2-column checkmark grid, bold "Save QR code" button, and left-aligned step box.
 * - "Order confirmed" badge and package price have been removed as instructed.
 */
export default function SessionCredentialsCard({
  bookings = [],
  selectedId = null,
  onSelect = null,
  className = '',
}) {
  const qrRef = useRef(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [storedQrUrl, setStoredQrUrl] = useState(null);

  // Select active or confirmed booking first, or fall back to most recent
  const activeBookings = useMemo(
    () => bookings.filter((b) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status)),
    [bookings]
  );

  const currentBooking = useMemo(() => {
    if (!bookings || bookings.length === 0) return null;
    if (selectedId) {
      const found = bookings.find((b) => b.id === selectedId);
      if (found) return found;
    }
    return activeBookings[0] || bookings[0] || null;
  }, [bookings, selectedId, activeBookings]);

  // Fetch stored QR code URL if available in Supabase storage
  useEffect(() => {
    let isMounted = true;
    if (currentBooking?.qr_code_path) {
      getQRCodePublicUrl(currentBooking.qr_code_path)
        .then((url) => {
          if (isMounted) setStoredQrUrl(url);
        })
        .catch(() => {
          if (isMounted) setStoredQrUrl(null);
        });
    } else {
      setStoredQrUrl(null);
    }
    return () => {
      isMounted = false;
    };
  }, [currentBooking?.qr_code_path]);

  const effectiveBookingNumber = currentBooking?.booking_number || 'BK-2026-00001';
  const effectiveToken =
    currentBooking?.booking_token ||
    currentBooking?.qr_code_token ||
    effectiveBookingNumber ||
    currentBooking?.id ||
    '';

  const copyReference = () => {
    if (!effectiveBookingNumber || !navigator.clipboard) return;
    navigator.clipboard.writeText(effectiveBookingNumber);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleDownloadQR = async () => {
    try {
      // 1. If stored in Supabase storage, download public URL
      if (storedQrUrl) {
        const a = document.createElement('a');
        a.href = storedQrUrl;
        a.download = `${effectiveBookingNumber}-qr.svg`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // 2. Client-side SVG export fallback
      const svgEl = qrRef.current?.querySelector('svg');
      if (svgEl) {
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = `${effectiveBookingNumber}-qr.svg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(svgUrl);
      }
    } catch (err) {
      console.error('Failed to download QR code:', err);
    }
  };

  // If user has zero bookings, display a sleek studio discovery card
  if (!currentBooking) {
    return (
      <section
        className={`rounded-3xl bg-white/80 dark:bg-[#0d0e12]/90 backdrop-blur-xl text-neutral-900 dark:text-white border border-neutral-200/80 dark:border-neutral-800/80 pt-10 pb-9 sm:pt-12 sm:pb-10 lg:pt-14 lg:pb-11 px-7 sm:px-9 lg:px-11 shadow-xs dark:shadow-2xl relative overflow-hidden select-none transition-colors flex flex-col justify-center items-center text-center ${className}`}
      >
        <p className="text-[10px] sm:text-[10.5px] font-light uppercase tracking-[0.24em] text-amber-600 dark:text-amber-500 text-center mb-2">
          Mobile Order Tracker
        </p>
        <h3 className="font-heading font-light text-2xl sm:text-3xl text-neutral-900 dark:text-white">
          No active orders yet
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 max-w-md font-light leading-relaxed">
          Once you reserve a milestone pictorial, your mobile order tracking QR code and package entitlements will appear here.
        </p>
        <Link
          to="/dashboard/book"
          className="mt-6 inline-flex px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-normal uppercase tracking-wider transition-all shadow-md"
        >
          Book a session
        </Link>
      </section>
    );
  }

  const { tier_name, service } = currentBooking;
  const rawHighlights = resolveTierHighlights(currentBooking);

  // Clean and formatted highlights
  const highlights = rawHighlights.length > 0
    ? rawHighlights.map(formatInclusionText)
    : [
        '1 × 10×12 framed studio portrait',
        '1 × 8×10 unframed portrait',
        '4 × wallet-size prints in academic attire',
        '4 × wallet-size formal portraits',
        '6 × passport-size ID prints',
        'Professional studio makeup session',
      ];

  const tierBadgeText = (tier_name || 'SET A').toUpperCase();
  const packageTitle =
    service?.name && tier_name
      ? `${service.name} — ${tier_name}`
      : 'Complete Studio Portrait Package';

  return (
    <section
      aria-label="Mobile Order Tracker & Package Entitlements"
      className={`rounded-3xl bg-white/85 dark:bg-[#0d0e12]/90 backdrop-blur-xl text-neutral-900 dark:text-white border border-neutral-200/80 dark:border-neutral-800/80 pt-10 pb-9 sm:pt-12 sm:pb-10 lg:pt-14 lg:pb-11 px-7 sm:px-9 lg:px-11 shadow-xs dark:shadow-2xl relative overflow-hidden select-none transition-colors flex flex-col justify-between ${className}`}
    >
      {/* Multi-booking switcher floating in top-right (if user has more than 1 order) */}
      {bookings.length > 1 && onSelect && (
        <div className="absolute top-6 right-7 sm:top-7 sm:right-9 z-20">
          <select
            value={currentBooking.id}
            onChange={(e) => onSelect(e.target.value)}
            className="text-[11px] bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-300 font-light px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 cursor-pointer focus:outline-hidden focus:border-amber-500 shadow-2xs"
            aria-label="Select order"
          >
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                #{b.booking_number} — {b.tier_name || 'Session'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── 2-Column Main Content (Breathable & Spacious) ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 flex-1 items-stretch min-h-0">

        {/* ── Left Column: Mobile Order Tracker (ALL CENTER-ALIGNED) ─────── */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between text-center min-w-0 h-full">
          {/* Top content: Eyebrow, Heading, Description */}
          <div className="flex flex-col items-center text-center w-full shrink-0">
            {/* Eyebrow: Centered, Light Amber */}
            <p className="text-[10px] sm:text-[10.5px] font-light uppercase tracking-[0.24em] text-amber-600 dark:text-amber-500 text-center mb-1.5">
              Mobile Order Tracker
            </p>

            {/* Heading: Centered, Light Serif */}
            <h3 className="font-heading font-light text-2xl sm:text-3xl lg:text-[34px] text-neutral-900 dark:text-white leading-[1.12] tracking-tight text-center mt-0.5 mb-2">
              Track your<br />order.
            </h3>

            {/* Subtitle: Centered, Light */}
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-[270px] sm:max-w-[310px] text-center mx-auto font-light">
              Open the Studio mobile app and scan this code to see your order status, updates, and delivery progress.
            </p>
          </div>

          {/* Center: Resized QR Code Container (Occupies and utilizes the bottom space) */}
          <div className="flex-1 flex items-center justify-center py-2 w-full my-auto">
            <div className="relative inline-block p-3 sm:p-3.5">
              {/* Corner Reticle Brackets */}
              <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-500 pointer-events-none" />
              <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-500 pointer-events-none" />
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-500 pointer-events-none" />
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-500 pointer-events-none" />

              {/* White QR Code Card */}
              <div
                ref={qrRef}
                className="bg-white p-4 sm:p-4.5 rounded-[24px] shadow-sm border border-neutral-100 dark:border-neutral-800 relative inline-block overflow-hidden"
              >
                <QRCodeSVG
                  bookingToken={effectiveToken}
                  size={240}
                  level="H"
                  foregroundColor="#000000"
                  backgroundColor="#ffffff"
                  includeMargin={false}
                />

                {/* Center Studio Emblem */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-neutral-950 font-normal text-xs flex items-center justify-center shadow-md ring-2 ring-white shrink-0 select-none">
                    S
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom content: Order Reference Label & Copy Tool (Centered) */}
          <div className="flex flex-col items-center text-center shrink-0 w-full pt-1">
            <p className="text-[9.5px] font-light tracking-[0.24em] uppercase text-neutral-500 dark:text-neutral-400 text-center">
              Order Reference
            </p>

            <button
              type="button"
              onClick={copyReference}
              className="mt-1 inline-flex items-center justify-center gap-2 font-normal text-neutral-900 dark:text-white text-base sm:text-lg tracking-wider hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer group"
              title="Click to copy order reference"
            >
              <span>{effectiveBookingNumber}</span>
              {copiedToken ? (
                <Check size={14} className="text-emerald-500 dark:text-emerald-400" />
              ) : (
                <Copy size={13} className="text-neutral-400 group-hover:text-amber-500 transition-colors" />
              )}
            </button>

            {/* Ready to scan live indicator (Centered) */}
            <div className="flex items-center justify-center gap-2 mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 font-light">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
              <span>Ready to scan in the mobile app</span>
            </div>
          </div>
        </div>

        {/* ── Right Column: Package Entitlements (ALL LEFT-ALIGNED) ────────── */}
        <div className="lg:col-span-7 flex flex-col justify-between text-left min-w-0 h-full">
          {/* Top content: Eyebrow, Heading, Tier, Checklist, Action Buttons */}
          <div className="flex flex-col items-start text-left w-full shrink-0">
            {/* Eyebrow: Left-Aligned, Light Amber */}
            <p className="text-[10px] sm:text-[10.5px] font-light uppercase tracking-[0.24em] text-amber-600 dark:text-amber-500 text-left mb-1.5">
              Your Package
            </p>

            {/* Heading: Left-Aligned, Light Serif */}
            <h3 className="font-heading font-light text-2xl sm:text-3xl lg:text-[34px] text-neutral-900 dark:text-white leading-[1.12] tracking-tight text-left mt-0.5 mb-2">
              Package<br />Entitlements
            </h3>

            {/* Tier Badge + Package Title: Left-Aligned */}
            <div className="flex items-center gap-2.5 flex-wrap pb-2 text-left">
              <span className="bg-amber-500 text-neutral-950 font-normal text-[11px] px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                {tierBadgeText}
              </span>
              <h4 className="text-sm sm:text-base font-light text-neutral-900 dark:text-white text-left">
                {packageTitle}
              </h4>
            </div>

            {/* 2-Column Entitlements Grid: Left-Aligned with generous breathable gap */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 sm:gap-y-3.5 my-3 sm:my-3.5 w-full text-left">
              {highlights.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-left">
                  <div className="w-[18px] h-[18px] rounded-full border border-amber-500/80 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} className="text-amber-500 dark:text-amber-400 stroke-[3]" />
                  </div>
                  <span className="text-xs sm:text-[12.5px] font-light text-neutral-700 dark:text-neutral-300 leading-snug sm:leading-relaxed text-left">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* Action Buttons: Left-Aligned */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-5 mt-4 sm:mt-4.5 text-left">
              <button
                type="button"
                onClick={handleDownloadQR}
                className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-normal text-xs sm:text-sm px-6 py-2.5 rounded-xl inline-flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Download size={14} className="stroke-[2.5]" />
                <span>Save QR code</span>
              </button>

              <Link
                to="/dashboard/bookings"
                className="text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white text-xs sm:text-sm font-light inline-flex items-center gap-1.5 transition-colors group"
              >
                <span>View package details</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Bottom Card: How to track your order (Left-Aligned) */}
          <div className="bg-neutral-100/70 dark:bg-[#14161b] border border-neutral-200/80 dark:border-neutral-800/90 rounded-2xl p-4 sm:p-4.5 flex items-center gap-4 w-full text-left shrink-0">
            <div className="bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-500 font-mono font-light text-xs px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700/60 shrink-0 shadow-2xs">
              01
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs sm:text-sm font-light text-neutral-900 dark:text-white text-left">
                How to track your order
              </p>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-light text-left leading-relaxed">
                In the Studio app, open Order Tracker and point your camera at this QR code.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

SessionCredentialsCard.propTypes = {
  bookings: PropTypes.arrayOf(PropTypes.object),
  selectedId: PropTypes.string,
  onSelect: PropTypes.func,
  className: PropTypes.string,
};
