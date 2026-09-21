/**
 * PackageFinder.jsx
 * =================
 * INTERACTIVE 3-STEP PLAN MATCHER
 *
 * Guides the user through 3 quick questions:
 *  Step 1: What type of occasion? (event type)
 *  Step 2: How many people? (group size)
 *  Step 3: What's your budget? (price range)
 *
 * On completion → shows a tailored service recommendation card with:
 *  - Matching service name and description
 *  - Estimated price range
 *  - Suggested tier (Basic / Standard / Premium)
 *  - "Book This Package" CTA → /register
 *  - "View All Packages" secondary link → /services
 *
 * ADMIN NOTE:
 *  Recommendation logic is powered by the local SERVICES data or
 *  Supabase — update category slugs there to keep this component
 *  working without code changes.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, CheckCircle, Camera, Sparkles, RotateCcw } from "lucide-react";
import { siteConfig } from "../../config/siteConfig";

// ── Step Definitions ──────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "occasion",
    question: "What's the occasion?",
    subtitle: "We'll match you with the right photography or videography package.",
    options: [
      { value: "college-packages",     label: "College Graduation",         icon: "🎓", category: "college"       },
      { value: "senior-high-packages", label: "Senior High School (SHS)",   icon: "📜", category: "senior-high"   },
      { value: "wedding-video",        label: "Wedding HD Videography",     icon: "🎥", category: "wedding-video" },
      { value: "wedding-photo",        label: "Wedding Photography",        icon: "📸", category: "wedding-photo" },
    ],
  },
  {
    id: "size",
    question: "Who is this session for?",
    subtitle: "This helps us tailor your camera setups and team crew.",
    options: [
      { value: "solo",        label: "Solo Graduate / Individual",     icon: "🧍" },
      { value: "couple",      label: "Bride & Groom / Wedding Couple", icon: "💍" },
      { value: "family",      label: "Graduate with Family",          icon: "👨‍👩‍👧" },
      { value: "grand",       label: "Full Wedding & Entourage",       icon: "💒" },
    ],
  },
  {
    id: "budget",
    question: "What's your preferred investment tier?",
    subtitle: "Select the set that best fits your celebration.",
    options: [
      { value: "budget",   label: "Essential / Value Sets (Under ₱2,000)", icon: "💚", tier: "Essential" },
      { value: "standard", label: "Academic Milestone (₱3,500 – ₱5,000)",   icon: "💛", tier: "Milestone" },
      { value: "premium",  label: "Wedding Signature (₱18,500 – ₱31,000)", icon: "🧡", tier: "Signature" },
      { value: "luxury",   label: "Full Production Master Suite (₱39,000+)",icon: "❤️", tier: "Master" },
    ],
  },
];

// ── Recommendation Engine ─────────────────────────────────────────────────────

function getRecommendation(answers) {
  const { occasion, size, budget } = answers;

  const occasionMap = {
    "college-packages":     { category: "college",       name: "College Packages and sets",   slug: "college-packages"     },
    "senior-high-packages": { category: "senior-high",   name: "Senior High Packages and sets", slug: "senior-high-packages" },
    "wedding-video":        { category: "wedding-video", name: "Video / Wedding Packages",    slug: "wedding-video"        },
    "wedding-photo":        { category: "wedding-photo", name: "Photo / Wedding Services",    slug: "wedding-photo"        },
  };

  const info = occasionMap[occasion] ?? occasionMap["college-packages"];

  const descriptions = {
    "college-packages":     "Complete college graduation package with crystal wood frame, formal Filipiniana / Barong, and free makeup.",
    "senior-high-packages": "Accessible graduation & toga portraits with crystal frame, wallet sizes, and TESDA/passport prints.",
    "wedding-video":        "HD Video coverage with 2–3 mirrorless cameras, drone aerials, Same Day Edit (SDE), and MTV movie.",
    "wedding-photo":        "Complete wedding photography with unlimited shots, framed portraits, hardbound albums, and prenup shoot.",
  };

  let tier = "Set A";
  let price = "₱4,875.00";

  if (occasion === "college-packages") {
    if (budget === "budget" || budget === "standard") {
      tier = "Set B";
      price = "₱3,575.00";
    } else {
      tier = "Set A";
      price = "₱4,875.00";
    }
  } else if (occasion === "senior-high-packages") {
    if (budget === "budget") {
      tier = "Set D";
      price = "₱795.00";
    } else {
      tier = "Set A";
      price = "₱1,750.00";
    }
  } else if (occasion === "wedding-video") {
    if (budget === "luxury") {
      tier = "Set D";
      price = "₱39,000.00";
    } else if (budget === "standard") {
      tier = "Set B";
      price = "₱18,500.00";
    } else {
      tier = "Set C";
      price = "₱28,000.00";
    }
  } else if (occasion === "wedding-photo") {
    if (budget === "luxury") {
      tier = "Set D";
      price = "₱53,500.00";
    } else if (budget === "standard") {
      tier = "Set A";
      price = "₱18,500.00";
    } else {
      tier = "Set C";
      price = "₱31,000.00";
    }
  }

  const sizeTip = {
    solo:   "Tailored for solo academic milestone portraits.",
    couple: "Specially planned for intimate wedding couple shoots.",
    family: "Includes commemorative family group portraits.",
    grand:  "Full team of photographers and videographers deployed.",
  };

  return {
    category: info.category,
    name: info.name,
    description: descriptions[info.slug] || descriptions["college-packages"],
    tier,
    price,
    tip: sizeTip[size] ?? "Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PackageFinder() {
  const [step, setStep]           = useState(0); // 0 = intro, 1-3 = questions, 4 = result
  const [answers, setAnswers]     = useState({});
  const [selected, setSelected]   = useState(null); // currently highlighted option

  const totalSteps = STEPS.length;
  const isIntro    = step === 0;
  const isResult   = step === totalSteps + 1;
  const currentQ   = step >= 1 && step <= totalSteps ? STEPS[step - 1] : null;

  function handleOptionSelect(value) {
    setSelected(value);
  }

  function handleNext() {
    if (selected === null) return;
    const key = STEPS[step - 1].id;
    const newAnswers = { ...answers, [key]: selected };
    setAnswers(newAnswers);
    setSelected(null);

    if (step === totalSteps) {
      setStep(totalSteps + 1); // go to result
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((s) => s - 1);
      setSelected(null);
    } else {
      setStep(0); // back to intro
    }
  }

  function handleReset() {
    setStep(0);
    setAnswers({});
    setSelected(null);
  }

  const recommendation = isResult ? getRecommendation(answers) : null;

  return (
    <section
      className="section-padding bg-neutral-50 border-t border-neutral-100"
      aria-labelledby="package-finder-heading"
    >
      <div className="container-custom">

        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="section-eyebrow">Not sure which package?</p>
          <h2 className="section-title" id="package-finder-heading">
            Find Your Perfect Plan
          </h2>
          <p className="section-subtitle mx-auto text-center">
            Answer 3 quick questions and we'll recommend the right package for your occasion.
          </p>
        </div>

        {/* Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-warm-md overflow-hidden">

            {/* ── INTRO SCREEN ────────────────────────────────────────────── */}
            {isIntro && (
              <div className="p-8 sm:p-12 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-6">
                  <Camera size={28} className="text-gold" aria-hidden="true" />
                </div>
                <h3 className="font-heading text-primary text-2xl mb-3">
                  Let's find your perfect package
                </h3>
                <p className="font-body text-neutral-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
                  Tell us a bit about your event and we'll recommend the best service tier in seconds.
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="btn-gold inline-flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  Start Package Finder
                </button>
              </div>
            )}

            {/* ── QUESTION SCREEN ─────────────────────────────────────────── */}
            {currentQ && (
              <div className="animate-fade-in">
                {/* Progress bar */}
                <div className="h-1 bg-neutral-100">
                  <div
                    className="h-full bg-gradient-to-r from-gold-dark to-gold transition-all duration-500 ease-smooth"
                    style={{ width: `${((step) / totalSteps) * 100}%` }}
                    role="progressbar"
                    aria-valuenow={step}
                    aria-valuemin={1}
                    aria-valuemax={totalSteps}
                    aria-label={`Step ${step} of ${totalSteps}`}
                  />
                </div>

                <div className="p-8 sm:p-10">
                  {/* Back + step counter */}
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-1 text-neutral-400 hover:text-primary transition-colors text-sm font-body"
                    >
                      <ChevronLeft size={16} />
                      {step === 1 ? "Back" : "Previous"}
                    </button>
                    <span className="font-body text-neutral-400 text-xs uppercase tracking-widest">
                      Step {step} of {totalSteps}
                    </span>
                  </div>

                  <h3 className="font-heading text-primary text-xl sm:text-2xl mb-1">
                    {currentQ.question}
                  </h3>
                  <p className="font-body text-neutral-400 text-sm mb-6">{currentQ.subtitle}</p>

                  {/* Options grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                    {currentQ.options.map((opt) => {
                      const isSelected = selected === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleOptionSelect(opt.value)}
                          className={`
                            p-4 rounded-xl border text-left transition-all duration-200
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
                            ${isSelected
                              ? "border-gold bg-gold/10 shadow-gold/30 shadow-sm"
                              : "border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50"
                            }
                          `}
                        >
                          <span className="text-2xl block mb-2" aria-hidden="true">{opt.icon}</span>
                          <span className={`font-body text-xs font-medium leading-snug ${
                            isSelected ? "text-primary" : "text-neutral-600"
                          }`}>
                            {opt.label}
                          </span>
                          {isSelected && (
                            <CheckCircle size={12} className="text-gold mt-1.5" aria-label="Selected" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next button */}
                  <button
                    onClick={handleNext}
                    disabled={!selected}
                    className={`
                      w-full py-3 rounded-xl font-body font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2
                      ${selected
                        ? "bg-primary text-white hover:bg-primary-light active:scale-[0.99]"
                        : "bg-neutral-100 text-neutral-300 cursor-not-allowed"
                      }
                    `}
                  >
                    {step === totalSteps ? "See My Recommendation" : "Next"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ── RESULT SCREEN ───────────────────────────────────────────── */}
            {isResult && recommendation && (
              <div className="animate-fade-in">
                {/* Gold header bar */}
                <div className="bg-gradient-to-r from-gold-dark via-gold to-gold-dark p-6 sm:p-8 text-center">
                  <CheckCircle size={32} className="text-primary/80 mx-auto mb-3" aria-hidden="true" />
                  <p className="font-body text-primary/70 text-xs uppercase tracking-widest font-semibold mb-1">
                    We recommend
                  </p>
                  <h3 className="font-heading text-primary text-2xl sm:text-3xl">
                    {recommendation.name}
                  </h3>
                  <span className="inline-block mt-2 px-3 py-1 rounded-full bg-primary/10 font-body text-primary text-xs font-semibold">
                    {recommendation.tier} Tier
                  </span>
                </div>

                {/* Details */}
                <div className="p-8 sm:p-10">
                  <p className="font-body text-neutral-600 text-sm leading-relaxed mb-4">
                    {recommendation.description}
                  </p>
                  {recommendation.tip && (
                    <p className="font-body text-gold text-xs italic mb-6">
                      💡 {recommendation.tip}
                    </p>
                  )}

                  <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-100 mb-6">
                    <div>
                      <p className="font-body text-neutral-400 text-xs uppercase tracking-wider mb-0.5">
                        Estimated Starting Price
                      </p>
                      <p className="font-heading text-primary text-2xl">
                        {recommendation.price}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-body text-neutral-400 text-xs uppercase tracking-wider mb-0.5">
                        Package Tier
                      </p>
                      <p className="font-body text-primary font-semibold text-sm">
                        {recommendation.tier}
                      </p>
                    </div>
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      to={siteConfig.routes.register}
                      className="flex-1 btn-gold inline-flex items-center justify-center gap-2"
                    >
                      Book This Package
                      <ArrowRight size={15} />
                    </Link>
                    <Link
                      to={siteConfig.routes.services}
                      className="flex-1 btn-outline inline-flex items-center justify-center gap-2"
                    >
                      View All Packages
                    </Link>
                  </div>

                  {/* Restart */}
                  <button
                    onClick={handleReset}
                    className="mt-4 w-full flex items-center justify-center gap-2 text-neutral-400 hover:text-primary transition-colors text-xs font-body"
                  >
                    <RotateCcw size={12} />
                    Start over
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </section>
  );
}
