/**
 * PhotographerHomeScreen.jsx
 * Photographer Home Dashboard matching the E-Kodak Customer Home visual system:
 *  - Floating pill brand header with Duty Switch & Studio Alerts modal
 *  - Hero status card with StudioMascotKit & quick shoot CTA
 *  - 2-card Quick Actions grid (Assigned Shoots & My Schedule)
 *  - 3-card centered KPI strip (Today, In Capture, Completed)
 *  - Up Next assigned shoot preview card with interactive ShootDetailModal
 */

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
  Bell,
  Camera,
  CalendarDays,
  Sparkles,
  MapPin,
  ChevronRight,
  X,
  Radio,
} from 'lucide-react-native';

import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import GoldButton from '../components/GoldButton';
import StudioMascotKit from '../components/StudioMascotKit';
import CardDecorElements from '../components/CardDecorElements';
import StudioShapeLoader from '../components/StudioShapeLoader';
import StatusBadge from '../components/StatusBadge';
import ShootDetailModal from '../components/ShootDetailModal';
import { verifyPhotographerSession } from '../services/bookingService';
import {
  fetchAllAssignedShoots,
  fetchPhotographerProfile,
  fetchPhotographerAlerts,
  calculatePhotographerStats,
  toggleGeneralDutyAvailability,
  acceptPhotographerAssignment,
  declinePhotographerAssignment,
  updatePhotographerShootStatus,
  requestPhotographerReschedule,
  formatReadableDate,
  formatTime12,
  toLocalISODate,
} from '../services/photographerService';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import { useRegisterTourTarget } from '../context/TourContext';
import { Typography } from '../theme';

const E_KODAK_LOGO = require('../../assets/ekodak-logo.png');

