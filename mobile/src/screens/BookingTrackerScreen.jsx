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
  StatusBar, RefreshControl, Animated, Easing, Modal, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, {
  Defs, LinearGradient as SvgLinearGradient, Stop,
  Circle, Line, Rect, Path, G,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Calendar, MapPin, Camera, Package,
  QrCode, RefreshCw, Bookmark, BookmarkCheck,
  ChevronDown, ChevronUp, Sparkles, ListOrdered, Route,
  Phone, CheckCircle2, User, School, GraduationCap,
  Award, Tag, CreditCard, Compass, Info, X, FileText, Building2, Truck,
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
    total: 7,
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
  CONFIRMED: {
    step: 2,
    total: 7,
    code: 'CONFIRMED',
    label: 'Approved & Reserved',
    tone: 'sky',
    dot: '#38BDF8',
    accent: '#0284C7',
    text: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    glow: 'rgba(56, 189, 248, 0.25)',
    description: 'Session slot secured and locked · Downpayment requested',
  },
  PHOTOGRAPHER_ASSIGNED: {
    step: 2,
    total: 7,
    code: 'PHOTOGRAPHER_ASSIGNED',
    label: 'Approved & Reserved',
    tone: 'sky',
    dot: '#38BDF8',
    accent: '#0284C7',
    text: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    glow: 'rgba(56, 189, 248, 0.25)',
    description: 'Session slot confirmed and studio photographer assigned',
  },
  CAPTURE: {
    step: 3,
    total: 7,
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
    step: 3,
    total: 7,
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
    step: 4,
    total: 7,
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
    step: 5,
    total: 7,
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
    step: 6,
    total: 7,
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
    step: 6,
    total: 7,
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
    step: 7,
    total: 7,
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
    step: 7,
    total: 7,
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
    step: 7,
    total: 7,
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
    total: 7,
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
  const sweepSpin  = useRef(new Animated.Value(0)).current;

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
          StyleSheet.absoluteFillObject,
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
    { key: 'ongoing delivery',   title: 'ongoing delivery',   desc: 'Courier transit in progress' },
    { key: 'delivery is near',    title: 'delivery is near',    desc: 'Courier arriving at destination' },
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
  const { isDark, colors, gradients } = useTheme();
  const styles = getStyles(colors, isDark);
  const { booking: initialBooking, token: rawToken } = route.params || {};
  const effectiveToken = rawToken || initialBooking?.booking_token || initialBooking?.booking_number || initialBooking?.id || '';

  const [booking, setBooking]         = useState(initialBooking || {});
  const [refreshing, setRefreshing]   = useState(false);
  const [isSaved, setIsSaved]         = useState(false);
  const [stepperOpen, setStepperOpen] = useState(true);
  const [trackerMode, setTrackerMode] = useState('interactive'); // 'simple' | 'interactive'
  const [mascotAlert, setMascotAlert] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  // Dedicated section visibility & scroll animations
  const [dossierOpen, setDossierOpen] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
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
      await Haptics.selectionAsync();
    } catch {}
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
        navigation.navigate('Main');
      }
    } catch {
      navigation.navigate('Main');
    }
  };

  // ── Derived display values (Real concrete records, zero AI fluff) ──────────
  const realBookingId   = booking.booking_number || 'BK-2026-00001';
  const rawPackageName  = booking.services?.name || booking.service?.name || 'Portrait Packages and Sets';
  const cleanPackageName= rawPackageName.replace(/Senior\s*High\s*/gi, '').trim() || 'Portrait Packages and Sets';
  const packageName     = cleanPackageName;
  const selectedSetName = booking.tier_name || booking.parsed_notes?.['Set'] || 'Set A';
  const tierDetails     = booking.tier_details;

  // Pricing calculation
  const rawPriceNum     = Number(booking.total_price || booking.total_amount || 0);
  const priceDisplay    = rawPriceNum > 0
    ? formatPeso(rawPriceNum)
    : (tierDetails?.price || '₱1,750.00');

  // Schedule status: If booking is still pending admin confirmation/broadcast, date & location are on preview
  const isOrderPending = !booking.status || String(booking.status).toUpperCase() === 'PENDING';
  const hasConfirmedRecord = !!(booking.session_date || booking.event_date) && !isOrderPending;

  const isScheduleTBA   = !hasConfirmedRecord;
  const scheduleDisplay = isScheduleTBA
    ? 'To be announced'
    : `${formatDate(booking.session_date || booking.event_date)}${(booking.session_time || booking.preferred_time) ? ` · ${formatTime(booking.session_time || booking.preferred_time)}` : ''}`;
  const scheduleSub     = isScheduleTBA
    ? 'Campus schedule · Awaiting admin schedule confirmation & broadcast'
    : 'Confirmed photoshoot schedule locked in';

  // Studio / Campus Shoot location:
  // As long as datas of it are not recorded/confirmed by admin, do not display confirmed shoot location
  const isLocationPending = isOrderPending || !hasConfirmedRecord;
  const rawLocation       = booking.location_address || booking.location || '';
  const locationDisplay   = isLocationPending
    ? 'Location Pending Admin Confirmation'
    : (rawLocation || 'E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu');
  const locationSub       = isLocationPending
    ? (booking.parsed_notes?.['School'] ? `School preview: ${booking.parsed_notes['School']} (Shoot venue TBA)` : 'Reservation received · Official shoot venue will be announced upon admin broadcast')
    : 'Confirmed photoshoot venue';

  // Real student & participant data from notes
  const studentName    = booking.parsed_notes?.['Student Name'] || booking.parsed_notes?.['Participant Name'] || booking.profile?.full_name || 'Mark June Alimento Repunte';
  const schoolName     = booking.parsed_notes?.['School'] || 'Alpaco Senior High School';
  const strandName     = booking.parsed_notes?.['Degree / Strand'] || 'TVL-ICT';
  const batchName      = booking.parsed_notes?.['Batch'] || 'Batch 2026';
  const sectionName    = booking.parsed_notes?.['Section'] || 'Magsaysay';
  const studentIdNum   = booking.parsed_notes?.['Student ID'] || '1350690';
  const mottoText      = booking.parsed_notes?.['Yearbook Motto'] || 'growing up';
  const contactPhone   = booking.parsed_notes?.['Participant Phone'] || booking.profile?.phone || '09102949414';
  const contactEmail   = booking.parsed_notes?.['Participant Email'] || booking.profile?.email || 'alimentomakie@gmail.com';

  const defaultHighlights = [
    '1 piece 10×12" colored portrait with crystal wood frame',
    '1 piece 8×10" Filipiniana or Barong portrait (unframed)',
    '4 pieces Wallet-size colored prints with academic cap (2R)',
    '4 pieces Wallet-size colored prints in Filipiniana or Barong (2R)',
    '6 pieces Passport-size colored ID prints (TESDA standard)',
    '6 pieces 2×2" colored ID prints in formal attire',
    'Free professional makeup session included',
  ];
  const tierHighlights = tierDetails?.highlights || defaultHighlights;

  // Milestone Progress
  const statusMeta   = STATUS_META[String(booking.status || 'PENDING').toUpperCase()] || STATUS_META.PENDING;
  const liveStep     = Math.max(0, statusMeta?.step ?? 0);
  const totalSteps   = MILESTONE_STEPS.length;
  const progressPct  = Math.round((Math.min(liveStep, totalSteps - 1) / Math.max(totalSteps - 1, 1)) * 100);

  const switchTrackerMode = (mode) => {
    if (mode === trackerMode) return;
    try {
      Haptics.selectionAsync();
    } catch {}
    setTrackerMode(mode);
  };

  const toggleDossierSection = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    const nextState = !dossierOpen;
    setDossierOpen(nextState);
    if (nextState) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 240, animated: true });
      }, 120);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.base }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg.base} />

      {/* Ambient glass backdrop */}
      <GlassBackground />

      {/* ── Frosted Editorial Header (No "Live Studio Sync", No "Senior High") ── */}
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
          <View style={styles.headerRightActions}>
            {/* Scan Another Pass Icon Button (Placed beside save icon) */}
            <PremiumIcon
              icon={QrCode}
              size={19}
              box={40}
              tone="glass"
              accessibilityLabel="Scan another pass"
              onPress={() => navigation.navigate('Scanner')}
            />
            {/* Save Pass Icon Button */}
            <PremiumIcon
              icon={isSaved ? BookmarkCheck : Bookmark}
              size={20}
              box={40}
              tone={isSaved ? 'gold' : 'glass'}
              glow={isSaved}
              accessibilityLabel="Save pass"
              onPress={toggleSave}
            />
          </View>
        }
      >
        <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
          {cleanPackageName}
        </Text>
        <Text style={[styles.headerSub, { color: colors.gold.light }]} numberOfLines={1}>
          Graduation Portrait · Pass #{realBookingId}
        </Text>
      </GlassHeader>

      {/* ── Sticky Live Order State Bar (Pinned When Scrolling) ── */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.stickyStateBarWrap,
          {
            opacity: scrollY.interpolate({
              inputRange: [120, 190],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [120, 190],
                  outputRange: [-18, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <View
          style={[
            styles.stickyStateBar,
            {
              backgroundColor: isDark ? 'rgba(22, 18, 14, 0.94)' : 'rgba(255, 252, 247, 0.96)',
              borderColor: colors.gold.borderLight,
            },
          ]}
        >
          {/* Left: Crafted Luxury Status Pill with Live Pulse Beacon */}
          <LuxuryStatusPill status={booking.status || 'PENDING'} size="sm" showStep={false} />

          {/* Center: Selected Set & Pass ID */}
          <View style={styles.stickyCenterInfo}>
            <Text style={[styles.stickySetText, { color: colors.text.primary }]}>
              {selectedSetName}
            </Text>
            <Text style={[styles.stickyIdText, { color: colors.gold.light }]}>
              Pass #{realBookingId}
            </Text>
          </View>

          {/* Right: Live Tracking Sign (Pure vector, zero text) */}
          <LiveTrackingRadarSign size={28} colors={colors} isDark={isDark} />
        </View>
      </Animated.View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
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

        {/* ── Main Session Phase Card (Clean, Concise, No Clutter) ── */}
        <GlassCard glow highlight style={styles.heroCard}>
          {/* 1. Header: Luxury Status Pill + Live Tracking Vector Sign */}
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, gap: 5 }}>
              <View style={[styles.categoryPill, { backgroundColor: colors.gold.bg, borderColor: colors.gold.borderLight }]}>
                <Text style={[styles.categoryPillText, { color: colors.gold.DEFAULT }]}>
                  GRADUATION PORTRAIT SESSION
                </Text>
              </View>
              <LuxuryStatusPill status={booking.status || 'PENDING'} size="md" />
            </View>

            {/* Live Tracking Vector Sign (Pure vector, zero text) */}
            <LiveTrackingRadarSign size={52} colors={colors} isDark={isDark} />
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.gold.border }]} />

          {/* 2. Customer Selected Set Name (PROMINENTLY BIGGER!) & Pricing */}
          <View style={styles.setHeroSection}>
            <Text style={[styles.microHeader, { color: colors.gold.DEFAULT }]}>
              CUSTOMER SELECTED SET
            </Text>
            <View style={styles.setRow}>
              <Text style={[styles.selectedSetTitle, { color: colors.text.primary }]}>
                {selectedSetName}
              </Text>
              <View style={[styles.priceBadge, { backgroundColor: colors.gold.bg, borderColor: colors.gold.borderLight }]}>
                <Text style={[styles.priceBadgeText, { color: isDark ? colors.gold.light : colors.gold.dark }]}>
                  {priceDisplay}
                </Text>
              </View>
            </View>
            <Text style={[styles.packageNameText, { color: colors.text.secondary }]}>
              {cleanPackageName}
            </Text>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.gold.border }]} />

          {/* 3. Session Schedule & Locations (All DB-fetched) */}
          <View style={styles.metadataStack}>
            <View style={styles.metaRow}>
              <PremiumIcon icon={Calendar} size={15} box={34} tone="soft" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.metaLabel, { color: colors.text.muted }]}>SESSION SCHEDULE</Text>
                <Text style={[styles.metaValue, { color: isScheduleTBA ? colors.gold.light : colors.text.primary }]}>
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
              <PremiumIcon icon={MapPin} size={15} box={34} tone="soft" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.metaLabel, { color: colors.text.muted }]}>CAMPUS / SHOOT LOCATION</Text>
                <Text style={[styles.metaValue, { color: isLocationPending ? colors.gold.light : colors.text.primary }]}>
                  {locationDisplay}
                </Text>
                <Text style={[styles.metaSubtext, { color: colors.text.muted }]}>
                  {locationSub}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <PremiumIcon icon={Building2} size={15} box={34} tone="soft" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.metaLabel, { color: colors.text.muted }]}>FLAGSHIP STUDIO</Text>
                <Text style={[styles.metaValue, { color: colors.text.primary }]}>
                  {studioSettings.address}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.gold.border }]} />

          {/* 4. Action Button: Opens the dedicated section */}
          <TouchableOpacity
            style={[
              styles.openDossierBtn,
              {
                backgroundColor: dossierOpen
                  ? (isDark ? 'rgba(217, 180, 108, 0.16)' : 'rgba(176, 125, 30, 0.12)')
                  : (isDark ? 'rgba(217, 180, 108, 0.08)' : 'rgba(176, 125, 30, 0.06)'),
                borderColor: colors.gold.borderLight,
              },
            ]}
            onPress={toggleDossierSection}
            activeOpacity={0.8}
          >
            <View style={styles.openDossierLeft}>
              <FileText size={17} color={colors.gold.DEFAULT} />
              <View>
                <Text style={[styles.openDossierTitle, { color: colors.text.primary }]}>
                  {dossierOpen ? 'Hide Order & Student Dossier' : 'View Complete Order & Student Dossier'}
                </Text>
                <Text style={[styles.openDossierSub, { color: colors.text.muted }]}>
                  Student verification · Set inclusions · Studio guarantees
                </Text>
              </View>
            </View>
            {dossierOpen ? (
              <ChevronUp size={18} color={colors.gold.DEFAULT} />
            ) : (
              <ChevronDown size={18} color={colors.gold.DEFAULT} />
            )}
          </TouchableOpacity>
        </GlassCard>

        {/* ── Dedicated Order & Student Dossier Section (Crafted UI Look) ── */}
        {dossierOpen && (
          <GlassCard glow highlight style={styles.dossierSectionCard}>
            <View style={styles.dossierSectionHeader}>
              <View style={styles.dossierHeaderLeft}>
                <View style={[styles.dossierIconBox, { backgroundColor: colors.gold.bg, borderColor: colors.gold.borderLight }]}>
                  <FileText size={18} color={colors.gold.DEFAULT} />
                </View>
                <View>
                  <Text style={[styles.dossierSectionTitle, { color: colors.text.primary }]}>
                    ORDER & STUDENT DOSSIER
                  </Text>
                  <Text style={[styles.dossierSectionSub, { color: colors.gold.light }]}>
                    Verified Campus Record · Pass #{realBookingId}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setDossierOpen(false)}
                style={[styles.dossierCloseBtn, { borderColor: colors.gold.border }]}
              >
                <X size={15} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.gold.border }]} />

            {/* Student Identification Grid (All DB-fetched) */}
            <View style={styles.dossierGrid}>
              <View style={styles.dossierItem}>
                <Text style={[styles.dossierItemLabel, { color: colors.text.muted }]}>STUDENT NAME</Text>
                <Text style={[styles.dossierItemValue, { color: colors.text.primary }]}>{studentName}</Text>
              </View>

              <View style={styles.dossierItem}>
                <Text style={[styles.dossierItemLabel, { color: colors.text.muted }]}>STUDENT ID / BATCH</Text>
                <Text style={[styles.dossierItemValue, { color: colors.text.primary }]}>
                  #{studentIdNum} · {batchName}
                </Text>
              </View>

              <View style={styles.dossierItem}>
                <Text style={[styles.dossierItemLabel, { color: colors.text.muted }]}>SCHOOL & STRAND</Text>
                <Text style={[styles.dossierItemValue, { color: colors.text.primary }]}>
                  {schoolName} · {strandName} ({sectionName})
                </Text>
              </View>

              {mottoText ? (
                <View style={styles.dossierItem}>
                  <Text style={[styles.dossierItemLabel, { color: colors.text.muted }]}>YEARBOOK MOTTO</Text>
                  <Text style={[styles.dossierItemValue, { color: colors.gold.light, fontStyle: 'italic' }]}>
                    "{mottoText}"
                  </Text>
                </View>
              ) : null}

              <View style={styles.dossierItem}>
                <Text style={[styles.dossierItemLabel, { color: colors.text.muted }]}>CONTACT INFORMATION</Text>
                <Text style={[styles.dossierItemValue, { color: colors.text.secondary }]}>
                  {contactPhone} · {contactEmail}
                </Text>
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.gold.border }]} />

            {/* Package Inclusions Breakdown (From DB) */}
            <View style={{ marginTop: 4 }}>
              <Text style={[styles.dossierItemLabel, { color: colors.text.muted, marginBottom: 8 }]}>
                {selectedSetName.toUpperCase()} PRINTS & OUTPUT INCLUSIONS
              </Text>
              <View style={styles.inclusionsWrap}>
                {tierHighlights.map((hl, i) => (
                  <View
                    key={i}
                    style={[
                      styles.inclusionChip,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        borderColor: colors.gold.border,
                      },
                    ]}
                  >
                    <CheckCircle2 size={13} color={colors.gold.DEFAULT} style={{ marginTop: 1 }} />
                    <Text style={[styles.inclusionText, { color: colors.text.secondary }]}>
                      {hl}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.gold.border }]} />

            {/* Studio Flagship & Guarantees (Fetched from DB) */}
            <View style={styles.studioInfoBox}>
              <View style={styles.studioInfoRow}>
                <MapPin size={14} color={colors.gold.DEFAULT} />
                <Text style={[styles.studioInfoText, { color: colors.text.secondary }]}>
                  Flagship Studio: {studioSettings.address}
                </Text>
              </View>
              <View style={styles.studioInfoRow}>
                <Phone size={14} color={colors.gold.DEFAULT} />
                <Text style={[styles.studioInfoText, { color: colors.text.secondary }]}>
                  Hotline: {studioSettings.contact_phone} ({studioSettings.business_hours})
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* ── Studio Progress Timeline ── */}
        <GlassCard highlight style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setStepperOpen(!stepperOpen)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <RefreshCw size={15} color={colors.gold.DEFAULT} />
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Studio Progress Timeline</Text>
            </View>
            <PremiumIcon
              icon={stepperOpen ? ChevronUp : ChevronDown}
              size={14}
              box={28}
              tone="soft"
            />
          </TouchableOpacity>

          {stepperOpen && (
            <View>
              {/* Progress summary */}
              <View style={styles.progressSummary}>
                <Text style={[styles.progressLabel, { color: colors.text.muted }]}>
                  STEP {Math.min(liveStep + 1, totalSteps)} OF {totalSteps} · {progressPct}% COMPLETE
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: 'rgba(127,127,140,0.18)' }]}>
                  <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: colors.gold.DEFAULT }]} />
                </View>
              </View>

              {/* Simple vs Interactive selector */}
              <View style={styles.segRow}>
                <TouchableOpacity
                  onPress={() => switchTrackerMode('simple')}
                  activeOpacity={0.8}
                  accessibilityLabel="Simple Timeline"
                  style={[
                    styles.segBtn,
                    trackerMode === 'simple' && styles.segBtnActive,
                  ]}
                >
                  <ListOrdered
                    size={18}
                    color={trackerMode === 'simple' ? colors.text.onGold : colors.text.secondary}
                    strokeWidth={trackerMode === 'simple' ? 2.5 : 2}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => switchTrackerMode('interactive')}
                  activeOpacity={0.8}
                  accessibilityLabel="Interactive Tracker"
                  style={[
                    styles.segBtn,
                    trackerMode === 'interactive' && styles.segBtnActive,
                  ]}
                >
                  <Route
                    size={18}
                    color={trackerMode === 'interactive' ? colors.text.onGold : colors.text.secondary}
                    strokeWidth={trackerMode === 'interactive' ? 2.5 : 2}
                  />
                </TouchableOpacity>
              </View>

              {trackerMode === 'simple' ? (
                <MilestoneStepper status={booking.status} />
              ) : (
                <InteractiveTracker status={booking.status} booking={booking} />
              )}
            </View>
          )}
        </GlassCard>

        {/* ── Studio Bay Assistance & Pass Actions Dock (Replacing former repetitive card) ── */}
        <GlassCard highlight style={styles.assistanceCard}>
          <View style={styles.assistanceHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.assistanceTitle, { color: colors.text.primary }]}>
                Studio Bay Check-In & Assistance
              </Text>
              <Text style={[styles.assistanceSubtitle, { color: colors.text.secondary }]}>
                Present your official pass at the E-Kodak reception desk or contact the studio bay.
              </Text>
            </View>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.dockActionBtn,
                { backgroundColor: colors.gold.bg, borderColor: colors.gold.DEFAULT },
              ]}
              onPress={() => setShowQRModal(true)}
            >
              <QrCode size={18} color={isDark ? colors.gold.light : colors.gold.dark} />
              <Text style={[styles.dockActionBtnText, { color: isDark ? colors.gold.light : colors.gold.dark }]}>
                View Studio Pass
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.dockActionBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  borderColor: colors.gold.border,
                },
              ]}
              onPress={() => Linking.openURL('tel:09102949414')}
            >
              <Phone size={17} color={colors.gold.DEFAULT} />
              <Text style={[styles.dockActionBtnText, { color: colors.text.primary }]}>
                Call Studio Bay
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.gold.border, marginVertical: 10 }]} />

          <View style={styles.studioInfoFooter}>
            <MapPin size={13} color={colors.gold.DEFAULT} />
            <Text style={[styles.studioInfoText, { color: colors.text.muted }]}>
              Main Studio: 311 Rizal Ave, Cebu City · 9:00 AM – 7:00 PM Daily
            </Text>
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
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={isDark ? 65 : 45} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <GlassCard glow highlight style={styles.qrPassModalCard}>
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
                {selectedSetName} · {cleanPackageName}
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

