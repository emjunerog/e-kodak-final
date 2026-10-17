/**
 * GalleryShowcase.jsx
 * ===================
 * EDITORIAL PHOTOGRAPHY SHOWCASE SECTION
 *
 * A visually rich masonry-inspired gallery grid that highlights the
 * studio's photography style. Uses an asymmetric layout instead of
 * a boring uniform grid.
 *
 * Layout (Desktop):
 *   [ Large featured image ] [ Small top right ] [ Small bottom right ]
 *   [ Bottom full-width row: 3 equal images ]
 *
 * Layout (Mobile):
 *   Single column scroll — all images stacked
 *
 * Motion:
 *  - Each tile unmasks with a clip-path wipe + subtle scale settle
 *  - Images drift in a slow ken-burns while at rest, zoom on hover
 *  - Caption overlay slides up with a staggered line reveal
 *  - A gold hairline draws around the tile on hover
 *  - The featured tile parallax-shifts slightly as it scrolls by
 *
 * Images: Unsplash placeholders — clearly labeled for replacement.
 *
 * Future: In Phase 10, the public gallery page will have
 * full filtering, lightbox, and Supabase-backed image data.
 */

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "../../config/siteConfig";
import { stagger, staggerChild, viewport, ease } from "../../lib/motion";

// Last-resort image if a tile's URL ever fails to load in the browser
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=900&q=80&auto=format&fit=crop";

// ─── Curated Showcase Photos ────────────────────────────────────────────────
const galleryImages = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=1000&q=80&auto=format&fit=crop",
    alt: "Portrait photography — woman in soft natural light",
    caption: "Natural Light Portrait",
    category: "Portrait",
    featured: true,
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80&auto=format&fit=crop",
    alt: "Graduation milestone — academic portrait and regalia",
    caption: "Academic Milestone",
    category: "Graduation",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80&auto=format&fit=crop",
    alt: "Studio photography — formal studio portrait",
    caption: "Studio Portrait",
    category: "Studio",
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80&auto=format&fit=crop",
    alt: "Wedding couple — bride and groom outdoors",
    caption: "Heirloom Ceremony",
    category: "Wedding",
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800&q=80&auto=format&fit=crop",
    alt: "Couple photography — golden hour romance",
    caption: "Sunset Romance",
    category: "Couple",
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80&auto=format&fit=crop",
    alt: "Camera equipment — professional mirrorless gear and lenses",
    caption: "Cinematic 4K Gear",
    category: "Equipment",
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80&auto=format&fit=crop",
    alt: "Editorial portrait — smiling professional woman",
    caption: "Editorial Session",
    category: "Portrait",
  },
  {
    id: 8,
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80&auto=format&fit=crop",
    alt: "Event photography — wedding ceremony celebration",
    caption: "Special Celebration",
    category: "Event",
  },
];

