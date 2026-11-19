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
  Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop,
  Rect, Path, Circle, G,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  ClipboardCheck, CalendarCheck, UserCheck, Camera, Aperture,
  Sparkles, Printer, Package, ChevronLeft, ChevronRight, Check, Lock,
} from 'lucide-react-native';
import WalkingFoxMascot from './WalkingFoxMascot';
import PremiumIcon from './PremiumIcon';
import GoldButton from './GoldButton';
import { playMascotSound } from '../utils/mascotAudio';
import { useTheme } from '../context/ThemeContext';
import { MILESTONE_STEPS, STATUS_META, Typography, Spacing, Radius } from '../theme';

const STEP_ICONS = [ClipboardCheck, CalendarCheck, UserCheck, Camera, Aperture, Sparkles, Printer, Package];

// ── Smart Exclusive Mascot Reactions (1 Single Reaction Emoji + Friendly Bisaya-English Branding Dialog) ──
const SMART_STEP_REACTIONS = {
  // When user clicks a FUTURE locked step while at liveStep
  FUTURE: {
    1: { // Step 2: Approved & Reserved
      emoji: "🔒",
      messages: [
        "Hello bai! Excited na kaayo ta para sa atong slot! E-confirm lang sa studio aron ma-lock atong schedule!",
        "Ready na atong reservation bai! Waiting for studio approval para diretso dayon ta sa Step 02!",
      ],
    },
    2: { // Step 3: Photographer Assigned
      emoji: "📷",
      messages: [
        "Hello bai! Excited na sab ko makauban atong lead photographer! E-assign na ta sa studio team!",
        "Gamay na lang nga lakang bai! Mag-assign na ang studio ug photographer para sa imong session!",
      ],
    },
    3: { // Step 4: Ongoing Pictorial
      emoji: "📸",
      messages: [
        "Hello bai! Hapit na ang pictorial day nato sa studio camera bay!",
        "Prepare na imong outfit ug smile bai para sa Ongoing Pictorial!",
      ],
    },
    4: { // Step 5: Editing
      emoji: "🎨",
      messages: [
        "Hello bai! Excited na ang digital darkroom para mupasiga sa imong portraits!",
        "Human sa shoot, gi-edit dayon nato tanan proofs to perfection!",
      ],
    },
    5: { // Step 6: Retouching
      emoji: "✨",
      messages: [
        "Hello bai! Beauty retouching ug color calibration ang sunod! Pasinawon nato tanan proofs!",
        "Fine-art skin grading ug perfection proofs ang gi-andam sa atelier!",
      ],
    },
    6: { // Step 7: Booking Finalized
      emoji: "🖨️",
      messages: [
        "Hello bai! Excited na sab ta sa museum-grade prints ug framing! Finalized outputs underway!",
        "Nindot kaayo atong physical outputs bai! Assembling your frames and crystal prints!",
      ],
    },
    7: { // Step 8: Ready for Pickup / Delivery
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
        "Booking received, bai!",
        "Request logged at studio.",
      ],
    },
    1: {
      emoji: "✅",
      messages: [
        "Slot approved and reserved!",
        "Schedule approved, bai!",
      ],
    },
    2: {
      emoji: "✅",
      messages: [
        "Lead photographer assigned!",
        "Your studio photographer is locked in!",
      ],
    },
    3: {
      emoji: "✅",
      messages: [
        "Photoshoot wrapped up!",
        "Great shots today, bai!",
      ],
    },
    4: {
      emoji: "✅",
      messages: [
        "Photo edits complete!",
      ],
    },
    5: {
      emoji: "✅",
      messages: [
        "Fine-art retouch done!",
      ],
    },
    6: {
      emoji: "✅",
      messages: [
        "Prints and frames ready!",
      ],
    },
  },

  // When user clicks the CURRENT live step (where order currently is)
  CURRENT: {
    0: {
      emoji: "🦊",
      messages: [
        "Hi bai! Booking received.",
        "Reviewing your booking now!",
      ],
    },
    1: {
      emoji: "🦊",
      messages: [
        "Slot approved & reserved, bai!",
        "Assigning your photographer soon!",
      ],
    },
    2: {
      emoji: "🦊",
      messages: [
        "Photographer assigned na, bai!",
        "Ready na atong studio lead photographer!",
      ],
    },
    3: {
      emoji: "🦊",
      messages: [
        "Pictorial ongoing now, smile!",
        "Live shoot in the camera bay!",
      ],
    },
    4: {
      emoji: "🦊",
      messages: [
        "Editing your portraits now!",
        "Darkroom crafting in progress.",
      ],
    },
    5: {
      emoji: "🦊",
      messages: [
        "Fine-art retouching underway!",
        "Polishing your portraits now.",
      ],
    },
    6: {
      emoji: "🦊",
      messages: [
        "Prints & frames almost ready!",
        "Finalizing your package now.",
      ],
    },
    7: {
      emoji: "🦊",
      messages: [
        "Ready for pickup or delivery!",
        "Your package is complete, bai!",
      ],
    },
  },
};

