/**
 * PhotographerScheduleScreen.jsx
 * Daily/weekly shoot schedule for logged-in photographers.
 * Shows date strip, bookings per day, client details, and status actions.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, RefreshControl, Alert, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  CalendarDays, MapPin, Phone, Camera, ChevronRight,
  Clock, Aperture, User, PackageCheck,
} from 'lucide-react-native';
import { fetchPhotographerSchedule } from '../services/bookingService';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import { Colors, Typography, Spacing, Radius } from '../theme';

// ── Helpers ────────────────────────────────────────────────────────────────

function formatShortDate(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const d = new Date(); d.setHours(+h, +m);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
            onPress={() => { Haptics.selectionAsync(); onSelect(d); }}
            style={[styles.dateChip, isSelected && styles.dateChipActive]}
          >
            <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>{dayLabel}</Text>
            <Text style={[styles.dateLabel, isSelected && styles.dateLabelActive]}>{dateLabel}</Text>
            {count > 0 && (
              <View style={[styles.countBadge, isSelected && styles.countBadgeActive]}>
                <Text style={[styles.countText, isSelected && styles.countTextActive]}>{count}</Text>
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
      <GlassCard style={styles.shootCard}>
        {/* Top row: time + status */}
        <View style={styles.shootTop}>
          <View style={styles.timeBlock}>
            <Clock size={12} color={Colors.gold.dim} />
            <Text style={styles.timeText}>
              {formatTime(booking.session_time) || 'TBD'}
            </Text>
          </View>
          <StatusBadge status={booking.status} />
        </View>

        {/* Booking number & service */}
        <Text style={styles.shootNum}>#{booking.booking_number}</Text>
        {booking.services?.name && (
          <Text style={styles.shootService}>{booking.services.name}</Text>
        )}

        {/* Client */}
        {booking.profile?.full_name && (
          <View style={styles.infoRow}>
            <User size={13} color={Colors.neutral[500]} />
            <Text style={styles.infoText}>{booking.profile.full_name}</Text>
          </View>
        )}
        {booking.profile?.phone && (
          <View style={styles.infoRow}>
            <Phone size={13} color={Colors.neutral[500]} />
            <Text style={styles.infoText}>{booking.profile.phone}</Text>
          </View>
        )}

        {/* Location */}
        <View style={styles.infoRow}>
          <MapPin size={13} color={Colors.neutral[500]} />
          <Text style={styles.infoText}>
            {booking.location_type === 'STUDIO'
              ? 'E-Kodak Studio'
              : booking.location_address || 'Location TBD'}
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
          <Text style={styles.viewDetails}>View Full Details</Text>
          <ChevronRight size={14} color={Colors.gold.dim} />
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function PhotographerScheduleScreen({ navigation, route }) {
  const { photographerId, photographerName } = route.params || {};

  const [allBookings, setAllBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const weekDates = getDatesForWeek();

  // Count map: { '2025-09-22': 3, ... }
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
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

      <LinearGradient colors={['#0F0F14', '#0B0B0E']} style={styles.header}>
        <Aperture size={22} color={Colors.gold.DEFAULT} />
        <View>
          <Text style={styles.headerTitle}>My Schedule</Text>
          {photographerName && (
            <Text style={styles.headerSub}>{photographerName}</Text>
          )}
        </View>
      </LinearGradient>

      {/* Date strip */}
      <DateStrip
        dates={weekDates}
        selected={selectedDate}
        onSelect={setSelectedDate}
        countMap={countMap}
      />

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryDate}>
          {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <View style={styles.summaryBadge}>
          <Camera size={12} color={Colors.gold.DEFAULT} />
          <Text style={styles.summaryCount}>
            {bookingsForDay.length} {bookingsForDay.length === 1 ? 'shoot' : 'shoots'}
          </Text>
        </View>
      </View>

      <FlatList
        data={bookingsForDay}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ShootCard
            booking={item}
            onPress={() => navigation.navigate('BookingTracker', {
              booking: item,
              token: item.booking_token,
            })}
          />
        )}
        contentContainerStyle={styles.list}
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
              <CalendarDays size={56} color={Colors.neutral[700]} strokeWidth={1} />
              <Text style={styles.emptyTitle}>No Shoots Today</Text>
              <Text style={styles.emptyBody}>
                {bookingsForDay.length === 0
                  ? 'Enjoy your free day!'
                  : 'Select a different date to see your schedule.'}
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
    paddingTop: 55,
    paddingBottom: Spacing[4],
    paddingHorizontal: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold.border,
  },
  headerTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  headerSub: { fontSize: Typography.size.sm, color: Colors.gold.dim, marginTop: 1 },

  dateStrip: { paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], gap: Spacing[2] },
  dateChip: {
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.neutral[800],
    minWidth: 52,
    gap: 2,
  },
  dateChipActive: { backgroundColor: Colors.gold.bg, borderColor: Colors.gold.border },
  dayLabel: { fontSize: Typography.size.xs, color: Colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.5 },
  dayLabelActive: { color: Colors.gold.dim },
  dateLabel: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.neutral[400] },
  dateLabelActive: { color: Colors.gold.DEFAULT },
  countBadge: {
    backgroundColor: Colors.neutral[800],
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 2,
  },
  countBadgeActive: { backgroundColor: Colors.gold.bg },
  countText: { fontSize: 10, color: Colors.neutral[400], fontWeight: Typography.weight.bold },
  countTextActive: { color: Colors.gold.DEFAULT },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold.border + '44',
  },
  summaryDate: { fontSize: Typography.size.sm, color: Colors.text.secondary, fontWeight: Typography.weight.medium },
  summaryBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.gold.bg, paddingHorizontal: Spacing[3], paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.gold.border },
  summaryCount: { fontSize: Typography.size.xs, color: Colors.gold.DEFAULT, fontWeight: Typography.weight.semibold },

  list: { padding: Spacing[4], gap: Spacing[4] },

  shootCard: { padding: Spacing[4], gap: Spacing[2] },
  shootTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[1] },
  timeBlock: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: Typography.size.sm, color: Colors.gold.dim, fontWeight: Typography.weight.medium },
  shootNum: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  shootService: { fontSize: Typography.size.sm, color: Colors.gold.DEFAULT, fontWeight: Typography.weight.medium, marginTop: 1 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: 2 },
  infoText: { fontSize: Typography.size.sm, color: Colors.text.secondary, flex: 1 },

  addonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginTop: Spacing[1] },
  addonChip: { backgroundColor: Colors.bg.overlay, borderRadius: Radius.sm, paddingHorizontal: Spacing[2], paddingVertical: 3 },
  addonText: { fontSize: Typography.size.xs, color: Colors.neutral[400] },

  shootFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: Spacing[3],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.gold.border + '44',
  },
  viewDetails: { fontSize: Typography.size.xs, color: Colors.gold.dim, fontWeight: Typography.weight.medium, letterSpacing: 0.5 },

  empty: { alignItems: 'center', justifyContent: 'center', padding: Spacing[10], gap: Spacing[4] },
  emptyTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary, textAlign: 'center' },
  emptyBody: { fontSize: Typography.size.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 24 },
});
