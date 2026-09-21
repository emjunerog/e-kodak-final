/**
 * WhyChooseUs.jsx
 * ===============
 * "WHY CHOOSE US" VALUE PROPOSITION SECTION
 *
 * 5 feature blocks explaining the studio's competitive advantages.
 * Highlights the digital booking system as a key differentiator
 * (introducing the system's tracking capability naturally).
 *
 * Dark background to create visual rhythm and break up the page.
 */

import {
  Camera,
  UserCheck,
  CalendarCheck,
  Activity,
  LockKeyhole,
} from "lucide-react";
import { useScrollReveal } from "../../lib/useScrollReveal";

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
];

export default function WhyChooseUs() {
  const { ref: headRef, inView: headIn } = useScrollReveal();
  const { ref: gridRef, inView: gridIn } = useScrollReveal({ threshold: 0.05 });

  return (
    <section
      className="section-padding bg-primary"
      aria-labelledby="why-heading"
    >
      <div className="container-custom">

        {/* ── Section Header ──────────────────────────────────────────────── */}
        <div
          ref={headRef}
          className={`
            text-center mb-14
            transition-all duration-700 ease-smooth
            ${headIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          `}
        >
          <p className="font-body text-gold font-medium text-xs uppercase tracking-[0.2em] mb-3">
            Why E-Kodak
          </p>
          <h2
            id="why-heading"
            className="font-heading text-white text-3xl sm:text-4xl lg:text-5xl leading-tight"
          >
            More than just photos.
          </h2>
          <p className="font-body text-neutral-400 text-base sm:text-lg leading-relaxed mt-4 max-w-xl mx-auto">
            We combine artistic photography with a modern booking platform —
            so your experience is as seamless as the images we deliver.
          </p>
        </div>

        {/* ── Features Grid ───────────────────────────────────────────────── */}
        <div
          ref={gridRef}
          className={`
            grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6
            transition-all duration-700 ease-smooth
            ${gridIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}
          `}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isLast = index === features.length - 1;

            return (
              <div
                key={feature.title}
                className={`
                  relative p-7 rounded-2xl
                  border border-white/8
                  bg-white/4 backdrop-blur-sm
                  hover:bg-white/8 hover:border-gold/30
                  transition-all duration-400 ease-smooth
                  group
                  ${isLast ? "sm:col-span-2 lg:col-span-1" : ""}
                `}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                {/* Icon */}
                <div
                  className="
                    inline-flex items-center justify-center
                    w-12 h-12 rounded-xl mb-5
                    bg-gold/15 text-gold
                    group-hover:bg-gold/25
                    transition-colors duration-300
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
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
