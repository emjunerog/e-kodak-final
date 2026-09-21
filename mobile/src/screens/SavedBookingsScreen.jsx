/**
 * SavedBookingsScreen.jsx
 * Lists all QR passes saved to the device.
 * Tapping one navigates directly to the tracker.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { BookOpen, QrCode, ChevronRight, Trash2 } from 'lucide-react-native';
import { getSavedBookings, removeSavedBooking } from '../services/storageService';
import { fetchBookingByToken } from '../services/bookingService';
import StatusBadge from '../components/StatusBadge';
import GoldButton from '../components/GoldButton';
import { Colors, Typography, Spacing, Radius } from '../theme';

function formatDate(str) {
  if (!str) return '';
  try {
    return new Date(str).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return str; }
}

function BookingPassCard({ item, onPress, onDelete }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={styles.card}>
        {/* Gold left bar */}
        <View style={styles.cardBar} />

        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bookingNum}>#{item.bookingNumber || item.token?.slice(0, 8)}</Text>
              {item.clientName ? <Text style={styles.clientName}>{item.clientName}</Text> : null}
              {item.serviceName ? <Text style={styles.serviceName}>{item.serviceName}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <StatusBadge status={item.status} />
              {item.sessionDate && (
                <Text style={styles.sessionDate}>{formatDate(item.sessionDate)}</Text>
              )}
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.savedAt}>
              Saved {formatDate(item.savedAt)}
            </Text>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
                <Trash2 size={14} color={Colors.neutral[600]} />
              </TouchableOpacity>
              <ChevronRight size={16} color={Colors.gold.dim} />
            </View>
          </View>
        </View>
      </View>
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
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

      <LinearGradient colors={['#0F0F14', '#0B0B0E']} style={styles.header}>
        <BookOpen size={22} color={Colors.gold.DEFAULT} />
        <Text style={styles.headerTitle}>My Bookings</Text>
      </LinearGradient>

      {bookings.length === 0 ? (
        <View style={styles.empty}>
          <QrCode size={72} color={Colors.neutral[700]} strokeWidth={1} />
          <Text style={styles.emptyTitle}>No Saved Bookings</Text>
          <Text style={styles.emptyBody}>
            Scan your E-Kodak booking QR code to track your session live.
          </Text>
          <GoldButton
            icon={QrCode}
            onPress={() => navigation.navigate('Scanner')}
            style={{ marginTop: Spacing[6] }}
          >
            Scan Booking QR
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
              Scan New Booking
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingTop: 55,
    paddingBottom: Spacing[4],
    paddingHorizontal: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold.border,
  },
  headerTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },

  list: { padding: Spacing[4], gap: Spacing[3] },

  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardBar: { width: 4, backgroundColor: Colors.gold.DEFAULT },
  cardContent: { flex: 1, padding: Spacing[4], gap: Spacing[2] },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3] },
  bookingNum: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  clientName: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginTop: 2 },
  serviceName: { fontSize: Typography.size.xs, color: Colors.gold.dim, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  sessionDate: { fontSize: Typography.size.xs, color: Colors.text.secondary },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing[1] },
  savedAt: { fontSize: Typography.size.xs, color: Colors.neutral[600] },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  deleteBtn: { padding: 4 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing[10] },
  emptyTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginTop: Spacing[6], marginBottom: Spacing[3], textAlign: 'center' },
  emptyBody: { fontSize: Typography.size.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 24 },
});
