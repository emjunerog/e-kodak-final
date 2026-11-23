import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  supabase,
  isSupabaseConfigured,
  buildAppRedirectUrl,
  persistTabRoleSnapshot,
  clearPersistentRoleSnapshot,
} from "../lib/supabase";

/** Extract first_name, last_name, and avatar_url from Supabase auth metadata (supports Google OAuth). */
function extractAuthMetadataProfile(authUser) {
  const meta = authUser?.user_metadata || {};
  const fullName = String(meta.full_name || meta.name || "").trim();
  const nameParts = fullName ? fullName.split(/\s+/) : [];
  const first_name =
    String(meta.first_name || meta.given_name || nameParts[0] || "").trim();
  const last_name =
    String(
      meta.last_name ||
      meta.family_name ||
      (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "")
    ).trim();
  const avatar_url = String(meta.avatar_url || meta.picture || "").trim();
  return { first_name, last_name, avatar_url };
}

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const loadedUserIdRef = useRef(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
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
        persistTabRoleSnapshot(data);
      } else {
        sessionStorage.removeItem('ekodak_user_profile');
      }
    } catch {}
  };

  const startIsolatedSession = useCallback(async () => {
    try {
      sessionStorage.removeItem('ekodak_user_profile');
      sessionStorage.removeItem('ekodak_tab_role');
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.startsWith('ekodak-auth-')) {
          sessionStorage.removeItem(key);
        }
      });
      loadedUserIdRef.current = null;
      setIsPasswordRecovery(false);
      setUser(null);
      setProfile(null);
      setLoading(false);
      if (isSupabaseConfigured) {
        await supabase.auth.signOut({ scope: 'local' });
      }
    } catch {}
  }, []);

  // ── Profile fetcher (extracted so it can be called externally) ──────────────
  const fetchProfile = useCallback(async (userId) => {
    if (!isSupabaseConfigured || !userId) return;
    try {
      const [{ data, error }, { data: authData, error: authErr }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.auth.getUser(),
      ]);

      const authUser = authData?.user ?? null;

      // If the auth user no longer exists (e.g., deleted by an admin), revoke access immediately
      if (authErr || !authUser) {
        loadedUserIdRef.current = null;
        setProfile(null);
        setUser(null);
        saveProfileCache(null);
        try {
          sessionStorage.setItem(
            'ekodak_account_removed_notice',
            'Your account and associated bookings were deleted by studio administration. Please check your email for details.'
          );
        } catch {}
        try {
          await supabase.auth.signOut();
        } catch {}
        return;
      }

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching profile:", error.message);
      }

      const metaProfile = extractAuthMetadataProfile(authUser);

      if (data) {
        // Backfill missing Google OAuth name / avatar onto profile if still empty
        const needsPatch =
          (!data.first_name && metaProfile.first_name) ||
          (!data.last_name && metaProfile.last_name) ||
          (!data.avatar_url && metaProfile.avatar_url);

        let mergedData = data;
        if (needsPatch) {
          const patch = {
            ...(data.first_name ? {} : { first_name: metaProfile.first_name || null }),
            ...(data.last_name ? {} : { last_name: metaProfile.last_name || null }),
            ...(data.avatar_url ? {} : { avatar_url: metaProfile.avatar_url || null }),
          };
          mergedData = { ...data, ...patch };
          try {
            await supabase.from('profiles').update(patch).eq('id', userId);
          } catch {}
        }

        setProfile((prev) => (JSON.stringify(prev) === JSON.stringify(mergedData) ? prev : mergedData));
        saveProfileCache(mergedData);
        loadedUserIdRef.current = userId;
      } else {
        // Never recreate a deleted customer profile if authUser is verified missing;
        // authUser above is confirmed valid, so build from auth metadata.
        const fallback = {
          id: userId,
          email: authUser.email || null,
          first_name: metaProfile.first_name || '',
          last_name: metaProfile.last_name || '',
          avatar_url: metaProfile.avatar_url || null,
          role: authUser?.user_metadata?.role || 'customer',
          studio_specs: {},
          created_at: new Date().toISOString(),
        };

        setProfile(fallback);
        saveProfileCache(fallback);

        try {
          await supabase.from('profiles').insert([fallback]);
        } catch {}
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
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
        if (isMounted) {
          setUser((prev) =>
            prev?.id === currentUser?.id && prev?.email === currentUser?.email ? prev : currentUser
          );
        }

        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          loadedUserIdRef.current = null;
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
    // Guard against tab-visibility focus events re-triggering profile fetches and dashboard reloads
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isMounted) {
          if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordRecovery(true);
          } else if (event === 'SIGNED_OUT') {
            setIsPasswordRecovery(false);
          }
        }
        const currentUser = session?.user ?? null;
        if (isMounted) {
          setUser((prev) =>
            prev?.id === currentUser?.id && prev?.email === currentUser?.email ? prev : currentUser
          );
        }
        if (currentUser) {
          const isAlreadyLoaded = loadedUserIdRef.current === currentUser.id;
          if (!isAlreadyLoaded || event === 'USER_UPDATED') {
            await fetchProfile(currentUser.id);
          }
          if (isMounted) setLoading(false);
        } else {
          loadedUserIdRef.current = null;
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

  // Keep profile (including avatar_url updated from mobile) live-synced across web tabs/devices
  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return undefined;

    const channel = supabase
      .channel(`profile-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload?.eventType === 'DELETE') {
            loadedUserIdRef.current = null;
            saveProfileCache(null);
            setProfile(null);
            setUser(null);
            try {
              sessionStorage.setItem(
                'ekodak_account_removed_notice',
                'Your account and associated bookings were deleted by studio administration. Please check your email for details.'
              );
            } catch {}
            try {
              await supabase.auth.signOut();
            } catch {}
            return;
          }

          const updatedRow = payload?.new;
          if (!updatedRow) return;
          setProfile((prev) => {
            const first = updatedRow.first_name ?? prev?.first_name ?? '';
            const last = updatedRow.last_name ?? prev?.last_name ?? '';
            const merged = {
              ...(prev || {}),
              ...updatedRow,
              full_name: `${first} ${last}`.trim(),
            };
            saveProfileCache(merged);
            return merged;
          });
        }
      )
      .subscribe();

    const handleVisibilityRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchProfile(user.id);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityRefresh);
    }

    return () => {
      supabase.removeChannel(channel);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      }
    };
  }, [user?.id, fetchProfile]);

  // ── Auth actions ─────────────────────────────────────────────────────────────

  const signIn = async (email, password, captchaToken) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const cleanEmail = String(email || "").trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
      ...(captchaToken ? { options: { captchaToken } } : {}),
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, firstName, lastName, role = 'customer', captchaToken) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const cleanEmail = String(email || "").trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { first_name: firstName.trim(), last_name: lastName.trim(), role },
        ...(captchaToken ? { captchaToken } : {}),
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
        redirectTo: buildAppRedirectUrl("auth/callback"),
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const activeRole = profile?.role;
    loadedUserIdRef.current = null;
    setIsPasswordRecovery(false);
    clearPersistentRoleSnapshot(activeRole);
    setProfile(null);
    setUser(null);
    try {
      sessionStorage.removeItem('ekodak_active_confirmed_booking');
      sessionStorage.removeItem('ekodak_active_receipt_data');
      sessionStorage.removeItem('ekodak_pending_xendit_booking');
      sessionStorage.removeItem('ekodak_booking_form_draft');
      localStorage.removeItem('ekodak_pending_xendit_booking');
      localStorage.removeItem('ekodak_booking_form_draft');
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith('ekodak_processed_xendit_tx_') || k.startsWith('ekodak_fulfilled_ref_')) {
          sessionStorage.removeItem(k);
        }
      });
    } catch {}
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  };

  const verifyEmailCode = async (email, token, type = 'signup') => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanToken = String(token || "").replace(/\D/g, "").slice(0, 6);

    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type,
    });

    if (error) throw error;
    return data;
  };

  /**
   * Sends a 6-digit login OTP to an already-registered account (confirmed or unconfirmed).
   * Using shouldCreateUser: false ensures Supabase returns an error instead of silently
   * succeeding when no account exists for that email.
   */
  const sendLoginCode = async (email) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) throw new Error("Please enter your email address first.");

    const { data, error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: buildAppRedirectUrl("auth/callback"),
      },
    });

    if (error) {
      const code = String(error.code || "").toLowerCase();
      const msg = String(error.message || "").toLowerCase();
      if (
        code === "otp_disabled" ||
        msg.includes("signups not allowed") ||
        msg.includes("user not found")
      ) {
        throw new Error("No account found with this email. Please create an account first.");
      }
      if (code === "over_email_send_rate_limit" || msg.includes("rate limit")) {
        throw new Error("Too many requests. Please wait a minute before requesting a new code.");
      }
      throw error;
    }
    return data;
  };

  const resendVerification = async (email) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) throw new Error("Please enter your email address first.");

    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
    });

    if (error) {
      const code = String(error.code || "").toLowerCase();
      const msg = String(error.message || "").toLowerCase();
      if (code === "over_email_send_rate_limit" || msg.includes("rate limit")) {
        throw new Error("Too many requests. Please wait a minute before requesting a new code.");
      }
      throw error;
    }
    return data;
  };

  /**
   * Sends a password reset email (supports both a 6-digit recovery code and /reset-password link).
   */
  const requestPasswordReset = async (email, captchaToken) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: buildAppRedirectUrl("reset-password"),
      ...(captchaToken ? { captchaToken } : {}),
    });

    if (error) {
      const code = String(error.code || "").toLowerCase();
      const msg = String(error.message || "").toLowerCase();
      if (code === "over_email_send_rate_limit" || msg.includes("rate limit")) {
        throw new Error("Too many reset requests. Please wait a minute before trying again.");
      }
      throw error;
    }
    return data;
  };

  /**
   * Verifies a 6-digit password recovery code sent via resetPasswordForEmail.
   */
  const verifyRecoveryCode = async (email, token) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanToken = String(token || "").replace(/\D/g, "").slice(0, 6);
    if (cleanToken.length !== 6) {
      throw new Error("Please enter the 6-digit reset code from your email.");
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'recovery',
    });

    if (error) throw error;
    return data;
  };

  /**
   * Updates the authenticated user's password (after recovery link or recovery OTP).
   */
  const updatePassword = async (newPassword) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    setIsPasswordRecovery(false);
    return data;
  };

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

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
    isPasswordRecovery,
    clearPasswordRecovery,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    verifyEmailCode,
    sendLoginCode,
    resendVerification,
    requestPasswordReset,
    verifyRecoveryCode,
    updatePassword,
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
