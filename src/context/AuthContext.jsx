import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(() => {
    try {
      if (typeof window === 'undefined') return null;
      const sessionCached = sessionStorage.getItem('ekodak_user_profile');
      if (sessionCached) return JSON.parse(sessionCached);
      return null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true); // true until first session check completes

  const saveProfileCache = (data) => {
    try {
      if (data) {
        sessionStorage.setItem('ekodak_user_profile', JSON.stringify(data));
      } else {
        sessionStorage.removeItem('ekodak_user_profile');
      }
    } catch {}
  };

  const startIsolatedSession = useCallback(() => {
    try {
      sessionStorage.setItem('ekodak_isolated_session', 'true');
      sessionStorage.removeItem('ekodak_user_profile');
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('sb-')) sessionStorage.removeItem(key);
      });
      setUser(null);
      setProfile(null);
      setLoading(false);
    } catch {}
  }, []);

  // ── Profile fetcher (extracted so it can be called externally) ──────────────
  const fetchProfile = useCallback(async (userId) => {
    if (!isSupabaseConfigured || !userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching profile:", error.message);
      }

      if (data) {
        setProfile(data);
        saveProfileCache(data);
      } else {
        // Fallback: use only sessionStorage (tab-scoped — never localStorage)
        let fallback = null;
        try {
          const sessionCached = sessionStorage.getItem('ekodak_user_profile');
          if (sessionCached) fallback = JSON.parse(sessionCached);
        } catch {}

        if (!fallback) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          fallback = {
            id: userId,
            first_name: authUser?.user_metadata?.first_name || '',
            last_name: authUser?.user_metadata?.last_name || '',
            role: authUser?.user_metadata?.role || 'customer',
            badges: [],
            studio_specs: {},
            created_at: new Date().toISOString()
          };
        }

        setProfile(fallback);
        saveProfileCache(fallback);

        // Attempt background insert if missing
        try {
          await supabase.from('profiles').insert([fallback]);
        } catch {}
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
      // Never read from localStorage — that would bleed cross-tab
      try {
        const sessionCached = sessionStorage.getItem('ekodak_user_profile');
        if (sessionCached) setProfile(JSON.parse(sessionCached));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false); // No Supabase — resolve immediately
      return;
    }

    let isMounted = true;

    // Safety timeout: ensure loading screen never hangs more than 3.5s under any circumstance
    const timeoutTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 3500);

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error("Error getting auth session:", error.message);
        const currentUser = session?.user ?? null;
        if (isMounted) setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          if (isMounted) setProfile(null);
          saveProfileCache(null);
        }
      } catch (err) {
        console.error("Session initialization error:", err);
      } finally {
        if (isMounted) setLoading(false);
        clearTimeout(timeoutTimer);
      }
    };

    getSession();

    // Listen for auth changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        if (isMounted) setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser.id);
          if (isMounted) setLoading(false);
        } else {
          if (isMounted) setProfile(null);
          saveProfileCache(null);
          if (isMounted) setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeoutTimer);
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  // ── Auth actions ─────────────────────────────────────────────────────────────

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, firstName, lastName, role = 'customer') => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, role },
        // emailRedirectTo is intentionally omitted so Supabase sends an OTP code
        // instead of a magic link. Make sure "Email OTP" is enabled in
        // Authentication → Email Settings in your Supabase project dashboard.
      },
    });
    if (error) throw error;
    // Supabase returns an identities[] array; if empty, the email is already registered
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }
    return data;
  };

  /**
   * Sign in with Google OAuth.
   * After OAuth the user is redirected back; the OTP step is skipped for OAuth
   * because Google already verified the email.
   */
  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    saveProfileCache(null);
    setProfile(null);
    setUser(null);
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const verifyEmailCode = async (email, token) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    
    // For signup verification, type must be strictly 'signup'.
    // Trying other types first might invalidate the token or trigger rate limits.
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    
    if (error) throw error;
    return data;
  };

  const resendVerification = async (email) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
    return data;
  };

  // ── Profile actions ───────────────────────────────────────────────────────────

  /**
   * Update the current user's profile in the `profiles` table.
   * @param {Object} updates — e.g. { first_name, last_name, phone, address, bio }
   */
  const updateProfile = async (updates) => {
    // If running in guest or demo mode without active auth session
    if (!user) {
      setProfile(prev => {
        const next = { ...(prev || {}), ...updates, updated_at: new Date().toISOString() };
        saveProfileCache(next);
        return next;
      });
      return updates;
    }

    if (!isSupabaseConfigured) {
      setProfile(prev => ({ ...(prev || {}), ...updates }));
      return updates;
    }

    const payload = {
      updated_at: new Date().toISOString(),
      ...updates,
    };

    // Try update first (matches existing profile row)
    let { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .maybeSingle();

    // If row doesn't exist yet, insert it
    if (!data && !error) {
      const insertPayload = { id: user.id, ...payload };
      const res = await supabase.from('profiles').insert([insertPayload]).select().single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('updateProfile error:', error);
      throw error;
    }

    // Update local state and cache immediately
    if (data) {
      setProfile(data);
      saveProfileCache(data);
    }
    return data;
  };

  /**
   * Upload a new avatar image to Supabase Storage and update the profile.
   * @param {File} file — the image File object
   * @returns {string} publicUrl of the new avatar
   */
  const uploadAvatar = async (file) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    if (!user) throw new Error("No user is signed in.");

    const ext      = file.name.split('.').pop();
    const filePath = `avatars/${user.id}/avatar_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Save the new URL to the profile
    await updateProfile({ avatar_url: urlData.publicUrl });

    return urlData.publicUrl;
  };

  /**
   * Re-fetch the profile from Supabase (useful after external updates).
   */
  const refreshProfile = () => {
    if (user) fetchProfile(user.id);
  };

  // ── Context value ─────────────────────────────────────────────────────────────

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    verifyEmailCode,
    resendVerification,
    updateProfile,
    uploadAvatar,
    refreshProfile,
    startIsolatedSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
