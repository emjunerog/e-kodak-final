/**
 * StudioVectorIllustrations.jsx
 * Bespoke luxury animated vector illustrations for E-Kodak Studio cards:
 * 1. ActivatePassVector - Golden Studio Pass ticket with floating hover & glowing aperture
 * 2. ScanPassVector     - Optical camera viewfinder with animated laser sweep & reticle pulse
 * 3. MyPassesVector     - VIP dossier pass collection with floating layers & shining gold star medal
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

// ── 1. ACTIVATE STUDIO PASS VECTOR (ANIMATED) ────────────────────────────────
export function ActivatePassVector({ size = 80 }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const starGlint = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Gentle floating bobbing
    Animated.loop(
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
    ).start();

    // Subtle scale breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.035,
          duration: 2300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Sparkling star glint
    Animated.loop(
      Animated.sequence([
        Animated.timing(starGlint, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(starGlint, {
          toValue: 0.35,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim, pulseAnim, starGlint]);

  return (
    <View style={[styles.vectorWrap, { width: size, height: size }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [
            { translateY: floatAnim },
            { scale: pulseAnim },
          ],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <Defs>
            {/* Ambient Glow */}
            <SvgLinearGradient id="actGlow" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFE7A3" stopOpacity="0.30" />
              <Stop offset="100%" stopColor="#B8860B" stopOpacity="0.04" />
            </SvgLinearGradient>

            {/* Gold Metallic Border */}
            <SvgLinearGradient id="goldPassGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFF1C2" />
              <Stop offset="45%" stopColor="#D4AF37" />
              <Stop offset="80%" stopColor="#996515" />
              <Stop offset="100%" stopColor="#F5D77F" />
            </SvgLinearGradient>

            {/* Ticket Surface Fill - Subtle Warm Ivory Champagne */}
            <SvgLinearGradient id="passSurface" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFDF8" stopOpacity="0.96" />
              <Stop offset="100%" stopColor="#F7EEDC" stopOpacity="0.98" />
            </SvgLinearGradient>
          </Defs>

          {/* Ambient Radial Aura */}
          <Circle cx="50" cy="50" r="44" fill="url(#actGlow)" />

          {/* Studio Pass Ticket Card */}
          <Rect
            x="14"
            y="22"
            width="72"
            height="52"
            rx="10"
            fill="url(#passSurface)"
            stroke="url(#goldPassGrad)"
            strokeWidth="1.8"
          />

          {/* Ticket Notch Cutouts (Left & Right) - Subtle Champagne Tint */}
          <Circle cx="14" cy="48" r="6" fill="#F4EADB" stroke="url(#goldPassGrad)" strokeWidth="1.5" />
          <Circle cx="86" cy="48" r="6" fill="#F4EADB" stroke="url(#goldPassGrad)" strokeWidth="1.5" />

          {/* Vertical Perforation Dash Line */}
          <Path
            d="M38 24 L38 72"
            stroke="#D4AF37"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            strokeOpacity="0.6"
          />

          {/* Left Side: Camera Aperture Icon */}
          <Circle cx="26" cy="48" r="9" stroke="url(#goldPassGrad)" strokeWidth="1.4" />
          <Circle cx="26" cy="48" r="4.5" fill="#E5BD67" fillOpacity="0.85" />
          <Circle cx="26" cy="48" r="2" fill="#FFFDF8" />

          {/* Right Side: Pass Milestone Details Lines */}
          <Rect x="44" y="32" width="28" height="3" rx="1.5" fill="#D4AF37" fillOpacity="0.85" />
          <Rect x="44" y="40" width="20" height="2.5" rx="1.25" fill="#C59B27" fillOpacity="0.75" />
          <Rect x="44" y="47" width="24" height="2.5" rx="1.25" fill="#C59B27" fillOpacity="0.55" />

          {/* Barcode / Milestones at bottom right */}
          <Rect x="44" y="56" width="3" height="10" rx="1" fill="#D4AF37" fillOpacity="0.8" />
          <Rect x="49" y="56" width="2" height="10" rx="1" fill="#C59B27" fillOpacity="0.65" />
          <Rect x="53" y="56" width="4" height="10" rx="1" fill="#D4AF37" fillOpacity="0.8" />
          <Rect x="59" y="56" width="2" height="10" rx="1" fill="#C59B27" fillOpacity="0.65" />
          <Rect x="63" y="56" width="3.5" height="10" rx="1" fill="#D4AF37" fillOpacity="0.8" />
          <Rect x="68" y="56" width="2" height="10" rx="1" fill="#C59B27" fillOpacity="0.65" />

          {/* 4-Point Sparkling Star Crest */}
          <G transform="translate(68, 14)">
            <Path
              d="M8 0 Q8 8 0 8 Q8 8 8 16 Q8 8 16 8 Q8 8 8 0 Z"
              fill="url(#goldPassGrad)"
            />
          </G>
          <G transform="translate(8, 62) scale(0.65)">
            <Path
              d="M8 0 Q8 8 0 8 Q8 8 8 16 Q8 8 16 8 Q8 8 8 0 Z"
              fill="url(#goldPassGrad)"
              fillOpacity="0.85"
            />
          </G>
        </Svg>

        {/* Ambient Top Star Twinkle Glint Overlay */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: size * 0.12,
            right: size * 0.20,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#FFF5D6',
            opacity: starGlint,
            shadowColor: '#FFE7A3',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 5,
          }}
        />
      </Animated.View>
    </View>
  );
}

