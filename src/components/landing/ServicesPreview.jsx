/**
 * ServicesPreview.jsx
 * ===================
 * SERVICES SECTION — Landing Page
 *
 * Pulls live data from Supabase via contentService.getServices().
 * Falls back to servicesData.js if Supabase is not configured.
 *
 * Layout:
 *  1. Section header
 *  2. Featured graduation packages spotlight (College & Studio — directly from DB)
 *  3. All other services grid (Portrait, Event, Family, etc.)
 *  4. "View All" CTA
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ServiceCard from "./ServiceCard";
import { useScrollReveal } from "../../lib/useScrollReveal";
import { siteConfig } from "../../config/siteConfig";
import { getServices } from "../../services/contentService";

// ── Quick comparison mini-card for grad packages ──────────────────────────────
function GradPackageSpotlight({ service }) {
  if (!service) return null;
  const tiers = service.tiers || [];
  const lowestTier = [...tiers].sort((a, b) => {
    const av = parseFloat(a.price?.replace(/[₱,]/g, "") || "9999");
    const bv = parseFloat(b.price?.replace(/[₱,]/g, "") || "9999");
    return av - bv;
  })[0];
  const isCollege = service.slug === "college-packages";

  return (
    <div className={`relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg ${
      isCollege
        ? "border-gold bg-gradient-to-br from-primary to-primary-dark shadow-gold/20"
        : "border-neutral-200 bg-white shadow-warm-md"
    }`}>
      {/* Image */}
      {service.coverImage && (
        <div className="h-44 overflow-hidden relative">
          <img
            src={service.coverImage}
            alt={service.name}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            loading="lazy"
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${isCollege ? "from-primary" : "from-black/60"} via-transparent to-transparent`} />
          {isCollege && (
            <span className="absolute top-3 right-3 px-2.5 py-1 bg-gold text-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
              ⭐ Most Complete
            </span>
          )}
          {!isCollege && (
            <span className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
              💚 Best Value
            </span>
          )}
        </div>
      )}

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className={`font-heading text-xl font-semibold mb-1 ${isCollege ? "text-white" : "text-primary"}`}>
          {service.name}
        </h3>
        {service.tagline && (
          <p className={`font-body text-sm italic mb-3 ${isCollege ? "text-gold" : "text-gold"}`}>{service.tagline}</p>
        )}

        {/* Price range */}
        <div className={`flex items-center gap-2 mb-4 pb-3 border-b ${isCollege ? "border-white/15" : "border-neutral-100"}`}>
          <span className={`font-body text-xs ${isCollege ? "text-white/50" : "text-neutral-400"}`}>Starting at</span>
          <span className={`font-heading text-2xl font-bold ${isCollege ? "text-gold" : "text-primary"}`}>
            {lowestTier?.price ?? "₱795"}
          </span>
        </div>

        {/* Quick highlights */}
        <ul className="space-y-1.5 flex-1 mb-5">
          {(tiers[0]?.highlights || []).slice(0, 4).map((h) => (
            <li key={h} className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold ${isCollege ? "bg-gold/20 text-gold" : "bg-gold/15 text-gold"}`}>✓</span>
              <span className={`font-body text-[11px] leading-snug ${isCollege ? "text-white/75" : "text-neutral-600"}`}>{h}</span>
            </li>
          ))}
          {tiers.length > 1 && (
            <li className={`font-body text-[10px] font-semibold ${isCollege ? "text-gold" : "text-gold"}`}>
              + {tiers.length} package options
            </li>
          )}
        </ul>

        {/* Free inclusions badge */}
        {service.inclusions && service.inclusions.length > 0 && (
          <div className={`mb-4 px-3 py-2 rounded-lg text-[10px] font-body ${isCollege ? "bg-white/10 text-white/80" : "bg-gold/5 text-neutral-600 border border-gold/15"}`}>
            <span className="font-semibold">FREE: </span>{service.inclusions[0]}
          </div>
        )}

        <Link
          to={siteConfig.routes.services}
          className={`mt-auto text-center py-2.5 rounded-xl text-sm font-body font-semibold transition-all duration-200 active:scale-95 ${
            isCollege
              ? "bg-gold text-primary hover:bg-gold-dark"
              : "bg-primary text-white hover:bg-primary-light"
          }`}
        >
          See All {service.name.split(" ")[0]} Packages
        </Link>
      </div>
    </div>
  );
}

