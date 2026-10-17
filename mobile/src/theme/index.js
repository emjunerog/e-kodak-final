// ─────────────────────────────────────────────────────────────
//  E-Kodak Studio — Design System v2 ("Modern Atelier")
//  Keeps the signature near-black + champagne-gold identity, refreshed
//  with deeper contrast, softer glass, rounder geometry and a small set
//  of friendly accents borrowed from Kodak the Fox.
//  NOTE: every legacy key is preserved so existing screens keep working.
// ─────────────────────────────────────────────────────────────

export const DarkColors = {
  // ── Darkroom Backgrounds (deeper, cooler-neutral black) ───
  bg: {
    base:         '#09080A',   // deepest studio blackroom
    surface:      '#121014',   // raised surface
    card:         '#18161A',   // card surface
    cardElevated: '#221F24',   // high-elevation card surface
    elevated:     '#221F24',   // alias — used by modals/reels (same as cardElevated)
    overlay:      'rgba(6, 5, 8, 0.82)', // modal overlay
    input:        '#151318',   // text input fill
    glass:        'rgba(28, 25, 30, 0.62)',
  },

  // ── Champagne Gold Accent Palette ─────────────────────────
  gold: {
    DEFAULT:     '#D9B46C',   // signature champagne gold
    light:       '#F2DDB0',   // luminous highlight / text-gold
    dark:        '#A9823A',   // deep aged gold
    specular:    '#FFF1D6',   // specular reflection
    muted:       '#C9AE84',   // warm muted gold
    glow:        'rgba(217, 180, 108, 0.22)',  // ambient gold aura
    border:      'rgba(242, 221, 176, 0.12)',  // soft card hairline
    borderLight: 'rgba(217, 180, 108, 0.42)',  // active/selected border
    bg:          'rgba(217, 180, 108, 0.12)',  // tinted badge background
  },

  // ── Friendly accents (from Kodak the Fox) ─────────────────
  accent: {
    ember:   '#F28C3A',   // fox fur orange
    emberBg: 'rgba(242, 140, 58, 0.14)',
    mint:    '#3DDC97',   // success / live
    mintBg:  'rgba(61, 220, 151, 0.14)',
    sky:     '#7AB8FF',
    skyBg:   'rgba(122, 184, 255, 0.14)',
    rose:    '#FF6B7A',
    roseBg:  'rgba(255, 107, 122, 0.14)',
  },

  // ── Neutral surfaces for chips / rows / dividers ──────────
  surface: {
    chip:    'rgba(255, 255, 255, 0.06)',
    chipHi:  'rgba(255, 255, 255, 0.10)',
    hairline:'rgba(255, 255, 255, 0.08)',
    divider: 'rgba(255, 255, 255, 0.06)',
  },

  // ── Status Colors (Harmonized with Studio Workflow) ───────
  status: {
    pending:    '#F59E0B',
    confirmed:  '#3B82F6',
    inProgress: '#8B5CF6',
    editing:    '#F97316',
    ready:      '#10B981',
    completed:  '#22C55E',
    cancelled:  '#EF4444',
    rejected:   '#EF4444',
  },

  // ── Neutral Warm Gray Scale ───────────────────────────────
  neutral: {
    50:  '#FAFAF8',
    100: '#F5F4F0',
    200: '#EDE9E1',
    300: '#D6D0C4',
    400: '#B5AE9F',
    500: '#8F877A',
    600: '#6B6358',
    700: '#4D4740',
    800: '#332F2A',
    900: '#1A1714',
    950: '#0D0B09',
  },

  // ── Semantic Typography Aliases ───────────────────────────
  text: {
    primary:   '#F7F5F2',   // crisp warm white
    secondary: '#B9B2A8',   // muted text
    muted:     '#857E76',   // subtle captions
    gold:      '#F2DDB0',   // gold accent text
    goldDark:  '#D9B46C',   // primary gold text
    onGold:    '#17130C',   // text on bright metallic gold
    disabled:  '#4A4540',
  },

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const LightColors = {
  // ── Daylight Gallery Backgrounds ──────────────────────────
  bg: {
    base:         '#F6F3EE',   // warm linen
    surface:      '#FFFFFF',   // pure crisp white
    card:         '#FFFFFF',   // card surface
    cardElevated: '#EFEAE2',   // soft warm elevation
    elevated:     '#EFEAE2',   // alias — used by modals/reels (same as cardElevated)
    overlay:      'rgba(20, 16, 12, 0.42)', // modal overlay
    input:        '#F1ECE4',   // text input fill
    glass:        'rgba(255, 255, 255, 0.78)',
  },

  // ── Antique Gold Palette (high readability on light) ──────
  gold: {
    DEFAULT:     '#B07D1E',
    light:       '#94650F',
    dark:        '#6F4B05',
    specular:    '#D9B46C',
    muted:       '#A47A2C',
    glow:        'rgba(176, 125, 30, 0.16)',
    border:      'rgba(60, 40, 10, 0.10)',
    borderLight: 'rgba(176, 125, 30, 0.45)',
    bg:          'rgba(176, 125, 30, 0.10)',
  },

  accent: {
    ember:   '#D9701F',
    emberBg: 'rgba(217, 112, 31, 0.12)',
    mint:    '#14A86B',
    mintBg:  'rgba(20, 168, 107, 0.12)',
    sky:     '#2F7FE0',
    skyBg:   'rgba(47, 127, 224, 0.12)',
    rose:    '#E0475A',
    roseBg:  'rgba(224, 71, 90, 0.12)',
  },

  surface: {
    chip:    'rgba(30, 20, 5, 0.05)',
    chipHi:  'rgba(30, 20, 5, 0.08)',
    hairline:'rgba(30, 20, 5, 0.08)',
    divider: 'rgba(30, 20, 5, 0.06)',
  },

  // ── Status Colors ─────────────────────────────────────────
  status: {
    pending:    '#D97706',
    confirmed:  '#2563EB',
    inProgress: '#7C3AED',
    editing:    '#EA580C',
    ready:      '#059669',
    completed:  '#16A34A',
    cancelled:  '#DC2626',
    rejected:   '#DC2626',
  },

  // ── Neutral Light Scale ───────────────────────────────────
  neutral: {
    50:  '#1A1714',
    100: '#332F2A',
    200: '#4D4740',
    300: '#6B6358',
    400: '#8F877A',
    500: '#A8A092',
    600: '#C8C2B5',
    700: '#E2DDD3',
    800: '#EFECE6',
    900: '#F5F4F0',
    950: '#FAF9F6',
  },

  // ── Semantic Typography Aliases ───────────────────────────
  text: {
    primary:   '#181410',   // deep espresso black ink
    secondary: '#5C5549',   // warm slate charcoal
    muted:     '#8A8072',   // soft studio captions
    gold:      '#996515',   // deep gold accent
    goldDark:  '#7A5200',   // bronze gold
    onGold:    '#FFFFFF',   // text on deep gold button
    disabled:  '#B5AE9F',
  },

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Default backwards compatibility
export const Colors = DarkColors;

// ── Gradients ─────────────────────────────────────────────────
export const DarkGradients = {
  gold: ['#F6E2B6', '#D9B46C', '#A9823A'],
  goldShine: ['#FFF1D6', '#F2DDB0', '#D9B46C', '#A9823A'],
  goldMuted: ['rgba(217, 180, 108, 0.20)', 'rgba(169, 130, 58, 0.05)'],
  darkStudio: ['#1C1A1F', '#121014', '#09080A'],
  darkWarm: ['#18161A', '#09080A'],
  glassCard: ['rgba(40, 36, 42, 0.70)', 'rgba(20, 18, 22, 0.86)'],
  glassHighlight: ['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0)'],
  ambientSpot: ['rgba(217, 180, 108, 0.16)', 'rgba(9, 8, 10, 0)'],
  ember: ['#FFB067', '#F28C3A', '#C9561C'],
  mint: ['#7BF0C0', '#3DDC97', '#1E9E6B'],
};

export const LightGradients = {
  gold: ['#E6C47E', '#B07D1E', '#86600F'],
  goldShine: ['#FFF0C9', '#E6C47E', '#B07D1E', '#86600F'],
  goldMuted: ['rgba(176, 125, 30, 0.14)', 'rgba(176, 125, 30, 0.03)'],
  darkStudio: ['#FFFFFF', '#F6F3EE', '#EEE8DF'],
  darkWarm: ['#FFFFFF', '#F6F3EE'],
  glassCard: ['rgba(255, 255, 255, 0.92)', 'rgba(250, 247, 242, 0.88)'],
  glassHighlight: ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0)'],
  ambientSpot: ['rgba(176, 125, 30, 0.12)', 'rgba(246, 243, 238, 0)'],
  ember: ['#FFA45C', '#D9701F', '#A84E10'],
  mint: ['#5BE0A8', '#14A86B', '#0B7A4C'],
};

export const Gradients = DarkGradients;

export function getThemeColors(isDark = true) {
  return isDark ? DarkColors : LightColors;
}

export function getThemeGradients(isDark = true) {
  return isDark ? DarkGradients : LightGradients;
}

// ── Typography ────────────────────────────────────────────────
export const Typography = {
  // Font Families: Playfair Display for editorial elegance, Inter for clean modern body
  fontHeading:        'PlayfairDisplay_700Bold',
  fontHeadingSemi:    'PlayfairDisplay_600SemiBold',
  fontHeadingRegular: 'PlayfairDisplay_400Regular',
  fontHeadingItalic:  'PlayfairDisplay_400Regular_Italic',

  fontBody:           'Inter_400Regular',
  fontBodyMedium:     'Inter_500Medium',
  fontBodySemi:       'Inter_600SemiBold',
  fontBodyBold:       'Inter_700Bold',
  // Monospace for booking numbers / tokens — falls back to system mono
  // (no extra font asset required, so existing font loading is untouched).
  fontMono:           'Inter_500Medium',

  size: {
    xs:    11,
    sm:    13,
    base:  15,
    md:    17,
    lg:    19,
    xl:    22,
    '2xl': 26,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
  },

  weight: {
    light:    '300',
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },

  lineHeight: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.7,
  },
};