// ── 2. SCAN STUDIO PASS VECTOR (ANIMATED WITH LIVE LASER SWEEP) ───────────────
export function ScanPassVector({ size = 80 }) {
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Laser beam vertical sweep up and down
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Viewfinder optical focus pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.035,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [laserAnim, pulseAnim]);

  // Sweep range across the viewfinder
  const laserTranslate = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-size * 0.22, size * 0.22],
  });

  return (
    <View style={[styles.vectorWrap, { width: size, height: size }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transform: [{ scale: pulseAnim }],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <Defs>
            {/* Ambient Scanner Glow */}
            <SvgLinearGradient id="scanGlow" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#D4AF37" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#996515" stopOpacity="0.03" />
            </SvgLinearGradient>

            {/* Gold Corner Reticle Gradient */}
            <SvgLinearGradient id="goldReticle" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFF1C2" />
              <Stop offset="50%" stopColor="#D4AF37" />
              <Stop offset="100%" stopColor="#AA7818" />
            </SvgLinearGradient>

            {/* Scan Surface Background - Subtle Warm Luminous Champagne */}
            <SvgLinearGradient id="scanSurface" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFDF8" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#F6ECDA" stopOpacity="0.98" />
            </SvgLinearGradient>
          </Defs>

          {/* Ambient Aura */}
          <Circle cx="50" cy="50" r="44" fill="url(#scanGlow)" />

          {/* Viewfinder Glass Container */}
          <Rect
            x="16"
            y="16"
            width="68"
            height="68"
            rx="12"
            fill="url(#scanSurface)"
            stroke="#D4AF37"
            strokeWidth="1.2"
            strokeOpacity="0.45"
          />

          {/* Heavy Optical Viewfinder Corner Brackets */}
          {/* Top-Left */}
          <Path
            d="M20 33 V23 A3 3 0 0 1 23 20 H33"
            stroke="url(#goldReticle)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Top-Right */}
          <Path
            d="M67 20 H77 A3 3 0 0 1 80 23 V33"
            stroke="url(#goldReticle)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Bottom-Left */}
          <Path
            d="M20 67 V77 A3 3 0 0 0 23 80 H33"
            stroke="url(#goldReticle)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Bottom-Right */}
          <Path
            d="M67 80 H77 A3 3 0 0 0 80 77 V67"
            stroke="url(#goldReticle)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Stylized QR Matrix Elements */}
          {/* Top-Left QR Eye */}
          <Rect x="30" y="30" width="13" height="13" rx="3" stroke="#D4AF37" strokeWidth="1.6" />
          <Rect x="34" y="34" width="5" height="5" rx="1.5" fill="#C59B27" />

          {/* Top-Right QR Eye */}
          <Rect x="57" y="30" width="13" height="13" rx="3" stroke="#D4AF37" strokeWidth="1.6" />
          <Rect x="61" y="34" width="5" height="5" rx="1.5" fill="#C59B27" />

          {/* Bottom-Left QR Eye */}
          <Rect x="30" y="57" width="13" height="13" rx="3" stroke="#D4AF37" strokeWidth="1.6" />
          <Rect x="34" y="61" width="5" height="5" rx="1.5" fill="#C59B27" />

          {/* Data Pattern Bits */}
          <Rect x="48" y="32" width="4" height="4" rx="1" fill="#D4AF37" />
          <Rect x="48" y="40" width="4" height="6" rx="1" fill="#C59B27" fillOpacity="0.85" />
          <Rect x="56" y="47" width="5" height="4" rx="1" fill="#D4AF37" fillOpacity="0.75" />
          <Rect x="48" y="52" width="4" height="8" rx="1" fill="#C59B27" />
          <Rect x="57" y="57" width="6" height="4" rx="1" fill="#D4AF37" fillOpacity="0.75" />
          <Rect x="65" y="63" width="5" height="6" rx="1" fill="#C59B27" fillOpacity="0.75" />

          {/* Glowing Optical Crosshair */}
          <Path d="M50 20 L50 26 M50 74 L50 80 M20 50 L26 50 M74 50 L80 50" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" />
        </Svg>

        {/* Live Animated Laser Scanning Beam Sweeper */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size * 0.64,
            height: 3,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateY: laserTranslate }],
          }}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255, 231, 163, 0.75)', '#FFFFFF', 'rgba(255, 231, 163, 0.75)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: '#FFFFFF',
              shadowColor: '#FFE7A3',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.95,
              shadowRadius: 5,
            }}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ── 3. MY STUDIO PASSES VECTOR (ANIMATED WITH FLOATING LAYERS) ───────────────
