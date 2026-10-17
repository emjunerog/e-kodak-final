/**
 * PackageFinder.jsx
 * =================
 * "Help Me Choose" — interactive 3-step package recommendation wizard.
 *
 * Steps:
 *  1. What's the occasion?
 *  2. What's your budget?   (built from the LIVE package's tiers, sorted
 *                            cheapest first — never hard-coded)
 *  3. Result                (the exact tier that was picked, with its real
 *                            price and inclusions)
 *
 * Everything is resolved against the `services` prop at render time, so the
 * wizard follows Supabase data, price changes and added/renamed sets instead
 * of drifting away from the catalog. Missing data degrades to a message —
 * never a blank panel.
 */

import { useState } from "react";
import { ChevronRight, RotateCcw, Sparkles, GraduationCap, Scroll, Video, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  staggerChild,
  scalePop,
  ease,
} from "../../lib/motion";
import { shortServiceLabel } from "../../lib/sectionNav";

// ── Occasions → live service matchers ────────────────────────────────────────
const OCCASIONS = [
  {
    value: "college",
    icon: GraduationCap,
    label: "College Graduation",
    sub: "Toga, family & framed prints",
    match: (s) => s.category === "college" || /college/i.test(`${s.slug || ""} ${s.name || ""}`),
  },
  {
    value: "senior-high",
    icon: Scroll,
    label: "Senior High School",
    sub: "Toga, studio & student prints",
    match: (s) => s.category === "senior-high" || /senior/i.test(`${s.slug || ""} ${s.name || ""}`),
  },
  {
    value: "wedding-video",
    icon: Video,
    label: "Wedding HD Videography",
    sub: "Mirrorless video, Drone, SDE & MTV",
    match: (s) => s.category === "wedding-video" || /video|videograph/i.test(`${s.slug || ""} ${s.name || ""}`),
  },
  {
    value: "wedding-photo",
    icon: Camera,
    label: "Wedding Photography",
    sub: "Full day coverage, USB, albums & frame",
    match: (s) => s.category === "wedding-photo" || /photo|photograph/i.test(`${s.slug || ""} ${s.name || ""}`),
  },
];

