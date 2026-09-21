/**
 * MilestoneStepper.jsx
 * Animated vertical progress stepper showing all booking phases.
 * Completed steps glow gold, active step pulses, future steps are dim.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MILESTONE_STEPS, STATUS_META, Colors, Typography, Spacing, Radius } from '../theme';

function PulseCircle({ active }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [active, pulse]);

  return (
    <View style={styles.circleWrapper}>
      {active && (
        <Animated.View
          style={[styles.pulseBg, { transform: [{ scale: pulse }] }]}
        />
      )}
      <View style={[
        styles.circle,
        active && styles.circleActive,
      ]}>
        <View style={[
          styles.circleDot,
          active && styles.circleDotActive,
        ]} />
      </View>
    </View>
  );
}

export default function MilestoneStepper({ status }) {
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
            {/* ── Left: circle + connector ── */}
            <View style={styles.leftCol}>
              <PulseCircle active={isActive} />
              {index < MILESTONE_STEPS.length - 1 && (
                <View style={[
                  styles.connector,
                  isDone && styles.connectorDone,
                ]} />
              )}
            </View>

            {/* ── Right: label + desc ── */}
            <View style={styles.rightCol}>
              <Text style={[
                styles.stepLabel,
                isActive && styles.stepLabelActive,
                isDone   && styles.stepLabelDone,
                isFuture && styles.stepLabelFuture,
              ]}>
                {step.label}
              </Text>
              {(isActive || isDone) && (
                <Text style={styles.stepDesc}>{step.desc}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const CIRCLE_SIZE = 20;

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing[2],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  leftCol: {
    alignItems: 'center',
    width: 36,
    marginRight: Spacing[3],
  },
  circleWrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.neutral[700],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.surface,
    zIndex: 1,
  },
  circleActive: {
    borderColor: Colors.gold.DEFAULT,
    backgroundColor: Colors.bg.card,
    shadowColor: Colors.gold.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  circleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutral[700],
  },
  circleDotActive: {
    backgroundColor: Colors.gold.DEFAULT,
  },
  pulseBg: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: Colors.gold.glow,
    zIndex: 0,
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 32,
    backgroundColor: Colors.neutral[800],
    marginVertical: 2,
  },
  connectorDone: {
    backgroundColor: Colors.gold.dim,
  },
  rightCol: {
    flex: 1,
    paddingBottom: Spacing[5],
    paddingTop: 1,
  },
  stepLabel: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.neutral[600],
    marginBottom: 2,
  },
  stepLabelActive: {
    color: Colors.gold.light,
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.size.base,
  },
  stepLabelDone: {
    color: Colors.neutral[400],
  },
  stepLabelFuture: {
    color: Colors.neutral[700],
  },
  stepDesc: {
    fontSize: Typography.size.xs,
    color: Colors.neutral[500],
    lineHeight: 18,
  },
});