const LAST = MILESTONE_STEPS.length - 1;
const BOARD_H = 700;

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

function buildForestPine(cx, topY, baseY, halfW) {
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

const FLOW_FOREST_PINES = {
  far: [
    [22, 240, 326, 13], [64, 224, 326, 15], [108, 244, 326, 12],
    [252, 232, 326, 14], [296, 218, 326, 16], [338, 236, 326, 14],
    [32, 370, 456, 14], [82, 354, 456, 15], [278, 360, 456, 15], [328, 344, 456, 16],
  ],
  mid: [
    [18, 305, 420, 17], [58, 325, 420, 15], [308, 294, 420, 18], [344, 315, 420, 16],
    [24, 470, 595, 19], [68, 495, 595, 16], [298, 476, 595, 18], [342, 458, 595, 20],
  ],
  near: [
    [14, 570, 740, 22], [54, 608, 740, 18], [312, 590, 740, 20], [348, 558, 740, 24],
  ],
};

export default function InteractiveTracker({ status, booking }) {
  const { isDark, isSage, colors } = useTheme();
  const styles = getStyles(colors, isDark, isSage);

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
  const travelAnim = useRef(new Animated.Value(liveStep)).current;
  const detailIn = useRef(new Animated.Value(1)).current;
  const reactionHop = useRef(new Animated.Value(0)).current;
  const reactionTilt = useRef(new Animated.Value(0)).current;

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

  // Compact vertical rhythm across all 8 studio milestones
  const STOPS = useMemo(() => [
    { x: leftX,   y: 72,  align: 'left'   }, // 0: Booking Received
    { x: rightX,  y: 148, align: 'right'  }, // 1: Approved & Reserved
    { x: leftX,   y: 224, align: 'left'   }, // 2: Photographer Assigned
    { x: rightX,  y: 300, align: 'right'  }, // 3: Ongoing Pictorial
    { x: leftX,   y: 376, align: 'left'   }, // 4: Editing
    { x: rightX,  y: 452, align: 'right'  }, // 5: Retouching
    { x: leftX,   y: 528, align: 'left'   }, // 6: Booking Finalized
    { x: centerX, y: 612, align: 'center' }, // 7: Ready for Release
  ], [leftX, rightX, centerX]);

  // ── Smart Exclusive Reaction Handler (only completed & current steps are clickable) ──
  const handleInspect = (idx) => {
    const clamped = Math.max(0, Math.min(idx, LAST));
    if (clamped > liveStep) return;
    setInspected(clamped);

    // 1. Kodak faces towards the tapped step (or inward when already on same side)
    const targetStop = STOPS[clamped];
    const liveStop = STOPS[liveStep];
    const isToRight = Math.abs(targetStop.x - liveStop.x) < 4
      ? liveStop.align !== 'right'
      : targetStop.x > liveStop.x;
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
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { }); } catch { }
      const futureGroup = SMART_STEP_REACTIONS.FUTURE[clamped] || {
        emoji: '🔒',
        messages: [`Hello bai! Excited na ta para sa Step 0${clamped + 1}. E-settle lang sa atong studio pass bai!`],
      };
      const text = futureGroup.messages[Math.floor(Math.random() * futureGroup.messages.length)];
      setMascotReaction({ text, emoji: futureGroup.emoji || '🔒' });
    } else if (clamped < liveStep) {
      // Past completed step: success sound + success haptic
      playMascotSound('success');
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { }); } catch { }
      const pastGroup = SMART_STEP_REACTIONS.PAST[clamped] || {
        emoji: '✅',
        messages: ['Salamat kaayo bai! Nahuman na kini nga milestone, padayon ta!'],
      };
      const text = pastGroup.messages[Math.floor(Math.random() * pastGroup.messages.length)];
      setMascotReaction({ text, emoji: pastGroup.emoji || '✅' });
    } else {
      // Current live step: cute pop sound + medium impact
      playMascotSound('pop');
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { }); } catch { }
      const currentGroup = SMART_STEP_REACTIONS.CURRENT[clamped] || SMART_STEP_REACTIONS.CURRENT[0];
      const text = currentGroup.messages[Math.floor(Math.random() * currentGroup.messages.length)];
      setMascotReaction({ text, emoji: currentGroup.emoji || '🦊' });
    }
  };

  // Direct tap on Kodak (gentle friendly nod, zero jumpiness)
  const handleMascotTap = () => {
    playMascotSound('pop');
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { }); } catch { }
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
        // Segment 0: Top left (Booking Received) to Top right (Approved & Reserved)
        cp1 = { x: p0.x + dx * 0.48, y: p0.y + 12 };
        cp2 = { x: p1.x - 36, y: p1.y - 28 };
      } else if (i === LAST - 1) {
        // Final sweep into center finish podium
        const dirSign = p1.x >= p0.x ? 1 : -1;
        cp1 = { x: p0.x + 36 * dirSign, y: p0.y + 28 };
        cp2 = { x: p1.x - 30 * dirSign, y: p1.y - 32 };
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

  // Interpolated mascot positions along the 8-stop path
  const stepInputRange = useMemo(() => STOPS.map((_, idx) => idx), [STOPS]);
  const mascotX = travelAnim.interpolate({
    inputRange: stepInputRange,
    outputRange: STOPS.map((s) => s.x - 37),
  });
  const mascotY = travelAnim.interpolate({
    inputRange: stepInputRange,
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

  // ── Atmospheric Jungle, Forest & Mountainous Scenery Palette ──
  const landscape = isDark
    ? {
      skyTop: '#131826',
      skyMid: '#1C2632',
      skyGlow: '#293D38',
      sunCore: '#FCE4B2',
      sunAura: '#D9B46C',
      mtnFar: '#273445',
      mtnMid: '#1E2C36',
      mtnHighlight: 'rgba(180, 210, 225, 0.14)',
      forestFar: '#1A3129',
      forestMid: '#142820',
      jungleNear: '#0D1E18',
      jungleLeaf: '#1D3E31',
      mist: '#243631',
    }
    : isSage
      ? {
        skyTop: '#EAF1E8',
        skyMid: '#DCE9DD',
        skyGlow: '#CFE2D3',
        sunCore: '#FFFDF4',
        sunAura: '#EADAA9',
        mtnFar: '#BACBBF',
        mtnMid: '#9EB8A6',
        mtnHighlight: 'rgba(255, 255, 255, 0.42)',
        forestFar: '#8EAE96',
        forestMid: '#73977D',
        jungleNear: '#587A61',
        jungleLeaf: '#486B51',
        mist: '#F4F8F3',
      }
      : {
        skyTop: '#F7F1E6',
        skyMid: '#EAEFE8',
        skyGlow: '#D8E7DC',
        sunCore: '#FFFDF7',
        sunAura: '#F2D89E',
        mtnFar: '#C4CFD0',
        mtnMid: '#A5B9B1',
        mtnHighlight: 'rgba(255, 255, 255, 0.50)',
        forestFar: '#93B29B',
        forestMid: '#769880',
        jungleNear: '#577A62',
        jungleLeaf: '#466A51',
        mist: '#F9FBF7',
      };

  return (
    <View style={styles.container}>
      {/* ── Winding S-Trail Board ── */}
      <View
        onLayout={(e) => setBoardWidth(e.nativeEvent.layout.width)}
        style={[styles.trailBoard, { height: BOARD_H }]}
      >
        {/* Clipped Mountain, Forest & Jungle Scenery Backdrop */}
        <View pointerEvents="none" style={styles.sceneryClipWrap}>
          <Svg width="100%" height={BOARD_H} viewBox="0 0 360 740" preserveAspectRatio="xMidYMid slice">
            <Defs>
              <SvgLinearGradient id="flowSkyGrad" x1="0" y1="0" x2="0.2" y2="1">
                <Stop offset="0%" stopColor={landscape.skyTop} />
                <Stop offset="48%" stopColor={landscape.skyMid} />
                <Stop offset="100%" stopColor={landscape.skyGlow} />
              </SvgLinearGradient>
              <RadialGradient id="flowSunGlow" cx="76%" cy="13%" r="36%">
                <Stop offset="0%" stopColor={landscape.sunCore} stopOpacity="0.88" />
                <Stop offset="42%" stopColor={landscape.sunAura} stopOpacity="0.34" />
                <Stop offset="100%" stopColor={landscape.skyMid} stopOpacity="0" />
              </RadialGradient>
              <SvgLinearGradient id="flowValleyMist" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={landscape.mist} stopOpacity="0" />
                <Stop offset="55%" stopColor={landscape.mist} stopOpacity="0.52" />
                <Stop offset="100%" stopColor={landscape.mist} stopOpacity="0" />
              </SvgLinearGradient>
            </Defs>

            {/* Atmospheric mountain dawn sky */}
            <Rect x="0" y="0" width="360" height="740" fill="url(#flowSkyGrad)" />
            <Circle cx="274" cy="94" r="140" fill="url(#flowSunGlow)" />
            <Circle cx="274" cy="88" r="22" fill={landscape.sunCore} fillOpacity="0.72" />

            {/* Soft sunbeams across peaks */}
            <Path
              d="M 244 64 L 306 64 L 210 340 L 118 340 Z"
              fill={landscape.sunCore}
              fillOpacity={isDark ? '0.06' : '0.16'}
            />

            {/* Distant Alpine Mountain Peaks */}
            <Path
              d="M -10 260 L 58 148 L 124 218 L 194 128 L 266 206 L 324 146 L 370 220 L 370 360 L -10 360 Z"
              fill={landscape.mtnFar}
              fillOpacity="0.62"
            />
            {/* Sunlit mountain facet highlight */}
            <Path
              d="M 194 128 L 236 174 L 194 218 Z"
              fill={landscape.mtnHighlight}
            />
            <Path
              d="M 58 148 L 96 190 L 62 232 Z"
              fill={landscape.mtnHighlight}
            />

            {/* Secondary Mountain Ridge */}
            <Path
              d="M -10 296 L 44 214 L 108 264 L 166 196 L 238 256 L 302 188 L 370 260 L 370 390 L -10 390 Z"
              fill={landscape.mtnMid}
              fillOpacity="0.55"
            />

            {/* Misty mountain valley fog */}
            <Rect x="0" y="210" width="360" height="90" fill="url(#flowValleyMist)" />

            {/* Far Misty Pine Forest Canopy */}
            {FLOW_FOREST_PINES.far.map(([cx, topY, baseY, hw], i) => (
              <Path
                key={`ff-${i}`}
                d={buildForestPine(cx, topY, baseY, hw)}
                fill={landscape.forestFar}
                fillOpacity="0.46"
              />
            ))}
            <Path
              d="M0 326 Q 90 302 186 318 T 360 304 L 360 520 L 0 520 Z"
              fill={landscape.forestFar}
              fillOpacity="0.34"
            />

            {/* Valley mist separation */}
            <Rect x="0" y="340" width="360" height="100" fill="url(#flowValleyMist)" />

            {/* Mid Pine Woodland Hills */}
            {FLOW_FOREST_PINES.mid.map(([cx, topY, baseY, hw], i) => (
              <Path
                key={`fm-${i}`}
                d={buildForestPine(cx, topY, baseY, hw)}
                fill={landscape.forestMid}
                fillOpacity="0.52"
              />
            ))}
            <Path
              d="M0 448 Q 112 422 224 440 T 360 416 L 360 740 L 0 740 Z"
              fill={landscape.forestMid}
              fillOpacity="0.36"
            />

            {/* Lush Lower Jungle & Fern Framing */}
            {FLOW_FOREST_PINES.near.map(([cx, topY, baseY, hw], i) => (
              <Path
                key={`fn-${i}`}
                d={buildForestPine(cx, topY, baseY, hw)}
                fill={landscape.jungleNear}
                fillOpacity="0.56"
              />
            ))}

            {/* Tropical Jungle Fronds framing bottom-left & bottom-right slopes */}
            <Path
              d="M -6 560 Q 34 534 58 566 Q 28 574 -6 588 Z M -6 610 Q 44 584 74 620 Q 36 632 -6 648 Z M -6 664 Q 56 636 90 676 Q 42 694 -6 710 Z"
              fill={landscape.jungleLeaf}
              fillOpacity="0.44"
            />
            <Path
              d="M 366 535 Q 326 510 300 542 Q 332 552 366 566 Z M 366 592 Q 314 566 286 602 Q 324 614 366 630 Z M 366 654 Q 302 628 272 670 Q 318 688 366 704 Z"
              fill={landscape.jungleLeaf}
              fillOpacity="0.46"
            />

            {/* Foreground mossy jungle valley slope */}
            <Path
              d="M 0 674 Q 90 644 180 666 T 360 652 L 360 740 L 0 740 Z"
              fill={landscape.jungleNear}
              fillOpacity="0.48"
            />

            {/* Gentle luminous atmospheric wash across center trail lane for pill legibility */}
            <Rect
              x="0"
              y="0"
              width="360"
              height="740"
              fill={isDark ? '#141720' : '#FFFFFF'}
              fillOpacity={isDark ? '0.26' : '0.32'}
            />
          </Svg>
        </View>

        {/* Background S-Curve Path & Illuminated Studio Ribbon */}
        <Svg width="100%" height={BOARD_H} style={StyleSheet.absoluteFill}>
          <Defs>
            {/* Illuminated Studio Ribbon Ambient Glow */}
            <SvgLinearGradient id="trailGoldGlow" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={colors.gold.specular} stopOpacity="0.45" />
              <Stop offset="50%" stopColor={colors.gold.DEFAULT} stopOpacity="0.65" />
              <Stop offset="100%" stopColor={colors.gold.dark} stopOpacity="0.45" />
            </SvgLinearGradient>

            {/* Solid Theme Studio Track */}
            <SvgLinearGradient id="trailGoldCore" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={colors.gold.specular} />
              <Stop offset="30%" stopColor={colors.gold.light} />
              <Stop offset="70%" stopColor={colors.gold.DEFAULT} />
              <Stop offset="100%" stopColor={colors.gold.dark} />
            </SvgLinearGradient>

            {/* Active Live Station Halo */}
            <SvgLinearGradient id="stoneGlowActive" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#F28C38" stopOpacity="0.30" />
              <Stop offset="100%" stopColor={colors.gold.DEFAULT} stopOpacity="0.04" />
            </SvgLinearGradient>

            {/* Completed Station Halo */}
            <SvgLinearGradient id="stoneGlowDone" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.accent.mint} stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#1E1610" stopOpacity="0.04" />
            </SvgLinearGradient>

            {/* Upcoming Station Halo */}
            <SvgLinearGradient id="stoneGlow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.gold.DEFAULT} stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#1E1610" stopOpacity="0.03" />
            </SvgLinearGradient>
          </Defs>

          {/* 2. Underlying Continuous Ambient Ground Track (Ultra-clean, refined baseline) */}
          <Path
            d={fullSmoothPathD}
            fill="none"
            stroke={
              isDark
                ? 'rgba(0, 0, 0, 0.32)'
                : isSage
                  ? 'rgba(99, 115, 86, 0.14)'
                  : 'rgba(176, 125, 30, 0.12)'
            }
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
          const isStopLocked = i > liveStep;
          const isStopSel = i === inspected;
          const IconComponent = STEP_ICONS[i] || Sparkles;

          const isLeft = st.align === 'left';
          const isCenter = st.align === 'center';

          return (
            <React.Fragment key={i}>
              {/* Stepping Stone Node / Active Studio Podium */}
              <TouchableOpacity
                activeOpacity={isStopLocked ? 1 : 0.85}
                disabled={isStopLocked}
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
                    isStopLocked && { opacity: 0.72 },
                    isStopSel && !isStopLive && { borderColor: colors.gold.light, borderWidth: 2 },
                  ]}
                >
                  {isStopDone ? (
                    <Check size={16} color={isDark ? '#0D0B0E' : '#FFFFFF'} strokeWidth={3} />
                  ) : isStopLive ? (
                    <PremiumIcon
                      icon={IconComponent}
                      size={18}
                      box={36}
                      tone="gold"
                      glow
                    />
                  ) : (
                    <Lock
                      size={15}
                      color={isDark ? 'rgba(255, 255, 255, 0.45)' : isSage ? '#6D7A6E' : '#7D857E'}
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
                      { color: isStopLive ? colors.text.onGold : colors.text.muted },
                    ]}
                  >
                    0{i + 1}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* ── Milestone Label Pill (Locked Steps Unclickable) ── */}
              <TouchableOpacity
                activeOpacity={isStopLocked ? 1 : 0.85}
                disabled={isStopLocked}
                onPress={() => handleInspect(i)}
                style={[
                  isStopLive ? styles.activeStagePill : styles.labelPill,
                  isStopLocked && { opacity: 0.68 },
                  isStopLive
                    ? {
                      backgroundColor: isDark ? '#221C15' : isSage ? '#FAFBF7' : '#FFFCF5',
                      borderColor: colors.gold.DEFAULT,
                    }
                    : {
                      backgroundColor: isDark ? '#1A1E28' : '#FFFFFF',
                      borderColor: isStopSel
                        ? colors.gold.DEFAULT
                        : (isDark ? 'rgba(255,255,255,0.12)' : isSage ? '#D1DCD0' : '#E4DAC8'),
                    },
                  isCenter
                    ? { left: st.x - 75, top: st.y + 30, width: 150, alignItems: 'center' }
                    : isLeft
                      ? { left: st.x + 32, top: st.y - (isStopLive ? 17 : 14), maxWidth: bw * 0.48, alignItems: 'flex-start' }
                      : { right: (bw - st.x) + 32, top: st.y - (isStopLive ? 17 : 14), maxWidth: bw * 0.48, alignItems: 'flex-end' },
                ]}
              >
                {/* "You're here" positioned on the top border line of the active box */}
                {isStopLive && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.youAreHereEdgeTag,
                      {
                        backgroundColor: isDark ? '#221C15' : isSage ? '#FAFBF7' : '#FFFCF5',
                        borderColor: isDark
                          ? 'rgba(61, 220, 151, 0.35)'
                          : isSage
                            ? 'rgba(43, 138, 99, 0.25)'
                            : 'rgba(20, 168, 107, 0.25)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.youAreHereEdgeText,
                        {
                          color: isDark
                            ? colors.accent.mint
                            : isSage
                              ? '#1E724E'
                              : '#117A4D',
                        },
                      ]}
                    >
                      You're here
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
            anchorSide={STOPS[liveStep]?.align || 'left'}
            maxBubbleWidth={Math.min(248, Math.max(185, bw - 34))}
            message={mascotReaction.text}
            emoji={mascotReaction.emoji}
            onMascotPress={handleMascotTap}
          />
        </Animated.View>
      </View>

      {/* ── Studio Journey Guidance Footer (Creative & Clean) ── */}
      <View style={styles.timelineFooter}>
        <Text style={[styles.hintText, { color: colors.text.muted }]}>
          Tap completed stages or Kodak to hear studio updates
        </Text>
      </View>
    </View>
  );
}

