/**
 * Login.jsx — Customer & Staff login portal with dual Light/Dark theme support
 * Designed to match studio photography luxury aesthetic with Playfair Display typography
 * Features a realistic camera strobe flash and shutter animation on theme capture
 */

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Camera, Mail, Lock, ArrowRight, ArrowLeft, Loader2, RefreshCw, AlertCircle, CheckCircle2, Eye, EyeOff, Sun, Moon, KeyRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import Toast from "../../components/ui/Toast";
import OtpCodeInput from "../../components/auth/OtpCodeInput";
import TurnstileWidget from "../../components/common/TurnstileWidget";
import { isTurnstileConfigured } from "../../lib/turnstile";

// Google "G" SVG icon
function GoogleIcon({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// Pre-loads the authentic physical camera shutter recording for 0ms instantaneous response
let shutterAudioInstance = null;
if (typeof window !== "undefined") {
  try {
    shutterAudioInstance = new Audio("/shutter.mp3");
    shutterAudioInstance.preload = "auto";
  } catch {}
}

function playActualCameraShutter() {
  try {
    const audio = shutterAudioInstance || new Audio("/shutter.mp3");
    audio.currentTime = 0;
    audio.volume = 0.85;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback to Web Audio synthesis if browser policy requires explicit user interaction
        playCameraShutterSound();
      });
    }
  } catch {
    playCameraShutterSound();
  }
}

// Synthesizes an authentic mechanical studio camera shutter click-clack using Web Audio API as fallback
function playCameraShutterSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const bufferSize = Math.floor(ctx.sampleRate * 0.1);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const playClick = (time, freq, q, gainLevel, dur) => {
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(freq, time);
      filter.Q.setValueAtTime(q, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(gainLevel, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(time);
      noise.stop(time + dur + 0.005);
    };

    const now = ctx.currentTime;
    playClick(now, 1600, 4.0, 0.5, 0.026);
    playClick(now + 0.045, 680, 2.2, 0.65, 0.042);
    playClick(now + 0.105, 1100, 3.5, 0.35, 0.02);
  } catch {
    // Fail-safe: continue without audio if browser blocks audio autoplay
  }
}

