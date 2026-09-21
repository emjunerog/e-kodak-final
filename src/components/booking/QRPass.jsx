import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from '../../lib/qr.tsx';
import { getQRCodePublicUrl } from '../../services/qrService';
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
  className = '',
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  const effectiveBookingNumber = bookingNumber || booking?.booking_number || '';
  const effectiveToken =
    bookingToken ||
    booking?.qr_code_token ||
    booking?.booking_token ||
    booking?.token ||
    effectiveBookingNumber ||
    booking?.id ||
    '';
  const effectivePath = qrCodePath || booking?.qr_code_path || booking?.qr_code_url || null;

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

      <p className="text-xs text-neutral-400 mt-2 font-body font-medium tracking-wide">
        {effectiveBookingNumber || effectiveToken.substring(0, 8)}
      </p>

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
          className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-left"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-neutral-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-primary rounded-full hover:bg-neutral-100 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-bold uppercase tracking-wider mb-3">
              <QrCode size={13} /> Studio Session Pass
            </div>

            <h3 className="font-heading text-2xl text-primary font-semibold">
              {effectiveBookingNumber || 'Studio Pass'}
            </h3>
            {booking?.service?.name && (
              <p className="text-xs font-semibold text-gold mt-1">
                {booking.service.name}
              </p>
            )}
            <p className="text-xs text-neutral-500 mb-5 font-body">
              Scan at reception or present to your photographer
            </p>

            <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80 inline-block mb-4 shadow-inner">
              <QRCodeSVG
                bookingToken={effectiveToken}
                size={230}
                foregroundColor="#1a1a2e"
                backgroundColor="#ffffff"
              />
            </div>

            <div className="bg-neutral-100/80 p-2.5 rounded-xl font-body text-[11px] text-neutral-600 mb-5 flex items-center justify-between border border-neutral-200/60">
              <span className="truncate max-w-[210px]">{effectiveToken}</span>
              <button
                type="button"
                onClick={handleCopyToken}
                className="text-[11px] font-bold text-gold hover:text-primary px-2.5 py-1 rounded-lg bg-white border border-neutral-200 shadow-sm ml-2 transition-colors"
              >
                {copied ? <span className="text-emerald-600 flex items-center gap-1"><Check size={12} /> Copied</span> : 'Copy'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-body text-xs">
              <button
                type="button"
                onClick={handleDownload}
                className="btn-primary py-2.5 flex items-center justify-center gap-1.5 font-semibold text-xs"
              >
                <Download size={14} /> Download SVG
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="btn-outline py-2.5 flex items-center justify-center gap-1.5 font-semibold text-xs"
              >
                <Printer size={14} /> Print Pass
              </button>
            </div>

            {/* ── Companion App Banner ── */}
            <div className="mt-5 rounded-2xl border border-gold/30 bg-gradient-to-br from-[#1a1508] to-[#0f0f0a] p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <QrCode size={18} className="text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gold mb-0.5 font-body">
                    📱 Track live in the E-Kodak App
                  </p>
                  <p className="text-[11px] text-neutral-400 leading-relaxed font-body">
                    Scan this QR code in the <strong className="text-neutral-300">E-Kodak Companion App</strong> to
                    get real-time status updates, milestone tracking, and delivery
                    notifications directly on your phone.
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