/**
 * TutorialScreen.jsx
 * Animated onboarding walkthrough shown on first app launch.
 * 4 slides presenting the app concept with gold animations.
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
import { Colors, Typography, Spacing, Radius } from '../theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'welcome',
    icon: Camera,
    iconColor: Colors.gold.DEFAULT,
    badge: 'E-Kodak Studio',
    headline: 'Your Memories,\nPerfectly Captured.',
    body: 'Welcome to the official E-Kodak Photography Studio companion app. Designed for clients and photographers alike.',
    gradient: ['#0B0B0E', '#16100A'],
  },
  {
    id: 'scan',
    icon: QrCode,
    iconColor: Colors.gold.light,
    badge: 'QR Booking Pass',
    headline: 'Scan Your\nBooking QR Code.',
    body: 'Every E-Kodak booking has a unique QR pass. Scan it once and track your session in real-time directly in this app.',
    gradient: ['#0B0B0E', '#0A0E16'],
  },
  {
    id: 'track',
    icon: Activity,
    iconColor: '#10B981',
    badge: 'Live Updates',
    headline: 'Track Every\nStep of Your Session.',
    body: 'From pending review to ready for pickup — watch your booking status update automatically as your photos come to life.',
    gradient: ['#0B0B0E', '#0A160E'],
  },
  {
    id: 'notify',
    icon: Bell,
    iconColor: '#8B5CF6',
    badge: 'Smart Alerts',
    headline: 'Get Notified\nWhen It Matters.',
    body: 'Receive instant push notifications when your booking is confirmed, your session starts, and when your photos are ready.',
    gradient: ['#0B0B0E', '#100A16'],
  },
];

function Slide({ item, animValue }) {
  const IconComponent = item.icon;
  const scale = animValue.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const opacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <LinearGradient colors={item.gradient} style={styles.slide}>
      <Animated.View style={[styles.slideContent, { opacity, transform: [{ scale }] }]}>
        {/* Icon circle */}
        <View style={[styles.iconRing, { borderColor: item.iconColor + '55' }]}>
          <View style={[styles.iconInner, { backgroundColor: item.iconColor + '22' }]}>
            <IconComponent size={48} color={item.iconColor} strokeWidth={1.5} />
          </View>
        </View>

        {/* Badge */}
        <View style={[styles.badge, { borderColor: item.iconColor + '44', backgroundColor: item.iconColor + '18' }]}>
          <Text style={[styles.badgeText, { color: item.iconColor }]}>{item.badge}</Text>
        </View>

        {/* Text */}
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
    Haptics.selectionAsync();
    listRef.current?.scrollToIndex({ index, animated: true });
    // Animate out old, animate in new
    Animated.timing(animValues[currentIndex], { toValue: 0, duration: 200, useNativeDriver: true }).start();
    Animated.timing(animValues[index], { toValue: 1, duration: 350, useNativeDriver: true }).start();
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete?.();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

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
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
              <Animated.View style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          {currentIndex > 0 && (
            <TouchableOpacity
              onPress={() => goToSlide(currentIndex - 1)}
              style={styles.backBtn}
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )}

          <GoldButton
            onPress={handleNext}
            icon={currentIndex < SLIDES.length - 1 ? ChevronRight : Check}
            style={styles.nextBtn}
          >
            {currentIndex < SLIDES.length - 1 ? 'Next' : "Let's Go!"}
          </GoldButton>
        </View>

        {/* Skip */}
        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={onComplete} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip tutorial</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E' },
  slide: { width, minHeight: height * 0.72, paddingTop: 60 },
  slideContent: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing[8], paddingTop: Spacing[12] },

  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[6],
  },
  iconInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    borderWidth: 1,
    marginBottom: Spacing[4],
  },
  badgeText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  headline: {
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: Spacing[5],
  },
  body: {
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },

  controls: {
    backgroundColor: Colors.bg.base,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[10],
    borderTopWidth: 1,
    borderTopColor: Colors.gold.border,
    alignItems: 'center',
    gap: Spacing[4],
  },
  dots: { flexDirection: 'row', gap: 8, marginBottom: Spacing[1] },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutral[700],
  },
  dotActive: {
    backgroundColor: Colors.gold.DEFAULT,
    width: 24,
    borderRadius: 4,
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    width: '100%',
  },
  nextBtn: { flex: 1 },
  backBtn: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold.border,
  },
  backText: {
    color: Colors.gold.DEFAULT,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
  },
  skipBtn: { paddingVertical: Spacing[2] },
  skipText: { color: Colors.neutral[500], fontSize: Typography.size.sm },
});
