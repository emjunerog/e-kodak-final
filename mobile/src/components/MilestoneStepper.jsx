/**
 * MilestoneStepper.jsx — "Simple Timeline" mode.
 * Every phase is a proper viewable glass box (done / live / upcoming),
 * each with a phase icon pod, step number, rich title + description and a
 * state-tinted spine — readable in darkroom and daylight modes.
 */

import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check, ClipboardCheck, CalendarCheck, Camera, Aperture,
  Sparkles, Printer, Package,
} from 'lucide-react-native';
import PremiumIcon from './PremiumIcon';
import {
  MILESTONE_STEPS, STATUS_META, Colors, Gradients,
  Typography, Spacing, Radius, Shadow,
} from '../theme';

const STEP_ICONS = [ClipboardCheck, CalendarCheck, Camera, Aperture, Sparkles, Printer, Package];

function PulseCircle({ active, isDone, styles }) {
  const { colors } = useTheme();
  const s = styles || getStyles(colors);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!active) return;
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0.15, duration: 1200, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [active, pulseAnim, opacityAnim]);

  if (isDone) {
    return (
      <View style={s.circleWrapper}>
        <LinearGradient
          colors={Gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.circleDone}
        >
          <Check size={12} color={colors.text.onGold} strokeWidth={3} />
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={s.circleWrapper}>
      {active && (
        <Animated.View
          style={[
            s.pulseHalo,
            {
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
      )}
      <View style={[s.circle, active && s.circleActive]}>
        <View style={[s.circleDot, active && s.circleDotActive]} />
      </View>
    </View>
  );
}

export default function MilestoneStepper({ status }) {
  const { isDark, colors, gradients } = useTheme();
  const styles = getStyles(colors, isDark);
  const meta = STATUS_META[String(status || 'PENDING').toUpperCase()] || STATUS_META.PENDING;
  const currentStep = Math.max(0, Math.min(meta?.step ?? 0, MILESTONE_STEPS.length - 1));

  return (
    <View style={styles.container}>
      {MILESTONE_STEPS.map((step, index) => {
        const isDone   = index < currentStep;
        const isActive = index === currentStep;
        const isFuture = index > currentStep;
        const StepIcon = STEP_ICONS[index] || Sparkles;

        const spineColor = isActive
          ? colors.gold.DEFAULT
          : isDone
            ? '#34D399'
            : 'rgba(127,127,140,0.35)';

        return (
          <View key={index} style={styles.stepRow}>
            {/* ── Left: Node + Connector Line ── */}
            <View style={styles.leftCol}>
              <PulseCircle active={isActive} isDone={isDone} styles={styles} />
              {index < MILESTONE_STEPS.length - 1 && (
                <View style={styles.connectorTrack}>
                  {isDone ? (
                    <LinearGradient
                      colors={Gradients.gold}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, styles.connectorFuture]} />
                  )}
                </View>
              )}
            </View>

            {/* ── Right: Viewable phase box ── */}
            <View
              style={[
                styles.phaseBox,
                isActive && {
                  backgroundColor: isDark ? 'rgba(212,175,55,0.14)' : 'rgba(217, 180, 108, 0.16)',
                  borderColor: colors.gold.DEFAULT,
                  borderWidth: 1.5,
                  ...(Platform.OS === 'ios' ? Shadow.goldSoft : { elevation: 0 }),
                },
                isDone && { borderColor: 'rgba(52,211,153,0.35)' },
              ]}
            >
              {/* State spine */}
              <View style={[styles.phaseSpine, { backgroundColor: spineColor }]} />

              <View style={styles.phaseContent}>
                <View style={styles.phaseHeaderRow}>
                  <PremiumIcon
                    icon={StepIcon}
                    size={15}
                    box={32}
                    tone={isActive ? 'gold' : isDone ? 'soft' : 'glass'}
                    glow={isActive}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.stepNum,
                        isActive && { color: colors.gold.light },
                        isDone && { color: '#34D399' },
                      ]}
                    >
                      STEP 0{index + 1}
                    </Text>
                    <Text
                      style={[
                        styles.stepLabel,
                        isActive && styles.stepLabelActive,
                        isDone && styles.stepLabelDone,
                        isFuture && styles.stepLabelFuture,
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>CURRENT</Text>
                    </View>
                  )}
                  {isDone && (
                    <View style={[styles.currentBadge, styles.doneBadge]}>
                      <Check size={10} color="#34D399" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepDesc,
                    isActive && styles.stepDescActive,
                    isFuture && styles.stepDescFuture,
                  ]}
                >
                  {step.desc}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const CIRCLE_SIZE = 24;

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    paddingVertical: Spacing[2],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  leftCol: {
    alignItems: 'center',
    width: 38,
    marginRight: Spacing[3],
  },
  circleWrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    zIndex: 1,
  },
  circleActive: {
    borderColor: colors.gold.DEFAULT,
    backgroundColor: 'rgba(201, 169, 110, 0.22)',
    ...(Platform.OS === 'ios' ? Shadow.goldSoft : { elevation: 0 }),
  },
  circleDone: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    ...(Platform.OS === 'ios' ? Shadow.goldSoft : { elevation: 0 }),
  },
  circleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.muted,
  },
  circleDotActive: {
    backgroundColor: colors.gold.DEFAULT,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pulseHalo: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.gold.DEFAULT,
    zIndex: 0,
  },
  connectorTrack: {
    width: 2,
    flex: 1,
    minHeight: 30,
    overflow: 'hidden',
    marginVertical: 4,
  },
  connectorFuture: {
    backgroundColor: colors.gold.border,
  },

  // ── Viewable phase boxes ──
  phaseBox: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.025)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing[3],
  },
  phaseSpine: {
    width: 4,
  },
  phaseContent: {
    flex: 1,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
    gap: 6,
    backgroundColor: 'transparent',
  },
  phaseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNum: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.text.muted,
  },
  stepLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
    color: colors.text.secondary,
    marginTop: 1,
  },
  stepLabelActive: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: colors.gold.light,
  },
  stepLabelDone: {
    color: colors.text.primary,
    fontFamily: Typography.fontBodySemi,
  },
  stepLabelFuture: {
    color: colors.text.muted,
  },
  currentBadge: {
    backgroundColor: colors.gold.bg,
    borderWidth: 1,
    borderColor: colors.gold.borderLight,
    borderRadius: Radius.full,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  doneBadge: {
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderColor: 'rgba(52,211,153,0.4)',
    paddingHorizontal: 7,
  },
  currentBadgeText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.gold.light,
  },
  stepDesc: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  stepDescActive: {
    color: colors.text.primary,
    lineHeight: 19,
  },
  stepDescFuture: {
    color: colors.text.muted,
  },
});
