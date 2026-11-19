/**
 * BookingTrackerScreen.jsx
 * Luxury Live Booking Status Tracker for E-Kodak Photography Studio.
 * Features:
 * - Playfair Display & Inter typography
 * - Live real-time Supabase status subscription
 * - Single Master Session Dossier Card (all order details consolidated, no AI text)
 * - Animated Live Tracking Vector Sign (pure vector, zero text)
 * - Prominent Customer Selected Set with category & pricing
 * - Clear "To be announced" schedule indicator
 * - Studio Bay Check-in & Assistance dock (replaces repetitive inspection card)
 * - Quick Scan Pass icon button in header beside Save icon
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, Animated, Easing, Modal, Linking, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, {
  Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop,
  Circle, Line, Rect, Path, G,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Calendar, MapPin, Camera, Package,
  QrCode, RefreshCw, Bookmark, BookmarkCheck,
  ChevronDown, ChevronUp, Sparkles, List, GitBranch,
  Phone, Mail, CheckCircle2, User, School, GraduationCap,
  Award, Tag, CreditCard, Compass, Info, X, Building2, Truck,
} from 'lucide-react-native';

import {
  fetchBookingByToken, subscribeToBookingUpdates, fetchStudioSettings,
} from '../services/bookingService';
import {
  saveBookingToken, removeSavedBooking, getSavedBookings,
  saveCustomerProfileFromBooking,
} from '../services/storageService';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import GlassHeader from '../components/GlassHeader';
import PremiumIcon from '../components/PremiumIcon';
import StatusBadge from '../components/StatusBadge';
import MilestoneStepper from '../components/MilestoneStepper';
import InteractiveTracker from '../components/InteractiveTracker';
import GoldButton from '../components/GoldButton';
import StudioMascotKit from '../components/StudioMascotKit';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius, STATUS_META, MILESTONE_STEPS } from '../theme';

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildPineTreePath(cx, topY, baseY, halfW) {
  const h = baseY - topY;
  const y1 = topY + h * 0.34;
  const y2 = topY + h * 0.66;
  return [
    `M ${cx} ${topY}`,
    `L ${cx + halfW * 0.52} ${y1}`,
    `L ${cx + halfW * 0.22} ${y1}`,
    `L ${cx + halfW * 0.80} ${y2}`,
    `L ${cx + halfW * 0.36} ${y2}`,
    `L ${cx + halfW} ${baseY}`,
    `L ${cx - halfW} ${baseY}`,
    `L ${cx - halfW * 0.36} ${y2}`,
    `L ${cx - halfW * 0.80} ${y2}`,
    `L ${cx - halfW * 0.22} ${y1}`,
    `L ${cx - halfW * 0.52} ${y1}`,
    'Z',
  ].join(' ');
}

const PROGRESS_FOREST_TREES = {
  far: [
    [24, 54, 108, 12], [68, 42, 108, 14], [116, 50, 108, 13],
    [166, 38, 108, 15], [212, 46, 108, 13], [250, 34, 108, 15],
    [288, 28, 108, 16], [322, 36, 108, 14], [350, 46, 108, 13],
  ],
  mid: [
    [42, 48, 122, 16], [142, 46, 122, 15], [228, 36, 122, 17],
    [270, 26, 122, 19], [310, 32, 122, 18], [344, 42, 122, 16],
  ],
  near: [
    [16, 62, 134, 17], [196, 56, 134, 16], [252, 44, 134, 18],
    [292, 34, 134, 21], [332, 42, 134, 19],
  ],
};

function formatDate(dateStr) {
  if (!dateStr) return 'To be announced';
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return dateStr; }
}

function formatSingleTime(t) {
  if (!t) return '';
  const trimmed = t.trim();
  if (/am|pm/i.test(trimmed)) return trimmed;
  const [h, m] = trimmed.split(':');
  if (h === undefined || m === undefined) return trimmed;
  const d = new Date(); d.setHours(+h, +m);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  try {
    if (timeStr.includes('–') || timeStr.includes('-')) {
      const parts = timeStr.split(/[–-]/).map(p => p.trim());
      if (parts.length === 2) {
        return `${formatSingleTime(parts[0])} – ${formatSingleTime(parts[1])}`;
      }
    }
    return formatSingleTime(timeStr);
  } catch { return timeStr; }
}

function formatPeso(n) {
  const v = Number(n);
  if (!isFinite(v) || v <= 0) return '';
  try {
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch { return `₱${v}`; }
}

// ── Order Step Color Hierarchy & Crafted Status Pill ─────────────────────────

export const STEP_COLOR_HIERARCHY = {
  PENDING: {
    step: 1,
    total: 8,
    code: 'PENDING',
    label: 'Booking Received',
    tone: 'amber',
    dot: '#F59E0B',
    accent: '#D97706',
    text: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    glow: 'rgba(245, 158, 11, 0.25)',
    description: 'Booking request received · Front desk notified for review',
  },
  RESERVED: {
    step: 1,
    total: 8,
    code: 'RESERVED',
    label: 'Booking Received',
    tone: 'amber',
    dot: '#F59E0B',
    accent: '#D97706',
    text: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    glow: 'rgba(245, 158, 11, 0.25)',
    description: 'Booking request received · Front desk notified for review',
  },
  CONFIRMED: {
    step: 2,
    total: 8,
    code: 'CONFIRMED',
    label: 'Approved & Reserved',
    tone: 'sky',
    dot: '#38BDF8',
    accent: '#0284C7',
    text: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    glow: 'rgba(56, 189, 248, 0.25)',
    description: 'Session slot approved and reserved by studio admin',
  },
  PHOTOGRAPHER_ASSIGNED: {
    step: 3,
    total: 8,
    code: 'PHOTOGRAPHER_ASSIGNED',
    label: 'Photographer Assigned',
    tone: 'sky',
    dot: '#38BDF8',
    accent: '#0284C7',
    text: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    glow: 'rgba(56, 189, 248, 0.25)',
    description: 'Dedicated lead photographer assigned to your session',
  },
  CAPTURE: {
    step: 4,
    total: 8,
    code: 'CAPTURE',
    label: 'Ongoing Pictorial',
    tone: 'purple',
    dot: '#A855F7',
    accent: '#7C3AED',
    text: '#C084FC',
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.35)',
    glow: 'rgba(168, 85, 247, 0.25)',
    description: 'Photoshoot actively in progress in the camera bay',
  },
  IN_PROGRESS: {
    step: 4,
    total: 8,
    code: 'IN_PROGRESS',
    label: 'Ongoing Pictorial',
    tone: 'purple',
    dot: '#A855F7',
    accent: '#7C3AED',
    text: '#C084FC',
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.35)',
    glow: 'rgba(168, 85, 247, 0.25)',
    description: 'Photoshoot actively in progress in the camera bay',
  },
  EDITING: {
    step: 5,
    total: 8,
    code: 'EDITING',
    label: 'Editing',
    tone: 'teal',
    dot: '#14B8A6',
    accent: '#0D9488',
    text: '#2DD4BF',
    bg: 'rgba(20, 184, 166, 0.12)',
    border: 'rgba(20, 184, 166, 0.35)',
    glow: 'rgba(20, 184, 166, 0.25)',
    description: 'Studio processing in progress · Darkroom team takes meticulous time and care with portraits',
  },
  RETOUCHING: {
    step: 6,
    total: 8,
    code: 'RETOUCHING',
    label: 'Retouching',
    tone: 'gold',
    dot: '#EAB308',
    accent: '#CA8A04',
    text: '#FACC15',
    bg: 'rgba(234, 179, 8, 0.14)',
    border: 'rgba(234, 179, 8, 0.40)',
    glow: 'rgba(234, 179, 8, 0.30)',
    description: 'Fine-art beauty proofing, blemish polish, and color grading',
  },
  FINALIZED: {
    step: 7,
    total: 8,
    code: 'FINALIZED',
    label: 'Booking Finalized',
    tone: 'gold',
    dot: '#EAB308',
    accent: '#CA8A04',
    text: '#FACC15',
    bg: 'rgba(234, 179, 8, 0.14)',
    border: 'rgba(234, 179, 8, 0.40)',
    glow: 'rgba(234, 179, 8, 0.30)',
    description: 'Museum-grade photo printing & crystal frame mounting assembled',
  },
  PRINTING: {
    step: 7,
    total: 8,
    code: 'PRINTING',
    label: 'Booking Finalized',
    tone: 'gold',
    dot: '#EAB308',
    accent: '#CA8A04',
    text: '#FACC15',
    bg: 'rgba(234, 179, 8, 0.14)',
    border: 'rgba(234, 179, 8, 0.40)',
    glow: 'rgba(234, 179, 8, 0.30)',
    description: 'Museum-grade photo printing & crystal frame mounting assembled',
  },
  READY: {
    step: 8,
    total: 8,
    code: 'READY',
    label: 'Booking ready to pick-up (studio)',
    tone: 'gold',
    dot: '#EAB308',
    accent: '#CA8A04',
    text: '#FACC15',
    bg: 'rgba(234, 179, 8, 0.14)',
    border: 'rgba(234, 179, 8, 0.40)',
    glow: 'rgba(234, 179, 8, 0.30)',
    description: 'Packaged prints framed and ready for studio counter collection',
  },
  UNDER_DELIVERY: {
    step: 8,
    total: 8,
    code: 'UNDER_DELIVERY',
    label: 'Booking under delivery',
    tone: 'sky',
    dot: '#38BDF8',
    accent: '#0284C7',
    text: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    glow: 'rgba(56, 189, 248, 0.25)',
    description: 'Direct courier delivery dispatch and tracking active',
  },
  COMPLETED: {
    step: 8,
    total: 8,
    code: 'COMPLETED',
    label: 'Completed',
    tone: 'emerald',
    dot: '#10B981',
    accent: '#059669',
    text: '#34D399',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    glow: 'rgba(16, 185, 129, 0.25)',
    description: 'Order fulfilled and digital gallery access active',
  },
  CANCELLED: {
    step: 0,
    total: 8,
    code: 'CANCELLED',
    label: 'Cancelled',
    tone: 'rose',
    dot: '#EF4444',
    accent: '#DC2626',
    text: '#F87171',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
    glow: 'rgba(239, 68, 68, 0.25)',
    description: 'Session cancelled',
  },
  REJECTED: {
    step: 0,
    total: 8,
    code: 'REJECTED',
    label: 'Rejected',
    tone: 'rose',
    dot: '#EF4444',
    accent: '#DC2626',
    text: '#F87171',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
    glow: 'rgba(239, 68, 68, 0.25)',
    description: 'Session declined by studio',
  },
};

function LuxuryStatusPill({ status, showStep = true, size = 'md' }) {
  const meta = STEP_COLOR_HIERARCHY[String(status || 'PENDING').toUpperCase()] || STEP_COLOR_HIERARCHY.PENDING;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const auraScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const auraOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        stylesLocal.statusPillContainer,
        {
          backgroundColor: meta.bg,
          borderColor: meta.border,
          paddingVertical: isSmall ? 3.5 : 5.5,
          paddingHorizontal: isSmall ? 8 : 11,
        },
      ]}
    >
      <View style={stylesLocal.statusBeaconWrap}>
        <Animated.View
          style={[
            stylesLocal.statusBeaconAura,
            {
              backgroundColor: meta.dot,
              transform: [{ scale: auraScale }],
              opacity: auraOpacity,
            },
          ]}
        />
        <View style={[stylesLocal.statusBeaconDot, { backgroundColor: meta.dot }]} />
      </View>

      <Text
        style={[
          stylesLocal.statusLabelText,
          {
            color: meta.text,
            fontSize: isSmall ? 10 : 11,
          },
        ]}
      >
        {meta.label.toUpperCase()}
      </Text>

      {showStep && meta.step > 0 && (
        <View style={[stylesLocal.statusStepPill, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
          <Text style={[stylesLocal.statusStepText, { color: meta.text }]}>
            STEP {meta.step} OF {meta.total}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Pure Vector Live Tracking Sign (No Text) ─────────────────────────────────

function LiveTrackingRadarSign({ size = 52, isDark, colors }) {
  const radarPulse = useRef(new Animated.Value(0)).current;
  const sweepSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(radarPulse, {
          toValue: 1,
          duration: 1700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(radarPulse, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ])
    );
    const spinAnim = Animated.loop(
      Animated.timing(sweepSpin, {
        toValue: 1,
        duration: 7500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseAnim.start();
    spinAnim.start();

    return () => {
      pulseAnim.stop();
      spinAnim.stop();
    };
  }, [radarPulse, sweepSpin]);

  const pulseScale = radarPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1.32],
  });
  const pulseOpacity = radarPulse.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0.85, 0.4, 0],
  });
  const spinDeg = sweepSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[stylesLocal.radarWrap, { width: size, height: size }]}>
      {/* Animated Expanding Ambient Radar Pulse */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: colors.gold.DEFAULT,
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />

      {/* Rotating Precision Reticle Frame */}
      <Animated.View
        style={{
          width: size - 4,
          height: size - 4,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: spinDeg }],
        }}
      >
        <Svg width={size - 4} height={size - 4} viewBox="0 0 52 52">
          <Defs>
            <SvgLinearGradient id="radarGoldGlow" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFF4DE" />
              <Stop offset="50%" stopColor="#D9B46C" />
              <Stop offset="100%" stopColor="#8C6316" />
            </SvgLinearGradient>
          </Defs>
          {/* Outer Compass Reticle with Stardust Ticks */}
          <Circle
            cx="26"
            cy="26"
            r="23"
            stroke="url(#radarGoldGlow)"
            strokeWidth="1.2"
            strokeDasharray="3, 4"
            fill="none"
            opacity={0.7}
          />
          {/* Inner Studio Focal Orbit */}
          <Circle
            cx="26"
            cy="26"
            r="15"
            stroke="url(#radarGoldGlow)"
            strokeWidth="0.9"
            fill="none"
            opacity={0.4}
          />
          {/* Tracking Crosshair Pips */}
          <Line x1="26" y1="2" x2="26" y2="6.5" stroke="url(#radarGoldGlow)" strokeWidth="1.6" strokeLinecap="round" />
          <Line x1="26" y1="45.5" x2="26" y2="50" stroke="url(#radarGoldGlow)" strokeWidth="1.6" strokeLinecap="round" />
          <Line x1="2" y1="26" x2="6.5" y2="26" stroke="url(#radarGoldGlow)" strokeWidth="1.6" strokeLinecap="round" />
          <Line x1="45.5" y1="26" x2="50" y2="26" stroke="url(#radarGoldGlow)" strokeWidth="1.6" strokeLinecap="round" />
        </Svg>
      </Animated.View>

      {/* Glowing Golden Aperture Center Beacon */}
      <View
        style={[
          stylesLocal.beaconCore,
          {
            backgroundColor: colors.gold.DEFAULT,
            shadowColor: colors.gold.DEFAULT,
          },
        ]}
      >
        <View style={stylesLocal.beaconCatchlight} />
      </View>
    </View>
  );
}

