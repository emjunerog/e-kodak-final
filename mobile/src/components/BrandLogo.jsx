/**
 * BrandLogo.jsx
 * Centered luxury brand emblem for E-Kodak Photography Studio.
 * Features:
 * - Concentric metallic gold optical rings
 * - Smooth rotating iris aperture blades
 * - Justified Playfair Display serif typography
 * - Studio tagline: "Track your photography journey from shoot to delivery"
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Aperture } from 'lucide-react-native';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';

export default function BrandLogo({ showTagline = true, size = 'lg' }) {
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle breathing pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2600, useNativeDriver: true }),
      ])
    ).start();

    // Slow optical lens rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 24000,
        useNativeDriver: true,
      })
    ).start();
  }, [pulseAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isLarge = size === 'lg';
  const ringSize = isLarge ? 72 : 56;
  const iconSize = isLarge ? 34 : 26;

  return (
    <View style={styles.container}>
      {/* Animated Concentric Lens Emblem */}
      <Animated.View
        style={[
          styles.emblemWrapper,
          { width: ringSize, height: ringSize, transform: [{ scale: pulseAnim }] },
        ]}
      >
        <LinearGradient
          colors={Gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.outerRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
        >
          <View style={[styles.middleRing, { width: ringSize - 4, height: ringSize - 4, borderRadius: (ringSize - 4) / 2 }]}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Aperture size={iconSize} color={Colors.gold.light} strokeWidth={1.5} />
            </Animated.View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Justified Centered Typography */}
      <View style={styles.textGroup}>
        <Text style={[styles.brandTitle, isLarge ? styles.brandTitleLg : styles.brandTitleMd]}>
          E-KODAK
        </Text>
        <View style={styles.separatorRow}>
          <LinearGradient
            colors={['transparent', Colors.gold.DEFAULT, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.dividerLine}
          />
        </View>
        <Text style={styles.brandSubtitle}>
          PHOTOGRAPHY STUDIO
        </Text>
        {showTagline && (
          <Text style={styles.tagline}>
            Track your photography journey from shoot to delivery
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
    ...Shadow.gold,
  },
  outerRing: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleRing: {
    backgroundColor: Colors.bg.surface,
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 110, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    alignItems: 'center',
    gap: 3,
  },
  brandTitle: {
    fontFamily: Typography.fontHeading,
    color: Colors.gold.light,
    letterSpacing: 4,
    textAlign: 'center',
  },
  brandTitleLg: {
    fontSize: 26,
  },
  brandTitleMd: {
    fontSize: 20,
  },
  separatorRow: {
    width: 90,
    height: 1,
    marginVertical: 2,
  },
  dividerLine: {
    width: '100%',
    height: 1,
  },
  brandSubtitle: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10,
    color: Colors.text.secondary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  tagline: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.neutral[400],
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: Spacing[4],
    lineHeight: 18,
  },
});
