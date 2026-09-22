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
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <GlassCard highlight style={styles.shootCard}>
        {/* Top row: time + status */}
        <View style={styles.shootTop}>
          <View style={styles.timeBlock}>
            <Clock size={13} color={Colors.gold.light} />
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
            <User size={13} color={Colors.gold.dim} />
            <Text style={styles.infoText}>{booking.profile.full_name}</Text>
          </View>
        )}

        {booking.profile?.phone && (
          <View style={styles.infoRow}>
            <Phone size={13} color={Colors.gold.dim} />
            <Text style={styles.infoText}>{booking.profile.phone}</Text>
          </View>
        )}

        {/* Location */}
        <View style={styles.infoRow}>
          <MapPin size={13} color={Colors.gold.dim} />
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
            <ChevronRight size={13} color={Colors.gold.light} />
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function PhotographerScheduleScreen({ navigation, route }) {
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
          <ArrowLeft size={18} color={Colors.text.primary} />
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
                token: item.booking_token,
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
            tintColor={Colors.gold.DEFAULT}
            colors={[Colors.gold.DEFAULT]}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <View style={styles.emptyIconRing}>
                <Camera size={44} color={Colors.gold.DEFAULT} strokeWidth={1.25} />
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.base },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingTop: 54,
    paddingBottom: Spacing[4],
    paddingHorizontal: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: { flex: 1 },
  headerTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    color: Colors.text.primary,
  },
  headerSub: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs,
    color: Colors.gold.light,
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
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    borderRadius: Radius.md,
  },
  dayLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
  },
  dayLabelActive: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 11,
    color: Colors.text.onGold,
    textTransform: 'uppercase',
  },
  dateLabel: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: Colors.text.primary,
    marginVertical: 2,
  },
  dateLabelActive: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: Colors.text.onGold,
    marginVertical: 2,
  },
  countBadge: {
    backgroundColor: Colors.gold.bg,
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
    color: Colors.gold.light,
  },
  countTextActive: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10,
    color: Colors.text.onGold,
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
    backgroundColor: Colors.gold.bg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.gold.border,
  },
  timeText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.xs,
    color: Colors.gold.light,
  },
  shootDivider: {
    height: 1,
    backgroundColor: Colors.gold.border,
    marginVertical: Spacing[3],
  },
  shootNum: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  shootService: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: Typography.size.sm,
    color: Colors.gold.light,
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
    color: Colors.text.secondary,
  },
  addonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing[2],
  },
  addonChip: {
    backgroundColor: Colors.bg.surface,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    borderRadius: Radius.sm,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  addonText: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: Colors.gold.light,
  },
  shootFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing[3],
    paddingTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.gold.border,
  },
  viewDetails: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs,
    color: Colors.gold.light,
    letterSpacing: 0.5,
  },
  chevronPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.gold.bg,
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
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
  },
  emptyTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: Colors.text.primary,
    marginBottom: Spacing[2],
  },
  emptyBody: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
