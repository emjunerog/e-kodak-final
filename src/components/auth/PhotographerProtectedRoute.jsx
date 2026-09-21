import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * PhotographerProtectedRoute
 * --------------------------
 * Blocks unauthenticated users (→ /login)
 * Blocks customers (→ /dashboard)
 * Blocks unapproved photographers (→ /pending-approval)
 * Allows approved photographers (→ renders children)
 * Allows staff/admin to view it for testing (→ renders children)
 */
export default function PhotographerProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile.role === 'customer') {
    return <Navigate to="/dashboard" replace />;
  }

  // If role is photographer, ensure they are approved/active
  if (profile.role === 'photographer') {
    // We can use is_active flag in the profiles table to determine approval status
    if (!profile.is_active) {
      return <Navigate to="/pending-approval" replace />;
    }
  }

  return children;
}
