/**
 * AnnouncementBar.jsx
 * ===================
 * DYNAMIC ANNOUNCEMENT / PROMOTIONS TICKER
 *
 * Features:
 *  - Auto-cycles through multiple announcements every 5 seconds
 *  - Dismissable (X button) — persists in sessionStorage so it stays
 *    closed until user refreshes the tab
 *  - Data source: contentService.js → Supabase `announcements` table
 *    with local fallback for offline/unconfigured environments
 *  - Renders above the Navbar (full-width top bar)
 *
 * ADMIN USAGE:
 *  With Supabase connected, admins can add/edit announcements directly
 *  in the `announcements` table — no code changes needed.
 *  Toggle `is_active` to show/hide individual announcements.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getAnnouncements } from "../../services/contentService";

// ── Fallback announcements if Supabase is not yet connected ──────────────────
const DEFAULT_ANNOUNCEMENTS = [
  {
    id: "promo-1",
    text: "🎉 Early Bird Offer: Book any package before September 30 and get 15% off!",
    ctaText: "View Packages",
    ctaLink: "/services",
    type: "promo",
  },
  {
    id: "app-launch",
    text: "📱 Our Mobile Companion App is coming soon — track your booking in real time!",
    ctaText: "Learn More",
    ctaLink: "/#how-it-works",
    type: "info",
  },
  {
    id: "gallery-update",
    text: "✨ New graduation and debut photos added to our gallery — check them out!",
    ctaText: "View Gallery",
    ctaLink: "/gallery",
    type: "info",
  },
];

const SESSION_KEY = "ekodak_announcement_dismissed";

export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex]  = useState(0);
  const [dismissed, setDismissed]        = useState(
    typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === "true"
  );
  const [isVisible, setIsVisible]        = useState(true);
  const [paused, setPaused]              = useState(false);
  const intervalRef = useRef(null);

  // ── Fetch announcements immediately (no artificial 500ms layout shift) ────
  useEffect(() => {
    if (dismissed) return;
    let alive = true;
    getAnnouncements().then((res) => {
      if (!alive) return;
      const data = res.data?.length > 0 ? res.data : DEFAULT_ANNOUNCEMENTS;
      setAnnouncements(data);
    });
    return () => { alive = false; };
  }, [dismissed]);

  // ── Auto-cycle every 5 seconds (pauses on hover/focus/hidden tab) ────────
  useEffect(() => {
    if (announcements.length <= 1 || dismissed || paused) return;
    intervalRef.current = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [announcements, dismissed, paused]);

  // ── Dismiss handler ───────────────────────────────────────────────────────
  function handleDismiss() {
    clearInterval(intervalRef.current);
    setIsVisible(false);
    setTimeout(() => {
      setDismissed(true);
      sessionStorage.setItem(SESSION_KEY, "true");
    }, 220);
  }

  if (dismissed || announcements.length === 0) return null;

  const current = announcements[currentIndex];
  const isPromo = current?.type === "promo";

  return (
    <motion.div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`
        w-full z-50 relative overflow-hidden
        ${isPromo
          ? "bg-gradient-to-r from-gold-dark via-gold to-gold-dark"
          : "bg-primary"
        }
      `}
      initial={{ y: "-100%", opacity: 0 }}
      animate={isVisible ? { y: "0%", opacity: 1 } : { y: "-100%", opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      role="region"
      aria-label="Announcements"
    >
      <div className="container-custom py-2 flex items-center justify-between gap-4">
        {/* Sparkle icon */}
        <span
          className={`shrink-0 ${isPromo ? "text-primary/70" : "text-gold"}`}
          aria-hidden="true"
        >
          <Sparkles size={14} />
        </span>

        {/* Announcement text */}
        <div className="flex-1 flex items-center justify-center gap-3 min-w-0 text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              className={`font-body text-xs sm:text-sm leading-snug line-clamp-1 ${
                isPromo ? "text-primary font-medium" : "text-white"
              }`}
              key={currentIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {current?.text}
            </motion.p>
          </AnimatePresence>

          {current?.ctaText && current?.ctaLink && (
            <span className="shrink-0 hidden sm:inline-flex">
              <Link
                to={current.ctaLink}
                className={`inline-flex items-center gap-1 text-xs font-body font-semibold underline-offset-2 hover:underline group ${
                  isPromo ? "text-primary" : "text-gold"
                }`}
              >
                {current.ctaText}
                <ArrowRight size={11} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </span>
          )}
        </div>

        {/* Dot indicators (compositor-friendly width classes, no layout animation) */}
        {announcements.length > 1 && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0" aria-hidden="true">
            {announcements.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === currentIndex
                    ? `${isPromo ? "bg-primary" : "bg-gold"} w-4 opacity-100`
                    : "bg-white/35 w-1.5 opacity-70 hover:opacity-100"
                }`}
                aria-label={`Announcement ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Dismiss button */}
        <motion.button
          onClick={handleDismiss}
          className={`shrink-0 p-1 rounded-full transition-colors duration-200 ${
            isPromo
              ? "text-primary/60 hover:text-primary hover:bg-black/10"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
          aria-label="Dismiss announcement"
          whileHover={{ rotate: 90, scale: 1.1 }}
          whileTap={{ scale: 0.88 }}
          transition={{ type: "spring", stiffness: 420, damping: 18 }}
        >
          <X size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
}
