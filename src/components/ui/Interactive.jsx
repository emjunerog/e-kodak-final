/**
 * Interactive.jsx
 * ===============
 * Premium interaction primitives shared across pages:
 *  - SplitReveal  : word-by-word cinematic headline reveal (blur + rotate + rise)
 *  - Magnetic     : cursor-attracted wrapper (CTAs, avatars)
 *  - TiltCard     : 3D perspective tilt + cursor glare (cards, previews)
 *  - Spotlight    : cursor-following radial glow inside a container
 *  - Counter      : number that counts up when scrolled into view
 * All respect prefers-reduced-motion.
 */

import { useRef, useState, useEffect } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";
import { ease } from "../../lib/motion";

const SPRING = { stiffness: 260, damping: 24, mass: 0.5 };

const canHoverFine = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

/* ── SplitReveal ─────────────────────────────────────────────────────────── */
export function SplitReveal({
  text,
  className = "",
  delay = 0,
  stagger = 0.045,
  as: Tag = "span",
  once = true,
}) {
  const reduce = useReducedMotion();
  const words = String(text).split(" ");

  if (reduce) return <Tag className={className}>{text}</Tag>;

  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden="true"
          className="inline-block mr-[0.28em] last:mr-0 align-baseline"
        >
          <motion.span
            className="inline-block"
            initial={{ y: 16, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once, margin: "0px" }}
            transition={{
              duration: 0.45,
              ease: ease.expo,
              delay: delay + i * stagger,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/* ── Magnetic ────────────────────────────────────────────────────────────── */
export function Magnetic({
  children,
  strength = 0.35,
  pull = 1.04,
  className = "",
}) {
  const ref = useRef(null);
  const rectRef = useRef(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING);
  const sy = useSpring(y, SPRING);

  const handleEnter = () => {
    if (reduce || !canHoverFine() || !ref.current) return;
    rectRef.current = ref.current.getBoundingClientRect();
  };

  const handleMove = (e) => {
    if (reduce || !canHoverFine()) return;
    const r = rectRef.current || ref.current?.getBoundingClientRect();
    if (!r) return;
    rectRef.current = r;
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    rectRef.current = null;
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseEnter={handleEnter}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={`inline-block ${className}`}
    >
      <motion.div
        whileHover={reduce ? undefined : { scale: pull }}
        transition={{ type: "spring", stiffness: 320, damping: 20 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ── TiltCard ────────────────────────────────────────────────────────────── */
export function TiltCard({
  children,
  className = "",
  max = 7,
  pull = 1.015,
  glare = true,
  glareColor = "rgba(255,255,255,0.16)",
}) {
  const ref = useRef(null);
  const rectRef = useRef(null);
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const srx = useSpring(rx, SPRING);
  const sry = useSpring(ry, SPRING);
  const sheen = useMotionTemplate`radial-gradient(380px circle at ${gx}% ${gy}%, ${glareColor}, transparent 62%)`;

  const enter = () => {
    if (reduce || !canHoverFine() || !ref.current) return;
    rectRef.current = ref.current.getBoundingClientRect();
  };

  const move = (e) => {
    if (reduce || !canHoverFine()) return;
    const r = rectRef.current || ref.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return;
    rectRef.current = r;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * max * 2);
    rx.set((0.5 - py) * max * 2);
    gx.set(px * 100);
    gy.set(py * 100);
  };
  const leave = () => {
    rectRef.current = null;
    rx.set(0);
    ry.set(0);
    gx.set(50);
    gy.set(50);
  };

  return (
    <motion.div
      ref={ref}
      onMouseEnter={enter}
      onMouseMove={move}
      onMouseLeave={leave}
      whileHover={reduce ? undefined : { scale: pull }}
      style={{
        rotateX: srx,
        rotateY: sry,
        transformPerspective: 1000,
      }}
      className={`relative ${className}`}
    >
      {children}
      {glare && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: sheen }}
        />
      )}
    </motion.div>
  );
}

/* ── Spotlight ───────────────────────────────────────────────────────────── */
export function Spotlight({
  children,
  className = "",
  innerClassName = "h-full w-full flex-1 flex flex-col justify-between",
  color = "rgba(212,175,55,0.14)",
  size = 420,
  showOnHover = true,
}) {
  const ref = useRef(null);
  const rectRef = useRef(null);
  const [on, setOn] = useState(false);
  const reduce = useReducedMotion();
  const mx = useMotionValue(-600);
  const my = useMotionValue(-600);
  const glow = useMotionTemplate`radial-gradient(${size}px circle at ${mx}px ${my}px, ${color}, transparent 65%)`;

  const enter = () => {
    if (showOnHover && canHoverFine()) setOn(true);
    if (ref.current) rectRef.current = ref.current.getBoundingClientRect();
  };

  const move = (e) => {
    if (reduce || !canHoverFine()) return;
    const r = rectRef.current || ref.current?.getBoundingClientRect();
    if (!r) return;
    rectRef.current = r;
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={enter}
      onMouseMove={move}
      onMouseLeave={() => {
        rectRef.current = null;
        setOn(false);
      }}
      className={`relative overflow-hidden ${className}`}
    >
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-500"
        style={{ background: glow, opacity: on ? 1 : 0 }}
      />
      <div className={`relative z-[1] ${innerClassName}`}>{children}</div>
    </div>
  );
}

/* ── Counter (updates textContent directly to avoid 60fps React re-renders) ─ */
const formatCounterValue = (val, decimals) =>
  Number(val || 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export function Counter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.2,
  className = "",
}) {
  const ref = useRef(null);
  const numRef = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-24px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView || !numRef.current) return;
    if (reduce) {
      numRef.current.textContent = formatCounterValue(value, decimals);
      return;
    }
    let raf;
    const start = performance.now();
    const totalMs = Math.max(duration * 1000, 1);
    const tick = (now) => {
      const t = Math.min((now - start) / totalMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      if (numRef.current) {
        numRef.current.textContent = formatCounterValue(value * eased, decimals);
      }
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, decimals, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <span ref={numRef}>
        {reduce ? formatCounterValue(value, decimals) : formatCounterValue(0, decimals)}
      </span>
      {suffix}
    </span>
  );
}
