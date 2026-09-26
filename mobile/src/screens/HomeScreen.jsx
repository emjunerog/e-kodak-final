/**
 * HomeScreen.jsx
 * Centered luxury customer dashboard for E-Kodak Photography Studio.
 * Features:
 * - Centered E-KODAK brandmark with animated aperture lens
 * - Studio tagline: "Track your photography journey from shoot to delivery"
 * - In-app visual scanning guide modal & first-scan suggestion banner
 * - 2 Wide primary action cards (Scan Pass, Saved Passes)
 * - 3 Functional interactive tool cards (Studio Rates, Shoot Prep, Studio Bay)
 * - Live animated swipable photo reel & collage (connected to Supabase gallery_items)
 * - Real-time Supabase database synchronization (updates when admin changes photos)
 * - Active session dossier preview
 * - Pull-to-refresh
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, RefreshControl,
  Platform, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  QrCode, BookOpen, ChevronRight,
  HelpCircle, Calendar, Bell, X,
} from 'lucide-react-native';

import BrandLogo from '../components/BrandLogo';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import GoldButton from '../components/GoldButton';
import StudioPhotoReel from '../components/StudioPhotoReel';
import ScanInstructionsModal from '../components/ScanInstructionsModal';
import StudioMascotKit from '../components/StudioMascotKit';
import { RatesModal, PrepModal, StudioBayModal } from '../components/StudioToolModals';
import {
  ActivatePassVector,
  ScanPassVector,
  MyPassesVector,
  StudioRatesVector,
  ShootPrepVector,
  StudioBayVector,
} from '../components/StudioVectorIllustrations';
import { useTheme } from '../context/ThemeContext';
import {
  getSavedBookings, fetchStudioGallery, subscribeToGalleryChanges,
} from '../services/storageService';
import { Typography, Spacing, Radius } from '../theme';

export default function HomeScreen({ navigation }) {
  const { isDark, colors, gradients } = useTheme();
  const styles = getStyles(colors, isDark);
  const [savedBookings, setSavedBookings] = useState([]);
  const [galleryItems, setGalleryItems]   = useState([]);
  const [refreshing, setRefreshing]       = useState(false);

  // Modals state
  const [showScanGuide, setShowScanGuide]                 = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showRates, setShowRates]                         = useState(false);
  const [showPrep, setShowPrep]                           = useState(false);
  const [showStudio, setShowStudio]                       = useState(false);

  const loadData = useCallback(async () => {
    const [bookings, gallery] = await Promise.all([
      getSavedBookings(),
      fetchStudioGallery(),
    ]);
    setSavedBookings(bookings);
    setGalleryItems(gallery);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Subscribe to real-time changes in gallery_items from Supabase (web admin updates)
  useEffect(() => {
    const unsubscribe = subscribeToGalleryChanges((updated) => {
      setGalleryItems(updated);
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    await loadData();
    setRefreshing(false);
  };

  const handlePhotoLikeUpdated = (photoId, nextLikes) => {
    setGalleryItems((prev) =>
      prev.map((item) => (item.id === photoId ? { ...item, likes: nextLikes } : item))
    );
  };

  const recentBooking = savedBookings[0];

  const mobileMascotPose = useMemo(() => {
    if (!recentBooking) return 'welcome';
    const st = (recentBooking.status || '').toUpperCase();
    if (st === 'IN_PROGRESS' || st === 'CONFIRMED') return 'shoot';
    if (st === 'PROOFS_READY' || st === 'PENDING_APPROVAL') return 'inspect';
    if (st === 'COMPLETED') return 'celebrate';
    return 'welcome';
  }, [recentBooking]);

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#0C0A08' : '#FAF8F5'}
      />

      {/* Full-Screen Atmospheric Atelier Luxury Gradients */}
      <LinearGradient
        colors={
          isDark
            ? ['#0C0A08', '#16120E', '#0E0C09', '#1A140E', '#090806']
            : ['#FAF8F5', '#F5EFE6', '#EDE4D4', '#F7F3EB', '#FAF7F2']
        }
        locations={[0, 0.22, 0.50, 0.78, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={
          isDark
            ? ['rgba(212, 175, 55, 0.08)', 'transparent', 'rgba(212, 175, 55, 0.04)', 'transparent']
            : ['rgba(212, 175, 55, 0.12)', 'transparent', 'rgba(212, 175, 55, 0.06)', 'transparent']
        }
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold.light}
            colors={[colors.gold.DEFAULT]}
          />
        }
      >
        {/* ── Top Header: Brand Logo, Title & Actions ── */}
        <View style={styles.topHeaderBar}>
          {/* Header Gradient */}
          <LinearGradient
            colors={
              isDark
                ? ['rgba(28, 23, 18, 0.94)', 'rgba(14, 12, 9, 0.97)']
                : ['rgba(255, 255, 255, 0.96)', 'rgba(247, 244, 238, 0.92)']
            }
            style={StyleSheet.absoluteFillObject}
          />
          {/* Subtle Bottom Gold Hairline */}
          <LinearGradient
            colors={['transparent', colors.gold.border, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerBottomHairline}
          />

          {/* Foreground: Top Left Logo + Text, Top Right Action Icons */}
          <View style={styles.headerContentRow}>
            {/* Top Left: 3D Emblem + E-KODAK + Subtitle + Tagline */}
            <BrandLogo layout="left" showTagline size="sm" withBackdrop={false} />

            {/* Top Right Quick Action Icons & Mascot */}
            <View style={styles.topRightActions}>
              <StudioMascotKit size={42} pose={mobileMascotPose} interactive={true} />

              <TouchableOpacity
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch {}
                  setShowScanGuide(true);
                }}
                style={[
                  styles.headerActionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 245, 225, 0.12)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : colors.gold.border,
                  },
                ]}
                activeOpacity={0.8}
                accessibilityLabel="Quick Guide"
              >
                <HelpCircle size={20} color={colors.gold.light} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch {}
                  setShowNotificationsModal(true);
                }}
                style={[
                  styles.headerActionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 245, 225, 0.12)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : colors.gold.border,
                  },
                ]}
                activeOpacity={0.8}
                accessibilityLabel="Studio Notifications"
              >
                <Bell size={20} color={colors.gold.light} />
                <View style={styles.unreadBadgeDot} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── 3D Compact Studio Pass Cards ── */}
        <View style={styles.compactCardsSection}>
          <Text style={[styles.sectionHeaderTitle, { color: colors.gold.DEFAULT, marginBottom: Spacing[1] }]}>
            STUDIO PASS SERVICES
          </Text>

          {/* Card 1: Activate Your Studio Pass (Full Width, 3D Physical Card) */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              try { Haptics.selectionAsync(); } catch {}
              setShowScanGuide(true);
            }}
            style={styles.activateCardWrapper}
          >
            <View style={styles.card3DShadowShell}>
              <View style={[styles.card3DThicknessBase, { backgroundColor: isDark ? '#2E241B' : '#C8B99F' }]}>
                <GlassCard glow highlight style={styles.activate3DCard}>
                  {/* 3D Diagonal Surface Gradient */}
                  <LinearGradient
                    colors={
                      isDark
                        ? ['rgba(212, 175, 55, 0.16)', 'rgba(32, 26, 20, 0.85)', 'rgba(12, 10, 8, 0.96)']
                        : ['rgba(212, 175, 55, 0.20)', 'rgba(255, 255, 255, 0.95)', 'rgba(242, 237, 227, 0.98)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />

                  {/* 3D Top-Left Specular Surface Sheen */}
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.08)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.6, y: 0.6 }}
                    style={StyleSheet.absoluteFillObject}
                    pointerEvents="none"
                  />

                  <View style={styles.activateRow}>
                    {/* 3D Raised Vector Podium - Subtle Luminous Core */}
                    <View style={styles.podium3DWrapper}>
                      <LinearGradient
                        colors={['#FFE7A3', '#D4AF37', '#7A5208', '#F5D77F']}
                        start={{ x: 0.1, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={styles.podiumBeveledRing}
                      >
                        <View style={[styles.podiumCoreDisc, { backgroundColor: isDark ? 'rgba(255, 248, 235, 0.12)' : '#FFFDF9' }]}>
                          <StudioMascotKit pose="hold_qr" size={72} interactive={false} showBadge={false} />
                        </View>
                      </LinearGradient>
                    </View>

                    {/* Justified Content Column */}
                    <View style={styles.activateInfoCol}>
                      <Text style={[styles.activateTitle, { color: colors.text.primary }]}>
                        Activate Your Studio Pass
                      </Text>
                      <Text style={[styles.activateDesc, { color: colors.text.secondary }]} numberOfLines={2}>
                        Link your physical receipt or web reservation to unlock live shoot progress and milestones.
                      </Text>

                      {/* 3D Quick Guide Tactile Pill */}
                      <View style={styles.quickGuidePill3D}>
                        <LinearGradient
                          colors={gradients.gold}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.quickGuidePillGrad}
                        >
                          <HelpCircle size={13} color="#FFFFFF" strokeWidth={2.2} />
                          <Text style={[styles.quickGuidePillText, { color: '#FFFFFF' }]}>
                            Quick Guide
                          </Text>
                          <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.4} />
                        </LinearGradient>
                      </View>
                    </View>
                  </View>
                </GlassCard>
              </View>
            </View>
          </TouchableOpacity>

          {/* Cards 2 & 3: Scan Studio Pass & My Studio Passes (Side by Side 3D Cards) */}
          <View style={styles.sideBySideRow}>
            {/* Left: Scan Studio Pass */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => navigation.navigate('Scanner')}
              style={styles.sideCardCol}
            >
              <View style={styles.card3DShadowShell}>
                <View style={[styles.card3DThicknessBase, { backgroundColor: isDark ? '#2E241B' : '#C8B99F' }]}>
                  <GlassCard glow highlight style={styles.sideCompactCard3D}>
                    {/* 3D Diagonal Gradient */}
                    <LinearGradient
                      colors={
                        isDark
                          ? ['rgba(212, 175, 55, 0.16)', 'rgba(30, 24, 18, 0.88)', 'rgba(12, 10, 8, 0.98)']
                          : ['rgba(212, 175, 55, 0.20)', 'rgba(255, 255, 255, 0.95)', 'rgba(244, 239, 230, 0.98)']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />

                    {/* 3D Raised Circular Podium - Subtle Luminous Core */}
                    <View style={styles.podium3DCircleWrapper}>
                      <LinearGradient
                        colors={['#FFE7A3', '#D4AF37', '#7A5208', '#F5D77F']}
                        start={{ x: 0.1, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={styles.podiumCircleRing}
                      >
                        <View style={[styles.podiumCircleDisc, { backgroundColor: isDark ? 'rgba(255, 248, 235, 0.12)' : '#FFFDF9' }]}>
                          <ScanPassVector size={64} />
                        </View>
                      </LinearGradient>
                    </View>

                    {/* Symmetrical Justified Typography */}
                    <Text style={[styles.sideCardTitle, { color: colors.text.primary }]}>
                      Scan Studio Pass
                    </Text>
                    <Text style={[styles.sideCardDesc, { color: colors.text.muted }]} numberOfLines={2}>
                      Point camera at any receipt or QR pass.
                    </Text>

                    {/* 3D Tactile Action Button */}
                    <View style={styles.sideActionBtn3D}>
                      <LinearGradient
                        colors={gradients.gold}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.sideActionGrad}
                      >
                        <QrCode size={13} color="#FFFFFF" strokeWidth={2.2} />
                        <Text style={[styles.sideActionText, { color: '#FFFFFF' }]}>
                          Scan Pass
                        </Text>
                      </LinearGradient>
                    </View>
                  </GlassCard>
                </View>
              </View>
            </TouchableOpacity>

            {/* Right: My Studio Passes */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => navigation.navigate('Bookings')}
              style={styles.sideCardCol}
            >
              <View style={styles.card3DShadowShell}>
                <View style={[styles.card3DThicknessBase, { backgroundColor: isDark ? '#2E241B' : '#C8B99F' }]}>
                  <GlassCard highlight style={styles.sideCompactCard3D}>
                    {/* 3D Diagonal Gradient */}
                    <LinearGradient
                      colors={
                        isDark
                          ? ['rgba(212, 175, 55, 0.16)', 'rgba(30, 24, 18, 0.88)', 'rgba(12, 10, 8, 0.98)']
                          : ['rgba(212, 175, 55, 0.20)', 'rgba(255, 255, 255, 0.95)', 'rgba(244, 239, 230, 0.98)']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />

                    {/* 3D Raised Circular Podium - Subtle Luminous Core */}
                    <View style={styles.podium3DCircleWrapper}>
                      <LinearGradient
                        colors={['#FFE7A3', '#D4AF37', '#7A5208', '#F5D77F']}
                        start={{ x: 0.1, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={styles.podiumCircleRing}
                      >
                        <View style={[styles.podiumCircleDisc, { backgroundColor: isDark ? 'rgba(255, 248, 235, 0.12)' : '#FFFDF9' }]}>
                          <MyPassesVector size={64} />
                        </View>
                      </LinearGradient>
                    </View>

                    {/* Symmetrical Justified Typography */}
                    <Text style={[styles.sideCardTitle, { color: colors.text.primary }]}>
                      My Studio Passes
                    </Text>
                    <Text style={[styles.sideCardDesc, { color: colors.text.muted }]} numberOfLines={2}>
                      Review active photo passes & proofs.
                    </Text>

                    {/* 3D Tactile Action Button */}
                    <View style={styles.sideActionBtn3D}>
                      <LinearGradient
                        colors={gradients.gold}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.sideActionGrad}
                      >
                        <BookOpen size={13} color="#FFFFFF" strokeWidth={2.2} />
                        <Text style={[styles.sideActionText, { color: '#FFFFFF' }]}>
                          {savedBookings.length > 0 ? `${savedBookings.length} Active` : 'Passes'}
                        </Text>
                      </LinearGradient>
                    </View>
                  </GlassCard>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Three Functional Studio Tool Cards ── */}
        {/* ── Three Functional Studio Tool Cards (3D Physical Architecture) ── */}
        <View style={styles.toolsSection}>
          <Text style={[styles.sectionHeaderTitle, { color: colors.gold.DEFAULT }]}>STUDIO TOOLS & GUIDES</Text>
          <View style={styles.threeToolsRow}>
            {/* Tool 1: Rates & Packages */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowRates(true)}
              style={styles.toolCol}
            >
              <View style={styles.card3DShadowShell}>
                <View style={[styles.card3DThicknessBase, { backgroundColor: isDark ? '#2E241B' : '#C8B99F' }]}>
                  <GlassCard highlight style={styles.tool3DCard}>
                    {/* 3D Diagonal Gradient */}
                    <LinearGradient
                      colors={
                        isDark
                          ? ['rgba(212, 175, 55, 0.14)', 'rgba(28, 22, 17, 0.88)', 'rgba(12, 10, 8, 0.98)']
                          : ['rgba(212, 175, 55, 0.18)', 'rgba(255, 255, 255, 0.95)', 'rgba(244, 239, 230, 0.98)']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />

                    {/* 3D Raised Vector Podium - Subtle Luminous Core */}
                    <View style={styles.toolPodium3DWrapper}>
                      <LinearGradient
                        colors={['#FFE7A3', '#D4AF37', '#7A5208', '#F5D77F']}
                        start={{ x: 0.1, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={styles.toolPodiumRing}
                      >
                        <View style={[styles.toolPodiumDisc, { backgroundColor: isDark ? 'rgba(255, 248, 235, 0.12)' : '#FFFDF9' }]}>
                          <StudioRatesVector size={34} />
                        </View>
                      </LinearGradient>
                    </View>

                    <Text style={[styles.toolTitle, { color: colors.text.primary }]} numberOfLines={1}>
                      Studio Rates
                    </Text>
                    <Text style={[styles.toolSub, { color: colors.text.muted }]} numberOfLines={1}>
                      Packages & Sets
                    </Text>
                  </GlassCard>
                </View>
              </View>
            </TouchableOpacity>

            {/* Tool 2: Shoot Prep */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowPrep(true)}
              style={styles.toolCol}
            >
              <View style={styles.card3DShadowShell}>
                <View style={[styles.card3DThicknessBase, { backgroundColor: isDark ? '#2E241B' : '#C8B99F' }]}>
                  <GlassCard highlight style={styles.tool3DCard}>
                    <LinearGradient
                      colors={
                        isDark
                          ? ['rgba(212, 175, 55, 0.14)', 'rgba(28, 22, 17, 0.88)', 'rgba(12, 10, 8, 0.98)']
                          : ['rgba(212, 175, 55, 0.18)', 'rgba(255, 255, 255, 0.95)', 'rgba(244, 239, 230, 0.98)']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />

                    <View style={styles.toolPodium3DWrapper}>
                      <LinearGradient
                        colors={['#FFE7A3', '#D4AF37', '#7A5208', '#F5D77F']}
                        start={{ x: 0.1, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={styles.toolPodiumRing}
                      >
                        <View style={[styles.toolPodiumDisc, { backgroundColor: isDark ? 'rgba(255, 248, 235, 0.12)' : '#FFFDF9' }]}>
                          <ShootPrepVector size={34} />
                        </View>
                      </LinearGradient>
                    </View>

                    <Text style={[styles.toolTitle, { color: colors.text.primary }]} numberOfLines={1}>
                      Shoot Prep
                    </Text>
                    <Text style={[styles.toolSub, { color: colors.text.muted }]} numberOfLines={1}>
                      Wardrobe & Tips
                    </Text>
                  </GlassCard>
                </View>
              </View>
            </TouchableOpacity>

            {/* Tool 3: Studio Bay */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowStudio(true)}
              style={styles.toolCol}
            >
              <View style={styles.card3DShadowShell}>
                <View style={[styles.card3DThicknessBase, { backgroundColor: isDark ? '#2E241B' : '#C8B99F' }]}>
                  <GlassCard highlight style={styles.tool3DCard}>
                    <LinearGradient
                      colors={
                        isDark
                          ? ['rgba(212, 175, 55, 0.14)', 'rgba(28, 22, 17, 0.88)', 'rgba(12, 10, 8, 0.98)']
                          : ['rgba(212, 175, 55, 0.18)', 'rgba(255, 255, 255, 0.95)', 'rgba(244, 239, 230, 0.98)']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />

                    <View style={styles.toolPodium3DWrapper}>
                      <LinearGradient
                        colors={['#FFE7A3', '#D4AF37', '#7A5208', '#F5D77F']}
                        start={{ x: 0.1, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={styles.toolPodiumRing}
                      >
                        <View style={[styles.toolPodiumDisc, { backgroundColor: isDark ? 'rgba(255, 248, 235, 0.12)' : '#FFFDF9' }]}>
                          <StudioBayVector size={34} />
                        </View>
                      </LinearGradient>
                    </View>

                    <Text style={[styles.toolTitle, { color: colors.text.primary }]} numberOfLines={1}>
                      Studio Bay
                    </Text>
                    <Text style={[styles.toolSub, { color: colors.text.muted }]} numberOfLines={1}>
                      Hours & Location
                    </Text>
                  </GlassCard>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Active Studio Pass Dossier Preview (If exists - 3D Architecture) ── */}
        {recentBooking && (
          <View style={styles.recentPassSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeaderTitle, { color: colors.gold.DEFAULT }]}>ACTIVE SESSION DOSSIER</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
                <Text style={[styles.viewAllText, { color: colors.gold.light }]}>View All ({savedBookings.length})</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => navigation.navigate('Bookings')}
            >
              <View style={styles.card3DShadowShell}>
                <View style={[styles.card3DThicknessBase, { backgroundColor: isDark ? '#2E241B' : '#C8B99F' }]}>
                  <GlassCard glow highlight style={styles.activeDossier3DCard}>
                    <LinearGradient
                      colors={gradients.gold}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.dossierSpine}
                    />
                    <View style={styles.dossierContent}>
                      <View style={styles.dossierTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dossierNum, { color: colors.gold.DEFAULT }]}>
                            Pass #{recentBooking.bookingNumber || '—'}
                          </Text>
                          {recentBooking.clientName && (
                            <Text style={[styles.dossierClient, { color: colors.text.primary }]}>{recentBooking.clientName}</Text>
                          )}
                          {recentBooking.serviceName && (
                            <Text style={[styles.dossierService, { color: colors.text.secondary }]}>{recentBooking.serviceName}</Text>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <StatusBadge status={recentBooking.status} size="sm" />
                          {recentBooking.sessionDate && (
                            <View style={styles.dateBadge}>
                              <Calendar size={11} color={colors.text.muted} />
                              <Text style={[styles.dateBadgeText, { color: colors.text.muted }]}>
                                {new Date(recentBooking.sessionDate).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric',
                                })}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={[styles.dossierDivider, { backgroundColor: colors.gold.border }]} />

                      {/* Kodak Fox Active Session Companion */}
                      <View style={styles.dossierMascotRow}>
                        <StudioMascotKit pose={mobileMascotPose} size={46} interactive={true} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.dossierMascotTitle, { color: colors.gold.DEFAULT }]}>
                              KODAK · STUDIO GUIDE
                            </Text>
                            <View style={[styles.mascotStatusPill, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
                              <Text style={[styles.mascotStatusText, { color: colors.gold.light }]}>
                                {mobileMascotPose.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.dossierMascotText, { color: colors.text.secondary }]}>
                            {mobileMascotPose === 'shoot' && 'Atelier camera is primed! Live shoot in flight.'}
                            {mobileMascotPose === 'inspect' && 'Curating film negatives & proof sheet.'}
                            {mobileMascotPose === 'celebrate' && 'Session deliverables ready to cherish!'}
                            {mobileMascotPose === 'welcome' && 'Pass confirmed! Awaiting camera bay entry.'}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.dossierDivider, { backgroundColor: colors.gold.border }]} />

                      <View style={styles.dossierFooter}>
                        <Text style={[styles.dossierPrompt, { color: colors.text.muted }]}>Tap to view live studio progress</Text>
                        <View style={[styles.chevronPill, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
                          <ChevronRight size={13} color={colors.gold.light} />
                        </View>
                      </View>
                    </View>
                  </GlassCard>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Live Studio Showcase Collage Reel (Connected to Database) ── */}
        <StudioPhotoReel
          galleryItems={galleryItems}
          onPhotoLike={handlePhotoLikeUpdated}
        />

        {/* ── Studio Quote Footer ── */}
        <View style={styles.brandFooter}>
          <View style={styles.footerLine} />
          <Text style={styles.footerQuote}>
            "Every frame tells an everlasting story."
          </Text>
          <Text style={styles.footerCopyright}>
            E-KODAK PHOTOGRAPHY STUDIO · CEBU, PHILIPPINES
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Aesthetic In-App Visual Scan Instructions Modal */}
      <ScanInstructionsModal
        visible={showScanGuide}
        onClose={() => setShowScanGuide(false)}
        onOpenScanner={() => navigation.navigate('Scanner')}
      />

      {/* Studio Notifications & Activity Modal */}
      <Modal
        visible={showNotificationsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowNotificationsModal(false)}
          />
          <View style={styles.notifCardWrapper}>
            <GlassCard glow highlight style={styles.notifCard}>
              <View style={styles.notifHeader}>
                <View style={styles.notifTitleRow}>
                  <View style={[styles.notifIconWrap, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
                    <Bell size={18} color={colors.gold.light} />
                  </View>
                  <View>
                    <Text style={[styles.notifTitle, { color: colors.text.primary }]}>Studio Alerts</Text>
                    <Text style={[styles.notifSub, { color: colors.text.muted }]}>Real-time atelier updates</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowNotificationsModal(false)}
                  style={[styles.notifCloseBtn, { backgroundColor: colors.bg.elevated }]}
                  activeOpacity={0.7}
                >
                  <X size={16} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.notifList}>
                <View style={[styles.notifItem, { borderBottomColor: colors.gold.border }]}>
                  <View style={[styles.notifDot, { backgroundColor: colors.status.ready }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifItemTitle, { color: colors.text.primary }]}>Live Shoot Milestones Active</Text>
                    <Text style={[styles.notifItemDesc, { color: colors.text.secondary }]}>
                      Your booked photography sessions sync in real time from our studio floor.
                    </Text>
                    <Text style={[styles.notifItemTime, { color: colors.gold.light }]}>Studio Live Feed · Connected</Text>
                  </View>
                </View>

                <View style={styles.notifItem}>
                  <View style={[styles.notifDot, { backgroundColor: colors.gold.DEFAULT }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifItemTitle, { color: colors.text.primary }]}>Editorial Portfolio Updated</Text>
                    <Text style={[styles.notifItemDesc, { color: colors.text.secondary }]}>
                      Fresh color-graded proofs and portrait sets have been added to the live gallery reel.
                    </Text>
                    <Text style={[styles.notifItemTime, { color: colors.gold.light }]}>Atelier Reel · Just now</Text>
                  </View>
                </View>
              </View>

              <GoldButton
                size="sm"
                onPress={() => setShowNotificationsModal(false)}
                style={{ marginTop: Spacing[4] }}
              >
                Dismiss Alerts
              </GoldButton>
            </GlassCard>
          </View>
        </View>
      </Modal>

      {/* Interactive Tool Modals */}
      <RatesModal visible={showRates} onClose={() => setShowRates(false)} />
      <PrepModal visible={showPrep} onClose={() => setShowPrep(false)} />
      <StudioBayModal visible={showStudio} onClose={() => setShowStudio(false)} />
    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },
  content: { paddingBottom: 20 },

  // Top Header Bar
  topHeaderBar: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.bg.base,
    paddingTop: Platform.OS === 'ios' ? 48 : 38,
    paddingBottom: 22,
    paddingHorizontal: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.gold.border,
  },
  headerBottomHairline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1.5,
    zIndex: 1,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 2,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    position: 'relative',
  },
  unreadBadgeDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4AF37',
    borderWidth: 1.5,
    borderColor: '#1A1714',
  },

  // Modal styles for Notifications
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 4, 3, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
  },
  notifCardWrapper: {
    width: '100%',
    maxWidth: 400,
  },
  notifCard: {
    padding: Spacing[5],
    borderRadius: Radius.xl,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[4],
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifIconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
  },
  notifSub: {
    fontFamily: Typography.fontBody,
    fontSize: 10,
    marginTop: 1,
  },
  notifCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifList: {
    gap: 12,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(212, 168, 83, 0.15)',
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  notifItemTitle: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.xs,
    marginBottom: 2,
  },
  notifItemDesc: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 3,
  },
  notifItemTime: {
    fontFamily: Typography.fontMono,
    fontSize: 9,
    letterSpacing: 0.4,
  },

  // Compact Studio Pass Cards (3D Refined Physical Aesthetic)
  compactCardsSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    gap: Spacing[3],
  },

  // 3D Card Foundation Shared Styles
  card3DShadowShell: {
    width: '100%',
    borderRadius: Radius.lg + 2, // 22
    shadowColor: isDark ? '#000000' : '#8A7355',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.65 : 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  card3DThicknessBase: {
    width: '100%',
    borderRadius: Radius.lg + 2, // 22
    paddingBottom: 4, // creates physical 3D card bottom thickness extrusion
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(212, 175, 55, 0.22)' : 'rgba(180, 140, 80, 0.35)',
    borderBottomWidth: 3,
    borderBottomColor: isDark ? '#3D2D1E' : '#8A7355',
  },

  // Card 1: Activate Your Studio Pass (Full Width, 3D Physical Card)
  activateCardWrapper: {
    width: '100%',
  },
  activate3DCard: {
    borderRadius: Radius.lg, // 20
    paddingVertical: Spacing[4], // 16px
    paddingHorizontal: Spacing[5], // 20px
    minHeight: 140,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(212, 175, 55, 0.30)' : 'rgba(212, 175, 55, 0.40)',
    borderTopWidth: 1.5,
    borderTopColor: isDark ? 'rgba(255, 235, 175, 0.65)' : 'rgba(255, 255, 255, 0.95)', // Specular top chamfer highlight
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(60, 45, 30, 0.45)' : 'rgba(120, 90, 50, 0.3)',
  },
  activateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3] + 4, // 16px
    zIndex: 2,
  },
  podium3DWrapper: {
    width: 82,
    height: 82,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: isDark ? '#3D2D1E' : '#8A7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  podiumBeveledRing: {
    width: 82,
    height: 82,
    borderRadius: 24,
    padding: 2.2,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(90, 65, 25, 0.25)',
  },
  podiumCoreDisc: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(212, 175, 55, 0.20)',
    overflow: 'hidden',
  },
  activateInfoCol: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  activateTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: 16,
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  activateDesc: {
    fontFamily: Typography.fontBody,
    fontSize: 11.5,
    lineHeight: 16,
  },
  quickGuidePill3D: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: Radius.full,
    shadowColor: isDark ? '#000000' : '#8A7355',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
    borderBottomWidth: 2,
    borderBottomColor: isDark ? '#5C3E00' : '#856404',
  },
  quickGuidePillGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: Radius.full,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.45)',
  },
  quickGuidePillText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 10.5,
    letterSpacing: 0.3,
  },

  // Cards 2 & 3: Side-by-Side Symmetrical Row
  sideBySideRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing[3],
    width: '100%',
  },
  sideCardCol: {
    flex: 1,
  },
  sideCompactCard3D: {
    flex: 1,
    borderRadius: Radius.lg, // 20
    paddingVertical: 14,
    paddingHorizontal: 10,
    height: 226, // Exact unified height for symmetrical justified alignment
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(212, 175, 55, 0.30)' : 'rgba(212, 175, 55, 0.40)',
    borderTopWidth: 1.5,
    borderTopColor: isDark ? 'rgba(255, 235, 175, 0.65)' : 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(120, 90, 50, 0.3)',
  },
  podium3DCircleWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 2,
    marginTop: 2,
  },
  podiumCircleRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 2.2,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.45)',
  },
  podiumCircleDisc: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(212, 175, 55, 0.20)',
    overflow: 'hidden',
  },
  sideCardTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 18,
    marginTop: 4,
    zIndex: 2,
  },
  sideCardDesc: {
    fontFamily: Typography.fontBody,
    fontSize: 10.5,
    lineHeight: 14.5,
    textAlign: 'center',
    paddingHorizontal: 4,
    zIndex: 2,
    minHeight: 29, // Reserved for 2 lines so both buttons are strictly aligned
  },
  sideActionBtn3D: {
    width: '100%',
    borderRadius: Radius.lg,
    shadowColor: isDark ? '#000000' : '#8A7355',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
    borderBottomWidth: 2,
    borderBottomColor: isDark ? '#5C3E00' : '#856404',
    zIndex: 2,
  },
  sideActionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: Radius.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.45)',
  },
  sideActionText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 11.5,
    letterSpacing: 0.4,
  },

  // 3 Tools Section (3D Physical Architecture)
  toolsSection: {
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[5],
  },
  sectionHeaderTitle: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.gold.light,
    marginBottom: Spacing[2],
  },
  threeToolsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing[2] + 2, // 10px
    width: '100%',
  },
  toolCol: {
    flex: 1,
  },
  tool3DCard: {
    flex: 1,
    borderRadius: Radius.lg - 2, // 18px
    paddingVertical: 12,
    paddingHorizontal: 4,
    height: 142, // exact unified height across all 3 tools
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(212, 175, 55, 0.28)' : 'rgba(212, 175, 55, 0.38)',
    borderTopWidth: 1.5,
    borderTopColor: isDark ? 'rgba(255, 235, 175, 0.65)' : 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(120, 90, 50, 0.3)',
  },
  toolPodium3DWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 2,
    marginTop: 2,
  },
  toolPodiumRing: {
    width: 52,
    height: 52,
    borderRadius: 16,
    padding: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1.8,
    borderBottomColor: 'rgba(0, 0, 0, 0.45)',
  },
  toolPodiumDisc: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(212, 175, 55, 0.20)',
    overflow: 'hidden',
  },
  toolTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: 12,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 2,
    zIndex: 2,
  },
  toolSub: {
    fontFamily: Typography.fontBody,
    fontSize: 9.5,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: 2,
    zIndex: 2,
  },

  // Active Pass Dossier
  recentPassSection: {
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[5],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2],
  },
  viewAllText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs,
    color: colors.gold.light,
  },
  activeDossier3DCard: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    padding: 0,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(212, 175, 55, 0.30)' : 'rgba(212, 175, 55, 0.40)',
    borderTopWidth: 1.5,
    borderTopColor: isDark ? 'rgba(255, 235, 175, 0.65)' : 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(120, 90, 50, 0.3)',
  },
  dossierSpine: {
    width: 4,
  },
  dossierContent: {
    flex: 1,
    padding: Spacing[4],
  },
  dossierTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dossierNum: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    color: colors.gold.light,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  dossierClient: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.md,
    color: colors.text.primary,
  },
  dossierService: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.muted,
    marginTop: 1,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.elevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  dateBadgeText: {
    fontFamily: Typography.fontBody,
    fontSize: 10,
    color: colors.text.secondary,
  },
  dossierDivider: {
    height: 1,
    backgroundColor: colors.neutral[800],
    marginVertical: Spacing[3],
  },
  dossierMascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[1],
  },
  dossierMascotTitle: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  mascotStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  mascotStatusText: {
    fontFamily: Typography.fontMono,
    fontSize: 8,
    fontWeight: '700',
  },
  dossierMascotText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    lineHeight: 16,
    marginTop: 2,
  },
  dossierFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dossierPrompt: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.muted,
  },
  chevronPill: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: colors.gold.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer
  brandFooter: {
    paddingHorizontal: Spacing[6],
    alignItems: 'center',
    marginTop: Spacing[7],
  },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: colors.gold.border,
    marginBottom: Spacing[4],
  },
  footerQuote: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: Typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  footerCopyright: {
    fontFamily: Typography.fontBody,
    fontSize: 9,
    color: colors.text.muted,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
