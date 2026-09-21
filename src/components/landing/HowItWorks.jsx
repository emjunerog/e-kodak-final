/**
 * HowItWorks.jsx
 * ==============
 * "HOW IT WORKS" — 4-STEP BOOKING PROCESS
 *
 * Introduces visitors to the future booking workflow.
 * Step 4 (Receive Your Photos) subtly references the mobile companion
 * without requiring the app to exist yet.
 *
 * Design:
 *  - Numbered steps with connecting lines (desktop)
 *  - Icon + step number + title + description per step
 *  - Light warm background for visual separation
 */

import { Search, CalendarPlus, Activity, ImageDown } from "lucide-react";
import { useScrollReveal } from "../../lib/useScrollReveal";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Explore Services",
    description:
      "Browse our photography packages, view sample work, and choose the session type that matches your needs and budget.",
  },
  {
    number: "02",
    icon: CalendarPlus,
    title: "Book Your Session",
    description:
      "Create an account, select your preferred date and time, provide session details, and submit your booking — in minutes.",
  },
  {
    number: "03",
    icon: Activity,
    title: "Track Your Booking",
    description:
      "Monitor your booking status in real time — from confirmation and photographer assignment through to editing completion.",
  },
  {
    number: "04",
    icon: ImageDown,
    title: "Receive Your Photos",
    description:
      "Once your photos are ready, access and download your full gallery securely through the website or our mobile companion app.",
  },
];

export default function HowItWorks() {
  const { ref: headRef, inView: headIn } = useScrollReveal();
  const { ref: stepsRef, inView: stepsIn } = useScrollReveal({ threshold: 0.08 });

  return (
    <section
      className="section-padding bg-surface"
      aria-labelledby="how-heading"
    >
      <div className="container-custom">

        {/* ── Section Header ──────────────────────────────────────────────── */}
        <div
          ref={headRef}
          className={`
            text-center mb-16
            transition-all duration-700 ease-smooth
            ${headIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          `}
        >
          <p className="section-eyebrow">The Process</p>
          <h2 id="how-heading" className="section-title">
            From booking to beautiful photos.
          </h2>
          <p className="section-subtitle mx-auto text-center">
            We've designed the entire experience to be simple, transparent,
            and stress-free — from your first click to your final gallery.
          </p>
        </div>

        {/* ── Steps ───────────────────────────────────────────────────────── */}
        <div
          ref={stepsRef}
          className={`
            relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8
            transition-all duration-700 ease-smooth
            ${stepsIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}
          `}
        >
          {/* Connecting line (desktop only) */}
          <div
            className="
              hidden lg:block
              absolute top-10 left-[12.5%] right-[12.5%] h-px
              bg-gradient-to-r from-transparent via-gold/40 to-transparent
            "
            aria-hidden="true"
          />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative flex flex-col items-center text-center px-4"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Step circle with icon */}
                <div
                  className="
                    relative flex flex-col items-center justify-center
                    w-20 h-20 rounded-2xl
                    bg-neutral-50 border-2 border-neutral-100
                    group-hover:border-gold/40
                    mb-5 shadow-warm-sm
                    transition-all duration-300
                    hover:border-gold/50 hover:shadow-gold
                  "
                >
                  {/* Step number */}
                  <span
                    className="
                      absolute -top-3 -right-3
                      font-body text-[10px] font-bold
                      w-6 h-6 rounded-full
                      bg-gold text-primary
                      flex items-center justify-center
                      shadow-gold
                    "
                  >
                    {index + 1}
                  </span>
                  {/* Icon */}
                  <Icon
                    size={28}
                    strokeWidth={1.5}
                    className="text-primary"
                    aria-hidden="true"
                  />
                </div>

                {/* Step content */}
                <h3 className="font-heading text-primary text-lg font-medium mb-2">
                  {step.title}
                </h3>
                <p className="font-body text-neutral-500 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