// Single gallery item with mask-reveal + hover choreography
function GalleryItem({ image, className = "", index = 0, parallax = false }) {
  const frameRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ["start end", "end start"],
  });
  // Tighter drift + deeper base zoom so the frame is never exposed
  const imgY = useTransform(scrollYProgress, [0, 1], parallax ? ["-4%", "4%"] : ["0%", "0%"]);

  // Two-stage image recovery: cache-busted retry first, known-good photo second
  const [imgSrc, setImgSrc] = useState(image.src);
  const retriedRef = useRef(false);
  const handleImgError = () => {
    if (!retriedRef.current) {
      retriedRef.current = true;
      setImgSrc(`${image.src}${image.src.includes("?") ? "&" : "?"}retry=1`);
    } else {
      setImgSrc(FALLBACK_IMAGE);
    }
  };

  return (
    <motion.div
      ref={frameRef}
      className={`group relative overflow-hidden rounded-xl bg-neutral-200 ${className}`}
      aria-label={image.caption}
      initial={{ opacity: 0, y: 44, clipPath: "inset(14% 8% 14% 8% round 12px)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 12px)" }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.95, delay: index * 0.1, ease: ease.expo }}
      whileHover={{ scale: 1.012, transition: { duration: 0.4, ease: ease.smooth } }}
    >
      {/* Image — settles from a zoomed state, drifts on scroll, zooms on hover */}
      <motion.img
        src={imgSrc}
        alt={image.alt}
        onError={handleImgError}
        className="w-full h-full object-cover no-drag"
        style={{ y: imgY }}
        loading="lazy"
        initial={{ scale: 1.24 }}
        whileInView={{ scale: 1.12 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 1.6, delay: index * 0.1, ease: ease.expo }}
        whileHover={{ scale: 1.2, transition: { duration: 0.9, ease: ease.smooth } }}
      />

      {/* Hover overlay with caption */}
      <div
        className="
          absolute inset-0
          bg-gradient-to-t from-black/70 via-black/0 to-transparent
          opacity-0 group-hover:opacity-100
          transition-opacity duration-400
        "
        aria-hidden="true"
      />

      {/* Gold hairline that draws in on hover */}
      <span
        className="pointer-events-none absolute inset-0 rounded-xl border border-gold/0 group-hover:border-gold/50 transition-all duration-500"
        aria-hidden="true"
      />

      {/* Caption */}
      <div
        className="
          absolute bottom-0 left-0 right-0 p-4
          translate-y-3 group-hover:translate-y-0
          opacity-0 group-hover:opacity-100
          transition-all duration-400 ease-smooth
        "
      >
        <span className="block font-body text-gold text-[10px] uppercase tracking-[0.15em] font-medium">
          {image.category}
        </span>
        <p className="font-heading text-white text-sm font-medium mt-0.5">
          {image.caption}
        </p>
      </div>

      {/* Corner index tick */}
      <span className="absolute top-3 left-3 font-body text-[10px] text-white/70 bg-black/35 backdrop-blur-sm px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        0{index + 1}
      </span>
    </motion.div>
  );
}

export default function GalleryShowcase() {
  return (
    <section
      className="section-padding bg-neutral-100"
      aria-labelledby="gallery-heading"
    >
      <div className="container-custom">

        {/* ── Section Header ──────────────────────────────────────────────── */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-12"
          variants={stagger(0.16)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
        >
          <div>
            <motion.p className="section-eyebrow" variants={staggerChild}>
              Our Work
            </motion.p>
            <span className="block overflow-hidden">
              <motion.h2 id="gallery-heading" className="section-title" variants={staggerChild}>
                From Our Lens
              </motion.h2>
            </span>
            <motion.span
              className="block h-px w-16 bg-gold mt-4 origin-left"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={viewport}
              transition={{ duration: 0.9, delay: 0.35, ease: ease.expo }}
            />
          </div>
          <motion.span
            className="shrink-0 inline-block"
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewport}
            transition={{ duration: 0.6, delay: 0.2, ease: ease.smooth }}
            whileHover={{ x: 4 }}
          >
            <Link
              to={siteConfig.routes.gallery}
              className="btn-outline shrink-0 inline-flex items-center gap-2"
            >
              View Full Gallery
              <ArrowRight size={16} />
            </Link>
          </motion.span>
        </motion.div>

        {/* ── Gallery Grid — Flat Bento Grid (Strictly Zero Empty Space) ───── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {/* Row 1: Featured 2-col landscape + 1-col portrait */}
          <GalleryItem
            image={galleryImages[0]}
            className="sm:col-span-2 h-72 md:h-80"
            index={0}
            parallax
          />
          <GalleryItem
            image={galleryImages[3]}
            className="sm:col-span-1 h-72 md:h-80"
            index={3}
          />

          {/* Row 2: 3 balanced showcase cards */}
          <GalleryItem
            image={galleryImages[1]}
            className="h-64 md:h-72"
            index={1}
          />
          <GalleryItem
            image={galleryImages[2]}
            className="h-64 md:h-72"
            index={2}
          />
          <GalleryItem
            image={galleryImages[4]}
            className="h-64 md:h-72"
            index={4}
          />

          {/* Row 3: 3 balanced showcase cards (with tablet spanning to prevent orphan) */}
          <GalleryItem
            image={galleryImages[5]}
            className="h-64 md:h-72"
            index={5}
          />
          <GalleryItem
            image={galleryImages[6]}
            className="h-64 md:h-72"
            index={6}
          />
          <GalleryItem
            image={galleryImages[7]}
            className="sm:col-span-2 md:col-span-1 h-64 md:h-72"
            index={7}
          />
        </div>
      </div>
    </section>
  );
}
