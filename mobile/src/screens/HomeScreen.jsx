/**
 * HomeScreen.jsx
 * Centered luxury customer dashboard for E-Kodak Photography Studio.
 * Features:
 * - Centered E-KODAK brandmark with animated aperture lens
 * - Studio tagline: "Track your photography journey from shoot to delivery"
 * - 2 Wide primary action cards (Scan Pass, Saved Passes)
 * - 3 Functional interactive tool cards (Studio Rates, Shoot Prep, Studio Bay)
 * - Dynamic swipable studio photo showcase (connected to Supabase gallery_items)
 * - Active VIP studio pass dossier (if booking saved)
 * - Customer onboarding suggestion banner
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, Image, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  QrCode, BookOpen, ChevronRight, Calendar,
  Sparkles, Shirt, MapPin, ArrowUpRight, Camera,
  Image as ImageIcon,
} from 'lucide-react-native';

import BrandLogo from '../components/BrandLogo';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import GoldButton from '../components/GoldButton';
import { RatesModal, PrepModal, StudioBayModal } from '../components/StudioToolModals';
import { getSavedBookings, fetchStudioGallery } from '../services/storageService';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';

const { width } = Dimensions.get('window');
const SHOWCASE_CARD_WIDTH = width * 0.72;

export default function HomeScreen({ navigation }) {
  const [savedBookings, setSavedBookings] = useState([]);
  const [galleryItems, setGalleryItems]   = useState([]);

  // Modals state
  const [showRates, setShowRates]     = useState(false);
  const [showPrep, setShowPrep]       = useState(false);
  const [showStudio, setShowStudio]   = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSavedBookings().then(setSavedBookings);
      fetchStudioGallery().then(setGalleryItems);
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
        {/* ── Centered Brand Hero Header ── */}
        <LinearGradient
          colors={Gradients.darkStudio}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.hero}
        >
          <LinearGradient
            colors={Gradients.ambientSpot}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.ambientLight}
          />
          <BrandLogo showTagline size="lg" />
        </LinearGradient>

        {/* ── Guided First-Scan Suggestion Banner (If No Active Passes) ── */}
        {!recentBooking && (
          <View style={styles.guidedBannerWrapper}>
            <GlassCard glow highlight style={styles.guidedBanner}>
              <View style={styles.guidedTop}>
                <View style={styles.guidedIconWrapper}>
                  <Camera size={20} color={Colors.gold.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guidedTitle}>Welcome to Your Studio Hub</Text>
                  <Text style={styles.guidedBody}>
                    Scan the QR code issued with your booking to link your session and track studio proofs live.
                  </Text>
                </View>
              </View>
              <GoldButton
                icon={QrCode}
                onPress={() => navigation.navigate('Scanner')}
                style={{ marginTop: Spacing[3] }}
                size="sm"
              >
                Scan Booking Pass Now
              </GoldButton>
            </GlassCard>
          </View>
        )}

        {/* ── Two Big, Wide Hero Action Cards ── */}
        <View style={styles.heroCardsSection}>
          {/* Big Card 1: Scan Pass */}
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => navigation.navigate('Scanner')}
            style={styles.wideCardWrapper}
          >
            <GlassCard glow highlight style={styles.wideHeroCard}>
              <View style={styles.wideCardLeft}>
                <View style={styles.wideIconContainer}>
                  <LinearGradient
                    colors={Gradients.gold}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.wideIconGrad}
                  >
                    <QrCode size={26} color={Colors.text.onGold} strokeWidth={1.75} />
                  </LinearGradient>
                </View>
                <View style={styles.wideTextGroup}>
                  <View style={styles.cardHeaderTag}>
                    <Text style={styles.tagText}>INSTANT SCANNER</Text>
                  </View>
                  <Text style={styles.wideCardTitle}>Scan Studio Pass</Text>
                  <Text style={styles.wideCardSub}>
                    Point your camera at the QR code on your receipt or web account.
                  </Text>
                </View>
              </View>
              <View style={styles.chevronCircle}>
                <ArrowUpRight size={18} color={Colors.gold.light} />
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* Big Card 2: My Tracked Passes */}
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => navigation.navigate('Bookings')}
            style={styles.wideCardWrapper}
          >
            <GlassCard highlight style={styles.wideHeroCard}>
              <View style={styles.wideCardLeft}>
                <View style={[styles.wideIconContainer, styles.passesIconContainer]}>
                  <BookOpen size={24} color={Colors.gold.light} strokeWidth={1.75} />
                </View>
                <View style={styles.wideTextGroup}>
                  <View style={styles.cardHeaderTag}>
                    <Text style={styles.tagText}>SAVED SESSIONS</Text>
                    {savedBookings.length > 0 && (
                      <View style={styles.countTag}>
                        <Text style={styles.countTagText}>{savedBookings.length} ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.wideCardTitle}>My Studio Passes</Text>
                  <Text style={styles.wideCardSub}>
                    Review your booked sessions, print delivery, and retouching timeline.
                  </Text>
                </View>
              </View>
              <View style={styles.chevronCircle}>
                <ChevronRight size={18} color={Colors.gold.light} />
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>

        {/* ── Three Functional Studio Tool Cards ── */}
        <View style={styles.toolsSection}>
          <Text style={styles.sectionHeaderTitle}>STUDIO TOOLS & GUIDES</Text>
          <View style={styles.threeToolsRow}>
            {/* Tool 1: Rates & Packages */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setShowRates(true)}
              style={styles.toolCol}
            >
              <GlassCard highlight style={styles.toolCard}>
                <View style={styles.toolIconWrap}>
                  <Sparkles size={18} color={Colors.gold.light} />
                </View>
                <Text style={styles.toolTitle}>Studio Rates</Text>
                <Text style={styles.toolSub}>Packages & Inclusions</Text>
              </GlassCard>
            </TouchableOpacity>

            {/* Tool 2: Shoot Prep */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setShowPrep(true)}
              style={styles.toolCol}
            >
              <GlassCard highlight style={styles.toolCard}>
                <View style={styles.toolIconWrap}>
                  <Shirt size={18} color={Colors.gold.light} />
                </View>
                <Text style={styles.toolTitle}>Shoot Prep</Text>
                <Text style={styles.toolSub}>Wardrobe & Tips</Text>
              </GlassCard>
            </TouchableOpacity>

            {/* Tool 3: Studio Bay */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setShowStudio(true)}
              style={styles.toolCol}
            >
              <GlassCard highlight style={styles.toolCard}>
                <View style={styles.toolIconWrap}>
                  <MapPin size={18} color={Colors.gold.light} />
                </View>
                <Text style={styles.toolTitle}>Studio Bay</Text>
                <Text style={styles.toolSub}>Hours & Location</Text>
              </GlassCard>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Active Studio Pass Dossier Preview (If exists) ── */}
        {recentBooking && (
          <View style={styles.recentPassSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>ACTIVE SESSION DOSSIER</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
                <Text style={styles.viewAllText}>View All ({savedBookings.length})</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Bookings')}
            >
              <GlassCard glow highlight style={styles.activeDossierCard}>
                <LinearGradient
                  colors={Gradients.gold}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.dossierSpine}
                />
                <View style={styles.dossierContent}>
                  <View style={styles.dossierTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dossierNum}>
                        Pass #{recentBooking.bookingNumber || '—'}
                      </Text>
                      {recentBooking.clientName && (
                        <Text style={styles.dossierClient}>{recentBooking.clientName}</Text>
                      )}
                      {recentBooking.serviceName && (
                        <Text style={styles.dossierService}>{recentBooking.serviceName}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <StatusBadge status={recentBooking.status} size="sm" />
                      {recentBooking.sessionDate && (
                        <View style={styles.dateBadge}>
                          <Calendar size={11} color={Colors.text.muted} />
                          <Text style={styles.dateBadgeText}>
                            {new Date(recentBooking.sessionDate).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric',
                            })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.dossierDivider} />

                  <View style={styles.dossierFooter}>
                    <Text style={styles.dossierPrompt}>Tap to view live studio progress</Text>
                    <View style={styles.chevronPill}>
                      <ChevronRight size={13} color={Colors.gold.light} />
                    </View>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Live Studio Showcase Carousel (Connected to Database) ── */}
        <View style={styles.showcaseSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ImageIcon size={14} color={Colors.gold.DEFAULT} />
              <Text style={styles.sectionHeaderTitle}>STUDIO PORTFOLIO REEL</Text>
            </View>
            <Text style={styles.liveSyncBadge}>LIVE FROM STUDIO</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.showcaseScroll}
          >
            {galleryItems.map((photo) => (
              <GlassCard key={photo.id} highlight style={styles.showcaseCard}>
                <Image
                  source={{ uri: photo.image_url }}
                  style={styles.showcaseImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(13, 11, 9, 0.92)']}
                  style={styles.showcaseVignette}
                />
                <View style={styles.showcaseInfo}>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryText}>{photo.category}</Text>
                  </View>
                  <Text style={styles.showcaseTitle} numberOfLines={1}>{photo.title}</Text>
                  {photo.description ? (
                    <Text style={styles.showcaseDesc} numberOfLines={2}>{photo.description}</Text>
                  ) : null}
                </View>
              </GlassCard>
            ))}
          </ScrollView>
        </View>

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

      {/* Interactive Tool Modals */}
      <RatesModal visible={showRates} onClose={() => setShowRates(false)} />
      <PrepModal visible={showPrep} onClose={() => setShowPrep(false)} />
      <StudioBayModal visible={showStudio} onClose={() => setShowStudio(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.base },
  content: { paddingBottom: 20 },

  // Centered Hero
  hero: {
    paddingTop: 54,
    paddingBottom: Spacing[7],
    paddingHorizontal: Spacing[6],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold.border,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientLight: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },

  // Guided First-Scan Banner
  guidedBannerWrapper: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },
  guidedBanner: {
    padding: Spacing[5],
  },
  guidedTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  guidedIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidedTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
    marginBottom: 3,
  },
  guidedBody: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },

  // Hero Cards Section
  heroCardsSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[5],
    gap: Spacing[3],
  },
  wideCardWrapper: {
    width: '100%',
  },
  wideHeroCard: {
    padding: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 96,
  },
  wideCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    flex: 1,
    paddingRight: Spacing[2],
  },
  wideIconContainer: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.goldSoft,
  },
  wideIconGrad: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passesIconContainer: {
    backgroundColor: Colors.bg.surface,
    borderWidth: 1,
    borderColor: Colors.gold.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideTextGroup: {
    flex: 1,
  },
  cardHeaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  tagText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9.5,
    color: Colors.gold.light,
    letterSpacing: 1.2,
  },
  countTag: {
    backgroundColor: Colors.gold.bg,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 0.5,
    borderColor: Colors.gold.borderLight,
  },
  countTagText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 8.5,
    color: Colors.gold.light,
  },
  wideCardTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  wideCardSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 3 Functional Tools Section
  toolsSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[5],
  },
  sectionHeaderTitle: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10.5,
    color: Colors.gold.light,
    letterSpacing: 1.5,
    marginBottom: Spacing[3],
  },
  threeToolsRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  toolCol: {
    flex: 1,
  },
  toolCard: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 106,
    gap: 4,
  },
  toolIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  toolTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.xs,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  toolSub: {
    fontFamily: Typography.fontBody,
    fontSize: 9.5,
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  // Active Dossier
  recentPassSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[6],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  viewAllText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs,
    color: Colors.gold.light,
  },
  activeDossierCard: {
    flexDirection: 'row',
    overflow: 'hidden',
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dossierNum: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: Colors.text.primary,
  },
  dossierClient: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  dossierService: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: Typography.size.xs,
    color: Colors.gold.light,
    marginTop: 1,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateBadgeText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
  },
  dossierDivider: {
    height: 1,
    backgroundColor: Colors.gold.border,
    marginVertical: Spacing[3],
  },
  dossierFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dossierPrompt: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs,
    color: Colors.gold.light,
  },
  chevronPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.gold.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Live Showcase Section
  showcaseSection: {
    paddingTop: Spacing[6],
  },
  liveSyncBadge: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    color: Colors.status.ready,
    letterSpacing: 1,
    paddingHorizontal: Spacing[4],
  },
  showcaseScroll: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[4],
  },
  showcaseCard: {
    width: SHOWCASE_CARD_WIDTH,
    height: 220,
    overflow: 'hidden',
    position: 'relative',
  },
  showcaseImage: {
    width: '100%',
    height: '100%',
  },
  showcaseVignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  showcaseInfo: {
    position: 'absolute',
    left: Spacing[4],
    right: Spacing[4],
    bottom: Spacing[3],
    gap: 3,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.borderLight,
    borderRadius: Radius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  categoryText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    color: Colors.gold.light,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  showcaseTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
  },
  showcaseDesc: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: Colors.text.secondary,
    lineHeight: 16,
  },

  // Footer
  brandFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[7],
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
