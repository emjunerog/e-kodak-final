/**
 * galleryData.js
 * ==============
 * GALLERY ITEMS & CATEGORIES
 *
 * HOW TO EDIT:
 *  - Add a new photo by adding an object to GALLERY_ITEMS.
 *  - Change categories by editing GALLERY_CATEGORIES.
 *  - Replace image URLs with real Supabase Storage URLs.
 *
 * FUTURE — SUPABASE INTEGRATION (Phase 10/21):
 *  Replace static array with:
 *    const { data } = await supabase.from('gallery_items')
 *      .select('*').eq('is_public', true).order('sort_order')
 *
 * DATABASE SCHEMA PREVIEW:
 *  gallery_items table:
 *    id           uuid PK
 *    booking_id   uuid FK (null for studio-curated items)
 *    category     text
 *    title        text
 *    description  text
 *    image_url    text
 *    is_public    boolean
 *    sort_order   int
 *    created_at   timestamptz
 */

export const GALLERY_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "community", label: "Best Captures" },
  { id: "portrait", label: "Portrait" },
  { id: "graduation", label: "Graduation" },
  { id: "event", label: "Events" },
  { id: "family", label: "Family" },
  { id: "couple", label: "Couple" },
  { id: "commercial", label: "Commercial" },
];

// ─── STUDIO GALLERY RESOURCES — backed by local studio assets in public/images/ ─
export const GALLERY_ITEMS = [
  // ── Customer Best Captures ───────────────────────────────────────────────────
  {
    id: "c1", category: "community",
    title: "Class of 2026 Milestone Portrait",
    description: "Shared studio favorite — formal toga & blue academic hood regalia portrait.",
    image: "/images/brochure/grad/toga-hood-portrait.jpg",
    aspectRatio: "portrait",
    likes: 188,
    badges: ["Client Pick", "Verified Graduate"],
  },
  // ── Portrait ─────────────────────────────────────────────────────────────────
  {
    id: "p1", category: "portrait",
    title: "Filipiniana Studio Portrait",
    description: "Classic formal portrait wearing cream embroidered Filipiniana attire.",
    image: "/images/brochure/grad/filipiniana-portrait.jpg",
    aspectRatio: "portrait",
    likes: 124,
    badges: ["Featured", "Client Favorite"],
  },
  {
    id: "p2", category: "portrait",
    title: "Barong Tagalog Portrait",
    description: "Crisp studio portrait in formal embroidered Barong Tagalog.",
    image: "/images/brochure/grad/barong-portrait.jpg",
    aspectRatio: "portrait",
  },
  {
    id: "p3", category: "portrait",
    title: "Academic Cap & Toga",
    description: "Warm studio portrait in academic regalia and graduation cap.",
    image: "/images/brochure/grad/toga-cap-formal.jpg",
    aspectRatio: "portrait",
    likes: 89,
    badges: ["Award Winning"],
  },
  {
    id: "p4", category: "portrait",
    title: "Dark Backdrop Portrait",
    description: "Formal studio lighting portrait against a textured dark backdrop.",
    image: "/images/brochure/grad/toga-formal.jpg",
    aspectRatio: "portrait",
  },

  // ── Graduation ────────────────────────────────────────────────────────────────
  {
    id: "g1", category: "graduation",
    title: "Graduation Day Regalia",
    description: "Formal graduation portrait with academic hood and gold medal.",
    image: "/images/brochure/grad/toga-hood-portrait.jpg",
    aspectRatio: "portrait",
    likes: 45,
  },
  {
    id: "g2", category: "graduation",
    title: "Milestone Toga Pose",
    description: "Expressive graduation milestone portrait in black toga and gold hood.",
    image: "/images/brochure/grad/toga-cap-pose.jpg",
    aspectRatio: "portrait",
  },
  {
    id: "g3", category: "graduation",
    title: "Honors Graduation Portrait",
    description: "Smiling graduation portrait with academic cap and blue tassel.",
    image: "/images/brochure/grad/toga-cap-formal.jpg",
    aspectRatio: "portrait",
  },

  // ── Events ────────────────────────────────────────────────────────────────────
  {
    id: "e1", category: "event",
    title: "Milestone Family Celebration",
    description: "Group celebration portrait honoring academic achievement.",
    image: "/images/brochure/grad/family-graduation.jpg",
    aspectRatio: "landscape",
  },
  {
    id: "e2", category: "event",
    title: "Studio Milestone Session",
    description: "Graduating student celebrating with academic regalia in studio.",
    image: "/images/brochure/grad/toga-cap-pose.jpg",
    aspectRatio: "portrait",
  },
  {
    id: "e3", category: "event",
    title: "Formal Attire Session",
    description: "Filipiniana celebration portrait with soft studio lighting.",
    image: "/images/brochure/grad/filipiniana-portrait.jpg",
    aspectRatio: "portrait",
  },
  {
    id: "e4", category: "event",
    title: "Ceremony Keepsake Portrait",
    description: "Timeless keepsake portrait captured in our Cebu studio.",
    image: "/images/brochure/grad/toga-formal.jpg",
    aspectRatio: "portrait",
  },

  // ── Family ────────────────────────────────────────────────────────────────────
  {
    id: "f1", category: "family",
    title: "Three-Generation Graduation Portrait",
    description: "Multi-generational family graduation portrait in our studio.",
    image: "/images/brochure/grad/family-graduation.jpg",
    aspectRatio: "landscape",
  },
  {
    id: "f2", category: "family",
    title: "Family Heritage Prints",
    description: "Printed keepsake photographs prepared for family display.",
    image: "/images/login-light.jpg",
    aspectRatio: "portrait",
  },
  {
    id: "f3", category: "family",
    title: "Graduate & Family Keepsake",
    description: "Studio family portrait celebrating academic milestones together.",
    image: "/images/brochure/grad/family-graduation.jpg",
    aspectRatio: "landscape",
  },

  // ── Couple ────────────────────────────────────────────────────────────────────
  {
    id: "c2", category: "couple",
    title: "Formal Filipiniana Study",
    description: "Classic Filipiniana portraiture with sculpted studio lighting.",
    image: "/images/brochure/grad/filipiniana-portrait.jpg",
    aspectRatio: "portrait",
  },
  {
    id: "c3", category: "couple",
    title: "Classic Barong Study",
    description: "Refined studio portrait featuring traditional embroidered Barong.",
    image: "/images/brochure/grad/barong-portrait.jpg",
    aspectRatio: "portrait",
  },

  // ── Commercial ────────────────────────────────────────────────────────────────
  {
    id: "com1", category: "commercial",
    title: "Studio Camera & Darkroom Prints",
    description: "Precision mirrorless optics paired with archival studio prints.",
    image: "/images/login-dark.jpg",
    aspectRatio: "portrait",
  },
  {
    id: "com2", category: "commercial",
    title: "Daylight Studio Print Desk",
    description: "Print proofing and curation in our natural-light studio.",
    image: "/images/login-light.jpg",
    aspectRatio: "portrait",
  },
];
