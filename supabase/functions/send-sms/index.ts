/**
 * E-Kodak Studio — Supabase Edge Function: send-sms (TextBee Gateway Edition)
 * ============================================================================
 * Dispatches outbound SMS messages through the paired TextBee Android gateway
 * and records transmission logs in public.sms_logs.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TEXTBEE_BASE_URL = 'https://api.textbee.dev/api/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizePhPhone(phone: string): string {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('09') && digits.length === 11) return `+63${digits.slice(1)}`;
  if (digits.startsWith('639') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('9') && digits.length === 10) return `+63${digits}`;
  if (raw.startsWith('+') && digits.length >= 10) return `+${digits}`;
  return raw;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid or expired session token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();

    const callerRole = String(callerProfile?.role || '').toLowerCase();
    if (!['admin', 'staff', 'finance', 'photographer'].includes(callerRole)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Staff or admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TEXTBEE_API_KEY = Deno.env.get('TEXTBEE_API_KEY') ?? '';
    const TEXTBEE_DEVICE_ID = Deno.env.get('TEXTBEE_DEVICE_ID') ?? '';

    if (!TEXTBEE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'TEXTBEE_API_KEY secret is not configured in Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const recipientsInput: string[] = Array.isArray(body.recipients)
      ? body.recipients
      : body.phoneNumber
        ? [body.phoneNumber]
        : [];
    const normalizedRecipients = recipientsInput.map(normalizePhPhone).filter(Boolean);
    const cleanMessage = String(body.message || '').trim();
    const targetDeviceId = String(body.deviceId || TEXTBEE_DEVICE_ID || '').trim();

    if (normalizedRecipients.length === 0 || !cleanMessage) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: recipients and message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: Record<string, unknown> = {
      recipients: normalizedRecipients,
      message: cleanMessage,
    };
    if (targetDeviceId) {
      payload.deviceId = targetDeviceId;
    }

    const tbResponse = await fetch(`${TEXTBEE_BASE_URL}/gateway/send-sms`, {
      method: 'POST',
      headers: {
        'x-api-key': TEXTBEE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const tbData = await tbResponse.json().catch(() => ({}));
    const batchId = tbData?.data?.smsBatchId || tbData?.smsBatchId || null;

    if (!tbResponse.ok) {
      const errMsg = tbData?.message || tbData?.error || `TextBee HTTP ${tbResponse.status}`;
      return new Response(
        JSON.stringify({ success: false, error: errMsg, details: tbData }),
        { status: tbResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    const logRows = normalizedRecipients.map((phone) => ({
      phone_number: phone,
      message: cleanMessage,
      notification_type: body.notificationType || 'MANUAL_DISPATCH',
      booking_id: body.bookingId || null,
      customer_id: body.customerId || null,
      provider_message_id: batchId ? `TEXTBEE_${batchId}` : `TEXTBEE_${Date.now()}`,
      status: 'SENT',
      sent_at: now,
      created_at: now,
    }));

    try {
      await supabase.from('sms_logs').insert(logRows);
    } catch (logErr) {
      console.warn('[send-sms] sms_logs insert warning:', logErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: 'textbee',
        smsBatchId: batchId,
        recipientCount: normalizedRecipients.length,
        recipients: normalizedRecipients,
        data: tbData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[send-sms] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
