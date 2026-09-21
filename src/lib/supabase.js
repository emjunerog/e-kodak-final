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
 * getTabStorageKey()
 * ------------------
 * Returns a stable, unique key for this tab stored in sessionStorage.
 *
 * Why this works:
 *   1. sessionStorage is tab-scoped - no other tab shares it.
 *   2. Supabase uses `storageKey` as both the token prefix AND the
 *      BroadcastChannel name. Different storageKey = different channel.
 *   3. On first load: generates a new key, wipes any inherited tokens,
 *      then stamps the tab with that key.
 *   4. On refresh: finds the existing key and reuses it - session intact.
 *   5. On window.open(): new tab has no key yet -> fresh start.
 */
function getTabStorageKey() {
  if (typeof window === 'undefined') return 'ekodak-supabase-auth';
  try {
    const KEY_ID = 'ekodak_tab_storage_key';
    let tabKey = window.sessionStorage.getItem(KEY_ID);

    if (!tabKey) {
      // New tab or opened via window.open() - always start fresh.
      // Clear ALL inherited Supabase tokens before creating client.
      const inherited = Object.keys(window.sessionStorage).filter(
        (k) => k.startsWith('sb-') || k.startsWith('supabase') || k === 'ekodak_user_profile'
      );
      inherited.forEach((k) => window.sessionStorage.removeItem(k));

      // Unique key: timestamp + random suffix ensures uniqueness across tabs.
      tabKey = `ekodak-auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem(KEY_ID, tabKey);
    }

    return tabKey;
  } catch {
    return 'ekodak-supabase-auth';
  }
}

const TAB_STORAGE_KEY = getTabStorageKey();

/**
 * Supabase client - fully tab-isolated.
 *
 * storageKey: unique per tab -> unique BroadcastChannel -> no cross-tab events
 * storage: sessionStorage -> tokens never leave this tab
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
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
