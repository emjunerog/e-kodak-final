/**
 * PhotographerScheduleScreen.jsx
 * Luxury Daily Shoot Schedule Hub for Studio Photographers.
 * Features:
 * - Playfair Display & Inter typography
 * - Gold gradient date strip with active shoot counts
 * - Editorial shoot cards with client & package metadata
 * - Direct navigation to session status management
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, RefreshControl, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  CalendarDays, MapPin, Phone, Camera, ChevronRight,
  Clock, Aperture, User, Sparkles, ArrowLeft,
} from 'lucide-react-native';

import { fetchPhotographerSchedule } from '../services/bookingService';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(t) {
  if (!t) return '';
  try {
    const [h, m] = t.split(':');
    const d = new Date(); d.setHours(+h, +m);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return t; }
}

function getDatesForWeek() {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// ── Date Strip ─────────────────────────────────────────────────────────────

function DateStrip({ dates, selected, onSelect, countMap }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dateStrip}
    >
      {dates.map((d) => {
        const isSelected = d === selected;
        const count = countMap[d] || 0;
        const day = new Date(d);
        const dayLabel = day.toLocaleDateString('en-US', { weekday: 'short' });
        const dateLabel = day.getDate();

        return (
          <TouchableOpacity
            key={d}
            onPress={() => {
              try { Haptics.selectionAsync(); } catch {}
              onSelect(d);
            }}
            activeOpacity={0.8}
            style={[styles.dateChipWrapper]}
          >
            {isSelected ? (
              <LinearGradient
                colors={Gradients.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.dateChip, styles.dateChipActive]}
              >
                <Text style={styles.dayLabelActive}>{dayLabel}</Text>
                <Text style={styles.dateLabelActive}>{dateLabel}</Text>
                {count > 0 && (
                  <View style={styles.countBadgeActive}>
                    <Text style={styles.countTextActive}>{count}</Text>
                  </View>
                )}
              </LinearGradient>
            ) : (
              <View style={[styles.dateChip, styles.dateChipInactive]}>
                <Text style={styles.dayLabel}>{dayLabel}</Text>
                <Text style={styles.dateLabel}>{dateLabel}</Text>
                {count > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Shoot Card ──────────────────────────────────────────────────────────────

function ShootCard({ booking, onPress }) {
  const { colors, gradients } = useTheme();
  const styles = getStyles(colors);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <GlassCard highlight style={styles.shootCard}>
        {/* Top row: time + status */}
        <View style={styles.shootTop}>
          <View style={styles.timeBlock}>
            <Clock size={13} color={colors.gold.light} />
            <Text style={styles.timeText}>
              {formatTime(booking.session_time) || 'Schedule Pending'}
            </Text>
          </View>
          <StatusBadge status={booking.status} size="sm" />
        </View>

        <View style={styles.shootDivider} />

        {/* Booking Number & Service */}
        <Text style={styles.shootNum}>Pass #{booking.booking_number}</Text>
        {booking.services?.name && (
          <Text style={styles.shootService}>{booking.services.name}</Text>
        )}

        {/* Client */}
        {booking.profile?.full_name && (
          <View style={styles.infoRow}>
            <User size={13} color={colors.gold.dim} />
            <Text style={styles.infoText}>{booking.profile.full_name}</Text>
          </View>
        )}

        {booking.profile?.phone && (
          <View style={styles.infoRow}>
            <Phone size={13} color={colors.gold.dim} />
            <Text style={styles.infoText}>{booking.profile.phone}</Text>
          </View>
        )}

        {/* Location */}
        <View style={styles.infoRow}>
          <MapPin size={13} color={colors.gold.dim} />
          <Text style={styles.infoText}>
            {booking.location_type === 'STUDIO'
              ? 'E-Kodak Main Studio Bay'
              : booking.location_address || 'On-site Location'}
          </Text>
        </View>

        {/* Add-ons */}
        {booking.booking_addons?.length > 0 && (
          <View style={styles.addonsRow}>
            {booking.booking_addons.map((a) => (
              <View key={a.id} style={styles.addonChip}>
                <Text style={styles.addonText}>{a.add_on_name} ×{a.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.shootFooter}>
          <Text style={styles.viewDetails}>Track Session Details</Text>
          <View style={styles.chevronPill}>
            <ChevronRight size={13} color={colors.gold.light} />
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function PhotographerScheduleScreen({ navigation, route }) {
  const { isDark, colors, gradients } = useTheme();
  const styles = getStyles(colors);
  const { photographerId, photographerName } = route.params || {};

  const [allBookings, setAllBookings]   = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const weekDates = getDatesForWeek();

  const countMap = allBookings.reduce((acc, b) => {
    acc[b.session_date] = (acc[b.session_date] || 0) + 1;
    return acc;
  }, {});

  const bookingsForDay = allBookings.filter((b) => b.session_date === selectedDate);

  const loadSchedule = useCallback(async () => {
    if (!photographerId) return;
    const { data } = await fetchPhotographerSchedule(photographerId);
    if (data) setAllBookings(data);
    setLoading(false);
  }, [photographerId]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.base} />

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
          <ArrowLeft size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Studio Schedule</Text>
          {photographerName && (
            <Text style={styles.headerSub}>Lead: {photographerName}</Text>
          )}
        </View>
      </LinearGradient>

      {/* ── Date Strip ── */}
      <DateStrip
        dates={weekDates}
        selected={selectedDate}
        onSelect={setSelectedDate}
        countMap={countMap}
      />

      {/* ── Session List ── */}
      <FlatList
        data={bookingsForDay}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ShootCard
            booking={item}
            onPress={() => {
              navigation.navigate('BookingTracker', {
                booking: item,
                token: item.booking_token || item.booking_number || item.id,
              });
            }}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold.DEFAULT}
            colors={[colors.gold.DEFAULT]}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <View style={styles.emptyIconRing}>
                <Camera size={44} color={colors.gold.DEFAULT} strokeWidth={1.25} />
              </View>
              <Text style={styles.emptyTitle}>No Shoots Scheduled</Text>
              <Text style={styles.emptyBody}>
                You have no studio sessions assigned for this selected date.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingTop: 54,
    paddingBottom: Spacing[4],
    paddingHorizontal: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.gold.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: { flex: 1 },
  headerTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    color: colors.text.primary,
  },
  headerSub: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs,
    color: colors.gold.light,
    letterSpacing: 0.5,
  },

  // Date strip
  dateStrip: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    gap: Spacing[2],
  },
  dateChipWrapper: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  dateChip: {
    width: 58,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[2],
  },
  dateChipActive: {
    borderRadius: Radius.md,
    ...Shadow.goldSoft,
  },
  dateChipInactive: {
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.gold.border,
    borderRadius: Radius.md,
  },
  dayLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11,
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  dayLabelActive: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 11,
    color: colors.text.onGold,
    textTransform: 'uppercase',
  },
  dateLabel: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: colors.text.primary,
    marginVertical: 2,
  },
  dateLabelActive: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: colors.text.onGold,
    marginVertical: 2,
  },
  countBadge: {
    backgroundColor: colors.gold.bg,
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(26, 23, 20, 0.25)',
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10,
    color: colors.gold.light,
  },
  countTextActive: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10,
    color: colors.text.onGold,
  },

  list: {
    padding: Spacing[4],
    gap: Spacing[3],
  },

  // Shoot card
  shootCard: {
    padding: Spacing[4],
    marginBottom: Spacing[2],
  },
  shootTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gold.bg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: colors.gold.border,
  },
  timeText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.xs,
    color: colors.gold.light,
  },
  shootDivider: {
    height: 1,
    backgroundColor: colors.gold.border,
    marginVertical: Spacing[3],
  },
  shootNum: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: colors.text.primary,
    marginBottom: 2,
  },
  shootService: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: Typography.size.sm,
    color: colors.gold.light,
    marginBottom: Spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    color: colors.text.secondary,
  },
  addonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing[2],
  },
  addonChip: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.gold.border,
    borderRadius: Radius.sm,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  addonText: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: colors.gold.light,
  },
  shootFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing[3],
    paddingTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.gold.border,
  },
  viewDetails: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs,
    color: colors.gold.light,
    letterSpacing: 0.5,
  },
  chevronPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gold.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[12],
    paddingHorizontal: Spacing[6],
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gold.bg,
    borderWidth: 1,
    borderColor: colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
  },
  emptyTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: colors.text.primary,
    marginBottom: Spacing[2],
  },
  emptyBody: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
