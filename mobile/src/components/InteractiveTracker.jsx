/**
 * InteractiveTracker.jsx — "Winding Journey Trail" Mode
 *
 * A playful, premium, winding S-shaped cobblestone studio trail:
 *  - Kodak the Fox is stationed at the active administrative milestone
 *  - Kodak CANNOT go into unreached processes (locked to administrative order status)
 *  - Kodak is fully articulated anytime (stepping, running, waving, tail swishing, ear twitches, eye blinks)
 *  - All messaging is located directly in Kodak's speech bubble (zero duplication, 100% text fit)
 *  - Smart Step Detection & Exclusive Mascot Reactions:
 *      * Clicking any step triggers tailored Bisaya-English reactions loaded with fun emojis
 *      * Kodak hops, wobbles, turns to face the clicked step, and pops an animated emote badge
 *  - Crystal-clear "CURRENT ORDER STAGE" visual hierarchy:
 *      * The active station where the order currently is features a glowing gold atelier podium & distinct stage dossier
 *  - Smooth serpentine path adapts responsively to device screen width
 *  - Inspected phase spotlight card below the trail
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
  TouchableOpacity,
} from 'react-native';
import Svg, {
  Defs, LinearGradient as SvgLinearGradient, Stop,
  Path, Circle, G,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  ClipboardCheck, CalendarCheck, Camera, Aperture,
  Sparkles, Printer, Package, ChevronLeft, ChevronRight, Check,
} from 'lucide-react-native';
import WalkingFoxMascot from './WalkingFoxMascot';
import PremiumIcon from './PremiumIcon';
import GoldButton from './GoldButton';
import { playMascotSound } from '../utils/mascotAudio';
import { useTheme } from '../context/ThemeContext';
import { MILESTONE_STEPS, STATUS_META, Typography, Spacing, Radius } from '../theme';

const STEP_ICONS = [ClipboardCheck, CalendarCheck, Camera, Aperture, Sparkles, Printer, Package];

// ── Smart Exclusive Mascot Reactions (1 Single Reaction Emoji + Friendly Bisaya-English Branding Dialog) ──
const SMART_STEP_REACTIONS = {
  // When user clicks a FUTURE locked step while at liveStep
  FUTURE: {
    1: { // Step 2: Confirmed & Locked
      emoji: "🔒",
      messages: [
        "Hello bai! Excited na kaayo ta para sa atong slot! E-settle lang sa atong order bai aron ma-confirm dayon atong schedule!",
        "Oops, ooops you're still here, bai! Gamay na lang jud, e-settle na imo order bai para ma-lock atong studio session!",
        "Ready na atong reservation bai! E-settle lang atong studio pass para diretso dayon ta sa Step 02!",
      ],
    },
    2: { // Step 3: Photographer Assigned
      emoji: "📷",
      messages: [
        "Hello bai! Excited na sab ko makauban atong lead photographer! E-settle lang sa atong pass bai para ma-assignan dayon ta!",
        "Excited na ang atelier team bai! E-settle lang atong order para ma-meet na nimo atong studio photographer!",
        "Gamay na lang nga lakang bai! E-settle lang atong booking aron ma-prep dayon atong photographer!",
      ],
    },
    3: { // Step 4: Editing
      emoji: "🎨",
      messages: [
        "Hello bai! Excited na ang digital darkroom para mupasiga sa imong portraits! Darkroom team takes meticulous care!",
        "Nindot kaayo ni nga session bai! Human sa shoot, gi-edit dayon nato tanan proofs to perfection!",
        "Mag-edit ta pohon bai! Atong darkroom masters gina-atiman pag-ayo matag litrato!",
      ],
    },
    4: { // Step 5: Retouching
      emoji: "✨",
      messages: [
        "Hello bai! Beauty retouching ug color calibration ang sunod! Pasinawon nato tanan proofs!",
        "Fine-art skin grading ug perfection proofs ang gi-andam sa atelier!",
      ],
    },
    5: { // Step 6: Booking Finalized
      emoji: "🖨️",
      messages: [
        "Hello bai! Excited na sab ta sa museum-grade prints ug framing! Finalized outputs underway!",
        "Nindot kaayo atong physical outputs bai! Assembling your frames and crystal prints!",
      ],
    },
    6: { // Step 7: Ready for Pickup or Delivery
      emoji: "📦",
      messages: [
        "Hello bai! Excited na sab ko nga ma-release atong luxury package via studio claiming or delivery!",
        "Hapit na jud na pohon bai! Complete and ready na imong deliverables!",
      ],
    },
  },

  // When user clicks a PAST completed step
  PAST: {
    0: {
      emoji: "✅",
      messages: [
        "Salamat kaayo bai! Nadawat na atong booking request. Padayon ta sa sunod nga nindot nga lakang!",
        "Successful atong booking submission bai! Daghang salamat sa pagsalig sa E-Kodak!",
      ],
    },
    1: {
      emoji: "✅",
      messages: [
        "Locked and confirmed na atong slot bai! Salamat kaayo, andam na ang studio para nimo!",
        "Confirmed na atong studio date ug schedule bai! Settle downpayment to confirm wardrobe!",
      ],
    },
    2: {
      emoji: "✅",
      messages: [
        "Nahuman na atong studio session bai! Lingaw kaayo atong mga poses ug camera shots!",
        "Salamat kaayo sa nindot nga photoshoot bai! Gwapa ug gwapo kaayo ang tanan kuha!",
      ],
    },
    3: {
      emoji: "✅",
      messages: [
        "Nahuman na ug edit ang photos bai! Color-graded and crafted with meticulous studio care!",
      ],
    },
    4: {
      emoji: "✅",
      messages: [
        "Nahuman na ug retouch bai! Fine-art skin tones and beauty calibration completed!",
      ],
    },
    5: {
      emoji: "✅",
      messages: [
        "Booking finalized and assembled bai! High-definition prints and framing ready!",
      ],
    },
  },

  // When user clicks the CURRENT live step (where order currently is)
  CURRENT: {
    0: {
      emoji: "🦊",
      messages: [
        "Hello bai! Ako si Kodak, imong studio companion. Nadawat na atong booking request!",
        "Booking received bai! Front-desk team is verifying your schedule reservation!",
      ],
    },
    1: {
      emoji: "🦊",
      messages: [
        "Confirmed na atong studio slot bai! Please settle downpayment in Payment Dashboard to lock in schedule!",
        "Booking approved & reserved bai! Nag-prepare na ang studio team para sa imong upcoming session!",
      ],
    },
    2: {
      emoji: "🦊",
      messages: [
        "Ongoing pictorial karon bai! Smile and strike your best pose in the camera bay!",
        "Live photoshoot session karon bai! Kodak is here cheering for every wonderful frame!",
      ],
    },
    3: {
      emoji: "🦊",
      messages: [
        "Editing in progress bai! Our studio takes meticulous time and care with each photograph to ensure heirloom perfection!",
        "Darkroom processing underway bai! Taking true craftsmanship time for the highest quality results!",
      ],
    },
    4: {
      emoji: "🦊",
      messages: [
        "Master retouching underway bai! Fine-art beauty proofing and skin grading in progress!",
        "Gipasinaw na atong portraits bai! Dedicated artists are retouching every proof!",
      ],
    },
    5: {
      emoji: "🦊",
      messages: [
        "Booking finalized bai! High-definition museum-grade prints and crystal frames assembled!",
        "Final packaging in action bai! Quality control check complete!",
      ],
    },
    6: {
      emoji: "🦊",
      messages: [
        "Ready for pickup or direct delivery bai! Check out your delivery status or visit studio counter!",
        "Congratulations bai! Complete and ready na imong studio package. Daghang salamat sa pagsalig sa E-Kodak!",
      ],
    },
  },
};

const LAST = MILESTONE_STEPS.length - 1;
const BOARD_H = 740;

// ── Parametric Cubic Bézier Coordinate Calculator ──
function getBezierPoint(p0, cp1, cp2, p1, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const a = mt2 * mt;
  const b = 3 * mt2 * t;
  const c = 3 * mt * t2;
  const d = t2 * t;
  return {
    x: a * p0.x + b * cp1.x + c * cp2.x + d * p1.x,
    y: a * p0.y + b * cp1.y + c * cp2.y + d * p1.y,
  };
}

export default function InteractiveTracker({ status, booking }) {
  const { isDark, colors } = useTheme();
  const styles = getStyles(colors, isDark);

  const meta = STATUS_META[String(status || 'PENDING').toUpperCase()] || STATUS_META.PENDING;
  const liveStep = Math.max(0, Math.min(meta?.step ?? 0, LAST));

  // Dynamic layout measurement to ensure 100% zero overlap on all phone widths
  const [boardWidth, setBoardWidth] = useState(320);

  // Inspected phase (defaults to administrative live step)
  const [inspected, setInspected] = useState(liveStep);

  // Mascot dynamic state & reactions (unified single speech bubble + single reaction emoji)
  const initialCurrentGroup = SMART_STEP_REACTIONS.CURRENT[liveStep] || SMART_STEP_REACTIONS.CURRENT[0];
  const [mascotReaction, setMascotReaction] = useState({
    text: initialCurrentGroup.messages[0],
    emoji: initialCurrentGroup.emoji || '🦊',
  });
  const [facing, setFacing] = useState(liveStep % 2 === 0 ? 'right' : 'left');
  const [mascotGait, setMascotGait] = useState('auto');
  const gaitResetTimer = useRef(null);

  // Animated values
  const travelAnim    = useRef(new Animated.Value(liveStep)).current;
  const pulseRing     = useRef(new Animated.Value(1)).current;
  const detailIn      = useRef(new Animated.Value(1)).current;
  const reactionHop   = useRef(new Animated.Value(0)).current;
  const reactionTilt  = useRef(new Animated.Value(0)).current;

  // Sync inspection and initial quote with live step on status change
  useEffect(() => {
    setInspected(liveStep);
    const group = SMART_STEP_REACTIONS.CURRENT[liveStep] || SMART_STEP_REACTIONS.CURRENT[0];
    setMascotReaction({
      text: group.messages[0],
      emoji: group.emoji || '🦊',
    });
  }, [liveStep]);

  // Sync mascot travel animation ONLY when administrative status updates
  // (Mascot cannot wander into unreached processes!)
  useEffect(() => {
    Animated.timing(travelAnim, {
      toValue: liveStep,
      duration: 1200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [liveStep, travelAnim]);

  // Pulsing aura on current live step
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRing, { toValue: 1.35, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseRing, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseRing]);

  // Card detail transition
  useEffect(() => {
    detailIn.setValue(0);
    Animated.timing(detailIn, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [inspected, detailIn]);

  // Cleanup gait timer on unmount
  useEffect(() => {
    return () => clearTimeout(gaitResetTimer.current);
  }, []);

  // Coordinates calculation based on actual measured board width
  const bw = Math.max(280, boardWidth);
  const leftX = 48;
  const rightX = bw - 48;
  const centerX = bw * 0.5;

  // Generously spaced stops giving Kodak ample top headroom for his speech bubble
  const STOPS = useMemo(() => [
    { x: leftX,   y: 140, align: 'left' },   // 0: Request Received
    { x: rightX,  y: 225, align: 'right' },  // 1: Confirmed & Locked
    { x: leftX,   y: 310, align: 'left' },   // 2: Photographer Assigned
    { x: rightX,  y: 395, align: 'right' },  // 3: Studio Session
    { x: leftX,   y: 480, align: 'left' },   // 4: Editing & Retouching
    { x: rightX,  y: 565, align: 'right' },  // 5: Print Production
    { x: centerX, y: 650, align: 'center' }, // 6: Ready for Pickup
  ], [leftX, rightX, centerX]);

  // ── Smart Exclusive Reaction Handler when user taps other steps ──
  const handleInspect = (idx) => {
    const clamped = Math.max(0, Math.min(idx, LAST));
    setInspected(clamped);

    // 1. Kodak faces towards the tapped step
    const targetStop = STOPS[clamped];
    const liveStop = STOPS[liveStep];
    const isToRight = targetStop.x >= liveStop.x;
    setFacing(isToRight ? 'right' : 'left');

    // 2. Physical reaction: calm, gentle greeting nod & micro-hop (zero jumpiness)
    reactionHop.setValue(0);
    reactionTilt.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(reactionHop, {
          toValue: -4,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(reactionHop, {
          toValue: 0,
          duration: 210,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(reactionTilt, {
          toValue: isToRight ? 0.3 : -0.3,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(reactionTilt, {
          toValue: 0,
          duration: 210,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 3. Smart Exclusive Single Reaction: 1 emoji, clean friendly branding message, and sound!
    if (clamped > liveStep) {
      // Future locked step: alert sound + warning haptic
      playMascotSound('alert');
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
      const futureGroup = SMART_STEP_REACTIONS.FUTURE[clamped] || {
        emoji: '🔒',
        messages: [`Hello bai! Excited na ta para sa Step 0${clamped + 1}. E-settle lang sa atong studio pass bai!`],
      };
      const text = futureGroup.messages[Math.floor(Math.random() * futureGroup.messages.length)];
      setMascotReaction({ text, emoji: futureGroup.emoji || '🔒' });
    } else if (clamped < liveStep) {
      // Past completed step: success sound + success haptic
      playMascotSound('success');
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      const pastGroup = SMART_STEP_REACTIONS.PAST[clamped] || {
        emoji: '✅',
        messages: ['Salamat kaayo bai! Nahuman na kini nga milestone, padayon ta!'],
      };
      const text = pastGroup.messages[Math.floor(Math.random() * pastGroup.messages.length)];
      setMascotReaction({ text, emoji: pastGroup.emoji || '✅' });
    } else {
      // Current live step: cute pop sound + medium impact
      playMascotSound('pop');
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
      const currentGroup = SMART_STEP_REACTIONS.CURRENT[clamped] || SMART_STEP_REACTIONS.CURRENT[0];
      const text = currentGroup.messages[Math.floor(Math.random() * currentGroup.messages.length)];
      setMascotReaction({ text, emoji: currentGroup.emoji || '🦊' });
    }
  };

  // Direct tap on Kodak (gentle friendly nod, zero jumpiness)
  const handleMascotTap = () => {
    playMascotSound('pop');
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    const currentGroup = SMART_STEP_REACTIONS.CURRENT[liveStep] || SMART_STEP_REACTIONS.CURRENT[0];
    const pick = currentGroup.messages[Math.floor(Math.random() * currentGroup.messages.length)];
    setMascotReaction({ text: pick, emoji: currentGroup.emoji || '🦊' });

    reactionHop.setValue(0);
    reactionTilt.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(reactionHop, { toValue: -3.5, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(reactionHop, { toValue: 0, duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(reactionTilt, { toValue: 0.25, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(reactionTilt, { toValue: 0, duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();
  };

  // ── Parametric Organic Serpentine S-Trail Segments ──
  // Smooth continuous tangents with elegant cushion around turnaround nodes (no 180° hairpins)
  const pathSegments = useMemo(() => {
    const segs = [];
    for (let i = 0; i < LAST; i++) {
      const p0 = STOPS[i];
      const p1 = STOPS[i + 1];
      const dx = p1.x - p0.x;

      let cp1, cp2;
      if (i === 0) {
        // Segment 0: Top left (Request Received) to Top right (Confirmed & Locked)
        cp1 = { x: p0.x + dx * 0.48, y: p0.y + 12 };
        cp2 = { x: p1.x - 36, y: p1.y - 28 };
      } else if (i === LAST - 1) {
        // Segment 5: Final sweep into center finish podium
        cp1 = { x: p0.x - 36, y: p0.y + 28 };
        cp2 = { x: p1.x + 30, y: p1.y - 32 };
      } else if (dx > 0) {
        // Left to Right sweep
        cp1 = { x: p0.x + 36, y: p0.y + 28 };
        cp2 = { x: p1.x - 36, y: p1.y - 28 };
      } else {
        // Right to Left sweep
        cp1 = { x: p0.x - 36, y: p0.y + 28 };
        cp2 = { x: p1.x + 36, y: p1.y - 28 };
      }

      const d = `M ${p0.x} ${p0.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p1.x} ${p1.y}`;
      const wp1 = getBezierPoint(p0, cp1, cp2, p1, 0.35);
      const wp2 = getBezierPoint(p0, cp1, cp2, p1, 0.68);

      segs.push({
        index: i,
        p0,
        p1,
        cp1,
        cp2,
        d,
        wp1,
        wp2,
        isCompleted: i < liveStep,
        isActive: i === liveStep,
        isUpcoming: i > liveStep,
      });
    }
    return segs;
  }, [STOPS, liveStep]);

  // Unified full continuous path string for base shadows and ambient ground track
  const fullSmoothPathD = useMemo(() => {
    return pathSegments.map((s, idx) => {
      const start = idx === 0 ? `M ${s.p0.x} ${s.p0.y} ` : '';
      return `${start}C ${s.cp1.x} ${s.cp1.y}, ${s.cp2.x} ${s.cp2.y}, ${s.p1.x} ${s.p1.y}`;
    }).join(' ');
  }, [pathSegments]);

  // Interpolated mascot positions along the path
  const mascotX = travelAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6],
    outputRange: STOPS.map((s) => s.x - 37),
  });
  const mascotY = travelAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6],
    outputRange: STOPS.map((s) => s.y - 70),
  });

  const tiltAngle = reactionTilt.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const inspectedStep = MILESTONE_STEPS[inspected];
  const InspectedIcon = STEP_ICONS[inspected] || Sparkles;
  const isDone = inspected < liveStep;
  const isLive = inspected === liveStep;

  // ── Botanical & Floral Studio Garden Elements ──
  const renderFlower = (key, cx, cy, size = 6.5, rot = 0) => {
    const petalR = size * 0.48;
    const dist = size * 0.52;
    const angles = [0, 72, 144, 216, 288];
    const rad = (deg) => ((deg + rot) * Math.PI) / 180;
    const petalFill = isDark ? 'rgba(255, 230, 238, 0.22)' : 'rgba(255, 244, 246, 0.95)';
    const petalStroke = isDark ? 'rgba(217, 180, 108, 0.40)' : 'rgba(220, 180, 130, 0.45)';

    return (
      <G key={key}>
        {angles.map((deg, idx) => (
          <Circle
            key={idx}
            cx={cx + Math.cos(rad(deg)) * dist}
            cy={cy + Math.sin(rad(deg)) * dist}
            r={petalR}
            fill={petalFill}
            stroke={petalStroke}
            strokeWidth={0.7}
          />
        ))}
        <Circle cx={cx} cy={cy} r={size * 0.34} fill="#D9B46C" />
        <Circle cx={cx - 0.6} cy={cy - 0.6} r={size * 0.12} fill="#FFFFFF" />
      </G>
    );
  };

  const renderSprig = (key, x, y, scale = 1, rot = 0) => {
    const leafColor = isDark ? 'rgba(175, 195, 155, 0.32)' : 'rgba(130, 160, 115, 0.42)';
    const stemColor = isDark ? 'rgba(217, 180, 108, 0.30)' : 'rgba(160, 135, 90, 0.35)';

    return (
      <G key={key} transform={`translate(${x}, ${y}) rotate(${rot}) scale(${scale})`}>
        <Path d="M0 14 Q5 6 12 0" stroke={stemColor} strokeWidth="1" fill="none" strokeLinecap="round" />
        <Path d="M4 9 C1 6 2 3 6 4 C8 7 6 9 4 9 Z" fill={leafColor} />
        <Path d="M9 4 C11 1 15 2 14 5 C12 7 10 6 9 4 Z" fill={leafColor} />
        <Circle cx="12" cy="0" r="1.6" fill="#D9B46C" />
      </G>
    );
  };

  const renderPetal = (key, cx, cy, rot = 0, scale = 1) => {
    const pColor = isDark ? 'rgba(255, 220, 230, 0.20)' : 'rgba(255, 235, 240, 0.85)';
    const pStroke = isDark ? 'rgba(217, 180, 108, 0.35)' : 'rgba(210, 170, 120, 0.38)';
    return (
      <G key={key} transform={`translate(${cx}, ${cy}) rotate(${rot}) scale(${scale})`}>
        <Path
          d="M0 0 C-2.5 -3.5 0 -7 3.5 -5 C6 -3.5 4 0.5 0 0 Z"
          fill={pColor}
          stroke={pStroke}
          strokeWidth={0.6}
        />
      </G>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Winding S-Trail Board ── */}
      <View
        onLayout={(e) => setBoardWidth(e.nativeEvent.layout.width)}
        style={[styles.trailBoard, { height: BOARD_H }]}
      >
        {/* Background S-Curve Path & Illuminated Studio Ribbon */}
        <Svg width="100%" height={BOARD_H} style={StyleSheet.absoluteFill}>
          <Defs>
            {/* Illuminated Golden Ribbon Ambient Glow */}
            <SvgLinearGradient id="trailGoldGlow" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFF1D6" stopOpacity="0.45" />
              <Stop offset="50%" stopColor="#D9B46C" stopOpacity="0.65" />
              <Stop offset="100%" stopColor="#A9823A" stopOpacity="0.45" />
            </SvgLinearGradient>

            {/* Solid Atelier Gold Track */}
            <SvgLinearGradient id="trailGoldCore" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFF8E8" />
              <Stop offset="30%" stopColor="#E5B869" />
              <Stop offset="70%" stopColor="#C9983E" />
              <Stop offset="100%" stopColor="#8C6316" />
            </SvgLinearGradient>

            {/* Active Live Station Halo */}
            <SvgLinearGradient id="stoneGlowActive" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#F28C38" stopOpacity="0.45" />
              <Stop offset="100%" stopColor="#D9B46C" stopOpacity="0.08" />
            </SvgLinearGradient>

            {/* Completed Station Halo */}
            <SvgLinearGradient id="stoneGlowDone" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#3DDC97" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#1E1610" stopOpacity="0.04" />
            </SvgLinearGradient>

            {/* Upcoming Station Halo */}
            <SvgLinearGradient id="stoneGlow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#D9B46C" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#1E1610" stopOpacity="0.03" />
            </SvgLinearGradient>
          </Defs>

          {/* 1. Ambient Studio Garden Floral & Botanical Tapestry (Making path & background lively!) */}
          <G>
            {/* Top area welcome blossoms & sprigs */}
            {renderSprig('sp-top-r', bw - 34, 48, 1.1, 25)}
            {renderFlower('fl-top-r', bw - 38, 56, 7.5, 12)}
            {renderPetal('pt-top-r', bw - 20, 68, 45, 1)}

            {renderSprig('sp-top-l', 22, 60, 0.95, -30)}
            {renderFlower('fl-top-l', 32, 68, 6.5, -15)}

            {renderFlower('fl-top-c', bw * 0.42, 68, 6, 20)}
            {renderPetal('pt-top-c', bw * 0.48, 80, -35, 0.9)}

            {/* Segment 0-1 curve accents (top sweep) */}
            {renderFlower('fl-s0', bw * 0.54, 166, 6.5, 30)}
            {renderPetal('pt-s0', bw * 0.60, 178, 50, 0.85)}

            {/* Beside Station 1 (right edge) */}
            {renderSprig('sp-st1', bw - 16, 202, 0.9, 15)}
            {renderFlower('fl-st1', bw - 18, 248, 6, -20)}

            {/* Segment 1-2 curve accents (leftward sweep) */}
            {renderFlower('fl-s1', bw * 0.36, 258, 6.5, 10)}
            {renderPetal('pt-s1', bw * 0.28, 272, -40, 0.9)}

            {/* Beside Station 2 (left edge) */}
            {renderSprig('sp-st2', 16, 290, 0.9, -15)}
            {renderFlower('fl-st2', 18, 335, 6, 25)}

            {/* Segment 2-3 curve accents (rightward sweep) */}
            {renderFlower('fl-s2', bw * 0.65, 345, 6.5, -25)}
            {renderPetal('pt-s2', bw * 0.72, 358, 30, 0.85)}

            {/* Beside Station 3 (right edge) */}
            {renderSprig('sp-st3', bw - 16, 375, 0.9, 20)}
            {renderFlower('fl-st3', bw - 18, 420, 6, -15)}

            {/* Segment 3-4 curve accents (leftward sweep) */}
            {renderFlower('fl-s3', bw * 0.35, 430, 6.5, 15)}
            {renderPetal('pt-s3', bw * 0.26, 442, -50, 0.9)}

            {/* Beside Station 4 (left edge) */}
            {renderSprig('sp-st4', 16, 460, 0.9, -20)}
            {renderFlower('fl-st4', 18, 505, 6, 30)}

            {/* Segment 4-5 curve accents (rightward sweep) */}
            {renderFlower('fl-s4', bw * 0.66, 515, 6.5, -10)}
            {renderPetal('pt-s4', bw * 0.74, 528, 45, 0.85)}

            {/* Beside Station 5 (right edge) */}
            {renderSprig('sp-st5', bw - 18, 545, 0.9, 15)}
            {renderFlower('fl-st5', bw - 20, 590, 6, -25)}

            {/* Celebratory Grand Finale Laurel Bouquet around Station 6 (Ready for Pickup) */}
            {renderSprig('sp-fin-l', bw * 0.5 - 46, 640, 1.15, -45)}
            {renderFlower('fl-fin-l', bw * 0.5 - 42, 646, 7.5, -15)}
            {renderSprig('sp-fin-r', bw * 0.5 + 46, 640, 1.15, 45)}
            {renderFlower('fl-fin-r', bw * 0.5 + 42, 646, 7.5, 15)}
            {renderFlower('fl-fin-bl', bw * 0.5 - 26, 672, 6, -30)}
            {renderFlower('fl-fin-br', bw * 0.5 + 26, 672, 6, 30)}
          </G>

          {/* 2. Underlying Continuous Ambient Ground Track (Ultra-clean, refined baseline) */}
          <Path
            d={fullSmoothPathD}
            fill="none"
            stroke={isDark ? 'rgba(0, 0, 0, 0.32)' : 'rgba(217, 180, 108, 0.10)'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={fullSmoothPathD}
            fill="none"
            stroke={isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(60, 45, 20, 0.06)'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 3. Attentive Segment-by-Segment Track Styling */}
          {pathSegments.map((s) => {
            if (s.isCompleted) {
              // Completed Segment: Radiant Golden Atelier Ribbon
              return (
                <G key={`seg-${s.index}`}>
                  {/* Outer Golden Aura Glow */}
                  <Path
                    d={s.d}
                    fill="none"
                    stroke="url(#trailGoldGlow)"
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isDark ? 0.32 : 0.22}
                  />
                  {/* Solid Radiant Golden Core */}
                  <Path
                    d={s.d}
                    fill="none"
                    stroke="url(#trailGoldCore)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Delicate Golden Stardust Line */}
                  <Path
                    d={s.d}
                    fill="none"
                    stroke="#FFF8E7"
                    strokeWidth="1.6"
                    strokeDasharray="4, 5"
                    strokeLinecap="round"
                  />
                  {/* Waypoint Pearl 1 */}
                  <Circle cx={s.wp1.x} cy={s.wp1.y} r="4.5" fill="rgba(217, 180, 108, 0.25)" />
                  <Circle cx={s.wp1.x} cy={s.wp1.y} r="2.4" fill="#FFF9E8" stroke="#D9B46C" strokeWidth="0.8" />
                  {/* Waypoint Pearl 2 */}
                  <Circle cx={s.wp2.x} cy={s.wp2.y} r="4.5" fill="rgba(217, 180, 108, 0.25)" />
                  <Circle cx={s.wp2.x} cy={s.wp2.y} r="2.4" fill="#FFF9E8" stroke="#D9B46C" strokeWidth="0.8" />
                </G>
              );
            }

            if (s.isActive) {
              // Active Live Segment (Where order currently is / transitioning forward)
              return (
                <G key={`seg-${s.index}`}>
                  {/* Outer Vibrant Amber-Gold Beacon Glow */}
                  <Path
                    d={s.d}
                    fill="none"
                    stroke="url(#trailGoldGlow)"
                    strokeWidth="13"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isDark ? 0.45 : 0.32}
                  />
                  {/* Solid Golden Runway */}
                  <Path
                    d={s.d}
                    fill="none"
                    stroke="url(#trailGoldCore)"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* High-Contrast Luminous Dash */}
                  <Path
                    d={s.d}
                    fill="none"
                    stroke="#FFF8E7"
                    strokeWidth="1.8"
                    strokeDasharray="5, 5"
                    strokeLinecap="round"
                  />
                  {/* Active Beacon Waypoint Pearl 1 */}
                  <Circle cx={s.wp1.x} cy={s.wp1.y} r="5.5" fill="rgba(242, 140, 56, 0.35)" />
                  <Circle cx={s.wp1.x} cy={s.wp1.y} r="2.6" fill="#FFF1D6" stroke="#F28C38" strokeWidth="1" />
                  {/* Active Beacon Waypoint Pearl 2 */}
                  <Circle cx={s.wp2.x} cy={s.wp2.y} r="5.5" fill="rgba(242, 140, 56, 0.35)" />
                  <Circle cx={s.wp2.x} cy={s.wp2.y} r="2.6" fill="#FFF1D6" stroke="#F28C38" strokeWidth="1" />
                </G>
              );
            }

            // Upcoming Segment (Clean, unobtrusive champagne dashed guidance)
            return (
              <G key={`seg-${s.index}`}>
                {/* Refined Dashed Champagne Trail */}
                <Path
                  d={s.d}
                  fill="none"
                  stroke={isDark ? 'rgba(217, 180, 108, 0.35)' : 'rgba(180, 145, 80, 0.30)'}
                  strokeWidth="2.0"
                  strokeDasharray="4, 6"
                  strokeLinecap="round"
                />
                {/* Subtle Waypoint Guide Pearls */}
                <Circle
                  cx={s.wp1.x}
                  cy={s.wp1.y}
                  r="2.0"
                  fill={isDark ? 'rgba(217, 180, 108, 0.28)' : 'rgba(160, 130, 70, 0.25)'}
                />
                <Circle
                  cx={s.wp2.x}
                  cy={s.wp2.y}
                  r="2.0"
                  fill={isDark ? 'rgba(217, 180, 108, 0.28)' : 'rgba(160, 130, 70, 0.25)'}
                />
              </G>
            );
          })}

          {/* 4. Milestone Station Halo Rings in SVG */}
          {STOPS.map((st, i) => {
            const isStopLive = i === liveStep;
            const isStopDone = i < liveStep;
            return (
              <G key={`halo-${i}`}>
                {isStopLive && (
                  <Circle
                    cx={st.x}
                    cy={st.y}
                    r="34"
                    fill="url(#trailGoldGlow)"
                    opacity={isDark ? 0.45 : 0.35}
                  />
                )}
                <Circle
                  cx={st.x}
                  cy={st.y}
                  r={isStopLive ? 26 : 22}
                  fill={isStopLive ? 'url(#stoneGlowActive)' : isStopDone ? 'url(#stoneGlowDone)' : 'url(#stoneGlow)'}
                />
              </G>
            );
          })}
        </Svg>

        {/* ── 7 Milestone Stations (Clean, Crystal-Clear "Where the Order Is") ── */}
        {MILESTONE_STEPS.map((step, i) => {
          const st = STOPS[i];
          const isStopDone = i < liveStep;
          const isStopLive = i === liveStep;
          const isStopSel  = i === inspected;
          const IconComponent = STEP_ICONS[i] || Sparkles;

          const isLeft = st.align === 'left';
          const isCenter = st.align === 'center';

          return (
            <React.Fragment key={i}>
              {/* Stepping Stone Node / Active Studio Podium */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleInspect(i)}
                style={[
                  styles.stoneNode,
                  {
                    left: st.x - (isStopLive ? 26 : 22),
                    top: st.y - (isStopLive ? 26 : 22),
                    width: isStopLive ? 52 : 44,
                    height: isStopLive ? 52 : 44,
                  },
                ]}
              >
                {/* Live pulsing aura on where order currently is */}
                {isStopLive && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.pulseAura,
                      {
                        transform: [{ scale: pulseRing }],
                        borderColor: colors.gold.light,
                      },
                    ]}
                  />
                )}

                {/* Milestone Node Tile / Podium Plate */}
                <View
                  style={[
                    styles.nodeDisc,
                    isStopLive
                      ? styles.nodeDiscActive
                      : isStopDone
                        ? styles.nodeDiscDone
                        : isDark
                          ? styles.nodeDiscDark
                          : styles.nodeDiscLight,
                    isStopSel && !isStopLive && { borderColor: colors.gold.light, borderWidth: 2 },
                  ]}
                >
                  {isStopDone ? (
                    <Check size={16} color="#0D0B0E" strokeWidth={3} />
                  ) : isStopLive ? (
                    <PremiumIcon
                      icon={IconComponent}
                      size={18}
                      box={36}
                      tone="gold"
                      glow
                    />
                  ) : (
                    <IconComponent
                      size={16}
                      color={isDark ? colors.gold.light : '#5A4620'}
                      strokeWidth={2}
                    />
                  )}
                </View>

                {/* Step Number Pill */}
                <View
                  style={[
                    styles.stepNumberBadge,
                    {
                      backgroundColor: isStopLive ? colors.gold.DEFAULT : (isDark ? '#141216' : '#FFFFFF'),
                      borderColor: isStopLive ? colors.gold.specular : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumberText,
                      { color: isStopLive ? '#17130C' : colors.text.muted },
                    ]}
                  >
                    0{i + 1}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* ── Milestone Label Pill (High-Clarity Active Stage Distinction) ── */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleInspect(i)}
                style={[
                  isStopLive ? styles.activeStagePill : styles.labelPill,
                  isStopLive
                    ? {
                        backgroundColor: isDark ? 'rgba(34, 26, 18, 0.95)' : 'rgba(255, 252, 244, 0.98)',
                        borderColor: colors.gold.DEFAULT,
                      }
                    : {
                        backgroundColor: isDark ? 'rgba(24, 21, 28, 0.94)' : 'rgba(255, 255, 255, 0.96)',
                        borderColor: isStopSel
                          ? colors.gold.DEFAULT
                          : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60, 40, 10, 0.08)'),
                      },
                  isCenter
                    ? { left: st.x - 75, top: st.y + 30, width: 150, alignItems: 'center' }
                    : isLeft
                      ? { left: st.x + 32, top: st.y - (isStopLive ? 20 : 14), maxWidth: bw * 0.48, alignItems: 'flex-start' }
                      : { right: (bw - st.x) + 32, top: st.y - (isStopLive ? 20 : 14), maxWidth: bw * 0.48, alignItems: 'flex-end' },
                ]}
              >
                {/* Active Order Indicator Header */}
                {isStopLive && (
                  <View style={styles.activePillHeader}>
                    <View style={[styles.activeLiveDot, { backgroundColor: colors.gold.DEFAULT }]} />
                    <Text style={[styles.activeTagText, { color: colors.gold.DEFAULT }]}>
                      ORDER WAITING HERE
                    </Text>
                  </View>
                )}

                <Text
                  numberOfLines={1}
                  style={[
                    styles.labelTitle,
                    isStopLive && styles.activeTitleText,
                    {
                      color: isStopLive
                        ? (isDark ? colors.gold.light : colors.gold.dark)
                        : isStopSel
                          ? colors.text.primary
                          : colors.text.secondary,
                      fontFamily: isStopLive || isStopSel ? Typography.fontBodyBold : Typography.fontBodySemi,
                    },
                  ]}
                >
                  {step.label}
                </Text>

                {isStopDone && (
                  <Text style={styles.completedSubtext}>COMPLETED ✓</Text>
                )}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}

        {/* ── Mascot Kodak (Locked to Administrative Live Step with Multi-Motion Reactions) ── */}
        <Animated.View
          style={[
            styles.mascotRider,
            {
              transform: [
                { translateX: mascotX },
                { translateY: Animated.add(mascotY, reactionHop) },
                { rotate: tiltAngle },
              ],
            },
          ]}
        >
          <WalkingFoxMascot
            size={74}
            gait={mascotGait}
            direction={facing}
            message={mascotReaction.text}
            emoji={mascotReaction.emoji}
            onMascotPress={handleMascotTap}
          />
        </Animated.View>
      </View>

      {/* ── Studio Journey Guidance Footer (Creative & Clean) ── */}
      <View style={styles.timelineFooter}>
        <Text style={[styles.hintText, { color: colors.text.muted }]}>
          Tap any milestone station to guide Kodak · Tap Kodak to hear his studio reminders ✨
        </Text>
      </View>
    </View>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    container: {
      paddingTop: Spacing[1],
    },

    // Winding Trail Board
    trailBoard: {
      position: 'relative',
      borderRadius: Radius['2xl'],
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      overflow: 'visible',
      marginTop: Spacing[1],
      marginBottom: Spacing[2],
    },

    stoneNode: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 6,
    },
    pulseAura: {
      position: 'absolute',
      width: 66,
      height: 66,
      borderRadius: 33,
      borderWidth: 2,
      backgroundColor: 'rgba(217, 180, 108, 0.16)',
    },
    nodeDisc: {
      borderRadius: 999,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 3,
    },
    nodeDiscActive: {
      width: 50,
      height: 50,
      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.18)' : 'rgba(217, 180, 108, 0.22)',
      borderColor: colors.gold.DEFAULT,
      borderWidth: 2.2,
    },
    nodeDiscDone: {
      width: 44,
      height: 44,
      backgroundColor: '#3DDC97',
      borderColor: '#3DDC97',
    },
    nodeDiscDark: {
      width: 44,
      height: 44,
      backgroundColor: '#1E1B22',
      borderColor: 'rgba(255,255,255,0.14)',
    },
    nodeDiscLight: {
      width: 44,
      height: 44,
      backgroundColor: '#F0ECE4',
      borderColor: 'rgba(0,0,0,0.08)',
    },

    stepNumberBadge: {
      position: 'absolute',
      bottom: -6,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: Radius.full,
      borderWidth: 1,
      zIndex: 8,
    },
    stepNumberText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 8.5,
      letterSpacing: 0.4,
    },

    // Clean Standard Milestone Label
    labelPill: {
      position: 'absolute',
      zIndex: 7,
      borderRadius: Radius.full,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.35 : 0.08,
      shadowRadius: 5,
      elevation: 2,
    },
    labelTitle: {
      fontSize: 11.5,
      letterSpacing: 0.2,
    },
    completedSubtext: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 8,
      color: '#34D399',
      letterSpacing: 0.6,
      marginTop: 1,
    },

    // ── High-Clarity Active Stage Dossier Tag ("WHERE ORDER IS STILL") ──
    activeStagePill: {
      position: 'absolute',
      zIndex: 8,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 2,
      shadowColor: '#C9A96E',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    activePillHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    activeLiveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    activeTagText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 8.5,
      letterSpacing: 1.2,
    },
    activeTitleText: {
      fontSize: 12.5,
      letterSpacing: 0.3,
    },

    mascotRider: {
      position: 'absolute',
      zIndex: 10,
      pointerEvents: 'box-none',
    },

    hintText: {
      fontFamily: Typography.fontBody,
      fontSize: 9.5,
      textAlign: 'center',
      letterSpacing: 0.3,
      opacity: 0.72,
      marginVertical: Spacing[1],
      lineHeight: 14,
    },
    timelineFooter: {
      alignItems: 'center',
      paddingVertical: Spacing[1],
    },
  });
