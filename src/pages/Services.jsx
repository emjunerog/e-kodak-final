/**
 * Services.jsx — /services
 * ========================
 * FULL SERVICES PAGE
 *
 * Data Architecture:
 *  • On mount → calls getServices() from contentService.js
 *  • If Supabase is configured → fetches live from `services` table
 *  • If not configured / offline → seamlessly returns local servicesData.js
 *  • Zero user-facing difference between modes
 *
 * To add/edit a service without Supabase:
 *  → Edit src/data/servicesData.js
 *
 * To add/edit a service WITH Supabase:
 *  → Update the `services` table in your Supabase dashboard
 *  → Changes reflect immediately on next page load (no redeploy needed)
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, MapPin } from "lucide-react";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageHero from "../components/ui/PageHero";
import SectionHeader from "../components/ui/SectionHeader";
import PackageCard from "../components/services/PackageCard";
import SetsSectionRenderer from "../components/services/SetsSectionRenderer";
import PackageFinder from "../components/services/PackageFinder";
import ServiceNavigator from "../components/services/ServiceNavigator";
import ServiceFAQ from "../components/services/ServiceFAQ";

import { SERVICE_CATEGORIES } from "../data/servicesData";
import { ADD_ONS as STATIC_ADD_ONS } from "../data/servicesData";
import { FAQS, FAQ_TOPICS } from "../data/faqData";
import { siteConfig } from "../config/siteConfig";
import { useScrollReveal } from "../lib/useScrollReveal";
import { getServices, getAddOns, getFaqs } from "../services/contentService";

// Filter FAQs to booking & pricing topics for the services page
const defaultServicesFaqs = FAQS.filter((f) =>
  ["booking", "pricing", "delivery"].includes(f.topic)
);

export default function Services() {
  // ── Data State ────────────────────────────────────────────────────────────
  const [servicesList, setServicesList] = useState([]);
  const [addOns, setAddOns]             = useState(STATIC_ADD_ONS);
  const [faqsList, setFaqsList]         = useState(defaultServicesFaqs);
  const [isFromDb, setIsFromDb]         = useState(false);
  const [isLoading, setIsLoading]       = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [highlightedSlug, setHighlightedSlug] = useState(null);

  // ── Fetch services, add-ons & faqs on mount ──────────────────────────────
  useEffect(() => {
    let isMounted = true;
    Promise.all([getServices(), getAddOns(), getFaqs()]).then(([svcRes, addRes, faqRes]) => {
      if (isMounted) {
        setServicesList(svcRes.data);
        setIsFromDb(svcRes.isFromDatabase);
        if (addRes.data && addRes.data.length > 0) setAddOns(addRes.data);
        if (faqRes.data && faqRes.data.length > 0) {
          const liveFaqs = faqRes.data.filter((f) =>
            ["booking", "pricing", "delivery"].includes((f.topic || f.category || "").toLowerCase())
          );
          setFaqsList(liveFaqs.length > 0 ? liveFaqs : faqRes.data);
        }
        setIsLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // ── Filter by active category ─────────────────────────────────────────────
  const filtered = activeCategory === "all"
    ? servicesList
    : servicesList.filter((s) => s.category === activeCategory);

  const { ref: addOnsRef, inView: addOnsIn } = useScrollReveal({ threshold: 0.05 });
  const { ref: ctaRef,    inView: ctaIn    } = useScrollReveal({ threshold: 0.2 });

  return (
    <>
      <Navbar />

      <main id="main-content">

        {/* ── 1. Page Hero ──────────────────────────────────────────────────── */}
        <PageHero
          eyebrow="What We Offer"
          title="Our Photography Services"
          subtitle="From intimate portrait sessions to full-scale event coverage — choose the package that's right for your moment."
          image="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1920&q=85&auto=format&fit=crop"
          imageAlt="Camera and photography equipment on a table"
        />

        {/* ── 2. Sticky Category Filter ─────────────────────────────────────── */}
        <section className="sticky top-16 md:top-20 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-100 shadow-warm-sm">
          <div className="container-custom py-3">
            <div
              className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
              role="tablist"
              aria-label="Service categories"
            >
              {SERVICE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={activeCategory === cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 px-5 py-2 rounded-full text-xs font-body font-medium uppercase tracking-wider transition-all duration-200 ${
                    activeCategory === cat.id
                      ? "bg-primary text-white shadow-warm-sm"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-primary"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Package Cards Grid ─────────────────────────────────────────── */}
        <section className="section-padding bg-neutral-50" aria-label="Service packages">
          <div className="container-custom">
            {/* Payment Policy Banner */}
            <div className="mb-10 p-5 rounded-2xl bg-gradient-to-r from-gold/10 via-gold/5 to-transparent border border-gold/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                  <Sparkles size={20} className="text-gold-dark" />
                </div>
                <div>
                  <h4 className="font-heading text-primary text-lg font-medium">Booking Policy</h4>
                  <p className="font-body text-neutral-600 text-sm">Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.</p>
                </div>
              </div>
            </div>

            {/* Data source badge */}
            <div className="flex items-center justify-between mb-10">
              <p className="font-body text-neutral-400 text-sm">
                Showing{" "}
                <span className="text-primary font-medium">{filtered.length}</span>{" "}
                service{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                {isFromDb && (
                  <span className="px-2 py-1 rounded-md bg-green-50 border border-green-200 text-green-700 font-body text-[10px] font-semibold uppercase tracking-wider">
                    ✓ Live from Database
                  </span>
                )}
                <p className="font-body text-neutral-400 text-xs">
                  All prices in Philippine Peso (₱)
                </p>
              </div>
            </div>

            {/* ── Package Finder Wizard ─────────────────────────────────── */}
            <PackageFinder
              onRecommend={(slug) => {
                setHighlightedSlug(slug);
                // Auto-clear highlight after 4 seconds
                setTimeout(() => setHighlightedSlug(null), 4000);
              }}
            />

            {/* ── Status bar ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-gold" />
                <p className="font-body text-neutral-500 text-sm">
                  Showing{" "}
                  <span className="text-primary font-semibold">{filtered.length}</span>{" "}
                  service{filtered.length !== 1 ? "s" : ""}
                  {activeCategory !== "all" && (
                    <span className="text-neutral-400"> in <span className="text-primary font-medium capitalize">{activeCategory}</span></span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isFromDb && (
                  <span className="px-2 py-1 rounded-md bg-green-50 border border-green-200 text-green-700 font-body text-[10px] font-semibold uppercase tracking-wider">
                    ✓ Live
                  </span>
                )}
                <p className="font-body text-neutral-400 text-xs">All prices in ₱</p>
              </div>
            </div>

            {/* Loading skeleton */}
            {isLoading && (
              <div className="space-y-8">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-3xl border border-neutral-100 overflow-hidden animate-pulse">
                    <div className="h-56 bg-neutral-200" />
                    <div className="bg-neutral-800 h-20" />
                    <div className="p-7 space-y-3">
                      <div className="h-4 bg-neutral-200 rounded w-1/2" />
                      <div className="h-3 bg-neutral-100 rounded w-3/4" />
                      <div className="h-3 bg-neutral-100 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Packages */}
            {!isLoading && (
              <div className="space-y-16">
                {filtered.map((service, idx) => (
                  <div
                    key={service.id || service.slug}
                    id={`service-block-${service.slug}`}
                    data-service-slug={service.slug}
                    className={`space-y-6 scroll-mt-28 transition-all duration-500 ${
                      highlightedSlug === service.slug
                        ? "ring-2 ring-gold/40 rounded-3xl ring-offset-4"
                        : ""
                    }`}
                  >
                    {/* ── Contextual section header ─────────────────────── */}
                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-3">
                        <span className="font-body text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">
                          {idx + 1} of {filtered.length}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-neutral-300" />
                        <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500 text-[10px] font-body font-bold uppercase tracking-wider capitalize">
                          {service.category}
                        </span>
                        {highlightedSlug === service.slug && (
                          <span className="px-2.5 py-1 rounded-full bg-gold/15 text-gold text-[10px] font-body font-bold uppercase tracking-wider animate-pulse">
                            ✨ Recommended for you
                          </span>
                        )}
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-neutral-200 to-transparent" />
                    </div>

                    {/* Overview card */}
                    <PackageCard service={service} showTiers={false} />

                    {/* Individual tier/set cards + comparison table */}
                    <SetsSectionRenderer service={service} />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="text-center py-20">
                <p className="font-heading text-primary text-2xl mb-2">No services found</p>
                <p className="font-body text-neutral-400 text-sm">
                  Try selecting a different category.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── 4. Add-Ons Section ────────────────────────────────────────────── */}
        <section className="section-padding bg-primary" aria-labelledby="addons-heading">
          <div className="container-custom">
            <div
              ref={addOnsRef}
              className={`transition-all duration-700 ease-smooth ${
                addOnsIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <SectionHeader
                eyebrow="Customize Your Session"
                title="Optional Add-Ons"
                subtitle="Enhance any package with these optional extras."
                light
                id="addons-heading"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {addOns.map((addon) => (
                  <div
                    key={addon.name}
                    className="flex items-start justify-between gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-gold/30 transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <Sparkles size={14} className="text-gold mt-0.5 shrink-0" aria-hidden="true" />
                      <p className="font-body text-white text-sm leading-snug">{addon.name}</p>
                    </div>
                    <span className="font-body text-gold text-sm font-medium shrink-0">{addon.price}</span>
                  </div>
                ))}
              </div>

              <p className="font-body text-neutral-500 text-xs text-center mt-6">
                Add-ons can be requested during the booking process or after your session is confirmed.
              </p>
            </div>
          </div>
        </section>

        {/* ── 5. FAQ Accordion ──────────────────────────────────────────────── */}
        <ServiceFAQ
          faqs={faqsList}
          topics={FAQ_TOPICS.filter((t) => ["booking", "pricing", "delivery"].includes(t.id))}
          title="Common Questions"
          subtitle="Have a different question? Contact us directly and we'll get back to you within 24 hours."
        />

        {/* ── 6. Closing CTA ────────────────────────────────────────────────── */}
        <section className="section-padding bg-neutral-50 border-t border-neutral-100" ref={ctaRef}>
          <div
            className={`container-custom text-center transition-all duration-700 ease-smooth ${
              ctaIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <p className="section-eyebrow">Ready to book?</p>
            <h2 className="section-title mb-4">Let's create something beautiful.</h2>
            <p className="section-subtitle mx-auto text-center mb-8">
              Create your free account and book your session in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={siteConfig.routes.register} className="btn-primary inline-flex items-center gap-2">
                Book a Session <ArrowRight size={16} />
              </Link>
              <Link to={siteConfig.routes.contact} className="btn-outline inline-flex items-center gap-2">
                Ask a Question
              </Link>
            </div>
          </div>
        </section>

      </main>

      <ServiceNavigator services={filtered} />

      <Footer />
    </>
  );
}
