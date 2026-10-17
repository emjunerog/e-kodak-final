/**
 * MascotStage.jsx
 * Grand initialization stage for Kodak the Fox — the dashboard centerpiece.
 * A cinematic halo podium: pulsing gold aura rings, overhead spotlight,
 * drifting spark particles, beveled 3D podium disc, spring entrance,
 * pose-driven greeting and an optional CTA.
 *
 * API: { pose, title, subtitle, actionLabel, onAction, mascotSize, style }
 * Behaviour preserved: pure presentation; mascot stays interactive via
 * StudioMascotKit; onAction is the single explicit CTA callback.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StudioMascotKit from './StudioMascotKit';
import GoldButton from './GoldButton';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing } from '../theme';

const GOLD_BEVEL = ['#FFE7A3', '#D4AF37', '#7A5208', '#F5D77F'];

const POSE_COPY = {
  welcome: {
    title: 'Kodak is ready to guide you',
    subtitle: 'Activate your studio pass to unlock live shoot milestones.',
  },
  shoot: {
    title: 'Atelier camera is primed',
    subtitle: 'Your live shoot is in flight — follow every frame below.',
  },
  inspect: {
    title: 'Curating your proofs',
    subtitle: 'Kodak is grading negatives and polishing your gallery.',
  },
  celebrate: {
    title: 'Deliverables are ready',
    subtitle: 'Prints and digital archives await — come cherish them.',
  },
  waiting: {
    title: 'Lights calibrated, stands set',
    subtitle: 'Kodak is standing by for your studio session.',
  },
};

const SPARKS = [
  { left: '12%', top: '18%', size: 5, delay: 0 },
  { left: '84%', top: '24%', size: 4, delay: 500 },
  { left: '20%', top: '66%', size: 3.5, delay: 900 },
  { left: '78%', top: '62%', size: 5, delay: 1300 },
  { left: '50%', top: '8%', size: 3, delay: 1700 },
];

export default function MascotStage({
  pose = 'welcome',
  title,
  subtitle,
  actionLabel,
  onAction,
  mascotSize = 148,
  style,
}) {
  const { isDark, colors, gradients } = useTheme();

  const entrance = useRef(new Animated.Value(0)).current;
  const haloA = useRef(new Animated.Value(0)).current;
  const haloB = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();

    const ring = (node, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(node, {
            toValue: 1,
            duration: 2600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(node, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const a = ring(haloA, 0);
    const b = ring(haloB, 1300);
    a.start();
    b.start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: -6,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();

    return () => {
      a.stop();
      b.stop();
      floatLoop.stop();
    };
  }, [entrance, haloA, haloB, drift]);

  const copy = POSE_COPY[pose] || POSE_COPY.welcome;

  const entranceScale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });
  const entranceOpacity = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const ringStyle = (node) => ({
    opacity: node.interpolate({
      inputRange: [0, 1],
      outputRange: [0.55, 0],
    }),
    transform: [
      {
        scale: node.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.45],
        }),
      },
    ],
  });

  return (
    <Animated.View
      style={[
        styles.stage,
        {
          opacity: entranceOpacity,
          transform: [{ scale: entranceScale }],
          borderColor: colors.gold.border,
          shadowColor: isDark ? '#000000' : '#8A7355',
        },
        style,
      ]}
    >
      {/* Ambient stage wash */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(212,175,55,0.14)', 'rgba(32,26,20,0.85)', 'rgba(12,10,8,0.96)']
            : ['rgba(212,175,55,0.20)', 'rgba(255,255,255,0.95)', 'rgba(242,237,227,0.98)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Overhead spotlight cone */}
      <LinearGradient
        colors={['rgba(255,235,170,0.20)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.spotlight}
        pointerEvents="none"
      />
      {/* Top specular chamfer */}
      <LinearGradient
        colors={['rgba(255,255,255,0.35)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.chamfer}
        pointerEvents="none"
      />

      {/* Drifting spark particles */}
      {SPARKS.map((s, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            styles.spark,
            {
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              backgroundColor: '#FFE7A3',
              transform: [{ translateY: drift }],
              opacity: 0.75,
            },
          ]}
        />
      ))}

      {/* Halo podium */}
      <View style={styles.haloWrap}>
        <Animated.View
          pointerEvents="none"
          style={[styles.haloRing, { width: 196, height: 196, borderRadius: 98 }, ringStyle(haloA)]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.haloRing, { width: 196, height: 196, borderRadius: 98 }, ringStyle(haloB)]}
        />
        <LinearGradient
          colors={GOLD_BEVEL}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.podiumBevel}
        >
          <View
            style={[
              styles.podiumDisc,
              { backgroundColor: isDark ? 'rgba(255,248,235,0.10)' : '#FFFDF9' },
            ]}
          >
            <StudioMascotKit
              pose={pose}
              size={mascotSize}
              interactive
              showBadge={false}
            />
          </View>
        </LinearGradient>
        {/* Podium floor shadow */}
        <View style={styles.floorShadow} />
      </View>

      {/* Greeting */}
      <Text style={[styles.stageTitle, { color: colors.text.primary }]}>
        {title || copy.title}
      </Text>
      <Text style={[styles.stageSubtitle, { color: colors.text.secondary }]}>
        {subtitle || copy.subtitle}
      </Text>

      {/* Live status shimmer line */}
      <LinearGradient
        colors={[...gradients.gold, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.shimmerLine}
      />

      {actionLabel && onAction && (
        <GoldButton onPress={onAction} size="md" style={styles.stageCta}>
          {actionLabel}
        </GoldButton>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    borderRadius: 26,
    borderWidth: 1,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,235,175,0.6)',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    paddingTop: Spacing[6],
    paddingBottom: Spacing[5],
    paddingHorizontal: Spacing[5],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 9,
  },
  spotlight: {
    position: 'absolute',
    top: 0,
    left: '18%',
    right: '18%',
    height: 190,
    borderBottomLeftRadius: 90,
    borderBottomRightRadius: 90,
    opacity: 0.8,
  },
  chamfer: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1.5,
    borderRadius: 1,
  },
  spark: {
    position: 'absolute',
    shadowColor: '#FFE7A3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
  haloWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 210,
    height: 196,
    marginBottom: 6,
  },
  haloRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.5)',
  },
  podiumBevel: {
    width: 168,
    height: 168,
    borderRadius: 46,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 7,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,0,0,0.4)',
  },
  podiumDisc: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.30)',
    overflow: 'hidden',
  },
  floorShadow: {
    position: 'absolute',
    bottom: 2,
    width: 120,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.35)',
    opacity: 0.5,
  },
  stageTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 8,
  },
  stageSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
  },
  shimmerLine: {
    width: 120,
    height: 2.5,
    borderRadius: 2,
    marginTop: 12,
    opacity: 0.9,
  },
  stageCta: {
    marginTop: 14,
    minWidth: 210,
  },
});
