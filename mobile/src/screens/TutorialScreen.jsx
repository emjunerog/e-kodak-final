/**
 * TutorialScreen.jsx
 * Luxury Onboarding Tour & Role Selection for E-Kodak Photography Studio.
 * Features:
 * - 4 Editorial onboarding tour slides
 * - Final step: Role selection (Studio Client vs Studio Staff / Photographer)
 * - If Client: Lands directly on customer Home dashboard with guided scan banner
 * - If Photographer: Lands directly on Photographer Login portal
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
  User, Lock, Sparkles, ArrowRight,
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
    body: 'Scan the QR pass issued with your booking confirmation to securely link your photoshoot session to this device.',
    gradient: ['#1C1813', '#120F0B', '#0D0B09'],
  },
  {
    id: 'track',
    icon: Activity,
    iconColor: Colors.status.ready,
    badge: 'REAL-TIME TRACKING',
    headline: 'Track Every Phase\nFrom Shoot to Delivery.',
    body: 'Follow your portrait session through scheduling, studio lighting, professional color grading, proofing, and packaging.',
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

function TourSlide({ item, animValue }) {
  const IconComponent = item.icon;
  const scale = animValue.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  const opacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  const listRef = useRef(null);
  const animValues = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  const goToSlide = (index) => {
    try { Haptics.selectionAsync(); } catch {}
    listRef.current?.scrollToIndex({ index, animated: true });
    Animated.timing(animValues[currentIndex], { toValue: 0, duration: 180, useNativeDriver: true }).start();
    Animated.timing(animValues[index], { toValue: 1, duration: 320, useNativeDriver: true }).start();
    setCurrentIndex(index);
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
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg.base} />
        <LinearGradient
          colors={Gradients.darkStudio}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.roleContent}>
          <View style={styles.roleHeaderGroup}>
            <View style={styles.roleIconEmblem}>
              <Sparkles size={28} color={Colors.gold.light} />
            </View>
            <Text style={styles.roleTitle}>Select Your Experience</Text>
            <Text style={styles.roleSubtitle}>
              Personalize your E-Kodak Studio companion application.
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
                    <User size={26} color={Colors.gold.light} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>RECOMMENDED</Text>
                    </View>
                    <Text style={styles.roleCardTitle}>I am a Studio Client</Text>
                    <Text style={styles.roleCardDesc}>
                      Track your photoshoot milestones, view proofs, and monitor print pickup and delivery.
                    </Text>
                  </View>
                  <ArrowRight size={18} color={Colors.gold.light} />
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
                    <Lock size={24} color={Colors.neutral[400]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleCardTitle}>I am Studio Staff</Text>
                    <Text style={styles.roleCardDesc}>
                      Sign in to your photographer portal to manage assigned shoots and update session status.
                    </Text>
                  </View>
                  <ChevronRight size={18} color={Colors.neutral[500]} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── Tour Slides View ───────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg.base} />

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TourSlide item={item} animValue={animValues[index]} />
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

  // ── Role Selection Styles ───────────────────────────────────
  roleContainer: {
    flex: 1,
    backgroundColor: Colors.bg.base,
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
  },
  roleContent: {
    gap: Spacing[6],
  },
  roleHeaderGroup: {
    alignItems: 'center',
    gap: 4,
  },
  roleIconEmblem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
    ...Shadow.goldSoft,
  },
  roleTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size['2xl'],
    color: Colors.text.primary,
    textAlign: 'center',
  },
  roleSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing[2],
  },
  roleCardsGroup: {
    gap: Spacing[4],
    marginTop: Spacing[2],
  },
  roleBtnWrapper: {
    width: '100%',
  },
  roleCard: {
    padding: Spacing[5],
  },
  roleCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  roleIconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffIconBox: {
    backgroundColor: Colors.bg.surface,
    borderColor: Colors.neutral[700],
  },
  tagBadge: {
    backgroundColor: Colors.gold.bg,
    borderWidth: 0.8,
    borderColor: Colors.gold.borderLight,
    borderRadius: Radius.full,
    paddingVertical: 1.5,
    paddingHorizontal: 7,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  tagBadgeText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 8.5,
    color: Colors.gold.light,
    letterSpacing: 1,
  },
  roleCardTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  roleCardDesc: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 17,
  },
});
