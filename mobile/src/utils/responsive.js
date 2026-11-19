/**
 * responsive.js — Standardized Mobile Frame, Screen Scaling & Smart Font-Spacing Layout
 * Ensures every screen keeps a consistent max mobile width (420px) on larger displays,
 * adapts to compact phones (< 365px), and automatically expands/adjusts card padding,
 * gaps, line heights, and min-heights when the user adjusts their Font Scale setting.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const STANDARD_MOBILE_WIDTH = 420;
export const COMPACT_WIDTH_BREAKPOINT = 365;
export const BASELINE_MOBILE_WIDTH = 390;

export function useResponsiveLayout() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { fontScale = 1 } = useTheme();

  return useMemo(() => {
    const safeWindowWidth = Math.max(280, windowWidth || BASELINE_MOBILE_WIDTH);
    const safeWindowHeight = Math.max(480, windowHeight || 800);

    const layoutWidth = Math.min(safeWindowWidth, STANDARD_MOBILE_WIDTH);
    const isCompact = layoutWidth < COMPACT_WIDTH_BREAKPOINT;
    const isShortScreen = safeWindowHeight < 680;
    const isWideDevice = safeWindowWidth > STANDARD_MOBILE_WIDTH;
    const isLargeFont = fontScale >= 1.1;

    const rawScale = layoutWidth / BASELINE_MOBILE_WIDTH;
    const scale = Math.min(1.06, Math.max(0.84, rawScale));
    const compactFontFactor = isCompact
      ? Math.max(0.88, layoutWidth / 375)
      : 1;

    // Scales typography proportionally with user fontScale & compact device screens
    const fs = (size, weight = 1) => {
      const effectiveFont = 1 + (fontScale - 1) * weight;
      return Math.round(size * effectiveFont * compactFontFactor * 10) / 10;
    };

    // Screen-only moderate scaling (when fontScale isn't applied)
    const ms = (size, factor = 0.5) =>
      Math.round(size + (size * scale - size) * factor);

    // Dynamic spacing/padding factor that adapts card padding & gaps as fonts grow/shrink
    const pad = (baseSpacing, grow = 0.65) => {
      const spaceMult =
        fontScale >= 1
          ? 1 + (fontScale - 1) * grow
          : Math.max(0.82, 1 - (1 - fontScale) * 0.25);
      return Math.round(baseSpacing * spaceMult * (isCompact ? 0.92 : 1));
    };

    const gutter = isCompact ? 14 : 18;
    const cardGap = pad(isCompact ? 10 : 12, 0.45);
    const cardPad = pad(isCompact ? 14 : 16, 0.65);
    const contentWidth = layoutWidth - gutter * 2;
    const packageCardWidth = Math.round(
      Math.min(
        256,
        Math.max(
          176,
          contentWidth * (0.58 + Math.max(0, fontScale - 1) * 0.24)
        )
      )
    );
    const sheetMaxHeight = Math.round(
      safeWindowHeight * (isShortScreen ? 0.92 : 0.88)
    );

    const modalFrameStyle = isWideDevice
      ? { width: '100%', maxWidth: STANDARD_MOBILE_WIDTH, alignSelf: 'center' }
      : { width: '100%' };

    return {
      windowWidth: safeWindowWidth,
      windowHeight: safeWindowHeight,
      layoutWidth,
      contentWidth,
      standardMaxWidth: STANDARD_MOBILE_WIDTH,
      isCompact,
      isShortScreen,
      isWideDevice,
      isLargeFont,
      fontScale,
      scale,
      fs,
      ms,
      pad,
      gutter,
      cardGap,
      cardPad,
      packageCardWidth,
      sheetMaxHeight,
      modalFrameStyle,
    };
  }, [windowWidth, windowHeight, fontScale]);
}

export function ResponsiveViewport({ children, colors, isDark }) {
  const { isWideDevice } = useResponsiveLayout();
  const bg = colors?.bg?.base || '#0E1017';
  const frameBorderColor = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(24, 20, 16, 0.08)';

  return (
    <View style={[styles.outerBackdrop, { backgroundColor: bg }]}>
      <View
        style={[
          styles.standardFrame,
          isWideDevice && {
            borderLeftWidth: StyleSheet.hairlineWidth,
            borderRightWidth: StyleSheet.hairlineWidth,
            borderColor: frameBorderColor,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerBackdrop: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  standardFrame: {
    flex: 1,
    width: '100%',
    maxWidth: STANDARD_MOBILE_WIDTH,
    overflow: 'hidden',
  },
});
