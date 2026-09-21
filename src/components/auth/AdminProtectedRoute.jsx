import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * AdminProtectedRoute
 * -------------------
 * Blocks unauthenticated users (→ /login)
 * Blocks customers/photographers (→ /dashboard)
 * Allows staff and admin (→ renders children)
 *
 * Cross-Tab Session Isolation Guard:
 * While loading, we check sessionStorage for a cached profile to avoid
 * false-positive redirects triggered when a second tab initializes its
 * own isolated Supabase session (which can cause a brief re-render here).
 */
export default function AdminProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Read tab-local cache to prevent a false redirect during loading.
  // This is the fix for cross-tab session bleed: when Tab 2 opens and
  // initializes its own Supabase client, Tab 1 re-renders briefly with
  // a loading state. Without this guard, it would redirect to /login.
  const cachedProfile = (() => {
    try {
      const raw = sessionStorage.getItem('ekodak_user_profile');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  const isKnownAdminRole = ['admin', 'staff', 'finance'].includes(cachedProfile?.role);

  // Always show spinner while loading — never redirect during this phase
  // if there is a known admin session cached for this tab.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile) {
    // Before hard-redirecting, check tab-local sessionStorage cache.
    // This handles the race where user resolved but profile is still fetching.
    if (isKnownAdminRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <Loader2 className="animate-spin text-gold" size={32} />
        </div>
      );
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Only staff, admin, and finance are allowed
  if (!['admin', 'staff', 'finance'].includes(profile.role)) {
    // Customer or photographer — send to their own dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