export default function ServicesPreview() {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getServices().then((res) => {
      if (mounted) {
        setServices(res.data);
        setIsLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const { ref: headRef, inView: headIn } = useScrollReveal();
  const { ref: gradRef, inView: gradIn } = useScrollReveal({ threshold: 0.05 });
  const { ref: gridRef, inView: gridIn } = useScrollReveal({ threshold: 0.05 });

  const gradServices = services.filter(s => s.category === "college" || s.category === "senior-high" || s.slug === "college-packages" || s.slug === "senior-high-packages");
  const weddingServices = services.filter(s => s.category === "wedding-video" || s.category === "wedding-photo" || s.slug?.startsWith("wedding"));

  function getStartingPrice(service) {
    if (!service.tiers || service.tiers.length === 0) return "Contact for pricing";
    const prices = service.tiers
      .map(t => parseFloat(t.price?.replace(/[₱,]/g, "") || "0"))
      .filter(Boolean);
    const min = prices.length ? Math.min(...prices) : null;
    return min ? `Starting at ₱${min.toLocaleString()}` : "Contact for pricing";
  }

  return (
    <section
      className="section-padding bg-neutral-50"
      aria-labelledby="services-heading"
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
          <p className="section-eyebrow">What We Offer</p>
          <h2 id="services-heading" className="section-title">
            Photography & Video Packages
          </h2>
          <p className="section-subtitle mx-auto text-center">
            From premier graduation milestone packages to full-scale wedding photography and HD videography —
            every package is crafted for an unforgettable experience.
          </p>
        </div>

        {/* ── Loading Skeleton ─────────────────────────────────────────────── */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {[1, 2].map((i) => (
              <div key={i} className="bg-surface rounded-2xl border border-neutral-100 overflow-hidden animate-pulse">
                <div className="h-44 bg-neutral-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-neutral-200 rounded w-1/2" />
                  <div className="h-3 bg-neutral-100 rounded w-3/4" />
                  <div className="h-3 bg-neutral-100 rounded w-full" />
                  <div className="h-3 bg-neutral-100 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Graduation Spotlight ─────────────────────────────────────────── */}
        {!isLoading && gradServices.length > 0 && (
          <>
            <div
              ref={gradRef}
              className={`transition-all duration-700 ease-smooth ${gradIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              {/* Graduation category header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎓</span>
                  <div>
                    <p className="font-body text-[11px] uppercase tracking-widest text-neutral-400 font-semibold">Academic Milestones</p>
                    <h3 className="font-heading text-primary text-xl font-semibold">College & Senior High Packages</h3>
                  </div>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-gold/30 to-transparent" />
                <Link
                  to={siteConfig.routes.services}
                  className="font-body text-xs text-gold hover:text-gold-dark font-semibold flex items-center gap-1 transition-colors shrink-0"
                >
                  View all <ArrowRight size={12} />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-14">
                {gradServices.map(s => (
                  <GradPackageSpotlight key={s.slug} service={s} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Wedding Services Grid ──────────────────────────────────────────── */}
        {!isLoading && weddingServices.length > 0 && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💍</span>
                <div>
                  <p className="font-body text-[11px] uppercase tracking-widest text-neutral-400 font-semibold">Heirloom Coverage</p>
                  <h3 className="font-heading text-primary text-xl font-semibold">Wedding Photography & HD Video</h3>
                </div>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-neutral-200 to-transparent" />
            </div>
            <div
              ref={gridRef}
              className={`
                grid grid-cols-1 sm:grid-cols-2 gap-6
                transition-all duration-700 ease-smooth
                ${gridIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}
              `}
            >
              {weddingServices.map((service) => (
                <ServiceCard
                  key={service.id || service.slug}
                  image={service.coverImage}
                  imageAlt={`${service.name} — photography service`}
                  category={service.category}
                  title={service.name}
                  description={service.description}
                  price={getStartingPrice(service)}
                  to={siteConfig.routes.services}
                />
              ))}
            </div>
          </>
        )}

        {/* ── View All CTA ────────────────────────────────────────────────── */}
        <div className="text-center mt-12">
          <Link
            to={siteConfig.routes.services}
            className="btn-outline inline-flex items-center gap-2"
          >
            View All Services & Packages
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
