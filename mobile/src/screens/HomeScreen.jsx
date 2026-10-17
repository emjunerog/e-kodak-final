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
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  QrCode, BookOpen, ChevronRight,
  HelpCircle, Calendar, Bell, X,
  Ticket, Wallet, Shirt, MapPin,
} from 'lucide-react-native';

import BrandLogo from '../components/BrandLogo';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import StatusBadge from '../components/StatusBadge';
import GoldButton from '../components/GoldButton';
import PremiumIcon from '../components/PremiumIcon';
import MascotStage from '../components/MascotStage';
import StudioPhotoReel from '../components/StudioPhotoReel';
import ScanInstructionsModal from '../components/ScanInstructionsModal';
import StudioMascotKit from '../components/StudioMascotKit';
import { RatesModal, PrepModal, StudioBayModal } from '../components/StudioToolModals';
import {
  ScanPassVector,
  MyPassesVector,
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

      {/* Ambient Glass Backdrop */}
      <GlassBackground />

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
          {/* Frosted header wash */}
          <LinearGradient
            colors={
              isDark
                ? ['rgba(28, 23, 18, 0.72)', 'rgba(14, 12, 9, 0.78)']
                : ['rgba(255, 255, 255, 0.72)', 'rgba(247, 244, 238, 0.68)']
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

            {/* Top Right Quick Action Icons */}
            <View style={styles.topRightActions}>
              <PremiumIcon
                icon={HelpCircle}
                size={20}
                box={44}
                tone="glass"
                glow={false}
                accessibilityLabel="Quick Guide"
                onPress={() => setShowScanGuide(true)}
              />

              <View style={{ position: 'relative' }}>
                <PremiumIcon
                  icon={Bell}
                  size={20}
                  box={44}
                  tone="glass"
                  glow={false}
                  accessibilityLabel="Studio Notifications"
                  onPress={() => setShowNotificationsModal(true)}
                />
                <View style={styles.unreadBadgeDot} pointerEvents="none" />
              </View>
            </View>
          </View>
        </View>

        {/* ── Mascot Initialization Stage — Kodak the Fox centerpiece ── */}
        <MascotStage
          pose={mobileMascotPose}
          mascotSize={120}
          actionLabel={recentBooking ? 'View Live Progress' : 'Scan Studio Pass'}
          onAction={() => {
            try { Haptics.selectionAsync(); } catch {}
            if (recentBooking) {
              navigation.navigate('Bookings');
            } else {
              navigation.navigate('Scanner');
            }
          }}
        />

        {/* ── Studio Pass Services ── */}
        <View style={styles.compactCardsSection}>
          <Text style={[styles.sectionHeaderTitle, { color: colors.gold.DEFAULT, marginBottom: Spacing[1] }]}>
            STUDIO PASS SERVICES
          </Text>

          {/* Card 1: Activate Your Studio Pass */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              try { Haptics.selectionAsync(); } catch {}
              setShowScanGuide(true);
            }}
            style={styles.activateCardWrapper}
          >
            <GlassCard glow highlight style={styles.activateCard}>
              <View style={styles.activateRow}>
                <PremiumIcon icon={Ticket} size={30} box={68} tone="gold" glow />

                <View style={styles.activateInfoCol}>
                  <Text style={[styles.activateTitle, { color: colors.text.primary }]}>
                    Activate Your Studio Pass
                  </Text>
                  <Text style={[styles.activateDesc, { color: colors.text.secondary }]} numberOfLines={2}>
                    Link your physical receipt or web reservation to unlock live shoot progress and milestones.
                  </Text>

                  {/* Quick Guide Pill */}
                  <View style={styles.quickGuidePill}>
                    <LinearGradient
                      colors={gradients.gold}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.quickGuidePillGrad}
                    >
                      <HelpCircle size={12} color="#FFFFFF" strokeWidth={2.2} />
                      <Text style={[styles.quickGuidePillText, { color: '#FFFFFF' }]}>
                        Quick Guide
                      </Text>
                      <ChevronRight size={12} color="#FFFFFF" strokeWidth={2.4} />
                    </LinearGradient>
                  </View>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* Cards 2 & 3: Scan Studio Pass & My Studio Passes */}
          <View style={styles.sideBySideRow}>
            {/* Left: Scan Studio Pass */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => navigation.navigate('Scanner')}
              style={styles.sideCardCol}
            >
              <GlassCard glow highlight style={styles.sideCompactCard}>
                <View style={styles.podiumCircleWrapper}>
                  <LinearGradient
                    colors={['#FFE7A3', '#D4AF37', '#7A5208', '#F5D77F']}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={styles.podiumCircleRing}
                  >
                    <View style={[styles.podiumCircleDisc, { backgroundColor: isDark ? 'rgba(255, 248, 235, 0.12)' : '#FFFDF9' }]}>
                      <ScanPassVector size={58} />
                    </View>
                  </LinearGradient>
                </View>

                <Text style={[styles.sideCardTitle, { color: colors.text.primary }]}>
                  Scan Studio Pass
                </Text>
                <Text style={[styles.sideCardDesc, { color: colors.text.muted }]} numberOfLines={2}>
                  Point camera at any receipt or QR pass.
                </Text>

                <View style={styles.sideActionBtn}>
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
            </TouchableOpacity>

            {/* Right: My Studio Passes */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => navigation.navigate('Bookings')}
              style={styles.sideCardCol}
            >
              <GlassCard highlight style={styles.sideCompactCard}>
                <View style={styles.podiumCircleWrapper}>
                  <LinearGradient
                    colors={['#FFE7A3', '#D4AF37', '#7A5208', '#F5D77F']}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={styles.podiumCircleRing}
                  >
                    <View style={[styles.podiumCircleDisc, { backgroundColor: isDark ? 'rgba(255, 248, 235, 0.12)' : '#FFFDF9' }]}>
                      <MyPassesVector size={58} />
                    </View>
                  </LinearGradient>
                </View>

                <Text style={[styles.sideCardTitle, { color: colors.text.primary }]}>
                  My Studio Passes
                </Text>
                <Text style={[styles.sideCardDesc, { color: colors.text.muted }]} numberOfLines={2}>
                  Review active photo passes & proofs.
                </Text>

                <View style={styles.sideActionBtn}>
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
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Three Functional Studio Tool Cards ── */}
        <View style={styles.toolsSection}>
          <Text style={[styles.sectionHeaderTitle, { color: colors.gold.DEFAULT }]}>STUDIO TOOLS & GUIDES</Text>
          <View style={styles.threeToolsRow}>
            {/* Tool 1: Rates & Packages */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowRates(true)}
              style={styles.toolCol}
            >
              <GlassCard highlight style={styles.toolCard}>
                <PremiumIcon icon={Wallet} size={22} box={52} tone="soft" glow />
                <Text style={[styles.toolTitle, { color: colors.text.primary }]} numberOfLines={1}>
                  Studio Rates
                </Text>
                <Text style={[styles.toolSub, { color: colors.text.muted }]} numberOfLines={1}>
                  Packages & Sets
                </Text>
              </GlassCard>
            </TouchableOpacity>

            {/* Tool 2: Shoot Prep */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowPrep(true)}
              style={styles.toolCol}
            >
              <GlassCard highlight style={styles.toolCard}>
                <PremiumIcon icon={Shirt} size={22} box={52} tone="soft" glow />
                <Text style={[styles.toolTitle, { color: colors.text.primary }]} numberOfLines={1}>
                  Shoot Prep
                </Text>
                <Text style={[styles.toolSub, { color: colors.text.muted }]} numberOfLines={1}>
                  Wardrobe & Tips
                </Text>
              </GlassCard>
            </TouchableOpacity>

            {/* Tool 3: Studio Bay */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowStudio(true)}
              style={styles.toolCol}
            >
              <GlassCard highlight style={styles.toolCard}>
                <PremiumIcon icon={MapPin} size={22} box={52} tone="soft" glow />
                <Text style={[styles.toolTitle, { color: colors.text.primary }]} numberOfLines={1}>
                  Studio Bay
                </Text>
                <Text style={[styles.toolSub, { color: colors.text.muted }]} numberOfLines={1}>
                  Hours & Location
                </Text>
              </GlassCard>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Active Studio Pass Dossier Preview ── */}
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
              <GlassCard glow highlight style={styles.activeDossierCard}>
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
                    <PremiumIcon icon={ChevronRight} size={14} box={30} tone="gold" glow />
                  </View>
                </View>
              </GlassCard>
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
          <BlurView intensity={isDark ? 60 : 40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowNotificationsModal(false)}
          />
          <View style={styles.notifCardWrapper}>
            <GlassCard glow highlight style={styles.notifCard}>
              <View style={styles.notifHeader}>
                <View style={styles.notifTitleRow}>
                  <PremiumIcon icon={Bell} size={18} box={40} tone="soft" glow />
                  <View>
                    <Text style={[styles.notifTitle, { color: colors.text.primary }]}>Studio Alerts</Text>
                    <Text style={[styles.notifSub, { color: colors.text.muted }]}>Real-time atelier updates</Text>
                  </View>
                </View>
                <PremiumIcon
                  icon={X}
                  size={15}
                  box={32}
                  tone="glass"
                  accessibilityLabel="Dismiss alerts"
                  onPress={() => setShowNotificationsModal(false)}
                />
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
    backgroundColor: 'transparent',
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
    backgroundColor: 'rgba(5, 4, 3, 0.5)',
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

  // Compact Studio Pass Cards
  compactCardsSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    gap: Spacing[3],
  },

  // Card 1: Activate Your Studio Pass
  activateCardWrapper: {
    width: '100%',
  },
  activateCard: {
    borderRadius: Radius['2xl'],
    paddingVertical: Spacing[4] + 2,
    paddingHorizontal: Spacing[5],
    minHeight: 124,
    justifyContent: 'center',
    position: 'relative',
  },
  activateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  activateInfoCol: {
    flex: 1,
    gap: 4,
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
  quickGuidePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: Radius.full,
  },
  quickGuidePillGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.full,
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
  sideCompactCard: {
    flex: 1,
    borderRadius: Radius['2xl'],
    paddingVertical: 18,
    paddingHorizontal: 12,
    height: 236,
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  podiumCircleWrapper: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  podiumCircleRing: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumCircleDisc: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.xl - 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sideCardTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 18,
    marginTop: 4,
  },
  sideCardDesc: {
    fontFamily: Typography.fontBody,
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: 4,
    minHeight: 30,
  },
  sideActionBtn: {
    width: '100%',
    borderRadius: Radius.full,
  },
  sideActionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: Radius.full,
  },
  sideActionText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 11.5,
    letterSpacing: 0.4,
  },

  // 3 Tools Section
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
    gap: Spacing[2] + 2,
    width: '100%',
  },
  toolCol: {
    flex: 1,
  },
  toolCard: {
    flex: 1,
    borderRadius: Radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 6,
    height: 140,
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  toolTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: 12,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 2,
  },
  toolSub: {
    fontFamily: Typography.fontBody,
    fontSize: 9.5,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: 2,
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
  activeDossierCard: {
    flexDirection: 'row',
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    padding: 0,
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
