/**
 * servicesData.js
 * ===============
 * ALL PHOTOGRAPHY SERVICES & PACKAGES
 *
 * This file is the single source of truth for service content.
 *
 * HOW TO EDIT:
 *  - Change prices, descriptions, or inclusions HERE only.
 *  - Add a new service by adding an object to the SERVICES array.
 *  - Remove a service by deleting its object from the array.
 *
 * FUTURE — SUPABASE INTEGRATION (Phase 10):
 *  This static array will be replaced by a Supabase query:
 *    const { data } = await supabase.from('services').select('*').eq('active', true)
 *  The component structure will NOT change — only the data source.
 *
 * DATABASE SCHEMA PREVIEW (for reference):
 *  services table:
 *    id           uuid PK
 *    slug         text UNIQUE
 *    category     text
 *    name         text
 *    description  text
 *    inclusions   jsonb[]
 *    tiers        jsonb[]
 *    cover_image  text
 *    is_active    boolean
 *    sort_order   int
 *    created_at   timestamptz
 */

export const SERVICE_CATEGORIES = [
  { id: "all",         label: "All Services" },
  { id: "college",     label: "College Packages" },
  { id: "senior-high", label: "Senior High Packages" },
];

export const SERVICES = [
  {
    id: "e2415838-06be-4e80-aa7a-9f4d3b47a8a5",
    slug: "college-packages",
    category: "college",
    name: "College Packages and Sets",
    tagline: "Celebrate your collegiate milestone in style.",
    description:
      "Comprehensive college graduation packages featuring premium crystal wood framed portraits, formal Filipiniana or Barong attire, family portraits, and a complete set of passport and wallet prints.",
    coverImage:
      "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=900&q=80&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=600&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=600&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80&auto=format&fit=crop",
    ],
    inclusions: [
      "Free professional hair styling and makeup",
      "Professionally edited high-resolution digital files",
      "Private online gallery with download access",
      "Payment terms: 50% reservation downpayment upon booking; full balance due on the day of the photoshoot",
    ],
    tiers: [
      {
        name: "Set A",
        price: "₱4,875.00",
        edited: "All prints included",
        popular: true,
        duration: "45–60 Mins",
        highlights: [
          "1 piece 12×18\" portrait with crystal wood frame",
          "1 piece 8×10\" Filipiniana or Barong portrait with crystal frame",
          "1 piece 8×10\" Family portrait with crystal frame",
          "6 pieces Wallet-size colored prints (2R)",
          "6 pieces Wallet-size colored prints with academic cap (2R)",
          "6 pieces Wallet-size colored prints in Filipiniana or Barong (2R)",
          "12 pieces 2×2\" colored ID prints",
          "6 pieces Passport-size colored ID prints",
          "6 pieces 2×2\" colored ID prints in casual attire",
          "11 pieces 1×1\" colored ID prints",
          "1 piece 5×7\" colored desk print",
          "Free professional hair styling and makeup",
        ],
      },
      {
        name: "Set B",
        price: "₱3,575.00",
        edited: "All prints included",
        duration: "30–45 Mins",
        highlights: [
          "1 piece 12×16\" portrait with crystal wood frame",
          "1 piece 8×10\" Filipiniana or Barong portrait (unframed)",
          "1 piece 8×10\" Family portrait (unframed)",
          "6 pieces Wallet-size colored prints (2R)",
          "4 pieces Wallet-size colored prints with academic cap (2R)",
          "4 pieces Wallet-size colored prints in Filipiniana or Barong (2R)",
          "12 pieces 2×2\" colored ID prints",
          "6 pieces Passport-size colored ID prints",
          "4 pieces 2×2\" colored ID prints in casual attire",
          "8 pieces 1×1\" colored ID prints",
          "1 piece 5×7\" colored desk print (unframed)",
        ],
      },
    ],
    paymentPolicy: "Payment terms: 50% reservation downpayment upon booking; full balance due on the day of the photoshoot.",
    turnaround: "5–7 business days",
    location: "Studio / School",
    sortOrder: 1,
  },

  {
    id: "1471388e-b74f-41ec-96c8-1d220d557a89",
    slug: "senior-high-packages",
    category: "senior-high",
    name: "Senior High Packages and Sets",
    tagline: "Essential graduation & toga portraits for Senior High School.",
    description:
      "Accessible Senior High School graduation photography packages focusing on classic toga, formal attire, and Filipiniana portraits. Complete with crystal wood frames and ID prints.",
    coverImage:
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=900&q=80&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=600&q=80&auto=format&fit=crop",
    ],
    inclusions: [
      "Free use of graduation toga (non-transferable, non-refundable)",
      "Professionally edited high-resolution digital files",
      "Payment terms: 50% reservation downpayment upon booking; full balance due on the day of the photoshoot",
    ],
    tiers: [
      {
        name: "Set A",
        price: "₱1,750.00",
        edited: "Prints included",
        popular: true,
        duration: "30–40 Mins",
        highlights: [
          "1 piece 10×12\" colored portrait with crystal wood frame",
          "1 piece 8×10\" Filipiniana or Barong portrait (unframed)",
          "4 pieces Wallet-size colored prints with academic cap (2R)",
          "4 pieces Wallet-size colored prints in Filipiniana or Barong (2R)",
          "6 pieces Passport-size colored ID prints (TESDA standard)",
          "6 pieces 2×2\" colored ID prints in formal attire",
          "Free professional makeup session (studio pictorial only)",
        ],
      },
      {
        name: "Set B",
        price: "₱1,425.00",
        edited: "Prints included",
        duration: "25–35 Mins",
        highlights: [
          "1 piece 8×10\" colored portrait on crystal wood mount",
          "4 pieces Wallet-size colored prints with academic cap (2R)",
          "6 pieces 2×2\" colored ID prints in formal attire",
          "6 pieces Passport-size colored ID prints (TESDA standard)",
          "Free professional makeup session (studio pictorial only)",
        ],
      },
      {
        name: "Set C",
        price: "₱1,100.00",
        edited: "Prints included",
        duration: "20–30 Mins",
        highlights: [
          "1 piece 8×10\" colored portrait (unframed)",
          "6 pieces Wallet-size colored prints (2R)",
          "6 pieces 2×2\" colored ID prints in formal attire",
          "6 pieces Passport-size colored ID prints (TESDA standard)",
          "Free professional makeup session (studio pictorial only)",
        ],
      },
      {
        name: "Set D",
        price: "₱795.00",
        edited: "Prints included",
        duration: "15–20 Mins",
        highlights: [
          "1 piece 8×10\" colored portrait (unframed)",
          "4 pieces Wallet-size colored prints (2R)",
          "Standard studio session (makeup not included)",
        ],
      },
    ],
    paymentPolicy: "Payment terms: 50% reservation downpayment upon booking; full balance due on the day of the photoshoot.",
    turnaround: "5–7 business days",
    location: "Studio / School",
    sortOrder: 2,
  },
];

