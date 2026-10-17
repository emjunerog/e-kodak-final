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
 * Page chrome:
 *  • Full-bleed sticky "Viewing" bar — always occupies the whole width and
 *    shows the package currently under the reading line (it publishes its own
 *    live height as --viewing-h so scroll math and the right rail agree).
 *  • Right "Packages" rail — jump navigation, tracks the same active package.
 *  • One package block per scroll step (proximity scroll-snap).
 *
 * To add/edit a service without Supabase:
 *  → Edit src/data/servicesData.js
 *
 * To add/edit a service WITH Supabase:
 *  → Update the `services` table in your Supabase dashboard
 *  → Changes reflect immediately on next page load (no redeploy needed)
 */

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, X, Search, Shield, Check, FileText, ListChecks } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageHero from "../components/ui/PageHero";
import SectionHeader from "../components/ui/SectionHeader";
import PackageCard from "../components/services/PackageCard";
import SetsSectionRenderer from "../components/services/SetsSectionRenderer";
import PackageFinder from "../components/services/PackageFinder";
import TermsPolicyModal from "../components/services/TermsPolicyModal";
import ServiceNavigator from "../components/services/ServiceNavigator";
import ServiceFAQ from "../components/services/ServiceFAQ";

import { ADD_ONS as STATIC_ADD_ONS } from "../data/servicesData";
import { FAQS, FAQ_TOPICS } from "../data/faqData";
import { siteConfig } from "../config/siteConfig";
import { useScrollReveal } from "../lib/useScrollReveal";
import { getServices, getAddOns, getFaqs } from "../services/contentService";
import { ease } from "../lib/motion";
import {
  scrollToId,
  scrollToIdWhenReady,
  shortServiceLabel,
  useActiveSection,
} from "../lib/sectionNav";

/** Single-package jumps live pinned at the top of the right rail. */
const PINNED_SLUGS = ["college-packages", "senior-high-packages"];

// Filter FAQs to booking & pricing topics for the services page
const defaultServicesFaqs = FAQS.filter((f) =>
  ["booking", "pricing", "delivery"].includes(f.topic)
);

const setCountOf = (service) =>
  Array.isArray(service?.tiers) ? service.tiers.length : 0;

const recommendedCountOf = (service) =>
  Array.isArray(service?.tiers) ? service.tiers.filter((t) => t?.popular).length : 0;

