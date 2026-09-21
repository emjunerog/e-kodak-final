/**
 * AuthCallback.jsx
 * ================
 * Handles the redirect after a Google OAuth sign-in.
 * Supabase processes the URL fragment automatically via onAuthStateChange.
 * This page just waits for the session, then routes the user to the
 * correct dashboard based on their role.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Camera } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const navigate  = useNavigate();
  const [status, setStatus] = useState("Processing sign-in…");

  useEffect(() => {
    const handle = async () => {
      // Give Supabase a moment to process the OAuth token from the URL hash
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        // Retry once after a short delay (token exchange can be async)
        await new Promise(r => setTimeout(r, 1500));
        const { data: { session: retried } } = await supabase.auth.getSession();
        if (!retried) {
          setStatus("Sign-in failed. Redirecting…");
          setTimeout(() => navigate("/login", { replace: true }), 1500);
          return;
        }
      }

      setStatus("Loading your profile…");

      // Fetch live role from profiles table
      const userId = session?.user?.id || (await supabase.auth.getSession()).data?.session?.user?.id;
      if (!userId) {
        navigate("/login", { replace: true });
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      const role = profileData?.role || 'customer';

      if (role === 'admin' || role === 'staff') navigate('/admin', { replace: true });
      else if (role === 'photographer')          navigate('/photographer', { replace: true });
      else                                       navigate('/dashboard', { replace: true });
    };

    handle();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 gap-5">
      <div className="flex items-center gap-2.5 text-primary mb-2">
        <Camera size={28} />
        <span className="font-heading text-2xl tracking-wide">E-KODAK</span>
      </div>
      <Loader2 size={28} className="animate-spin text-gold" />
      <p className="text-sm text-neutral-400 font-body">{status}</p>
    </div>
  );
}

