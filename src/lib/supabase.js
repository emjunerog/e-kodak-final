/**
 * supabase.js
 * ===========
 * SUPABASE CLIENT INITIALIZATION WITH STRICT TAB ISOLATION & PERSISTENT ROLE SESSIONS
 *
 * KEY GUARANTEES:
 *  1. Tab-Isolated Sign-Out:
 *     `@supabase/auth-js` normally sends `POST /auth/v1/logout` even when `{ scope: 'local' }`
 *     is passed, which deletes the session row in Postgres (`auth.sessions`) and kills all
 *     other open tabs sharing that session. `tabIsolatedFetch` intercepts `/auth/v1/logout`
 *     for per-tab sign-outs so signing out in Tab 2 NEVER revokes Tab 1's server session.
 *  2. Cross-Role Deduplication:
 *     A single user account (`user.id` or `email`) can never exist in two different role
 *     slots (`admin`, `photographer`, `customer`) in `localStorage`. Saving an Admin profile
 *     automatically purges any stale Customer/Photographer snapshot for that same user.
 *  3. Sibling-Tab Token & Keepalive Sync:
 *     Open tabs of the same role stay synced on token refresh and re-assert their persistent
 *     snapshot if a sibling tab signs out locally.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env?.VITE_SUPABASE_URL || process?.env?.VITE_SUPABASE_URL || "";
const supabaseKey =
  import.meta.env?.VITE_SUPABASE_ANON_KEY || process?.env?.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseKey) &&
  supabaseUrl !== "your_supabase_project_url_here" &&
  supabaseKey !== "your_supabase_anon_key_here";

export function buildAppRedirectUrl(subpath) {
  if (typeof window === "undefined") return "";
  const rawBase = import.meta.env?.BASE_URL || "/";
  const basePath = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
  const cleanSub = String(subpath || "").replace(/^\/+/, "");
  return `${window.location.origin}${basePath}${cleanSub}`;
}

const PERSISTENT_AUTH_PREFIX = "ekodak_persist_auth_";
const PERSISTENT_PROFILE_PREFIX = "ekodak_persist_profile_";
const LAST_ACTIVE_ROLE_KEY = "ekodak_last_active_role";
const TAB_KEY_ID = "ekodak_tab_storage_key";
const TAB_ROLE_ID = "ekodak_tab_role";
const ROLE_SYNC_CHANNEL = "ekodak-role-auth-sync";
const VALID_ROLES = ["admin", "photographer", "customer"];

let allowGlobalServerLogout = false;

/** Enable or disable server-wide session revocation for the next signOut call. */
export function setAllowServerLogout(allow) {
  allowGlobalServerLogout = Boolean(allow);
}

function normalizeRole(role) {
  const clean = String(role || "").trim().toLowerCase();
  if (clean === "admin" || clean === "staff" || clean === "finance") return "admin";
  if (clean === "photographer") return "photographer";
  return "customer";
}

function extractUserIdentityFromAuthRaw(rawValue) {
  if (!rawValue) return { id: null, email: null };
  try {
    const parsed = JSON.parse(rawValue);
    const user = parsed?.user || parsed?.currentSession?.user || null;
    return {
      id: user?.id || null,
      email: user?.email ? String(user.email).trim().toLowerCase() : null,
    };
  } catch {
    return { id: null, email: null };
  }
}

function extractUserIdentityFromProfileRaw(rawValue) {
  if (!rawValue) return { id: null, email: null, role: null };
  try {
    const parsed = JSON.parse(rawValue);
    return {
      id: parsed?.id || null,
      email: parsed?.email ? String(parsed.email).trim().toLowerCase() : null,
      role: parsed?.role ? normalizeRole(parsed.role) : null,
    };
  } catch {
    return { id: null, email: null, role: null };
  }
}

/**
 * Ensures the same user account never exists under multiple role keys in localStorage
 * (e.g., preventing an Admin account from also having a stale 'customer' snapshot).
 * Priority order: admin > photographer > customer.
 */
