import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShoppingBag,
  Package,
  PlusCircle,
  X,
  Calendar,
  Clock,
  MapPin,
  GraduationCap,
  Heart,
  Briefcase,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Check
} from "lucide-react";

/**
 * OrderSummarySidebar
 * ===================
 * Sticky right-hand order summary providing transparent, real-time pricing guidance
 * with organized smart-collapsing accordions so the UI stays clean and never crowded.
 */
export default function OrderSummarySidebar({
  selectedService,
  selectedTier,
  selectedAddOns = [],
  onRemoveAddOn,
  studentDetails,
  weddingDetails,
  corporateDetails,
  eventDate,
  preferredTime,
  locationType,
  customVenue,
  customAddress,
  referenceFilesCount = 0,
  selectedPresetPegs = [],
  totalAmount = 0,
  downPaymentAmount = 0,
  remainingBalance = 0,
  formattedTotal = "₱0",
  formattedDownPayment = "₱0",
  formattedRemaining = "₱0",
  activeStep = 1,
  onJumpToStep
}) {
  // Accordion open/close state
  const [inclusionsOpen, setInclusionsOpen] = useState(true);
  const [addOnsOpen, setAddOnsOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(true);

  // Trigger studio concierge assistance
  const handleAskAI = (topic = "") => {
    let prompt = `I am currently in the booking process for ${selectedService?.name || 'a photoshoot'}.`;
    if (selectedTier) prompt += ` Selected package: ${selectedTier.name}.`;
    if (selectedAddOns.length > 0) prompt += ` Selected add-ons: ${selectedAddOns.map(a => a.name).join(', ')}.`;
    if (topic) prompt += ` Question: ${topic}`;
    else prompt += ` Can you give me recommendations on styling, prep tips, and whether this package matches my shoot needs?`;

    window.dispatchEvent(
      new CustomEvent("open-ai-assistant", {
        detail: { screen: "chat", prompt }
      })
    );
  };

  const isStudent = selectedService?.category?.toUpperCase().includes("GRAD") || !!studentDetails?.school;
  const isWedding = selectedService?.category?.toUpperCase().includes("WEDDING") || !!weddingDetails?.brideName;
  const isCorporate = selectedService?.category?.toUpperCase().includes("CORP") || !!corporateDetails?.company;

  return (
    <aside className="w-full lg:w-[360px] xl:w-[390px] shrink-0 font-body">
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-warm-md overflow-hidden sticky top-24">
        
        {/* Top Header & Sticky Price Spotlight */}
        <div className="bg-gradient-to-br from-primary via-primary to-primary-light text-white p-6 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-gold/15 rounded-full blur-2xl" />
          
          <div className="flex items-center justify-between gap-2 relative z-10 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gold/20 flex items-center justify-center border border-gold/30">
                <ShoppingBag size={14} className="text-gold" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-gold">Order Summary</span>
            </div>

            {/* Studio Concierge Quick Trigger (icon-only for clean sidebar header) */}
            <button
              type="button"
              onClick={() => handleAskAI()}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all shadow-sm"
              title="Studio Concierge Assistance"
              aria-label="Studio Concierge Assistance"
            >
              <Sparkles size={14} className="text-gold" />
            </button>
          </div>

          {/* Real-time Persistent Total */}
          <div className="relative z-10 pt-1">
            <p className="text-[11px] font-medium text-neutral-300 uppercase tracking-wider">Total Package Balance</p>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <h2 className="font-heading text-3xl sm:text-4xl text-white font-bold tracking-tight">
                {formattedTotal}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/40 font-semibold">
                Guaranteed Rate
              </span>
            </div>

            {/* Down Payment & Remaining split */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="text-neutral-400 block text-[10px] uppercase font-medium">50% Down Payment</span>
                <span className="text-gold font-bold text-sm block mt-0.5">{formattedDownPayment}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="text-neutral-400 block text-[10px] uppercase font-medium">Remaining at Studio</span>
                <span className="text-white font-bold text-sm block mt-0.5">{formattedRemaining}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable / Accordion Sections */}
        <div className="p-5 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto hide-scrollbar">

          {/* ── ACCORDION 1: Package & Inclusions ──────────────────────────────── */}
          <div className="border border-neutral-200/80 rounded-2xl overflow-hidden bg-neutral-50/50">
            <button
              type="button"
              onClick={() => setInclusionsOpen(!inclusionsOpen)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-neutral-100/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Package size={16} className="text-gold shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-primary truncate">
                    {selectedService ? selectedService.name : "Service Not Selected"}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {selectedTier
                      ? `${selectedTier.name} • ${String(selectedTier.price).includes('₱') ? selectedTier.price : `₱${Number(selectedTier.price || 0).toLocaleString()}`}`
                      : "Select a tier in Step 2"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {onJumpToStep && (
                  <span
                    onClick={(e) => { e.stopPropagation(); onJumpToStep(2); }}
                    className="text-[10px] text-gold hover:underline font-semibold"
                  >
                    Edit
                  </span>
                )}
                {inclusionsOpen ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
              </div>
            </button>

            {inclusionsOpen && selectedTier && (
              <div className="p-3.5 pt-0 border-t border-neutral-200/50 text-xs space-y-2 mt-2">
                {selectedTier.duration && (
                  <div className="flex items-center justify-between text-neutral-600 pb-1.5 border-b border-neutral-200/40 text-[11px]">
                    <span className="text-neutral-400">Duration:</span>
                    <span className="font-semibold text-primary">{selectedTier.duration}</span>
                  </div>
                )}
                {(selectedTier.highlights || selectedTier.inclusions)?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Package Inclusions:</p>
                    {(selectedTier.highlights || selectedTier.inclusions).map((inc, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-neutral-700">
                        <Check size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── ACCORDION 2: Selected Add-Ons ──────────────────────────────────── */}
          <div className="border border-neutral-200/80 rounded-2xl overflow-hidden bg-neutral-50/50">
            <button
              type="button"
              onClick={() => setAddOnsOpen(!addOnsOpen)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-neutral-100/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <PlusCircle size={16} className="text-gold shrink-0" />
                <div>
                  <p className="text-xs font-bold text-primary">
                    Selected Add-ons ({selectedAddOns.length})
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {selectedAddOns.length > 0
                      ? `+₱${selectedAddOns.reduce((sum, a) => sum + (Number(a.price) || 0), 0).toLocaleString()} additional`
                      : "Optional extra prints, frames, makeup"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {onJumpToStep && (
                  <span
                    onClick={(e) => { e.stopPropagation(); onJumpToStep(3); }}
                    className="text-[10px] text-gold hover:underline font-semibold"
                  >
                    Edit
                  </span>
                )}
                {addOnsOpen ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
              </div>
            </button>

            {addOnsOpen && (
              <div className="p-3.5 pt-0 border-t border-neutral-200/50 text-xs space-y-2 mt-2">
                {selectedAddOns.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 italic">No add-ons selected. Add-ons are completely optional.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedAddOns.map((addon, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-neutral-200/60 text-[11px]">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-neutral-800 truncate">{addon.name}</p>
                          <p className="text-[10px] text-gold font-bold">+₱{Number(addon.price).toLocaleString()}</p>
                        </div>
                        {onRemoveAddOn && (
                          <button
                            type="button"
                            onClick={() => onRemoveAddOn(addon.name)}
                            className="p-1 text-neutral-400 hover:text-red-500 rounded transition-colors"
                            title="Remove add-on"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── ACCORDION 3: Client & Verification Details ───────────────────────── */}
          {(studentDetails?.school || weddingDetails?.brideName || corporateDetails?.company) && (
            <div className="border border-neutral-200/80 rounded-2xl overflow-hidden bg-neutral-50/50">
              <button
                type="button"
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="w-full flex items-center justify-between p-3.5 text-left hover:bg-neutral-100/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isStudent ? (
                    <GraduationCap size={16} className="text-gold shrink-0" />
                  ) : isWedding ? (
                    <Heart size={16} className="text-rose-500 shrink-0" />
                  ) : (
                    <Briefcase size={16} className="text-blue-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-primary">
                      {isStudent ? "Academic Batching Details" : isWedding ? "Wedding Information" : "Corporate Details"}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {isStudent
                        ? `${studentDetails.section || 'Class/Section'} • ${studentDetails.school || 'School'}`
                        : isWedding
                        ? `${weddingDetails.brideName || 'Bride'} & ${weddingDetails.groomName || 'Groom'}`
                        : corporateDetails.company || "Company info"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {onJumpToStep && (
                    <span
                      onClick={(e) => { e.stopPropagation(); onJumpToStep(4); }}
                      className="text-[10px] text-gold hover:underline font-semibold"
                    >
                      Edit
                    </span>
                  )}
                  {detailsOpen ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
                </div>
              </button>

              {detailsOpen && (
                <div className="p-3.5 pt-0 border-t border-neutral-200/50 text-xs space-y-1.5 mt-2">
                  {isStudent && (
                    <>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-neutral-400">School / Campus:</span>
                        <span className="font-semibold text-primary text-right max-w-[170px] truncate">{studentDetails.school}</span>
                      </div>
                      {studentDetails.course && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-400">Program / Strand:</span>
                          <span className="font-medium text-primary text-right max-w-[170px] truncate">{studentDetails.course}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[11px]">
                        <span className="text-neutral-400">Section / Batch:</span>
                        <span className="font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded">{studentDetails.section || 'Unassigned'}</span>
                      </div>
                      {studentDetails.student_id && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-400">Student ID:</span>
                          <span className="font-body text-primary">{studentDetails.student_id}</span>
                        </div>
                      )}
                    </>
                  )}

                  {isWedding && (
                    <>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-neutral-400">Couple:</span>
                        <span className="font-semibold text-primary">{weddingDetails.brideName} & {weddingDetails.groomName}</span>
                      </div>
                      {weddingDetails.theme && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-400">Theme / Palette:</span>
                          <span className="font-medium text-neutral-700">{weddingDetails.theme}</span>
                        </div>
                      )}
                      {weddingDetails.coordinatorName && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-400">Coordinator:</span>
                          <span className="text-neutral-700">{weddingDetails.coordinatorName}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ACCORDION 4: Schedule & Studio Location ─────────────────────────── */}
          {(eventDate || locationType) && (
            <div className="border border-neutral-200/80 rounded-2xl overflow-hidden bg-neutral-50/50">
              <button
                type="button"
                onClick={() => setScheduleOpen(!scheduleOpen)}
                className="w-full flex items-center justify-between p-3.5 text-left hover:bg-neutral-100/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gold shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-primary">Schedule & Studio</p>
                    <p className="text-[11px] text-neutral-500">
                      {eventDate ? `${eventDate} ${preferredTime ? `at ${preferredTime}` : ''}` : "Date to be scheduled"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {onJumpToStep && (
                    <span
                      onClick={(e) => { e.stopPropagation(); onJumpToStep(5); }}
                      className="text-[10px] text-gold hover:underline font-semibold"
                    >
                      Edit
                    </span>
                  )}
                  {scheduleOpen ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
                </div>
              </button>

              {scheduleOpen && (
                <div className="p-3.5 pt-0 border-t border-neutral-200/50 text-xs space-y-2 mt-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Target Date:</span>
                    <span className="font-semibold text-primary">{eventDate || "TBD"}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Time Window:</span>
                    <span className="font-semibold text-primary">{preferredTime || "8:00 AM - 5:00 PM"}</span>
                  </div>
                  <div className="pt-2 border-t border-neutral-200/40">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Studio Location:</p>
                    <p className="text-[11px] font-medium text-primary">
                      {locationType === "STUDIO" ? "E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu" : customVenue || customAddress || "Custom Venue"}
                    </p>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=311+Rizal+Street,+City+of+Naga,+Cebu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-gold hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      <MapPin size={11} /> Open Studio on Google Maps <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reference Pegs / Upload count badge */}
          {(referenceFilesCount > 0 || selectedPresetPegs.length > 0) && (
            <div className="p-3 rounded-2xl bg-gold/5 border border-gold/20 flex items-center justify-between text-xs">
              <span className="text-neutral-600 font-medium">Style Pegs & References:</span>
              <span className="font-bold text-primary bg-white px-2 py-0.5 rounded-lg border border-gold/30">
                {referenceFilesCount + selectedPresetPegs.length} Selected
              </span>
            </div>
          )}

        </div>

        {/* Bottom Trust & Security Banner */}
        <div className="p-4 bg-neutral-100/60 border-t border-neutral-200/70 flex items-center gap-2.5 text-neutral-500 text-[11px]">
          <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
          <span>Rates are fixed and protected. Digital QR Pass generated immediately upon booking submission.</span>
        </div>

      </div>
    </aside>
  );
}
