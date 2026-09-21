/**
 * Testimonials.jsx
 * ================
 * CUSTOMER TESTIMONIALS SECTION
 *
 * IMPORTANT: All testimonials below are SAMPLE/PLACEHOLDER content.
 * They are clearly labeled as such in the code.
 *
 * Future: Real testimonials can be:
 *  a) Hardcoded here after collecting real customer reviews
 *  b) Stored in Supabase and fetched dynamically
 *  c) Integrated from a review platform (Google Reviews, etc.)
 *
 * Design:
 *  - 3 testimonial cards in a responsive grid
 *  - Star rating, quote, reviewer name and service type
 *  - Warm light background
 *  - Subtle card hover lift
 */

import { Star, Quote } from "lucide-react";
import { useScrollReveal } from "../../lib/useScrollReveal";

// ─── PLACEHOLDER TESTIMONIALS — Replace with real customer reviews ───────────
// NOTE: These are sample/fictional testimonials for development purposes only.
// Do NOT present these as real during actual business operations.
const PLACEHOLDER_TESTIMONIALS = [
  {
    id: 1,
    name: "Maria Santos",
    service: "Graduation Photography",
    avatar: "MS",
    avatarColor: "bg-blue-100 text-blue-700",
    rating: 5,
    quote:
      "E-Kodak made my graduation so memorable. The photos were absolutely stunning, and being able to track my booking online made everything so stress-free. Highly recommended!",
  },
  {
    id: 2,
    name: "James Reyes",
    service: "Family Photography",
    avatar: "JR",
    avatarColor: "bg-emerald-100 text-emerald-700",
    rating: 5,
    quote:
      "We had our family session last month and the results were beyond what we expected. The photographer was patient with the kids, and the booking system kept us updated the whole time.",
  },
  {
    id: 3,
    name: "Carla Mendoza",
    service: "Event Photography",
    avatar: "CM",
    avatarColor: "bg-purple-100 text-purple-700",
    rating: 5,
    quote:
      "Our company event coverage was handled professionally from start to finish. The online tracking feature is a game changer — we always knew what stage our order was at.",
  },
];

function StarRating({ rating, max = 5 }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of ${max} stars`}
      role="img"
    >
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < rating ? "text-gold fill-gold" : "text-neutral-200 fill-neutral-200"}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default function Testimonials() {
  const { ref: headRef, inView: headIn } = useScrollReveal();
  const { ref: gridRef, inView: gridIn } = useScrollReveal({ threshold: 0.05 });

  return (
    <section
      className="section-padding bg-neutral-50"
      aria-labelledby="testimonials-heading"
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
          <p className="section-eyebrow">Client Stories</p>
          <h2 id="testimonials-heading" className="section-title">
            What our clients say.
          </h2>
          <p className="section-subtitle mx-auto text-center">
            Real experiences from clients who trusted us with their most
            important moments.
          </p>
          {/* Clearly visible placeholder notice — remove before production */}
          <p className="font-body text-neutral-400 text-xs mt-3 italic">
            * Sample testimonials — for display purposes during development
          </p>
        </div>

        {/* ── Testimonial Cards ───────────────────────────────────────────── */}
        <div
          ref={gridRef}
          className={`
            grid grid-cols-1 md:grid-cols-3 gap-6
            transition-all duration-700 ease-smooth
            ${gridIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}
          `}
        >
          {PLACEHOLDER_TESTIMONIALS.map((testimonial, index) => (
            <article
              key={testimonial.id}
              className="card card-hover p-7 flex flex-col border border-neutral-100"
              style={{ transitionDelay: `${index * 100}ms` }}
              aria-label={`Testimonial from ${testimonial.name}`}
            >
              {/* Top: Rating + Quote icon */}
              <div className="flex items-start justify-between mb-5">
                <StarRating rating={testimonial.rating} />
                <Quote
                  size={20}
                  className="text-gold/40 fill-gold/20"
                  aria-hidden="true"
                />
              </div>

              {/* Quote text */}
              <blockquote className="flex-1 mb-6">
                <p className="font-body text-neutral-600 text-sm leading-relaxed italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
              </blockquote>

              {/* Reviewer info */}
              <div className="flex items-center gap-3 pt-4 border-t border-neutral-100">
                {/* Avatar initials */}
                <div
                  className={`
                    shrink-0 flex items-center justify-center
                    w-10 h-10 rounded-full
                    font-body text-sm font-semibold
                    ${testimonial.avatarColor}
                  `}
                  aria-hidden="true"
                >
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-heading text-primary text-sm font-medium">
                    {testimonial.name}
                  </p>
                  <p className="font-body text-neutral-400 text-xs">
                    {testimonial.service}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