function deduplicateRoleSnapshots() {
  if (typeof window === "undefined") return;
  try {
    const seenIds = new Set();
    const seenEmails = new Set();

    for (const role of VALID_ROLES) {
      const authKey = `${PERSISTENT_AUTH_PREFIX}${role}`;
      const profileKey = `${PERSISTENT_PROFILE_PREFIX}${role}`;
      const authRaw = window.localStorage.getItem(authKey);
      const profileRaw = window.localStorage.getItem(profileKey);

      if (!authRaw && !profileRaw) continue;

      const authIdent = extractUserIdentityFromAuthRaw(authRaw);
      const profIdent = extractUserIdentityFromProfileRaw(profileRaw);
      const uid = profIdent.id || authIdent.id;
      const email = profIdent.email || authIdent.email;

      // If profile explicitly declares a higher/different role than the slot it sits in, purge the wrong slot
      if (profIdent.role && profIdent.role !== role) {
        window.localStorage.removeItem(authKey);
        window.localStorage.removeItem(profileKey);
        continue;
      }

      const isDuplicate =
        (uid && seenIds.has(uid)) || (email && seenEmails.has(email));

      if (isDuplicate) {
        window.localStorage.removeItem(authKey);
        window.localStorage.removeItem(profileKey);
        if (window.localStorage.getItem(LAST_ACTIVE_ROLE_KEY) === role) {
          window.localStorage.removeItem(LAST_ACTIVE_ROLE_KEY);
        }
      } else {
        if (uid) seenIds.add(uid);
        if (email) seenEmails.add(email);
      }
    }
  } catch {
    // Ignore storage access errors
  }
}

