/**
 * cookies.js
 * ==========
 * First-party cookie management and RA 10173 (Philippine Data Privacy Act)
 * granular consent utilities for E-Kodak Studio.
 *
 * Strictly uses first-party cookies with SameSite=Lax (and Secure over HTTPS).
 */

export const CONSENT_COOKIE_NAME = "ekodak_cookie_consent";
export const OPEN_COOKIE_PREFERENCES_EVENT = "ekodak:open-cookie-settings";
export const COOKIE_CONSENT_UPDATED_EVENT = "ekodak:cookie-consent-updated";

const DEFAULT_MAX_AGE_SECONDS = 180 * 24 * 60 * 60; // 180 days

export const DEFAULT_COOKIE_CONSENT = {
  essential: true,
  preferences: false,
  analytics: false,
  version: 1,
  updatedAt: null,
};

/** Read and decode a first-party cookie by exact name. */
export function getCookie(name) {
  if (typeof document === "undefined" || !name) return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Write a first-party cookie with SameSite=Lax and Secure when on HTTPS. */
export function setCookie(
  name,
  value,
  { maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS, path = "/", sameSite = "Lax" } = {}
) {
  if (typeof document === "undefined" || !name) return;
  const secureFlag =
    typeof window !== "undefined" && window.location?.protocol === "https:"
      ? "; Secure"
      : "";
  const encoded = encodeURIComponent(String(value ?? ""));
  document.cookie = `${name}=${encoded}; Max-Age=${Math.floor(maxAgeSeconds)}; Path=${path}; SameSite=${sameSite}${secureFlag}`;
}

/** Remove a first-party cookie immediately. */
export function deleteCookie(name, path = "/") {
  if (typeof document === "undefined" || !name) return;
  document.cookie = `${name}=; Max-Age=0; Path=${path}; SameSite=Lax`;
}

/**
 * Return the visitor's stored cookie consent preferences,
 * or `null` when the visitor has not made a choice yet.
 */
export function getCookieConsent() {
  const raw = getCookie(CONSENT_COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      essential: true,
      preferences: Boolean(parsed.preferences),
      analytics: Boolean(parsed.analytics),
      version: Number(parsed.version) || 1,
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return null;
  }
}

/** Persist consent preferences in `ekodak_cookie_consent` and notify listeners. */
export function saveCookieConsent({ preferences = false, analytics = false } = {}) {
  const payload = {
    essential: true,
    preferences: Boolean(preferences),
    analytics: Boolean(analytics),
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  setCookie(CONSENT_COOKIE_NAME, JSON.stringify(payload));

  if (!payload.preferences) {
    deleteCookie("ekodak_pref_theme");
    deleteCookie("ekodak_pref_service_filter");
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_UPDATED_EVENT, { detail: payload })
    );
  }

  return payload;
}

/** Check whether a specific consent category is currently authorized. */
export function hasConsentFor(category) {
  if (category === "essential") return true;
  const consent = getCookieConsent();
  if (!consent) return false;
  return Boolean(consent[category]);
}

/** Store a non-essential UI preference cookie only if preferences consent is granted. */
export function setOptionalPreferenceCookie(key, value) {
  if (!hasConsentFor("preferences")) return false;
  setCookie(`ekodak_pref_${key}`, String(value));
  return true;
}

/** Trigger opening the Cookie Preferences modal from anywhere (e.g., Footer). */
export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFERENCES_EVENT));
}
