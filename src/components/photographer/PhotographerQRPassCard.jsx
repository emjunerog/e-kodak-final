import React, { useRef, useState } from 'react';
import { QrCode, Download, Copy, Check, RefreshCw } from 'lucide-react';
import {
  PhotographerQRCodeCanvas,
  generatePhotographerQRDataURL,
} from '../../lib/qr';

/**
 * PhotographerQRPassCard
 * ======================
 * Clean, minimal QR pass card matching the Photographer Dashboard palette.
 */
export default function PhotographerQRPassCard({
  qrLoginToken = null,
  fullName = 'Photographer',
  variant = 'compact',
  embedded = false,
  onOpenModal = null,
  onRegenerate = null,
  rotating = false,
}) {
  const qrWrapRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const isCompact = variant === 'compact';
  const passCode = qrLoginToken
    ? `PH-${qrLoginToken.slice(0, 8).toUpperCase()}...${qrLoginToken.slice(-4).toUpperCase()}`
    : '';

  const handleCopyLink = async () => {
    if (!qrLoginToken) return;
    try {
      await navigator.clipboard.writeText(generatePhotographerQRDataURL(qrLoginToken));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleDownloadPng = () => {
    const canvas = qrWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    const safeSlug =
      (fullName || 'photographer')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'photographer';
    a.download = `ekodak-photographer-qr-${safeSlug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={
        embedded
          ? 'font-body'
          : 'rounded-2xl p-5 bg-gradient-to-br from-white via-surface-warm to-amber-50/20 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950 border border-neutral-200/90 dark:border-neutral-800 shadow-xs font-body transition-colors'
      }
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-neutral-200/70 dark:border-neutral-800 pb-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold-dark dark:text-gold border border-gold/30 flex items-center justify-center shrink-0">
          <QrCode size={16} />
        </div>
        <h3 className="font-heading text-base font-bold text-primary dark:text-white leading-tight">
          Mobile Login <span className="text-gold-dark dark:text-gold italic font-normal">QR Pass</span>
        </h3>
      </div>

      {/* Content */}
      <div
        className={`flex flex-col ${
          isCompact ? 'sm:flex-row' : 'md:flex-row'
        } items-stretch gap-5`}
      >
        {/* Clean White QR Frame */}
        <div
          ref={qrWrapRef}
          onClick={onOpenModal && qrLoginToken ? onOpenModal : undefined}
          role={onOpenModal && qrLoginToken ? 'button' : undefined}
          tabIndex={onOpenModal && qrLoginToken ? 0 : undefined}
          onKeyDown={
            onOpenModal && qrLoginToken
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenModal();
                  }
                }
              : undefined
          }
          title={onOpenModal && qrLoginToken ? 'View QR pass' : undefined}
          className={`self-center p-2.5 rounded-xl bg-white border border-neutral-200/90 shrink-0 flex items-center justify-center transition-colors ${
            onOpenModal && qrLoginToken ? 'cursor-pointer hover:border-gold' : ''
          }`}
        >
          {qrLoginToken ? (
            <PhotographerQRCodeCanvas
              photographerToken={qrLoginToken}
              size={isCompact ? 112 : 152}
              level="M"
              includeMargin={false}
              foregroundColor="#181410"
              backgroundColor="#ffffff"
            />
          ) : (
            <div className="w-28 h-28 flex items-center justify-center text-neutral-300">
              <QrCode size={28} />
            </div>
          )}
        </div>

        {/* Justified Copy & Actions */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed text-justify">
              Scan with the E-Kodak mobile app to load your credentials, assigned shoots, and schedule.
            </p>
            {passCode && (
              <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                {passCode}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenModal ? (
              <button
                type="button"
                onClick={onOpenModal}
                disabled={!qrLoginToken}
                className="h-9 px-3.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs border border-gold/30 shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              >
                <QrCode size={14} className="text-gold" />
                <span>Open QR</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={!qrLoginToken}
                className="h-9 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs border border-gold/30 shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              >
                <Download size={14} className="text-gold" />
                <span>Download QR</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!qrLoginToken}
              className="h-9 px-3.5 rounded-xl bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:text-primary border border-neutral-200/90 dark:border-neutral-700 hover:border-gold text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              {copied ? (
                <Check size={14} className="text-emerald-600" />
              ) : (
                <Copy size={13} className="text-gold-dark dark:text-gold" />
              )}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={rotating}
                className="h-9 px-3.5 rounded-xl bg-white dark:bg-neutral-800 hover:bg-amber-50/70 text-neutral-700 dark:text-neutral-200 border border-neutral-200/90 dark:border-neutral-700 hover:border-gold text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={rotating ? 'animate-spin text-gold-dark' : 'text-gold-dark dark:text-gold'} />
                <span>{rotating ? 'Rotating...' : 'Regenerate'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
