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
  { id: "all",           label: "All Services" },
  { id: "college",       label: "College Packages" },
  { id: "senior-high",   label: "Senior High Packages" },
  { id: "wedding-video", label: "Video / Wedding" },
  { id: "wedding-photo", label: "Photo / Wedding" },
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

  {
    id: "aab20afd-0e3c-41b2-8f70-0ab42167c50a",
    slug: "wedding-video",
    category: "wedding-video",
    name: "Video / Wedding Packages",
    tagline: "High-definition cinematic wedding video coverage.",
    description:
      "High-definition cinematic wedding videography capturing every emotion, vow, and celebration from morning preparation, church solemnity, to grand reception.",
    coverImage:
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80&auto=format&fit=crop",
    ],
    inclusions: [
      "Full HD / 4K multi-camera wedding video coverage",
      "Full event documentation: bride & groom preparation, church ceremony, and reception festivities",
      "Delivery on high-speed USB drive and private Google Drive link",
      "Full-length wedding movie and cinematic music video highlight reel",
      "Payment terms: 50% reservation downpayment upon booking; full balance due on the day of the event",
    ],
    tiers: [
      {
        name: "Set B",
        price: "₱18,500.00",
        duration: "Full Wedding Day",
        edited: "Full Movie & Highlight Reel",
        highlights: [
          "2 units Mirrorless video cameras with professional videographers",
          "Full event coverage: preparation, church ceremony, and reception",
          "1 piece High-speed USB drive and Google Drive cloud delivery",
          "Full-length wedding movie and cinematic highlight reel",
        ],
      },
      {
        name: "Set C",
        price: "₱28,000.00",
        duration: "Full Wedding Day + Drone",
        edited: "Same Day Edit (SDE)",
        popular: true,
        highlights: [
          "2 units Mirrorless video cameras with professional videographers",
          "1 unit 4K aerial drone for scenic venue and procession coverage",
          "Full event coverage: preparation, church ceremony, and reception",
          "Same Day Edit (SDE) video highlight reel premiered during reception",
          "1 piece High-speed USB drive and Google Drive cloud delivery",
          "Full-length wedding movie and cinematic highlight reel",
        ],
      },
      {
        name: "Set D",
        price: "₱39,000.00",
        duration: "Full Wedding Day + Drone + SDE + AVP",
        edited: "Same Day Edit (SDE) & AVP",
        highlights: [
          "3 units Mirrorless video cameras with professional videographers",
          "1 unit 4K aerial drone for scenic venue and procession coverage",
          "Full event coverage: preparation, church ceremony, and reception",
          "1 piece Pre-wedding outdoor teaser video shoot",
          "Same Day Edit (SDE) video highlight reel premiered during reception",
          "1 piece High-speed USB drive and Google Drive cloud delivery",
          "1 piece Couple's Audio-Visual Presentation (AVP) for reception showcase",
          "Full-length wedding movie and cinematic highlight reel",
        ],
      },
    ],
    paymentPolicy: "Payment terms: 50% reservation downpayment upon booking; full balance due on the day of the event.",
    turnaround: "Same Day Edit during event / Full edit 2–3 weeks",
    location: "Preparation, Church & Reception Venues",
    sortOrder: 3,
  },

  {
    id: "cd4271d4-8dd3-472f-86e5-0b658af9b02b",
    slug: "wedding-photo",
    category: "wedding-photo",
    name: "Photo / Wedding Services",
    tagline: "Professional wedding photography services.",
    description:
      "Complete professional wedding photography capturing timeless moments from bridal preparation to church ceremony and joyous reception festivities.",
    coverImage:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=80&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=600&q=80&auto=format&fit=crop",
    ],
    inclusions: [
      "Full photographic event coverage: bridal preparation, church ceremony, and reception celebration",
      "Unlimited high-resolution photo shots stored on high-speed USB",
      "Luxury framed portraits and archival collage photo books",
      "Lead and associate professional photographers",
      "Payment terms: 50% reservation downpayment upon booking; full balance due on the day of the event",
    ],
    tiers: [
      {
        name: "Set A",
        price: "₱18,500.00",
        duration: "Full Wedding Day",
        edited: "Unlimited Shots with USB",
        highlights: [
          "Full event coverage: preparation, church ceremony, and reception",
          "Unlimited high-resolution shots with high-speed USB storage",
          "1 piece 11×14\" formal framed portrait",
          "150 pieces 4×6\" (4R) lab-quality color photo prints",
          "2 professional photographers on site",
        ],
      },
      {
        name: "Set C",
        price: "₱31,000.00",
        duration: "Prenup + Full Wedding Day",
        edited: "Same Day Edit (SDE)",
        popular: true,
        highlights: [
          "Full event coverage: preparation, church ceremony, and reception",
          "Unlimited high-resolution shots with high-speed USB storage",
          "1 piece 30-page 10×10\" premium collage photo book",
          "1 piece 16×20\" grand framed portrait",
          "Pre-wedding (prenup) photoshoot session with digital photo teaser",
          "Same Day Edit (SDE) photo slideshow premiered during reception",
          "3 professional photographers on site",
        ],
      },
      {
        name: "Set D",
        price: "₱53,500.00",
        duration: "Grand Wedding Master Suite",
        edited: "Full Hardbound Album + Canvas + SDE + AVP",
        highlights: [
          "Full event coverage: preparation, church ceremony, and reception",
          "Unlimited high-resolution shots with high-speed USB storage",
          "200 pieces 4×6\" (4R) lab-quality color photo prints",
          "1 piece 40-page 11×14\" luxury hardbound collage wedding album",
          "1 piece 30-page 10×10\" premium collage photo book",
          "1 piece 24×30\" premium canvas portrait with elegant frame",
          "3 units Full HD video cameras for multi-angle video recording",
          "Pre-wedding (prenup) photoshoot session with digital photo teaser",
          "Same Day Edit (SDE) photo & video slideshow premiered during reception",
          "1 piece Couple's Audio-Visual Presentation (AVP) video showcase",
          "4 professional photographers on site",
        ],
      },
    ],
    paymentPolicy: "Payment terms: 50% reservation downpayment upon booking; full balance due on the day of the event.",
    turnaround: "Same Day Edit during event / Full album 3–4 weeks",
    location: "Preparation, Church & Reception Venues",
    sortOrder: 4,
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

