import React, { useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  QrCode,
  Download,
  Copy,
  Check,
  RefreshCw,
  X,
  AlertTriangle,
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
  const titleId = useId();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [rotating, setRotating] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [rotateError, setRotateError] = useState('');

  useEffect(() => {
    if (!photographer) return;
    setConfirmRotate(false);
    setRotateError('');
    setCopyError('');
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !rotating) {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [photographer, rotating, onClose]);

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
    setCopyError('');
    try {
      await navigator.clipboard.writeText(qrPayloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyError('Clipboard blocked. Please copy manually or download the PNG pass.');
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
    setConfirmRotate(false);
    if (error || !nextToken) {
      setRotateError(error?.message || 'Unable to regenerate QR token.');
      return;
    }
    onTokenRotated?.(photographer.id, nextToken);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-body overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => !rotating && onClose?.()}
    >
      <div
        className="bg-gradient-to-b from-white via-surface-warm to-white rounded-2xl border border-neutral-200 max-w-sm w-full max-h-[90dvh] overflow-y-auto shadow-2xl flex flex-col overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Obsidian Header */}
        <div className="p-4 bg-gradient-to-r from-neutral-950 via-neutral-900 to-primary text-white border-b border-gold/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/35 flex items-center justify-center text-gold shrink-0" aria-hidden="true">
              <QrCode size={16} />
            </div>
            <h2 id={titleId} className="text-sm font-heading font-bold text-white truncate">
              Photographer <span className="text-gold italic font-normal">QR Pass</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !rotating && onClose?.()}
            disabled={rotating}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close QR Modal"
          >
            <X size={16} aria-hidden="true" />
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

          {(rotateError || copyError) && (
            <p role="alert" className="text-xs text-rose-600 font-medium">
              {rotateError || copyError}
            </p>
          )}

          {confirmRotate && (
            <div className="w-full rounded-xl bg-amber-50 border border-amber-200 p-3 text-left space-y-2">
              <div className="flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Rotating will immediately invalidate this photographer&apos;s previous QR pass. Continue?
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmRotate(false)}
                  disabled={rotating}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-amber-100/70 transition-colors cursor-pointer"
                >-

                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={rotating}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {rotating ? 'Rotating...' : 'Confirm Rotate'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5 w-full">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={!qrToken}
              className="h-9 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold border border-gold/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Download size={13} className="text-gold" aria-hidden="true" />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!qrToken}
              className="h-9 px-3 rounded-xl bg-white border border-neutral-200 text-neutral-700 text-xs font-semibold hover:border-gold hover:text-primary transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              {copied ? (
                <Check size={13} className="text-emerald-600" aria-hidden="true" />
              ) : (
                <Copy size={13} className="text-gold-dark" aria-hidden="true" />
              )}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-neutral-200/70 bg-neutral-50/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => (qrToken ? setConfirmRotate((v) => !v) : handleRegenerate())}
            disabled={rotating}
            className="text-xs font-semibold text-neutral-600 hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={rotating ? 'animate-spin text-gold-dark' : 'text-gold-dark'} aria-hidden="true" />
            <span>{rotating ? 'Rotating...' : qrToken ? 'Regenerate' : 'Generate Pass'}</span>
          </button>
          <button
            type="button"
            onClick={() => !rotating && onClose?.()}
            disabled={rotating}
            className="text-xs font-semibold text-neutral-600 hover:text-primary transition-colors cursor-pointer disabled:opacity-40"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

PhotographerQRModal.propTypes = {
  photographer: PropTypes.shape({
    id: PropTypes.string,
    first_name: PropTypes.string,
    last_name: PropTypes.string,
    email: PropTypes.string,
    specialization: PropTypes.string,
    qr_login_token: PropTypes.string,
  }),
  onClose: PropTypes.func,
  onTokenRotated: PropTypes.func,
};
