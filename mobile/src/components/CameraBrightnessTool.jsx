/**
 * CameraBrightnessTool.jsx
 * Shared camera exposure / brightness adjustment tool for both the Role QR Scanner
 * (TutorialScreen) and Booking QR Scanner (QRScannerScreen Dashboard & Full Mode).
 * Features native-driver 60fps PanResponder + spring slider physics with no layout shift.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Sun, Minus, Plus } from 'lucide-react-native';
import { Typography, Radius } from '../theme';

function clampBrightness(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return 0;
  return Math.max(-1, Math.min(1, Math.round(num * 200) / 200));
}

/**
 * Viewfinder exposure layer locked to the exact numeric pixel bounds (0, 0, width, height)
 * of the camera preview so it only affects the camera feed and never spills onto UI below.
 */
export function CameraBrightnessOverlay({
  brightness = 0,
  width = 0,
  height = 0,
}) {
  const b = clampBrightness(brightness);
  if (Math.abs(b) < 0.015 || width <= 0 || height <= 0) return null;

  const isDarken = b < 0;
  const fillColor = isDarken ? '#04060A' : '#FFFDF8';
  const fillOpacity = isDarken
    ? Math.min(0.74, Math.abs(b) * 0.74)
    : Math.min(0.56, b * 0.56);

  return (
    <View
      pointerEvents="none"
      collapsable={false}
      style={[
        styles.overlayLayer,
        {
          width,
          height,
        },
      ]}
    >
      <Svg
        width={width}
        height={height}
        style={styles.svgAbsolute}
      >
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={fillColor}
          fillOpacity={fillOpacity}
        />
      </Svg>
    </View>
  );
}

/**
 * Silky 60fps native-driver floating exposure slider rendered inside the scanner viewfinder.
 */
