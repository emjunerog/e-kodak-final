/**
 * PackageFinder.jsx
 * =================
 * "Help Me Choose" — interactive 2-step package recommendation wizard.
 *
 * Steps:
 *  1. What's the occasion? (Graduation / Portrait / Event / Family / Couple)
 *  2. What's your budget? (dynamic based on occasion)
 * Result: highlights the recommended service + tier, scrolls to it.
 */

import { useState } from "react";
import { ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

// ── Step data ─────────────────────────────────────────────────────────────────
const OCCASIONS = [
  { value: "college",       emoji: "🎓", label: "College Graduation",     sub: "College Packages and sets" },
  { value: "senior-high",   emoji: "📜", label: "Senior High School",     sub: "Senior High Packages and sets" },
  { value: "wedding-video", emoji: "🎥", label: "Wedding HD Videography", sub: "Mirrorless video, Drone, SDE & MTV" },
  { value: "wedding-photo", emoji: "📸", label: "Wedding Photography",    sub: "Full day coverage, USB, albums & frame" },
];

const BUDGETS = {
  college: [
    { value: "set_b", label: "₱3,575.00 (Set B)", sub: "12x16 crystal wood frame, Filipiniana & prints" },
    { value: "set_a", label: "₱4,875.00 (Set A)", sub: "12x18 crystal frame, Family pic & Free make-up" },
  ],
  "senior-high": [
    { value: "budget", label: "₱795 – ₱1,100 (Sets C & D)", sub: "Essential toga shots & wallet prints" },
    { value: "mid",    label: "₱1,425.00 (Set B)",           sub: "8x10 crystal wood & Free make-up" },
    { value: "full",   label: "₱1,750.00 (Set A)",           sub: "10x12 crystal wood frame & Filipiniana" },
  ],
  "wedding-video": [
    { value: "set_b", label: "₱18,500.00 (Set B)", sub: "2 Mirrorless cameras, full event coverage, USB & MTV" },
    { value: "set_c", label: "₱28,000.00 (Set C)", sub: "2 Cameras + Drone + Same Day Edit (SDE)" },
    { value: "set_d", label: "₱39,000.00 (Set D)", sub: "3 Cameras + Drone + Teaser + SDE + AVP" },
  ],
  "wedding-photo": [
    { value: "set_a", label: "₱18,500.00 (Set A)", sub: "2 Photographers, 11x14 frame, 150 4R prints" },
    { value: "set_c", label: "₱31,000.00 (Set C)", sub: "3 Photographers, 16x20 frame, Photo Book, Prenup & SDE" },
    { value: "set_d", label: "₱53,500.00 (Set D)", sub: "4 Photographers, 40-pg hardbound album, 24x30 canvass & SDE" },
  ],
};

// ── Recommendation map ────────────────────────────────────────────────────────
const RECOMMENDATIONS = {
  college: {
    set_b: {
      slug: "college-packages",
      tier: "Set B",
      price: "₱3,575.00",
      reason: "Includes 12x16 crystal wood frame, 8x10 Filipiniana portrait, family picture, and complete ID prints.",
      emoji: "⭐",
    },
    set_a: {
      slug: "college-packages",
      tier: "Set A",
      price: "₱4,875.00",
      reason: "Our grandest college graduation set — 12x18 crystal frame, 2 crystal frames, and FREE professional hair & makeup styling.",
      emoji: "🏆",
    },
  },
  "senior-high": {
    budget: {
      slug: "senior-high-packages",
      tier: "Set D",
      price: "₱795.00",
      reason: "Our most accessible toga set — includes 8x10 portrait and wallet sizes with free toga use.",
      emoji: "💚",
    },
    mid: {
      slug: "senior-high-packages",
      tier: "Set B",
      price: "₱1,425.00",
      reason: "Includes 8x10 crystal wood print, passport sizes, and FREE studio makeup.",
      emoji: "⭐",
    },
    full: {
      slug: "senior-high-packages",
      tier: "Set A",
      price: "₱1,750.00",
      reason: "Best-value senior high set with 10x12 crystal wood frame, Filipiniana attire, and free studio makeup.",
      emoji: "🏆",
    },
  },
  "wedding-video": {
    set_b: {
      slug: "wedding-video",
      tier: "Set B",
      price: "₱18,500.00",
      reason: "HD Video coverage with 2 mirrorless cameras, preparation to reception, USB, Google Drive, and MTV.",
      emoji: "🎥",
    },
    set_c: {
      slug: "wedding-video",
      tier: "Set C",
      price: "₱28,000.00",
      reason: "Adds 4K aerial Drone coverage and high-energy Same Day Edit (SDE) video for your reception.",
      emoji: "⭐",
    },
    set_d: {
      slug: "wedding-video",
      tier: "Set D",
      price: "₱39,000.00",
      reason: "The ultimate 3-camera production with Drone, Teaser outdoor shoot, SDE, and Audio-Video Presentation (AVP).",
      emoji: "🏆",
    },
  },
  "wedding-photo": {
    set_a: {
      slug: "wedding-photo",
      tier: "Set A",
      price: "₱18,500.00",
      reason: "2 professional photographers, unlimited shots with USB, 11x14 framed portrait, and 150 4R prints.",
      emoji: "📸",
    },
    set_c: {
      slug: "wedding-photo",
      tier: "Set C",
      price: "₱31,000.00",
      reason: "3 photographers, 30-page 10x10 collage photo book, 16x20 frame, Prenup shoot with Teaser, and Same Day Edit.",
      emoji: "⭐",
    },
    set_d: {
      slug: "wedding-photo",
      tier: "Set D",
      price: "₱53,500.00",
      reason: "Master suite with 4 photographers, 40-page hardbound album, 24x30 canvas frame, DSLR video camera, and prenup.",
      emoji: "🏆",
    },
  },
};

// ── Option Button ─────────────────────────────────────────────────────────────
function OptionBtn({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 font-body text-sm transition-all duration-200 flex items-center justify-between group ${
        selected
          ? "border-gold bg-gold/10 text-primary"
          : "border-neutral-200 bg-white text-neutral-700 hover:border-gold/50 hover:bg-gold/5"
      }`}
    >
      <span>{children}</span>
      {selected && <span className="text-gold font-bold text-xs">✓</span>}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PackageFinder({ onRecommend }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [occasion, setOccasion] = useState(null);
  const [budget, setBudget] = useState(null);
  const [result, setResult] = useState(null);

  function reset() {
    setStep(1);
    setOccasion(null);
    setBudget(null);
    setResult(null);
  }

  function pickOccasion(val) {
    setOccasion(val);
    setBudget(null);
    setResult(null);
    setStep(2);
  }

  function pickBudget(val) {
    setBudget(val);
    const rec = RECOMMENDATIONS[occasion]?.[val] || null;
    setResult(rec);
    setStep(3);
    if (rec && onRecommend) onRecommend(rec.slug);
  }

  const budgetOptions = occasion ? (BUDGETS[occasion] || []) : [];

  return (
    <div className="mb-10">
      {/* ── Collapsed trigger ───────────────────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => { setOpen(true); reset(); }}
          className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-light border border-primary/20 shadow-warm-md group hover:shadow-warm-lg transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-gold" />
            </span>
            <div className="text-left">
              <p className="font-heading text-white text-base font-medium">Not sure which package to pick?</p>
              <p className="font-body text-white/60 text-xs">Answer 2 quick questions and we'll recommend the best fit</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold text-primary text-xs font-bold font-body shrink-0 group-hover:bg-gold-dark transition-colors">
            Help Me Choose <ChevronRight size={14} />
          </span>
        </button>
      )}

      {/* ── Expanded wizard ─────────────────────────────────────────────────── */}
      {open && (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-warm-lg overflow-hidden">
          {/* Wizard header */}
          <div className="bg-primary px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles size={18} className="text-gold" />
              <div>
                <p className="font-heading text-white text-base font-medium">Package Finder</p>
                <p className="font-body text-white/50 text-xs">Step {Math.min(step, 3)} of 3</p>
              </div>
            </div>
            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(s => (
                <span
                  key={s}
                  className={`rounded-full transition-all duration-300 ${
                    s < step ? "w-4 h-2 bg-gold" :
                    s === step ? "w-4 h-2 bg-gold" :
                    "w-2 h-2 bg-white/20"
                  }`}
                />
              ))}
              <button
                onClick={() => setOpen(false)}
                className="ml-3 text-white/40 hover:text-white transition-colors text-xs font-body"
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* ── Step 1: Occasion ─────────────────────────────────────────── */}
            {step === 1 && (
              <div>
                <p className="font-heading text-primary text-lg font-semibold mb-1">What's the occasion?</p>
                <p className="font-body text-neutral-400 text-sm mb-4">Choose the type of shoot you're interested in</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {OCCASIONS.map(o => (
                    <OptionBtn key={o.value} selected={occasion === o.value} onClick={() => pickOccasion(o.value)}>
                      <span className="flex items-center gap-3">
                        <span className="text-xl">{o.emoji}</span>
                        <span>
                          <span className="font-semibold block">{o.label}</span>
                          <span className="text-neutral-400 text-xs">{o.sub}</span>
                        </span>
                      </span>
                    </OptionBtn>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 2: Budget ───────────────────────────────────────────── */}
            {step === 2 && (
              <div>
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-neutral-400 hover:text-primary font-body text-xs mb-4 transition-colors">
                  ← Back
                </button>
                <p className="font-heading text-primary text-lg font-semibold mb-1">What's your budget?</p>
                <p className="font-body text-neutral-400 text-sm mb-4">
                  For <span className="text-primary font-semibold">{OCCASIONS.find(o => o.value === occasion)?.label}</span> photography
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {budgetOptions.map(b => (
                    <OptionBtn key={b.value} selected={budget === b.value} onClick={() => pickBudget(b.value)}>
                      <span>
                        <span className="font-heading font-bold text-primary">{b.label}</span>
                        <span className="text-neutral-400 text-xs block mt-0.5">{b.sub}</span>
                      </span>
                    </OptionBtn>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 3: Result ───────────────────────────────────────────── */}
            {step === 3 && result && (
              <div>
                <div className="text-center mb-5">
                  <span className="text-5xl">{result.emoji}</span>
                  <p className="font-body text-neutral-400 text-xs uppercase tracking-widest mt-3 mb-1">We Recommend</p>
                  <p className="font-heading text-primary text-2xl font-bold">{result.tier}</p>
                  <p className="font-heading text-gold text-xl font-semibold mt-0.5">{result.price}</p>
                </div>

                <div className="bg-gold/5 border border-gold/20 rounded-xl px-4 py-3 mb-5">
                  <p className="font-body text-neutral-700 text-sm leading-relaxed">{result.reason}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to={`/dashboard/book?service=${result.slug}&tier=${encodeURIComponent(result.tier)}`}
                    className="flex-1 text-center py-3 px-4 rounded-xl bg-gold text-primary font-body font-bold text-sm hover:bg-gold-dark transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    Book {result.tier} Now
                  </Link>
                  <button
                    onClick={() => {
                      // Scroll to the recommended service section
                      const el = document.getElementById(`service-block-${result.slug}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      setOpen(false);
                    }}
                    className="flex-1 text-center py-3 px-4 rounded-xl border-2 border-primary text-primary font-body font-semibold text-sm hover:bg-primary hover:text-white transition-all"
                  >
                    View Package Details ↓
                  </button>
                </div>

                <button
                  onClick={reset}
                  className="mt-4 flex items-center gap-1.5 text-neutral-400 hover:text-primary text-xs font-body transition-colors mx-auto"
                >
                  <RotateCcw size={11} /> Start over
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
