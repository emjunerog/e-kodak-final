/**
 * SavedBookingsScreen.jsx — My Bookings Dashboard & Booking Details Pass Modal
 * Features:
 * - Clean editorial header ("My Bookings" / "Your booking details.")
 * - Full-width Scan Booking QR primary action
 * - Studio booking pass cards with contrasting dark header strip + theme-matched gradient body
 * - Tap any card to open the Booking Details modal (scannable QR, booking specs, copyable Booking Code, Track Order)
 * - Pull-to-refresh, delete pass confirmation, and live background hydration with cached offline fallback
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Modal,
  Animated,
  Easing,
  ScrollView,
  NativeModules,
  TurboModuleRegistry,
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ChevronRight, Trash2, X, Check, QrCode, ScanLine, ShieldCheck, Clock, RotateCcw } from 'lucide-react-native';

import {
  getSavedBookings,
  removeSavedBooking,
  saveBookingToken,
} from '../services/storageService';
import { fetchBookingByToken } from '../services/bookingService';
import { buildQrSvgData } from '../utils/qrMatrix';
import GoldButton from '../components/GoldButton';
import GlassBackground from '../components/GlassBackground';
import CardDecorElements from '../components/CardDecorElements';
import StudioMascotKit from '../components/StudioMascotKit';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import { Typography } from '../theme';

const EMPTY_LIST = [];

function SmoothPressable({
  children,
  onPress,
  style,
  hitSlop,
  scaleTo = 0.982,
  disabled = false,
  accessibilityLabel,
}) {
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [opacityAnim] = useState(() => new Animated.Value(1));

  const animateIn = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: scaleTo,
        friction: 8,
        tension: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.9,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 210,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={animateIn}
      onPressOut={animateOut}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[
          style,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

async function copyTextToClipboard(text) {
  if (!text) return false;
  try {
    const turboClipboard = TurboModuleRegistry?.get?.('Clipboard');
    if (turboClipboard?.setString) {
      turboClipboard.setString(text);
      return true;
    }
    if (NativeModules?.Clipboard?.setString) {
      NativeModules.Clipboard.setString(text);
      return true;
    }
    if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback to share sheet if direct clipboard bridge is unavailable
  }
  try {
    await Share.share({ message: text });
    return true;
  } catch {
    return false;
  }
}

function formatSessionSchedule(dateStr, timeStr) {
  if (!dateStr) return 'Not set by studio';
  const rawDate = String(dateStr).trim();
  let formattedDate = rawDate;
  const parsed = new Date(rawDate);
  if (!Number.isNaN(parsed.getTime())) {
    formattedDate = parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  if (timeStr && String(timeStr).trim()) {
    return `${formattedDate} · ${String(timeStr).trim()}`;
  }
  return formattedDate;
}

function formatPaymentLabel(booking) {
  if (!booking) return 'Not set by studio';
  if (booking.payment_status) {
    return String(booking.payment_status)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  if (booking.paymentStatus) {
    return String(booking.paymentStatus)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  if (booking.down_payment_confirmed) return 'Down payment confirmed';
  return 'Not set by studio';
}

function resolveDisplayLocation(cachedItem, liveBooking) {
  if (liveBooking?.location && String(liveBooking.location).trim()) {
    return String(liveBooking.location).trim();
  }
  if (liveBooking?.location_address && String(liveBooking.location_address).trim()) {
    return String(liveBooking.location_address).trim();
  }
  if (liveBooking?.studio_location && String(liveBooking.studio_location).trim()) {
    return String(liveBooking.studio_location).trim();
  }
  if (cachedItem?.location && String(cachedItem.location).trim()) {
    return String(cachedItem.location).trim();
  }
  return 'Not set by studio';
}

function DetailRow({ label, value, isDark, colors }) {
  return (
    <View style={styles.detailRow}>
      <Text
        style={[
          styles.detailLabel,
          { color: isDark ? 'rgba(214, 222, 235, 0.72)' : '#6C6458' },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.detailValue,
          { color: colors.text.primary },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function BookingPassCard({
  item,
  isDark,
  colors,
  cardGradient,
  cardBorder,
  onPress,
  onDelete,
}) {
  const bookingRef = item.bookingNumber || `#${(item.token || '').slice(0, 8).toUpperCase()}`;
  const clientName = item.clientName || 'Studio Client';
  const serviceName = item.serviceName || 'Photography Session';

  const headerStripColors = isDark
    ? ['#161A26', '#0E1018']
    : ['#262018', '#17130E'];

  const avatarBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F5E7CE';
  const avatarBorder = isDark ? 'rgba(230, 196, 126, 0.24)' : 'rgba(176, 125, 30, 0.22)';

  return (
    <SmoothPressable
      onPress={() => onPress(item)}
      scaleTo={0.985}
      style={styles.cardShadowWrap}
      accessibilityLabel={`Open booking details for ${bookingRef}`}
    >
      <View
        style={[
          styles.passCardOuter,
          {
            borderColor: cardBorder,
            shadowColor: isDark ? '#000000' : '#4E4332',
          },
        ]}
      >
        {/* Contrasting dark header strip matching reference card anatomy */}
        <LinearGradient
          colors={headerStripColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.passHeaderStrip}
        >
          <Text style={styles.passBookingNumber} numberOfLines={1}>
            {bookingRef}
          </Text>

          <View style={styles.passHeaderActions}>
            <SmoothPressable
              onPress={() => onDelete(item)}
              hitSlop={10}
              scaleTo={0.86}
              style={styles.passDeleteBtn}
              accessibilityLabel={`Remove booking ${bookingRef}`}
            >
              <Trash2 size={14} color="rgba(244, 240, 232, 0.72)" strokeWidth={2} />
            </SmoothPressable>
            <ChevronRight size={18} color="#E6C47E" strokeWidth={2.2} />
          </View>
        </LinearGradient>

        {/* Home/Scanner gradient card body */}
        <LinearGradient
          colors={cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.passBodyGradient}
        >
          <CardDecorElements variant="list" isDark={isDark} />

          <View style={styles.passBodyRow}>
            <View
              style={[
                styles.mascotAvatarFrame,
                {
                  backgroundColor: avatarBg,
                  borderColor: avatarBorder,
                },
              ]}
            >
              <StudioMascotKit pose="welcome" size={40} interactive={false} />
            </View>

            <View style={styles.passTextBlock}>
              <Text
                style={[styles.passClientName, { color: colors.text.primary }]}
                numberOfLines={1}
              >
                {clientName}
              </Text>
              <Text
                style={[styles.passServiceName, { color: colors.text.secondary }]}
                numberOfLines={2}
              >
                {serviceName}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </SmoothPressable>
  );
}

