/**
 * PageHero.jsx
 * ============
 * REUSABLE SUB-PAGE HERO COMPONENT
 *
 * Used at the top of every public page (Services, Gallery, About, Contact).
 * Provides consistent branding across all pages.
 *
 * Motion: scroll-parallax + fade on the background, word-by-word title
 * reveal (SplitReveal), staggered blur-in supporting content, bouncing
 * scroll cue, drawing gold baseline.
 *
 * Props:
 *  @param {string}  title       - Main page heading (h1)
 *  @param {string}  subtitle    - Optional supporting text
 *  @param {string}  eyebrow     - Small label above title
 *  @param {string}  image       - Background image URL
 *  @param {string}  imageAlt    - Alt text for background image
 *  @param {node}    children    - Optional extra content (e.g. filter tabs)
 */

import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ChevronDown, Home } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { siteConfig } from "../../config/siteConfig";
import { stagger, staggerChild, fadeIn, blurIn, ease } from "../../lib/motion";

export default function PageHero({
  title,
  subtitle,
  eyebrow,
  image,
  imageAlt = "Photography background",
  children,
}) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "26%"]);
  const bgFade = useTransform(scrollYProgress, [0, 1], [1, 0.3]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-14%"]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative pt-32 pb-20 md:pt-40 md:pb-24 overflow-hidden"
      aria-labelledby="page-hero-title"
    >
      {/* ── Background (parallax + fade) ────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 z-0"
        aria-hidden="true"
        style={reduce ? undefined : { y: bgY, opacity: bgFade }}
      >
        {image ? (
          <img
            src={image}
            alt={imageAlt}
            className="w-full h-full scale-110 object-cover object-center no-drag animate-ken-burns"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-primary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/65 to-primary/80" />

        {/* Cinematic light sweep */}
        <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent animate-shimmer" />

        {/* Ambient gold halos */}
        <div className="absolute -left-20 top-1/4 w-72 h-72 rounded-full bg-gold/10 blur-3xl animate-halo" />
        <div
          className="absolute -right-16 bottom-0 w-96 h-96 rounded-full bg-gold/[0.07] blur-3xl animate-halo"
          style={{ animationDelay: "1.8s" }}
        />
      </motion.div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 container-custom"
        variants={stagger(0.1, 0.12)}
        initial="hidden"
        animate="show"
        style={reduce ? undefined : { y: contentY }}
      >
        {/* Breadcrumb */}
        <motion.nav
          variants={fadeIn}
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
        </motion.nav>

        {/* Eyebrow */}
        {eyebrow && (
          <motion.p
            variants={blurIn}
            className="font-body text-gold text-xs uppercase tracking-[0.25em] font-medium mb-3"
          >
            {eyebrow}
          </motion.p>
        )}

        {/* Title */}
        <motion.h1
          id="page-hero-title"
          variants={blurIn}
          className="font-heading text-white text-4xl sm:text-5xl lg:text-display-xl leading-tight tracking-tight text-balance"
        >
          {title}
        </motion.h1>

        {/* Subtitle */}
        {subtitle && (
          <motion.p
            variants={blurIn}
            className="font-body text-white/65 text-base sm:text-lg leading-relaxed mt-4 max-w-xl"
          >
            {subtitle}
          </motion.p>
        )}

        {/* Slot for extra content (e.g. filter tabs) */}
        {children && (
          <motion.div className="mt-8" variants={staggerChild}>
            {children}
          </motion.div>
        )}

        {/* Scroll cue */}
        <motion.div
          variants={fadeIn}
          style={{ opacity: reduce ? 1 : cueOpacity }}
          className="hidden md:flex mt-10 items-center gap-2 text-white/40 text-[11px] font-body uppercase tracking-[0.2em]"
          aria-hidden="true"
        >
          <span className="relative flex h-6 w-6 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-white/25" />
            <ChevronDown size={12} className="animate-bounce" />
          </span>
          Scroll to explore
        </motion.div>
      </motion.div>

      {/* Gold bottom accent line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent origin-center"
        variants={{
          hidden: { opacity: 0, scaleX: 0 },
          show: {
            opacity: 1,
            scaleX: 1,
            transition: { duration: 1.4, delay: 0.5, ease: ease.expo },
          },
        }}
        initial="hidden"
        animate="show"
        aria-hidden="true"
      />
    </section>
  );
}
