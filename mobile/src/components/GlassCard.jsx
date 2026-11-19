/**
 * GlassCard.jsx — Tinted frosted glass card container.
 * Renders a theme-colored frosted gradient surface + subtle top specular
 * highlight without noisy circular decorations behind text.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadow } from '../theme';

export default function GlassCard({
  children,
  style,
  glow = false,
  gradient = true,
  highlight = true,
  borderGold = false,
  blurred = true,
  opaque = false,
  intensity,
}) {
  const { isDark, isSage, highContrast, colors, gradients } = useTheme();
  const cardBorder = highContrast
    ? colors.gold.borderLight
    : borderGold || glow
      ? colors.gold.borderLight
      : isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? 'rgba(194, 206, 184, 0.92)'
          : 'rgba(216, 222, 234, 0.94)';

  const resolvedBackground = opaque || highContrast
    ? colors.bg.card
    : Platform.OS === 'ios'
      ? isDark
        ? 'rgba(24, 26, 36, 0.62)'
        : isSage
          ? 'rgba(253, 254, 251, 0.96)'
          : 'rgba(255, 255, 255, 0.96)'
      : isDark
        ? 'rgba(24, 27, 38, 0.76)'
        : isSage
          ? 'rgba(253, 254, 251, 0.96)'
          : 'rgba(255, 255, 255, 0.96)';

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: cardBorder,
          borderWidth: highContrast ? 1.75 : 1,
          backgroundColor: resolvedBackground,
          shadowColor: isDark ? '#000000' : '#6B5530',
          shadowOpacity: isDark ? 0.28 : 0.08,
        },
        glow && {
          shadowColor: colors.gold.DEFAULT,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.22 : 0.14,
          shadowRadius: 22,
          elevation: Platform.OS === 'android' ? 4 : 12,
        },
        style,
      ]}
    >
      {/* Native frosted glass on iOS; tinted frosted gradient across all platforms */}
      {!opaque && blurred && Platform.OS === 'ios' && (
        <BlurView
          intensity={intensity ?? (isDark ? 45 : 36)}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Rich theme gradient fill inside frost surface */}
      {!opaque && gradient && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.88 }]}>
          <LinearGradient
            colors={gradients.glassCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Subtle top-edge frost shimmer */}
      {!opaque && (
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0)']
              : ['rgba(255, 255, 255, 0.56)', 'rgba(255, 255, 255, 0)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.topFrostGlaze}
        />
      )}

      {/* Top specular edge highlight */}
      {highlight && (
        <LinearGradient
          pointerEvents="none"
          colors={gradients.glassHighlight}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.specularHighlight}
        />
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.card,
    shadowRadius: 18,
    elevation: Platform.OS === 'android' ? 2 : 10,
  },
  topFrostGlaze: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    borderRadius: 1,
    opacity: 0.9,
    zIndex: 1,
  },
});
