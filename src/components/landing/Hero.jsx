/**
 * Hero.jsx — Notelyf-inspired cinematic entrance
 * ================================================
 * Techniques borrowed from Notelyf:
 *  - Each headline line reveals independently (clip + translateY)
 *  - GSAP ScrollTrigger pins the hero and drives a reveal timeline
 *  - Ambient SVG path draws itself
 *  - Metrics strip reveals as a staggered row on scroll exit
 *  - Warm gold glow orbs breathe in the background
 */

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  motion, useScroll, useTransform,
  useMotionValue, useMotionTemplate,
} from "framer-motion";
import { ArrowDown, ArrowRight, Star } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  stagger, staggerChild, lineReveal,
  breathe, ease
} from "../../lib/motion";
import { siteConfig } from "../../config/siteConfig";
import { Magnetic, Counter } from "../ui/Interactive";

gsap.registerPlugin(ScrollTrigger);

const heroImage =
  "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1920&q=80";

const metrics = [
  { value: 500, suffix: "+", label: "Sessions Completed" },
  { value: 4.9, decimals: 1, label: "Average Rating", highlight: true, star: true },
  { value: 3, suffix: "+", label: "Years of Experience" },
];

export default function Hero() {
  const sectionRef = useRef(null);
  const bgRef = useRef(null);
  const svgPathRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });

  // Parallax transforms
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const overlayO = useTransform(scrollYProgress, [0, 0.6], [0.72, 0.94]);

  // Cursor spotlight — gold glow that trails the pointer
  const cursorX = useMotionValue(-900);
  const cursorY = useMotionValue(-900);
  const cursorGlow = useMotionTemplate`radial-gradient(560px circle at ${cursorX}px ${cursorY}px, rgba(212,175,55,0.16), transparent 62%)`;
  const trackCursor = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    cursorX.set(e.clientX - r.left);
    cursorY.set(e.clientY - r.top);
  };

  // GSAP: SVG path self-draw on load
  useEffect(() => {
    if (!svgPathRef.current) return;
    const len = svgPathRef.current.getTotalLength?.() ?? 500;
    gsap.set(svgPathRef.current, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(svgPathRef.current, {
      strokeDashoffset: 0,
      duration: 2.4,
      delay: 1.8,
      ease: "power3.inOut",
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      onMouseMove={trackCursor}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-label="Hero section"
    >
      {/* ── Parallax Background ───────────────────────────────────────────── */}
      <motion.div className="absolute inset-0 z-0 scale-110" style={{ y: bgY }} ref={bgRef}>
        <img
          src={heroImage}
          alt=""
          className="w-full h-full object-cover object-center no-drag animate-ken-burns"
          loading="eager"
          fetchPriority="high"
        />
      </motion.div>

      {/* ── Cinematic light sweep drifting across the frame ───────────────── */}
      <div
        className="absolute inset-0 z-1 pointer-events-none opacity-40"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(105deg, transparent 32%, rgba(232,213,176,0.10) 46%, rgba(255,255,255,0.14) 50%, rgba(232,213,176,0.10) 54%, transparent 68%)",
          backgroundSize: "260% 100%",
          backgroundPosition: "-200% 0",
          animation: "shimmerSweep 9s cubic-bezier(0.4,0,0.6,1) infinite",
        }}
      />

      {/* Overlay */}
      <motion.div
        className="absolute inset-0 z-1 bg-gradient-to-b from-black/65 via-black/40 to-black/92"
        style={{ opacity: overlayO }}
        aria-hidden="true"
      />

      {/* ── Breathing Gold Orb ────────────────────────────────────────────── */}
      <motion.div
        className="absolute z-1 w-[700px] h-[500px] rounded-full pointer-events-none"
        style={{
          bottom: "-10%", left: "-5%",
          background: "radial-gradient(ellipse, rgba(212,175,55,0.14) 0%, transparent 65%)",
        }}
        {...breathe}
        aria-hidden="true"
      />
      <motion.div
        className="absolute z-1 w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{
          top: "-5%", right: "0%",
          background: "radial-gradient(ellipse, rgba(212,175,55,0.07) 0%, transparent 65%)",
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
        aria-hidden="true"
      />

      {/* ── Pointer spotlight — gold light trails the cursor ───────────────── */}
      <motion.div
        className="absolute inset-0 z-[2] pointer-events-none mix-blend-screen"
        style={{ background: cursorGlow }}
        aria-hidden="true"
      />

      {/* ── Ambient SVG Doodle (bottom-right) — path draws itself ─────────── */}
      <svg
        className="absolute bottom-16 right-8 z-2 w-36 h-20 opacity-25 hidden lg:block pointer-events-none"
        viewBox="0 0 150 65"
        fill="none"
        aria-hidden="true"
      >
        <path
          ref={svgPathRef}
          d="M4 50C20 20 55 60 80 35S110 8 130 22S148 42 142 18"
          stroke="rgba(212,175,55,0.9)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* ── Hero Content ──────────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 container-custom text-center text-white pt-28 pb-24 sm:pb-28 px-4"
        style={{ y: contentY }}
      >
        {/* Eyebrow — with growing lines */}
        <motion.div
          className="flex items-center justify-center gap-3 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <motion.span
            className="h-px bg-gradient-to-r from-transparent to-gold/70"
            initial={{ width: 0 }}
            animate={{ width: 48 }}
            transition={{ duration: 1, delay: 0.6, ease: ease.expo }}
          />
          <span className="font-body text-gold text-[11px] font-semibold uppercase tracking-[0.3em] whitespace-nowrap">
            E-Kodak Studio · Cebu
          </span>
          <motion.span
            className="h-px bg-gradient-to-l from-transparent to-gold/70"
            initial={{ width: 0 }}
            animate={{ width: 48 }}
            transition={{ duration: 1, delay: 0.6, ease: ease.expo }}
          />
        </motion.div>

        {/* Headline — Notelyf line-by-line reveal */}
        <div className="overflow-hidden mb-2">
          <motion.h1
            className="font-heading text-white text-4xl sm:text-5xl md:text-6xl lg:text-display-xl xl:text-display-2xl leading-[1.06] tracking-tight drop-shadow-md"
            variants={stagger(0.18, 0.5)}
            initial="hidden"
            animate="show"
          >
            {[
              { text: "Moments Worth", em: false },
              { text: "Remembering.", em: true },
            ].map((line, i) => (
              <span key={i} className="overflow-hidden block">
                <motion.span
                  className={`block ${line.em ? "text-gold-light italic text-sheen" : ""}`}
                  style={
                    line.em
                      ? {
                        backgroundImage:
                          "linear-gradient(100deg, #c9a96e 8%, #fff3d8 28%, #e8d5b0 44%, #f7e7c6 58%, #c9a96e 88%)",
                      }
                      : undefined
                  }
                  variants={lineReveal}
                >
                  {line.text}
                </motion.span>
              </span>
            ))}
          </motion.h1>
        </div>

        {/* Description */}
        <motion.p
          className="font-body text-white/80 text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto mt-6 mb-10 drop-shadow"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1, ease: ease.smooth }}
        >
          Cebu's premier photography studio for graduation milestones, weddings,
          and creative portraits. Book online, track your session in real time,
          and download your high-resolution proofs instantly.
        </motion.p>

        {/* ── Primary CTAs — magnetic pull + shine sweep ─────────────────── */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.85, delay: 1.05, ease: ease.expo }}
        >
          <Magnetic strength={0.32} pull={1.05}>
            <Link
              to={siteConfig.routes.register}
              className="btn-primary group relative overflow-hidden shine-on-hover"
            >
              {siteConfig.nav.bookCta}
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Magnetic>
          <Magnetic strength={0.32} pull={1.05}>
            <Link
              to={siteConfig.routes.services}
              className="btn-outline group inline-flex items-center gap-2"
            >
              Explore Our Services
              <span className="transition-transform duration-300 group-hover:translate-y-0.5">
                <ArrowDown size={15} />
              </span>
            </Link>
          </Magnetic>
        </motion.div>

        {/* Animated divider */}
        <motion.div
          className="h-px max-w-xs mx-auto mb-10 bg-gradient-to-r from-transparent via-gold/40 to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 1.3, ease: ease.expo }}
        />

        {/* Metrics strip — frosted glass panel, staggered reveal.
            Sits above the scroll indicator with its own clearance so the
            Real-Time / Instant items never collide with the cue below. */}
        <motion.div
          className="inline-flex flex-wrap items-center justify-center gap-7 sm:gap-12 max-w-3xl mx-auto mt-2 mb-4 rounded-2xl border border-white/12 bg-black/40 backdrop-blur-md px-6 py-5 sm:px-8 shadow-warm-xl"
          variants={stagger(0.14, 1.4)}
          initial="hidden"
          animate="show"
        >
          {metrics.map((stat, idx) => (
            <motion.div
              key={idx}
              className="text-center min-w-[96px]"
              variants={staggerChild}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 15 } }}
            >
              <div className={`font-heading text-2xl sm:text-3xl font-bold drop-shadow ${stat.highlight ? "text-gold-light" : "text-white"}`}>
                <span className="inline-flex items-center gap-1">
                  <Counter
                    value={stat.value}
                    suffix={stat.suffix || ""}
                    decimals={stat.decimals || 0}
                    duration={1.8}
                  />
                  {stat.star && <Star size={16} className="fill-gold text-gold -mt-0.5" />}
                </span>
              </div>
              <p className="font-body text-white/70 text-[11px] mt-1 uppercase tracking-widest font-medium drop-shadow-sm">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Scroll Indicator — Notelyf style ─────────────────────────────── */}
      <motion.div
        className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        aria-hidden="true"
      >
        <motion.span
          className="font-body text-white/60 text-[10px] uppercase tracking-[0.25em] drop-shadow-md"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          Scroll
        </motion.span>
        <motion.div
          className="w-px bg-gradient-to-b from-white/50 to-transparent"
          animate={{ height: [20, 36, 20], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown size={13} className="text-white/40" />
        </motion.div>
      </motion.div>
    </section>
  );
}
