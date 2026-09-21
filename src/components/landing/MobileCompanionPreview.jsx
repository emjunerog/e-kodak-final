/**
 * MobileCompanionPreview.jsx
 * ==========================
 * MOBILE APP PROMOTIONAL SECTION
 *
 * Presents the FUTURE mobile companion application.
 * This is purely a landing-page marketing section — no mobile app exists yet.
 * The mobile app will be built in Phase 16+ of the development roadmap.
 *
 * What it communicates:
 *  - Customers can scan their QR code on mobile
 *  - Real-time booking status updates
 *  - Notification delivery
 *  - Photo gallery access on mobile
 *
 * Design:
 *  - Split layout: feature list on left, phone mockup on right
 *  - Gold accent on dark background
 *  - Feature items with check icons
 *  - "Coming Soon" or "Download Coming Soon" CTA
 *
 * Phone mockup: CSS-drawn phone frame (no external image needed)
 * This avoids needing a real app screenshot before the app is built.
 */

import { QrCode, Bell, Image, Activity, CheckCircle2, Smartphone } from "lucide-react";
import { useScrollReveal } from "../../lib/useScrollReveal";
import { siteConfig } from "../../config/siteConfig";

const mobileFeatures = [
  {
    icon: QrCode,
    title: "Scan Your Booking QR",
    description: "Every booking gets a unique QR code. Scan it on your phone for instant access to your booking details.",
  },
  {
    icon: Activity,
    title: "Live Status Updates",
    description: "See real-time changes to your booking status — no need to call or follow up manually.",
  },
  {
    icon: Bell,
    title: "Instant Notifications",
    description: "Receive push notifications when your booking is confirmed, your session starts, or your photos are ready.",
  },
  {
    icon: Image,
    title: "Access Your Gallery",
    description: "View and download your completed photography outputs securely from your phone — anytime, anywhere.",
  },
];

// Phone mockup screen content items (simulated UI)
const mockScreenItems = [
  { label: "Booking Status",   value: "Confirmed ✓", color: "text-green-400" },
  { label: "Photographer",     value: "Assigned",     color: "text-blue-400" },
  { label: "Session Date",     value: "Oct 15, 2026", color: "text-gold" },
  { label: "Photos Ready",     value: "Uploading...", color: "text-yellow-400" },
];

export default function MobileCompanionPreview() {
  const { ref: leftRef,  inView: leftIn  } = useScrollReveal();
  const { ref: rightRef, inView: rightIn } = useScrollReveal({ threshold: 0.1 });

  return (
    <section
      className="section-padding bg-neutral-950 overflow-hidden"
      aria-labelledby="mobile-heading"
    >
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* ── Left: Feature List ───────────────────────────────────────── */}
          <div
            ref={leftRef}
            className={`
              transition-all duration-700 ease-smooth
              ${leftIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
            `}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/15 border border-gold/25 mb-6">
              <Smartphone size={14} className="text-gold" aria-hidden="true" />
              <span className="font-body text-gold text-xs font-medium uppercase tracking-[0.15em]">
                Mobile Companion — Coming Soon
              </span>
            </div>

            {/* Heading */}
            <h2
              id="mobile-heading"
              className="font-heading text-white text-3xl sm:text-4xl lg:text-5xl leading-tight mb-4"
            >
              Your booking,{" "}
              <span className="text-gold italic" style={{ fontStyle: "italic" }}>
                always within reach.
              </span>
            </h2>

            <p className="font-body text-neutral-400 text-base leading-relaxed mb-10">
              The {siteConfig.name} mobile companion app puts your entire booking
              experience in your pocket — from QR scanning to photo delivery.
            </p>

            {/* Feature list */}
            <ul className="space-y-6" role="list">
              {mobileFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <li
                    key={feature.title}
                    className="flex items-start gap-4"
                    style={{ transitionDelay: `${index * 80}ms` }}
                  >
                    {/* Icon */}
                    <div
                      className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gold/15 text-gold"
                      aria-hidden="true"
                    >
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="font-heading text-white text-base font-medium mb-1">
                        {feature.title}
                      </h3>
                      <p className="font-body text-neutral-500 text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Coming soon note */}
            <div className="mt-10 flex items-center gap-3 px-5 py-4 rounded-xl border border-gold/20 bg-gold/5">
              <CheckCircle2 size={18} className="text-gold shrink-0" aria-hidden="true" />
              <p className="font-body text-neutral-400 text-sm">
                The mobile companion app is in development as part of this system.
                Available on Android and iOS.
              </p>
            </div>
          </div>

          {/* ── Right: Phone Mockup ──────────────────────────────────────── */}
          <div
            ref={rightRef}
            className={`
              flex justify-center
              transition-all duration-700 ease-smooth delay-200
              ${rightIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}
            `}
          >
            {/* Phone frame — CSS drawn, no image needed */}
            <div
              className="relative w-64 sm:w-72"
              role="img"
              aria-label="Mobile app preview mockup showing booking status screen"
            >
              {/* Glow effect behind phone */}
              <div
                className="absolute inset-0 -m-8 rounded-full bg-gold/10 blur-3xl"
                aria-hidden="true"
              />

              {/* Phone body */}
              <div
                className="
                  relative z-10
                  bg-neutral-900 border-[3px] border-neutral-700
                  rounded-[2.5rem] overflow-hidden
                  shadow-warm-xl
                "
                style={{ paddingTop: "2rem", paddingBottom: "1.5rem" }}
              >
                {/* Notch */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-neutral-900 rounded-b-2xl border-b-2 border-x-2 border-neutral-700 z-20"
                  aria-hidden="true"
                />

                {/* Screen content */}
                <div className="px-5 pt-6 pb-4">
                  {/* App header */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="font-body text-neutral-400 text-[10px] uppercase tracking-[0.15em]">
                        {siteConfig.name}
                      </p>
                      <p className="font-heading text-white text-sm font-medium">
                        My Booking
                      </p>
                    </div>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold/20">
                      <Bell size={13} className="text-gold" />
                    </div>
                  </div>

                  {/* Booking status card */}
                  <div className="bg-neutral-800 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
                      <span className="font-body text-green-400 text-[10px] font-medium uppercase tracking-wider">
                        Active Booking
                      </span>
                    </div>
                    <p className="font-heading text-white text-sm mb-1">Portrait Session</p>
                    <p className="font-body text-neutral-500 text-[11px]">Booking #EK-2026-4821</p>
                  </div>

                  {/* Status list */}
                  <div className="space-y-2 mb-5">
                    {mockScreenItems.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0"
                      >
                        <span className="font-body text-neutral-500 text-[11px]">
                          {item.label}
                        </span>
                        <span className={`font-body text-[11px] font-medium ${item.color}`}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* QR placeholder */}
                  <div className="bg-white rounded-xl p-3 flex flex-col items-center gap-1">
                    <QrCode size={52} className="text-primary" aria-hidden="true" />
                    <p className="font-body text-neutral-600 text-[9px] text-center uppercase tracking-wider">
                      Tap to scan booking QR
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom pill indicator */}
              <div
                className="absolute bottom-3 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-neutral-600"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
