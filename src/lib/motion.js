/**
 * motion.js — Animation Presets (Notelyf-inspired)
 * =================================================
 * Notelyf philosophy: deliberate, warm, organic, tactile.
 * - Slow, confident timing (0.7–1.2s)
 * - Soft spring physics, not mechanical easing
 * - Text lines reveal independently
 * - SVG paths draw themselves
 * - Elements orbit/float into position
 * - Stagger creates rhythm, not speed
 */

// ── Viewport (trigger reliably across short & tall viewports) ────────────────
export const viewport = { once: true, margin: "0px 0px -32px 0px" };
export const viewportEager = { once: true, margin: "0px" };

// ── Core easing curves ────────────────────────────────────────────────────
export const ease = {
  smooth:   [0.25, 0.46, 0.45, 0.94],
  spring:   [0.34, 1.20, 0.64, 1],      // slight overshoot — organic
  expo:     [0.22, 1,    0.36, 1],       // responsive snappy expo-out
  gentle:   [0.43, 0.13, 0.23, 0.96],
};

// ── Fade Up — compositor-only scroll reveal (no filter: blur overhead) ────
export const fadeUp = {
  hidden: { opacity: 0, y: 24, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: ease.expo },
  },
};

// ── Focus-in (compositor opacity + scale + translate only) ────────────────
export const blurIn = {
  hidden: { opacity: 0, y: 28, scale: 0.975 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: ease.expo },
  },
};

// ── Kinetic rise: lifts and un-rotates on GPU transform only ──────────────
export const riseRotate = (rot = -3, distance = 44) => ({
  hidden: {
    opacity: 0,
    y: distance,
    rotate: rot,
    scale: 0.96,
  },
  show: {
    opacity: 1,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: { duration: 0.6, ease: ease.spring },
  },
});

// ── Side wipe — clip-path reveal (great for images/banners) ─────────────
export const wipe = {
  hidden: { opacity: 0, clipPath: "inset(0 100% 0 0)", scale: 1.04 },
  show:   {
    opacity: 1,
    clipPath: "inset(0 0% 0 0)",
    scale: 1,
    transition: { duration: 0.7, ease: ease.expo },
  },
};

// ── Pop — elastic overshoot (badges, prices, checks) ─────────────────────
export const pop = {
  hidden: { opacity: 0, scale: 0.75, rotate: -6 },
  show:   {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 320, damping: 18, mass: 0.65 },
  },
};

// ── One-word reveal (used by SplitReveal) ────────────────────────────────
export const wordIn = (index = 0, delayChildren = 0) => ({
  hidden:   { y: "100%", opacity: 0 },
  show: {
    y: "0%",
    opacity: 1,
    transition: {
      duration: 0.55,
      ease: ease.expo,
      delay: delayChildren + index * 0.045,
    },
  },
});

// ── Scale-draw rule (dividers, underlines) ───────────────────────────────
export const drawRule = (delay = 0.2, duration = 1) => ({
  hidden: { scaleX: 0, opacity: 0 },
  show: {
    scaleX: 1,
    opacity: 1,
    transition: { duration, delay, ease: ease.expo },
  },
});

// ── Check pop (price tables, inclusion lists) ────────────────────────────
export const checkPop = (index = 0) => ({
  hidden: { scale: 0, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 420,
      damping: 16,
      delay: index * 0.045,
    },
  },
});


// ── Fade In — pure opacity ────────────────────────────────────────────────
export const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

// ── Line reveal — Notelyf-style per-line text animation ──────────────────
export const lineReveal = {
  hidden: { opacity: 0, y: 28 },
  show:   {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: ease.expo },
  },
};

// ── Stagger container ─────────────────────────────────────────────────────
export const stagger = (delay = 0.08, children = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren: children } },
});

// ── Stagger child — compositor-only lift + opacity ─────────────────────────
export const staggerChild = {
  hidden: { opacity: 0, y: 20, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: ease.expo },
  },
};

// ── Orbit in — Notelyf widget-style float from angle ─────────────────────
export const orbitIn = (x = 0, y = 0, rotate = 0) => ({
  hidden: { opacity: 0, x, y, rotate, scale: 0.88 },
  show:   {
    opacity: 1, x: 0, y: 0, rotate: 0, scale: 1,
    transition: { duration: 0.9, ease: ease.spring },
  },
});

// ── Scale pop — spring entrance ───────────────────────────────────────────
export const scalePop = {
  hidden: { opacity: 0, scale: 0.80 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.6, ease: ease.spring } },
};

// ── Slide from left / right ───────────────────────────────────────────────
export const slideLeft = {
  hidden: { opacity: 0, x: -48 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.75, ease: ease.smooth } },
};

export const slideRight = {
  hidden: { opacity: 0, x: 48 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.75, ease: ease.smooth } },
};

// ── SVG path draw ─────────────────────────────────────────────────────────
export const drawPath = {
  hidden: { pathLength: 0, opacity: 0 },
  show:   { pathLength: 1, opacity: 1, transition: { duration: 1.2, ease: ease.expo, delay: 0.3 } },
};

// ── Continuous float (Notelyf widget ambient) ─────────────────────────────
export const float = (duration = 5, yAmount = 10) => ({
  animate: {
    y: [0, -yAmount, 0],
    transition: { duration, repeat: Infinity, ease: "easeInOut" },
  },
});

// ── Continuous slow spin ──────────────────────────────────────────────────
export const slowSpin = {
  animate: {
    rotate: 360,
    transition: { duration: 18, repeat: Infinity, ease: "linear" },
  },
};

// ── Pulse breathe ─────────────────────────────────────────────────────────
export const breathe = {
  animate: {
    scale: [1, 1.06, 1],
    opacity: [0.7, 1, 0.7],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
  },
};
