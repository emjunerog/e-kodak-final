/**
 * IntroSection.jsx
 * ================
 * SHORT TRUST / INTRODUCTION SECTION
 *
 * Immediately below the hero — reinforces credibility and sets expectations.
 * Three key value pillars: Professional, Personalized, Convenient.
 *
 * Layout:
 *  - Left: Editorial section heading + short paragraph
 *  - Right: Three feature columns with icon + label + description
 *
 * Scrolls into view with a reveal animation.
 */

import { Award, Heart, Smartphone } from "lucide-react";
import { useScrollReveal } from "../../lib/useScrollReveal";

const pillars = [
  {
    icon: Award,
    title: "Professional Quality",
    description:
      "Every session is led by experienced photographers using professional-grade equipment and lighting.",
  },
  {
    icon: Heart,
    title: "Personalized Sessions",
    description:
      "We work with you to understand your vision and ensure every shot feels natural, meaningful, and uniquely yours.",
  },
  {
    icon: Smartphone,
    title: "Convenient Tracking",
    description:
      "Monitor your booking status in real time — from confirmation to final photo delivery — online or on mobile.",
  },
];

export default function IntroSection() {
  const { ref: leftRef,  inView: leftIn  } = useScrollReveal();
  const { ref: rightRef, inView: rightIn } = useScrollReveal({ threshold: 0.1 });

  return (
    <section
      className="section-padding bg-surface"
      aria-labelledby="intro-heading"
    >
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── Left: Editorial Heading ────────────────────────────────────── */}
          <div
            ref={leftRef}
            className={`transition-all duration-700 ease-smooth ${
              leftIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <p className="section-eyebrow">Our Approach</p>
            <h2
              id="intro-heading"
              className="section-title"
            >
              Photography that tells{" "}
              <em className="italic text-gold not-italic" style={{ fontStyle: "italic" }}>
                your story.
              </em>
            </h2>
            <div className="gold-divider mt-6 mb-6" aria-hidden="true" />
            <p className="font-body text-neutral-500 text-base leading-relaxed">
              We believe great photography is about more than a perfect shot.
              It's about creating an experience that feels effortless — while
              producing images that last a lifetime.
            </p>
            <p className="font-body text-neutral-500 text-base leading-relaxed mt-4">
              Every service is carefully designed so you can focus on the
              moment, while we handle everything else.
            </p>
          </div>

          {/* ── Right: Feature Pillars ────────────────────────────────────── */}
          <div
            ref={rightRef}
            className={`space-y-8 transition-all duration-700 ease-smooth delay-150 ${
              rightIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="flex items-start gap-5"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  {/* Icon box */}
                  <div
                    className="
                      shrink-0 flex items-center justify-center
                      w-11 h-11 rounded-xl
                      bg-gold/10 text-gold
                    "
                    aria-hidden="true"
                  >
                    <Icon size={20} strokeWidth={1.75} />
                  </div>

                  {/* Text */}
                  <div>
                    <h3 className="font-heading text-primary text-lg font-medium mb-1.5">
                      {pillar.title}
                    </h3>
                    <p className="font-body text-neutral-500 text-sm leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
