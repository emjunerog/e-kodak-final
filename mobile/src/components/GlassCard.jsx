/**
 * GlassCard.jsx
 * Premium frosted glass-effect card for the luxury studio aesthetic.
 * Features dark acrylic translucent gradient, subtle gold hairline border,
 * top-edge specular highlight reflection, and optional gold glow.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadow } from '../theme';

export default function GlassCard({
  children,
  style,
  glow = false,
  gradient = true,
  highlight = true,
  borderGold = false,
}) {
  const { isDark, colors, gradients } = useTheme();
  const cardBorder = borderGold ? colors.gold.borderLight : colors.gold.border;

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: cardBorder,
          shadowColor: isDark ? '#000000' : '#A89270',
          shadowOpacity: isDark ? 0.45 : 0.12,
        },
        glow && {
          shadowColor: colors.gold.DEFAULT,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.35 : 0.22,
          shadowRadius: 20,
          elevation: Platform.OS === 'android' ? 4 : 16,
          borderColor: colors.gold.borderLight,
        },
        style,
      ]}
    >
      {gradient ? (
        <LinearGradient
          colors={gradients.glassCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg.card }]} />
      )}

      {/* Top Specular Edge Highlight */}
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
    elevation: Platform.OS === 'android' ? 3 : 14,
  },

  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    zIndex: 1,
  },
});
