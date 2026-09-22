/**
 * AppNavigator.jsx
 * Luxury 5-Tab Navigation Structure for E-Kodak Studio Companion.
 * Tabs:
 * 1. Home — Centered brandmark, wide hero cards, 3 studio tools, photo reel
 * 2. Scan Pass — Centered camera viewfinder
 * 3. Studio Passes — Saved session tickets
 * 4. Profile — Customer order dossier auto-loaded from QR
 * 5. Settings — Preferences, cache reset & Photographer portal gateway
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  QrCode, BookOpen, Home, User, Settings,
} from 'lucide-react-native';

import { Colors, Typography } from '../theme';

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

// ── 5-Tab Bottom Navigator ───────────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bg.surface,
          borderTopColor: Colors.gold.border,
          borderTopWidth: 1,
          paddingTop: 8,
          height: 64,
          paddingBottom: 10,
        },
        tabBarActiveTintColor:   Colors.gold.light,
        tabBarInactiveTintColor: Colors.neutral[500],
        tabBarLabelStyle: {
          fontFamily: Typography.fontBodySemi,
          fontSize: 10,
          letterSpacing: 0.4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home size={size - 3} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={QRScannerScreen}
        options={{
          tabBarLabel: 'Scan Pass',
          tabBarIcon: ({ color, size }) => (
            <QrCode size={size - 3} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={SavedBookingsScreen}
        options={{
          tabBarLabel: 'Passes',
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size - 3} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User size={size - 3} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size - 3} color={color} strokeWidth={1.75} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Root Stack Navigator ──────────────────────────────────────────────────────

export default function AppNavigator({ initialRouteName = 'Main' }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.bg.base },
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
        options={{ animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}
