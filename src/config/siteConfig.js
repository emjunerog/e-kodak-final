/**
 * siteConfig.js
 * =============
 * CENTRALIZED BRANDING & SITE CONFIGURATION
 *
 * This is the single source of truth for all branding, contact, and
 * navigation data. To change the studio name, social links, or contact
 * details — only edit THIS file. No other component needs to be touched.
 *
 * Future: Some values (e.g., services, testimonials) will be moved to
 * Supabase so the admin can manage them through the dashboard.
 */

export const siteConfig = {
  // ─── Studio Identity ────────────────────────────────────────────────────────
  name: "E-Kodak",
  tagline: "Moments Worth Remembering",
  description:
    "Professional photography services designed to preserve the moments that matter most. From portraits to events — we capture life beautifully.",
  shortDescription: "Professional Photography Studio",

  // ─── Contact (placeholder — replace with real details before launch) ─────────
  contact: {
    email: "hello@ekodak.ph",
    phone: "+63 912 345 6789",
    address: "Cebu City, Philippines",
    hours: "Monday – Saturday, 9:00 AM – 6:00 PM",
  },

  // ─── Social Media (placeholder links) ───────────────────────────────────────
  social: {
    facebook: "https://facebook.com/ekodak",
    instagram: "https://instagram.com/ekodak",
    tiktok: "https://tiktok.com/@ekodak",
    youtube: "",
  },

  // ─── Navigation Labels ───────────────────────────────────────────────────────
  nav: {
    home: "Home",
    services: "Services",
    gallery: "Gallery",
    about: "About",
    contact: "Contact",
    login: "Login",
    bookCta: "Book a Session",
  },

  // ─── Route Paths ─────────────────────────────────────────────────────────────
  routes: {
    home: "/",
    services: "/services",
    gallery: "/gallery",
    about: "/about",
    contact: "/contact",
    login: "/login",
    register: "/register",
    // Authenticated routes (not yet implemented — future phases)
    dashboard: "/dashboard",
    bookings: "/bookings",
    admin: "/admin",
    photographer: "/photographer",
  },

  // ─── SEO Metadata ────────────────────────────────────────────────────────────
  seo: {
    title: "E-Kodak | Professional Photography Studio",
    description:
      "Book professional photography sessions in Cebu. Portraits, graduations, events, and family sessions. Track your booking in real time.",
    keywords:
      "photography studio, book photographer, portrait photography, graduation photography, Cebu photographer",
  },
};