export function CameraBrightnessControl({
  brightness = 0,
  onChange,
  visible = true,
  style,
}) {
  const b = clampBrightness(brightness);
  const initialNorm = (b + 1) / 2;

  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const isDraggingRef = useRef(false);
  const grantXRef = useRef(0);
  const grantPageXRef = useRef(0);
  const lastCenterSnapRef = useRef(b === 0);
  const rafRef = useRef(null);
  const pendingValueRef = useRef(null);
  const onChangeRef = useRef(onChange);

  const [normAnim] = useState(() => new Animated.Value(initialNorm));
  const [thumbScaleAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Sync external brightness resets / step taps smoothly when not actively dragging
  useEffect(() => {
    if (isDraggingRef.current) return;
    const targetNorm = (b + 1) / 2;
    Animated.timing(normAnim, {
      toValue: targetNorm,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [b, normAnim]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const emitBrightnessThrottled = (nextVal) => {
    pendingValueRef.current = nextVal;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (pendingValueRef.current !== null) {
        const val = pendingValueRef.current;
        pendingValueRef.current = null;
        onChangeRef.current?.(val);
      }
    });
  };

  const applyNormalizedDrag = (rawNorm) => {
    const clampedNorm = Math.max(0, Math.min(1, rawNorm));
    const isCenterDetent = Math.abs(clampedNorm - 0.5) < 0.022;
    const snappedNorm = isCenterDetent ? 0.5 : clampedNorm;

    if (isCenterDetent && !lastCenterSnapRef.current) {
      lastCenterSnapRef.current = true;
      try {
        Haptics.selectionAsync().catch(() => {});
      } catch { }
    } else if (!isCenterDetent) {
      lastCenterSnapRef.current = false;
    }

    normAnim.setValue(snappedNorm);
    const nextBrightness = snappedNorm === 0.5 ? 0 : clampBrightness(snappedNorm * 2 - 1);
    emitBrightnessThrottled(nextBrightness);
  };

  const handleTrackGrant = (evt) => {
    const w = trackWidthRef.current;
    if (w <= 0) return;
    isDraggingRef.current = true;
    const locX = Math.max(0, Math.min(w, evt.nativeEvent.locationX ?? w / 2));
    grantXRef.current = locX;
    grantPageXRef.current = evt.nativeEvent.pageX ?? 0;
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch { }
    Animated.spring(thumbScaleAnim, {
      toValue: 1.24,
      damping: 16,
      stiffness: 260,
      useNativeDriver: true,
    }).start();
    applyNormalizedDrag(locX / w);
  };

  const handleTrackMove = (evt) => {
    const w = trackWidthRef.current;
    if (w <= 0) return;
    const pageX = evt.nativeEvent.pageX;
    const nextX = Number.isFinite(pageX)
      ? Math.max(0, Math.min(w, grantXRef.current + (pageX - grantPageXRef.current)))
      : Math.max(0, Math.min(w, evt.nativeEvent.locationX ?? w / 2));
    applyNormalizedDrag(nextX / w);
  };

  const handleTrackEnd = () => {
    isDraggingRef.current = false;
    Animated.spring(thumbScaleAnim, {
      toValue: 1,
      damping: 16,
      stiffness: 240,
      useNativeDriver: true,
    }).start();
  };

  if (!visible) return null;

  const isAdjusted = Math.abs(b) >= 0.015;

  const handleStep = (delta) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch { }
    const next = clampBrightness(b + delta);
    onChange?.(next);
  };

  const handleReset = () => {
    if (!isAdjusted) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch { }
    onChange?.(0);
  };

  const halfW = trackWidth * 0.5;
  const thumbX =
    trackWidth > 0
      ? normAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, trackWidth],
      })
      : 0;

  const rightScaleX = normAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.001, 0.001, 1],
  });
  const rightTranslateX = normAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-halfW * 0.5, -halfW * 0.5, 0],
  });

  const leftScaleX = normAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.001, 0.001],
  });
  const leftTranslateX = normAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, halfW * 0.5, halfW * 0.5],
  });

  return (
    <View style={[styles.controlCard, style]} collapsable={false}>
      <View style={styles.sliderRow}>
        <Sun size={14} color="#F3D27A" strokeWidth={2.2} />

        <TouchableOpacity
          onPress={() => handleStep(-0.15)}
          style={styles.stepBtn}
          activeOpacity={0.75}
          accessibilityLabel="Lower camera exposure"
        >
          <Minus size={13} color="#F7F5F2" strokeWidth={2.3} />
        </TouchableOpacity>

        <View
          style={styles.trackHitArea}
          collapsable={false}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) {
              trackWidthRef.current = w;
              setTrackWidth(w);
            }
          }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={handleTrackGrant}
          onResponderMove={handleTrackMove}
          onResponderRelease={handleTrackEnd}
          onResponderTerminate={handleTrackEnd}
        >
          <View style={styles.trackBg} pointerEvents="none">
            <View style={styles.centerTick} />

            {trackWidth > 0 && (
              <>
                <Animated.View
                  style={[
                    styles.trackHalfFill,
                    {
                      left: 0,
                      width: halfW,
                      backgroundColor: '#F3D27A',
                      transform: [{ translateX: leftTranslateX }, { scaleX: leftScaleX }],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.trackHalfFill,
                    {
                      left: halfW,
                      width: halfW,
                      backgroundColor: '#F3D27A',
                      transform: [{ translateX: rightTranslateX }, { scaleX: rightScaleX }],
                    },
                  ]}
                />
              </>
            )}
          </View>

          {trackWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.thumb,
                {
                  borderColor: isAdjusted ? '#F3D27A' : '#FFFFFF',
                  transform: [
                    { translateX: Animated.subtract(thumbX, 9) },
                    { scale: thumbScaleAnim },
                  ],
                },
              ]}
            />
          )}
        </View>

        <TouchableOpacity
          onPress={() => handleStep(0.15)}
          style={styles.stepBtn}
          activeOpacity={0.75}
          accessibilityLabel="Raise camera exposure"
        >
          <Plus size={13} color="#F7F5F2" strokeWidth={2.3} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleReset}
          disabled={!isAdjusted}
          style={[styles.resetChip, !isAdjusted && styles.resetChipIdle]}
          activeOpacity={0.75}
          accessibilityLabel="Reset camera exposure"
        >
          <Text style={[styles.resetChipText, !isAdjusted && styles.resetChipTextIdle]}>
            Reset
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    zIndex: 3,
    elevation: 3,
  },
  svgAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  controlCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 11,
    elevation: 11,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 18, 26, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(243, 210, 122, 0.32)',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackHitArea: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    overflow: 'hidden',
    position: 'relative',
  },
  centerTick: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    zIndex: 2,
  },
  trackHalfFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#181A22',
    borderWidth: 2.2,
  },
  resetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(243, 210, 122, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(243, 210, 122, 0.42)',
  },
  resetChipIdle: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  resetChipText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10.5,
    color: '#F3D27A',
  },
  resetChipTextIdle: {
    color: 'rgba(255, 255, 255, 0.45)',
  },
});