function getAppRelativePath() {
  if (typeof window === "undefined") return "/";
  const rawBase = (import.meta.env?.BASE_URL || "/").replace(/\/+$/, "");
  const pathname = window.location.pathname || "/";
  const stripped =
    rawBase && pathname.startsWith(rawBase)
      ? pathname.slice(rawBase.length) || "/"
      : pathname;
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

function findAvailableSavedRole(preferredRoles = []) {
  if (typeof window === "undefined") return null;
  const order = [...new Set([...preferredRoles, ...VALID_ROLES])];
  for (const role of order) {
    try {
      if (window.localStorage.getItem(`${PERSISTENT_AUTH_PREFIX}${role}`)) {
        return role;
      }
    } catch {
      // Ignore storage errors
    }
  }
  return null;
}

/**
 * Determines which saved role snapshot (if any) a brand-new tab should restore on boot.
 */
function getRestoreRoleForRoute() {
  if (typeof window === "undefined") return null;
  if (window.location.search.includes("new_session=true")) return null;

  const rel = getAppRelativePath();
  if (
    rel.startsWith("/login") ||
    rel.startsWith("/register") ||
    rel.startsWith("/auth/callback") ||
    rel.startsWith("/reset-password")
  ) {
    return null;
  }

  if (rel.startsWith("/admin")) {
    return findAvailableSavedRole(["admin"]) === "admin" ? "admin" : null;
  }
  if (rel.startsWith("/photographer")) {
    return findAvailableSavedRole(["photographer"]) === "photographer"
      ? "photographer"
      : null;
  }

  let lastRole = null;
  try {
    lastRole = window.localStorage.getItem(LAST_ACTIVE_ROLE_KEY);
  } catch {
    lastRole = null;
  }

  // Always prefer `lastRole` first so opening a 2nd tab on `/` or `/dashboard`
  // while signed in as Admin never downgrades or switches to a stale customer slot.
  return findAvailableSavedRole(
    lastRole ? [lastRole, "admin", "photographer", "customer"] : ["admin", "photographer", "customer"]
  );
}

function getTabStorageKey() {
  if (typeof window === "undefined") return "ekodak-supabase-auth";
  try {
    deduplicateRoleSnapshots();

    let tabKey = window.sessionStorage.getItem(TAB_KEY_ID);

    if (!tabKey) {
      try {
        window.localStorage.removeItem("ekodak-supabase-auth");
        window.localStorage.removeItem("ekodak_user_profile");
      } catch {
        // Ignore storage errors
      }

      const inherited = Object.keys(window.sessionStorage).filter(
        (k) =>
          k.startsWith("sb-") ||
          k.startsWith("supabase") ||
          k === "ekodak_user_profile" ||
          k === TAB_ROLE_ID
      );
      inherited.forEach((k) => window.sessionStorage.removeItem(k));

      tabKey = `ekodak-auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem(TAB_KEY_ID, tabKey);

      const restoreRole = getRestoreRoleForRoute();
      if (restoreRole) {
        const savedSession = window.localStorage.getItem(
          `${PERSISTENT_AUTH_PREFIX}${restoreRole}`
        );
        const savedProfile = window.localStorage.getItem(
          `${PERSISTENT_PROFILE_PREFIX}${restoreRole}`
        );
        if (savedSession) {
          window.sessionStorage.setItem(tabKey, savedSession);
          window.sessionStorage.setItem(TAB_ROLE_ID, restoreRole);
          if (savedProfile) {
            window.sessionStorage.setItem("ekodak_user_profile", savedProfile);
          }
        }
      }
    }

    return tabKey;
  } catch {
    return "ekodak-supabase-auth";
  }
}

export const TAB_STORAGE_KEY = getTabStorageKey();

let roleChannel = null;
function getRoleSyncChannel() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!roleChannel) {
    try {
      roleChannel = new BroadcastChannel(ROLE_SYNC_CHANNEL);
    } catch {
      return null;
    }
  }
  return roleChannel;
}

/**
 * Save the current tab's active session & profile under its exact role in localStorage,
 * and purge any other role slots in localStorage that match the same user ID or email.
 */
export function persistTabRoleSnapshot(profileData) {
  if (typeof window === "undefined" || !profileData) return;
  const role = normalizeRole(profileData?.role);
  const normalizedProfile = { ...profileData, role };
  const targetId = normalizedProfile?.id || null;
  const targetEmail = normalizedProfile?.email
    ? String(normalizedProfile.email).trim().toLowerCase()
    : null;

  try {
    window.sessionStorage.setItem(TAB_ROLE_ID, role);
    window.sessionStorage.setItem(
      "ekodak_user_profile",
      JSON.stringify(normalizedProfile)
    );
    const currentAuth = window.sessionStorage.getItem(TAB_STORAGE_KEY);
    if (currentAuth) {
      window.localStorage.setItem(`${PERSISTENT_AUTH_PREFIX}${role}`, currentAuth);
      window.localStorage.setItem(LAST_ACTIVE_ROLE_KEY, role);
    }
    window.localStorage.setItem(
      `${PERSISTENT_PROFILE_PREFIX}${role}`,
      JSON.stringify(normalizedProfile)
    );

    // Purge any stale snapshot for the SAME user from other role slots so an Admin
    // can never be restored as a Customer in a second tab.
    for (const otherRole of VALID_ROLES) {
      if (otherRole === role) continue;
      const otherAuthKey = `${PERSISTENT_AUTH_PREFIX}${otherRole}`;
      const otherProfKey = `${PERSISTENT_PROFILE_PREFIX}${otherRole}`;
      const otherAuth = extractUserIdentityFromAuthRaw(
        window.localStorage.getItem(otherAuthKey)
      );
      const otherProf = extractUserIdentityFromProfileRaw(
        window.localStorage.getItem(otherProfKey)
      );
      const sameUser =
        (targetId && (otherAuth.id === targetId || otherProf.id === targetId)) ||
        (targetEmail &&
          (otherAuth.email === targetEmail || otherProf.email === targetEmail));
      if (sameUser) {
        window.localStorage.removeItem(otherAuthKey);
        window.localStorage.removeItem(otherProfKey);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear the current tab's session snapshot.
 * If another tab is still open with that same role, it will re-assert its live snapshot
 * over BroadcastChannel so that open tab stays persistent across refreshes.
 */
export function clearPersistentRoleSnapshot(explicitRole) {
  if (typeof window === "undefined") return;
  try {
    const rawRole = explicitRole || window.sessionStorage.getItem(TAB_ROLE_ID) || "";
    const role = rawRole ? normalizeRole(rawRole) : "";
    window.sessionStorage.removeItem(TAB_ROLE_ID);
    window.sessionStorage.removeItem("ekodak_user_profile");
    if (role) {
      window.localStorage.removeItem(`${PERSISTENT_AUTH_PREFIX}${role}`);
      window.localStorage.removeItem(`${PERSISTENT_PROFILE_PREFIX}${role}`);
      if (window.localStorage.getItem(LAST_ACTIVE_ROLE_KEY) === role) {
        const remaining = findAvailableSavedRole();
        if (remaining) {
          window.localStorage.setItem(LAST_ACTIVE_ROLE_KEY, remaining);
        } else {
          window.localStorage.removeItem(LAST_ACTIVE_ROLE_KEY);
        }
      }

      // Ask any sibling tab that is still open with this role to re-assert its persistent snapshot
      const ch = getRoleSyncChannel();
      if (ch) {
        ch.postMessage({
          type: "ROLE_SIGNOUT_PING",
          sourceTabKey: TAB_STORAGE_KEY,
          role,
        });
      }
    }
  } catch {
    // Ignore storage errors
  }
}

const tabAuthStorage =
  typeof window !== "undefined"
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
                window.localStorage.setItem(LAST_ACTIVE_ROLE_KEY, role);
                const ch = getRoleSyncChannel();
                if (ch) {
                  ch.postMessage({
                    type: "ROLE_SESSION_SYNC",
                    sourceTabKey: TAB_STORAGE_KEY,
                    role,
                    userId: extractUserIdentityFromAuthRaw(value).id,
                    value,
                  });
                }
              }
            }
          } catch {
            // Ignore storage errors
          }
        },
        removeItem: (key) => {
          try {
            window.sessionStorage.removeItem(key);
          } catch {
            // Ignore storage errors
          }
        },
      }
    : undefined;

if (typeof window !== "undefined") {
  const channel = getRoleSyncChannel();
  if (channel) {
    channel.addEventListener("message", (event) => {
      const msg = event?.data;
      if (!msg || msg.sourceTabKey === TAB_STORAGE_KEY || !msg.role) {
        return;
      }
      try {
        const myRole = window.sessionStorage.getItem(TAB_ROLE_ID);
        const myAuthRaw = window.sessionStorage.getItem(TAB_STORAGE_KEY);
        if (!myRole || myRole !== msg.role || !myAuthRaw) return;

        if (msg.type === "ROLE_SESSION_SYNC" && msg.value) {
          const myUserId = extractUserIdentityFromAuthRaw(myAuthRaw).id;
          if (myUserId && msg.userId && myUserId !== msg.userId) return;
          window.sessionStorage.setItem(TAB_STORAGE_KEY, msg.value);
        } else if (msg.type === "ROLE_SIGNOUT_PING") {
          // Another tab signed out locally, but THIS tab is still open and authenticated!
          // Re-persist this tab's live session & profile so this tab stays alive.
          const myProfRaw = window.sessionStorage.getItem("ekodak_user_profile");
          window.localStorage.setItem(`${PERSISTENT_AUTH_PREFIX}${myRole}`, myAuthRaw);
          window.localStorage.setItem(LAST_ACTIVE_ROLE_KEY, myRole);
          if (myProfRaw) {
            window.localStorage.setItem(
              `${PERSISTENT_PROFILE_PREFIX}${myRole}`,
              myProfRaw
            );
          }
        }
      } catch {
        // Ignore sync errors
      }
    });
  }
}

/**
 * Custom fetch wrapper for Supabase:
 * Intercepts `/auth/v1/logout` on normal per-tab sign-outs so `@supabase/auth-js`
 * clears only the current tab's local session without deleting the `auth.sessions`
 * row on the Supabase server (which would sign out other open tabs).
 */
const tabIsolatedFetch = async (input, init) => {
  try {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input?.url || "";
    const method = String(init?.method || input?.method || "GET").toUpperCase();

    if (
      method === "POST" &&
      url.includes("/auth/v1/logout") &&
      !allowGlobalServerLogout
    ) {
      return new Response(null, { status: 204, statusText: "No Content" });
    }
  } catch {
    // Fall through to standard fetch
  } finally {
    allowGlobalServerLogout = false;
  }
  return fetch(input, init);
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: tabAuthStorage,
        storageKey: TAB_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: tabIsolatedFetch,
      },
    })
  : null;

if (!isSupabaseConfigured && import.meta.env?.DEV) {
  console.info(
    "[E-Kodak] Supabase is not configured - using local data files.\n" +
      "To connect: copy .env.example -> .env and fill in your Supabase credentials."
  );
}