export default function Login() {
  const [step, setStep] = useState(1);

  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [code, setCode]           = useState("");

  const [error, setError]           = useState(() => {
    try {
      const removedNotice = sessionStorage.getItem('ekodak_account_removed_notice');
      if (removedNotice) {
        sessionStorage.removeItem('ekodak_account_removed_notice');
        return removedNotice;
      }
    } catch {}
    return "";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationMode, setVerificationMode] = useState("email"); // 'signup' | 'email'
  const [toast, setToast] = useState(null);

  // Forgot Password / Reset state (steps 3 & 4)
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmNewPwd, setShowConfirmNewPwd] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  // Camera Flash capture animation state & direction ('to-dark' | 'to-light')
  const [isFlashing, setIsFlashing] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState(null);
  const flashTimerRef = useRef(null);

  // Theme state: allows switching between Dark and Light UI with camera flash transition
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('ekodak_darkMode');
      if (saved !== null) return JSON.parse(saved);
      return document.documentElement.classList.contains('dark') || true;
    } catch {
      return true;
    }
  });

  const toggleTheme = () => {
    const nextMode = !isDark;
    setTransitionDirection(nextMode ? 'to-dark' : 'to-light');
    setIsFlashing(true);
    playActualCameraShutter();

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);

    // Switch theme at the exact instant the mechanical shutter curtains close (130ms)
    setTimeout(() => {
      setIsDark(nextMode);
      try {
        localStorage.setItem('ekodak_darkMode', JSON.stringify(nextMode));
        if (nextMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        window.dispatchEvent(new Event('ekodak_theme_changed'));
      } catch {}
    }, 130);

    flashTimerRef.current = setTimeout(() => {
      setIsFlashing(false);
      setTransitionDirection(null);
    }, 560);
  };

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const {
    user,
    profile,
    loading,
    signInWithGoogle,
    verifyEmailCode,
    sendLoginCode,
    resendVerification,
    requestPasswordReset,
    verifyRecoveryCode,
    updatePassword,
    startIsolatedSession,
  } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
    if (role === 'admin') return '/admin';
    if (role === 'photographer') return '/photographer';
    return '/dashboard';
  };

  // If already authenticated and not explicitly requesting a new isolated session
  // Never hijack step 3/4 (forgot/reset password) or an active auth submission before updatePassword finishes
  const isResetOrSubmitting = step === 3 || step === 4 || isSubmitting;
  if (user && profile && !isNewSessionRequest && !isResetOrSubmitting) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#0a0a0c]' : 'bg-[#faf9f7]'}`}>
        <div className={`w-full max-w-md rounded-3xl p-8 sm:p-9 text-center relative z-10 overflow-hidden border backdrop-blur-2xl transition-all duration-300 ${
          isDark 
            ? 'bg-[#131417]/90 border-white/[0.08] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)]' 
            : 'bg-white/95 border-neutral-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.06)]'
        }`}>
          <div className="w-12 h-1 bg-gradient-to-r from-gold to-gold-light rounded-full mx-auto mb-6" />

          <div className="w-14 h-14 mx-auto rounded-2xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mb-5 shadow-sm shadow-gold/10">
            <Camera size={26} strokeWidth={1.8} />
          </div>
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-gold font-semibold px-3 py-1 rounded-full bg-gold/10 border border-gold/20">
            Active Session Detected
          </span>
          <h2 className={`text-xl font-heading font-normal mt-4 mb-1 ${isDark ? 'text-neutral-100' : 'text-neutral-900'}`}>
            Signed in as {profile.first_name ? `${profile.first_name} ${profile.last_name || ''}` : profile.email || 'User'}
          </h2>
          <p className={`text-xs mb-6 capitalize font-body ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            Current Portal: <span className={`font-semibold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>{profile.role || 'Customer'}</span>
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate(from || getDefaultRoute(profile.role), { replace: true })}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e5be70] via-[#c9a96e] to-[#e8d5b0] hover:from-[#ecc77a] hover:to-[#f0ddbc] text-neutral-950 font-body font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span>Continue to {profile.role === 'admin' ? 'Admin Portal' : 'Customer Dashboard'}</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => {
                if (startIsolatedSession) startIsolatedSession();
              }}
              className={`w-full py-3.5 px-4 rounded-xl font-body text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border ${
                isDark 
                  ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border-neutral-700' 
                  : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 hover:text-neutral-900 border-neutral-200'
              }`}
            >
              <RefreshCw size={14} className="text-gold" />
              <span>Log in as Customer / Different Account in this Tab</span>
            </button>
          </div>

          <p className={`text-[11px] mt-5 leading-relaxed font-body ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
            Real-time multi-portal login is active. Logging into another account in this tab will not disconnect your other open sessions.
          </p>
        </div>
      </div>
    );
  }

  if (loading && user && !isNewSessionRequest && !isResetOrSubmitting) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0a0a0c]' : 'bg-[#faf9f7]'}`}>
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }
  if (user && !profile && !isNewSessionRequest && !isResetOrSubmitting) {
    return <Navigate to={from || '/dashboard'} replace />;
  }

  // ── Email / Password Login ───────────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(""); setNeedsVerification(false);

    if (!isSupabaseConfigured) { setError("Supabase is not configured."); return; }
    if (!email || !password)   { setError("Please enter your email and password."); return; }
    if (isTurnstileConfigured && !captchaToken) {
      setError("Please complete the human verification check first.");
      return;
    }

    let cleanEmail = email.trim().toLowerCase();
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
      cleanEmail === 'photographerse_kodak@gmail.com';

    setIsSubmitting(true);
    try {
      const signInOptions = captchaToken ? { options: { captchaToken } } : {};
      let { data, error: authErr } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password,
        ...signInOptions,
      });

      if (authErr) {
        const cleanPassword = password.trim();
        if (cleanPassword !== password) {
          const retryRes = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
            ...signInOptions,
          });
          if (!retryRes.error) {
            data = retryRes.data;
            authErr = null;
          }
        }
        if (authErr && isStaffOrAdminEmail && cleanPassword.toLowerCase() !== cleanPassword) {
          const retryRes = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword.toLowerCase(),
            ...signInOptions,
          });
          if (!retryRes.error) {
            data = retryRes.data;
            authErr = null;
          }
        }
      }

      if (authErr) throw authErr;

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', data.user.id).maybeSingle();

      if (profileData) {
        try {
          sessionStorage.setItem('ekodak_user_profile', JSON.stringify(profileData));
        } catch {}
      }

      const role = profileData?.role || data.user?.user_metadata?.role || 'customer';
      navigate(from || getDefaultRoute(role), { replace: true });
    } catch (err) {
      const msg = err.message || "Failed to sign in.";
      const lowerMsg = msg.toLowerCase();
      if (!isStaffOrAdminEmail && lowerMsg.includes("email not confirmed")) {
        setError("Your email address is not confirmed yet. Send a 6-digit verification code below to activate your account.");
        setVerificationMode("signup");
        setNeedsVerification(true);
      } else if (!isStaffOrAdminEmail && lowerMsg.includes("invalid login")) {
        setError("Incorrect email or password. Reset your password if needed, or sign in with a 6-digit email code.");
        setVerificationMode("email");
        setNeedsVerification(true);
      } else {
        setError(msg);
      }
      setCaptchaToken("");
      setCaptchaResetKey((k) => k + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setError(""); setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
      setGoogleLoading(false);
    }
  };

  // ── OTP Verification ─────────────────────────────────────────────────────────
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!code || code.length !== 6) { setError("Please enter the 6-digit code."); return; }
    setIsSubmitting(true);
    try {
      let authData;
      try {
        authData = await verifyEmailCode(cleanEmail, code, verificationMode);
      } catch (primaryErr) {
        if (verificationMode === "signup") {
          authData = await verifyEmailCode(cleanEmail, code, "email");
        } else {
          throw primaryErr;
        }
      }
      const userId = authData?.user?.id;
      let role = authData?.user?.user_metadata?.role || "customer";
      if (userId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (profileData) {
          try {
            sessionStorage.setItem("ekodak_user_profile", JSON.stringify(profileData));
          } catch {}
          role = profileData.role || role;
        }
      }
      navigate(from || getDefaultRoute(role), { replace: true });
    } catch (err) {
      setError(err.message || "Invalid or expired code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Forgot Password Flow (Steps 3 & 4) ───────────────────────────────────────
  const openForgotPassword = () => {
    setError("");
    setResendStatus("");
    setNeedsVerification(false);
    setResetCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setCaptchaToken("");
    setCaptchaResetKey((k) => k + 1);
    setStep(3);
  };

  const handleForgotRequest = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setResendStatus("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (isTurnstileConfigured && !captchaToken) {
      setError("Please complete the human verification check first.");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(cleanEmail, captchaToken);
      setResetCode("");
      setResendCooldown(60);
      setResendStatus(
        "Reset instructions sent! Enter the 6-digit code from your email below, or click the reset link in your inbox."
      );
      setStep(4);
    } catch (err) {
      setError(err.message || "Failed to send password reset email.");
      setCaptchaToken("");
      setCaptchaResetKey((k) => k + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotComplete = async (e) => {
    e.preventDefault();
    setError("");
    setResendStatus("");
    const cleanEmail = email.trim().toLowerCase();

    if (!resetCode || resetCode.length !== 6) {
      setError("Please enter the 6-digit reset code from your email.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      let authData = user?.email?.toLowerCase() === cleanEmail ? { user } : null;
      if (!authData) {
        try {
          authData = await verifyRecoveryCode(cleanEmail, resetCode);
        } catch (recoveryErr) {
          try {
            authData = await verifyEmailCode(cleanEmail, resetCode, "email");
          } catch {
            throw recoveryErr;
          }
        }
      }
      await updatePassword(newPassword);

      const userId = authData?.user?.id || user?.id;
      let role = authData?.user?.user_metadata?.role || user?.user_metadata?.role || "customer";
      if (userId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (profileData) {
          try {
            sessionStorage.setItem("ekodak_user_profile", JSON.stringify(profileData));
          } catch {}
          role = profileData.role || role;
        }
      }

      navigate(from || getDefaultRoute(role), { replace: true });
    } catch (err) {
      const raw = String(err?.message || "");
      if (raw.toLowerCase().includes("expired") || raw.toLowerCase().includes("invalid")) {
        setError(
          "This code is expired or was replaced. Open the newest email at the bottom of your Gmail thread (only the latest unclicked code works) or click Resend Reset."
        );
      } else {
        setError(raw || "Invalid or expired reset code. Request a new code or use the link in your email.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isSubmitting) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email address first.");
      return;
    }

    setResendStatus("");
    setError("");
    setIsSubmitting(true);
    try {
      if (verificationMode === "signup") {
        await resendVerification(cleanEmail);
      } else {
        await sendLoginCode(cleanEmail);
      }
      setCode("");
      setResendStatus(
        step === 2
          ? "A new verification code has been sent."
          : "Verification code sent to your inbox."
      );
      setResendCooldown(60);
      setStep(2);
      setNeedsVerification(false);
    } catch (err) {
      const msg = err.message || "Failed to send verification code.";
      setError(msg);
      if (step === 1 && msg.toLowerCase().includes("no account found")) {
        setNeedsVerification(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex selection:bg-gold/25 selection:text-gold-light transition-colors duration-500 relative ${isDark ? 'bg-[#0a0a0c]' : 'bg-[#faf9f7]'}`}>
      
      {/* ── Realistic Camera Shutter Curtain & Strobe Flash Overlay ── */}
      {isFlashing && (
        <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden select-none">
          {/* Top Mechanical Shutter Blade Curtain */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-[#0c0d10] border-b-2 border-gold/40 shadow-2xl animate-shutter-curtain-top z-30" />

          {/* Bottom Mechanical Shutter Blade Curtain */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#0c0d10] border-t-2 border-gold/40 shadow-2xl animate-shutter-curtain-bottom z-30" />

          {/* Xenon Strobe Flash Burst Layer (Directional Bloom) */}
          <div 
            className={`absolute inset-0 z-20 ${
              transitionDirection === 'to-dark' ? 'animate-shutter-flash-dark' : 'animate-shutter-flash-light'
            }`}
            style={{
              background: transitionDirection === 'to-dark'
                ? 'radial-gradient(circle at center, rgba(255,255,255,0.98) 0%, rgba(220,205,180,0.85) 30%, rgba(20,21,26,0.96) 65%, rgba(10,10,12,0.99) 100%)'
                : 'radial-gradient(circle at center, rgba(255,255,255,1) 0%, rgba(255,252,242,0.98) 55%, rgba(248,245,236,0.92) 100%)',
            }}
          />

          {/* Minimalist Viewfinder Reticle (Clean, Elegant, Zero Clutter) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-gold/80" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gold/80" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-gold/80" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-gold/80" />

              {/* Center focus target */}
              <div className="w-12 h-12 rounded-full border border-gold/70 flex items-center justify-center shadow-sm shadow-gold/20">
                <div className="w-2.5 h-2.5 rounded-full bg-gold animate-ping opacity-90" />
                <div className="w-2 h-2 rounded-full bg-gold absolute" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Left decorative photography studio panel (Desktop 50%) ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative px-14 sm:px-16 xl:px-20 py-12 overflow-hidden border-r border-gold/15">
        
        {/* Layer 1: Dark theme authentic studio photograph (warm wood, blinds, cameras) */}
        <div 
          className="absolute inset-0 bg-cover pointer-events-none transition-opacity duration-700 ease-in-out"
          style={{
            backgroundImage: "url('/images/login-dark.jpg')",
            backgroundPosition: "center 70%",
            opacity: isDark ? 1 : 0,
          }}
        />

        {/* Layer 2: Light theme authentic studio photograph (bright daylight studio, Monstera, photo prints) */}
        <div 
          className="absolute inset-0 bg-cover pointer-events-none transition-opacity duration-700 ease-in-out"
          style={{
            backgroundImage: "url('/images/login-light.jpg')",
            backgroundPosition: "center 70%",
            opacity: isDark ? 0 : 1,
          }}
        />

        {/* Frosted Glassmorphic Optical Blur (Atmospheric gradient wash over left half, not a card box) */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            backdropFilter: 'blur(7px)',
            WebkitBackdropFilter: 'blur(7px)',
            maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0) 78%)',
            WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0) 78%)',
          }}
        />

        {/* Seamless ambient glassmorphic color wash (Protects text contrast on left, keeps camera & prints 100% crisp on right) */}
        <div 
          className="absolute inset-0 transition-opacity duration-700 pointer-events-none"
          style={{
            background: isDark
              ? `linear-gradient(to right, rgba(10,10,12,0.85) 0%, rgba(10,10,12,0.55) 42%, rgba(10,10,12,0.12) 75%, transparent 100%),
                 linear-gradient(to bottom, rgba(10,10,14,0.4) 0%, transparent 22%),
                 linear-gradient(to top, rgba(10,10,14,0.3) 0%, transparent 22%)`
              : `linear-gradient(to right, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.52) 42%, rgba(255,255,255,0.10) 75%, transparent 100%),
                 linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, transparent 22%),
                 linear-gradient(to top, rgba(255,255,255,0.25) 0%, transparent 22%)`
          }}
        />

        {/* Decorative sweeping corner arcs on left side */}
        <div className="absolute -bottom-24 -left-24 w-80 h-80 pointer-events-none opacity-40">
          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-gold">
            <circle cx="0" cy="200" r="140" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" />
            <circle cx="0" cy="200" r="180" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3" />
            <circle cx="0" cy="200" r="220" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.15" />
          </svg>
        </div>

        {/* Studio Brand Header - aligned along same left guide line */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center p-1.5 backdrop-blur-md shadow-sm transition-transform duration-200 group-hover:scale-105 ${
              isDark 
                ? 'bg-neutral-950/80 border-gold/40' 
                : 'bg-white/95 border-neutral-300/80 shadow-xs'
            }`}>
              <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain" />
            </div>
            <span className={`font-heading text-lg font-bold tracking-[0.2em] transition-colors drop-shadow-sm ${
              isDark ? 'text-white group-hover:text-gold-light' : 'text-neutral-950 group-hover:text-[#7a4c08]'
            }`}>
              E-KODAK
            </span>
          </Link>
        </div>

        {/* Editorial Headline Statement: near left side along same guide line as logo, no card box */}
        <div className="relative z-10 my-auto py-8 max-w-md xl:max-w-lg text-left">
          <h2 className={`font-heading text-4xl xl:text-5xl font-normal leading-[1.14] tracking-tight mb-2 ${
            isDark 
              ? 'text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]' 
              : 'text-neutral-950 drop-shadow-[0_1px_3px_rgba(255,255,255,0.95)] drop-shadow-[0_2px_8px_rgba(255,255,255,0.9)]'
          }`}>
            Every moment<br />
            deserves to be<br />
            <span className={`italic font-normal block relative ${
              isDark 
                ? 'text-gold drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]' 
                : 'text-[#7a4c08] drop-shadow-[0_1px_2px_rgba(255,255,255,1)] drop-shadow-[0_2px_6px_rgba(255,255,255,0.9)]'
            }`}>
              remembered.
            </span>
          </h2>

          {/* Hand-crafted curved gold swoosh underline matching mockup */}
          <svg className="w-64 sm:w-72 h-4 mt-1 text-gold drop-shadow-sm" viewBox="0 0 280 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 13C75 3 205 2 278 12C195 5 85 6 2 13Z" fill="url(#goldSwooshGrad)"/>
            <defs>
              <linearGradient id="goldSwooshGrad" x1="2" y1="8" x2="278" y2="8" gradientUnits="userSpaceOnUse">
                <stop stopColor={isDark ? "#e8d5b0" : "#b88328"} />
                <stop offset="0.5" stopColor={isDark ? "#c9a96e" : "#7a4c08"} />
                <stop offset="1" stopColor={isDark ? "#a8843a" : "#573604"} />
              </linearGradient>
            </defs>
          </svg>

          <p className={`font-body text-sm xl:text-base leading-relaxed max-w-sm mt-5 ${
            isDark 
              ? 'text-neutral-100 font-normal drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]' 
              : 'text-neutral-950 font-semibold drop-shadow-[0_1px_3px_rgba(255,255,255,0.95)]'
          }`}>
            Sign in to manage your bookings, view your private gallery, and stay connected with your photographer.
          </p>
        </div>
        
        {/* Studio Footer with sparkle icon - aligned along same left guide line */}
        <div className="relative z-10 flex items-center justify-start text-xs font-body">
          <div className="flex items-center gap-2.5">
            <span className={isDark ? "text-gold text-base drop-shadow-sm" : "text-[#7a4c08] text-base drop-shadow-sm"}>✦</span>
            <p className={`uppercase text-[11px] font-bold tracking-[0.18em] ${
              isDark 
                ? 'text-neutral-300 drop-shadow-md' 
                : 'text-neutral-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]'
            }`}>
              {new Date().getFullYear()} E-KODAK PHOTOGRAPHY
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: Form Container (Desktop 50%, Centered Optical Balance) ── */}
      <div className={`w-full lg:w-1/2 flex flex-col items-center justify-center px-4 sm:px-8 lg:px-12 py-10 relative overflow-hidden transition-colors duration-500 min-h-screen ${
        isDark ? 'bg-[#0a0a0c]' : 'bg-[#faf9f7]'
      }`}>

        {/* Multi-layer atmospheric ambient gradients on right panel (Pure luxury gradients, clean & clutter-free) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Subtle directional base gradient wash */}
          <div 
            className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
              isDark 
                ? 'bg-gradient-to-b from-[#0e0f13]/80 via-transparent to-[#07080a]/90' 
                : 'bg-gradient-to-b from-[#fffcf5]/90 via-transparent to-[#f5ecdd]/70'
            }`}
          />

          {/* Large primary radial glow centered behind the card */}
          <div 
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] sm:w-[800px] h-[650px] sm:h-[800px] rounded-full blur-[130px] transition-all duration-700 pointer-events-none ${
              isDark 
                ? 'opacity-40 bg-[radial-gradient(circle_at_center,rgba(201,169,110,0.18)_0%,rgba(168,132,58,0.08)_45%,transparent_70%)]' 
                : 'opacity-70 bg-[radial-gradient(circle_at_center,rgba(242,216,163,0.55)_0%,rgba(235,199,136,0.25)_45%,transparent_70%)]'
            }`}
          />

          {/* Top-Right warm ambient beam */}
          <div 
            className={`absolute -top-24 -right-24 w-[450px] h-[450px] rounded-full blur-[100px] transition-all duration-700 pointer-events-none ${
              isDark 
                ? 'opacity-30 bg-[radial-gradient(circle_at_center,rgba(232,213,176,0.16)_0%,rgba(201,169,110,0.05)_55%,transparent_75%)]' 
                : 'opacity-60 bg-[radial-gradient(circle_at_center,rgba(247,225,182,0.65)_0%,rgba(240,205,145,0.25)_55%,transparent_75%)]'
            }`}
          />

          {/* Bottom-Left soft ambient warmth */}
          <div 
            className={`absolute -bottom-24 -left-16 w-[400px] h-[400px] rounded-full blur-[100px] transition-all duration-700 pointer-events-none ${
              isDark 
                ? 'opacity-25 bg-[radial-gradient(circle_at_center,rgba(168,132,58,0.14)_0%,transparent_70%)]' 
                : 'opacity-50 bg-[radial-gradient(circle_at_center,rgba(245,215,160,0.45)_0%,transparent_70%)]'
            }`}
          />
        </div>

        {/* Top-Right Decorative Gold Spiral Arc Lines */}
        <div className="absolute -top-16 -right-16 w-80 h-80 pointer-events-none opacity-45 transition-opacity duration-700">
          <svg viewBox="0 0 200 200" fill="none" className={`w-full h-full ${isDark ? 'text-gold' : 'text-[#87550e]'}`}>
            <circle cx="200" cy="0" r="130" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.45" />
            <circle cx="200" cy="0" r="170" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.25" />
            <circle cx="200" cy="0" r="210" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.12" />
          </svg>
        </div>

        {/* Bottom-Right Decorative Gold Spiral Arc Lines */}
        <div className="absolute -bottom-20 -right-20 w-96 h-96 pointer-events-none opacity-45 transition-opacity duration-700">
          <svg viewBox="0 0 200 200" fill="none" className={`w-full h-full ${isDark ? 'text-gold' : 'text-[#87550e]'}`}>
            <circle cx="200" cy="200" r="140" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.45" />
            <circle cx="200" cy="200" r="185" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.25" />
            <circle cx="200" cy="200" r="230" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.12" />
          </svg>
        </div>

        {/* Clinging Theme Shutter Toggle Button (Docked cleanly on the right edge, enlarged & optically balanced) */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          className={`absolute top-8 sm:top-10 right-0 z-30 flex items-center justify-center pl-4 sm:pl-4.5 pr-3 sm:pr-3.5 py-3 sm:py-3.5 rounded-l-2xl border-y border-l border-r-0 transition-all duration-300 backdrop-blur-md cursor-pointer hover:-translate-x-1.5 active:scale-95 group shadow-lg ${
            isDark 
              ? 'bg-[#15171c]/95 hover:bg-[#1f2229] border-gold/40 hover:border-gold/70 text-amber-400 shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_14px_rgba(201,169,110,0.18)]' 
              : 'bg-white/95 hover:bg-neutral-50 border-neutral-300 hover:border-[#b88328]/70 text-neutral-800 shadow-[0_4px_20px_rgba(0,0,0,0.08),0_0_12px_rgba(201,169,110,0.12)]'
          }`}
        >
          {isDark ? (
            <Sun size={24} strokeWidth={2.2} className="text-amber-400 shrink-0 group-hover:rotate-45 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]" />
          ) : (
            <Moon size={23} strokeWidth={2.3} className="text-neutral-800 shrink-0 group-hover:-rotate-12 transition-transform duration-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
          )}
        </button>

        {/* Centered Form Card Wrapper */}
        <div className="w-full max-w-[440px] mx-auto my-auto relative z-10">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className={`w-8 h-8 rounded-xl border border-gold/40 flex items-center justify-center p-1 shrink-0 ${
                isDark ? 'bg-neutral-900' : 'bg-white shadow-sm'
              }`}>
                <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain" />
              </div>
              <span className={`font-heading text-lg font-bold tracking-[0.2em] ${
                isDark ? 'text-white' : 'text-neutral-900'
              }`}>
                E-KODAK
              </span>
            </Link>
          </div>

          {/* Luxury Card Container matching mockup */}
          <div className={`relative rounded-3xl p-8 sm:p-10 transition-all duration-300 border backdrop-blur-xl ${
            isDark 
              ? 'bg-[#121316] border-white/[0.08] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)]' 
              : 'bg-white border-neutral-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.06)]'
          }`}>
            
            {/* Gold Accent Bar above heading */}
            <div className="w-12 h-1 bg-gradient-to-r from-gold to-gold-light rounded-full mb-6" />

            <div className="mb-6">
              <h1 className={`font-heading text-3xl sm:text-4xl font-semibold tracking-tight mb-2 ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}>
                {step === 1 ? (
                  <>
                    Welcome <span className={`italic font-normal ${isDark ? 'text-gold' : 'text-[#87550e]'}`}>back</span>
                  </>
                ) : step === 2 ? (
                  <>
                    Verify your <span className={`italic font-normal ${isDark ? 'text-gold' : 'text-[#87550e]'}`}>email</span>
                  </>
                ) : step === 3 ? (
                  <>
                    Reset your <span className={`italic font-normal ${isDark ? 'text-gold' : 'text-[#87550e]'}`}>password</span>
                  </>
                ) : (
                  <>
                    Create new <span className={`italic font-normal ${isDark ? 'text-gold' : 'text-[#87550e]'}`}>password</span>
                  </>
                )}
              </h1>
              {step === 1 ? (
                <p className={`font-body text-sm ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  Please enter your details to sign in.
                </p>
              ) : step === 3 ? (
                <p className={`font-body text-sm ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  Enter your account email and we will send a 6-digit reset code and link.
                </p>
              ) : (
                <div className="space-y-2.5">
                  <p className={`font-body text-sm ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    {step === 4
                      ? "Enter the 6-digit reset code from your email (or click the reset link sent to you) and set your new password."
                      : "Enter the 6-digit code sent to your inbox."}
                  </p>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border max-w-full ${
                    isDark
                      ? 'bg-white/[0.04] border-white/10 text-neutral-200'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-800'
                  }`}>
                    <Mail size={13} className="text-gold shrink-0" aria-hidden="true" />
                    <span className="truncate">{email.trim().toLowerCase()}</span>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className={`flex items-start gap-2.5 p-3.5 rounded-xl text-sm font-body mb-4 leading-snug border ${
                isDark 
                  ? 'bg-red-950/60 border-red-500/40 text-red-200 backdrop-blur-sm' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`} role="alert">
                <AlertCircle size={17} className="flex-shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}
            {resendStatus && (
              <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-body mb-5 border ${
                isDark 
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" aria-hidden="true" />
                <span>{resendStatus}</span>
              </div>
            )}

            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* ── STEP 1: LOGIN ── */}
            {step === 1 && (
              <>
                {/* Continue with Google button — centered & high contrast guaranteed in both themes (Arrow removed) */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading || isSubmitting}
                  className={`google-auth-btn w-full flex items-center justify-center py-3.5 px-5 rounded-2xl font-body text-sm font-semibold transition-all duration-200 min-h-[52px] mb-6 shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 group border ${
                    isDark 
                      ? 'bg-[#edf2f7] hover:bg-white border-transparent shadow-md' 
                      : 'bg-white hover:bg-neutral-50 border-neutral-300 shadow-xs'
                  }`}
                  style={{ color: '#111827', backgroundColor: isDark ? '#edf2f7' : '#ffffff' }}
                >
                  <div className="flex items-center justify-center gap-2.5 w-full" style={{ color: '#111827' }}>
                    {googleLoading ? (
                      <Loader2 size={19} className="animate-spin text-gold" />
                    ) : (
                      <GoogleIcon size={19} />
                    )}
                    <span className="font-semibold text-sm tracking-wide" style={{ color: '#111827' }}>
                      {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
                    </span>
                  </div>
                </button>

                {/* Divider with centered 'OR' */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`flex-1 h-px ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />
                  <span className={`text-[11px] font-mono tracking-widest uppercase font-bold px-2 ${
                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                  }`}>
                    OR
                  </span>
                  <div className={`flex-1 h-px ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Email Field */}
                  <div>
                    <label 
                      className={`block text-xs font-semibold uppercase tracking-wider font-body mb-2 ${
                        isDark ? 'text-neutral-200' : 'text-neutral-800'
                      }`} 
                      htmlFor="login-email"
                    >
                      Email Address
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-gold transition-colors duration-200">
                        <Mail size={17} strokeWidth={1.8} />
                      </div>
                      <input
                        id="login-email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck="false"
                        inputMode="email"
                        enterKeyHint="next"
                        disabled={isSubmitting}
                        placeholder="admine_kodak@gmail.com"
                        className={`w-full pl-11 pr-4 py-3 min-h-[50px] rounded-xl outline-none font-body text-sm font-medium transition-all duration-200 disabled:opacity-60 border ${
                          isDark 
                            ? 'auth-input-dark bg-[#1a1c20] border-[#373b44] focus:border-gold focus:ring-1 focus:ring-gold text-white placeholder:text-neutral-400' 
                            : 'auth-input-light bg-white border-neutral-300 focus:border-gold focus:ring-1 focus:ring-gold text-neutral-900 placeholder:text-neutral-400 shadow-xs'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label 
                        className={`block text-xs font-semibold uppercase tracking-wider font-body ${
                          isDark ? 'text-neutral-200' : 'text-neutral-800'
                        }`} 
                        htmlFor="login-password"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={openForgotPassword}
                        className={`text-xs ${isDark ? 'text-gold hover:text-gold-light' : 'text-[#87550e] hover:text-[#694206]'} font-semibold font-body hover:underline underline-offset-4 decoration-gold/40 cursor-pointer`}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-gold transition-colors duration-200">
                        <Lock size={17} strokeWidth={1.8} />
                      </div>
                      <input
                        id="login-password"
                        name="password"
                        type={showPwd ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        enterKeyHint="done"
                        disabled={isSubmitting}
                        placeholder="••••••••"
                        className={`w-full pl-11 pr-11 py-3 min-h-[50px] rounded-xl outline-none font-body text-sm font-medium transition-all duration-200 disabled:opacity-60 border ${
                          isDark 
                            ? 'auth-input-dark bg-[#1a1c20] border-[#373b44] focus:border-gold focus:ring-1 focus:ring-gold text-white placeholder:text-neutral-400' 
                            : 'auth-input-light bg-white border-neutral-300 focus:border-gold focus:ring-1 focus:ring-gold text-neutral-900 placeholder:text-neutral-400 shadow-xs'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        aria-label={showPwd ? "Hide password" : "Show password"}
                        className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors cursor-pointer ${
                          isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        {showPwd ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
                      </button>
                    </div>
                  </div>

                  {/* Human Verification */}
                  <TurnstileWidget
                    theme={isDark ? "dark" : "light"}
                    resetKey={captchaResetKey}
                    onTokenChange={setCaptchaToken}
                  />

                  {/* Sign In Button matching mockup — Arrow removed */}
                  <button
                    type="submit"
                    disabled={isSubmitting || (isTurnstileConfigured && !captchaToken)}
                    className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl mt-6 bg-gradient-to-r from-[#e5be70] via-[#c9a96e] to-[#e8d5b0] hover:from-[#ecc77a] hover:to-[#f0ddbc] text-neutral-950 font-body font-bold text-sm tracking-wide shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 group"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin text-neutral-950" />
                        <span>Signing In…</span>
                      </>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>

                  {needsVerification && (
                    <div className={`mt-4 p-4 rounded-xl border text-left animate-fade-in space-y-3 ${
                      isDark 
                        ? 'bg-amber-950/50 border-amber-500/35 text-amber-100 backdrop-blur-sm' 
                        : 'bg-[#fdfaf3] border-[#e6d7b8] text-neutral-800'
                    }`}>
                      <p className="text-xs sm:text-sm font-body leading-snug">
                        {verificationMode === "signup"
                          ? "Your email hasn't been confirmed yet. Send a 6-digit verification code to activate your account."
                          : "Forgot your password or registered with Google? You can reset your password for future logins, or sign in with a 6-digit code now."}
                      </p>
                      <div className={verificationMode === "signup" ? "space-y-2" : "grid grid-cols-1 sm:grid-cols-2 gap-2"}>
                        {verificationMode !== "signup" && (
                          <button
                            type="button"
                            onClick={openForgotPassword}
                            disabled={isSubmitting}
                            className={`w-full h-10 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-55 ${
                              isDark
                                ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                                : 'bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300'
                            }`}
                          >
                            Reset Password
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={isSubmitting || resendCooldown > 0}
                          className={`w-full h-10 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed ${
                            isDark
                              ? 'bg-gold/15 hover:bg-gold/25 text-gold-light border border-gold/35'
                              : 'bg-neutral-900 hover:bg-neutral-800 text-[#e8cf9d]'
                          }`}
                        >
                          {isSubmitting
                            ? "Sending code…"
                            : verificationMode === "signup"
                              ? "Send Verification Code"
                              : "Email Sign-In Code"}
                        </button>
                      </div>
                    </div>
                  )}
                </form>

                <p className={`text-center mt-6 font-body text-sm ${isDark ? 'text-neutral-300' : 'text-neutral-700 font-medium'}`}>
                  Don't have an account?{" "}
                  <Link 
                    to="/register" 
                    className={`font-bold underline underline-offset-4 decoration-gold/40 hover:decoration-gold transition-colors ${
                      isDark ? 'text-gold hover:text-gold-light' : 'text-[#87550e] hover:text-[#694206]'
                    }`}
                  >
                    Create one
                  </Link>
                </p>
              </>
            )}

            {/* ── STEP 2: OTP Verify ── */}
            {step === 2 && (
              <div className="animate-fade-in">
                <form onSubmit={handleVerifySubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="login-otp-0"
                      className={`block text-xs font-semibold uppercase tracking-wider font-body mb-2.5 ${
                        isDark ? 'text-neutral-300' : 'text-neutral-600'
                      }`}
                    >
                      6-Digit Verification Code
                    </label>
                    <OtpCodeInput
                      value={code}
                      onChange={setCode}
                      disabled={isSubmitting}
                      isDark={isDark}
                      idPrefix="login-otp"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || code.length !== 6}
                    className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e5be70] via-[#c9a96e] to-[#e8d5b0] hover:from-[#ecc77a] hover:to-[#f0ddbc] text-neutral-950 font-body font-bold text-sm tracking-wide shadow-md shadow-gold/20 hover:shadow-lg hover:shadow-gold/30 transition-all duration-200 disabled:opacity-55 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={17} className="animate-spin text-neutral-950" />
                        <span>Verifying…</span>
                      </>
                    ) : (
                      <span>Verify &amp; Sign In</span>
                    )}
                  </button>
                </form>

                <div className={`mt-6 pt-4 border-t flex items-center justify-between gap-3 ${
                  isDark ? 'border-white/10' : 'border-neutral-200/80'
                }`}>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError("");
                      setResendStatus("");
                      setCode("");
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold font-body transition-colors cursor-pointer ${
                      isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <ArrowLeft size={13} />
                    <span>Back to Login</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isSubmitting || resendCooldown > 0}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark ? 'text-gold hover:text-gold-light' : 'text-[#87550e] hover:text-[#694206]'
                    }`}
                  >
                    <RefreshCw size={12} className={isSubmitting ? 'animate-spin' : ''} />
                    <span>
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: FORGOT PASSWORD (REQUEST EMAIL) ── */}
            {step === 3 && (
              <div className="animate-fade-in">
                <form onSubmit={handleForgotRequest} className="space-y-4">
                  <div>
                    <label
                      htmlFor="forgot-email"
                      className={`block text-xs font-semibold uppercase tracking-wider font-body mb-2 ${
                        isDark ? 'text-neutral-200' : 'text-neutral-800'
                      }`}
                    >
                      Email Address
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-gold transition-colors duration-200">
                        <Mail size={17} strokeWidth={1.8} />
                      </div>
                      <input
                        id="forgot-email"
                        name="forgotEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck="false"
                        inputMode="email"
                        disabled={isSubmitting}
                        placeholder="you@example.com"
                        className={`w-full pl-11 pr-4 py-3 min-h-[50px] rounded-xl outline-none font-body text-sm font-medium transition-all duration-200 disabled:opacity-60 border ${
                          isDark
                            ? 'auth-input-dark bg-[#1a1c20] border-[#373b44] focus:border-gold focus:ring-1 focus:ring-gold text-white placeholder:text-neutral-400'
                            : 'auth-input-light bg-white border-neutral-300 focus:border-gold focus:ring-1 focus:ring-gold text-neutral-900 placeholder:text-neutral-400 shadow-xs'
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
                    className="w-full min-h-[50px] flex items-center justify-center gap-2 rounded-xl mt-2 bg-gradient-to-r from-[#e5be70] via-[#c9a96e] to-[#e8d5b0] hover:from-[#ecc77a] hover:to-[#f0ddbc] text-neutral-950 font-body font-bold text-sm tracking-wide shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={17} className="animate-spin text-neutral-950" />
                        <span>Sending Reset Email…</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={16} />
                        <span>Send Reset Code &amp; Link</span>
                      </>
                    )}
                  </button>
                </form>

                <div className={`mt-6 pt-4 border-t flex items-center justify-between gap-3 ${
                  isDark ? 'border-white/10' : 'border-neutral-200/80'
                }`}>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError("");
                      setResendStatus("");
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold font-body transition-colors cursor-pointer ${
                      isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <ArrowLeft size={13} />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4: FORGOT PASSWORD (CODE + NEW PASSWORD) ── */}
            {step === 4 && (
              <div className="animate-fade-in">
                <form onSubmit={handleForgotComplete} className="space-y-4">
                  <input
                    type="email"
                    name="email"
                    value={email.trim().toLowerCase()}
                    readOnly
                    autoComplete="username"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                  />
                  <div>
                    <label
                      htmlFor="reset-otp-0"
                      className={`block text-xs font-semibold uppercase tracking-wider font-body mb-2.5 ${
                        isDark ? 'text-neutral-300' : 'text-neutral-600'
                      }`}
                    >
                      6-Digit Reset Code
                    </label>
                    <OtpCodeInput
                      value={resetCode}
                      onChange={setResetCode}
                      disabled={isSubmitting}
                      isDark={isDark}
                      idPrefix="reset-otp"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="forgot-new-password"
                      className={`block text-xs font-semibold uppercase tracking-wider font-body mb-2 ${
                        isDark ? 'text-neutral-200' : 'text-neutral-800'
                      }`}
                    >
                      New Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-gold transition-colors duration-200">
                        <Lock size={17} strokeWidth={1.8} />
                      </div>
                      <input
                        id="forgot-new-password"
                        type={showNewPwd ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        disabled={isSubmitting}
                        placeholder="At least 6 characters"
                        className={`w-full pl-11 pr-11 py-3 min-h-[48px] rounded-xl outline-none font-body text-sm font-medium transition-all duration-200 disabled:opacity-60 border ${
                          isDark
                            ? 'auth-input-dark bg-[#1a1c20] border-[#373b44] focus:border-gold focus:ring-1 focus:ring-gold text-white placeholder:text-neutral-400'
                            : 'auth-input-light bg-white border-neutral-300 focus:border-gold focus:ring-1 focus:ring-gold text-neutral-900 placeholder:text-neutral-400 shadow-xs'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd((v) => !v)}
                        aria-label={showNewPwd ? "Hide password" : "Show password"}
                        className={`absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer ${
                          isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        {showNewPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="flex items-center gap-3 mt-2">
                        {[
                          { label: "6+ characters", ok: newPassword.length >= 6 },
                          { label: "Letter", ok: /[a-zA-Z]/.test(newPassword) },
                          { label: "Number", ok: /[0-9]/.test(newPassword) },
                        ].map((c) => (
                          <div key={c.label} className="flex items-center gap-1.5">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.ok ? 'bg-emerald-500' : isDark ? 'bg-neutral-700' : 'bg-neutral-300'
                              }`}
                            />
                            <span
                              className={`text-[11px] font-body ${
                                c.ok
                                  ? isDark
                                    ? 'text-emerald-400 font-medium'
                                    : 'text-emerald-700 font-semibold'
                                  : 'text-neutral-500'
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
                      htmlFor="forgot-confirm-password"
                      className={`block text-xs font-semibold uppercase tracking-wider font-body mb-2 ${
                        isDark ? 'text-neutral-200' : 'text-neutral-800'
                      }`}
                    >
                      Confirm New Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-gold transition-colors duration-200">
                        <Lock size={17} strokeWidth={1.8} />
                      </div>
                      <input
                        id="forgot-confirm-password"
                        type={showConfirmNewPwd ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        disabled={isSubmitting}
                        placeholder="Re-enter new password"
                        className={`w-full pl-11 pr-11 py-3 min-h-[48px] rounded-xl outline-none font-body text-sm font-medium transition-all duration-200 disabled:opacity-60 border ${
                          confirmNewPassword && confirmNewPassword !== newPassword
                            ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                            : isDark
                              ? 'auth-input-dark bg-[#1a1c20] border-[#373b44] focus:border-gold focus:ring-1 focus:ring-gold text-white placeholder:text-neutral-400'
                              : 'auth-input-light bg-white border-neutral-300 focus:border-gold focus:ring-1 focus:ring-gold text-neutral-900 placeholder:text-neutral-400 shadow-xs'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPwd((v) => !v)}
                        aria-label={showConfirmNewPwd ? "Hide confirm password" : "Show confirm password"}
                        className={`absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer ${
                          isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        {showConfirmNewPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {confirmNewPassword && confirmNewPassword !== newPassword && (
                      <p className="text-xs text-red-500 font-body mt-1.5 font-medium">Passwords do not match</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || resetCode.length !== 6}
                    className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e5be70] via-[#c9a96e] to-[#e8d5b0] hover:from-[#ecc77a] hover:to-[#f0ddbc] text-neutral-950 font-body font-bold text-sm tracking-wide shadow-md shadow-gold/20 hover:shadow-lg hover:shadow-gold/30 transition-all duration-200 disabled:opacity-55 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={17} className="animate-spin text-neutral-950" />
                        <span>Updating Password…</span>
                      </>
                    ) : (
                      <span>Reset Password &amp; Sign In</span>
                    )}
                  </button>
                </form>

                <div className={`mt-6 pt-4 border-t flex items-center justify-between gap-3 ${
                  isDark ? 'border-white/10' : 'border-neutral-200/80'
                }`}>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError("");
                      setResendStatus("");
                      setResetCode("");
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold font-body transition-colors cursor-pointer ${
                      isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <ArrowLeft size={13} />
                    <span>Back to Sign In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleForgotRequest()}
                    disabled={isSubmitting || resendCooldown > 0}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark ? 'text-gold hover:text-gold-light' : 'text-[#87550e] hover:text-[#694206]'
                    }`}
                  >
                    <RefreshCw size={12} className={isSubmitting ? 'animate-spin' : ''} />
                    <span>
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Reset"}
                    </span>
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}

