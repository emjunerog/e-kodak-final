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
 * Images: Local studio portfolio assets in public/images/brochure/grad/ & public/images/.
 *
 * Future: In Phase 10, the public gallery page will have
 * full filtering, lightbox, and Supabase-backed image data.
 */

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "../../config/siteConfig";
import { stagger, staggerChild, viewport, ease } from "../../lib/motion";

// Last-resort image if a tile's URL ever fails to load in the browser
const FALLBACK_IMAGE = "/images/brochure/grad/family-graduation.jpg";

// ─── Curated Showcase Photos (Studio Resources) ─────────────────────────────
const galleryImages = [
  {
    id: 1,
    src: "/images/brochure/grad/family-graduation.jpg",
    alt: "Family graduation portrait in studio",
    caption: "Family Graduation Portrait",
    category: "Family & Group",
    objectPos: "object-center",
    featured: true,
  },
  {
    id: 2,
    src: "/images/brochure/grad/toga-cap-formal.jpg",
    alt: "Graduate wearing black toga and academic cap portrait",
    caption: "Academic Cap & Toga",
    category: "Graduation",
    objectPos: "object-top",
  },
  {
    id: 3,
    src: "/images/brochure/grad/toga-hood-portrait.jpg",
    alt: "Graduate wearing black toga with blue academic hood and medal",
    caption: "Regalia & Honors Hood",
    category: "College Portrait",
    objectPos: "object-[50%_18%]",
  },
  {
    id: 4,
    src: "/images/brochure/grad/filipiniana-portrait.jpg",
    alt: "Graduate portrait wearing formal cream embroidered Filipiniana",
    caption: "Filipiniana Formal Portrait",
    category: "Filipiniana",
    objectPos: "object-[50%_22%]",
  },
  {
    id: 5,
    src: "/images/brochure/grad/barong-portrait.jpg",
    alt: "Graduate portrait wearing embroidered Barong Tagalog",
    caption: "Classic Barong Tagalog",
    category: "Barong",
    objectPos: "object-[50%_18%]",
  },
  {
    id: 6,
    src: "/images/brochure/grad/toga-cap-pose.jpg",
    alt: "Graduate posing in black toga and gold academic hood",
    caption: "Studio Milestone Pose",
    category: "Milestone",
    objectPos: "object-[50%_15%]",
  },
  {
    id: 7,
    src: "/images/brochure/grad/toga-formal.jpg",
    alt: "Formal studio graduation portrait against dark textured backdrop",
    caption: "Classic Dark Backdrop",
    category: "Senior High",
    objectPos: "object-[50%_15%]",
  },
  {
    id: 8,
    src: "/images/login-dark.jpg",
    alt: "Mirrorless studio camera and printed photographs on wooden table",
    caption: "Studio Camera & Prints",
    category: "Studio Craft",
    objectPos: "object-center",
  },
];

// Separate parallax wrapper so only the single featured tile attaches a scroll listener
function ParallaxGalleryImg({ frameRef, src, alt, objectPos = "object-center", onError }) {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ["start end", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], reduceMotion ? ["0%", "0%"] : ["-4%", "4%"]);

  return (
    <motion.img
      src={src}
      alt={alt}
      onError={onError}
      className={`w-full h-full object-cover ${objectPos} no-drag scale-110 transition-transform duration-700 ease-out group-hover:scale-115`}
      style={{ y: imgY }}
      loading="lazy"
      decoding="async"
    />
  );
}

// Single gallery item with lightweight compositor reveal + hover choreography
function GalleryItem({ image, className = "", index = 0, parallax = false }) {
  const frameRef = useRef(null);

  // Fallback recovery to curated local studio photo
  const [imgSrc, setImgSrc] = useState(image.src);
  const handleImgError = () => {
    if (imgSrc !== FALLBACK_IMAGE) {
      setImgSrc(FALLBACK_IMAGE);
    }
  };

  return (
    <motion.div
      ref={frameRef}
      className={`group relative overflow-hidden rounded-xl bg-neutral-200 ${className}`}
      aria-label={image.caption}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.25), ease: ease.expo }}
    >
      {parallax ? (
        <ParallaxGalleryImg
          frameRef={frameRef}
          src={imgSrc}
          alt={image.alt}
          objectPos={image.objectPos}
          onError={handleImgError}
        />
      ) : (
        <img
          src={imgSrc}
          alt={image.alt}
          onError={handleImgError}
          className={`w-full h-full object-cover ${image.objectPos || "object-center"} no-drag transition-transform duration-700 ease-out group-hover:scale-105`}
          loading="lazy"
          decoding="async"
        />
      )}

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
