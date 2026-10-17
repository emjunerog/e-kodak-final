/**
 * ProfileScreen.jsx
 * Customer Profile & Studio Dossier Dashboard.
 * Automatically loads and displays customer details, contact info,
 * active orders, and studio booking history from scanned QR passes.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  User, Mail, Phone, Calendar, Camera, QrCode,
  Sparkles, ChevronRight, ShieldCheck, Clock,
} from 'lucide-react-native';

import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import GlassHeader from '../components/GlassHeader';
import PremiumIcon from '../components/PremiumIcon';
import StatusBadge from '../components/StatusBadge';
import GoldButton from '../components/GoldButton';
import { useTheme } from '../context/ThemeContext';
import {
  getCustomerProfile, getSavedBookings,
} from '../services/storageService';
import { fetchBookingByToken } from '../services/bookingService';
import { Typography, Spacing, Radius, Shadow } from '../theme';

function formatPeso(n) {
  const v = Number(n);
  if (!isFinite(v) || v <= 0) return '—';
  try {
    return '₱' + v.toLocaleString('en-PH', { maximumFractionDigits: 0 });
  } catch { return `₱${v}`; }
}

function formatDateTime(str) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
}

export default function ProfileScreen({ navigation }) {
  const { isDark, colors, gradients } = useTheme();
  const styles = getStyles(colors, isDark);
  const [profile, setProfile]         = useState(null);
  const [savedBookings, setSavedBookings] = useState([]);
  const [detailed, setDetailed]       = useState(null);
  const [refreshing, setRefreshing]   = useState(false);

  const loadData = async () => {
    const [prof, bookings] = await Promise.all([
      getCustomerProfile(),
      getSavedBookings(),
    ]);
    setProfile(prof);
    setSavedBookings(bookings);
    // Pull the full client dossier from the studio database using the
    // most recent saved pass token (graceful offline fallback to cache).
    try {
      if (bookings?.length && bookings[0]?.token) {
        const { data } = await fetchBookingByToken(bookings[0].token);
        if (data) setDetailed(data);
      }
    } catch {}
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

  // Full studio-database dossier (fetched via the latest pass token)
  const dbProfile  = detailed?.profile || {};
  const dbService  = detailed?.services || detailed?.service || {};
  const dossierName = dbProfile.full_name || profile?.fullName || clientName;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0C0A08' : '#FAF8F5'} />

      {/* Ambient Glass Backdrop */}
      <GlassBackground />

      {/* ── Frosted Editorial Header ── */}
      <GlassHeader
        icon={User}
        title="Client Profile"
        subtitle="Session details & order dossier"
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 110 }]}
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
        {/* ── Customer Identity Card ── */}
        <GlassCard glow highlight style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarOuterRing}>
              <LinearGradient
                colors={gradients.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <View style={styles.avatarInner}>
                  {detailed?.profile?.avatar_url ? (
                    <Image
                      source={{ uri: detailed.profile.avatar_url }}
                      style={styles.avatarPhoto}
                    />
                  ) : (
                    <Text style={[styles.avatarInitials, { color: colors.gold.DEFAULT }]}>
                      {clientName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
              </LinearGradient>
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.vipTagRow}>
                <View style={[styles.vipBadge, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
                  <ShieldCheck size={11} color={colors.gold.light} />
                  <Text style={[styles.vipText, { color: colors.gold.light }]}>VERIFIED CLIENT</Text>
                </View>
              </View>
              <Text style={[styles.clientNameText, { color: colors.text.primary }]} numberOfLines={1}>{clientName}</Text>
              <Text style={[styles.clientSubtitle, { color: colors.text.secondary }]}>E-Kodak Studio Client</Text>
            </View>
          </View>

          {/* Contact Details */}
          {(profile?.email || profile?.phone) ? (
            <View style={styles.contactBlock}>
              <View style={[styles.divider, { backgroundColor: colors.gold.border }]} />
              {profile?.email ? (
                <View style={styles.contactRow}>
                  <Mail size={13} color={colors.gold.light} />
                  <Text style={[styles.contactText, { color: colors.text.secondary }]}>{profile.email}</Text>
                </View>
              ) : null}
              {profile?.phone ? (
                <View style={styles.contactRow}>
                  <Phone size={13} color={colors.gold.light} />
                  <Text style={[styles.contactText, { color: colors.text.secondary }]}>{profile.phone}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Activity Statistics */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.gold.DEFAULT }]}>{savedBookings.length}</Text>
              <Text style={[styles.statLabel, { color: colors.text.muted }]}>Saved Passes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.gold.DEFAULT }]}>
                {savedBookings.filter((b) => b.status === 'READY' || b.status === 'COMPLETED').length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.muted }]}>Outputs Ready</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.gold.DEFAULT }]}>Cebu</Text>
              <Text style={[styles.statLabel, { color: colors.text.muted }]}>Studio Bay</Text>
            </View>
          </View>
        </GlassCard>

        {/* ── Client Dossier — complete studio database record ── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <ShieldCheck size={14} color={colors.gold.DEFAULT} />
            <Text style={styles.sectionLabel}>CLIENT DOSSIER · STUDIO DATABASE</Text>
          </View>

          <GlassCard highlight style={styles.dossierCard}>
            <View style={styles.dossierRow}>
              <Text style={[styles.dossierLabel, { color: colors.text.muted }]}>FULL NAME</Text>
              <Text style={[styles.dossierValue, { color: colors.text.primary }]}>{dossierName}</Text>
            </View>
            <View style={[styles.dossierDivider, { backgroundColor: colors.gold.border }]} />

            <View style={styles.dossierRow}>
              <Text style={[styles.dossierLabel, { color: colors.text.muted }]}>EMAIL ADDRESS</Text>
              <Text style={[styles.dossierValue, { color: colors.text.primary }]}>
                {dbProfile.email || profile?.email || '—'}
              </Text>
            </View>
            <View style={[styles.dossierDivider, { backgroundColor: colors.gold.border }]} />

            <View style={styles.dossierRow}>
              <Text style={[styles.dossierLabel, { color: colors.text.muted }]}>MOBILE NUMBER</Text>
              <Text style={[styles.dossierValue, { color: colors.text.primary }]}>
                {dbProfile.phone || profile?.phone || '—'}
              </Text>
            </View>
            <View style={[styles.dossierDivider, { backgroundColor: colors.gold.border }]} />

            <View style={styles.dossierRow}>
              <Text style={[styles.dossierLabel, { color: colors.text.muted }]}>CLIENT SINCE</Text>
              <Text style={[styles.dossierValue, { color: colors.text.primary }]}>
                {formatDateTime(detailed?.created_at)}
              </Text>
            </View>
            <View style={[styles.dossierDivider, { backgroundColor: colors.gold.border }]} />

            <View style={styles.dossierRow}>
              <Text style={[styles.dossierLabel, { color: colors.text.muted }]}>BOOKING REFERENCE</Text>
              <Text style={[styles.dossierValue, { color: colors.gold.light }]}>
                {detailed?.booking_number || savedBookings[0]?.bookingNumber || '—'}
              </Text>
            </View>
            <View style={[styles.dossierDivider, { backgroundColor: colors.gold.border }]} />

            <View style={styles.dossierRow}>
              <Text style={[styles.dossierLabel, { color: colors.text.muted }]}>PASS TOKEN</Text>
              <Text style={[styles.dossierValueMono, { color: colors.text.secondary }]} numberOfLines={1}>
                {detailed?.booking_token || savedBookings[0]?.token || '—'}
              </Text>
            </View>
            <View style={[styles.dossierDivider, { backgroundColor: colors.gold.border }]} />

            <View style={styles.dossierRow}>
              <Text style={[styles.dossierLabel, { color: colors.text.muted }]}>PACKAGE</Text>
              <Text style={[styles.dossierValue, { color: colors.text.primary }]}>
                {dbService.name || savedBookings[0]?.serviceName || '—'}
                {dbService.category ? ` · ${dbService.category}` : ''}
              </Text>
            </View>
            <View style={[styles.dossierDivider, { backgroundColor: colors.gold.border }]} />

            <View style={styles.dossierRow}>
              <Text style={[styles.dossierLabel, { color: colors.text.muted }]}>SESSION SCHEDULE</Text>
              <Text style={[styles.dossierValue, { color: colors.text.primary }]}>
                {detailed?.session_date ? formatDateTime(detailed.session_date) : '—'}
                {detailed?.session_time ? ` · ${detailed.session_time}` : ''}
              </Text>
            </View>
            <View style={[styles.dossierDivider, { backgroundColor: colors.gold.border }]} />

            <View style={styles.dossierRow}>
              <Text style={[styles.dossierLabel, { color: colors.text.muted }]}>LOCATION</Text>
              <Text style={[styles.dossierValue, { color: colors.text.primary }]}>
                {detailed?.location_address || detailed?.location || '—'}
              </Text>
            </View>
            <View style={[styles.dossierDivider, { backgroundColor: colors.gold.border }]} />

            <View style={styles.dossierRow}>
              <Text style={[styles.dossierLabel, { color: colors.text.muted }]}>PAYMENT</Text>
              <Text style={[styles.dossierValue, { color: colors.text.primary }]}>
                {formatPeso(detailed?.total_amount ?? detailed?.total_price)}
                {detailed?.payment_status ? ` · ${String(detailed.payment_status).replace(/_/g, ' ')}` : ''}
              </Text>
            </View>

            {detailed?.notes ? (
              <>
                <View style={[styles.dossierDivider, { backgroundColor: colors.gold.border }]} />
                <View style={styles.dossierRow}>
                  <Text style={[styles.dossierLabel, { color: colors.text.muted }]}>STUDIO NOTES</Text>
                  <Text style={[styles.dossierValue, { color: colors.text.secondary }]}>{detailed.notes}</Text>
                </View>
              </>
            ) : null}

            {!detailed && (
              <Text style={[styles.dossierOffline, { color: colors.text.muted }]}>
                Showing cached device copy — reconnect to refresh the live database record.
              </Text>
            )}
          </GlassCard>
        </View>

        {/* ── Active Studio Order Dossier ── */}
        {hasProfile ? (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Camera size={14} color={colors.gold.DEFAULT} />
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
                  <Calendar size={13} color={colors.gold.light} />
                  <Text style={styles.orderMetaText}>
                    {profile?.lastSessionDate ? new Date(profile.lastSessionDate).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    }) : 'Schedule Confirmed'}
                  </Text>
                </View>
                <View style={styles.orderMetaItem}>
                  <Clock size={13} color={colors.gold.light} />
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
              <PremiumIcon icon={QrCode} size={32} box={64} tone="soft" glow />
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
              <Sparkles size={14} color={colors.gold.DEFAULT} />
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
                  <ChevronRight size={16} color={colors.gold.light} style={{ marginLeft: 8 }} />
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