export function MyPassesVector({ size = 80 }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const medalPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle floating bobbing
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -3.5,
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Medallion shine glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(medalPulse, {
          toValue: 1.08,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(medalPulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim, medalPulse]);

  return (
    <View style={[styles.vectorWrap, { width: size, height: size }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: floatAnim }],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <Defs>
            {/* Ambient Glow */}
            <SvgLinearGradient id="passAura" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#F5D77F" stopOpacity="0.28" />
              <Stop offset="100%" stopColor="#805608" stopOpacity="0.04" />
            </SvgLinearGradient>

            {/* Primary Gold Metallic */}
            <SvgLinearGradient id="cardGold" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFF1C2" />
              <Stop offset="40%" stopColor="#D4AF37" />
              <Stop offset="80%" stopColor="#8A5A0A" />
              <Stop offset="100%" stopColor="#E2BF5C" />
            </SvgLinearGradient>

            {/* Back Card Fill - Subtle Warm Champagne */}
            <SvgLinearGradient id="backCardFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#F9F1DE" />
              <Stop offset="100%" stopColor="#EEDBBA" />
            </SvgLinearGradient>

            {/* Front Card Fill - Subtle Warm Ivory */}
            <SvgLinearGradient id="frontCardFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFDF9" />
              <Stop offset="100%" stopColor="#F8EEDB" />
            </SvgLinearGradient>
          </Defs>

          {/* Ambient Glow */}
          <Circle cx="50" cy="50" r="44" fill="url(#passAura)" />

          {/* Back Stacked Card (Offset / Layered Angle) */}
          <G transform="rotate(-6 50 48)">
            <Rect
              x="20"
              y="20"
              width="60"
              height="46"
              rx="9"
              fill="url(#backCardFill)"
              stroke="#D4AF37"
              strokeWidth="1.4"
              strokeOpacity="0.5"
            />
            <Rect x="28" y="27" width="22" height="3" rx="1.5" fill="#D4AF37" fillOpacity="0.4" />
          </G>

          {/* Front Featured Atelier Pass Card */}
          <Rect
            x="16"
            y="28"
            width="68"
            height="50"
            rx="10"
            fill="url(#frontCardFill)"
            stroke="url(#cardGold)"
            strokeWidth="1.8"
          />

          {/* Film Strip Sprocket Perforations along top edge */}
          <Rect x="22" y="33" width="5" height="3.5" rx="1" fill="#D4AF37" fillOpacity="0.75" />
          <Rect x="31" y="33" width="5" height="3.5" rx="1" fill="#D4AF37" fillOpacity="0.75" />
          <Rect x="40" y="33" width="5" height="3.5" rx="1" fill="#D4AF37" fillOpacity="0.75" />
          <Rect x="49" y="33" width="5" height="3.5" rx="1" fill="#D4AF37" fillOpacity="0.75" />
          <Rect x="58" y="33" width="5" height="3.5" rx="1" fill="#D4AF37" fillOpacity="0.75" />
          <Rect x="67" y="33" width="5" height="3.5" rx="1" fill="#D4AF37" fillOpacity="0.75" />

          {/* Pass Details Lines */}
          <Rect x="22" y="44" width="30" height="3.5" rx="1.75" fill="#D4AF37" />
          <Rect x="22" y="52" width="20" height="2.5" rx="1.25" fill="#C59B27" fillOpacity="0.75" />
          <Rect x="22" y="58" width="25" height="2.5" rx="1.25" fill="#C59B27" fillOpacity="0.55" />
          <Rect x="22" y="65" width="16" height="3" rx="1.5" fill="#3B82F6" fillOpacity="0.85" />

          {/* Gold Seal Medallion Badge (Center-Right) - Subtle Luminous Gold */}
          <Circle cx="64" cy="57" r="12" fill="#FBF5E6" stroke="url(#cardGold)" strokeWidth="1.6" />
          <Circle cx="64" cy="57" r="9.5" fill="#F4E6C3" />

          {/* Star Inside Medallion */}
          <G transform="translate(58.5, 51.5) scale(0.7)">
            <Path
              d="M8 0 Q8 8 0 8 Q8 8 8 16 Q8 8 16 8 Q8 8 8 0 Z"
              fill="url(#cardGold)"
            />
          </G>

          {/* Medallion Ribbon Tails */}
          <Path
            d="M60 67 L57 78 L63 74 L68 78 L66 67 Z"
            fill="url(#cardGold)"
            fillOpacity="0.85"
          />

          {/* Floating Sparkle Top-Right */}
          <G transform="translate(74, 16) scale(0.8)">
            <Path
              d="M8 0 Q8 8 0 8 Q8 8 8 16 Q8 8 16 8 Q8 8 8 0 Z"
              fill="url(#cardGold)"
            />
          </G>
        </Svg>

        {/* Pulsing Gold Medallion Gleam Highlight */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: size * 0.22,
            right: size * 0.20,
            width: size * 0.24,
            height: size * 0.24,
            borderRadius: (size * 0.24) / 2,
            backgroundColor: 'rgba(255, 231, 163, 0.25)',
            transform: [{ scale: medalPulse }],
          }}
        />
      </Animated.View>
    </View>
  );
}