function BookingDetailsModal({
  visible,
  cachedItem,
  liveBooking,
  isDark,
  colors,
  cardGradient,
  cardBorder,
  trackingLoading,
  onClose,
  onTrackOrder,
}) {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.95));
  const [copiedToken, setCopiedToken] = useState(null);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  if (!cachedItem) return null;

  const activeToken = liveBooking?.booking_token || cachedItem.token || '';
  const bookingNumber =
    liveBooking?.booking_number ||
    cachedItem.bookingNumber ||
    `#${activeToken.slice(0, 8).toUpperCase()}`;
  const clientName =
    liveBooking?.profile?.full_name ||
    liveBooking?.client_name ||
    cachedItem.clientName ||
    'Studio Client';
  const serviceTitle =
    liveBooking?.services?.name ||
    liveBooking?.service?.name ||
    cachedItem.serviceName ||
    'Not set by studio';
  const locationText = resolveDisplayLocation(cachedItem, liveBooking);
  const scheduleText = formatSessionSchedule(
    liveBooking?.session_date || liveBooking?.event_date || cachedItem.sessionDate,
    liveBooking?.session_time || liveBooking?.preferred_time || cachedItem.sessionTime
  );
  const paymentText = formatPaymentLabel(liveBooking || cachedItem);
  const qrData = buildQrSvgData(activeToken || bookingNumber);
  const copied = Boolean(activeToken && copiedToken === activeToken);

  const handleCopyCode = async () => {
    if (!activeToken) return;
    Haptics.selectionAsync().catch(() => {});
    const ok = await copyTextToClipboard(activeToken);
    if (ok) {
      setCopiedToken(activeToken);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopiedToken(null);
      }, 2000);
    }
  };

  const eyebrowColor = isDark ? '#F2DDB0' : colors?.gold?.light || '#996515';
  const closeBg = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(24, 20, 16, 0.07)';
  const qrBoxBorder = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(218, 210, 196, 0.85)';
  const bannerBg = colors?.gold?.bg || (isDark ? 'rgba(217, 180, 108, 0.13)' : 'rgba(235, 208, 130, 0.28)');
  const bannerBorder = isDark
    ? 'rgba(217, 180, 108, 0.28)'
    : colors?.gold?.border || 'rgba(176, 125, 30, 0.20)';
  const copyBtnBg = copied
    ? '#16A34A'
    : isDark
      ? '#E6C47E'
      : '#181410';
  const copyBtnTextColor = copied
    ? '#FFFFFF'
    : isDark
      ? '#181410'
      : '#FFFFFF';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <BlurView
          intensity={isDark ? 36 : 28}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[
            styles.modalCardWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.modalCard,
              {
                borderColor: cardBorder,
                shadowColor: isDark ? '#000000' : '#3A3228',
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              bounces={false}
            >
              {/* Modal Top Row */}
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalEyebrow, { color: eyebrowColor }]}>
                  BOOKING DETAILS
                </Text>
                <SmoothPressable
                  onPress={onClose}
                  hitSlop={10}
                  scaleTo={0.9}
                  style={[styles.modalCloseBtn, { backgroundColor: closeBg }]}
                  accessibilityLabel="Close booking details"
                >
                  <X size={16} color={colors.text.primary} strokeWidth={2.2} />
                </SmoothPressable>
              </View>

              {/* QR Code Container */}
              <View style={styles.qrSection}>
                <View
                  style={[
                    styles.qrFrame,
                    {
                      borderColor: qrBoxBorder,
                      shadowColor: isDark ? '#000000' : '#6A5B44',
                    },
                  ]}
                >
                  {qrData ? (
                    <Svg
                      width={132}
                      height={132}
                      viewBox={`-1 -1 ${qrData.size + 2} ${qrData.size + 2}`}
                    >
                      <Path d={qrData.path} fill="#181410" />
                    </Svg>
                  ) : null}
                </View>

                <Text
                  style={[styles.modalBookingId, { color: colors.text.primary }]}
                  selectable
                >
                  {bookingNumber}
                </Text>
              </View>

              {/* Key-Value Details */}
              <View style={styles.detailsGroup}>
                <DetailRow
                  label="Name"
                  value={clientName}
                  isDark={isDark}
                  colors={colors}
                />
                <DetailRow
                  label="Package"
                  value={serviceTitle}
                  isDark={isDark}
                  colors={colors}
                />
                <DetailRow
                  label="Location"
                  value={locationText}
                  isDark={isDark}
                  colors={colors}
                />
                <DetailRow
                  label="Session Schedule"
                  value={scheduleText}
                  isDark={isDark}
                  colors={colors}
                />
                <DetailRow
                  label="Payment"
                  value={paymentText}
                  isDark={isDark}
                  colors={colors}
                />
              </View>

              {/* Highlighted Booking Code Banner */}
              <View
                style={[
                  styles.codeBanner,
                  {
                    backgroundColor: bannerBg,
                    borderColor: bannerBorder,
                  },
                ]}
              >
                <Text style={[styles.codeBannerTitle, { color: colors.text.primary }]}>
                  {'Booking\nCode'}
                </Text>

                <Text
                  style={[
                    styles.codeBannerToken,
                    { color: isDark ? '#D5DCE8' : '#4E473D' },
                  ]}
                  selectable
                  numberOfLines={2}
                >
                  {activeToken}
                </Text>

                <SmoothPressable
                  onPress={handleCopyCode}
                  scaleTo={0.92}
                  style={[styles.copyPillBtn, { backgroundColor: copyBtnBg }]}
                  accessibilityLabel="Copy booking code"
                >
                  <View style={styles.copyPillContent}>
                    {copied ? (
                      <Check size={12} color={copyBtnTextColor} strokeWidth={2.5} />
                    ) : null}
                    <Text style={[styles.copyPillText, { color: copyBtnTextColor }]}>
                      {copied ? 'Copied' : 'Copy'}
                    </Text>
                  </View>
                </SmoothPressable>
              </View>

              {/* Subtle Source Caption */}
              <Text
                style={[
                  styles.sourceCaption,
                  { color: isDark ? 'rgba(214, 222, 235, 0.62)' : '#6C6458' },
                ]}
              >
                Source: Studio booking system
              </Text>

              {/* Primary CTA: Track Order */}
              <GoldButton
                loading={trackingLoading}
                onPress={onTrackOrder}
                style={styles.trackOrderBtn}
              >
                Track Order
              </GoldButton>
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

