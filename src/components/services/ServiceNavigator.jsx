/**
 * ServiceNavigator.jsx
 * ====================
 * Floating right-side navigator showing all visible services.
 * Highlights the currently-in-view service as user scrolls.
 * Click any item to smooth-scroll to that service section.
 *
 * Hidden on mobile (lg+ only). Hides itself if fewer than 2 services.
 */

import { useEffect, useState } from "react";

export default function ServiceNavigator({ services }) {
  const [activeSlug, setActiveSlug] = useState(null);
  const [visible, setVisible] = useState(false);

  // Show navigator only after scrolling past the hero area
  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track which service block is in view
  useEffect(() => {
    if (!services || services.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry most in view
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveSlug(visible[0].target.dataset.serviceSlug);
        }
      },
      {
        threshold: [0.1, 0.3, 0.5],
        rootMargin: "-100px 0px -30% 0px",
      }
    );

    // Observe all service block elements
    services.forEach(s => {
      const el = document.getElementById(`service-block-${s.slug}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [services]);

  if (!services || services.length < 2) return null;

  function scrollTo(slug) {
    const el = document.getElementById(`service-block-${slug}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSlug(slug);
  }

  const categoryIcons = {
    graduation: "🎓",
    portrait:   "📸",
    event:      "🎉",
    family:     "👨‍👩‍👧",
    couple:     "💑",
    commercial: "💼",
  };

  return (
    <div
      className={`fixed right-4 xl:right-8 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-1.5
        transition-all duration-500 ease-smooth
        ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10 pointer-events-none"}
      `}
      aria-label="Service sections navigator"
    >
      {/* Label */}
      <p className="font-body text-[9px] uppercase tracking-[0.2em] text-neutral-400 text-right mb-1">
        Jump to
      </p>

      {services.map((service, _i) => {
        const isActive = activeSlug === service.slug;
        return (
          <button
            key={service.slug}
            onClick={() => scrollTo(service.slug)}
            title={service.name}
            className="group flex items-center justify-end gap-2 text-right"
            aria-label={`Jump to ${service.name}`}
          >
            {/* Label (shows on hover or active) */}
            <span
              className={`font-body text-[11px] font-medium whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "opacity-100 text-primary"
                  : "opacity-0 group-hover:opacity-100 text-neutral-500"
              }`}
            >
              {categoryIcons[service.category] || "📷"} {service.name}
            </span>

            {/* Dot indicator */}
            <span
              className={`shrink-0 rounded-full transition-all duration-300 ${
                isActive
                  ? "w-3 h-3 bg-gold shadow-gold ring-2 ring-gold/30"
                  : "w-2 h-2 bg-neutral-300 group-hover:bg-neutral-500"
              }`}
            />
          </button>
        );
      })}

      {/* Bottom line */}
      <div className="w-px h-8 bg-gradient-to-b from-neutral-200 to-transparent self-end mt-1" />
    </div>
  );
}
