import React, { useState } from "react";

/**
 * Official Real Logos for Cebu Universities & Colleges.
 * Sourced directly from official institutional uploads and university repositories.
 */
export const OFFICIAL_SCHOOL_LOGOS = {
  ctu: {
    name: "Cebu Technological University",
    src: "/images/schools/ctu.png",
    fit: "object-contain"
  },
  usc: {
    name: "University of San Carlos",
    src: "/images/schools/usc_seal.svg",
    fit: "object-contain"
  },
  uc: {
    name: "University of Cebu",
    src: "/images/schools/uc.png",
    fit: "object-contain"
  },
  uv: {
    name: "University of the Visayas",
    src: "/images/schools/uv.jpg",
    fit: "object-cover"
  },
  cnu: {
    name: "Cebu Normal University",
    src: "/images/schools/cnu.png",
    fit: "object-contain"
  },
  citu: {
    name: "Cebu Institute of Technology - University",
    src: "/images/schools/citu.png",
    fit: "object-contain"
  },
  upcebu: {
    name: "University of the Philippines Cebu",
    src: "/images/schools/upcebu.png",
    fit: "object-contain"
  },
  usjr: {
    name: "University of San Jose - Recoletos",
    src: "/images/schools/usjr.png",
    fit: "object-contain"
  },
  swu: {
    name: "Southwestern University PHINMA",
    src: "/images/schools/swu.jpg",
    fit: "object-contain"
  },
  cdu: {
    name: "Cebu Doctors' University",
    src: "/images/schools/cdu.png",
    fit: "object-contain"
  },
  velez: {
    name: "Velez College",
    src: "/images/schools/velez.jpg",
    fit: "object-contain"
  },
  uspf: {
    name: "University of Southern Philippines Foundation",
    src: "/images/schools/uspf.png",
    fit: "object-contain"
  },
  benedicto: {
    name: "Benedicto College",
    src: "/images/schools/benedicto.png",
    fit: "object-contain"
  },
  act: {
    name: "Asian College of Technology",
    src: "/images/schools/act.png",
    fit: "object-contain"
  },
  stc: {
    name: "St. Theresa's College of Cebu",
    src: "/images/schools/stc.jpg",
    fit: "object-contain"
  }
};

/**
 * Universal SchoolLogo Component
 * Displays the actual, official school logo image pulled from the institution.
 */
export default function SchoolLogo({ univId, name = "", size = "md", className = "" }) {
  const [imgError, setImgError] = useState(false);
  const normalizedId = (univId || "").toLowerCase();
  const official = OFFICIAL_SCHOOL_LOGOS[normalizedId];

  // Dimension presets
  const sizeClasses = {
    xs: "w-5 h-5 min-w-[20px]",
    sm: "w-7 h-7 min-w-[28px] p-0.5",
    md: "w-9 h-9 min-w-[36px] p-1",
    lg: "w-11 h-11 min-w-[44px] p-1.5",
    xl: "w-14 h-14 min-w-[56px] p-2"
  }[size] || "w-9 h-9 min-w-[36px] p-1";

  // If official actual logo image is available and hasn't failed to load
  if (official && !imgError) {
    return (
      <div
        className={`relative shrink-0 aspect-square rounded-xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center overflow-hidden transition-transform ${sizeClasses} ${className}`}
        title={official.name}
      >
        <img
          src={official.src}
          alt={official.name}
          onError={() => setImgError(true)}
          className={`w-full h-full ${official.fit || "object-contain"} select-none`}
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback: Elegant Gold-trim Academic Seal with initials
  const rawName = name || univId || "University";
  const initials = rawName
    .replace(/[^a-zA-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(w => w[0].toUpperCase())
    .join("") || "SCH";

  return (
    <div
      className={`relative shrink-0 aspect-square rounded-xl overflow-hidden bg-neutral-900 border border-gold/40 shadow-sm flex items-center justify-center ${sizeClasses} ${className}`}
      title={rawName}
    >
      <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
        <circle cx="20" cy="20" r="19" fill="#1E293B" stroke="#D4AF37" strokeWidth="1.5" />
        <path d="M20 10l8 4-8 4-8-4z" fill="#D4AF37" />
        <path d="M14 17v4c0 2 3 3 6 3s6-1 6-3v-4" stroke="#D4AF37" strokeWidth="1" fill="none" />
        <text x="20" y="34.5" textAnchor="middle" fill="#FFFFFF" fontSize="5" fontWeight="800" fontFamily="sans-serif">
          {initials}
        </text>
      </svg>
    </div>
  );
}
