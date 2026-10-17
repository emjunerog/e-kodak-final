/**
 * GalleryLightbox.jsx
 * ====================
 * FULL-SCREEN IMAGE LIGHTBOX
 *
 * Opens when a gallery image is clicked.
 * Features:
 *  - Full-screen overlay
 *  - Prev / Next navigation
 *  - Keyboard: Escape (close), ArrowLeft/ArrowRight (navigate)
 *  - Caption with category + title
 *  - Click outside image to close
 *  - Touch swipe (via pointer events)
 *
 * Props:
 *  @param {array}    items     - Full filtered gallery array
 *  @param {number}   index     - Currently open item index
 *  @param {function} onClose   - Called when lightbox closes
 *  @param {function} onNavigate - Called with new index
 */

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Wand2, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { ease } from "../../lib/motion";

export default function GalleryLightbox({ items, index, onClose, onNavigate }) {
  const item = items[index];
  const touchStartX = useRef(null);
  const [sliderPos, setSliderPos] = useState(50);
  
  // Reset slider position when image changes
  useEffect(() => {
    setSliderPos(50);
  }, [index]);

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowLeft")   onNavigate(index > 0 ? index - 1 : items.length - 1);
      if (e.key === "ArrowRight")  onNavigate(index < items.length - 1 ? index + 1 : 0);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, items.length, onClose, onNavigate]);

  // ── Lock body scroll while open ──────────────────────────────────────────────
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  // ── Touch swipe handlers ─────────────────────────────────────────────────────
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd   = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      onNavigate(diff > 0
        ? (index < items.length - 1 ? index + 1 : 0)
        : (index > 0 ? index - 1 : items.length - 1)
      );
    }
    touchStartX.current = null;
  };

  if (!item) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: ease.smooth }}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo: ${item.title}`}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <motion.button
        onClick={onClose}
        initial={{ opacity: 0, rotate: -45 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 320, damping: 18 }}
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Close lightbox"
      >
        <X size={20} />
      </motion.button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 font-body text-white/50 text-xs overflow-hidden">
        <motion.span
          key={index}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: ease.spring }}
          className="inline-block"
        >
          {index + 1} / {items.length}
        </motion.span>
      </div>

      {/* Prev button */}
      <motion.button
        onClick={(e) => { e.stopPropagation(); onNavigate(index > 0 ? index - 1 : items.length - 1); }}
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease: ease.smooth }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        className="absolute left-3 sm:left-6 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-gold transition-colors duration-200"
        aria-label="Previous photo"
      >
        <ChevronLeft size={22} />
      </motion.button>

      {/* Image */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: ease.spring }}
        className="relative max-w-5xl w-full mx-16 sm:mx-24 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image Container */}
        <div className="relative max-h-[75vh] w-full flex justify-center overflow-hidden rounded-lg shadow-warm-xl group">
          {item.beforeImage ? (
            <div className="relative inline-block w-auto max-w-full" style={{ aspectRatio: item.aspectRatio === 'portrait' ? '3/4' : item.aspectRatio === 'square' ? '1/1' : '4/3' }}>
              {/* Before Image (Background) */}
              <img
                src={item.beforeImage}
                alt={`${item.title} - Before`}
                className="max-h-[75vh] w-auto max-w-full object-contain pointer-events-none"
                loading="eager"
              />
              {/* After Image (Clipped overlay) */}
              <img
                src={item.image}
                alt={`${item.title} - After`}
                className="absolute inset-0 max-h-[75vh] w-auto max-w-full object-contain pointer-events-none"
                style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
                loading="eager"
              />
              {/* Slider Input */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
              />
              {/* Slider Line Visual */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_5px_rgba(0,0,0,0.5)] pointer-events-none z-0 flex items-center justify-center"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="w-8 h-8 rounded-full bg-white text-primary shadow flex items-center justify-center translate-x-[-15px]">
                  <Wand2 size={16} className="opacity-80" />
                </div>
              </div>
              <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur font-body uppercase tracking-widest">Before</div>
              <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur font-body uppercase tracking-widest">After</div>
            </div>
          ) : (
            <motion.img
              key={item.id}
              src={item.image}
              alt={item.title}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: ease.smooth }}
              className="max-h-[75vh] w-auto max-w-full object-contain"
              loading="eager"
            />
          )}
        </div>

        {/* Caption */}
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: ease.smooth }}
          className="mt-4 text-center"
        >
          <span className="font-body text-gold text-[10px] uppercase tracking-[0.2em] font-medium">
            {item.category}
          </span>
          <p className="font-heading text-white text-base mt-0.5">
            {item.title}
          </p>
          {item.description && (
            <p className="font-body text-white/50 text-xs mt-1">
              {item.description}
            </p>
          )}
          {item.likes !== undefined && item.likes !== null && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-xs font-medium border border-white/10">
              <Heart size={12} className="fill-rose-500 text-rose-500" />
              <span>{Number(item.likes).toLocaleString()} Customer Appreciations</span>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Next button */}
      <motion.button
        onClick={(e) => { e.stopPropagation(); onNavigate(index < items.length - 1 ? index + 1 : 0); }}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease: ease.smooth }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        className="absolute right-3 sm:right-6 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-gold transition-colors duration-200"
        aria-label="Next photo"
      >
        <ChevronRight size={22} />
      </motion.button>
    </motion.div>
  );
}
