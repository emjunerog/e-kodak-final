/**
 * Hero.jsx
 * ========
 * FULL-VIEWPORT HERO SECTION
 *
 * The most important section of the landing page.
 * First thing visitors see — must immediately communicate:
 *  1. What the business does
 *  2. Why they should care
 *  3. What they can do next
 *
 * Design:
 *  - Full-screen photography background image
 *  - Dark gradient overlay for text readability
 *  - Editorial serif headline (Playfair Display)
 *  - Two CTAs: "Book a Session" (primary) + "Explore Services" (ghost)
 *  - Subtle scroll indicator
 *  - Staggered fade-up animation on load
 *
 * Image: Unsplash placeholder — replace with real studio photography before launch.
 * Update the image URL in the `heroImage` variable below.
 */

import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight } from "lucide-react";
import { siteConfig } from "../../config/siteConfig";

// ─── PLACEHOLDER IMAGE — Replace before launch ──────────────────────────────
// Source: Unsplash (free for development use)
// To replace: change this URL to your actual hero image path or URL
const heroImage =
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=1920&q=85&auto=format&fit=crop";

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-label="Hero section"
    >
      {/* ── Background Image ──────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Professional photography session — photographer working with a camera"
          className="w-full h-full object-cover object-center no-drag"
          loading="eager"
          fetchPriority="high"
        />
        {/* Dark gradient overlay — bottom heavier for text readability */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/75"
          aria-hidden="true"
        />
        {/* Subtle warm color cast at the bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-primary/60 to-transparent"
          aria-hidden="true"
        />
      </div>

      {/* ── Hero Content ──────────────────────────────────────────────────── */}
      <div className="relative z-10 container-custom text-center text-white">

        {/* Eyebrow label */}
        <p
          className="
            font-body text-gold-light text-xs uppercase tracking-[0.3em]
            mb-6 opacity-0 animate-fade-in
          "
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          {siteConfig.shortDescription}
        </p>

        {/* Main Headline — split into two lines for visual rhythm */}
        <h1
          className="
            font-heading text-white
            text-4xl sm:text-5xl md:text-6xl lg:text-display-xl xl:text-display-2xl
            leading-[1.08] tracking-tight text-balance
            mb-6
            opacity-0 animate-fade-up
          "
          style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
        >
          Moments Worth
          <br />
          <em className="not-italic text-gold-light">Remembering.</em>
        </h1>

        {/* Supporting Description */}
        <p
          className="
            font-body text-white/75 text-base sm:text-lg lg:text-xl
            leading-relaxed max-w-xl mx-auto
            mb-10
            opacity-0 animate-fade-up
          "
          style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
        >
          {siteConfig.description.split(".")[0]}.
        </p>

        {/* CTA Buttons */}
        <div
          className="
            flex flex-col sm:flex-row items-center justify-center gap-4
            opacity-0 animate-fade-up
          "
          style={{ animationDelay: "0.8s", animationFillMode: "forwards" }}
        >
          {/* Primary CTA */}
          <Link
            to={siteConfig.routes.register}
            className="
              inline-flex items-center gap-2
              px-8 py-4 rounded-xl
              bg-gold text-primary
              font-body font-semibold text-sm tracking-wide
              transition-all duration-300 ease-smooth
              hover:bg-white hover:text-primary hover:shadow-warm-xl
              active:scale-[0.98]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
            "
          >
            {siteConfig.nav.bookCta}
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>

          {/* Secondary CTA */}
          <Link
            to={siteConfig.routes.services}
            className="btn-ghost-white"
          >
            Explore Our Services
          </Link>
        </div>

        {/* Stats row */}
        <div
          className="
            flex items-center justify-center gap-8 sm:gap-12
            mt-16 pt-10 border-t border-white/15
            opacity-0 animate-fade-in
          "
          style={{ animationDelay: "1.1s", animationFillMode: "forwards" }}
        >
          {[
            { value: "500+", label: "Sessions Completed" },
            { value: "4.9★", label: "Average Rating" },
            { value: "3+",   label: "Years of Experience" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-heading text-white text-2xl sm:text-3xl font-semibold">
                {stat.value}
              </p>
              <p className="font-body text-white/55 text-xs mt-1 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scroll Indicator ──────────────────────────────────────────────── */}
      <div
        className="
          absolute bottom-8 left-1/2 -translate-x-1/2 z-10
          flex flex-col items-center gap-2
          opacity-0 animate-fade-in
        "
        style={{ animationDelay: "1.4s", animationFillMode: "forwards" }}
        aria-hidden="true"
      >
        <span className="font-body text-white/40 text-[10px] uppercase tracking-[0.2em]">
          Scroll
        </span>
        <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent" />
        <ArrowDown size={12} className="text-white/40 -mt-2" />
      </div>
    </section>
  );
}
