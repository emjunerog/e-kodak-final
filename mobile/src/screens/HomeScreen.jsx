import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
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
} from 'lucide-react-native';

import GlassBackground from '../components/GlassBackground';
import GuideChooserModal from '../components/GuideChooserModal';
import ScanInstructionsModal from '../components/ScanInstructionsModal';
import NotificationsModal from '../components/NotificationsModal';
import StudioMascotKit from '../components/StudioMascotKit';
import CardDecorElements from '../components/CardDecorElements';
import StudioShapeLoader from '../components/StudioShapeLoader';
import { RatesModal, PrepModal, StudioBayModal } from '../components/StudioToolModals';
import {
  getSavedBookings,
  fetchStudioServices,
} from '../services/storageService';
import { subscribeToBookingUpdates } from '../services/bookingService';
import {
  fetchCustomerNotificationsFeed,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotificationsList,
  announceNewNotificationsWithSound,
  playNotificationBellCue,
} from '../services/notificationService';
import { useTheme } from '../context/ThemeContext';
import { useRegisterTourTarget, useTour } from '../context/TourContext';
import { useResponsiveLayout } from '../utils/responsive';
import { Typography } from '../theme';

const E_KODAK_LOGO = require('../../assets/ekodak-logo.png');

export default function HomeScreen({ navigation }) {
  const { isDark, isSage, colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const tour = useTour();
  const styles = useMemo(
    () => getStyles(colors, isDark, isSage, layout),
    [colors, isDark, isSage, layout]
  );
  const guideBtnRef = useRegisterTourTarget('customer_btn_guide');
  const alertsBtnRef = useRegisterTourTarget('customer_btn_notifications');
  const heroCtaRef = useRegisterTourTarget('customer_btn_hero_cta');

  const [savedBookings, setSavedBookings] = useState([]);
  const [studioServices, setStudioServices] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratesCategory, setRatesCategory] = useState('all');

  // Modals & Notifications state
  const [showGuideChooser, setShowGuideChooser] = useState(false);
  const [showScanGuide, setShowScanGuide] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [showRates, setShowRates] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const [showStudio, setShowStudio] = useState(false);

  const loadNotifications = useCallback(async ({ syncLive = true, soundIfNew = true } = {}) => {
    try {
      const feed = await fetchCustomerNotificationsFeed({ syncLive });
      setNotifications(feed.items);
      setNotifUnreadCount(feed.unreadCount);
      if (Array.isArray(feed.bookings)) {
        setSavedBookings(feed.bookings);
      }
      if (soundIfNew) {
        await announceNewNotificationsWithSound(feed.items);
      }
    } catch { }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [bookings, services] = await Promise.all([
        getSavedBookings(),
        fetchStudioServices(),
      ]);
      setSavedBookings(bookings);
      setStudioServices(services);
      await loadNotifications({ syncLive: true, soundIfNew: true });
    } finally {
      setInitialLoading(false);
    }
  }, [loadNotifications]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const primaryBookingId = savedBookings[0]?.bookingId;
  useEffect(() => {
    if (!primaryBookingId) return undefined;
    const unsubscribe = subscribeToBookingUpdates(primaryBookingId, () => {
      loadNotifications({ syncLive: true, soundIfNew: true });
    });
    return unsubscribe;
  }, [primaryBookingId, loadNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    } catch { }
    await loadData();
    setRefreshing(false);
  };

  const recentBooking = savedBookings[0];

  const handleOpenNotifications = useCallback(() => {
    playNotificationBellCue(notifUnreadCount > 0).catch(() => { });
    setShowNotificationsModal(true);
    loadNotifications({ syncLive: true, soundIfNew: true });
  }, [notifUnreadCount, loadNotifications]);

  const handleMarkNotificationRead = useCallback(async (item) => {
    if (!item || item.isRead) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    setNotifUnreadCount((c) => Math.max(0, c - 1));
    await markNotificationRead(item.id);
  }, []);

  const handlePressNotification = useCallback(
    async (item) => {
      if (!item) return;
      await handleMarkNotificationRead(item);
      if (item.bookingToken) {
        setShowNotificationsModal(false);
        navigation.navigate('BookingTracker', {
          token: item.bookingToken,
          booking: {
            booking_number: item.bookingNumber,
            status: item.status,
          },
        });
      }
    },
    [navigation, handleMarkNotificationRead]
  );

  const handleMarkAllNotifsRead = useCallback(async () => {
    Haptics.selectionAsync().catch(() => { });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setNotifUnreadCount(0);
    await markAllNotificationsRead(notifications);
  }, [notifications]);

  const handleClearAllNotifs = useCallback(async () => {
    Haptics.selectionAsync().catch(() => { });
    const snapshot = notifications;
    setNotifications([]);
    setNotifUnreadCount(0);
    await clearNotificationsList(snapshot);
  }, [notifications]);

  const openRatesForCategory = useCallback((category = 'all') => {
    try {
      Haptics.selectionAsync().catch(() => { });
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
      Haptics.selectionAsync().catch(() => { });
    } catch { }
    if (recentBooking) {
      navigation.navigate('BookingTracker', {
        token: recentBooking.token || recentBooking.bookingNumber,
        booking: {
          booking_number: recentBooking.bookingNumber,
          serviceName: recentBooking.serviceName,
          tier_name: recentBooking.tierName,
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
  const recentPassColors = useMemo(() => {
    if (isSage) return ['#21281F', '#151B14'];
    if (isDark) return ['#241F17', '#131722'];
    return ['#231D16', '#14110E'];
  }, [isDark, isSage]);
  const recentAccentColor = isSage ? '#B8CFA4' : '#E6C275';
  const cardGradientColors =
    gradients.glassCard ||
    gradients.card ||
    (isDark ? ['rgba(36, 32, 42, 0.78)', 'rgba(21, 27, 36, 0.86)'] : ['rgba(255, 255, 255, 0.97)', 'rgba(246, 248, 252, 0.95)']);
  const headerGradientColors =
    gradients.header ||
    (isDark
      ? ['#242029', '#151B24']
      : ['rgba(255, 255, 255, 0.98)', 'rgba(248, 250, 253, 0.96)']);
  const accentIconColor = isSage ? colors.gold.DEFAULT : '#B88622';
  const onPrimaryColor = isSage ? '#FFFFFF' : '#181410';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.base }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg.base}
      />
      <GlassBackground />

      {/* Top Floating Glass-Pill Header (Fixed above scroll) */}
      <View
        style={[
          styles.fixedHeaderWrap,
          { paddingTop: Math.max(insets.top, 16) + 8 },
        ]}
      >
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
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => { });
                    setShowGuideChooser(true);
                  }}
                  style={styles.headerIconBtn}
                  accessibilityLabel="Studio guides"
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
                  onPress={handleOpenNotifications}
                  style={styles.headerIconBtn}
                  accessibilityLabel={
                    notifUnreadCount > 0
                      ? `Studio notifications (${notifUnreadCount} unread)`
                      : 'Studio notifications'
                  }
                >
                  <Bell
                    size={19}
                    color={isDark ? colors.text.primary : '#241D14'}
                    strokeWidth={1.85}
                  />
                  {notifUnreadCount > 0 && <View style={styles.notifBadgeDot} />}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold.DEFAULT}
          />
        }
      >

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
                size={layout.isCompact ? 68 : 80}
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
                    numberOfLines={layout.isLargeFont ? 2 : 1}
                    adjustsFontSizeToFit={!layout.isLargeFont}
                    minimumFontScale={0.85}
                  >
                    {tool.title}
                  </Text>
                  <Text
                    style={styles.toolMiniSub}
                    numberOfLines={layout.isLargeFont ? 2 : 1}
                  >
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
            activeOpacity={0.9}
            onPress={openBookingTracker}
            style={styles.recentPassCard}
          >
            <LinearGradient
              colors={recentPassColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.recentPassGradient}
            >
              {/* Soft warm ambient sheen */}
              <LinearGradient
                colors={
                  isSage
                    ? ['rgba(184, 207, 164, 0.16)', 'rgba(184, 207, 164, 0.0)']
                    : ['rgba(230, 194, 117, 0.18)', 'rgba(230, 194, 117, 0.0)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 0.9 }}
                style={styles.recentPassGlow}
                pointerEvents="none"
              />

              {/* Left vertical studio accent spine */}
              <LinearGradient
                colors={goldPillColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.recentAccentSpine}
              />

              <View style={styles.recentPassBody}>
                <View style={styles.recentTopRow}>
                  <LinearGradient
                    colors={goldPillColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.recentCrestBadge}
                  >
                    <CalendarCheck
                      size={19}
                      color={onPrimaryColor}
                      strokeWidth={2}
                    />
                  </LinearGradient>

                  <View style={styles.recentTopLeft}>
                    <Text numberOfLines={1} style={styles.recentPassTitle}>
                      {recentBooking.serviceName || 'Studio Package'}
                    </Text>
                    <Text numberOfLines={1} style={styles.recentPassMeta}>
                      {[recentBooking.clientName, recentBooking.tierName]
                        .filter(Boolean)
                        .join(' · ') || 'Studio Guest'}
                    </Text>
                  </View>

                  <View style={styles.recentChevronCircle}>
                    <ChevronRight
                      size={17}
                      color={recentAccentColor}
                      strokeWidth={2.2}
                    />
                  </View>
                </View>
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
                      <View style={styles.packageImageWrap}>
                        <Image
                          source={{ uri: svc.cover_image }}
                          style={styles.packageImage}
                          resizeMode="cover"
                        />
                        <View style={styles.packageImageHairline} />
                      </View>
                      <View style={styles.packageBody}>
                        <CardDecorElements variant="package" isDark={isDark} />
                        <Text numberOfLines={2} style={styles.packageTitle}>
                          {svc.name}
                        </Text>
                        <View style={styles.packageFooterRow}>
                          <Text numberOfLines={1} style={styles.packageMeta}>
                            {priceSummary}
                          </Text>
                          <ChevronRight
                            size={14}
                            color={isDark ? colors.gold.light : isSage ? colors.gold.DEFAULT : '#8A6314'}
                            strokeWidth={2}
                          />
                        </View>
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

      {/* Studio Guides Chooser Modal */}
      <GuideChooserModal
        visible={showGuideChooser}
        onClose={() => setShowGuideChooser(false)}
        onSelectTour={() => {
          setShowGuideChooser(false);
          setTimeout(() => {
            tour?.startTour?.('customer');
          }, 200);
        }}
        onSelectTrackGuide={() => {
          setShowGuideChooser(false);
          setTimeout(() => {
            setShowScanGuide(true);
          }, 120);
        }}
      />

      {/* Scan Instructions Modal */}
      <ScanInstructionsModal
        visible={showScanGuide}
        onClose={() => setShowScanGuide(false)}
        onOpenScanner={() => navigation.navigate('Scanner')}
      />

      {/* Studio Notifications & Activity Modal */}
      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        items={notifications}
        unreadCount={notifUnreadCount}
        onMarkItemRead={handleMarkNotificationRead}
        onPressItem={handlePressNotification}
        onMarkAllRead={handleMarkAllNotifsRead}
        onClearAll={handleClearAllNotifs}
      />

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

const getStyles = (colors, isDark, isSage, layout) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
      zIndex: 1,
    },
    scrollContent: {
      paddingHorizontal: layout.gutter,
      paddingTop: 6,
    },

    // Header
    fixedHeaderWrap: {
      paddingHorizontal: layout.gutter,
      paddingBottom: 10,
      zIndex: 10,
    },
    headerPillShadow: {
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
      borderColor: isDark ? 'rgba(180, 198, 224, 0.20)' : 'rgba(255, 255, 255, 0.95)',
      backgroundColor: isDark ? '#181E29' : isSage ? '#FCFDFB' : '#FFFFFF',
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
      backgroundColor: isDark ? '#181E29' : isSage ? '#FCFDFB' : '#FFFFFF',
      overflow: 'hidden',
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
      padding: layout.isCompact ? 14 : 18,
      gap: layout.cardGap,
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
      fontSize: layout.fs(23, 0.8),
      lineHeight: layout.fs(28, 0.85),
      color: isDark ? colors.text.primary : '#181410',
    },
    heroBody: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: layout.fs(12.5, 0.95),
      lineHeight: layout.fs(18, 0.95),
      color: isDark ? colors.text.secondary : '#5C5346',
      marginTop: layout.pad(8, 0.5),
    },
    heroCtaWrap: {
      marginTop: layout.pad(14, 0.55),
      alignSelf: 'flex-start',
      borderRadius: 999,
      overflow: 'hidden',
    },
    heroCtaGradient: {
      paddingVertical: layout.pad(10, 0.45),
      paddingHorizontal: layout.pad(18, 0.4),
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCtaText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: layout.fs(13, 0.9),
      lineHeight: layout.fs(17, 0.9),
      color: isSage ? '#FFFFFF' : '#181410',
    },
    mascotBox: {
      width: layout.isCompact ? 92 : 108,
      height: layout.isCompact ? 100 : 116,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255, 255, 255, 0.92)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.16)' : 'rgba(214, 219, 230, 0.85)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },

    // Section Header
    sectionLabel: {
      fontFamily: Typography.fontHeading,
      fontSize: layout.fs(21, 0.75),
      lineHeight: layout.fs(26, 0.8),
      letterSpacing: -0.25,
      color: isDark ? colors.text.primary : '#181410',
      marginTop: layout.pad(22, 0.5),
      marginBottom: layout.pad(12, 0.5),
    },

    // Quick Actions 2-column
    quickActionsGrid: {
      flexDirection: 'row',
      gap: layout.cardGap,
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
      backgroundColor: isDark ? '#181E29' : isSage ? '#FCFDFB' : '#FFFFFF',
      overflow: 'hidden',
      shadowColor: '#5B6472',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 10,
      elevation: isDark ? 0 : 2,
    },
    quickActionGradient: {
      flex: 1,
      padding: layout.cardPad,
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
      fontSize: layout.fs(16.5, 0.9),
      lineHeight: layout.fs(21, 0.9),
      color: isDark ? colors.text.primary : '#181410',
      marginTop: layout.pad(14, 0.55),
    },
    quickActionSub: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: layout.fs(12, 0.95),
      lineHeight: layout.fs(17, 0.95),
      color: isDark ? colors.text.secondary : '#5C5346',
      marginTop: layout.pad(4, 0.5),
    },

    // Studio Tool Cards Grid
    toolsCardsGrid: {
      flexDirection: 'row',
      gap: layout.isCompact ? 8 : 10,
      marginTop: layout.cardGap,
    },
    toolMiniCard: {
      flex: 1,
      minHeight: layout.pad(layout.isCompact ? 118 : 128, 0.65),
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6',
      backgroundColor: isDark ? '#181E29' : isSage ? '#FCFDFB' : '#FFFFFF',
      overflow: 'hidden',
      shadowColor: '#5B6472',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 10,
      elevation: isDark ? 0 : 2,
    },
    toolMiniGradient: {
      flex: 1,
      paddingHorizontal: layout.pad(10, 0.35),
      paddingVertical: layout.pad(16, 0.7),
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
      backgroundColor: isDark ? 'rgba(180, 198, 224, 0.14)' : 'rgba(255, 255, 255, 0.96)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.24)' : 'rgba(198, 206, 222, 0.75)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolMiniTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: layout.fs(14, 0.85),
      lineHeight: layout.fs(18, 0.85),
      color: isDark ? colors.text.primary : '#181410',
      textAlign: 'center',
      marginTop: layout.pad(12, 0.5),
    },
    toolMiniSub: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: layout.fs(11, 0.85),
      lineHeight: layout.fs(15, 0.85),
      color: isDark ? colors.text.secondary : '#5C5346',
      textAlign: 'center',
      marginTop: layout.pad(3, 0.5),
    },

    // Recent Order Highlight Pass
    recentPassCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isSage
        ? 'rgba(162, 188, 142, 0.45)'
        : 'rgba(229, 189, 103, 0.46)',
      backgroundColor: isSage ? '#191F17' : '#161310',
      overflow: 'hidden',
      shadowColor: isDark ? '#000000' : '#2C2214',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.34 : 0.18,
      shadowRadius: 16,
      elevation: 5,
    },
    recentPassGradient: {
      borderRadius: 19,
      position: 'relative',
      flexDirection: 'row',
      overflow: 'hidden',
    },
    recentPassGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 76,
    },
    recentAccentSpine: {
      width: 4,
    },
    recentPassBody: {
      flex: 1,
      paddingHorizontal: layout.pad(15, 0.45),
      paddingVertical: layout.pad(16, 0.7),
    },
    recentCrestBadge: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recentPassTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: layout.fs(16.5, 0.9),
      lineHeight: layout.fs(21, 0.9),
      color: '#FFFDF8',
    },
    recentPassMeta: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: layout.fs(12.5, 0.95),
      lineHeight: layout.fs(17, 0.95),
      color: '#C9BFA9',
      marginTop: layout.pad(2, 0.5),
    },
    recentChevronCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: isSage
        ? 'rgba(184, 207, 164, 0.14)'
        : 'rgba(230, 194, 117, 0.14)',
      borderWidth: 1,
      borderColor: isSage
        ? 'rgba(184, 207, 164, 0.34)'
        : 'rgba(230, 194, 117, 0.34)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Empty Recent Card
    recentCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6',
      backgroundColor: isDark ? '#181E29' : isSage ? '#FAFBF8' : '#FFFFFF',
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
      gap: layout.cardGap,
      paddingRight: 8,
      paddingBottom: 6,
      alignItems: 'stretch',
    },
    packageCard: {
      width: layout.packageCardWidth,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6',
      backgroundColor: isDark ? '#181E29' : isSage ? '#FAFBF8' : '#FFFFFF',
      overflow: 'hidden',
      shadowColor: '#5B6472',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 10,
      elevation: isDark ? 0 : 2,
    },
    packageCardGradient: {
      flex: 1,
      borderRadius: 17,
      overflow: 'hidden',
    },
    packageImageWrap: {
      width: '100%',
      height: layout.isCompact ? 100 : 114,
      backgroundColor: isDark ? '#1F2634' : '#E5EAF2',
      position: 'relative',
    },
    packageImage: {
      width: '100%',
      height: '100%',
    },
    packageImageHairline: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(24, 20, 16, 0.08)',
    },
    packageBody: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: layout.pad(14, 0.45),
      paddingTop: layout.pad(12, 0.6),
      paddingBottom: layout.pad(14, 0.65),
      position: 'relative',
      overflow: 'hidden',
    },
    packageTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: layout.fs(15.5, 0.9),
      lineHeight: layout.fs(20.5, 0.9),
      color: isDark ? colors.text.primary : '#181410',
    },
    packageFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      marginTop: layout.pad(8, 0.55),
    },
    packageMeta: {
      flex: 1,
      fontFamily: Typography.fontBodySemi,
      fontSize: layout.fs(12.5, 0.9),
      lineHeight: layout.fs(17, 0.9),
      color: isDark ? colors.gold.light : isSage ? colors.gold.DEFAULT : '#8A6314',
    },
  });