function BookingsPillHeader({
  isDark,
  colors,
  gradients,
  topInset,
  spinAnim,
  onPressRefresh,
  onPressScan,
}) {
  const pillGradient = isDark
    ? ['#242029', '#151B24']
    : ['rgba(255, 253, 250, 0.94)', 'rgba(241, 246, 252, 0.90)'];
  const pillBorder = isDark
    ? 'rgba(180, 198, 224, 0.20)'
    : 'rgba(255, 255, 255, 0.88)';
  const refreshBg = isDark ? 'rgba(255, 255, 255, 0.10)' : '#FFFFFF';
  const refreshBorder = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(220, 221, 230, 0.85)';
  const goldCircleColors = gradients?.gold || ['#E6C47E', '#B07D1E', '#86600F'];

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  return (
    <View
      style={[
        styles.pillHeaderShadow,
        {
          marginTop: Math.max(topInset, 10) + 8,
          shadowColor: isDark ? '#000000' : '#4E4332',
        },
      ]}
    >
      <View style={[styles.pillHeaderFrame, { borderColor: pillBorder }]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 42 : 28}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <LinearGradient
          colors={pillGradient}
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
          style={styles.pillSpecular}
          pointerEvents="none"
        />

        <View style={styles.pillHeaderRow}>
          <View style={styles.pillHeaderTextCol}>
            <Text style={[styles.screenTitle, { color: colors.text.primary }]} numberOfLines={1}>
              My Bookings
            </Text>
            <Text style={[styles.screenSubtitle, { color: colors.text.secondary }]} numberOfLines={1}>
              Your booking details.
            </Text>
          </View>

          <View style={styles.pillHeaderActions}>
            <SmoothPressable
              onPress={onPressRefresh}
              scaleTo={0.9}
              style={styles.circleBtnShadow}
              accessibilityLabel="Refresh saved bookings"
            >
              <View
                style={[
                  styles.circleActionBtn,
                  {
                    backgroundColor: refreshBg,
                    borderColor: refreshBorder,
                  },
                ]}
              >
                <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
                  <RotateCcw
                    size={18}
                    color={isDark ? colors.text.primary : '#181410'}
                    strokeWidth={2}
                  />
                </Animated.View>
              </View>
            </SmoothPressable>

            <SmoothPressable
              onPress={onPressScan}
              scaleTo={0.9}
              style={styles.circleBtnShadow}
              accessibilityLabel="Scan Booking QR"
            >
              <LinearGradient
                colors={goldCircleColors}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={styles.circleGoldBtn}
              >
                <QrCode size={19} color="#181410" strokeWidth={2.1} />
              </LinearGradient>
            </SmoothPressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function NoOrdersDefaultCard({
  isDark,
  colors,
  cardGradient,
  cardBorder,
  onPressScan,
}) {
  const badgeBg = isDark ? 'rgba(217, 180, 108, 0.14)' : 'rgba(176, 125, 30, 0.10)';
  const badgeBorder = isDark ? 'rgba(217, 180, 108, 0.28)' : 'rgba(176, 125, 30, 0.22)';
  const haloBg = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.62)';
  const haloBorder = isDark ? 'rgba(230, 196, 126, 0.26)' : 'rgba(176, 125, 30, 0.24)';
  const featureBg = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.56)';
  const featureBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(176, 125, 30, 0.14)';
  const accentColor = isDark ? '#F2DDB0' : '#996515';

  return (
    <LinearGradient
      colors={cardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.emptyCard,
        {
          borderColor: cardBorder,
          shadowColor: isDark ? '#000000' : '#4E4332',
        },
      ]}
    >
      <CardDecorElements variant="hero" isDark={isDark} />

      <View
        style={[
          styles.emptyEyebrowPill,
          { backgroundColor: badgeBg, borderColor: badgeBorder },
        ]}
      >
        <ScanLine size={12} color={accentColor} strokeWidth={2.1} />
        <Text style={[styles.emptyEyebrowText, { color: accentColor }]}>
          NO DETECTED ORDERS
        </Text>
      </View>

      <View
        style={[
          styles.emptyMascotHalo,
          { backgroundColor: haloBg, borderColor: haloBorder },
        ]}
      >
        <StudioMascotKit pose="hold_qr" size={86} interactive />
      </View>

      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
        No orders scanned yet
      </Text>
      <Text style={[styles.emptyBody, { color: colors.text.secondary }]}>
        Scan the QR code from your E-Kodak confirmation pass or enter a Booking ID to keep your passes and live tracking here.
      </Text>

      <View style={styles.emptyFeaturesList}>
        <View
          style={[
            styles.emptyFeatureRow,
            { backgroundColor: featureBg, borderColor: featureBorder },
          ]}
        >
          <QrCode size={15} color={accentColor} strokeWidth={2} />
          <Text style={[styles.emptyFeatureText, { color: colors.text.primary }]}>
            Instant studio pass QR & Booking Code
          </Text>
        </View>

        <View
          style={[
            styles.emptyFeatureRow,
            { backgroundColor: featureBg, borderColor: featureBorder },
          ]}
        >
          <Clock size={15} color={accentColor} strokeWidth={2} />
          <Text style={[styles.emptyFeatureText, { color: colors.text.primary }]}>
            Live session schedule & edit milestones
          </Text>
        </View>

        <View
          style={[
            styles.emptyFeatureRow,
            { backgroundColor: featureBg, borderColor: featureBorder },
          ]}
        >
          <ShieldCheck size={15} color={accentColor} strokeWidth={2} />
          <Text style={[styles.emptyFeatureText, { color: colors.text.primary }]}>
            Saved on this device for offline viewing
          </Text>
        </View>
      </View>

      <GoldButton
        onPress={onPressScan}
        style={styles.emptyActionBtn}
      >
        Scan Booking QR
      </GoldButton>
    </LinearGradient>
  );
}