/** "₱4,875.00" → 4875 (0 when unparseable so sorting still works) */
function toNumber(price) {
  const n = parseFloat(String(price ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Budget choices = the matched package's own tiers, cheapest first. */
function buildOptions(service) {
  if (!service) return [];
  return [...(service.tiers || [])]
    .map((tier, index) => ({ tier, index, price: toNumber(tier.price) }))
    .sort((a, b) => a.price - b.price || a.index - b.index)
    .map(({ tier, index }) => {
      const name = tier.name || `Set ${index + 1}`;
      return {
        value: name,
        label: `${tier.price || "See price"} · ${name}`,
        sub: tierSummary(tier),
        tier: { ...tier, name },
      };
    });
}

function tierSummary(tier) {
  const highlights = tier.highlights || [];
  if (highlights.length) {
    const more = highlights.length - 2;
    return `${highlights.slice(0, 2).join(" · ")}${more > 0 ? ` +${more} more inclusions` : ""}`;
  }
  return tier.edited || "Complete prints and digital files";
}

/** The recommendation is the tier the user actually picked — never a guess. */
function buildResult(service, tier) {
  const highlights = tier.highlights || [];
  const more = highlights.length - 3;
  const body = highlights.length
    ? `${highlights.slice(0, 3).join(", ")}${more > 0 ? ` and ${more} more inclusions` : ""}`
    : tier.edited || "complete prints and digital files";
  const tone = tier.popular ? "Most popular choice — " : "";

  return {
    slug: service.slug,
    packageName: shortServiceLabel(service),
    tier: tier.name,
    price: tier.price,
    reason: `${tone}${body}.`,
  };
}

// ── Option Button ─────────────────────────────────────────────────────────────
function OptionBtn({ selected, onClick, children }) {
  return (
    <motion.button
      onClick={onClick}
      variants={staggerChild}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 340, damping: 24 }}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 font-body text-sm flex items-center justify-between group transition-[border-color,background-color] duration-200 ${
        selected
          ? "border-gold bg-gold/10 text-primary"
          : "border-neutral-200 bg-white text-neutral-700 hover:border-gold/50 hover:bg-gold/5"
      }`}
    >
      <span className="min-w-0">{children}</span>
      {selected && (
        <motion.span
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 14 }}
          className="text-gold font-bold text-xs"
        >
          ✓
        </motion.span>
      )}
    </motion.button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PackageFinder({
  services = [],
  onRecommend,
  onNavigate,
  isOpen: controlledOpen,
  onToggle,
  hideTrigger = false,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (val) => {
    if (onToggle) onToggle(val);
    setInternalOpen(val);
  };

  const [step, setStep] = useState(1);
  const [occasion, setOccasion] = useState(null);
  const [budget, setBudget] = useState(null);
  const [result, setResult] = useState(null);

  const selectedOccasion = OCCASIONS.find((o) => o.value === occasion) || null;
  const matchedService = selectedOccasion ? services.find(selectedOccasion.match) || null : null;
  const budgetOptions = matchedService ? buildOptions(matchedService) : [];
  const isLoadingPackages = services.length === 0;

  function reset() {
    setStep(1);
    setOccasion(null);
    setBudget(null);
    setResult(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function pickOccasion(val) {
    setOccasion(val);
    setBudget(null);
    setResult(null);
    setStep(2);
  }

  function pickBudget(option) {
    if (!matchedService) return;
    const rec = buildResult(matchedService, option.tier);
    setBudget(option.value);
    setResult(rec);
    setStep(3);
    if (rec && onRecommend) onRecommend(rec.slug);
  }

  // Wizard step transition: the panel slides while its options cascade in
  const stepIn = {
    hidden:  { opacity: 0, y: 22 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: ease.smooth,
        staggerChildren: 0.07,
        delayChildren: 0.12,
      },
    },
    exit: { opacity: 0, y: -16, transition: { duration: 0.25, ease: ease.smooth } },
  };

  return (
    <div className={hideTrigger ? "" : "mb-10"}>
      <AnimatePresence mode="wait">
      {/* ── Collapsed trigger ───────────────────────────────────────────── */}
      {!open && !hideTrigger && (
        <motion.button
          key="trigger"
          onClick={() => { setOpen(true); reset(); }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14, scale: 0.98 }}
          transition={{ duration: 0.45, ease: ease.smooth }}
          whileHover={{ y: -4 }}
          className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-light border border-primary/20 shadow-warm-md group hover:shadow-warm-lg transition-[box-shadow] duration-300"
        >
          <div className="flex items-center gap-3">
            <motion.span
              className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center shrink-0"
              animate={{ rotate: [0, 14, -14, 0] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles size={18} className="text-gold" />
            </motion.span>
            <div className="text-left">
              <p className="font-heading text-white text-base font-medium">Not sure which package to pick?</p>
              <p className="font-body text-white/60 text-xs">Answer 2 quick questions and we'll recommend the best fit</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold text-primary text-xs font-bold font-body shrink-0 group-hover:bg-gold-dark transition-colors">
            Help Me Choose <ChevronRight size={14} />
          </span>
        </motion.button>
      )}

      {/* ── Expanded wizard ─────────────────────────────────────────────── */}
      {open && (
        <motion.div
          key="wizard"
          initial={{ opacity: 0, y: -14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.985 }}
          transition={{ duration: 0.45, ease: ease.spring }}
          className="rounded-2xl border border-neutral-200 bg-white shadow-warm-lg overflow-hidden"
        >
          {/* Wizard header */}
          <div className="bg-primary px-5 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.span
                animate={{ rotate: [0, 18, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex"
              >
                <Sparkles size={18} className="text-gold" />
              </motion.span>
              <div>
                <p className="font-heading text-white text-base font-medium">Package Finder</p>
                <p className="font-body text-white/50 text-xs">Step {Math.min(step, 3)} of 3</p>
              </div>
            </div>
            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(s => (
                <motion.span
                  key={s}
                  layout
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className={`rounded-full ${
                    s <= step ? "w-4 h-2 bg-gold" :
                    "w-2 h-2 bg-white/20"
                  }`}
                />
              ))}
              <button
                onClick={close}
                aria-label="Close Package Finder"
                className="ml-3 text-white/40 hover:text-white transition-colors text-xs font-body"
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <AnimatePresence mode="wait">
            {/* ── Step 1: Occasion ─────────────────────────────────────── */}
            {step === 1 && (
              <motion.div key="step-1" variants={stepIn} initial="hidden" animate="show" exit="exit">
                <motion.p variants={staggerChild} className="font-heading text-primary text-lg font-semibold mb-1">
                  What's the occasion?
                </motion.p>
                <motion.p variants={staggerChild} className="font-body text-neutral-400 text-sm mb-4">
                  Choose the type of shoot you're interested in
                </motion.p>
                {isLoadingPackages && (
                  <motion.p variants={staggerChild} className="font-body text-neutral-400 text-xs mb-3">
                    Loading packages…
                  </motion.p>
                )}
                <div className="grid grid-cols-1 gap-2.5">
                  {OCCASIONS.map(o => {
                    const Icon = o.icon;
                    const available = services.some(o.match);
                    return (
                      <OptionBtn key={o.value} selected={occasion === o.value} onClick={() => pickOccasion(o.value)}>
                        <span className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-gold/15 text-gold flex items-center justify-center shrink-0">
                            <Icon size={16} />
                          </span>
                          <span className="min-w-0">
                            <span className="font-semibold block">{o.label}</span>
                            <span className="text-neutral-400 text-xs">{available ? o.sub : "Currently unavailable"}</span>
                          </span>
                        </span>
                      </OptionBtn>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Budget ───────────────────────────────────────── */}
            {step === 2 && (
              <motion.div key="step-2" variants={stepIn} initial="hidden" animate="show" exit="exit">
                <motion.button
                  onClick={() => setStep(1)}
                  variants={staggerChild}
                  className="flex items-center gap-1 text-neutral-400 hover:text-primary font-body text-xs mb-4 transition-colors"
                >
                  ← Back
                </motion.button>
                <motion.p variants={staggerChild} className="font-heading text-primary text-lg font-semibold mb-1">
                  What's your budget?
                </motion.p>
                <motion.p variants={staggerChild} className="font-body text-neutral-400 text-sm mb-4">
                  For <span className="text-primary font-semibold">{selectedOccasion?.label}</span> photography
                  {matchedService && budgetOptions.length > 0 && (
                    <span className="text-neutral-500">
                      {" "}· {budgetOptions.length} set{budgetOptions.length === 1 ? "" : "s"} available
                    </span>
                  )}
                </motion.p>

                {budgetOptions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {budgetOptions.map(option => (
                      <OptionBtn key={option.value} selected={budget === option.value} onClick={() => pickBudget(option)}>
                        <span>
                          <span className="font-heading font-bold text-primary">{option.label}</span>
                          <span className="text-neutral-400 text-xs block mt-0.5">{option.sub}</span>
                        </span>
                      </OptionBtn>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-center">
                    <p className="font-body text-neutral-500 text-sm">
                      {isLoadingPackages
                        ? "Loading packages…"
                        : "We couldn't find sets for that occasion right now."}
                    </p>
                    <button
                      onClick={() => setStep(1)}
                      className="mt-3 font-body text-xs font-bold text-gold hover:text-gold-dark transition-colors"
                    >
                      ← Choose another occasion
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step 3: Result ───────────────────────────────────────── */}
            {step === 3 && (
              <motion.div key="step-3" variants={stepIn} initial="hidden" animate="show" exit="exit">
                {result ? (
                  <>
                    <motion.div
                      className="text-center mb-5"
                      variants={scalePop}
                    >
                      <motion.div
                        className="w-14 h-14 rounded-2xl bg-gold/15 text-gold flex items-center justify-center mx-auto mb-2 shadow-gold"
                        animate={{ y: [0, -6, 0], scale: [1, 1.05, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Sparkles size={28} />
                      </motion.div>
                      <p className="font-body text-neutral-400 text-xs uppercase tracking-widest mt-3 mb-1">We Recommend</p>
                      <p className="font-heading text-primary text-2xl font-bold">{result.tier}</p>
                      <p className="font-heading text-gold text-xl font-semibold mt-0.5">{result.price}</p>
                      <p className="font-body text-neutral-400 text-xs mt-1.5">{result.packageName}</p>
                    </motion.div>

                    <motion.div
                      variants={staggerChild}
                      className="bg-gold/5 border border-gold/20 rounded-xl px-4 py-3 mb-5"
                    >
                      <p className="font-body text-neutral-700 text-sm leading-relaxed">{result.reason}</p>
                    </motion.div>

                    <motion.div
                      variants={staggerChild}
                      className="flex flex-col gap-2.5"
                    >
                      <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} className="flex-1">
                        <Link
                          to={`/dashboard/book?service=${result.slug}&tier=${encodeURIComponent(result.tier)}`}
                          className="block w-full text-center py-3 px-4 rounded-xl bg-gold text-primary font-body font-bold text-sm hover:bg-gold-dark transition-colors"
                          onClick={close}
                        >
                          Book {result.tier} Now
                        </Link>
                      </motion.div>
                      <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} className="flex-1">
                        <button
                          onClick={() => {
                            // Jump to the recommended package — the page owns
                            // navigation so it can scroll + flash the target.
                            if (onNavigate) onNavigate(result.slug);
                            else {
                              const el = document.getElementById(`service-block-${result.slug}`);
                              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                            close();
                          }}
                          className="w-full text-center py-3 px-4 rounded-xl border-2 border-primary text-primary font-body font-semibold text-sm hover:bg-primary hover:text-white transition-colors"
                        >
                          View Package Details ↓
                        </button>
                      </motion.div>
                    </motion.div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="font-body text-neutral-500 text-sm">
                      We couldn't build a recommendation for that pick.
                    </p>
                  </div>
                )}

                <motion.button
                  onClick={reset}
                  variants={staggerChild}
                  whileHover={{ rotate: -180 }}
                  transition={{ duration: 0.4, ease: ease.spring }}
                  className="mt-4 flex items-center gap-1.5 text-neutral-400 hover:text-primary text-xs font-body transition-colors mx-auto"
                >
                  <RotateCcw size={11} /> Start over
                </motion.button>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
