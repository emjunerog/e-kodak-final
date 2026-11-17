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
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
} from 'react-native';
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
  Clock,
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
import StatusBadge from '../components/StatusBadge';
import StudioShapeLoader from '../components/StudioShapeLoader';
import ShootDetailModal from '../components/ShootDetailModal';
import { verifyPhotographerSession } from '../services/bookingService';
import {
  fetchAllAssignedShoots,
  acceptPhotographerAssignment,
  declinePhotographerAssignment,
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

function getQuickStageAction(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'CONFIRMED') {
    return { nextStatus: 'PHOTOGRAPHER_ASSIGNED', label: 'Accept Shoot', kind: 'accept' };
  }
  if (s === 'PHOTOGRAPHER_ASSIGNED') {
    return { nextStatus: 'CAPTURE', label: 'Start Pictorial', kind: 'advance' };
  }
  if (s === 'CAPTURE' || s === 'IN_PROGRESS') {
    return { nextStatus: 'EDITING', label: 'Finish & Edit', kind: 'advance' };
  }
  if (s === 'EDITING') {
    return { nextStatus: 'RETOUCHING', label: 'Move to Retouching', kind: 'advance' };
  }
  if (s === 'RETOUCHING') {
    return { nextStatus: 'FINALIZED', label: 'Mark Finalized', kind: 'advance' };
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

  const handleDeclineModal = async (booking, reason) => {
    if (!photographer?.id) return;
    setShootBusy(true);
    try {
      const res = await declinePhotographerAssignment({
        bookingId: booking.id,
        photographerId: photographer.id,
        photographerName: photographer.full_name || photographer.email,
        bookingNumber: booking.booking_number,
        reason,
      });
      if (res.error) {
        showAlert('Decline Failed', res.error.message || 'Could not decline assignment.');
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

  const activeFilterOption =
    filterOptions.find((f) => f.key === filterKey) || filterOptions[0];

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
          {/* Header Card: Your Shoots */}
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
          </GlassCard>

          {/* Search Bar & Filter Icon Row */}
          <View style={styles.searchFilterRow}>
            <View style={styles.searchPill}>
              <Search size={17} color={colors.text.muted} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search pass #, client, or package"
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

          {/* Filter Menu Dropdown: All, Pending, Active, Done */}
          {filterMenuOpen && (
            <GlassCard style={styles.filterDropdownCard}>
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
            </GlassCard>
          )}

          {/* Text Header Before Matching Shoots */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>
              Matching Shoots ({filteredBookings.length})
            </Text>
            <Text style={styles.sectionMeta}>
              Filter: {activeFilterOption.title}
            </Text>
          </View>

          {/* Shoot Cards */}
          {filteredBookings.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <CardDecorElements variant="corner" isDark={isDark} />
              <View style={styles.emptyIconWrap}>
                <Sparkles size={24} color={colors.gold.DEFAULT} strokeWidth={1.9} />
              </View>
              <Text style={styles.emptyTitle}>No Matching Shoots</Text>
              <Text style={styles.emptySub}>
                {searchQuery.trim()
                  ? 'Try another pass number, client name, or clear the filter.'
                  : 'Assigned shoots will appear here as soon as studio dispatch assigns them.'}
              </Text>
            </GlassCard>
          ) : (
            filteredBookings.map((shoot) => {
              const quickAction = getQuickStageAction(shoot.status);
              const isBusy = quickBusyId === shoot.id;
              return (
                <GlassCard key={shoot.id} style={styles.shootCard}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSelectedShoot(shoot);
                    }}
                  >
                    <View style={styles.shootTopRow}>
                      <View style={styles.passBadge}>
                        <Text style={styles.passBadgeText}>
                          {shoot.booking_number || 'PASS'}
                        </Text>
                      </View>
                      <StatusBadge status={shoot.status} />
                    </View>

                    <Text style={styles.clientName} numberOfLines={1}>
                      {shoot.client_name || 'Studio Client'}
                    </Text>

                    <Text style={styles.packageLabel} numberOfLines={1}>
                      {shoot.package_name || 'Studio Session'}
                    </Text>

                    <View style={styles.metaGrid}>
                      <View style={styles.metaRow}>
                        <CalendarDays size={14} color={colors.gold.DEFAULT} strokeWidth={2} />
                        <Text style={styles.metaText}>
                          {formatReadableDate(shoot.shoot_date || shoot.booking_date)}
                        </Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Clock size={14} color={colors.gold.DEFAULT} strokeWidth={2} />
                        <Text style={styles.metaText}>
                          {formatTime12(shoot.shoot_time)}
                        </Text>
                      </View>
                      <View style={styles.metaRow}>
                        <MapPin size={14} color={colors.text.muted} strokeWidth={2} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {shoot.location || 'Main Studio Bay'}
                        </Text>
                      </View>
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
                        <CheckCircle2 size={15} color={colors.gold.DEFAULT} strokeWidth={2.2} />
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
                      <ChevronRight size={15} color={colors.text.primary} strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>
                </GlassCard>
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
        onDecline={handleDeclineModal}
        onAdvanceStatus={handleAdvanceModal}
        onRequestReschedule={handleRescheduleModal}
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
    searchFilterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
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
    filterDropdownCard: {
      padding: 14,
      marginBottom: 14,
      overflow: 'hidden',
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
      marginBottom: 10,
      paddingHorizontal: 2,
    },
    sectionHeading: {
      fontFamily: Typography.fontHeading,
      fontSize: 17,
      color: colors.text.primary,
    },
    sectionMeta: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 12.5,
      color: colors.text.muted,
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
    shootCard: {
      padding: 16,
      marginBottom: 13,
    },
    shootTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    passBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: colors.gold.bg,
    },
    passBadgeText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 11.5,
      color: colors.gold.DEFAULT,
    },
    clientName: {
      fontFamily: Typography.fontHeading,
      fontSize: 17.5,
      color: colors.text.primary,
      marginBottom: 2,
    },
    packageLabel: {
      fontFamily: Typography.fontBody,
      fontSize: 13,
      color: colors.text.muted,
      marginBottom: 10,
    },
    metaGrid: {
      gap: 6,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    metaText: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 13.5,
      color: colors.text.secondary,
      flex: 1,
    },
    cardDivider: {
      height: 1,
      marginVertical: 12,
      backgroundColor: colors.surface.divider,
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
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(15, 23, 42, 0.04)',
    },
    donePillText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 13,
      color: colors.text.secondary,
    },
    dossierBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.09)'
        : isSage
          ? 'rgba(79, 104, 70, 0.10)'
          : 'rgba(15, 23, 42, 0.06)',
    },
    dossierBtnText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 13,
      color: colors.text.primary,
    },
  });
