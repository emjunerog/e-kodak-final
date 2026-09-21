/**
 * PageHero.jsx
 * ============
 * REUSABLE SUB-PAGE HERO COMPONENT
 *
 * Used at the top of every public page (Services, Gallery, About, Contact).
 * Provides consistent branding across all pages.
 *
 * Props:
 *  @param {string}  title       - Main page heading (h1)
 *  @param {string}  subtitle    - Optional supporting text
 *  @param {string}  eyebrow     - Small label above title
 *  @param {string}  image       - Background image URL
 *  @param {string}  imageAlt    - Alt text for background image
 *  @param {node}    children    - Optional extra content (e.g. filter tabs)
 */

import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { siteConfig } from "../../config/siteConfig";

export default function PageHero({
  title,
  subtitle,
  eyebrow,
  image,
  imageAlt = "Photography background",
  children,
}) {
  return (
    <section
      className="relative pt-32 pb-20 md:pt-40 md:pb-24 overflow-hidden"
      aria-labelledby="page-hero-title"
    >
      {/* ── Background ──────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        {image ? (
          <img
            src={image}
            alt={imageAlt}
            className="w-full h-full object-cover object-center no-drag"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-primary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/65 to-primary/80" />
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 container-custom">

        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-1.5 mb-6 text-white/50 text-xs font-body"
          aria-label="Breadcrumb"
        >
          <Link
            to={siteConfig.routes.home}
            className="flex items-center gap-1 hover:text-gold transition-colors"
          >
            <Home size={11} aria-hidden="true" />
            Home
          </Link>
          <ChevronRight size={11} aria-hidden="true" />
          <span className="text-white/80">{title}</span>
        </nav>

        {/* Eyebrow */}
        {eyebrow && (
          <p className="font-body text-gold text-xs uppercase tracking-[0.25em] font-medium mb-3">
            {eyebrow}
          </p>
        )}

        {/* Title */}
        <h1
          id="page-hero-title"
          className="font-heading text-white text-4xl sm:text-5xl lg:text-6xl leading-tight tracking-tight text-balance"
        >
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="font-body text-white/65 text-base sm:text-lg leading-relaxed mt-4 max-w-xl">
            {subtitle}
          </p>
        )}

        {/* Slot for extra content (e.g. filter tabs) */}
        {children && <div className="mt-8">{children}</div>}
      </div>

      {/* Gold bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}
