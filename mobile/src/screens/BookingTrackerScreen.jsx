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
import { saveBookingToken, removeSavedBooking, getSavedBookings } from '../services/storageService';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import MilestoneStepper from '../components/MilestoneStepper';
import GoldButton from '../components/GoldButton';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';

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

function DeliveryPanel({ deliveries }) {
  if (!deliveries?.length) return null;

  return (
    <GlassCard highlight style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Package size={16} color={Colors.gold.DEFAULT} />
          <Text style={styles.sectionTitle}>Print Output & Delivery</Text>
        </View>
      </View>
      {deliveries.map((d) => (
        <View key={d.id} style={styles.deliveryRow}>
          <View style={styles.deliveryTop}>
            <Text style={styles.deliveryType}>{d.delivery_type?.replace('_', ' ')}</Text>
            <Text
              style={[
                styles.deliveryStatus,
                { color: d.status === 'DELIVERED' ? Colors.status.ready : Colors.gold.light },
              ]}
            >
              {d.status}
            </Text>
          </View>
          {d.tracking_number && (
            <Text style={styles.tracking}>Tracking No: {d.tracking_number}</Text>
          )}
          {d.digital_access_expires_at && (
            <Text style={styles.digitalExpiry}>
              Digital gallery access expires: {formatDate(d.digital_access_expires_at)}
            </Text>
          )}
        </View>
      ))}
    </GlassCard>
  );
}

// ── Info Row Sub-component ───────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, highlight = false }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrapper}>
        <Icon size={14} color={Colors.gold.light} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function BookingTrackerScreen({ route, navigation }) {
  const { booking: initialBooking, token } = route.params;
  const [booking, setBooking]         = useState(initialBooking);
  const [refreshing, setRefreshing]   = useState(false);
  const [isSaved, setIsSaved]         = useState(false);
  const [stepperOpen, setStepperOpen] = useState(true);

  // Luminous emerald pulse for live indicator
  const livePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkIfSaved();
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
  }, [booking.id]);

  const checkIfSaved = async () => {
    const saved = await getSavedBookings();
    setIsSaved(saved.some((b) => b.token === token));
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const { data } = await fetchBookingByToken(token);
    if (data) setBooking(data);
    setRefreshing(false);
  }, [token]);

  const toggleSave = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    if (isSaved) {
      await removeSavedBooking(token);
      setIsSaved(false);
    } else {
      await saveBookingToken(token, booking);
      setIsSaved(true);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg.base} />

      {/* ── Editorial Header ── */}
      <LinearGradient
        colors={Gradients.darkStudio}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={Colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
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
          style={styles.actionBtn}
          activeOpacity={0.7}
        >
          {isSaved ? (
            <BookmarkCheck size={20} color={Colors.gold.DEFAULT} />
          ) : (
            <Bookmark size={20} color={Colors.neutral[400]} />
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold.DEFAULT}
            colors={[Colors.gold.DEFAULT]}
          />
        }
      >
        {/* ── Session Dossier Card ── */}
        <GlassCard glow highlight style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>CURRENT SESSION PHASE</Text>
              <StatusBadge status={booking.status} size="md" style={{ marginTop: 6 }} />
            </View>
            <View style={styles.qrBadge}>
              <QrCode size={26} color={Colors.gold.light} strokeWidth={1.5} />
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Session Service Title */}
          {booking.services?.name && (
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceSubtitle}>SESSION PACKAGE</Text>
              <Text style={styles.serviceTitle}>{booking.services.name}</Text>
            </View>
          )}

          {/* Session Metadata Grid */}
          <View style={styles.infoGrid}>
            <InfoRow
              icon={Calendar}
              label="Session Schedule"
              value={`${formatDate(booking.session_date)}${booking.session_time ? ` · ${formatTime(booking.session_time)}` : ''}`}
              highlight
            />

            <InfoRow
              icon={MapPin}
              label="Studio Location"
              value={
                booking.location_type === 'STUDIO'
                  ? 'E-Kodak Main Studio · Cebu'
                  : booking.location_address || 'On-site / Outdoor'
              }
            />

            {booking.photographer?.full_name && (
              <InfoRow
                icon={Camera}
                label="Lead Photographer"
                value={booking.photographer.full_name}
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
              <RefreshCw size={15} color={Colors.gold.DEFAULT} />
              <Text style={styles.sectionTitle}>Studio Progress Timeline</Text>
            </View>
            <View style={styles.chevronPill}>
              {stepperOpen ? (
                <ChevronUp size={14} color={Colors.gold.light} />
              ) : (
                <ChevronDown size={14} color={Colors.gold.light} />
              )}
            </View>
          </TouchableOpacity>

          {stepperOpen && (
            <MilestoneStepper status={booking.status} />
          )}
        </GlassCard>

        {/* ── Delivery & Prints Panel ── */}
        <DeliveryPanel deliveries={booking.booking_deliveries} />

        {/* ── Client Details Card ── */}
        {booking.profile && (
          <GlassCard highlight style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <User size={15} color={Colors.gold.DEFAULT} />
                <Text style={styles.sectionTitle}>Client Information</Text>
              </View>
            </View>
            <Text style={styles.clientName}>{booking.profile.full_name}</Text>
            {booking.profile.phone && (
              <View style={styles.clientRow}>
                <Phone size={13} color={Colors.gold.dim} />
                <Text style={styles.clientDetail}>{booking.profile.phone}</Text>
              </View>
            )}
            {booking.profile.email && (
              <Text style={styles.clientDetailMuted}>{booking.profile.email}</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.base },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: Spacing[4],
    paddingHorizontal: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.gold.border,
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
    color: Colors.text.primary,
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
    backgroundColor: Colors.status.ready,
  },
  liveText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9.5,
    color: Colors.status.ready,
    letterSpacing: 1,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.gold.border,
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
    color: Colors.text.secondary,
    letterSpacing: 1.2,
  },
  qrBadge: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.gold.border,
    marginVertical: Spacing[4],
  },

  serviceHeader: {
    marginBottom: Spacing[4],
  },
  serviceSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 10,
    color: Colors.gold.light,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  serviceTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    color: Colors.text.primary,
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
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  infoLabel: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  infoValue: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  infoValueHighlight: {
    color: Colors.text.primary,
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
    color: Colors.text.primary,
  },
  chevronPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.gold.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Delivery Rows
  deliveryRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.gold.border,
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
    color: Colors.gold.light,
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
    color: Colors.text.secondary,
  },
  digitalExpiry: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.neutral[500],
  },

  // Client Details
  clientName: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
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
    color: Colors.text.secondary,
  },
  clientDetailMuted: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.neutral[500],
  },

  scanAnotherBtn: {
    marginTop: Spacing[2],
  },
});
