/**
 * PhotographerShootsScreen.jsx
 * Photographer Shoot Dashboard (Tab 3 — Centered Primary Action):
 *  - Clean GlassHeader (no icon beside "Assigned Shoots") + manual sync button
 *  - Frosted "Your Shoots" header card with status overview
 *  - Search bar + interactive Filter icon revealing All, Pending, Active, and Done
 *  - "Matching Shoots" section text header before shoot cards / empty card
 *  - Shoot queue cards with Pass #, StatusBadge, schedule, client, bay & direct stage action
 *  - Opens interactive ShootDetailModal on card tap
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  RefreshCw,
  Search,
  SlidersHorizontal,
  Check,
  X,
  CalendarDays,
  MapPin,
  ChevronRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';

import GlassBackground from '../components/GlassBackground';
import GlassHeader from '../components/GlassHeader';
import GlassCard from '../components/GlassCard';
import GoldButton from '../components/GoldButton';
import CardDecorElements from '../components/CardDecorElements';
import StudioShapeLoader from '../components/StudioShapeLoader';
import ShootDetailModal from '../components/ShootDetailModal';
import { verifyPhotographerSession } from '../services/bookingService';
import {
  fetchAllAssignedShoots,
  acceptPhotographerAssignment,
  updatePhotographerShootStatus,
  requestPhotographerReschedule,
  formatReadableDate,
  formatTime12,
} from '../services/photographerService';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import { Typography } from '../theme';

const DONE_STATUSES = new Set(['FINALIZED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED']);
const PENDING_STATUSES = new Set(['CONFIRMED']);
const ACTIVE_STATUSES = new Set(['PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 'IN_PROGRESS', 'EDITING', 'RETOUCHING']);
const SHOOT_SCENERY_LIGHT = require('../../assets/cover-atelier-gold.jpg');
const SHOOT_SCENERY_DARK = require('../../assets/cover-velvet-twilight.jpg');

function getQuickStageAction(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'CONFIRMED') {
    return { nextStatus: 'PHOTOGRAPHER_ASSIGNED', label: 'Accept Shoot', kind: 'accept' };
  }
  if (s === 'PHOTOGRAPHER_ASSIGNED') {
    return { nextStatus: 'CAPTURE', label: 'Start Pictorial', kind: 'advance' };
  }
  if (s === 'CAPTURE' || s === 'IN_PROGRESS') {
    return { nextStatus: 'EDITING', label: 'Confirm Pictorial Done', kind: 'advance' };
  }
  return null;
}

export default function PhotographerShootsScreen({ navigation }) {
  const { isDark, isSage, colors } = useTheme();
  const { showAlert } = useDialog();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors, isDark, isSage), [colors, isDark, isSage]);

  const [photographer, setPhotographer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [filterKey, setFilterKey] = useState('all'); // 'all' | 'pending' | 'active' | 'done'
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedShoot, setSelectedShoot] = useState(null);
  const [shootBusy, setShootBusy] = useState(false);
  const [quickBusyId, setQuickBusyId] = useState(null);

  const loadShoots = useCallback(async () => {
    try {
      const auth = await verifyPhotographerSession();
      if (!auth.authorized || !auth.profile?.id) {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        return;
      }
      setPhotographer(auth.profile);

      const res = await fetchAllAssignedShoots(auth.profile.id);
      if (!res.error) {
        setBookings(res.data || []);
      }
    } catch {
      // Keep existing state on transient errors
    } finally {
      setInitialLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadShoots();
    }, [loadShoots]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadShoots();
    setRefreshing(false);
  }, [loadShoots]);

  const counts = useMemo(() => {
    let pending = 0;
    let active = 0;
    let done = 0;
    bookings.forEach((b) => {
      const s = String(b.status || '').toUpperCase();
      if (PENDING_STATUSES.has(s)) pending += 1;
      else if (ACTIVE_STATUSES.has(s)) active += 1;
      else if (DONE_STATUSES.has(s)) done += 1;
    });
    return {
      all: bookings.length,
      pending,
      active,
      done,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      const s = String(b.status || '').toUpperCase();
      if (filterKey === 'pending' && !PENDING_STATUSES.has(s)) return false;
      if (filterKey === 'active' && !ACTIVE_STATUSES.has(s)) return false;
      if (filterKey === 'done' && !DONE_STATUSES.has(s)) return false;

      if (!q) return true;
      const haystack = [
        b.booking_number,
        b.client_name,
        b.package_name,
        b.location,
        b.shoot_date,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [bookings, filterKey, searchQuery]);

  const handleQuickAction = async (booking, quickAction) => {
    if (!photographer?.id || !quickAction || quickBusyId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setQuickBusyId(booking.id);
    try {
      const res =
        quickAction.kind === 'accept'
          ? await acceptPhotographerAssignment({
              bookingId: booking.id,
              photographerId: photographer.id,
              photographerName: photographer.full_name || photographer.email,
              bookingNumber: booking.booking_number,
            })
          : await updatePhotographerShootStatus({
              bookingId: booking.id,
              newStatus: quickAction.nextStatus,
              photographerId: photographer.id,
              photographerName: photographer.full_name || photographer.email,
              bookingNumber: booking.booking_number,
            });

      if (res?.error) {
        showAlert('Update Failed', res.error.message || 'Could not update shoot.');
        return;
      }
      await loadShoots();
    } finally {
      setQuickBusyId(null);
    }
  };

  const handleAcceptModal = async (booking) => {
    if (!photographer?.id) return;
    setShootBusy(true);
    try {
      const res = await acceptPhotographerAssignment({
        bookingId: booking.id,
        photographerId: photographer.id,
        photographerName: photographer.full_name || photographer.email,
        bookingNumber: booking.booking_number,
      });
      if (res.error) {
        showAlert('Accept Failed', res.error.message || 'Could not accept assignment.');
        return;
      }
      setSelectedShoot(null);
      await loadShoots();
    } finally {
      setShootBusy(false);
    }
  };

  const handleAdvanceModal = async (booking, nextStatus) => {
    if (!photographer?.id) return;
    setShootBusy(true);
    try {
      const res = await updatePhotographerShootStatus({
        bookingId: booking.id,
        newStatus: nextStatus,
        photographerId: photographer.id,
        photographerName: photographer.full_name || photographer.email,
        bookingNumber: booking.booking_number,
      });
      if (res.error) {
        showAlert('Update Failed', res.error.message || 'Could not advance stage.');
        return;
      }
      setSelectedShoot(null);
      await loadShoots();
    } finally {
      setShootBusy(false);
    }
  };

  const handleRescheduleModal = async (booking, payload) => {
    if (!photographer?.id) return;
    setShootBusy(true);
    try {
      const res = await requestPhotographerReschedule({
        bookingId: booking.id,
        photographerId: photographer.id,
        photographerName: photographer.full_name || photographer.email,
        bookingNumber: booking.booking_number,
        proposedDate: payload?.proposedDate,
        proposedTime: payload?.proposedTime,
        reason: payload?.reason,
      });
      if (res.error) {
        showAlert('Request Failed', res.error.message || 'Could not send reschedule request.');
        return;
      }
      setSelectedShoot(null);
      await loadShoots();
      showAlert('Reschedule Sent', 'Studio dispatch received your reschedule note.');
    } finally {
      setShootBusy(false);
    }
  };

  const filterOptions = [
    { key: 'all', title: 'All', count: counts.all },
    { key: 'pending', title: 'Pending', count: counts.pending },
    { key: 'active', title: 'Active', count: counts.active },
    { key: 'done', title: 'Done', count: counts.done },
  ];

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <GlassBackground />

      <GlassHeader
        title="Assigned Shoots"
        subtitle="Manage shoot stages & details"
        right={
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={onRefresh}
            activeOpacity={0.75}
            accessibilityLabel="Refresh shoots"
          >
            <RefreshCw size={18} color={colors.text.primary} strokeWidth={2} />
          </TouchableOpacity>
        }
      />

      {initialLoading ? (
        <View style={styles.loaderWrap}>
          <StudioShapeLoader size={88} isDark={isDark} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 120 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold.DEFAULT}
              colors={[colors.gold.DEFAULT]}
            />
          }
        >
          {/* Unified Card: Your Shoots + Search Bar + Filter */}
          <GlassCard style={styles.heroHeaderCard}>
            <CardDecorElements variant="hero" isDark={isDark} />
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroHeaderTextCol}>
                <Text style={styles.heroHeaderTitle}>Your Shoots</Text>
                <Text style={styles.heroHeaderSub}>
                  Review assignments, advance studio stages, and manage deliveries.
                </Text>
              </View>

              <View style={styles.heroCountBox}>
                <Text style={styles.heroCountNum}>{counts.all}</Text>
                <Text style={styles.heroCountLabel}>
                  {counts.all === 1 ? 'Shoot' : 'Shoots'}
                </Text>
              </View>
            </View>

            <View style={styles.unifiedDivider} />

            {/* Search Bar & Filter Icon Row */}
            <View style={styles.searchFilterRow}>
              <View style={styles.searchPill}>
                <Search size={17} color={colors.text.muted} strokeWidth={2} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search client or package"
                  placeholderTextColor={colors.text.muted}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={16} color={colors.text.muted} strokeWidth={2.2} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.filterIconBtn,
                  (filterMenuOpen || filterKey !== 'all') && styles.filterIconBtnActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setFilterMenuOpen((prev) => !prev);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Filter shoots by status"
              >
                <SlidersHorizontal
                  size={18}
                  color={
                    filterKey !== 'all' || filterMenuOpen
                      ? colors.gold.DEFAULT
                      : colors.text.primary
                  }
                  strokeWidth={2.1}
                />
                {filterKey !== 'all' && <View style={styles.filterActiveDot} />}
              </TouchableOpacity>
            </View>

            {/* Filter Menu Dropdown inside same card */}
            {filterMenuOpen && (
              <View style={styles.filterDropdownInner}>
                <Text style={styles.filterMenuTitle}>FILTER BY STATUS</Text>
                <View style={styles.filterMenuGrid}>
                  {filterOptions.map((opt) => {
                    const active = filterKey === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.filterMenuItem,
                          active && styles.filterMenuItemActive,
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setFilterKey(opt.key);
                          setFilterMenuOpen(false);
                        }}
                        activeOpacity={0.82}
                      >
                        <View style={styles.filterMenuItemLeft}>
                          <Text
                            style={[
                              styles.filterMenuItemText,
                              active && styles.filterMenuItemTextActive,
                            ]}
                          >
                            {opt.title}
                          </Text>
                          <Text
                            style={[
                              styles.filterMenuItemCount,
                              active && styles.filterMenuItemCountActive,
                            ]}
                          >
                            ({opt.count})
                          </Text>
                        </View>
                        {active && (
                          <Check
                            size={15}
                            color={colors.gold.DEFAULT}
                            strokeWidth={2.4}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </GlassCard>

          {/* Bigger Header Before Matching Shoots (Filter text removed) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>
              Matching Shoots ({filteredBookings.length})
            </Text>
          </View>

          {/* Shoot Cards with Scenery & Frosty Blur */}
          {filteredBookings.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <CardDecorElements variant="corner" isDark={isDark} />
              <View style={styles.emptyIconWrap}>
                <Sparkles size={24} color={colors.gold.DEFAULT} strokeWidth={1.9} />
              </View>
              <Text style={styles.emptyTitle}>No Matching Shoots</Text>
              <Text style={styles.emptySub}>
                {searchQuery.trim()
                  ? 'Try another client name, package, or clear the filter.'
                  : 'Assigned shoots will appear here as soon as studio dispatch assigns them.'}
              </Text>
            </GlassCard>
          ) : (
            filteredBookings.map((shoot) => {
              const quickAction = getQuickStageAction(shoot.status);
              const isBusy = quickBusyId === shoot.id;
              const shootClient =
                shoot.profile?.full_name || shoot.client_name || 'Studio Client';
              const shootPackage =
                shoot.package_name || shoot.services?.name || 'Studio Session';
              const shootDateLabel = formatReadableDate(
                shoot.session_date || shoot.shoot_date || shoot.booking_date,
              );
              const shootTimeLabel = formatTime12(
                shoot.session_time || shoot.shoot_time || shoot.preferred_time,
              );
              const shootLocation =
                shoot.location_address || shoot.location || 'Main Studio Bay';
              const frostScrimColors = isDark
                ? ['rgba(16, 23, 20, 0.74)', 'rgba(18, 28, 24, 0.56)', 'rgba(14, 20, 17, 0.82)']
                : isSage
                  ? ['rgba(255, 255, 255, 0.74)', 'rgba(244, 248, 242, 0.52)', 'rgba(232, 240, 228, 0.74)']
                  : ['rgba(255, 252, 246, 0.78)', 'rgba(250, 243, 230, 0.54)', 'rgba(244, 234, 214, 0.78)'];

              return (
                <View key={shoot.id} style={styles.shootSceneryCardWrap}>
                  <View style={styles.shootSceneryCard}>
                    <Image
                      source={isDark ? SHOOT_SCENERY_DARK : SHOOT_SCENERY_LIGHT}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                    <BlurView
                      intensity={isDark ? 36 : 30}
                      tint={isDark ? 'dark' : 'light'}
                      style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                      colors={frostScrimColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />

                    <View style={styles.shootCardContent}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setSelectedShoot(shoot);
                        }}
                      >
                        <Text style={styles.clientName} numberOfLines={1}>
                          {shootClient}
                        </Text>

                        <Text style={styles.packageLabel} numberOfLines={1}>
                          {shootPackage}
                        </Text>

                        <View style={styles.shootFrostSchedulePill}>
                          <CalendarDays
                            size={15}
                            color={isDark ? colors.gold.light : colors.gold.DEFAULT}
                            strokeWidth={2.1}
                          />
                          <Text style={styles.shootScheduleText} numberOfLines={1}>
                            {shootDateLabel}
                            {shootTimeLabel ? ` • ${shootTimeLabel}` : ''}
                          </Text>
                        </View>

                        <View style={styles.metaRow}>
                          <MapPin
                            size={14}
                            color={isDark ? 'rgba(255,255,255,0.72)' : '#574E42'}
                            strokeWidth={2}
                          />
                          <Text style={styles.metaText} numberOfLines={1}>
                            {shootLocation}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.cardDivider} />

                      <View style={styles.cardFooterRow}>
                        {quickAction ? (
                          <View style={{ flex: 1 }}>
                            <GoldButton
                              loading={isBusy}
                              onPress={() => handleQuickAction(shoot, quickAction)}
                            >
                              {isBusy ? 'Updating...' : quickAction.label}
                            </GoldButton>
                          </View>
                        ) : (
                          <View style={styles.donePill}>
                            <CheckCircle2
                              size={15}
                              color={colors.gold.DEFAULT}
                              strokeWidth={2.2}
                            />
                            <Text style={styles.donePillText}>Workflow Complete</Text>
                          </View>
                        )}

                        <TouchableOpacity
                          style={styles.dossierBtn}
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => {});
                            setSelectedShoot(shoot);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.dossierBtnText}>Details</Text>
                          <ChevronRight
                            size={15}
                            color={isDark ? '#FFFFFF' : colors.text.primary}
                            strokeWidth={2.2}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <ShootDetailModal
        visible={Boolean(selectedShoot)}
        booking={selectedShoot}
        busy={shootBusy}
        onClose={() => setSelectedShoot(null)}
        onAccept={handleAcceptModal}
        onAdvanceStatus={handleAdvanceModal}
        onRequestReschedule={handleRescheduleModal}
        onViewSession={(booking) => {
          setSelectedShoot(null);
          setFilterKey('all');
          setSearchQuery(booking.booking_number || '');
        }}
      />
    </View>
  );
}

const getStyles = (colors, isDark, isSage) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg.base,
    },
    headerActionBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.08)'
        : isSage
          ? 'rgba(79, 104, 70, 0.10)'
          : 'rgba(15, 23, 42, 0.06)',
    },
    loaderWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 10,
    },
    heroHeaderCard: {
      padding: 18,
      marginBottom: 14,
      overflow: 'hidden',
    },
    heroHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    heroHeaderTextCol: {
      flex: 1,
    },
    heroHeaderTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 22,
      lineHeight: 27,
      color: colors.gold.DEFAULT,
      marginBottom: 4,
    },
    heroHeaderSub: {
      fontFamily: Typography.fontBody,
      fontSize: 13,
      lineHeight: 18.5,
      color: colors.text.secondary,
    },
    heroCountBox: {
      minWidth: 64,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.gold.bg,
    },
    heroCountNum: {
      fontFamily: Typography.fontHeading,
      fontSize: 22,
      lineHeight: 26,
      color: colors.gold.DEFAULT,
      includeFontPadding: false,
    },
    heroCountLabel: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 11,
      color: colors.text.secondary,
      marginTop: 2,
    },
    unifiedDivider: {
      height: 1,
      marginVertical: 14,
      backgroundColor: colors.surface.divider,
    },
    searchFilterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    searchPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      height: 46,
      borderRadius: 16,
      backgroundColor: isDark
        ? 'rgba(31, 41, 55, 0.88)'
        : isSage
          ? 'rgba(255, 255, 254, 0.92)'
          : 'rgba(255, 255, 255, 0.92)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(255, 255, 255, 0.11)'
        : isSage
          ? 'rgba(208, 217, 198, 0.9)'
          : 'rgba(226, 232, 240, 0.95)',
    },
    searchInput: {
      flex: 1,
      fontFamily: Typography.fontBody,
      fontSize: 14,
      color: colors.text.primary,
      paddingVertical: 0,
    },
    filterIconBtn: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundColor: isDark
        ? 'rgba(31, 41, 55, 0.88)'
        : isSage
          ? 'rgba(255, 255, 254, 0.92)'
          : 'rgba(255, 255, 255, 0.92)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(255, 255, 255, 0.11)'
        : isSage
          ? 'rgba(208, 217, 198, 0.9)'
          : 'rgba(226, 232, 240, 0.95)',
    },
    filterIconBtnActive: {
      borderColor: colors.gold.DEFAULT,
      backgroundColor: colors.gold.bg,
    },
    filterActiveDot: {
      position: 'absolute',
      top: 9,
      right: 9,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.gold.DEFAULT,
    },
    filterDropdownInner: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.surface.divider,
    },
    filterMenuTitle: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 10.5,
      letterSpacing: 1,
      color: colors.text.muted,
      marginBottom: 10,
    },
    filterMenuGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterMenuItem: {
      flexBasis: '48%',
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(255, 255, 255, 0.10)'
        : isSage
          ? 'rgba(208, 217, 198, 0.85)'
          : 'rgba(226, 232, 240, 0.95)',
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.04)'
        : 'rgba(255, 255, 255, 0.65)',
    },
    filterMenuItemActive: {
      borderColor: colors.gold.DEFAULT,
      backgroundColor: colors.gold.bg,
    },
    filterMenuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    filterMenuItemText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 13.5,
      color: colors.text.primary,
    },
    filterMenuItemTextActive: {
      color: colors.gold.DEFAULT,
    },
    filterMenuItemCount: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 12.5,
      color: colors.text.muted,
    },
    filterMenuItemCountActive: {
      color: colors.gold.DEFAULT,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    sectionHeading: {
      fontFamily: Typography.fontHeading,
      fontSize: 21,
      lineHeight: 26,
      color: colors.text.primary,
    },
    emptyCard: {
      padding: 28,
      alignItems: 'center',
      overflow: 'hidden',
    },
    emptyIconWrap: {
      width: 54,
      height: 54,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      backgroundColor: colors.gold.bg,
    },
    emptyTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 17,
      color: colors.text.primary,
      marginBottom: 6,
    },
    emptySub: {
      fontFamily: Typography.fontBody,
      fontSize: 13.5,
      color: colors.text.muted,
      textAlign: 'center',
      lineHeight: 19,
    },
    shootSceneryCardWrap: {
      marginBottom: 14,
      borderRadius: 24,
      shadowColor: isDark ? '#000000' : '#4E4332',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.34 : 0.12,
      shadowRadius: 16,
      elevation: isDark ? 0 : 4,
    },
    shootSceneryCard: {
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.78)',
      position: 'relative',
    },
    shootCardContent: {
      padding: 18,
    },
    clientName: {
      fontFamily: Typography.fontHeading,
      fontSize: 19,
      color: isDark ? '#F8FAFC' : '#181410',
      marginBottom: 3,
    },
    packageLabel: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 13.5,
      color: isDark ? 'rgba(255, 255, 255, 0.78)' : '#574E42',
      marginBottom: 12,
    },
    shootFrostSchedulePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.62)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.85)',
      marginBottom: 10,
    },
    shootScheduleText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 13.5,
      color: isDark ? '#FFFFFF' : '#181410',
      flex: 1,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 2,
    },
    metaText: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 13.5,
      color: isDark ? 'rgba(255, 255, 255, 0.80)' : '#4B4338',
      flex: 1,
    },
    cardDivider: {
      height: 1,
      marginVertical: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(24, 20, 16, 0.10)',
    },
    cardFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    donePill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.10)'
        : 'rgba(255, 255, 255, 0.65)',
    },
    donePillText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 13,
      color: isDark ? '#F8FAFC' : colors.text.secondary,
    },
    dossierBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(255, 255, 255, 0.72)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(255, 255, 255, 0.18)'
        : 'rgba(255, 255, 255, 0.88)',
    },
    dossierBtnText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 13,
      color: isDark ? '#FFFFFF' : colors.text.primary,
    },
  });
