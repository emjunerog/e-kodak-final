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
  { id: "portrait", label: "Portrait" },
  { id: "graduation", label: "Graduation" },
  { id: "event", label: "Events" },
  { id: "family", label: "Family" },
  { id: "couple", label: "Couple" },
  { id: "commercial", label: "Commercial" },
];

// ─── PLACEHOLDER GALLERY ITEMS — replace with real studio photos before launch ─
export const GALLERY_ITEMS = [
  // ── Portrait ─────────────────────────────────────────────────────────────────
  {
    id: "p1", category: "portrait",
    title: "Natural Light Portrait",
    description: "Outdoor portrait session with soft natural diffused lighting.",
    image: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80&auto=format&fit=crop",
    beforeImage: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80&auto=format&fit=crop&sepia=1", // Fake before image by using sepia tone or similar, for demo
    aspectRatio: "portrait",
    likes: 124,
    badges: ["Featured", "Client Favorite"],
  },
  {
    id: "p2", category: "portrait",
    title: "Studio Editorial",
    description: "Clean studio portrait with dramatic side lighting.",
    image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "portrait",
  },
  {
    id: "p3", category: "portrait",
    title: "Professional Headshot",
    description: "Corporate headshot — clean background, confident expression.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "square",
    likes: 89,
    badges: ["Award Winning"],
  },
  {
    id: "p4", category: "portrait",
    title: "Lifestyle Portrait",
    description: "Relaxed lifestyle portrait in a coffee shop setting.",
    image: "https://images.unsplash.com/photo-1614644147798-f8c0fc9da7f6?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "landscape",
  },

  // ── Graduation ────────────────────────────────────────────────────────────────
  {
    id: "g1", category: "graduation",
    title: "Graduation Day",
    description: "Formal graduation portrait with academic regalia.",
    image: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=800&q=80&auto=format&fit=crop",
    beforeImage: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=800&q=20&auto=format&fit=crop&blur=10",
    aspectRatio: "portrait",
    likes: 45,
  },
  {
    id: "g2", category: "graduation",
    title: "Campus Celebration",
    description: "Candid graduation celebration on university grounds.",
    image: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "landscape",
  },
  {
    id: "g3", category: "graduation",
    title: "Milestone Portrait",
    description: "Elegant graduation portrait with soft background.",
    image: "https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "portrait",
  },

  // ── Events ────────────────────────────────────────────────────────────────────
  {
    id: "e1", category: "event",
    title: "Birthday Celebration",
    description: "Full event coverage of an intimate birthday party.",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "landscape",
  },
  {
    id: "e2", category: "event",
    title: "Corporate Gathering",
    description: "Professional documentation of a company team event.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "landscape",
  },
  {
    id: "e3", category: "event",
    title: "Debut Celebration",
    description: "Elegant debut coverage — candid moments and formals.",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "portrait",
  },
  {
    id: "e4", category: "event",
    title: "Evening Gala",
    description: "Evening event photography — ambient and dynamic lighting.",
    image: "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "landscape",
  },

  // ── Family ────────────────────────────────────────────────────────────────────
  {
    id: "f1", category: "family",
    title: "Family in the Park",
    description: "Relaxed outdoor family session with natural expressions.",
    image: "https://images.unsplash.com/photo-1511895426328-dc8714191011?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "landscape",
  },
  {
    id: "f2", category: "family",
    title: "Home Session",
    description: "Cozy at-home family portraits — authentic and warm.",
    image: "https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "landscape",
  },
  {
    id: "f3", category: "family",
    title: "Three Generations",
    description: "Multi-generational family portrait session.",
    image: "https://images.unsplash.com/photo-1601027847350-0285867c31f7?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "portrait",
  },

  // ── Couple ────────────────────────────────────────────────────────────────────
  {
    id: "c1", category: "couple",
    title: "Golden Hour Session",
    description: "Romantic couple shoot during sunset golden hour.",
    image: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "landscape",
  },
  {
    id: "c2", category: "couple",
    title: "Urban Prenuptial",
    description: "Creative prenuptial session in a city environment.",
    image: "https://images.unsplash.com/photo-1488116908828-cbf1b36c6e53?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "portrait",
  },
  {
    id: "c3", category: "couple",
    title: "Beach Engagement",
    description: "Beachside engagement session with warm tones.",
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "landscape",
  },

  // ── Commercial ────────────────────────────────────────────────────────────────
  {
    id: "com1", category: "commercial",
    title: "Product Photography",
    description: "Clean product shot for e-commerce and marketing.",
    image: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "square",
  },
  {
    id: "com2", category: "commercial",
    title: "Brand Lifestyle",
    description: "Lifestyle branding session for a local business.",
    image: "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&q=80&auto=format&fit=crop",
    aspectRatio: "landscape",
  },
];
