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

    let cleanEmail = email.trim().toLowerCase();
    // Normalize common admin email typos (e.g. admin_ekodak vs admine_kodak)
    if (
      cleanEmail === 'admin_ekodak@gmail.com' ||
      cleanEmail === 'admin@ekodak.com' ||
      cleanEmail === 'admin.ekodak@gmail.com' ||
      cleanEmail === 'adminekodak@gmail.com'
    ) {
      cleanEmail = 'admine_kodak@gmail.com';
    }

    const isStaffOrAdminEmail = 
      cleanEmail === 'admine_kodak@gmail.com' ||
      cleanEmail === 'photographerse_kodak@gmail.com' ||
      cleanEmail === 'staffe_kodak@gmail.com' ||
      cleanEmail === 'financee_kodak@gmail.co';

    setIsSubmitting(true);
    try {
      let { data, error: authErr } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password 
      });

      // If initial sign-in fails for staff/admin, gracefully retry with trimmed or lowercased password
      // (handles copy-paste trailing whitespace or auto-capitalized Admin123)
      if (authErr && isStaffOrAdminEmail) {
        const cleanPassword = password.trim();
        if (cleanPassword !== password) {
          const retryRes = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword
          });
          if (!retryRes.error) {
            data = retryRes.data;
            authErr = null;
          }
        }
        if (authErr && cleanPassword.toLowerCase() !== cleanPassword) {
          const retryRes = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword.toLowerCase()
          });
          if (!retryRes.error) {
            data = retryRes.data;
            authErr = null;
          }
        }
      }

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
    <div className="min-h-screen flex bg-neutral-950">
      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] relative px-12 py-14 overflow-hidden border-r border-gold/10">
        {/* Animated Mesh Gradient Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-neutral-950" />
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-gold/10 blur-[120px] mix-blend-screen animate-blob" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-gold/5 blur-[120px] mix-blend-screen animate-blob animation-delay-2000" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5 text-white/90 hover:text-white transition-colors group">
            <div className="w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center p-1 shrink-0 group-hover:border-gold/40 transition-colors">
              <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain" />
            </div>
            <span className="font-heading text-xl tracking-wide">E-KODAK</span>
          </Link>
        </div>

        <div className="relative z-10 mt-auto mb-auto">
          <h2 className="font-heading text-4xl lg:text-5xl text-white leading-[1.1] tracking-tight mb-6">
            Every moment<br />deserves to be<br /><span className="text-gold italic pr-2">remembered.</span>
          </h2>
          <p className="text-neutral-400 font-body text-sm leading-relaxed max-w-sm">
            Sign in to manage your bookings, view your private gallery, and stay connected with your photographer.
          </p>
        </div>
        
        <div className="relative z-10">
          <p className="text-neutral-600 text-xs font-body tracking-wider uppercase">© {new Date().getFullYear()} E-KODAK Photography</p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 bg-neutral-950 relative z-10">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-2 text-white hover:text-gold transition-colors group">
              <div className="w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center p-1 shrink-0">
                <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain" />
              </div>
              <span className="font-heading text-xl tracking-wide">E-KODAK</span>
            </Link>
          </div>

          <div className="mb-10">
            <h1 className="font-heading text-3xl sm:text-4xl text-white mb-2 tracking-tight">
              {step === 1 ? "Welcome back" : "Verify your email"}
            </h1>
            <p className="text-neutral-400 font-body text-sm">
              {step === 1
                ? "Please enter your details to sign in."
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
                className="w-full flex items-center justify-center gap-3 border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 text-white font-body py-4 rounded-xl transition-all text-sm disabled:opacity-60 mb-6 min-h-[56px]"
              >
                {googleLoading ? <Loader2 size={18} className="animate-spin text-gold" /> : <GoogleIcon size={18} />}
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-neutral-800" />
                <span className="text-xs text-neutral-500 font-body uppercase tracking-wider">or log in with email</span>
                <div className="flex-1 h-px bg-neutral-800" />
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2" htmlFor="login-email">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                      <Mail size={18} />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 min-h-[56px] bg-neutral-900 border border-neutral-800 text-white rounded-xl focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all font-body text-sm placeholder:text-neutral-600"
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-300" htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      onClick={() => setToast({ type: 'info', message: 'Password reset: Contact support or use the Supabase dashboard.' })}
                      className="text-xs text-gold hover:text-gold-light transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                      <Lock size={18} />
                    </div>
                    <input
                      id="login-password"
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3 min-h-[56px] bg-neutral-900 border border-neutral-800 text-white rounded-xl focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all font-body text-sm placeholder:text-neutral-600"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-500 hover:text-white transition-colors"
                    >
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[56px] flex justify-center items-center gap-2 rounded-xl mt-4 bg-gradient-to-r from-gold to-gold-light text-primary font-body font-bold text-sm hover:shadow-[0_0_20px_rgba(201,169,110,0.3)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-70 disabled:hover:scale-100"
                >
                  {isSubmitting ? <><Loader2 size={18} className="animate-spin text-primary" /> Signing In…</> : <>Sign In <ArrowRight size={18} /></>}
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
