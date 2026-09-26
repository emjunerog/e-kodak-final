/**
 * GoldButton.jsx — Luxury Metallic Gold Button
 * Features:
 * - Multi-stop brushed metallic gold gradient (E8D5B0 -> C9A96E -> A8843A)
 * - Tactile spring scale press animation
 * - Haptic impact feedback
 * - Inter_600SemiBold typography with luxury tracking
 * - Variants: 'primary' (gradient fill), 'outline' (gold hairline), 'ghost' (tinted)
 */

import React, { useRef } from 'react';
import {
  Pressable, Text, StyleSheet, ActivityIndicator, View, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius, Spacing, Shadow } from '../theme';

export default function GoldButton({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  style,
  textStyle: customTextStyle,
}) {
  const { isDark, colors, gradients } = useTheme();
  const styles = getStyles(colors);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 25,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 6,
    }).start();
  };

  const handlePress = async () => {
    if (disabled || loading) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onPress?.();
  };

  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isGhost   = variant === 'ghost';

  const iconColor = isPrimary
    ? (isDark ? '#1A1714' : '#FFFFFF')
    : colors.gold.light;

  const textColor = isPrimary
    ? (isDark ? '#1A1714' : '#FFFFFF')
    : isOutline
    ? (isDark ? colors.gold.light : colors.gold.DEFAULT)
    : colors.gold.DEFAULT;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.base,
          styles[`size_${size}`],
          isOutline && {
            backgroundColor: isDark ? 'rgba(201, 169, 110, 0.05)' : 'rgba(184, 134, 11, 0.04)',
            borderWidth: 1.2,
            borderColor: colors.gold.borderLight,
          },
          isGhost && {
            backgroundColor: colors.gold.bg,
          },
          disabled && styles.disabled,
        ]}
      >
        {isPrimary && !disabled && (
          <LinearGradient
            colors={gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.gradientBg]}
          />
        )}

        {isPrimary && disabled && (
          <View style={[StyleSheet.absoluteFill, styles.disabledPrimaryBg]} />
        )}

        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <View style={styles.inner}>
            {Icon && (
              <Icon
                size={size === 'sm' ? 14 : size === 'lg' ? 20 : 17}
                color={iconColor}
                strokeWidth={1.75}
                style={{ marginRight: 8 }}
              />
            )}
            <Text
              style={[
                styles.text,
                styles[`textSize_${size}`],
                { color: textColor },
                customTextStyle,
              ]}
            >
              {children}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  gradientBg: {
    borderRadius: Radius.md,
  },
  disabledPrimaryBg: {
    backgroundColor: '#3E3424',
    borderRadius: Radius.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Variants
  variant_outline: {
    backgroundColor: 'rgba(201, 169, 110, 0.05)',
    borderWidth: 1.2,
    borderColor: colors.gold.borderLight,
  },
  variant_ghost: {
    backgroundColor: colors.gold.bg,
  },

  // Sizes
  size_sm: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    minHeight: 38,
  },
  size_md: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[6],
    minHeight: 50,
    ...Shadow.goldSoft,
  },
  size_lg: {
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[8],
    minHeight: 58,
    ...Shadow.gold,
  },

  // Text
  text: {
    fontFamily: Typography.fontBodySemi,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  textSize_sm: { fontSize: Typography.size.xs },
  textSize_md: { fontSize: Typography.size.sm },
  textSize_lg: { fontSize: Typography.size.base },

  disabled: {
    opacity: 0.45,
  },
});
