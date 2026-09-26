/**
 * BookingTrackerScreen.jsx
 * Luxury Live Booking Status Tracker for E-Kodak Photography Studio.
 * Features:
 * - Playfair Display & Inter typography
 * - Live real-time Supabase status subscription
 * - Editorial session dossier card with gold accents
 * - Upgraded MilestoneStepper with animated nodes
 * - Delivery, pickup, and physical output details
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Calendar, MapPin, Phone, Camera, Package,
  QrCode, RefreshCw, Bookmark, BookmarkCheck,
  ChevronDown, ChevronUp, Clock, User, Sparkles,
} from 'lucide-react-native';

import { fetchBookingByToken, subscribeToBookingUpdates } from '../services/bookingService';
import {
  saveBookingToken, removeSavedBooking, getSavedBookings,
  saveCustomerProfileFromBooking,
} from '../services/storageService';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import MilestoneStepper from '../components/MilestoneStepper';
import GoldButton from '../components/GoldButton';
import StudioMascotKit from '../components/StudioMascotKit';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius, Shadow } from '../theme';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return dateStr; }
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const d = new Date(); d.setHours(+h, +m);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return timeStr; }
}

// ── Delivery Panel ───────────────────────────────────────────────────────────

function DeliveryPanel({ deliveries, colors, styles }) {
  if (!deliveries?.length) return null;
  const s = styles || getStyles(colors);

  return (
    <GlassCard highlight style={s.section}>
      <View style={s.sectionHeader}>
        <View style={s.sectionHeaderLeft}>
          <Package size={16} color={colors.gold.DEFAULT} />
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Print Output & Delivery</Text>
        </View>
      </View>
      {deliveries.map((d) => (
        <View key={d.id} style={s.deliveryRow}>
          <View style={s.deliveryTop}>
            <Text style={[s.deliveryType, { color: colors.text.primary }]}>{d.delivery_type?.replace('_', ' ')}</Text>
            <Text
              style={[
                s.deliveryStatus,
                { color: d.status === 'DELIVERED' ? '#10B981' : colors.gold.light },
              ]}
            >
              {d.status}
            </Text>
          </View>
          {d.tracking_number && (
            <Text style={[s.tracking, { color: colors.text.secondary }]}>Tracking No: {d.tracking_number}</Text>
          )}
          {d.digital_access_expires_at && (
            <Text style={[s.digitalExpiry, { color: colors.text.muted }]}>
              Digital gallery access expires: {formatDate(d.digital_access_expires_at)}
            </Text>
          )}
        </View>
      ))}
    </GlassCard>
  );
}

// ── Info Row Sub-component ───────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, highlight = false, colors, styles }) {
  const s = styles || getStyles(colors);
  return (
    <View style={s.infoRow}>
      <View style={[s.infoIconWrapper, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
        <Icon size={14} color={colors.gold.light} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.infoLabel, { color: colors.text.secondary }]}>{label}</Text>
        <Text style={[s.infoValue, { color: colors.text.primary }, highlight && { color: colors.gold.DEFAULT }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function BookingTrackerScreen({ route, navigation }) {
  const { isDark, colors, gradients } = useTheme();
  const styles = getStyles(colors);
  const { booking: initialBooking, token: rawToken } = route.params || {};
  const effectiveToken = rawToken || initialBooking?.booking_token || initialBooking?.booking_number || initialBooking?.id || '';

  const [booking, setBooking]         = useState(initialBooking || {});
  const [refreshing, setRefreshing]   = useState(false);
  const [isSaved, setIsSaved]         = useState(false);
  const [stepperOpen, setStepperOpen] = useState(true);
  const [mascotAlert, setMascotAlert] = useState(null);

  // Luminous emerald pulse for live indicator
  const livePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkIfSaved();
    if (booking?.id) {
      saveCustomerProfileFromBooking(booking);
      const unsubscribe = subscribeToBookingUpdates(booking.id, (updated) => {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        setBooking((prev) => ({ ...prev, ...updated }));
      });

      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(livePulse, { toValue: 0.35, duration: 800, useNativeDriver: true }),
          Animated.timing(livePulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      anim.start();

      return () => {
        unsubscribe();
        anim.stop();
      };
    }
  }, [booking?.id, effectiveToken]);

  const checkIfSaved = async () => {
    if (!effectiveToken) return;
    const saved = await getSavedBookings();
    setIsSaved(saved.some((b) => b.token === effectiveToken || (initialBooking?.booking_number && b.bookingNumber === initialBooking.booking_number)));
  };

  const onRefresh = useCallback(async () => {
    if (!effectiveToken) return;
    setRefreshing(true);
    const { data } = await fetchBookingByToken(effectiveToken);
    if (data) setBooking(data);
    setRefreshing(false);
  }, [effectiveToken]);

  const toggleSave = async () => {
    if (!effectiveToken) return;
    try {
      await Haptics.selectionAsync();
    } catch {}
    if (isSaved) {
      await removeSavedBooking(effectiveToken);
      setIsSaved(false);
      setMascotAlert({
        pose: 'inspect',
        message: 'Pass removed from your saved list.',
      });
    } else {
      await saveBookingToken(effectiveToken, booking);
      setIsSaved(true);
      setMascotAlert({
        pose: 'celebrate',
        message: 'Pass saved! You can now access it anytime.',
      });
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.base }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg.base} />

      {/* ── Editorial Header ── */}
      <LinearGradient
        colors={gradients.darkStudio}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { borderBottomColor: colors.gold.border }]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.bg.card, borderColor: colors.gold.border }]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
            Pass #{booking.booking_number}
          </Text>
          {/* Live Studio Sync Pill */}
          <View style={styles.liveRow}>
            <Animated.View style={[styles.liveDot, { opacity: livePulse }]} />
            <Text style={styles.liveText}>LIVE STUDIO SYNC</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={toggleSave}
          style={[styles.actionBtn, { backgroundColor: colors.bg.card, borderColor: colors.gold.border }]}
          activeOpacity={0.7}
        >
          {isSaved ? (
            <BookmarkCheck size={20} color={colors.gold.DEFAULT} />
          ) : (
            <Bookmark size={20} color={colors.text.muted} />
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold.DEFAULT}
            colors={[colors.gold.DEFAULT]}
          />
        }
      >
        {/* Mascot Alert Overlay */}
        {mascotAlert && (
          <View style={styles.mascotAlertOverlay}>
            <StudioMascotKit
              pose={mascotAlert.pose}
              size={120}
              speechText={mascotAlert.message}
              interactive={false}
            />
            <TouchableOpacity
              style={[styles.mascotAlertCloseBtn, { borderColor: colors.gold.border }]}
              onPress={() => setMascotAlert(null)}
            >
              <Text style={[styles.mascotAlertCloseText, { color: colors.gold.DEFAULT }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Session Dossier Card ── */}
        <GlassCard glow highlight style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroLabel, { color: colors.text.secondary }]}>CURRENT SESSION PHASE</Text>
              <StatusBadge status={booking.status} size="md" style={{ marginTop: 6 }} />
            </View>
            <View style={[styles.qrBadge, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
              <QrCode size={26} color={colors.gold.light} strokeWidth={1.5} />
            </View>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.gold.border }]} />

          {/* Session Service Title */}
          {booking.services?.name && (
            <View style={styles.serviceHeader}>
              <Text style={[styles.serviceSubtitle, { color: colors.gold.DEFAULT }]}>SESSION PACKAGE</Text>
              <Text style={[styles.serviceTitle, { color: colors.text.primary }]}>{booking.services.name}</Text>
            </View>
          )}

          {/* Session Metadata Grid */}
          <View style={styles.infoGrid}>
            <InfoRow
              icon={Calendar}
              label="Session Schedule"
              value={`${formatDate(booking.session_date)}${booking.session_time ? ` · ${formatTime(booking.session_time)}` : ''}`}
              highlight
              colors={colors}
            />

            <InfoRow
              icon={MapPin}
              label="Studio Location"
              value={
                booking.location_type === 'STUDIO'
                  ? 'E-Kodak Main Studio · Cebu'
                  : booking.location_address || 'On-site / Outdoor'
              }
              colors={colors}
            />

            {booking.photographer?.full_name && (
              <InfoRow
                icon={Camera}
                label="Lead Photographer"
                value={booking.photographer.full_name}
                colors={colors}
              />
            )}
          </View>
        </GlassCard>

        {/* ── Progress Timeline Stepper ── */}
        <GlassCard highlight style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setStepperOpen(!stepperOpen)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <RefreshCw size={15} color={colors.gold.DEFAULT} />
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Studio Progress Timeline</Text>
            </View>
            <View style={[styles.chevronPill, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
              {stepperOpen ? (
                <ChevronUp size={14} color={colors.gold.light} />
              ) : (
                <ChevronDown size={14} color={colors.gold.light} />
              )}
            </View>
          </TouchableOpacity>

          {stepperOpen && (
            <MilestoneStepper status={booking.status} />
          )}
        </GlassCard>

        {/* ── Delivery & Prints Panel ── */}
        <DeliveryPanel deliveries={booking.booking_deliveries} colors={colors} />

        {/* ── Client Details Card ── */}
        {booking.profile && (
          <GlassCard highlight style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <User size={15} color={colors.gold.DEFAULT} />
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Client Information</Text>
              </View>
            </View>
            <Text style={[styles.clientName, { color: colors.text.primary }]}>{booking.profile.full_name}</Text>
            {booking.profile.phone && (
              <View style={styles.clientRow}>
                <Phone size={13} color={colors.gold.light} />
                <Text style={[styles.clientDetail, { color: colors.text.secondary }]}>{booking.profile.phone}</Text>
              </View>
            )}
            {booking.profile.email && (
              <Text style={[styles.clientDetailMuted, { color: colors.text.muted }]}>{booking.profile.email}</Text>
            )}
          </GlassCard>
        )}

        {/* ── Scan Another Pass Action ── */}
        <GoldButton
          variant="outline"
          icon={QrCode}
          onPress={() => navigation.replace('Scanner')}
          style={styles.scanAnotherBtn}
        >
          Scan Another QR Pass
        </GoldButton>

        <View style={{ height: 36 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: Spacing[4],
    paddingHorizontal: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.gold.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: colors.text.primary,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.status.ready,
  },
  liveText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9.5,
    color: colors.status.ready,
    letterSpacing: 1,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing[4],
    gap: Spacing[4],
  },

  // Hero Dossier Card
  heroCard: {
    padding: Spacing[5],
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 1.2,
  },
  qrBadge: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: colors.gold.bg,
    borderWidth: 1,
    borderColor: colors.gold.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.gold.border,
    marginVertical: Spacing[4],
  },

  serviceHeader: {
    marginBottom: Spacing[4],
  },
  serviceSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 10,
    color: colors.gold.light,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  serviceTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    color: colors.text.primary,
  },

  infoGrid: {
    gap: Spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  infoIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.gold.bg,
    borderWidth: 1,
    borderColor: colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  infoLabel: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  infoValue: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  infoValueHighlight: {
    color: colors.text.primary,
    fontFamily: Typography.fontBodySemi,
  },

  // Sections
  section: {
    padding: Spacing[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: colors.text.primary,
  },
  chevronPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gold.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Delivery Rows
  deliveryRow: {
    borderTopWidth: 1,
    borderTopColor: colors.gold.border,
    paddingTop: Spacing[3],
    marginTop: Spacing[2],
    gap: 3,
  },
  deliveryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryType: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.sm,
    color: colors.gold.light,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deliveryStatus: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.xs,
  },
  tracking: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
  },
  digitalExpiry: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.neutral[500],
  },

  // Client Details
  clientName: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: colors.text.primary,
    marginBottom: 4,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  clientDetail: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    color: colors.text.secondary,
  },
  clientDetailMuted: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.neutral[500],
  },

  scanAnotherBtn: {
    marginTop: Spacing[2],
  },
  mascotAlertOverlay: {
    padding: Spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
  },
  mascotAlertCloseBtn: {
    marginTop: Spacing[4],
    paddingVertical: 8,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  mascotAlertCloseText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.sm,
  },
});
