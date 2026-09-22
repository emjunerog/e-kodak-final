/**
 * ProfileScreen.jsx
 * Customer Profile & Studio Dossier Dashboard.
 * Automatically loads and displays customer details, contact info,
 * active orders, and studio booking history from scanned QR passes.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  User, Mail, Phone, Calendar, Camera, QrCode,
  Sparkles, ChevronRight, ShieldCheck, Clock,
} from 'lucide-react-native';

import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import GoldButton from '../components/GoldButton';
import {
  getCustomerProfile, getSavedBookings,
} from '../services/storageService';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile]         = useState(null);
  const [savedBookings, setSavedBookings] = useState([]);
  const [refreshing, setRefreshing]   = useState(false);

  const loadData = async () => {
    const [prof, bookings] = await Promise.all([
      getCustomerProfile(),
      getSavedBookings(),
    ]);
    setProfile(prof);
    setSavedBookings(bookings);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const hasProfile = Boolean(profile?.fullName && profile.fullName !== 'Studio Guest') || savedBookings.length > 0;
  const clientName = profile?.fullName || savedBookings[0]?.clientName || 'Studio Guest';

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
          <View style={styles.headerIconRing}>
            <User size={20} color={Colors.gold.light} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Client Profile</Text>
            <Text style={styles.headerSub}>Session details & order dossier</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
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
        {/* ── Customer Identity Card ── */}
        <GlassCard glow highlight style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarOuterRing}>
              <LinearGradient
                colors={Gradients.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarInitials}>
                    {clientName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </LinearGradient>
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.vipTagRow}>
                <View style={styles.vipBadge}>
                  <ShieldCheck size={11} color={Colors.gold.light} />
                  <Text style={styles.vipText}>VERIFIED CLIENT</Text>
                </View>
              </View>
              <Text style={styles.clientNameText} numberOfLines={1}>{clientName}</Text>
              <Text style={styles.clientSubtitle}>E-Kodak Studio Client</Text>
            </View>
          </View>

          {/* Contact Details */}
          {(profile?.email || profile?.phone) ? (
            <View style={styles.contactBlock}>
              <View style={styles.divider} />
              {profile?.email ? (
                <View style={styles.contactRow}>
                  <Mail size={13} color={Colors.gold.dim} />
                  <Text style={styles.contactText}>{profile.email}</Text>
                </View>
              ) : null}
              {profile?.phone ? (
                <View style={styles.contactRow}>
                  <Phone size={13} color={Colors.gold.dim} />
                  <Text style={styles.contactText}>{profile.phone}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Activity Statistics */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{savedBookings.length}</Text>
              <Text style={styles.statLabel}>Saved Passes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                {savedBookings.filter((b) => b.status === 'READY' || b.status === 'COMPLETED').length}
              </Text>
              <Text style={styles.statLabel}>Outputs Ready</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>Cebu</Text>
              <Text style={styles.statLabel}>Studio Bay</Text>
            </View>
          </View>
        </GlassCard>

        {/* ── Active Studio Order Dossier ── */}
        {hasProfile ? (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Camera size={14} color={Colors.gold.DEFAULT} />
              <Text style={styles.sectionLabel}>LATEST STUDIO ORDER</Text>
            </View>

            <GlassCard highlight style={styles.orderCard}>
              <View style={styles.orderTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderNumber}>
                    Pass #{profile?.lastBookingNumber || savedBookings[0]?.bookingNumber || '—'}
                  </Text>
                  <Text style={styles.orderService}>
                    {profile?.lastServiceName || savedBookings[0]?.serviceName || 'Studio Session'}
                  </Text>
                </View>
                <StatusBadge
                  status={profile?.lastStatus || savedBookings[0]?.status || 'PENDING'}
                  size="sm"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.orderMetaGrid}>
                <View style={styles.orderMetaItem}>
                  <Calendar size={13} color={Colors.gold.light} />
                  <Text style={styles.orderMetaText}>
                    {profile?.lastSessionDate ? new Date(profile.lastSessionDate).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    }) : 'Schedule Confirmed'}
                  </Text>
                </View>
                <View style={styles.orderMetaItem}>
                  <Clock size={13} color={Colors.gold.light} />
                  <Text style={styles.orderMetaText}>
                    {profile?.lastSessionTime || 'Studio Hours'}
                  </Text>
                </View>
              </View>

              {savedBookings[0]?.token ? (
                <GoldButton
                  variant="outline"
                  icon={QrCode}
                  onPress={() => {
                    navigation.navigate('BookingTracker', {
                      booking: {
                        id: savedBookings[0].token,
                        booking_number: savedBookings[0].bookingNumber,
                        status: savedBookings[0].status,
                        session_date: savedBookings[0].sessionDate,
                        services: { name: savedBookings[0].serviceName },
                        profile: { full_name: clientName, phone: profile?.phone, email: profile?.email },
                      },
                      token: savedBookings[0].token,
                    });
                  }}
                  style={{ marginTop: Spacing[4] }}
                  size="sm"
                >
                  Open Live Session Tracker
                </GoldButton>
              ) : null}
            </GlassCard>
          </View>
        ) : (
          /* Guided Profile Prompt for New Users */
          <View style={styles.sectionBlock}>
            <GlassCard highlight style={styles.emptyPromptCard}>
              <View style={styles.promptIconWrap}>
                <QrCode size={36} color={Colors.gold.DEFAULT} strokeWidth={1.25} />
              </View>
              <Text style={styles.promptTitle}>No Studio Pass Scanned Yet</Text>
              <Text style={styles.promptBody}>
                Scan your booking QR pass to automatically import your client profile, session details, and live order tracking.
              </Text>
              <GoldButton
                icon={QrCode}
                onPress={() => navigation.navigate('Scanner')}
                style={{ marginTop: Spacing[4], width: '100%' }}
                size="md"
              >
                Scan Booking QR Pass
              </GoldButton>
            </GlassCard>
          </View>
        )}

        {/* ── Studio Passes Overview ── */}
        {savedBookings.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Sparkles size={14} color={Colors.gold.DEFAULT} />
              <Text style={styles.sectionLabel}>ALL LINKED PASSES ({savedBookings.length})</Text>
            </View>

            {savedBookings.map((b, i) => (
              <TouchableOpacity
                key={b.token || i}
                activeOpacity={0.82}
                onPress={() => navigation.navigate('Bookings')}
              >
                <GlassCard highlight style={styles.miniPassCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniPassNum}>Pass #{b.bookingNumber || b.token?.slice(0, 8)}</Text>
                    <Text style={styles.miniPassService}>{b.serviceName || 'Session'}</Text>
                  </View>
                  <StatusBadge status={b.status} size="sm" />
                  <ChevronRight size={16} color={Colors.gold.light} style={{ marginLeft: 8 }} />
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.base },
  content: { padding: Spacing[4], gap: Spacing[5] },

  header: {
    paddingTop: 54,
    paddingBottom: Spacing[4],
    paddingHorizontal: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  headerIconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  headerSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },

  // Profile Card
  profileCard: {
    padding: Spacing[5],
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  avatarOuterRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    ...Shadow.goldSoft,
  },
  avatarGradient: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: Typography.fontHeading,
    fontSize: 26,
    color: Colors.gold.light,
  },
  vipTagRow: {
    marginBottom: 4,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gold.bg,
    borderWidth: 0.8,
    borderColor: Colors.gold.borderLight,
    borderRadius: Radius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  vipText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    color: Colors.gold.light,
    letterSpacing: 1,
  },
  clientNameText: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.lg,
    color: Colors.text.primary,
  },
  clientSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    marginTop: 1,
  },

  contactBlock: {
    marginTop: Spacing[2],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing[2],
  },
  contactText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.gold.border,
    marginVertical: Spacing[3],
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: Spacing[4],
    borderTopWidth: 1,
    borderTopColor: Colors.gold.border,
    marginTop: Spacing[3],
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: Colors.gold.light,
  },
  statLabel: {
    fontFamily: Typography.fontBody,
    fontSize: 10,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.gold.border,
  },

  // Sections
  sectionBlock: {
    gap: Spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10.5,
    color: Colors.gold.light,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Order Card
  orderCard: {
    padding: Spacing[4],
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
  },
  orderService: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: Typography.size.xs,
    color: Colors.gold.light,
    marginTop: 2,
  },
  orderMetaGrid: {
    flexDirection: 'row',
    gap: Spacing[5],
  },
  orderMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderMetaText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },

  // Empty Prompt
  emptyPromptCard: {
    padding: Spacing[6],
    alignItems: 'center',
    textAlign: 'center',
  },
  promptIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
    ...Shadow.goldSoft,
  },
  promptTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  promptBody: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing[2],
  },

  // Mini Pass Cards
  miniPassCard: {
    padding: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  miniPassNum: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
  },
  miniPassService: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: Colors.text.secondary,
  },
});
