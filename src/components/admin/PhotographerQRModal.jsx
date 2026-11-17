import React, { useRef, useState } from 'react';
import {
  QrCode,
  Download,
  Copy,
  Check,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  PhotographerQRCodeCanvas,
  generatePhotographerQRDataURL,
} from '../../lib/qr';
import { regeneratePhotographerQRToken } from '../../services/adminService';

/**
 * PhotographerQRModal
 * ===================
 * Minimal Studio modal presenting a photographer's unique QR login pass.
 */
export default function PhotographerQRModal({
  photographer,
  onClose,
  onTokenRotated,
}) {
  const qrWrapRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState('');

  if (!photographer) return null;

  const fullName =
    `${photographer.first_name || ''} ${photographer.last_name || ''}`.trim() ||
    photographer.email ||
    'Studio Photographer';
  const qrToken = photographer.qr_login_token || '';
  const qrPayloadUrl = qrToken ? generatePhotographerQRDataURL(qrToken) : '';
  const passCode = qrToken
    ? `PH-${qrToken.slice(0, 8).toUpperCase()}...${qrToken.slice(-4).toUpperCase()}`
    : '';

  const handleCopyLink = async () => {
    if (!qrPayloadUrl) return;
    try {
      await navigator.clipboard.writeText(qrPayloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleDownloadPng = () => {
    const canvas = qrWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    const safeSlug =
      fullName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'photographer';
    a.download = `ekodak-photographer-qr-${safeSlug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRegenerate = async () => {
    if (!photographer.id || rotating) return;
    setRotating(true);
    setRotateError('');
    const { qr_login_token: nextToken, error } = await regeneratePhotographerQRToken(
      photographer.id
    );
    setRotating(false);
    if (error || !nextToken) {
      setRotateError(error?.message || 'Unable to regenerate QR token.');
      return;
    }
    onTokenRotated?.(photographer.id, nextToken);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-body"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-white via-surface-warm to-white rounded-2xl border border-neutral-200 max-w-sm w-full shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Obsidian Header */}
        <div className="p-4 bg-gradient-to-r from-neutral-950 via-neutral-900 to-primary text-white border-b border-gold/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/35 flex items-center justify-center text-gold shrink-0">
              <QrCode size={16} />
            </div>
            <h2 className="text-sm font-heading font-bold text-white truncate">
              Photographer <span className="text-gold italic font-normal">QR Pass</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close QR Modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="space-y-0.5">
            <p className="text-sm font-heading font-bold text-primary">{fullName}</p>
            <p className="text-xs text-neutral-500">
              {photographer.specialization || 'Studio Photographer'}
            </p>
          </div>

          {qrToken ? (
            <div
              ref={qrWrapRef}
              className="p-3 rounded-xl bg-white border border-neutral-200 shadow-xs inline-flex flex-col items-center gap-2"
            >
              <PhotographerQRCodeCanvas
                photographerToken={qrToken}
                size={200}
                level="M"
                includeMargin={false}
                foregroundColor="#181410"
                backgroundColor="#ffffff"
              />
              <span className="text-[11px] font-mono text-neutral-500">
                {passCode}
              </span>
            </div>
          ) : (
            <div className="p-5 rounded-xl border border-dashed border-neutral-300 text-xs text-neutral-500">
              No QR token generated yet.
            </div>
          )}

          {rotateError && (
            <p className="text-xs text-rose-600 font-medium">{rotateError}</p>
          )}

          <div className="grid grid-cols-2 gap-2.5 w-full">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={!qrToken}
              className="h-9 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold border border-gold/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Download size={13} className="text-gold" />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!qrToken}
              className="h-9 px-3 rounded-xl bg-white border border-neutral-200 text-neutral-700 text-xs font-semibold hover:border-gold hover:text-primary transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              {copied ? (
                <Check size={13} className="text-emerald-600" />
              ) : (
                <Copy size={13} className="text-gold-dark" />
              )}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-neutral-200/70 bg-neutral-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={rotating}
            className="text-xs font-semibold text-neutral-600 hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={rotating ? 'animate-spin text-gold-dark' : 'text-gold-dark'} />
            <span>{rotating ? 'Rotating...' : 'Regenerate'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-neutral-600 hover:text-primary transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
