/**
 * Footer.jsx
 * ==========
 * PROFESSIONAL SITE FOOTER
 *
 * Sections:
 *  - Brand column: logo, description, social icons
 *  - Pages column: main navigation links
 *  - Services column: photography service types (placeholder)
 *  - Contact column: contact details
 *  - Bottom bar: copyright + legal links
 *
 * All content comes from siteConfig.js.
 * Social links are placeholders — update in siteConfig before launch.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, MapPin, Phone, Mail, Clock } from "lucide-react";
import { stagger, staggerChild, viewport, ease } from "../../lib/motion";

// ── Inline SVG Social Icons (lucide-react v0.5+ removed brand icons) ─────────
function FacebookIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function InstagramIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function YoutubeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white" />
    </svg>
  );
}
import { useSiteConfig } from "../../context/SiteConfigContext";

// TikTok icon (not in lucide-react)
function TikTokIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.83 1.56V6.8a4.85 4.85 0 0 1-1.06-.11z" />
    </svg>
  );
}

const currentYear = new Date().getFullYear();

const footerServices = [
  { label: "College Packages and sets",     to: "/services" },
  { label: "Senior High Packages and sets", to: "/services" },
  { label: "Video / Wedding Packages",      to: "/services" },
  { label: "Photo / Wedding Services",      to: "/services" },
];

export default function Footer() {
  const { config: siteConfig } = useSiteConfig();
  
  return (
    <footer className="relative bg-primary text-white overflow-hidden" role="contentinfo">
      {/* ── Ambient gold glow ───────────────────────────────────────────────── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: "-10%", top: "-40%", width: 620, height: 480,
          background: "radial-gradient(ellipse, rgba(212,175,55,0.10) 0%, transparent 68%)",
        }}
        animate={{ scale: [1, 1.12, 1], x: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />

      {/* ── Main Footer Grid ─────────────────────────────────────────────────── */}
      <div className="container-custom py-16 lg:py-20 relative z-10">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8"
          variants={stagger(0.13, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ ...viewport, margin: "-60px" }}
        >

          {/* ── Brand Column ─────────────────────────────────────────────────── */}
          <motion.div className="sm:col-span-2 lg:col-span-1" variants={staggerChild}>
            {/* Logo */}
            <Link
              to={siteConfig.routes.home}
              className="group inline-flex items-center gap-2.5 font-heading font-semibold text-xl text-white mb-4 hover:text-gold-light transition-colors"
              aria-label={`${siteConfig.name} — Home`}
            >
              <motion.span
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-950 border border-neutral-800 p-1"
                whileHover={{ rotate: [0, -14, 14, 0], scale: 1.12 }}
                transition={{ duration: 0.6, ease: ease.spring }}
              >
                <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain" />
              </motion.span>
              {siteConfig.name}
            </Link>

            {/* Description */}
            <p className="font-body text-neutral-400 text-sm leading-relaxed mb-6 max-w-xs">
              {siteConfig.description}
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3" aria-label="Social media links">
              {siteConfig.social.facebook && (
                <motion.a
                  href={siteConfig.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/8 text-neutral-400 hover:bg-gold/20 hover:text-gold transition-colors duration-200"
                  aria-label="Facebook"
                  whileHover={{ y: -5, scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 460, damping: 16 }}
                >
                  <FacebookIcon size={16} />
                </motion.a>
              )}
              {siteConfig.social.instagram && (
                <motion.a
                  href={siteConfig.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/8 text-neutral-400 hover:bg-gold/20 hover:text-gold transition-colors duration-200"
                  aria-label="Instagram"
                  whileHover={{ y: -5, scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 460, damping: 16 }}
                >
                  <InstagramIcon size={16} />
                </motion.a>
              )}
              {siteConfig.social.tiktok && (
                <motion.a
                  href={siteConfig.social.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/8 text-neutral-400 hover:bg-gold/20 hover:text-gold transition-colors duration-200"
                  aria-label="TikTok"
                  whileHover={{ y: -5, scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 460, damping: 16 }}
                >
                  <TikTokIcon size={15} />
                </motion.a>
              )}
              {siteConfig.social.youtube && (
                <motion.a
                  href={siteConfig.social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/8 text-neutral-400 hover:bg-gold/20 hover:text-gold transition-colors duration-200"
                  aria-label="YouTube"
                  whileHover={{ y: -5, scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 460, damping: 16 }}
                >
                  <YoutubeIcon size={16} />
                </motion.a>
              )}
            </div>
          </motion.div>

          {/* ── Navigation Column ────────────────────────────────────────────── */}
          <motion.div variants={staggerChild}>
            <h3 className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400 mb-5">
              Navigation
            </h3>
            <ul className="space-y-3" role="list">
              {[
                { label: "Home", to: siteConfig.routes.home },
                { label: "Services", to: siteConfig.routes.services },
                { label: "Gallery", to: siteConfig.routes.gallery },
                { label: "About", to: siteConfig.routes.about },
                { label: "Contact", to: siteConfig.routes.contact },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="group inline-flex items-center gap-2 font-body text-sm text-neutral-300 hover:text-gold transition-colors duration-200"
                  >
                    <span className="w-0 group-hover:w-3 h-px bg-gold transition-all duration-300" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* ── Services Column ───────────────────────────────────────────────── */}
          <motion.div variants={staggerChild}>
            <h3 className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400 mb-5">
              Services
            </h3>
            <ul className="space-y-3" role="list">
              {footerServices.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="group inline-flex items-center gap-2 font-body text-sm text-neutral-300 hover:text-gold transition-colors duration-200"
                  >
                    <span className="w-0 group-hover:w-3 h-px bg-gold transition-all duration-300" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* ── Contact Column ────────────────────────────────────────────────── */}
          <motion.div variants={staggerChild}>
            <h3 className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400 mb-5">
              Contact
            </h3>
            <ul className="space-y-4" role="list">
              <li className="flex items-start gap-3">
                <motion.span
                  className="text-gold mt-0.5 shrink-0"
                  whileHover={{ y: -3, scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <MapPin size={15} aria-hidden="true" />
                </motion.span>
                <span className="font-body text-sm text-neutral-300 leading-relaxed">
                  {siteConfig.contact.address}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <motion.span
                  className="text-gold shrink-0"
                  whileHover={{ rotate: 18, scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <Phone size={15} aria-hidden="true" />
                </motion.span>
                <a
                  href={`tel:${siteConfig.contact.phone}`}
                  className="font-body text-sm text-neutral-300 hover:text-gold transition-colors"
                >
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <motion.span
                  className="text-gold shrink-0"
                  whileHover={{ x: 4, scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <Mail size={15} aria-hidden="true" />
                </motion.span>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="font-body text-sm text-neutral-300 hover:text-gold transition-colors"
                >
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <motion.span
                  className="text-gold mt-0.5 shrink-0"
                  animate={{ rotate: 360 }}
                  style={{ transformOrigin: "center" }}
                  transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
                >
                  <Clock size={15} aria-hidden="true" />
                </motion.span>
                <span className="font-body text-sm text-neutral-300 leading-relaxed">
                  {siteConfig.contact.hours}
                </span>
              </li>
            </ul>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Gold Divider ─────────────────────────────────────────────────────── */}
      <div className="border-t border-white/8">
        <motion.div
          className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent -mt-px origin-left"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={viewport}
          transition={{ duration: 1.4, ease: ease.expo }}
          aria-hidden="true"
        />
        <div className="container-custom py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <motion.p
            className="font-body text-xs text-neutral-500 text-center sm:text-left"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewport}
            transition={{ duration: 0.7 }}
          >
            © {currentYear} {siteConfig.name}. All rights reserved.
          </motion.p>
          <div className="flex items-center gap-5">
            <motion.div whileHover={{ y: -2 }}>
              <Link
                to="/privacy"
                className="font-body text-xs text-neutral-500 hover:text-gold transition-colors"
              >
                Privacy Policy
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -2 }}>
              <Link
                to="/terms"
                className="font-body text-xs text-neutral-500 hover:text-gold transition-colors"
              >
                Terms of Service
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  );
}
