import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  HelpCircle,
  Bell,
  ScanQrCode,
  CalendarCheck,
  Tags,
  ClipboardCheck,
  MapPin,
  ChevronRight,
  X,
} from 'lucide-react-native';

import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import GoldButton from '../components/GoldButton';
import PremiumIcon from '../components/PremiumIcon';
import ScanInstructionsModal from '../components/ScanInstructionsModal';
import StudioMascotKit from '../components/StudioMascotKit';
import CardDecorElements from '../components/CardDecorElements';
import StudioShapeLoader from '../components/StudioShapeLoader';
import { RatesModal, PrepModal, StudioBayModal } from '../components/StudioToolModals';
import {
  getSavedBookings,
  fetchStudioServices,
} from '../services/storageService';
import { useTheme } from '../context/ThemeContext';
import { useRegisterTourTarget } from '../context/TourContext';
import { Typography } from '../theme';

const E_KODAK_LOGO = require('../../assets/ekodak-logo.png');

export default function HomeScreen({ navigation }) {
  const { isDark, isSage, colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors, isDark, isSage), [colors, isDark, isSage]);
  const guideBtnRef = useRegisterTourTarget('customer_btn_guide');
  const alertsBtnRef = useRegisterTourTarget('customer_btn_notifications');
  const heroCtaRef = useRegisterTourTarget('customer_btn_hero_cta');

  const [savedBookings, setSavedBookings] = useState([]);
  const [studioServices, setStudioServices] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratesCategory, setRatesCategory] = useState('all');

  // Modals state
  const [showScanGuide, setShowScanGuide] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const [showStudio, setShowStudio] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [bookings, services] = await Promise.all([
        getSavedBookings(),
        fetchStudioServices(),
      ]);
      setSavedBookings(bookings);
      setStudioServices(services);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { }
    await loadData();
    setRefreshing(false);
  };

  const recentBooking = savedBookings[0];

  const openRatesForCategory = useCallback((category = 'all') => {
    try {
      Haptics.selectionAsync();
    } catch { }
    setRatesCategory(category);
    setShowRates(true);
  }, []);

  const mobileMascotPose = useMemo(() => {
    if (!recentBooking) return 'welcome';
    const st = (recentBooking.status || '').toUpperCase();
    if (st === 'IN_PROGRESS' || st === 'CAPTURE' || st === 'ONGOING') return 'shoot';
    if (st === 'EDITING' || st === 'RETOUCHING' || st === 'FINALIZED' || st === 'PRINTING') return 'inspect';
    if (st === 'READY' || st === 'UNDER_DELIVERY' || st === 'COMPLETED') return 'celebrate';
    return 'welcome';
  }, [recentBooking]);

  const openBookingTracker = useCallback(() => {
    try {
      Haptics.selectionAsync();
    } catch { }
    if (recentBooking) {
      navigation.navigate('BookingTracker', {
        token: recentBooking.token || recentBooking.bookingNumber,
        booking: {
          booking_number: recentBooking.bookingNumber,
          status: recentBooking.status,
        },
      });
    } else {
      navigation.navigate('Scanner');
    }
  }, [navigation, recentBooking]);

  const bookingsSubtitle = useMemo(() => {
    if (savedBookings.length === 0) {
      return '0 existing bookings';
    }
    return `${savedBookings.length} ${savedBookings.length === 1 ? 'existing booking' : 'existing bookings'}`;
  }, [savedBookings.length]);

  const goldPillColors = gradients.goldPill || gradients.gold;
  const cardGradientColors =
    gradients.glassCard ||
    gradients.card ||
    (isDark ? ['rgba(36, 32, 42, 0.78)', 'rgba(21, 27, 36, 0.86)'] : ['rgba(255, 253, 250, 0.84)', 'rgba(237, 243, 250, 0.78)']);
  const headerGradientColors =
    gradients.header ||
    (isDark
      ? ['#242029', '#151B24']
      : ['rgba(255, 253, 250, 0.94)', 'rgba(241, 246, 252, 0.90)']);
  const accentIconColor = isSage ? colors.gold.DEFAULT : '#B88622';
  const onPrimaryColor = isSage ? '#FFFFFF' : '#181410';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.base }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg.base}
      />
      <GlassBackground />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16) + 8 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold.DEFAULT}
          />
        }
      >
        {/* Top Floating Glass-Pill Header */}
        <View style={styles.headerPillShadow}>
          <View style={styles.headerPillFrame}>
            <LinearGradient
              colors={headerGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255, 255, 255, 0.14)', 'transparent']
                  : ['rgba(255, 255, 255, 0.96)', 'transparent']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.headerSpecular}
              pointerEvents="none"
            />

            <View style={styles.headerRow}>
              <View style={styles.brandRow}>
                <Image
                  source={E_KODAK_LOGO}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.brandWordmark}>E-KODAK</Text>
                  <Text style={styles.brandTagline}>Studio Companion</Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  ref={guideBtnRef}
                  collapsable={false}
                  activeOpacity={0.8}
                  onPress={() => setShowScanGuide(true)}
                  style={styles.headerIconBtn}
                  accessibilityLabel="Scan guide"
                >
                  <HelpCircle
                    size={19}
                    color={isDark ? colors.text.primary : '#241D14'}
                    strokeWidth={1.85}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  ref={alertsBtnRef}
                  collapsable={false}
                  activeOpacity={0.8}
                  onPress={() => setShowNotificationsModal(true)}
                  style={styles.headerIconBtn}
                  accessibilityLabel="Studio notifications"
                >
                  <Bell
                    size={19}
                    color={isDark ? colors.text.primary : '#241D14'}
                    strokeWidth={1.85}
                  />
                  <View style={styles.notifBadgeDot} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Pure-shapes load / reload indicator (zero text) */}
        {(initialLoading || refreshing) && (
          <View style={styles.shapeLoaderBar}>
            <StudioShapeLoader size={38} isDark={isDark} />
          </View>
        )}

        {/* Hero Mascot Card */}
        <View style={styles.heroCardOuter}>
            <LinearGradient
              colors={cardGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCardGradient}
            >
              <View pointerEvents="none" style={styles.heroOrbsClip}>
                <CardDecorElements variant="hero" isDark={isDark} />
              </View>

            <View style={styles.heroLeft}>
              <Text style={styles.heroHeading}>
                {'Kodak is ready\nto guide you.'}
              </Text>
              <Text style={styles.heroBody}>
                Scan your booking QR to see your order status.
              </Text>

              <TouchableOpacity
                ref={heroCtaRef}
                collapsable={false}
                activeOpacity={0.88}
                onPress={openBookingTracker}
                style={styles.heroCtaWrap}
              >
                <LinearGradient
                  colors={goldPillColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.heroCtaGradient}
                >
                  <Text style={styles.heroCtaText}>Track Order →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.mascotBox}>
              <StudioMascotKit
                pose={mobileMascotPose}
                size={80}
                interactive={true}
                showBadge={false}
              />
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>

        <View style={styles.quickActionsGrid}>
          {/* Scan Booking QR */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('Scanner')}
            style={styles.quickActionCard}
          >
            <LinearGradient
              colors={cardGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickActionGradient}
            >
              <CardDecorElements variant="action-scan" isDark={isDark} />
              <LinearGradient
                colors={goldPillColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionBadgeGold}
              >
                <ScanQrCode size={19} color={onPrimaryColor} strokeWidth={1.9} />
              </LinearGradient>

              <Text style={styles.quickActionTitle}>Scan Booking QR</Text>
              <Text style={styles.quickActionSub}>
                Use the QR from your receipt or email.
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* My Bookings */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('Bookings')}
            style={styles.quickActionCard}
          >
            <LinearGradient
              colors={cardGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickActionGradient}
            >
              <CardDecorElements variant="action-bookings" isDark={isDark} />
              <View style={styles.actionBadgeDark}>
                <CalendarCheck size={19} color="#FAF5EA" strokeWidth={1.9} />
              </View>

              <Text style={styles.quickActionTitle}>My Bookings</Text>
              <Text style={styles.quickActionSub}>{bookingsSubtitle}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Studio Tool Cards (same Quick Actions card style, centered icons) */}
        <View style={styles.toolsCardsGrid}>
          {[
            {
              key: 'rates',
              title: 'Studio Rates',
              sub: 'Sets & prices',
              Icon: Tags,
              tone: 'gold',
              onPress: () => openRatesForCategory('all'),
            },
            {
              key: 'prep',
              title: 'Shoot Prep',
              sub: 'Photo day tips',
              Icon: ClipboardCheck,
              tone: 'soft',
              onPress: () => setShowPrep(true),
            },
            {
              key: 'bay',
              title: 'Studio Bay',
              sub: 'Hours & map',
              Icon: MapPin,
              tone: 'dark',
              onPress: () => setShowStudio(true),
            },
          ].map((tool) => {
            const ToolIcon = tool.Icon;
            return (
              <TouchableOpacity
                key={tool.key}
                activeOpacity={0.88}
                onPress={tool.onPress}
                style={styles.toolMiniCard}
              >
                <LinearGradient
                  colors={cardGradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.toolMiniGradient}
                >
                  <CardDecorElements variant="tool" isDark={isDark} />
                  {tool.tone === 'gold' ? (
                    <LinearGradient
                      colors={goldPillColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.toolMiniBadge}
                    >
                      <ToolIcon size={19} color={onPrimaryColor} strokeWidth={1.9} />
                    </LinearGradient>
                  ) : tool.tone === 'dark' ? (
                    <View style={styles.toolMiniBadgeDark}>
                      <ToolIcon size={19} color="#FAF5EA" strokeWidth={1.9} />
                    </View>
                  ) : (
                    <View style={styles.toolMiniBadgeSoft}>
                      <ToolIcon size={19} color={accentIconColor} strokeWidth={1.9} />
                    </View>
                  )}

                  <Text
                    style={styles.toolMiniTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {tool.title}
                  </Text>
                  <Text style={styles.toolMiniSub} numberOfLines={1}>
                    {tool.sub}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent Summary */}
        <Text style={styles.sectionLabel}>Recent</Text>

        {recentBooking ? (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={openBookingTracker}
            style={styles.recentCard}
          >
            <LinearGradient
              colors={cardGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.recentCardGradient}
            >
              <CardDecorElements variant="recent" isDark={isDark} />
              <View style={styles.recentTopRow}>
                <View style={styles.recentIconBox}>
                  <CalendarCheck size={18} color={accentIconColor} strokeWidth={1.9} />
                </View>
                <View style={styles.recentTopLeft}>
                  <Text numberOfLines={1} style={styles.recentOrderTitle}>
                    {recentBooking.serviceName || 'Studio Package'}
                  </Text>
                  <Text numberOfLines={1} style={styles.recentOrderMeta}>
                    {recentBooking.clientName || 'Studio Guest'}
                  </Text>
                </View>
                <ChevronRight
                  size={19}
                  color={isDark ? colors.text.muted : '#4B4338'}
                  strokeWidth={1.9}
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('Scanner')}
            style={styles.recentCard}
          >
            <LinearGradient
              colors={cardGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.recentCardGradient}
            >
              <CardDecorElements variant="recent" isDark={isDark} />
              <View style={styles.recentTopRow}>
                <View style={styles.recentIconBox}>
                  <ScanQrCode size={18} color={accentIconColor} strokeWidth={1.9} />
                </View>
                <View style={styles.recentTopLeft}>
                  <Text style={styles.recentOrderTitle}>No scanned order yet</Text>
                  <Text style={styles.recentOrderMeta}>
                    Scan your booking QR to view it here.
                  </Text>
                </View>
                <ChevronRight
                  size={19}
                  color={isDark ? colors.text.muted : '#4B4338'}
                  strokeWidth={1.9}
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* EXISTING STUDIO PACKAGES */}
        {studioServices.length > 0 && (
          <View style={styles.packagesSection}>
            <Text style={styles.sectionLabel}>Packages</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.packagesScroll}
            >
              {studioServices.map((svc) => {
                const tiers = Array.isArray(svc.tiers) ? svc.tiers : [];
                let lowestTier = null;
                let lowestVal = Infinity;
                for (const t of tiers) {
                  const num = Number(String(t?.price || '').replace(/[^0-9.]/g, ''));
                  if (num > 0 && num < lowestVal) {
                    lowestVal = num;
                    lowestTier = t;
                  }
                }
                const setCount = tiers.length;
                const priceSummary = lowestTier
                  ? `From ${lowestTier.price}${setCount > 0 ? ` • ${setCount} ${setCount === 1 ? 'set' : 'sets'}` : ''}`
                  : svc.tagline || 'View studio sets';

                return (
                  <TouchableOpacity
                    key={svc.id}
                    activeOpacity={0.88}
                    onPress={() => openRatesForCategory(svc.category || 'all')}
                    style={styles.packageCard}
                  >
                    <LinearGradient
                      colors={cardGradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.packageCardGradient}
                    >
                      <Image
                        source={{ uri: svc.cover_image }}
                        style={styles.packageImage}
                        resizeMode="cover"
                      />
                      <View style={styles.packageBody}>
                        <CardDecorElements variant="package" isDark={isDark} />
                        <Text numberOfLines={2} style={styles.packageTitle}>
                          {svc.name}
                        </Text>
                        <Text numberOfLines={1} style={styles.packageMeta}>
                          {priceSummary}
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 132 }} />
      </ScrollView>

      {/* Scan Instructions Modal */}
      <ScanInstructionsModal
        visible={showScanGuide}
        onClose={() => setShowScanGuide(false)}
      />

      {/* Studio Notifications & Activity Modal */}
      <Modal
        visible={showNotificationsModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowNotificationsModal(false)}
          />
          <View style={styles.notifCardWrapper}>
            <GlassCard opaque blurred={false} glow highlight style={styles.notifCard}>
              <View style={styles.notifHeader}>
                <View style={styles.notifTitleRow}>
                  <PremiumIcon icon={Bell} size={18} box={40} tone="soft" glow />
                  <View>
                    <Text style={[styles.notifTitle, { color: colors.text.primary }]}>
                      Studio Alerts
                    </Text>
                    <Text style={[styles.notifSub, { color: colors.text.muted }]}>
                      Real-time atelier updates
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setShowNotificationsModal(false)}
                  style={styles.notifCloseBtn}
                >
                  <X size={18} color={colors.text.muted} />
                </TouchableOpacity>
              </View>

              <View style={styles.notifList}>
                <View style={[styles.notifItem, { borderBottomColor: colors.gold.border }]}>
                  <View style={[styles.notifDot, { backgroundColor: colors.status.ready }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifItemTitle, { color: colors.text.primary }]}>
                      Live Shoot Milestones Active
                    </Text>
                    <Text style={[styles.notifItemDesc, { color: colors.text.secondary }]}>
                      Scan your booking pass to receive live updates for capture, editing, and pickup.
                    </Text>
                    <Text style={[styles.notifItemTime, { color: colors.gold.light }]}>
                      Studio Live Feed · Connected
                    </Text>
                  </View>
                </View>

                <View style={styles.notifItem}>
                  <View style={[styles.notifDot, { backgroundColor: colors.gold.DEFAULT }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifItemTitle, { color: colors.text.primary }]}>
                      Studio Packages Ready
                    </Text>
                    <Text style={[styles.notifItemDesc, { color: colors.text.secondary }]}>
                      View live package sets and crystal wood inclusions on your dashboard.
                    </Text>
                    <Text style={[styles.notifItemTime, { color: colors.gold.light }]}>
                      Studio Rates · Connected
                    </Text>
                  </View>
                </View>
              </View>

              <GoldButton
                onPress={() => setShowNotificationsModal(false)}
                variant="outline"
                style={{ width: '100%', marginTop: 8 }}
              >
                Close Alerts
              </GoldButton>
            </GlassCard>
          </View>
        </View>
      </Modal>

      {/* Studio Tool Modals */}
      <RatesModal
        visible={showRates}
        initialCategory={ratesCategory}
        onClose={() => setShowRates(false)}
      />
      <PrepModal visible={showPrep} onClose={() => setShowPrep(false)} />
      <StudioBayModal visible={showStudio} onClose={() => setShowStudio(false)} />
    </View>
  );
}

const getStyles = (colors, isDark, isSage) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
      zIndex: 1,
    },
    scrollContent: {
      paddingHorizontal: 18,
    },

    // Header
    headerPillShadow: {
      marginBottom: 16,
      borderRadius: 28,
      backgroundColor: 'transparent',
      shadowColor: isDark ? '#000000' : '#4E4332',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 18,
      elevation: 6,
    },
    headerPillFrame: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.20)' : 'rgba(255, 255, 255, 0.88)',
      paddingHorizontal: 16,
      paddingVertical: 12,
      overflow: 'hidden',
      position: 'relative',
    },
    headerSpecular: {
      position: 'absolute',
      top: 0,
      left: 24,
      right: 24,
      height: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 1,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    logoImage: {
      width: 38,
      height: 38,
      backgroundColor: 'transparent',
    },
    shapeLoaderBar: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 12,
    },
    brandWordmark: {
      fontFamily: Typography.fontHeading,
      fontSize: 19,
      lineHeight: 23,
      letterSpacing: 0.4,
      color: isDark ? colors.text.primary : '#181410',
      includeFontPadding: false,
    },
    brandTagline: {
      fontFamily: Typography.fontBody,
      fontSize: 12,
      lineHeight: 16,
      color: colors.text.secondary,
      marginTop: 1,
      includeFontPadding: false,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerIconBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(220, 221, 230, 0.85)',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      shadowColor: '#2E261B',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDark ? 0.2 : 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    notifBadgeDot: {
      position: 'absolute',
      top: 9,
      right: 10,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: '#E5484D',
      borderWidth: 1,
      borderColor: colors.bg.base,
    },

    // Hero Card
    heroCardOuter: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6',
      shadowColor: '#5B6472',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0 : 0.09,
      shadowRadius: 14,
      elevation: isDark ? 0 : 3,
    },
    heroCardGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 21,
      padding: 18,
      gap: 12,
      position: 'relative',
    },
    heroOrbsClip: {
      ...StyleSheet.absoluteFill,
      borderRadius: 21,
      overflow: 'hidden',
    },
    heroLeft: {
      flex: 1,
    },
    heroHeading: {
      fontFamily: Typography.fontHeading,
      fontSize: 23,
      lineHeight: 28,
      color: isDark ? colors.text.primary : '#181410',
    },
    heroBody: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 12.5,
      lineHeight: 18,
      color: isDark ? colors.text.secondary : '#5C5346',
      marginTop: 8,
    },
    heroCtaWrap: {
      marginTop: 14,
      alignSelf: 'flex-start',
      borderRadius: 999,
      overflow: 'hidden',
    },
    heroCtaGradient: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCtaText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 13,
      color: isSage ? '#FFFFFF' : '#181410',
    },
    mascotBox: {
      width: 108,
      height: 116,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255, 255, 255, 0.72)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.16)' : 'rgba(214, 219, 230, 0.80)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },

    // Section Header
    sectionLabel: {
      fontFamily: Typography.fontHeading,
      fontSize: 21,
      lineHeight: 26,
      letterSpacing: -0.25,
      color: isDark ? colors.text.primary : '#181410',
      marginTop: 22,
      marginBottom: 12,
    },

    // Quick Actions 2-column
    quickActionsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    quickActionCard: {
      flex: 1,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6',
      overflow: 'hidden',
      shadowColor: '#5B6472',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 10,
      elevation: isDark ? 0 : 2,
    },
    quickActionGradient: {
      flex: 1,
      padding: 16,
      borderRadius: 19,
      position: 'relative',
    },
    actionBadgeGold: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBadgeDark: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isSage ? '#1E241C' : '#1D1710',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 16.5,
      lineHeight: 21,
      color: isDark ? colors.text.primary : '#181410',
      marginTop: 14,
    },
    quickActionSub: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 12,
      lineHeight: 17,
      color: isDark ? colors.text.secondary : '#5C5346',
      marginTop: 4,
    },

    // Studio Tool Cards Grid
    toolsCardsGrid: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    toolMiniCard: {
      flex: 1,
      minHeight: 128,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6',
      overflow: 'hidden',
      shadowColor: '#5B6472',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 10,
      elevation: isDark ? 0 : 2,
    },
    toolMiniGradient: {
      flex: 1,
      paddingHorizontal: 10,
      paddingVertical: 16,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    toolMiniBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolMiniBadgeDark: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isSage ? '#1E241C' : '#1D1710',
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolMiniBadgeSoft: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(180, 198, 224, 0.14)' : 'rgba(255, 255, 255, 0.85)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.24)' : 'rgba(198, 206, 222, 0.70)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolMiniTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: isDark ? colors.text.primary : '#181410',
      textAlign: 'center',
      marginTop: 12,
    },
    toolMiniSub: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 11,
      lineHeight: 15,
      color: isDark ? colors.text.secondary : '#5C5346',
      textAlign: 'center',
      marginTop: 3,
    },

    // Recent Tracker Summary
    recentCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6',
      overflow: 'hidden',
      shadowColor: '#5B6472',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 10,
      elevation: isDark ? 0 : 2,
    },
    recentCardGradient: {
      padding: 16,
      borderRadius: 19,
      position: 'relative',
    },
    recentIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(180, 198, 224, 0.14)' : 'rgba(255, 255, 255, 0.85)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.24)' : 'rgba(198, 206, 222, 0.70)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    recentTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    recentTopLeft: {
      flex: 1,
    },
    recentOrderTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 16.5,
      color: isDark ? colors.text.primary : '#181410',
    },
    recentOrderMeta: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 12.5,
      color: isDark ? colors.text.secondary : '#5C5346',
      marginTop: 3,
    },

    // Existing Packages Section
    packagesSection: {
      marginTop: 2,
    },
    packagesScroll: {
      gap: 12,
      paddingRight: 8,
      paddingBottom: 6,
    },
    packageCard: {
      width: 220,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.20)' : '#DCDDE6',
      overflow: 'hidden',
      shadowColor: '#5B6472',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 10,
      elevation: isDark ? 0 : 2,
    },
    packageCardGradient: {
      borderRadius: 17,
      overflow: 'hidden',
    },
    packageImage: {
      width: '100%',
      height: 112,
      backgroundColor: '#E5EAF2',
    },
    packageBody: {
      paddingHorizontal: 14,
      paddingTop: 11,
      paddingBottom: 13,
      position: 'relative',
      overflow: 'hidden',
    },
    packageTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 16,
      lineHeight: 21,
      color: isDark ? colors.text.primary : '#181410',
    },
    packageMeta: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 12.5,
      color: isDark ? colors.gold.light : '#8A6314',
      marginTop: 6,
    },

    // Notifications Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(10, 8, 6, 0.72)',
      justifyContent: 'center',
      padding: 20,
    },
    notifCardWrapper: {
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
    },
    notifCard: {
      padding: 20,
      borderRadius: 24,
    },
    notifHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    notifTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    notifTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 17,
    },
    notifSub: {
      fontFamily: Typography.fontBody,
      fontSize: 12,
      marginTop: 2,
    },
    notifCloseBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surface?.chip || 'rgba(127, 127, 140, 0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifList: {
      gap: 12,
      marginBottom: 8,
    },
    notifItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(180, 140, 50, 0.2)',
    },
    notifDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 5,
    },
    notifItemTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 13.5,
    },
    notifItemDesc: {
      fontFamily: Typography.fontBody,
      fontSize: 12.5,
      lineHeight: 18,
      marginTop: 3,
    },
    notifItemTime: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 11,
      marginTop: 4,
    },
  });
