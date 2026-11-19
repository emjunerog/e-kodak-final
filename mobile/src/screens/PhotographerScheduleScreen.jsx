/**
 * PhotographerScheduleScreen.jsx
 * Photographer Schedule Dashboard (Tab 2):
 *  - Clean GlassHeader (no calendar icon beside "My Schedule") + manual sync button
 *  - Centered Hero Today Date Card showing today's date, shoots count & duty status
 *  - Theme-matched frosted Monthly Calendar card with month switching & shoot/availability dots
 *  - Weekly Mon–Fri strip (7-day week with Saturday & Sunday removed)
 *  - Selected-day availability card showing current status & studio hours
 *  - Floating Pencil FAB opening the Day Availability & Custom Hours sheet for the selected date
 *  - Chronological assigned shoot lineup opening interactive ShootDetailModal
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Modal,
  TextInput,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  RefreshCw,
  CalendarDays,
  Clock,
  MapPin,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  X,
  CalendarOff,
  Camera,
  Pencil,
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
  toLocalISODate,
  normalizeDateStr,
  formatTime12,
  formatReadableDate,
  fetchAllAssignedShoots,
  fetchPhotographerAvailability,
  saveDayAvailability,
  acceptPhotographerAssignment,
  updatePhotographerShootStatus,
  requestPhotographerReschedule,
} from '../services/photographerService';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import { Typography } from '../theme';

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LINEUP_SCENERY_LIGHT = require('../../assets/cover-atelier-gold.jpg');
const LINEUP_SCENERY_DARK = require('../../assets/cover-velvet-twilight.jpg');

function parseLocalDate(dateStr) {
  const parts = String(dateStr || '').split('-').map(Number);
  if (parts.length === 3 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1]) && !Number.isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

/**
 * Builds the 5 Mon–Fri workdays for the 7-day week containing `anchorDateStr`,
 * removing Saturday and Sunday.
 */
function buildWorkweekDays(anchorDateStr, todayKey) {
  const anchor = parseLocalDate(anchorDateStr);
  const dow = anchor.getDay(); // 0=Sun..6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + diffToMonday);

  const days = [];
  for (let i = 0; i < 5; i += 1) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = toLocalISODate(d);
    days.push({
      key,
      weekday: key === todayKey ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
    });
  }
  return days;
}

/**
 * Builds calendar grid rows (7 columns Sun–Sat) for `(year, monthIndex)`.
 */
function buildMonthCalendarCells(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const startDow = firstDay.getDay(); // 0=Sun..6=Sat
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

  const cells = [];
  for (let idx = 0; idx < totalCells; idx += 1) {
    const dayOffset = idx - startDow;
    const cellDate = new Date(year, monthIndex, 1 + dayOffset);
    const inCurrentMonth = cellDate.getMonth() === monthIndex;
    const dow = cellDate.getDay();
    cells.push({
      key: toLocalISODate(cellDate),
      dayNum: cellDate.getDate(),
      inCurrentMonth,
      isWeekend: dow === 0 || dow === 6,
      year: cellDate.getFullYear(),
      monthIndex: cellDate.getMonth(),
    });
  }
  return cells;
}

const AVAILABILITY_MODES = [
  {
    key: 'available',
    label: 'Available',
    sub: '8:00 AM - 5:00 PM studio hours',
    Icon: CheckCircle2,
  },
  {
    key: 'partial',
    label: 'Custom Hours',
    sub: 'Set custom start & end window',
    Icon: Clock,
  },
  {
    key: 'off',
    label: 'Off-Duty',
    sub: 'Blocked from new assignments',
    Icon: CalendarOff,
  },
];

