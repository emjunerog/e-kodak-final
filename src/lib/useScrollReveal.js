/**
 * useScrollReveal.js
 * ==================
 * A custom React hook that uses the IntersectionObserver API (via
 * react-intersection-observer) to trigger a "revealed" state when
 * an element scrolls into the viewport.
 *
 * Usage:
 *   const { ref, inView } = useScrollReveal();
 *   <div ref={ref} className={inView ? 'opacity-100' : 'opacity-0'}>...</div>
 *
 * Why a hook? — Keeps animation logic OUT of components. Components
 * only care about "is this visible?" not HOW that's determined.
 */

import { useInView } from "react-intersection-observer";

export function useScrollReveal(options = {}) {
  const { ref, inView } = useInView({
    threshold: options.threshold ?? 0.15,  // Trigger when 15% of element is visible
    triggerOnce: options.triggerOnce ?? true, // Only animate once (not every scroll)
    rootMargin: options.rootMargin ?? "0px 0px -50px 0px", // Slightly early trigger
  });

  return { ref, inView };
}