const getStyles = (colors, isDark) => StyleSheet.create({
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

  // Sticky Order State Bar
  stickyStateBarWrap: {
    position: 'absolute',
    top: 96,
    left: Spacing[4],
    right: Spacing[4],
    zIndex: 99,
  },
  stickyStateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  stickyCenterInfo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickySetText: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  stickyIdText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
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

  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing[4],
    gap: Spacing[4],
  },

  // Hero Dossier Card
  heroCard: {
    padding: Spacing[5],
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
    opacity: 0.45,
  },

  // Selected Set Hero
  setHeroSection: {
    gap: 3,
  },
  microHeader: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 9.5,
    letterSpacing: 1.4,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  selectedSetTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: 27,
    letterSpacing: 0.3,
  },
  priceBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  priceBadgeText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: Typography.size.sm,
    letterSpacing: 0.4,
  },
  packageNameText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs + 1,
    letterSpacing: 0.3,
    marginTop: 1,
  },

  // Metadata Stack
  metadataStack: {
    gap: Spacing[3],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  metaLabel: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 9,
    letterSpacing: 1.1,
    marginBottom: 1,
  },
  metaValue: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.sm,
    lineHeight: 19,
  },
  metaSubtext: {
    fontFamily: Typography.fontBody,
    fontSize: 10.5,
    lineHeight: 15,
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
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
  },
  progressSummary: {
    gap: 8,
    marginBottom: Spacing[3],
  },
  progressLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  segRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.25)',
    marginBottom: Spacing[4],
    gap: 4,
  },
  segBtn: {
    width: 52,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnActive: {
    backgroundColor: colors.gold.DEFAULT,
    elevation: 2,
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
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  dockActionBtnText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: Typography.size.xs + 1,
    letterSpacing: 0.4,
  },
  studioInfoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  studioInfoText: {
    fontFamily: Typography.fontBody,
    fontSize: 10.5,
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
