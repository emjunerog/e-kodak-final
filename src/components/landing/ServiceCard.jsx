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
import { ArrowRight } from "lucide-react";

export default function ServiceCard({
  image,
  imageAlt,
  category,
  title,
  description,
  price,
  to = "/services",
}) {
  return (
    <article
      className="
        group card card-hover
        overflow-hidden flex flex-col
        border border-neutral-100
      "
      aria-label={`${title} photography service`}
    >
      {/* ── Image Container ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={image}
          alt={imageAlt}
          className="
            w-full h-full object-cover
            transition-transform duration-700 ease-smooth
            group-hover:scale-105
            no-drag
          "
          loading="lazy"
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
        {/* Category badge */}
        <span
          className="
            absolute top-4 left-4
            font-body text-[10px] font-semibold uppercase tracking-[0.15em]
            px-3 py-1.5 rounded-full
            bg-white/90 text-primary
            backdrop-blur-sm
          "
        >
          {category}
        </span>
      </div>

      {/* ── Card Body ────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-6">
        <h3 className="font-heading text-primary text-xl font-medium mb-2">
          {title}
        </h3>
        <p className="font-body text-neutral-500 text-sm leading-relaxed flex-1 mb-5">
          {description}
        </p>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-neutral-100">
          <span className="font-body text-gold text-sm font-medium">
            {price}
          </span>
          <Link
            to={to}
            className="
              inline-flex items-center gap-1.5
              font-body text-primary text-sm font-medium
              hover:text-gold
              transition-colors duration-200
              group/link
            "
            aria-label={`View ${title} package details`}
          >
            View Package
            <ArrowRight
              size={14}
              className="
                transition-transform duration-200
                group-hover/link:translate-x-1
              "
            />
          </Link>
        </div>
      </div>
    </article>
  );
}
