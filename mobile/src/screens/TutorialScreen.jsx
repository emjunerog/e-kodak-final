/**
 * TutorialScreen.jsx
 * Luxury Onboarding Tour & Role Selection for E-Kodak Photography Studio.
 * Features:
 * - 4 Editorial onboarding tour slides with swipe gesture support
 * - Dynamic pagination indicators with smooth transitions
 * - Final step: Role selection (Studio Client vs Studio Staff / Photographer)
 * - If Client: Lands directly on customer Home dashboard with guided scan banner
 * - If Photographer: Lands directly on Photographer Login portal
 */

import React, { useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  View, Text, StyleSheet, Dimensions, Animated,
  FlatList, TouchableOpacity, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  QrCode, Activity, Bell, Camera, ChevronRight, Check,
  User, Lock, Sparkles, ArrowRight, BookOpen,
} from 'lucide-react-native';

import GlassCard from '../components/GlassCard';
import GoldButton from '../components/GoldButton';
import { setUserRole } from '../services/storageService';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'welcome',
    icon: Camera,
    iconColor: Colors.gold.DEFAULT,
    badge: 'E-KODAK STUDIO',
    headline: 'Your Memories,\nCaptured in Perfection.',
    body: 'Welcome to the official companion app for E-Kodak Photography Studio. Track your photography journey from shoot to delivery.',
    gradient: Gradients.darkStudio,
  },
  {
    id: 'scan',
    icon: QrCode,
    iconColor: Colors.gold.light,
    badge: 'STUDIO QR PASS',
    headline: 'Instant Access with\nYour Studio Pass.',
    body: 'Scan the QR code printed on your session receipt or web booking to link your photoshoot milestones directly to this device.',
    gradient: ['#1C1813', '#120F0B', '#0D0B09'],
  },
  {
    id: 'track',
    icon: Activity,
    iconColor: Colors.status.ready,
    badge: 'REAL-TIME TRACKING',
    headline: 'Follow Every Phase\nFrom Shoot to Delivery.',
    body: 'Monitor studio bay lighting, raw photo capture, master color grading, client proof approvals, and luxury print packaging in real time.',
    gradient: ['#141A16', '#0E1210', '#0D0B09'],
  },
  {
    id: 'portfolio',
    icon: Sparkles,
    iconColor: '#A78BFA',
    badge: 'STUDIO SHOWCASE',
    headline: 'Curated Portfolios\n& Prep Guides.',
    body: 'Explore live portfolios synced directly with our studio bays, check transparent package rates, and get wardrobe advice before your session.',
    gradient: ['#1A141C', '#120E14', '#0D0B09'],
  },
];

function TourSlide({ item, animValue }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  const IconComponent = item.icon;
  const scale = animValue.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const opacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });

  return (
    <LinearGradient colors={item.gradient} style={styles.slide}>
      <Animated.View style={[styles.slideContent, { opacity, transform: [{ scale }] }]}>
        <View style={[styles.iconRing, { borderColor: item.iconColor + '55' }]}>
          <View style={[styles.iconInner, { backgroundColor: item.iconColor + '18' }]}>
            <IconComponent size={44} color={item.iconColor} strokeWidth={1.5} />
          </View>
        </View>

        <View style={[styles.badge, { borderColor: item.iconColor + '44', backgroundColor: item.iconColor + '14' }]}>
          <Text style={[styles.badgeText, { color: item.iconColor }]}>{item.badge}</Text>
        </View>

        <Text style={styles.headline}>{item.headline}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </Animated.View>
    </LinearGradient>
  );
}

