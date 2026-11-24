/**
 * credentials.js
 * ==============
 * Smart device credential memory + W3C PasswordCredential browser password manager integration.
 *
 * 1. Persists remembered (email, password) pairs per account in localStorage on this device
 *    when "Remember password on this device" is enabled, so closing and reopening the browser
 *    or returning from Sign Up / Sign Out pre-fills credentials automatically.
 * 2. Also invokes `window.PasswordCredential` / `navigator.credentials.store` so Chromium
 *    password managers save and update credentials natively.
 */

const REMEMBERED_CREDENTIALS_KEY = "ekodak_remembered_credentials_v1";
const OBFUSCATION_SALT = "ekodak-studio-cebu-2026";

function encodeSecret(plainText) {
  try {
    const str = String(plainText ?? "");
    const bytes = new TextEncoder().encode(str);
    const saltBytes = new TextEncoder().encode(OBFUSCATION_SALT);
    const xored = bytes.map((b, i) => b ^ saltBytes[i % saltBytes.length]);
    let binary = "";
    xored.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  } catch {
    return "";
  }
}

function decodeSecret(encoded) {
  try {
    if (!encoded) return "";
    const binary = atob(String(encoded));
    const saltBytes = new TextEncoder().encode(OBFUSCATION_SALT);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i) ^ saltBytes[i % saltBytes.length];
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function readStore() {
  if (typeof window === "undefined") return { lastEmail: "", accounts: {} };
  try {
    const raw = window.localStorage.getItem(REMEMBERED_CREDENTIALS_KEY);
    if (!raw) return { lastEmail: "", accounts: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { lastEmail: "", accounts: {} };
    }
    return {
      lastEmail: String(parsed.lastEmail || "").trim().toLowerCase(),
      accounts:
        parsed.accounts && typeof parsed.accounts === "object"
          ? parsed.accounts
          : {},
    };
  } catch {
    return { lastEmail: "", accounts: {} };
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      REMEMBERED_CREDENTIALS_KEY,
      JSON.stringify(store)
    );
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

/**
 * Save or update remembered credentials on this device + notify the browser's Password Manager.
 */
export async function saveBrowserPasswordCredential({
  email,
  password,
  name,
  remember = true,
} = {}) {
  if (typeof window === "undefined" || !email || !password) return false;
  const cleanId = String(email).trim().toLowerCase();
  const displayName = String(name || "").trim();

  try {
    const store = readStore();
    if (remember !== false) {
      store.accounts[cleanId] = {
        email: cleanId,
        secret: encodeSecret(password),
        name: displayName || store.accounts[cleanId]?.name || "",
        updatedAt: Date.now(),
      };
      store.lastEmail = cleanId;
    } else {
      delete store.accounts[cleanId];
      if (store.lastEmail === cleanId) {
        const remaining = Object.keys(store.accounts);
        store.lastEmail = remaining[0] || "";
      }
    }
    writeStore(store);
  } catch {
    // Ignore localStorage errors
  }

  try {
    if (!("PasswordCredential" in window) || !navigator.credentials?.store) {
      return true;
    }
    const credential = new window.PasswordCredential({
      id: cleanId,
      password: String(password),
      ...(displayName ? { name: displayName } : {}),
    });
    await navigator.credentials.store(credential);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieve remembered `{ email, password, name }` for a specific email,
 * or the most recently remembered account when `email` is omitted.
 */
export function getRememberedCredential(email) {
  if (typeof window === "undefined") return null;
  const store = readStore();
  const targetEmail = email
    ? String(email).trim().toLowerCase()
    : store.lastEmail;
  if (!targetEmail) return null;
  const entry = store.accounts[targetEmail];
  if (!entry || !entry.secret) return null;
  const password = decodeSecret(entry.secret);
  if (!password) return null;
  return {
    email: targetEmail,
    password,
    name: entry.name || "",
  };
}

/**
 * Return all remembered email addresses on this device (most recent first).
 */
export function getRememberedEmails() {
  if (typeof window === "undefined") return [];
  const store = readStore();
  const entries = Object.values(store.accounts || {}).filter(
    (item) => item && item.email && item.secret
  );
  entries.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return entries.map((item) => item.email);
}
