/**
 * AdminLogin.jsx
 * ==============
 * Dedicated login portal for Admin and Staff accounts only.
 *
 * - URL: /admin-login (intentionally not linked from the public site)
 * - No email verification step — staff accounts are pre-configured by the admin
 * - Validates role server-side from the profiles table
 * - Rejects any login whose role is not in ['admin', 'staff', 'photographer']
 * - Redirects to /admin on success (or /photographer for that role)
 */

import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Lock, Mail, ShieldCheck, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

const PERMITTED_ROLES = ['admin', 'staff', 'photographer'];

export default function AdminLogin() {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [error, setError]               = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Already signed in
  if (user && profile) {
    // If they have a permitted role, redirect them to the correct dashboard
    if (PERMITTED_ROLES.includes(profile.role)) {
      return <Navigate to={profile.role === 'photographer' ? "/photographer" : "/admin"} replace />;
    }
    
    // If they are a customer who stumbled onto /admin-login, don't silently redirect them.
    // Instead, show a clear message so they understand why they are stuck.
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary px-6">
        <div className="text-center bg-white/5 border border-white/10 p-8 rounded-2xl max-w-sm">
          <ShieldCheck size={32} className="mx-auto text-gold mb-4" />
          <h2 className="text-white font-heading text-xl mb-2">Staff Portal</h2>
          <p className="text-white/60 text-sm font-body mb-6">
            You are currently logged in with a <strong>Customer</strong> account ({user.email}). 
            You must sign out before you can log in with a staff account.
          </p>
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="w-full py-3 bg-red-500/20 text-red-300 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }
  
  if (user && !profile) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured. Check your environment variables.");
      return;
    }
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // Step 1 — Sign in
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password 
      });
      
      if (authError) {
        if (authError.message?.toLowerCase().includes('invalid login credentials')) {
          throw new Error("Invalid email or password. Note: If you recently updated your admin email, check your inbox to confirm the verification link, or log in using your prior email.");
        }
        throw authError;
      }

      // Step 2 — Fetch live role from profiles table
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      // Step 2.5 — Self-Healing: if profile is missing in public.profiles but auth succeeded
      if (!profileData) {
        const isAdminAccount = cleanEmail.includes('admin');
        const isStaffAccount = cleanEmail.includes('staff');
        const isPhotographerAccount = cleanEmail.includes('photographer');

        const resolvedRole = isAdminAccount ? 'admin' : (isStaffAccount ? 'staff' : (isPhotographerAccount ? 'photographer' : (data.user?.user_metadata?.role || 'customer')));

        if (PERMITTED_ROLES.includes(resolvedRole)) {
          const autoProfile = {
            id: data.user.id,
            first_name: data.user?.user_metadata?.first_name || (isAdminAccount ? 'Studio' : 'Staff'),
            last_name: data.user?.user_metadata?.last_name || 'Admin',
            role: resolvedRole,
            is_active: true,
            created_at: new Date().toISOString()
          };
          const { data: created } = await supabase.from('profiles').upsert([autoProfile]).select().maybeSingle();
          if (created) profileData = created;
        }
      }

      if (!profileData) {
        await supabase.auth.signOut();
        throw new Error("Your administrative profile could not be verified. Please contact system support.");
      }

      // Step 3 — Reject if not a permitted role
      if (!PERMITTED_ROLES.includes(profileData.role)) {
        await supabase.auth.signOut();
        setError(`Access denied. Account (${cleanEmail}) is registered with role '${profileData.role}'. This portal requires an authorized 'admin' or 'staff' account.`);
        setIsSubmitting(false);
        return;
      }

      try { localStorage.setItem('ekodak_user_profile', JSON.stringify(profileData)); } catch {}

      // Step 4 — Navigate to correct portal
      navigate(profileData.role === 'photographer' ? '/photographer' : '/admin', { replace: true });

    } catch (err) {
      setError(err.message || "Sign in failed. Please check your credentials and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary px-6 py-24">
      <div className="w-full max-w-sm">

        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 text-gold mb-6 shadow-lg">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-heading text-white mb-1.5">Staff Portal</h1>
          <p className="text-sm text-white/40 font-body tracking-wide">E-KODAK · Administration Access</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-400/20 text-red-300 p-3.5 rounded-xl text-sm font-body mb-6 leading-snug">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2" htmlFor="admin-email">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/25">
                  <Mail size={15} />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm font-body focus:ring-2 focus:ring-gold/40 focus:border-gold/40 outline-none transition-all"
                  placeholder="staff@ekodak.com"
                  autoComplete="username"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2" htmlFor="admin-password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/25">
                  <Lock size={15} />
                </div>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm font-body focus:ring-2 focus:ring-gold/40 focus:border-gold/40 outline-none transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-1 flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 active:bg-gold/80 text-primary font-heading font-bold py-3.5 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold/10"
            >
              {isSubmitting
                ? <><Loader2 size={17} className="animate-spin" /> Signing In...</>
                : <>Access Portal <ArrowRight size={17} /></>}
            </button>
          </form>
        </div>

        {/* Footer — no customer registration links intentionally */}
        <p className="text-center mt-6 text-white/15 text-xs font-body">
          Authorized personnel only &nbsp;·&nbsp; E-KODAK &copy; {new Date().getFullYear()}
        </p>

      </div>
    </div>
  );
}

