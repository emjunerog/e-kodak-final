import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STUDIO_COORDINATES = { latitude: 10.2080704, longitude: 123.7560338 };
const SOLUTION_ID = "gmp_git_agentskills_v1";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY") || "";
    if (!apiKey.trim()) {
      return new Response(
        JSON.stringify({
          configured: false,
          error: "Missing GOOGLE_MAPS_API_KEY secret in Supabase Edge Function.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawAddress = typeof body?.address === "string" ? body.address.trim() : "";
    const regionCode = typeof body?.regionCode === "string" && body.regionCode.trim()
      ? body.regionCode.trim().toLowerCase()
      : "ph";
    const includeRoute = body?.includeRoute !== false;

    if (!rawAddress) {
      return new Response(JSON.stringify({ configured: true, error: "Delivery address is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Geocoding API v4 — resolve verified address, coordinates, placeId, and Plus Code
    const geocodeUrl = `https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent(rawAddress)}?regionCode=${encodeURIComponent(regionCode)}`;
    const geocodeRes = await fetch(geocodeUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "results.placeId,results.location,results.formattedAddress,results.plusCode",
        "X-Goog-Maps-Solution-ID": SOLUTION_ID,
      },
    });

    const geocodeJson = await geocodeRes.json().catch(() => ({}));
    if (!geocodeRes.ok) {
      return new Response(
        JSON.stringify({
          configured: true,
          error: geocodeJson?.error?.message || `Geocoding failed (${geocodeRes.status})`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const topResult = Array.isArray(geocodeJson?.results) ? geocodeJson.results[0] : null;
    if (!topResult?.location) {
      return new Response(
        JSON.stringify({
          configured: true,
          destination: null,
          route: null,
          staticMapDataUri: null,
          error: "Google Maps could not match a coordinate location for this address.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const destLat = Number(topResult.location.latitude);
    const destLng = Number(topResult.location.longitude);
    const destination = {
      formattedAddress: topResult.formattedAddress || rawAddress,
      latitude: destLat,
      longitude: destLng,
      placeId: topResult.placeId || "",
      plusCode: topResult.plusCode?.compoundCode || topResult.plusCode?.globalCode || "",
    };

    // 2. Routes API (computeRoutes) — compute distance, ETA, and polyline from E-Kodak Studio
    let route: {
      distanceMeters: number;
      duration: string;
      encodedPolyline: string;
      originLatLng: { latitude: number; longitude: number } | null;
    } | null = null;

    if (includeRoute) {
      const routePayload = {
        origin: { location: { latLng: STUDIO_COORDINATES } },
        destination: destination.placeId
          ? { placeId: destination.placeId }
          : { location: { latLng: { latitude: destLat, longitude: destLng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        regionCode,
        units: "METRIC",
        languageCode: "en-US",
      };

      const routesRes = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.startLocation",
          "X-Goog-Maps-Solution-ID": SOLUTION_ID,
        },
        body: JSON.stringify(routePayload),
      });

      const routesJson = await routesRes.json().catch(() => ({}));
      const firstRoute = routesRes.ok && Array.isArray(routesJson?.routes) ? routesJson.routes[0] : null;
      if (firstRoute) {
        const startLoc = firstRoute.legs?.[0]?.startLocation?.latLng || null;
        route = {
          distanceMeters: Number(firstRoute.distanceMeters || 0),
          duration: String(firstRoute.duration || ""),
          encodedPolyline: firstRoute.polyline?.encodedPolyline || "",
          originLatLng: startLoc
            ? { latitude: Number(startLoc.latitude), longitude: Number(startLoc.longitude) }
            : null,
        };
      }
    }

    // 3. Maps Static API — render server-side map PNG so API key never leaves server
    const staticParams = new URLSearchParams({
      size: "640x320",
      scale: "2",
      maptype: "roadmap",
      key: apiKey,
      solution_id: SOLUTION_ID,
    });

    staticParams.append("markers", `color:0xC59A3B|label:D|${destLat},${destLng}`);
    if (route?.originLatLng) {
      staticParams.append(
        "markers",
        `color:0x1E293B|label:S|${route.originLatLng.latitude},${route.originLatLng.longitude}`
      );
    }
    if (route?.encodedPolyline) {
      staticParams.append("path", `color:0xB8860BFF|weight:5|enc:${route.encodedPolyline}`);
    } else {
      staticParams.set("center", `${destLat},${destLng}`);
      staticParams.set("zoom", "15");
    }

    let staticMapDataUri: string | null = null;
    const staticRes = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${staticParams.toString()}`);
    if (staticRes.ok) {
      const imgBuffer = await staticRes.arrayBuffer();
      const base64 = arrayBufferToBase64(imgBuffer);
      staticMapDataUri = `data:image/png;base64,${base64}`;
    }

    return new Response(
      JSON.stringify({
        configured: true,
        destination,
        route,
        staticMapDataUri,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        configured: true,
        error: err instanceof Error ? err.message : "Failed to query Google Maps Platform.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
