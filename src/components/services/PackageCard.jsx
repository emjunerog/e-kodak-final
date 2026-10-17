/**
 * PackageCard.jsx
 * ===============
 * PREMIUM PACKAGE DISPLAY CARD — v6
 *
 * Props:
 *  - service {Object} The service data object
 *
 * Overview only: photo samples, category badge, tagline and price range.
 * The package name lives in the page's per-package header directly above, and
 * the sets themselves are rendered below by SetsSectionRenderer.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Star, Zap, Gift, Camera,
  Crown, TrendingDown, Shield, Layers
} from "lucide-react";
import { ease } from "../../lib/motion";
import { Counter } from "../ui/Interactive";

// ── Set color themes (index 0=cheapest → 3=most complete) ────────────────────
// Unified luxury theme: Obsidian, Charcoal, and Champagne Gold (no blue or green)
export const SET_THEMES = [
  {
    border: "border-neutral-200 hover:border-neutral-400",
    header: "bg-neutral-900",
    headerAccent: "text-white",
    label: "Most Affordable",
    labelBg: "bg-white/10 text-neutral-300 border border-white/10",
    icon: TrendingDown,
    priceColor: "text-neutral-900",
    checkBg: "bg-neutral-100",
    checkColor: "text-neutral-700",
    ctaBg: "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm",
    tagBg: "bg-neutral-100",
    tagText: "text-neutral-700",
  },
  {
    border: "border-neutral-200 hover:border-neutral-400",
    header: "bg-neutral-900",
    headerAccent: "text-white",
    label: "Essential",
    labelBg: "bg-white/10 text-neutral-300 border border-white/10",
    icon: Shield,
    priceColor: "text-neutral-900",
    checkBg: "bg-neutral-100",
    checkColor: "text-neutral-700",
    ctaBg: "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm",
    tagBg: "bg-neutral-100",
    tagText: "text-neutral-700",
  },
  {
    border: "border-neutral-300 hover:border-gold/40",
    header: "bg-neutral-950",
    headerAccent: "text-white",
    label: "Best Value",
    labelBg: "bg-gold/15 text-gold border border-gold/25",
    icon: Layers,
    priceColor: "text-neutral-900",
    checkBg: "bg-neutral-100",
    checkColor: "text-neutral-800",
    ctaBg: "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm",
    tagBg: "bg-neutral-100",
    tagText: "text-neutral-800",
  },
  {
    border: "border-gold/60 hover:border-gold shadow-gold",
    header: "bg-neutral-950",
    headerAccent: "text-gold",
    label: "Most Complete",
    labelBg: "bg-gold/20 text-gold border border-gold/30",
    icon: Crown,
    priceColor: "text-primary",
    checkBg: "bg-gold/15",
    checkColor: "text-gold",
    ctaBg: "bg-gradient-to-r from-gold to-gold-light text-primary hover:brightness-105 font-bold shadow-gold",
    tagBg: "bg-gold/10",
    tagText: "text-primary",
  },
];

// ── Category benefit descriptors ─────────────────────────────────────────────
const CATEGORY_BENEFITS = {
  "college-packages": {
    badge: "Most Complete",
    badgeColor: "bg-indigo-600",
    benefits: [
      { icon: Gift,  text: "Free make-up & hair styling included" },
      { icon: Star,  text: "Premium crystal wood framed prints" },
      { icon: Zap,   text: "Best value for full graduation package" },
    ],
    tip: "Perfect for college graduates who want the full experience — framed prints, family shots, and formal portraits all in one.",
  },
  "studio-packages": {
    badge: "Budget Friendly",
    badgeColor: "bg-emerald-600",
    benefits: [
      { icon: Gift,  text: "Free use of Toga included" },
      { icon: Star,  text: "Formal & Tesda passport prints ready" },
      { icon: Zap,   text: "Starts at just ₱795 — most accessible" },
    ],
    tip: "Ideal for students who need formal graduation prints and Tesda requirements without the full package cost.",
  },
  portrait: {
    badge: "Personalized",
    badgeColor: "bg-rose-600",
    benefits: [
      { icon: Gift, text: "Pre-session style consultation" },
      { icon: Star, text: "Multiple outfit changes" },
      { icon: Zap,  text: "Studio or on-location options" },
    ],
    tip: "Our portrait sessions are designed to bring out your authentic personality.",
  },
  event: {
    badge: "Full Coverage",
    badgeColor: "bg-purple-600",
    benefits: [
      { icon: Gift, text: "Arrival to send-off coverage" },
      { icon: Star, text: "Candid & formal shots" },
      { icon: Zap,  text: "Same-day sneak peek (Premium)" },
    ],
    tip: "Complete event photography that documents your celebration from every angle.",
  },
  family: {
    badge: "Timeless",
    badgeColor: "bg-amber-600",
    benefits: [
      { icon: Gift, text: "Guided posing for all ages" },
      { icon: Star, text: "Outdoor or studio setting" },
      { icon: Zap,  text: "Natural, relaxed environment" },
    ],
    tip: "Family sessions that capture genuine connections and candid moments.",
  },
  couple: {
    badge: "Romantic",
    badgeColor: "bg-pink-600",
    benefits: [
      { icon: Gift, text: "Multiple romantic locations" },
      { icon: Star, text: "Artistic editing & color grade" },
      { icon: Zap,  text: "Sunset & golden hour options" },
    ],
    tip: "Couple sessions crafted to reflect your unique love story beautifully.",
  },
  commercial: {
    badge: "Professional",
    badgeColor: "bg-slate-600",
    benefits: [
      { icon: Gift, text: "Brand discovery call included" },
      { icon: Star, text: "Commercial usage license" },
      { icon: Zap,  text: "Custom shot list planning" },
    ],
    tip: "Elevate your brand with photography that communicates quality and trust.",
  },
};

// ── Inline ChevronRight SVG ───────────────────────────────────────────────────
function ChevronRight({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}

// ── Photo Sample Carousel ─────────────────────────────────────────────────────
function PhotoSamples({ images, name }) {
  const [active, setActive] = useState(0);
  if (!images || images.length === 0) return null;

  const go = (delta) =>
    setActive((a) => (a + delta + images.length) % images.length);

  return (
    <div className="group/sample relative h-56 overflow-hidden bg-primary">
      <AnimatePresence initial={false}>
        <motion.img
          key={images[active]}
          src={images[active]}
          alt={`${name} sample ${active + 1}`}
          className="absolute inset-0 w-full h-full object-cover no-drag"
          loading="lazy"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: [1.02, 1.12] }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{
            opacity: { duration: 0.65, ease: ease.smooth },
            scale: { duration: 11, ease: "linear" },
          }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent" />

      {images.length > 1 && (
        <>
          <motion.button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(-1);
            }}
            whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.8)" }}
            whileTap={{ scale: 0.92 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-md transition-all duration-200 hover:border-gold hover:text-gold z-10 cursor-pointer"
            aria-label="Previous photo"
          >
            <ChevronLeft size={18} />
          </motion.button>
          <motion.button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(1);
            }}
            whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.8)" }}
            whileTap={{ scale: 0.92 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-md transition-all duration-200 hover:border-gold hover:text-gold z-10 cursor-pointer"
            aria-label="Next photo"
          >
            <ChevronRight size={18} />
          </motion.button>

          {/* Progress dots with sliding gold pill */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {images.map((img, i) => (
              <motion.button
                key={img}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View sample ${i + 1}`}
                aria-current={i === active}
                animate={{
                  width: i === active ? 22 : 6,
                  backgroundColor: i === active ? "#d4af37" : "rgba(255,255,255,0.5)",
                }}
                whileHover={{ scale: 1.25 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className="h-1.5 rounded-full"
              />
            ))}
          </div>
        </>
      )}

      <motion.span
        initial={{ opacity: 0, scale: 0.6, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.25 }}
        className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm text-white text-[10px] font-body font-medium flex items-center gap-1"
      >
        <Camera size={10} /> Sample Work
      </motion.span>
    </div>
  );
}

// ── Main PackageCard ──────────────────────────────────────────────────────────
export default function PackageCard({ service }) {
  const tiers = service.tiers || [];

  const catInfo = CATEGORY_BENEFITS[service.slug] || CATEGORY_BENEFITS[service.category] || null;

  const samples = service.galleryImages && service.galleryImages.length > 0
    ? service.galleryImages
    : (service.coverImage ? [service.coverImage] : []);

  const prices = tiers.map(t => parseFloat(t.price?.replace(/[₱,]/g, "") || "0")).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  return (
    <article
      id={`service-${service.slug}`}
      className="bg-white rounded-3xl border border-neutral-100 overflow-hidden shadow-warm-md hover:shadow-warm-lg transition-shadow duration-300"
      aria-label={`${service.name} package details`}
    >
      {/* Photo Carousel */}
      <PhotoSamples images={samples} name={service.name} />

      {/* Header Band */}
      <div className="relative overflow-hidden bg-primary px-7 py-5 flex items-start justify-between gap-4">
        <div
          aria-hidden="true"
          className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.09] to-transparent animate-shimmer"
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-body font-bold uppercase tracking-widest text-white/50">
              {service.category}
            </span>
            {catInfo && (
              <span className={`px-2 py-0.5 rounded-full text-white text-[9px] font-bold uppercase tracking-wider ${catInfo.badgeColor}`}>
                {catInfo.badge}
              </span>
            )}
          </div>
          {service.tagline && (
            <p className="font-body text-gold text-sm italic">{service.tagline}</p>
          )}
        </div>
        {minPrice && maxPrice && (
          <div className="relative sm:text-right shrink-0">
            <p className="text-white/50 text-[10px] font-body uppercase tracking-wider mb-0.5">Price range</p>
            <p className="font-heading text-gold text-xl sm:text-2xl font-bold whitespace-nowrap">
              ₱<Counter value={minPrice} duration={1.2} /> – ₱<Counter value={maxPrice} duration={1.6} />
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
