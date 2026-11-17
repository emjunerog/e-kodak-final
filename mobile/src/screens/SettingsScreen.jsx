/**
 * SettingsScreen.jsx
 * Studio Settings dashboard — clean pill-card editorial layout matching
 * E-Kodak's 2-tone card tokens, Google Sans typography, floating GlassHeader,
 * and floating bottom navigation dock.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Trash2,
  ChevronRight,
  MapPin,
  Phone,
  Clock,
  Check,
  RefreshCw,
  ArrowDownCircle,
  User,
} from 'lucide-react-native';

import GlassBackground from '../components/GlassBackground';
import GlassHeader from '../components/GlassHeader';
import CardDecorElements from '../components/CardDecorElements';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import {
  getAppSettings,
  saveAppSettings,
  clearAllSavedBookings,
  clearAppCache,
  fetchStudioSettings,
  fetchStudioServices,
} from '../services/storageService';
import { playMascotSound } from '../utils/mascotAudio';
import appConfig from '../../app.json';
import { Typography } from '../theme';

const APP_VERSION = appConfig?.expo?.version || '1.0.0';

function StudioPillSwitch({ value, onToggle, isDark, activeColor, label }) {
  const trackBg = value
    ? activeColor
    : isDark
      ? 'rgba(255, 255, 255, 0.14)'
      : 'rgba(184, 152, 86, 0.28)';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onToggle(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      style={[stylesStatic.pillTrack, { backgroundColor: trackBg }]}
    >
      <View
        style={[
          stylesStatic.pillThumb,
          { alignSelf: value ? 'flex-end' : 'flex-start' },
        ]}
      />
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  const { isDark, isSage, themeMode, setThemeMode, highContrast: themeHighContrast, setHighContrast: setThemeHighContrast, colors, gradients } = useTheme();
  const { showAlert, showProcess, waitProcessDuration } = useDialog();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [studioInfo, setStudioInfo] = useState({
    address: '331 Rizal Street, City of Naga, Cebu, 6037',
    contact_phone: '+63 917 123 4567',
    business_hours: 'Mon – Sat: 8:00 AM – 6:00 PM',
  });
  const [clearingCache, setClearingCache] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  useEffect(() => {
    getAppSettings().then((s) => {
      setNotifications(s.notifications ?? true);
      setSoundEnabled(s.sound ?? true);
      setHapticsEnabled(s.haptics ?? true);
      setHighContrast(s.highContrast ?? false);
    });
    fetchStudioSettings().then((data) => {
      if (data) {
        setStudioInfo((prev) => ({
          address: data.address || prev.address,
          contact_phone: data.contact_phone || prev.contact_phone,
          business_hours: data.business_hours || prev.business_hours,
        }));
      }
    });
  }, []);

  const updateSetting = async (key, val) => {
    if (hapticsEnabled) {
      Haptics.selectionAsync().catch(() => {});
    }
    const updated = {
      notifications: key === 'notifications' ? val : notifications,
      sound: key === 'sound' ? val : soundEnabled,
      haptics: key === 'haptics' ? val : hapticsEnabled,
      highContrast: key === 'highContrast' ? val : highContrast,
    };
    if (key === 'notifications') setNotifications(val);
    if (key === 'sound') setSoundEnabled(val);
    if (key === 'haptics') setHapticsEnabled(val);
    if (key === 'highContrast') {
      setHighContrast(val);
      setThemeHighContrast(val);
    } else {
      await saveAppSettings({ ...updated, highContrast: themeHighContrast });
    }
    if (key === 'sound' && val) {
      playMascotSound('pop');
    }
  };

  const handleThemeChange = (mode) => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setThemeMode(mode);
  };

  const handleCheckUpdates = async () => {
    if (checkingUpdates) return;
    if (hapticsEnabled) {
      Haptics.selectionAsync().catch(() => {});
    }
    setCheckingUpdates(true);
    showProcess('Checking for Updates', 'Syncing studio releases & packages...');

    try {
      let otaUpdateAvailable = false;
      try {
        // Optional EAS / expo-updates runtime check in standalone builds
        const Updates = require('expo-updates');
        if (Updates?.checkForUpdateAsync && !__DEV__) {
          const check = await Updates.checkForUpdateAsync();
          if (check?.isAvailable) {
            otaUpdateAvailable = true;
            showProcess('Downloading Update', 'Preparing the latest studio release...');
            await Updates.fetchUpdateAsync();
            await waitProcessDuration(1100);
            setCheckingUpdates(false);
            showAlert(
              'Update Ready',
              'A new update has been downloaded. Restart now to apply it.',
              [
                { text: 'Later', style: 'cancel' },
                {
                  text: 'Restart App',
                  onPress: () => Updates.reloadAsync?.().catch(() => {}),
                },
              ],
              { type: 'success' }
            );
            return;
          }
        }
      } catch {
        // expo-updates not installed or running in Expo Go / dev mode
      }

      if (!otaUpdateAvailable) {
        const [freshStudio, freshServices] = await Promise.all([
          fetchStudioSettings(),
          fetchStudioServices(),
          waitProcessDuration(1100),
        ]);

        if (freshStudio) {
          setStudioInfo((prev) => ({
            address: freshStudio.address || prev.address,
            contact_phone: freshStudio.contact_phone || prev.contact_phone,
            business_hours: freshStudio.business_hours || prev.business_hours,
          }));
        }

        if (soundEnabled) {
          playMascotSound('success');
        } else if (hapticsEnabled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }

        const serviceCount = Array.isArray(freshServices) ? freshServices.length : 0;
        showAlert(
          "You're Up to Date",
          `E-Kodak Studio v${APP_VERSION} is up to date.${serviceCount > 0 ? ` Synced ${serviceCount} active studio packages.` : ''}`,
          [{ text: 'Done' }],
          { type: 'success' }
        );
      }
    } catch {
      showAlert(
        'Check Updates',
        `Running E-Kodak Studio v${APP_VERSION}. Connect to the internet to sync latest updates.`
      );
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleClearCache = () => {
    if (clearingCache) return;
    if (hapticsEnabled) {
      Haptics.selectionAsync().catch(() => {});
    }
    showAlert(
      'Clear Cache?',
      'This clears temporary cached files and profile snapshots while keeping your saved QR passes and settings intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          onPress: async () => {
            setClearingCache(true);
            showProcess('Clearing Cache', 'Refreshing studio data...');
            const [result, freshStudio] = await Promise.all([
              clearAppCache(),
              fetchStudioSettings(),
              waitProcessDuration(1100),
            ]);
            if (freshStudio) {
              setStudioInfo((prev) => ({
                address: freshStudio.address || prev.address,
                contact_phone: freshStudio.contact_phone || prev.contact_phone,
                business_hours: freshStudio.business_hours || prev.business_hours,
              }));
            }
            setClearingCache(false);
            if (soundEnabled) {
              playMascotSound('success');
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
            showAlert(
              'Cache Cleared',
              result.ok
                ? 'Temporary cache cleared and studio info refreshed.'
                : 'Cache refresh completed.',
              [{ text: 'Done' }],
              { type: 'success' }
            );
          },
        },
      ],
      { type: 'confirm' }
    );
  };

  const handleClearData = () => {
    showAlert(
      'Reset Stored Passes?',
      'This will remove all locally saved passes and cached profile details from this device. Your bookings remain safe in the studio database.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Passes',
          style: 'destructive',
          onPress: async () => {
            showProcess('Clearing Passes', 'Removing saved studio passes...');
            await Promise.all([
              clearAllSavedBookings(),
              waitProcessDuration(1100),
            ]);
            if (soundEnabled) {
              playMascotSound('success');
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
            showAlert(
              'Data Cleared',
              'All locally saved studio passes have been cleared. Please scan a QR code to continue.',
              [
                {
                  text: 'Scan QR',
                  onPress: () => {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'WelcomeTour', params: { initialSlide: 1 } }],
                    });
                  },
                },
              ],
              { type: 'success' }
            );
          },
        },
      ],
      { type: 'danger' }
    );
  };

  const handleCallHotline = () => {
    const phone = String(studioInfo.contact_phone || '').replace(/[^\d+]/g, '');
    if (!phone) return;
    Haptics.selectionAsync().catch(() => {});
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  // Shared 2-tone dashboard card tokens matching Home, Scanner, Bookings, and Profile
  const cardGradientColors = gradients?.card || (
    isDark
      ? ['#242029', '#151B24']
      : isSage
        ? ['#FFFFFF', '#EEF2E9']
        : ['#FAF2EA', '#E5EEF7']
  );
  const cardBorder = highContrast
    ? colors.gold.DEFAULT
    : isDark
      ? 'rgba(180, 198, 224, 0.20)'
      : isSage
        ? '#D7DDD1'
        : '#DCDDE6';
  const dividerColor = isDark
    ? 'rgba(180, 198, 224, 0.14)'
    : isSage
      ? 'rgba(22, 27, 20, 0.08)'
      : 'rgba(24, 20, 16, 0.08)';
  const switchActiveColor = isDark
    ? colors.gold.DEFAULT
    : isSage
      ? colors.gold.DEFAULT
      : '#B88928';
  const sectionLabelColor = isDark
    ? 'rgba(214, 222, 235, 0.62)'
    : isSage
      ? '#55604D'
      : '#6C6458';
  const iconBadgeBg = colors.gold.bg;
  const iconBadgeBorder = isDark
    ? 'rgba(217, 180, 108, 0.26)'
    : isSage
      ? 'rgba(99, 115, 86, 0.20)'
      : 'rgba(176, 125, 30, 0.18)';

  const themeCards = [
    {
      id: 'light',
      label: 'Daylight',
      selected: themeMode === 'light',
      previewGradient: ['#FAF2EA', '#EDF3FA'],
      aaColor: '#181410',
      barColor: '#B07D1E',
      footerBg: isDark ? '#F7F5F2' : '#FFFFFF',
      footerText: '#181410',
    },
    {
      id: 'dark',
      label: 'Darkroom',
      selected: themeMode === 'dark',
      previewGradient: ['#1B1822', '#0E1017'],
      aaColor: '#F7F5F2',
      barColor: '#D9B46C',
      footerBg: isDark ? '#1B1F2B' : '#FFFFFF',
      footerText: isDark ? '#F7F5F2' : '#181410',
    },
    {
      id: 'sage',
      label: 'Sage Atelier',
      selected: themeMode === 'sage',
      previewGradient: ['#F3F5EF', '#E4EAE0'],
      aaColor: '#161B14',
      barColor: '#637356',
      footerBg: isDark ? '#F2F4EE' : '#FFFFFF',
      footerText: '#161B14',
    },
  ];

  const toggleItems = [
    {
      key: 'notifications',
      label: 'Notifications',
      value: notifications,
    },
    {
      key: 'sound',
      label: 'Sound Notification',
      value: soundEnabled,
    },
    {
      key: 'haptics',
      label: 'Vibration',
      value: hapticsEnabled,
    },
    {
      key: 'highContrast',
      label: 'High Contrast',
      value: highContrast,
    },
  ];

  const headerBtnBg = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : isSage
      ? '#FFFFFF'
      : 'rgba(255, 255, 255, 0.85)';
  const headerBtnBorder = isDark
    ? 'rgba(180, 198, 224, 0.22)'
    : isSage
      ? '#CFD7C7'
      : '#DCDDE6';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.base }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg.base}
      />

      {/* Ambient Glass Backdrop */}
      <GlassBackground />

      {/* ── Top Floating Pill Header (left icon removed, updates + client profile on right) ── */}
      <GlassHeader
        title="Studio Settings"
        subtitle="Preferences & studio customization"
        right={
          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={handleCheckUpdates}
              disabled={checkingUpdates}
              style={[
                styles.headerActionBtn,
                {
                  backgroundColor: headerBtnBg,
                  borderColor: headerBtnBorder,
                },
              ]}
              accessibilityLabel="Check for updates"
            >
              {checkingUpdates ? (
                <ActivityIndicator
                  size="small"
                  color={isDark ? colors.gold.light : colors.gold.DEFAULT}
                />
              ) : (
                <ArrowDownCircle
                  size={18}
                  color={isDark ? colors.text.primary : '#181410'}
                  strokeWidth={2}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => {
                if (hapticsEnabled) {
                  Haptics.selectionAsync().catch(() => {});
                }
                navigation.navigate('Profile');
              }}
              style={[
                styles.headerActionBtn,
                {
                  backgroundColor: headerBtnBg,
                  borderColor: headerBtnBorder,
                },
              ]}
              accessibilityLabel="Open Client Profile"
            >
              <User
                size={18}
                color={isDark ? colors.text.primary : '#181410'}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 104 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Theme Group ── */}
        <Text style={[styles.sectionLabel, { color: sectionLabelColor }]}>
          APPEARANCE
        </Text>
        <View style={styles.themeGridRow}>
          {themeCards.map((themeItem) => (
            <TouchableOpacity
              key={themeItem.id}
              activeOpacity={0.86}
              onPress={() => handleThemeChange(themeItem.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: themeItem.selected }}
              accessibilityLabel={`Switch to ${themeItem.label} theme`}
              style={[
                styles.themePreviewCard,
                {
                  borderColor: themeItem.selected
                    ? colors.gold.DEFAULT
                    : cardBorder,
                  borderWidth: themeItem.selected ? 2 : 1,
                },
              ]}
            >
              <LinearGradient
                colors={themeItem.previewGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.themePreviewPane}
              >
                <View style={styles.themePreviewTopRow}>
                  <Text
                    style={[
                      styles.themeAaText,
                      { color: themeItem.aaColor },
                    ]}
                  >
                    Aa
                  </Text>
                  {themeItem.selected && (
                    <View
                      style={[
                        styles.themeCheckCircle,
                        { backgroundColor: colors.gold.DEFAULT },
                      ]}
                    >
                      <Check
                        size={11}
                        color={isDark ? '#17130C' : '#FFFFFF'}
                        strokeWidth={2.7}
                      />
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.themeAccentBar,
                    { backgroundColor: themeItem.barColor },
                  ]}
                />
              </LinearGradient>

              <View
                style={[
                  styles.themeFooterBar,
                  {
                    backgroundColor: themeItem.footerBg,
                    borderTopColor: dividerColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.themeFooterLabel,
                    { color: themeItem.footerText },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {themeItem.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 2. Studio Credentials Group (Location, Hotline & Hours) ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced, { color: sectionLabelColor }]}>
          STUDIO CREDENTIALS
        </Text>
        <View style={[styles.cardOuter, { borderColor: cardBorder }]}>
          <LinearGradient
            colors={cardGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.studioInfoGradient}
          >
            <CardDecorElements variant="list" isDark={isDark} />

            {/* Studio Location */}
            <View style={styles.studioInfoRow}>
              <View
                style={[
                  styles.studioRowIconBox,
                  { backgroundColor: iconBadgeBg, borderColor: iconBadgeBorder },
                ]}
              >
                <MapPin
                  size={16}
                  color={isDark ? colors.gold.light : colors.gold.DEFAULT}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.studioRowTextCol}>
                <Text
                  style={[
                    styles.studioInfoLabel,
                    { color: isDark ? 'rgba(214, 222, 235, 0.72)' : '#6C6458' },
                  ]}
                >
                  Studio Location
                </Text>
                <Text
                  style={[
                    styles.studioInfoVal,
                    { color: isDark ? colors.text.primary : '#181410' },
                  ]}
                >
                  {studioInfo.address}
                </Text>
              </View>
            </View>

            <View style={[styles.infoDivider, { backgroundColor: dividerColor }]} />

            {/* Concierge Hotline */}
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={handleCallHotline}
              style={styles.studioInfoRow}
              accessibilityLabel={`Call concierge hotline ${studioInfo.contact_phone}`}
            >
              <View
                style={[
                  styles.studioRowIconBox,
                  { backgroundColor: iconBadgeBg, borderColor: iconBadgeBorder },
                ]}
              >
                <Phone
                  size={16}
                  color={isDark ? colors.gold.light : colors.gold.DEFAULT}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.studioRowTextCol}>
                <Text
                  style={[
                    styles.studioInfoLabel,
                    { color: isDark ? 'rgba(214, 222, 235, 0.72)' : '#6C6458' },
                  ]}
                >
                  Concierge Hotline
                </Text>
                <Text
                  style={[
                    styles.studioInfoVal,
                    { color: isDark ? colors.text.primary : '#181410' },
                  ]}
                >
                  {studioInfo.contact_phone}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.infoDivider, { backgroundColor: dividerColor }]} />

            {/* Hours of Operation */}
            <View style={styles.studioInfoRow}>
              <View
                style={[
                  styles.studioRowIconBox,
                  { backgroundColor: iconBadgeBg, borderColor: iconBadgeBorder },
                ]}
              >
                <Clock
                  size={16}
                  color={isDark ? colors.gold.light : colors.gold.DEFAULT}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.studioRowTextCol}>
                <Text
                  style={[
                    styles.studioInfoLabel,
                    { color: isDark ? 'rgba(214, 222, 235, 0.72)' : '#6C6458' },
                  ]}
                >
                  Hours of Operation
                </Text>
                <Text
                  style={[
                    styles.studioInfoVal,
                    { color: isDark ? colors.text.primary : '#181410' },
                  ]}
                >
                  {studioInfo.business_hours}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── 3. Customizations Group (Toggles + Photographer's Portal) ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced, { color: sectionLabelColor }]}>
          CUSTOMIZATIONS
        </Text>
        {toggleItems.map((item) => (
          <View
            key={item.key}
            style={[styles.cardOuter, { borderColor: cardBorder }]}
          >
            <LinearGradient
              colors={cardGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.togglePillRow}
            >
              <Text
                style={[
                  styles.togglePillTitle,
                  { color: isDark ? colors.text.primary : '#181410' },
                ]}
              >
                {item.label}
              </Text>
              <StudioPillSwitch
                value={item.value}
                onToggle={(nextVal) => updateSetting(item.key, nextVal)}
                isDark={isDark}
                activeColor={switchActiveColor}
                label={item.label}
              />
            </LinearGradient>
          </View>
        ))}

        {/* ── 4. Storage & Updates Group (Clear Cache, Clear Stored Passes & Check for Updates) ── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced, { color: sectionLabelColor }]}>
          STORAGE & UPDATES
        </Text>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={handleClearCache}
          disabled={clearingCache}
          style={[styles.cardOuter, { borderColor: cardBorder }]}
          accessibilityLabel="Clear Cache"
        >
          <LinearGradient
            colors={cardGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionPillGradient}
          >
            <View
              style={[
                styles.clearIconBox,
                {
                  backgroundColor: iconBadgeBg,
                  borderColor: iconBadgeBorder,
                },
              ]}
            >
              {clearingCache ? (
                <ActivityIndicator
                  size="small"
                  color={isDark ? colors.gold.light : colors.gold.DEFAULT}
                />
              ) : (
                <RefreshCw
                  size={18}
                  color={isDark ? colors.gold.light : colors.gold.DEFAULT}
                  strokeWidth={2}
                />
              )}
            </View>
            <View style={styles.actionTextCol}>
              <Text
                style={[
                  styles.actionCardTitle,
                  { color: isDark ? colors.text.primary : '#181410' },
                ]}
              >
                Clear Cache
              </Text>
              <Text
                style={[
                  styles.actionCardSub,
                  { color: isDark ? 'rgba(214, 222, 235, 0.72)' : '#6C6458' },
                ]}
              >
                Clear temporary cache & keep saved passes
              </Text>
            </View>
            <ChevronRight
              size={18}
              color={isDark ? colors.text.muted : '#4B4338'}
              strokeWidth={2}
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── 6. Clear Stored Passes Pill Card ── */}
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={handleClearData}
          style={[styles.cardOuter, { borderColor: cardBorder }]}
          accessibilityLabel="Clear Stored Passes"
        >
          <LinearGradient
            colors={cardGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionPillGradient}
          >
            <View
              style={[
                styles.clearIconBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(239, 68, 68, 0.16)'
                    : 'rgba(239, 68, 68, 0.10)',
                  borderColor: isDark
                    ? 'rgba(239, 68, 68, 0.28)'
                    : 'rgba(239, 68, 68, 0.20)',
                },
              ]}
            >
              <Trash2 size={18} color="#EF4444" strokeWidth={2} />
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.clearCardTitle}>Clear Stored Passes</Text>
              <Text
                style={[
                  styles.actionCardSub,
                  { color: isDark ? 'rgba(214, 222, 235, 0.72)' : '#6C6458' },
                ]}
              >
                Remove cached QR passes from this phone
              </Text>
            </View>
            <ChevronRight
              size={18}
              color={isDark ? colors.text.muted : '#4B4338'}
              strokeWidth={2}
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Check for Updates Pill Card ── */}
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={handleCheckUpdates}
          disabled={checkingUpdates}
          style={[styles.cardOuter, { borderColor: cardBorder }]}
          accessibilityLabel="Check for Updates"
        >
          <LinearGradient
            colors={cardGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionPillGradient}
          >
            <View
              style={[
                styles.clearIconBox,
                {
                  backgroundColor: iconBadgeBg,
                  borderColor: iconBadgeBorder,
                },
              ]}
            >
              {checkingUpdates ? (
                <ActivityIndicator
                  size="small"
                  color={isDark ? colors.gold.light : colors.gold.DEFAULT}
                />
              ) : (
                <ArrowDownCircle
                  size={18}
                  color={isDark ? colors.gold.light : colors.gold.DEFAULT}
                  strokeWidth={2}
                />
              )}
            </View>
            <View style={styles.actionTextCol}>
              <Text
                style={[
                  styles.actionCardTitle,
                  { color: isDark ? colors.text.primary : '#181410' },
                ]}
              >
                Check for Updates
              </Text>
              <Text
                style={[
                  styles.actionCardSub,
                  { color: isDark ? 'rgba(214, 222, 235, 0.72)' : '#6C6458' },
                ]}
              >
                {checkingUpdates
                  ? 'Checking for studio & app updates...'
                  : `Version ${APP_VERSION} · Tap to check`}
              </Text>
            </View>
            <ChevronRight
              size={18}
              color={isDark ? colors.text.muted : '#4B4338'}
              strokeWidth={2}
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Version Footnote ── */}
        <View style={styles.footerBlock}>
          <Text style={[styles.footerText, { color: colors.text.muted }]}>
            E-Kodak Studio Companion v{APP_VERSION}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const stylesStatic = StyleSheet.create({
  pillTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  pillThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
});

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    screen: { flex: 1 },
    scroll: { flex: 1, zIndex: 1 },
    headerActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerActionBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 6,
      gap: 12,
    },
    sectionLabel: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 11.5,
      lineHeight: 15,
      letterSpacing: 1.15,
      paddingHorizontal: 4,
      marginBottom: -4,
    },
    sectionLabelSpaced: {
      marginTop: 6,
    },

    // Theme Preview Cards Row
    themeGridRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 2,
    },
    themePreviewCard: {
      flex: 1,
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: isDark ? '#000000' : '#4E4332',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.24 : 0.08,
      shadowRadius: 12,
      elevation: isDark ? 2 : 3,
    },
    themePreviewPane: {
      height: 70,
      paddingHorizontal: 12,
      paddingVertical: 11,
      justifyContent: 'space-between',
    },
    themePreviewTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    themeAaText: {
      fontFamily: Typography.fontHeading,
      fontSize: 18,
      lineHeight: 22,
      letterSpacing: -0.3,
    },
    themeCheckCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeAccentBar: {
      width: 30,
      height: 5,
      borderRadius: 2.5,
    },
    themeFooterBar: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    themeFooterLabel: {
      fontFamily: Typography.fontHeading,
      fontSize: 12.5,
      lineHeight: 17,
      letterSpacing: -0.15,
    },

    // Shared 2-Tone Pill Card Frame
    cardOuter: {
      borderRadius: 22,
      borderWidth: 1,
      overflow: 'hidden',
      shadowColor: isDark ? '#000000' : '#4E4332',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: isDark ? 0.22 : 0.08,
      shadowRadius: 12,
      elevation: isDark ? 2 : 3,
    },

    // Toggle Pill Rows
    togglePillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    togglePillTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: -0.15,
    },

    // Portal & Clear Action Pill Cards
    actionPillGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 13,
    },
    portalIconBox: {
      width: 42,
      height: 42,
      borderRadius: 13,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearIconBox: {
      width: 42,
      height: 42,
      borderRadius: 13,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionTextCol: {
      flex: 1,
    },
    actionCardTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: -0.15,
    },
    clearCardTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: -0.15,
      color: '#EF4444',
    },
    actionCardSub: {
      fontFamily: Typography.fontBody,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
    },

    // Studio Details Card
    studioInfoGradient: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      position: 'relative',
    },
    studioInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    studioRowIconBox: {
      width: 34,
      height: 34,
      borderRadius: 11,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    studioRowTextCol: {
      flex: 1,
    },
    studioInfoLabel: {
      fontFamily: Typography.fontBody,
      fontSize: 11.5,
      lineHeight: 15,
    },
    studioInfoVal: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 13.5,
      lineHeight: 19,
      marginTop: 2,
    },
    infoDivider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 46,
    },

    // Footer
    footerBlock: {
      alignItems: 'center',
      marginTop: 8,
      paddingHorizontal: 20,
    },
    footerText: {
      fontFamily: Typography.fontBody,
      fontSize: 11.5,
      lineHeight: 16,
    },

    // Studio Passcode Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(8, 10, 14, 0.58)',
      justifyContent: 'center',
      paddingHorizontal: 22,
    },
    modalCardOuter: {
      borderRadius: 24,
      borderWidth: 1,
      overflow: 'hidden',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.24,
      shadowRadius: 24,
      elevation: 8,
    },
    modalCardGrad: {
      padding: 20,
      gap: 14,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    modalHeaderTextCol: {
      flex: 1,
    },
    modalTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 18,
      lineHeight: 23,
    },
    modalSub: {
      fontFamily: Typography.fontBody,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },
    modalCloseBtn: {
      padding: 4,
    },
    modalInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 13,
      height: 48,
    },
    modalInput: {
      flex: 1,
      fontFamily: Typography.fontBodyMedium,
      fontSize: 14,
    },
    modalEyeBtn: {
      padding: 6,
    },
    modalErrorText: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 12,
      lineHeight: 16,
      color: '#EF4444',
      marginTop: -4,
    },
    modalActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 2,
    },
    modalCancelBtn: {
      flex: 1,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 13.5,
    },
    modalUnlockBtn: {
      flex: 1.3,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    portalLockBtn: {
      width: 34,
      height: 34,
      borderRadius: 11,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalUnlockText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 13.5,
      color: '#FFFFFF',
    },
  });
