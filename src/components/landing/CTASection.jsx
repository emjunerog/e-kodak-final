/**
 * CTASection.jsx
 * ==============
 * CLOSING CALL TO ACTION SECTION
 *
 * The final section before the footer. Its job is to convert
 * browsing visitors into registered users or booking inquiries.
 *
 * Design:
 *  - Full-width photography background image
 *  - Strong dark overlay
 *  - Large editorial headline
 *  - Two CTA buttons: primary (Book) + secondary (Explore)
 *  - Centered layout
 */

import { Link } from "react-router-dom";
import { ArrowRight, Camera } from "lucide-react";
import { useScrollReveal } from "../../lib/useScrollReveal";
import { siteConfig } from "../../config/siteConfig";

// ─── PLACEHOLDER IMAGE — Replace before launch ──────────────────────────────
const ctaImage =
  "https://images.unsplash.com/photo-1554941829-202a0b2403b8?w=1920&q=85&auto=format&fit=crop";

export default function CTASection() {
  const { ref, inView } = useScrollReveal({ threshold: 0.2 });

  return (
    <section
      className="relative overflow-hidden"
      aria-labelledby="cta-heading"
    >
      {/* ── Background ──────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <img
          src={ctaImage}
          alt=""
          className="w-full h-full object-cover object-center no-drag"
          loading="lazy"
        />
        {/* Strong dark overlay */}
        <div className="absolute inset-0 bg-primary/85" />
        {/* Gold gradient accent at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-gold" />
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div
        ref={ref}
        className={`
          relative z-10
          py-24 md:py-32 lg:py-40
          container-custom text-center
          transition-all duration-700 ease-smooth
          ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
        `}
      >
        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/15 border border-gold/25 mb-7"
          aria-hidden="true"
        >
          <Camera size={12} className="text-gold" />
          <span className="font-body text-gold text-xs font-medium uppercase tracking-[0.2em]">
            Book Your Session
          </span>
        </div>

        {/* Headline */}
        <h2
          id="cta-heading"
          className="
            font-heading text-white
            text-3xl sm:text-4xl md:text-5xl lg:text-6xl
            leading-[1.1] tracking-tight text-balance
            mb-6
          "
        >
          Ready to turn your moments
          <br className="hidden sm:block" />
          <em className="italic text-gold-light" style={{ fontStyle: "italic" }}>
            {" "}into memories?
          </em>
        </h2>

        {/* Supporting text */}
        <p className="font-body text-white/65 text-base sm:text-lg leading-relaxed max-w-lg mx-auto mb-10">
          Join hundreds of clients who have trusted E-Kodak to capture
          their most important moments. Book your session today.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={siteConfig.routes.register}
            className="
              inline-flex items-center gap-2
              px-8 py-4 rounded-xl
              bg-gold text-primary
              font-body font-semibold text-sm tracking-wide
              transition-all duration-300 ease-smooth
              hover:bg-white hover:text-primary hover:shadow-warm-xl
              active:scale-[0.98]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-primary
            "
          >
            {siteConfig.nav.bookCta}
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
          <Link
            to={siteConfig.routes.services}
            className="btn-ghost-white"
          >
            Explore Services
          </Link>
        </div>
      </div>
    </section>
  );
}
