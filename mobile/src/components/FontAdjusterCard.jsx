/**
 * FontAdjusterCard.jsx
 * Shared typography scale control matching E-Kodak's 2-tone pill card and
 * signature gold-pill gradient aesthetic for Customer & Photographer Settings.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Type, Minus, Plus } from 'lucide-react-native';

import CardDecorElements from './CardDecorElements';
import { useTheme } from '../context/ThemeContext';
import { useResponsiveLayout } from '../utils/responsive';
import { Typography } from '../theme';

const MIN_FONT_SCALE = 0.80;
const MAX_FONT_SCALE = 1.24;

const FONT_PRESETS = [
  { id: 'xs', label: 'XS', name: 'Extra Small', scale: 0.80 },
  { id: 'sm', label: 'S',  name: 'Small',       scale: 0.90 },
  { id: 'md', label: 'M',  name: 'Default',     scale: 1.00 },
  { id: 'lg', label: 'L',  name: 'Large',       scale: 1.12 },
  { id: 'xl', label: 'XL', name: 'Extra Large', scale: 1.24 },
];

function clampScale(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return 1;
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Math.round(num * 100) / 100));
}

function scaleToNorm(scale) {
  return Math.max(0, Math.min(1, (scale - MIN_FONT_SCALE) / (MAX_FONT_SCALE - MIN_FONT_SCALE)));
}

function normToScale(norm) {
  const clamped = Math.max(0, Math.min(1, norm));
  return clampScale(MIN_FONT_SCALE + clamped * (MAX_FONT_SCALE - MIN_FONT_SCALE));
}

export default function FontAdjusterCard({ hapticsEnabled = true, cardBorder, cardGradientColors }) {
  const { isDark, isSage, highContrast, colors, gradients, fontScale, setFontScale } = useTheme();
  const layout = useResponsiveLayout();
  const styles = useMemo(
    () => getStyles(colors, isDark, isSage, highContrast, layout),
    [colors, isDark, isSage, highContrast, layout]
  );

  const clampedScale = clampScale(fontScale);
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const isDraggingRef = useRef(false);
  const grantXRef = useRef(0);
  const grantPageXRef = useRef(0);
  const lastDetentRef = useRef(Math.abs(clampedScale - 1) < 0.015);
  const rafRef = useRef(null);
  const pendingScaleRef = useRef(null);
  const setFontScaleRef = useRef(setFontScale);
  const hapticsRef = useRef(hapticsEnabled);

  const [normAnim] = useState(() => new Animated.Value(scaleToNorm(clampedScale)));
  const [thumbScaleAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    setFontScaleRef.current = setFontScale;
    hapticsRef.current = hapticsEnabled;
  });

  useEffect(() => {
    if (isDraggingRef.current) return;
    Animated.timing(normAnim, {
      toValue: scaleToNorm(clampedScale),
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [clampedScale, normAnim]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const emitScaleThrottled = (nextVal) => {
    pendingScaleRef.current = nextVal;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (pendingScaleRef.current !== null) {
        const val = pendingScaleRef.current;
        pendingScaleRef.current = null;
        setFontScaleRef.current?.(val);
      }
    });
  };

  const applyNormalizedDrag = (rawNorm) => {
    const clampedNorm = Math.max(0, Math.min(1, rawNorm));
    const defaultNorm = scaleToNorm(1);
    const isDefaultDetent = Math.abs(clampedNorm - defaultNorm) < 0.025;
    const snappedNorm = isDefaultDetent ? defaultNorm : clampedNorm;

    if (isDefaultDetent && !lastDetentRef.current) {
      lastDetentRef.current = true;
      if (hapticsRef.current) {
        Haptics.selectionAsync().catch(() => {});
      }
    } else if (!isDefaultDetent) {
      lastDetentRef.current = false;
    }

    normAnim.setValue(snappedNorm);
    const nextScale = isDefaultDetent ? 1 : normToScale(snappedNorm);
    emitScaleThrottled(nextScale);
  };

  const handleTrackGrant = (evt) => {
    const w = trackWidthRef.current;
    if (w <= 0) return;
    isDraggingRef.current = true;
    const locX = Math.max(0, Math.min(w, evt.nativeEvent.locationX ?? w / 2));
    grantXRef.current = locX;
    grantPageXRef.current = evt.nativeEvent.pageX ?? 0;
    if (hapticsRef.current) {
      Haptics.selectionAsync().catch(() => {});
    }
    Animated.spring(thumbScaleAnim, {
      toValue: 1.2,
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

  const applyScale = (nextScale) => {
    if (hapticsEnabled) {
      Haptics.selectionAsync().catch(() => {});
    }
    setFontScale(clampScale(nextScale));
  };

  const resolvedGradient = cardGradientColors || gradients?.card || (
    isDark
      ? ['#242029', '#151B24']
      : isSage
        ? ['#FFFFFF', '#EEF2E9']
        : ['#FAF2EA', '#E5EEF7']
  );

  const resolvedBorder = cardBorder || (
    highContrast
      ? colors.gold.DEFAULT
      : isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6'
  );

  const goldPillColors = gradients?.goldPill || gradients?.gold || ['#EAD082', '#C7962D'];
  const accentColor = isDark ? colors.gold.light : colors.gold.DEFAULT;
  const onGoldColor = isSage ? '#FFFFFF' : '#181410';

  const thumbX =
    trackWidth > 0
      ? normAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, trackWidth],
        })
      : 0;
  const fillTranslateX =
    trackWidth > 0
      ? normAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-trackWidth * 0.5, 0],
        })
      : 0;

  return (
    <View style={[styles.cardOuter, { borderColor: resolvedBorder }]}>
      <LinearGradient
        colors={resolvedGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <CardDecorElements variant="list" isDark={isDark} />

        {/* Header Row */}
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Type size={16} color={accentColor} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Text Size</Text>
            <Text style={styles.subtitle}>
              Drag custom bar or pick a size preset
            </Text>
          </View>
        </View>

        {/* Custom Slider Bar matching Scanner Exposure Bar */}
        <View style={styles.sliderRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={clampedScale <= MIN_FONT_SCALE + 0.005}
            onPress={() => applyScale(clampedScale - 0.04)}
            style={[
              styles.stepBtn,
              clampedScale <= MIN_FONT_SCALE + 0.005 && styles.stepBtnDisabled,
            ]}
            accessibilityLabel="Decrease text size"
          >
            <Minus size={14} color={colors.text.primary} strokeWidth={2.2} />
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
              {FONT_PRESETS.map((preset) => (
                <View
                  key={preset.id}
                  style={[
                    styles.presetTick,
                    { left: `${scaleToNorm(preset.scale) * 100}%` },
                    preset.id === 'md' && styles.defaultTick,
                  ]}
                />
              ))}

              {trackWidth > 0 && (
                <Animated.View
                  style={[
                    styles.trackFill,
                    {
                      width: trackWidth,
                      backgroundColor: accentColor,
                      transform: [
                        { translateX: fillTranslateX },
                        { scaleX: normAnim },
                      ],
                    },
                  ]}
                />
              )}
            </View>

            {trackWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.thumb,
                  {
                    borderColor: accentColor,
                    backgroundColor: isDark ? '#141923' : '#FFFFFF',
                    transform: [
                      { translateX: Animated.subtract(thumbX, 10) },
                      { scale: thumbScaleAnim },
                    ],
                  },
                ]}
              />
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={clampedScale >= MAX_FONT_SCALE - 0.005}
            onPress={() => applyScale(clampedScale + 0.04)}
            style={[
              styles.stepBtn,
              clampedScale >= MAX_FONT_SCALE - 0.005 && styles.stepBtnDisabled,
            ]}
            accessibilityLabel="Increase text size"
          >
            <Plus size={14} color={colors.text.primary} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* Unified Gold-Pill Preset Capsule (XS, S, M, L, XL) */}
        <View style={styles.presetsCapsule}>
          {FONT_PRESETS.map((preset) => {
            const selected = Math.abs(clampedScale - preset.scale) < 0.025;
            return (
              <TouchableOpacity
                key={preset.id}
                activeOpacity={0.84}
                onPress={() => applyScale(preset.scale)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Set text size to ${preset.name}`}
                style={styles.presetSlot}
              >
                {selected ? (
                  <LinearGradient
                    colors={goldPillColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.presetBtnActive}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.presetLabelActive, { color: onGoldColor }]}
                    >
                      {preset.label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.presetBtnIdle}>
                    <Text
                      numberOfLines={1}
                      style={[styles.presetLabelIdle, { color: colors.text.secondary }]}
                    >
                      {preset.label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}

const getStyles = (colors, isDark, isSage, highContrast, layout) =>
  StyleSheet.create({
    cardOuter: {
      borderRadius: 22,
      borderWidth: 1,
      backgroundColor: isDark ? '#181E29' : isSage ? '#FCFDFB' : '#FFFFFF',
      overflow: 'hidden',
      shadowColor: isDark ? '#000000' : '#4E4332',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: isDark ? 0.22 : 0.08,
      shadowRadius: 12,
      elevation: isDark ? 2 : 3,
    },
    cardGradient: {
      padding: layout.cardPad,
      gap: layout.pad(12, 0.45),
      position: 'relative',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.gold.bg,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(217, 180, 108, 0.28)'
        : isSage
          ? 'rgba(99, 115, 86, 0.22)'
          : 'rgba(176, 125, 30, 0.20)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: Typography.fontHeading,
      fontSize: layout.fs(15, 0.85),
      lineHeight: layout.fs(20, 0.85),
      color: colors.text.primary,
    },
    subtitle: {
      fontFamily: Typography.fontBody,
      fontSize: layout.fs(11.5, 0.85),
      lineHeight: layout.fs(16, 0.85),
      color: highContrast ? colors.text.secondary : colors.text.muted,
      marginTop: 1,
    },
    sliderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingTop: 2,
    },
    trackHitArea: {
      flex: 1,
      height: 34,
      justifyContent: 'center',
    },
    trackBg: {
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.14)'
        : isSage
          ? 'rgba(99, 115, 86, 0.16)'
          : 'rgba(24, 20, 16, 0.10)',
      overflow: 'hidden',
      position: 'relative',
    },
    presetTick: {
      position: 'absolute',
      top: 1,
      bottom: 1,
      width: 1.5,
      marginLeft: -0.75,
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.22)'
        : 'rgba(24, 20, 16, 0.18)',
    },
    defaultTick: {
      top: 0,
      bottom: 0,
      width: 2,
      marginLeft: -1,
    },
    trackFill: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      borderRadius: 3,
    },
    thumb: {
      position: 'absolute',
      left: 0,
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2.5,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 4,
      elevation: 3,
    },
    stepBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.22)'
        : isSage
          ? '#D4DCD0'
          : '#DCE0EA',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnDisabled: {
      opacity: 0.36,
    },
    presetsCapsule: {
      flexDirection: 'row',
      padding: 3,
      borderRadius: 999,
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.06)'
        : isSage
          ? 'rgba(99, 115, 86, 0.10)'
          : 'rgba(24, 20, 16, 0.05)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.14)'
        : isSage
          ? 'rgba(99, 115, 86, 0.16)'
          : 'rgba(24, 20, 16, 0.07)',
    },
    presetSlot: {
      flex: 1,
    },
    presetBtnActive: {
      height: 30,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetBtnIdle: {
      height: 30,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetLabelActive: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 12,
      lineHeight: 15,
    },
    presetLabelIdle: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 12,
      lineHeight: 15,
    },
  });
