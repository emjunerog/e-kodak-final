import React, { useEffect, useState } from 'react';
import { View, Image, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Rect, Path } from 'react-native-svg';

const E_KODAK_LOGO = require('../../assets/ekodak-logo.png');

/**
 * AnimatedSplashOverlay
 * Custom E-Kodak load/enter/close transition using pure geometric shapes
 * and the transparent Fox Camera PNG logo (zero text, zero black background).
 */
export default function AnimatedSplashOverlay({
  mode = 'enter', // 'enter' | 'exit'
  isDark = false,
  onComplete,
}) {
  const [overlayOpacity] = useState(() => new Animated.Value(mode === 'enter' ? 1 : 0));
  const [overlayScale] = useState(() => new Animated.Value(1));
  const [logoScale] = useState(() => new Animated.Value(mode === 'enter' ? 0.68 : 1.08));
  const [ringRotate] = useState(() => new Animated.Value(0));
  const [diamondRotate] = useState(() => new Animated.Value(0));
  const [ringScale] = useState(() => new Animated.Value(mode === 'enter' ? 0.8 : 1.15));
  const [pulseShapes] = useState(() => new Animated.Value(mode === 'enter' ? 0.5 : 1));

  useEffect(() => {
    let active = true;
    let completed = false;

    const finishOnce = () => {
      if (!active || completed) return;
      completed = true;
      if (onComplete) onComplete();
    };

    if (mode === 'enter') {
      const safetyTimer = setTimeout(finishOnce, 1300);
      const anim = Animated.sequence([
        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 7,
            tension: 75,
            useNativeDriver: true,
          }),
          Animated.spring(ringScale, {
            toValue: 1,
            friction: 7,
            tension: 65,
            useNativeDriver: true,
          }),
          Animated.timing(ringRotate, {
            toValue: 1,
            duration: 680,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(diamondRotate, {
            toValue: 1,
            duration: 680,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(pulseShapes, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 320,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(overlayScale, {
            toValue: 1.06,
            duration: 320,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]);

      anim.start(() => {
        clearTimeout(safetyTimer);
        finishOnce();
      });

      return () => {
        active = false;
        clearTimeout(safetyTimer);
        anim.stop();
      };
    }

    // mode === 'exit'
    const safetyTimer = setTimeout(finishOnce, 650);
    const exitAnim = Animated.sequence([
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 190,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 0.94,
          friction: 7,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.spring(ringScale, {
          toValue: 0.92,
          friction: 7,
          tension: 85,
          useNativeDriver: true,
        }),
        Animated.timing(ringRotate, {
          toValue: -1,
          duration: 380,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(diamondRotate, {
          toValue: -1,
          duration: 380,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(130),
    ]);

    exitAnim.start(() => {
      clearTimeout(safetyTimer);
      finishOnce();
    });

    return () => {
      active = false;
      clearTimeout(safetyTimer);
      exitAnim.stop();
    };
  }, [
    mode,
    onComplete,
    overlayOpacity,
    overlayScale,
    logoScale,
    ringRotate,
    diamondRotate,
    ringScale,
    pulseShapes,
  ]);

  const outerSpin = ringRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-48deg', '0deg', '54deg'],
  });
  const innerSpin = diamondRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['45deg', '0deg', '-45deg'],
  });

  const bgColors = isDark
    ? ['#1D1A24', '#121620', '#0E1017']
    : ['#FAF2EA', '#EEF1F6', '#E5EEF7'];

  const goldStroke = isDark ? 'rgba(229, 196, 112, 0.58)' : 'rgba(199, 150, 45, 0.52)';
  const mistStroke = isDark ? 'rgba(176, 198, 232, 0.28)' : 'rgba(95, 128, 174, 0.28)';
  const blushFill = isDark ? 'rgba(232, 194, 172, 0.14)' : 'rgba(236, 196, 170, 0.30)';
  const dotColor = isDark ? '#E6C47E' : '#C7962D';

  return (
    <Animated.View
      pointerEvents={mode === 'exit' ? 'auto' : 'none'}
      style={[
        styles.overlay,
        {
          opacity: overlayOpacity,
          transform: [{ scale: overlayScale }],
        },
      ]}
    >
      <LinearGradient
        colors={bgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.centerStage}>
        {/* Outer rotating shutter ring + 4-point sparkle accents */}
        <Animated.View
          style={[
            styles.shapeLayer,
            {
              transform: [{ scale: ringScale }, { rotate: outerSpin }],
            },
          ]}
        >
          <Svg width={216} height={216} viewBox="0 0 216 216">
            <Circle
              cx="108"
              cy="108"
              r="100"
              stroke={mistStroke}
              strokeWidth="1.5"
              strokeDasharray="8 7"
              fill="none"
            />
            <Circle
              cx="108"
              cy="108"
              r="86"
              stroke={goldStroke}
              strokeWidth="2.2"
              strokeDasharray="28 12"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M 108 2 Q 108 8 114 8 Q 108 8 108 14 Q 108 8 102 8 Q 108 8 108 2 Z"
              fill={goldStroke}
            />
            <Path
              d="M 108 202 Q 108 208 114 208 Q 108 208 108 214 Q 108 208 102 208 Q 108 208 108 202 Z"
              fill={goldStroke}
            />
          </Svg>
        </Animated.View>

        {/* Counter-rotating geometric viewfinder diamond */}
        <Animated.View
          style={[
            styles.shapeLayer,
            {
              opacity: pulseShapes,
              transform: [{ scale: ringScale }, { rotate: innerSpin }],
            },
          ]}
        >
          <Svg width={174} height={174} viewBox="0 0 174 174">
            <Rect
              x="24"
              y="24"
              width="126"
              height="126"
              rx="34"
              stroke={mistStroke}
              strokeWidth="1.6"
              strokeDasharray="10 8"
              fill={blushFill}
            />
          </Svg>
        </Animated.View>

        {/* Transparent PNG Logo directly on studio gradient — NO black backdrop */}
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ scale: logoScale }] },
          ]}
        >
          <Image
            source={E_KODAK_LOGO}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Bottom purely geometric pill-dot indicator (zero text) */}
        <Animated.View
          style={[
            styles.shapeDotsRow,
            {
              opacity: pulseShapes,
              transform: [{ scale: pulseShapes }],
            },
          ]}
        >
          <View style={[styles.shapeDot, { backgroundColor: dotColor }]} />
          <View style={[styles.shapePill, { backgroundColor: mistStroke }]} />
          <View style={[styles.shapeDot, { backgroundColor: dotColor }]} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStage: {
    width: 240,
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shapeLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 132,
    height: 132,
  },
  shapeDotsRow: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shapeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  shapePill: {
    width: 22,
    height: 6,
    borderRadius: 3,
  },
});
