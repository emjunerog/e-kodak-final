/**
 * ServiceCard.jsx
 * ===============
 * REUSABLE SERVICE CARD COMPONENT
 *
 * This is a reusable component — it accepts data as props and renders
 * a single service card. ServicesPreview.jsx maps over an array and
 * renders one ServiceCard per service.
 *
 * Why reusable?
 *  - Avoids duplicate HTML for each service
 *  - Later, Supabase data can be passed as props directly
 *  - Consistent styling guaranteed across all cards
 *
 * Props:
 *  @param {string}  image       - Image URL (Unsplash placeholder or real image)
 *  @param {string}  imageAlt    - Accessible image description
 *  @param {string}  category    - Small category label above title (e.g. "Portrait")
 *  @param {string}  title       - Service name
 *  @param {string}  description - Short description (1-2 sentences)
 *  @param {string}  price       - Starting price string (e.g. "Starting at ₱3,500")
 *  @param {string}  to          - Route to navigate to on CTA click
 *
 * Future:
 *  When Supabase is connected (Phase 10+), ServicesPreview will fetch
 *  real services and pass them as props to this component. The component
 *  itself requires NO changes — only the data source changes.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { viewport, ease } from "../../lib/motion";
import { TiltCard } from "../ui/Interactive";

export default function ServiceCard({
  image,
  imageAlt,
  category,
  title,
  description,
  price: _price,
  to = "/services",
  index = 0,
}) {
  return (
    <TiltCard
      className="group w-full h-full"
      max={7}
      pull={1.015}
      glareColor="rgba(212,175,55,0.14)"
    >
      <motion.article
        className="
          group card card-hover
          overflow-hidden flex flex-col
          border border-neutral-100
          shine-on-hover h-full
        "
        aria-label={`${title} photography service`}
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={viewport}
        transition={{ duration: 0.45, delay: index * 0.08, ease: ease.expo }}
      >
      {/* ── Image Container ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={image}
          alt={imageAlt}
          className="w-full h-full object-cover no-drag transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        {/* Dark overlay on hover */}
        <div
          className="
            absolute inset-0 bg-primary/0
            group-hover:bg-primary/20
            transition-all duration-500
          "
          aria-hidden="true"
        />
        {/* Category badge — drops into place on reveal */}
        <motion.span
          className="
            absolute top-4 left-4
            font-body text-[10px] font-semibold uppercase tracking-[0.15em]
            px-3 py-1.5 rounded-full
            bg-white/90 text-primary
            backdrop-blur-sm
          "
          initial={{ opacity: 0, y: -14, scale: 0.85 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={viewport}
          transition={{ delay: 0.3 + index * 0.12, type: "spring", stiffness: 480, damping: 18 }}
        >
          {category}
        </motion.span>
      </div>

      {/* ── Card Body ────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-6">
        <h3 className="font-heading text-primary text-xl font-medium mb-2 transition-colors duration-300 group-hover:text-gold-dark">
          {title}
        </h3>
        <p className="font-body text-neutral-500 text-sm leading-relaxed flex-1 mb-5">
          {description}
        </p>

        {/* Deliverables / Feature Tag + CTA (No price) */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-neutral-100">
          <span className="font-body text-neutral-400 text-xs font-medium uppercase tracking-wider">
            {category?.includes("video") ? "Cinematic 4K · Drone" : "Studio Portrait Session"}
          </span>
          <Link
            to={to}
            className="
              inline-flex items-center gap-1.5
              font-body text-primary text-xs sm:text-sm font-semibold
              hover:text-gold
              transition-colors duration-200
              group/link
            "
            aria-label={`Explore ${title} package details`}
          >
            Explore Package
            <ArrowRight
              size={14}
              className="
                transition-transform duration-200
                group-hover/link:translate-x-1.5
                text-gold
              "
            />
          </Link>
        </div>
      </div>
      </motion.article>
    </TiltCard>
  );
}
