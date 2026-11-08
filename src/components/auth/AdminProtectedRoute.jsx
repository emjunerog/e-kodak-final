import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * AdminProtectedRoute
 * -------------------
 * Blocks unauthenticated users (→ /login)
 * Blocks customers/photographers (→ /dashboard or /photographer)
 * Allows admin only (→ renders children)
 *
 * Cross-Tab Session Isolation Guard:
 * While loading, we check sessionStorage for a cached profile to avoid
 * false-positive redirects triggered when a second tab initializes its
 * own isolated Supabase session.
 */
export default function AdminProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  const cachedProfile = (() => {
    try {
      const raw = sessionStorage.getItem('ekodak_user_profile');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  const isKnownAdminRole = cachedProfile?.role === 'admin';

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
    if (isKnownAdminRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <Loader2 className="animate-spin text-gold" size={32} />
        </div>
      );
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Only admin is allowed
  if (profile.role !== 'admin') {
    if (profile.role === 'photographer') {
      return <Navigate to="/photographer" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

