/**
 * IntroVideoOverlay.jsx
 * Plays the minimal luxury E-Kodak Studio logo intro animation before opening TutorialScreen.
 * Uses continuous cubic-bezier & spring curves with an overlapping cross-dissolve handoff
 * (onExitStart) so the transition into TutorialScreen is completely seamless.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Typography } from '../theme';

const E_KODAK_LOGO = require('../../assets/ekodak-logo.png');
const STUDIO_BG_GRADIENT = ['#FAF2EA', '#EEF1F6', '#E5EEF7'];

const EASE_OUT_LUXURY = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_SOFT_DECEL = Easing.bezier(0.22, 1, 0.36, 1);

export default function IntroVideoOverlay({ onExitStart, onComplete }) {
  const completedRef = useRef(false);
  const exitStartedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onExitStartRef = useRef(onExitStart);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onExitStartRef.current = onExitStart;
  });

  const [overlayOpacity] = useState(() => new Animated.Value(1));
  const [stageScale] = useState(() => new Animated.Value(1));
  const [haloOpacity] = useState(() => new Animated.Value(0));
  const [haloScale] = useState(() => new Animated.Value(0.85));
  const [ringOpacity] = useState(() => new Animated.Value(0));
  const [ringScale] = useState(() => new Animated.Value(0.84));
  const [ringRotate] = useState(() => new Animated.Value(0));
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [logoScale] = useState(() => new Animated.Value(0.82));
  const [logoTranslateY] = useState(() => new Animated.Value(18));
  const [glintTranslateX] = useState(() => new Animated.Value(-170));
  const [glintOpacity] = useState(() => new Animated.Value(0));
  const [textOpacity] = useState(() => new Animated.Value(0));
  const [textTranslateY] = useState(() => new Animated.Value(16));
  const [barScaleX] = useState(() => new Animated.Value(0.05));
  const [subOpacity] = useState(() => new Animated.Value(0));
  const [subTranslateY] = useState(() => new Animated.Value(8));

  useEffect(() => {
    let active = true;

    const triggerExitStart = () => {
      if (!active || exitStartedRef.current) return;
      exitStartedRef.current = true;
      setExiting(true);
      onExitStartRef.current?.();
    };

    const finish = () => {
      if (!active || completedRef.current) return;
      completedRef.current = true;
      triggerExitStart();
      onCompleteRef.current?.();
    };

    const exitStartTimer = setTimeout(triggerExitStart, 2000);
    const safetyTimer = setTimeout(finish, 2850);

    // Continuous slow rotation of the aperture ring across the full intro so motion never freezes
    const continuousSpin = Animated.timing(ringRotate, {
      toValue: 1,
      duration: 2550,
      easing: EASE_SOFT_DECEL,
      useNativeDriver: true,
    });
    continuousSpin.start();

    const sequence = Animated.sequence([
      // Stage 1: Fluid layered entrance
      Animated.parallel([
        Animated.timing(haloOpacity, {
          toValue: 1,
          duration: 950,
          easing: EASE_SOFT_DECEL,
          useNativeDriver: true,
        }),
        Animated.timing(haloScale, {
          toValue: 1.06,
          duration: 1950,
          easing: Easing.out(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 1,
          duration: 720,
          easing: EASE_SOFT_DECEL,
          useNativeDriver: true,
        }),
        Animated.spring(ringScale, {
          toValue: 1,
          damping: 18,
          stiffness: 85,
          mass: 0.9,
          useNativeDriver: true,
        }),
        // Emblem spring + bezier lift
        Animated.sequence([
          Animated.delay(90),
          Animated.parallel([
            Animated.timing(logoOpacity, {
              toValue: 1,
              duration: 680,
              easing: EASE_SOFT_DECEL,
              useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
              toValue: 1,
              damping: 16,
              stiffness: 92,
              mass: 0.85,
              useNativeDriver: true,
            }),
            Animated.timing(logoTranslateY, {
              toValue: 0,
              duration: 920,
              easing: EASE_OUT_LUXURY,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Soft specular lens sheen across the emblem
        Animated.sequence([
          Animated.delay(580),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(glintOpacity, {
                toValue: 0.68,
                duration: 320,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
              Animated.timing(glintOpacity, {
                toValue: 0,
                duration: 460,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(glintTranslateX, {
              toValue: 170,
              duration: 780,
              easing: EASE_SOFT_DECEL,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Staggered editorial wordmark + gold rule + STUDIO
        Animated.sequence([
          Animated.delay(420),
          Animated.parallel([
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 720,
              easing: EASE_SOFT_DECEL,
              useNativeDriver: true,
            }),
            Animated.timing(textTranslateY, {
              toValue: 0,
              duration: 780,
              easing: EASE_OUT_LUXURY,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.delay(140),
              Animated.parallel([
                Animated.timing(barScaleX, {
                  toValue: 1,
                  duration: 640,
                  easing: EASE_OUT_LUXURY,
                  useNativeDriver: true,
                }),
                Animated.timing(subOpacity, {
                  toValue: 1,
                  duration: 640,
                  easing: EASE_SOFT_DECEL,
                  useNativeDriver: true,
                }),
                Animated.timing(subTranslateY, {
                  toValue: 0,
                  duration: 680,
                  easing: EASE_OUT_LUXURY,
                  useNativeDriver: true,
                }),
              ]),
            ]),
          ]),
        ]),
      ]),
      // Stage 2: Seamless cross-dissolve handoff into TutorialScreen
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 540,
          easing: EASE_SOFT_DECEL,
          useNativeDriver: true,
        }),
        Animated.timing(stageScale, {
          toValue: 1.04,
          duration: 540,
          easing: EASE_SOFT_DECEL,
          useNativeDriver: true,
        }),
      ]),
    ]);

    sequence.start((result) => {
      if (result?.finished) {
        clearTimeout(exitStartTimer);
        clearTimeout(safetyTimer);
        finish();
      }
    });

    return () => {
      active = false;
      clearTimeout(exitStartTimer);
      clearTimeout(safetyTimer);
      continuousSpin.stop();
      sequence.stop();
    };
  }, [
    barScaleX,
    glintOpacity,
    glintTranslateX,
    haloOpacity,
    haloScale,
    logoOpacity,
    logoScale,
    logoTranslateY,
    overlayOpacity,
    ringOpacity,
    ringRotate,
    ringScale,
    stageScale,
    subOpacity,
    subTranslateY,
    textOpacity,
    textTranslateY,
  ]);

  const spinDeg = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-48deg', '12deg'],
  });

  return (
    <Animated.View
      pointerEvents={exiting ? 'none' : 'auto'}
      style={[styles.container, { opacity: overlayOpacity }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FAF2EA" />
      <LinearGradient
        colors={STUDIO_BG_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.stage,
          { transform: [{ scale: stageScale }] },
        ]}
      >
        <View style={styles.emblemWrap}>
          {/* Soft warm champagne halo */}
          <Animated.View
            style={[
              styles.haloLayer,
              {
                opacity: haloOpacity,
                transform: [{ scale: haloScale }],
              },
            ]}
          >
            <Svg width={280} height={280} viewBox="0 0 280 280">
              <Defs>
                <RadialGradient id="ekHalo" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0%" stopColor="#F8E0A8" stopOpacity="0.52" />
                  <Stop offset="62%" stopColor="#F8E0A8" stopOpacity="0.16" />
                  <Stop offset="100%" stopColor="#F8E0A8" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="140" cy="140" r="136" fill="url(#ekHalo)" />
            </Svg>
          </Animated.View>

          {/* Precision hairline gold aperture ring */}
          <Animated.View
            style={[
              styles.ringLayer,
              {
                opacity: ringOpacity,
                transform: [{ scale: ringScale }, { rotate: spinDeg }],
              },
            ]}
          >
            <Svg width={216} height={216} viewBox="0 0 216 216">
              <Circle
                cx="108"
                cy="108"
                r="102"
                stroke="rgba(186, 138, 42, 0.42)"
                strokeWidth="1.4"
                strokeDasharray="36 10"
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>

          {/* Main E-Kodak Studio emblem */}
          <Animated.View
            style={[
              styles.logoBox,
              {
                opacity: logoOpacity,
                transform: [{ translateY: logoTranslateY }, { scale: logoScale }],
              },
            ]}
          >
            <Image
              source={E_KODAK_LOGO}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glintStrip,
                {
                  opacity: glintOpacity,
                  transform: [{ translateX: glintTranslateX }, { rotate: '28deg' }],
                },
              ]}
            >
              <LinearGradient
                colors={[
                  'rgba(255, 252, 242, 0)',
                  'rgba(255, 252, 242, 0.65)',
                  'rgba(255, 252, 242, 0)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </Animated.View>
        </View>

        {/* Minimal wordmark & studio subtitle */}
        <Animated.View
          style={[
            styles.wordmarkBlock,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>E-KODAK</Text>
          <Animated.View
            style={[
              styles.goldRule,
              { transform: [{ scaleX: barScaleX }] },
            ]}
          />
          <Animated.Text
            style={[
              styles.brandSub,
              {
                opacity: subOpacity,
                transform: [{ translateY: subTranslateY }],
              },
            ]}
          >
            STUDIO
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    width: '100%',
    height: '100%',
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: '#EEF1F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemWrap: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloLayer: {
    position: 'absolute',
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLayer: {
    position: 'absolute',
    width: 216,
    height: 216,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 176,
    height: 176,
    borderRadius: 88,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 176,
    height: 176,
  },
  glintStrip: {
    position: 'absolute',
    top: -30,
    bottom: -30,
    width: 56,
  },
  wordmarkBlock: {
    alignItems: 'center',
    marginTop: 12,
  },
  brandTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: 28,
    letterSpacing: 3.4,
    color: '#18181C',
    textAlign: 'center',
  },
  goldRule: {
    width: 30,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#BA8A2A',
    marginTop: 10,
    marginBottom: 9,
  },
  brandSub: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 10.5,
    letterSpacing: 5.5,
    color: '#8E6C24',
    textAlign: 'center',
    marginLeft: 5.5,
  },
});
