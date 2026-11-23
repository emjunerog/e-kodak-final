/**
 * WhyChooseUs.jsx
 * ===============
 * "WHY CHOOSE US" VALUE PROPOSITION SECTION
 *
 * 6 feature blocks explaining the studio's competitive advantages.
 * Highlights the digital booking system as a key differentiator
 * (introducing the system's tracking capability naturally).
 *
 * Dark background to create visual rhythm and break up the page.
 *
 * Motion:
 *  - Ambient gold halos breathe behind the grid
 *  - Eyebrow / headline / subtitle reveal line-by-line
 *  - Cards rise with a staggered, slightly tilted cascade
 *  - Icons spring in and spin gently on hover
 *  - A gold shine sweeps across each card on hover
 */

import { motion } from "framer-motion";
import {
  Camera,
  UserCheck,
  CalendarCheck,
  Activity,
  LockKeyhole,
  Timer,
} from "lucide-react";
import { stagger, staggerChild, viewport, ease } from "../../lib/motion";
import { SplitReveal } from "../ui/Interactive";

const features = [
  {
    icon: Camera,
    title: "Professional Equipment",
    description:
      "We use professional-grade cameras, lenses, and lighting rigs to ensure consistently high-quality results across every session.",
  },
  {
    icon: UserCheck,
    title: "Personalized Experience",
    description:
      "Every booking includes a consultation to understand your preferences, so your session feels comfortable and uniquely yours.",
  },
  {
    icon: CalendarCheck,
    title: "Easy Online Booking",
    description:
      "Select your service, choose your preferred date and time, upload reference images, and submit — all in a few minutes online.",
  },
  {
    icon: Activity,
    title: "Real-Time Booking Tracking",
    description:
      "Know exactly where your booking stands at every stage — from confirmation through editing to final photo delivery — on web and mobile.",
  },
  {
    icon: LockKeyhole,
    title: "Secure Photo Access",
    description:
      "Your completed photography outputs are stored securely and accessible only to you — downloadable anytime through your personal gallery.",
  },
  {
    icon: Timer,
    title: "Fast 5–7 Day Turnaround",
    description:
      "Your edited, color-graded photos land in your private online gallery within 5–7 business days — with rush options when you need them sooner.",
  },
];

export default function WhyChooseUs() {
  return (
    <section
      className="section-padding bg-primary relative overflow-hidden"
      aria-labelledby="why-heading"
    >
      {/* ── Static ambient gold halos (zero offscreen RAF loops) ─────────── */}
      <div
        className="absolute -top-32 -left-24 w-[520px] h-[420px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(212,175,55,0.13) 0%, transparent 68%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-40 -right-20 w-[600px] h-[480px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(212,175,55,0.09) 0%, transparent 68%)",
        }}
        aria-hidden="true"
      />

      <div className="container-custom relative z-10">

        {/* ── Section Header ──────────────────────────────────────────────── */}
        <motion.div
          className="text-center mb-14"
          variants={stagger(0.15, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
        >
          <motion.p
            className="font-body text-gold font-medium text-xs uppercase tracking-[0.2em] mb-3"
            variants={staggerChild}
          >
            Why E-Kodak
          </motion.p>
          <h2
            id="why-heading"
            className="font-heading text-white text-3xl sm:text-4xl lg:text-display-lg leading-tight"
          >
            <SplitReveal text="More than just photos." stagger={0.07} />
          </h2>
          <span className="block overflow-hidden">
            <motion.p
              className="font-body text-neutral-400 text-base sm:text-lg leading-relaxed mt-4 max-w-xl mx-auto"
              variants={staggerChild}
            >
              We combine artistic photography with a modern booking platform —
              so your experience is as seamless as the images we deliver.
            </motion.p>
          </span>
        </motion.div>

        {/* ── Features Grid ───────────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={stagger(0.06, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                className="
                  shine-on-hover relative p-7 rounded-2xl overflow-hidden
                  border border-white/8
                  bg-white/4
                  hover:bg-white/8 hover:border-gold/30 hover:-translate-y-1.5
                  transition-[background-color,border-color,transform] duration-300 ease-smooth
                  group
                "
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.45, ease: ease.expo },
                  },
                }}
              >
                {/* Icon */}
                <div
                  className="
                    inline-flex items-center justify-center
                    w-12 h-12 rounded-xl mb-5
                    bg-gold/15 text-gold
                    group-hover:bg-gold/25 group-hover:scale-105
                    transition-[background-color,transform] duration-300
                  "
                  aria-hidden="true"
                >
                  <Icon size={22} strokeWidth={1.75} />
                </div>

                {/* Text */}
                <h3 className="font-heading text-white text-lg font-medium mb-3">
                  {feature.title}
                </h3>
                <p className="font-body text-neutral-400 text-sm leading-relaxed">
                  {feature.description}
                </p>

                {/* Subtle corner accent */}
                <div
                  className="
                    absolute top-0 right-0 w-20 h-20
                    rounded-2xl overflow-hidden pointer-events-none
                  "
                  aria-hidden="true"
                >
                  <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-gold/5 group-hover:bg-gold/10 transition-colors duration-300" />
                </div>

                {/* Hover index marker */}
                <span className="absolute bottom-5 right-6 font-heading text-4xl font-bold text-white/5 group-hover:text-gold/15 transition-colors duration-500 pointer-events-none">
                  0{index + 1}
                </span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
