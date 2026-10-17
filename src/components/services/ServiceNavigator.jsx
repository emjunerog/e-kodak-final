/**
 * ServiceNavigator.jsx
 * ====================
 * Minimal right-side "Packages" rail for the services page.
 *
 * Deliberately quiet: a small label, dots, and one gold BOX that slides to the
 * package you are currently reading. Row labels stay hidden until their row is
 * active or hovered, so the rail never puts text on top of page content (the
 * page reserves a right gutter for it on lg screens).
 *
 * College & Senior High are pinned at the top with a divider — they are
 * single-package jumps, so their navigation lives here. Clicking a row calls
 * `onJump(slug)`.
 *
 * Hidden below lg.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Scroll } from "lucide-react";
import { scrollToId, shortServiceLabel } from "../../lib/sectionNav";

const PINNED_ICONS = {
  "college-packages": GraduationCap,
  "senior-high-packages": Scroll,
};

export default function ServiceNavigator({ services = [], pinned = [], activeSlug, onJump }) {
  const [visible, setVisible] = useState(false);

  const pinnedSlugs = pinned.map((s) => s.slug);
  const rest = services.filter((s) => !pinnedSlugs.includes(s.slug));
  const itemCount = pinned.length + rest.length;

  const idsKey = services.map((s) => s.slug).join("|");
  const idsRef = useRef(idsKey);

  // Latest slugs for the scroll listener without re-subscribing each render.
  useEffect(() => {
    idsRef.current = idsKey;
  });

  // Show the rail only while the package list actually occupies the screen.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const slugs = (idsRef.current || "").split("|").filter(Boolean);
      if (window.scrollY < 320 || slugs.length === 0) {
        setVisible(false);
        return;
      }
      const first = document.getElementById(`service-block-${slugs[0]}`);
      const last = document.getElementById(`service-block-${slugs[slugs.length - 1]}`);
      let show = true;
      if (first && last) {
        show =
          first.getBoundingClientRect().top < window.innerHeight * 0.9 &&
          last.getBoundingClientRect().bottom > window.innerHeight * 0.1;
      }
      setVisible(show);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [idsKey]);

  if (itemCount < 2) return null;

  const jump = (slug) => {
    if (onJump) onJump(slug);
    else scrollToId(`service-block-${slug}`);
  };

  const renderItem = (service) => {
    const slug = service.slug;
    const isActive = activeSlug === slug;
    const Icon = PINNED_ICONS[slug];
    const label = shortServiceLabel(service);

    return (
      <li key={slug} className="w-full">
        <button
          type="button"
          onClick={() => jump(slug)}
          title={label}
          aria-current={isActive ? "true" : undefined}
          aria-label={`Jump to ${label}`}
          className="group/item relative flex w-full items-center justify-end gap-2 rounded-md px-2 py-1 text-right"
        >
          {/* The box — slides to the package you are currently reading */}
          {isActive && (
            <motion.span
              layoutId="jump-to-active"
              transition={{ type: "spring", stiffness: 460, damping: 36 }}
              className="absolute inset-0 rounded-md border border-gold/50 bg-white/95 backdrop-blur-sm shadow-warm-sm"
              aria-hidden="true"
            />
          )}

          {/* Label — hidden until the row is active or hovered */}
          <span
            className={`
              relative z-10 min-w-0 flex-1 truncate font-body text-[11px] transition-opacity duration-200
              ${isActive
                ? "font-semibold text-primary opacity-100"
                : "text-neutral-500 opacity-0 group-hover/item:opacity-100 group-hover/item:text-primary"}
            `}
          >
            {label}
          </span>

          {/* Indicator: pinned rows use a gold icon, the rest a dot */}
          <span
            className={`
              relative z-10 flex h-4 w-4 shrink-0 items-center justify-center transition-colors duration-200
              ${isActive ? "text-gold" : "text-neutral-300 group-hover/item:text-neutral-500"}
            `}
          >
            {Icon ? (
              <Icon size={13} strokeWidth={2} />
            ) : (
              <span
                className={`
                  block rounded-full transition-all duration-300
                  ${isActive
                    ? "h-2 w-2 bg-gold"
                    : "h-1.5 w-1.5 bg-neutral-300 group-hover/item:bg-neutral-500"}
                `}
              />
            )}
          </span>
        </button>
      </li>
    );
  };

  return (
    <nav
      aria-label="Packages"
      className={`
        fixed right-3 xl:right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex
        w-[11rem] flex-col items-end gap-1
        transition-all duration-500 ease-smooth
        ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 pointer-events-none"}
      `}
    >
      <p className="mb-1 flex w-full items-center justify-end gap-2 font-body text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
        Packages
        <span className="h-px w-4 bg-gold" aria-hidden="true" />
      </p>

      <ul className="flex w-full flex-col items-end gap-0.5" role="list">
        {pinned.map(renderItem)}
        {pinned.length > 0 && rest.length > 0 && (
          <li aria-hidden="true" className="flex w-full justify-end py-0.5">
            <span className="w-8 h-px bg-neutral-300/80" />
          </li>
        )}
        {rest.map(renderItem)}
      </ul>

      <div className="mt-1 h-6 w-px self-end bg-gradient-to-b from-neutral-300 to-transparent" aria-hidden="true" />
      <span className="sr-only">{itemCount} packages listed</span>
    </nav>
  );
}
