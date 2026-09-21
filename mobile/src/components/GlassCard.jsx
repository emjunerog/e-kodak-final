/**
 * GlassCard.jsx
 * Premium frosted glass-effect card used throughout the app.
 * Dark surface with a subtle gold border and optional glow.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow } from '../theme';

export default function GlassCard({ children, style, glow = false }) {
  return (
    <View style={[styles.card, glow && styles.glow, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  glow: {
    shadowColor: Colors.gold.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
});
