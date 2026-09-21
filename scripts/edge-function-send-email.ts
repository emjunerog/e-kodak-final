/**
 * E-Kodak Studio — Supabase Edge Function: send-email
 * =====================================================
 * Powered by Resend (https://resend.com) — free tier: 3,000 emails/month.
 *
 * DEPLOY INSTRUCTIONS:
 * --------------------
 * 1. Install Supabase CLI: npm install -g supabase
 * 2. Login: supabase login
 * 3. Link your project: supabase link --project-ref <your-project-ref>
 * 4. Add your Resend API key to Supabase secrets:
 *    supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
 * 5. Create the function directory:
 *    mkdir -p supabase/functions/send-email
 *    cp scripts/edge-function-send-email.js supabase/functions/send-email/index.ts
 * 6. Deploy:
 *    supabase functions deploy send-email
 *
 * ALTERNATIVE PROVIDERS:
 * ----------------------
 * - SendGrid: Replace Resend section with SendGrid's API
 * - Nodemailer / SMTP: Use SMTP credentials in secrets
 * - Mailgun: Replace with Mailgun REST API
 *
 * ENVIRONMENT VARIABLES (set via: supabase secrets set KEY=value)
 * ---------------------------------------------------------------
 * RESEND_API_KEY     — your Resend API key (required)
 * FROM_EMAIL         — sender address (default: noreply@e-kodak.com)
 * FROM_NAME          — sender name (default: E-Kodak Studio)
 */

// This file is TypeScript-compatible Deno syntax for Supabase Edge Functions
// Rename to index.ts when deploying to supabase/functions/send-email/

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'noreply@e-kodak.com';
const FROM_NAME      = Deno.env.get('FROM_NAME')  ?? 'E-Kodak Photography Studio';

interface EmailRequest {
  to:              string;
  subject:         string;
  html:            string;
  recipientName?:  string;
  bookingId?:      string | null;
  notificationType?: string;
}

serve(async (req: Request) => {
  // ── CORS headers ─────────────────────────────────────────────────────────
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    const { to, subject, html, recipientName, bookingId, notificationType } = body;

    // Validate required fields
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured. Run: supabase secrets set RESEND_API_KEY=re_xxx' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Send via Resend ───────────────────────────────────────────────────
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    `${FROM_NAME} <${FROM_EMAIL}>`,
        to:      [to],
        subject: subject,
        html:    html,
        tags:    [
          { name: 'studio',    value: 'e-kodak' },
          { name: 'type',      value: notificationType || 'BROADCAST' },
          ...(bookingId ? [{ name: 'booking_id', value: bookingId }] : []),
        ]
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[send-email] Resend API error:', resendData);
      return new Response(
        JSON.stringify({ success: false, error: resendData.message || 'Resend API error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-email] Sent to ${to} — Resend ID: ${resendData.id}`);

    return new Response(
      JSON.stringify({
        success:  true,
        id:       resendData.id,
        provider: 'resend',
        to,
        subject,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[send-email] Unhandled error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * SUPABASE FUNCTION SETUP CHECKLIST
 * ──────────────────────────────────
 * ☐ Run: supabase link --project-ref <your-project-ref>
 * ☐ Run: supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
 * ☐ (Optional) Run: supabase secrets set FROM_EMAIL=noreply@yourdomain.com
 * ☐ Copy this file to: supabase/functions/send-email/index.ts
 * ☐ Run: supabase functions deploy send-email
 * ☐ Test: supabase functions invoke send-email --body '{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
 *
 * DATABASE: Also make sure email_logs table exists (run this SQL in Supabase dashboard):
 *
 *   CREATE TABLE IF NOT EXISTS public.email_logs (
 *     id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     recipient_email   TEXT NOT NULL,
 *     recipient_name    TEXT,
 *     subject           TEXT NOT NULL,
 *     html_body         TEXT,
 *     notification_type TEXT DEFAULT 'BROADCAST',
 *     booking_id        UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
 *     status            TEXT DEFAULT 'QUEUED',  -- QUEUED | SENT | FAILED
 *     queued_at         TIMESTAMPTZ DEFAULT now(),
 *     sent_at           TIMESTAMPTZ,
 *     created_at        TIMESTAMPTZ DEFAULT now()
 *   );
 *
 *   ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Admins can view email logs"
 *     ON public.email_logs FOR ALL
 *     USING (auth.jwt() ->> 'role' IN ('admin', 'staff', 'finance'));
 */
