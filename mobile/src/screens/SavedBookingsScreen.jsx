/**
 * SavedBookingsScreen.jsx
 * Luxury Studio Passes & Tracked Sessions List.
 * Features:
 * - Playfair Display & Inter typography
 * - Physical VIP ticket styling with metallic gold accents
 * - GlassCard list items with haptics and swipe actions
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { BookOpen, QrCode, ChevronRight, Trash2, Calendar } from 'lucide-react-native';

import { getSavedBookings, removeSavedBooking } from '../services/storageService';
import { fetchBookingByToken } from '../services/bookingService';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import GoldButton from '../components/GoldButton';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius, Shadow } from '../theme';

function formatDate(str) {
  if (!str) return '';
  try {
    return new Date(str).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return str; }
}

function BookingPassCard({ item, onPress, onDelete, colors, gradients }) {
  const styles = getStyles(colors);
  
  const handleDelete = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onDelete?.();
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.84}>
      <GlassCard highlight style={styles.card}>
        {/* Metallic Gold Left Indicator Spine */}
        <LinearGradient
          colors={gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cardSpine}
        />

        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bookingNum, { color: colors.gold.DEFAULT }]}>
                #{item.bookingNumber || item.token?.slice(0, 8)}
              </Text>
              {item.clientName ? <Text style={[styles.clientName, { color: colors.text.primary }]}>{item.clientName}</Text> : null}
              {item.serviceName ? <Text style={[styles.serviceName, { color: colors.text.secondary }]}>{item.serviceName}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <StatusBadge status={item.status} size="sm" />
              {item.sessionDate && (
                <View style={styles.sessionDateTag}>
                  <Calendar size={11} color={colors.text.muted} />
                  <Text style={[styles.sessionDateText, { color: colors.text.muted }]}>{formatDate(item.sessionDate)}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.gold.border }]} />

          <View style={styles.cardFooter}>
            <Text style={[styles.savedAt, { color: colors.text.muted }]}>
              Added to device {formatDate(item.savedAt)}
            </Text>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Trash2 size={15} color={colors.text.muted} />
              </TouchableOpacity>
              <View style={[styles.chevronPill, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
                <ChevronRight size={14} color={colors.gold.light} />
              </View>
            </View>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function SavedBookingsScreen({ navigation }) {
  const { isDark, colors, gradients } = useTheme();
  const styles = getStyles(colors);
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadSaved = async () => {
    const saved = await getSavedBookings();
    setBookings(saved);
  };

  useFocusEffect(useCallback(() => { loadSaved(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSaved();
    setRefreshing(false);
  };

  const openBooking = async (item) => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    const { data: booking } = await fetchBookingByToken(item.token);
    if (booking) {
      navigation.navigate('BookingTracker', { booking, token: item.token });
    } else {
      // Graceful offline fallback: allow user to inspect their saved pass even without cellular connection
      const cachedBooking = {
        booking_number: item.bookingNumber,
        booking_token: item.token,
        status: item.status || 'CONFIRMED',
        event_date: item.sessionDate,
        session_date: item.sessionDate,
        service: { name: item.serviceName },
        services: { name: item.serviceName },
        profile: { full_name: item.clientName },
      };
      navigation.navigate('BookingTracker', { booking: cachedBooking, token: item.token });
    }
  };

  const deleteBooking = async (token) => {
    const updated = await removeSavedBooking(token);
    setBookings(updated);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0C0A08' : '#FAF8F5'} />

      {/* Full-Screen Atmospheric Atelier Luxury Gradients */}
      <LinearGradient
        colors={
          isDark
            ? ['#0C0A08', '#16120E', '#0E0C09', '#1A140E', '#090806']
            : ['#FAF8F5', '#F5EFE6', '#EDE4D4', '#F7F3EB', '#FAF7F2']
        }
        locations={[0, 0.22, 0.50, 0.78, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={
          isDark
            ? ['rgba(212, 175, 55, 0.08)', 'transparent', 'rgba(212, 175, 55, 0.04)', 'transparent']
            : ['rgba(212, 175, 55, 0.12)', 'transparent', 'rgba(212, 175, 55, 0.06)', 'transparent']
        }
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* ── Editorial Header ── */}
      <LinearGradient
        colors={gradients.darkStudio}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { borderBottomColor: colors.gold.border }]}
      >
        <View style={styles.headerTop}>
          <View style={[styles.headerIconWrapper, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
            <BookOpen size={20} color={colors.gold.light} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Studio Passes</Text>
            <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>Saved & tracked client sessions</Text>
          </View>
        </View>
      </LinearGradient>

      {bookings.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIconRing, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
            <QrCode size={48} color={colors.gold.DEFAULT} strokeWidth={1.25} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No Studio Passes Saved</Text>
          <Text style={[styles.emptyBody, { color: colors.text.secondary }]}>
            Scan the QR code from your booking receipt or online account to track your photoshoot session live.
          </Text>
          <GoldButton
            icon={QrCode}
            onPress={() => navigation.navigate('Scanner')}
            style={{ marginTop: Spacing[6] }}
          >
            Scan Your Booking QR
          </GoldButton>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.token}
          renderItem={({ item }) => (
            <BookingPassCard
              item={item}
              onPress={() => openBooking(item)}
              onDelete={() => deleteBooking(item.token)}
              colors={colors}
              gradients={gradients}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: 110 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold.DEFAULT}
              colors={[colors.gold.DEFAULT]}
            />
          }
          ListHeaderComponent={
            <GoldButton
              variant="outline"
              icon={QrCode}
              onPress={() => navigation.navigate('Scanner')}
              style={{ marginBottom: Spacing[4] }}
              size="sm"
            >
              Scan Another Studio Pass
            </GoldButton>
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },

  header: {
    paddingTop: 54,
    paddingBottom: Spacing[5],
    paddingHorizontal: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.gold.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  headerIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    backgroundColor: colors.gold.bg,
    borderWidth: 1,
    borderColor: colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
  },

  list: {
    padding: Spacing[4],
    gap: Spacing[3],
  },

  // Pass Card
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: Spacing[2],
  },
  cardSpine: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: Spacing[4],
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingNum: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: colors.text.primary,
  },
  clientName: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  serviceName: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: Typography.size.xs,
    color: colors.gold.light,
    marginTop: 1,
  },
  sessionDateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionDateText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.muted,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.gold.border,
    marginVertical: Spacing[3],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedAt: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: colors.neutral[500],
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteBtn: {
    padding: 4,
  },
  chevronPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gold.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
  },
  emptyIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.gold.bg,
    borderWidth: 1,
    borderColor: colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
    ...Shadow.goldSoft,
  },
  emptyTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    color: colors.text.primary,
    marginBottom: Spacing[2],
  },
  emptyBody: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
