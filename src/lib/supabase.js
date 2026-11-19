/**
 * supabase.js
 * ===========
 * SUPABASE CLIENT INITIALIZATION WITH FULL TAB ISOLATION
 *
 * HOW TO CONNECT TO YOUR PROJECT:
 *  1. Go to your Supabase project -> Settings -> API
 *  2. Copy "Project URL" and "anon public" key
 *  3. Create a .env file in the project root (copy from .env.example)
 *  4. Paste the values:
 *       VITE_SUPABASE_URL=https://your-project.supabase.co
 *       VITE_SUPABASE_ANON_KEY=your-anon-key-here
 *  5. Restart the dev server: npm run dev
 *
 * SECURITY:
 *  - The anon key is safe to expose in the browser - it only has the
 *    permissions defined by your Row Level Security (RLS) policies.
 *  - NEVER put your service_role key in VITE_ environment variables.
 *
 * TAB ISOLATION ARCHITECTURE:
 *  Supabase internally uses BroadcastChannel named after `storageKey`.
 *  If all tabs share the same storageKey, a SIGNED_IN event in Tab 2
 *  broadcasts to Tab 1 via BroadcastChannel, overwriting Tab 1 session.
 *
 *  Fix: Each tab gets its own unique storageKey (saved in sessionStorage).
 *  This makes BroadcastChannel unique per tab - no cross-tab auth events.
 *  sessionStorage ensures tokens never bleed across tabs.
 *  Page refreshes reuse the same key so the session persists within the tab.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process?.env?.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process?.env?.VITE_SUPABASE_ANON_KEY || '';

/**
 * Whether Supabase environment variables have been configured.
 * Use this flag before any Supabase query to avoid uncaught errors.
 */
export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseKey) &&
  supabaseUrl !== "your_supabase_project_url_here" &&
  supabaseKey !== "your_supabase_anon_key_here";

/**
 * Builds an absolute redirect URL honoring Vite's BASE_URL (e.g. `/` on Netlify,
 * `/e-kodak-final/` on GitHub Pages) so OAuth and password reset callbacks work everywhere.
 */
export function buildAppRedirectUrl(subpath) {
  if (typeof window === "undefined") return "";
  const rawBase = import.meta.env?.BASE_URL || "/";
  const basePath = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
  const cleanSub = String(subpath || "").replace(/^\/+/, "");
  return `${window.location.origin}${basePath}${cleanSub}`;
}

const PERSISTENT_AUTH_PREFIX = 'ekodak_persist_auth_';
const PERSISTENT_PROFILE_PREFIX = 'ekodak_persist_profile_';
const TAB_KEY_ID = 'ekodak_tab_storage_key';
const TAB_ROLE_ID = 'ekodak_tab_role';