const getStyles = (colors, isDark, isSage) =>
  StyleSheet.create({
    container: {
      paddingTop: Spacing[1],
    },

    // Winding Trail Board
    trailBoard: {
      position: 'relative',
      borderRadius: Radius['2xl'],
      backgroundColor: isDark ? '#131826' : isSage ? '#EAF1E8' : '#F5EFE5',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : isSage ? 'rgba(99, 115, 86, 0.22)' : 'rgba(176, 125, 30, 0.16)',
      overflow: 'visible',
      marginTop: Spacing[1],
      marginBottom: Spacing[2],
    },
    sceneryClipWrap: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: Radius['2xl'],
      overflow: 'hidden',
    },

    stoneNode: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 6,
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
      backgroundColor: isDark ? '#2B2314' : isSage ? '#E5ECE0' : '#FAF0DC',
      borderColor: colors.gold.DEFAULT,
      borderWidth: 2.2,
    },
    nodeDiscDone: {
      width: 44,
      height: 44,
      backgroundColor: colors.accent.mint,
      borderColor: colors.accent.mint,
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
      backgroundColor: isSage ? '#E9EFE6' : '#F0ECE4',
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

    // ── Active Stage Box w/ "You're here" on Top Border ──
    activeStagePill: {
      position: 'absolute',
      zIndex: 8,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      paddingHorizontal: 13,
      paddingTop: 11,
      paddingBottom: 9,
      shadowColor: isSage ? '#637356' : '#C9A96E',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.26,
      shadowRadius: 8,
      elevation: 4,
    },
    youAreHereEdgeTag: {
      position: 'absolute',
      top: -9,
      left: 12,
      paddingHorizontal: 6,
      paddingVertical: 0.5,
      borderRadius: 5,
      borderWidth: 0.75,
      zIndex: 10,
    },
    youAreHereEdgeText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 9.5,
      letterSpacing: 0.3,
    },
    activeTitleText: {
      fontSize: 13.5,
      letterSpacing: 0.2,
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
