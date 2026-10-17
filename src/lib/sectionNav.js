/**
 * sectionNav.js
 * =============
 * Sticky-bar aware navigation helpers for the services page.
 *
 * Two bars stack above the content and both publish live heights as CSS vars:
 *   --nav-h      published by Navbar (collapses to 0 while the bar auto-hides)
 *   --viewing-h  published by the "Viewing" card
 *
 * Everything here (scroll targets, "where am I?" detection, progress) measures
 * against that live stack so a target can never land underneath the bars.
 */

import { useEffect, useRef, useState } from "react";

const FALLBACKS = { "--nav-h": 100, "--viewing-h": 68 };

/** Gap kept below the sticky stack so a target never touches the bars. */
export const STICKY_GAP = 24;

function readPx(name) {
  if (typeof window === "undefined") return FALLBACKS[name] || 0;
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(value) ? value : FALLBACKS[name] || 0;
}

/**
 * Total height of every sticky bar stacked above the content.
 * With no `extra`, the "Viewing" card's own live height is included — the
 * reading line always lands just underneath it, on any screen size.
 */
export function stickyBarHeight(extra) {
  const base = readPx("--nav-h");
  return base + (extra === undefined ? readPx("--viewing-h") + STICKY_GAP : extra);
}

/** Smooth-scroll an element into the clear zone below the sticky bars. */
export function scrollToId(id, { extra, behavior = "smooth" } = {}) {
  const el = document.getElementById(id);
  if (!el) return false;
  const top = window.scrollY + el.getBoundingClientRect().top - stickyBarHeight(extra);
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

/**
 * Retry a scroll until the target exists — deep links (#sets-college-packages)
 * arrive from the landing page before the package list has finished loading.
 * Returns a cancel function (call it from an effect cleanup).
 */
export function scrollToIdWhenReady(id, { attempts = 40, delay = 90, ...opts } = {}) {
  let remaining = attempts;
  let timer = null;
  let cancelled = false;

  const attempt = () => {
    if (cancelled) return;
    if (scrollToId(id, opts) || --remaining <= 0) return;
    timer = setTimeout(attempt, delay);
  };

  attempt();
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}

/**
 * Tracks which section currently sits under the reading line (the strip of
 * screen just below the sticky bars) and exposes it as `activeId`.
 *
 * The ids array must be in document order. Pass a stable key (e.g. ids joined)
 * — the hook only re-subscribes when the key changes, not on every render.
 */
export function useActiveSection(ids, { extra } = {}) {
  const [activeId, setActiveId] = useState(null);
  const idsRef = useRef(ids);
  const key = ids.join("|");

  // Keep the latest ids available to the scroll listener without
  // re-subscribing on every render.
  useEffect(() => {
    idsRef.current = ids;
  });

  useEffect(() => {
    const current = () => idsRef.current;

    if (!current().length) {
      setActiveId(null);
      return undefined;
    }

    let frame = 0;
    const measure = () => {
      frame = 0;
      const list = current();
      if (!list.length) return;

      const line = stickyBarHeight(extra);
      let next = null;

      // Last block whose top has crossed the reading line — gap-proof, so the
      // label never flickers while passing the space between two packages.
      for (const id of list) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) next = id;
        else break;
      }

      setActiveId((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Layout settles after data + images paint — re-measure twice.
    const t1 = setTimeout(measure, 250);
    const t2 = setTimeout(measure, 1100);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [key, extra]);

  return activeId;
}

/** Readable short label for a package (DB names are long: "... and sets"). */
const SHORT_LABELS = {
  "college-packages": "College Packages",
  "senior-high-packages": "Senior High Packages",
};

export function shortServiceLabel(service) {
  if (!service) return "";
  if (SHORT_LABELS[service.slug]) return SHORT_LABELS[service.slug];
  const name = String(service.name || "");
  return name.replace(/\s+and\s+sets$/i, "").trim() || name;
}
