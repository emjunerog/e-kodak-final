import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Clock, Calendar } from "lucide-react";

/**
 * LiveClock Component
 * Displays live Philippine Standard Time (PHT / UTC+8), date, and studio operational status.
 * Supports:
 * - "compact": Light pill for top navbar
 * - "pill": Dark glassmorphic capsule for dashboard hero headers
 * - "card": Compact studio operations badge with time and schedule
 */
export default function LiveClock({ variant = "card", className = "" }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time in Philippine Standard Time (UTC+8)
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const shortTimeString = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const dateString = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const fullDateString = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Studio Operating Hours (Mon-Sat: 8:00 AM – 5:00 PM PHT)
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0 = Sunday
  const isSunday = currentDay === 0;
  const isStudioOpen = !isSunday && currentHour >= 8 && currentHour < 17;

  // ── 1. Navbar Compact Variant (Light) ──────────────────────────────────────
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 text-xs font-body text-neutral-600 bg-neutral-100/90 dark:bg-neutral-800/80 px-3 py-1 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 ${className}`}>
        <span className={`w-2 h-2 rounded-full ${isStudioOpen ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`} />
        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{timeString}</span>
        <span className="text-neutral-400 hidden sm:inline">|</span>
        <span className="text-neutral-500 dark:text-neutral-400 hidden sm:inline">{dateString}</span>
        <span className="text-xs text-gold font-bold px-1.5 py-0.2 bg-gold/10 rounded">PHT</span>
      </div>
    );
  }

  // ── 2. Pill Variant for Hero Banners (Prominent Clock + Store Hours on the Bottom) ─────
  if (variant === "pill" || variant === "compact-hero") {
    return (
      <div className={`inline-flex flex-col justify-center bg-white/[0.05] hover:bg-white/[0.08] backdrop-blur-md rounded-2xl px-4 py-2 transition-all font-body shadow-sm shadow-black/20 ${className}`}>
        {/* Top: Bigger Live Clock display with PHT timezone */}
        <div className="flex items-center gap-2 text-white font-medium whitespace-nowrap">
          <Clock size={15} className="text-gold shrink-0" />
          <span className="font-bold text-base sm:text-lg lg:text-xl tracking-tight font-mono text-white/95 drop-shadow-xs">
            {timeString}
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-gold bg-gold/15 px-1.5 py-0.5 rounded uppercase tracking-wider ml-0.5">
            PHT
          </span>
        </div>

        {/* Bottom: Store Hours & Studio Operations Status */}
        <div className="flex items-center gap-2 mt-0.5 text-[11px] font-body">
          <div className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${isStudioOpen ? "bg-emerald-400" : "hidden"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isStudioOpen ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-neutral-500"}`} />
            </span>
            <span>{isStudioOpen ? "Studio Open" : "Closed"}</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span className="text-neutral-400 font-normal whitespace-nowrap">
            Mon–Sat 8AM–5PM
          </span>
        </div>
      </div>
    );
  }


  // ── 3. Redesigned Compact Studio Card (Streamlined Horizontal Footprint) ───
  return (
    <div className={`bg-neutral-900/70 backdrop-blur-md border border-neutral-800/90 rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-white shadow-md flex items-center justify-between gap-3 ${className}`}>
      {/* Left: Status & Schedule */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <div className={`w-2 h-2 rounded-full shrink-0 ${isStudioOpen ? "bg-emerald-400 animate-pulse ring-2 ring-emerald-400/20" : "bg-neutral-500"}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-bold tracking-wide uppercase ${isStudioOpen ? "text-emerald-400" : "text-neutral-400"}`}>
              {isStudioOpen ? "Studio Open" : "Studio Closed"}
            </span>
            <span className="text-neutral-600 text-xs hidden sm:inline">·</span>
            <span className="text-xs text-neutral-400 hidden sm:inline truncate">Mon–Sat 8AM–5PM</span>
          </div>
          <p className="text-[11px] text-neutral-300 font-body flex items-center gap-1 mt-0.5 truncate">
            <Calendar size={11} className="text-gold shrink-0" />
            <span>{dateString}</span>
          </p>
        </div>
      </div>

      {/* Right: Live PHT Time */}
      <div className="text-right shrink-0">
        <div className="text-sm sm:text-base font-heading font-bold text-white tracking-tight flex items-center gap-1">
          <span>{shortTimeString}</span>
          <span className="text-[11px] font-bold text-gold bg-gold/15 px-1 py-0.5 rounded">PHT</span>
        </div>
        <span className="text-xs text-neutral-400 font-body block">Studio Operations</span>
      </div>
    </div>
  );
}

LiveClock.propTypes = {
  variant: PropTypes.oneOf(["compact", "pill", "compact-hero", "card"]),
  className: PropTypes.string,
};
