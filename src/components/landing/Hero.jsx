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

import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";
import { Star } from "lucide-react";
import { stagger, staggerChild, ease } from "../../lib/motion";
import { siteConfig } from "../../config/siteConfig";
import { Counter } from "../ui/Interactive";

const HERO_IMG_768 =
  "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=768&q=75";
const HERO_IMG_1280 =
  "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1280&q=80";
const HERO_IMG_1920 =
  "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1920&q=80";

const canHoverFine = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

const metrics = [
  { value: 120, suffix: "+", label: "Graduates & Families" },
  { value: 4.8, decimals: 1, label: "45+ Client Reviews", highlight: true, star: true },
  { value: 4, suffix: "+", label: "Years in Cebu" },
];

const headlineLines = [
  { text: "Moments Worth", em: false },
  { text: "Remembering.", em: true },
];

export default function Hero() {
  const sectionRef = useRef(null);
  const heroRectRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax transforms (skipped when user prefers reduced motion)
  const bgY = useTransform(scrollYProgress, [0, 1], reduceMotion ? ["0%", "0%"] : ["0%", "18%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], reduceMotion ? ["0%", "0%"] : ["0%", "10%"]);
  const overlayO = useTransform(scrollYProgress, [0, 0.6], [0.72, 0.94]);

  // Cursor spotlight — cached bounding rect to avoid forced layout on mousemove
  const cursorX = useMotionValue(-900);
  const cursorY = useMotionValue(-900);
  const cursorGlow = useMotionTemplate`radial-gradient(520px circle at ${cursorX}px ${cursorY}px, rgba(212,175,55,0.14), transparent 62%)`;
  const handlePointerEnter = (e) => {
    if (reduceMotion || !canHoverFine()) return;
    heroRectRef.current = e.currentTarget.getBoundingClientRect();
  };
  const trackCursor = (e) => {
    if (reduceMotion || !canHoverFine()) return;
    const r = heroRectRef.current || e.currentTarget.getBoundingClientRect();
    heroRectRef.current = r;
    cursorX.set(e.clientX - r.left);
    cursorY.set(e.clientY - r.top);
  };
  const clearCursorRect = () => {
    heroRectRef.current = null;
  };

  return (
    <section
      ref={sectionRef}
      onMouseEnter={handlePointerEnter}
      onMouseMove={trackCursor}
      onMouseLeave={clearCursorRect}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-neutral-950"
      aria-label="Hero section"
    >
      {/* ── Parallax Background ───────────────────────────────────────────── */}
      <motion.div className="absolute inset-0 z-0 scale-110" style={{ y: bgY }}>
        <img
          src={HERO_IMG_1280}
          srcSet={`${HERO_IMG_768} 768w, ${HERO_IMG_1280} 1280w, ${HERO_IMG_1920} 1920w`}
          sizes="100vw"
          alt=""
          className="w-full h-full object-cover object-center no-drag animate-ken-burns"
          loading="eager"
          fetchPriority="high"
        />
      </motion.div>

      {/* ── Compositor-only light sweep drifting across the frame ─────────── */}
      {!reduceMotion && (
        <div
          className="absolute inset-y-0 -left-1/2 w-[200%] z-1 pointer-events-none opacity-35 animate-shimmer-sweep"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(105deg, transparent 42%, rgba(232,213,176,0.09) 48%, rgba(255,255,255,0.12) 50%, rgba(232,213,176,0.09) 52%, transparent 58%)",
          }}
        />
      )}

      {/* ── Frosty whiter bottom blur transitioning smoothly to soft top blur */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none backdrop-blur-[2px]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none backdrop-blur-[16px]"
        style={{
          background:
            "linear-gradient(to top, rgba(255,255,255,0.22) 0%, rgba(250,248,244,0.13) 34%, rgba(255,255,255,0.03) 68%, rgba(255,255,255,0) 100%)",
          maskImage:
            "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 36%, rgba(0,0,0,0.32) 68%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 36%, rgba(0,0,0,0.32) 68%, rgba(0,0,0,0) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Balanced contrast scrim — keeps top clear and bottom milky-frost readable */}
      <motion.div
        className="absolute inset-0 z-1 bg-gradient-to-b from-black/50 via-black/32 to-neutral-950/60"
        style={{ opacity: overlayO }}
        aria-hidden="true"
      />

      {/* ── Static Ambient Gold Glows (zero idle JS RAF overhead) ────────── */}
      <div
        className="absolute z-1 w-[700px] h-[500px] rounded-full pointer-events-none"
        style={{
          bottom: "-10%",
          left: "-5%",
          background: "radial-gradient(ellipse, rgba(212,175,55,0.13) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute z-1 w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{
          top: "-5%",
          right: "0%",
          background: "radial-gradient(ellipse, rgba(212,175,55,0.07) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />

      {/* ── Pointer spotlight — gold light trails the cursor ───────────────── */}
      <motion.div
        className="hidden lg:block absolute inset-0 z-[2] pointer-events-none mix-blend-screen"
        style={{ background: cursorGlow }}
        aria-hidden="true"
      />

      {/* ── Ambient SVG Doodle (bottom-right) — Framer pathLength ─────────── */}
      <svg
        className="absolute bottom-16 right-8 z-2 w-36 h-20 opacity-25 hidden lg:block pointer-events-none"
        viewBox="0 0 150 65"
        fill="none"
        aria-hidden="true"
      >
        <motion.path
          d="M4 50C20 20 55 60 80 35S110 8 130 22S148 42 142 18"
          stroke="rgba(212,175,55,0.9)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduceMotion ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, delay: 0.4, ease: ease.expo }}
        />
      </svg>

      {/* ── Hero Content (centered vertically & balanced) ─────────────────── */}
      <motion.div
        className="relative z-10 container-custom text-center text-white pt-20 pb-10 sm:pt-24 sm:pb-12 px-4"
        style={{ y: contentY }}
      >
        {/* Headline — continuous real-time letter wave animation */}
        <h1
          className="font-heading text-white text-4xl sm:text-5xl md:text-6xl lg:text-display-xl xl:text-display-2xl leading-[1.08] tracking-tight drop-shadow-md mb-2"
          aria-label="Moments Worth Remembering."
        >
          {(() => {
            let charOffset = 0;
            return headlineLines.map((line, lineIdx) => (
              <motion.span
                key={lineIdx}
                className={`block ${line.em ? "text-gold-light italic" : ""}`}
                aria-hidden="true"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: lineIdx * 0.1, ease: ease.expo }}
              >
                {line.text.split(" ").map((word, wordIdx, wordsArr) => (
                  <span key={wordIdx} className="inline-block whitespace-nowrap">
                    {Array.from(word).map((char, cIdx) => {
                      const stepIndex = charOffset++;
                      return (
                        <span
                          key={cIdx}
                          className="hero-letter-creative"
                          style={
                            reduceMotion
                              ? undefined
                              : { animationDelay: `${(0.15 + stepIndex * 0.055).toFixed(3)}s` }
                          }
                        >
                          {char}
                        </span>
                      );
                    })}
                    {wordIdx < wordsArr.length - 1 ? "\u00A0" : ""}
                  </span>
                ))}
              </motion.span>
            ));
          })()}
        </h1>

        {/* Description */}
        <motion.p
          className="font-body text-white/90 text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto mt-5 mb-8 drop-shadow"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: ease.smooth }}
        >
          Cebu's premier photography studio for graduation milestones
          and academic portraits. Book online, track your session in real time,
          and download your high-resolution proofs instantly.
        </motion.p>

        {/* ── Primary CTAs — equal sizing, close balanced spacing ─────────── */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25, ease: ease.expo }}
        >
          <Link
            to={siteConfig.routes.register}
            className="w-56 inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold to-gold-light text-primary font-body font-semibold text-sm tracking-wide shadow-gold hover:shadow-gold-lg hover:-translate-y-0.5 active:scale-[0.98] transition-[transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold whitespace-nowrap"
          >
            {siteConfig.nav.bookCta}
          </Link>
          <Link
            to={siteConfig.routes.services}
            className="w-56 inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-white/35 bg-white/12 text-white backdrop-blur-sm font-body font-medium text-sm tracking-wide hover:border-gold hover:bg-gold/15 hover:text-gold-light hover:-translate-y-0.5 active:scale-[0.98] transition-[transform,background-color,border-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold whitespace-nowrap"
          >
            Explore Our Services
          </Link>
        </motion.div>

        {/* Animated divider */}
        <motion.div
          className="h-px max-w-xs mx-auto mt-8 mb-7 bg-gradient-to-r from-transparent via-gold/40 to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: ease.expo }}
        />

        {/* Metrics strip — frosted glass panel, fast reveal */}
        <motion.div
          className="inline-flex flex-wrap items-center justify-center gap-7 sm:gap-12 max-w-3xl mx-auto rounded-2xl border border-white/15 bg-black/50 backdrop-blur-md px-6 py-5 sm:px-8 shadow-warm-xl"
          variants={stagger(0.08, 0.32)}
          initial="hidden"
          animate="show"
        >
          {metrics.map((stat, idx) => (
            <motion.div
              key={idx}
              className="text-center min-w-[96px]"
              variants={staggerChild}
              whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 18 } }}
            >
              <div className={`font-heading text-2xl sm:text-3xl font-bold drop-shadow ${stat.highlight ? "text-gold-light" : "text-white"}`}>
                <span className="inline-flex items-center gap-1">
                  <Counter
                    value={stat.value}
                    suffix={stat.suffix || ""}
                    decimals={stat.decimals || 0}
                    duration={1.1}
                  />
                  {stat.star && <Star size={16} className="fill-gold text-gold -mt-0.5" />}
                </span>
              </div>
              <p className="font-body text-white/75 text-[11px] mt-1 uppercase tracking-widest font-medium drop-shadow-sm">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
