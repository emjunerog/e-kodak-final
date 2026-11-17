/**
 * googleMapsService.js — Mobile
 * Retrieves live delivery map information directly via Google Maps Platform APIs
 * (Geocoding API v4, Routes API, Maps Static API) using Supabase Edge Function
 * proxy `google-maps-delivery` with a prototype `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` fallback.
 */

import { Platform } from 'react-native';
import { isSupabaseConfigured, supabase } from './supabase';

export const STUDIO_COORDINATES = { latitude: 10.2080704, longitude: 123.7560338 };
export const STUDIO_ORIGIN_ADDRESS = '331 Rizal Street, City of Naga, Cebu, 6037, Philippines';
export const STUDIO_PLACE_QUERY = `${STUDIO_COORDINATES.latitude},${STUDIO_COORDINATES.longitude}`;
const SOLUTION_ID = 'gmp_git_agentskills_v1';

export function getPublicGoogleMapsKey() {
  const key = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();
  if (!key || key === 'your_google_maps_api_key_here') return '';
  return key;
}

/**
 * Builds an official Google Maps Embed API v1 URL (`place` or `directions` mode)
 * with mandatory `solution_id` attribution (`gmp_git_agentskills_v1`).
 */
export function buildGoogleMapsEmbedUrl({
  mode = 'studio',
  destinationAddress = '',
  destinationPlaceId = '',
  destinationLat = null,
  destinationLng = null,
  zoom = 16,
} = {}) {
  const apiKey = getPublicGoogleMapsKey();
  if (!apiKey) return '';

  const resolvedDest = destinationPlaceId
    ? `place_id:${destinationPlaceId}`
    : destinationAddress
      ? destinationAddress
      : Number.isFinite(destinationLat) && Number.isFinite(destinationLng)
        ? `${destinationLat},${destinationLng}`
        : '';

  if (mode === 'directions' && resolvedDest) {
    const params = new URLSearchParams({
      key: apiKey,
      origin: `${STUDIO_COORDINATES.latitude},${STUDIO_COORDINATES.longitude}`,
      destination: resolvedDest,
      mode: 'driving',
      region: 'ph',
      language: 'en',
      solution_id: SOLUTION_ID,
    });
    return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
  }

  const placeQuery =
    mode === 'destination' && resolvedDest
      ? resolvedDest
      : STUDIO_PLACE_QUERY;

  const params = new URLSearchParams({
    key: apiKey,
    q: placeQuery,
    zoom: String(zoom),
    region: 'ph',
    language: 'en',
    solution_id: SOLUTION_ID,
  });
  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}

export function formatRouteDistance(distanceMeters) {
  const meters = Number(distanceMeters);
  if (!Number.isFinite(meters) || meters <= 0) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km >= 100 ? Math.round(km) : km.toFixed(1)} km`;
}

export function formatRouteDuration(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return '';
  const match = durationStr.match(/^(\d+(?:\.\d+)?)s$/i);
  if (!match) return durationStr;
  const totalSeconds = Math.max(0, Math.round(Number(match[1])));
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} min${totalMinutes === 1 ? '' : 's'}`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min${mins === 1 ? '' : 's'}` : `${hours} hr${hours === 1 ? '' : 's'}`;
}

export function buildGoogleMapsLinks({ address = '', placeId = '', latitude = null, longitude = null, isPickup = false } = {}) {
  const targetQuery =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? `${latitude},${longitude}`
      : address || STUDIO_ORIGIN_ADDRESS;

  const viewParams = new URLSearchParams({
    api: '1',
    query: targetQuery,
  });
  if (placeId) {
    viewParams.set('query_place_id', placeId);
  }

  const dirParams = new URLSearchParams({
    api: '1',
    destination: targetQuery,
    travelmode: 'driving',
  });
  if (placeId) {
    dirParams.set('destination_place_id', placeId);
  }
  if (!isPickup) {
    dirParams.set('origin', `${STUDIO_COORDINATES.latitude},${STUDIO_COORDINATES.longitude}`);
  }

  return {
    viewUrl: `https://www.google.com/maps/search/?${viewParams.toString()}`,
    directionsUrl: `https://www.google.com/maps/dir/?${dirParams.toString()}`,
  };
}

