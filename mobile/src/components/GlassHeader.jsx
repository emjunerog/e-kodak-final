/**
 * GlassHeader.jsx
 * Shared frosted editorial header — one consistent glass bar app-wide.
 * Real BlurView foundation + translucent wash + gold hairline + specular
 * top edge. Content slots preserve each screen's behaviour:
 *
 *   <GlassHeader icon={BookOpen} title="..." subtitle="..." />
 *   <GlassHeader left={<.../>} right={<.../>}> custom center </GlassHeader>
 *
 * When `icon` is given and no `left`, a PremiumIcon podium renders it.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing } from '../theme';
import PremiumIcon from './PremiumIcon';

export default function GlassHeader({
  icon: Icon,
  iconTone = 'soft',
  title,
  subtitle,
  left,
  right,
  children,
  style,
}) {
  const { isDark, colors } = useTheme();

  return (
    <View style={[styles.bar, { borderBottomColor: colors.surface?.hairline || colors.gold.border }, style]}>
      {/* Frosted foundation */}
      <BlurView
        intensity={isDark ? 60 : 45}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDark ? 'rgba(12, 11, 14, 0.55)' : 'rgba(255, 255, 255, 0.62)' },
        ]}
      />
      {/* Specular top edge */}
      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.specular}
        pointerEvents="none"
      />

      <View style={styles.row}>
        {left || (Icon && (
          <PremiumIcon icon={Icon} size={20} box={42} tone={iconTone} glow />
        ))}
        <View style={styles.center}>
          {children || (
            <>
              {title ? (
                <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text style={[styles.subtitle, { color: colors.text.secondary }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </>
          )}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: 54,
    paddingBottom: Spacing[4],
    paddingHorizontal: Spacing[5],
    borderBottomWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    zIndex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size['2xl'] - 2,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm - 1,
    marginTop: 2,
  },
});
