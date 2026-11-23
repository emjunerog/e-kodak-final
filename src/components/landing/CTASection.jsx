/**
 * CTASection.jsx — Notelyf-inspired closing CTA
 * GSAP parallax + shimmer sweep + magnetic CTA button
 */

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Camera } from "lucide-react";
import { viewport, ease } from "../../lib/motion";
import { siteConfig } from "../../config/siteConfig";
import { Magnetic } from "../ui/Interactive";

const ctaImage =
  "https://images.unsplash.com/photo-1554941829-202a0b2403b8?w=1440&q=80&auto=format&fit=crop";

export default function CTASection() {
  const sectionRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], reduceMotion ? ["0%", "0%"] : ["-10%", "10%"]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden" aria-labelledby="cta-heading">

      {/* Parallax BG */}
      <motion.div className="absolute inset-0 z-0 scale-110" style={{ y: bgY }} aria-hidden="true">
        <img
          src={ctaImage}
          alt=""
          className="w-full h-full object-cover object-center no-drag"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-primary/87" />
      </motion.div>

      {/* Gold shimmer sweep — compositor translate3d transform */}
      {!reduceMotion && (
        <div
          className="absolute inset-y-0 -left-1/2 w-[200%] z-1 pointer-events-none opacity-60 animate-shimmer-sweep"
          style={{
            background:
              "linear-gradient(110deg, transparent 42%, rgba(212,175,55,0.06) 47%, rgba(212,175,55,0.10) 50%, rgba(212,175,55,0.06) 53%, transparent 58%)",
          }}
          aria-hidden="true"
        />
      )}

      {/* Bottom gold accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-gold z-2" aria-hidden="true" />

      {/* Subtle static gold bokeh accents */}
      {[
        { left: "8%",  top: "22%", size: 7 },
        { left: "22%", top: "68%", size: 5 },
        { left: "74%", top: "30%", size: 9 },
        { left: "88%", top: "72%", size: 6 },
      ].map((b, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-gold/40 pointer-events-none"
          style={{ left: b.left, top: b.top, width: b.size, height: b.size, boxShadow: "0 0 12px 2px rgba(212,175,55,0.28)" }}
          aria-hidden="true"
        />
      ))}

      {/* Content */}
      <div className="relative z-10 py-24 md:py-32 lg:py-40 container-custom text-center">

        {/* Eyebrow */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/12 border border-gold/22 mb-8"
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={viewport}
          transition={{ duration: 0.45, ease: ease.expo }}
        >
          <Camera size={12} className="text-gold" />
          <span className="font-body text-gold text-xs font-medium uppercase tracking-[0.2em]">
            Book Your Session
          </span>
        </motion.div>

        {/* Headline */}
        <h2
          id="cta-heading"
          className="font-heading text-3xl sm:text-4xl md:text-display-lg lg:text-display-xl leading-[1.1] tracking-tight max-w-2xl mx-auto"
        >
          <motion.span
            className="block text-white"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.5, ease: ease.expo }}
          >
            Ready to turn your moments
          </motion.span>
          <motion.span
            className="block text-gold-light italic"
            style={{ fontStyle: "italic" }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.5, delay: 0.1, ease: ease.expo }}
          >
            into memories?
          </motion.span>
        </h2>

        {/* Supporting text */}
        <motion.p
          className="font-body text-white/60 text-base sm:text-lg leading-relaxed max-w-lg mx-auto mt-6 mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ delay: 0.15, duration: 0.45 }}
        >
          Join hundreds of clients who have trusted E-Kodak to capture
          their most important moments. Book your session today.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ delay: 0.2, duration: 0.45 }}
        >
          {/* Primary — true magnetic cursor pull */}
          <Magnetic strength={0.35} pull={1.05}>
            <Link
              to={siteConfig.routes.register}
              className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-gold text-primary font-body font-bold text-sm tracking-wide transition-colors duration-300 hover:bg-white hover:text-primary hover:shadow-warm-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {siteConfig.nav.bookCta}
              <ArrowRight size={15} strokeWidth={2.5} className="transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </Magnetic>

          {/* Ghost */}
          <Magnetic strength={0.35} pull={1.04}>
            <Link to={siteConfig.routes.services} className="btn-ghost-white inline-block">
              Explore Services
            </Link>
          </Magnetic>
        </motion.div>
      </div>
    </section>
  );
}
