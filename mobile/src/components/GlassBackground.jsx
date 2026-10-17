/**
 * GlassBackground.jsx
 * Shared ambient backdrop for every app screen — the foundation of the
 * app-wide "Modern Atelier" glass system.
 * Layers (all pointer-transparent, zero behaviour):
 *  1. Theme base fill + vertical studio wash
 *  2. Three slowly drifting aurora orbs (champagne, ember, violet) that
 *     give frosted surfaces something soft to blur
 *  3. Fine top vignette for header legibility
 *
 * Animations are transform-only and native-driven (each orb owns its own
 * Animated.Value, never shared with layout props).
 *
 * Usage: render as the first child of the screen root View.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const { width: W, height: H } = Dimensions.get('window');

function Orb({ color, size, top, left, dx, dy, duration, delay = 0 }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
        ],
      }}
    />
  );
}

export default function GlassBackground({ children }) {
  const { isDark, colors } = useTheme();

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.bg.base }]}>
      {/* Studio wash */}
      <LinearGradient
        colors={
          isDark
            ? ['#141216', '#0B0A0C', '#09080A', '#0E0C0F']
            : ['#FBF9F5', '#F6F3EE', '#F1ECE4', '#F7F4EF']
        }
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Drifting aurora orbs */}
      <Orb
        color={isDark ? 'rgba(217,180,108,0.11)' : 'rgba(217,180,108,0.20)'}
        size={W * 0.9}
        top={-W * 0.35}
        left={W * 0.35}
        dx={-30}
        dy={24}
        duration={9000}
      />
      <Orb
        color={isDark ? 'rgba(242,140,58,0.07)' : 'rgba(242,140,58,0.10)'}
        size={W * 0.75}
        top={H * 0.38}
        left={-W * 0.38}
        dx={36}
        dy={-28}
        duration={11000}
        delay={600}
      />
      <Orb
        color={isDark ? 'rgba(140,110,220,0.06)' : 'rgba(122,184,255,0.08)'}
        size={W * 0.8}
        top={H * 0.72}
        left={W * 0.4}
        dx={-24}
        dy={-30}
        duration={13000}
        delay={1200}
      />

      {/* Top vignette for header legibility */}
      <LinearGradient
        colors={isDark ? ['rgba(9,8,10,0.55)', 'transparent'] : ['rgba(255,255,255,0.5)', 'transparent']}
        style={styles.topVignette}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
});