// ── 4. STUDIO RATES VECTOR (CLEAN MINIMALIST GEOMETRIC) ────────────────────────
export function StudioRatesVector({ size = 50 }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -2.5,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  return (
    <View style={[styles.vectorWrap, { width: size, height: size }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: floatAnim }],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <Defs>
            <SvgLinearGradient id="ratesGold" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFF1C2" />
              <Stop offset="50%" stopColor="#D4AF37" />
              <Stop offset="100%" stopColor="#8A5A0A" />
            </SvgLinearGradient>
            <SvgLinearGradient id="ratesCardBg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFDF8" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#F7EEDC" stopOpacity="0.98" />
            </SvgLinearGradient>
          </Defs>

          {/* Clean Tier Card */}
          <Rect
            x="18"
            y="24"
            width="64"
            height="48"
            rx="9"
            fill="url(#ratesCardBg)"
            stroke="url(#ratesGold)"
            strokeWidth="1.8"
          />

          {/* Clean Lens Aperture Ring */}
          <Circle cx="40" cy="48" r="13" stroke="url(#ratesGold)" strokeWidth="1.5" />
          <Circle cx="40" cy="48" r="6" fill="#D4AF37" fillOpacity="0.75" />
          <Circle cx="40" cy="48" r="2.5" fill="#FFFDF8" />

          {/* Crisp Package Tier Bars */}
          <Rect x="59" y="38" width="16" height="3" rx="1.5" fill="#D4AF37" />
          <Rect x="59" y="46" width="12" height="2.5" rx="1.25" fill="#C59B27" fillOpacity="0.75" />
          <Rect x="59" y="53" width="14" height="2.5" rx="1.25" fill="#C59B27" fillOpacity="0.55" />

          {/* Subtle Sparkle Accent Top Right */}
          <G transform="translate(68, 16) scale(0.65)">
            <Path
              d="M8 0 Q8 8 0 8 Q8 8 8 16 Q8 8 16 8 Q8 8 8 0 Z"
              fill="url(#ratesGold)"
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

// ── 5. SHOOT PREP VECTOR (CLEAN MINIMALIST WARDROBE & LIGHTING) ──────────────
export function ShootPrepVector({ size = 50 }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -2.5,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  return (
    <View style={[styles.vectorWrap, { width: size, height: size }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: floatAnim }],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <Defs>
            <SvgLinearGradient id="prepGold" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFF1C2" />
              <Stop offset="50%" stopColor="#D4AF37" />
              <Stop offset="100%" stopColor="#8A5A0A" />
            </SvgLinearGradient>
            <SvgLinearGradient id="prepBackBg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFDF8" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#F7EEDC" stopOpacity="0.98" />
            </SvgLinearGradient>
          </Defs>

          {/* Clean Softbox Spotlight Backdrop Diamond */}
          <Rect
            x="20"
            y="22"
            width="60"
            height="54"
            rx="12"
            fill="url(#prepBackBg)"
            stroke="url(#prepGold)"
            strokeWidth="1.8"
          />

          {/* Minimalist Wardrobe Hanger Hook & Frame */}
          <Path
            d="M50 32 C47 32 45 35 48 38 C50 40 50 43 50 45 L32 57 C30 58 31 60 33 60 L67 60 C69 60 70 58 68 57 L50 45"
            stroke="url(#prepGold)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Clean Cross-Bar Accent */}
          <Path
            d="M36 60 L64 60"
            stroke="#D4AF37"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Subtle Sparkle Accent */}
          <G transform="translate(66, 18) scale(0.65)">
            <Path
              d="M8 0 Q8 8 0 8 Q8 8 8 16 Q8 8 16 8 Q8 8 8 0 Z"
              fill="url(#prepGold)"
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

// ── 6. STUDIO BAY VECTOR (CLEAN MINIMALIST LOCATION & TRIPOD) ─────────────────
export function StudioBayVector({ size = 50 }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -2.5,
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  return (
    <View style={[styles.vectorWrap, { width: size, height: size }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: floatAnim }],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <Defs>
            <SvgLinearGradient id="bayGold" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFF1C2" />
              <Stop offset="50%" stopColor="#D4AF37" />
              <Stop offset="100%" stopColor="#8A5A0A" />
            </SvgLinearGradient>
            <SvgLinearGradient id="bayBackBg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFDF8" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#F7EEDC" stopOpacity="0.98" />
            </SvgLinearGradient>
          </Defs>

          {/* Studio Floor Plan Container */}
          <Rect
            x="20"
            y="22"
            width="60"
            height="54"
            rx="12"
            fill="url(#bayBackBg)"
            stroke="url(#bayGold)"
            strokeWidth="1.8"
          />

          {/* Clean Studio Tripod Base */}
          <Path
            d="M50 46 L36 67 M50 46 L50 67 M50 46 L64 67"
            stroke="url(#bayGold)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Location Beacon Pin / Camera Mount Head */}
          <Circle cx="50" cy="40" r="7.5" fill="#F4EADB" stroke="url(#bayGold)" strokeWidth="1.8" />
          <Circle cx="50" cy="40" r="3" fill="#D4AF37" />

          {/* Beacon Radiating Arc */}
          <Path
            d="M40 33 C45 29 55 29 60 33"
            stroke="#D4AF37"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />

          {/* Subtle Sparkle Accent */}
          <G transform="translate(68, 16) scale(0.65)">
            <Path
              d="M8 0 Q8 8 0 8 Q8 8 8 16 Q8 8 16 8 Q8 8 8 0 Z"
              fill="url(#bayGold)"
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  vectorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

