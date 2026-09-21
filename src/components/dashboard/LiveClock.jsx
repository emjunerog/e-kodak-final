import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Clock, Calendar } from "lucide-react";

/**
 * LiveClock Component
 * Displays live Philippine Standard Time (PHT / UTC+8), date, and studio operational status.
 * Supports "compact" (header/navbar) and "card" (dashboard hero/widget) variants.
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

  const dateString = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Studio Operating Hours (Mon-Sat: 8:00 AM – 5:00 PM)
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0 = Sunday
  const isSunday = currentDay === 0;
  const isStudioOpen = !isSunday && currentHour >= 8 && currentHour < 17;

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2.5 text-xs font-body text-neutral-600 bg-neutral-100/80 px-3 py-1.5 rounded-full border border-neutral-200/80 ${className}`}>
        <span className={`w-2 h-2 rounded-full ${isStudioOpen ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`} />
        <span className="font-semibold text-primary">{timeString}</span>
        <span className="text-neutral-400 hidden sm:inline">|</span>
        <span className="text-neutral-500 hidden sm:inline">{dateString}</span>
        <span className="text-[10px] text-gold font-bold px-1.5 py-0.2 bg-gold/10 rounded">PHT</span>
      </div>
    );
  }

  return (
    <div className={`bg-neutral-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 text-white flex flex-col justify-between shadow-xl ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gold/20 text-gold flex items-center justify-center">
            <Clock size={16} />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-gold">
              Studio Philippine Time
            </span>
            <p className="text-xs text-neutral-300 font-body">PHT (UTC+8)</p>
          </div>
        </div>
        
        {/* Studio Status Pill */}
        <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
          isStudioOpen 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
            : "bg-neutral-800 text-neutral-300 border-neutral-700"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isStudioOpen ? "bg-emerald-400 animate-pulse" : "bg-neutral-400"}`} />
          <span>{isStudioOpen ? "Studio Open" : "Studio Closed"}</span>
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-1">
        <div>
          <div className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-white font-body">
            {timeString}
          </div>
          <p className="text-xs text-neutral-400 font-body mt-0.5 flex items-center gap-1.5">
            <Calendar size={12} className="text-gold" />
            <span>{dateString}</span>
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-neutral-400 block font-body">Studio Schedule</span>
          <span className="text-xs font-semibold text-gold font-body">Mon–Sat 8AM–5PM</span>
        </div>
      </div>
    </div>
  );
}

LiveClock.propTypes = {
  variant: PropTypes.oneOf(["compact", "card"]),
  className: PropTypes.string,
};
