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
 *
 * Motion:
 *  - Badge + headline reveal line-by-line
 *  - Feature rows cascade in with spring-loaded icons
 *  - Phone floats continuously, tilts in 3D and follows the cursor
 *  - Screen rows populate one-by-one, status dot pulses
 *  - A laser sweeps the QR block on loop
 */

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { QrCode, Bell, Image, Activity, CheckCircle2, Smartphone } from "lucide-react";
import { siteConfig } from "../../config/siteConfig";
import { stagger, staggerChild, lineReveal, viewport, ease } from "../../lib/motion";

const canHoverFine = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

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
  // Cursor-driven 3D tilt for the phone mockup (cached rect, fine pointer only)
  const tiltRef = useRef(null);
  const tiltRectRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [10, -10]), { stiffness: 180, damping: 20 });
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-14, 14]), { stiffness: 180, damping: 20 });

  function handlePointerEnter() {
    if (reduceMotion || !canHoverFine() || !tiltRef.current) return;
    tiltRectRef.current = tiltRef.current.getBoundingClientRect();
  }

  function handlePointerMove(event) {
    if (reduceMotion || !canHoverFine()) return;
    const rect = tiltRectRef.current || tiltRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    tiltRectRef.current = rect;
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function handlePointerLeave() {
    tiltRectRef.current = null;
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <section
      className="section-padding bg-neutral-950 overflow-hidden relative"
      aria-labelledby="mobile-heading"
    >
      {/* Static ambient gold haze */}
      <div
        className="absolute -top-24 right-[8%] w-[560px] h-[460px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.10) 0%, transparent 68%)" }}
        aria-hidden="true"
      />

      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* ── Left: Feature List ───────────────────────────────────────── */}
          <motion.div
            variants={stagger(0.08, 0.04)}
            initial="hidden"
            whileInView="show"
            viewport={viewport}
          >
            {/* Badge */}
            <motion.div
              className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/15 border border-gold/25 mb-6 overflow-hidden"
              variants={staggerChild}
            >
              <Smartphone size={14} className="text-gold shrink-0" aria-hidden="true" />
              <span className="relative z-10 font-body text-gold text-xs font-medium uppercase tracking-[0.15em]">
                Mobile Companion — Coming Soon
              </span>
            </motion.div>

            {/* Heading */}
            <span className="block overflow-hidden">
              <motion.h2
                id="mobile-heading"
                className="font-heading text-white text-3xl sm:text-4xl lg:text-display-lg leading-tight mb-4"
                variants={lineReveal}
              >
                Your booking,{" "}
                <span className="text-gold italic" style={{ fontStyle: "italic" }}>
                  always within reach.
                </span>
              </motion.h2>
            </span>

            <motion.p
              className="font-body text-neutral-400 text-base leading-relaxed mb-10"
              variants={staggerChild}
            >
              The {siteConfig.name} mobile companion app puts your entire booking
              experience in your pocket — from QR scanning to photo delivery.
            </motion.p>

            {/* Feature list */}
            <ul className="space-y-6" role="list">
              {mobileFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <motion.li
                    key={feature.title}
                    className="flex items-start gap-4 group"
                    variants={{
                      hidden: { opacity: 0, x: -24 },
                      show: {
                        opacity: 1,
                        x: 0,
                        transition: { duration: 0.45, ease: ease.expo },
                      },
                    }}
                  >
                    <div
                      className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gold/15 text-gold transition-transform duration-300 group-hover:scale-105"
                      aria-hidden="true"
                    >
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="font-heading text-white text-base font-medium mb-1 transition-colors duration-300 group-hover:text-gold-light">
                        {feature.title}
                      </h3>
                      <p className="font-body text-neutral-500 text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>

            {/* Coming soon note */}
            <motion.div
              className="mt-10 flex items-center gap-3 px-5 py-4 rounded-xl border border-gold/20 bg-gold/5 relative overflow-hidden"
              variants={{
                hidden: { opacity: 0, y: 18 },
                show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: ease.expo } },
              }}
            >
              <CheckCircle2 size={18} className="text-gold shrink-0" aria-hidden="true" />
              <p className="font-body text-neutral-400 text-sm relative z-10">
                The mobile companion app is in development as part of this system.
                Available on Android and iOS.
              </p>
            </motion.div>
          </motion.div>

          {/* ── Right: Phone Mockup ──────────────────────────────────────── */}
          <div
            className="flex justify-center"
            ref={tiltRef}
            onPointerEnter={handlePointerEnter}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
          >
            <motion.div
              className="relative w-64 sm:w-72"
              role="img"
              aria-label="Mobile app preview mockup showing booking status screen"
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ duration: 0.55, ease: ease.expo }}
              style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 1100 }}
            >
              {/* Static soft radial aura behind phone (replaces animated blur-3xl) */}
              <div
                className="absolute inset-0 -m-10 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(212,175,55,0.16) 0%, transparent 68%)",
                }}
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
                {/* Camera dot */}
                <span
                  className="absolute top-2.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-neutral-700 z-30"
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
                  <div className="bg-neutral-800 rounded-xl p-4 mb-4 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="w-2 h-2 rounded-full bg-green-400"
                        aria-hidden="true"
                      />
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

                  {/* QR placeholder with compositor laser sweep */}
                  <div className="bg-white rounded-xl p-3 flex flex-col items-center gap-1 relative overflow-hidden">
                    <span
                      className="absolute left-2 right-2 top-2 h-[2px] rounded-full animate-qr-scan"
                      style={{
                        background: "linear-gradient(90deg, transparent, #c9a96e, transparent)",
                        boxShadow: "0 0 8px 1px rgba(201,169,110,0.8)",
                      }}
                      aria-hidden="true"
                    />
                    <QrCode size={52} className="text-primary relative z-10" aria-hidden="true" />
                    <p className="font-body text-neutral-600 text-[9px] text-center uppercase tracking-wider relative z-10">
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
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
