import React from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from '../../lib/qr.tsx';
import { GraduationCap, MapPin, CheckCircle2, ShieldCheck, Calendar, Clock, CreditCard, Building } from 'lucide-react';

/**
 * CredentialsDossierSheet
 * -----------------------
 * Authenticated official student studio credentials sheet and registration dossier.
 * Designed for pixel-perfect printing (A4 / 8.5x11) and crisp on-screen preview.
 */
export default function CredentialsDossierSheet({
  effectiveBookingNumber,
  effectiveToken,
  customerFullName,
  customerPhotoUrl,
  customerEmail,
  customerPhone,
  studentId,
  schoolName,
  schoolLocation,
  gradYear,
  trackName,
  educationType,
  sectionName,
  yearbookMotto,
  headline,
  tierName,
  scheduleValue,
  scheduleSub,
  venueValue,
  claimingValue,
  claimingSub,
  financialInfo,
  financialBadgeText,
  isPrintMode = false,
}) {
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className={`w-full bg-white text-neutral-900 font-body ${
        isPrintMode ? 'p-0 text-black' : 'p-6 sm:p-8 rounded-2xl border border-neutral-200 shadow-sm'
      }`}
    >
      {/* ── Studio Official Header ────────────────────────────────────────── */}
      <div className="border-b-2 border-neutral-900 pb-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-xl sm:text-2xl tracking-wider text-neutral-900 uppercase">
                E-Kodak Photography Studio
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-900 border border-amber-300">
                Official Record
              </span>
            </div>
            <p className="text-xs sm:text-sm font-heading font-medium tracking-wide text-neutral-600 uppercase mt-0.5">
              Official Graduation Pictorial Credential &amp; Verification Slip
            </p>
            <p className="text-[11px] text-neutral-500 font-light mt-1">
              311 Rizal Street, City of Naga, Cebu · Studio Hotline: (032) 489-9122 / 0910-294-9414
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Document Reference
            </p>
            <p className="font-mono font-bold text-base sm:text-lg text-neutral-900 tracking-wider">
              #{effectiveBookingNumber || 'BK-2026-00002'}
            </p>
            <p className="text-[11px] text-neutral-500 font-light mt-0.5">
              Issued: {currentDateFormatted}
            </p>
          </div>
        </div>
      </div>

      {/* ── Candidate Verification Status Banner ──────────────────────────── */}
      <div className="mb-6 px-4 py-2.5 rounded-xl bg-neutral-100 border border-neutral-200/90 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-amber-600 shrink-0" />
          <span className="font-bold tracking-wide text-neutral-800 uppercase text-[11px]">
            Verified Candidate Intake Dossier · Class of {gradYear || '2026'}
          </span>
        </div>
        <span className="font-mono font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-white">
          VERIFIED RECORD
        </span>
      </div>

      {/* ── Two-Column Main Content Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pb-6 border-b border-neutral-200">
        
        {/* Left Column: Student Academic Credentials (7 Cols) */}
        <div className="md:col-span-7 space-y-4">
          <div className="flex items-start gap-4">
            {/* Arch Avatar / Photo */}
            <div className="w-20 h-24 rounded-t-full rounded-b-xs bg-neutral-100 border border-neutral-300 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
              {customerPhotoUrl ? (
                <img
                  src={customerPhotoUrl}
                  alt={customerFullName}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <span className="font-heading font-bold text-xl text-neutral-400">
                  {customerFullName?.charAt(0) || 'A'}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700 mb-0.5">
                Graduation Candidate
              </p>
              <h3 className="font-heading font-bold text-xl sm:text-2xl text-neutral-900 leading-tight">
                {customerFullName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Student ID / LRN:
                </span>
                <span className="font-mono font-bold text-xs text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                  {studentId || '1350691'}
                </span>
              </div>
            </div>
          </div>

          {/* Academic Info Table */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-start pb-1.5 border-b border-neutral-200/60">
              <span className="text-neutral-500 font-medium">Institution / School:</span>
              <span className="font-bold text-neutral-900 text-right">{schoolName}</span>
            </div>
            <div className="flex justify-between items-start pb-1.5 border-b border-neutral-200/60">
              <span className="text-neutral-500 font-medium">Campus Location:</span>
              <span className="font-medium text-neutral-800 text-right">{schoolLocation}</span>
            </div>
            <div className="flex justify-between items-start pb-1.5 border-b border-neutral-200/60">
              <span className="text-neutral-500 font-medium">Academic Track:</span>
              <span className="font-bold text-neutral-900 text-right">{trackName} ({educationType})</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-neutral-500 font-medium">Class Section &amp; Batch:</span>
              <span className="font-bold text-neutral-900 text-right">{sectionName} · Batch {gradYear}</span>
            </div>
          </div>

          {/* Personal Motto Quote Box */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">
              Personal Yearbook Motto
            </p>
            <p className="font-serif italic text-xs sm:text-sm text-neutral-800 leading-relaxed">
              {yearbookMotto && yearbookMotto !== 'N/A'
                ? `“${yearbookMotto}”`
                : '“Perseverance and dedication will illuminate every path forward.”'}
            </p>
          </div>
        </div>

        {/* Right Column: Order, Session & QR Pass (5 Cols) */}
        <div className="md:col-span-5 space-y-4">
          {/* Session Details */}
          <div className="rounded-xl border border-neutral-200 p-3.5 space-y-2 text-xs bg-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 pb-1 border-b border-neutral-200">
              Session Reservation
            </p>
            <div className="flex justify-between items-start">
              <span className="text-neutral-500">Package:</span>
              <span className="font-bold text-neutral-900 text-right">{headline} ({tierName})</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-neutral-500">Scheduled Date:</span>
              <span className="font-bold text-neutral-900 text-right">{scheduleValue}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-neutral-500">Slot / Time:</span>
              <span className="font-medium text-neutral-800 text-right">{scheduleSub}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-neutral-500">Studio Venue:</span>
              <span className="font-medium text-neutral-800 text-right">{venueValue}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-neutral-500">Claiming Mode:</span>
              <span className="font-medium text-neutral-800 text-right">{claimingValue}</span>
            </div>
          </div>

          {/* Financial Clearance Box */}
          <div className="rounded-xl border border-neutral-200 p-3.5 text-xs bg-neutral-50/70 space-y-1.5">
            <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Payment Status
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                {financialBadgeText}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1">
              <span className="text-neutral-600">Total Session Fee:</span>
              <span className="font-bold text-neutral-900">₱{financialInfo?.totalAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-neutral-600">Amount Paid:</span>
              <span className="font-bold text-emerald-700">₱{financialInfo?.downPaid?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-neutral-200">
              <span className="font-bold text-neutral-900">Remaining Balance:</span>
              <span className="font-bold text-neutral-900">₱{financialInfo?.remBalance?.toLocaleString()}</span>
            </div>
          </div>

          {/* Intake Verification QR Token */}
          <div className="rounded-xl border border-neutral-200 p-3.5 bg-white text-center flex items-center justify-between gap-3">
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Studio Intake QR Pass
              </p>
              <p className="font-mono text-xs font-bold text-neutral-900 mt-0.5">
                {effectiveBookingNumber}
              </p>
              <p className="text-[10px] text-neutral-500 font-light mt-1 max-w-[180px] leading-snug">
                Present this QR code upon arrival at E-Kodak Studio intake counter for instant check-in.
              </p>
            </div>
            <div className="p-1.5 rounded-lg border border-neutral-200 bg-white shrink-0">
              <QRCodeSVG
                bookingToken={effectiveToken || effectiveBookingNumber}
                size={76}
                foregroundColor="#111214"
                backgroundColor="#ffffff"
              />
            </div>
          </div>

        </div>
      </div>

      {/* ── Official Studio Sign-off Section ──────────────────────────────── */}
      <div className="pt-6">
        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-b border-neutral-400 w-44 sm:w-56 mx-auto mb-1.5 h-10" />
            <p className="font-bold text-neutral-900">{customerFullName}</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Candidate / Student Signature</p>
          </div>
          <div>
            <div className="border-b border-neutral-400 w-44 sm:w-56 mx-auto mb-1.5 h-10" />
            <p className="font-bold text-neutral-900">E-Kodak Studio Reception &amp; Registrar</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Authorized Officer Signature</p>
          </div>
        </div>

        <p className="text-[10px] text-center text-neutral-400 font-light mt-6 border-t border-neutral-100 pt-3">
          This document is an authenticated studio credential slip issued by E-Kodak Studio Intelligence.
          Retain a physical copy or mobile screenshot for your graduation pictorial appointment.
        </p>
      </div>
    </div>
  );
}

CredentialsDossierSheet.propTypes = {
  effectiveBookingNumber: PropTypes.string,
  effectiveToken: PropTypes.string,
  customerFullName: PropTypes.string,
  customerPhotoUrl: PropTypes.string,
  customerEmail: PropTypes.string,
  customerPhone: PropTypes.string,
  studentId: PropTypes.string,
  schoolName: PropTypes.string,
  schoolLocation: PropTypes.string,
  gradYear: PropTypes.string,
  trackName: PropTypes.string,
  educationType: PropTypes.string,
  sectionName: PropTypes.string,
  yearbookMotto: PropTypes.string,
  headline: PropTypes.string,
  tierName: PropTypes.string,
  scheduleValue: PropTypes.string,
  scheduleSub: PropTypes.string,
  venueValue: PropTypes.string,
  claimingValue: PropTypes.string,
  claimingSub: PropTypes.string,
  financialInfo: PropTypes.object,
  financialBadgeText: PropTypes.string,
  isPrintMode: PropTypes.bool,
};
