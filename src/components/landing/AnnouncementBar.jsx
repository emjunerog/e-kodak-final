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
  const [isVisible, setIsVisible]        = useState(false);
  const intervalRef = useRef(null);

  // ── Fetch announcements ───────────────────────────────────────────────────
  useEffect(() => {
    getAnnouncements().then((res) => {
      const data = res.data?.length > 0 ? res.data : DEFAULT_ANNOUNCEMENTS;
      setAnnouncements(data);
      // Slight delay so the bar slides in smoothly after page loads
      setTimeout(() => setIsVisible(true), 500);
    });
  }, []);

  // ── Auto-cycle every 5 seconds ────────────────────────────────────────────
  useEffect(() => {
    if (announcements.length <= 1 || dismissed) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [announcements, dismissed]);

  // ── Dismiss handler ───────────────────────────────────────────────────────
  function handleDismiss() {
    clearInterval(intervalRef.current);
    setIsVisible(false);
    setTimeout(() => {
      setDismissed(true);
      sessionStorage.setItem(SESSION_KEY, "true");
    }, 300); // wait for slide-out animation
  }

  if (dismissed || announcements.length === 0) return null;

  const current = announcements[currentIndex];
  const isPromo = current?.type === "promo";

  return (
    <motion.div
      className={`
        w-full z-50 relative overflow-hidden
        ${isPromo
          ? "bg-gradient-to-r from-gold-dark via-gold to-gold-dark animate-gradient-drift"
          : "bg-primary"
        }
      `}
      initial={{ y: "-100%", opacity: 0 }}
      animate={isVisible ? { y: "0%", opacity: 1 } : { y: "-100%", opacity: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      role="banner"
      aria-label="Announcements"
    >
      <div className="container-custom py-2 flex items-center justify-between gap-4">
        {/* Sparkle icon — gentle twinkle */}
        <motion.span
          className={`shrink-0 ${isPromo ? "text-primary/70" : "text-gold"}`}
          animate={{ rotate: [0, 18, 0, -18, 0], scale: [1, 1.18, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <Sparkles size={14} />
        </motion.span>

        {/* Announcement text */}
        <div className="flex-1 flex items-center justify-center gap-3 min-w-0 text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              className={`font-body text-xs sm:text-sm leading-snug line-clamp-1 ${
                isPromo ? "text-primary font-medium" : "text-white"
              }`}
              key={currentIndex}
              initial={{ opacity: 0, y: 12, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -12, filter: "blur(3px)" }}
              transition={{ duration: 0.34, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {current?.text}
            </motion.p>
          </AnimatePresence>

          {current?.ctaText && current?.ctaLink && (
            <motion.span
              className="shrink-0 hidden sm:inline-flex"
              initial={false}
              animate={{ opacity: 1 }}
            >
              <Link
                to={current.ctaLink}
                className={`inline-flex items-center gap-1 text-xs font-body font-semibold underline-offset-2 hover:underline ${
                  isPromo ? "text-primary" : "text-gold"
                }`}
              >
                {current.ctaText}
                <motion.span
                  className="inline-flex"
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                >
                  <ArrowRight size={11} />
                </motion.span>
              </Link>
            </motion.span>
          )}
        </div>

        {/* Dot indicators (only if >1 announcements) */}
        {announcements.length > 1 && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0" aria-hidden="true">
            {announcements.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full ${
                  i === currentIndex
                    ? isPromo ? "bg-primary" : "bg-gold"
                    : "bg-white/30"
                }`}
                animate={{
                  width: i === currentIndex ? 18 : 6,
                  opacity: i === currentIndex ? 1 : 0.65,
                }}
                whileHover={{ scale: 1.3 }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
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
