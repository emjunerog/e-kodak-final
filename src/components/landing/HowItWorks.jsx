/**
 * HowItWorks.jsx — Notelyf-inspired
 * GSAP ScrollTrigger drives a sequential step reveal
 * Each step number pops in with spring, connecting line draws across
 */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, CalendarPlus, Activity, ImageDown } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { lineReveal, viewport, ease } from "../../lib/motion";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: "01", icon: Search,      title: "Explore Services",
    description: "Browse our photography packages, view sample work, and choose the session type that matches your needs and budget.",
    accent: "from-amber-400/20 to-gold/5",
  },
  {
    number: "02", icon: CalendarPlus, title: "Book Your Session",
    description: "Create an account, select your preferred date and time, provide session details, and submit your booking in minutes.",
    accent: "from-blue-400/15 to-blue-600/5",
  },
  {
    number: "03", icon: Activity,    title: "Track Your Booking",
    description: "Monitor your booking status in real time — from confirmation and photographer assignment through to editing completion.",
    accent: "from-emerald-400/15 to-emerald-600/5",
  },
  {
    number: "04", icon: ImageDown,   title: "Receive Your Photos",
    description: "Once your photos are ready, access and download your full gallery securely through the website or our mobile companion app.",
    accent: "from-purple-400/15 to-purple-600/5",
  },
];

export default function HowItWorks() {
  const lineRef     = useRef(null);
  const stepsRef    = useRef(null);

  // GSAP: draw connecting line + stagger step entrance
  useEffect(() => {
    if (!lineRef.current || !stepsRef.current) return;
    const ownTriggers = [];

    // Draw the horizontal line
    const lineTween = gsap.fromTo(
      lineRef.current,
      { scaleX: 0, transformOrigin: "left" },
      {
        scaleX: 1,
        duration: 1.6,
        ease: "power3.inOut",
        scrollTrigger: {
          trigger: stepsRef.current,
          start: "top 70%",
        },
      }
    );
    if (lineTween.scrollTrigger) ownTriggers.push(lineTween.scrollTrigger);

    // Stagger step circles in
    const circles = stepsRef.current.querySelectorAll("[data-step-circle]");
    const circleTween = gsap.fromTo(
      circles,
      { scale: 0, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.6,
        stagger: 0.2,
        ease: "back.out(1.4)",
        scrollTrigger: {
          trigger: stepsRef.current,
          start: "top 70%",
        },
      }
    );
    if (circleTween.scrollTrigger) ownTriggers.push(circleTween.scrollTrigger);

    return () => ownTriggers.forEach((t) => t.kill());
  }, []);

  return (
    <section className="section-padding bg-surface overflow-hidden" aria-labelledby="how-heading">
      <div className="container-custom">

        {/* Header */}
        <div className="text-center mb-16 overflow-hidden">
          <motion.p
            className="section-eyebrow"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.5 }}
          >
            The Process
          </motion.p>
          <h2 id="how-it-works-heading" className="section-title text-center">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px" }}
              transition={{ duration: 0.8, ease: ease.expo }}
            >
              From booking to
            </motion.span>
            <motion.span
              className="block text-gold"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px" }}
              transition={{ duration: 0.8, delay: 0.15, ease: ease.expo }}
            >
              beautiful photos.
            </motion.span>
          </h2>
          <motion.p
            className="section-subtitle mx-auto text-center mt-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            We've designed the entire experience to be simple, transparent,
            and stress-free — from your first click to your final gallery.
          </motion.p>
        </div>

        {/* Steps grid */}
        <div ref={stepsRef} className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Animated connecting line + travelling pulse */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%]" aria-hidden="true">
            <div ref={lineRef} className="h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
            <motion.span
              className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-gold animate-travel-dot"
              style={{ boxShadow: "0 0 12px 3px rgba(212,175,55,0.75)" }}
              aria-hidden="true"
            />
          </div>

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                className="relative flex flex-col items-center text-center px-3"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewport}
                transition={{ duration: 0.7, delay: index * 0.14, ease: ease.smooth }}
              >
                {/* Step circle */}
                <motion.div
                  data-step-circle
                  className={`relative flex flex-col items-center justify-center w-20 h-20 rounded-2xl mb-5 shadow-warm-sm
                    bg-gradient-to-br ${step.accent} border-2 border-neutral-100`}
                  whileHover={{
                    scale: 1.1,
                    borderColor: "rgba(212,175,55,0.55)",
                    boxShadow: "0 10px 35px rgba(212,175,55,0.18)",
                    transition: { type: "spring", stiffness: 400, damping: 14 },
                  }}
                >
                  {/* Breathing halo behind the circle */}
                  <motion.span
                    className="absolute -inset-2 rounded-2xl border border-gold/25 pointer-events-none"
                    animate={{ scale: [1, 1.12, 1], opacity: [0.0, 0.55, 0.0] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }}
                    aria-hidden="true"
                  />

                  {/* Step badge */}
                  <motion.span
                    className="absolute -top-3 -right-3 font-body text-[10px] font-bold w-6 h-6 rounded-full bg-gold text-primary flex items-center justify-center shadow-gold z-10"
                    initial={{ scale: 0, rotate: -20 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={viewport}
                    transition={{
                      type: "spring",
                      stiffness: 550,
                      damping: 18,
                      delay: index * 0.14 + 0.4,
                    }}
                  >
                    {index + 1}
                  </motion.span>

                  <motion.span
                    className="flex items-center justify-center text-primary"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: index * 0.35 }}
                  >
                    <Icon size={28} strokeWidth={1.5} aria-hidden="true" />
                  </motion.span>
                </motion.div>

                <h3 className="font-heading text-primary text-lg font-medium mb-2">{step.title}</h3>
                <p className="font-body text-neutral-500 text-sm leading-relaxed">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