// ── Spacing ───────────────────────────────────────────────────
export const Spacing = {
  0:   0,
  1:   4,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  10:  40,
  12:  48,
  16:  64,
};

// ── Border Radius ─────────────────────────────────────────────
export const Radius = {
  xs:   6,
  sm:   10,
  md:   16,
  lg:   24,
  xl:   30,
  '2xl': 36,
  full: 9999,
};

// ── Shadows ───────────────────────────────────────────────────
export const Shadow = {
  gold: {
    shadowColor: '#D9B46C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 10,
  },
  // Outstanding glow ring for primary CTAs / active reticle — additive only.
  goldGlow: {
    shadowColor: '#E8D5B0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 10,
  },
  // Soft lift for floating pills / docks.
  lift: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 10,
  },
  goldSoft: {
    shadowColor: '#C9A96E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 8,
  },
  cardHover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.36,
    shadowRadius: 36,
    elevation: 12,
  },
};

// ── Status Metadata ───────────────────────────────────────────
export const STATUS_META = {
  PENDING:              { color: Colors.status.pending,    label: 'Booking Received',                  step: 0 },
  RESERVED:             { color: Colors.status.pending,    label: 'Booking Received',                  step: 0 },
  CONFIRMED:            { color: Colors.status.confirmed,  label: 'Approved & Reserved',               step: 1 },
  PHOTOGRAPHER_ASSIGNED:{ color: Colors.status.confirmed,  label: 'Approved & Reserved',               step: 1 },
  CAPTURE:              { color: Colors.status.inProgress, label: 'Ongoing Pictorial',                 step: 2 },
  IN_PROGRESS:          { color: Colors.status.inProgress, label: 'Ongoing Pictorial',                 step: 2 },
  EDITING:              { color: Colors.status.editing,    label: 'Editing',                           step: 3 },
  RETOUCHING:           { color: Colors.status.editing,    label: 'Retouching',                        step: 4 },
  FINALIZED:            { color: Colors.status.confirmed,  label: 'Booking Finalized',                 step: 5 },
  PRINTING:             { color: Colors.status.confirmed,  label: 'Booking Finalized',                 step: 5 },
  READY:                { color: Colors.status.ready,      label: 'Booking ready to pick-up (studio)', step: 6 },
  UNDER_DELIVERY:       { color: Colors.status.inProgress, label: 'Booking under delivery',            step: 6 },
  COMPLETED:            { color: Colors.status.completed,  label: 'Completed',                         step: 7 },
  CANCELLED:            { color: Colors.status.cancelled,  label: 'Cancelled',                         step: -1 },
  REJECTED:             { color: Colors.status.rejected,   label: 'Rejected',                          step: -1 },
};

// ── Milestone Steps (7-Stage Pipeline) ─────────────────────────
export const MILESTONE_STEPS = [
  { label: 'Booking Received',       icon: 'ClipboardCheck',  desc: 'Your reservation has been received and logged.' },
  { label: 'Approved & Reserved',    icon: 'CalendarCheck',   desc: 'Slot verified. Settle downpayment to confirm schedule.' },
  { label: 'Ongoing Pictorial',      icon: 'Camera',          desc: 'Your photoshoot is in progress in the studio bay.' },
  { label: 'Editing',                icon: 'Sparkles',        desc: 'Darkroom processing — handled with meticulous craftsmanship.' },
  { label: 'Retouching',             icon: 'Wand2',           desc: 'Color grading and fine-art beauty proofing.' },
  { label: 'Booking Finalized',      icon: 'Printer',         desc: 'Museum-grade prints assembled and encased.' },
  { label: 'Ready for Release',      icon: 'Package',         desc: 'Ready for studio pickup or direct dispatch.' },
];

// -- Motion (additive, UI-only) --
export const Motion = { fast: 160, base: 240, slow: 420, spring: { speed: 22, bounciness: 7 } };
