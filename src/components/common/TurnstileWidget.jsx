/**
 * TurnstileWidget.jsx
 * ===================
 * Reusable Cloudflare Turnstile human-verification widget for Auth & Contact forms.
 *
 * - Reads `TURNSTILE_SITE_KEY` from `src/lib/turnstile.js`.
 * - Lazily injects Cloudflare Turnstile's script only when mounted with a site key.
 * - Integrates with Supabase Auth `captchaToken` (Sign Up, Sign In, Password Reset)
 *   and guards public Contact inquiries against automated submissions.
 */

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import { TURNSTILE_SITE_KEY, isTurnstileConfigured } from "../../lib/turnstile";

const TURNSTILE_SCRIPT_ID = "ekodak-cf-turnstile-script";
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise = null;

function formatTurnstileError(errorCode) {
  const code = String(errorCode || "").trim();
  if (code === "110200") {
    const host =
      typeof window !== "undefined" ? window.location.hostname : "this domain";
    return `Domain "${host}" is not authorized in Cloudflare Turnstile Hostname Management (Error 110200).`;
  }
  if (code === "110100" || code === "400020") {
    return `Invalid Turnstile Site Key configuration (Error ${code}).`;
  }
  if (code === "200500") {
    return "Cloudflare Turnstile iframe could not load. Check network or browser blockers (Error 200500).";
  }
  return `Verification check could not complete${code ? ` (Error ${code})` : ""}. Retry below.`;
}

function loadTurnstileScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window unavailable"));
  }
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (existing) {
      if (window.turnstile) {
        resolve(window.turnstile);
        return;
      }
      existing.addEventListener("load", () => resolve(window.turnstile), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile script failed")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
      } else {
        scriptPromise = null;
        reject(new Error("Turnstile API did not initialize"));
      }
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Unable to load Cloudflare Turnstile verification"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export default function TurnstileWidget({
  onTokenChange,
  resetKey = 0,
  theme = "dark",
  className = "",
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const tokenCallbackRef = useRef(onTokenChange);

  const [status, setStatus] = useState(
    isTurnstileConfigured ? "loading" : "unconfigured"
  );
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    tokenCallbackRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    if (!isTurnstileConfigured) return undefined;

    let cancelled = false;

    loadTurnstileScript()
      .then((turnstile) => {
        if (cancelled || !containerRef.current || !turnstile) return;

        if (widgetIdRef.current !== null) {
          try {
            turnstile.remove(widgetIdRef.current);
          } catch {
            // Ignore cleanup errors on already-unmounted widgets
          }
          widgetIdRef.current = null;
        }

        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: theme === "light" ? "light" : "dark",
          size: "flexible",
          appearance: "always",
          callback: (token) => {
            if (cancelled) return;
            setStatus("verified");
            setStatusText("");
            tokenCallbackRef.current?.(token);
          },
          "expired-callback": () => {
            if (cancelled) return;
            setStatus("expired");
            setStatusText("Verification expired. Please confirm you are human again.");
            tokenCallbackRef.current?.("");
          },
          "error-callback": (errorCode) => {
            if (cancelled) return;
            setStatus("error");
            setStatusText(formatTurnstileError(errorCode));
            tokenCallbackRef.current?.("");
          },
        });

        setStatus("ready");
        setStatusText("");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setStatusText(err?.message || "Unable to load CAPTCHA verification.");
        tokenCallbackRef.current?.("");
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore unmount cleanup failures
        }
        widgetIdRef.current = null;
      }
    };
  }, [theme, resetKey]);

  const handleManualReset = () => {
    if (widgetIdRef.current !== null && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
        setStatus("ready");
        setStatusText("");
        tokenCallbackRef.current?.("");
      } catch {
        // Ignore reset failures
      }
    }
  };

  if (!isTurnstileConfigured) {
    return (
      <div
        className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-body ${
          theme === "light"
            ? "border-neutral-200 bg-neutral-50 text-neutral-600"
            : "border-white/10 bg-white/[0.03] text-neutral-300"
        } ${className}`}
      >
        <ShieldCheck size={15} className="text-gold shrink-0" aria-hidden="true" />
        <span className="leading-snug">
          Turnstile CAPTCHA ready — add <code className="font-mono text-[11px] text-gold">VITE_TURNSTILE_SITE_KEY</code> to enforce challenge verification.
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        className={`rounded-xl border p-2.5 transition-colors ${
          theme === "light"
            ? "border-neutral-200 bg-neutral-50/80"
            : "border-white/10 bg-white/[0.03]"
        }`}
      >
        {status === "loading" && (
          <p
            className={`text-xs font-body py-2 text-center ${
              theme === "light" ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            Loading human verification…
          </p>
        )}
        <div ref={containerRef} className="w-full min-h-[65px] flex items-center justify-center" />
      </div>

      {statusText && (
        <div className="flex items-center justify-between gap-2 text-xs font-body text-amber-400">
          <span className="inline-flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0" aria-hidden="true" />
            <span>{statusText}</span>
          </span>
          <button
            type="button"
            onClick={handleManualReset}
            className="inline-flex items-center gap-1 text-gold hover:underline cursor-pointer shrink-0"
          >
            <RefreshCw size={12} aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  );
}
