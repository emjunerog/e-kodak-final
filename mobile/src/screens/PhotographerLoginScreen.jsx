/**
 * PhotographerLoginScreen.jsx
 * Luxury Studio Portal Sign-in for Staff & Photographers.
 * Adapts cleanly to Daylight, Darkroom, and Sage Atelier themes using
 * GlassBackground, E-Kodak studio emblem, 2-tone card surfaces, and
 * high-contrast icons/inputs.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import {
  signInWithEmail,
  signOut,
  verifyPhotographerSession,
  verifyStaffPortalPasscode,
} from '../services/bookingService';
import { setUserRole } from '../services/storageService';
import GlassBackground from '../components/GlassBackground';
import CardDecorElements from '../components/CardDecorElements';
import GoldButton from '../components/GoldButton';
import { Typography, Shadow } from '../theme';

const E_KODAK_LOGO = require('../../assets/ekodak-logo.png');

export default function PhotographerLoginScreen({ navigation, route }) {
  const { isDark, isSage, colors, gradients } = useTheme();
  const { showAlert } = useDialog();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => getStyles(colors, isDark, isSage),
    [colors, isDark, isSage]
  );

  const portalUnlockedParam = Boolean(route?.params?.portalUnlocked);

  const [localUnlocked, setLocalUnlocked] = useState(false);
  const portalUnlocked = portalUnlockedParam || localUnlocked;
  const [checkingSession, setCheckingSession] = useState(true);
  const [portalCode, setPortalCode] = useState('');
  const [showPortalCode, setShowPortalCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkExistingStaff() {
      const authCheck = await verifyPhotographerSession();
      if (!active) return;

      if (authCheck.authorized && authCheck.profile) {
        await setUserRole('photographer');
        navigation.replace('PhotographerMain', {
          photographerId: authCheck.profile.id,
          photographerName:
            authCheck.profile.full_name || authCheck.profile.email,
        });
        return;
      }

      // If a non-photographer session (e.g., web customer) was left on this device, clear it immediately
      await signOut().catch(() => {});
      await setUserRole('customer');
      if (active) setCheckingSession(false);
    }
    checkExistingStaff();
    return () => {
      active = false;
    };
  }, [navigation]);

  const cardGradientColors =
    gradients?.card ||
    (isDark ? ['#242029', '#151B24'] : ['#FAF2EA', '#E5EEF7']);
  const cardBorder = isDark
    ? 'rgba(180, 198, 224, 0.20)'
    : isSage
      ? '#D7DDD1'
      : '#DCDDE6';
  const accentColor = isDark ? colors.gold.light : colors.gold.DEFAULT;
  const placeholderColor = isDark
    ? '#9BA4B5'
    : isSage
      ? '#6D7667'
      : '#7B7366';
  const eyeIconColor = isDark ? '#D6DEEB' : isSage ? '#475041' : '#5A5247';

  const handleUnlockPortal = async () => {
    const clean = portalCode.trim();
    if (!clean) {
      showAlert('Passkey Required', 'Enter passkey.', [{ text: 'OK' }], { type: 'danger' });
      return;
    }
    setVerifyingCode(true);
    const result = await verifyStaffPortalPasscode(clean);
    setVerifyingCode(false);

    if (!result.valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showAlert('Access Locked', 'Incorrect passkey.', [{ text: 'OK' }], { type: 'danger' });
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setPortalCode('');
    setLocalUnlocked(true);
  };

  const handleLogin = async () => {
    if (!portalUnlocked) {
      showAlert('Portal Locked', 'Enter passkey.', [{ text: 'OK' }], { type: 'danger' });
      return;
    }
    if (!email.trim() || !password) {
      showAlert(
        'Missing Credentials',
        'Please enter your studio email and password.',
        [{ text: 'OK' }],
        { type: 'danger' }
      );
      return;
    }
    setLoading(true);
    const { data, error } = await signInWithEmail(email.trim(), password);

    if (error || !data?.user) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showAlert(
        'Authentication Failed',
        error?.message ||
          'Invalid credentials. Please verify with studio administration.',
        [{ text: 'OK' }],
        { type: 'danger' }
      );
      setLoading(false);
      return;
    }

    // Strict staff verification: reject customers, admins without photographer role, or inactive accounts
    const authCheck = await verifyPhotographerSession();
    if (!authCheck.authorized || !authCheck.profile) {
      await signOut().catch(() => {});
      await setUserRole('customer');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showAlert(
        'Photographers Only',
        authCheck.reason ||
          'This portal is locked for verified studio photographers only. Customers do not need an account — scan your booking QR instead.',
        [{ text: 'OK' }],
        { type: 'danger' }
      );
      setLoading(false);
      return;
    }

    await setUserRole('photographer');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setLoading(false);

    navigation.replace('PhotographerMain', {
      photographerId: authCheck.profile.id,
      photographerName: authCheck.profile.full_name || data.user.email,
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.base }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg.base}
      />

      {/* Theme-aware Ambient Glass Backdrop */}
      <GlassBackground />

      {/* Top Back Button */}
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() =>
          navigation.canGoBack()
            ? navigation.goBack()
            : navigation.navigate('Main')
        }
        style={[
          styles.backCircleBtn,
          { top: Math.max(insets.top, 12) + 8, borderColor: cardBorder },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ArrowLeft
          size={20}
          color={isDark ? colors.text.primary : '#181410'}
          strokeWidth={2.1}
        />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardWrap}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollInner,
            {
              paddingTop: Math.max(insets.top, 16) + 56,
              paddingBottom: Math.max(insets.bottom, 20) + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Logo & Editorial Titles */}
          <View style={styles.brand}>
            <View
              style={[
                styles.logoBadgeOuter,
                {
                  borderColor: accentColor,
                  backgroundColor: isDark ? '#1B1F2B' : '#FFFFFF',
                },
              ]}
            >
              <Image
                source={E_KODAK_LOGO}
                style={styles.logoImage}
                resizeMode="contain"
                accessibilityLabel="E-Kodak Studio emblem"
              />
            </View>
            <Text style={styles.brandName}>E-KODAK STUDIO</Text>
            <Text style={[styles.brandRole, { color: accentColor }]}>
              Photographer's portal
            </Text>
          </View>

          {/* 2-Tone Dashboard Form Card */}
          <View style={[styles.cardOuter, { borderColor: cardBorder }]}>
            <LinearGradient
              colors={cardGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <CardDecorElements variant="hero" isDark={isDark} />

              {checkingSession ? (
                <View style={styles.checkingBox}>
                  <ActivityIndicator size="small" color={accentColor} />
                  <Text style={styles.checkingText}>
                    Verifying studio access...
                  </Text>
                </View>
              ) : !portalUnlocked ? (
                <>
                  <Text style={styles.cardTitle}>Photographer's portal</Text>

                  <View style={styles.inputWrapper}>
                    <KeyRound
                      size={17}
                      color={accentColor}
                      strokeWidth={2}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter passkey"
                      placeholderTextColor={placeholderColor}
                      value={portalCode}
                      onChangeText={setPortalCode}
                      secureTextEntry={!showPortalCode}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleUnlockPortal}
                    />
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setShowPortalCode(!showPortalCode)}
                      style={styles.eyeBtn}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPortalCode ? 'Hide passkey' : 'Show passkey'
                      }
                    >
                      {showPortalCode ? (
                        <EyeOff size={17} color={eyeIconColor} strokeWidth={2} />
                      ) : (
                        <Eye size={17} color={eyeIconColor} strokeWidth={2} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <GoldButton
                    onPress={handleUnlockPortal}
                    loading={verifyingCode}
                    style={styles.loginBtn}
                    size="md"
                  >
                    Unlock
                  </GoldButton>
                </>
              ) : (
                <>
                  <Text style={styles.cardTitle}>Staff Sign In</Text>
                  <Text style={styles.cardSub}>
                    Access assigned daily shoots, clients, and session triggers.
                  </Text>

                  {/* Email Field */}
                  <View style={styles.inputWrapper}>
                    <Mail
                      size={17}
                      color={accentColor}
                      strokeWidth={2}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Studio email address"
                      placeholderTextColor={placeholderColor}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                  </View>

                  {/* Password Field */}
                  <View style={styles.inputWrapper}>
                    <Lock
                      size={17}
                      color={accentColor}
                      strokeWidth={2}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={placeholderColor}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPass}
                      returnKeyType="go"
                      onSubmitEditing={handleLogin}
                    />
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setShowPass(!showPass)}
                      style={styles.eyeBtn}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPass ? 'Hide password' : 'Show password'
                      }
                    >
                      {showPass ? (
                        <EyeOff size={17} color={eyeIconColor} strokeWidth={2} />
                      ) : (
                        <Eye size={17} color={eyeIconColor} strokeWidth={2} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <GoldButton
                    onPress={handleLogin}
                    loading={loading}
                    style={styles.loginBtn}
                    size="md"
                  >
                    Access Shoot Schedule
                  </GoldButton>
                </>
              )}
            </LinearGradient>
          </View>

          <Text style={styles.footerNote}>
            Authorized access only. Contact studio management for credentials.
          </Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('Main')}
            style={styles.switchHubBtn}
            activeOpacity={0.75}
          >
            <ArrowLeft size={14} color={accentColor} strokeWidth={2.2} />
            <Text style={[styles.switchHubText, { color: accentColor }]}>
              Return to Studio Client Hub
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors, isDark, isSage) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    backCircleBtn: {
      position: 'absolute',
      left: 18,
      zIndex: 10,
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: isDark ? '#000000' : '#4E4332',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.28 : 0.10,
      shadowRadius: 10,
      elevation: 4,
    },
    keyboardWrap: {
      flex: 1,
      zIndex: 1,
    },
    scrollInner: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },

    // Brand Header
    brand: {
      alignItems: 'center',
      marginBottom: 26,
    },
    logoBadgeOuter: {
      width: 78,
      height: 78,
      borderRadius: 26,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      marginBottom: 14,
      ...Shadow.goldSoft,
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    brandName: {
      fontFamily: Typography.fontHeading,
      fontSize: 22,
      lineHeight: 28,
      color: colors.text.primary,
      letterSpacing: 1.4,
      marginBottom: 4,
      textAlign: 'center',
    },
    brandRole: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 11.5,
      lineHeight: 16,
      letterSpacing: 1.8,
      textTransform: 'uppercase',
      textAlign: 'center',
    },

    // Form Card
    cardOuter: {
      width: '100%',
      borderRadius: 24,
      borderWidth: 1,
      overflow: 'hidden',
      shadowColor: isDark ? '#000000' : '#4E4332',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.28 : 0.09,
      shadowRadius: 16,
      elevation: isDark ? 3 : 4,
    },
    cardGradient: {
      padding: 22,
      gap: 14,
      position: 'relative',
    },
    cardTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 20,
      lineHeight: 26,
      color: isDark ? colors.text.primary : '#181410',
    },
    cardSub: {
      fontFamily: Typography.fontBody,
      fontSize: 12.5,
      lineHeight: 18,
      color: isDark ? colors.text.secondary : isSage ? '#555E50' : '#5C5346',
      marginTop: -6,
      marginBottom: 2,
    },

    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.22)'
        : isSage
          ? '#CFD7C7'
          : '#D5DAE5',
      borderRadius: 16,
      paddingHorizontal: 14,
      height: 52,
    },
    inputIcon: {
      marginRight: 11,
    },
    input: {
      flex: 1,
      fontFamily: Typography.fontBodyMedium,
      fontSize: 14,
      color: colors.text.primary,
    },
    eyeBtn: {
      padding: 6,
      marginLeft: 4,
    },

    loginBtn: {
      marginTop: 4,
    },
    checkingBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 28,
      gap: 10,
    },
    checkingText: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 13,
      color: isDark ? colors.text.secondary : isSage ? '#555E50' : '#5C5346',
    },

    footerNote: {
      fontFamily: Typography.fontBody,
      fontSize: 12,
      lineHeight: 18,
      color: isDark ? colors.text.secondary : isSage ? '#555E50' : '#5C5346',
      textAlign: 'center',
      marginTop: 22,
      maxWidth: 270,
    },
    switchHubBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    switchHubText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 13.5,
      lineHeight: 18,
    },
  });
