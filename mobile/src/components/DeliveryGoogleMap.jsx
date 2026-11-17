/**
 * DeliveryGoogleMap.jsx
 * Interactive embedded Google Map for the Profile Google Maps card.
 * Uses the Google Maps JavaScript API (v=weekly) inside WebView (mobile) and iframe (Web),
 * featuring Kodak the Fox mascot custom AdvancedMarkerElement pins ("I am here" / "Come, visit!"),
 * Roadmap / Satellite views, and a transparent Street View in-development notice.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  MapPin,
  Navigation,
  Store,
  Map as MapIcon,
  Layers,
  Compass,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import {
  buildGoogleMapsLinks,
  getPublicGoogleMapsKey,
  STUDIO_ORIGIN_ADDRESS,
  STUDIO_COORDINATES,
} from '../services/googleMapsService';
import { Typography } from '../theme';

function safeJsonForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildInteractiveMapsJsDocument({
  apiKey,
  mode,
  viewMode,
  isDark,
  studioCoords,
  studioTitle,
  studioSubtitle,
  deliveryAddress,
  destinationLat,
  destinationLng,
  encodedPolyline,
  routeDistance,
  routeDuration,
}) {
  const payload = safeJsonForInlineScript({
    apiKey,
    mode,
    viewMode,
    isDark,
    studioCoords,
    studioTitle,
    studioSubtitle,
    deliveryAddress,
    destinationLat: Number.isFinite(Number(destinationLat)) ? Number(destinationLat) : null,
    destinationLng: Number.isFinite(Number(destinationLng)) ? Number(destinationLng) : null,
    encodedPolyline: encodedPolyline || '',
    routeDistance: routeDistance || '',
    routeDuration: routeDuration || '',
  });

  const bgColor = isDark ? '#181E29' : '#EAEFF5';
  const textColor = isDark ? '#F5EFE6' : '#181410';
  const subTextColor = isDark ? '#B7C1D3' : '#5C5448';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${bgColor};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    /* Compact legible scaling for compact mobile viewport while keeping attribution intact */
    #map .gm-style a[href^="https://maps.google.com/maps"] {
      zoom: 0.76;
    }
    #map .gm-style .gm-style-cc {
      zoom: 0.8;
    }
    #map .gm-style .gm-bundled-control,
    #map .gm-style .gm-control-active {
      zoom: 0.78;
    }
    #map-fallback {
      display: none;
      position: absolute;
      inset: 0;
      padding: 18px;
      box-sizing: border-box;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 6px;
      background: ${bgColor};
      color: ${textColor};
      z-index: 30;
    }
    #map-fallback.visible {
      display: flex;
    }
    #map-fallback-sub {
      font-size: 12px;
      line-height: 17px;
      color: ${subTextColor};
      max-width: 280px;
    }
    .ekodak-info {
      font-size: 12px;
      line-height: 16px;
      color: #181410;
      max-width: 210px;
    }
    .ekodak-info strong {
      display: block;
      font-size: 12.5px;
      margin-bottom: 2px;
    }
    .kodak-pin-root {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
    }
    .kodak-speech {
      position: relative;
      background: #181410;
      color: #FFFDF8;
      border: 1.5px solid #D4AF37;
      border-radius: 12px;
      padding: 5px 10px;
      text-align: center;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.28);
      margin-bottom: 6px;
      white-space: nowrap;
    }
    .kodak-speech.delivery {
      background: #FFFDF8;
      color: #181410;
      border-color: #C59A3B;
    }
    .kodak-speech::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid #181410;
    }
    .kodak-speech.delivery::after {
      border-top-color: #FFFDF8;
    }
    .kodak-speech-line1 {
      display: block;
      font-size: 11px;
      font-weight: 800;
      line-height: 13px;
      letter-spacing: 0.1px;
    }
    .kodak-speech-line2 {
      display: block;
      font-size: 10px;
      font-weight: 700;
      line-height: 13px;
      color: #F5CE75;
      margin-top: 1px;
    }
    .kodak-speech.delivery .kodak-speech-line2 {
      color: #9A6B13;
    }
    .kodak-avatar-ring {
      width: 44px;
      height: 44px;
      border-radius: 22px;
      background: linear-gradient(145deg, #2A2219, #181410);
      border: 2.5px solid #D4AF37;
      box-shadow: 0 5px 12px rgba(0, 0, 0, 0.34);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .kodak-avatar-ring.delivery {
      width: 38px;
      height: 38px;
      border-radius: 19px;
      background: linear-gradient(145deg, #FFFDF8, #F5E7CE);
      border-color: #181410;
    }
    .kodak-pin-tip {
      width: 8px;
      height: 8px;
      margin-top: -3px;
      border-radius: 4px;
      background: #D4AF37;
      border: 1.5px solid #181410;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    }
  </style>
</head>
<body>
  <div id="map" role="region" aria-label="E-Kodak Interactive Google Map"></div>
  <div id="map-fallback">
    <strong style="font-size:13.5px;">Interactive map unavailable</strong>
    <div id="map-fallback-sub">Use "Open in Maps" below to view full directions.</div>
  </div>
  <script>
    const CONFIG = ${payload};

    function showFallback(reason) {
      const el = document.getElementById('map-fallback');
      const sub = document.getElementById('map-fallback-sub');
      if (sub && reason) sub.textContent = reason;
      if (el) el.classList.add('visible');
    }

    window.gm_authFailure = function () {
      showFallback('Google Maps key could not authorize this view. Use Open in Maps below.');
    };

    (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.\${c}apis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
      key: CONFIG.apiKey,
      v: "weekly"
    });

    function buildInfoNode(title, subtitle) {
      const wrap = document.createElement('div');
      wrap.className = 'ekodak-info';
      const strong = document.createElement('strong');
      strong.textContent = title || '';
      const span = document.createElement('span');
      span.textContent = subtitle || '';
      wrap.appendChild(strong);
      wrap.appendChild(span);
      return wrap;
    }

    function createKodakFoxSvg(sizePx, isDelivery) {
      const uid = isDelivery ? 'del' : 'stu';
      const tpl = document.createElement('template');
      tpl.innerHTML =
        '<svg width="' + sizePx + '" height="' + sizePx + '" viewBox="42 18 116 122" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<defs>' +
            '<linearGradient id="foxAmber_' + uid + '" x1="0" y1="0" x2="1" y2="1">' +
              '<stop offset="0%" stop-color="#F5A020"/>' +
              '<stop offset="50%" stop-color="#E67E22"/>' +
              '<stop offset="100%" stop-color="#C0392B"/>' +
            '</linearGradient>' +
            '<linearGradient id="foxIvory_' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="#FFFDF8"/>' +
              '<stop offset="100%" stop-color="#F6ECDA"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<path d="M74 68 L48 24 C55 20 86 44 87 64 Z" fill="url(#foxAmber_' + uid + ')" stroke="#D4AF37" stroke-width="1.4"/>' +
          '<path d="M72 62 L54 32 C60 29 80 48 81 58 Z" fill="#F8D7DA"/>' +
          '<path d="M126 68 L152 24 C145 20 114 44 113 64 Z" fill="url(#foxAmber_' + uid + ')" stroke="#D4AF37" stroke-width="1.4"/>' +
          '<path d="M128 62 L146 32 C140 29 120 48 119 58 Z" fill="#F8D7DA"/>' +
          '<path d="M62 96 C59 70 80 58 100 58 C120 58 141 70 138 96 C148 106 142 126 124 126 C112 136 88 136 76 126 C58 126 52 106 62 96 Z" fill="url(#foxAmber_' + uid + ')"/>' +
          '<path d="M62 96 C65 114 78 125 94 122 C88 116 86 108 88 98 C78 96 68 94 62 96 Z" fill="url(#foxIvory_' + uid + ')"/>' +
          '<path d="M138 96 C135 114 122 125 106 122 C112 116 114 108 112 98 C122 96 132 94 138 96 Z" fill="url(#foxIvory_' + uid + ')"/>' +
          '<ellipse cx="100" cy="107" rx="15" ry="11" fill="url(#foxIvory_' + uid + ')"/>' +
          '<path d="M96 100 C96 98 104 98 104 100 C104 103 100 105 100 105 C100 105 96 103 96 100 Z" fill="#2E241B"/>' +
          '<circle cx="98.5" cy="99.5" r="0.9" fill="#FFFFFF"/>' +
          '<path d="M96 106 Q100 110 104 106" stroke="#2E241B" stroke-width="1.5" stroke-linecap="round" fill="none"/>' +
          '<circle cx="84" cy="92" r="5.5" fill="#2E241B"/>' +
          '<circle cx="82.5" cy="90" r="2.2" fill="#FFFFFF"/>' +
          '<circle cx="116" cy="92" r="5.5" fill="#2E241B"/>' +
          '<circle cx="114.5" cy="90" r="2.2" fill="#FFFFFF"/>' +
        '</svg>';
      return tpl.content.firstChild;
    }

    function buildMascotPinNode({ line1, line2, isDelivery = false }) {
      const root = document.createElement('div');
      root.className = 'kodak-pin-root';

      if (line1 || line2) {
        const bubble = document.createElement('div');
        bubble.className = isDelivery ? 'kodak-speech delivery' : 'kodak-speech';
        if (line1) {
          const span1 = document.createElement('span');
          span1.className = 'kodak-speech-line1';
          span1.textContent = line1;
          bubble.appendChild(span1);
        }
        if (line2) {
          const span2 = document.createElement('span');
          span2.className = 'kodak-speech-line2';
          span2.textContent = line2;
          bubble.appendChild(span2);
        }
        root.appendChild(bubble);
      }

      const ring = document.createElement('div');
      ring.className = isDelivery ? 'kodak-avatar-ring delivery' : 'kodak-avatar-ring';
      ring.appendChild(createKodakFoxSvg(isDelivery ? 32 : 38, isDelivery));
      root.appendChild(ring);

      const tip = document.createElement('div');
      tip.className = 'kodak-pin-tip';
      root.appendChild(tip);

      return root;
    }

    async function initMap() {
      try {
        const [{ Map, Polyline, InfoWindow }, { AdvancedMarkerElement }, { LatLngBounds, ColorScheme }] =
          await Promise.all([
            google.maps.importLibrary('maps'),
            google.maps.importLibrary('marker'),
            google.maps.importLibrary('core'),
          ]);

        const studioPos = {
          lat: Number(CONFIG.studioCoords.latitude),
          lng: Number(CONFIG.studioCoords.longitude),
        };

        const hasDestCoords =
          typeof CONFIG.destinationLat === 'number' &&
          typeof CONFIG.destinationLng === 'number' &&
          Number.isFinite(CONFIG.destinationLat) &&
          Number.isFinite(CONFIG.destinationLng);

        let destPos = hasDestCoords
          ? { lat: CONFIG.destinationLat, lng: CONFIG.destinationLng }
          : null;

        const studioCameraCenter = {
          lat: studioPos.lat + 0.00018,
          lng: studioPos.lng,
        };

        const initialCenter =
          CONFIG.mode === 'destination' && destPos ? destPos : studioCameraCenter;

        const requestedMapTypeId =
          CONFIG.viewMode === 'satellite' ? 'hybrid' : 'roadmap';

        const studioZoom = CONFIG.viewMode === 'satellite' ? 18.6 : 17.5;

        const mapOptions = {
          center: initialCenter,
          zoom: CONFIG.mode === 'studio' ? studioZoom : 15,
          mapId: 'DEMO_MAP_ID',
          mapTypeId: requestedMapTypeId,
          controlSize: 24,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
        };

        if (CONFIG.viewMode !== 'satellite') {
          mapOptions.colorScheme = CONFIG.isDark ? ColorScheme.DARK : ColorScheme.LIGHT;
        }

        const map = new Map(document.getElementById('map'), mapOptions);
        const infoWindow = new InfoWindow();

        // Kodak the Fox Studio Mascot Pin ("I am here" · "Come, visit!")
        const studioMarker = new AdvancedMarkerElement({
          map,
          position: studioPos,
          title: CONFIG.studioTitle,
          zIndex: 999,
        });
        studioMarker.append(
          buildMascotPinNode({
            line1: 'I am here',
            line2: 'Come, visit!',
            isDelivery: false,
          })
        );
        studioMarker.addListener('click', () => {
          infoWindow.setContent(buildInfoNode(CONFIG.studioTitle, CONFIG.studioSubtitle));
          infoWindow.open({ anchor: studioMarker, map });
        });

        let routeDrawn = false;

        // Render pre-computed route polyline if supplied by googleMapsService
        if (CONFIG.mode === 'directions' && CONFIG.encodedPolyline) {
          try {
            const { encoding } = await google.maps.importLibrary('geometry');
            const decodedPath = encoding.decodePath(CONFIG.encodedPolyline);
            if (decodedPath && decodedPath.length > 0) {
              const polyline = new Polyline({
                path: decodedPath,
                geodesic: true,
                strokeColor: '#C59A3B',
                strokeOpacity: 0.92,
                strokeWeight: 5,
                map,
              });
              void polyline;
              routeDrawn = true;
            }
          } catch (_err) {
            routeDrawn = false;
          }
        }

        // Resolve delivery destination or route on Web/fallback when coordinates aren't preloaded
        if (
          CONFIG.mode !== 'studio' &&
          ((CONFIG.mode === 'directions' && !routeDrawn) || (!destPos && CONFIG.deliveryAddress))
        ) {
          try {
            const { Route } = await google.maps.importLibrary('routes');
            const routeTarget = destPos || CONFIG.deliveryAddress;
            if (routeTarget) {
              const { routes } = await Route.computeRoutes({
                origin: studioPos,
                destination: routeTarget,
                travelMode: 'DRIVING',
                fields: ['path', 'viewport', 'legs'],
                internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
              });

              if (routes && routes.length > 0) {
                const primaryRoute = routes[0];
                if (!destPos && primaryRoute.legs && primaryRoute.legs.length > 0) {
                  const endLoc = primaryRoute.legs[primaryRoute.legs.length - 1].endLocation;
                  if (endLoc) {
                    destPos = typeof endLoc.toJSON === 'function' ? endLoc.toJSON() : endLoc;
                  }
                } else if (!destPos && primaryRoute.path && primaryRoute.path.length > 0) {
                  const lastPt = primaryRoute.path[primaryRoute.path.length - 1];
                  destPos = typeof lastPt.toJSON === 'function' ? lastPt.toJSON() : lastPt;
                }

                if (CONFIG.mode === 'directions') {
                  const mapPolylines = primaryRoute.createPolylines();
                  mapPolylines.forEach((poly) => {
                    poly.setOptions({
                      strokeColor: '#C59A3B',
                      strokeOpacity: 0.92,
                      strokeWeight: 5,
                    });
                    poly.setMap(map);
                  });
                  routeDrawn = true;
                  if (primaryRoute.viewport) {
                    map.fitBounds(primaryRoute.viewport, 36);
                  }
                }
              }
            }
          } catch (_routeErr) {
            // Fall through gracefully
          }
        }

        // Delivery Destination Mascot Pin
        if (CONFIG.mode !== 'studio' && destPos) {
          const destMarker = new AdvancedMarkerElement({
            map,
            position: destPos,
            title: CONFIG.deliveryAddress || 'Delivery Destination',
          });
          destMarker.append(
            buildMascotPinNode({
              line1: 'Deliver here',
              line2: '',
              isDelivery: true,
            })
          );

          const routeSub = [CONFIG.routeDistance, CONFIG.routeDuration]
            .filter(Boolean)
            .join(' · ');
          const destSubtitle = routeSub
            ? CONFIG.deliveryAddress + ' (' + routeSub + ')'
            : CONFIG.deliveryAddress;

          destMarker.addListener('click', () => {
            infoWindow.setContent(buildInfoNode('Delivery Destination', destSubtitle));
            infoWindow.open({ anchor: destMarker, map });
          });

          if (CONFIG.mode === 'destination') {
            map.setCenter(destPos);
            map.setZoom(CONFIG.viewMode === 'satellite' ? 18.6 : 17.5);
          } else if (CONFIG.mode === 'directions') {
            const bounds = new LatLngBounds();
            bounds.extend(studioPos);
            bounds.extend(destPos);
            map.fitBounds(bounds, 48);
          }
        } else if (CONFIG.mode === 'studio') {
          map.setCenter(studioCameraCenter);
          map.setZoom(studioZoom);
        }
      } catch (_err) {
        showFallback('Could not load interactive map right now.');
      }
    }

    initMap();
  </script>
</body>
</html>`;
}

export default function DeliveryGoogleMap({
  hasScannedPass = false,
  isPickupMode = false,
  studioOnly = false,
  deliveryAddress = '',
  verifiedAddress = '',
  placeId = '',
  latitude = null,
  longitude = null,
  encodedPolyline = '',
  routeDistance = '',
  routeDuration = '',
  staticMapUri = null,
  isDark = false,
  colors,
  cardBorder,
  bannerBg,
  bannerBorder,
  onOpenExternalUrl,
}) {
  const hasCustomerDestination =
    hasScannedPass &&
    !isPickupMode &&
    Boolean(deliveryAddress) &&
    deliveryAddress !== 'Not set by customer' &&
    deliveryAddress !== '—';

  const [selectedTab, setSelectedTab] = useState(null);
  const [viewMode, setViewMode] = useState('roadmap');

  const defaultTab = hasCustomerDestination ? 'destination' : 'studio';
  const activeTab =
    selectedTab === 'studio'
      ? 'studio'
      : selectedTab === 'destination' && hasCustomerDestination
        ? 'destination'
        : selectedTab === 'directions' && hasCustomerDestination
          ? 'directions'
          : defaultTab;

  const publicApiKey = getPublicGoogleMapsKey();
  const hasInteractiveKey = Boolean(publicApiKey);
  const effectiveAddress = verifiedAddress || deliveryAddress || '';
  const isStreetViewSelected = viewMode === 'streetview';

  const mapHtml = useMemo(() => {
    if (!hasInteractiveKey || isStreetViewSelected) return '';
    return buildInteractiveMapsJsDocument({
      apiKey: publicApiKey,
      mode: activeTab,
      viewMode,
      isDark,
      studioCoords: STUDIO_COORDINATES,
      studioTitle: 'E-Kodak Studio Naga',
      studioSubtitle: STUDIO_ORIGIN_ADDRESS,
      deliveryAddress: effectiveAddress,
      destinationLat: latitude,
      destinationLng: longitude,
      encodedPolyline,
      routeDistance,
      routeDuration,
    });
  }, [
    hasInteractiveKey,
    isStreetViewSelected,
    publicApiKey,
    activeTab,
    viewMode,
    isDark,
    effectiveAddress,
    latitude,
    longitude,
    encodedPolyline,
    routeDistance,
    routeDuration,
  ]);

  const mapRenderKey = `${activeTab}:${viewMode}:${isDark ? 'dark' : 'light'}:${latitude ?? ''}:${longitude ?? ''}:${effectiveAddress}:${encodedPolyline ? 'poly' : ''}`;

  const canShowStaticFallback =
    Boolean(staticMapUri) &&
    (activeTab === 'directions' ||
      activeTab === 'destination' ||
      (activeTab === 'studio' && (!hasCustomerDestination || isPickupMode)));

  const studioLinks = buildGoogleMapsLinks({
    address: STUDIO_ORIGIN_ADDRESS,
    latitude: STUDIO_COORDINATES.latitude,
    longitude: STUDIO_COORDINATES.longitude,
    isPickup: true,
  });

  const destLinks = buildGoogleMapsLinks({
    address: effectiveAddress || STUDIO_ORIGIN_ADDRESS,
    placeId,
    latitude,
    longitude,
    isPickup: !hasCustomerDestination,
  });

  const activeExternalUrl =
    activeTab === 'studio'
      ? studioLinks.viewUrl
      : activeTab === 'directions'
        ? destLinks.directionsUrl
        : destLinks.viewUrl;

  const handleSelectTab = (tab) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedTab(tab);
  };

  const handleSelectViewMode = (mode) => {
    Haptics.selectionAsync().catch(() => {});
    setViewMode(mode);
  };

  const placeTabs = [
    { id: 'studio', label: 'Studio', icon: Store, enabled: true },
    { id: 'destination', label: 'Delivery Place', icon: MapPin, enabled: hasCustomerDestination },
    { id: 'directions', label: 'Route', icon: Navigation, enabled: hasCustomerDestination },
  ];

  const viewModeTabs = [
    { id: 'roadmap', label: 'Roadmap', icon: MapIcon },
    { id: 'satellite', label: 'Satellite', icon: Layers },
    { id: 'streetview', label: 'Street View', icon: Compass },
  ];

  return (
    <View style={styles.container}>
      {/* Place Switcher Tabs (omitted when studioOnly is true) */}
      {!studioOnly && (
        <View style={styles.tabsRow}>
          {placeTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const IconComponent = tab.icon;
            const activeBg = isDark ? '#F5E7CE' : '#181410';
            const activeText = isDark ? '#181410' : '#FFFFFF';
            const idleBg = isDark ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF';
            const idleText = isDark ? colors.text.secondary : '#5A5247';

            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.8}
                disabled={!tab.enabled}
                onPress={() => handleSelectTab(tab.id)}
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: isActive ? activeBg : idleBg,
                    borderColor: isActive ? activeBg : cardBorder,
                    opacity: tab.enabled ? 1 : 0.42,
                  },
                ]}
              >
                <IconComponent
                  size={13}
                  color={isActive ? activeText : idleText}
                  strokeWidth={2.1}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? activeText : idleText },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Map View Type Switcher (Roadmap / Satellite / Street View) */}
      <View style={styles.viewModeRow}>
        {viewModeTabs.map((mode) => {
          const isActive = viewMode === mode.id;
          const IconComponent = mode.icon;
          const activeBg = bannerBg || (isDark ? 'rgba(230, 196, 126, 0.22)' : '#F5E7CE');
          const activeBorder = colors?.gold?.DEFAULT || (isDark ? '#E6C47E' : '#C59A3B');
          const activeText = isDark ? '#F5E7CE' : (colors?.gold?.dark || '#5C410D');
          const idleBg = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.72)';
          const idleText = isDark ? colors.text.secondary : '#5A5247';

          return (
            <TouchableOpacity
              key={mode.id}
              activeOpacity={0.8}
              onPress={() => handleSelectViewMode(mode.id)}
              style={[
                styles.viewModePill,
                {
                  backgroundColor: isActive ? activeBg : idleBg,
                  borderColor: isActive ? activeBorder : cardBorder,
                },
              ]}
            >
              <IconComponent
                size={12.5}
                color={isActive ? activeText : idleText}
                strokeWidth={2.1}
              />
              <Text
                style={[
                  styles.viewModeText,
                  { color: isActive ? activeText : idleText },
                ]}
                numberOfLines={1}
              >
                {mode.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Interactive Google Maps JavaScript API / Transparent Street View Notice Viewport */}
      <View
        style={[
          styles.mapViewport,
          {
            borderColor: cardBorder,
            backgroundColor: isDark ? '#181E29' : '#EAEFF5',
          },
        ]}
      >
        {isStreetViewSelected ? (
          <View style={styles.keyPendingState}>
            <View
              style={[
                styles.keyPendingIconWrap,
                { backgroundColor: bannerBg, borderColor: bannerBorder },
              ]}
            >
              <Clock
                size={22}
                color={isDark ? '#E6C47E' : (colors?.gold?.DEFAULT || '#9F7420')}
                strokeWidth={2}
              />
            </View>
            <Text
              style={[
                styles.keyPendingTitle,
                { color: isDark ? colors.text.primary : '#181410' },
              ]}
            >
              Street View Isn&apos;t Available Yet
            </Text>
            <Text
              style={[
                styles.keyPendingHint,
                { color: isDark ? 'rgba(214, 222, 235, 0.80)' : '#5C5448' },
              ]}
            >
              360° Street View is still in development and isn&apos;t available for now. Switch to Satellite or Roadmap to view Kodak on the live map.
            </Text>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => handleSelectViewMode('satellite')}
              style={[
                styles.previewBtn,
                {
                  backgroundColor: isDark ? '#F5E7CE' : '#181410',
                },
              ]}
            >
              <Layers
                size={13}
                color={isDark ? '#181410' : '#FFFFFF'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.previewBtnText,
                  { color: isDark ? '#181410' : '#FFFFFF' },
                ]}
              >
                Switch to Satellite View
              </Text>
            </TouchableOpacity>
          </View>
        ) : hasInteractiveKey && mapHtml ? (
          Platform.OS === 'web' ? (
            React.createElement('iframe', {
              key: mapRenderKey,
              title: 'E-Kodak Studio Interactive Google Map',
              srcDoc: mapHtml,
              width: '100%',
              height: 240,
              style: { border: 0, width: '100%', height: '240px', display: 'block' },
              allowFullScreen: true,
              loading: 'eager',
              referrerPolicy: 'strict-origin-when-cross-origin',
            })
          ) : (
            <WebView
              key={mapRenderKey}
              source={{
                html: mapHtml,
                baseUrl: 'https://ekodak.studio',
              }}
              style={styles.webview}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              nestedScrollEnabled
              startInLoadingState
            />
          )
        ) : canShowStaticFallback ? (
          <Image
            source={{ uri: staticMapUri }}
            style={styles.staticMapImage}
            resizeMode="contain"
            accessibilityLabel="E-Kodak Studio map preview"
          />
        ) : (
          <View style={styles.keyPendingState}>
            <View
              style={[
                styles.keyPendingIconWrap,
                { backgroundColor: bannerBg, borderColor: bannerBorder },
              ]}
            >
              <MapIcon
                size={22}
                color={isDark ? '#E6C47E' : (colors?.gold?.DEFAULT || '#9F7420')}
                strokeWidth={1.9}
              />
            </View>
            <Text
              style={[
                styles.keyPendingTitle,
                { color: isDark ? colors.text.primary : '#181410' },
              ]}
              numberOfLines={2}
            >
              Live Map Waiting for Restart
            </Text>
            <Text
              style={[
                styles.keyPendingHint,
                { color: isDark ? 'rgba(214, 222, 235, 0.78)' : '#5C5448' },
              ]}
            >
              Restart Expo (`npx expo start -c`) so `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` loads Kodak&apos;s interactive map.
            </Text>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => onOpenExternalUrl?.(activeExternalUrl)}
              style={[
                styles.previewBtn,
                {
                  backgroundColor: isDark ? '#F5E7CE' : '#181410',
                },
              ]}
            >
              <MapPin
                size={13}
                color={isDark ? '#181410' : '#FFFFFF'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.previewBtnText,
                  { color: isDark ? '#181410' : '#FFFFFF' },
                ]}
              >
                {activeTab === 'directions'
                  ? 'Preview Route in Google Maps'
                  : 'View Place in Google Maps'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 11.5,
    lineHeight: 15,
  },
  viewModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  viewModePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6.5,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  viewModeText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 11,
    lineHeight: 14,
  },
  mapViewport: {
    width: '100%',
    height: 240,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  staticMapImage: {
    width: '100%',
    height: '100%',
  },
  keyPendingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 8,
  },
  keyPendingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPendingTitle: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 13.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  keyPendingHint: {
    fontFamily: Typography.fontBody,
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
  },
  previewBtn: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  previewBtnText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 12,
    lineHeight: 16,
  },
});