export default function TutorialScreen({ onComplete }) {
  const { isDark, colors, gradients } = useTheme();
  const styles = getStyles(colors);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  const listRef = useRef(null);
  const animValues = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  const goToSlide = (index) => {
    if (index < 0 || index >= SLIDES.length) return;
    try { Haptics.selectionAsync(); } catch {}
    listRef.current?.scrollToIndex({ index, animated: true });
    Animated.timing(animValues[currentIndex], { toValue: 0, duration: 180, useNativeDriver: false }).start();
    Animated.timing(animValues[index], { toValue: 1, duration: 320, useNativeDriver: false }).start();
    setCurrentIndex(index);
  };

  const handleMomentumScrollEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
      try { Haptics.selectionAsync(); } catch {}
      Animated.timing(animValues[currentIndex], { toValue: 0, duration: 180, useNativeDriver: false }).start();
      Animated.timing(animValues[index], { toValue: 1, duration: 320, useNativeDriver: false }).start();
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      // Tour completed -> prompt role selection
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setShowRoleSelection(true);
    }
  };

  const handleSelectRole = async (role) => {
    try { await Haptics.selectionAsync(); } catch {}
    await setUserRole(role);
    onComplete?.(role);
  };

  // ── Final Role Selection View ──────────────────────────────────────────────
  if (showRoleSelection) {
    return (
      <View style={styles.roleContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg.base} />
        <LinearGradient
          colors={Gradients.darkStudio}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.roleContent}>
          <View style={styles.roleHeaderGroup}>
            <View style={styles.roleIconEmblem}>
              <Sparkles size={28} color={colors.gold.light} />
            </View>
            <Text style={styles.roleTitle}>Select Your Experience</Text>
            <Text style={styles.roleSubtitle}>
              Please choose how you will be using the E-Kodak Studio companion application:
            </Text>
          </View>

          <View style={styles.roleCardsGroup}>
            {/* Role 1: Studio Client */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSelectRole('customer')}
              style={styles.roleBtnWrapper}
            >
              <GlassCard glow highlight style={styles.roleCard}>
                <View style={styles.roleCardInner}>
                  <View style={styles.roleIconBox}>
                    <User size={26} color={colors.gold.light} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>CLIENT HUB · RECOMMENDED</Text>
                    </View>
                    <Text style={styles.roleCardTitle}>I am a Studio Client</Text>
                    <Text style={styles.roleCardDesc}>
                      Track your photoshoot milestones, view proofs, check studio rates, and monitor print pickup and delivery.
                    </Text>
                  </View>
                  <ArrowRight size={18} color={colors.gold.light} />
                </View>
              </GlassCard>
            </TouchableOpacity>

            {/* Role 2: Photographer / Staff */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSelectRole('photographer')}
              style={styles.roleBtnWrapper}
            >
              <GlassCard highlight style={styles.roleCard}>
                <View style={styles.roleCardInner}>
                  <View style={[styles.roleIconBox, styles.staffIconBox]}>
                    <Lock size={24} color={colors.neutral[400]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.tagBadge, styles.staffBadge]}>
                      <Text style={[styles.tagBadgeText, styles.staffBadgeText]}>STAFF & MANAGEMENT</Text>
                    </View>
                    <Text style={styles.roleCardTitle}>I am Studio Staff</Text>
                    <Text style={styles.roleCardDesc}>
                      Sign in to your photographer portal to manage assigned shoots, update session milestones, and view schedule.
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.neutral[500]} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setShowRoleSelection(false)}
            style={styles.reviewTourBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.reviewTourText}>← Review Introduction Tour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Tour Slides View ───────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.base} />

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TourSlide item={item} animValue={animValues[index]} />
        )}
        horizontal
        pagingEnabled
        scrollEnabled={true}
        onMomentumScrollEnd={handleMomentumScrollEnd}
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
            {currentIndex < SLIDES.length - 1 ? 'Continue' : "Choose Experience"}
          </GoldButton>
        </View>

        {/* Skip action */}
        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={() => setShowRoleSelection(true)} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip introduction</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.base },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing[7],
  },
  slideContent: {
    alignItems: 'center',
    maxWidth: 360,
  },
  iconRing: {
    width: 104,
    height: 104,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[5],
  },
  iconInner: {
    width: 82,
    height: 82,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginBottom: Spacing[4],
  },
  badgeText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.xs,
    letterSpacing: 1.2,
  },
  headline: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size['2xl'],
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: Spacing[3],
  },
  body: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Controls
  controls: {
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[8],
    paddingTop: Spacing[4],
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing[5],
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.gold.DEFAULT,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  backBtn: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
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
    marginTop: Spacing[2],
  },
  skipText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
  },

  // Role Selection View
  roleContainer: {
    flex: 1,
    backgroundColor: Colors.bg.base,
    justifyContent: 'center',
  },
  roleContent: {
    flex: 1,
    paddingHorizontal: Spacing[5],
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  roleHeaderGroup: {
    alignItems: 'center',
    marginBottom: Spacing[6],
  },
  roleIconEmblem: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
  },
  roleTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size['2xl'],
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  roleSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  roleCardsGroup: {
    gap: Spacing[4],
  },
  roleBtnWrapper: {
    width: '100%',
  },
  roleCard: {
    padding: Spacing[4],
    borderRadius: Radius.xl,
  },
  roleCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  roleIconBox: {
    width: 50,
    height: 50,
    borderRadius: Radius.lg,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffIconBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212, 168, 83, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    marginBottom: 4,
  },
  staffBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  tagBadgeText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    color: Colors.gold.light,
    letterSpacing: 0.6,
  },
  staffBadgeText: {
    color: Colors.neutral[400],
  },
  roleCardTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
    marginBottom: 3,
  },
  roleCardDesc: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 17,
  },
  reviewTourBtn: {
    alignItems: 'center',
    marginTop: Spacing[6],
    paddingVertical: 10,
  },
  reviewTourText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
    color: Colors.gold.light,
  },
});
