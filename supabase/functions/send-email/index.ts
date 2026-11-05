/**
 * E-Kodak Studio — Supabase Edge Function: send-email (Nodemailer SMTP Edition)
 * ============================================================================
 * Supports Gmail SMTP, Zoho, Outlook, Resend, or any standard SMTP server.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.13';

const SMTP_HOST  = Deno.env.get('SMTP_HOST')  || 'smtp.gmail.com';
const SMTP_PORT  = Number(Deno.env.get('SMTP_PORT') || '465');
const SMTP_USER  = Deno.env.get('SMTP_USER')  || '';
const SMTP_PASS  = Deno.env.get('SMTP_PASS')  || '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || SMTP_USER || 'admine_kodak@gmail.com';
const FROM_NAME  = Deno.env.get('FROM_NAME')  || 'E-Kodak Photography Studio';

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
    const { to, subject, html, notificationType, recipientName, bookingId } = await req.json();

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

    // 3. Check caller permissions:
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

    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('[send-email] SMTP_USER or SMTP_PASS not set in Supabase secrets');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS secrets in Supabase.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Create Nodemailer transporter and send
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: cleanTo,
      subject: cleanSubject,
      text: 'Please enable HTML email to view your booking confirmation.',
      html: String(html),
    });

    console.log(`[send-email] Sent successfully to ${cleanTo} (MessageId: ${info.messageId})`);

    // 5. Update or insert into email_logs using service role
    try {
      await supabase.from('email_logs').insert({
        recipient_email: cleanTo,
        recipient_name: recipientName || cleanTo,
        subject: cleanSubject,
        html_body: String(html),
        notification_type: notificationType || 'BOOKING_CONFIRMATION',
        booking_id: bookingId || null,
        status: 'SENT',
        sent_at: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn('[send-email] email_logs update warning:', logErr);
    }

    return new Response(
      JSON.stringify({ success: true, provider: 'smtp', messageId: info.messageId, to: cleanTo }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[send-email] Dispatch Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
