/**
 * PhotographerSettingsScreen.jsx
 * Photographer Settings Dashboard (Tab 5):
 *  - Floating GlassHeader (no icon beside title) with Check for Updates & Profile shortcuts
 *  - APPEARANCE: Daylight / Darkroom / Sage Atelier 3-theme preview cards
 *  - SHIFT & PREFERENCES: Available for Assignments (synced to DB) + sound/haptics/High Contrast toggles
 *  - STUDIO BAY: Live interactive Studio Google Map + address, hours & phone synced from studio_settings
 *  - STORAGE & UPDATES: Clear Cache & Check for Updates actions with icons
 *  - ACCOUNT & PORTAL: Sign Out of Photographer Portal
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  User,
  Check,
  MapPin,
  Phone,
  Clock,
  ChevronRight,
  LogOut,
  Radio,
  ArrowDownCircle,
  Trash2,
  Navigation,
} from 'lucide-react-native';

import GlassBackground from '../components/GlassBackground';
import GlassHeader from '../components/GlassHeader';
import GlassCard from '../components/GlassCard';
import CardDecorElements from '../components/CardDecorElements';
import FontAdjusterCard from '../components/FontAdjusterCard';
import DeliveryGoogleMap from '../components/DeliveryGoogleMap';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import { useResponsiveLayout } from '../utils/responsive';
import {
  getAppSettings,
  saveAppSettings,
  fetchStudioSettings,
  fetchStudioServices,
  clearAppCache,
  setUserRole,
} from '../services/storageService';
import {
  buildGoogleMapsLinks,
  STUDIO_ORIGIN_ADDRESS,
  STUDIO_COORDINATES,
} from '../services/googleMapsService';
import { verifyPhotographerSession, signOut } from '../services/bookingService';
import {
  fetchPhotographerProfile,
  toggleGeneralDutyAvailability,
} from '../services/photographerService';
import { playMascotSound } from '../utils/mascotAudio';
import appConfig from '../../app.json';
import { Typography } from '../theme';

const APP_VERSION = appConfig?.expo?.version || '1.0.0';

function StudioPillSwitch({ value, onToggle, isDark, highContrast, activeColor, label }) {
  const trackBg = value
    ? activeColor
    : highContrast
      ? isDark
        ? 'rgba(255, 255, 255, 0.28)'
        : 'rgba(15, 23, 42, 0.24)'
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
          { transform: [{ translateX: value ? 18 : 2 }] },
        ]}
      />
    </TouchableOpacity>
  );
}

export default function PhotographerSettingsScreen({ navigation }) {
  const {
    isDark,
    isSage,
    themeMode,
    setThemeMode,
    highContrast,
    setHighContrast,
    colors,
  } = useTheme();
  const { showAlert, showProcess, waitProcessDuration } = useDialog();
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const styles = useMemo(
    () => getStyles(colors, isDark, isSage, highContrast, layout),
    [colors, isDark, isSage, highContrast, layout],
  );

  const [photographerId, setPhotographerId] = useState(null);
  const [dutyAvailable, setDutyAvailable] = useState(true);
  const [togglingDuty, setTogglingDuty] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  const [studioInfo, setStudioInfo] = useState({
    address: '331 Rizal Street, City of Naga, Cebu, 6037',
    contact_phone: '+63 917 123 4567',
    business_hours: 'Mon – Sat: 8:00 AM – 6:00 PM',
  });

  const loadSettingsData = useCallback(async () => {
    try {
      const [auth, appSettings, studio] = await Promise.all([
        verifyPhotographerSession(),
        getAppSettings(),
        fetchStudioSettings(),
      ]);

      if (!auth.authorized || !auth.profile?.id) {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        return;
      }

      setPhotographerId(auth.profile.id);
      const profileRes = await fetchPhotographerProfile(auth.profile.id);
      if (profileRes?.data && typeof profileRes.data.is_available === 'boolean') {
        setDutyAvailable(profileRes.data.is_available);
      }

      setSoundEnabled(appSettings.sound ?? true);
      setHapticsEnabled(appSettings.haptics ?? true);

      if (studio) {
        setStudioInfo((prev) => ({
          address: studio.address || prev.address,
          contact_phone: studio.contact_phone || prev.contact_phone,
          business_hours: studio.business_hours || prev.business_hours,
        }));
      }
    } catch {
      // Keep current values
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadSettingsData();
    }, [loadSettingsData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSettingsData();
    setRefreshing(false);
  }, [loadSettingsData]);

  const handleToggleDuty = async (nextVal) => {
    if (!photographerId || togglingDuty) return;
    if (hapticsEnabled) {
      Haptics.selectionAsync().catch(() => {});
    }
    const prev = dutyAvailable;
    setDutyAvailable(nextVal);
    setTogglingDuty(true);
    try {
      const res = await toggleGeneralDutyAvailability(photographerId, nextVal);
      if (res?.error) {
        setDutyAvailable(prev);
        showAlert('Update Failed', res.error.message || 'Could not update duty status.');
      }
    } finally {
      setTogglingDuty(false);
    }
  };

  const updatePrefSetting = async (key, val) => {
    if (hapticsEnabled) {
      Haptics.selectionAsync().catch(() => {});
    }
    if (key === 'highContrast') {
      await setHighContrast(val);
      return;
    }

    const current = await getAppSettings();
    const updated = {
      ...current,
      sound: key === 'sound' ? val : soundEnabled,
      haptics: key === 'haptics' ? val : hapticsEnabled,
      highContrast,
    };
    if (key === 'sound') {
      setSoundEnabled(val);
      if (val) playMascotSound('pop');
    }
    if (key === 'haptics') setHapticsEnabled(val);
    await saveAppSettings(updated);
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
              { type: 'success' },
            );
            return;
          }
        }
      } catch {
        // expo-updates not active in dev/Expo Go builds
      }

      if (!otaUpdateAvailable) {
        const [freshStudio, freshServices] = await Promise.all([
          fetchStudioSettings(),
          fetchStudioServices(),
          waitProcessDuration(1050),
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
          { type: 'success' },
        );
      }
    } catch {
      showAlert(
        'Check Updates',
        `Running E-Kodak Studio v${APP_VERSION}. Connect to the internet to sync latest updates.`,
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
      'This clears temporary cached files and snapshots while keeping your photographer session and preferences intact.',
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
              waitProcessDuration(1050),
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
            } else if (hapticsEnabled) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
            showAlert(
              'Cache Cleared',
              result.ok
                ? 'Temporary cache cleared and studio info refreshed.'
                : 'Cache refresh completed.',
              [{ text: 'Done' }],
              { type: 'success' },
            );
          },
        },
      ],
      { type: 'confirm' },
    );
  };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    showAlert(
      'Sign Out of Portal?',
      'You can sign back in anytime by scanning your Photographer Login QR code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut().catch(() => {});
            await setUserRole('customer').catch(() => {});
            navigation.reset({
              index: 0,
              routes: [{ name: 'WelcomeTour', params: { initialSlide: 1 } }],
            });
          },
        },
      ],
      { type: 'danger' },
    );
  };

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

  const activeSwitchColor = colors.gold.DEFAULT;
  const studioLinks = useMemo(
    () =>
      buildGoogleMapsLinks({
        address: studioInfo.address || STUDIO_ORIGIN_ADDRESS,
        latitude: STUDIO_COORDINATES.latitude,
        longitude: STUDIO_COORDINATES.longitude,
        isPickup: true,
      }),
    [studioInfo.address],
  );
  const mapCardBorder = highContrast
    ? colors.gold.borderLight
    : isDark
      ? 'rgba(180, 198, 224, 0.22)'
      : '#DCDDE6';

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <GlassBackground />

      <GlassHeader
        title="Studio Settings"
        subtitle="Theme, duty status & studio bay"
        right={
          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={handleCheckUpdates}
              disabled={checkingUpdates}
              activeOpacity={0.75}
              accessibilityLabel="Check for updates"
            >
              {checkingUpdates ? (
                <ActivityIndicator size="small" color={colors.gold.DEFAULT} />
              ) : (
                <ArrowDownCircle size={18} color={colors.text.primary} strokeWidth={2} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => navigation.navigate('PhotographerProfile')}
              activeOpacity={0.75}
              accessibilityLabel="Open photographer profile"
            >
              <User size={18} color={colors.text.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + insets.bottom },
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
        {/* APPEARANCE */}
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <GlassCard style={styles.sectionCard}>
          <CardDecorElements variant="corner" isDark={isDark} />
          <View style={styles.themeGrid}>
            {themeCards.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.themeCard,
                  item.selected && {
                    borderColor: colors.gold.DEFAULT,
                    borderWidth: highContrast ? 2.5 : 2,
                  },
                ]}
                onPress={() => {
                  if (hapticsEnabled) Haptics.selectionAsync().catch(() => {});
                  setThemeMode(item.id);
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={item.previewGradient}
                  style={styles.themePreview}
                >
                  <Text style={[styles.themeAa, { color: item.aaColor }]}>Aa</Text>
                  <View
                    style={[styles.themeBar, { backgroundColor: item.barColor }]}
                  />
                  {item.selected && (
                    <View
                      style={[
                        styles.themeCheckBadge,
                        { backgroundColor: colors.gold.DEFAULT },
                      ]}
                    >
                      <Check
                        size={11}
                        color={isDark ? '#17130C' : '#FFFFFF'}
                        strokeWidth={2.8}
                      />
                    </View>
                  )}
                </LinearGradient>
                <View style={[styles.themeFooter, { backgroundColor: item.footerBg }]}>
                  <Text
                    style={[styles.themeLabel, { color: item.footerText }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* TEXT SIZE */}
        <Text style={styles.sectionLabel}>TEXT SIZE</Text>
        <View style={{ marginBottom: layout.pad(14, 0.5) }}>
          <FontAdjusterCard hapticsEnabled={hapticsEnabled} />
        </View>

        {/* SHIFT & PREFERENCES */}
        <Text style={styles.sectionLabel}>SHIFT & PREFERENCES</Text>
        <GlassCard style={styles.listCard}>
          <View style={styles.switchRow}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIconWrap}>
                <Radio
                  size={17}
                  color={dutyAvailable ? '#10B981' : colors.text.muted}
                  strokeWidth={2}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Available for Assignments</Text>
                <Text style={styles.rowSub}>
                  {dutyAvailable
                    ? 'Studio dispatch can assign new shoots'
                    : 'Paused from automatic dispatch'}
                </Text>
              </View>
            </View>
            <StudioPillSwitch
              value={dutyAvailable}
              onToggle={handleToggleDuty}
              isDark={isDark}
              highContrast={highContrast}
              activeColor="#10B981"
              label="Available for assignments"
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Studio Sound Cues</Text>
              <Text style={styles.rowSub}>Audio chimes for booking updates</Text>
            </View>
            <StudioPillSwitch
              value={soundEnabled}
              onToggle={(val) => updatePrefSetting('sound', val)}
              isDark={isDark}
              highContrast={highContrast}
              activeColor={activeSwitchColor}
              label="Studio sound cues"
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Haptic Feedback</Text>
              <Text style={styles.rowSub}>Tactile response on buttons & switches</Text>
            </View>
            <StudioPillSwitch
              value={hapticsEnabled}
              onToggle={(val) => updatePrefSetting('haptics', val)}
              isDark={isDark}
              highContrast={highContrast}
              activeColor={activeSwitchColor}
              label="Haptic feedback"
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>High Contrast</Text>
              <Text style={styles.rowSub}>
                Boosts text, surfaces & border visibility
              </Text>
            </View>
            <StudioPillSwitch
              value={highContrast}
              onToggle={(val) => updatePrefSetting('highContrast', val)}
              isDark={isDark}
              highContrast={highContrast}
              activeColor={activeSwitchColor}
              label="High contrast mode"
            />
          </View>
        </GlassCard>

        {/* STUDIO BAY INFO + LIVE GOOGLE MAP */}
        <Text style={styles.sectionLabel}>STUDIO BAY</Text>
        <GlassCard style={styles.studioBayCard}>
          <DeliveryGoogleMap
            studioOnly
            isDark={isDark}
            colors={colors}
            cardBorder={mapCardBorder}
            bannerBg={colors.gold.bg}
            bannerBorder={highContrast ? colors.gold.DEFAULT : colors.gold.border}
            onOpenExternalUrl={(url) => Linking.openURL(url).catch(() => {})}
          />

          <View style={styles.mapActionsRow}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => {
                if (hapticsEnabled) Haptics.selectionAsync().catch(() => {});
                Linking.openURL(studioLinks.viewUrl).catch(() => {});
              }}
              style={styles.mapActionBtn}
            >
              <MapPin size={14} color={colors.text.primary} strokeWidth={2.1} />
              <Text style={styles.mapActionText}>Open in Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => {
                if (hapticsEnabled) Haptics.selectionAsync().catch(() => {});
                Linking.openURL(studioLinks.directionsUrl).catch(() => {});
              }}
              style={styles.mapActionBtn}
            >
              <Navigation size={14} color={colors.gold.DEFAULT} strokeWidth={2.1} />
              <Text style={[styles.mapActionText, { color: colors.gold.DEFAULT }]}>
                Directions
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <View style={styles.rowIconWrap}>
              <MapPin size={17} color={colors.gold.DEFAULT} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoCaption}>Studio Address</Text>
              <Text style={styles.infoValue}>{studioInfo.address}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <View style={styles.rowIconWrap}>
              <Clock size={17} color={colors.gold.DEFAULT} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoCaption}>Operating Hours</Text>
              <Text style={styles.infoValue}>{studioInfo.business_hours}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => {
              const tel = `tel:${studioInfo.contact_phone.replace(/\s+/g, '')}`;
              Linking.openURL(tel).catch(() => {});
            }}
            activeOpacity={0.78}
          >
            <View style={styles.rowIconWrap}>
              <Phone size={17} color={colors.gold.DEFAULT} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoCaption}>Reception Desk</Text>
              <Text style={styles.infoValue}>{studioInfo.contact_phone}</Text>
            </View>
            <ChevronRight size={17} color={colors.text.muted} strokeWidth={2} />
          </TouchableOpacity>
        </GlassCard>

        {/* STORAGE & UPDATES */}
        <Text style={styles.sectionLabel}>STORAGE & UPDATES</Text>
        <GlassCard style={styles.listCard}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleClearCache}
            disabled={clearingCache}
            activeOpacity={0.78}
            accessibilityLabel="Clear cache"
          >
            <View style={styles.rowIconWrap}>
              {clearingCache ? (
                <ActivityIndicator size="small" color={colors.gold.DEFAULT} />
              ) : (
                <Trash2 size={17} color={colors.gold.DEFAULT} strokeWidth={2} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Clear Cache</Text>
              <Text style={styles.rowSub}>
                Clear temporary cache & refresh studio info
              </Text>
            </View>
            <ChevronRight size={17} color={colors.text.muted} strokeWidth={2} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleCheckUpdates}
            disabled={checkingUpdates}
            activeOpacity={0.78}
            accessibilityLabel="Check for updates"
          >
            <View style={styles.rowIconWrap}>
              {checkingUpdates ? (
                <ActivityIndicator size="small" color={colors.gold.DEFAULT} />
              ) : (
                <ArrowDownCircle size={17} color={colors.gold.DEFAULT} strokeWidth={2} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Check for Updates</Text>
              <Text style={styles.rowSub}>
                Sync studio packages & verify release v{APP_VERSION}
              </Text>
            </View>
            <ChevronRight size={17} color={colors.text.muted} strokeWidth={2} />
          </TouchableOpacity>
        </GlassCard>

        {/* ACCOUNT & PORTAL (Sign Out only) */}
        <Text style={styles.sectionLabel}>ACCOUNT & PORTAL</Text>
        <GlassCard style={styles.listCard}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleSignOut}
            activeOpacity={0.78}
          >
            <View
              style={[
                styles.rowIconWrap,
                {
                  backgroundColor: highContrast
                    ? 'rgba(239, 68, 68, 0.24)'
                    : 'rgba(239, 68, 68, 0.14)',
                },
              ]}
            >
              <LogOut size={17} color="#EF4444" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: '#EF4444' }]}>
                Sign Out of Photographer Portal
              </Text>
              <Text style={styles.rowSub}>End staff session on this device</Text>
            </View>
            <ChevronRight size={17} color="#EF4444" strokeWidth={2} />
          </TouchableOpacity>
        </GlassCard>

        <Text style={styles.versionFoot}>
          E-Kodak Studio Photographer Portal • v{APP_VERSION}
        </Text>
      </ScrollView>
    </View>
  );
}

