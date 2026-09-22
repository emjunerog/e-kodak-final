/**
 * SettingsScreen.jsx
 * Customization dashboard & administrative staff portal gateway.
 * Features:
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
  Shield, ChevronRight, MapPin, Phone, Info, Lock,
} from 'lucide-react-native';

import GlassCard from '../components/GlassCard';
import GoldButton from '../components/GoldButton';
import {
  getAppSettings, saveAppSettings, clearAllSavedBookings,
} from '../services/storageService';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';

export default function SettingsScreen({ navigation }) {
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
            <Settings size={20} color={Colors.gold.light} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Studio Settings</Text>
            <Text style={styles.headerSub}>Preferences & administrative access</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Preferences Section ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>APP PREFERENCES</Text>
          <GlassCard highlight style={styles.settingsCard}>
            {/* Notifications */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={styles.iconBox}>
                  <Bell size={16} color={Colors.gold.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingDesc}>Receive live alerts when shoot status updates.</Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={(v) => updateSetting('notifications', v)}
                trackColor={{ false: Colors.neutral[800], true: Colors.gold.DEFAULT }}
                thumbColor={notifications ? Colors.text.primary : Colors.neutral[500]}
              />
            </View>

            <View style={styles.divider} />

            {/* Haptic Feedback */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={styles.iconBox}>
                  <Vibrate size={16} color={Colors.gold.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Tactile Haptics</Text>
                  <Text style={styles.settingDesc}>Subtle vibration on button taps and QR scans.</Text>
                </View>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={(v) => updateSetting('haptics', v)}
                trackColor={{ false: Colors.neutral[800], true: Colors.gold.DEFAULT }}
                thumbColor={hapticsEnabled ? Colors.text.primary : Colors.neutral[500]}
              />
            </View>

            <View style={styles.divider} />

            {/* Darkroom Contrast */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={styles.iconBox}>
                  <Eye size={16} color={Colors.gold.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Darkroom High Contrast</Text>
                  <Text style={styles.settingDesc}>Enriched gold card borders for bright sunlight.</Text>
                </View>
              </View>
              <Switch
                value={highContrast}
                onValueChange={(v) => updateSetting('highContrast', v)}
                trackColor={{ false: Colors.neutral[800], true: Colors.gold.DEFAULT }}
                thumbColor={highContrast ? Colors.text.primary : Colors.neutral[500]}
              />
            </View>
          </GlassCard>
        </View>

        {/* ── Administrative Sector (Photographer & Staff Access) ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>ADMINISTRATIVE SECTOR</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PhotographerLogin')}
          >
            <GlassCard glow highlight style={styles.staffCard}>
              <View style={styles.staffCardRow}>
                <View style={styles.staffIconRing}>
                  <Lock size={20} color={Colors.gold.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.staffBadgeRow}>
                    <Text style={styles.staffBadge}>STUDIO STAFF ONLY</Text>
                  </View>
                  <Text style={styles.staffTitle}>Photographer Portal</Text>
                  <Text style={styles.staffSub}>
                    Sign in with studio credentials to view assigned shoots, daily bookings, and session action triggers.
                  </Text>
                </View>
                <ChevronRight size={18} color={Colors.gold.light} />
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>

        {/* ── Data Management ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>DATA MANAGEMENT</Text>
          <GlassCard highlight style={styles.settingsCard}>
            <TouchableOpacity
              onPress={handleClearData}
              activeOpacity={0.7}
              style={styles.actionRowBtn}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                  <Trash2 size={16} color={Colors.status.cancelled} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingTitle, { color: Colors.status.cancelled }]}>
                    Clear Saved Studio Passes
                  </Text>
                  <Text style={styles.settingDesc}>
                    Remove cached QR passes and profile info from this phone.
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color={Colors.neutral[600]} />
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* ── Studio Information ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>ABOUT THE STUDIO</Text>
          <GlassCard highlight style={styles.infoCard}>
            <View style={styles.infoLine}>
              <Text style={styles.infoKey}>Companion App</Text>
              <Text style={styles.infoVal}>v1.2.0 Luxury Edition</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoLine}>
              <Text style={styles.infoKey}>Flagship Location</Text>
              <Text style={styles.infoVal}>Lahug, Cebu City, PH</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoLine}>
              <Text style={styles.infoKey}>Studio Inquiries</Text>
              <Text style={styles.infoVal}>concierge@ekodak.ph</Text>
            </View>
          </GlassCard>
        </View>

        <View style={{ height: 36 }} />
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

  sectionBlock: {
    gap: Spacing[2],
  },
  sectionLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10.5,
    color: Colors.gold.light,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  settingsCard: {
    padding: Spacing[4],
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[1],
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
    paddingRight: Spacing[2],
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
  },
  settingDesc: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 16,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gold.border,
    marginVertical: Spacing[3],
  },

  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Staff Portal Card
  staffCard: {
    padding: Spacing[4],
  },
  staffCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  staffIconRing: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffBadgeRow: {
    marginBottom: 2,
  },
  staffBadge: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    color: Colors.gold.light,
    letterSpacing: 1,
  },
  staffTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
  },
  staffSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 17,
    marginTop: 2,
  },

  // Info Card
  infoCard: {
    padding: Spacing[4],
    gap: Spacing[2],
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoKey: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  infoVal: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.xs,
    color: Colors.gold.light,
  },
});
