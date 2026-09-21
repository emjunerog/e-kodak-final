/**
 * PhotographerLoginScreen.jsx
 * Supabase Auth login for photographers/studio staff.
 * Uses email + password. On success routes to Schedule.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  StatusBar, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Aperture, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { signInWithEmail, getProfile } from '../services/bookingService';
import GoldButton from '../components/GoldButton';
import { Colors, Typography, Spacing, Radius } from '../theme';

export default function PhotographerLoginScreen({ navigation }) {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { data, error } = await signInWithEmail(email.trim(), password);

    if (error || !data?.user) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Login Failed', error?.message || 'Invalid credentials. Please try again.');
      setLoading(false);
      return;
    }

    // Fetch profile to get photographer id and name
    const profile = await getProfile(data.user.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    navigation.replace('Schedule', {
      photographerId: profile?.id || data.user.id,
      photographerName: profile?.full_name || data.user.email,
    });
  };

  return (
    <LinearGradient colors={['#0B0B0E', '#10100A']} style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Logo / Brand */}
        <View style={styles.brand}>
          <View style={styles.logoRing}>
            <Aperture size={40} color={Colors.gold.DEFAULT} strokeWidth={1.5} />
          </View>
          <Text style={styles.brandName}>E-Kodak Studio</Text>
          <Text style={styles.brandRole}>Photographer Portal</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSub}>Access your shoot schedule and session details.</Text>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Mail size={16} color={Colors.gold.dim} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Studio email address"
              placeholderTextColor={Colors.neutral[600]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Lock size={16} color={Colors.gold.dim} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={Colors.neutral[600]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              {showPass
                ? <EyeOff size={16} color={Colors.neutral[500]} />
                : <Eye size={16} color={Colors.neutral[500]} />
              }
            </TouchableOpacity>
          </View>

          <GoldButton onPress={handleLogin} loading={loading} style={styles.loginBtn}>
            Sign In to Schedule
          </GoldButton>
        </View>

        <Text style={styles.footer}>
          This portal is for E-Kodak photographers and studio staff only.
        </Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing[6] },

  brand: { alignItems: 'center', marginBottom: Spacing[10] },
  logoRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 1.5, borderColor: Colors.gold.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.gold.bg,
    marginBottom: Spacing[4],
    shadowColor: Colors.gold.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 20,
    elevation: 12,
  },
  brandName: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.gold.DEFAULT,
    letterSpacing: 1,
    marginBottom: 4,
  },
  brandRole: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  card: {
    width: '100%',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    padding: Spacing[6],
    gap: Spacing[4],
  },
  cardTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  cardSub: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginTop: -Spacing[2] },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.input,
    borderWidth: 1.5,
    borderColor: Colors.gold.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    height: 52,
  },
  inputIcon: { marginRight: Spacing[3] },
  input: {
    flex: 1,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
  },
  eyeBtn: { padding: Spacing[1] },

  loginBtn: { marginTop: Spacing[2] },

  footer: {
    fontSize: Typography.size.xs,
    color: Colors.neutral[600],
    textAlign: 'center',
    marginTop: Spacing[8],
    lineHeight: 18,
    maxWidth: 260,
  },
});
