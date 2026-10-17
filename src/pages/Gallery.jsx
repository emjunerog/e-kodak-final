/**
 * Gallery.jsx — /gallery
 * ======================
 * FULL GALLERY PAGE
 *
 * Data Architecture:
 *  • On mount → calls getGalleryItems() from contentService.js
 *  • If Supabase is configured → fetches live from `gallery_items` table
 *  • If not configured / offline → seamlessly returns local galleryData.js
 *
 * To add photos without Supabase:
 *  → Edit src/data/galleryData.js
 *
 * To add photos WITH Supabase:
 *  → Insert rows into `gallery_items` table in your Supabase dashboard
 *  → Set is_public = true so they appear on the public website
 */

import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Camera, Heart, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageHero from "../components/ui/PageHero";
import GalleryLightbox from "../components/gallery/GalleryLightbox";

import { GALLERY_CATEGORIES } from "../data/galleryData";
import { siteConfig } from "../config/siteConfig";
import {
  viewport,
  stagger,
  staggerChild,
  fadeUp,
  lineReveal,
  ease,
} from "../lib/motion";
import { getGalleryItems } from "../services/contentService";

export default function Gallery() {
  // ── Data State ────────────────────────────────────────────────────────────
  const [itemsList, setItemsList]         = useState([]);
  const [isFromDb, setIsFromDb]           = useState(false);
  const [isLoading, setIsLoading]         = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [lightboxIndex, setLightboxIndex]   = useState(null);

  // ── Fetch gallery on mount ────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    getGalleryItems().then((res) => {
      if (isMounted) {
        setItemsList(res.data);
        setIsFromDb(res.isFromDatabase);
        setIsLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const filtered = activeCategory === "all"
    ? itemsList
    : itemsList.filter((item) => item.category === activeCategory);

  const openLightbox  = useCallback((idx) => setLightboxIndex(idx), []);
  const closeLightbox = useCallback(()    => setLightboxIndex(null), []);
  const navigate      = useCallback((idx) => setLightboxIndex(idx), []);

  return (
    <>
      <Navbar />

      <main id="main-content">

        {/* ── 1. Page Hero ──────────────────────────────────────────────────── */}
        <PageHero
          eyebrow="Portfolio"
          title="From Our Lens"
          subtitle="A curated collection of our photography work — portraits, graduations, events, families, couples, and commercial sessions."
            image="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=1920&q=85&auto=format&fit=crop"
            imageAlt="Golden-hour portrait captured during a studio session"
        />

        {/* ── 2. Category Filter ────────────────────────────────────────────── */}
        <section className="sticky top-[var(--nav-h)] z-30 bg-white/95 backdrop-blur-md border-b border-neutral-100 shadow-warm-sm transition-[top] duration-300 ease-smooth">
          <div className="container-custom py-3">
            <motion.div
              className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
              role="tablist"
              aria-label="Gallery categories"
              variants={stagger(0.05)}
              initial="hidden"
              animate="show"
            >
              {GALLERY_CATEGORIES.map((cat) => (
                <motion.button
                  key={cat.id}
                  role="tab"
                  aria-selected={activeCategory === cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setLightboxIndex(null);
                  }}
                  variants={staggerChild}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  className={`shrink-0 px-5 py-2 rounded-full text-xs font-body font-medium uppercase tracking-wider transition-[background-color,color,box-shadow] duration-200 ${
                    activeCategory === cat.id
                      ? "bg-primary text-white shadow-warm-sm"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-primary"
                  }`}
                >
                  {cat.label}
                </motion.button>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── 3. Gallery Grid ───────────────────────────────────────────────── */}
        <section className="section-padding bg-neutral-50" aria-label="Photo gallery">
          <div className="container-custom">

            {/* Count + live badge */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
              className="flex items-center justify-between mb-8"
            >
              <p className="font-body text-neutral-400 text-sm">
                <motion.span
                  key={`gcount-${activeCategory}-${filtered.length}`}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, ease: ease.spring }}
                  className="inline-block text-primary font-medium"
                >
                  {filtered.length}
                </motion.span>{" "}
                photo{filtered.length !== 1 ? "s" : ""}
                {activeCategory !== "all" && (
                  <span className="text-neutral-400"> in {activeCategory}</span>
                )}
              </p>
              <div className="flex items-center gap-3">
                {isFromDb && (
                  <span className="px-2 py-1 rounded-md bg-green-50 border border-green-200 text-green-700 font-body text-[10px] font-semibold uppercase tracking-wider">
                    ✓ Live from Database
                  </span>
                )}
                <p className="font-body text-neutral-400 text-xs hidden sm:block">
                  Click any photo to view full size
                </p>
              </div>
            </motion.div>

            {/* Loading skeleton */}
            {isLoading && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4" style={{ columnGap: "1rem" }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="mb-4 rounded-xl bg-neutral-200 animate-pulse break-inside-avoid"
                    style={{ height: `${[240, 300, 200, 260, 320, 210][i - 1]}px` }}
                  />
                ))}
              </div>
            )}

            {/* Masonry-style CSS columns grid */}
            {!isLoading && (
              <motion.div
                className="columns-1 sm:columns-2 lg:columns-3"
                style={{ columnGap: "1rem" }}
                variants={stagger(0.06)}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                {filtered.map((item, idx) => (
                  <motion.button
                    key={item.id}
                    variants={staggerChild}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.28 } }}
                    whileHover={{ y: -8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className="block w-full mb-4 relative group overflow-hidden rounded-xl
                      ring-0 group-hover:ring-2 group-hover:ring-gold/70 group-hover:ring-offset-2 group-hover:ring-offset-white
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
                      break-inside-avoid shadow-warm-sm hover:shadow-warm-lg transition-shadow duration-300"
                    onClick={() => openLightbox(idx)}
                    aria-label={`View photo: ${item.title}`}
                  >
                    {/* Image */}
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-105 block no-drag"
                      loading="lazy"
                    />

                    {/* Hover overlay */}
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                      aria-hidden="true"
                    />
                      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-400 ease-smooth flex items-end justify-between">
                        <div>
                          <span className="font-body text-gold text-[10px] uppercase tracking-[0.15em] font-medium">
                            {item.category}
                          </span>
                          <p className="font-heading text-white text-sm font-medium mt-0.5">
                            {item.title}
                          </p>
                        </div>
                        {item.likes !== undefined && item.likes !== null && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/90 text-xs font-medium">
                            <Heart size={13} className="fill-rose-500 text-rose-500" />
                            <span>{Number(item.likes).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Top Badges */}
                      {item.badges && item.badges.length > 0 && (
                        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                          {item.badges.map((badge, bIdx) => (
                            <span key={bIdx} className="bg-gold/90 backdrop-blur text-white text-[9px] font-body uppercase tracking-wider font-semibold px-2 py-1 rounded-sm shadow flex items-center gap-1">
                              <Award size={10} /> {badge}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expand icon */}
                    <div
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      aria-hidden="true"
                    >
                      <Camera size={14} className="text-white" />
                    </div>
                  </motion.button>
                ))}
                </AnimatePresence>
              </motion.div>
            )}

            {!isLoading && filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: ease.smooth }}
                className="text-center py-24"
              >
                <p className="font-heading text-primary text-2xl mb-2">No photos found</p>
                <p className="font-body text-neutral-400 text-sm">
                  Try a different category filter.
                </p>
              </motion.div>
            )}

            <p className="font-body text-neutral-300 text-xs text-center mt-10 italic">
              * Gallery contains sample images — will be replaced with actual E-Kodak photography before launch.
            </p>
          </div>
        </section>

        {/* ── 4. Lightbox ───────────────────────────────────────────────────── */}
        <AnimatePresence>
          {lightboxIndex !== null && (
            <GalleryLightbox
              key="gallery-lightbox"
              items={filtered}
              index={lightboxIndex}
              onClose={closeLightbox}
              onNavigate={navigate}
            />
          )}
        </AnimatePresence>

        {/* ── 5. Book CTA ───────────────────────────────────────────────────── */}
        <section className="section-padding bg-white border-t border-neutral-100">
          <motion.div
            className="container-custom text-center max-w-2xl mx-auto"
            variants={stagger(0.12)}
            initial="hidden"
            whileInView="show"
            viewport={viewport}
          >
            <motion.p variants={staggerChild} className="section-eyebrow">
              Like what you see?
            </motion.p>
            <div className="overflow-hidden">
              <motion.h2 variants={lineReveal} className="section-title mb-4">
                Let us capture your story.
              </motion.h2>
            </div>
            <motion.p variants={staggerChild} className="section-subtitle mx-auto text-center mb-8">
              Browse our packages and book your session — online, in minutes.
            </motion.p>
            <motion.div
              variants={staggerChild}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
                <Link to={siteConfig.routes.services} className="btn-primary inline-flex items-center gap-2">
                  View Packages <ArrowRight size={16} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
                <Link to={siteConfig.routes.register} className="btn-outline inline-flex items-center gap-2">
                  Book a Session
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

      </main>

      <Footer />
    </>
  );
}
