/**
 * GlassCard.jsx — True glassmorphism card.
 * Same API: { children, style, glow, gradient, highlight, borderGold }
 *  + optional { blurred=true, intensity }.
 * Renders a real hardware BlurView foundation with a light translucent
 * wash and a softened gradient veil, finished with a hairline border and
 * a top specular highlight. Set blurred={false} to fall back to the
 * plain translucent fill (e.g. inside already-blurred sheets).
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
  intensity,
}) {
  const { isDark, colors, gradients } = useTheme();
  const cardBorder = borderGold || glow
    ? colors.gold.borderLight
    : (colors.surface?.hairline || colors.gold.border);

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: cardBorder,
          backgroundColor: isDark ? 'rgba(24, 22, 26, 0.58)' : 'rgba(255, 255, 255, 0.72)',
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
      {/* Real frosted-glass foundation */}
      {blurred && (
        <BlurView
          intensity={intensity ?? (isDark ? 45 : 32)}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Soft gradient veil (kept subtle so content stays legible) */}
      {gradient && (
        <View style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}>
          <LinearGradient
            colors={gradients.glassCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Top specular edge highlight */}
      {highlight && (
        <LinearGradient
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
