/**
 * Register.jsx — Improved customer registration with Google OAuth + OTP verification
 * Public sign-ups are always role: 'customer'
 */

import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Camera, Mail, Lock, User, ArrowRight, Loader2, ShieldCheck, RefreshCw, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { isSupabaseConfigured } from "../../lib/supabase";

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

// Password strength indicator
function PasswordStrength({ password }) {
  const checks = [
    { label: "6+ characters", ok: password.length >= 6 },
    { label: "Letter", ok: /[a-zA-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="flex gap-2 mt-1.5">
      {checks.map(c => (
        <div key={c.label} className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${c.ok ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
          <span className={`text-xs font-body ${c.ok ? 'text-emerald-600' : 'text-neutral-400'}`}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Register() {
  const [step, setStep] = useState(1);

  // Step 1 state
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 2 state
  const [code, setCode]             = useState("");
  const [resendStatus, setResendStatus] = useState("");

  const [error, setError]           = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const role = "customer";

  const { user, signUp, signInWithGoogle, verifyEmailCode, resendVerification, signOut } = useAuth();
  const navigate = useNavigate();

  // Role is always 'customer' for public sign-up.
  // Staff/Admin accounts are provisioned by the administrator via Supabase.

  if (user && step === 1) return <Navigate to="/dashboard" replace />;

  // ── Google sign-up (also triggers OTP-like verification via OAuth) ───────────
  const handleGoogleSignup = async () => {
    setError(""); setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || "Google sign-up failed.");
      setGoogleLoading(false);
    }
  };

  // ── Email Registration ───────────────────────────────────────────────────────
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isSupabaseConfigured) { setError("Supabase is not configured."); return; }
    if (!firstName || !lastName || !email || !password) { setError("Please fill in all fields."); return; }
    if (password !== confirmPwd) { setError("Passwords do not match."); return; }
    if (password.length < 6)    { setError("Password must be at least 6 characters."); return; }

    setIsSubmitting(true);
    try {
      await signUp(email, password, firstName, lastName, role);
      setStep(2);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── OTP Verification ────────────────────────────────────────────────────────
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!code || code.length !== 6) { setError("Please enter the 6-digit code."); return; }
    setIsSubmitting(true);
    try {
      await verifyEmailCode(email, code);
      await signOut(); // Force re-login so session is clean
      navigate("/login", { replace: true, state: { verified: true } });
    } catch (err) {
      setError(err.message || "Invalid or expired code. Try resending.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResendStatus(""); setError(""); setIsSubmitting(true);
    try {
      await resendVerification(email);
      setResendStatus("New code sent! Check your inbox.");
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
            Your story starts<br />with a single<br /><span className="text-gold">photograph.</span>
          </h2>
          <p className="text-white/50 font-body text-sm leading-relaxed">
            Create your account to book photography sessions, receive updates, and relive your most treasured moments.
          </p>
        </div>
        <div className="space-y-3">
          {["Instant booking confirmations", "Photo gallery access", "Real-time session updates"].map(f => (
            <div key={f} className="flex items-center gap-2.5">
              <CheckCircle2 size={15} className="text-gold flex-shrink-0" />
              <span className="text-white/60 font-body text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-gold transition-colors">
              <Camera size={28} />
              <span className="font-heading text-xl tracking-wide">E-KODAK</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="font-heading text-3xl text-primary mb-1.5">
              {step === 1 ? "Create account" : "Verify your email"}
            </h1>
            <p className="text-neutral-400 font-body text-sm">
              {step === 1
                ? "Join E-KODAK and start booking your sessions."
                : `We sent a 6-digit code to ${email}. Enter it below.`}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 p-3.5 rounded-xl text-sm font-body mb-5 leading-snug">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── STEP 1: REGISTER ── */}
          {step === 1 && (
            <>
              {/* Google button */}
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={googleLoading || isSubmitting}
                className="w-full flex items-center justify-center gap-3 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-body font-medium py-3 rounded-xl transition-all text-sm disabled:opacity-60 shadow-sm mb-5"
              >
                {googleLoading ? <Loader2 size={17} className="animate-spin" /> : <GoogleIcon size={18} />}
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-neutral-200" />
                <span className="text-xs text-neutral-400 font-body">or register with email</span>
                <div className="flex-1 h-px bg-neutral-200" />
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1.5" htmlFor="firstName">First Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400"><User size={15} /></div>
                      <input
                        id="firstName" type="text" value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all font-body text-sm"
                        placeholder="Juan" disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1.5" htmlFor="lastName">Last Name</label>
                    <input
                      id="lastName" type="text" value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all font-body text-sm"
                      placeholder="Dela Cruz" disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5" htmlFor="reg-email">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400"><Mail size={15} /></div>
                    <input
                      id="reg-email" type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all font-body text-sm"
                      placeholder="you@example.com" autoComplete="email" disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5" htmlFor="reg-password">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400"><Lock size={15} /></div>
                    <input
                      id="reg-password" type={showPwd ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all font-body text-sm"
                      placeholder="••••••••" autoComplete="new-password" disabled={isSubmitting}
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600">
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5" htmlFor="confirmPwd">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400"><Lock size={15} /></div>
                    <input
                      id="confirmPwd" type={showConfirm ? "text" : "password"} value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      className={`w-full pl-10 pr-10 py-3 bg-neutral-50 border rounded-xl focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all font-body text-sm ${
                        confirmPwd && confirmPwd !== password ? 'border-red-300' : 'border-neutral-200'
                      }`}
                      placeholder="••••••••" autoComplete="new-password" disabled={isSubmitting}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {confirmPwd && confirmPwd !== password && (
                    <p className="text-xs text-red-500 font-body mt-1">Passwords don't match</p>
                  )}
                </div>

                <button
                  type="submit" disabled={isSubmitting}
                  className="w-full btn-primary flex justify-center items-center gap-2 py-3 rounded-xl mt-1"
                >
                  {isSubmitting ? <><Loader2 size={17} className="animate-spin" /> Creating Account…</> : <>Create Account <ArrowRight size={17} /></>}
                </button>
              </form>

              <p className="text-center mt-7 text-neutral-400 font-body text-sm">
                Already have an account?{" "}
                <Link to="/login" className="text-gold font-medium hover:text-primary transition-colors">Sign in</Link>
              </p>
            </>
          )}

          {/* ── STEP 2: OTP VERIFY ── */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-5 text-gold border border-gold/20">
                  <ShieldCheck size={30} />
                </div>
                <p className="text-sm text-neutral-500 font-body">
                  We sent a 6-digit code to <strong className="text-primary">{email}</strong>.<br />
                  It expires in 10 minutes.
                </p>
              </div>

              {resendStatus && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3.5 rounded-xl text-sm font-body mb-5 text-center">{resendStatus}</div>
              )}

              <form onSubmit={handleVerifySubmit} className="space-y-5">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  className="w-full text-center tracking-[0.6em] text-3xl py-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all font-heading text-primary"
                  placeholder="000000"
                  maxLength={6}
                  disabled={isSubmitting}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSubmitting || code.length !== 6}
                  className="w-full btn-primary flex justify-center items-center gap-2 py-3.5 rounded-xl disabled:opacity-50"
                >
                  {isSubmitting ? <><Loader2 size={17} className="animate-spin" /> Verifying…</> : <>Verify Email <ArrowRight size={17} /></>}
                </button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-2">
                <button onClick={handleResend} disabled={isSubmitting} className="flex items-center gap-1.5 text-gold hover:text-primary text-sm font-medium transition-colors disabled:opacity-50">
                  <RefreshCw size={13} /> Resend Code
                </button>
                <button onClick={() => { setStep(1); setError(""); setCode(""); }} className="text-neutral-400 hover:text-neutral-600 text-xs font-body transition-colors">
                  ← Go back and change email
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
