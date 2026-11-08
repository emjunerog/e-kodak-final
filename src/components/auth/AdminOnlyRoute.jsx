import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';

/**
 * AdminOnlyRoute
 * --------------
 * Restricts access strictly to users with role === 'admin'.
 * Non-admin users are blocked and presented with an access restriction notice
 * or redirected back to their appropriate dashboard.
 */
export default function AdminOnlyRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strictly enforce admin role
  if (profile?.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-neutral-200/90 rounded-2xl shadow-sm text-center font-body space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold text-primary">
            Access Restricted: Administrator Only
          </h2>
          <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
            This management module is reserved for studio system administrators.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Return to Admin Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
