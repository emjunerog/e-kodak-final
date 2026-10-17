/**
 * IntroSection.jsx — Notelyf-grade animations
 * Left: line-by-line heading reveal + SVG underline draw
 * Right: staggered pillars orbit in from right, icon spring on hover
 */

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Heart, Smartphone } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  stagger, staggerChild, lineReveal, slideLeft, orbitIn,
  drawPath, viewport, ease
} from "../../lib/motion";

gsap.registerPlugin(ScrollTrigger);

const pillars = [
  {
    icon: Award,
    title: "Professional Quality",
    description:
      "Every session is led by experienced photographers using professional-grade equipment and lighting.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Heart,
    title: "Personalized Sessions",
    description:
      "We work with you to understand your vision and ensure every shot feels natural, meaningful, and uniquely yours.",
    color: "bg-rose-50 text-rose-500",
  },
  {
    icon: Smartphone,
    title: "Convenient Tracking",
    description:
      "Monitor your booking status in real time — from confirmation to final photo delivery — online or on mobile.",
    color: "bg-blue-50 text-blue-500",
  },
];

export default function IntroSection() {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const path = svgRef.current;
    const len = path.getTotalLength?.() ?? 300;
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    ScrollTrigger.create({
      trigger: path,
      start: "top 80%",
      onEnter: () =>
        gsap.to(path, { strokeDashoffset: 0, duration: 1.4, ease: "power3.inOut" }),
    });
    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <section className="section-padding bg-surface overflow-hidden" aria-labelledby="intro-heading">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── Left: Editorial heading ──────────────────────────────────── */}
          <motion.div
            variants={slideLeft}
            initial="hidden"
            whileInView="show"
            viewport={viewport}
          >
            <motion.p
              className="section-eyebrow"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={viewport}
              transition={{ duration: 0.5, ease: ease.smooth }}
            >
              Our Approach
            </motion.p>

            {/* Heading with smooth line-by-line reveal */}
            <h2 id="intro-heading" className="section-title">
              <motion.span
                className="block"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px" }}
                transition={{ duration: 0.8, ease: ease.expo }}
              >
                Photography that
              </motion.span>
              <motion.span
                className="block text-gold italic"
                style={{ fontStyle: "italic" }}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px" }}
                transition={{ duration: 0.8, delay: 0.15, ease: ease.expo }}
              >
                tells your story.
              </motion.span>
            </h2>

            {/* Animated divider with SVG underline draw */}
            <div className="mt-6 mb-6 relative">
              <motion.div
                className="gold-divider"
                initial={{ scaleX: 0, transformOrigin: "left" }}
                whileInView={{ scaleX: 1 }}
                viewport={viewport}
                transition={{ duration: 1, delay: 0.4, ease: ease.expo }}
                aria-hidden="true"
              />
              <svg
                className="absolute top-2 left-0 w-24 h-6 opacity-50 pointer-events-none"
                viewBox="0 0 100 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  ref={svgRef}
                  d="M2 14C18 4 40 18 65 10 S85 3 96 8"
                  stroke="rgba(212,175,55,0.8)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <motion.p
              className="font-body text-neutral-500 text-base leading-relaxed"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              We believe great photography is about more than a perfect shot.
              It's about creating an experience that feels effortless — while
              producing images that last a lifetime.
            </motion.p>
            <motion.p
              className="font-body text-neutral-500 text-base leading-relaxed mt-4"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ duration: 0.7, delay: 0.65 }}
            >
              Every service is carefully designed so you can focus on the
              moment, while we handle everything else.
            </motion.p>
          </motion.div>

          {/* ── Right: Staggered pillars ─────────────────────────────────── */}
          <motion.div
            className="space-y-7"
            variants={stagger(0.18, 0.15)}
            initial="hidden"
            whileInView="show"
            viewport={viewport}
          >
            {pillars.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.title}
                  variants={orbitIn(60, 0, 2)}
                  className="flex items-start gap-5 group cursor-default"
                  whileHover={{ x: 6, transition: { type: "spring", stiffness: 400, damping: 18 } }}
                >
                  {/* Icon box */}
                  <motion.div
                    className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl ${pillar.color}`}
                    whileHover={{
                      scale: 1.18,
                      rotate: -8,
                      transition: { type: "spring", stiffness: 500, damping: 12 },
                    }}
                    aria-hidden="true"
                  >
                    <Icon size={22} strokeWidth={1.75} />
                  </motion.div>

                  {/* Text */}
                  <div>
                    <h3 className="font-heading text-primary text-lg font-medium mb-1.5 group-hover:text-gold transition-colors duration-300">
                      {pillar.title}
                    </h3>
                    <p className="font-body text-neutral-500 text-sm leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