// ─── ADD-ONS — optional extras for any package ───────────────────────────────
export const ADD_ONS = [
  {
    id: "rush-delivery",
    name: "Rush Delivery (3 days)",
    category: "Turnaround & Digital",
    description: "Fast-track editing & processing within 72 hours",
    price: "+₱1,500",
  },
  {
    id: "extra-edited",
    name: "Extra Edited Photos (+10)",
    category: "Turnaround & Digital",
    description: "10 additional high-resolution magazine-retouched images",
    price: "+₱800",
  },
  {
    id: "same-day-sneak-peek",
    name: "Same-Day Sneak Peek (5 photos)",
    category: "Turnaround & Digital",
    description: "Receive 5 social-ready highlights within 6 hours of the shoot",
    price: "+₱1,000",
  },
  {
    id: "printed-8x10",
    name: "Printed 8×10 Portrait",
    category: "Prints & Keepsakes",
    description: "Archival lab-quality portrait print on heavy luster photo paper",
    price: "+₱350",
  },
  {
    id: "printed-album-20",
    name: "Printed Photo Album (20 pages)",
    category: "Prints & Keepsakes",
    description: "Premium layflat hardbound coffee-table album with custom cover",
    price: "+₱3,500",
  },
  {
    id: "additional-photographer",
    name: "Additional Assistant / Second Shooter",
    category: "Production Upgrades",
    description: "Extra camera coverage to capture multiple angles simultaneously",
    price: "+₱4,000",
  },
  {
    id: "drone-aerial",
    name: "Drone Aerial Photography",
    category: "Production Upgrades",
    description: "4K aerial wide shots of venue, graduation outdoor groups, or campus",
    price: "+₱3,000",
  },
  {
    id: "videography-film",
    name: "Videography (Short Film)",
    category: "Production Upgrades",
    description: "2-3 minute professionally color-graded and scored 4K video teaser",
    price: "+₱8,000",
  },
];