const stylesStatic = StyleSheet.create({
  pillTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  pillThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
});

const getStyles = (colors, isDark, isSage, highContrast, layout) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg.base,
    },
    headerActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerActionBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: highContrast ? 1.5 : 0,
      borderColor: highContrast ? colors.gold.borderLight : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: highContrast
        ? colors.bg.surface
        : isDark
          ? 'rgba(255, 255, 255, 0.08)'
          : isSage
            ? 'rgba(79, 104, 70, 0.10)'
            : 'rgba(15, 23, 42, 0.06)',
    },
    scrollContent: {
      paddingHorizontal: layout.gutter,
      paddingTop: layout.pad(14, 0.45),
    },
    sectionLabel: {
      fontFamily: Typography.fontBodySemi,
      fontSize: layout.fs(11, 0.75),
      lineHeight: layout.fs(15, 0.75),
      letterSpacing: 1.1,
      color: highContrast ? colors.text.secondary : colors.text.muted,
      marginBottom: layout.pad(8, 0.45),
      marginTop: layout.pad(6, 0.45),
      marginLeft: 2,
    },
    sectionCard: {
      padding: layout.pad(14, 0.5),
      marginBottom: layout.pad(14, 0.5),
      overflow: 'hidden',
    },
    themeGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    themeCard: {
      flex: 1,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: highContrast ? 1.5 : 1,
      borderColor: highContrast
        ? colors.surface.hairline
        : isDark
          ? 'rgba(255,255,255,0.12)'
          : 'rgba(15,23,42,0.10)',
    },
    themePreview: {
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    themeAa: {
      fontFamily: Typography.fontHeading,
      fontSize: 18,
    },
    themeBar: {
      width: 24,
      height: 4,
      borderRadius: 2,
      marginTop: 4,
    },
    themeCheckBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeFooter: {
      paddingVertical: 7,
      alignItems: 'center',
    },
    themeLabel: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 11,
    },
    listCard: {
      paddingHorizontal: layout.pad(16, 0.5),
      paddingVertical: layout.pad(6, 0.6),
      marginBottom: layout.pad(14, 0.5),
    },
    studioBayCard: {
      paddingHorizontal: layout.pad(16, 0.5),
      paddingTop: layout.pad(14, 0.55),
      paddingBottom: layout.pad(6, 0.5),
      marginBottom: layout.pad(14, 0.5),
    },
    mapActionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
      marginBottom: 12,
    },
    mapActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderRadius: 13,
      borderWidth: highContrast ? 1.5 : 1,
      borderColor: highContrast
        ? colors.gold.borderLight
        : isDark
          ? 'rgba(255,255,255,0.14)'
          : 'rgba(15,23,42,0.10)',
      backgroundColor: highContrast
        ? colors.bg.surface
        : isDark
          ? 'rgba(255,255,255,0.06)'
          : '#FFFFFF',
    },
    mapActionText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 12.5,
      color: colors.text.primary,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: layout.pad(12, 0.7),
      gap: 12,
    },
    rowLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    rowIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.gold.bg,
      borderWidth: highContrast ? 1 : 0,
      borderColor: highContrast ? colors.gold.border : 'transparent',
    },
    rowTitle: {
      fontFamily: Typography.fontBodySemi,
      fontSize: layout.fs(14.5, 0.9),
      lineHeight: layout.fs(19, 0.9),
      color: colors.text.primary,
    },
    rowSub: {
      fontFamily: Typography.fontBody,
      fontSize: layout.fs(12, 0.9),
      lineHeight: layout.fs(16.5, 0.9),
      color: highContrast ? colors.text.secondary : colors.text.muted,
      marginTop: layout.pad(2, 0.5),
    },
    rowDivider: {
      height: highContrast ? 1.5 : 1,
      backgroundColor: colors.surface.divider,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingVertical: layout.pad(12, 0.7),
    },
    infoCaption: {
      fontFamily: Typography.fontBodySemi,
      fontSize: layout.fs(11, 0.85),
      lineHeight: layout.fs(15, 0.85),
      color: highContrast ? colors.text.secondary : colors.text.muted,
    },
    infoValue: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: layout.fs(13.5, 0.9),
      lineHeight: layout.fs(18.5, 0.9),
      color: colors.text.primary,
      marginTop: layout.pad(2, 0.5),
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingVertical: layout.pad(12, 0.7),
    },
    versionFoot: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 11.5,
      color: highContrast ? colors.text.secondary : colors.text.muted,
      textAlign: 'center',
      marginTop: 4,
    },
  });
