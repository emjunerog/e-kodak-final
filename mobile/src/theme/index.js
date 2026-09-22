// ─────────────────────────────────────────────────────────────
//  E-Kodak Studio — Luxury Design System & Tokens
//  Single source of truth for the warm near-black + metallic gold
//  editorial photography aesthetic.
// ─────────────────────────────────────────────────────────────

export const Colors = {
  // ── Warm Darkroom Studio Backgrounds ──────────────────────
  bg: {
    base:         '#0D0B09',   // deepest studio blackroom (matches web neutral-950)
    surface:      '#14120E',   // dark warm surface (matches web neutral-900)
    card:         '#1A1714',   // elevated card surface
    cardElevated: '#24201A',   // high-elevation card surface
    overlay:      'rgba(13, 11, 9, 0.85)', // modal & drawer overlay
    input:        '#181512',   // text input fill
    glass:        'rgba(26, 23, 20, 0.72)',
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
    pending:    '#F59E0B',  // amber — awaiting deposit/review
    confirmed:  '#3B82F6',  // blue — scheduled & confirmed
    inProgress: '#8B5CF6',  // violet — photographer assigned / shoot
    editing:    '#F97316',  // warm orange — retouching & proofs
    ready:      '#10B981',  // emerald — outputs ready for pickup
    completed:  '#22C55E',  // vibrant green — finished
    cancelled:  '#EF4444',  // red — cancelled
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

// ── Gradients ─────────────────────────────────────────────────
export const Gradients = {
  // Rich metallic gold gradient
  gold: ['#E8D5B0', '#C9A96E', '#A8843A'],
  // Specular light sheen for primary CTA buttons
  goldShine: ['#F3E7D3', '#E8D5B0', '#C9A96E', '#A8843A'],
  // Subtle tinted badge/card fill
  goldMuted: ['rgba(201, 169, 110, 0.18)', 'rgba(168, 132, 58, 0.06)'],
  // Deep studio background lighting
  darkStudio: ['#221E19', '#14120E', '#0D0B09'],
  darkWarm: ['#1A1714', '#0D0B09'],
  // Frosted acrylic glass card
  glassCard: ['rgba(34, 30, 25, 0.88)', 'rgba(20, 18, 15, 0.96)'],
  // Top specular acrylic edge reflection
  glassHighlight: ['rgba(243, 231, 211, 0.18)', 'rgba(201, 169, 110, 0)'],
  // Ambient radial warm glow
  ambientSpot: ['rgba(201, 169, 110, 0.15)', 'rgba(13, 11, 9, 0)'],
};

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
