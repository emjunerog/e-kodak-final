/**
 * BrandLogo.jsx
 * Ultra-luxury 3D metallic camera lens emblem and embossed typography for E-Kodak Studio.
 * Supports compact left-aligned dashboard navigation layout and centered showcase layout.
 * Features realistic camera focus rack, shutter recoil, and xenon strobe flash on "E-KODAK".
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../theme';

const LENS_3D_ASSET = require('../../assets/luxury_3d_lens.jpg');

export default function BrandLogo({
  showTagline = true,
  size = 'lg',
  withBackdrop = false,
  layout = 'center', // 'center' | 'left'
}) {
  const { isDark, colors } = useTheme();
  const styles = getStyles(colors);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glintAnim = useRef(new Animated.Value(0)).current;

  // Camera movement & shutter flash animations (pure numeric values, 100% native driver safe)
  const cameraScaleAnim = useRef(new Animated.Value(1)).current;
  const cameraRecoilAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Trigger camera focus zoom + shutter recoil + xenon strobe flash
  const triggerCameraFlash = useCallback(() => {
    Animated.sequence([
      // 1. Camera focus rack (subtle lens zoom in)
      Animated.timing(cameraScaleAnim, {
        toValue: 1.035,
        duration: 350,
        useNativeDriver: true,
      }),
      // 2. Shutter click snap + Xenon flash burst
      Animated.parallel([
        // Camera shutter micro-recoil
        Animated.sequence([
          Animated.timing(cameraRecoilAnim, {
            toValue: -2,
            duration: 35,
            useNativeDriver: true,
          }),
          Animated.spring(cameraRecoilAnim, {
            toValue: 0,
            friction: 5,
            tension: 140,
            useNativeDriver: true,
          }),
        ]),
        // Camera snap punch
        Animated.sequence([
          Animated.timing(cameraScaleAnim, {
            toValue: 1.07,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.spring(cameraScaleAnim, {
            toValue: 1,
            friction: 6,
            tension: 90,
            useNativeDriver: true,
          }),
        ]),
        // Xenon strobe flash burst
        Animated.sequence([
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(flashAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [cameraScaleAnim, cameraRecoilAnim, flashAnim]);

  useEffect(() => {
    // Breathing pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.035, duration: 2600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2600, useNativeDriver: true }),
      ])
    ).start();

    // Specular glint animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glintAnim, { toValue: 1, duration: 3400, useNativeDriver: true }),
        Animated.timing(glintAnim, { toValue: 0, duration: 3400, useNativeDriver: true }),
      ])
    ).start();

    // Recurring camera movement & flash every 4.8 seconds
    const interval = setInterval(() => {
      triggerCameraFlash();
    }, 4800);

    // Initial trigger after 600ms so user immediately sees the effect
    const initialTimer = setTimeout(() => {
      triggerCameraFlash();
    }, 600);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, [pulseAnim, glintAnim, triggerCameraFlash]);

  const glintOpacity = glintAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.15, 0.55, 0.15],
  });

  const combinedLensGlint = Animated.add(
    glintOpacity,
    Animated.multiply(flashAnim, 0.7)
  );

  // ── LEFT-ALIGNED COMPACT NAVIGATION HEADER LAYOUT ─────────────────────────
  if (layout === 'left') {
    const leftOuterSize = 46;
    const leftImageSize = 38;

    return (
      <View style={styles.leftContainer}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            triggerCameraFlash();
          }}
          style={styles.leftTopRow}
        >
          {/* 3D Sculpted Camera Lens Emblem - FULLY ANIMATED WITH CAMERA SHUTTER & FLASH */}
          <Animated.View
            style={[
              styles.emblemWrapperLeft,
              {
                width: leftOuterSize,
                height: leftOuterSize,
                transform: [
                  { scale: pulseAnim },
                  { scale: cameraScaleAnim },
                  { translateY: cameraRecoilAnim },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#FFE7A3', '#D4AF37', '#996515', '#F5D77F', '#5E3E0C']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={[
                styles.beveledOuterRing,
                { width: leftOuterSize, height: leftOuterSize, borderRadius: leftOuterSize / 2 },
              ]}
            >
              <View
                style={[
                  styles.lensCore,
                  { width: leftImageSize, height: leftImageSize, borderRadius: leftImageSize / 2 },
                ]}
              >
                <Image
                  source={LENS_3D_ASSET}
                  style={{ width: leftImageSize, height: leftImageSize, borderRadius: leftImageSize / 2 }}
                  resizeMode="cover"
                />
                <Animated.View style={[styles.specularGlint, { opacity: combinedLensGlint }]} />

                {/* Strobe Flash Burst over the 3D lens optics */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.lensFlashBurst,
                    {
                      width: leftImageSize,
                      height: leftImageSize,
                      borderRadius: leftImageSize / 2,
                      opacity: flashAnim,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.96)', 'rgba(255, 235, 170, 0.65)', 'transparent']}
                    start={{ x: 0.15, y: 0.1 }}
                    end={{ x: 0.85, y: 0.9 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </Animated.View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Typography Column with Camera Movement & Flash */}
          <View style={styles.leftTextCol}>
            <View style={styles.titleRow}>
              {/* Base Gold E-KODAK: ALWAYS VISIBLE, NEVER DISAPPEARS */}
              <Animated.Text
                style={[
                  styles.brandTitleLeft,
                  {
                    color: isDark ? colors.gold.light : colors.gold.DEFAULT,
                    transform: [
                      { scale: cameraScaleAnim },
                      { translateY: cameraRecoilAnim },
                    ],
                  },
                ]}
              >
                E-KODAK
              </Animated.Text>

              {/* Xenon Strobe Flash Overlay */}
              <Animated.Text
                pointerEvents="none"
                style={[
                  styles.brandTitleLeft,
                  styles.brandTitleFlash,
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    opacity: flashAnim,
                    transform: [
                      { scale: cameraScaleAnim },
                      { translateY: cameraRecoilAnim },
                    ],
                  },
                ]}
              >
                E-KODAK
              </Animated.Text>
            </View>

            <Text style={[styles.brandSubtitleLeft, { color: colors.gold.DEFAULT }]}>
              PHOTOGRAPHY STUDIO
            </Text>

            {showTagline && (
              <Text
                style={[styles.taglineLeft, { color: colors.text.secondary }]}
                numberOfLines={1}
              >
                Track your photography journey from shoot to delivery
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ── CENTERED SHOWCASE LAYOUT ───────────────────────────────────────────────
  const isLarge = size === 'lg';
  const outerSize = isLarge ? 96 : 74;
  const imageSize = isLarge ? 86 : 66;

  const content = (
    <View style={styles.innerContent}>
      {/* ── 3D Sculpted Camera Lens Emblem - FULLY ANIMATED ── */}
      <Animated.View
        style={[
          styles.emblemWrapper,
          {
            width: outerSize,
            height: outerSize,
            transform: [
              { scale: pulseAnim },
              { scale: cameraScaleAnim },
              { translateY: cameraRecoilAnim },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#FFE7A3', '#D4AF37', '#996515', '#F5D77F', '#5E3E0C']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.beveledOuterRing, { width: outerSize, height: outerSize, borderRadius: outerSize / 2 }]}
        >
          <View style={[styles.lensCore, { width: imageSize, height: imageSize, borderRadius: imageSize / 2 }]}>
            <Image
              source={LENS_3D_ASSET}
              style={{ width: imageSize, height: imageSize, borderRadius: imageSize / 2 }}
              resizeMode="cover"
            />
            <Animated.View style={[styles.specularGlint, { opacity: combinedLensGlint }]} />

            {/* Strobe Flash Burst over the 3D lens optics */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.lensFlashBurst,
                {
                  width: imageSize,
                  height: imageSize,
                  borderRadius: imageSize / 2,
                  opacity: flashAnim,
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.96)', 'rgba(255, 235, 170, 0.65)', 'transparent']}
                start={{ x: 0.15, y: 0.1 }}
                end={{ x: 0.85, y: 0.9 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ── 3D Embossed Typography with Camera Movement & Flash ── */}
      <View style={styles.textGroup}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            triggerCameraFlash();
          }}
        >
          <Animated.View
            style={[
              styles.titleWrapper,
              {
                transform: [
                  { scale: cameraScaleAnim },
                  { translateY: cameraRecoilAnim },
                ],
              },
            ]}
          >
            <Text
              style={[
                styles.brandTitleShadow,
                isLarge ? styles.brandTitleLg : styles.brandTitleMd,
                { color: isDark ? '#382506' : '#C7A250' },
              ]}
            >
              E-KODAK
            </Text>
            <Text
              style={[
                styles.brandTitle,
                isLarge ? styles.brandTitleLg : styles.brandTitleMd,
                { color: isDark ? colors.gold.light : colors.gold.DEFAULT },
              ]}
            >
              E-KODAK
            </Text>

            {/* Flash Strobe Layer */}
            <Animated.Text
              pointerEvents="none"
              style={[
                styles.brandTitle,
                styles.brandTitleFlashCenter,
                isLarge ? styles.brandTitleLg : styles.brandTitleMd,
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  opacity: flashAnim,
                },
              ]}
            >
              E-KODAK
            </Animated.Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Crest Divider */}
        <View style={styles.crestRow}>
          <LinearGradient
            colors={['transparent', colors.gold.DEFAULT, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.crestLine}
          />
          <View style={styles.crestDiamond}>
            <Text style={[styles.diamondText, { color: colors.gold.DEFAULT }]}>✦</Text>
          </View>
          <LinearGradient
            colors={['transparent', colors.gold.DEFAULT, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.crestLine}
          />
        </View>

        <Text style={[styles.brandSubtitle, { color: colors.gold.DEFAULT }]}>
          PHOTOGRAPHY STUDIO
        </Text>

        {showTagline && (
          <Text style={[styles.tagline, { color: colors.text.secondary }]}>
            Track your photography journey from shoot to delivery
          </Text>
        )}
      </View>
    </View>
  );

  if (!withBackdrop) {
    return <View style={styles.container}>{content}</View>;
  }

  return (
    <View style={[styles.backdropCard, { borderColor: colors.gold.border }]}>
      <LinearGradient
        colors={
          isDark
            ? ['rgba(13, 11, 9, 0.65)', 'rgba(26, 23, 20, 0.88)', 'rgba(13, 11, 9, 0.94)']
            : ['rgba(255, 255, 255, 0.72)', 'rgba(247, 245, 240, 0.88)', 'rgba(255, 255, 255, 0.92)']
        }
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['transparent', isDark ? 'rgba(255, 223, 137, 0.55)' : 'rgba(184, 134, 11, 0.40)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardSpecular}
      />
      {content}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Left Layout Styles ──
  leftContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  leftTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emblemWrapperLeft: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  leftTextCol: {
    justifyContent: 'center',
    gap: 1,
    flex: 1,
  },
  titleRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  brandTitleLeft: {
    fontFamily: Typography.fontHeading,
    fontSize: 21,
    letterSpacing: 2.4,
    textShadowColor: 'rgba(212, 168, 83, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  brandTitleFlash: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 235, 170, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  brandTitleFlashCenter: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 235, 170, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  brandSubtitleLeft: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9.5,
    letterSpacing: 2.2,
  },
  taglineLeft: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
    maxWidth: 260,
  },

  // ── Centered Layout Styles ──
  emblemWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  beveledOuterRing: {
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  lensCore: {
    backgroundColor: '#070605',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 231, 163, 0.45)',
  },
  specularGlint: {
    position: 'absolute',
    top: 3,
    left: 6,
    width: '60%',
    height: '35%',
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    transform: [{ rotate: '-35deg' }],
  },
  lensFlashBurst: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },

  textGroup: {
    alignItems: 'center',
    gap: 3,
  },
  titleWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleShadow: {
    fontFamily: Typography.fontHeading,
    color: '#382506',
    letterSpacing: 5,
    textAlign: 'center',
    position: 'absolute',
    top: 2,
    left: 1,
  },
  brandTitle: {
    fontFamily: Typography.fontHeading,
    color: colors.gold.light,
    letterSpacing: 5,
    textAlign: 'center',
    textShadowColor: 'rgba(212, 168, 83, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  brandTitleLg: {
    fontSize: 27,
  },
  brandTitleMd: {
    fontSize: 21,
  },

  crestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 130,
    marginVertical: 3,
  },
  crestLine: {
    flex: 1,
    height: 1,
  },
  crestDiamond: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondText: {
    fontSize: 9,
    color: colors.gold.DEFAULT,
  },

  brandSubtitle: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10,
    color: colors.gold.DEFAULT,
    letterSpacing: 3.2,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 5,
    maxWidth: 290,
    lineHeight: 18,
  },

  backdropCard: {
    width: '100%',
    minHeight: 170,
    maxHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingVertical: Spacing[6],
    paddingHorizontal: Spacing[4],
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cardSpecular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 3,
  },
});
