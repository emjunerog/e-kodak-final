import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  const cachedRole = (() => {
    try {
      const raw = sessionStorage.getItem('ekodak_user_profile');
      return raw ? JSON.parse(raw)?.role : null;
    } catch {
      return null;
    }
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }

  if (!user) {
    // Redirect to login while saving the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile) {
    if (cachedRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <Loader2 className="animate-spin text-gold" size={32} />
        </div>
      );
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strictly enforce role separation: admin and photographer stay in their own portals
  if (profile.role === 'admin' || profile.role === 'staff') {
    return <Navigate to="/admin" replace />;
  }
  if (profile.role === 'photographer') {
    return <Navigate to="/photographer" replace />;
  }

  return children;
}
