/**
 * SectionHeader.jsx
 * =================
 * REUSABLE SECTION HEADING COMPONENT
 *
 * Renders: eyebrow label + h2 + optional subtitle.
 * Eliminates duplicate heading markup across every section.
 *
 * Props:
 *  @param {string}  eyebrow    - Small uppercase label above heading
 *  @param {string}  title      - Main section heading (h2)
 *  @param {string}  subtitle   - Optional supporting text
 *  @param {string}  align      - "left" | "center" (default: "center")
 *  @param {boolean} light      - true = white text (for dark backgrounds)
 *  @param {string}  id         - Optional id for the h2 (aria-labelledby)
 */

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
    <div className={`${isCenter ? "text-center" : "text-left"} mb-12`}>
      {eyebrow && (
        <p className={`font-body text-gold font-medium text-xs uppercase tracking-[0.2em] mb-3`}>
          {eyebrow}
        </p>
      )}
      <h2
        id={id}
        className={`font-heading text-3xl sm:text-4xl lg:text-5xl leading-tight ${
          light ? "text-white" : "text-primary"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`font-body text-base sm:text-lg leading-relaxed mt-4 ${
            light ? "text-neutral-400" : "text-neutral-500"
          } ${isCenter ? "mx-auto max-w-2xl" : "max-w-xl"}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
