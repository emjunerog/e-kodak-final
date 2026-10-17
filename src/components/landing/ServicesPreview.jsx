/**
 * ServicesPreview.jsx
 * ===================
 * SERVICES SECTION — Landing Page
 *
 * Pulls live data from Supabase via contentService.getServices().
 * Falls back to servicesData.js if Supabase is not configured.
 *
 * Layout:
 *  1. Section header
 *  2. Featured graduation packages spotlight (College & Studio — directly from DB)
 *  3. All other services grid (Portrait, Event, Family, etc.)
 *  4. "View All" CTA
 *  5. Floating Package Finder tool — appears while this section is in
 *     view and floats over the packages (pill → expandable wizard panel)
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, GraduationCap, Camera, Sparkles, Crown, X } from "lucide-react";
import ServiceCard from "./ServiceCard";
import { FinderCard } from "./PackageFinder";
import { siteConfig } from "../../config/siteConfig";
import { getServices } from "../../services/contentService";
import { stagger, staggerChild, viewport, ease } from "../../lib/motion";
import { SplitReveal, TiltCard } from "../ui/Interactive";

// ── Stacked Hoverable Card for College & Senior High Packages ────────────────
function GradPackageSpotlight({ service, index = 0 }) {
  if (!service) return null;
  const tiers = service.tiers || [];
  const isCollege = service.slug === "college-packages";
  const displayName = isCollege
    ? "College / Graduation Packages"
    : "Senior High / Milestone Packages";
  const deliverables = isCollege
    ? "Crystal Frame · Filipiniana · Family"
    : "Toga Portraits · Complete IDs · Frames";
  const categoryBadge = isCollege ? "COLLEGE-PACKAGE" : "SENIOR-HIGH";
  const targetLink = `${siteConfig.routes.services}#sets-${service.slug}`;

  // Default clean description matching wedding cards (2-3 lines)
  const defaultDesc = isCollege
    ? "Comprehensive college graduation packages with premium crystal wood framed portraits, formal Filipiniana / Barong attire, family portraits, and complete passport/wallet prints."
    : "Complete senior high school graduation packages featuring formal toga pictorials, Pilipiñana attire, and complete rush passport and 2x2 IDs.";

  return (
    <TiltCard
      className="group relative w-full h-full"
      max={6}
      pull={1.015}
      glareColor="rgba(212,175,55,0.12)"
    >
      <motion.article
        className="
          group card card-hover relative
          overflow-hidden flex flex-col
          border border-neutral-100 bg-white
          shine-on-hover h-full transition-all duration-300 rounded-2xl shadow-warm-md hover:shadow-warm-lg
        "
        aria-label={`${displayName} photography package`}
        initial={{ opacity: 0, y: 38, scale: 0.97, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        viewport={viewport}
        transition={{ duration: 0.75, delay: index * 0.12, ease: ease.spring }}
      >
        {/* ── Base Layer: Identical layout to Wedding Cards ──────────────── */}
        <div className="relative overflow-hidden aspect-[4/3]">
          <motion.img
            src={service.coverImage}
            alt={service.name}
            className="w-full h-full object-cover no-drag transition-transform duration-700 ease-out group-hover:scale-108"
            loading="lazy"
            initial={{ scale: 1.15 }}
            whileInView={{ scale: 1 }}
            viewport={viewport}
            transition={{ duration: 1.4, ease: ease.expo }}
          />
          {/* Subtle dark overlay on hover */}
          <div
            className="absolute inset-0 bg-primary/0 group-hover:bg-primary/25 transition-all duration-500"
            aria-hidden="true"
          />

          {/* Top-Left Category Badge */}
          <span className="absolute top-4 left-4 font-body text-[10px] font-semibold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full bg-white/95 text-primary backdrop-blur-sm shadow-sm">
            {categoryBadge}
          </span>

          {/* Top-Right Value Badge */}
          <span className="absolute top-4 right-4 font-body text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-neutral-900/90 text-gold border border-gold/40 backdrop-blur-sm shadow-sm flex items-center gap-1.5">
            {isCollege ? (
              <>
                <Crown size={11} className="text-gold" />
                Most Complete
              </>
            ) : (
              <>
                <Sparkles size={11} className="text-gold" />
                Best Value
              </>
            )}
          </span>
        </div>

        {/* ── Card Body (Default View) ──────────────────────────────────── */}
        <div className="flex flex-col flex-1 p-6">
          <h3 className="font-heading text-primary text-xl font-medium mb-2 transition-colors duration-300 group-hover:text-gold-dark">
            {displayName}
          </h3>
          <p className="font-body text-neutral-500 text-sm leading-relaxed flex-1 mb-5">
            {defaultDesc}
          </p>

          {/* Deliverables / Feature Tag + CTA */}
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-neutral-100">
            <span className="font-body text-neutral-400 text-xs font-medium uppercase tracking-wider">
              {deliverables}
            </span>
            <Link
              to={targetLink}
              className="
                inline-flex items-center gap-1.5
                font-body text-primary text-xs sm:text-sm font-semibold
                hover:text-gold
                transition-colors duration-200
                group/link
              "
              aria-label={`Explore ${displayName}`}
            >
              Explore Package
              <ArrowRight
                size={14}
                className="
                  transition-transform duration-200
                  group-hover/link:translate-x-1.5
                  text-gold
                "
              />
            </Link>
          </div>
        </div>

        {/* ── Stacked Hover Layer: Reveals ALL Description & Inclusions ─── */}
        <div
          className="
            absolute inset-0 z-20
            bg-white/98 backdrop-blur-md
            rounded-2xl p-6
            flex flex-col justify-between
            opacity-0 group-hover:opacity-100
            transition-all duration-400 ease-out
            pointer-events-none group-hover:pointer-events-auto
            shadow-2xl border border-gold/30
            transform translate-y-2 group-hover:translate-y-0
          "
        >
          {/* Header Row */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="font-body text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-gold/15 text-gold-dark border border-gold/30">
                {categoryBadge}
              </span>
              <span className="font-body text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-neutral-900 text-gold border border-gold/40 flex items-center gap-1">
                {isCollege ? (
                  <>
                    <Crown size={10} className="text-gold" />
                    Most Complete
                  </>
                ) : (
                  <>
                    <Sparkles size={10} className="text-gold" />
                    Best Value
                  </>
                )}
              </span>
            </div>

            <h3 className="font-heading text-primary text-xl font-semibold mb-2">
              {displayName}
            </h3>

            {/* Full Detailed Description */}
            <p className="font-body text-neutral-600 text-xs sm:text-sm leading-relaxed mb-4">
              {service.description}
            </p>

            {/* Key Inclusions Breakdown */}
            <div className="pt-3 border-t border-dashed border-neutral-200 mb-3">
              <p className="font-body text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                All Included Deliverables
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {(tiers[0]?.highlights || []).slice(0, 4).map((h) => (
                  <li key={h} className="flex items-center gap-2 text-xs font-body text-neutral-700">
                    <span className="w-3.5 h-3.5 rounded-full bg-gold/20 text-gold flex items-center justify-center shrink-0 text-[9px] font-bold">
                      ✓
                    </span>
                    <span className="truncate">{h}</span>
                  </li>
                ))}
              </ul>
              {tiers.length > 1 && (
                <p className="font-body text-[11px] font-semibold text-gold-dark mt-2.5">
                  ✦ {tiers.length} package sets available (Set A – Set {String.fromCharCode(64 + tiers.length)})
                </p>
              )}
            </div>

            {/* Free Perk Banner */}
            {service.inclusions && service.inclusions.length > 0 && (
              <div className="px-3 py-2 rounded-xl bg-gold/10 border border-gold/25 text-xs font-body text-neutral-800 flex items-center gap-2">
                <Sparkles size={13} className="text-gold shrink-0" />
                <span className="truncate">
                  <strong className="text-primary font-bold">FREE:</strong> {service.inclusions[0]}
                </span>
              </div>
            )}
          </div>

          {/* Stacked Footer matching wedding cards */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 mt-2">
            <span className="font-body text-neutral-400 text-xs font-medium uppercase tracking-wider truncate mr-2">
              {deliverables}
            </span>
            <Link
              to={targetLink}
              className="
                inline-flex items-center gap-1.5 shrink-0
                font-body text-primary text-xs sm:text-sm font-semibold
                hover:text-gold
                transition-colors duration-200
                group/link
              "
              aria-label={`Explore ${displayName}`}
            >
              Explore Package
              <ArrowRight
                size={14}
                className="
                  transition-transform duration-200
                  group-hover/link:translate-x-1.5
                  text-gold
                "
              />
            </Link>
          </div>
        </div>
      </motion.article>
    </TiltCard>
  );
}

