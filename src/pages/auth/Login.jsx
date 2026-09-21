/**
 * Login.jsx — Improved customer login page with Google OAuth
 */

import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Camera, Mail, Lock, ArrowRight, Loader2, ShieldCheck, RefreshCw, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import Toast from "../../components/ui/Toast";

// Google "G" SVG icon
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const [step, setStep] = useState(1);

  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [code, setCode]           = useState("");

  const [error, setError]           = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [toast, setToast] = useState(null);

  const { user, profile, loading, signIn, signInWithGoogle, verifyEmailCode, resendVerification, startIsolatedSession } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const isNewSessionRequest = location.search.includes('new_session=true');

  useEffect(() => {
    if (isNewSessionRequest && startIsolatedSession) {
      startIsolatedSession();
    }
  }, [isNewSessionRequest, startIsolatedSession]);

  // Show success message if arriving from registration flow
  useEffect(() => {
    if (location.state?.verified) {
      setToast({ type: 'success', message: 'Email verified! You can now sign in.' });
    }
  }, [location.state]);

  const fromPath   = location.state?.from?.pathname;
  const fromSearch = location.state?.from?.search || "";
  const from       = fromPath ? fromPath + fromSearch : null;

  const getDefaultRoute = (role) => {
    if (role === 'admin' || role === 'staff' || role === 'finance') return '/admin';
    if (role === 'photographer')                                   return '/photographer';
    return '/dashboard';
  };

  // If already authenticated and not explicitly requesting a new isolated session
  if (user && profile && !isNewSessionRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-6">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-5">
            <Camera size={28} />
          </div>
          <span className="text-[11px] font-mono tracking-widest uppercase text-gold font-bold px-3 py-1 rounded-full bg-gold/10 border border-gold/20">
            Active Session Detected
          </span>
          <h2 className="text-xl font-heading font-bold text-white mt-4 mb-1">
            Signed in as {profile.first_name ? `${profile.first_name} ${profile.last_name || ''}` : profile.email || 'User'}
          </h2>
          <p className="text-xs text-neutral-400 mb-6 capitalize">
            Current Portal: <span className="font-semibold text-white">{profile.role || 'Customer'}</span>
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate(from || getDefaultRoute(profile.role), { replace: true })}
              className="w-full py-3.5 px-4 rounded-xl bg-gold hover:bg-gold-light text-primary font-body font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-gold/10"
            >
              <span>Continue to {profile.role === 'admin' ? 'Admin Portal' : 'Customer Dashboard'}</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => {
                if (startIsolatedSession) startIsolatedSession();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 font-body text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} className="text-gold" />
              <span>Log in as Customer / Different Account in this Tab</span>
            </button>
          </div>

          <p className="text-[11px] text-neutral-500 mt-5 leading-relaxed">
            Real-time multi-portal login is active. Logging into another account in this tab will not disconnect your other open sessions.
          </p>
        </div>
      </div>
    );
  }

  if (loading && user && !isNewSessionRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }
  if (user && !profile && !isNewSessionRequest) {
    return <Navigate to={from || '/dashboard'} replace />;
  }

  // ── Email / Password Login ───────────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(""); setNeedsVerification(false);

    if (!isSupabaseConfigured) { setError("Supabase is not configured."); return; }
    if (!email || !password)   { setError("Please enter your email and password."); return; }

    const cleanEmail = email.trim().toLowerCase();
    const isStaffOrAdminEmail = 
      cleanEmail === 'admine_kodak@gmail.com' ||
      cleanEmail === 'photographerse_kodak@gmail.com' ||
      cleanEmail === 'staffe_kodak@gmail.com' ||
      cleanEmail === 'financee_kodak@gmail.co';

    setIsSubmitting(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password 
      });
      if (authErr) throw authErr;

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', data.user.id).single();

      if (profileData) {
        // Write ONLY to sessionStorage (tab-scoped) — never to localStorage.
        // This guarantees that a customer login in Tab 2 cannot pollute
        // the admin session in Tab 1 via a cross-tab storage event.
        try {
          sessionStorage.setItem('ekodak_user_profile', JSON.stringify(profileData));
        } catch {}
      }

      const role = profileData?.role || 'customer';
      navigate(from || getDefaultRoute(role), { replace: true });
    } catch (err) {
      const msg = err.message || "Failed to sign in.";
      setError(msg);
      // Administrative staff skip email code verification flow
      if (!isStaffOrAdminEmail && (msg.toLowerCase().includes("email not confirmed") || msg.toLowerCase().includes("invalid login"))) {
        setNeedsVerification(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setError(""); setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Page will redirect — no further action needed
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
      setGoogleLoading(false);
    }
  };

  // ── OTP Verification (fallback for unverified accounts) ─────────────────────
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!code || code.length !== 6) { setError("Please enter the 6-digit code."); return; }
    setIsSubmitting(true);
    try {
      await verifyEmailCode(email, code);
      navigate(from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || "Invalid or expired code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResendStatus(""); setError(""); setIsSubmitting(true);
    try {
      await resendVerification(email);
      setResendStatus("A new code has been sent to your email!");
      setStep(2); setNeedsVerification(false);
    } catch (err) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-primary px-12 py-14">
        <Link to="/" className="flex items-center gap-2.5 text-white/80 hover:text-white transition-colors">
          <Camera size={26} />
          <span className="font-heading text-xl tracking-wide">E-KODAK</span>
        </Link>
        <div>
          <h2 className="font-heading text-4xl text-white leading-snug mb-4">
            Every moment<br />deserves to be<br /><span className="text-gold">remembered.</span>
          </h2>
          <p className="text-white/50 font-body text-sm leading-relaxed">
            Sign in to manage your bookings, view your gallery, and stay connected with your photographer.
          </p>
        </div>
        <p className="text-white/20 text-xs font-body">© {new Date().getFullYear()} E-KODAK Photography</p>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-gold transition-colors">
              <Camera size={28} />
              <span className="font-heading text-xl tracking-wide">E-KODAK</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="font-heading text-3xl text-primary mb-1.5">
              {step === 1 ? "Welcome back" : "Verify your email"}
            </h1>
            <p className="text-neutral-400 font-body text-sm">
              {step === 1
                ? "Sign in to your E-KODAK account."
                : `Enter the 6-digit code sent to ${email}.`}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 p-3.5 rounded-xl text-sm font-body mb-6 leading-snug">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {resendStatus && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3.5 rounded-xl text-sm font-body mb-5">{resendStatus}</div>
          )}

          <Toast toast={toast} onClose={() => setToast(null)} />

          {/* ── STEP 1: LOGIN ── */}
          {step === 1 && (
            <>
              {/* Google button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || isSubmitting}
                className="w-full flex items-center justify-center gap-3 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-body font-medium py-3 rounded-xl transition-all text-sm disabled:opacity-60 shadow-sm mb-5"
              >
                {googleLoading ? <Loader2 size={17} className="animate-spin" /> : <GoogleIcon size={18} />}
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-neutral-200" />
                <span className="text-xs text-neutral-400 font-body">or sign in with email</span>
                <div className="flex-1 h-px bg-neutral-200" />
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5" htmlFor="login-email">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <Mail size={16} />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all font-body text-sm"
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-primary" htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      onClick={() => setToast({ type: 'info', message: 'Password reset: Contact support or use the Supabase dashboard.' })}
                      className="text-xs text-gold hover:text-primary transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <Lock size={16} />
                    </div>
                    <input
                      id="login-password"
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all font-body text-sm"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600"
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary flex justify-center items-center gap-2 py-3 rounded-xl mt-2"
                >
                  {isSubmitting ? <><Loader2 size={17} className="animate-spin" /> Signing In…</> : <>Sign In <ArrowRight size={17} /></>}
                </button>

                {needsVerification && (
                  <div className="mt-1 p-4 bg-amber-50 rounded-xl border border-amber-100 text-center animate-fade-in">
                    <p className="text-sm font-body text-amber-800 mb-3">
                      Your email may not be verified yet. Send a new verification code?
                    </p>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isSubmitting}
                      className="w-full py-2 bg-white text-amber-700 text-sm font-medium border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      Send Verification Code
                    </button>
                  </div>
                )}
              </form>

              <p className="text-center mt-7 text-neutral-400 font-body text-sm">
                Don't have an account?{" "}
                <Link to="/register" className="text-gold font-medium hover:text-primary transition-colors">
                  Create one
                </Link>
              </p>
            </>
          )}

          {/* ── STEP 2: OTP Verify ── */}
          {step === 2 && (
            <div className="animate-fade-in text-center">
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6 text-gold">
                <ShieldCheck size={30} />
              </div>
              <form onSubmit={handleVerifySubmit} className="space-y-5">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  className="w-full text-center tracking-[0.6em] text-2xl py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all font-heading text-primary"
                  placeholder="000000"
                  maxLength={6}
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || code.length !== 6}
                  className="w-full btn-primary flex justify-center items-center gap-2 py-3 disabled:opacity-50 rounded-xl"
                >
                  {isSubmitting ? <><Loader2 size={17} className="animate-spin" /> Verifying…</> : <>Verify & Sign In <ArrowRight size={17} /></>}
                </button>
              </form>
              <div className="mt-5 flex flex-col gap-2">
                <button onClick={handleResend} disabled={isSubmitting} className="text-gold hover:text-primary text-sm font-medium flex items-center justify-center gap-1 transition-colors">
                  <RefreshCw size={13} /> Resend Code
                </button>
                <button onClick={() => { setStep(1); setError(""); }} className="text-neutral-400 hover:text-primary text-xs font-body transition-colors">
                  ← Back to Login
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
