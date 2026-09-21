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
    id: "college-packages",
    slug: "college-packages",
    category: "college",
    name: "College Packages and sets",
    tagline: "Celebrate your collegiate milestone in style.",
    description:
      "Comprehensive college graduation packages with premium crystal wood framed portraits, formal Filipiniana / Barong attire, family portraits, and complete passport/wallet prints.",
    coverImage:
      "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=900&q=80&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=600&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=600&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80&auto=format&fit=crop",
    ],
    inclusions: [
      "Free make-up and hair style",
      "Professionally edited digital files",
      "Online gallery with download",
      "Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.",
    ],
    tiers: [
      {
        name: "Set A",
        price: "₱4,875.00",
        duration: "Studio Session",
        edited: "All prints included",
        highlights: [
          "1-12x18 with crystal wood frame",
          "1-8x10 pilipiñana or barong (crystal frame)",
          "1-8x10 Family picture (crystal frame)",
          "6pcs. Wallet size colored (2r)",
          "6pcs. Wallet size colored with cap (2r)",
          "6pcs. Wallet size colored pilipiñana/barong (2r)",
          "12pcs. 2x2 colored",
          "6pcs. Passport size",
          "6pcs. 2x2 colored casual attire",
          "11pcs. 1x1 colored",
          "1pcs. 5x7 size",
          "Free make-up and hair style",
        ],
        popular: true,
      },
      {
        name: "Set B",
        price: "₱3,575.00",
        duration: "Studio Session",
        edited: "All prints included",
        highlights: [
          "1-12x16 with crystal wood frame",
          "1-8x10 without frame pilipiñana or barong",
          "1-8x10 Family picture without frame",
          "6pcs. Wallet size colored (2r)",
          "4pcs. Wallet size colored with cap (2r)",
          "4pcs. Wallet size colored pilipiñana (2r)",
          "12pcs. 2x2 I.D colored",
          "6pcs. Passport size",
          "4pcs. 2x2 colored casual attire",
          "8pcs. 1x1 colored",
          "6pcs. Passport size",
          "1pcs. 5x7 size without frame",
        ],
      },
    ],
    paymentPolicy: "Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.",
    turnaround: "5–7 business days",
    location: "Studio",
    sortOrder: 1,
  },

  {
    id: "senior-high-packages",
    slug: "senior-high-packages",
    category: "senior-high",
    name: "Senior High Packages and sets",
    tagline: "Essential graduation & toga portraits for Senior High School.",
    description:
      "Accessible Senior High School graduation photography packages focusing on classic toga, formal attire, and Filipiniana portraits. Complete with crystal wood frames and ID prints.",
    coverImage:
      "https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=900&q=80&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=600&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=600&q=80&auto=format&fit=crop",
    ],
    inclusions: [
      "Free use of Toga (Non-transferable, Non-refundable)",
      "Professionally edited digital files",
      "Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.",
    ],
    tiers: [
      {
        name: "Set A",
        price: "₱1,750.00",
        duration: "Studio Session",
        edited: "Prints included",
        highlights: [
          "10x12 colored with crystal wood frame",
          "1-8x10 Pilipiña attired without frame",
          "4pcs. Wallet size colored with cap (2r)",
          "4pcs. Wallet size pilipiña",
          "6pcs. Passport size (Tesda)",
          "6pcs. 2x2 formal attire",
          "Free make up during studio pictorial only",
        ],
        popular: true,
      },
      {
        name: "Set B",
        price: "₱1,425.00",
        duration: "Studio Session",
        edited: "Prints included",
        highlights: [
          "8x10 colored with crystal wood without frame",
          "4pcs. Wallet size colored with cap (2r)",
          "6pcs. 2x2 formal attire",
          "6pcs. Passport size (Tesda)",
          "Free make up during studio pictorial only",
        ],
      },
      {
        name: "Set C",
        price: "₱1,100.00",
        duration: "Studio Session",
        edited: "Prints included",
        highlights: [
          "8x10 colored without frame",
          "6pcs. Wallet size colored (2r)",
          "6pcs. 2x2 formal attire",
          "6pcs. Passport size (Tesda)",
          "Free make up during studio pictorial only",
        ],
      },
      {
        name: "Set D",
        price: "₱795.00",
        duration: "Studio Session",
        edited: "Prints included",
        highlights: [
          "8x10 colored without frame",
          "4pcs. Wallet size colored (2r)",
          "No free make up",
        ],
      },
    ],
    paymentPolicy: "Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.",
    turnaround: "5–7 business days",
    location: "Studio",
    sortOrder: 2,
  },

  {
    id: "wedding-video",
    slug: "wedding-video",
    category: "wedding-video",
    name: "Video / Wedding Packages",
    tagline: "HD Video coverage",
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
      "HD Video coverage",
      "The Coverage, Preparation, Church and Reception",
      "USB and Google drive delivery",
      "PLAY MOVIE and MTV highlights",
      "Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.",
    ],
    tiers: [
      {
        name: "Set B",
        price: "₱18,500.00",
        duration: "Full Wedding Day",
        edited: "Play Movie & MTV",
        highlights: [
          "2 mirrorless camera video Camera with Videography",
          "The Coverage, Preparation, Church and Reception.",
          "1 USB and Google drive",
          "PLAY MOVIE and MTV",
        ],
      },
      {
        name: "Set C",
        price: "₱28,000.00",
        duration: "Full Wedding Day + Drone",
        edited: "Same Day Edit (SDE)",
        highlights: [
          "2 mirrorless camera video Camera with Videography",
          "with Drone",
          "The Coverage, Preparation, Church and Reception.",
          "Same Day Edit (SDE)",
          "1 USB and Google drive",
          "PLAY MOVIE and MTV",
        ],
        popular: true,
      },
      {
        name: "Set D",
        price: "₱39,000.00",
        duration: "Full Wedding Day + Drone + SDE + AVP",
        edited: "Same Day Edit (SDE) & AVP",
        highlights: [
          "3 mirrorless camera video Camera with Videography",
          "with drone",
          "The Coverage, Preparation, Church and Reception.",
          "Teaser Outdoor video shot",
          "Same Day Edit (SDE)",
          "1 USB and Google drive.",
          "Audio Video Presentation (AVP)",
          "PLAY MOVIE and MTV",
        ],
      },
    ],
    paymentPolicy: "Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.",
    turnaround: "Same Day Edit during event / Full edit 2–3 weeks",
    location: "Preparation, Church & Reception Venues",
    sortOrder: 3,
  },

  {
    id: "wedding-photo",
    slug: "wedding-photo",
    category: "wedding-photo",
    name: "Photo / Wedding Services",
    tagline: "Photography services",
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
      "The Coverage, Preparation, Church and Reception",
      "Unlimited Shots with USB",
      "Framed Portraits & Collage Photo Books",
      "Professional Lead & Assistant Photographers",
      "Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.",
    ],
    tiers: [
      {
        name: "Set A",
        price: "₱18,500.00",
        duration: "Full Wedding Day",
        edited: "Unlimited Shots with USB",
        highlights: [
          "The Coverage, Preparation, Church and Reception.",
          "Unlimited Shots with USB",
          "11x14 with frame",
          "150 prints 4x6 (4r)",
          "2 Photographer",
        ],
      },
      {
        name: "Set C",
        price: "₱31,000.00",
        duration: "Prenup + Full Wedding Day",
        edited: "Same Day Edit (SDE)",
        highlights: [
          "The Coverage, Preparation, Church and Reception.",
          "Unlimited Shots with USB",
          "30 pages Photo Book 10x10 collage",
          "1-16x20 with frame",
          "Prenup with Teaser",
          "Same Day Edit (SDE)",
          "3-Photographer",
        ],
        popular: true,
      },
      {
        name: "Set D",
        price: "₱53,500.00",
        duration: "Grand Wedding Master Suite",
        edited: "Full Hardbound Album + Canvass + SDE + AVP",
        highlights: [
          "The Coverage, Preparation, Church and Reception.",
          "Unlimited shots with USB",
          "200 copies 4r size without album",
          "40 pages hard bound album 11x14 collage",
          "30 pages Photo Book 10x10 collage",
          "24x30 canvass with frame",
          "3 DSLR full HDMI 1080p Video Camera",
          "Prenup with Teaser",
          "Same Day Edit (SDE)",
          "Audio Video Presentation (AVP)",
          "4-Photographer",
        ],
      },
    ],
    paymentPolicy: "Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.",
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

