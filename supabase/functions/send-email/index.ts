/**
 * E-Kodak Studio — Supabase Edge Function: send-email (SMTP Edition)
 * ====================================================================
 * Works with ANY SMTP provider: Gmail, Yahoo, Outlook, cPanel, Zoho, etc.
 * No third-party account needed beyond your existing email account.
 *
 * DEPLOY INSTRUCTIONS:
 * --------------------
 * 1. Link project (if not already): supabase link --project-ref <your-ref>
 * 2. Set SMTP secrets (one-time, replace with your Gmail/email credentials):
 *
 *    supabase secrets set SMTP_HOST=smtp.gmail.com
 *    supabase secrets set SMTP_PORT=587
 *    supabase secrets set SMTP_USER=your-email@gmail.com
 *    supabase secrets set SMTP_PASS=your-app-password
 *    supabase secrets set FROM_EMAIL=your-email@gmail.com
 *    supabase secrets set FROM_NAME="E-Kodak Photography Studio"
 *
 * 3. Deploy: supabase functions deploy send-email
 *
 * ── GMAIL SETUP ──
 * Gmail requires an "App Password" (not your regular password):
 *   1. Go to myaccount.google.com → Security → 2-Step Verification (enable)
 *   2. Then: myaccount.google.com → Security → App passwords
 *   3. Create one for "Mail" → copy the 16-character password
 *   4. Use that as SMTP_PASS above
 *
 * ── DATABASE SETUP ──
 * Run this SQL once in Supabase SQL Editor:
 *
 *   CREATE TABLE IF NOT EXISTS public.email_logs (
 *     id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     recipient_email   TEXT NOT NULL,
 *     recipient_name    TEXT,
 *     subject           TEXT NOT NULL,
 *     html_body         TEXT,
 *     notification_type TEXT DEFAULT 'BROADCAST',
 *     booking_id        UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
 *     status            TEXT DEFAULT 'QUEUED',
 *     queued_at         TIMESTAMPTZ DEFAULT now(),
 *     sent_at           TIMESTAMPTZ,
 *     error_message     TEXT,
 *     created_at        TIMESTAMPTZ DEFAULT now()
 *   );
 *   ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Admins can manage email logs"
 *     ON public.email_logs FOR ALL
 *     USING (auth.jwt() ->> 'role' IN ('admin', 'staff', 'finance'));
 */

// Deno SMTP — built into Supabase Edge Functions runtime
// Rename this file to index.ts inside supabase/functions/send-email/
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';

const SMTP_HOST  = Deno.env.get('SMTP_HOST')  ?? 'smtp.gmail.com';
const SMTP_PORT  = Number(Deno.env.get('SMTP_PORT') ?? '587');
const SMTP_USER  = Deno.env.get('SMTP_USER')  ?? '';
const SMTP_PASS  = Deno.env.get('SMTP_PASS')  ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? SMTP_USER;
const FROM_NAME  = Deno.env.get('FROM_NAME')  ?? 'E-Kodak Photography Studio';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_REGEX = /^[^\s@,\r\n]+@[^\s@,\r\n]+\.[^\s@,\r\n]+$/;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate caller via Supabase JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Missing Authorization bearer token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid or expired session token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse & validate request body
    const { to, subject, html, notificationType } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanTo = String(to).trim();
    const cleanSubject = String(subject).replace(/[\r\n]+/g, ' ').trim();
    if (!EMAIL_REGEX.test(cleanTo)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid recipient email address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Enforce role-based authorization:
    // Staff/admin/finance/photographer can email any studio client; customers can only trigger emails to their own address.
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const callerRole = String(callerProfile?.role || '').toLowerCase();
    const isStaffRole = ['admin', 'staff', 'finance', 'photographer'].includes(callerRole);
    const isOwnEmail = user.email && user.email.toLowerCase() === cleanTo.toLowerCase();

    if (!isStaffRole && !isOwnEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Insufficient permissions to send external emails' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (notificationType === 'BROADCAST' && !isStaffRole) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Only studio staff may send broadcast notifications' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SMTP_USER || !SMTP_PASS) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SMTP credentials not configured. Run: supabase secrets set SMTP_USER=... SMTP_PASS=...'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Connect and send via SMTP
    const client = new SmtpClient();
    await client.connectTLS({ hostname: SMTP_HOST, port: SMTP_PORT, username: SMTP_USER, password: SMTP_PASS });

    await client.send({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to:      cleanTo,
      subject: cleanSubject,
      content: 'Please enable HTML email to view this message.',
      html:    String(html),
    });

    await client.close();

    console.log(`[send-email] SMTP sent → ${cleanTo} | ${cleanSubject} (by ${user.id})`);

    return new Response(
      JSON.stringify({ success: true, provider: 'smtp', to: cleanTo, subject: cleanSubject }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[send-email] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
