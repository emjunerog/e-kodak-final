/**
 * StudioMascotKit.jsx (Mobile Native)
 * Official E-Kodak Photography Studio Mascot ("Kodak the Fox").
 * Native React Native SVG Bodyset Motion Kit with 5 distinct studio poses & animations:
 * 1. 'welcome'   - Studio Concierge presenting E-Kodak Studio Pass with waving paw
 * 2. 'shoot'     - Atelier Photographer with vintage rangefinder camera, optical lens & xenon strobe burst
 * 3. 'inspect'   - Proof Curator inspecting 35mm film negatives with a golden jeweler's loupe
 * 4. 'celebrate' - Delivery Celebration with paws up and floating golden confetti
 * 5. 'waiting'   - Standby Director waiting thoughtfully with attentive ear twitches
 *
 * Designed with subtle luxury tones: warm ivory (#FFFDF8), champagne gold (#FFE7A3 -> #D4AF37),
 * soft bronze (#2E241B), and zero harsh black fills.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Ellipse,
  Polygon,
  Line,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Sparkles, X, Camera, Search, PartyPopper, HandMetal, Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export const MASCOT_POSES = {
  WELCOME: 'welcome',
  SHOOT: 'shoot',
  INSPECT: 'inspect',
  CELEBRATE: 'celebrate',
  WAITING: 'waiting',
  HOLD_QR: 'hold_qr',
  CAMERA_REVEAL: 'camera_reveal',
};

const SIZE_MAP = {
  sm: 48,
  md: 76,
  lg: 110,
  xl: 150,
  hero: 210,
};

const POSE_HINTS = {
  welcome: "Welcome to E-Kodak Atelier! Present your pass to activate.",
  shoot: "Studio xenon strobe primed! Tap me to trigger the shutter flash.",
  inspect: "Examining 35mm film negatives with my golden jeweler's loupe!",
  celebrate: "Your studio prints & digital archive are delivered! Cheers!",
  waiting: "Lights calibrated and stands set. Ready whenever you are!",
  hold_qr: "Activate your session with your studio pass or QR receipt.",
  camera_reveal: "Let me show you how to track your live session progress!",
};

export default function StudioMascotKit({
  pose = 'welcome',
  size = 'md',
  interactive = true,
  speechText = null,
  showBadge = false,
  badgeText = 'Studio Fox',
  animationStep = 1, // Used for camera_reveal sequence
  style,
  onPress,
}) {
  const { isDark, colors } = useTheme();
  const [currentPose, setCurrentPose] = useState(pose);
  const [showBubble, setShowBubble] = useState(speechText !== null && Boolean(speechText));
  const [bubbleContent, setBubbleContent] = useState(speechText || POSE_HINTS[pose] || POSE_HINTS.welcome);
  const [isStrobeActive, setIsStrobeActive] = useState(false);

  // Animation values
  const floatAnim   = useRef(new Animated.Value(0)).current;
  const squashAnim  = useRef(new Animated.Value(1)).current;
  const tailSwayAnim = useRef(new Animated.Value(0)).current;
  const strobeFlashAnim = useRef(new Animated.Value(0)).current;
  const entranceAnim = useRef(new Animated.Value(0.7)).current;

  // Sync external pose prop
  useEffect(() => {
    setCurrentPose(pose);
    if (speechText === null) {
      setShowBubble(false);
    } else if (!speechText) {
      setBubbleContent(POSE_HINTS[pose] || POSE_HINTS.welcome);
    }
  }, [pose, speechText]);

  useEffect(() => {
    if (speechText !== null && speechText) {
      setBubbleContent(speechText);
      setShowBubble(true);
    } else if (speechText === null) {
      setShowBubble(false);
    }
  }, [speechText]);

  // Entrance scale-in on mount
  useEffect(() => {
    Animated.spring(entranceAnim, {
      toValue: 1,
      friction: 6,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }, []);


  // Floating breathing idle motion & rhythmic tail sway
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -3.5,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const tailLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tailSwayAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tailSwayAnim, {
          toValue: -1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    tailLoop.start();

    return () => {
      floatLoop.stop();
      tailLoop.stop();
    };
  }, [floatAnim, tailSwayAnim]);

  const handlePress = () => {
    if (!interactive) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // Squash & stretch recoil
    Animated.sequence([
      Animated.timing(squashAnim, {
        toValue: 0.88,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(squashAnim, {
        toValue: 1,
        friction: 4,
        tension: 190,
        useNativeDriver: true,
      }),
    ]).start();

    // Trigger xenon strobe flash if in shoot pose or randomize hints
    if (currentPose === 'shoot') {
      setIsStrobeActive(true);
      Animated.sequence([
        Animated.timing(strobeFlashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(strobeFlashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => setIsStrobeActive(false));
    }

    setShowBubble(true);
    if (onPress) onPress();
  };

  const dimension = typeof size === 'number' ? size : SIZE_MAP[size] || 76;

  const tailRotation = tailSwayAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-6deg', '0deg', '6deg'],
  });

  return (
    <View style={[styles.wrapper, style]}>
      {/* Interactive Speech Hint Bubble */}
      {showBubble && (
        <View
          style={[
            styles.speechBubble,
            {
              backgroundColor: isDark ? 'rgba(28, 22, 17, 0.95)' : 'rgba(255, 255, 255, 0.97)',
              borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : 'rgba(212, 175, 55, 0.45)',
            },
          ]}
        >
          <View style={styles.bubbleHeader}>
            <View style={styles.bubbleTitleRow}>
              <Sparkles size={11} color={colors.gold.light} />
              <Text style={[styles.bubbleTitle, { color: colors.gold.DEFAULT }]}>
                Kodak · {badgeText}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowBubble(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={12} color={colors.text.muted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.bubbleText, { color: colors.text.primary }]}>
            {bubbleContent}
          </Text>
          {/* Bubble Pointer Arrow */}
          <View
            style={[
              styles.bubbleArrow,
              {
                backgroundColor: isDark ? 'rgba(28, 22, 17, 0.95)' : 'rgba(255, 255, 255, 0.97)',
                borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : 'rgba(212, 175, 55, 0.45)',
              },
            ]}
          />
        </View>
      )}

      {/* Xenon Strobe Screen Flash Burst Overlay */}
      {isStrobeActive && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            styles.strobeOverlay,
            { opacity: strobeFlashAnim },
          ]}
        />
      )}

      {/* Mascot Bodyset Button */}
      <TouchableOpacity
        activeOpacity={interactive ? 0.88 : 1}
        onPress={handlePress}
        disabled={!interactive}
        accessibilityLabel="Kodak Fox Studio Director"
      >
        <Animated.View
          style={[
            styles.mascotCanvas,
            {
              width: dimension,
              height: (dimension * 240) / 200,
              transform: [{ translateY: floatAnim }, { scale: Animated.multiply(squashAnim, entranceAnim) }],
            },
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 200 240" fill="none">
            <Defs>
              {/* Fox Amber Fur */}
              <SvgLinearGradient id="mFoxAmber" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#F5A020" />
                <Stop offset="45%" stopColor="#E67E22" />
                <Stop offset="100%" stopColor="#C0392B" />
              </SvgLinearGradient>

              {/* Fox Warm Ivory Cheek/Bib */}
              <SvgLinearGradient id="mFoxIvory" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FFFDF8" />
                <Stop offset="100%" stopColor="#F6ECDA" />
              </SvgLinearGradient>

              {/* Luxury Studio Gold */}
              <SvgLinearGradient id="mFoxGold" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#FFE7A3" />
                <Stop offset="50%" stopColor="#D4AF37" />
                <Stop offset="100%" stopColor="#8A5A0A" />
              </SvgLinearGradient>

              {/* Photographer Director Vest */}
              <SvgLinearGradient id="mFoxVest" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#382D22" />
                <Stop offset="50%" stopColor="#2A2219" />
                <Stop offset="100%" stopColor="#1E1711" />
              </SvgLinearGradient>

              {/* Lens Glass */}
              <SvgLinearGradient id="mLensGlass" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#3A506B" />
                <Stop offset="50%" stopColor="#1C2541" />
                <Stop offset="100%" stopColor="#0B132B" />
              </SvgLinearGradient>
            </Defs>

            {/* 1. Ambient Studio Podium Shadow */}
            <Ellipse cx="100" cy="226" rx="52" ry="7.5" fill="rgba(212, 175, 55, 0.16)" />
            <Ellipse cx="100" cy="226" rx="34" ry="4" fill="rgba(46, 36, 27, 0.18)" />

            {/* 2. Fluffy Fox Tail (behind body) */}
            <G>
              <Path
                d="M125 178 C155 175 182 150 178 120 C176 102 154 110 142 128 C135 138 128 155 125 178 Z"
                fill="url(#mFoxAmber)"
                stroke="rgba(212, 175, 55, 0.25)"
                strokeWidth="1.2"
              />
              {/* White Tail Tip */}
              <Path
                d="M178 120 C176 102 154 110 148 119 C154 121 162 118 166 126 C172 124 176 122 178 120 Z"
                fill="url(#mFoxIvory)"
              />
            </G>

            {/* 3. Feet / Paws grounded on podium */}
            <G>
              {/* Left Foot */}
              <Path
                d="M72 215 C72 208 82 208 84 215 L85 224 C85 227 71 227 71 224 Z"
                fill="url(#mFoxIvory)"
                stroke="#2E241B"
                strokeWidth="0.8"
              />
              {/* Right Foot */}
              <Path
                d="M116 215 C116 208 126 208 128 215 L129 224 C129 227 115 227 115 224 Z"
                fill="url(#mFoxIvory)"
                stroke="#2E241B"
                strokeWidth="0.8"
              />
            </G>

            {/* 4. Torso Body & Director Photographer Vest */}
            <G>
              {/* Main Orange Body Silhouette */}
              <Path
                d="M74 146 C74 136 126 136 126 146 L131 212 C131 217 69 217 69 212 Z"
                fill="url(#mFoxAmber)"
              />

              {/* White Chest Fur Bib */}
              <Path
                d="M88 144 C96 160 104 160 112 144 L105 180 C101 184 99 184 95 180 Z"
                fill="url(#mFoxIvory)"
              />

              {/* Photographer Director Vest */}
              <Path
                d="M72 146 L88 146 L100 178 L112 146 L128 146 L131 210 L106 210 L106 182 L94 182 L94 210 L69 210 Z"
                fill="url(#mFoxVest)"
                stroke="rgba(212, 175, 55, 0.35)"
                strokeWidth="1.2"
              />

              {/* Gold Vest Lapel Edges & Zipper */}
              <Path d="M100 182 L100 210" stroke="url(#mFoxGold)" strokeWidth="1.5" />
              <Circle cx="100" cy="184" r="2" fill="url(#mFoxGold)" />

              {/* Gold Studio Director Lanyard Badge */}
              <Path d="M92 146 L112 168" stroke="url(#mFoxGold)" strokeWidth="0.9" strokeDasharray="2,2" />
              <Rect x="111" y="166" width="10" height="13" rx="2" fill="#FFFDF8" stroke="url(#mFoxGold)" strokeWidth="0.8" />
              <Line x1="113" y1="170" x2="119" y2="170" stroke="#2E241B" strokeWidth="0.6" />
              <Line x1="113" y1="173" x2="117" y2="173" stroke="#D4AF37" strokeWidth="0.6" />
            </G>

            {/* 5. Fox Head, Big Ears & Expressive Face */}
            <G>
              {/* Left Ear */}
              <Path
                d="M74 68 L48 24 C55 20 86 44 87 64 Z"
                fill="url(#mFoxAmber)"
                stroke="url(#mFoxGold)"
                strokeWidth="1"
              />
              <Path
                d="M72 62 L54 32 C60 29 80 48 81 58 Z"
                fill="#F8D7DA"
                opacity="0.85"
              />

              {/* Right Ear */}
              <Path
                d="M126 68 L152 24 C145 20 114 44 113 64 Z"
                fill="url(#mFoxAmber)"
                stroke="url(#mFoxGold)"
                strokeWidth="1"
              />
              <Path
                d="M128 62 L146 32 C140 29 120 48 119 58 Z"
                fill="#F8D7DA"
                opacity="0.85"
              />

              {/* Head Silhouette */}
              <Path
                d="M62 96 C59 70 80 58 100 58 C120 58 141 70 138 96 C148 106 142 126 124 126 C112 136 88 136 76 126 C58 126 52 106 62 96 Z"
                fill="url(#mFoxAmber)"
              />

              {/* Fluffy White Cheeks */}
              <Path
                d="M62 96 C65 114 78 125 94 122 C88 116 86 108 88 98 C78 96 68 94 62 96 Z"
                fill="url(#mFoxIvory)"
              />
              <Path
                d="M138 96 C135 114 122 125 106 122 C112 116 114 108 112 98 C122 96 132 94 138 96 Z"
                fill="url(#mFoxIvory)"
              />

              {/* Muzzle */}
              <Ellipse cx="100" cy="107" rx="15" ry="11" fill="url(#mFoxIvory)" />

              {/* Nose - Warm Bronze with Highlight */}
              <Path
                d="M96 100 C96 98 104 98 104 100 C104 103 100 105 100 105 C100 105 96 103 96 100 Z"
                fill="#2E241B"
              />
              <Circle cx="98.5" cy="99.5" r="0.8" fill="#FFFFFF" />

              {/* Smile Mouth */}
              <Path
                d="M96 106 Q100 110 104 106"
                stroke="#2E241B"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
              />
              {currentPose === 'celebrate' && (
                <Path d="M97 107 Q100 112 103 107 Z" fill="#E74C3C" />
              )}

              {/* Eyes & Catchlights */}
              {currentPose === 'celebrate' ? (
                // Cheerful closed eye arcs
                <G>
                  <Path d="M79 92 Q84 87 89 92" stroke="#2E241B" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <Path d="M111 92 Q116 87 121 92" stroke="#2E241B" strokeWidth="2" strokeLinecap="round" fill="none" />
                </G>
              ) : (
                // Sparkling open alert eyes
                <G>
                  {/* Left Eye */}
                  <Circle cx="84" cy="92" r="5.5" fill="#2E241B" />
                  <Circle cx="82.5" cy="90" r="2.2" fill="#FFFFFF" />
                  <Circle cx="86" cy="94" r="1.1" fill="#FFFFFF" />

                  {/* Right Eye */}
                  <Circle cx="116" cy="92" r="5.5" fill="#2E241B" />
                  <Circle cx="114.5" cy="90" r="2.2" fill="#FFFFFF" />
                  <Circle cx="118" cy="94" r="1.1" fill="#FFFFFF" />
                </G>
              )}
            </G>

            {/* 6. Pose Specific Paws & Props */}

            {/* POSE 1: WELCOME (Pass Ticket Concierge) */}
            {currentPose === 'welcome' && (
              <G>
                {/* Waving Left Paw */}
                <G>
                  <Path d="M68 152 C54 140 44 122 42 108 C40 102 48 98 52 104 C56 112 64 130 74 144 Z" fill="url(#mFoxAmber)" />
                  <Circle cx="44" cy="104" r="7" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />
                  {/* Motion Wave Lines */}
                  <Path d="M34 96 Q32 104 36 112" stroke="url(#mFoxGold)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  <Path d="M28 99 Q26 104 29 110" stroke="url(#mFoxGold)" strokeWidth="1" strokeLinecap="round" fill="none" />
                </G>

                {/* Right Paw holding Gold Studio Pass */}
                <G>
                  <Path d="M128 155 C138 162 150 166 156 162 Z" fill="url(#mFoxAmber)" />
                  {/* Studio Pass Ticket */}
                  <G transform="rotate(8, 150, 160)">
                    <Rect x="134" y="140" width="36" height="24" rx="3" fill="#FFFDF8" stroke="url(#mFoxGold)" strokeWidth="1.4" />
                    <Rect x="137" y="143" width="7" height="18" fill="rgba(212, 175, 55, 0.2)" />
                    <Line x1="148" y1="146" x2="164" y2="146" stroke="#2E241B" strokeWidth="1.2" />
                    <Line x1="148" y1="151" x2="160" y2="151" stroke="#D4AF37" strokeWidth="1" />
                    <Line x1="148" y1="156" x2="163" y2="156" stroke="#2E241B" strokeWidth="0.8" strokeDasharray="1.5,1" />
                  </G>
                  {/* Right Paw gripping ticket */}
                  <Circle cx="144" cy="162" r="6" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />
                </G>
              </G>
            )}

            {/* POSE 2: SHOOT (Atelier Photographer with Camera & Xenon Burst) */}
            {currentPose === 'shoot' && (
              <G>
                {/* Xenon Flash Strobe Burst Lines */}
                <G>
                  <Line x1="100" y1="110" x2="100" y2="84" stroke="url(#mFoxGold)" strokeWidth="2" strokeLinecap="round" />
                  <Line x1="100" y1="110" x2="124" y2="92" stroke="url(#mFoxGold)" strokeWidth="1.8" strokeLinecap="round" />
                  <Line x1="100" y1="110" x2="76" y2="92" stroke="url(#mFoxGold)" strokeWidth="1.8" strokeLinecap="round" />
                  <Circle cx="100" cy="112" r="8" fill="rgba(255, 235, 170, 0.45)" />
                </G>

                {/* Rangefinder Camera Body held at chest level */}
                <G>
                  {/* Camera Main Body */}
                  <Rect x="78" y="132" width="44" height="28" rx="4" fill="#FAF5E8" stroke="#2E241B" strokeWidth="1.4" />
                  {/* Top Titanium Plate */}
                  <Rect x="78" y="132" width="44" height="7" rx="2" fill="url(#mFoxGold)" />
                  {/* Shutter Dials & Viewfinder */}
                  <Rect x="83" y="129" width="6" height="3" fill="#2E241B" />
                  <Rect x="111" y="129" width="8" height="3" rx="1" fill="#D4AF37" />
                  <Circle cx="115" cy="135.5" r="1.5" fill="#E74C3C" /> {/* Red Studio Dot */}

                  {/* Lens Barrel & Optics */}
                  <Circle cx="100" cy="147" r="11" fill="url(#mFoxGold)" stroke="#2E241B" strokeWidth="1" />
                  <Circle cx="100" cy="147" r="8.5" fill="url(#mLensGlass)" />
                  <Circle cx="98" cy="145" r="3" fill="rgba(255, 255, 255, 0.35)" />

                  {/* Left & Right Paws gripping camera */}
                  <Circle cx="76" cy="146" r="6" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />
                  <Circle cx="124" cy="146" r="6" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />
                </G>
              </G>
            )}

            {/* POSE 3: INSPECT (Proof Curator with Jeweler's Loupe & Negatives) */}
            {currentPose === 'inspect' && (
              <G>
                {/* 35mm Film Negative Strip held in Left Paw */}
                <G transform="rotate(-12, 75, 155)">
                  <Rect x="54" y="135" width="42" height="20" rx="2" fill="#2A221A" stroke="url(#mFoxGold)" strokeWidth="1" />
                  {/* Sprocket Holes */}
                  <Rect x="56" y="137" width="3" height="2" fill="#FFE8A3" />
                  <Rect x="62" y="137" width="3" height="2" fill="#FFE8A3" />
                  <Rect x="68" y="137" width="3" height="2" fill="#FFE8A3" />
                  <Rect x="56" y="151" width="3" height="2" fill="#FFE8A3" />
                  <Rect x="62" y="151" width="3" height="2" fill="#FFE8A3" />
                  <Rect x="68" y="151" width="3" height="2" fill="#FFE8A3" />
                  {/* Photo Frame */}
                  <Rect x="74" y="138" width="18" height="14" rx="1" fill="rgba(212, 175, 55, 0.25)" />
                </G>
                <Circle cx="64" cy="158" r="6" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />

                {/* Jeweler's Loupe in Right Paw */}
                <G>
                  {/* Loupe Brass Ring & Glass */}
                  <Circle cx="118" cy="125" r="14" fill="rgba(65, 184, 213, 0.2)" stroke="url(#mFoxGold)" strokeWidth="2.2" />
                  <Circle cx="115" cy="122" r="6" fill="rgba(255, 255, 255, 0.4)" />
                  {/* Loupe Handle */}
                  <Line x1="128" y1="135" x2="140" y2="152" stroke="url(#mFoxGold)" strokeWidth="3" strokeLinecap="round" />
                  {/* Right Paw holding handle */}
                  <Circle cx="136" cy="150" r="6" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />
                </G>
              </G>
            )}

            {/* POSE 4: CELEBRATE (Delivery Celebration with Golden Confetti) */}
            {currentPose === 'celebrate' && (
              <G>
                {/* Raised Left Paw */}
                <Path d="M68 150 C56 135 48 108 46 88 C52 86 58 92 62 102 C68 116 72 134 76 148 Z" fill="url(#mFoxAmber)" />
                <Circle cx="48" cy="88" r="7" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />

                {/* Raised Right Paw */}
                <Path d="M132 150 C144 135 152 108 154 88 C148 86 142 92 138 102 C132 116 128 134 124 148 Z" fill="url(#mFoxAmber)" />
                <Circle cx="152" cy="88" r="7" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />

                {/* Golden Confetti & Star Sparks */}
                <Polygon points="35,68 37,74 43,76 37,78 35,84 33,78 27,76 33,74" fill="url(#mFoxGold)" />
                <Polygon points="165,68 167,74 173,76 167,78 165,84 163,78 157,76 163,74" fill="url(#mFoxGold)" />
                <Circle cx="48" cy="60" r="2.5" fill="#E74C3C" />
                <Circle cx="152" cy="58" r="2.5" fill="#3498DB" />
                <Circle cx="100" cy="44" r="3" fill="url(#mFoxGold)" />
                <Circle cx="82" cy="50" r="2" fill="#F1C40F" />
                <Circle cx="118" cy="50" r="2" fill="#E67E22" />
              </G>
            )}

            {/* POSE 5: WAITING (Standby Director) */}
            {currentPose === 'waiting' && (
              <G>
                {/* Left Paw on Vest Waist */}
                <Path d="M72 154 C65 165 64 178 74 186 Z" fill="url(#mFoxAmber)" />
                <Circle cx="76" cy="186" r="6" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />

                {/* Right Paw on Vest Waist */}
                <Path d="M128 154 C135 165 136 178 126 186 Z" fill="url(#mFoxAmber)" />
                <Circle cx="124" cy="186" r="6" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />

                {/* Clock / Hourglass standby indicator */}
                <Circle cx="100" cy="196" r="4.5" fill="rgba(212, 175, 55, 0.2)" stroke="url(#mFoxGold)" strokeWidth="0.8" />
                <Line x1="100" y1="196" x2="100" y2="193" stroke="#D4AF37" strokeWidth="0.8" />
                <Line x1="100" y1="196" x2="102" y2="196" stroke="#D4AF37" strokeWidth="0.8" />
              </G>
            )}

            {/* POSE 6: HOLD QR (Holding a digital QR Code Ticket) */}
            {currentPose === 'hold_qr' && (
              <G>
                {/* Glowing Aura behind QR */}
                <Circle cx="100" cy="155" r="32" fill="url(#mFoxGold)" opacity="0.15" />
                {/* Fox Paws holding the QR code */}
                <G>
                  <Path d="M72 154 C65 165 64 178 82 165 Z" fill="url(#mFoxAmber)" />
                  <Circle cx="80" cy="160" r="6" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />
                  
                  <Path d="M128 154 C135 165 136 178 118 165 Z" fill="url(#mFoxAmber)" />
                  <Circle cx="120" cy="160" r="6" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />
                </G>
                {/* 3D QR Code Ticket */}
                <G transform="translate(86, 138)">
                  <Rect x="0" y="0" width="28" height="28" rx="4" fill="#FFFDF8" stroke="url(#mFoxGold)" strokeWidth="1.5" />
                  <Rect x="4" y="4" width="8" height="8" rx="1" fill="#2E241B" />
                  <Rect x="6" y="6" width="4" height="4" fill="#D4AF37" />
                  
                  <Rect x="16" y="4" width="8" height="8" rx="1" fill="#2E241B" />
                  <Rect x="18" y="6" width="4" height="4" fill="#D4AF37" />
                  
                  <Rect x="4" y="16" width="8" height="8" rx="1" fill="#2E241B" />
                  <Rect x="6" y="18" width="4" height="4" fill="#D4AF37" />
                  
                  <Rect x="16" y="16" width="4" height="4" rx="0.5" fill="#2E241B" />
                  <Rect x="21" y="21" width="3" height="3" rx="0.5" fill="#D4AF37" />
                </G>
              </G>
            )}

            {/* POSE 7: CAMERA REVEAL (Interactive opening of a camera) */}
            {currentPose === 'camera_reveal' && (
              <G>
                {/* Camera Body Frame */}
                <G transform="translate(65, 130)">
                  <Rect x="0" y="0" width="70" height="45" rx="6" fill="#FAF5E8" stroke="#2E241B" strokeWidth="1.8" />
                  <Rect x="0" y="0" width="70" height="12" rx="3" fill="url(#mFoxGold)" />
                  
                  {/* Step 1: Base Camera View (Flash closed, lens flat) */}
                  {animationStep >= 1 && (
                    <G>
                      <Rect x="5" y="-4" width="12" height="4" fill="#2E241B" />
                      <Rect x="52" y="-3" width="10" height="3" rx="1" fill="#D4AF37" />
                      {/* Base Lens */}
                      <Circle cx="35" cy="24" r="16" fill="url(#mFoxGold)" stroke="#2E241B" strokeWidth="1" />
                      <Circle cx="35" cy="24" r="12" fill="url(#mLensGlass)" />
                    </G>
                  )}

                  {/* Step 2: Flash pops up, lens extends */}
                  {animationStep >= 2 && (
                    <G>
                      {/* Flash pops up */}
                      <Rect x="25" y="-12" width="20" height="12" rx="2" fill="#2E241B" />
                      <Rect x="27" y="-10" width="16" height="6" fill="#F5F5F5" />
                      {/* Flash burst */}
                      <Line x1="35" y1="-14" x2="35" y2="-22" stroke="url(#mFoxGold)" strokeWidth="1.5" />
                      <Line x1="35" y1="-14" x2="43" y2="-18" stroke="url(#mFoxGold)" strokeWidth="1.5" />
                      <Line x1="35" y1="-14" x2="27" y2="-18" stroke="url(#mFoxGold)" strokeWidth="1.5" />
                      
                      {/* Lens extends (outer ring) */}
                      <Circle cx="35" cy="24" r="18" fill="rgba(212, 175, 55, 0.4)" stroke="#D4AF37" strokeWidth="2" />
                    </G>
                  )}

                  {/* Step 3: Viewfinder screen lights up / photo emerges */}
                  {animationStep >= 3 && (
                    <G>
                      {/* Back Screen Glow */}
                      <Rect x="15" y="10" width="40" height="28" rx="2" fill="#1C2541" />
                      <Rect x="17" y="12" width="36" height="24" fill="#F5F5F5" />
                      {/* Checkmark on screen */}
                      <Path d="M25 24 L32 30 L45 18" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      {/* Magical floating particles */}
                      <Circle cx="10" cy="-5" r="2" fill="#34D399" />
                      <Circle cx="60" cy="-10" r="1.5" fill="url(#mFoxGold)" />
                      <Circle cx="5" cy="40" r="2.5" fill="#E74C3C" />
                    </G>
                  )}
                </G>
                
                {/* Fox Paws holding the camera sides */}
                <G>
                  <Circle cx="60" cy="152" r="6" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />
                  <Circle cx="140" cy="152" r="6" fill="url(#mFoxIvory)" stroke="#2E241B" strokeWidth="0.8" />
                </G>
              </G>
            )}
          </Svg>
        </Animated.View>
      </TouchableOpacity>

      {/* Optional Brand Badge Underneath */}
      {showBadge && (
        <View
          style={[
            styles.badgePill,
            {
              backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : '#FFF7E6',
              borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : 'rgba(212, 175, 55, 0.45)',
            },
          ]}
        >
          <Sparkles size={9} color={colors.gold.DEFAULT} />
          <Text style={[styles.badgePillText, { color: colors.gold.DEFAULT }]}>
            {badgeText}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  strobeOverlay: {
    backgroundColor: 'rgba(255, 250, 235, 0.75)',
    zIndex: 99,
    borderRadius: 24,
  },
  speechBubble: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 160,
    maxWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 50,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  bubbleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  bubbleTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bubbleText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: -5,
    left: '50%',
    marginLeft: -5,
    width: 10,
    height: 10,
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
  },
  badgePillText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
