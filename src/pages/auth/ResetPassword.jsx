/**
 * ResetPassword.jsx
 * =================
 * Handles password reset links dispatched by Supabase Auth (`resetPasswordForEmail`).
 * Supports hash tokens (#access_token=...&type=recovery), PKCE (?code=...),
 * and token_hash links (?token_hash=...&type=recovery), as well as requesting a fresh link.
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Camera,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import TurnstileWidget from "../../components/common/TurnstileWidget";
import { isTurnstileConfigured } from "../../lib/turnstile";
import { saveBrowserPasswordCredential } from "../../lib/credentials";

export default function ResetPassword() {
  const { user, profile, updatePassword, requestPasswordReset, clearPasswordRecovery } = useAuth();
  const navigate = useNavigate();

  const [isDark] = useState(() => {
    try {
      const saved = localStorage.getItem("ekodak_darkMode");
      if (saved !== null) return JSON.parse(saved);
      return document.documentElement.classList.contains("dark") || true;
    } catch {
      return true;
    }
  });

  const [checkingLink, setCheckingLink] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fallback request-new-link state when opened without a valid link
  const [resetEmail, setResetEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  useEffect(() => {
    let active = true;

    const verifyRecoveryLink = async () => {
      if (!isSupabaseConfigured) {
        if (active) setCheckingLink(false);
        return;
      }

      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        const urlError =
          searchParams.get("error_description") ||
          hashParams.get("error_description") ||
          searchParams.get("error") ||
          hashParams.get("error");

        if (urlError) {
          if (active) {
            setError(urlError.replace(/\+/g, " "));
            setHasRecoverySession(false);
            setCheckingLink(false);
          }
          return;
        }

        const tokenHash = searchParams.get("token_hash");
        const linkType = searchParams.get("type") || hashParams.get("type");
        const code = searchParams.get("code");

        if (tokenHash && linkType) {
          const { error: otpErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: linkType,
          });
          if (otpErr && active) {
            setError(otpErr.message || "This reset link has expired or was already used.");
          }
        } else if (code) {
          const { data: current } = await supabase.auth.getSession();
          if (!current?.session) {
            const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exErr && active) {
              setError(exErr.message || "This reset link has expired or was opened in another browser.");
            }
          }
        }

        let { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          await new Promise((r) => setTimeout(r, 900));
          const retried = await supabase.auth.getSession();
          session = retried?.data?.session ?? null;
        }

        if (active) {
          setHasRecoverySession(Boolean(session?.user));
          setCheckingLink(false);
        }
      } catch (err) {
        if (active) {
          setError(err?.message || "Could not verify password reset link.");
          setHasRecoverySession(false);
          setCheckingLink(false);
        }
      }
    };

    verifyRecoveryLink();
    return () => {
      active = false;
    };
  }, []);

  const isRecoveryReady = hasRecoverySession || Boolean(user);

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(newPassword);
      await updatePassword(newPassword);
      if (user?.email) {
        saveBrowserPasswordCredential({ email: user.email, password: newPassword });
      }
      setSuccess(true);

      const role = profile?.role || user?.user_metadata?.role || "customer";
      const target =
        role === "admin" ? "/admin" : role === "photographer" ? "/photographer" : "/dashboard";

      setTimeout(() => {
        navigate(target, { replace: true });
      }, 1500);
    } catch (err) {
      setError(err?.message || "Failed to update password. Please request a new reset link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestAnother = async (e) => {
    e.preventDefault();
    setError("");
    setResendMessage("");
    if (isTurnstileConfigured && !captchaToken) {
      setError("Please complete the human verification check first.");
      return;
    }
    setIsSubmitting(true);
    try {
      await requestPasswordReset(resetEmail, captchaToken);
      setResendMessage("Password reset instructions sent! Check your inbox.");
    } catch (err) {
      setError(err?.message || "Failed to dispatch reset email.");
      setCaptchaToken("");
      setCaptchaResetKey((k) => k + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const strengthChecks = [
    { label: "6+ characters", ok: newPassword.length >= 6 },
    { label: "Letter", ok: /[a-zA-Z]/.test(newPassword) },
    { label: "Number", ok: /[0-9]/.test(newPassword) },
  ];

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-[#0a0a0c]" : "bg-[#faf9f7]"
      }`}
    >
      {/* Subtle luxury background glow */}
      <div
        className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full blur-[130px] ${
          isDark
            ? "opacity-35 bg-[radial-gradient(circle_at_center,rgba(201,169,110,0.22)_0%,transparent_70%)]"
            : "opacity-65 bg-[radial-gradient(circle_at_center,rgba(242,216,163,0.55)_0%,transparent_70%)]"
        }`}
      />

      <div className="w-full max-w-[440px] relative z-10">
        <div className="text-center mb-7">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div
              className={`w-9 h-9 rounded-xl border border-gold/40 flex items-center justify-center p-1.5 ${
                isDark ? "bg-neutral-900" : "bg-white shadow-sm"
              }`}
            >
              <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain" />
            </div>
            <span
              className={`font-heading text-lg font-bold tracking-[0.2em] ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              E-KODAK
            </span>
          </Link>
        </div>

        <div
          className={`relative rounded-3xl p-8 sm:p-10 border backdrop-blur-xl ${
            isDark
              ? "bg-[#121316] border-white/[0.08] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)]"
              : "bg-white border-neutral-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.06)]"
          }`}
        >
          <div className="w-12 h-1 bg-gradient-to-r from-gold to-gold-light rounded-full mb-6" />

          {checkingLink ? (
            <div className="py-10 text-center space-y-4">
              <Loader2 size={28} className="animate-spin text-gold mx-auto" />
              <p className={`text-sm font-body ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>
                Verifying your password reset link…
              </p>
            </div>
          ) : success ? (
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <CheckCircle2 size={28} />
              </div>
              <h1
                className={`font-heading text-2xl sm:text-3xl font-semibold ${
                  isDark ? "text-white" : "text-neutral-950"
                }`}
              >
                Password <span className={`italic font-normal ${isDark ? "text-gold" : "text-[#87550e]"}`}>updated</span>
              </h1>
              <p className={`text-sm font-body ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>
                Your new password is saved. Taking you to your portal now…
              </p>
            </div>
          ) : isRecoveryReady ? (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-gold font-semibold mb-2">
                  <KeyRound size={13} />
                  <span>Password Recovery</span>
                </div>
                <h1
                  className={`font-heading text-3xl font-semibold tracking-tight mb-2 ${
                    isDark ? "text-white" : "text-neutral-950"
                  }`}
                >
                  Set new <span className={`italic font-normal ${isDark ? "text-gold" : "text-[#87550e]"}`}>password</span>
                </h1>
                <p className={`font-body text-sm ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>
                  Choose a new password for {user?.email || "your account"}. You can sign in directly with it next time.
                </p>
              </div>

              {error && (
                <div
                  className={`flex items-start gap-2.5 p-3.5 rounded-xl text-sm font-body mb-4 leading-snug border ${
                    isDark
                      ? "bg-red-950/60 border-red-500/40 text-red-200"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                  role="alert"
                >
                  <AlertCircle size={17} className="flex-shrink-0 mt-0.5 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleUpdateSubmit} method="post" autoComplete="on" className="space-y-4">
                <input
                  type="email"
                  name="email"
                  value={user?.email || ""}
                  readOnly
                  autoComplete="username"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                />
                <div>
                  <label
                    htmlFor="reset-new-password"
                    className={`block text-xs font-semibold uppercase tracking-wider font-body mb-2 ${
                      isDark ? "text-neutral-200" : "text-neutral-800"
                    }`}
                  >
                    New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-gold transition-colors">
                      <Lock size={17} strokeWidth={1.8} />
                    </div>
                    <input
                      id="reset-new-password"
                      name="new-password"
                      type={showPwd ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      placeholder="At least 6 characters"
                      className={`w-full pl-11 pr-11 py-3 min-h-[50px] rounded-xl outline-none font-body text-sm font-medium border transition-all ${
                        isDark
                          ? "bg-[#1a1c20] border-[#373b44] focus:border-gold focus:ring-1 focus:ring-gold text-white placeholder:text-neutral-400"
                          : "bg-white border-neutral-300 focus:border-gold focus:ring-1 focus:ring-gold text-neutral-900 placeholder:text-neutral-400 shadow-xs"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      className={`absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer ${
                        isDark ? "text-neutral-400 hover:text-neutral-200" : "text-neutral-500 hover:text-neutral-800"
                      }`}
                    >
                      {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="flex items-center gap-3 mt-2">
                      {strengthChecks.map((c) => (
                        <div key={c.label} className="flex items-center gap-1.5">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.ok ? "bg-emerald-500" : isDark ? "bg-neutral-700" : "bg-neutral-300"
                            }`}
                          />
                          <span
                            className={`text-[11px] font-body ${
                              c.ok
                                ? isDark
                                  ? "text-emerald-400 font-medium"
                                  : "text-emerald-700 font-semibold"
                                : "text-neutral-500"
                            }`}
                          >
                            {c.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className={`block text-xs font-semibold uppercase tracking-wider font-body mb-2 ${
                      isDark ? "text-neutral-200" : "text-neutral-800"
                    }`}
                  >
                    Confirm New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-gold transition-colors">
                      <Lock size={17} strokeWidth={1.8} />
                    </div>
                    <input
                      id="reset-confirm-password"
                      name="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      placeholder="Re-enter password"
                      className={`w-full pl-11 pr-11 py-3 min-h-[50px] rounded-xl outline-none font-body text-sm font-medium border transition-all ${
                        confirmPassword && confirmPassword !== newPassword
                          ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          : isDark
                            ? "bg-[#1a1c20] border-[#373b44] focus:border-gold focus:ring-1 focus:ring-gold text-white placeholder:text-neutral-400"
                            : "bg-white border-neutral-300 focus:border-gold focus:ring-1 focus:ring-gold text-neutral-900 placeholder:text-neutral-400 shadow-xs"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                      className={`absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer ${
                        isDark ? "text-neutral-400 hover:text-neutral-200" : "text-neutral-500 hover:text-neutral-800"
                      }`}
                    >
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-500 font-body mt-1.5 font-medium">
                      Passwords do not match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl mt-4 bg-gradient-to-r from-[#e5be70] via-[#c9a96e] to-[#e8d5b0] hover:from-[#ecc77a] hover:to-[#f0ddbc] text-neutral-950 font-body font-bold text-sm tracking-wide shadow-lg shadow-gold/20 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-neutral-950" />
                      <span>Updating Password…</span>
                    </>
                  ) : (
                    <span>Save New Password</span>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mb-4">
                  <Camera size={22} />
                </div>
                <h1
                  className={`font-heading text-2xl sm:text-3xl font-semibold tracking-tight mb-2 ${
                    isDark ? "text-white" : "text-neutral-950"
                  }`}
                >
                  Reset your <span className={`italic font-normal ${isDark ? "text-gold" : "text-[#87550e]"}`}>password</span>
                </h1>
                <p className={`font-body text-sm ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>
                  {error
                    ? "Your reset link may have expired. Request a new password reset email below."
                    : "Enter your account email and we will send you a fresh password reset link and code."}
                </p>
              </div>

              {error && (
                <div
                  className={`flex items-start gap-2.5 p-3.5 rounded-xl text-sm font-body mb-4 leading-snug border ${
                    isDark
                      ? "bg-red-950/60 border-red-500/40 text-red-200"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                  role="alert"
                >
                  <AlertCircle size={17} className="flex-shrink-0 mt-0.5 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {resendMessage && (
                <div
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-body mb-4 border ${
                    isDark
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                      : "bg-emerald-50 border-emerald-200 text-emerald-800"
                  }`}
                >
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span>{resendMessage}</span>
                </div>
              )}

              <form onSubmit={handleRequestAnother} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-request-email"
                    className={`block text-xs font-semibold uppercase tracking-wider font-body mb-2 ${
                      isDark ? "text-neutral-200" : "text-neutral-800"
                    }`}
                  >
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-gold transition-colors">
                      <Mail size={17} strokeWidth={1.8} />
                    </div>
                    <input
                      id="reset-request-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      disabled={isSubmitting}
                      className={`w-full pl-11 pr-4 py-3 min-h-[50px] rounded-xl outline-none font-body text-sm font-medium border transition-all ${
                        isDark
                          ? "bg-[#1a1c20] border-[#373b44] focus:border-gold focus:ring-1 focus:ring-gold text-white placeholder:text-neutral-400"
                          : "bg-white border-neutral-300 focus:border-gold focus:ring-1 focus:ring-gold text-neutral-900 placeholder:text-neutral-400 shadow-xs"
                      }`}
                    />
                  </div>
                </div>

                <TurnstileWidget
                  theme={isDark ? "dark" : "light"}
                  resetKey={captchaResetKey}
                  onTokenChange={setCaptchaToken}
                />

                <button
                  type="submit"
                  disabled={isSubmitting || (isTurnstileConfigured && !captchaToken)}
                  className="w-full min-h-[50px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e5be70] via-[#c9a96e] to-[#e8d5b0] hover:from-[#ecc77a] hover:to-[#f0ddbc] text-neutral-950 font-body font-bold text-sm tracking-wide shadow-lg shadow-gold/20 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={17} className="animate-spin text-neutral-950" />
                      <span>Sending Reset Email…</span>
                    </>
                  ) : (
                    <span>Send Reset Link &amp; Code</span>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-neutral-200/80 dark:border-white/10 text-center">
                <Link
                  to="/login"
                  onClick={() => clearPasswordRecovery?.()}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold font-body ${
                    isDark ? "text-neutral-300 hover:text-gold" : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <ArrowLeft size={13} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
