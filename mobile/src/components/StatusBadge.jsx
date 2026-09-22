/**
 * StatusBadge.jsx
 * Luxury translucent status pill with luminous dot indicator,
 * hairline colored border, and Inter_600SemiBold typography.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_META, Typography, Radius, Spacing } from '../theme';

export default function StatusBadge({ status, size = 'sm', style }) {
  const meta = STATUS_META[String(status || 'PENDING').toUpperCase()] || STATUS_META.PENDING;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        isSmall ? styles.badgeSm : styles.badgeMd,
        {
          borderColor: meta.color + '66',
          backgroundColor: meta.color + '1A',
        },
        style,
      ]}
    >
      <View style={[styles.dotWrapper, { backgroundColor: meta.color + '33' }]}>
        <View style={[styles.dot, { backgroundColor: meta.color }]} />
      </View>
      <Text
        style={[
          styles.label,
          isSmall ? styles.labelSm : styles.labelMd,
          { color: meta.color },
        ]}
      >
        {meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingVertical: 3,
    paddingHorizontal: Spacing[3],
    gap: 6,
  },
  badgeMd: {
    paddingVertical: 5,
    paddingHorizontal: Spacing[4],
    gap: 8,
  },
  dotWrapper: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: Typography.fontBodySemi,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  labelSm: {
    fontSize: 10.5,
  },
  labelMd: {
    fontSize: 12,
  },
});