export default function ServicesPreview() {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const sectionRef = useRef(null);
  const [finderVisible, setFinderVisible] = useState(false);
  const [finderOpen, setFinderOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    getServices().then((res) => {
      if (mounted) {
        setServices(res.data);
        setIsLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  // The Package Finder floats over the packages only while they are on
  // screen; scrolling past the section dismisses both panel and pill.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setFinderVisible(entry.isIntersecting);
        if (!entry.isIntersecting) setFinderOpen(false);
      },
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const gradServices = services.filter(s => s.category === "college" || s.category === "senior-high" || s.slug === "college-packages" || s.slug === "senior-high-packages");
  const weddingServices = services.filter(s => s.category === "wedding-video" || s.category === "wedding-photo" || s.slug?.startsWith("wedding"));

  return (
    <section
      ref={sectionRef}
      className="section-padding bg-neutral-50"
      aria-labelledby="services-heading"
    >
      <div className="container-custom">

        {/* ── Section Header ──────────────────────────────────────────────── */}
        <motion.div
          className="text-center mb-14"
          variants={stagger(0.14, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
        >
          <motion.p className="section-eyebrow" variants={staggerChild}>
            What We Offer
          </motion.p>
          <h2 id="services-heading" className="section-title">
            <SplitReveal text="Photography & Video Packages" stagger={0.06} />
          </h2>
          <motion.p className="section-subtitle mx-auto text-center" variants={staggerChild}>
            From premier graduation milestone packages to full-scale wedding photography and HD videography —
            every package is crafted for an unforgettable experience.
          </motion.p>
        </motion.div>

        {/* ── Loading Skeleton ─────────────────────────────────────────────── */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {[1, 2].map((i) => (
              <div key={i} className="bg-surface rounded-2xl border border-neutral-100 overflow-hidden animate-pulse">
                <div className="h-44 bg-neutral-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-neutral-200 rounded w-1/2" />
                  <div className="h-3 bg-neutral-100 rounded w-3/4" />
                  <div className="h-3 bg-neutral-100 rounded w-full" />
                  <div className="h-3 bg-neutral-100 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Graduation Spotlight ─────────────────────────────────────────── */}
        {!isLoading && gradServices.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewport}
            transition={{ duration: 0.4 }}
          >
            {/* Graduation category header (No emojis) */}
            <div className="flex items-center gap-4 mb-6">
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewport}
                transition={{ duration: 0.6, ease: ease.smooth }}
              >
                <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <p className="font-body text-[11px] uppercase tracking-widest text-neutral-400 font-semibold">Academic Milestones</p>
                  <h3 className="font-heading text-primary text-xl font-semibold">College & Senior High Packages</h3>
                </div>
              </motion.div>
              <motion.div
                className="flex-1 h-px bg-gradient-to-r from-gold/30 to-transparent origin-left"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={viewport}
                transition={{ duration: 1, delay: 0.2, ease: ease.expo }}
              />
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={viewport}
                transition={{ delay: 0.5 }}
              >
                <Link
                  to={siteConfig.routes.services}
                  className="group/view font-body text-xs text-gold hover:text-gold-dark font-semibold inline-flex items-center gap-1 transition-colors shrink-0"
                >
                  View all
                  <ArrowRight size={12} className="transition-transform duration-200 group-hover/view:translate-x-1" />
                </Link>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-14">
              {gradServices.map((s, i) => (
                <GradPackageSpotlight key={s.slug} service={s} index={i} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Wedding Services Grid ──────────────────────────────────────────── */}
        {!isLoading && weddingServices.length > 0 && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewport}
                transition={{ duration: 0.6, ease: ease.smooth }}
              >
                <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0">
                  <Camera size={20} />
                </div>
                <div>
                  <p className="font-body text-[11px] uppercase tracking-widest text-neutral-400 font-semibold">Heirloom Coverage</p>
                  <h3 className="font-heading text-primary text-xl font-semibold">Wedding Photography & HD Video</h3>
                </div>
              </motion.div>
              <motion.div
                className="flex-1 h-px bg-gradient-to-r from-neutral-200 to-transparent origin-left"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={viewport}
                transition={{ duration: 1, delay: 0.2, ease: ease.expo }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {weddingServices.map((service, i) => (
                <ServiceCard
                  key={service.id || service.slug}
                  index={i}
                  image={service.coverImage}
                  imageAlt={`${service.name} — photography service`}
                  category={service.category}
                  title={service.name}
                  description={service.description}
                  to={siteConfig.routes.services}
                />
              ))}
            </div>
          </>
        )}

        {/* ── View All CTA ────────────────────────────────────────────────── */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.6, ease: ease.smooth }}
        >
          <motion.span
            className="inline-block"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
          >
            <Link
              to={siteConfig.routes.services}
              className="btn-outline inline-flex items-center gap-2"
            >
              View All Services & Packages
              <ArrowRight size={16} />
            </Link>
          </motion.span>
        </motion.div>
      </div>

      {/* ── Floating Package Finder tool (stacked above the Koda AI
           assistant launcher so the two never overlap) ───────────────── */}
      <AnimatePresence>
        {finderVisible && (
          <motion.div
            key="finder-float"
            className="fixed bottom-24 right-4 sm:right-6 z-40 flex flex-col items-end gap-3"
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 34 }}
            transition={{ duration: 0.35, ease: ease.smooth }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {finderOpen ? (
                <motion.div
                  key="finder-panel"
                  initial={{ opacity: 0, scale: 0.9, y: 26 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  style={{ transformOrigin: "bottom right" }}
                  className="w-[min(92vw,26rem)] max-h-[70vh] flex flex-col overflow-hidden rounded-2xl border border-gold/30 bg-white shadow-warm-xl"
                  role="dialog"
                  aria-label="Package Finder"
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-100 bg-white shrink-0">
                    <span className="inline-flex items-center gap-2 font-body text-[11px] font-bold uppercase tracking-widest text-gold-dark">
                      <Sparkles size={13} /> Package Finder
                    </span>
                    <button
                      type="button"
                      onClick={() => setFinderOpen(false)}
                      aria-label="Close package finder"
                      className="w-7 h-7 rounded-lg border border-neutral-200 text-neutral-400 hover:text-primary hover:border-gold transition-colors flex items-center justify-center shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="overflow-y-auto overscroll-contain">
                    <FinderCard
                      className="!rounded-none !border-0 !shadow-none"
                      onNavigate={() => setFinderOpen(false)}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="finder-pill"
                  type="button"
                  onClick={() => setFinderOpen(true)}
                  initial={{ opacity: 0, scale: 0.85, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: 12 }}
                  whileHover={{ y: -4, scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  aria-expanded={finderOpen}
                  aria-haspopup="dialog"
                  className="group inline-flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-full bg-gradient-to-r from-gold to-gold-light text-primary font-body text-sm font-bold shadow-gold hover:shadow-gold-lg transition-shadow duration-300 cursor-pointer"
                >
                  <Sparkles size={16} className="transition-transform duration-300 group-hover:rotate-12" />
                  Package Finder
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
