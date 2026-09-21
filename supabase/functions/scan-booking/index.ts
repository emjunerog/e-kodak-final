import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function decodeQRPayload(token) {
  try {
    const parsed = JSON.parse(token);
    if (
      parsed.v === 1 &&
      parsed.typ === "booking" &&
      typeof parsed.bid === "string" &&
      typeof parsed.iat === "number"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const url = new URL(req.url);
    const token = url.pathname.split("/").pop();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = decodeQRPayload(token);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Invalid QR code format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return new Response(JSON.stringify({ error: "QR code has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Find booking by booking_token
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        booking_number,
        booking_token,
        status,
        payment_status,
        event_date,
        preferred_time,
        location,
        notes,
        qr_code_path,
        confirmed_at,
        service:services(name, category, cover_image),
        customer:profiles!bookings_customer_id_fkey(first_name, last_name, phone),
        photographer:photographer_profiles!bookings_photographer_id_fkey(
          id,
          specialization,
          profile:profiles(first_name, last_name, phone)
        )
      `)
      .eq("booking_token", payload.bid)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get delivery info if exists
    const { data: delivery } = await supabase
      .from("booking_deliveries")
      .select("*")
      .eq("booking_id", booking.id)
      .single();

    // Log scan (async, don't wait)
    const scanLog = {
      booking_id: booking.id,
      scan_type: "COMPANION_APP",
      user_agent: req.headers.get("user-agent"),
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      scan_result: "SUCCESS",
    };
    supabase.from("qr_scan_logs").insert(scanLog);

    return new Response(
      JSON.stringify({
        booking: {
          id: booking.id,
          booking_number: booking.booking_number,
          status: booking.status,
          payment_status: booking.payment_status,
          event_date: booking.event_date,
          preferred_time: booking.preferred_time,
          location: booking.location,
          notes: booking.notes,
          confirmed_at: booking.confirmed_at,
          service: booking.service,
          customer: booking.customer,
          photographer: booking.photographer,
          qr_code_path: booking.qr_code_path,
        },
        delivery: delivery || null,
        payload_version: payload.v,
        scanned_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("scan-booking error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});