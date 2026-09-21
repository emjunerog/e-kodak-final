/**
 * BookingTrackerScreen.jsx
 * Real-time booking status tracker with milestone stepper,
 * booking details, and live Supabase subscription.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, Animated, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Calendar, MapPin, Phone, Camera, Package,
  QrCode, RefreshCw, Share2, Bookmark, BookmarkCheck,
  Wifi, WifiOff, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { fetchBookingByToken, subscribeToBookingUpdates } from '../services/bookingService';
import { saveBookingToken, removeSavedBooking, getSavedBookings } from '../services/storageService';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import MilestoneStepper from '../components/MilestoneStepper';
import GoldButton from '../components/GoldButton';
import { Colors, Typography, Spacing, Radius } from '../theme';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
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

// ── Delivery Card ─────────────────────────────────────────────────────────────

function DeliveryPanel({ deliveries }) {
  if (!deliveries?.length) return null;

  return (
    <GlassCard style={styles.section}>
      <View style={styles.sectionHeader}>
        <Package size={16} color={Colors.gold.DEFAULT} />
        <Text style={styles.sectionTitle}>Delivery / Pickup</Text>
      </View>
      {deliveries.map((d) => (
        <View key={d.id} style={styles.deliveryRow}>
          <Text style={styles.deliveryType}>{d.delivery_type?.replace('_', ' ')}</Text>
          <Text style={[styles.deliveryStatus, { color: d.status === 'DELIVERED' ? '#10B981' : Colors.gold.dim }]}>
            {d.status}
          </Text>
          {d.tracking_number && (
            <Text style={styles.tracking}>Tracking: {d.tracking_number}</Text>
          )}
          {d.digital_access_expires_at && (
            <Text style={styles.tracking}>
              Digital access expires: {formatDate(d.digital_access_expires_at)}
            </Text>
          )}
        </View>
      ))}
    </GlassCard>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function BookingTrackerScreen({ route, navigation }) {
  const { booking: initialBooking, token } = route.params;
  const [booking, setBooking]         = useState(initialBooking);
  const [refreshing, setRefreshing]   = useState(false);
  const [isSaved, setIsSaved]         = useState(false);
  const [isLive, setIsLive]           = useState(true);
  const [stepperOpen, setStepperOpen] = useState(true);

  // Live indicator pulse
  const livePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkIfSaved();
    const unsubscribe = subscribeToBookingUpdates(booking.id, (updated) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBooking((prev) => ({ ...prev, ...updated }));
    });

    // Pulse the live dot
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();

    return () => { unsubscribe(); anim.stop(); };
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
    await Haptics.selectionAsync();
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
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#0F0F14', '#0B0B0E']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Booking #{booking.booking_number}
          </Text>
          {/* Live indicator */}
          <View style={styles.liveRow}>
            <Animated.View style={[styles.liveDot, { opacity: livePulse }]} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleSave} style={styles.iconBtn}>
            {isSaved
              ? <BookmarkCheck size={20} color={Colors.gold.DEFAULT} />
              : <Bookmark size={20} color={Colors.text.secondary} />
            }
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold.DEFAULT}
            colors={[Colors.gold.DEFAULT]}
          />
        }
      >
        {/* ── Status Hero ── */}
        <GlassCard glow style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Current Status</Text>
              <StatusBadge status={booking.status} style={{ marginTop: 6 }} />
            </View>
            <View style={styles.qrBadge}>
              <QrCode size={28} color={Colors.gold.dim} strokeWidth={1.5} />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Session Info */}
          <View style={styles.infoGrid}>
            <InfoRow icon={Calendar} label="Session Date">
              {formatDate(booking.session_date)}
              {booking.session_time && ` at ${formatTime(booking.session_time)}`}
            </InfoRow>

            <InfoRow icon={MapPin} label="Location">
              {booking.location_type === 'STUDIO'
                ? 'E-Kodak Studio'
                : booking.location_address || 'On-site / Outdoor'}
            </InfoRow>

            {booking.services?.name && (
              <InfoRow icon={Camera} label="Service">
                {booking.services.name}
              </InfoRow>
            )}

            {booking.photographer?.full_name && (
              <InfoRow icon={Camera} label="Photographer">
                {booking.photographer.full_name}
              </InfoRow>
            )}
          </View>
        </GlassCard>

        {/* ── Milestone Stepper ── */}
        <GlassCard style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setStepperOpen(!stepperOpen)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={16} color={Colors.gold.DEFAULT} />
              <Text style={styles.sectionTitle}>Progress Timeline</Text>
            </View>
            {stepperOpen
              ? <ChevronUp size={16} color={Colors.neutral[500]} />
              : <ChevronDown size={16} color={Colors.neutral[500]} />
            }
          </TouchableOpacity>
          {stepperOpen && (
            <MilestoneStepper status={booking.status} />
          )}
        </GlassCard>

        {/* ── Delivery Panel ── */}
        <DeliveryPanel deliveries={booking.booking_deliveries} />

        {/* ── Client Info ── */}
        {booking.profile && (
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Phone size={16} color={Colors.gold.DEFAULT} />
              <Text style={styles.sectionTitle}>Contact Details</Text>
            </View>
            <Text style={styles.clientName}>{booking.profile.full_name}</Text>
            {booking.profile.phone && (
              <Text style={styles.clientDetail}>{booking.profile.phone}</Text>
            )}
            {booking.profile.email && (
              <Text style={styles.clientDetail}>{booking.profile.email}</Text>
            )}
          </GlassCard>
        )}

        {/* ── Scan Another ── */}
        <GoldButton
          variant="outline"
          icon={QrCode}
          onPress={() => navigation.replace('Scanner')}
          style={styles.scanAnotherBtn}
        >
          Scan Another Booking
        </GoldButton>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Info Row Sub-component ───────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, children }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon size={14} color={Colors.gold.dim} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{children}</Text>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: Spacing[4],
    paddingHorizontal: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bg.card,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: { fontSize: Typography.size.xs, color: '#10B981', fontWeight: Typography.weight.medium },
  headerActions: { width: 40, alignItems: 'flex-end' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bg.card,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing[4], gap: Spacing[4] },

  heroCard: { padding: Spacing[5] },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing[4] },
  heroLabel: { fontSize: Typography.size.xs, color: Colors.text.secondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  qrBadge: {
    width: 52, height: 52, borderRadius: Radius.md,
    backgroundColor: Colors.gold.bg, borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center', justifyContent: 'center',
  },

  divider: { height: 1, backgroundColor: Colors.gold.border, marginBottom: Spacing[4] },

  infoGrid: { gap: Spacing[3] },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3] },
  infoIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.gold.bg,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  infoLabel: { fontSize: Typography.size.xs, color: Colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: Typography.size.base, color: Colors.text.primary, fontWeight: Typography.weight.medium, lineHeight: 22 },

  section: { padding: Spacing[5] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: Spacing[4], justifyContent: 'space-between' },
  sectionTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Colors.text.primary },

  deliveryRow: { borderTopWidth: 1, borderTopColor: Colors.bg.overlay, paddingTop: Spacing[3], marginTop: Spacing[2], gap: 3 },
  deliveryType: { fontSize: Typography.size.sm, color: Colors.gold.DEFAULT, fontWeight: Typography.weight.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  deliveryStatus: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  tracking: { fontSize: Typography.size.xs, color: Colors.text.secondary, marginTop: 2 },

  clientName: { fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: Colors.text.primary, marginBottom: 4 },
  clientDetail: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginBottom: 2 },

  scanAnotherBtn: { marginTop: Spacing[2] },
});