export default function PhotographerHomeScreen({ navigation }) {
  const { isDark, isSage, colors, gradients } = useTheme();
  const { showAlert } = useDialog();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors, isDark, isSage), [colors, isDark, isSage]);
  const dutyBtnRef = useRegisterTourTarget('ph_btn_duty');
  const alertsBtnRef = useRegisterTourTarget('ph_btn_alerts');
  const heroCtaRef = useRegisterTourTarget('ph_btn_hero_cta');

  const [photographer, setPhotographer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingDuty, setTogglingDuty] = useState(false);

  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [selectedShoot, setSelectedShoot] = useState(null);
  const [shootBusy, setShootBusy] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const auth = await verifyPhotographerSession();
      if (!auth.authorized || !auth.profile?.id) {
        return;
      }
      const uid = auth.profile.id;
      const [profileRes, shootsRes, alertsRes] = await Promise.all([
        fetchPhotographerProfile(uid),
        fetchAllAssignedShoots(uid),
        fetchPhotographerAlerts(),
      ]);

      const mergedProfile = profileRes?.data || auth.profile;
      setPhotographer(mergedProfile);
      setIsAvailable(mergedProfile?.is_available ?? true);
      setBookings(shootsRes?.data || []);
      setAlerts(alertsRes?.data || []);
    } catch (err) {
      console.warn('PhotographerHome load error:', err?.message || err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleToggleDuty = async () => {
    if (!photographer?.id || togglingDuty) return;
    Haptics.selectionAsync().catch(() => {});
    setTogglingDuty(true);
    const next = !isAvailable;
    const { error } = await toggleGeneralDutyAvailability(photographer.id, next);
    setTogglingDuty(false);

    if (error) {
      showAlert('Sync Failed', 'Could not update your studio duty status.', [{ text: 'OK' }], {
        type: 'danger',
      });
      return;
    }
    setIsAvailable(next);
  };

  const handleAccept = async (booking) => {
    if (!photographer?.id) return;
    setShootBusy(true);
    const { error } = await acceptPhotographerAssignment({
      bookingId: booking.id,
      photographerId: photographer.id,
      photographerName: photographer.full_name || 'Studio Photographer',
      bookingNumber: booking.booking_number,
    });
    setShootBusy(false);
    if (error) {
      showAlert('Update Failed', error.message || 'Could not accept shoot.', [{ text: 'OK' }], {
        type: 'danger',
      });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSelectedShoot(null);
    await loadDashboard();
  };

  const handleDecline = async (booking, reason) => {
    if (!photographer?.id) return;
    setShootBusy(true);
    const { error } = await declinePhotographerAssignment({
      bookingId: booking.id,
      photographerId: photographer.id,
      photographerName: photographer.full_name || 'Studio Photographer',
      bookingNumber: booking.booking_number,
      reason,
    });
    setShootBusy(false);
    if (error) {
      showAlert('Decline Failed', error.message || 'Could not decline shoot.', [{ text: 'OK' }], {
        type: 'danger',
      });
      return;
    }
    setSelectedShoot(null);
    await loadDashboard();
  };

  const handleAdvanceStatus = async (booking, nextStatus) => {
    if (!photographer?.id) return;
    setShootBusy(true);
    const { error } = await updatePhotographerShootStatus({
      bookingId: booking.id,
      newStatus: nextStatus,
      photographerId: photographer.id,
      photographerName: photographer.full_name || 'Studio Photographer',
      bookingNumber: booking.booking_number,
    });
    setShootBusy(false);
    if (error) {
      showAlert('Status Error', error.message || 'Could not update session.', [{ text: 'OK' }], {
        type: 'danger',
      });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSelectedShoot(null);
    await loadDashboard();
  };

  const handleReschedule = async (booking, { proposedDate, proposedTime, reason }) => {
    if (!photographer?.id) return;
    setShootBusy(true);
    const { error } = await requestPhotographerReschedule({
      bookingId: booking.id,
      photographerId: photographer.id,
      photographerName: photographer.full_name || 'Studio Photographer',
      bookingNumber: booking.booking_number,
      proposedDate,
      proposedTime,
      reason,
    });
    setShootBusy(false);
    if (error) {
      showAlert('Request Failed', error.message || 'Could not send request.', [{ text: 'OK' }], {
        type: 'danger',
      });
      return;
    }
    showAlert('Request Sent', 'Admin has been notified of your reschedule request.', [{ text: 'OK' }], {
      type: 'success',
    });
    setSelectedShoot(null);
  };

  const stats = useMemo(() => calculatePhotographerStats(bookings), [bookings]);

  const upNextBooking = useMemo(() => {
    const todayStr = toLocalISODate(new Date());
    const active = bookings.filter(
      (b) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(String(b.status || '').toUpperCase())
    );
    const todayOrUpcoming = active.filter((b) => !b.session_date || b.session_date >= todayStr);
    return todayOrUpcoming[0] || active[0] || null;
  }, [bookings]);

  const firstName =
    photographer?.first_name ||
    (photographer?.full_name ? photographer.full_name.split(' ')[0] : 'Photographer');

  const cardGradientColors = gradients?.glassCard || gradients?.card || (
    isDark ? ['rgba(36, 32, 42, 0.78)', 'rgba(21, 27, 36, 0.86)'] : ['rgba(255, 253, 250, 0.84)', 'rgba(237, 243, 250, 0.78)']
  );
  const headerGradientColors = gradients?.header || (
    isDark ? ['#242029', '#151B24'] : ['#FFFFFF', '#EDF2F7']
  );
  const goldPillColors = gradients?.goldPill || ['#EAD082', '#C7962D'];
  const accentIconColor = isSage ? colors.gold.DEFAULT : '#B88622';
  const onPrimaryColor = isSage ? '#FFFFFF' : '#181410';

  const heroBodyCopy =
    stats.todayShoots > 0
      ? `You have ${stats.todayShoots} shoot${stats.todayShoots === 1 ? '' : 's'} scheduled today.`
      : stats.inProgress > 0
        ? `${stats.inProgress} active shoot${stats.inProgress === 1 ? '' : 's'} in your studio queue.`
        : 'All caught up. Your studio queue is clear right now.';

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
                  <Text style={styles.brandTagline}>Photographer Portal</Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  ref={dutyBtnRef}
                  collapsable={false}
                  activeOpacity={0.82}
                  onPress={handleToggleDuty}
                  disabled={togglingDuty}
                  style={[
                    styles.headerIconBtn,
                    {
                      backgroundColor: isAvailable
                        ? isDark
                          ? 'rgba(16, 185, 129, 0.18)'
                          : 'rgba(16, 185, 129, 0.12)'
                        : isDark
                          ? 'rgba(239, 68, 68, 0.16)'
                          : 'rgba(239, 68, 68, 0.10)',
                      borderColor: isAvailable
                        ? 'rgba(16, 185, 129, 0.42)'
                        : 'rgba(239, 68, 68, 0.35)',
                    },
                  ]}
                  accessibilityLabel={isAvailable ? 'On Duty - tap to switch Off Duty' : 'Off Duty - tap to switch On Duty'}
                >
                  <Radio
                    size={18}
                    color={isAvailable ? '#10B981' : '#EF4444'}
                    strokeWidth={2.1}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  ref={alertsBtnRef}
                  collapsable={false}
                  activeOpacity={0.8}
                  onPress={() => setShowAlertsModal(true)}
                  style={styles.headerIconBtn}
                  accessibilityLabel="Studio alerts"
                >
                  <Bell
                    size={19}
                    color={isDark ? colors.text.primary : '#241D14'}
                    strokeWidth={1.85}
                  />
                  {alerts.length > 0 && <View style={styles.notifBadgeDot} />}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

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
              <Text style={styles.heroHeading} numberOfLines={2}>
                {`Ready for shoots,\n${firstName}.`}
              </Text>
              <Text style={styles.heroBody}>{heroBodyCopy}</Text>

              <TouchableOpacity
                ref={heroCtaRef}
                collapsable={false}
                activeOpacity={0.88}
                onPress={() => navigation.navigate('PhotographerShoots')}
                style={styles.heroCtaWrap}
              >
                <LinearGradient
                  colors={goldPillColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.heroCtaGradient}
                >
                  <Text style={styles.heroCtaText}>View Shoots →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.mascotBox}>
              <StudioMascotKit
                pose="camera_ready"
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
          {/* Assigned Shoots */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('PhotographerShoots')}
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
                <Camera size={19} color={onPrimaryColor} strokeWidth={1.9} />
              </LinearGradient>

              <Text style={styles.quickActionTitle}>Assigned Shoots</Text>
              <Text style={styles.quickActionSub}>
                {stats.total - stats.completed} active shoot{stats.total - stats.completed === 1 ? '' : 's'} in queue.
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* My Schedule */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('PhotographerSchedule')}
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
                <CalendarDays size={19} color="#FAF5EA" strokeWidth={1.9} />
              </View>

              <Text style={styles.quickActionTitle}>Shoot Schedule</Text>
              <Text style={styles.quickActionSub}>
                {stats.upcomingWeek} upcoming this week.
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Studio Overview KPI Row (centered 3-card row matching HomeScreen tool cards) */}
        <View style={styles.kpiCardsGrid}>
          {[
            {
              key: 'today',
              value: String(stats.todayShoots),
              title: 'Today',
              sub: 'Booked today',
              tone: 'gold',
              onPress: () => navigation.navigate('PhotographerSchedule'),
            },
            {
              key: 'active',
              value: String(stats.inProgress),
              title: 'Active',
              sub: 'Shoot & editing',
              tone: 'soft',
              onPress: () => navigation.navigate('PhotographerShoots'),
            },
            {
              key: 'done',
              value: String(stats.completed),
              title: 'Done',
              sub: 'Completed',
              tone: 'dark',
              onPress: () => navigation.navigate('PhotographerShoots'),
            },
          ].map((kpi) => (
            <TouchableOpacity
              key={kpi.key}
              activeOpacity={0.88}
              onPress={kpi.onPress}
              style={styles.kpiMiniCard}
            >
              <LinearGradient
                colors={cardGradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.kpiMiniGradient}
              >
                <CardDecorElements variant="tool" isDark={isDark} />
                <Text
                  style={[
                    styles.kpiValue,
                    kpi.tone === 'gold' && { color: colors.gold.DEFAULT },
                  ]}
                >
                  {kpi.value}
                </Text>
                <Text style={styles.kpiMiniTitle} numberOfLines={1}>
                  {kpi.title}
                </Text>
                <Text style={styles.kpiMiniSub} numberOfLines={1}>
                  {kpi.sub}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Up Next Assigned Shoot */}
        <Text style={styles.sectionLabel}>Up Next</Text>

        {upNextBooking ? (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setSelectedShoot(upNextBooking)}
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
                  <Camera size={18} color={accentIconColor} strokeWidth={1.9} />
                </View>
                <View style={styles.recentTopLeft}>
                  <Text numberOfLines={1} style={styles.recentOrderTitle}>
                    {upNextBooking.services?.name || 'Studio Session'} • #{upNextBooking.booking_number}
                  </Text>
                  <Text numberOfLines={1} style={styles.recentOrderMeta}>
                    {upNextBooking.profile?.full_name || 'Client'} • {formatReadableDate(upNextBooking.session_date)} at {formatTime12(upNextBooking.session_time)}
                  </Text>
                </View>
                <ChevronRight
                  size={19}
                  color={isDark ? colors.text.muted : '#4B4338'}
                  strokeWidth={1.9}
                />
              </View>
              <View style={styles.upNextMetaRow}>
                <StatusBadge status={upNextBooking.status} size="sm" />
                <View style={styles.upNextLocationRow}>
                  <MapPin size={12} color={accentIconColor} />
                  <Text style={styles.upNextLocationText} numberOfLines={1}>
                    {upNextBooking.location_address || 'Studio Bay'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('PhotographerSchedule')}
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
                  <CalendarDays size={18} color={accentIconColor} strokeWidth={1.9} />
                </View>
                <View style={styles.recentTopLeft}>
                  <Text style={styles.recentOrderTitle}>No active shoots right now</Text>
                  <Text style={styles.recentOrderMeta}>
                    Open Schedule to check upcoming dates or update your availability.
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

        <View style={{ height: 132 }} />
      </ScrollView>

      {/* Studio Alerts Modal */}
      <Modal
        visible={showAlertsModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowAlertsModal(false)}
      >
        <View style={styles.notifOverlay}>
          <GlassCard opaque blurred={false} style={styles.notifCard}>
            <View style={styles.notifHeader}>
              <View>
                <Text style={styles.notifTitle}>Studio Alerts</Text>
                <Text style={styles.notifSub}>Dispatch notes & booking updates</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAlertsModal(false)}
                style={styles.notifCloseBtn}
                accessibilityLabel="Close alerts"
              >
                <X size={18} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {alerts.length > 0 ? (
                alerts.map((al) => (
                  <View key={al.id} style={styles.notifItem}>
                    <View style={styles.notifIconCircle}>
                      <Bell size={15} color={colors.gold.DEFAULT} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifItemTitle}>{al.title}</Text>
                      <Text style={styles.notifItemBody}>{al.message}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.notifItem}>
                  <View style={styles.notifIconCircle}>
                    <Sparkles size={15} color={colors.gold.DEFAULT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifItemTitle}>Studio Floor Synced</Text>
                    <Text style={styles.notifItemBody}>
                      Pull down anytime to sync newly assigned bookings and schedule updates.
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <GoldButton
              variant="outline"
              onPress={() => setShowAlertsModal(false)}
              style={{ marginTop: 14 }}
            >
              Close
            </GoldButton>
          </GlassCard>
        </View>
      </Modal>

      <ShootDetailModal
        visible={Boolean(selectedShoot)}
        booking={selectedShoot}
        busy={shootBusy}
        onClose={() => setSelectedShoot(null)}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onAdvanceStatus={handleAdvanceStatus}
        onRequestReschedule={handleReschedule}
      />
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
    },
    scrollContent: {
      paddingHorizontal: 16,
    },
    shapeLoaderBar: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      marginBottom: 4,
    },

    // Header Pill (matches customer HomeScreen)
    headerPillShadow: {
      borderRadius: 28,
      backgroundColor: 'transparent',
      marginBottom: 16,
      shadowColor: isDark ? '#000000' : '#4E4332',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.34 : 0.08,
      shadowRadius: 16,
      elevation: isDark ? 4 : 5,
    },
    headerPillFrame: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : 'rgba(255, 255, 255, 0.90)',
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
      borderRadius: 19,
      backgroundColor: isDark ? '#1B1F2B' : '#FFFFFF',
    },
    brandWordmark: {
      fontFamily: Typography.fontHeading,
      fontSize: 18,
      lineHeight: 21,
      color: isDark ? colors.text.primary : '#181410',
      letterSpacing: 0.4,
      includeFontPadding: false,
    },
    brandTagline: {
      fontFamily: Typography.fontBody,
      fontSize: 11.5,
      lineHeight: 15,
      color: isDark ? colors.text.secondary : '#6F6659',
      marginTop: 0,
      includeFontPadding: false,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.18)' : isSage ? '#D7DDD1' : '#ECE7DE',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    notifBadgeDot: {
      position: 'absolute',
      top: 9,
      right: 9,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: '#C7962D',
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
    },

    // Hero Card
    heroCardOuter: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.20)' : isSage ? '#D7DDD1' : '#DCDDE6',
      marginBottom: 22,
      overflow: 'hidden',
      shadowColor: isDark ? '#000000' : '#4E4332',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.26 : 0.08,
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
      fontSize: 22,
      lineHeight: 27,
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
    },
    heroCtaGradient: {
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroCtaText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 12.5,
      color: isSage ? '#FFFFFF' : '#181410',
      letterSpacing: 0.2,
    },
    mascotBox: {
      width: 102,
      height: 102,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : '#EFEAE0',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },

    sectionLabel: {
      fontFamily: Typography.fontHeading,
      fontSize: 17,
      color: isDark ? colors.text.primary : '#181410',
      marginBottom: 12,
    },

    // Quick Actions
    quickActionsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    quickActionCard: {
      flex: 1,
      minHeight: 152,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.20)' : isSage ? '#D7DDD1' : '#DCDDE6',
      overflow: 'hidden',
      shadowColor: isDark ? '#000000' : '#4E4332',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.22 : 0.07,
      shadowRadius: 12,
      elevation: isDark ? 0 : 2,
    },
    quickActionGradient: {
      flex: 1,
      padding: 16,
      justifyContent: 'space-between',
      position: 'relative',
    },
    actionBadgeGold: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    actionBadgeDark: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: isSage ? '#5E6E51' : '#1E1A16',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    quickActionTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 15.5,
      color: isDark ? colors.text.primary : '#181410',
    },
    quickActionSub: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 12,
      lineHeight: 17,
      color: isDark ? colors.text.secondary : '#6B6256',
      marginTop: 4,
    },

    // Centered 3 KPI Cards
    kpiCardsGrid: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
      marginBottom: 24,
    },
    kpiMiniCard: {
      flex: 1,
      minHeight: 112,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.20)' : isSage ? '#D7DDD1' : '#DCDDE6',
      overflow: 'hidden',
      shadowColor: isDark ? '#000000' : '#4E4332',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: isDark ? 0.22 : 0.07,
      shadowRadius: 10,
      elevation: isDark ? 0 : 2,
    },
    kpiMiniGradient: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    kpiValue: {
      fontFamily: Typography.fontHeading,
      fontSize: 34,
      lineHeight: 38,
      color: isDark ? colors.text.primary : '#181410',
      textAlign: 'center',
      includeFontPadding: false,
      marginBottom: 4,
    },
    kpiMiniTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 13,
      lineHeight: 16,
      color: isDark ? colors.text.primary : '#181410',
      textAlign: 'center',
      includeFontPadding: false,
    },
    kpiMiniSub: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 10.5,
      lineHeight: 14,
      color: isDark ? colors.text.secondary : '#6B6256',
      textAlign: 'center',
      marginTop: 1,
      includeFontPadding: false,
    },

    // Up Next Card
    recentCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.20)' : isSage ? '#D7DDD1' : '#DCDDE6',
      marginBottom: 20,
      overflow: 'hidden',
      shadowColor: isDark ? '#000000' : '#4E4332',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: isDark ? 0.20 : 0.06,
      shadowRadius: 10,
      elevation: isDark ? 0 : 2,
    },
    recentCardGradient: {
      padding: 15,
      position: 'relative',
    },
    recentTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    recentIconBox: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#EAE3D5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    recentTopLeft: {
      flex: 1,
    },
    recentOrderTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 15.5,
      color: isDark ? colors.text.primary : '#181410',
    },
    recentOrderMeta: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 12,
      color: isDark ? colors.text.secondary : '#6B6256',
      marginTop: 3,
    },
    upNextMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(24,20,16,0.07)',
      gap: 10,
    },
    upNextLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flex: 1,
      justifyContent: 'flex-end',
    },
    upNextLocationText: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 11.5,
      color: isDark ? colors.text.secondary : '#6B6256',
    },

    // Alerts modal
    notifOverlay: {
      flex: 1,
      backgroundColor: 'rgba(8, 10, 14, 0.66)',
      justifyContent: 'center',
      padding: 20,
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
    notifTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 20,
      color: colors.text.primary,
    },
    notifSub: {
      fontFamily: Typography.fontBody,
      fontSize: 12.5,
      color: colors.text.secondary,
      marginTop: 2,
    },
    notifCloseBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: isDark ? colors.bg.elevated : '#EEF1F6',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D9DFE8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(212,175,55,0.08)',
      borderWidth: 1,
      borderColor: colors.gold.border,
      marginBottom: 10,
    },
    notifIconCircle: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: colors.gold.bg,
      borderWidth: 1,
      borderColor: colors.gold.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifItemTitle: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 13.5,
      color: colors.text.primary,
      marginBottom: 3,
    },
    notifItemBody: {
      fontFamily: Typography.fontBody,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.text.secondary,
    },
  });
