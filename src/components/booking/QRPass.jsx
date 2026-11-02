import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from '../../lib/qr.tsx';
import { getQRCodePublicUrl, generateAndStoreQRCode } from '../../services/qrService';
import { supabase } from '../../lib/supabase';
import { Download, ExternalLink, QrCode, X, Check, Printer } from 'lucide-react';


/**
 * @param {Object} props
 * @param {Object} [props.booking]
 * @param {string} [props.bookingToken]
 * @param {string} [props.bookingNumber]
 * @param {string|null} [props.qrCodePath]
 * @param {number} [props.size=200]
 * @param {boolean} [props.showActions=true]
 * @param {string} [props.className='']
 */
export default function QRPass({
  booking,
  bookingToken,
  bookingNumber,
  qrCodePath,
  size = 200,
  showActions = true,
  showBookingNumber = true,
  isOpen,
  onOpenChange,
  className = '',
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const modalOpen = isOpen !== undefined ? isOpen : internalOpen;
  const setModalOpen = (val) => {
    if (onOpenChange) onOpenChange(val);
    setInternalOpen(val);
  };
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  const effectiveBookingNumber = bookingNumber || booking?.booking_number || '';

  // Prefer explicit prop → DB token → booking number → booking id
  const rawToken =
    bookingToken ||
    booking?.booking_token ||
    booking?.qr_code_token ||
    booking?.token ||
    '';

  const [liveToken, setLiveToken] = useState(rawToken || effectiveBookingNumber || booking?.id || '');
  const effectivePath = qrCodePath || booking?.qr_code_path || booking?.qr_code_url || null;

  // Auto-backfill: if this booking has no booking_token, generate one and save it.
  // This silently fixes every existing booking the first time its QR is viewed.
  useEffect(() => {
    const bookingId = booking?.id;
    if (!bookingId || rawToken) return; // already has a token

    const backfill = async () => {
      try {
        const newToken = crypto.randomUUID();
        const { error } = await supabase
          .from('bookings')
          .update({ booking_token: newToken })
          .eq('id', bookingId)
          .is('booking_token', null); // only patch if still null

        if (!error) {
          setLiveToken(newToken);
          // Also regenerate the stored QR image
          generateAndStoreQRCode(bookingId, newToken).catch(() => {});
        }
      } catch {
        // Non-critical — QR still renders using booking id as fallback
      }
    };

    backfill();
  }, [booking?.id]);

  const effectiveToken = liveToken;


  const handleDownload = async () => {
    try {
      // 1. If stored in Supabase storage, attempt public URL download
      if (effectivePath) {
        const url = await getQRCodePublicUrl(effectivePath);
        if (url) {
          const a = document.createElement('a');
          a.href = url;
          a.download = `${effectiveBookingNumber || 'booking'}-qr.svg`;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
      }

      // 2. Reliable client-side SVG export fallback
      const svgEl = qrRef.current?.querySelector('svg');
      if (svgEl) {
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = `${effectiveBookingNumber || 'booking'}-qr.svg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(svgUrl);
      }
    } catch (err) {
      console.error('Failed to download QR code:', err);
    }
  };

  const handleOpen = () => {
    setModalOpen(true);
  };

  const handleCopyToken = () => {
    if (effectiveToken && navigator.clipboard) {
      navigator.clipboard.writeText(effectiveToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!effectiveToken) {
    return (
      <div className={`text-center ${className}`}>
        <div className="w-32 h-32 mx-auto bg-neutral-100 rounded-2xl flex items-center justify-center border border-neutral-200">
          <QrCode size={32} className="text-neutral-400" />
        </div>
        <p className="text-xs text-neutral-400 mt-2">QR pass not available</p>
      </div>
    );
  }

  return (
    <div className={`text-center ${className}`}>
      {/* Clickable QR Code display */}
      <div
        ref={qrRef}
        onClick={handleOpen}
        className="bg-white p-3.5 rounded-2xl border border-neutral-200 inline-block shadow-sm cursor-pointer hover:shadow-md hover:border-gold/50 transition-all group relative"
        title="Click to expand QR Pass"
      >
        <QRCodeSVG
          bookingToken={effectiveToken}
          size={size}
          foregroundColor="#1a1a2e"
          backgroundColor="#ffffff"
        />
        <div className="absolute inset-0 bg-primary/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-primary/95 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
            <QrCode size={12} className="text-gold" /> Enlarge
          </span>
        </div>
      </div>

      {showBookingNumber && (
        <p className="text-xs text-neutral-400 mt-2 font-body font-medium tracking-wide">
          {effectiveBookingNumber || effectiveToken.substring(0, 8)}
        </p>
      )}

      {showActions && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            type="button"
            onClick={handleOpen}
            className="text-xs font-semibold text-primary hover:text-gold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white/95 hover:bg-white shadow-sm transition-all"
            title="View Fullscreen QR Pass"
          >
            <ExternalLink size={12} className="text-gold" /> View Pass
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="text-xs font-semibold text-primary hover:text-gold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white/95 hover:bg-white shadow-sm transition-all"
            title="Download QR SVG"
          >
            <Download size={12} className="text-gold" /> Download
          </button>
        </div>
      )}

      {/* High-Resolution Fullscreen QR Pass Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md overflow-y-auto py-8 sm:py-12 px-4 flex items-center justify-center animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#18191c] rounded-[32px] max-w-[420px] w-full p-6 sm:p-7 text-center shadow-2xl border border-neutral-200/90 dark:border-neutral-800 relative animate-scale-up my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>

            {/* Tracking Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10.5px] font-bold uppercase tracking-[0.2em] border border-amber-500/20 mb-3.5">
              <QrCode size={13} className="text-amber-600 dark:text-amber-400" />
              <span>Order Tracking QR Code</span>
            </div>

            {/* Booking Reference */}
            <h3 className="font-heading text-3xl sm:text-[32px] text-neutral-900 dark:text-white font-normal tracking-tight">
              #{effectiveBookingNumber || 'Order Tracking'}
            </h3>

            {booking?.service?.name && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
                {booking.service.name}
              </p>
            )}

            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 mb-5 font-body font-light leading-relaxed">
              Scan with your phone camera or the E-Kodak app to track your order in real time.
            </p>

            {/* Pure White QR Code Container with subtle photographic finder brackets */}
            <div className="p-4 sm:p-5 bg-white rounded-3xl border border-neutral-200/90 shadow-md shadow-neutral-900/5 inline-block mb-6 relative group">
              {/* Camera Frame Brackets */}
              <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-amber-500/60 rounded-tl-sm pointer-events-none" />
              <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-amber-500/60 rounded-tr-sm pointer-events-none" />
              <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-amber-500/60 rounded-bl-sm pointer-events-none" />
              <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-amber-500/60 rounded-br-sm pointer-events-none" />

              <QRCodeSVG
                bookingToken={effectiveToken}
                size={200}
                foregroundColor="#121316"
                backgroundColor="#ffffff"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 font-body text-xs">
              <button
                type="button"
                onClick={handleDownload}
                className="py-3 rounded-2xl bg-neutral-950 hover:bg-neutral-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-neutral-950 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
              >
                <Download size={15} />
                <span>Save QR Code</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="py-3 rounded-2xl bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200/90 dark:border-neutral-700 text-neutral-900 dark:text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
              >
                <Printer size={15} />
                <span>Print QR</span>
              </button>
            </div>

            {/* ── Companion App Callout ── */}
            <div className="mt-5 rounded-2xl bg-[#141517] border border-neutral-800 p-4 text-left relative overflow-hidden shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <QrCode size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white tracking-wide">
                    Track Live in the E-Kodak App
                  </p>
                  <p className="text-[11px] text-neutral-400 font-light leading-relaxed mt-0.5">
                    Scan with the <span className="text-neutral-200 font-medium">E-Kodak Companion App</span> to receive real-time retouching status, proof updates, and delivery alerts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

QRPass.propTypes = {
  bookingToken: PropTypes.string,
  bookingNumber: PropTypes.string,
  qrCodePath: PropTypes.string,
  size: PropTypes.number,
  showActions: PropTypes.bool,
  className: PropTypes.string,
};

QRPass.defaultProps = {
  bookingToken: '',
  bookingNumber: '',
  qrCodePath: null,
  size: 200,
  showActions: true,
  className: '',
};