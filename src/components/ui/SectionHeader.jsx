/**
 * SectionHeader.jsx
 * =================
 * REUSABLE SECTION HEADING COMPONENT
 *
 * Renders: eyebrow label + h2 + optional subtitle.
 * Heading reveals word-by-word with a blur-rise (SplitReveal).
 *
 * Props:
 *  @param {string}  eyebrow    - Small uppercase label above heading
 *  @param {string}  title      - Main section heading (h2)
 *  @param {string}  subtitle   - Optional supporting text
 *  @param {string}  align      - "left" | "center" (default: "center")
 *  @param {boolean} light      - true = white text (for dark backgrounds)
 *  @param {string}  id         - Optional id for the h2 (aria-labelledby)
 */

import { motion } from "framer-motion";
import { stagger, blurIn } from "../../lib/motion";
import { SplitReveal } from "./Interactive";

export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
  light = false,
  id,
}) {
  const isCenter = align === "center";

  return (
    <motion.div
      className={`${isCenter ? "text-center" : "text-left"} mb-12`}
      variants={stagger(0.12)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      {eyebrow && (
        <motion.p
          variants={blurIn}
          className="font-body text-gold font-medium text-xs uppercase tracking-[0.2em] mb-3"
        >
          {eyebrow}
        </motion.p>
      )}

      <h2
        id={id}
        className={`font-heading text-3xl sm:text-4xl lg:text-display-lg leading-tight ${
          light ? "text-white" : "text-primary"
        }`}
      >
        <SplitReveal text={title} delay={0.08} stagger={0.06} />
      </h2>

      {subtitle && (
        <motion.p
          variants={blurIn}
          className={`font-body text-base sm:text-lg leading-relaxed mt-4 ${
            light ? "text-neutral-400" : "text-neutral-500"
          } ${isCenter ? "mx-auto max-w-2xl" : "max-w-xl"}`}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
