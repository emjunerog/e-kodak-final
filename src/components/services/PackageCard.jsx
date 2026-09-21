/**
 * PackageCard.jsx
 * ===============
 * PREMIUM PACKAGE DISPLAY CARD — v6
 *
 * Props:
 *  - service     {Object}  The service data object
 *  - showTiers   {Boolean} Default true. Pass false to render overview-only
 *                          (no Compare Packages section). Used by Services.jsx
 *                          when sets are rendered independently below.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Check, Clock, MapPin, ArrowRight,
  ChevronLeft, Star, Zap, Gift, Camera,
  Crown, TrendingDown, Shield, Layers
} from "lucide-react";
import { siteConfig } from "../../config/siteConfig";

const HIGHLIGHTS_LIMIT = 6;

// ── Set color themes (index 0=cheapest → 3=most complete) ────────────────────
export const SET_THEMES = [
  {
    border: "border-neutral-300",
    header: "bg-neutral-700",
    headerAccent: "text-white",
    label: "Most Affordable",
    labelBg: "bg-white/15",
    icon: TrendingDown,
    priceColor: "text-neutral-800",
    checkBg: "bg-neutral-100",
    checkColor: "text-neutral-500",
    ctaBg: "bg-neutral-800 text-white hover:bg-neutral-700",
    tagBg: "bg-neutral-100",
    tagText: "text-neutral-700",
  },
  {
    border: "border-blue-200",
    header: "bg-blue-700",
    headerAccent: "text-blue-100",
    label: "Essential",
    labelBg: "bg-white/15",
    icon: Shield,
    priceColor: "text-blue-900",
    checkBg: "bg-blue-50",
    checkColor: "text-blue-600",
    ctaBg: "bg-blue-700 text-white hover:bg-blue-600",
    tagBg: "bg-blue-50",
    tagText: "text-blue-800",
  },
  {
    border: "border-emerald-200",
    header: "bg-emerald-700",
    headerAccent: "text-emerald-100",
    label: "Best Value",
    labelBg: "bg-white/20",
    icon: Layers,
    priceColor: "text-emerald-900",
    checkBg: "bg-emerald-50",
    checkColor: "text-emerald-600",
    ctaBg: "bg-emerald-700 text-white hover:bg-emerald-600",
    tagBg: "bg-emerald-50",
    tagText: "text-emerald-800",
  },
  {
    border: "border-gold",
    header: "bg-primary",
    headerAccent: "text-gold",
    label: "Most Complete",
    labelBg: "bg-gold/20",
    icon: Crown,
    priceColor: "text-primary",
    checkBg: "bg-gold/15",
    checkColor: "text-gold",
    ctaBg: "bg-gold text-primary hover:bg-gold-dark font-bold",
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

  return (
    <div className="relative h-56 overflow-hidden">
      <img
        src={images[active]}
        alt={`${name} sample ${active + 1}`}
        className="w-full h-full object-cover transition-all duration-500"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent" />

      {images.length > 1 && (
        <>
          <button
            onClick={() => setActive(a => (a - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Previous photo"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setActive(a => (a + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Next photo"
          >
            <ChevronRight size={14} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${i === active ? "bg-gold w-5" : "w-1.5 bg-white/50"}`}
                aria-label={`View sample ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      <span className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm text-white text-[10px] font-body font-medium flex items-center gap-1">
        <Camera size={10} /> Sample Work
      </span>
    </div>
  );
}

// ── Standard Tier Card (2–3 tier packages) ────────────────────────────────────
function TierCard({ tier, serviceName }) {
  const [expanded, setExpanded] = useState(false);
  const hasMany = tier.highlights && tier.highlights.length > HIGHLIGHTS_LIMIT;
  const visibleHighlights = expanded || !hasMany
    ? tier.highlights
    : tier.highlights.slice(0, HIGHLIGHTS_LIMIT);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${
        tier.popular
          ? "border-gold bg-gradient-to-b from-gold/10 to-gold/5 shadow-gold"
          : "border-neutral-200 bg-white hover:border-gold/40 hover:shadow-warm-md"
      }`}
    >
      <div className="flex gap-2 mb-3 min-h-[24px]">
        {tier.popular && (
          <span className="px-2.5 py-0.5 rounded-full bg-gold text-primary text-[9px] font-bold uppercase tracking-wider">
            ⭐ Most Popular
          </span>
        )}
        {(tier.name === "Basic") && !tier.popular && (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider">
            💚 Best Value
          </span>
        )}
      </div>

      <p className="font-body text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-1">
        {tier.name}
      </p>
      <p className="font-heading text-4xl font-bold text-primary mb-0.5">
        {tier.price}
      </p>
      <p className="font-body text-neutral-400 text-[11px] mb-5">
        {tier.duration}{tier.edited ? ` · ${tier.edited}` : ""}
      </p>

      <div className="border-t border-dashed border-neutral-200 mb-4" />

      <ul className="space-y-2.5 flex-1 mb-4">
        {visibleHighlights.map((h) => (
          <li key={h} className="flex items-start gap-2.5">
            <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${tier.popular ? "bg-gold/20 text-gold" : "bg-neutral-100 text-neutral-500"}`}>
              ✓
            </span>
            <span className="font-body text-neutral-600 text-sm leading-snug">{h}</span>
          </li>
        ))}
      </ul>

      {hasMany && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-gold text-xs font-body font-semibold mb-4 hover:text-gold-dark transition-colors"
          aria-expanded={expanded}
        >
          {expanded
            ? "↑ Show less"
            : `↓ +${tier.highlights.length - HIGHLIGHTS_LIMIT} more items`}
        </button>
      )}

      <Link
        to={siteConfig.routes.register}
        className={`mt-auto text-center py-3 px-4 rounded-xl text-sm font-body font-semibold transition-all duration-200 active:scale-95 ${
          tier.popular
            ? "bg-gold text-primary hover:bg-gold-dark"
            : "bg-primary text-white hover:bg-primary-light"
        }`}
        aria-label={`Book ${tier.name} ${serviceName}`}
      >
        Book {tier.name}
      </Link>
    </div>
  );
}

// ── Main PackageCard ──────────────────────────────────────────────────────────
// showTiers: when false, renders only the service overview (no package comparison)
export default function PackageCard({ service, showTiers = true }) {
  const tiers = service.tiers || [];
  const tierCount = tiers.length;

  const gridCols =
    tierCount <= 1 ? "lg:grid-cols-1" :
    tierCount === 2 ? "lg:grid-cols-2" :
                      "lg:grid-cols-3";

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
      <div className="bg-primary px-7 py-5 flex items-start justify-between gap-4">
        <div>
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
          <h3 className="font-heading text-white text-2xl font-medium leading-tight mb-1">
            {service.name}
          </h3>
          {service.tagline && (
            <p className="font-body text-gold text-sm italic">{service.tagline}</p>
          )}
        </div>
        {minPrice && maxPrice && (
          <div className="text-right shrink-0">
            <p className="text-white/50 text-[10px] font-body uppercase tracking-wider mb-0.5">Price range</p>
            <p className="font-heading text-gold text-xl font-bold whitespace-nowrap">
              ₱{minPrice.toLocaleString()} – ₱{maxPrice.toLocaleString()}
            </p>
            <p className="text-white/40 text-[10px] font-body mt-0.5">{tierCount} options available</p>
          </div>
        )}
      </div>

      {/* Benefits Strip */}
      {catInfo && (
        <div className="bg-neutral-50 border-b border-neutral-100 px-7 py-4">
          <div className="flex flex-wrap gap-5">
            {catInfo.benefits.map((b) => (
              <div key={b.text} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
                  <b.icon size={11} className="text-gold" />
                </span>
                <span className="font-body text-neutral-600 text-xs">{b.text}</span>
              </div>
            ))}
          </div>
          {catInfo.tip && (
            <p className="font-body text-neutral-400 text-xs italic mt-2">{catInfo.tip}</p>
          )}
        </div>
      )}

      {/* Card Body */}
      <div className="p-7">
        <p className="font-body text-neutral-500 text-sm leading-relaxed mb-5">
          {service.description}
        </p>

        {(service.turnaround || service.location) && (
          <div className="flex flex-wrap gap-4 py-3 border-y border-neutral-100 mb-6 text-xs font-body text-neutral-500">
            {service.turnaround && (
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-gold" />
                {service.turnaround} turnaround
              </span>
            )}
            {service.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-gold" />
                {service.location}
              </span>
            )}
          </div>
        )}

        {service.inclusions && service.inclusions.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-gold/5 border border-gold/15">
            <p className="font-body text-xs font-bold uppercase tracking-[0.15em] text-gold mb-3">
              ✨ All packages include
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {service.inclusions.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check size={11} className="text-gold shrink-0 mt-1" />
                  <span className="font-body text-neutral-700 text-xs leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
          <span className="text-xl shrink-0">💰</span>
          <div>
            <p className="font-body text-amber-900 text-xs font-semibold">Payment Policy</p>
            <p className="font-body text-amber-700 text-xs">50% down payment required upon booking to secure your slot.</p>
          </div>
        </div>

        {/* ── Tier Comparison (only when showTiers is true) ─────────────────── */}
        {showTiers && tierCount > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <p className="font-body text-xs font-bold uppercase tracking-[0.15em] text-neutral-400">
                Choose your package
              </p>
              <div className="flex-1 h-px bg-neutral-100" />
              <span className="font-body text-neutral-400 text-[10px]">{tierCount} options</span>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-5`}>
              {tiers.map((tier) => (
                <TierCard key={tier.name} tier={tier} serviceName={service.name} />
              ))}
            </div>
          </div>
        )}

        {/* When sets are shown externally — show a scroll-down hint */}
        {!showTiers && tierCount > 0 && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-200">
            <div>
              <p className="font-body text-neutral-700 text-sm font-semibold">
                {tierCount} package sets available below ↓
              </p>
              <p className="font-body text-neutral-400 text-xs mt-0.5">
                Each set is displayed with its full details and comparison table
              </p>
            </div>
            <span className="shrink-0 px-3 py-1.5 rounded-full bg-gold/10 text-gold text-xs font-body font-bold">
              ₱{minPrice?.toLocaleString()} – ₱{maxPrice?.toLocaleString()}
            </span>
          </div>
        )}

        <div className="mt-7 pt-5 border-t border-neutral-100 flex items-center justify-between">
          <p className="font-body text-neutral-400 text-xs">Need something custom?</p>
          <Link
            to={siteConfig.routes.contact}
            className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-gold hover:text-gold-dark transition-colors"
          >
            Contact us <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
