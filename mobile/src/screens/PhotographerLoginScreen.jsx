/**
 * PhotographerLoginScreen.jsx
 * Luxury Studio Portal Sign-in for Staff & Photographers.
 * Features:
 * - Playfair Display & Inter typography
 * - Dark studio gradient backdrop with ambient gold lighting
 * - Translucent GlassCard container with specular highlights
 * - Brushed metallic gold gradient CTA button
 */

import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  StatusBar, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Aperture, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { signInWithEmail, getProfile } from '../services/bookingService';
import GlassCard from '../components/GlassCard';
import GoldButton from '../components/GoldButton';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';

export default function PhotographerLoginScreen({ navigation }) {
  const { isDark, colors, gradients } = useTheme();
  const styles = getStyles(colors);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Credentials', 'Please enter your studio email and password.');
      return;
    }
    setLoading(true);
    const { data, error } = await signInWithEmail(email.trim(), password);

    if (error || !data?.user) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      Alert.alert('Authentication Failed', error?.message || 'Invalid credentials. Please verify with studio administration.');
      setLoading(false);
      return;
    }

    const profile = await getProfile(data.user.id);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    navigation.replace('Schedule', {
      photographerId: profile?.id || data.user.id,
      photographerName: profile?.full_name || data.user.email,
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.base} />

      <LinearGradient
        colors={Gradients.darkStudio}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient gold glow */}
      <LinearGradient
        colors={Gradients.ambientSpot}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={styles.ambientOverlay}
      />

      {/* Top back button */}
      <TouchableOpacity
        onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'))}
        style={styles.backBtn}
        activeOpacity={0.7}
      >
        <ArrowLeft size={20} color={colors.text.primary} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Brand Logo & Editorial Titles */}
        <View style={styles.brand}>
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={Gradients.gold}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradientRing}
            >
              <View style={styles.logoInner}>
                <Aperture size={36} color={colors.gold.light} strokeWidth={1.5} />
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.brandName}>E-KODAK STUDIO</Text>
          <Text style={styles.brandRole}>Photographer & Staff Portal</Text>
        </View>

        {/* Form Container */}
        <GlassCard glow highlight style={styles.card}>
          <Text style={styles.cardTitle}>Staff Sign In</Text>
          <Text style={styles.cardSub}>
            Access assigned daily shoots, clients, and session triggers.
          </Text>

          {/* Email Field */}
          <View style={styles.inputWrapper}>
            <Mail size={16} color={colors.gold.light} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Studio email address"
              placeholderTextColor={colors.neutral[600]}
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
            <Lock size={16} color={colors.gold.light} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={colors.neutral[600]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              {showPass ? (
                <EyeOff size={16} color={colors.neutral[400]} />
              ) : (
                <Eye size={16} color={colors.neutral[400]} />
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
        </GlassCard>

        <Text style={styles.footerNote}>
          Authorized access only. Contact studio management for credentials.
        </Text>

        <TouchableOpacity
          onPress={() => {
            navigation.navigate('Main');
          }}
          style={styles.switchHubBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.switchHubText}>← Return to Studio Client Hub</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },
  ambientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
    opacity: 0.8,
  },

  backBtn: {
    position: 'absolute',
    top: 52,
    left: Spacing[5],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
  },

  brand: {
    alignItems: 'center',
    marginBottom: Spacing[8],
  },
  logoWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginBottom: Spacing[3],
    ...Shadow.gold,
  },
  logoGradientRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 73,
    height: 73,
    borderRadius: 36.5,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size['2xl'],
    color: colors.text.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  brandRole: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.xs,
    color: colors.gold.light,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Form Card
  card: {
    width: '100%',
    padding: Spacing[6],
    gap: Spacing[4],
  },
  cardTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    color: colors.text.primary,
  },
  cardSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
    lineHeight: 18,
    marginTop: -Spacing[2],
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.input,
    borderWidth: 1,
    borderColor: colors.gold.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    height: 52,
  },
  inputIcon: {
    marginRight: Spacing[3],
  },
  input: {
    flex: 1,
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    color: colors.text.primary,
  },
  eyeBtn: {
    padding: Spacing[1],
  },

  loginBtn: {
    marginTop: Spacing[2],
  },

  footerNote: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: colors.neutral[600],
    textAlign: 'center',
    marginTop: Spacing[8],
    maxWidth: 260,
    lineHeight: 17,
  },
  switchHubBtn: {
    marginTop: Spacing[4],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
  },
  switchHubText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
    color: colors.gold.light,
  },
});
