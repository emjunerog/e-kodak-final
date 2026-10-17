/**
 * SetsSectionRenderer.jsx
 * =======================
 * Renders a package's individual sets/tiers (1–4 per package) as a responsive
 * grid of cards — each with its full inclusions list, price and Book CTA.
 * The "popular" tier carries the gold Most Popular badge.
 *
 * Rendered BELOW the parent PackageCard overview.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Check, ArrowRight, X, Sparkles, CreditCard,
  Frame, Image, GraduationCap, Shirt, Users, Camera
} from "lucide-react";
import { SET_THEMES } from "./PackageCard";
import {
  stagger,
  staggerChild,
  fadeUp,
  riseRotate,
  pop,
} from "../../lib/motion";
import { Magnetic, Spotlight, Counter } from "../ui/Interactive";

// ── Theme index mapping by tier count and position (hierarchy: Set A → Set D) ─
function getThemeIndex(position, totalCount) {
  const maps = {
    1: [3],
    2: [3, 2],
    3: [3, 2, 0],
    4: [3, 2, 1, 0],
  };
  const map = maps[Math.min(totalCount, 4)] || maps[4];
  return map[Math.min(position, map.length - 1)];
}

function toNumber(price) {
  const n = parseFloat(String(price || "").replace(/[₱,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// ── Semantic icon & typography mapping for inclusions ─────────────────────────
function getInclusionMeta(text) {
  const lower = text.toLowerCase();

  // Negative inclusions (e.g., "No free make up")
  if (lower.includes("no free") || lower.startsWith("no ") || lower.includes("without make up")) {
    return {
      Icon: X,
      iconColor: "text-neutral-400",
      bgColor: "bg-neutral-100",
      textColor: "text-neutral-400 line-through decoration-neutral-300",
      isNegative: true,
    };
  }

  // Free makeup / hair styling
  if (lower.includes("make up") || lower.includes("hair style") || lower.includes("make-up")) {
    return {
      Icon: Sparkles,
      iconColor: "text-amber-600",
      bgColor: "bg-amber-500/10",
      textColor: "text-neutral-900 font-medium",
    };
  }

  // Crystal wood frames & portraits
  if (lower.includes("crystal") || (lower.includes("frame") && !lower.includes("without frame"))) {
    return {
      Icon: Frame,
      iconColor: "text-amber-700",
      bgColor: "bg-amber-50",
      textColor: "text-neutral-900 font-medium",
    };
  }

  // Graduation cap / toga
  if (lower.includes("toga") || lower.includes("cap") || lower.includes("graduat")) {
    return {
      Icon: GraduationCap,
      iconColor: "text-neutral-700",
      bgColor: "bg-neutral-100",
      textColor: "text-neutral-800",
    };
  }

  // Filipiniana / Barong / Formal attire
  if (lower.includes("pilipiñ") || lower.includes("filipin") || lower.includes("barong") || lower.includes("attire")) {
    return {
      Icon: Shirt,
      iconColor: "text-neutral-700",
      bgColor: "bg-neutral-100",
      textColor: "text-neutral-800",
    };
  }

  // Family portraits
  if (lower.includes("family") || lower.includes("group")) {
    return {
      Icon: Users,
      iconColor: "text-neutral-700",
      bgColor: "bg-neutral-100",
      textColor: "text-neutral-800 font-medium",
    };
  }

  // Identification prints (Tesda, Passport, 2x2, 1x1)
  if (lower.includes("passport") || lower.includes("tesda") || lower.includes("2x2") || lower.includes("1x1") || lower.includes("i.d")) {
    return {
      Icon: CreditCard,
      iconColor: "text-neutral-600",
      bgColor: "bg-neutral-100",
      textColor: "text-neutral-700",
    };
  }

  // Media, Camera, Video, Delivery
  if (lower.includes("camera") || lower.includes("video") || lower.includes("movie") || lower.includes("mtv") || lower.includes("usb") || lower.includes("drive")) {
    return {
      Icon: Camera,
      iconColor: "text-neutral-700",
      bgColor: "bg-neutral-100",
      textColor: "text-neutral-800",
    };
  }

  // Photo prints & sizes
  if (lower.includes("size") || lower.includes("wallet") || lower.includes("print") || lower.includes("colored") || lower.includes("8x10") || lower.includes("12x18") || lower.includes("10x12") || lower.includes("soft copies")) {
    return {
      Icon: Image,
      iconColor: "text-neutral-600",
      bgColor: "bg-neutral-100",
      textColor: "text-neutral-700",
    };
  }

  return {
    Icon: Check,
    iconColor: "text-gold",
    bgColor: "bg-gold/10",
    textColor: "text-neutral-700",
  };
}

// ── Individual Tier/Set Card (2-Column Balanced Layout) ───────────────────────
function TierSectionCard({ tier, themeIndex, serviceName, serviceSlug }) {
  const theme = SET_THEMES[themeIndex] || SET_THEMES[0];
  const ThemeIcon = theme.icon;
  const amount = toNumber(tier.price);
  const highlights = tier.highlights || [];

  const accent = tier.popular
    ? "border-gold shadow-gold ring-1 ring-gold/40"
    : theme.border;

  return (
    <motion.article
      variants={riseRotate(0, 56)}
      className={`group relative rounded-3xl border-2 overflow-hidden bg-white transition-all duration-300 hover:shadow-warm-lg flex flex-col h-full self-stretch ${accent}`}
      aria-label={`${serviceName} — ${tier.name}`}
    >
      {/* Cursor spotlight on hover */}
      <Spotlight
        className="h-full w-full flex-1 flex flex-col justify-between"
        innerClassName="h-full w-full flex-1 flex flex-col justify-between"
        color={tier.popular ? "rgba(212,175,55,0.16)" : "rgba(17,24,39,0.05)"}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className={`${theme.header} px-6 py-5 sm:px-7 sm:py-6 relative overflow-hidden shrink-0 min-h-[116px] flex flex-col justify-between`}>
          {/* Cinematic sheen sweep */}
          <div
            className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/12 to-transparent animate-shimmer"
            aria-hidden="true"
          />
          {tier.popular && (
            <div
              className="absolute -top-16 -right-10 w-44 h-44 rounded-full bg-gold/25 blur-2xl animate-halo"
              aria-hidden="true"
            />
          )}

          <div className="relative flex items-start justify-between gap-4">
            {/* Left: badges + tier name */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                {!tier.popular && (
                  <motion.span
                    variants={pop}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${theme.labelBg}`}
                  >
                    <ThemeIcon size={11} />
                    {theme.label}
                  </motion.span>
                )}
                {tier.popular && (
                  <motion.span
                    variants={pop}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold text-primary text-[10px] font-bold uppercase tracking-wider shadow-sm"
                  >
                    <Sparkles size={10} />
                    Most Popular
                  </motion.span>
                )}
              </div>
              <h4 className={`font-heading text-3xl sm:text-4xl font-bold ${theme.headerAccent} leading-tight`}>
                {tier.name}
              </h4>
            </div>

            {/* Right: price */}
            <div className="text-right shrink-0">
              <p className="text-white/50 font-body text-[10px] uppercase tracking-wider mb-0.5">
                Package Price
              </p>
              <p className={`font-heading text-3xl sm:text-4xl font-bold leading-none ${theme.headerAccent}`}>
                {amount !== null ? (
                  <>
                    ₱<Counter value={amount} duration={1.4} />
                  </>
                ) : (
                  tier.price
                )}
              </p>
              {tier.edited && (
                <p className="text-white/50 font-body text-[11px] mt-1">{tier.edited}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
          <div className="min-w-0 flex-1 flex flex-col">
            <p className="font-body text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-3.5">
              What's included · {highlights.length} items
            </p>

            {highlights.length > 0 ? (
              <motion.ul
                className={highlights.length >= 8 ? "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2" : "space-y-2"}
                variants={stagger(0.04, 0.15)}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
              >
                {highlights.map((h) => {
                  const meta = getInclusionMeta(h);
                  return (
                    <motion.li
                      key={h}
                      variants={staggerChild}
                      className="flex items-center gap-2.5 py-1 px-1.5 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      <span
                        className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${meta.bgColor}`}
                        aria-hidden="true"
                      >
                        <meta.Icon size={12} className={meta.iconColor} strokeWidth={2.2} />
                      </span>
                      <span className={`font-body text-xs sm:text-[13px] leading-snug tracking-tight antialiased ${meta.textColor}`}>
                        {h}
                      </span>
                    </motion.li>
                  );
                })}
              </motion.ul>
            ) : (
              <p className="font-body text-neutral-400 text-sm italic">No inclusions listed.</p>
            )}
          </div>

          {/* Card Footer — down payment note + CTA (Equalized Baseline) */}
          <div className="mt-auto pt-4 border-t border-dashed border-neutral-200 shrink-0">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-[11px] font-body text-neutral-500">
                <span className="inline-flex items-center gap-1 text-gold font-semibold">
                  <CreditCard size={12} /> 50% down payment
                </span>
                <span>Balance on shoot day</span>
              </div>
              <Magnetic strength={0.25} pull={1.04} className="w-full">
                <Link
                  to={`/dashboard/book?service=${serviceSlug}&tier=${encodeURIComponent(tier.name)}`}
                  className={`group/btn w-full h-12 inline-flex items-center justify-center gap-2 px-5 rounded-xl text-xs sm:text-sm font-body font-semibold transition-all duration-300 active:scale-95 whitespace-nowrap shadow-sm ${theme.ctaBg}`}
                  aria-label={`Book ${tier.name} — ${serviceName}`}
                >
                  Book {tier.name}
                  <ArrowRight
                    size={14}
                    className="transition-transform duration-300 group-hover/btn:translate-x-1"
                  />
                </Link>
              </Magnetic>
            </div>
          </div>
        </div>
      </Spotlight>
    </motion.article>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function SetsSectionRenderer({ service }) {
  const tiers = service.tiers || [];
  if (tiers.length === 0) return null;

  // Hierarchy first: Set A → Set B → Set C → Set D
  const sorted = [...tiers].sort((a, b) => {
    return a.name.trim().localeCompare(b.name.trim());
  });

  const gridClass =
    sorted.length === 1
      ? "grid-cols-1 max-w-xl mx-auto"
      : "grid-cols-1 md:grid-cols-2";

  return (
    <motion.div
      id={`sets-${service.slug}`}
      className="space-y-5 scroll-mt-[calc(var(--nav-h)_+_var(--viewing-h)_+_24px)]"
      variants={stagger(0.14, 0.05)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {/* Section label */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <motion.div
          className="w-1 h-8 bg-gold rounded-full shrink-0 origin-top"
          variants={{
            hidden: { scaleY: 0, opacity: 0 },
            show: {
              scaleY: 1,
              opacity: 1,
              transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
            },
          }}
        />
        <div>
          <h3 className="font-heading text-primary text-xl font-semibold leading-snug">
            Available Sets
          </h3>
        </div>
        <div className="hidden sm:flex-1 h-px bg-gradient-to-r from-neutral-200 to-transparent ml-2" />
      </motion.div>

      {/* Individual tier/set cards — 2-column layout with equalized row heights */}
      <div className={`grid ${gridClass} gap-6 items-stretch auto-rows-fr`}>
        {sorted.map((tier, i) => (
          <TierSectionCard
            key={tier.name}
            tier={tier}
            themeIndex={getThemeIndex(i, sorted.length)}
            serviceName={service.name}
            serviceSlug={service.slug}
          />
        ))}
      </div>
    </motion.div>
  );
}
