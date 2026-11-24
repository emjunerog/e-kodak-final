/**
 * AuthCallback.jsx
 * ================
 * Handles redirects after OAuth sign-in, magic sign-in links, signup email confirmations,
 * and password recovery links.
 */

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Camera, AlertCircle, ArrowLeft } from "lucide-react";
import { supabase, persistTabRoleSnapshot } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { isPasswordRecovery } = useAuth();
  const [status, setStatus] = useState("Processing sign-in…");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;

    const handle = async () => {
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
            setErrorMsg(urlError.replace(/\+/g, " "));
            setStatus("Sign-in link could not be verified.");
          }
          return;
        }

        const linkType = searchParams.get("type") || hashParams.get("type") || "";
        const tokenHash = searchParams.get("token_hash");
        const code = searchParams.get("code");

        if (tokenHash && linkType) {
          setStatus("Verifying your email link…");
          const { error: verifyErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: linkType,
          });
          if (verifyErr) {
            if (active) {
              setErrorMsg(verifyErr.message || "This sign-in link has expired or was already used.");
              setStatus("Verification failed");
            }
            return;
          }
        } else if (code) {
          const { data: existing } = await supabase.auth.getSession();
          if (!existing?.session) {
            const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeErr) {
              // Give detectSessionInUrl a brief chance in case it already consumed the PKCE code
              const { data: fallbackCheck } = await supabase.auth.getSession();
              if (!fallbackCheck?.session) {
                if (active) {
                  setErrorMsg(
                    exchangeErr.message ||
                      "This sign-in link has expired or was opened in another browser session. Try requesting a 6-digit code instead."
                  );
                  setStatus("Sign-in failed");
                }
                return;
              }
            }
          }
        }

        let { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          await new Promise((r) => setTimeout(r, 1200));
          const retried = await supabase.auth.getSession();
          session = retried?.data?.session ?? null;
        }

        if (!session) {
          if (active) {
            setErrorMsg("We couldn't verify this sign-in session. Please try signing in again.");
            setStatus("Sign-in failed");
          }
          return;
        }

        if (linkType === "recovery" || isPasswordRecovery) {
          navigate("/reset-password", { replace: true });
          return;
        }

        if (active) setStatus("Loading your profile…");

        const userId = session.user?.id;
        if (!userId) {
          navigate("/login", { replace: true });
          return;
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        const role =
          profileData?.role ||
          session.user?.app_metadata?.role ||
          session.user?.user_metadata?.role ||
          "customer";

        if (profileData) {
          persistTabRoleSnapshot(profileData);
        } else {
          persistTabRoleSnapshot({
            id: userId,
            email: session.user?.email || null,
            role,
          });
        }

        if (role === "admin") navigate("/admin", { replace: true });
        else if (role === "photographer") navigate("/photographer", { replace: true });
        else navigate("/dashboard", { replace: true });
      } catch (err) {
        if (active) {
          setErrorMsg(err?.message || "Unexpected authentication error.");
          setStatus("Sign-in failed");
        }
      }
    };

    handle();
    return () => {
      active = false;
    };
  }, [navigate, isPasswordRecovery]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9f7] dark:bg-[#0a0a0c] px-6 text-center gap-5">
      <div className="flex items-center gap-2.5 text-neutral-900 dark:text-white mb-1">
        <Camera size={28} className="text-gold" />
        <span className="font-heading text-2xl tracking-wide font-semibold">E-KODAK</span>
      </div>

      {errorMsg ? (
        <div className="w-full max-w-md rounded-2xl border border-red-200 dark:border-red-500/30 bg-white dark:bg-[#121316] p-6 shadow-lg space-y-4">
          <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-500/40 flex items-center justify-center mx-auto text-red-500">
            <AlertCircle size={22} />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-heading text-xl font-semibold text-neutral-900 dark:text-white">
              {status}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 font-body leading-relaxed">
              {errorMsg}
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full min-h-[46px] rounded-xl bg-gradient-to-r from-[#e5be70] via-[#c9a96e] to-[#e8d5b0] text-neutral-950 font-body font-bold text-sm shadow-md"
          >
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      ) : (
        <>
          <Loader2 size={28} className="animate-spin text-gold" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-body">{status}</p>
        </>
      )}
    </div>
  );
}
