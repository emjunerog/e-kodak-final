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

const PERSISTENT_STORAGE_KEY = 'ekodak-supabase-auth';
const ISOLATED_FLAG_KEY = 'ekodak_isolated_session';
const ISOLATED_TAB_KEY_ID = 'ekodak_tab_storage_key';

/**
 * Returns true only when this tab was explicitly isolated (e.g. multi-portal
 * admin tab via `?new_session=true` or "Different Account in this Tab").
 */
export function isIsolatedTabSession() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.location.search.includes('new_session=true')) {
      window.sessionStorage.setItem(ISOLATED_FLAG_KEY, 'true');
      return true;
    }
    return window.sessionStorage.getItem(ISOLATED_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

function getIsolatedStorageKey() {
  if (typeof window === 'undefined') return PERSISTENT_STORAGE_KEY;
  try {
    let tabKey = window.sessionStorage.getItem(ISOLATED_TAB_KEY_ID);
    if (!tabKey) {
      tabKey = `ekodak-auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem(ISOLATED_TAB_KEY_ID, tabKey);
    }
    return tabKey;
  } catch {
    return PERSISTENT_STORAGE_KEY;
  }
}

/**
 * Adaptive Supabase storage:
 * - Normal users / customers: uses window.localStorage so sessions survive
 *   closing the browser, opening new tabs/windows, or device power-off.
 * - Explicitly isolated multi-portal tabs: uses per-tab window.sessionStorage
 *   so logging into another role does not disconnect existing open tabs.
 */
const adaptiveAuthStorage = typeof window !== 'undefined'
  ? {
      getItem: (key) => {
        try {
          if (isIsolatedTabSession()) {
            const tabKey = `${getIsolatedStorageKey()}:${key}`;
            return window.sessionStorage.getItem(tabKey);
          }
          return window.localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          if (isIsolatedTabSession()) {
            const tabKey = `${getIsolatedStorageKey()}:${key}`;
            window.sessionStorage.setItem(tabKey, value);
          } else {
            window.localStorage.setItem(key, value);
          }
        } catch {}
      },
      removeItem: (key) => {
        try {
          if (isIsolatedTabSession()) {
            const tabKey = `${getIsolatedStorageKey()}:${key}`;
            window.sessionStorage.removeItem(tabKey);
          } else {
            window.localStorage.removeItem(key);
          }
        } catch {}
      },
    }
  : undefined;

/**
 * Supabase client: persistent across browser restarts by default,
 * with opt-in per-tab isolation for multi-portal admin switching.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: adaptiveAuthStorage,
        storageKey: PERSISTENT_STORAGE_KEY,
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