const getStyles = (colors, isDark) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },
  content: { padding: Spacing[4], gap: Spacing[5] },

  header: {
    paddingTop: 54,
    paddingBottom: Spacing[4],
    paddingHorizontal: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.gold.border,
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
  headerSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
  },

  // Profile Card
  profileCard: {
    padding: Spacing[5],
    borderRadius: Radius['2xl'],
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
    backgroundColor: 'rgba(127, 127, 140, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: Typography.fontHeading,
    fontSize: 26,
    color: colors.gold.light,
  },
  avatarPhoto: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  vipTagRow: {
    marginBottom: 4,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gold.bg,
    borderWidth: 0.8,
    borderColor: colors.gold.borderLight,
    borderRadius: Radius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  vipText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    color: colors.gold.light,
    letterSpacing: 1,
  },
  clientNameText: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.lg,
    color: colors.text.primary,
  },
  clientSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
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
    color: colors.text.secondary,
  },

  divider: {
    height: 1,
    backgroundColor: colors.gold.border,
    marginVertical: Spacing[3],
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing[4],
    marginTop: Spacing[2],
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(212, 175, 55, 0.16)' : 'rgba(212, 175, 55, 0.22)',
    borderRadius: Radius.lg,
    paddingVertical: Spacing[2] + 2,
    paddingHorizontal: Spacing[2],
  },
  statNum: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: colors.gold.light,
  },
  statLabel: {
    fontFamily: Typography.fontBody,
    fontSize: 9.5,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 2,
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
    color: colors.gold.light,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Order Card
  orderCard: {
    padding: Spacing[5],
    borderRadius: Radius['2xl'],
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.base,
    color: colors.text.primary,
  },
  orderService: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: Typography.size.xs,
    color: colors.gold.light,
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
    color: colors.text.secondary,
  },

  // Empty Prompt
  emptyPromptCard: {
    padding: Spacing[6],
    alignItems: 'center',
    textAlign: 'center',
    borderRadius: Radius['2xl'],
  },
  promptIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gold.bg,
    borderWidth: 1,
    borderColor: colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
    ...Shadow.goldSoft,
  },
  promptTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.base,
    color: colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  promptBody: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing[2],
  },

  // Mini Pass Cards
  miniPassCard: {
    padding: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[2],
    borderRadius: Radius.xl,
  },
  miniPassNum: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.sm,
    color: colors.text.primary,
  },
  miniPassService: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: colors.text.secondary,
  },

  // Client Dossier (studio database)
  dossierCard: {
    padding: Spacing[5],
    borderRadius: Radius['2xl'],
  },
  dossierRow: {
    gap: 2,
    paddingVertical: 2,
  },
  dossierLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  dossierValue: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
    lineHeight: 20,
  },
  dossierValueMono: {
    fontFamily: Typography.fontMono,
    fontSize: Typography.size.xs,
    letterSpacing: 0.4,
  },
  dossierDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gold.border,
    opacity: 0.35,
    marginVertical: Spacing[2],
  },
  dossierOffline: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: Spacing[3],
    textAlign: 'center',
  },
});
