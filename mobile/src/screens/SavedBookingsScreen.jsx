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
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';

function formatDate(str) {
  if (!str) return '';
  try {
    return new Date(str).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return str; }
}

function BookingPassCard({ item, onPress, onDelete }) {
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
          colors={Gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cardSpine}
        />

        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bookingNum}>#{item.bookingNumber || item.token?.slice(0, 8)}</Text>
              {item.clientName ? <Text style={styles.clientName}>{item.clientName}</Text> : null}
              {item.serviceName ? <Text style={styles.serviceName}>{item.serviceName}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <StatusBadge status={item.status} size="sm" />
              {item.sessionDate && (
                <View style={styles.sessionDateTag}>
                  <Calendar size={11} color={Colors.text.muted} />
                  <Text style={styles.sessionDateText}>{formatDate(item.sessionDate)}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardFooter}>
            <Text style={styles.savedAt}>
              Added to device {formatDate(item.savedAt)}
            </Text>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Trash2 size={15} color={Colors.neutral[500]} />
              </TouchableOpacity>
              <View style={styles.chevronPill}>
                <ChevronRight size={14} color={Colors.gold.light} />
              </View>
            </View>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function SavedBookingsScreen({ navigation }) {
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
    }
  };

  const deleteBooking = async (token) => {
    const updated = await removeSavedBooking(token);
    setBookings(updated);
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
        <View style={styles.headerTop}>
          <View style={styles.headerIconWrapper}>
            <BookOpen size={20} color={Colors.gold.light} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Studio Passes</Text>
            <Text style={styles.headerSubtitle}>Saved & tracked client sessions</Text>
          </View>
        </View>
      </LinearGradient>

      {bookings.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconRing}>
            <QrCode size={48} color={Colors.gold.DEFAULT} strokeWidth={1.25} />
          </View>
          <Text style={styles.emptyTitle}>No Studio Passes Saved</Text>
          <Text style={styles.emptyBody}>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.base },

  header: {
    paddingTop: 54,
    paddingBottom: Spacing[5],
    paddingHorizontal: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold.border,
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
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
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
    color: Colors.text.primary,
  },
  clientName: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  serviceName: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: Typography.size.xs,
    color: Colors.gold.light,
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
    color: Colors.text.muted,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.gold.border,
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
    color: Colors.neutral[500],
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
    backgroundColor: Colors.gold.bg,
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
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
    ...Shadow.goldSoft,
  },
  emptyTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    color: Colors.text.primary,
    marginBottom: Spacing[2],
  },
  emptyBody: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
