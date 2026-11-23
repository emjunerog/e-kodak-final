/**
 * HowItWorks.jsx — Notelyf-inspired
 * GSAP ScrollTrigger drives a sequential step reveal
 * Each step number pops in with spring, connecting line draws across
 */

import { motion } from "framer-motion";
import { Search, CalendarPlus, Activity, ImageDown } from "lucide-react";
import { viewport, ease } from "../../lib/motion";

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
        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Animated connecting line + compositor travelling pulse */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] animate-travel-track" aria-hidden="true">
            <motion.div
              className="h-px origin-left bg-gradient-to-r from-transparent via-gold/50 to-transparent"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={viewport}
              transition={{ duration: 0.85, ease: ease.expo }}
            />
            <span
              className="absolute left-0 -top-[3px] h-[7px] w-[7px] rounded-full bg-gold animate-travel-dot"
              style={{ boxShadow: "0 0 12px 3px rgba(212,175,55,0.75)" }}
              aria-hidden="true"
            />
          </div>

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                className="group relative flex flex-col items-center text-center px-3"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewport}
                transition={{ duration: 0.45, delay: index * 0.08, ease: ease.expo }}
              >
                {/* Step circle */}
                <div
                  className={`relative flex flex-col items-center justify-center w-20 h-20 rounded-2xl mb-5 shadow-warm-sm
                    bg-gradient-to-br ${step.accent} border-2 border-neutral-100
                    transition-all duration-300 group-hover:scale-105 group-hover:border-gold/55`}
                >
                  {/* Step badge */}
                  <span
                    className="absolute -top-3 -right-3 font-body text-[10px] font-bold w-6 h-6 rounded-full bg-gold text-primary flex items-center justify-center shadow-gold z-10"
                  >
                    {index + 1}
                  </span>

                  <span className="flex items-center justify-center text-primary">
                    <Icon size={28} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                </div>

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
