/**
 * PremiumIcon.jsx
 * Consistent icon tile for the E-Kodak app ("Modern Atelier" v2).
 * Each lucide glyph sits in a soft squircle tile with a subtle top glint —
 * cleaner and more modern than the old beveled gold ring, while keeping
 * the same public API so every screen inherits the new look.
 *
 * API: { icon, size, box, tone, glow, onPress, accessibilityLabel, style, iconColor, strokeWidth }
 *  - tone: 'glass' (default) | 'soft' | 'gold' | 'dark' | 'ember' | 'mint'
 *  - onPress omitted  -> renders a plain View (no touch handling at all)
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

export default function PremiumIcon({
  icon: Icon,
  size = 20,
  box = 44,
  tone = 'glass',
  glow = false,
  onPress,
  accessibilityLabel,
  style,
  iconColor,
  strokeWidth = 2,
}) {
  const { isDark, colors, gradients } = useTheme();
  const radius = Math.round(box * 0.34);

  const isGradient = tone === 'gold' || tone === 'ember' || tone === 'mint';
  const gradientColors =
    tone === 'ember' ? gradients.ember || ['#FFB067', '#F28C3A', '#C9561C']
      : tone === 'mint' ? gradients.mint || ['#7BF0C0', '#3DDC97', '#1E9E6B']
        : gradients.gold;

  const tileBg =
    tone === 'soft'
      ? colors.gold.bg
      : tone === 'dark'
        ? (isDark ? '#1D1A20' : '#2A2520')
        : isDark
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(255, 255, 255, 0.92)';

  const tileBorder =
    tone === 'soft'
      ? colors.gold.borderLight
      : isDark
        ? 'rgba(255, 255, 255, 0.10)'
        : 'rgba(30, 20, 5, 0.08)';

  const resolvedIconColor =
    iconColor ||
    (isGradient
      ? (isDark ? '#17130C' : '#FFFFFF')
      : tone === 'dark'
        ? colors.gold.light
        : colors.gold.light);

  const glowColor = tone === 'ember' ? '#F28C3A' : tone === 'mint' ? '#3DDC97' : '#D9B46C';

  const content = (
    <View
      style={[
        styles.outer,
        {
          width: box,
          height: box,
          borderRadius: radius,
          shadowColor: glow ? glowColor : '#000000',
          shadowOpacity: glow ? (isDark ? 0.45 : 0.3) : (isDark ? 0.25 : 0.08),
          shadowRadius: glow ? 14 : 8,
          elevation: glow ? 6 : 2,
        },
        style,
      ]}
    >
      {isGradient ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.tile, { width: box, height: box, borderRadius: radius, borderColor: 'rgba(255,255,255,0.25)' }]}
        >
          <Icon size={size} color={resolvedIconColor} strokeWidth={strokeWidth} />
          <LinearGradient
            colors={['rgba(255,255,255,0.45)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.glint, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
            pointerEvents="none"
          />
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.tile,
            {
              width: box,
              height: box,
              borderRadius: radius,
              backgroundColor: tileBg,
              borderColor: tileBorder,
            },
          ]}
        >
          <Icon size={size} color={resolvedIconColor} strokeWidth={strokeWidth} />
          <LinearGradient
            colors={[isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.8)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.glint, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
            pointerEvents="none"
          />
        </View>
      )}
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        try {
          Haptics.selectionAsync();
        } catch {}
        onPress();
      }}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outer: {
    shadowOffset: { width: 0, height: 4 },
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  glint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
  },
});
