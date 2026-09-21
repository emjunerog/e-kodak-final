import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function createQRPayload(bookingToken) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    bid: bookingToken,
    typ: "booking",
    iat: now,
    exp: now + 365 * 24 * 60 * 60,
  };
  return JSON.stringify(payload);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bookingId, bookingToken, regenerate } = await req.json();

    if (!bookingId || !bookingToken) {
      return new Response(JSON.stringify({ error: "bookingId and bookingToken are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has access to this booking (staff/admin or owner)
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, customer_id, booking_token, qr_code_path")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check permissions
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isStaff = profile && ["staff", "admin"].includes(profile.role);
    const isOwner = booking.customer_id === user.id;

    if (!isStaff && !isOwner) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete old QR if regenerating
    if (regenerate && booking.qr_code_path) {
      await supabase.storage.from("booking-qr-codes").remove([booking.qr_code_path]);
    }

    // Generate QR code
    const qrData = createQRPayload(bookingToken);
    const qrSvg = await QRCode.toString(qrData, { type: "svg", width: 512, margin: 2, color: { dark: "#1a1a2e", light: "#ffffff" } });

    const fileName = `qr-${bookingId}-${Date.now()}.svg`;
    const filePath = `${bookingId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("booking-qr-codes")
      .upload(filePath, new Blob([qrSvg], { type: "image/svg+xml" }), {
        contentType: "image/svg+xml",
        upsert: false,
      });

    if (uploadError) {
      console.error("QR upload error:", uploadError);
      throw new Error("Failed to store QR code");
    }

    // Update booking record
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        qr_code_path: filePath,
        qr_payload_version: 1,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Booking update error:", updateError);
    }

    const { data: urlData } = supabase.storage.from("booking-qr-codes").getPublicUrl(filePath);

    return new Response(
      JSON.stringify({
        qr_code_path: filePath,
        qr_public_url: urlData.publicUrl,
        qr_data_url: qrData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-qr error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});