import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useSmartLoading
 * ===============
 * Smart loading hook that prevents skeleton flicker on fast/stable networks,
 * and detects genuine slow loading situations or network errors.
 *
 * Rules:
 * 1. If data already exists (cached or inherited), no skeleton will display.
 * 2. If data takes longer than `delayMs` (default 200ms), skeleton appears smoothly.
 * 3. If the network is offline or a request fails, detects the error state.
 * 4. Automatically retries when network connectivity is restored.
 *
 * @param {Object} options
 * @param {boolean} options.loading - Active fetch / loading in flight
 * @param {boolean} options.hasData - Whether usable data is already present in state/cache
 * @param {Error|string|null} [options.error] - Query or network error
 * @param {Function} [options.onRetry] - Callback to re-trigger loading
 * @param {number} [options.delayMs=200] - Milliseconds to wait before showing skeleton
 * @returns {Object} { showSkeleton, isNetworkError, isOffline, isRetrying, retry }
 */
export function useSmartLoading({
  loading = false,
  hasData = false,
  error = null,
  onRetry = null,
  delayMs = 200,
}) {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [isRetrying, setIsRetrying] = useState(false);

  const timerRef = useRef(null);
  const onRetryRef = useRef(onRetry);
  onRetryRef.current = onRetry;

  // Listen to browser network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Auto-retry when internet comes back online
      if (onRetryRef.current) {
        setIsRetrying(true);
        Promise.resolve(onRetryRef.current()).finally(() => {
          setIsRetrying(false);
        });
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Determine if error indicates a network / server failure
  const isNetworkError = Boolean(
    isOffline ||
    error ||
    (error && (
      error.message?.includes('network') ||
      error.message?.includes('fetch') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.code === 'PGRST301' || // Supabase connection/JWT error
      error.status === 503 ||
      error.status === 504
    ))
  );

  // Debounced skeleton appearance: only show skeleton if loading takes longer than delayMs
  useEffect(() => {
    // If we already have data, NEVER show skeleton (keeps UI stable and responsive)
    if (hasData) {
      setShowSkeleton(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // If there is an active network error or we are offline, do not show skeleton
    if (isNetworkError) {
      setShowSkeleton(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (loading) {
      // Start delay timer to avoid flash of skeleton on fast/stable connections
      timerRef.current = setTimeout(() => {
        setShowSkeleton(true);
      }, delayMs);
    } else {
      setShowSkeleton(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, hasData, isNetworkError, delayMs]);

  const retry = useCallback(async () => {
    if (!onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry]);

  return {
    showSkeleton: showSkeleton && !hasData && !isNetworkError,
    isNetworkError,
    isOffline,
    isRetrying,
    retry,
  };
}

export default useSmartLoading;

