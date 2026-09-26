// ─────────────────────────────────────────────────────────────
//  E-Kodak Studio — Luxury Design System & Tokens
//  Single source of truth for the warm near-black + metallic gold
//  editorial photography aesthetic.
// ─────────────────────────────────────────────────────────────

export const DarkColors = {
  // ── Warm Darkroom Studio Backgrounds ──────────────────────
  bg: {
    base:         '#0D0B09',   // deepest studio blackroom
    surface:      '#14120E',   // dark warm surface
    card:         '#1A1714',   // elevated card surface
    cardElevated: '#24201A',   // high-elevation card surface
    overlay:      'rgba(13, 11, 9, 0.85)', // modal overlay
    input:        '#181512',   // text input fill
    glass:        'rgba(26, 23, 20, 0.75)',
  },

  // ── Metallic Gold Accent Palette ──────────────────────────
  gold: {
    DEFAULT:     '#C9A96E',   // signature studio gold
    light:       '#E8D5B0',   // luminous highlight / text-gold
    dark:        '#A8843A',   // deep aged gold
    specular:    '#F3E7D3',   // diamond specular reflection
    muted:       '#D4B896',   // warm muted gold
    glow:        'rgba(201, 169, 110, 0.20)',  // ambient gold aura
    border:      'rgba(201, 169, 110, 0.25)',  // card hairline border
    borderLight: 'rgba(201, 169, 110, 0.45)',  // active/selected border
    bg:          'rgba(201, 169, 110, 0.12)',  // tinted badge background
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
    primary:   '#FAFAF8',   // crisp warm white
    secondary: '#B5AE9F',   // warm muted text
    muted:     '#8F877A',   // subtle captions
    gold:      '#E8D5B0',   // gold accent text
    goldDark:  '#C9A96E',   // primary gold text
    onGold:    '#1A1714',   // text on bright metallic gold
    disabled:  '#4D4740',
  },

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const LightColors = {
  // ── Daylight Studio Gallery Backgrounds ───────────────────
  bg: {
    base:         '#F7F5F0',   // warm alabaster linen
    surface:      '#FFFFFF',   // pure crisp white
    card:         '#FFFFFF',   // elevated card surface
    cardElevated: '#F0ECE4',   // soft warm elevation
    overlay:      'rgba(24, 20, 16, 0.45)', // modal overlay
    input:        '#F3EFE8',   // text input fill
    glass:        'rgba(255, 255, 255, 0.88)',
  },

  // ── High-Contrast Antique Gold Palette ─────────────────────
  gold: {
    DEFAULT:     '#B8860B',   // dark goldenrod / antique gold for high light readability
    light:       '#996515',   // deep amber gold
    dark:        '#7A5200',   // deep bronze
    specular:    '#D4AF37',   // metallic reflection
    muted:       '#A67C1E',   // warm muted gold
    glow:        'rgba(184, 134, 11, 0.16)',
    border:      'rgba(184, 134, 11, 0.25)',
    borderLight: 'rgba(184, 134, 11, 0.48)',
    bg:          'rgba(184, 134, 11, 0.09)',
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
  gold: ['#E8D5B0', '#C9A96E', '#A8843A'],
  goldShine: ['#F3E7D3', '#E8D5B0', '#C9A96E', '#A8843A'],
  goldMuted: ['rgba(201, 169, 110, 0.18)', 'rgba(168, 132, 58, 0.06)'],
  darkStudio: ['#221E19', '#14120E', '#0D0B09'],
  darkWarm: ['#1A1714', '#0D0B09'],
  glassCard: ['rgba(34, 30, 25, 0.88)', 'rgba(20, 18, 15, 0.96)'],
  glassHighlight: ['rgba(243, 231, 211, 0.18)', 'rgba(201, 169, 110, 0)'],
  ambientSpot: ['rgba(201, 169, 110, 0.15)', 'rgba(13, 11, 9, 0)'],
};

export const LightGradients = {
  gold: ['#DFBD69', '#B8860B', '#926A08'],
  goldShine: ['#FFF0C2', '#DFBD69', '#B8860B', '#8C6404'],
  goldMuted: ['rgba(184, 134, 11, 0.14)', 'rgba(184, 134, 11, 0.04)'],
  darkStudio: ['#FFFFFF', '#F7F5F0', '#EFECE6'],
  darkWarm: ['#FFFFFF', '#F7F5F0'],
  glassCard: ['rgba(255, 255, 255, 0.94)', 'rgba(247, 245, 240, 0.96)'],
  glassHighlight: ['rgba(255, 255, 255, 0.85)', 'rgba(184, 134, 11, 0.08)'],
  ambientSpot: ['rgba(184, 134, 11, 0.12)', 'rgba(247, 245, 240, 0)'],
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
  xs:   4,
  sm:   8,
  md:   14,
  lg:   20,
  xl:   28,
  full: 9999,
};

// ── Shadows ───────────────────────────────────────────────────
export const Shadow = {
  gold: {
    shadowColor: '#C9A96E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
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
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 14,
  },
  cardHover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.65,
    shadowRadius: 36,
    elevation: 18,
  },
};

// ── Status Metadata ───────────────────────────────────────────
export const STATUS_META = {
  PENDING:              { color: Colors.status.pending,    label: 'Pending Review',          step: 0 },
  CONFIRMED:            { color: Colors.status.confirmed,  label: 'Confirmed',               step: 1 },
  PHOTOGRAPHER_ASSIGNED:{ color: Colors.status.confirmed,  label: 'Photographer Assigned',   step: 2 },
  CAPTURE:              { color: Colors.status.inProgress, label: 'Studio Session',          step: 3 },
  IN_PROGRESS:          { color: Colors.status.inProgress, label: 'In Progress',             step: 3 },
  EDITING:              { color: Colors.status.editing,    label: 'Editing & Retouching',    step: 4 },
  PRINTING:             { color: Colors.status.editing,    label: 'Print Production',        step: 5 },
  READY:                { color: Colors.status.ready,      label: 'Ready for Pickup',        step: 6 },
  COMPLETED:            { color: Colors.status.completed,  label: 'Completed',               step: 7 },
  CANCELLED:            { color: Colors.status.cancelled,  label: 'Cancelled',               step: -1 },
  REJECTED:             { color: Colors.status.rejected,   label: 'Rejected',                step: -1 },
};

// ── Milestone Steps ───────────────────────────────────────────
export const MILESTONE_STEPS = [
  { label: 'Request Received',       icon: 'ClipboardCheck',  desc: 'Your booking has been submitted & scheduled.' },
  { label: 'Confirmed & Locked',     icon: 'CalendarCheck',   desc: 'Booking verified. Your studio slot is secured.' },
  { label: 'Photographer Assigned',  icon: 'Camera',          desc: 'Your dedicated studio photographer is ready.' },
  { label: 'Studio Session',         icon: 'Aperture',        desc: 'Your photoshoot is in progress in the studio bay.' },
  { label: 'Editing & Retouching',   icon: 'Sparkles',        desc: 'Color grading, beauty retouching, and proofs.' },
  { label: 'Print Production',       icon: 'Printer',         desc: 'Museum-grade printing & crystal framing.' },
  { label: 'Ready for Pickup',       icon: 'Package',         desc: 'Your outputs are packaged & ready for collection.' },
];
