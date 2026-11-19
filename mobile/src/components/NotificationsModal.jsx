/**
 * NotificationsModal.jsx
 * Collapsible notification cards matching E-Kodak's existing card surfaces,
 * tinted circular badges, colored accent spines, and dropdown details toggle.
 * By default shows icon, header title, time, and dropdown button; clicking
 * expands the full notification message and optional order navigation action.
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  CalendarCheck,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  MapPin,
  Package,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';

import CardDecorElements from './CardDecorElements';
import { useTheme } from '../context/ThemeContext';
import { useResponsiveLayout } from '../utils/responsive';
import { Typography } from '../theme';

function formatRelativeTime(iso) {
  if (!iso) return 'Just now';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 'Recent';
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  try {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

function getAlertVisual(item, isDark) {
  const titleLower = String(item?.title || '').toLowerCase();
  const statusUpper = String(item?.status || '').toUpperCase();
  const isPayment =
    String(item?.id || '').includes('payment') || titleLower.includes('payment');

  if (isPayment) {
    return {
      Icon: CreditCard,
      spine: '#2D8653',
      circleBg: isDark ? 'rgba(20, 168, 107, 0.18)' : 'rgba(20, 168, 107, 0.14)',
      iconColor: isDark ? '#5BE0A8' : '#166534',
    };
  }

  if (
    titleLower.includes('photographer') ||
    statusUpper === 'PHOTOGRAPHER_ASSIGNED' ||
    statusUpper === 'CAPTURE' ||
    statusUpper === 'IN_PROGRESS'
  ) {
    return {
      Icon: Camera,
      spine: '#2F7FE0',
      circleBg: isDark ? 'rgba(47, 127, 224, 0.20)' : 'rgba(47, 127, 224, 0.14)',
      iconColor: isDark ? '#7EB6FF' : '#1E40AF',
    };
  }

  if (statusUpper === 'CONFIRMED' || statusUpper === 'PENDING' || statusUpper === 'RESERVED') {
    return {
      Icon: CalendarCheck,
      spine: '#2F7FE0',
      circleBg: isDark ? 'rgba(47, 127, 224, 0.20)' : 'rgba(47, 127, 224, 0.14)',
      iconColor: isDark ? '#7EB6FF' : '#1E40AF',
    };
  }

  if (
    statusUpper === 'READY' ||
    statusUpper === 'COMPLETED' ||
    statusUpper === 'FINALIZED' ||
    statusUpper === 'PRINTING'
  ) {
    return {
      Icon: Package,
      spine: '#2D8653',
      circleBg: isDark ? 'rgba(20, 168, 107, 0.18)' : 'rgba(20, 168, 107, 0.14)',
      iconColor: isDark ? '#5BE0A8' : '#166534',
    };
  }

  if (
    item?.channel === 'in_app' ||
    titleLower.includes('tracking') ||
    statusUpper === 'UNDER_DELIVERY'
  ) {
    return {
      Icon: item?.source === 'dispatch' ? Sparkles : MapPin,
      spine: '#D9941E',
      circleBg: isDark ? 'rgba(217, 180, 108, 0.20)' : 'rgba(217, 164, 58, 0.20)',
      iconColor: isDark ? '#F3D27A' : '#8A5A10',
    };
  }

  return {
    Icon: Bell,
    spine: '#D9941E',
    circleBg: isDark ? 'rgba(217, 180, 108, 0.20)' : 'rgba(217, 164, 58, 0.20)',
    iconColor: isDark ? '#F3D27A' : '#8A5A10',
  };
}

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'order', label: 'Orders' },
  { id: 'in_app', label: 'In-App' },
];

export default function NotificationsModal({
  visible,
  onClose,
  items = [],
  unreadCount = 0,
  onMarkItemRead,
  onPressItem,
  onMarkAllRead,
  onClearAll,
}) {
  const { isDark, isSage, colors, gradients } = useTheme();
  const layout = useResponsiveLayout();
  const styles = useMemo(
    () => getStyles(colors, isDark, isSage, layout),
    [colors, isDark, isSage, layout]
  );

  const [filter, setFilter] = useState('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState({});

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((n) => n.channel === filter);
  }, [items, filter]);

  const cardGradientColors =
    gradients?.glassCard ||
    gradients?.card ||
    (isDark
      ? ['rgba(36, 32, 42, 0.88)', 'rgba(21, 27, 36, 0.92)']
      : ['rgba(255, 255, 255, 0.97)', 'rgba(246, 248, 252, 0.95)']);

  const sheetGradientColors = isDark
    ? ['#1D1B24', '#121620']
    : isSage
      ? ['#FAFBF8', '#EEF2E9']
      : ['#FBF8F3', '#EEF2F8'];

  const accentColor = isDark ? colors.gold.light : isSage ? colors.gold.DEFAULT : '#9A6B16';
  const isFiltered = filter !== 'all';

  const handleClose = () => {
    setFilterMenuOpen(false);
    onClose?.();
  };

  const toggleExpand = (item) => {
    setExpandedIds((prev) => ({
      ...prev,
      [item.id]: !prev[item.id],
    }));
    if (!item.isRead) {
      onMarkItemRead?.(item);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={[styles.sheetWrapper, layout.modalFrameStyle]}>
          <View style={styles.sheetOuter}>
            <LinearGradient
              colors={sheetGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sheetGradient}
            >
              <CardDecorElements variant="hero" isDark={isDark} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerBellBadge}>
                  <Bell
                    size={20}
                    color={isDark ? colors.gold.light : isSage ? colors.gold.DEFAULT : '#241D14'}
                    strokeWidth={1.85}
                  />
                </View>

                <View style={styles.headerTextCol}>
                  <View style={styles.headerTitleTopRow}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                      Studio Alerts
                    </Text>

                    <View style={styles.headerRightControls}>
                      {unreadCount > 0 && (
                        <View style={styles.newPill}>
                          <View style={styles.newPillDot} />
                          <Text style={styles.newPillText}>{unreadCount} new</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        onPress={() => setFilterMenuOpen((prev) => !prev)}
                        style={[
                          styles.headerCircleBtn,
                          (isFiltered || filterMenuOpen) && {
                            borderColor: accentColor,
                            backgroundColor: colors.gold.bg,
                          },
                        ]}
                        accessibilityLabel="Filter notifications"
                      >
                        <SlidersHorizontal
                          size={14}
                          color={isFiltered || filterMenuOpen ? accentColor : colors.text.secondary}
                          strokeWidth={2.1}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleClose}
                        style={styles.headerCircleBtn}
                        accessibilityLabel="Close studio alerts"
                      >
                        <X size={15} color={colors.text.primary} strokeWidth={2.1} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* Filter Popover Dropdown */}
              {filterMenuOpen && (
                <View style={styles.filterDropdown}>
                  {FILTER_OPTIONS.map((opt, idx) => {
                    const selected = filter === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        activeOpacity={0.8}
                        onPress={() => {
                          setFilter(opt.id);
                          setFilterMenuOpen(false);
                        }}
                        style={[
                          styles.filterOptionRow,
                          idx < FILTER_OPTIONS.length - 1 && styles.filterOptionBorder,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            { color: selected ? accentColor : colors.text.primary },
                            selected && { fontFamily: Typography.fontBodyBold },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {selected && <Check size={14} color={accentColor} strokeWidth={2.4} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Collapsible Notification Cards */}
              <ScrollView
                style={[styles.scrollList, { maxHeight: Math.round(layout.windowHeight * 0.52) }]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onTouchStart={() => filterMenuOpen && setFilterMenuOpen(false)}
              >
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const visual = getAlertVisual(item, isDark);
                    const ItemIcon = visual.Icon;
                    const isExpanded = Boolean(expandedIds[item.id]);
                    const hasAction = Boolean(item.bookingToken || item.booking);

                    return (
                      <View key={item.id} style={styles.notifCardOuter}>
                        <LinearGradient
                          colors={cardGradientColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.notifCardGradient}
                        >
                          <CardDecorElements variant="list" isDark={isDark} />

                          {/* Left color spine */}
                          <View
                            style={[
                              styles.leftAccentSpine,
                              {
                                backgroundColor: visual.spine,
                                opacity: item.isRead ? 0.45 : 1,
                              },
                            ]}
                          />

                          <View style={styles.notifContentWrap}>
                            {/* Compact Default Header Row */}
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() => toggleExpand(item)}
                              style={[
                                styles.notifCardHeaderRow,
                                isExpanded && styles.notifCardHeaderRowExpanded,
                              ]}
                              accessibilityRole="button"
                              accessibilityState={{ expanded: isExpanded }}
                            >
                              <View
                                style={[
                                  styles.notifCircleBadge,
                                  { backgroundColor: visual.circleBg },
                                ]}
                              >
                                <ItemIcon
                                  size={17}
                                  color={visual.iconColor}
                                  strokeWidth={2}
                                />
                              </View>

                              <View style={styles.notifTitleCol}>
                                <Text style={styles.notifTitle} numberOfLines={isExpanded ? 3 : 2}>
                                  {item.title}
                                </Text>
                              </View>

                              <View style={styles.rightMetaRow}>
                                <View style={styles.timeRow}>
                                  <Clock size={11.5} color={accentColor} strokeWidth={2} />
                                  <Text style={[styles.timeText, { color: accentColor }]}>
                                    {formatRelativeTime(item.createdAt)}
                                  </Text>
                                </View>

                                <View style={styles.dropdownChevronBtn}>
                                  {isExpanded ? (
                                    <ChevronUp
                                      size={16}
                                      color={isDark ? colors.text.secondary : '#4B4338'}
                                      strokeWidth={2}
                                    />
                                  ) : (
                                    <ChevronDown
                                      size={16}
                                      color={isDark ? colors.text.secondary : '#4B4338'}
                                      strokeWidth={2}
                                    />
                                  )}
                                </View>
                              </View>
                            </TouchableOpacity>

                            {/* Expandable Details Section */}
                            {isExpanded && (
                              <View style={styles.expandedDetails}>
                                {Boolean(item.message) && (
                                  <Text style={styles.notifMessage}>{item.message}</Text>
                                )}

                                {hasAction && (
                                  <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => onPressItem?.(item)}
                                    style={styles.openOrderRow}
                                  >
                                    <Text style={[styles.openOrderText, { color: accentColor }]}>
                                      View Order Details
                                    </Text>
                                    <ChevronRight size={14} color={accentColor} strokeWidth={2.2} />
                                  </TouchableOpacity>
                                )}
                              </View>
                            )}
                          </View>
                        </LinearGradient>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyCardOuter}>
                    <LinearGradient
                      colors={cardGradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.emptyCardGradient}
                    >
                      <Bell size={20} color={colors.text.muted} strokeWidth={1.7} />
                      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
                        All caught up
                      </Text>
                      <Text style={[styles.emptyDesc, { color: colors.text.muted }]}>
                        No notifications to display right now.
                      </Text>
                    </LinearGradient>
                  </View>
                )}
              </ScrollView>

              {/* Bottom Read / Clear Capsule Bar */}
              {items.length > 0 && (
                <View style={styles.bottomBarOuter}>
                  <LinearGradient
                    colors={cardGradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bottomBarGradient}
                  >
                    <TouchableOpacity
                      activeOpacity={0.78}
                      disabled={unreadCount === 0}
                      onPress={onMarkAllRead}
                      style={[
                        styles.markAllBtn,
                        unreadCount === 0 && { opacity: 0.42 },
                      ]}
                    >
                      <CheckCircle2 size={16} color={accentColor} strokeWidth={2} />
                      <Text style={styles.markAllText}>Mark all read</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={onClearAll}
                      style={styles.clearPillBtn}
                    >
                      <Trash2
                        size={14}
                        color={isDark ? colors.text.primary : '#2C241B'}
                        strokeWidth={2}
                      />
                      <Text style={styles.clearPillText}>Clear</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              )}
            </LinearGradient>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors, isDark, isSage, layout) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(10, 8, 6, 0.72)',
      justifyContent: 'center',
      padding: layout.isCompact ? 12 : 18,
    },
    sheetWrapper: {
      width: '100%',
    },
    sheetOuter: {
      borderRadius: 26,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.22)'
        : isSage
          ? '#D7DDD1'
          : 'rgba(255, 255, 255, 0.90)',
      backgroundColor: isDark ? '#161923' : isSage ? '#FAFBF8' : '#FFFFFF',
      overflow: 'hidden',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: isDark ? 0.42 : 0.20,
      shadowRadius: 26,
      elevation: 12,
    },
    sheetGradient: {
      paddingHorizontal: layout.pad(16, 0.4),
      paddingTop: layout.pad(18, 0.45),
      paddingBottom: layout.pad(16, 0.45),
      position: 'relative',
    },

    // Header
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      marginBottom: 14,
    },
    headerBellBadge: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: isDark
        ? 'rgba(217, 180, 108, 0.16)'
        : isSage
          ? 'rgba(99, 115, 86, 0.14)'
          : 'rgba(229, 189, 103, 0.24)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(217, 180, 108, 0.28)'
        : isSage
          ? 'rgba(99, 115, 86, 0.22)'
          : 'rgba(196, 152, 64, 0.26)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTextCol: {
      flex: 1,
    },
    headerTitleTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    headerTitle: {
      flexShrink: 1,
      fontFamily: Typography.fontHeading,
      fontSize: layout.fs(19, 0.8),
      lineHeight: layout.fs(24, 0.8),
      color: isDark ? colors.text.primary : '#181410',
    },
    headerRightControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    newPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: isDark
        ? 'rgba(217, 180, 108, 0.18)'
        : isSage
          ? 'rgba(99, 115, 86, 0.14)'
          : 'rgba(229, 189, 103, 0.26)',
    },
    newPillDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? colors.gold.light : isSage ? colors.gold.DEFAULT : '#9E6B12',
    },
    newPillText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 11,
      color: isDark ? colors.gold.light : isSage ? colors.gold.DEFAULT : '#4A3614',
    },
    headerCircleBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Filter Popover
    filterDropdown: {
      position: 'absolute',
      top: 56,
      right: 16,
      width: 142,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.gold.borderLight,
      backgroundColor: isDark ? '#1A202D' : '#FFFFFF',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.4 : 0.14,
      shadowRadius: 16,
      elevation: 10,
      zIndex: 30,
      overflow: 'hidden',
    },
    filterOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    filterOptionBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark
        ? 'rgba(180, 198, 224, 0.14)'
        : 'rgba(24, 20, 16, 0.08)',
    },
    filterOptionText: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 13,
    },

    // Notification Cards
    scrollList: {
      flexGrow: 0,
    },
    scrollContent: {
      gap: layout.pad(10, 0.45),
      paddingBottom: 2,
    },
    notifCardOuter: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6',
      backgroundColor: isDark ? '#181E29' : isSage ? '#FCFDFB' : '#FFFFFF',
      overflow: 'hidden',
      shadowColor: '#5B6472',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 10,
      elevation: isDark ? 0 : 2,
    },
    notifCardGradient: {
      flexDirection: 'row',
      borderRadius: 17,
      overflow: 'hidden',
      position: 'relative',
    },
    leftAccentSpine: {
      width: 3.5,
    },
    notifContentWrap: {
      flex: 1,
    },
    notifCardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: layout.pad(12, 0.4),
      paddingVertical: layout.pad(11, 0.45),
      gap: 10,
    },
    notifCardHeaderRowExpanded: {
      paddingBottom: layout.pad(8, 0.35),
    },
    notifCircleBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifTitleCol: {
      flex: 1,
      paddingRight: 4,
    },
    notifTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: layout.fs(13.2, 0.9),
      lineHeight: layout.fs(17.5, 0.9),
      color: isDark ? colors.text.primary : '#181410',
    },
    rightMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    timeText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: layout.fs(11, 0.85),
    },
    dropdownChevronBtn: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    expandedDetails: {
      marginHorizontal: layout.pad(12, 0.4),
      paddingTop: layout.pad(8, 0.35),
      paddingBottom: layout.pad(11, 0.4),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDark
        ? 'rgba(180, 198, 224, 0.14)'
        : 'rgba(24, 20, 16, 0.08)',
    },
    notifMessage: {
      fontFamily: Typography.fontBody,
      fontSize: layout.fs(12, 0.9),
      lineHeight: layout.fs(16.5, 0.9),
      color: isDark ? colors.text.secondary : '#5C5346',
    },
    openOrderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 6,
      alignSelf: 'flex-start',
    },
    openOrderText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: layout.fs(11.5, 0.85),
    },

    // Empty State
    emptyCardOuter: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6',
      backgroundColor: isDark ? '#181E29' : isSage ? '#FCFDFB' : '#FFFFFF',
      overflow: 'hidden',
    },
    emptyCardGradient: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 28,
      paddingHorizontal: 18,
      gap: 6,
    },
    emptyTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: layout.fs(14.5, 0.85),
    },
    emptyDesc: {
      fontFamily: Typography.fontBody,
      fontSize: layout.fs(12, 0.85),
      textAlign: 'center',
    },

    // Bottom Read / Clear Capsule Bar
    bottomBarOuter: {
      marginTop: layout.pad(13, 0.45),
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6',
      backgroundColor: isDark ? '#181E29' : isSage ? '#FCFDFB' : '#FFFFFF',
      overflow: 'hidden',
    },
    bottomBarGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 14,
      paddingRight: 8,
      paddingVertical: 7,
    },
    markAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingVertical: 5,
    },
    markAllText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: layout.fs(12.5, 0.85),
      color: isDark ? colors.text.secondary : '#4A4338',
    },
    clearPillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.08)'
        : isSage
          ? 'rgba(99, 115, 86, 0.10)'
          : 'rgba(24, 20, 16, 0.06)',
    },
    clearPillText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: layout.fs(12.5, 0.85),
      color: isDark ? colors.text.primary : '#181410',
    },
  });
