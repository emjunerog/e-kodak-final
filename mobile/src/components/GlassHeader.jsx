/**
 * GlassHeader.jsx
 * Shared floating frosted editorial header pill card — keeps app typography
 * (Google Sans) with the luminous rounded pill aesthetic across screens.
 *
 *   <GlassHeader icon={BookOpen} title="..." subtitle="..." />
 *   <GlassHeader left={<.../>} right={<.../>}> custom center </GlassHeader>
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../theme';
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
  const { isDark, isSage, highContrast, colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();

  const cardGradient =
    gradients?.header ||
    (isDark
      ? ['#242029', '#151B24']
      : isSage
        ? ['rgba(255, 255, 254, 0.96)', 'rgba(241, 244, 236, 0.92)']
        : ['rgba(255, 253, 250, 0.94)', 'rgba(241, 246, 252, 0.90)']);
  const cardBorder = highContrast
    ? colors.gold.borderLight
    : isDark
      ? 'rgba(180, 198, 224, 0.20)'
      : isSage
        ? 'rgba(216, 222, 209, 0.92)'
        : 'rgba(255, 255, 255, 0.88)';

  return (
    <View
      style={[
        styles.outerShadow,
        {
          marginTop: Math.max(insets.top, 10) + 8,
          shadowColor: isDark ? '#000000' : '#4E4332',
        },
        style,
      ]}
    >
      <View style={[styles.pillFrame, { borderColor: cardBorder, borderWidth: highContrast ? 1.6 : 1 }]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 42 : 30}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <LinearGradient
          colors={cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle top specular hairline */}
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255, 255, 255, 0.14)', 'transparent']
              : ['rgba(255, 255, 255, 0.95)', 'transparent']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.specular}
          pointerEvents="none"
        />

        <View style={styles.row}>
          {left || (Icon && (
            <PremiumIcon icon={Icon} size={19} box={42} tone={iconTone} glow />
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
    </View>
  );
}

const styles = StyleSheet.create({
  outerShadow: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 28,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
    zIndex: 2,
  },
  pillFrame: {
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
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
    gap: 12,
    zIndex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: Typography.fontHeading,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  subtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
    includeFontPadding: false,
  },
});
