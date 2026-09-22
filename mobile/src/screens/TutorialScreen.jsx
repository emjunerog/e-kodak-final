/**
 * TutorialScreen.jsx
 * Luxury Editorial Onboarding Walkthrough for E-Kodak Photography Studio.
 * Features:
 * - Playfair Display & Inter typography
 * - Darkroom warm studio gradients
 * - Expanding gold indicator pills
 * - Metallic gradient CTA button
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Animated,
  FlatList, TouchableOpacity, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  QrCode, Activity, Bell, Camera, ChevronRight, Check,
} from 'lucide-react-native';

import GoldButton from '../components/GoldButton';
import { Colors, Gradients, Typography, Spacing, Radius } from '../theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'welcome',
    icon: Camera,
    iconColor: Colors.gold.DEFAULT,
    badge: 'E-KODAK STUDIO',
    headline: 'Your Memories,\nCaptured in Perfection.',
    body: 'Welcome to the official E-Kodak Studio companion. Designed to connect clients and studio artists in real time.',
    gradient: Gradients.darkStudio,
  },
  {
    id: 'scan',
    icon: QrCode,
    iconColor: Colors.gold.light,
    badge: 'QR BOOKING PASS',
    headline: 'Instant Access with\nYour Studio QR Pass.',
    body: 'Scan the QR code from your booking receipt or web dashboard to link your session directly to this device.',
    gradient: ['#1C1813', '#120F0B', '#0D0B09'],
  },
  {
    id: 'track',
    icon: Activity,
    iconColor: Colors.status.ready,
    badge: 'REAL-TIME TRACKING',
    headline: 'Track Every Milestone\nFrom Shoot to Pickup.',
    body: 'Watch your photos progress through scheduling, studio shooting, high-end color grading, retouching, and printing.',
    gradient: ['#141A16', '#0E1210', '#0D0B09'],
  },
  {
    id: 'notify',
    icon: Bell,
    iconColor: '#A78BFA',
    badge: 'STUDIO ALERTS',
    headline: 'Stay Informed\nat Every Critical Step.',
    body: 'Receive instant notifications when your session date approaches, photographer is assigned, and proofs are ready.',
    gradient: ['#1A141C', '#120E14', '#0D0B09'],
  },
];

function Slide({ item, animValue }) {
  const IconComponent = item.icon;
  const scale = animValue.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  const opacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <LinearGradient colors={item.gradient} style={styles.slide}>
      <Animated.View style={[styles.slideContent, { opacity, transform: [{ scale }] }]}>
        {/* Dual-ring Icon Container */}
        <View style={[styles.iconRing, { borderColor: item.iconColor + '55' }]}>
          <View style={[styles.iconInner, { backgroundColor: item.iconColor + '18' }]}>
            <IconComponent size={44} color={item.iconColor} strokeWidth={1.5} />
          </View>
        </View>

        {/* Studio Pill Badge */}
        <View style={[styles.badge, { borderColor: item.iconColor + '44', backgroundColor: item.iconColor + '14' }]}>
          <Text style={[styles.badgeText, { color: item.iconColor }]}>{item.badge}</Text>
        </View>

        {/* Editorial Typography */}
        <Text style={styles.headline}>{item.headline}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </Animated.View>
    </LinearGradient>
  );
}

export default function TutorialScreen({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef(null);
  const animValues = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  const goToSlide = (index) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    listRef.current?.scrollToIndex({ index, animated: true });
    Animated.timing(animValues[currentIndex], { toValue: 0, duration: 180, useNativeDriver: true }).start();
    Animated.timing(animValues[index], { toValue: 1, duration: 320, useNativeDriver: true }).start();
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onComplete?.();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg.base} />

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Slide item={item} animValue={animValues[index]} />
        )}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      />

      {/* ── Bottom Controls ── */}
      <View style={styles.controls}>
        {/* Expanding Gold Indicator Pills */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goToSlide(i)} activeOpacity={0.7}>
              <View
                style={[
                  styles.dot,
                  i === currentIndex && styles.dotActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Row */}
        <View style={styles.navRow}>
          {currentIndex > 0 && (
            <TouchableOpacity
              onPress={() => goToSlide(currentIndex - 1)}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )}

          <GoldButton
            onPress={handleNext}
            icon={currentIndex < SLIDES.length - 1 ? ChevronRight : Check}
            style={styles.nextBtn}
            size="md"
          >
            {currentIndex < SLIDES.length - 1 ? 'Continue' : "Enter Studio"}
          </GoldButton>
        </View>

        {/* Skip action */}
        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={onComplete} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip introduction</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.base },
  slide: { width, minHeight: height * 0.72, paddingTop: 64 },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing[8],
    paddingTop: Spacing[10],
  },

  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[6],
  },
  iconInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    paddingVertical: 4,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    borderWidth: 1,
    marginBottom: Spacing[5],
  },
  badgeText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.xs,
    letterSpacing: 1.5,
  },

  headline: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size['2xl'],
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: Spacing[4],
  },
  body: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing[2],
  },

  // Bottom Controls
  controls: {
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[10],
    gap: Spacing[5],
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutral[800],
  },
  dotActive: {
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold.DEFAULT,
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  backBtn: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  nextBtn: {
    flex: 1,
  },

  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  skipText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.neutral[500],
    letterSpacing: 0.5,
  },
});
