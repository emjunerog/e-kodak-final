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
import { ArrowRight, Sparkles, X, Search, FileText, ListChecks } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageHero from "../components/ui/PageHero";
import SectionHeader from "../components/ui/SectionHeader";
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

export default function Services() {
  // ── Data State ────────────────────────────────────────────────────────────
  const [servicesList, setServicesList] = useState([]);
  const [addOns, setAddOns] = useState(STATIC_ADD_ONS);
  const [faqsList, setFaqsList] = useState(defaultServicesFaqs);
  const [isLoading, setIsLoading] = useState(true);
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
  const { ref: ctaRef, inView: ctaIn } = useScrollReveal({ threshold: 0.2 });

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
                  className={`min-w-0 truncate font-heading text-lg sm:text-xl transition-colors duration-300 ${activeService ? "text-primary" : "text-neutral-500"
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
                    className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 font-body text-xs font-bold transition-all duration-300 ${isSummaryOpen
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
                              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors duration-200 hover:bg-neutral-50 ${activeSlug === service.slug ? "bg-gold/5" : ""
                                }`}
                            >
                              <span className="w-6 shrink-0 font-body text-[11px] font-bold text-neutral-400 tabular-nums">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-body text-sm font-medium text-neutral-700">
                                  {shortServiceLabel(service)}
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
              {/* ── Booking policy card ── */}
              <div className="mb-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  className="rounded-3xl border border-neutral-200/90 bg-white overflow-hidden shadow-warm-md"
                >
                  {/* Obsidian Header Band matching package cards */}
                  <div className="relative overflow-hidden bg-neutral-950 px-6 py-5 sm:px-7 sm:py-6">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute -top-16 -right-10 w-44 h-44 rounded-full bg-gold/20 blur-2xl pointer-events-none"
                    />
                    <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gold/20 border border-gold/30 text-gold font-body text-[10px] font-bold uppercase tracking-wider mb-2.5">
                          Please Read Before Booking
                        </span>
                        <h3 className="font-heading text-2xl sm:text-3xl font-bold text-white leading-tight">
                          Booking &amp; Payment Policies
                        </h3>
                      </div>
                      <p className="font-body text-xs text-white/60 sm:text-right">
                        Studio rules &amp; Philippine consumer protection
                      </p>
                    </div>
                  </div>

                  {/* White Body */}
                  <div className="p-6 sm:p-7">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-2xl bg-neutral-50 border border-neutral-200/80 p-5">
                        <span className="font-body text-xs font-bold tracking-[0.16em] text-gold-dark tabular-nums">
                          01
                        </span>
                        <h4 className="font-heading text-base font-semibold text-primary mt-1.5">
                          50% Downpayment
                        </h4>
                        <p className="font-body text-xs sm:text-[13px] text-neutral-600 leading-relaxed mt-1.5">
                          Required to lock your date, studio bay, and creative team. Disclosed upfront under the Consumer Act (RA 7394).
                        </p>
                      </div>

                      <div className="rounded-2xl bg-neutral-50 border border-neutral-200/80 p-5">
                        <span className="font-body text-xs font-bold tracking-[0.16em] text-gold-dark tabular-nums">
                          02
                        </span>
                        <h4 className="font-heading text-base font-semibold text-primary mt-1.5">
                          Shoot-Day Balance
                        </h4>
                        <p className="font-body text-xs sm:text-[13px] text-neutral-600 leading-relaxed mt-1.5">
                          Remaining 50% is settled on session day prior to shoot, backed by valid electronic receipts (RA 8792).
                        </p>
                      </div>

                      <div className="rounded-2xl bg-neutral-50 border border-neutral-200/80 p-5">
                        <span className="font-body text-xs font-bold tracking-[0.16em] text-gold-dark tabular-nums">
                          03
                        </span>
                        <h4 className="font-heading text-base font-semibold text-primary mt-1.5">
                          Fair Terms &amp; Remedies
                        </h4>
                        <p className="font-body text-xs sm:text-[13px] text-neutral-600 leading-relaxed mt-1.5">
                          Voluntary cancellations are non-transferable, while 72-hour notice, force majeure, or studio cancellation get full protection.
                        </p>
                      </div>
                    </div>

                    {/* Dashed Footer & Primary CTA Button */}
                    <div className="mt-6 pt-5 border-t border-dashed border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <p className="font-body text-xs text-neutral-500 leading-relaxed max-w-2xl">
                        Governed by Philippine laws — <span className="font-medium text-primary">Consumer Act (RA 7394)</span>, <span className="font-medium text-primary">Data Privacy Act (RA 10173)</span>, <span className="font-medium text-primary">IP Code (RA 8293)</span>, <span className="font-medium text-primary">E-Commerce Act (RA 8792)</span>, and the <span className="font-medium text-primary">Civil Code</span> — protecting both client and studio.
                      </p>

                      <button
                        type="button"
                        onClick={() => setIsPolicyModalOpen(true)}
                        className="group shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold to-gold-light text-primary font-body text-sm font-bold shadow-gold hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 transition-all duration-200 cursor-pointer w-full sm:w-auto whitespace-nowrap"
                      >
                        <FileText size={16} className="shrink-0" />
                        <span>Review Full Policy</span>
                        <ArrowRight size={16} className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </button>
                    </div>
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
                      className={`space-y-6 scroll-mt-[calc(var(--nav-h)_+_var(--viewing-h)_+_24px)] transition-all duration-500 ${highlightedSlug === service.slug
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
                        </div>
                        <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-neutral-200 to-transparent mb-3" />
                      </div>

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
              className={`transition-all duration-700 ease-smooth ${addOnsIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
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
            className={`container-custom text-center transition-all duration-700 ease-smooth ${ctaIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
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
