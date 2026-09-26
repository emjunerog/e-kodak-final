/**
 * MilestoneStepper.jsx
 * Luxury editorial timeline stepper for studio booking phases.
 * Completed steps illuminate in brushed gold with checkmarks,
 * active step features a dual-halo pulse and elevated card container,
 * and future steps remain discreetly dimmed.
 */

import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import {
  MILESTONE_STEPS, STATUS_META, Colors, Gradients,
  Typography, Spacing, Radius, Shadow,
} from '../theme';

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
  const styles = getStyles(colors);
  const meta = STATUS_META[String(status || 'PENDING').toUpperCase()] || STATUS_META.PENDING;
  const currentStep = meta?.step ?? 0;

  return (
    <View style={styles.container}>
      {MILESTONE_STEPS.map((step, index) => {
        const isDone   = index < currentStep;
        const isActive = index === currentStep;
        const isFuture = index > currentStep;

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

            {/* ── Right: Content Card ── */}
            <View style={styles.rightCol}>
              {isActive ? (
                <View style={styles.activeCard}>
                  <View style={styles.activeHeaderRow}>
                    <Text style={styles.stepLabelActive}>{step.label}</Text>
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>CURRENT</Text>
                    </View>
                  </View>
                  <Text style={styles.stepDescActive}>{step.desc}</Text>
                </View>
              ) : (
                <View style={styles.inactiveWrapper}>
                  <Text
                    style={[
                      styles.stepLabel,
                      isDone && styles.stepLabelDone,
                      isFuture && styles.stepLabelFuture,
                    ]}
                  >
                    {step.label}
                  </Text>
                  {isDone && <Text style={styles.stepDescDone}>{step.desc}</Text>}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const CIRCLE_SIZE = 24;

const getStyles = (colors) => StyleSheet.create({
  container: {
    paddingVertical: Spacing[2],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    borderColor: colors.neutral[800],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surface,
    zIndex: 1,
  },
  circleActive: {
    borderColor: colors.gold.DEFAULT,
    backgroundColor: colors.bg.cardElevated,
    ...Shadow.goldSoft,
  },
  circleDone: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    ...Shadow.goldSoft,
  },
  circleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[700],
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
    minHeight: 38,
    overflow: 'hidden',
    marginVertical: 4,
  },
  connectorFuture: {
    backgroundColor: colors.neutral[800],
  },

  rightCol: {
    flex: 1,
    paddingBottom: Spacing[4],
  },

  // Active step elevated card
  activeCard: {
    backgroundColor: 'rgba(36, 32, 26, 0.75)',
    borderWidth: 1,
    borderColor: colors.gold.borderLight,
    borderRadius: Radius.md,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    gap: 4,
    ...Shadow.goldSoft,
  },
  activeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepLabelActive: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: colors.gold.light,
    flex: 1,
  },
  currentBadge: {
    backgroundColor: colors.gold.bg,
    borderWidth: 1,
    borderColor: colors.gold.borderLight,
    borderRadius: Radius.full,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  currentBadgeText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.gold.light,
  },
  stepDescActive: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
    lineHeight: 19,
  },

  // Inactive states
  inactiveWrapper: {
    paddingVertical: 3,
  },
  stepLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
    color: colors.neutral[500],
  },
  stepLabelDone: {
    color: colors.neutral[200],
    fontFamily: Typography.fontBodyMedium,
  },
  stepLabelFuture: {
    color: colors.neutral[700],
  },
  stepDescDone: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.neutral[500],
    lineHeight: 18,
    marginTop: 2,
  },
});
