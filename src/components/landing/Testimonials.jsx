/**
 * Testimonials.jsx — Notelyf-inspired
 * Cards fan in from below with stagger, stars pop individually,
 * quote SVG draws itself, card hover produces a warm lift + gold ring
 */

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { stagger, lineReveal, viewport, ease } from "../../lib/motion";

gsap.registerPlugin(ScrollTrigger);

const TESTIMONIALS = [
  {
    id: 1,
    name: "Maria Santos",
    service: "Graduation Photography",
    avatar: "MS",
    color: "bg-amber-100 text-amber-700",
    ring: "ring-amber-300",
    rating: 5,
    quote: "E-Kodak made my graduation so memorable. The photos were absolutely stunning, and being able to track my booking online made everything so stress-free. Highly recommended!",
  },
  {
    id: 2,
    name: "James Reyes",
    service: "Family Photography",
    avatar: "JR",
    color: "bg-emerald-100 text-emerald-700",
    ring: "ring-emerald-300",
    rating: 5,
    quote: "We had our family session last month and the results were beyond what we expected. The photographer was patient with the kids, and the booking system kept us updated the whole time.",
  },
  {
    id: 3,
    name: "Carla Mendoza",
    service: "Event Photography",
    avatar: "CM",
    color: "bg-violet-100 text-violet-700",
    ring: "ring-violet-300",
    rating: 5,
    quote: "Our company event coverage was handled professionally from start to finish. The online tracking feature is a game changer — we always knew what stage our order was at.",
  },
];

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0, rotate: -20 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={viewport}
          transition={{ delay: i * 0.08 + 0.2, type: "spring", stiffness: 600, damping: 16 }}
        >
          <Star size={14} className={i < rating ? "text-gold fill-gold" : "text-neutral-200 fill-neutral-200"} aria-hidden />
        </motion.div>
      ))}
    </div>
  );
}

export default function Testimonials() {
  const quoteRefs = useRef([]);

  // Draw each quote SVG path on scroll
  useEffect(() => {
    const ownTriggers = [];
    quoteRefs.current.forEach((el) => {
      if (!el) return;
      const tween = gsap.fromTo(
        el,
        { opacity: 0, scale: 0.6, rotate: -15 },
        {
          opacity: 1, scale: 1, rotate: 0, duration: 0.7, ease: "back.out(1.8)",
          scrollTrigger: { trigger: el, start: "top 85%" },
        }
      );
      if (tween.scrollTrigger) ownTriggers.push(tween.scrollTrigger);
    });
    return () => ownTriggers.forEach((t) => t.kill());
  }, []);

  return (
    <section className="section-padding bg-neutral-50 overflow-hidden relative" aria-labelledby="testimonials-heading">
      {/* Decorative floating quote marks */}
      <motion.span
        className="absolute -left-10 top-24 font-heading text-[180px] leading-none text-gold/8 pointer-events-none select-none"
        aria-hidden="true"
        animate={{ y: [0, -24, 0], rotate: [0, 6, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      >
        &ldquo;
      </motion.span>
      <motion.span
        className="absolute -right-6 bottom-16 font-heading text-[200px] leading-none text-gold/8 pointer-events-none select-none"
        aria-hidden="true"
        animate={{ y: [0, 26, 0], rotate: [0, -7, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      >
        &rdquo;
      </motion.span>

      <div className="container-custom relative z-10">

        {/* Header */}
        <div className="text-center mb-14">
          <motion.p
            className="section-eyebrow"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewport}
          >
            Client Stories
          </motion.p>
          <h2 id="testimonials-heading" className="section-title text-center">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px" }}
              transition={{ duration: 0.8, ease: ease.expo }}
            >
              What our
            </motion.span>
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px" }}
              transition={{ duration: 0.8, delay: 0.15, ease: ease.expo }}
            >
              clients say.
            </motion.span>
          </h2>
          <motion.p
            className="section-subtitle mx-auto text-center mt-3"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ delay: 0.4 }}
          >
            Real experiences from clients who trusted us with their most important moments.
          </motion.p>
          <motion.p
            className="font-body text-neutral-400 text-xs mt-2 italic"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewport}
            transition={{ delay: 0.6 }}
          >
            * Sample testimonials — for display purposes during development
          </motion.p>
        </div>

        {/* Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={stagger(0.2, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
        >
          {TESTIMONIALS.map((t, idx) => (
            <motion.article
              key={t.id}
              variants={{
                hidden: { opacity: 0, y: 64, rotate: idx % 2 === 0 ? -5 : 5, scale: 0.95 },
                show: {
                  opacity: 1, y: 0, rotate: 0, scale: 1,
                  transition: { duration: 0.75, ease: ease.spring },
                },
              }}
              className="card p-7 flex flex-col border border-neutral-100 cursor-default relative overflow-hidden"
              whileHover={{
                y: -10,
                boxShadow: "0 24px 60px rgba(0,0,0,0.09)",
                borderColor: "rgba(212,175,55,0.30)",
                transition: { duration: 0.35, ease: ease.smooth },
              }}
              aria-label={`Testimonial from ${t.name}`}
            >
              {/* Subtle color wash on hover */}
              <motion.div
                className="absolute inset-0 pointer-events-none opacity-0 bg-gradient-to-br from-gold/4 to-transparent rounded-inherit"
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                aria-hidden
              />

              {/* Top */}
              <div className="flex items-start justify-between mb-5 relative z-1">
                <StarRating rating={t.rating} />
                <div ref={(el) => (quoteRefs.current[idx] = el)}>
                  <Quote size={22} className="text-gold/35 fill-gold/12" aria-hidden />
                </div>
              </div>

              {/* Quote */}
              <blockquote className="flex-1 mb-6 relative z-1">
                <p className="font-body text-neutral-600 text-sm leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </blockquote>

              {/* Reviewer */}
              <div className="flex items-center gap-3 pt-4 border-t border-neutral-100 relative z-1">
                <motion.div
                  className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full font-body text-sm font-semibold ring-2 ring-offset-1 ${t.color} ${t.ring}`}
                  whileHover={{ scale: 1.12, rotate: 6, transition: { type: "spring", stiffness: 500 } }}
                  aria-hidden
                >
                  {t.avatar}
                </motion.div>
                <div>
                  <p className="font-heading text-primary text-sm font-medium">{t.name}</p>
                  <p className="font-body text-neutral-400 text-xs">{t.service}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
