/**
 * StatusBadge.jsx
 * Colored pill badge displaying booking status labels.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_META, Colors, Typography, Radius, Spacing } from '../theme';

export default function StatusBadge({ status, style }) {
  const meta = STATUS_META[String(status || 'PENDING').toUpperCase()] || STATUS_META.PENDING;

  return (
    <View style={[styles.badge, { borderColor: meta.color + '55', backgroundColor: meta.color + '22' }, style]}>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[1],
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  label: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