export default function Services() {
  // ── Data State ────────────────────────────────────────────────────────────
  const [servicesList, setServicesList] = useState([]);
  const [addOns, setAddOns]             = useState(STATIC_ADD_ONS);
  const [faqsList, setFaqsList]         = useState(defaultServicesFaqs);
  const [isLoading, setIsLoading]       = useState(true);
  const [highlightedSlug, setHighlightedSlug] = useState(null);
  const [isFinderOpen, setIsFinderOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  const viewingBarRef = useRef(null);
  const highlightTimer = useRef(null);

  // ── Fetch services, add-ons & faqs on mount ──────────────────────────────
  useEffect(() => {
    let isMounted = true;
    Promise.all([getServices(), getAddOns(), getFaqs()]).then(([svcRes, addRes, faqRes]) => {
      if (isMounted) {
        setServicesList(svcRes.data);
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

  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  // ── Reading line: which package is on screen ─────────────────────────────
  const blockIds = useMemo(
    () => servicesList.map((service) => `service-block-${service.slug}`),
    [servicesList]
  );
  const activeId = useActiveSection(blockIds);
  const activeSlug = activeId ? activeId.replace(/^service-block-/, "") : null;
  const activeIndex = activeSlug
    ? servicesList.findIndex((service) => service.slug === activeSlug)
    : -1;
  const activeService = activeIndex >= 0 ? servicesList[activeIndex] : null;

  const pinnedServices = useMemo(
    () => servicesList.filter((service) => PINNED_SLUGS.includes(service.slug)),
    [servicesList]
  );

  // ── Publish the Viewing bar height → --viewing-h ─────────────────────────
  useLayoutEffect(() => {
    const el = viewingBarRef.current;
    if (!el) return undefined;
    const root = document.documentElement;
    const publish = () => root.style.setProperty("--viewing-h", `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--viewing-h");
    };
  }, []);

  // One scroll ≈ one package (proximity snap, only while this page is mounted)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("services-snap");
    return () => root.classList.remove("services-snap");
  }, []);

  // Deep links from the landing page (/services#sets-…) arrive while loading.
  useEffect(() => {
    if (isLoading) return undefined;
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return undefined;
    return scrollToIdWhenReady(id);
  }, [isLoading]);

  // ── Summary popover: click-away + Esc ────────────────────────────────────
  useEffect(() => {
    if (!isSummaryOpen) return undefined;
    const onPointerDown = (event) => {
      const bar = viewingBarRef.current;
      if (bar && !bar.contains(event.target)) setIsSummaryOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsSummaryOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isSummaryOpen]);

  const jumpToPackage = (slug) => {
    setIsSummaryOpen(false);
    scrollToId(`service-block-${slug}`);
  };

  const handleRecommend = (slug) => {
    setHighlightedSlug(slug);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedSlug(null), 6000);
    scrollToId(`service-block-${slug}`);
  };

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

        {/* ── 2. Sticky Viewing bar (full-bleed, detects the current package) ── */}
        <section
          ref={viewingBarRef}
          className="sticky top-[var(--nav-h)] z-30 bg-white/95 backdrop-blur-md border-b border-neutral-100 shadow-warm-sm transition-[top] duration-300 ease-smooth"
          aria-label="Viewing"
        >
          <div className="container-custom py-3">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Current package */}
              <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                <span className="hidden sm:block shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                  Viewing
                </span>
                <span className="hidden sm:block h-1 w-1 shrink-0 rounded-full bg-gold/60" />
                <span
                  className={`min-w-0 truncate font-heading text-lg sm:text-xl transition-colors duration-300 ${
                    activeService ? "text-primary" : "text-neutral-500"
                  }`}
                >
                  {activeService ? shortServiceLabel(activeService) : "All Packages"}
                </span>
                {activeService && (
                  <>
                    <span className="hidden sm:block h-1 w-1 shrink-0 rounded-full bg-neutral-300" />
                    <span className="hidden sm:block shrink-0 font-body text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 tabular-nums">
                      {String(activeIndex + 1).padStart(2, "0")} / {String(servicesList.length).padStart(2, "0")}
                    </span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="relative flex shrink-0 items-center gap-2">
                {servicesList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsSummaryOpen((open) => !open)}
                    aria-expanded={isSummaryOpen}
                    className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 font-body text-xs font-bold transition-all duration-300 ${
                      isSummaryOpen
                        ? "border-gold text-gold bg-gold/5"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-gold hover:text-gold"
                    }`}
                  >
                    <ListChecks size={14} strokeWidth={2} />
                    Summary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFinderOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-body text-xs font-bold text-white shadow-md shadow-primary/10 transition-all duration-300 hover:bg-gold hover:text-neutral-950"
                >
                  Find Package
                </button>

                <AnimatePresence>
                  {isSummaryOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: ease.expo }}
                      className="absolute right-0 top-[calc(100%+12px)] w-[min(92vw,22rem)] max-h-[min(70vh,34rem)] overflow-y-auto custom-scrollbar rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.3)]"
                    >
                      <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                        All Packages · {servicesList.length}
                      </p>
                      <ul className="flex flex-col gap-0.5" role="list">
                        {servicesList.map((service, index) => (
                          <li key={service.id || service.slug}>
                            <button
                              type="button"
                              onClick={() => jumpToPackage(service.slug)}
                              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors duration-200 hover:bg-neutral-50 ${
                                activeSlug === service.slug ? "bg-gold/5" : ""
                              }`}
                            >
                              <span className="w-6 shrink-0 font-body text-[11px] font-bold text-neutral-400 tabular-nums">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-body text-sm font-medium text-neutral-700">
                                  {shortServiceLabel(service)}
                                </span>
                                <span className="block font-body text-[11px] text-neutral-400">
                                  {setCountOf(service)} sets · {recommendedCountOf(service)} recommended
                                </span>
                              </span>
                              <ArrowRight size={14} className="shrink-0 text-neutral-300" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Package Cards Grid ─────────────────────────────────────────── */}
        <section className="section-padding bg-neutral-50" aria-label="Service packages">
          <div className="container-custom">
            {/* Right rail gutter — keeps content clear of the Packages rail on lg+ */}
            <div className="lg:pr-[13rem]">
              {/* ── Booking policy card (Ultra Premium Black) ── */}
              <div className="mb-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  className="rounded-3xl bg-[#0a0a0a] border border-[#222] p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between relative overflow-hidden gap-8"
                >
                  {/* Subtle gold mesh/glow */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-[80px] pointer-events-none mix-blend-screen transform translate-x-1/3 -translate-y-1/3" />
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

                  <div className="relative z-10 flex-1">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/10 flex items-center justify-center shrink-0 shadow-inner">
                        <Shield className="text-gold" size={24} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="font-heading text-2xl font-semibold text-white tracking-wide">Booking & Payment Policies</h3>
                        <p className="text-xs font-body text-neutral-500 uppercase tracking-widest mt-1">Please read carefully</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex items-start gap-3 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05]">
                        <div className="mt-0.5 shrink-0">
                          <Check size={18} className="text-gold" />
                        </div>
                        <p className="font-body text-[13px] text-neutral-400 leading-relaxed">
                          <span className="font-semibold text-white block mb-0.5">50% Downpayment</span>
                          Required to officially secure your booking date.
                        </p>
                      </div>
                      <div className="flex items-start gap-3 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05]">
                        <div className="mt-0.5 shrink-0">
                          <Check size={18} className="text-gold" />
                        </div>
                        <p className="font-body text-[13px] text-neutral-400 leading-relaxed">
                          <span className="font-semibold text-white block mb-0.5">Full Payment</span>
                          The remaining balance is due on the event day.
                        </p>
                      </div>
                      <div className="flex items-start gap-3 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05]">
                        <div className="mt-0.5 shrink-0">
                          <Check size={18} className="text-gold" />
                        </div>
                        <p className="font-body text-[13px] text-neutral-400 leading-relaxed">
                          <span className="font-semibold text-white block mb-0.5">Non-refundable</span>
                          All downpayments are strictly non-transferable.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Policy actions */}
                  <div className="relative z-10 flex shrink-0 md:pl-8 md:border-l md:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setIsPolicyModalOpen(true)}
                      className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-[#D4AF37] hover:bg-[#F3E5AB] text-neutral-950 font-body text-sm font-bold transition-all duration-300 cursor-pointer w-full md:w-auto shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:-translate-y-0.5"
                    >
                      <FileText size={18} className="transition-transform group-hover:scale-110" />
                      <span>Review Full Policy</span>
                    </button>
                  </div>
                </motion.div>
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

              {/* Packages — one block per scroll, generous gap so a scroll
                  settles on a package instead of flowing into the next one */}
              {!isLoading && (
                <div className="space-y-28 lg:space-y-40">
                  {servicesList.map((service, idx) => (
                    <div
                      key={service.id || service.slug}
                      id={`service-block-${service.slug}`}
                      data-service-slug={service.slug}
                      className={`space-y-6 scroll-mt-[calc(var(--nav-h)_+_var(--viewing-h)_+_24px)] transition-all duration-500 ${
                        highlightedSlug === service.slug
                          ? "ring-2 ring-gold/40 rounded-3xl ring-offset-4"
                          : ""
                      }`}
                    >
                      {/* ── Per-package header ────────────────────────────── */}
                      <div className="flex items-end gap-4 pt-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-gold tabular-nums">
                              {String(idx + 1).padStart(2, "0")} / {String(servicesList.length).padStart(2, "0")}
                            </span>
                            {highlightedSlug === service.slug && (
                              <>
                                <span className="h-1 w-1 rounded-full bg-neutral-300" />
                                <span className="rounded-full bg-gold/15 px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-wider text-gold animate-pulse">
                                  ✨ Recommended for you
                                </span>
                              </>
                            )}
                          </div>
                          <h2 className="mt-1.5 font-heading text-2xl md:text-3xl text-primary leading-snug">
                            {shortServiceLabel(service)}
                          </h2>
                          <p className="mt-1 font-body text-sm text-neutral-500">
                            {setCountOf(service)} sets
                            {recommendedCountOf(service) > 0 && ` · ${recommendedCountOf(service)} recommended`}
                          </p>
                        </div>
                        <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-neutral-200 to-transparent mb-3" />
                      </div>

                      {/* Overview card */}
                      <PackageCard service={service} />

                      {/* Individual tier/set cards */}
                      <SetsSectionRenderer service={service} />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && servicesList.length === 0 && (
                <div className="text-center py-20">
                  <p className="font-heading text-primary text-2xl mb-2">No packages found</p>
                  <p className="font-body text-neutral-400 text-sm">
                    Please check back soon — new packages are added regularly.
                  </p>
                </div>
              )}
            </div>
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
                subtitle="Enhance any package with these extras."
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

      <ServiceNavigator
        services={servicesList}
        pinned={pinnedServices}
        activeSlug={activeSlug}
        onJump={jumpToPackage}
      />

      {/* ── Floating Package Finder ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {isFinderOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: ease.expo }}
              className="mb-4 w-[min(92vw,24rem)] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden bg-neutral-950 border border-gold/30"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-neutral-900">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-gold" />
                  <span className="font-heading text-white font-semibold tracking-wide">Package Finder</span>
                </div>
                <button onClick={() => setIsFinderOpen(false)} className="text-neutral-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 max-h-[min(70vh,34rem)] overflow-y-auto custom-scrollbar">
                <PackageFinder
                  services={servicesList}
                  isOpen={true}
                  onToggle={setIsFinderOpen}
                  hideTrigger={true}
                  onRecommend={handleRecommend}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsFinderOpen(!isFinderOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={isFinderOpen ? "Close package finder" : "Open package finder"}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-gold to-gold-dark text-primary shadow-gold hover:shadow-gold-lg transition-all duration-300"
        >
          {isFinderOpen ? <X size={24} /> : <Search size={24} />}
        </motion.button>
      </div>

      <TermsPolicyModal isOpen={isPolicyModalOpen} onClose={() => setIsPolicyModalOpen(false)} />
      <Footer />
    </>
  );
}
