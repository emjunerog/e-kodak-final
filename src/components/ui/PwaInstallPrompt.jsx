import React, { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';

const DISMISS_STORAGE_KEY = 'ekodak_pwa_install_dismissed_at';
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator?.standalone === true
  );
}

function isIosSafariDevice() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator?.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

function wasRecentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Lightweight, dismissible install banner that lets Android/Chrome and iOS Safari
 * mobile visitors install the E-Kodak web app directly onto their home screen.
 */
export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [iosTipVisible, setIosTipVisible] = useState(
    () => !isStandaloneMode() && !wasRecentlyDismissed() && isIosSafariDevice()
  );
  const [dismissed, setDismissed] = useState(() => isStandaloneMode() || wasRecentlyDismissed());

  useEffect(() => {
    if (isStandaloneMode() || wasRecentlyDismissed()) return undefined;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIosTipVisible(false);
      setDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setIosTipVisible(false);
    setDeferredPrompt(null);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore storage restrictions
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDismissed(true);
      }
      setDeferredPrompt(null);
    } catch {
      setDeferredPrompt(null);
    }
  };

  if (dismissed || (!deferredPrompt && !iosTipVisible)) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-sm z-[9950] rounded-2xl border border-[#c9a96e]/35 bg-[#0b0f17]/95 backdrop-blur-md text-white px-4 py-3 shadow-2xl flex items-center gap-3"
      role="region"
      aria-label="Install E-Kodak Studio app"
    >
      <div className="w-9 h-9 rounded-xl bg-[#0d2a1c] border border-[#c9a96e]/40 flex items-center justify-center shrink-0">
        <Smartphone size={16} className="text-[#c9a96e]" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white leading-tight">Install E-Kodak App</p>
        {deferredPrompt ? (
          <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug">
            Add to your phone for quick access to passes &amp; soft copies.
          </p>
        ) : (
          <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug flex items-center gap-1 flex-wrap">
            <span>Tap</span>
            <Share size={11} className="text-[#c9a96e] inline shrink-0" />
            <span>then &ldquo;Add to Home Screen&rdquo;.</span>
          </p>
        )}
      </div>

      {deferredPrompt && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="h-8 px-3 rounded-lg bg-[#c9a96e] hover:bg-[#d8b87a] text-neutral-950 font-bold text-[11px] inline-flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
        >
          <Download size={12} />
          <span>Install</span>
        </button>
      )}

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        className="w-7 h-7 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
