/**
 * SettingsScreen.jsx
 * Customization dashboard, theme switcher & administrative staff portal gateway.
 * Features:
 * - Studio theme switcher: "Darkroom Mode" vs "Daylight Gallery"
 * - App customization toggles (notifications, haptics, contrast)
 * - Cache & saved passes data reset
 * - Administrative gateway to Photographer & Staff Portal
 * - Studio information & concierge contact details
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Settings, Bell, Vibrate, Eye, Trash2, Camera,
  Shield, ChevronRight, MapPin, Phone, Info, Lock, RotateCcw, Sparkles,
  Sun, Moon,
} from 'lucide-react-native';

import GlassCard from '../components/GlassCard';
import GoldButton from '../components/GoldButton';
import { useTheme } from '../context/ThemeContext';
import {
  getAppSettings, saveAppSettings, clearAllSavedBookings, resetOnboarding,
} from '../services/storageService';
import { Typography, Spacing, Radius, Shadow } from '../theme';

export default function SettingsScreen({ navigation }) {
  const { isDark, themeMode, setThemeMode, colors, gradients } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [highContrast, setHighContrast]   = useState(false);

  useEffect(() => {
    getAppSettings().then((s) => {
      setNotifications(s.notifications ?? true);
      setHapticsEnabled(s.haptics ?? true);
      setHighContrast(s.highContrast ?? false);
    });
  }, []);

  const updateSetting = async (key, val) => {
    if (hapticsEnabled) {
      try { await Haptics.selectionAsync(); } catch {}
    }
    const updated = {
      notifications: key === 'notifications' ? val : notifications,
      haptics: key === 'haptics' ? val : hapticsEnabled,
      highContrast: key === 'highContrast' ? val : highContrast,
    };
    if (key === 'notifications') setNotifications(val);
    if (key === 'haptics') setHapticsEnabled(val);
    if (key === 'highContrast') setHighContrast(val);
    await saveAppSettings(updated);
  };

  const handleThemeChange = (mode) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setThemeMode(mode);
  };

  const handleClearData = () => {
    Alert.alert(
      'Reset Stored Passes?',
      'This will remove all locally saved passes and cached profile details from this device. Your bookings remain safe in the studio database.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Passes',
          style: 'destructive',
          onPress: async () => {
            await clearAllSavedBookings();
            try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
            Alert.alert('Data Cleared', 'All locally saved studio passes have been cleared.');
          },
        },
      ]
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Replay Studio Tour & Role Setup?',
      'This will reset your role and display the studio introduction on next launch.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset & Replay',
          onPress: async () => {
            await resetOnboarding();
            try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
            Alert.alert('Onboarding Reset', 'Please restart or reload the app to experience the introduction and role selection.');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.base }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg.base}
      />

      {/* ── Editorial Header ── */}
      <LinearGradient
        colors={gradients.darkStudio}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { borderBottomColor: colors.gold.border }]}
      >
        <View style={styles.headerTop}>
          <View style={[styles.headerIconRing, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
            <Settings size={20} color={colors.gold.light} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Studio Settings</Text>
            <Text style={[styles.headerSub, { color: colors.text.secondary }]}>Preferences & studio customization</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Theme Switcher Section ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: colors.gold.DEFAULT }]}>STUDIO APPEARANCE</Text>
          <GlassCard highlight style={styles.settingsCard}>
            <View style={styles.themeSelectorRow}>
              {/* Darkroom Mode */}
              <TouchableOpacity
                onPress={() => handleThemeChange('dark')}
                style={[
                  styles.themeOptionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(212, 168, 83, 0.12)' : 'transparent',
                    borderColor: isDark ? colors.gold.DEFAULT : colors.gold.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Moon size={22} color={isDark ? colors.gold.light : colors.text.muted} strokeWidth={isDark ? 2.2 : 1.75} />
                <Text style={[styles.themeOptionTitle, { color: isDark ? colors.gold.light : colors.text.secondary }]}>
                  Darkroom
                </Text>
                <Text style={[styles.themeOptionSub, { color: colors.text.muted }]}>
                  Studio Noir
                </Text>
                {isDark && (
                  <View style={[styles.activeThemeIndicator, { backgroundColor: colors.gold.DEFAULT }]} />
                )}
              </TouchableOpacity>

              {/* Daylight Gallery */}
              <TouchableOpacity
                onPress={() => handleThemeChange('light')}
                style={[
                  styles.themeOptionBtn,
                  {
                    backgroundColor: !isDark ? 'rgba(184, 134, 11, 0.08)' : 'transparent',
                    borderColor: !isDark ? colors.gold.DEFAULT : colors.gold.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Sun size={22} color={!isDark ? colors.gold.DEFAULT : colors.text.muted} strokeWidth={!isDark ? 2.2 : 1.75} />
                <Text style={[styles.themeOptionTitle, { color: !isDark ? colors.gold.DEFAULT : colors.text.secondary }]}>
                  Daylight
                </Text>
                <Text style={[styles.themeOptionSub, { color: colors.text.muted }]}>
                  Warm Linen
                </Text>
                {!isDark && (
                  <View style={[styles.activeThemeIndicator, { backgroundColor: colors.gold.DEFAULT }]} />
                )}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>

        {/* ── Preferences Section ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: colors.gold.DEFAULT }]}>APP PREFERENCES</Text>
          <GlassCard highlight style={styles.settingsCard}>
            {/* Notifications */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
                  <Bell size={16} color={colors.gold.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingTitle, { color: colors.text.primary }]}>Push Notifications</Text>
                  <Text style={[styles.settingDesc, { color: colors.text.secondary }]}>Receive live alerts when shoot status updates.</Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={(v) => updateSetting('notifications', v)}
                trackColor={{ false: isDark ? '#332F2A' : '#D6D0C4', true: colors.gold.DEFAULT }}
                thumbColor={notifications ? '#FFFFFF' : '#8F877A'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.gold.border }]} />

            {/* Haptic Feedback */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
                  <Vibrate size={16} color={colors.gold.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingTitle, { color: colors.text.primary }]}>Tactile Haptics</Text>
                  <Text style={[styles.settingDesc, { color: colors.text.secondary }]}>Subtle vibration on button taps and QR scans.</Text>
                </View>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={(v) => updateSetting('haptics', v)}
                trackColor={{ false: isDark ? '#332F2A' : '#D6D0C4', true: colors.gold.DEFAULT }}
                thumbColor={hapticsEnabled ? '#FFFFFF' : '#8F877A'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.gold.border }]} />

            {/* Darkroom Contrast */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
                  <Eye size={16} color={colors.gold.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingTitle, { color: colors.text.primary }]}>High Contrast Edges</Text>
                  <Text style={[styles.settingDesc, { color: colors.text.secondary }]}>Enriched gold card borders for bright daylight.</Text>
                </View>
              </View>
              <Switch
                value={highContrast}
                onValueChange={(v) => updateSetting('highContrast', v)}
                trackColor={{ false: isDark ? '#332F2A' : '#D6D0C4', true: colors.gold.DEFAULT }}
                thumbColor={highContrast ? '#FFFFFF' : '#8F877A'}
              />
            </View>
          </GlassCard>
        </View>

        {/* ── Administrative Sector (Photographer & Staff Access) ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: colors.gold.DEFAULT }]}>ADMINISTRATIVE SECTOR</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PhotographerLogin')}
          >
            <GlassCard glow highlight style={styles.staffCard}>
              <View style={styles.staffCardRow}>
                <View style={[styles.staffIconRing, { backgroundColor: colors.gold.bg, borderColor: colors.gold.borderLight }]}>
                  <Lock size={20} color={colors.gold.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.staffBadgeRow}>
                    <Text style={[styles.staffTitle, { color: colors.text.primary }]}>Photographer & Staff Portal</Text>
                    <View style={[styles.staffPill, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
                      <Text style={[styles.staffPillText, { color: colors.gold.light }]}>STAFF ONLY</Text>
                    </View>
                  </View>
                  <Text style={[styles.staffDesc, { color: colors.text.secondary }]}>
                    Access studio shoot calendars, milestone updates & client queue management.
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.gold.light} />
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>

        {/* ── Studio Information ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: colors.gold.DEFAULT }]}>E-KODAK ATELIER</Text>
          <GlassCard highlight style={styles.infoCard}>
            <View style={styles.infoItem}>
              <MapPin size={16} color={colors.gold.light} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>STUDIO LOCATION</Text>
                <Text style={[styles.infoVal, { color: colors.text.primary }]}>311 Rizal Street, City of Naga, Cebu</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.gold.border }]} />

            <View style={styles.infoItem}>
              <Phone size={16} color={colors.gold.light} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>CONCIERGE HOTLINE</Text>
                <Text style={[styles.infoVal, { color: colors.text.primary }]}>+63 917 123 4567</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.gold.border }]} />

            <View style={styles.infoItem}>
              <Info size={16} color={colors.gold.light} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>HOURS OF OPERATION</Text>
                <Text style={[styles.infoVal, { color: colors.text.primary }]}>Mon – Sat: 8:00 AM – 6:00 PM</Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* ── Data Management & Cache ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: colors.gold.DEFAULT }]}>DATA & STORAGE</Text>
          <GlassCard style={styles.dataCard}>
            <TouchableOpacity
              onPress={handleResetOnboarding}
              style={styles.dataActionRow}
              activeOpacity={0.7}
            >
              <View style={styles.dataActionLeft}>
                <RotateCcw size={16} color={colors.gold.light} />
                <View>
                  <Text style={[styles.dataActionTitle, { color: colors.text.primary }]}>Replay Welcome Tour</Text>
                  <Text style={[styles.dataActionSub, { color: colors.text.secondary }]}>Reset role selection and app guide</Text>
                </View>
              </View>
              <ChevronRight size={16} color={colors.text.muted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.gold.border }]} />

            <TouchableOpacity
              onPress={handleClearData}
              style={styles.dataActionRow}
              activeOpacity={0.7}
            >
              <View style={styles.dataActionLeft}>
                <Trash2 size={16} color="#EF4444" />
                <View>
                  <Text style={[styles.dataActionTitle, { color: '#EF4444' }]}>Clear Stored Passes</Text>
                  <Text style={[styles.dataActionSub, { color: colors.text.secondary }]}>Remove cached QR passes from this phone</Text>
                </View>
              </View>
              <ChevronRight size={16} color={colors.text.muted} />
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* ── App Version Footnote ── */}
        <View style={styles.footerBlock}>
          <Text style={[styles.footerText, { color: colors.text.muted }]}>E-Kodak Studio Companion v1.0.0</Text>
          <Text style={[styles.footerSub, { color: colors.gold.DEFAULT }]}>Track your photography journey from shoot to delivery</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 110 },

  // Header
  header: {
    paddingTop: 54,
    paddingBottom: Spacing[6],
    paddingHorizontal: Spacing[6],
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  headerIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.goldSoft,
  },
  headerTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size['2xl'],
  },
  headerSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    marginTop: 2,
  },

  // Section Blocks
  sectionBlock: {
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[6],
  },
  sectionLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10,
    letterSpacing: 1.8,
    marginBottom: Spacing[2],
    paddingLeft: Spacing[1],
  },

  // Theme Selector
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    padding: Spacing[3],
  },
  themeOptionBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  activeThemeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  themeOptionTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.sm,
    marginTop: 2,
  },
  themeOptionSub: {
    fontFamily: Typography.fontBody,
    fontSize: 10,
  },

  // Preferences Card
  settingsCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[4],
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
    paddingRight: Spacing[3],
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.sm,
    marginBottom: 2,
  },
  settingDesc: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing[4],
    opacity: 0.25,
  },

  // Staff Portal Card
  staffCard: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
  },
  staffCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  staffIconRing: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  staffTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.sm,
  },
  staffPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  staffPillText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  staffDesc: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    lineHeight: 16,
  },

  // Info Card
  infoCard: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  infoLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 2,
  },
  infoVal: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs,
  },

  // Data Card
  dataCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  dataActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[4],
  },
  dataActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  dataActionTitle: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.sm,
  },
  dataActionSub: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    marginTop: 2,
  },

  // Footer
  footerBlock: {
    alignItems: 'center',
    marginTop: Spacing[8],
    paddingHorizontal: Spacing[6],
    gap: 4,
  },
  footerText: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
  },
  footerSub: {
    fontFamily: Typography.fontHeadingItalic,
    fontSize: 11,
    textAlign: 'center',
  },
});