function buildStaticMapImageUrl({ apiKey, destLat, destLng, originLatLng, encodedPolyline }) {
  const params = new URLSearchParams({
    size: '640x320',
    scale: '2',
    maptype: 'roadmap',
    key: apiKey,
    solution_id: SOLUTION_ID,
  });

  params.append('markers', `color:0xC59A3B|label:D|${destLat},${destLng}`);
  if (originLatLng) {
    params.append(
      'markers',
      `color:0x1E293B|label:S|${originLatLng.latitude},${originLatLng.longitude}`
    );
  }
  if (encodedPolyline) {
    params.append('path', `color:0xB8860BFF|weight:5|enc:${encodedPolyline}`);
  } else {
    params.set('center', `${destLat},${destLng}`);
    params.set('zoom', '15');
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

async function fetchDirectPrototypeMapInfo(address, { regionCode = 'ph', includeRoute = true } = {}) {
  const apiKey = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return {
      data: null,
      configured: false,
      error: 'Google Maps API key not configured yet.',
    };
  }

  // Note: On Web browsers, Google Geocoding & Routes REST endpoints block cross-origin browser fetch (CF1).
  if (Platform.OS === 'web') {
    return {
      data: null,
      configured: false,
      error: 'Deploy Supabase Edge Function google-maps-delivery with GOOGLE_MAPS_API_KEY for web map retrieval.',
    };
  }

  const geocodeUrl = `https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent(address)}?regionCode=${encodeURIComponent(regionCode)}`;
  const geocodeRes = await fetch(geocodeUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'results.placeId,results.location,results.formattedAddress,results.plusCode',
      'X-Goog-Maps-Solution-ID': SOLUTION_ID,
    },
  });

  const geocodeJson = await geocodeRes.json().catch(() => ({}));
  if (!geocodeRes.ok) {
    return {
      data: null,
      configured: true,
      error: geocodeJson?.error?.message || `Geocoding API returned status ${geocodeRes.status}.`,
    };
  }

  const top = Array.isArray(geocodeJson?.results) ? geocodeJson.results[0] : null;
  if (!top?.location) {
    return {
      data: null,
      configured: true,
      error: 'Could not find coordinates for this delivery address.',
    };
  }

  const destLat = Number(top.location.latitude);
  const destLng = Number(top.location.longitude);
  const destination = {
    formattedAddress: top.formattedAddress || address,
    latitude: destLat,
    longitude: destLng,
    placeId: top.placeId || '',
    plusCode: top.plusCode?.compoundCode || top.plusCode?.globalCode || '',
  };

  let route = null;
  if (includeRoute) {
    try {
      const routeRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.startLocation',
          'X-Goog-Maps-Solution-ID': SOLUTION_ID,
        },
        body: JSON.stringify({
          origin: { location: { latLng: STUDIO_COORDINATES } },
          destination: destination.placeId
            ? { placeId: destination.placeId }
            : { location: { latLng: { latitude: destLat, longitude: destLng } } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          regionCode,
          units: 'METRIC',
          languageCode: 'en-US',
        }),
      });
      const routeJson = await routeRes.json().catch(() => ({}));
      const firstRoute = routeRes.ok && Array.isArray(routeJson?.routes) ? routeJson.routes[0] : null;
      if (firstRoute) {
        const startLoc = firstRoute.legs?.[0]?.startLocation?.latLng || null;
        route = {
          distanceMeters: Number(firstRoute.distanceMeters || 0),
          duration: String(firstRoute.duration || ''),
          encodedPolyline: firstRoute.polyline?.encodedPolyline || '',
          originLatLng: startLoc
            ? { latitude: Number(startLoc.latitude), longitude: Number(startLoc.longitude) }
            : null,
        };
      }
    } catch {
      // Non-fatal: still return geocoded location & map preview even if route fails
    }
  }

  const staticMapUrl = buildStaticMapImageUrl({
    apiKey,
    destLat,
    destLng,
    originLatLng: route?.originLatLng || null,
    encodedPolyline: route?.encodedPolyline || '',
  });

  return {
    data: {
      destination,
      route,
      staticMapUri: staticMapUrl,
    },
    configured: true,
    error: null,
  };
}

/**
 * Retrieves live map information (verified address, lat/lng, Plus Code, route ETA/distance,
 * and static route map image) directly from Google Maps Platform.
 */
export async function fetchDeliveryGoogleMapInfo(address, { isPickup = false, regionCode = 'ph' } = {}) {
  const cleanAddress = isPickup
    ? STUDIO_ORIGIN_ADDRESS
    : typeof address === 'string'
      ? address.trim()
      : '';

  if (!cleanAddress || cleanAddress === '—' || cleanAddress === 'Not set by customer') {
    return { data: null, configured: true, error: null };
  }

  // Primary: Supabase Edge Function proxy (keeps API key server-side & avoids Web CORS)
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('google-maps-delivery', {
        body: {
          address: cleanAddress,
          regionCode,
          includeRoute: !isPickup,
        },
      });

      if (!fnError && fnData?.configured && fnData?.destination) {
        return {
          data: {
            destination: fnData.destination,
            route: fnData.route || null,
            staticMapUri: fnData.staticMapDataUri || null,
          },
          configured: true,
          error: null,
        };
      }

      if (!fnError && fnData?.configured && fnData?.error) {
        return { data: null, configured: true, error: fnData.error };
      }
    } catch {
      // Fall back to mobile prototype API key if edge function isn't deployed yet
    }
  }

  // Fallback: direct mobile API call using EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (e.g. Maps Demo Key)
  try {
    return await fetchDirectPrototypeMapInfo(cleanAddress, {
      regionCode,
      includeRoute: !isPickup,
    });
  } catch (err) {
    return {
      data: null,
      configured: false,
      error: err?.message || 'Unable to retrieve Google Maps data.',
    };
  }
}
