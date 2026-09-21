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
    <div
      className={`
        w-full z-50 relative transition-all duration-500
        ${isPromo
          ? "bg-gradient-to-r from-gold-dark via-gold to-gold-dark"
          : "bg-primary"
        }
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"}
      `}
      role="banner"
      aria-label="Announcements"
    >
      <div className="container-custom py-2 flex items-center justify-between gap-4">
        {/* Sparkle icon */}
        <Sparkles
          size={14}
          className={`shrink-0 ${isPromo ? "text-primary/70" : "text-gold"}`}
          aria-hidden="true"
        />

        {/* Announcement text */}
        <div className="flex-1 flex items-center justify-center gap-3 min-w-0 text-center">
          <p
            className={`font-body text-xs sm:text-sm leading-snug line-clamp-1 ${
              isPromo ? "text-primary font-medium" : "text-white"
            }`}
            key={currentIndex} // re-triggers CSS fade on change
            style={{ animation: "fadeIn 0.4s ease-out" }}
          >
            {current?.text}
          </p>

          {current?.ctaText && current?.ctaLink && (
            <Link
              to={current.ctaLink}
              className={`shrink-0 hidden sm:inline-flex items-center gap-1 text-xs font-body font-semibold underline-offset-2 hover:underline ${
                isPromo ? "text-primary" : "text-gold"
              }`}
            >
              {current.ctaText}
              <ArrowRight size={11} />
            </Link>
          )}
        </div>

        {/* Dot indicators (only if >1 announcements) */}
        {announcements.length > 1 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0" aria-hidden="true">
            {announcements.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? isPromo ? "bg-primary" : "bg-gold"
                    : "bg-white/30"
                }`}
                aria-label={`Announcement ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className={`shrink-0 p-1 rounded-full transition-colors duration-200 ${
            isPromo
              ? "text-primary/60 hover:text-primary hover:bg-black/10"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
          aria-label="Dismiss announcement"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
