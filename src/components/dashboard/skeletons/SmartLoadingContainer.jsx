import React from 'react';
import { WifiOff, RefreshCw, AlertCircle, CloudOff } from 'lucide-react';
import useSmartLoading from './useSmartLoading';

/**
 * SmartLoadingContainer
 * =====================
 * Wraps customer dashboard content with smart loading & network error detection:
 * - On stable/fast connections or cached data: renders children immediately with NO skeleton flash.
 * - On genuine slow loading (> delayMs): smoothly fades in the provided skeleton.
 * - On network error or offline status: displays an editorial, retryable error screen.
 */
export default function SmartLoadingContainer({
  loading = false,
  hasData = false,
  error = null,
  onRetry = null,
  skeleton = null,
  children = null,
  delayMs = 200,
  title = 'Studio Records',
  customErrorMessage = null,
  className = '',
}) {
  const {
    showSkeleton,
    isNetworkError,
    isOffline,
    isRetrying,
    retry,
  } = useSmartLoading({
    loading,
    hasData,
    error,
    onRetry,
    delayMs,
  });

  // 1. If genuine network error or offline state occurs, display clean retryable UI
  if (isNetworkError && !hasData) {
    return (
      <div className={`w-full max-w-xl mx-auto my-10 p-6 sm:p-10 rounded-3xl bg-white/90 dark:bg-neutral-900/90 border border-neutral-200/80 dark:border-neutral-800 shadow-sm text-center animate-fade-in ${className}`}>
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5 border border-amber-500/20 shadow-xs">
          {isOffline ? <WifiOff size={28} /> : <CloudOff size={28} />}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 mb-3 border border-amber-200 dark:border-amber-900/50">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          {isOffline ? 'Offline Mode' : 'Network Interruption'}
        </div>

        <h3 className="font-heading text-xl sm:text-2xl text-neutral-900 dark:text-neutral-100 font-semibold mb-2">
          {isOffline ? 'Connection Paused' : `Unable to Reach ${title}`}
        </h3>

        <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-6 leading-relaxed">
          {customErrorMessage || (isOffline
            ? 'Your device appears to have lost internet connectivity. Reconnect to sync with your photography studio records.'
            : (error?.message || 'We experienced an interruption reaching the studio servers. All your orders and studio history remain secure.'))}
        </p>

        {onRetry && (
          <button
            type="button"
            onClick={retry}
            disabled={isRetrying}
            className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-body text-xs font-semibold tracking-wide uppercase shadow-sm cursor-pointer hover:shadow-md transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} />
            <span>{isRetrying ? 'Reconnecting to Studio...' : 'Retry Connection'}</span>
          </button>
        )}
      </div>
    );
  }

  // 2. If loading exceeds threshold and no cached data is available, show skeleton smoothly
  if (showSkeleton && skeleton) {
    return (
      <div className={`transition-opacity duration-300 ease-in-out ${className}`}>
        {skeleton}
      </div>
    );
  }

  // 3. Stable connection / fast response / cached data: render children immediately!
  return <>{children}</>;
}