export default function PhotographerScheduleScreen({ navigation }) {
  const { isDark, isSage, colors, gradients } = useTheme();
  const { showAlert } = useDialog();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors, isDark, isSage), [colors, isDark, isSage]);

  const todayKey = useMemo(() => toLocalISODate(), []);
  const todayDateObj = useMemo(() => parseLocalDate(todayKey), [todayKey]);

  const [selectedDateKey, setSelectedDateKey] = useState(() => toLocalISODate());
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: todayDateObj.getFullYear(),
    monthIndex: todayDateObj.getMonth(),
  }));

  const workweekDays = useMemo(
    () => buildWorkweekDays(selectedDateKey, todayKey),
    [selectedDateKey, todayKey],
  );
  const monthCells = useMemo(
    () => buildMonthCalendarCells(calendarMonth.year, calendarMonth.monthIndex),
    [calendarMonth.year, calendarMonth.monthIndex],
  );

  const monthTitle = useMemo(() => {
    const d = new Date(calendarMonth.year, calendarMonth.monthIndex, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [calendarMonth.year, calendarMonth.monthIndex]);

  const isViewingTodayMonth =
    calendarMonth.year === todayDateObj.getFullYear() &&
    calendarMonth.monthIndex === todayDateObj.getMonth();

  const [photographer, setPhotographer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [availabilityMap, setAvailabilityMap] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Shoot detail modal state
  const [selectedShoot, setSelectedShoot] = useState(null);
  const [shootBusy, setShootBusy] = useState(false);

  // Availability editor bottom sheet state
  const [availModalOpen, setAvailModalOpen] = useState(false);
  const [availMode, setAvailMode] = useState('available');
  const [availStartTime, setAvailStartTime] = useState('08:00');
  const [availEndTime, setAvailEndTime] = useState('17:00');
  const [availNotes, setAvailNotes] = useState('');
  const [savingAvail, setSavingAvail] = useState(false);

  const [availFade] = useState(() => new Animated.Value(0));
  const [availSlide] = useState(() => new Animated.Value(48));

  useEffect(() => {
    if (availModalOpen) {
      availFade.setValue(0);
      availSlide.setValue(48);
      Animated.parallel([
        Animated.timing(availFade, {
          toValue: 1,
          duration: 210,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(availSlide, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [availModalOpen, availFade, availSlide]);

  const loadSchedule = useCallback(async () => {
    try {
      const auth = await verifyPhotographerSession();
      if (!auth.authorized || !auth.profile?.id) {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        return;
      }
      setPhotographer(auth.profile);

      const [shootsRes, availRes] = await Promise.all([
        fetchAllAssignedShoots(auth.profile.id),
        fetchPhotographerAvailability(auth.profile.id),
      ]);

      if (!shootsRes.error) {
        setBookings(shootsRes.data || []);
      }

      if (!availRes.error && Array.isArray(availRes.data)) {
        const nextMap = {};
        availRes.data.forEach((row) => {
          if (row.dateKey) nextMap[row.dateKey] = row;
        });
        setAvailabilityMap(nextMap);
      }
    } catch {
      // Keep existing state
    } finally {
      setInitialLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadSchedule();
    }, [loadSchedule]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  }, [loadSchedule]);

  // Group shoots by normalized YYYY-MM-DD key
  const shootsByDate = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      const key = normalizeDateStr(b.session_date || b.shoot_date || b.booking_date);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) =>
        String(a.session_time || a.shoot_time || '').localeCompare(
          String(b.session_time || b.shoot_time || ''),
        ),
      );
    });
    return map;
  }, [bookings]);

  const dayShoots = shootsByDate[selectedDateKey] || [];
  const selectedDayAvail = availabilityMap[selectedDateKey];
  const activeAvailStatus = selectedDayAvail?.status || 'unset';

  const shiftMonth = (delta) => {
    Haptics.selectionAsync().catch(() => {});
    setCalendarMonth((prev) => {
      const d = new Date(prev.year, prev.monthIndex + delta, 1);
      return { year: d.getFullYear(), monthIndex: d.getMonth() };
    });
  };

  const jumpToToday = () => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedDateKey(todayKey);
    setCalendarMonth({
      year: todayDateObj.getFullYear(),
      monthIndex: todayDateObj.getMonth(),
    });
  };

  const handleSelectDate = (dateKey, yearOverride, monthOverride) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedDateKey(dateKey);
    if (typeof yearOverride === 'number' && typeof monthOverride === 'number') {
      setCalendarMonth({ year: yearOverride, monthIndex: monthOverride });
    }
    const dayOrders = shootsByDate[dateKey] || [];
    const savedDay = availabilityMap[dateKey];

    if (dayOrders.length > 0) {
      const summaryLines = dayOrders
        .slice(0, 3)
        .map(
          (s) =>
            `• ${s.profile?.full_name || s.client_name || 'Studio Client'} (${formatTime12(s.session_time || s.shoot_time) || 'Scheduled'})`,
        )
        .join('\n');
      const extraCount = dayOrders.length > 3 ? `\n+${dayOrders.length - 3} more` : '';
      const availLine = savedDay
        ? `\n\nAvailability: ${
            savedDay.status === 'available'
              ? 'Available'
              : savedDay.status === 'partial'
                ? `${formatTime12(savedDay.startTime || '08:00')} - ${formatTime12(savedDay.endTime || '17:00')}`
                : 'Off-Duty'
          }`
        : '';
      showAlert(
        'Order Scheduled on This Day',
        `You have ${dayOrders.length} assigned ${dayOrders.length === 1 ? 'shoot' : 'shoots'}:\n${summaryLines}${extraCount}${availLine}`,
      );
      return;
    }

    if (savedDay) {
      if (savedDay.status === 'available') {
        showAlert('Availability', 'You are available in this day');
      } else if (savedDay.status === 'partial') {
        showAlert(
          'Custom Schedule',
          `You are available in this day from ${formatTime12(savedDay.startTime || '08:00')} to ${formatTime12(savedDay.endTime || '17:00')}.`,
        );
      } else if (savedDay.status === 'off') {
        showAlert('Off-Duty', 'You marked this day as Off-Duty.');
      }
    }
  };

  const openAvailabilityEditor = () => {
    Haptics.selectionAsync().catch(() => {});
    const current = availabilityMap[selectedDateKey];
    setAvailMode(current?.status || 'available');
    setAvailStartTime(current?.startTime || '08:00');
    setAvailEndTime(current?.endTime || '17:00');
    setAvailNotes(current?.notes || '');
    setAvailModalOpen(true);
  };

  const closeAvailabilityEditor = () => {
    Animated.parallel([
      Animated.timing(availFade, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(availSlide, {
        toValue: 40,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setAvailModalOpen(false));
  };

  const handleSaveAvailability = async () => {
    if (!photographer?.id) return;
    setSavingAvail(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const res = await saveDayAvailability({
        photographerId: photographer.id,
        date: selectedDateKey,
        status: availMode,
        startTime: availMode === 'off' ? null : availStartTime.trim() || '08:00',
        endTime: availMode === 'off' ? null : availEndTime.trim() || '17:00',
        notes: availNotes.trim(),
      });

      if (res.error) {
        showAlert('Could Not Save', res.error.message || 'Please check your connection and try again.');
        return;
      }

      await loadSchedule();
      closeAvailabilityEditor();
      showAlert(
        'Schedule Updated',
        `${formatReadableDate(selectedDateKey)} marked as ${
          availMode === 'available'
            ? 'Available'
            : availMode === 'partial'
              ? 'Custom Hours'
              : 'Off-Duty'
        }.`,
      );
    } finally {
      setSavingAvail(false);
    }
  };

  const handleAcceptShoot = async (booking) => {
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
      await loadSchedule();
    } finally {
      setShootBusy(false);
    }
  };

  const handleAdvanceStatus = async (booking, nextStatus) => {
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
      await loadSchedule();
    } finally {
      setShootBusy(false);
    }
  };

  const handleRequestReschedule = async (booking, payload) => {
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
      await loadSchedule();
      showAlert('Reschedule Sent', 'Studio dispatch received your reschedule note.');
    } finally {
      setShootBusy(false);
    }
  };

  const getAvailabilityPillMeta = (status) => {
    if (status === 'unset') {
      return {
        label: 'No Schedule',
        statement: 'No inputted schedule',
        dot: isDark ? '#94A3B8' : '#64748B',
        bg: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(100, 116, 139, 0.12)',
        text: isDark ? '#CBD5E1' : '#475569',
        frostColors: isDark
          ? ['rgba(148, 163, 184, 0.0)', 'rgba(148, 163, 184, 0.06)', 'rgba(148, 163, 184, 0.12)']
          : ['rgba(255, 255, 255, 0.0)', 'rgba(241, 245, 249, 0.55)', 'rgba(226, 232, 240, 0.40)'],
      };
    }
    if (status === 'off') {
      return {
        label: 'Off-Duty',
        statement: 'Off-duty',
        dot: '#EF4444',
        bg: isDark ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.14)',
        text: isDark ? '#FCA5A5' : '#B91C1C',
        frostColors: isDark
          ? ['rgba(239, 68, 68, 0.0)', 'rgba(239, 68, 68, 0.09)', 'rgba(239, 68, 68, 0.17)']
          : ['rgba(255, 255, 255, 0.0)', 'rgba(254, 226, 226, 0.42)', 'rgba(254, 202, 202, 0.36)'],
      };
    }
    if (status === 'partial') {
      return {
        label: 'Custom Hours',
        statement: 'Custom hours',
        dot: '#F59E0B',
        bg: isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.15)',
        text: isDark ? '#FCD34D' : '#B45309',
        frostColors: isDark
          ? ['rgba(245, 158, 11, 0.0)', 'rgba(245, 158, 11, 0.09)', 'rgba(245, 158, 11, 0.16)']
          : ['rgba(255, 255, 255, 0.0)', 'rgba(254, 243, 199, 0.48)', 'rgba(253, 230, 138, 0.34)'],
      };
    }
    return {
      label: 'Available',
      statement: 'Full day available',
      dot: '#10B981',
      bg: isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.14)',
      text: isDark ? '#6EE7B7' : '#047857',
      frostColors: isDark
        ? ['rgba(16, 185, 129, 0.0)', 'rgba(16, 185, 129, 0.09)', 'rgba(16, 185, 129, 0.16)']
        : isSage
          ? ['rgba(255, 255, 255, 0.0)', 'rgba(220, 238, 224, 0.50)', 'rgba(198, 228, 208, 0.36)']
          : ['rgba(255, 255, 255, 0.0)', 'rgba(209, 250, 229, 0.44)', 'rgba(167, 243, 208, 0.30)'],
    };
  };

  const availMeta = getAvailabilityPillMeta(activeAvailStatus);

  const selectedDateObj = useMemo(() => parseLocalDate(selectedDateKey), [selectedDateKey]);
  const selectedDayLabel =
    selectedDateKey === todayKey
      ? 'TODAY'
      : selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const selectedFormattedDate = selectedDateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const selectedCustomNote = useMemo(() => {
    const raw = String(selectedDayAvail?.notes || '').trim();
    if (
      !raw ||
      raw === 'Full Day Available' ||
      raw === 'Off Duty / Unavailable' ||
      raw.startsWith('Custom hours:')
    ) {
      return '';
    }
    return raw;
  }, [selectedDayAvail?.notes]);

  const todayWeekdayName = todayDateObj
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toUpperCase();
  const todayMonthYear = todayDateObj.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <GlassBackground />

      <GlassHeader
        title="My Schedule"
        subtitle="Monthly calendar & workweek"
        right={
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={onRefresh}
            activeOpacity={0.75}
            accessibilityLabel="Refresh schedule"
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
            { paddingBottom: 152 + insets.bottom },
          ]}
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
          {/* Single Bigger Centered Today Date Spotlight Card */}
          <TouchableOpacity activeOpacity={0.9} onPress={jumpToToday}>
            <GlassCard style={styles.todayHeroCard}>
              <CardDecorElements variant="hero" isDark={isDark} />
              <View style={styles.todayBadgePill}>
                <Text style={styles.todayBadgeText}>TODAY</Text>
              </View>
              <Text style={styles.todayWeekdayText}>{todayWeekdayName}</Text>
              <Text style={styles.todayDayNumber}>{todayDateObj.getDate()}</Text>
              <Text style={styles.todayMonthYearText}>{todayMonthYear}</Text>
            </GlassCard>
          </TouchableOpacity>

          {/* Monthly Calendar Card */}
          <GlassCard style={styles.calendarCard}>
            <CardDecorElements variant="corner" isDark={isDark} />

            <View style={styles.calHeaderRow}>
              <TouchableOpacity
                style={styles.calNavBtn}
                onPress={() => shiftMonth(-1)}
                activeOpacity={0.75}
                accessibilityLabel="Previous month"
              >
                <ChevronLeft size={18} color={colors.text.primary} strokeWidth={2.2} />
              </TouchableOpacity>

              <View style={styles.calTitleGroup}>
                <Text style={styles.calMonthTitle}>{monthTitle}</Text>
                {!isViewingTodayMonth && (
                  <TouchableOpacity
                    style={styles.calTodayJumpPill}
                    onPress={jumpToToday}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.calTodayJumpText}>Today</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.calNavBtn}
                onPress={() => shiftMonth(1)}
                activeOpacity={0.75}
                accessibilityLabel="Next month"
              >
                <ChevronRight size={18} color={colors.text.primary} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            {/* Weekday Header Row */}
            <View style={styles.calWeekdayRow}>
              {WEEKDAY_HEADERS.map((wd) => (
                <View key={wd} style={styles.calWeekdayCell}>
                  <Text
                    style={[
                      styles.calWeekdayText,
                      (wd === 'Sun' || wd === 'Sat') && styles.calWeekendLabel,
                    ]}
                  >
                    {wd}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar Day Grid */}
            <View style={styles.calGrid}>
              {monthCells.map((cell) => {
                const isSelected = cell.key === selectedDateKey;
                const isToday = cell.key === todayKey;
                const shootCount = (shootsByDate[cell.key] || []).length;
                const dayAvailObj = availabilityMap[cell.key];
                const dayAvail = dayAvailObj?.status || null;
                const hasCustomAvail = Boolean(dayAvailObj);
                const availDotColor =
                  dayAvail === 'off'
                    ? '#EF4444'
                    : dayAvail === 'partial'
                      ? '#F59E0B'
                      : '#10B981';
                const statusCellStyle =
                  hasCustomAvail && !isSelected
                    ? dayAvail === 'off'
                      ? styles.calCellOff
                      : dayAvail === 'partial'
                        ? styles.calCellPartial
                        : styles.calCellAvailable
                    : null;
                const statusNumStyle =
                  hasCustomAvail && !isSelected
                    ? dayAvail === 'off'
                      ? styles.calCellNumOff
                      : dayAvail === 'partial'
                        ? styles.calCellNumPartial
                        : styles.calCellNumAvailable
                    : null;

                return (
                  <TouchableOpacity
                    key={cell.key}
                    style={styles.calCellWrap}
                    activeOpacity={0.78}
                    onPress={() =>
                      handleSelectDate(
                        cell.key,
                        cell.inCurrentMonth ? undefined : cell.year,
                        cell.inCurrentMonth ? undefined : cell.monthIndex,
                      )
                    }
                  >
                    <View
                      style={[
                        styles.calCellPill,
                        statusCellStyle,
                        isToday && !isSelected && styles.calCellTodayRing,
                        isSelected && styles.calCellSelected,
                        !cell.inCurrentMonth && styles.calCellOutside,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calCellNum,
                          cell.isWeekend && !isSelected && styles.calCellWeekendText,
                          statusNumStyle,
                          isSelected && styles.calCellNumSelected,
                        ]}
                      >
                        {cell.dayNum}
                      </Text>

                      <View style={styles.calDotsRow}>
                        {shootCount > 0 && (
                          <View
                            style={[
                              styles.calShootStripe,
                              isSelected && { backgroundColor: '#FFFFFF' },
                            ]}
                          />
                        )}
                        {hasCustomAvail && (
                          <View
                            style={[
                              styles.calAvailDot,
                              {
                                backgroundColor: isSelected
                                  ? 'rgba(255,255,255,0.9)'
                                  : availDotColor,
                              },
                            ]}
                          />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>

          {/* 7-Day Workweek Strip (Mon–Fri, Sat & Sun Removed) */}
          <Text style={styles.sectionLabel}>THIS WEEK (MON – FRI)</Text>
          <View style={styles.workweekRow}>
            {workweekDays.map((day) => {
              const isSelected = day.key === selectedDateKey;
              const count = (shootsByDate[day.key] || []).length;
              const dayAvailObj = availabilityMap[day.key];
              const dayAvail = dayAvailObj?.status || null;
              const hasScheduledStatus = Boolean(dayAvailObj);
              const availDotColor =
                dayAvail === 'off'
                  ? '#EF4444'
                  : dayAvail === 'partial'
                    ? '#F59E0B'
                    : dayAvail === 'available'
                      ? '#10B981'
                      : null;
              const chipStatusStyle =
                hasScheduledStatus && !isSelected
                  ? dayAvail === 'off'
                    ? styles.dayChipOff
                    : dayAvail === 'partial'
                      ? styles.dayChipPartial
                      : styles.dayChipAvailable
                  : null;

              return (
                <TouchableOpacity
                  key={day.key}
                  style={[
                    styles.dayChip,
                    chipStatusStyle,
                    isSelected && styles.dayChipSelected,
                  ]}
                  onPress={() => handleSelectDate(day.key)}
                  activeOpacity={0.82}
                >
                  {count > 0 && (
                    <View
                      style={[
                        styles.dayChipOrderStripe,
                        isSelected && { backgroundColor: '#FFFFFF' },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.dayWeekday,
                      isSelected && styles.dayTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {day.weekday}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {day.dayNum}
                  </Text>
                  {(availDotColor || count > 0) && (
                    <View style={styles.dayFooterRow}>
                      {availDotColor && (
                        <View
                          style={[
                            styles.availDot,
                            { backgroundColor: isSelected ? '#FFFFFF' : availDotColor },
                          ]}
                        />
                      )}
                      {count > 0 && (
                        <View
                          style={[
                            styles.countPill,
                            isSelected && styles.countPillSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.countPillText,
                              isSelected && styles.countPillTextSelected,
                            ]}
                          >
                            {count}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected Date & Availability Split Card */}
          <GlassCard style={styles.availCard}>
            <CardDecorElements variant="corner" isDark={isDark} />

            {/* Right Half Frosted Blur Backdrop + Feathered Mist Transition */}
            <View pointerEvents="none" style={styles.availRightFrostBackdrop}>
              {Platform.OS === 'ios' && (
                <BlurView
                  intensity={isDark ? 42 : 34}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <LinearGradient
                colors={availMeta.frostColors}
                locations={[0, 0.24, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Soft frosted blur mist veil right along the 50% divider */}
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']
                    : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.72)', 'rgba(255,255,255,0)']
                }
                locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.availBlurBridge}
              />
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']
                    : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.92)', 'rgba(255,255,255,0)']
                }
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.availBlurSeamLine}
              />
            </View>

            <View style={styles.availSplitRow}>
              {/* Left Half: Day & Time */}
              <View style={styles.availSplitLeft}>
                <Text style={styles.availSplitEyebrow} numberOfLines={1}>
                  {selectedDayLabel}
                </Text>
                <Text style={styles.availSplitDate} numberOfLines={2}>
                  {selectedFormattedDate}
                </Text>
                <View style={styles.availSplitTimeRow}>
                  <Clock size={15} color={colors.gold.DEFAULT} strokeWidth={2.2} />
                  <Text style={styles.availSplitTimeText} numberOfLines={1}>
                    {activeAvailStatus === 'unset'
                      ? 'No schedule inputted'
                      : activeAvailStatus === 'off'
                        ? 'No studio hours'
                        : `${formatTime12(selectedDayAvail?.startTime || '08:00')} - ${formatTime12(selectedDayAvail?.endTime || '17:00')}`}
                  </Text>
                </View>
              </View>

              {/* Right Half: Stated Availability */}
              <View style={styles.availSplitRight}>
                <Text style={styles.availSplitEyebrow} numberOfLines={1}>
                  AVAILABILITY
                </Text>
                <Text
                  style={[styles.availSplitStatusTitle, { color: availMeta.text }]}
                  numberOfLines={2}
                >
                  {availMeta.statement}
                </Text>
                {selectedCustomNote ? (
                  <Text style={styles.availStatementText} numberOfLines={2}>
                    {selectedCustomNote}
                  </Text>
                ) : null}
              </View>
            </View>
          </GlassCard>

          {/* Day Shoot Lineup */}
          <View style={styles.lineupHeaderRow}>
            <Text style={styles.sectionHeading}>
              Assigned Lineup ({dayShoots.length})
            </Text>
            {dayShoots.length > 0 && (
              <Text style={styles.sectionMeta}>Tap shoot to manage</Text>
            )}
          </View>

          {dayShoots.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Camera size={24} color={colors.gold.DEFAULT} strokeWidth={1.9} />
              </View>
              <Text style={styles.emptyTitle}>No Shoots Scheduled</Text>
              <Text style={styles.emptySub}>
                {activeAvailStatus === 'off'
                  ? 'You marked this day as Off-Duty. Studio dispatch will hold assignments.'
                  : activeAvailStatus === 'unset'
                    ? 'No inputted schedule for this date yet. Tap the pencil button to set your availability.'
                    : 'Your calendar is open for this date. New assignments appear here automatically.'}
              </Text>
            </GlassCard>
          ) : (
            dayShoots.map((shoot) => {
              const needsAccept = shoot.status === 'CONFIRMED';
              const shootDateLabel = formatReadableDate(
                shoot.session_date || shoot.shoot_date || shoot.booking_date,
              );
              const shootTimeLabel = formatTime12(
                shoot.session_time || shoot.shoot_time || shoot.preferred_time,
              );
              const shootClient =
                shoot.profile?.full_name || shoot.client_name || 'Studio Client';
              const shootLocation =
                shoot.location_address || shoot.location || 'Main Studio Bay';
              const frostScrimColors = isDark
                ? ['rgba(16, 23, 20, 0.74)', 'rgba(18, 28, 24, 0.56)', 'rgba(14, 20, 17, 0.82)']
                : isSage
                  ? ['rgba(255, 255, 255, 0.74)', 'rgba(244, 248, 242, 0.52)', 'rgba(232, 240, 228, 0.74)']
                  : ['rgba(255, 252, 246, 0.78)', 'rgba(250, 243, 230, 0.54)', 'rgba(244, 234, 214, 0.78)'];

              return (
                <TouchableOpacity
                  key={shoot.id}
                  activeOpacity={0.88}
                  style={styles.shootSceneryCardWrap}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedShoot(shoot);
                  }}
                >
                  <View style={styles.shootSceneryCard}>
                    <Image
                      source={isDark ? LINEUP_SCENERY_DARK : LINEUP_SCENERY_LIGHT}
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
                      <View style={styles.shootHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.shootEyebrow}>ASSIGNED SESSION</Text>
                          <Text style={styles.clientName} numberOfLines={1}>
                            {shootClient}
                          </Text>
                        </View>
                        <View style={styles.shootFrostIconBadge}>
                          <Camera
                            size={18}
                            color={isDark ? colors.gold.light : colors.gold.DEFAULT}
                            strokeWidth={2}
                          />
                        </View>
                      </View>

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

                      <View style={styles.shootFooterRow}>
                        <View style={styles.actionHintRow}>
                          {needsAccept ? (
                            <View style={styles.pendingBanner}>
                              <UserCheck size={13} color={colors.gold.DEFAULT} strokeWidth={2.2} />
                              <Text style={styles.pendingBannerText}>
                                Action Needed: Ready to Accept
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.tapPrompt}>Open session details</Text>
                          )}
                        </View>
                        <ChevronRight
                          size={17}
                          color={isDark ? colors.gold.light : '#4B4338'}
                          strokeWidth={2.2}
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Floating Pencil FAB (opens Set Custom Hours & Day Availability sheet for selected date) */}
      {!initialLoading && !availModalOpen && !selectedShoot && (
        <View
          pointerEvents="box-none"
          style={[
            styles.fabAnchor,
            { bottom: Math.max(insets.bottom, 10) + 88 },
          ]}
        >
          <TouchableOpacity
            style={styles.fabTouchWrap}
            onPress={openAvailabilityEditor}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Set custom hours and availability for ${formatReadableDate(selectedDateKey)}`}
          >
            <LinearGradient
              colors={gradients.goldPill || gradients.gold || ['#EAD082', '#C7962D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabCircle}
            >
              <Pencil
                size={22}
                color={isSage || isDark ? '#FFFFFF' : '#181410'}
                strokeWidth={2.2}
              />
            </LinearGradient>
            <View
              style={[
                styles.fabStatusBadge,
                { backgroundColor: availMeta.dot },
              ]}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Opaque Bottom Sheet for Day Availability */}
      <Modal
        visible={availModalOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeAvailabilityEditor}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdropWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark ? 'rgba(6, 9, 15, 0.72)' : 'rgba(15, 23, 42, 0.45)',
                opacity: availFade,
              },
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeAvailabilityEditor}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.sheetWrap,
              { transform: [{ translateY: availSlide }] },
            ]}
          >
            <GlassCard opaque blurred={false} style={styles.sheetCard}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>Day Availability</Text>
                  <Text style={styles.sheetSubtitle}>
                    {formatReadableDate(selectedDateKey)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={closeAvailabilityEditor}
                  activeOpacity={0.75}
                >
                  <X size={18} color={colors.text.primary} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              <View style={styles.modeList}>
                {AVAILABILITY_MODES.map((mode) => {
                  const active = availMode === mode.key;
                  const ModeIcon = mode.Icon;
                  return (
                    <TouchableOpacity
                      key={mode.key}
                      style={[
                        styles.modeOption,
                        active && styles.modeOptionActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setAvailMode(mode.key);
                      }}
                      activeOpacity={0.82}
                    >
                      <View
                        style={[
                          styles.modeIconWrap,
                          active && styles.modeIconWrapActive,
                        ]}
                      >
                        <ModeIcon
                          size={18}
                          color={active ? colors.gold.DEFAULT : colors.text.muted}
                          strokeWidth={2}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modeLabel}>{mode.label}</Text>
                        <Text style={styles.modeSub}>{mode.sub}</Text>
                      </View>
                      <View
                        style={[
                          styles.radioOuter,
                          active && styles.radioOuterActive,
                        ]}
                      >
                        {active && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {availMode === 'partial' && (
                <View style={styles.timeInputsRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>START (24H)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={availStartTime}
                      onChangeText={setAvailStartTime}
                      placeholder="08:00"
                      placeholderTextColor={colors.text.muted}
                      maxLength={8}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>END (24H)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={availEndTime}
                      onChangeText={setAvailEndTime}
                      placeholder="17:00"
                      placeholderTextColor={colors.text.muted}
                      maxLength={8}
                    />
                  </View>
                </View>
              )}

              <Text style={styles.inputLabel}>DISPATCH NOTE (OPTIONAL)</Text>
              <TextInput
                style={[styles.textInput, styles.noteInput]}
                value={availNotes}
                onChangeText={setAvailNotes}
                placeholder="e.g. Afternoon studio shoots only"
                placeholderTextColor={colors.text.muted}
                multiline
              />

              <View style={[styles.sheetActions, { paddingBottom: Math.max(insets.bottom, 6) }]}>
                <GoldButton
                  loading={savingAvail}
                  onPress={handleSaveAvailability}
                >
                  {savingAvail ? 'Saving...' : 'Save Availability'}
                </GoldButton>
              </View>
            </GlassCard>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      <ShootDetailModal
        visible={Boolean(selectedShoot)}
        booking={selectedShoot}
        busy={shootBusy}
        onClose={() => setSelectedShoot(null)}
        onAccept={handleAcceptShoot}
        onAdvanceStatus={handleAdvanceStatus}
        onRequestReschedule={handleRequestReschedule}
        onViewSession={() => {
          setSelectedShoot(null);
          navigation.navigate('PhotographerShoots');
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
    // Single Centered Today Spotlight Card
    todayHeroCard: {
      paddingVertical: 22,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      overflow: 'hidden',
    },
    todayBadgePill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.gold.bg,
      marginBottom: 10,
    },
    todayBadgeText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 10.5,
      letterSpacing: 1.2,
      color: colors.gold.DEFAULT,
    },
    todayWeekdayText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 12,
      letterSpacing: 1.8,
      color: colors.text.secondary,
      marginBottom: 2,
    },
    todayDayNumber: {
      fontFamily: Typography.fontHeading,
      fontSize: 48,
      lineHeight: 54,
      color: colors.gold.DEFAULT,
      includeFontPadding: false,
    },
    todayMonthYearText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 16,
      color: colors.text.primary,
      marginTop: 2,
    },

    // Monthly Calendar Card
    calendarCard: {
      padding: 16,
      marginBottom: 18,
      overflow: 'hidden',
    },
    calHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    calNavBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.08)'
        : isSage
          ? 'rgba(79, 104, 70, 0.10)'
          : 'rgba(15, 23, 42, 0.06)',
    },
    calTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    calMonthTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 16.5,
      color: colors.text.primary,
    },
    calTodayJumpPill: {
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.gold.bg,
    },
    calTodayJumpText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 11,
      color: colors.gold.DEFAULT,
    },
    calWeekdayRow: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    calWeekdayCell: {
      width: '14.28%',
      alignItems: 'center',
      paddingVertical: 4,
    },
    calWeekdayText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 11,
      color: colors.text.secondary,
    },
    calWeekendLabel: {
      color: colors.text.muted,
    },
    calGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calCellWrap: {
      width: '14.28%',
      paddingVertical: 3,
      alignItems: 'center',
    },
    calCellPill: {
      width: 38,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calCellTodayRing: {
      borderWidth: 1.5,
      borderColor: colors.gold.DEFAULT,
    },
    calCellAvailable: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.15)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(110, 231, 183, 0.45)' : 'rgba(16, 185, 129, 0.45)',
    },
    calCellPartial: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.15)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(252, 211, 77, 0.45)' : 'rgba(245, 158, 11, 0.45)',
    },
    calCellOff: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.14)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(252, 165, 165, 0.42)' : 'rgba(239, 68, 68, 0.42)',
    },
    calCellSelected: {
      backgroundColor: colors.gold.DEFAULT,
    },
    calCellOutside: {
      opacity: 0.34,
    },
    calCellNum: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 13.5,
      color: colors.text.primary,
    },
    calCellNumAvailable: {
      color: isDark ? '#6EE7B7' : '#047857',
      fontFamily: Typography.fontBodyBold,
    },
    calCellNumPartial: {
      color: isDark ? '#FCD34D' : '#B45309',
      fontFamily: Typography.fontBodyBold,
    },
    calCellNumOff: {
      color: isDark ? '#FCA5A5' : '#B91C1C',
      fontFamily: Typography.fontBodyBold,
    },
    calCellWeekendText: {
      color: colors.text.muted,
    },
    calCellNumSelected: {
      color: '#FFFFFF',
      fontFamily: Typography.fontBodyBold,
    },
    calDotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      height: 6,
      marginTop: 2,
    },
    calShootStripe: {
      width: 18,
      height: 3.5,
      borderRadius: 2,
      backgroundColor: '#D97706',
    },
    dayChipOrderStripe: {
      position: 'absolute',
      top: 0,
      left: 12,
      right: 12,
      height: 3.5,
      borderBottomLeftRadius: 3,
      borderBottomRightRadius: 3,
      backgroundColor: '#D97706',
    },
    calAvailDot: {
      width: 4.5,
      height: 4.5,
      borderRadius: 2.25,
    },

    // Weekly Workweek Strip (Mon–Fri)
    sectionLabel: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 11,
      letterSpacing: 1.1,
      color: colors.text.muted,
      marginBottom: 10,
      marginLeft: 2,
    },
    workweekRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    dayChip: {
      flex: 1,
      paddingVertical: 13,
      paddingHorizontal: 4,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark
        ? 'rgba(31, 41, 55, 0.85)'
        : isSage
          ? 'rgba(255, 255, 254, 0.88)'
          : 'rgba(255, 255, 255, 0.88)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(255, 255, 255, 0.12)'
        : isSage
          ? 'rgba(202, 212, 192, 0.90)'
          : 'rgba(218, 224, 236, 0.95)',
    },
    dayChipAvailable: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(209, 250, 229, 0.78)',
      borderColor: isDark ? 'rgba(110, 231, 183, 0.45)' : 'rgba(16, 185, 129, 0.50)',
    },
    dayChipPartial: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.20)' : 'rgba(254, 243, 199, 0.82)',
      borderColor: isDark ? 'rgba(252, 211, 77, 0.45)' : 'rgba(245, 158, 11, 0.50)',
    },
    dayChipOff: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(254, 226, 226, 0.78)',
      borderColor: isDark ? 'rgba(252, 165, 165, 0.42)' : 'rgba(239, 68, 68, 0.45)',
    },
    dayChipSelected: {
      backgroundColor: colors.gold.DEFAULT,
      borderColor: colors.gold.DEFAULT,
    },
    dayWeekday: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 11,
      color: colors.text.muted,
      marginBottom: 4,
    },
    dayNumber: {
      fontFamily: Typography.fontHeading,
      fontSize: 19,
      color: colors.text.primary,
    },
    dayTextSelected: {
      color: '#FFFFFF',
    },
    dayFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 5,
    },
    availDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    countPill: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 8,
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(15, 23, 42, 0.08)',
    },
    countPillSelected: {
      backgroundColor: 'rgba(255, 255, 255, 0.28)',
    },
    countPillText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 10,
      color: colors.text.primary,
    },
    countPillTextSelected: {
      color: '#FFFFFF',
    },

    // Selected Date & Availability 50/50 Split Card
    availCard: {
      padding: 0,
      marginBottom: 18,
      overflow: 'hidden',
      minHeight: 124,
    },
    availRightFrostBackdrop: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '48%',
      right: 0,
      overflow: 'hidden',
    },
    availBlurBridge: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: 28,
    },
    availBlurSeamLine: {
      position: 'absolute',
      top: 10,
      bottom: 10,
      left: 9,
      width: 1.5,
      borderRadius: 1,
    },
    availSplitRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      minHeight: 124,
    },
    availSplitLeft: {
      flex: 1,
      paddingVertical: 18,
      paddingLeft: 16,
      paddingRight: 14,
      justifyContent: 'center',
    },
    availSplitRight: {
      flex: 1,
      paddingVertical: 18,
      paddingLeft: 20,
      paddingRight: 16,
      justifyContent: 'center',
    },
    availSplitEyebrow: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 11.5,
      letterSpacing: 1.0,
      color: colors.text.muted,
      marginBottom: 6,
    },
    availSplitDate: {
      fontFamily: Typography.fontHeading,
      fontSize: 19,
      lineHeight: 24,
      color: colors.text.primary,
      marginBottom: 8,
    },
    availSplitTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    availSplitTimeText: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 13.5,
      color: colors.text.secondary,
      flexShrink: 1,
    },
    availSplitStatusTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 18,
      lineHeight: 23,
    },
    availStatementText: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 12.5,
      lineHeight: 17,
      color: colors.text.secondary,
      marginTop: 5,
    },
    lineupHeaderRow: {
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
      fontSize: 12,
      color: colors.text.muted,
    },
    emptyCard: {
      padding: 26,
      alignItems: 'center',
    },
    emptyIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      backgroundColor: colors.gold.bg,
    },
    emptyTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 16.5,
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
    shootHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    shootEyebrow: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 10.5,
      letterSpacing: 1.1,
      color: isDark ? colors.gold.light : '#6B5C43',
      marginBottom: 2,
    },
    shootFrostIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.65)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.90)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    clientName: {
      fontFamily: Typography.fontHeading,
      fontSize: 18.5,
      color: isDark ? '#F8FAFC' : '#181410',
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
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    metaText: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 13.5,
      color: isDark ? 'rgba(255, 255, 255, 0.80)' : '#4B4338',
      flex: 1,
    },
    shootFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(24, 20, 16, 0.10)',
    },
    actionHintRow: {
      flex: 1,
    },
    pendingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pendingBannerText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 12.5,
      color: colors.gold.DEFAULT,
    },
    tapPrompt: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 12.5,
      color: isDark ? 'rgba(255, 255, 255, 0.72)' : '#5A5042',
    },
    modalBackdropWrap: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheetWrap: {
      width: '100%',
    },
    sheetCard: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
    },
    sheetHandle: {
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.18)',
      alignSelf: 'center',
      marginBottom: 14,
    },
    sheetHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    sheetTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 20,
      color: colors.text.primary,
    },
    sheetSubtitle: {
      fontFamily: Typography.fontBody,
      fontSize: 13.5,
      color: colors.text.secondary,
      marginTop: 2,
    },
    sheetCloseBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.09)'
        : 'rgba(15,23,42,0.07)',
    },
    modeList: {
      gap: 10,
      marginBottom: 14,
    },
    modeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(255,255,255,0.09)'
        : 'rgba(15,23,42,0.09)',
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(15,23,42,0.025)',
    },
    modeOptionActive: {
      borderColor: colors.gold.DEFAULT,
      backgroundColor: colors.gold.bg,
    },
    modeIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(15,23,42,0.05)',
    },
    modeIconWrapActive: {
      backgroundColor: colors.gold.bg,
    },
    modeLabel: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 14.5,
      color: colors.text.primary,
    },
    modeSub: {
      fontFamily: Typography.fontBody,
      fontSize: 12,
      color: colors.text.muted,
      marginTop: 1,
    },
    radioOuter: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.text.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuterActive: {
      borderColor: colors.gold.DEFAULT,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.gold.DEFAULT,
    },
    timeInputsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    inputLabel: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 11,
      letterSpacing: 0.8,
      color: colors.text.muted,
      marginBottom: 6,
    },
    textInput: {
      fontFamily: Typography.fontBody,
      fontSize: 14,
      color: colors.text.primary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(15,23,42,0.12)',
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(255,255,255,0.85)',
    },
    noteInput: {
      minHeight: 62,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    sheetActions: {
      marginTop: 2,
    },
    fabAnchor: {
      position: 'absolute',
      right: 18,
      alignItems: 'flex-end',
      zIndex: 15,
    },
    fabTouchWrap: {
      position: 'relative',
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: isDark ? '#1B1E29' : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.42 : 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    fabCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: isDark
        ? 'rgba(255, 255, 255, 0.24)'
        : 'rgba(255, 255, 255, 0.65)',
    },
    fabStatusBadge: {
      position: 'absolute',
      top: 1,
      right: 1,
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: isDark ? '#141721' : '#FFFFFF',
    },
  });