function getAppRelativePath() {
  if (typeof window === 'undefined') return '/';
  const rawBase = (import.meta.env?.BASE_URL || '/').replace(/\/+$/, '');
  const pathname = window.location.pathname || '/';
  const stripped = rawBase && pathname.startsWith(rawBase)
    ? pathname.slice(rawBase.length) || '/'
    : pathname;
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

/**
 * Determines which role snapshot (if any) a brand-new tab should restore on boot.
 * Auth entry routes (/login, /register, /auth/callback, /reset-password, ?new_session=true)
 * intentionally start clean so opening a 2nd tab to sign into another account never
 * inherits an existing account from another tab.
 */
function getRestoreRoleForRoute() {
  if (typeof window === 'undefined') return null;
  if (window.location.search.includes('new_session=true')) return null;

  const rel = getAppRelativePath();
  if (
    rel.startsWith('/login') ||
    rel.startsWith('/register') ||
    rel.startsWith('/auth/callback') ||
    rel.startsWith('/reset-password')
  ) {
    return null;
  }
  if (rel.startsWith('/admin')) return 'admin';
  if (rel.startsWith('/photographer')) return 'photographer';
  return 'customer';
}

function getTabStorageKey() {
  if (typeof window === 'undefined') return 'ekodak-supabase-auth';
  try {
    let tabKey = window.sessionStorage.getItem(TAB_KEY_ID);

    if (!tabKey) {
      // Fresh tab (after browser restart OR opening a new tab alongside an existing one).
      const inherited = Object.keys(window.sessionStorage).filter(
        (k) => k.startsWith('sb-') || k.startsWith('supabase') || k === 'ekodak_user_profile'
      );
      inherited.forEach((k) => window.sessionStorage.removeItem(k));

      tabKey = `ekodak-auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem(TAB_KEY_ID, tabKey);

      const restoreRole = getRestoreRoleForRoute();
      if (restoreRole) {
        const savedSession = window.localStorage.getItem(`${PERSISTENT_AUTH_PREFIX}${restoreRole}`);
        const savedProfile = window.localStorage.getItem(`${PERSISTENT_PROFILE_PREFIX}${restoreRole}`);
        if (savedSession) {
          window.sessionStorage.setItem(tabKey, savedSession);
          window.sessionStorage.setItem(TAB_ROLE_ID, restoreRole);
          if (savedProfile) {
            window.sessionStorage.setItem('ekodak_user_profile', savedProfile);
          }
        }
      }
    }

    return tabKey;
  } catch {
    return 'ekodak-supabase-auth';
  }
}

const TAB_STORAGE_KEY = getTabStorageKey();

/** Save current tab's active session & profile under its role in localStorage so restarts keep it signed in. */
export function persistTabRoleSnapshot(profileData) {
  if (typeof window === 'undefined') return;
  const role = String(profileData?.role || '').toLowerCase() || 'customer';
  try {
    window.sessionStorage.setItem(TAB_ROLE_ID, role);
    window.sessionStorage.setItem('ekodak_user_profile', JSON.stringify(profileData));
    const currentAuth = window.sessionStorage.getItem(TAB_STORAGE_KEY);
    if (currentAuth) {
      window.localStorage.setItem(`${PERSISTENT_AUTH_PREFIX}${role}`, currentAuth);
    }
    window.localStorage.setItem(`${PERSISTENT_PROFILE_PREFIX}${role}`, JSON.stringify(profileData));
  } catch {}
}

/** Clear only the current tab/role persistent snapshot on explicit sign-out without disturbing other role tabs. */
export function clearPersistentRoleSnapshot(explicitRole) {
  if (typeof window === 'undefined') return;
  try {
    const role = String(
      explicitRole || window.sessionStorage.getItem(TAB_ROLE_ID) || ''
    ).toLowerCase();
    window.sessionStorage.removeItem(TAB_ROLE_ID);
    window.sessionStorage.removeItem('ekodak_user_profile');
    if (role) {
      window.localStorage.removeItem(`${PERSISTENT_AUTH_PREFIX}${role}`);
      window.localStorage.removeItem(`${PERSISTENT_PROFILE_PREFIX}${role}`);
    }
  } catch {}
}

const tabAuthStorage = typeof window !== 'undefined'
  ? {
      getItem: (key) => {
        try {
          return window.sessionStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          window.sessionStorage.setItem(key, value);
          if (key === TAB_STORAGE_KEY) {
            const role = window.sessionStorage.getItem(TAB_ROLE_ID);
            if (role) {
              window.localStorage.setItem(`${PERSISTENT_AUTH_PREFIX}${role}`, value);
            }
          }
        } catch {}
      },
      removeItem: (key) => {
        try {
          window.sessionStorage.removeItem(key);
        } catch {}
      },
    }
  : undefined;

/**
 * Supabase client:
 * - Fully isolated per browser tab (unique storageKey in sessionStorage), so Admin,
 *   Photographer, and Client accounts can stay open simultaneously in separate tabs.
 * - Role-scoped persistent snapshots in localStorage keep users signed in across
 *   browser restarts and device power-offs without cross-tab interference.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: tabAuthStorage,
        storageKey: TAB_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    })
  : null;

// -- Development helper -------------------------------------------------------
if (!isSupabaseConfigured && import.meta.env?.DEV) {
  console.info(
    "[E-Kodak] Supabase is not configured - using local data files.\n" +
    "To connect: copy .env.example -> .env and fill in your Supabase credentials."
  );
}
