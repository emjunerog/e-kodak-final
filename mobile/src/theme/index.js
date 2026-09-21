// ─────────────────────────────────────────────────────────────
//  E-Kodak Studio — Design Tokens
//  Single source of truth for the luxury dark-gold visual language
// ─────────────────────────────────────────────────────────────

export const Colors = {
  // ── Backgrounds ──────────────────────────────────────────
  bg: {
    base:      '#0B0B0E',   // deepest background
    surface:   '#121217',   // card & screen surfaces
    card:      '#181820',   // elevated cards
    overlay:   '#1E1E28',   // modal overlays
    input:     '#16161E',   // text input fills
  },

  // ── Gold Accent Palette ───────────────────────────────────
  gold: {
    DEFAULT:   '#C9A96E',   // primary gold
    light:     '#E5CA8F',   // highlight / text-gold
    dim:       '#A88A52',   // muted gold (labels)
    glow:      'rgba(201, 169, 110, 0.15)',  // subtle glow/border
    border:    'rgba(201, 169, 110, 0.25)',  // card borders
    bg:        'rgba(201, 169, 110, 0.10)',  // tinted badge background
  },

  // ── Status Colors ─────────────────────────────────────────
  status: {
    pending:    '#F59E0B',  // amber — awaiting review
    confirmed:  '#3B82F6',  // blue — confirmed
    inProgress: '#8B5CF6',  // violet — shooting/editing
    ready:      '#10B981',  // emerald — ready for pickup
    completed:  '#6B7280',  // gray — done
    cancelled:  '#EF4444',  // red — cancelled
    rejected:   '#EF4444',
  },

  // ── Neutral Scale ─────────────────────────────────────────
  neutral: {
    50:  '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },

  // ── Semantic Aliases ──────────────────────────────────────
  text: {
    primary:   '#F5F5F0',   // primary text
    secondary: '#9CA3AF',   // muted text
    gold:      '#C9A96E',   // gold accent text
    onGold:    '#1A1008',   // text on gold backgrounds
    disabled:  '#4B5563',
  },

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Typography = {
  // Font families — you can swap to custom fonts later with expo-font
  fontHeading:  'System',   // Replace with 'Cormorant-Italic' after asset load
  fontBody:     'System',   // Replace with 'Inter-Regular'

  size: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   19,
    xl:   22,
    '2xl': 26,
    '3xl': 30,
    '4xl': 36,
    '5xl': 44,
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

export const Radius = {
  sm:   6,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
};

export const Shadow = {
  gold: {
    shadowColor: '#C9A96E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const STATUS_META = {
  PENDING:              { color: Colors.status.pending,    label: 'Pending Review',          step: 0 },
  CONFIRMED:            { color: Colors.status.confirmed,  label: 'Confirmed',               step: 1 },
  PHOTOGRAPHER_ASSIGNED:{ color: Colors.status.confirmed,  label: 'Photographer Assigned',   step: 2 },
  CAPTURE:              { color: Colors.status.inProgress, label: 'Studio Session',          step: 3 },
  IN_PROGRESS:          { color: Colors.status.inProgress, label: 'In Progress',             step: 3 },
  EDITING:              { color: Colors.status.inProgress, label: 'Editing & Retouching',    step: 4 },
  PRINTING:             { color: Colors.status.inProgress, label: 'Print Production',        step: 5 },
  READY:                { color: Colors.status.ready,      label: 'Ready for Pickup',        step: 6 },
  COMPLETED:            { color: Colors.status.completed,  label: 'Completed',               step: 7 },
  CANCELLED:            { color: Colors.status.cancelled,  label: 'Cancelled',               step: -1 },
  REJECTED:             { color: Colors.status.rejected,   label: 'Rejected',                step: -1 },
};

export const MILESTONE_STEPS = [
  { label: 'Request Received',       icon: 'ClipboardCheck',  desc: 'Your booking has been submitted.' },
  { label: 'Confirmed & Scheduled',  icon: 'CalendarCheck',   desc: 'Booking confirmed. Your session date is locked.' },
  { label: 'Photographer Assigned',  icon: 'Camera',          desc: 'A photographer has been assigned to your session.' },
  { label: 'Studio Session',         icon: 'Aperture',        desc: 'Your photoshoot is in progress at the studio.' },
  { label: 'Editing & Retouching',   icon: 'Sparkles',        desc: 'Your photos are being edited and retouched.' },
  { label: 'Print Production',       icon: 'Printer',         desc: 'Printing and framing your final outputs.' },
  { label: 'Ready for Pickup',       icon: 'Package',         desc: 'Your outputs are ready. Come pick them up!' },
];
