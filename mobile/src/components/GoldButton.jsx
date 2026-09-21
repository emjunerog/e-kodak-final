/**
 * GoldButton.jsx — Reusable premium gold button with haptic feedback
 * Supports: primary (filled gold), outline, ghost variants
 */

import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Radius, Spacing } from '../theme';

export default function GoldButton({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  style,
}) {
  const handlePress = async () => {
    if (disabled || loading) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  const containerStyle = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled && styles.textDisabled,
  ];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={containerStyle}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.text.onGold : Colors.gold.DEFAULT}
          size="small"
        />
      ) : (
        <View style={styles.inner}>
          {Icon && (
            <Icon
              size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16}
              color={variant === 'primary' ? Colors.text.onGold : Colors.gold.DEFAULT}
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={textStyle}>{children}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Variants
  variant_primary: {
    backgroundColor: Colors.gold.DEFAULT,
    shadowColor: Colors.gold.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  variant_outline: {
    backgroundColor: Colors.transparent,
    borderWidth: 1.5,
    borderColor: Colors.gold.border,
  },
  variant_ghost: {
    backgroundColor: Colors.gold.bg,
  },

  // Sizes
  size_sm: { paddingVertical: Spacing[2], paddingHorizontal: Spacing[4], minHeight: 36 },
  size_md: { paddingVertical: Spacing[3], paddingHorizontal: Spacing[6], minHeight: 48 },
  size_lg: { paddingVertical: Spacing[4], paddingHorizontal: Spacing[8], minHeight: 56 },

  // Text
  text: {
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.5,
  },
  text_primary: { color: Colors.text.onGold },
  text_outline: { color: Colors.gold.DEFAULT },
  text_ghost:   { color: Colors.gold.DEFAULT },
  textSize_sm:  { fontSize: Typography.size.sm },
  textSize_md:  { fontSize: Typography.size.base },
  textSize_lg:  { fontSize: Typography.size.md },

  // States
  disabled: { opacity: 0.45 },
  textDisabled: { opacity: 0.45 },
});
