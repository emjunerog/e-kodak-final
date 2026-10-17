/**
 * GoldButton.jsx — Luxury Metallic Gold Button (modernized)
 * - Same public API & behaviour: variant/size/disabled/loading/icon/onPress preserved
 * - Visual upgrade only: outer gold aura for primary, top specular hairline,
 *   travelling sheen sweep, crisper tactile press physics
 */

import React, { useRef, useEffect } from 'react';
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
  const sheenAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slow ambient sheen drift for primary buttons (purely cosmetic)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sheenAnim, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(sheenAnim, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sheenAnim]);

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.965,
      useNativeDriver: true,
      speed: 28,
      bounciness: 5,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 7,
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

  const sheenX = sheenAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 60],
  });

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        isPrimary && !disabled && styles.primaryAura,
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.base,
          styles[`size_${size}`],
          isOutline && {
            backgroundColor: colors.surface?.chip || 'rgba(255,255,255,0.05)',
            borderWidth: 1,
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

        {/* Top specular chamfer — sells the machined-metal feel */}
        {isPrimary && !disabled && (
          <LinearGradient
            colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.specularTop}
          />
        )}

        {/* Travelling sheen sweep (clipped by overflow:hidden on base) */}
        {isPrimary && !disabled && !loading && (
          <Animated.View
            pointerEvents="none"
            style={[styles.sheen, { transform: [{ translateX: sheenX }, { rotate: '18deg' }] }]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
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
                strokeWidth={2}
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
  primaryAura: {
    ...Shadow.goldGlow,
  },
  base: {
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  gradientBg: {
    borderRadius: Radius.full,
  },
  specularTop: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1.5,
    borderRadius: 1,
    opacity: 0.9,
  },
  sheen: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    width: 44,
    opacity: 0.5,
  },
  disabledPrimaryBg: {
    backgroundColor: '#3A342C',
    borderRadius: Radius.full,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sizes
  size_sm: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    minHeight: 40,
  },
  size_md: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[6],
    minHeight: 52,
  },
  size_lg: {
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[8],
    minHeight: 58,
  },

  // Text
  text: {
    fontFamily: Typography.fontBodySemi,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  textSize_sm: { fontSize: Typography.size.sm - 0.5 },
  textSize_md: { fontSize: Typography.size.base - 0.5 },
  textSize_lg: { fontSize: Typography.size.md },

  disabled: {
    opacity: 0.45,
  },
});
