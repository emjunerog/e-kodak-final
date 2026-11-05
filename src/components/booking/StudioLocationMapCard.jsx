import React, { useState, useRef, useEffect } from "react";
import {
  MapPin,
  Clock,
  Phone,
  Navigation,
  ExternalLink,
  Compass,
  Map,
  Layers,
  Footprints,
} from "lucide-react";

export default function StudioLocationMapCard({
  studioName = "E-Kodak Studio Naga",
  address = "331 Rizal Street, City of Naga, Cebu, 6037",
  className = "",
}) {
  // Exact Placemark Coordinates: 10.2080704, 123.7560338
  const STUDIO_LAT = 10.2080704;
  const STUDIO_LNG = 123.7560338;

  // Street View is the DEFAULT active view, calibrated to face the studio building directly
  const [mapView, setMapView] = useState("streetview");

  // Drag detection for Street View (hides banner initially; reveals when drag/interaction begins)
  const [hasDragged, setHasDragged] = useState(false);
  const isOverMapRef = useRef(false);
  const iframeRef = useRef(null);
  const fadeTimerRef = useRef(null);

  useEffect(() => {
    const handleBlur = () => {
      // If window blurs while the user is over the map container,
      // or activeElement is our iframe, user interacted/dragged Street View
      if (isOverMapRef.current || (iframeRef.current && document.activeElement === iframeRef.current)) {
        setHasDragged(true);
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      }
    };

    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  const handleMapMouseEnter = () => {
    isOverMapRef.current = true;
  };

  const handleMapMouseLeave = () => {
    isOverMapRef.current = false;
    // When leaving map area after interacting, gently fade badge out after 4s of inactivity
    if (hasDragged) {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = setTimeout(() => {
        setHasDragged(false);
      }, 4000);
    }
  };

  const handleTouchStart = () => {
    isOverMapRef.current = true;
    setHasDragged(true);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
  };

  // Construct iframe embed URL with calibrated angle (heading 82°, pitch 14°)
  const getMapEmbedUrl = () => {
    switch (mapView) {
      case "satellite":
        // High-resolution satellite view with red pin marker dropped at exact coordinates
        return `https://maps.google.com/maps?q=${STUDIO_LAT},${STUDIO_LNG}&t=k&z=19&output=embed`;
      case "map":
        // Vector roadmap with red pin marker dropped at exact coordinates
        return `https://maps.google.com/maps?q=${STUDIO_LAT},${STUDIO_LNG}&t=m&z=18&output=embed`;
      case "streetview":
      default:
        // Native Google Street View 360° panorama: heading 195° and pitch 8° directly framing the Rafael Orbigoso Studio building facade
        return `https://www.google.com/maps/embed?origin=mfe&pb=!6m7!1m6!2m2!1d${STUDIO_LAT}!2d${STUDIO_LNG}!3f195!4f8!5f1`;
    }
  };

  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${STUDIO_LAT},${STUDIO_LNG}`;

  const isStreetView = mapView === "streetview";

  return (
    <div
      className={`rounded-3xl border border-neutral-200/90 bg-white p-5 sm:p-6 lg:p-7 shadow-2xs space-y-5 select-none ${className}`}
    >
      {/* 2-Column Responsive Shared Card Layout */}
      <div className="grid lg:grid-cols-12 gap-5 lg:gap-7 items-stretch">
        {/* ── LEFT SIDE: Official Studio Location (Texts Only) ── */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          {/* Studio Name & Address */}
          <div className="pb-3.5">
            <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-neutral-950 tracking-tight">
              {studioName}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-800 font-semibold font-body flex items-start gap-1.5 mt-1.5">
              <MapPin size={15} className="text-red-500 fill-red-500 shrink-0 mt-0.5" />
              <span>{address}</span>
            </p>
          </div>

          {/* Structured Specifications & Operating Parameters (Evenly balances vertical space) */}
          <div className="flex-1 rounded-2xl bg-neutral-50/90 border border-neutral-200/80 p-4 sm:p-5 flex flex-col justify-between text-xs font-body my-1">
            {/* Operating Hours */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-gold flex items-center justify-center shrink-0 mt-0.5">
                <Clock size={15} className="text-gold" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-neutral-900 block text-xs">Operating Hours</span>
                <span className="text-neutral-600 font-medium block mt-0.5">Monday – Friday: 8:00 AM – 5:00 PM</span>
                <span className="text-neutral-400 block text-[11px] mt-0.5">Closed on Weekends (Saturday &amp; Sunday)</span>
              </div>
            </div>

            <div className="border-t border-neutral-200/70 my-2"></div>

            {/* Contact */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-gold flex items-center justify-center shrink-0 mt-0.5">
                <Phone size={15} className="text-gold" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-neutral-900 block text-xs">Contact</span>
                <span className="text-neutral-600 font-medium block mt-0.5">+63 917 123 4567</span>
                <span className="text-neutral-500 block text-[11px] mt-0.5">contact@e-kodak.com</span>
              </div>
            </div>

            <div className="border-t border-neutral-200/70 my-2"></div>

            {/* Landmarks & Parking */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-gold flex items-center justify-center shrink-0 mt-0.5">
                <Navigation size={15} className="text-gold" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-neutral-900 block text-xs">Landmarks &amp; Parking</span>
                <span className="text-neutral-600 font-medium block mt-0.5 leading-relaxed">
                  Central Poblacion, near Exceed Learning Center &amp; Boardwalk
                </span>
                <span className="text-emerald-700 font-semibold block text-[11px] mt-0.5">
                  ✓ Free customer parking available
                </span>
              </div>
            </div>
          </div>

          {/* Action Link to Google Maps */}
          <div className="pt-3">
            <a
              href={googleMapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-neutral-950 hover:bg-black text-white hover:text-gold border border-gold/30 shadow-xs transition-all cursor-pointer group"
            >
              <span>Open in Google Maps App</span>
              <ExternalLink size={13} className="opacity-75" />
            </a>
          </div>
        </div>

        {/* ── RIGHT SIDE: Interactive Map with View Selector ── */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
          {/* Map Header & View Mode Switcher */}
          <div className="w-full flex items-center justify-between gap-2.5 pb-1">
            <div className="flex items-center gap-2 min-w-0">
              <Compass size={16} className="text-gold shrink-0" />
              <span className="font-heading font-extrabold text-xs sm:text-sm text-neutral-900 tracking-tight truncate">
                Studio Street View &amp; Map
              </span>
            </div>

            {/* Organized View Selector Navigation Pills (Stays strictly on the right edge) */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-2xl border border-neutral-200/80 ml-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMapView("streetview");
                  setHasDragged(false);
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  mapView === "streetview"
                    ? "bg-neutral-950 text-gold shadow-xs border border-gold/40 scale-102"
                    : "text-neutral-600 hover:text-neutral-950 hover:bg-white/60"
                }`}
              >
                <Footprints size={13} className={mapView === "streetview" ? "text-gold" : "text-neutral-500"} />
                <span>Street View</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMapView("map");
                  setHasDragged(false);
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  mapView === "map"
                    ? "bg-neutral-950 text-gold shadow-xs border border-gold/40 scale-102"
                    : "text-neutral-600 hover:text-neutral-950 hover:bg-white/60"
                }`}
              >
                <Map size={13} className={mapView === "map" ? "text-gold" : "text-neutral-500"} />
                <span>Roadmap</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMapView("satellite");
                  setHasDragged(false);
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  mapView === "satellite"
                    ? "bg-neutral-950 text-gold shadow-xs border border-gold/40 scale-102"
                    : "text-neutral-600 hover:text-neutral-950 hover:bg-white/60"
                }`}
              >
                <Layers size={13} className={mapView === "satellite" ? "text-gold" : "text-neutral-500"} />
                <span>Satellite</span>
              </button>
            </div>
          </div>

          {/* Interactive Street View & Map Viewport (Cropped to hide Google top card and terms footer) */}
          <div
            onMouseEnter={handleMapMouseEnter}
            onMouseLeave={handleMapMouseLeave}
            onTouchStart={handleTouchStart}
            className="relative w-full flex-1 min-h-[320px] sm:min-h-[360px] rounded-2xl overflow-hidden border border-neutral-200/90 shadow-inner bg-neutral-900"
          >
            {/* Clean E-Kodak Street Address & Location Pin Badge: White background, black text */}
            <div className="absolute top-3.5 left-3.5 z-10 pointer-events-none">
              <div className="px-3.5 py-1.5 rounded-full bg-white/95 text-neutral-900 backdrop-blur-md border border-neutral-200/90 shadow-md flex items-center gap-1.5 text-xs font-bold tracking-tight">
                <MapPin size={13} className="text-red-500 fill-red-500 shrink-0" />
                <span>331 Rizal St, Naga, Central Visayas</span>
              </div>
            </div>

            {/* User Guidance Banner on Street View (Appears if drag is detected; White background, black text) */}
            {isStreetView && (
              <div
                className={`absolute bottom-3.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none max-w-[95%] transition-all duration-300 ease-out ${
                  hasDragged
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 translate-y-2 scale-95 pointer-events-none"
                }`}
              >
                <div className="px-3.5 py-1.5 rounded-full bg-white/95 text-neutral-900 backdrop-blur-md border border-neutral-200/90 shadow-md flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-wide whitespace-nowrap">
                  <Navigation size={12} className="text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">Drag to explore 360° • Rafael Orbigoso Studio Bldg.</span>
                  <span className="sm:hidden">Drag 360° • Rafael Orbigoso Bldg.</span>
                </div>
              </div>
            )}

            <iframe
              ref={iframeRef}
              key={mapView}
              title={`E-Kodak Studio Location - ${mapView}`}
              className="absolute border-0 w-full"
              style={
                isStreetView
                  ? {
                      top: "-96px",
                      left: 0,
                      right: 0,
                      height: "calc(100% + 155px)",
                    }
                  : {
                      top: "-115px",
                      left: 0,
                      right: 0,
                      height: "calc(100% + 155px)",
                    }
              }
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={getMapEmbedUrl()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