// ── Delivery Panel (4-Phase Tracking & Studio Pickup) ────────────────────────

function DeliveryPanel({ booking, deliveries, colors, isDark, styles }) {
  const isDelivery = Boolean(
    booking?.delivery_address ||
    booking?.fulfillment_type === 'DELIVERY' ||
    booking?.status === 'UNDER_DELIVERY' ||
    deliveries?.length > 0
  );
  const isReadyOrCompleted = ['READY', 'UNDER_DELIVERY', 'COMPLETED', 'FINALIZED', 'PRINTING'].includes(booking?.status);

  if (!isDelivery && !isReadyOrCompleted && !deliveries?.length) return null;
  const s = styles;

  const rawDelStatus = (booking?.delivery_status || deliveries?.[0]?.status || 'PREPARING').toUpperCase();
  const subPhaseIndex =
    ['DELIVERED', 'CONFIRMED'].includes(rawDelStatus) ? 3 :
      ['NEAR', 'OUT_FOR_DELIVERY'].includes(rawDelStatus) ? 2 :
        ['DISPATCHED', 'ONGOING'].includes(rawDelStatus) ? 1 : 0;

  const SUB_PHASES = [
    { key: 'preparing delivery', title: 'preparing delivery', desc: 'Outputs packaged and sealed' },
    { key: 'ongoing delivery', title: 'ongoing delivery', desc: 'Courier transit in progress' },
    { key: 'delivery is near', title: 'delivery is near', desc: 'Courier arriving at destination' },
    { key: 'delivery confirmed', title: 'delivery confirmed', desc: 'Safely handed over and completed' },
  ];

  if (isDelivery) {
    return (
      <GlassCard highlight style={s.section}>
        <View style={s.sectionHeader}>
          <View style={s.sectionHeaderLeft}>
            <Truck size={17} color={colors.gold.DEFAULT} />
            <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Booking under delivery</Text>
          </View>
          <View style={[styles.categoryPill, { backgroundColor: colors.gold.bg, borderColor: colors.gold.borderLight }]}>
            <Text style={[styles.categoryPillText, { color: colors.gold.DEFAULT }]}>
              {SUB_PHASES[subPhaseIndex].title}
            </Text>
          </View>
        </View>

        {/* 4 Delivery Tracking Sub-Phases */}
        <View style={{ gap: 8, marginTop: 12, marginBottom: 8 }}>
          {SUB_PHASES.map((p, idx) => {
            const isDone = idx < subPhaseIndex;
            const isCurrent = idx === subPhaseIndex;
            return (
              <View
                key={p.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: isCurrent
                    ? (isDark ? 'rgba(217, 180, 108, 0.14)' : 'rgba(176, 125, 30, 0.10)')
                    : isDone
                      ? (isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)')
                      : 'transparent',
                  borderWidth: 1,
                  borderColor: isCurrent
                    ? colors.gold.borderLight
                    : isDone
                      ? 'rgba(16, 185, 129, 0.25)'
                      : colors.surface.hairline,
                }}
              >
                <View style={{ marginRight: 10 }}>
                  {isDone ? (
                    <CheckCircle2 size={16} color="#10B981" />
                  ) : isCurrent ? (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold.DEFAULT }} />
                  ) : (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text.muted }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      textTransform: 'capitalize',
                      color: isCurrent ? colors.gold.DEFAULT : isDone ? (isDark ? '#34D399' : '#059669') : colors.text.muted,
                    }}
                  >
                    {p.title}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.text.muted, marginTop: 1 }}>
                    {p.desc}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {booking?.delivery_address && (
          <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.surface.divider }}>
            <Text style={{ fontSize: 10, color: colors.text.muted, textTransform: 'uppercase', fontWeight: '700' }}>
              Delivery Destination
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.primary, marginTop: 2, fontWeight: '500' }}>
              {booking.delivery_address}
            </Text>
          </View>
        )}
      </GlassCard>
    );
  }

  // Studio Pickup
  return (
    <GlassCard highlight style={s.section}>
      <View style={s.sectionHeader}>
        <View style={s.sectionHeaderLeft}>
          <Package size={17} color={colors.gold.DEFAULT} />
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Booking ready to pick-up (studio)</Text>
        </View>
      </View>
      <View style={{ paddingVertical: 6 }}>
        <Text style={{ fontSize: 12, color: colors.text.secondary, lineHeight: 18 }}>
          Your physical portrait package and frames are packaged and awaiting pickup at the E-Kodak Studio reception counter.
        </Text>
        <Text style={{ fontSize: 11, color: colors.gold.light, marginTop: 6, fontWeight: '600' }}>
          📍 311 Rizal Street, City of Naga, Cebu · Present QR Studio Pass
        </Text>
      </View>
    </GlassCard>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function BookingTrackerScreen({ route, navigation }) {
  const { isDark, isSage, colors, gradients } = useTheme();
  const styles = getStyles(colors, isDark, isSage);
  const { booking: initialBooking, token: rawToken, initialMode } = route.params || {};
  const effectiveToken = rawToken || initialBooking?.booking_token || initialBooking?.booking_number || initialBooking?.id || '';

  const [booking, setBooking] = useState(initialBooking || {});
  const [refreshing, setRefreshing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [stepperOpen, setStepperOpen] = useState(true);
  const [trackerMode, setTrackerMode] = useState(initialMode || 'interactive'); // 'simple' | 'interactive'
  const [mascotAlert, setMascotAlert] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [timelineCardSize, setTimelineCardSize] = useState({ width: 0, height: 0 });

  // Scroll ref
  const scrollViewRef = useRef(null);

  // Studio flagship settings loaded directly from database
  const [studioSettings, setStudioSettings] = useState({
    address: '311 Rizal Street, City of Naga, Cebu',
    contact_phone: '+63 917 123 4567',
    contact_email: 'contact@e-kodak.com',
    business_hours: 'Mon – Sat: 8:00 AM – 6:00 PM | Sun: By Appointment',
  });

  // Load real database booking and studio settings on mount
  useEffect(() => {
    let active = true;
    async function loadData() {
      // Load real active booking if initial token is missing or points to stale 00007
      if (!booking?.id || booking?.booking_number === 'BK-2026-00007' || !booking.service) {
        const { data: realBk } = await fetchBookingByToken(effectiveToken || 'BK-2026-00001');
        if (realBk && active) {
          setBooking(realBk);
          saveBookingToken(realBk.booking_token || realBk.booking_number, realBk);
        }
      }

      // Fetch real studio settings from Supabase
      const { data: studio } = await fetchStudioSettings();
      if (studio && active) {
        setStudioSettings((prev) => ({ ...prev, ...studio }));
      }
    }
    loadData();
    return () => { active = false; };
  }, [effectiveToken]);

  // Real-time booking subscription
  useEffect(() => {
    checkIfSaved();
    if (!booking?.id) return;

    saveCustomerProfileFromBooking(booking);
    const unsubscribe = subscribeToBookingUpdates(booking.id, (updated) => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      } catch { }
      setBooking((prev) => ({ ...prev, ...updated }));
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [booking?.id]);

  const checkIfSaved = async () => {
    const saved = await getSavedBookings();
    const tokenToMatch = effectiveToken || booking?.booking_token || booking?.booking_number;
    setIsSaved(saved.some((b) => b.token === tokenToMatch || b.bookingNumber === (booking?.booking_number || 'BK-2026-00001')));
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const { data } = await fetchBookingByToken(effectiveToken || booking.booking_token || booking.booking_number || 'BK-2026-00001');
    if (data) {
      setBooking(data);
    }
    setRefreshing(false);
  }, [effectiveToken, booking.booking_token, booking.booking_number]);

  const toggleSave = async () => {
    try {
      await Haptics.selectionAsync().catch(() => { });
    } catch { }
    const tokenToSave = effectiveToken || booking.booking_token || booking.booking_number || 'BK-2026-00001';
    if (isSaved) {
      await removeSavedBooking(tokenToSave);
      setIsSaved(false);
      setMascotAlert({
        pose: 'inspect',
        message: 'Pass removed from your saved list.',
      });
    } else {
      await saveBookingToken(tokenToSave, booking);
      setIsSaved(true);
      setMascotAlert({
        pose: 'celebrate',
        message: 'Pass saved! You can now access it anytime.',
      });
    }
  };

  const handleBack = () => {
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    } catch {
      navigation.navigate('Home');
    }
  };

  // ── Derived display values (Real concrete records) ──────────
  const realBookingId = booking.booking_number || 'BK-2026-00001';
  const selectedPackageName =
    booking.services?.name ||
    booking.service?.name ||
    initialBooking?.serviceName ||
    'Studio Package';
  const selectedSetName = booking.tier_name || booking.parsed_notes?.['Set'] || 'Set A';
  const tierDetails = booking.tier_details;

  // Pricing calculation
  const rawPriceNum = Number(booking.total_price || booking.total_amount || 0);
  const priceDisplay = rawPriceNum > 0
    ? formatPeso(rawPriceNum)
    : (tierDetails?.price || '₱1,750.00');

  // Schedule status: If booking is still pending admin confirmation/broadcast, date & location are on preview
  const isOrderPending = !booking.status || String(booking.status).toUpperCase() === 'PENDING';
  const hasConfirmedRecord = !!(booking.session_date || booking.event_date) && !isOrderPending;

  const isScheduleTBA = !hasConfirmedRecord;
  const scheduleDisplay = isScheduleTBA
    ? 'To be announced'
    : `${formatDate(booking.session_date || booking.event_date)}${(booking.session_time || booking.preferred_time) ? ` · ${formatTime(booking.session_time || booking.preferred_time)}` : ''}`;
  const scheduleSub = isScheduleTBA
    ? 'Campus schedule · Awaiting admin schedule confirmation & broadcast'
    : 'Confirmed photoshoot schedule locked in';

  // Studio / Campus Shoot location:
  // As long as datas of it are not recorded/confirmed by admin, do not display confirmed shoot location
  const isLocationPending = isOrderPending || !hasConfirmedRecord;
  const rawLocation = booking.location_address || booking.location || '';
  const locationDisplay = isLocationPending
    ? 'Location Pending Admin Confirmation'
    : (rawLocation || 'E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu');
  const locationSub = isLocationPending
    ? (booking.parsed_notes?.['School'] ? `School preview: ${booking.parsed_notes['School']} (Shoot venue TBA)` : 'Reservation received · Official shoot venue will be announced upon admin broadcast')
    : 'Confirmed photoshoot venue';

  // Real student & participant data from notes (used in Studio Pass Modal)
  const studentName = booking.parsed_notes?.['Student Name'] || booking.parsed_notes?.['Participant Name'] || booking.profile?.full_name || 'Studio Client';

  // Milestone Progress (drives both summary card & perimeter border progress tracker)
  const normalizedStatus = String(booking.status || 'PENDING').toUpperCase();
  const statusMeta = STATUS_META[normalizedStatus] || STATUS_META.PENDING;
  const rawMilestoneStep = statusMeta?.step ?? 0;
  const totalSteps = MILESTONE_STEPS.length;
  const isTerminalNegative = rawMilestoneStep < 0;
  const completedStepsCount = isTerminalNegative
    ? 0
    : rawMilestoneStep >= totalSteps
      ? totalSteps
      : rawMilestoneStep === totalSteps - 1
        ? totalSteps - 1
        : rawMilestoneStep + 1;
  const progressRatio = isTerminalNegative
    ? 0
    : rawMilestoneStep >= totalSteps
      ? 1
      : rawMilestoneStep === totalSteps - 1
        ? (totalSteps - 0.5) / totalSteps
        : (rawMilestoneStep + 1) / totalSteps;
  const progressPct = Math.round(progressRatio * 100);
  const STATUS_PROGRESS_MESSAGES = {
    PENDING: 'Your order is now received',
    RESERVED: 'Your order is now received',
    CONFIRMED: 'Your booking is approved & reserved',
    PHOTOGRAPHER_ASSIGNED: 'Photographer assigned & slot reserved',
    CAPTURE: 'Your pictorial session is ongoing',
    IN_PROGRESS: 'Your pictorial session is ongoing',
    EDITING: 'Your portraits are now in editing',
    RETOUCHING: 'Fine-art retouching is now in progress',
    FINALIZED: 'Your prints & package are finalized',
    PRINTING: 'Your prints & package are finalized',
    READY: 'Your order is ready for studio pickup',
    UNDER_DELIVERY: 'Your order is now out for delivery',
    COMPLETED: 'Your order is now complete',
    CANCELLED: 'This booking has been cancelled',
    REJECTED: 'This booking request was declined',
  };
  const statusProgressMessage = STATUS_PROGRESS_MESSAGES[normalizedStatus] || 'Your order is now received';

  const handleMessageGmail = async () => {
    try {
      Haptics.selectionAsync().catch(() => { });
    } catch { }
    const studioEmail = studioSettings?.contact_email || 'contact@e-kodak.com';
    const subject = `Booking Inquiry #${realBookingId} — ${selectedPackageName}`;
    const body = [
      'Hello E-Kodak Studio Team,',
      '',
      'I would like to inquire regarding my booking:',
      `• Reference: #${realBookingId}`,
      `• Client: ${studentName}`,
      `• Package: ${selectedPackageName} (${selectedSetName})`,
      `• Current Status: ${statusMeta.label}`,
      '',
      'Message:',
      '',
    ].join('\n');
    const encSub = encodeURIComponent(subject);
    const encBody = encodeURIComponent(body);
    const encTo = encodeURIComponent(studioEmail);
    const gmailIosAppUrl = `googlegmail:///co?to=${encTo}&subject=${encSub}&body=${encBody}`;
    const mailtoUrl = `mailto:${studioEmail}?subject=${encSub}&body=${encBody}`;
    const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encTo}&su=${encSub}&body=${encBody}`;

    const candidates = Platform.OS === 'ios'
      ? [gmailIosAppUrl, mailtoUrl, gmailWebUrl]
      : Platform.OS === 'android'
        ? [mailtoUrl, gmailWebUrl]
        : [gmailWebUrl, mailtoUrl];

    for (const url of candidates) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // Try next URL scheme if this client is unavailable
      }
    }
  };

  const handleCallStudio = () => {
    try {
      Haptics.selectionAsync().catch(() => { });
    } catch { }
    const rawPhone = studioSettings?.contact_phone && studioSettings.contact_phone !== '+63 917 123 4567'
      ? studioSettings.contact_phone
      : '09102949414';
    const dialNumber = String(rawPhone).replace(/[^\d+]/g, '') || '09102949414';
    Linking.openURL(`tel:${dialNumber}`).catch(() => { });
  };
  const scenerySunX = Math.round(72 + (progressPct / 100) * 224);
  const scenerySunY = Math.round(56 - (progressPct / 100) * 28);
  const progressSceneryPalette = isTerminalNegative
    ? {
      baseBg: '#3A141C',
      skyTop: '#2E0F16',
      skyMid: '#6E2432',
      skyGlow: '#D67887',
      sunCore: '#FFE4E8',
      sunAura: '#F48A9B',
      hillFar: '#5D202C',
      hillMid: '#451620',
      hillNear: '#2D0D14',
      scrim: ['rgba(46, 15, 22, 0.74)', 'rgba(72, 24, 34, 0.34)', 'rgba(110, 36, 48, 0.08)'],
      borderColor: 'rgba(255, 196, 206, 0.34)',
    }
    : progressPct >= 100
      ? {
        baseBg: '#103626',
        skyTop: '#0B2E20',
        skyMid: '#1C6E4B',
        skyGlow: '#82E6B8',
        sunCore: '#EDFFF7',
        sunAura: '#6EE7B7',
        hillFar: '#256147',
        hillMid: '#174A35',
        hillNear: '#0D3323',
        scrim: ['rgba(12, 46, 31, 0.70)', 'rgba(18, 68, 46, 0.32)', 'rgba(30, 95, 65, 0.06)'],
        borderColor: 'rgba(155, 245, 205, 0.42)',
      }
      : isDark
        ? {
          baseBg: '#191D2A',
          skyTop: '#131724',
          skyMid: '#2D273B',
          skyGlow: '#BA8F49',
          sunCore: '#FFF1D2',
          sunAura: '#E5BA6D',
          hillFar: '#39324A',
          hillMid: '#252132',
          hillNear: '#151822',
          scrim: ['rgba(17, 20, 30, 0.76)', 'rgba(24, 27, 40, 0.36)', 'rgba(34, 36, 52, 0.08)'],
          borderColor: 'rgba(255, 255, 255, 0.24)',
        }
        : isSage
          ? {
            baseBg: '#3D4D37',
            skyTop: '#2E3E2B',
            skyMid: '#597250',
            skyGlow: '#DCE6CE',
            sunCore: '#FFF9E8',
            sunAura: '#E9D9AA',
            hillFar: '#6C8462',
            hillMid: '#4A6043',
            hillNear: '#2E4029',
            scrim: ['rgba(40, 54, 37, 0.68)', 'rgba(56, 74, 51, 0.30)', 'rgba(84, 105, 76, 0.06)'],
            borderColor: 'rgba(255, 255, 255, 0.32)',
          }
          : {
            baseBg: '#6E4C14',
            skyTop: '#563B10',
            skyMid: '#9B6E24',
            skyGlow: '#F6DFAC',
            sunCore: '#FFFDF5',
            sunAura: '#F5D28A',
            hillFar: '#8B6222',
            hillMid: '#684715',
            hillNear: '#452E0C',
            scrim: ['rgba(68, 46, 12, 0.70)', 'rgba(105, 72, 20, 0.32)', 'rgba(145, 102, 32, 0.06)'],
            borderColor: 'rgba(255, 255, 255, 0.32)',
          };

  const borderMetrics = (() => {
    const { width: w, height: h } = timelineCardSize;
    if (w <= 0 || h <= 0 || progressRatio <= 0) return null;
    const sw = 4.5;
    const inset = sw / 2;
    const pw = Math.max(0, w - sw);
    const ph = Math.max(0, h - sw);
    const pr = Math.max(0, Math.min(Radius['2xl'] - inset, pw / 2, ph / 2));
    const cx = w / 2;
    const y0 = inset;
    const d = [
      `M ${cx} ${y0}`,
      `L ${inset + pw - pr} ${inset}`,
      `A ${pr} ${pr} 0 0 1 ${inset + pw} ${inset + pr}`,
      `L ${inset + pw} ${inset + ph - pr}`,
      `A ${pr} ${pr} 0 0 1 ${inset + pw - pr} ${inset + ph}`,
      `L ${inset + pr} ${inset + ph}`,
      `A ${pr} ${pr} 0 0 1 ${inset} ${inset + ph - pr}`,
      `L ${inset} ${inset + pr}`,
      `A ${pr} ${pr} 0 0 1 ${inset + pr} ${inset}`,
      `L ${cx} ${y0}`,
      'Z',
    ].join(' ');
    const perimeter = 2 * Math.max(0, pw - 2 * pr) + 2 * Math.max(0, ph - 2 * pr) + 2 * Math.PI * pr;
    const dashOffset = Math.max(0, perimeter * (1 - progressRatio));
    return { w, h, sw, d, perimeter, dashOffset };
  })();

  const switchTrackerMode = (mode) => {
    if (mode === trackerMode) return;
    try {
      Haptics.selectionAsync().catch(() => { });
    } catch { }
    setTrackerMode(mode);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.base }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg.base} />

      {/* Ambient glass backdrop */}
      <GlassBackground />

      {/* ── Frosted Editorial Header ── */}
      <GlassHeader
        left={
          <PremiumIcon
            icon={ArrowLeft}
            size={20}
            box={40}
            tone="glass"
            accessibilityLabel="Go back"
            onPress={handleBack}
          />
        }
        right={
          <PremiumIcon
            icon={isSaved ? BookmarkCheck : Bookmark}
            size={20}
            box={40}
            tone={isSaved ? 'gold' : 'glass'}
            glow={isSaved}
            accessibilityLabel="Save pass"
            onPress={toggleSave}
          />
        }
      >
        <Text
          style={[styles.headerTitle, { color: colors.text.primary }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {selectedPackageName}
        </Text>
      </GlassHeader>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold.DEFAULT}
            colors={[colors.gold.DEFAULT]}
          />
        }
      >
        {/* Mascot Alert Overlay */}
        {mascotAlert && (
          <View style={styles.mascotAlertOverlay}>
            <StudioMascotKit
              pose={mascotAlert.pose}
              size={120}
              speechText={mascotAlert.message}
              interactive={false}
            />
            <TouchableOpacity
              style={[styles.mascotAlertCloseBtn, { borderColor: colors.gold.border }]}
              onPress={() => setMascotAlert(null)}
            >
              <Text style={[styles.mascotAlertCloseText, { color: colors.gold.DEFAULT }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Main Package Card (Selected Set + Pricing + Schedule & Venue) ── */}
        <GlassCard opaque glow highlight style={styles.heroCard}>
          <View style={styles.setHeroSection}>
            <Text style={[styles.microHeader, { color: colors.gold.DEFAULT }]}>
              YOUR SET
            </Text>
            <View style={styles.setRow}>
              <Text
                style={[styles.selectedSetTitle, { color: colors.text.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {selectedSetName}
              </Text>
              <Text
                style={[
                  styles.heroPriceValue,
                  { color: isDark ? colors.gold.light : colors.gold.DEFAULT },
                ]}
                numberOfLines={1}
              >
                {priceDisplay}
              </Text>
            </View>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.gold.border }]} />

          {/* Session Schedule & Locations (All DB-fetched) */}
          <View style={styles.metadataStack}>
            <View style={styles.metaRow}>
              <PremiumIcon
                icon={Calendar}
                size={16}
                box={38}
                tone="soft"
                iconColor={isDark ? colors.gold.light : colors.gold.DEFAULT}
                style={styles.metaIconOffset}
              />
              <View style={styles.metaTextCol}>
                <Text style={[styles.metaLabel, { color: colors.text.muted }]}>SESSION SCHEDULE</Text>
                <Text style={[styles.metaValue, { color: isScheduleTBA ? colors.gold.DEFAULT : colors.text.primary }]}>
                  {scheduleDisplay}
                </Text>
                {isScheduleTBA && (
                  <Text style={[styles.metaSubtext, { color: colors.text.muted }]}>
                    {scheduleSub}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.metaRow}>
              <PremiumIcon
                icon={MapPin}
                size={16}
                box={38}
                tone="soft"
                iconColor={isDark ? colors.gold.light : colors.gold.DEFAULT}
                style={styles.metaIconOffset}
              />
              <View style={styles.metaTextCol}>
                <Text style={[styles.metaLabel, { color: colors.text.muted }]}>CAMPUS / SHOOT LOCATION</Text>
                <Text style={[styles.metaValue, { color: isLocationPending ? colors.gold.DEFAULT : colors.text.primary }]}>
                  {locationDisplay}
                </Text>
                <Text style={[styles.metaSubtext, { color: colors.text.muted }]}>
                  {locationSub}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <PremiumIcon
                icon={Building2}
                size={16}
                box={38}
                tone="soft"
                iconColor={isDark ? colors.gold.light : colors.gold.DEFAULT}
                style={styles.metaIconOffset}
              />
              <View style={styles.metaTextCol}>
                <Text style={[styles.metaLabel, { color: colors.text.muted }]}>FLAGSHIP STUDIO</Text>
                <Text style={[styles.metaValue, { color: colors.text.primary }]}>
                  {studioSettings.address}
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* ── Studio Progress Timeline (Perimeter Edge Progress Tracker) ── */}
        <View
          style={styles.timelineCardWrap}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setTimelineCardSize((prev) =>
              Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
                ? prev
                : { width, height }
            );
          }}
        >
          <GlassCard opaque highlight style={styles.section}>
            <View style={styles.timelineHeader}>
              <TouchableOpacity
                style={styles.sectionHeaderTitleWrap}
                onPress={() => setStepperOpen(!stepperOpen)}
                activeOpacity={0.75}
              >
                <Text style={[styles.timelineKicker, { color: colors.gold.DEFAULT }]}>
                  CLIENT PORTAL
                </Text>
                <Text
                  style={[styles.timelineTitleMain, { color: colors.text.primary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  Studio Progress
                </Text>
                <Text
                  style={[
                    styles.timelineTitleAccent,
                    { color: isSage ? colors.accent.mint : isDark ? colors.gold.light : colors.gold.DEFAULT },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  Timeline
                </Text>
              </TouchableOpacity>

              <View style={styles.timelineHeaderActions}>
                <TouchableOpacity
                  style={styles.timelineCircleBtn}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync().catch(() => { });
                    } catch { }
                    onRefresh();
                  }}
                  activeOpacity={0.75}
                  accessibilityLabel="Refresh timeline"
                >
                  <RefreshCw size={15} color={colors.text.secondary} strokeWidth={2} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.timelineCircleBtn}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync().catch(() => { });
                    } catch { }
                    setStepperOpen(!stepperOpen);
                  }}
                  activeOpacity={0.75}
                  accessibilityLabel={stepperOpen ? 'Collapse timeline' : 'Expand timeline'}
                >
                  {stepperOpen ? (
                    <ChevronUp size={16} color={colors.text.secondary} strokeWidth={2.2} />
                  ) : (
                    <ChevronDown size={16} color={colors.text.secondary} strokeWidth={2.2} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {stepperOpen && (
              <View style={styles.segRow}>
                <TouchableOpacity
                  onPress={() => switchTrackerMode('simple')}
                  activeOpacity={0.85}
                  accessibilityLabel="List view"
                  style={[
                    styles.segBtn,
                    trackerMode === 'simple' && styles.segBtnActive,
                  ]}
                >
                  <List
                    size={15}
                    color={
                      trackerMode === 'simple'
                        ? colors.text.primary
                        : isDark
                          ? colors.text.secondary
                          : isSage
                            ? '#4F665B'
                            : '#6B5836'
                    }
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.segBtnText,
                      trackerMode === 'simple' && styles.segBtnTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    List view
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => switchTrackerMode('interactive')}
                  activeOpacity={0.85}
                  accessibilityLabel="Flow view"
                  style={[
                    styles.segBtn,
                    trackerMode === 'interactive' && styles.segBtnActive,
                  ]}
                >
                  <GitBranch
                    size={15}
                    color={
                      trackerMode === 'interactive'
                        ? colors.text.primary
                        : isDark
                          ? colors.text.secondary
                          : isSage
                            ? '#4F665B'
                            : '#6B5836'
                    }
                    strokeWidth={2.1}
                  />
                  <Text
                    style={[
                      styles.segBtnText,
                      trackerMode === 'interactive' && styles.segBtnTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    Flow view
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Frosted Scenery Progress Summary Card */}
            <View
              style={[
                styles.progressStatusCard,
                {
                  backgroundColor: progressSceneryPalette.baseBg,
                  borderColor: progressSceneryPalette.borderColor,
                },
                !stepperOpen && styles.progressStatusCardCollapsed,
              ]}
            >
              {/* Scenery backdrop reflecting real progress sun/horizon */}
              <Svg
                viewBox="0 0 360 132"
                preserveAspectRatio="xMidYMid slice"
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
              >
                <Defs>
                  <SvgLinearGradient id="progressSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={progressSceneryPalette.skyTop} />
                    <Stop offset="55%" stopColor={progressSceneryPalette.skyMid} />
                    <Stop offset="100%" stopColor={progressSceneryPalette.skyGlow} />
                  </SvgLinearGradient>
                  <RadialGradient
                    id="progressSunGlow"
                    cx={`${Math.round((scenerySunX / 360) * 100)}%`}
                    cy={`${Math.round((scenerySunY / 132) * 100)}%`}
                    r="46%"
                  >
                    <Stop offset="0%" stopColor={progressSceneryPalette.sunCore} stopOpacity="0.94" />
                    <Stop offset="36%" stopColor={progressSceneryPalette.sunAura} stopOpacity="0.54" />
                    <Stop offset="100%" stopColor={progressSceneryPalette.skyMid} stopOpacity="0" />
                  </RadialGradient>
                  <SvgLinearGradient id="progressMistGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                    <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.22" />
                  </SvgLinearGradient>
                </Defs>

                <Rect x="0" y="0" width="360" height="132" fill="url(#progressSkyGrad)" />
                <Circle cx={scenerySunX} cy={scenerySunY} r="84" fill="url(#progressSunGlow)" />
                <Circle
                  cx={scenerySunX}
                  cy={scenerySunY}
                  r="14"
                  fill={progressSceneryPalette.sunCore}
                  fillOpacity="0.74"
                />

                {/* Woodland lightbeams filtering through pines */}
                <Path
                  d={`M ${scenerySunX - 24} ${Math.max(8, scenerySunY - 12)} L ${scenerySunX + 24} ${Math.max(8, scenerySunY - 12)} L ${scenerySunX - 42} 132 L ${scenerySunX - 106} 132 Z`}
                  fill={progressSceneryPalette.sunCore}
                  fillOpacity="0.10"
                />

                {/* Soft forest sky bokeh */}
                <Circle cx="246" cy="24" r="8" fill={progressSceneryPalette.sunAura} fillOpacity="0.22" />
                <Circle cx="326" cy="46" r="6" fill="#FFFFFF" fillOpacity="0.20" />

                {/* Distant misty pine treeline */}
                {PROGRESS_FOREST_TREES.far.map(([cx, topY, baseY, hw], i) => (
                  <Path
                    key={`far-${i}`}
                    d={buildPineTreePath(cx, topY, baseY, hw)}
                    fill={progressSceneryPalette.hillFar}
                    fillOpacity="0.62"
                  />
                ))}
                <Path
                  d="M0 98 Q 90 88 184 96 T 360 88 L 360 132 L 0 132 Z"
                  fill={progressSceneryPalette.hillFar}
                  fillOpacity="0.55"
                />

                {/* Drifting woodland valley mist */}
                <Rect x="0" y="56" width="360" height="44" fill="url(#progressMistGrad)" />

                {/* Mid pine canopy silhouettes */}
                {PROGRESS_FOREST_TREES.mid.map(([cx, topY, baseY, hw], i) => (
                  <Path
                    key={`mid-${i}`}
                    d={buildPineTreePath(cx, topY, baseY, hw)}
                    fill={progressSceneryPalette.hillMid}
                    fillOpacity="0.82"
                  />
                ))}
                <Path
                  d="M0 112 Q 110 100 220 108 T 360 96 L 360 132 L 0 132 Z"
                  fill={progressSceneryPalette.hillMid}
                  fillOpacity="0.84"
                />

                {/* Foreground framing pines & forest floor */}
                {PROGRESS_FOREST_TREES.near.map(([cx, topY, baseY, hw], i) => (
                  <Path
                    key={`near-${i}`}
                    d={buildPineTreePath(cx, topY, baseY, hw)}
                    fill={progressSceneryPalette.hillNear}
                    fillOpacity="0.96"
                  />
                ))}
                <Path
                  d="M0 120 Q 120 112 240 116 T 360 108 L 360 132 L 0 132 Z"
                  fill={progressSceneryPalette.hillNear}
                  fillOpacity="0.98"
                />
              </Svg>

              {/* Frosted glass blur + gradual contrast veil */}
              {Platform.OS === 'ios' && (
                <BlurView
                  intensity={24}
                  tint={isDark ? 'dark' : 'light'}
                  pointerEvents="none"
                  style={StyleSheet.absoluteFill}
                />
              )}
              <LinearGradient
                colors={progressSceneryPalette.scrim}
                start={{ x: 0, y: 0.2 }}
                end={{ x: 1, y: 0.8 }}
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.28)', 'rgba(255, 255, 255, 0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                pointerEvents="none"
                style={styles.progressFrostSheen}
              />

              <View style={styles.progressCardTopRow}>
                <View style={styles.progressCountWrap}>
                  <View style={styles.progressHeadlineRow}>
                    <Text style={styles.progressCountNum}>
                      {completedStepsCount}
                    </Text>
                    <Text style={styles.progressCountOf}>
                      {' '}of {totalSteps} complete
                    </Text>
                  </View>
                  <Text style={styles.progressStatusDesc} numberOfLines={2}>
                    {statusProgressMessage}
                  </Text>
                </View>

                <View
                  style={[
                    styles.progressPctPill,
                    isTerminalNegative && {
                      backgroundColor: 'rgba(224, 71, 90, 0.30)',
                      borderColor: 'rgba(255, 175, 185, 0.48)',
                    },
                  ]}
                >
                  <Text style={styles.progressPctText}>
                    {progressPct}%
                  </Text>
                </View>
              </View>

              <View style={styles.progressBarTrack}>
                {progressPct > 0 && (
                  <LinearGradient
                    colors={
                      isTerminalNegative
                        ? ['#FDA4AF', '#E11D48']
                        : ['#9CF7CD', '#FFFFFF']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${progressPct}%` }]}
                  />
                )}
              </View>
            </View>

            {stepperOpen && (
              trackerMode === 'simple' ? (
                <MilestoneStepper status={booking.status} booking={booking} />
              ) : (
                <InteractiveTracker status={booking.status} booking={booking} />
              )
            )}
          </GlassCard>

          {borderMetrics && (
            <Svg
              width={borderMetrics.w}
              height={borderMetrics.h}
              pointerEvents="none"
              style={styles.timelineBorderSvg}
            >
              <Defs>
                <SvgLinearGradient id="timelineBorderProgressGrad" x1="50%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={colors.accent.mint} />
                  <Stop offset="100%" stopColor={colors.gold.DEFAULT} />
                </SvgLinearGradient>
              </Defs>
              {/* Soft outer highlight along completed border segment */}
              <Path
                d={borderMetrics.d}
                fill="none"
                stroke={progressRatio >= 1 ? colors.accent.mint : colors.gold.DEFAULT}
                strokeWidth={borderMetrics.sw + 3}
                strokeOpacity={isDark ? 0.22 : 0.16}
                strokeDasharray={`${borderMetrics.perimeter} ${borderMetrics.perimeter}`}
                strokeDashoffset={borderMetrics.dashOffset}
                strokeLinecap="round"
              />
              {/* Crisp glowing edge progress line */}
              <Path
                d={borderMetrics.d}
                fill="none"
                stroke={progressRatio >= 1 ? colors.accent.mint : 'url(#timelineBorderProgressGrad)'}
                strokeWidth={borderMetrics.sw}
                strokeDasharray={`${borderMetrics.perimeter} ${borderMetrics.perimeter}`}
                strokeDashoffset={borderMetrics.dashOffset}
                strokeLinecap="round"
              />
            </Svg>
          )}
        </View>

        {/* ── Studio Bay Check-In & Assistance ── */}
        <GlassCard opaque highlight style={styles.assistanceCard}>
          <View style={styles.assistanceHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.assistanceTitle, { color: colors.text.primary }]}>
                Studio Bay Check-In & Assistance
              </Text>
              <Text style={[styles.assistanceSubtitle, { color: colors.text.secondary }]}>
                Message E-Kodak directly via Gmail or call the studio bay.
              </Text>
            </View>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.dockActionBtn,
                {
                  backgroundColor: isDark ? '#252118' : isSage ? '#E9EFE6' : '#FBF4E5',
                  borderColor: colors.gold.DEFAULT,
                  borderBottomColor: isDark ? 'rgba(0, 0, 0, 0.50)' : isSage ? '#58694B' : '#966A17',
                },
              ]}
              onPress={handleMessageGmail}
              accessibilityLabel="Message E-Kodak via Gmail"
            >
              <Mail size={17} color={isDark ? colors.gold.light : colors.gold.dark} strokeWidth={2.1} />
              <Text
                style={[styles.dockActionBtnText, { color: isDark ? colors.gold.light : colors.text.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Message Gmail
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.dockActionBtn,
                {
                  backgroundColor: isDark ? '#212735' : '#F6F8F7',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#D5E0D9',
                  borderBottomColor: isDark ? 'rgba(0, 0, 0, 0.50)' : '#BFCFC5',
                },
              ]}
              onPress={handleCallStudio}
              accessibilityLabel="Call Studio Bay"
            >
              <Phone size={17} color={isDark ? colors.accent.mint : '#2F6F52'} strokeWidth={2.1} />
              <Text
                style={[styles.dockActionBtnText, { color: colors.text.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Call Studio Bay
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* ── Delivery & Prints Panel ── */}
        <DeliveryPanel booking={booking} deliveries={booking.booking_deliveries} colors={colors} isDark={isDark} styles={styles} />

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Digital Studio Pass Modal ── */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          {Platform.OS === 'ios' && (
            <BlurView intensity={isDark ? 65 : 45} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          )}
          <GlassCard opaque blurred={false} glow highlight style={styles.qrPassModalCard}>
            <View style={styles.modalTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalPassTag, { color: colors.gold.DEFAULT }]}>OFFICIAL RECEPTION PASS</Text>
                <Text style={[styles.modalPassId, { color: colors.text.primary }]}>#{realBookingId}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQRModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <X size={20} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.gold.border }]} />

            {/* QR Pass Box */}
            <View style={styles.qrVisualContainer}>
              <View style={[styles.qrVisualBox, { borderColor: colors.gold.borderLight }]}>
                <QrCode size={130} color="#17130C" />
              </View>
              <Text style={[styles.qrVisualCaption, { color: colors.text.secondary }]}>
                Hold under the studio counter scanner upon arrival
              </Text>
            </View>

            <View style={styles.modalMetaBox}>
              <Text style={[styles.modalMetaLine, { color: colors.text.primary }]}>
                Student: {studentName}
              </Text>
              <Text style={[styles.modalMetaLine, { color: colors.text.secondary }]}>
                {selectedSetName} · {selectedPackageName}
              </Text>
              <Text style={[styles.modalMetaLine, { color: colors.gold.light }]}>
                {scheduleDisplay}
              </Text>
            </View>

            <GoldButton size="sm" onPress={() => setShowQRModal(false)} style={{ marginTop: Spacing[4] }}>
              Done
            </GoldButton>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const stylesLocal = StyleSheet.create({
  radarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  beaconCore: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 6,
    shadowOpacity: 0.85,
    elevation: 4,
  },
  beaconCatchlight: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },

  // Luxury Status Pill
  statusPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 7,
  },
  statusBeaconWrap: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBeaconAura: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  statusBeaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabelText: {
    fontFamily: Typography.fontBodyBold,
    letterSpacing: 1.1,
  },
  statusStepPill: {
    paddingVertical: 1.5,
    paddingHorizontal: 5.5,
    borderRadius: 5,
    marginLeft: 2,
  },
  statusStepText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 8,
    letterSpacing: 0.8,
  },
});

