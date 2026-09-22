/**
 * HomeScreen.jsx
 * Luxury Editorial Landing Hub for E-Kodak Photography Studio.
 * Features:
 * - Playfair Display & Inter typography
 * - Darkroom warm studio gradient lighting
 * - Dual-layer animated brand aperture
 * - VIP booking pass card
 * - Tactile quick action cards
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  QrCode, BookOpen, Aperture, ChevronRight, Camera,
  Sparkles, Calendar, ArrowUpRight,
} from 'lucide-react-native';

import { getSavedBookings } from '../services/storageService';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';

// ── Animated Brand Logo ───────────────────────────────────────────────────

function BrandLogo() {
  const pulse = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 2400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2400, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  }, [pulse, rotate]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.logoWrapper, { transform: [{ scale: pulse }] }]}>
      <LinearGradient
        colors={Gradients.gold}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logoGradientRing}
      >
        <View style={styles.logoInner}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Aperture size={30} color={Colors.gold.light} strokeWidth={1.5} />
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Quick Action Card ─────────────────────────────────────────────────────

function QuickCard({ icon: Icon, title, sub, onPress, accent = Colors.gold.DEFAULT }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={{ flex: 1 }}>
      <GlassCard highlight style={styles.quickCard}>
        <View style={styles.quickCardTop}>
          <View style={[styles.quickIconWrapper, { borderColor: accent + '40', backgroundColor: accent + '18' }]}>
            <Icon size={22} color={accent} strokeWidth={1.75} />
          </View>
          <ArrowUpRight size={16} color={Colors.neutral[500]} />
        </View>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickSub} numberOfLines={2}>{sub}</Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

// ── Main Home Screen ─────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const [savedBookings, setSavedBookings] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getSavedBookings().then(setSavedBookings);
    }, [])
  );

  const recentBooking = savedBookings[0];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg.base} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Editorial Studio Hero ── */}
        <LinearGradient
          colors={Gradients.darkStudio}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.hero}
        >
          {/* Subtle warm ambient lighting overlay */}
          <LinearGradient
            colors={Gradients.ambientSpot}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.ambientLight}
          />

          <View style={styles.heroTopRow}>
            <BrandLogo />
            <View style={styles.heroBranding}>
              <Text style={styles.studioName}>E-KODAK STUDIO</Text>
              <View style={styles.goldLineWrapper}>
                <LinearGradient
                  colors={Gradients.gold}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.goldLine}
                />
              </View>
              <Text style={styles.studioTagline}>Bespoke Photography · Cebu</Text>
            </View>
          </View>

          <View style={styles.heroTextGroup}>
            <Text style={styles.heroHeadlineLead}>Your Moments,</Text>
            <Text style={styles.heroHeadlineAccent}>Preserved in Elegance.</Text>
            <Text style={styles.heroSub}>
              Scan your booking QR code to track live studio shoots, proofs, retouching, and delivery in real time.
            </Text>
          </View>
        </LinearGradient>

        {/* ── Quick Action Cards ── */}
        <View style={styles.quickRow}>
          <QuickCard
            icon={QrCode}
            title="Scan QR Pass"
            sub="Load studio booking pass"
            accent={Colors.gold.DEFAULT}
            onPress={() => navigation.navigate('Scanner')}
          />
          <QuickCard
            icon={BookOpen}
            title="Saved Sessions"
            sub="View all tracked bookings"
            accent="#60A5FA"
            onPress={() => navigation.navigate('Bookings')}
          />
        </View>

        {/* ── VIP Recent Booking Pass ── */}
        {recentBooking && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Sparkles size={14} color={Colors.gold.DEFAULT} />
              <Text style={styles.sectionLabel}>Active Studio Pass</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Bookings')}
            >
              <GlassCard glow style={styles.vipPassCard}>
                {/* Gold left indicator spine */}
                <LinearGradient
                  colors={Gradients.gold}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.passSpine}
                />

                <View style={styles.passContent}>
                  <View style={styles.passTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.passNumber}>
                        #{recentBooking.bookingNumber || '—'}
                      </Text>
                      {recentBooking.clientName && (
                        <Text style={styles.passClient} numberOfLines={1}>
                          {recentBooking.clientName}
                        </Text>
                      )}
                      {recentBooking.serviceName && (
                        <Text style={styles.passService}>
                          {recentBooking.serviceName}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <StatusBadge status={recentBooking.status} size="sm" />
                      {recentBooking.sessionDate && (
                        <View style={styles.dateTag}>
                          <Calendar size={11} color={Colors.text.muted} />
                          <Text style={styles.dateTagText}>
                            {new Date(recentBooking.sessionDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.passDivider} />

                  <View style={styles.passFooter}>
                    <Text style={styles.passPrompt}>Tap to open live tracker</Text>
                    <View style={styles.chevronPill}>
                      <ChevronRight size={14} color={Colors.gold.light} />
                    </View>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Studio Access (Photographer Portal) ── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Camera size={14} color={Colors.gold.DEFAULT} />
            <Text style={styles.sectionLabel}>Studio Access</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PhotographerLogin')}
          >
            <GlassCard highlight style={styles.photographerCard}>
              <View style={styles.photographerRow}>
                <View style={styles.photographerIcon}>
                  <Camera size={26} color={Colors.gold.DEFAULT} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.photographerTitle}>Photographer Portal</Text>
                  <Text style={styles.photographerSub}>
                    View daily studio shoot schedules and update booking progress
                  </Text>
                </View>
                <View style={styles.chevronPill}>
                  <ChevronRight size={16} color={Colors.gold.light} />
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>

        {/* ── Editorial Studio Quote Footer ── */}
        <View style={styles.brandFooter}>
          <View style={styles.footerLine} />
          <Text style={styles.footerQuote}>
            "Every frame tells an everlasting story."
          </Text>
          <Text style={styles.footerCopyright}>
            E-KODAK PHOTOGRAPHY STUDIO · CEBU, PHILIPPINES
          </Text>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.base },
  content: { paddingBottom: 24 },

  hero: {
    paddingTop: 56,
    paddingBottom: Spacing[7],
    paddingHorizontal: Spacing[6],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold.border,
    position: 'relative',
    overflow: 'hidden',
  },
  ambientLight: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    marginBottom: Spacing[6],
  },
  logoWrapper: {
    width: 62,
    height: 62,
    borderRadius: 31,
    ...Shadow.gold,
  },
  logoGradientRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 59,
    height: 59,
    borderRadius: 29.5,
    backgroundColor: Colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBranding: { flex: 1 },
  studioName: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: Colors.gold.light,
    letterSpacing: 2,
  },
  goldLineWrapper: { marginVertical: 3 },
  goldLine: { height: 1.5, width: 44, borderRadius: 1 },
  studioTagline: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  heroTextGroup: { gap: 2 },
  heroHeadlineLead: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size['3xl'],
    color: Colors.text.primary,
    lineHeight: 38,
  },
  heroHeadlineAccent: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: Typography.size['2xl'],
    color: Colors.gold.DEFAULT,
    lineHeight: 34,
    marginBottom: Spacing[2],
  },
  heroSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 22,
  },

  quickRow: {
    flexDirection: 'row',
    gap: Spacing[4],
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[5],
  },
  quickCard: {
    padding: Spacing[4],
    gap: Spacing[2],
    minHeight: 140,
    justifyContent: 'space-between',
  },
  quickCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  quickIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
    marginTop: Spacing[1],
  },
  quickSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 17,
  },

  sectionBlock: {
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: Spacing[3],
  },
  sectionLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.xs,
    color: Colors.gold.light,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // VIP Pass Card
  vipPassCard: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  passSpine: {
    width: 4,
  },
  passContent: {
    flex: 1,
    padding: Spacing[4],
  },
  passTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  passNumber: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    color: Colors.text.primary,
  },
  passClient: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  passService: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: Typography.size.xs,
    color: Colors.gold.light,
    marginTop: 1,
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dateTagText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
  },
  passDivider: {
    height: 1,
    backgroundColor: Colors.gold.border,
    marginVertical: Spacing[3],
  },
  passFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passPrompt: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs,
    color: Colors.gold.light,
    letterSpacing: 0.5,
  },
  chevronPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.gold.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Photographer Card
  photographerCard: {
    padding: Spacing[4],
  },
  photographerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  photographerIcon: {
    width: 50,
    height: 50,
    borderRadius: Radius.md,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photographerTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  photographerSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },

  // Footer
  brandFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[4],
    gap: 6,
  },
  footerLine: {
    width: 36,
    height: 1,
    backgroundColor: Colors.gold.border,
    marginBottom: 4,
  },
  footerQuote: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: Typography.size.sm,
    color: Colors.neutral[400],
    textAlign: 'center',
  },
  footerCopyright: {
    fontFamily: Typography.fontBody,
    fontSize: 9.5,
    color: Colors.neutral[600],
    letterSpacing: 1.5,
    textAlign: 'center',
  },
});
