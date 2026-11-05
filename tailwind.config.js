/**
 * tailwind.config.js
 * ==================
 * DESIGN SYSTEM CONFIGURATION
 *
 * This file defines the entire visual language of the application:
 * colors, typography, spacing, shadows, border-radius, and animations.
 *
 * Every design decision is intentional and consistent.
 * Do NOT use arbitrary color values in components — use these tokens.
 *
 * Design Philosophy:
 *  - Premium editorial photography aesthetic
 *  - Warm gold + near-black palette
 *  - Playfair Display (serif) for headings → elegance, editorial feel
 *  - Inter (sans-serif) for body text → clean, modern, readable
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  // Tell Tailwind where to look for class names so it can purge unused styles
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      // ─── Color Palette ─────────────────────────────────────────────────────
      colors: {
        // Primary — near-black, photography sophistication
        primary: {
          DEFAULT: "#1a1a1a",
          light: "#2d2d2d",
          dark: "#0f0f0f",
        },
        // Gold — premium accent, warmth, artistry
        gold: {
          DEFAULT: "#c9a96e",
          light: "#e8d5b0",
          dark: "#a8843a",
          muted: "#d4b896",
        },
        // Neutral — warm-tinted grays (not cold blue-gray)
        neutral: {
          50:  "#fafaf8",
          100: "#f5f4f0",
          200: "#ede9e1",
          300: "#d6d0c4",
          400: "#b5ae9f",
          500: "#8f877a",
          600: "#6b6358",
          700: "#4d4740",
          800: "#332f2a",
          900: "#1a1714",
          950: "#0d0b09",
        },
        // Surface colors
        surface: {
          DEFAULT: "#ffffff",
          warm: "#fefdfb",
          card: "#f9f8f5",
        },
        // Status colors (used later for booking workflow)
        status: {
          pending:   "#f59e0b",
          confirmed: "#3b82f6",
          assigned:  "#8b5cf6",
          active:    "#10b981",
          editing:   "#f97316",
          ready:     "#06b6d4",
          completed: "#22c55e",
          cancelled: "#ef4444",
        },
      },

      // ─── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        heading: ["Playfair Display", "Georgia", "serif"],
        serif:   ["Playfair Display", "Georgia", "serif"],
        body:    ["Inter", "system-ui", "sans-serif"],
        sans:    ["Inter", "system-ui", "sans-serif"],
        mono:    ["Inter", "system-ui", "sans-serif"],
      },

      // Normalized to the standard 16px root scale (100% browser zoom).
      // Display sizes are fluid (clamp) so headings are never oversized.
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.25rem' }],
        sm: ['0.875rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem', { lineHeight: '2.1rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.35rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.75rem' }],
        "display-2xl": ["clamp(2.75rem, 5.5vw, 4.5rem)",  { lineHeight: "1.08", letterSpacing: "-0.02em" }],
        "display-xl":  ["clamp(2.5rem, 4.8vw, 3.75rem)",  { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg":  ["clamp(2.125rem, 3.6vw, 3rem)",   { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "display-md":  ["clamp(1.75rem, 2.8vw, 2.25rem)", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-sm":  ["clamp(1.5rem, 2.2vw, 1.875rem)", { lineHeight: "1.25" }],
      },

      // ─── Spacing ───────────────────────────────────────────────────────────
      spacing: {
        "4.5": "1.125rem",
        "9.5": "2.375rem",
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
        "section": "6rem",   // Consistent section padding
      },

      // ─── Opacity scale ────────────────────────────────────────────────────
      // Tailwind's default scale skips these values, which caused numerous
      // `bg-gold/15`, `ring-gold/45`, `bg-gold/8` classes to be dropped.
      opacity: {
        "8": "0.08",
        "12": "0.12",
        "15": "0.15",
        "18": "0.18",
        "35": "0.35",
        "45": "0.45",
        "55": "0.55",
        "65": "0.65",
        "85": "0.85",
      },

      // ─── Border Radius ─────────────────────────────────────────────────────
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },

      // ─── Box Shadow ────────────────────────────────────────────────────────
      boxShadow: {
        // Aliases used throughout the admin workspace (Tailwind v3 has no xs/2xs).
        "2xs":      "0 1px 1px 0 rgba(26, 23, 20, 0.04)",
        "xs":       "0 1px 2px 0 rgba(26, 23, 20, 0.06)",
        "warm-sm":  "0 1px 3px 0 rgba(26, 23, 20, 0.08), 0 1px 2px -1px rgba(26, 23, 20, 0.06)",
        "warm-md":  "0 4px 16px -2px rgba(26, 23, 20, 0.12), 0 2px 6px -2px rgba(26, 23, 20, 0.08)",
        "warm-lg":  "0 10px 40px -4px rgba(26, 23, 20, 0.15), 0 4px 16px -4px rgba(26, 23, 20, 0.10)",
        "warm-xl":  "0 20px 60px -8px rgba(26, 23, 20, 0.20), 0 8px 24px -4px rgba(26, 23, 20, 0.12)",
        "gold":     "0 4px 20px -2px rgba(201, 169, 110, 0.30)",
        "card":     "0 2px 12px rgba(26, 23, 20, 0.06)",
        "card-hover": "0 8px 32px rgba(26, 23, 20, 0.14)",
      },

      // ─── Animation ─────────────────────────────────────────────────────────
      transitionTimingFunction: {
        "smooth": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        "400": "400ms",
      },
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-down": {
          "0%":   { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up":    "fade-up 0.6s ease-out both",
        "fade-in":    "fade-in 0.5s ease-out both",
        "slide-down": "slide-down 0.3s ease-out both",
      },

      // ─── Background Image ──────────────────────────────────────────────────
      backgroundImage: {
        "gradient-warm": "linear-gradient(135deg, #1a1a1a 0%, #2d2418 100%)",
        "gradient-gold": "linear-gradient(135deg, #c9a96e 0%, #a8843a 100%)",
        "gradient-overlay": "linear-gradient(to bottom, rgba(15,15,15,0.3) 0%, rgba(15,15,15,0.75) 100%)",
      },

      // ─── Aspect Ratios ─────────────────────────────────────────────────────
      aspectRatio: {
        "photo":     "4 / 3",
        "portrait":  "3 / 4",
        "wide":      "16 / 9",
        "cinematic": "21 / 9",
      },
    },
  },

  plugins: [],
};
