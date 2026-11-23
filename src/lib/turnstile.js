/**
 * turnstile.js
 * ============
 * Shared Cloudflare Turnstile configuration flags for auth and contact forms.
 */

export const TURNSTILE_SITE_KEY = String(
  import.meta.env.VITE_TURNSTILE_SITE_KEY || ""
).trim();

export const isTurnstileConfigured = Boolean(TURNSTILE_SITE_KEY);
