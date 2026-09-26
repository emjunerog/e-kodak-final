import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  QrCode, BookOpen, Home, User, Settings,
} from 'lucide-react-native';

import { useTheme } from '../context/ThemeContext';
import { Typography } from '../theme';

// ── Screens ──────────────────────────────────────────────────────────────────
import HomeScreen                 from '../screens/HomeScreen';
import QRScannerScreen            from '../screens/QRScannerScreen';
import SavedBookingsScreen        from '../screens/SavedBookingsScreen';
import ProfileScreen              from '../screens/ProfileScreen';
import SettingsScreen             from '../screens/SettingsScreen';
import BookingTrackerScreen       from '../screens/BookingTrackerScreen';
import PhotographerLoginScreen    from '../screens/PhotographerLoginScreen';
import PhotographerScheduleScreen from '../screens/PhotographerScheduleScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Liquid Gradient Glass Dock Background ────────────────────────────────────

function LiquidGlassTabBarBackground({ isDark }) {
  return (
    <View style={[StyleSheet.absoluteFillObject, styles.tabBarBgWrapper]}>
      {/* Underlying Solid Frosted Base (Guarantees zero bleed-through of underlying photos on both Android & iOS) */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: isDark ? 'rgba(18, 15, 12, 0.94)' : 'rgba(255, 255, 255, 0.94)',
          },
        ]}
      />

      {/* Acrylic Hardware Blur Layer */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 95 : 100}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Luxurious Frosted Studio Tint Gradient */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(26, 22, 18, 0.94)', 'rgba(14, 12, 9, 0.97)']
            : ['rgba(255, 255, 255, 0.94)', 'rgba(248, 246, 240, 0.97)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle Liquid Gold Sheen */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(212, 168, 83, 0.12)', 'transparent', 'rgba(212, 168, 83, 0.08)']
            : ['rgba(184, 134, 11, 0.08)', 'transparent', 'rgba(184, 134, 11, 0.05)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top Specular Liquid Edge Highlight Line */}
      <LinearGradient
        colors={
          isDark
            ? ['transparent', 'rgba(255, 223, 137, 0.65)', 'transparent']
            : ['transparent', 'rgba(184, 134, 11, 0.55)', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.specularEdge}
      />
    </View>
  );
}

// ── 5-Tab Bottom Navigator ───────────────────────────────────────────────────

function MainTabs() {
  const { isDark, colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => <LiquidGlassTabBarBackground isDark={isDark} />,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 14,
          left: 14,
          right: 14,
          height: 68,
          borderRadius: 24,
          borderTopWidth: 0,
          borderWidth: 1.2,
          borderColor: isDark ? 'rgba(212, 168, 83, 0.35)' : 'rgba(184, 134, 11, 0.30)',
          backgroundColor: isDark ? '#14110E' : '#FFFFFF',
          elevation: 12,
          shadowColor: isDark ? '#000000' : '#4A3B22',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.55 : 0.18,
          shadowRadius: 16,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 12 : 8,
          overflow: 'hidden',
        },
        tabBarActiveTintColor: isDark ? colors.gold.light : '#996515',
        tabBarInactiveTintColor: isDark ? '#A39988' : '#3E372D',
        tabBarLabelStyle: {
          fontFamily: Typography.fontBodySemi,
          fontSize: 10,
          letterSpacing: 0.4,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? [styles.activeIconGlow, { backgroundColor: isDark ? 'rgba(212, 168, 83, 0.16)' : 'rgba(184, 134, 11, 0.12)' }] : null}>
              <Home size={size - 3} color={color} strokeWidth={focused ? 2.4 : 1.9} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={QRScannerScreen}
        options={{
          tabBarLabel: 'Scan Pass',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? [styles.activeIconGlow, { backgroundColor: isDark ? 'rgba(212, 168, 83, 0.16)' : 'rgba(184, 134, 11, 0.12)' }] : null}>
              <QrCode size={size - 3} color={color} strokeWidth={focused ? 2.4 : 1.9} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={SavedBookingsScreen}
        options={{
          tabBarLabel: 'Passes',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? [styles.activeIconGlow, { backgroundColor: isDark ? 'rgba(212, 168, 83, 0.16)' : 'rgba(184, 134, 11, 0.12)' }] : null}>
              <BookOpen size={size - 3} color={color} strokeWidth={focused ? 2.4 : 1.9} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? [styles.activeIconGlow, { backgroundColor: isDark ? 'rgba(212, 168, 83, 0.16)' : 'rgba(184, 134, 11, 0.12)' }] : null}>
              <User size={size - 3} color={color} strokeWidth={focused ? 2.4 : 1.9} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? [styles.activeIconGlow, { backgroundColor: isDark ? 'rgba(212, 168, 83, 0.16)' : 'rgba(184, 134, 11, 0.12)' }] : null}>
              <Settings size={size - 3} color={color} strokeWidth={focused ? 2.4 : 1.9} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Root Stack Navigator ──────────────────────────────────────────────────────

export default function AppNavigator({ initialRouteName = 'Main' }) {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg.base },
      }}
    >
      {/* 5-Tab Main Hub */}
      <Stack.Screen name="Main" component={MainTabs} />

      {/* Push Screens */}
      <Stack.Screen
        name="BookingTracker"
        component={BookingTrackerScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="PhotographerLogin"
        component={PhotographerLoginScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Schedule"
        component={PhotographerScheduleScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarBgWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  specularEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  activeIconGlow: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C9A96E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
});