export default function SavedBookingsScreen({ navigation }) {
  const { isDark, isSage, colors, gradients } = useTheme();
  const { showAlert, showProcess, waitProcessDuration } = useDialog();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState(EMPTY_LIST);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSpinAnim] = useState(() => new Animated.Value(0));

  const [selectedItem, setSelectedItem] = useState(null);
  const [liveBooking, setLiveBooking] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const cardGradient =
    gradients?.card ||
    (isDark ? ['#242029', '#151B24'] : ['#FAF2EA', '#E5EEF7']);
  const cardBorder = isDark
    ? 'rgba(180, 198, 224, 0.20)'
    : isSage
      ? '#D7DDD1'
      : '#DCDDE6';

  const loadBookings = useCallback(async () => {
    const list = await getSavedBookings();
    setBookings(list);
  }, []);

  useEffect(() => {
    let active = true;
    getSavedBookings().then((list) => {
      if (active) setBookings(list);
    });
    const unsub = navigation.addListener('focus', loadBookings);
    return () => {
      active = false;
      if (typeof unsub === 'function') unsub();
    };
  }, [navigation, loadBookings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    refreshSpinAnim.setValue(0);
    Animated.timing(refreshSpinAnim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    await loadBookings();
    setRefreshing(false);
  };

  const handleOpenDetails = async (item) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedItem(item);
    setLiveBooking(null);

    try {
      const { data: fresh } = await fetchBookingByToken(item.token);
      if (fresh) {
        setLiveBooking(fresh);
        await saveBookingToken(item.token, fresh);
        loadBookings();
      }
    } catch {
      // Offline / network fallback cleanly keeps cached fields visible
    }
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
    setLiveBooking(null);
    setTrackingLoading(false);
  };

  const handleTrackOrder = async () => {
    if (!selectedItem) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTrackingLoading(true);
    const token = selectedItem.token;
    const offlineBooking = {
      booking_token: selectedItem.token,
      booking_number: selectedItem.bookingNumber,
      status: selectedItem.status || 'PENDING',
      session_date: selectedItem.sessionDate,
      session_time: selectedItem.sessionTime,
      location: selectedItem.location,
      payment_status: selectedItem.paymentStatus,
      services: { name: selectedItem.serviceName },
      service: { name: selectedItem.serviceName },
      profile: { full_name: selectedItem.clientName },
      _offline: true,
    };

    try {
      let bookingToOpen = liveBooking;
      if (!bookingToOpen) {
        const res = await fetchBookingByToken(token);
        bookingToOpen = res?.data || null;
      }
      setTrackingLoading(false);
      handleCloseDetails();
      navigation.navigate('BookingTracker', {
        booking: bookingToOpen || offlineBooking,
        token,
      });
    } catch {
      setTrackingLoading(false);
      handleCloseDetails();
      navigation.navigate('BookingTracker', {
        booking: offlineBooking,
        token,
      });
    }
  };

  const handleDelete = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    showAlert(
      'Remove Booking Pass',
      `Remove ${item.bookingNumber || 'this booking'} from your device? You can always re-scan the QR pass later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            showProcess('Removing Pass', 'Updating your saved booking passes...');
            const [updated] = await Promise.all([
              removeSavedBooking(item.token),
              waitProcessDuration(1100),
            ]);
            setBookings(updated);
            if (selectedItem?.token === item.token) {
              handleCloseDetails();
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            showAlert(
              'Pass Removed',
              `${item.bookingNumber || 'Booking pass'} has been removed from this device.`,
              [{ text: 'Done' }],
              { type: 'success' }
            );
          },
        },
      ],
      { type: 'danger' }
    );
  };

  const handleOpenScanner = () => {
    Haptics.selectionAsync().catch(() => {});
    navigation.navigate('Scanner');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base }]}>
      <GlassBackground />

      <View style={styles.foreground} collapsable={false}>
        {/* Topmost Floating Glass-Pill Header Card */}
        <BookingsPillHeader
          isDark={isDark}
          colors={colors}
          gradients={gradients}
          topInset={insets.top}
          spinAnim={refreshSpinAnim}
          onPressRefresh={handleRefresh}
          onPressScan={handleOpenScanner}
        />

        <FlatList
        data={bookings}
        keyExtractor={(item) => item.token}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 104 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.gold.DEFAULT}
            colors={[colors.gold.DEFAULT]}
          />
        }
        ListHeaderComponent={
          bookings.length > 0 ? (
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeaderLabel, { color: colors.text.muted }]}>
                SAVED PASSES
              </Text>
              <Text style={[styles.sectionCountText, { color: colors.text.secondary }]}>
                {bookings.length} {bookings.length === 1 ? 'order' : 'orders'}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <NoOrdersDefaultCard
            isDark={isDark}
            colors={colors}
            cardGradient={cardGradient}
            cardBorder={cardBorder}
            onPressScan={handleOpenScanner}
          />
        }
        renderItem={({ item }) => (
          <BookingPassCard
            item={item}
            isDark={isDark}
            colors={colors}
            cardGradient={cardGradient}
            cardBorder={cardBorder}
            onPress={handleOpenDetails}
            onDelete={handleDelete}
          />
        )}
      />

      <BookingDetailsModal
        visible={Boolean(selectedItem)}
        cachedItem={selectedItem}
        liveBooking={liveBooking}
        isDark={isDark}
        colors={colors}
        cardGradient={cardGradient}
        cardBorder={cardBorder}
        trackingLoading={trackingLoading}
        onClose={handleCloseDetails}
        onTrackOrder={handleTrackOrder}
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  foreground: {
    flex: 1,
    position: 'relative',
    zIndex: 2,
  },
  pillHeaderShadow: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 28,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  pillHeaderFrame: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  pillSpecular: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
  },
  pillHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 1,
  },
  pillHeaderTextCol: {
    flex: 1,
  },
  screenTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.35,
    includeFontPadding: false,
  },
  screenSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    includeFontPadding: false,
  },
  pillHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleBtnShadow: {
    borderRadius: 22,
    backgroundColor: 'transparent',
    shadowColor: '#2E261B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  circleActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleGoldBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  emptyActionBtn: {
    width: '100%',
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeaderLabel: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 11.5,
    lineHeight: 15,
    letterSpacing: 1.2,
    includeFontPadding: false,
  },
  sectionCountText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
  },

  // Pass Card
  cardShadowWrap: {
    marginBottom: 14,
  },
  passCardOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  passHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  passBookingNumber: {
    fontFamily: Typography.fontHeading,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0.3,
    color: '#F6F2EB',
    includeFontPadding: false,
    flex: 1,
  },
  passHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  passDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  passBodyGradient: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  passBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mascotAvatarFrame: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  passTextBlock: {
    flex: 1,
  },
  passClientName: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 15.5,
    lineHeight: 21,
    includeFontPadding: false,
  },
  passServiceName: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    includeFontPadding: false,
  },

  // Empty state (No Detected Orders Default UI)
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyEyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginBottom: 14,
  },
  emptyEyebrowText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    includeFontPadding: false,
  },
  emptyMascotHalo: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: 19.5,
    lineHeight: 25,
    marginTop: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  emptyBody: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
    includeFontPadding: false,
  },
  emptyFeaturesList: {
    width: '100%',
    gap: 8,
    marginTop: 16,
  },
  emptyFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emptyFeatureText: {
    flex: 1,
    fontFamily: Typography.fontBodyMedium,
    fontSize: 12.5,
    lineHeight: 17,
    includeFontPadding: false,
  },

  // Booking Details Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 10, 8, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  modalCardWrapper: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '92%',
  },
  modalCard: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 26,
    elevation: 14,
  },
  modalScrollContent: {
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalEyebrow: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
    includeFontPadding: false,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrFrame: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  modalBookingId: {
    fontFamily: Typography.fontHeading,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.3,
    marginTop: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  detailsGroup: {
    gap: 11,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    lineHeight: 19,
    includeFontPadding: false,
  },
  detailValue: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'right',
    flex: 1,
    includeFontPadding: false,
  },
  codeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 12,
  },
  codeBannerTitle: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 13,
    lineHeight: 17,
    includeFontPadding: false,
  },
  codeBannerToken: {
    flex: 1,
    fontFamily: Typography.fontMono,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
  },
  copyPillBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyPillText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 12.5,
    lineHeight: 16,
    includeFontPadding: false,
  },
  sourceCaption: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 14,
    includeFontPadding: false,
  },
  trackOrderBtn: {
    width: '100%',
  },
});