const getStyles = (colors, isDark, isSage) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },

  headerTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: colors.text.primary,
  },
  headerSub: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: 3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Open Dossier Button
  openDossierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: 2,
  },
  openDossierLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  openDossierTitle: {
    fontFamily: Typography.fontBodyBold,
    fontSize: Typography.size.sm,
    letterSpacing: 0.2,
  },
  openDossierSub: {
    fontFamily: Typography.fontBody,
    fontSize: 10.5,
    marginTop: 1,
  },

  // Dedicated Dossier Section Card
  dossierSectionCard: {
    padding: Spacing[5],
    borderRadius: Radius['2xl'],
    marginTop: Spacing[3],
  },
  dossierSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dossierHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dossierIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dossierSectionTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  dossierSectionSub: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  dossierCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioInfoBox: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    padding: Spacing[3],
    borderRadius: Radius.md,
    gap: 6,
    marginTop: 4,
  },
  studioInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  scroll: { flex: 1, zIndex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[1],
    gap: Spacing[3] + 2,
  },

  // Hero Package Card
  heroCard: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4] + 2,
    borderRadius: Radius['2xl'],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginBottom: 4,
  },
  categoryPillText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 9.5,
    letterSpacing: 1.2,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing[3] + 2,
    opacity: 0.55,
  },

  // Selected Set Hero
  setHeroSection: {
    gap: 5,
  },
  microHeader: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 10.5,
    letterSpacing: 1.35,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  selectedSetTitle: {
    flexShrink: 1,
    fontFamily: Typography.fontHeading,
    fontSize: 33,
    lineHeight: 38,
    letterSpacing: -0.2,
  },
  heroPriceValue: {
    fontFamily: Typography.fontHeading,
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: -0.3,
    textAlign: 'right',
  },
  packageNameText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs + 1,
    letterSpacing: 0.3,
    marginTop: 1,
  },

  // Metadata Stack
  metadataStack: {
    gap: Spacing[3] + 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  metaIconOffset: {
    marginTop: 1,
  },
  metaTextCol: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 9.5,
    letterSpacing: 1.05,
  },
  metaValue: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.sm,
    lineHeight: 19,
  },
  metaSubtext: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 1,
  },

  // Details Block
  detailsBlock: {
    gap: 8,
  },
  dossierGrid: {
    gap: 7,
  },
  dossierItem: {
    gap: 1,
  },
  dossierItemLabel: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 8.5,
    letterSpacing: 1,
  },
  dossierItemValue: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs + 1,
    lineHeight: 18,
  },
  inclusionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  inclusionChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: Radius.md,
    borderWidth: 1,
    maxWidth: '100%',
  },
  inclusionText: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    lineHeight: 16,
    flexShrink: 1,
  },

  // Timeline section
  timelineCardWrap: {
    position: 'relative',
  },
  timelineBorderSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 6,
  },
  section: {
    padding: Spacing[5],
    borderRadius: Radius['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderTitleWrap: {
    flex: 1,
    paddingRight: 4,
  },
  timelineKicker: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 10.5,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  timelineTitleMain: {
    fontFamily: Typography.fontHeading,
    fontSize: 25,
    lineHeight: 29,
    letterSpacing: -0.3,
  },
  timelineTitleAccent: {
    fontFamily: Typography.fontHeading,
    fontSize: 25,
    lineHeight: 29,
    letterSpacing: -0.3,
  },
  timelineHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  timelineCircleBtn: {
    width: 39,
    height: 39,
    borderRadius: 19.5,
    borderWidth: 1,
    borderBottomWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#232938' : isSage ? '#F6F9F7' : '#FAF7F1',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : isSage ? '#D5E0D9' : '#E4DAC7',
    borderBottomColor: isDark ? 'rgba(0, 0, 0, 0.45)' : isSage ? '#BFCFC5' : '#CBBBA0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.25 : 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
  },
  segRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: isDark ? '#1A1D28' : isSage ? '#DCE8DF' : '#EFE9DD',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(217, 180, 108, 0.16)' : isSage ? '#CEE0D5' : '#DFD4BF',
    padding: 4,
    marginTop: Spacing[4],
    marginBottom: Spacing[4],
    gap: 4,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segBtnActive: {
    backgroundColor: isDark ? '#242938' : '#FFFFFF',
    borderColor: isDark ? 'rgba(217, 180, 108, 0.28)' : isSage ? '#D3E2D8' : '#DFD4BF',
    borderBottomWidth: 1.5,
    borderBottomColor: isDark ? 'rgba(0, 0, 0, 0.48)' : isSage ? '#BACFC2' : '#C5B495',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.24 : 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  segBtnText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 13,
    color: isDark ? colors.text.secondary : isSage ? '#4F665B' : '#6B5836',
  },
  segBtnTextActive: {
    fontFamily: Typography.fontBodySemi,
    color: colors.text.primary,
  },
  progressStatusCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 19,
    paddingHorizontal: 19,
    marginBottom: Spacing[5],
    gap: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.30 : 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  progressFrostSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 26,
  },
  progressStatusCardCollapsed: {
    marginTop: Spacing[4],
    marginBottom: 0,
  },
  progressCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressCountWrap: {
    flex: 1,
    gap: 4,
  },
  progressHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressCountNum: {
    fontFamily: Typography.fontHeading,
    fontSize: 29,
    lineHeight: 33,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  progressCountOf: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 17,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.88)',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressStatusDesc: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 14,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.92)',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressPctPill: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderColor: 'rgba(255, 255, 255, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPctText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 15.5,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 0.75,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
    minWidth: 10,
  },

  // Assistance Dock
  assistanceCard: {
    padding: Spacing[5],
    borderRadius: Radius['2xl'],
    gap: 12,
  },
  assistanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assistanceTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    letterSpacing: 0.2,
  },
  assistanceSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dockActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1.2,
    borderBottomWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.24 : 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  dockActionBtnText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },

  // Delivery
  deliveryRow: {
    borderTopWidth: 1,
    borderTopColor: colors.gold.border,
    paddingTop: Spacing[3],
    marginTop: Spacing[2],
    gap: 3,
  },
  deliveryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryType: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.sm,
    color: colors.gold.light,
    textTransform: 'uppercase',
  },
  deliveryStatus: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.xs,
  },
  tracking: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
  },
  digitalExpiry: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
  },

  mascotAlertOverlay: {
    padding: Spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
  },
  mascotAlertCloseBtn: {
    marginTop: Spacing[4],
    paddingVertical: 8,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  mascotAlertCloseText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.sm,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 10, 14, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[5],
  },
  qrPassModalCard: {
    width: '100%',
    maxWidth: 360,
    padding: Spacing[5],
    borderRadius: Radius['2xl'],
  },
  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  modalPassTag: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 9.5,
    letterSpacing: 1.2,
  },
  modalPassId: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    marginTop: 2,
  },
  qrVisualContainer: {
    alignItems: 'center',
    marginVertical: Spacing[2],
    gap: 8,
  },
  qrVisualBox: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
  },
  qrVisualCaption: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 15,
  },
  modalMetaBox: {
    backgroundColor: 'rgba(127,127,140,0.08)',
    padding: Spacing[3],
    borderRadius: Radius.md,
    gap: 3,
    marginTop: 4,
  },
  modalMetaLine: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11.5,
  },
});
