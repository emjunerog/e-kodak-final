/**
 * TeamCard.jsx
 * ============
 * PHOTOGRAPHER / TEAM MEMBER CARD
 *
 * Displays: photo, name, role, specializations, short bio, social links.
 * Falls back to initials avatar if image fails to load.
 *
 * Props:
 *  @param {object} member - A team member object from aboutData.js
 */

import { useState } from "react";

// Inline SVG social icons (same pattern as Footer.jsx)
function InstagramIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function FacebookIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export default function TeamCard({ member }) {
  const [imgError, setImgError] = useState(false);

  // Color mapping for initials avatars
  const avatarColors = {
    MD: "bg-blue-100 text-blue-700",
    SR: "bg-rose-100 text-rose-700",
    JV: "bg-emerald-100 text-emerald-700",
    CM: "bg-purple-100 text-purple-700",
  };

  return (
    <article
      className="card card-hover overflow-hidden group"
      aria-label={`Team member: ${member.name}`}
    >
      {/* Photo */}
      <div className="relative h-72 overflow-hidden bg-neutral-100">
        {!imgError ? (
          <img
            src={member.image}
            alt={member.imageAlt}
            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105 no-drag"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          /* Initials fallback if photo fails */
          <div
            className={`w-full h-full flex items-center justify-center ${
              avatarColors[member.initials] || "bg-neutral-100 text-neutral-500"
            }`}
          >
            <span className="font-heading text-5xl font-medium">
              {member.initials}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/10 to-transparent"
          aria-hidden="true"
        />

        {/* Name overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="font-body text-gold text-[10px] uppercase tracking-[0.2em] font-medium">
            {member.role}
          </p>
          <h3 className="font-heading text-white text-xl font-medium">
            {member.name}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Bio */}
        <p className="font-body text-neutral-500 text-sm leading-relaxed mb-4">
          {member.bio}
        </p>

        {/* Specializations */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {member.specializations.map((spec) => (
            <span
              key={spec}
              className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 font-body text-[10px] font-medium uppercase tracking-wider"
            >
              {spec}
            </span>
          ))}
        </div>

        {/* Social links */}
        {member.social && (
          <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
            {member.social.instagram && (
              <a
                href={member.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 text-neutral-500 hover:bg-gold/15 hover:text-gold transition-all duration-200"
                aria-label={`${member.name} on Instagram`}
              >
                <InstagramIcon size={14} />
              </a>
            )}
            {member.social.facebook && (
              <a
                href={member.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 text-neutral-500 hover:bg-gold/15 hover:text-gold transition-all duration-200"
                aria-label={`${member.name} on Facebook`}
              >
                <FacebookIcon size={14} />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
