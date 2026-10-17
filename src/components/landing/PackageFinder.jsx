/**
 * PackageFinder.jsx
 * =================
 * INTELLIGENT PACKAGE & SET DETECTION SYSTEM (FinderCard)
 *
 * Provides high-precision detection of studio packages and specific sets:
 *  - Mode A: 3-Step Guided Matcher (Occasion → Deliverables Priority → Budget Set)
 *  - Mode B: Instant Quick-Detect Search (Type 'makeup', 'drone', 'Set A', 'crystal', etc.)
 *
 * Features:
 *  - Accurately detects all 11 studio sets across College, Senior High, Wedding Video, and Wedding Photo
 *  - Zero emojis — clean luxury Lucide icons throughout
 *  - Real-time sibling set switcher on recommendation card
 *  - Direct booking preselection and anchor navigation to /services#sets-[slug]
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  CheckCircle,
  Camera,
  Sparkles,
  RotateCcw,
  GraduationCap,
  Scroll,
  Video,
  Crown,
  Search,
  Check,
  Layers,
} from "lucide-react";
import { siteConfig } from "../../config/siteConfig";
import { stagger, staggerChild, ease } from "../../lib/motion";

// ── Complete Studio Package Sets Database ─────────────────────────────────────
export const STUDIO_PACKAGES = [
  // ── College Graduation Packages
  {
    id: "college-a",
    slug: "college-packages",
    serviceName: "College Packages and Sets",
    category: "college",
    tier: "Set A",
    price: "₱4,875.00",
    tagline: "Grandest collegiate milestone package with crystal frames & free styling",
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
    freePerk: "Free professional hair styling and makeup",
    bestFor: "Graduates seeking full crystal framing, formal Filipiniana or Barong, and family portraiture",
    keywords: ["college", "set a", "12x18", "crystal wood", "filipiniana", "barong", "family", "makeup", "hair", "make-up"],
  },
  {
    id: "college-b",
    slug: "college-packages",
    serviceName: "College Packages and Sets",
    category: "college",
    tier: "Set B",
    price: "₱3,575.00",
    tagline: "Essential crystal wood framed portrait with complete ID suite",
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
    freePerk: "Complete professional regalia pictorial included",
    bestFor: "Value-conscious collegiate graduates desiring a 12×16 crystal frame and comprehensive prints",
    keywords: ["college", "set b", "12x16", "crystal wood", "filipiniana", "barong", "wallet", "passport", "id"],
  },

  // ── Senior High School Packages
  {
    id: "shs-a",
    slug: "senior-high-packages",
    serviceName: "Senior High Packages and Sets",
    category: "senior-high",
    tier: "Set A",
    price: "₱1,750.00",
    tagline: "Top-tier SHS set with 10×12 crystal wood frame & Filipiniana/Barong attire",
    highlights: [
      "1 piece 10×12\" colored portrait with crystal wood frame",
      "1 piece 8×10\" Filipiniana or Barong portrait (unframed)",
      "4 pieces Wallet-size colored prints with academic cap (2R)",
      "4 pieces Wallet-size colored prints in Filipiniana or Barong (2R)",
      "6 pieces Passport-size colored ID prints (TESDA standard)",
      "6 pieces 2×2\" colored ID prints in formal attire",
      "Free professional makeup session (studio pictorial only)",
    ],
    freePerk: "Free professional makeup session (studio pictorial only)",
    bestFor: "Senior high graduates wanting a framed keepsake and Filipiniana portrait with free makeup",
    keywords: ["senior high", "shs", "set a", "10x12", "crystal wood", "filipiniana", "tesda", "passport", "makeup"],
  },
  {
    id: "shs-b",
    slug: "senior-high-packages",
    serviceName: "Senior High Packages and Sets",
    category: "senior-high",
    tier: "Set B",
    price: "₱1,425.00",
    tagline: "8×10 crystal wood print with TESDA passport prints & free makeup",
    highlights: [
      "1 piece 8×10\" colored portrait on crystal wood mount",
      "4 pieces Wallet-size colored prints with academic cap (2R)",
      "6 pieces 2×2\" colored ID prints in formal attire",
      "6 pieces Passport-size colored ID prints (TESDA standard)",
      "Free professional makeup session (studio pictorial only)",
    ],
    freePerk: "Free professional makeup session (studio pictorial only)",
    bestFor: "Graduates needing standard crystal wood prints, complete TESDA IDs, and makeup",
    keywords: ["senior high", "shs", "set b", "8x10", "crystal wood", "tesda", "passport", "makeup"],
  },
  {
    id: "shs-c",
    slug: "senior-high-packages",
    serviceName: "Senior High Packages and Sets",
    category: "senior-high",
    tier: "Set C",
    price: "₱1,100.00",
    tagline: "Standard 8×10 portrait, complete IDs and free studio makeup",
    highlights: [
      "1 piece 8×10\" colored portrait (unframed)",
      "6 pieces Wallet-size colored prints (2R)",
      "6 pieces 2×2\" colored ID prints in formal attire",
      "6 pieces Passport-size colored ID prints (TESDA standard)",
      "Free professional makeup session (studio pictorial only)",
    ],
    freePerk: "Free professional makeup session (studio pictorial only)",
    bestFor: "Popular balance of standard photo prints, comprehensive rush IDs, and studio makeup",
    keywords: ["senior high", "shs", "set c", "8x10", "tesda", "passport", "wallet", "makeup"],
  },
  {
    id: "shs-d",
    slug: "senior-high-packages",
    serviceName: "Senior High Packages and Sets",
    category: "senior-high",
    tier: "Set D",
    price: "₱795.00",
    tagline: "Essential budget toga portrait and wallet prints",
    highlights: [
      "1 piece 8×10\" colored portrait (unframed)",
      "4 pieces Wallet-size colored prints (2R)",
      "Standard studio session (makeup not included)",
    ],
    freePerk: "Free use of graduation toga & hood",
    bestFor: "Cost-effective, essential graduation toga portraits without extraneous extras",
    keywords: ["senior high", "shs", "set d", "budget", "795", "toga", "wallet", "essential"],
  },

  // ── Wedding HD Videography
  {
    id: "wed-vid-b",
    slug: "wedding-video",
    serviceName: "Video / Wedding Packages",
    category: "wedding-video",
    tier: "Set B",
    price: "₱18,500.00",
    tagline: "Core full-day HD video coverage with MTV movie highlights",
    highlights: [
      "2 units Mirrorless video cameras with professional videographers",
      "Full event coverage: preparation, church ceremony, and reception",
      "1 piece High-speed USB drive and Google Drive cloud delivery",
      "Full-length wedding movie and cinematic highlight reel",
    ],
    freePerk: "USB flash drive & cloud archive delivery",
    bestFor: "Couples looking for cinematic full-ceremony & reception wedding videography",
    keywords: ["wedding video", "set b", "mirrorless", "mtv", "usb", "reception", "church", "hd video"],
  },
  {
    id: "wed-vid-c",
    slug: "wedding-video",
    serviceName: "Video / Wedding Packages",
    category: "wedding-video",
    tier: "Set C",
    price: "₱28,000.00",
    tagline: "4K Aerial Drone coverage + high-energy Same Day Edit (SDE)",
    highlights: [
      "2 units Mirrorless video cameras with professional videographers",
      "1 unit 4K aerial drone for scenic venue and procession coverage",
      "Full event coverage: preparation, church ceremony, and reception",
      "Same Day Edit (SDE) video highlight reel premiered during reception",
      "1 piece High-speed USB drive and Google Drive cloud delivery",
      "Full-length wedding movie and cinematic highlight reel",
    ],
    freePerk: "4K Drone aerial cinematic footage included",
    bestFor: "Couples wanting grand aerial visuals and an SDE video shown during reception dinner",
    keywords: ["wedding video", "set c", "drone", "sde", "same day edit", "aerial", "4k", "mtv"],
  },
  {
    id: "wed-vid-d",
    slug: "wedding-video",
    serviceName: "Video / Wedding Packages",
    category: "wedding-video",
    tier: "Set D",
    price: "₱39,000.00",
    tagline: "Full 3-camera master suite with drone, prenup teaser, SDE & AVP",
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
    freePerk: "Outdoor pre-wedding teaser video shoot included",
    bestFor: "Grand wedding celebrations requiring full multi-camera cinema crews and teaser films",
    keywords: ["wedding video", "set d", "3 cameras", "drone", "teaser", "sde", "avp", "master suite"],
  },

  // ── Wedding Photography
  {
    id: "wed-pic-a",
    slug: "wedding-photo",
    serviceName: "Photo / Wedding Services",
    category: "wedding-photo",
    tier: "Set A",
    price: "₱18,500.00",
    tagline: "2 photographers with unlimited shots, 11×14 framed portrait & 150 prints",
    highlights: [
      "Full event coverage: preparation, church ceremony, and reception",
      "Unlimited high-resolution shots with high-speed USB storage",
      "1 piece 11×14\" formal framed portrait",
      "150 pieces 4×6\" (4R) lab-quality color photo prints",
      "2 professional photographers on site",
    ],
    freePerk: "Custom 150-print slip-in album & 11×14 frame",
    bestFor: "Classic heirloom wedding photography with keepsake framed portrait and prints",
    keywords: ["wedding photo", "set a", "11x14", "4r", "album", "2 photographers", "unlimited"],
  },
  {
    id: "wed-pic-c",
    slug: "wedding-photo",
    serviceName: "Photo / Wedding Services",
    category: "wedding-photo",
    tier: "Set C",
    price: "₱31,000.00",
    tagline: "3 photographers, 16×20 frame, 10×10 collage photo book, prenup & SDE",
    highlights: [
      "Full event coverage: preparation, church ceremony, and reception",
      "Unlimited high-resolution shots with high-speed USB storage",
      "1 piece 30-page 10×10\" premium collage photo book",
      "1 piece 16×20\" grand framed portrait",
      "Pre-wedding (prenup) photoshoot session with digital photo teaser",
      "Same Day Edit (SDE) photo slideshow premiered during reception",
      "3 professional photographers on site",
    ],
    freePerk: "Complimentary outdoor prenup pictorial included",
    bestFor: "Couples desiring a custom designer photo book, prenup shoot, and reception SDE photos",
    keywords: ["wedding photo", "set c", "photo book", "16x20", "prenup", "sde", "3 photographers"],
  },
  {
    id: "wed-pic-d",
    slug: "wedding-photo",
    serviceName: "Photo / Wedding Services",
    category: "wedding-photo",
    tier: "Set D",
    price: "₱53,500.00",
    tagline: "Master suite: 4 photographers, 24×30 canvas, 40-pg hardbound album & prenup",
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
    freePerk: "24×30 Gallery Canvas & signature guestbook",
    bestFor: "Grand heirloom weddings demanding museum-grade canvas art and a 40-page storybook",
    keywords: ["wedding photo", "set d", "canvas", "24x30", "hardbound", "storybook", "guestbook", "4 photographers"],
  },
];

// ── Step 1 Occasion Definitions ───────────────────────────────────────────────
const OCCASION_OPTIONS = [
  {
    value: "college-packages",
    label: "College Graduation",
    subtitle: "Crystal wood frames, Barong/Filipiniana, family sets",
    icon: GraduationCap,
  },
  {
    value: "senior-high-packages",
    label: "Senior High School",
    subtitle: "Toga pictorials, crystal frames, rush TESDA IDs",
    icon: Scroll,
  },
  {
    value: "wedding-video",
    label: "Wedding HD Video",
    subtitle: "Cinematic 4K, aerial drone, Same Day Edit & MTV",
    icon: Video,
  },
  {
    value: "wedding-photo",
    label: "Wedding Photography",
    subtitle: "Full day coverage, canvas frames & storybook albums",
    icon: Camera,
  },
];

// ── Step 2 Priorities by Occasion ─────────────────────────────────────────────
const PRIORITY_OPTIONS = {
  "college-packages": [
    {
      value: "college-a",
      label: "Grand Milestone (Set A)",
      desc: "12x18 Crystal Wood Frame, Barong/Filipiniana, Family Portrait & Free Hair/Make-up",
    },
    {
      value: "college-b",
      label: "Value Milestone (Set B)",
      desc: "12x16 Crystal Wood Frame, Filipiniana, Family Picture & Complete ID prints",
    },
  ],
  "senior-high-packages": [
    {
      value: "shs-a",
      label: "Most Complete (Set A)",
      desc: "10x12 Crystal Frame + Pilipiña Attire + Free Studio Make-up",
    },
    {
      value: "shs-b",
      label: "Crystal Print (Set B)",
      desc: "8x10 Crystal Wood + TESDA Passport + Free Studio Make-up",
    },
    {
      value: "shs-c",
      label: "Standard Prints (Set C)",
      desc: "8x10 Portrait Print + Complete Rush IDs + Free Studio Make-up",
    },
    {
      value: "shs-d",
      label: "Budget Essential (Set D)",
      desc: "Essential Toga Portrait & 4 Wallet Prints (₱795.00)",
    },
  ],
  "wedding-video": [
    {
      value: "wed-vid-d",
      label: "Master Cinema Suite (Set D)",
      desc: "3 Cameras + Drone + Pre-wedding Teaser + Same Day Edit (SDE) + AVP",
    },
    {
      value: "wed-vid-c",
      label: "Drone & SDE Highlights (Set C)",
      desc: "2 Mirrorless Cameras + 4K Drone Aerials + Same Day Edit (SDE)",
    },
    {
      value: "wed-vid-b",
      label: "Core Full-Day Coverage (Set B)",
      desc: "2 Mirrorless Cameras (Prep, Church, Reception) + MTV Highlights",
    },
  ],
  "wedding-photo": [
    {
      value: "wed-pic-d",
      label: "Luxury Canvas & Storybook (Set D)",
      desc: "4 Photographers + 24x30 Canvas + 40-pg Hardbound Album + Prenup + SDE",
    },
    {
      value: "wed-pic-c",
      label: "Collage Book & Prenup (Set C)",
      desc: "3 Photographers + 16x20 Frame + 30-pg Photo Book + Prenup & SDE",
    },
    {
      value: "wed-pic-a",
      label: "Core Photography (Set A)",
      desc: "2 Photographers + 11x14 Frame + 150 4R Prints in Custom Album",
    },
  ],
};

// ── Step 3 Budget Tiers by Occasion ───────────────────────────────────────────
const BUDGET_OPTIONS = {
  "college-packages": [
    { value: "college-b", label: "₱3,575.00 (Set B)", desc: "12x16 crystal wood frame & complete prints" },
    { value: "college-a", label: "₱4,875.00 (Set A)", desc: "12x18 crystal wood frame & free make-up" },
  ],
  "senior-high-packages": [
    { value: "shs-d", label: "₱795.00 (Set D)",   desc: "Essential 8x10 print & 4 wallet sizes" },
    { value: "shs-c", label: "₱1,100.00 (Set C)", desc: "8x10 print, TESDA passport & free studio makeup" },
    { value: "shs-b", label: "₱1,425.00 (Set B)", desc: "8x10 crystal wood & free studio makeup" },
    { value: "shs-a", label: "₱1,750.00 (Set A)", desc: "10x12 crystal wood frame & free studio makeup" },
  ],
  "wedding-video": [
    { value: "wed-vid-b", label: "₱18,500.00 (Set B)", desc: "2 Cameras, full event coverage & MTV" },
    { value: "wed-vid-c", label: "₱28,000.00 (Set C)", desc: "2 Cameras + 4K drone + Same Day Edit" },
    { value: "wed-vid-d", label: "₱39,000.00 (Set D)", desc: "3 Cameras, drone, teaser shoot, SDE & AVP" },
  ],
  "wedding-photo": [
    { value: "wed-pic-a", label: "₱18,500.00 (Set A)", desc: "2 Photographers, 11x14 frame & 150 prints" },
    { value: "wed-pic-c", label: "₱31,000.00 (Set C)", desc: "3 Photographers, photo book, prenup & SDE" },
    { value: "wed-pic-d", label: "₱53,500.00 (Set D)", desc: "4 Photographers, 24x30 canvas & 40-pg album" },
  ],
};

// ── Main FinderCard Component ─────────────────────────────────────────────────
export function FinderCard({ className = "", onNavigate }) {
  const [step, setStep] = useState(0); // 0 = intro, 1 = occasion, 2 = priority, 3 = budget, 4 = result
  const [occasion, setOccasion] = useState(null);
  const [priority, setPriority] = useState(null);
  const [budget, setBudget] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Live Keyword Detector: Finds matching sets by inclusions/keywords
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return STUDIO_PACKAGES.filter((p) => {
      const matchName = p.serviceName.toLowerCase().includes(q);
      const matchTier = p.tier.toLowerCase().includes(q);
      const matchPrice = p.price.toLowerCase().includes(q);
      const matchHighlights = p.highlights.some((h) => h.toLowerCase().includes(q));
      const matchKeywords = p.keywords.some((k) => k.toLowerCase().includes(q));
      return matchName || matchTier || matchPrice || matchHighlights || matchKeywords;
    }).slice(0, 4);
  }, [searchQuery]);

  // Detected set: either picked directly, or computed from wizard answers
  const detectedSet = useMemo(() => {
    if (selectedSet) return selectedSet;
    if (budget) {
      return STUDIO_PACKAGES.find((p) => p.id === budget) || STUDIO_PACKAGES[0];
    }
    if (priority) {
      return STUDIO_PACKAGES.find((p) => p.id === priority) || STUDIO_PACKAGES[0];
    }
    return STUDIO_PACKAGES[0];
  }, [selectedSet, budget, priority]);

  // Sibling sets under the same service for direct comparison
  const siblingSets = useMemo(() => {
    if (!detectedSet) return [];
    return STUDIO_PACKAGES.filter((p) => p.slug === detectedSet.slug);
  }, [detectedSet]);

  function handleSelectOccasion(val) {
    setOccasion(val);
    setPriority(null);
    setBudget(null);
    setSelectedSet(null);
    setStep(2);
  }

  function handleSelectPriority(val) {
    setPriority(val);
    setStep(3);
  }

  function handleSelectBudget(val) {
    setBudget(val);
    const matched = STUDIO_PACKAGES.find((p) => p.id === val) || null;
    setSelectedSet(matched);
    setStep(4);
  }

  function handleQuickSelect(pkg) {
    setSelectedSet(pkg);
    setOccasion(pkg.slug);
    setSearchQuery("");
    setStep(4);
  }

  function handleReset() {
    setStep(0);
    setOccasion(null);
    setPriority(null);
    setBudget(null);
    setSelectedSet(null);
    setSearchQuery("");
  }

  return (
    <motion.div
      className={`bg-white rounded-2xl border border-neutral-100 shadow-warm-md overflow-hidden relative flex flex-col ${className}`}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: ease.spring }}
    >
      {/* ── Progress Bar across steps 1 to 3 ────────────────────────────── */}
      {step >= 1 && step <= 3 && (
        <div className="h-1 bg-neutral-100">
          <motion.div
            className="h-full bg-gradient-to-r from-gold via-gold-light to-gold"
            initial={{ width: "33%" }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.45, ease: ease.smooth }}
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={3}
          />
        </div>
      )}

      {/* ── Quick Detection Search Bar ──────────────────────────────────── */}
      {step < 4 && (
        <div className="p-3 bg-neutral-50/80 border-b border-neutral-100">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Quick detect (e.g. 'makeup', 'Set A', 'drone', 'crystal')..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-body text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {/* Quick-Match Live Results Dropdown */}
          <AnimatePresence>
            {searchMatches.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-2 bg-white rounded-xl border border-gold/30 shadow-warm-md overflow-hidden divide-y divide-neutral-100"
              >
                <div className="px-3 py-1 bg-gold/10 flex items-center justify-between text-[10px] font-body font-bold uppercase tracking-wider text-gold-dark">
                  <span>Detected Sets ({searchMatches.length})</span>
                  <span>Click to view</span>
                </div>
                {searchMatches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleQuickSelect(m)}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <p className="font-heading text-xs font-semibold text-primary truncate group-hover:text-gold-dark">
                        {m.serviceName} · <strong className="text-gold font-bold">{m.tier}</strong>
                      </p>
                      <p className="font-body text-[11px] text-neutral-500 truncate">
                        {m.highlights[0]}
                      </p>
                    </div>
                    <span className="shrink-0 font-body text-xs font-bold text-primary">
                      {m.price}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {/* ── INTRO / START SCREEN ────────────────────────────────────────── */}
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: ease.smooth }}
            className="p-6 sm:p-8 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-gold/15 text-gold flex items-center justify-center mx-auto mb-4 border border-gold/30 shadow-sm">
              <Sparkles size={24} />
            </div>
            <h3 className="font-heading text-primary text-xl font-bold mb-1.5">
              Intelligent Package & Set Finder
            </h3>
            <p className="font-body text-neutral-500 text-xs sm:text-sm leading-relaxed mb-6 max-w-sm mx-auto">
              Answer 3 quick questions to detect the ideal photography set, deliverables, and exact pricing tailored to your milestone.
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-3 px-5 rounded-xl bg-primary text-white font-body text-sm font-semibold hover:bg-primary-light transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              Start Set Finder
              <ArrowRight size={15} />
            </button>
          </motion.div>
        )}

        {/* ── STEP 1: OCCASION ───────────────────────────────────────────── */}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: ease.smooth }}
            className="p-5 sm:p-6"
          >
            <p className="font-body text-[10px] font-bold uppercase tracking-widest text-gold-dark mb-1">
              Step 1 of 3 · Occasion
            </p>
            <h4 className="font-heading text-primary text-lg font-bold mb-1">
              What milestone are you celebrating?
            </h4>
            <p className="font-body text-neutral-400 text-xs mb-4">
              Select the service type to reveal all available tiers.
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {OCCASION_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectOccasion(opt.value)}
                    className="w-full p-3.5 rounded-xl border border-neutral-200 hover:border-gold/60 hover:bg-gold/5 text-left transition-all flex items-center gap-3.5 cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 group-hover:bg-gold/20 text-neutral-700 group-hover:text-primary flex items-center justify-center shrink-0 transition-colors">
                      <IconComponent size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-sm font-semibold text-primary group-hover:text-gold-dark">
                        {opt.label}
                      </p>
                      <p className="font-body text-[11px] text-neutral-400 truncate">
                        {opt.subtitle}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-neutral-300 group-hover:text-gold transition-colors" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: DELIVERABLES PRIORITY ──────────────────────────────── */}
        {step === 2 && occasion && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: ease.smooth }}
            className="p-5 sm:p-6"
          >
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 text-[11px] font-body text-neutral-400 hover:text-primary mb-2 transition-colors cursor-pointer"
            >
              <ChevronLeft size={12} /> Back to occasions
            </button>
            <p className="font-body text-[10px] font-bold uppercase tracking-widest text-gold-dark mb-1">
              Step 2 of 3 · Deliverables Priority
            </p>
            <h4 className="font-heading text-primary text-lg font-bold mb-1">
              What inclusion matters most to you?
            </h4>
            <p className="font-body text-neutral-400 text-xs mb-4">
              We'll filter the sets that feature these deliverables.
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {(PRIORITY_OPTIONS[occasion] || []).map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleSelectPriority(p.value)}
                  className="w-full p-3.5 rounded-xl border border-neutral-200 hover:border-gold/60 hover:bg-gold/5 text-left transition-all cursor-pointer group"
                >
                  <p className="font-heading text-sm font-semibold text-primary group-hover:text-gold-dark mb-0.5">
                    {p.label}
                  </p>
                  <p className="font-body text-xs text-neutral-500 leading-snug">
                    {p.desc}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: EXACT BUDGET TIER ───────────────────────────────────── */}
        {step === 3 && occasion && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: ease.smooth }}
            className="p-5 sm:p-6"
          >
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1 text-[11px] font-body text-neutral-400 hover:text-primary mb-2 transition-colors cursor-pointer"
            >
              <ChevronLeft size={12} /> Back to priorities
            </button>
            <p className="font-body text-[10px] font-bold uppercase tracking-widest text-gold-dark mb-1">
              Step 3 of 3 · Investment Tier
            </p>
            <h4 className="font-heading text-primary text-lg font-bold mb-1">
              Select your preferred investment
            </h4>
            <p className="font-body text-neutral-400 text-xs mb-4">
              Real pricing directly matching studio database sets.
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {(BUDGET_OPTIONS[occasion] || []).map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => handleSelectBudget(b.value)}
                  className="w-full p-3.5 rounded-xl border border-neutral-200 hover:border-gold/60 hover:bg-gold/5 text-left transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-bold text-primary group-hover:text-gold-dark">
                      {b.label}
                    </p>
                    <p className="font-body text-xs text-neutral-500">
                      {b.desc}
                    </p>
                  </div>
                  <CheckCircle size={16} className="text-neutral-300 group-hover:text-gold shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: DETECTED SET RECOMMENDATION CARD ────────────────────── */}
        {step === 4 && detectedSet && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.45, ease: ease.smooth }}
            className="flex flex-col"
          >
            {/* Header: Detection Banner */}
            <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-5 text-white border-b border-gold/30 relative">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/20 text-gold text-[10px] font-body font-bold uppercase tracking-wider border border-gold/30">
                  <Check size={11} /> 100% Match Detected
                </span>
                <span className="font-body text-[10px] text-neutral-400 uppercase tracking-widest">
                  Studio Package
                </span>
              </div>
              <h3 className="font-heading text-lg font-bold text-white mb-0.5">
                {detectedSet.serviceName}
              </h3>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="px-2 py-0.5 rounded bg-gold text-primary font-body text-xs font-bold uppercase">
                  {detectedSet.tier}
                </span>
                <span className="font-heading text-gold text-xl font-bold">
                  {detectedSet.price}
                </span>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-5 flex-1 flex flex-col space-y-3.5">
              {/* Contextual rationale */}
              <div className="bg-gold/10 border border-gold/20 rounded-xl p-3 text-xs font-body text-neutral-700 leading-relaxed">
                <p>
                  <strong className="text-primary font-bold">Why this set fits:</strong> {detectedSet.bestFor}
                </p>
              </div>

              {/* Inclusions checklist */}
              <div>
                <p className="font-body text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                  Key Deliverables
                </p>
                <ul className="space-y-1.5">
                  {detectedSet.highlights.slice(0, 4).map((h) => (
                    <li key={h} className="flex items-center gap-2 text-xs font-body text-neutral-700">
                      <span className="w-3.5 h-3.5 rounded-full bg-gold/25 text-gold-dark flex items-center justify-center shrink-0 text-[9px] font-bold">
                        ✓
                      </span>
                      <span className="truncate">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Free perk highlight */}
              {detectedSet.freePerk && (
                <div className="px-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 text-xs font-body text-neutral-800 flex items-center gap-2">
                  <Sparkles size={12} className="text-gold shrink-0" />
                  <span className="truncate">
                    <strong className="text-primary font-bold">Special Perk:</strong> {detectedSet.freePerk}
                  </span>
                </div>
              )}

              {/* Sibling sets switcher */}
              {siblingSets.length > 1 && (
                <div className="pt-2 border-t border-dashed border-neutral-200">
                  <p className="font-body text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                    Compare other sets in this package:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {siblingSets.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSet(s)}
                        className={`px-2.5 py-1 rounded-md text-xs font-body font-semibold transition-all cursor-pointer ${
                          detectedSet.id === s.id
                            ? "bg-primary text-white shadow-sm"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        }`}
                      >
                        {s.tier} ({s.price})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-100 space-y-2 mt-auto">
                <Link
                  to={`/register?service=${detectedSet.slug}&tier=${encodeURIComponent(detectedSet.tier)}`}
                  onClick={onNavigate}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-gold to-gold-light text-primary font-body text-xs sm:text-sm font-bold hover:shadow-gold transition-all flex items-center justify-center gap-2"
                >
                  Book {detectedSet.tier} Now
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to={`${siteConfig.routes.services}#sets-${detectedSet.slug}`}
                  onClick={onNavigate}
                  className="w-full py-2 px-4 rounded-xl border border-neutral-200 hover:border-gold text-neutral-700 hover:text-primary font-body text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  View Full Package on Services Page →
                </Link>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full text-center text-[11px] font-body text-neutral-400 hover:text-neutral-600 transition-colors pt-1 cursor-pointer flex items-center justify-center gap-1"
                >
                  <RotateCcw size={11} /> Find another package
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default FinderCard;
