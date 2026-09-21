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
 * Hover effects:
 *  - Image scale on hover (zoom in)
 *  - Caption overlay slides up from bottom
 *
 * Images: Unsplash placeholders — clearly labeled for replacement.
 *
 * Future: In Phase 10, the public gallery page will have
 * full filtering, lightbox, and Supabase-backed image data.
 */

import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useScrollReveal } from "../../lib/useScrollReveal";
import { siteConfig } from "../../config/siteConfig";

// ─── PLACEHOLDER GALLERY IMAGES — Replace before launch ─────────────────────
const galleryImages = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=900&q=80&auto=format&fit=crop",
    alt: "Portrait photography — woman in soft natural light",
    caption: "Portrait Session",
    category: "Portrait",
    featured: true,
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80&auto=format&fit=crop",
    alt: "Graduation photography — graduate celebrating outdoors",
    caption: "Graduation Day",
    category: "Graduation",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=600&q=80&auto=format&fit=crop",
    alt: "Event photography — celebration with decorations",
    caption: "Special Event",
    category: "Event",
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1581591524425-c7e0978865fc?w=600&q=80&auto=format&fit=crop",
    alt: "Family photography — family in a park",
    caption: "Family Session",
    category: "Family",
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1616091093051-a4e4dff7a786?w=600&q=80&auto=format&fit=crop",
    alt: "Portrait photography — close-up editorial shot",
    caption: "Editorial Portrait",
    category: "Portrait",
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&q=80&auto=format&fit=crop",
    alt: "Couple photography — couple in golden hour light",
    caption: "Golden Hour",
    category: "Couple",
  },
];

// Single gallery item with hover effect
function GalleryItem({ image, className = "" }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl bg-neutral-200 ${className}`}
      aria-label={image.caption}
    >
      {/* Image */}
      <img
        src={image.src}
        alt={image.alt}
        className="
          w-full h-full object-cover
          transition-transform duration-700 ease-smooth
          group-hover:scale-105
          no-drag
        "
        loading="lazy"
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
      <div
        className="
          absolute bottom-0 left-0 right-0 p-4
          translate-y-3 group-hover:translate-y-0
          opacity-0 group-hover:opacity-100
          transition-all duration-400 ease-smooth
        "
      >
        <span className="font-body text-gold text-[10px] uppercase tracking-[0.15em] font-medium">
          {image.category}
        </span>
        <p className="font-heading text-white text-sm font-medium mt-0.5">
          {image.caption}
        </p>
      </div>
    </div>
  );
}

export default function GalleryShowcase() {
  const { ref: headRef, inView: headIn } = useScrollReveal();
  const { ref: gridRef, inView: gridIn } = useScrollReveal({ threshold: 0.05 });

  const [featured, ...rest] = galleryImages;

  return (
    <section
      className="section-padding bg-neutral-100"
      aria-labelledby="gallery-heading"
    >
      <div className="container-custom">

        {/* ── Section Header ──────────────────────────────────────────────── */}
        <div
          ref={headRef}
          className={`
            flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-12
            transition-all duration-700 ease-smooth
            ${headIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          `}
        >
          <div>
            <p className="section-eyebrow">Our Work</p>
            <h2 id="gallery-heading" className="section-title">
              From Our Lens
            </h2>
          </div>
          <Link
            to={siteConfig.routes.gallery}
            className="btn-outline shrink-0 inline-flex items-center gap-2"
          >
            View Full Gallery
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* ── Gallery Grid — Asymmetric Editorial Layout ──────────────────── */}
        <div
          ref={gridRef}
          className={`
            transition-all duration-700 ease-smooth
            ${gridIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}
          `}
        >
          {/* Top row: Large featured + 2 small */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Featured large image — spans 2 columns */}
            <GalleryItem
              image={featured}
              className="md:col-span-2 h-72 md:h-96"
            />
            {/* Two stacked small images */}
            <div className="grid grid-rows-2 gap-4">
              <GalleryItem image={rest[0]} className="h-44 md:h-auto" />
              <GalleryItem image={rest[1]} className="h-44 md:h-auto" />
            </div>
          </div>

          {/* Bottom row: 3 equal images */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {rest.slice(2).map((image) => (
              <GalleryItem key={image.id} image={image} className="h-56" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
