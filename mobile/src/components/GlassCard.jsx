/**
 * GlassCard.jsx
 * Premium frosted glass-effect card for the luxury studio aesthetic.
 * Features dark acrylic translucent gradient, subtle gold hairline border,
 * top-edge specular highlight reflection, and optional gold glow.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Radius, Shadow } from '../theme';

export default function GlassCard({
  children,
  style,
  glow = false,
  gradient = true,
  highlight = true,
  borderGold = false,
}) {
  const cardBorder = borderGold ? Colors.gold.borderLight : Colors.gold.border;

  return (
    <View
      style={[
        styles.container,
        { borderColor: cardBorder },
        glow && styles.glow,
        style,
      ]}
    >
      {gradient ? (
        <LinearGradient
          colors={Gradients.glassCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.bg.card }]} />
      )}

      {/* Top Specular Edge Highlight */}
      {highlight && (
        <LinearGradient
          colors={Gradients.glassHighlight}
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
  },
  glow: {
    shadowColor: Colors.gold.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
    borderColor: Colors.gold.borderLight,
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
