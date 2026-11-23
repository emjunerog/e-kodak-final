/**
 * PackageBrochureModal.jsx
 * ========================
 * True-size visual print brochure modal for a selected package set.
 * Renders every included print at its exact physical dimensions (1:1 by default,
 * with a 50% overview toggle) and exact quantity, using the framed sample for
 * framed items and varied unframed samples for unframed items.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X, ArrowRight, Download, Loader2 } from "lucide-react";
import { parseTierBrochure } from "../../lib/printBrochureParser";
import { exportBrochureToPdf } from "../../lib/brochurePdfExporter";

const SCALE_PRESETS = [
  { id: "actual", label: "1:1 Actual Size", factor: 1 },
  { id: "half", label: "50% Overview", factor: 0.5 },
];

export default function PackageBrochureModal({
  isOpen,
  service,
  selectedTierName,
  brochureSeed = 1,
  onClose,
}) {
  const dialogRef = useRef(null);

  const sortedTiers = useMemo(() => {
    const list = Array.isArray(service?.tiers) ? service.tiers : [];
    return [...list].sort((a, b) => a.name.trim().localeCompare(b.name.trim()));
  }, [service]);

  const [scaleFactor, setScaleFactor] = useState(1);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Sync React open state with native <dialog> top-layer modal API
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Fallback light-dismiss for browsers without <dialog closedby="any">
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return undefined;

    const isOutside = (event) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };

    let pressedOutside = false;
    const onPointerDown = (event) => {
      pressedOutside = isOutside(event);
    };
    const onPointerUp = (event) => {
      if (pressedOutside && isOutside(event)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const activeTierIndex = Math.max(
    0,
    sortedTiers.findIndex((t) => t.name === selectedTierName)
  );
  const activeTier = sortedTiers[activeTierIndex] || sortedTiers[0] || null;

  const brochure = useMemo(
    () => parseTierBrochure(activeTier, service?.slug, brochureSeed, activeTierIndex),
    [activeTier, service?.slug, brochureSeed, activeTierIndex]
  );

  const handleClose = () => {
    setScaleFactor(1);
    if (onClose) onClose();
  };

  const handleDownloadPdf = async () => {
    if (isExportingPdf || !service || !activeTier) return;
    setIsExportingPdf(true);
    try {
      await exportBrochureToPdf({
        service,
        tier: activeTier,
        brochure,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!service || !activeTier) return null;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="brochure-modal-title"
      onClose={handleClose}
      className="studio-dialog m-auto w-[98vw] max-w-[98vw] h-[96vh] max-h-[96vh] rounded-2xl sm:rounded-3xl bg-neutral-50 border border-neutral-200 p-0 text-primary shadow-warm-xl overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* ── Top Sticky Brochure Control Bar ─────────────────────────────── */}
        <header className="bg-neutral-950 text-white px-4 py-3.5 sm:px-6 border-b border-white/10 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                Here&apos;s what you can get in this package
              </p>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-0.5">
                <h2
                  id="brochure-modal-title"
                  className="font-heading text-xl sm:text-2xl font-semibold text-white tracking-tight"
                >
                  {service.name} — {activeTier.name}
                </h2>
                <span className="font-heading text-lg font-bold text-gold">
                  {activeTier.price}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Scale selector (1:1 default & 50% overview) */}
              <div
                className="inline-flex items-center rounded-xl bg-white/[0.06] border border-white/10 p-1"
                role="group"
                aria-label="Brochure print scale"
              >
                {SCALE_PRESETS.map((preset) => {
                  const active = scaleFactor === preset.factor;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setScaleFactor(preset.factor)}
                      className={`px-3 py-1.5 rounded-lg font-body text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? "bg-gold text-primary shadow-sm"
                          : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Download PDF button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-gold hover:text-primary border border-gold/40 text-gold font-body text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                {isExportingPdf ? (
                  <Loader2 size={14} className="animate-spin shrink-0" />
                ) : (
                  <Download size={14} className="shrink-0" />
                )}
                <span>{isExportingPdf ? "Generating PDF..." : "Download PDF"}</span>
              </button>

              {/* Close button */}
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold cursor-pointer"
                aria-label="Close brochure view"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* ── Scrollable Brochure Body ────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-neutral-100 p-3 sm:p-5 space-y-5 custom-scrollbar">
          {brochure.prints.map((item, idx) => {
            const widthCss = `${(item.widthIn * scaleFactor).toFixed(4)}in`;
            const heightCss = `${(item.heightIn * scaleFactor).toFixed(4)}in`;

            return (
              <section
                key={`${item.raw}-${idx}`}
                className="rounded-2xl sm:rounded-3xl bg-white border border-neutral-200 p-4 sm:p-5 shadow-warm-sm space-y-4"
              >
                {/* Item Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 px-4 py-3.5 sm:px-5 border border-gold/25 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      aria-hidden="true"
                      className="w-1 h-7 rounded-full bg-gradient-to-b from-gold-light via-gold to-gold-dark shrink-0"
                    />
                    <h3 className="font-heading text-base sm:text-xl font-bold text-white tracking-tight leading-snug">
                      {item.displayTitle}
                    </h3>
                  </div>
                  <span className="shrink-0 px-3.5 py-1 rounded-full bg-gold text-primary font-body text-xs font-bold tracking-wide shadow-sm tabular-nums">
                    {item.quantity} {item.quantity === 1 ? "Piece" : "Pieces"}
                  </span>
                </div>

                {/* Actual-Size Prints Canvas (never shrinks prints below physical size) */}
                <div className="overflow-x-auto pb-2 custom-scrollbar">
                  <div
                    className={
                      item.quantity === 1
                        ? "flex items-start"
                        : "flex flex-wrap items-start justify-center gap-4 sm:gap-5"
                    }
                  >
                    {Array.from({ length: item.quantity }).map((_, copyIdx) => {
                      const copySrc = item.imageSources?.[copyIdx] || item.imageSrc;
                      return (
                      <figure
                        key={copyIdx}
                        className={`shrink-0 flex flex-col items-center gap-1.5 ${
                          item.quantity === 1 ? "mx-auto" : ""
                        }`}
                      >
                        <div
                          className={`relative overflow-hidden select-none ${
                            item.hasFrame
                              ? "wood-crystal-frame"
                              : "border border-neutral-300 bg-white shadow-sm"
                          }`}
                          style={{
                            width: widthCss,
                            height: heightCss,
                          }}
                        >
                          {item.hasFrame ? (
                            <div className="relative wood-crystal-mat">
                              <div className="relative w-full h-full overflow-hidden border border-neutral-900/20 shadow-inner">
                                <img
                                  src={copySrc}
                                  alt={`${item.displayTitle} — copy ${copyIdx + 1} of ${item.quantity}`}
                                  className={`w-full h-full block ${
                                    item.subject === "family"
                                      ? "object-cover object-center"
                                      : "object-cover object-top"
                                  }`}
                                  loading="lazy"
                                  draggable={false}
                                />
                              </div>
                              <span
                                aria-hidden="true"
                                className="wood-crystal-glass"
                              />
                            </div>
                          ) : (
                            <img
                              src={copySrc}
                              alt={`${item.displayTitle} — copy ${copyIdx + 1} of ${item.quantity}`}
                              className={`w-full h-full block ${
                                item.subject === "family"
                                  ? "object-cover object-center"
                                  : "object-cover object-top"
                              }`}
                              loading="lazy"
                              draggable={false}
                            />
                          )}
                        </div>
                        <figcaption className="font-body text-xs text-neutral-500 tabular-nums">
                          {item.sizeLabel.split(" ")[0]} · #{copyIdx + 1}
                        </figcaption>
                      </figure>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* ── Bottom Action Footer ────────────────────────────────────────── */}
        <footer className="bg-white border-t border-neutral-200 px-5 py-4 sm:px-7 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <p className="font-body text-xs sm:text-sm text-neutral-600">
            Showing{" "}
            <strong className="text-primary">{brochure.totalPrints} physical prints</strong>{" "}
            in <strong className="text-primary">{activeTier.name}</strong> ({activeTier.price})
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 font-body text-xs sm:text-sm font-semibold text-neutral-700 transition-colors cursor-pointer"
            >
              Close
            </button>
            <Link
              to={`/dashboard/book?service=${service.slug}&tier=${encodeURIComponent(activeTier.name)}`}
              onClick={handleClose}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-light text-primary font-body text-xs sm:text-sm font-bold shadow-gold hover:brightness-105 transition-all"
            >
              <span>Book {activeTier.name}</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
