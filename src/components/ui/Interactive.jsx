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
import { ease, viewport } from "../../lib/motion";

const SPRING = { stiffness: 220, damping: 20, mass: 0.5 };

/* ── SplitReveal ─────────────────────────────────────────────────────────── */
export function SplitReveal({
  text,
  className = "",
  delay = 0,
  stagger = 0.06,
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
            className="inline-block will-change-transform"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{
              duration: 0.7,
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
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING);
  const sy = useSpring(y, SPRING);

  const handleMove = (e) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={`inline-block will-change-transform ${className}`}
    >
      <motion.div
        whileHover={reduce ? undefined : { scale: pull }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
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
  max = 9,
  pull = 1.015,
  glare = true,
  glareColor = "rgba(255,255,255,0.18)",
}) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const srx = useSpring(rx, SPRING);
  const sry = useSpring(ry, SPRING);
  const sgx = useSpring(gx, { stiffness: 160, damping: 22 });
  const sgy = useSpring(gy, { stiffness: 160, damping: 22 });
  const sheen = useMotionTemplate`radial-gradient(420px circle at ${sgx}% ${sgy}%, ${glareColor}, transparent 62%)`;

  const move = (e) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * max * 2);
    rx.set((0.5 - py) * max * 2);
    gx.set(px * 100);
    gy.set(py * 100);
  };
  const leave = () => { rx.set(0); ry.set(0); gx.set(50); gy.set(50); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={move}
      onMouseLeave={leave}
      whileHover={reduce ? undefined : { scale: pull }}
      style={{
        rotateX: srx,
        rotateY: sry,
        transformPerspective: 1000,
        transformStyle: "preserve-3d",
      }}
      className={`relative will-change-transform ${className}`}
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
  const [on, setOn] = useState(false);
  const reduce = useReducedMotion();
  const mx = useMotionValue(-600);
  const my = useMotionValue(-600);
  const glow = useMotionTemplate`radial-gradient(${size}px circle at ${mx}px ${my}px, ${color}, transparent 65%)`;

  const move = (e) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  return (
    <div
      ref={ref}
      onMouseMove={move}
      onMouseEnter={() => showOnHover && setOn(true)}
      onMouseLeave={() => setOn(false)}
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

/* ── Counter ─────────────────────────────────────────────────────────────── */
export function Counter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.7,
  className = "",
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  const display = reduce ? value : n;

  useEffect(() => {
    if (!inView || reduce) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
