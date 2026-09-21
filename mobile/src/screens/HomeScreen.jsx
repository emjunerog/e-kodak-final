/**
 * HomeScreen.jsx
 * Landing hub for customers — quick scan, saved bookings preview,
 * and mode selector (customer/photographer).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  QrCode, BookOpen, Aperture, ChevronRight, Camera, Star,
} from 'lucide-react-native';
import { getSavedBookings } from '../services/storageService';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import GoldButton from '../components/GoldButton';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import { Colors, Typography, Spacing, Radius } from '../theme';

// ── Animated brand logo ───────────────────────────────────────────────────

function BrandLogo() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <Animated.View style={[styles.logoWrapper, { transform: [{ scale: pulse }] }]}>
      <Aperture size={36} color={Colors.gold.DEFAULT} strokeWidth={1.5} />
    </Animated.View>
  );
}

// ── Quick Action Card ─────────────────────────────────────────────────────

function QuickCard({ icon: Icon, title, sub, onPress, accent = Colors.gold.DEFAULT }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ flex: 1 }}>
      <GlassCard style={styles.quickCard}>
        <View style={[styles.quickIcon, { backgroundColor: accent + '22', borderColor: accent + '44' }]}>
          <Icon size={24} color={accent} strokeWidth={1.5} />
        </View>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickSub}>{sub}</Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const [savedBookings, setSavedBookings] = useState([]);

  useFocusEffect(useCallback(() => {
    getSavedBookings().then(setSavedBookings);
  }, []));

  const recentBooking = savedBookings[0];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero Header ── */}
        <LinearGradient colors={['#0F0F14', '#0B0B0E']} style={styles.hero}>
          <View style={styles.heroTop}>
            <BrandLogo />
            <View style={styles.heroBranding}>
              <Text style={styles.studioName}>E-Kodak Studio</Text>
              <View style={styles.goldLine} />
              <Text style={styles.studioTagline}>Photography Excellence</Text>
            </View>
          </View>
          <Text style={styles.heroWelcome}>Welcome back</Text>
          <Text style={styles.heroSub}>
            Track your sessions, scan your QR pass, or view your schedule.
          </Text>
        </LinearGradient>

        {/* ── Quick Actions ── */}
        <View style={styles.quickRow}>
          <QuickCard
            icon={QrCode}
            title="Scan QR"
            sub="Load your booking pass"
            accent={Colors.gold.DEFAULT}
            onPress={() => navigation.navigate('Scanner')}
          />
          <QuickCard
            icon={BookOpen}
            title="My Bookings"
            sub="View saved sessions"
            accent='#3B82F6'
            onPress={() => navigation.navigate('Bookings')}
          />
        </View>

        {/* ── Recent Booking Preview ── */}
        {recentBooking && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Recent Booking</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Bookings')}
            >
              <GlassCard glow style={styles.recentCard}>
                <View style={styles.recentTop}>
                  <View>
                    <Text style={styles.recentNum}>#{recentBooking.bookingNumber || '—'}</Text>
                    {recentBooking.clientName && (
                      <Text style={styles.recentClient}>{recentBooking.clientName}</Text>
                    )}
                    {recentBooking.serviceName && (
                      <Text style={styles.recentService}>{recentBooking.serviceName}</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <StatusBadge status={recentBooking.status} />
                    <ChevronRight size={16} color={Colors.gold.dim} />
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Photographer Portal CTA ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Studio Access</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PhotographerLogin')}
          >
            <GlassCard style={styles.photographerCard}>
              <View style={styles.photographerRow}>
                <View style={styles.photographerIcon}>
                  <Camera size={28} color={Colors.gold.DEFAULT} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.photographerTitle}>Photographer Portal</Text>
                  <Text style={styles.photographerSub}>
                    View daily shoots and manage your schedule
                  </Text>
                </View>
                <ChevronRight size={18} color={Colors.gold.dim} />
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>

        {/* ── Brand Footer ── */}
        <View style={styles.brandFooter}>
          <Star size={12} color={Colors.gold.dim} />
          <Text style={styles.brandFooterText}>
            E-Kodak Photography Studio — Capturing Your Story
          </Text>
          <Star size={12} color={Colors.gold.dim} />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.base },
  content: { paddingBottom: 20 },

  hero: {
    paddingTop: 56,
    paddingBottom: Spacing[8],
    paddingHorizontal: Spacing[6],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold.border,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4], marginBottom: Spacing[6] },
  logoWrapper: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 1.5, borderColor: Colors.gold.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.gold.bg,
    shadowColor: Colors.gold.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 16,
    elevation: 10,
  },
  heroBranding: { flex: 1 },
  studioName: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.gold.DEFAULT,
    letterSpacing: 0.5,
  },
  goldLine: {
    height: 1, width: 40, backgroundColor: Colors.gold.DEFAULT,
    marginVertical: Spacing[1],
  },
  studioTagline: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  heroWelcome: {
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing[2],
  },
  heroSub: {
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
    lineHeight: 24,
  },

  quickRow: { flexDirection: 'row', gap: Spacing[4], padding: Spacing[5] },
  quickCard: { padding: Spacing[4], gap: Spacing[2], flex: 1 },
  quickIcon: {
    width: 48, height: 48, borderRadius: Radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  quickTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Colors.text.primary, marginTop: Spacing[1] },
  quickSub: { fontSize: Typography.size.xs, color: Colors.text.secondary, lineHeight: 18 },

  sectionBlock: { paddingHorizontal: Spacing[5], marginBottom: Spacing[5] },
  sectionLabel: {
    fontSize: Typography.size.xs,
    color: Colors.gold.dim,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing[3],
  },

  recentCard: { padding: Spacing[5] },
  recentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recentNum: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  recentClient: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginTop: 2 },
  recentService: { fontSize: Typography.size.xs, color: Colors.gold.dim, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },

  photographerCard: { padding: Spacing[4] },
  photographerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4] },
  photographerIcon: {
    width: 52, height: 52, borderRadius: Radius.md,
    backgroundColor: Colors.gold.bg, borderWidth: 1,
    borderColor: Colors.gold.border, alignItems: 'center', justifyContent: 'center',
  },
  photographerTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Colors.text.primary, marginBottom: 3 },
  photographerSub: { fontSize: Typography.size.sm, color: Colors.text.secondary, lineHeight: 18 },

  brandFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing[2], paddingVertical: Spacing[4],
  },
  brandFooterText: {
    fontSize: Typography.size.xs,
    color: Colors.neutral[600],
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
