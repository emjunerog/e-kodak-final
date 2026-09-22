/**
 * AppNavigator.jsx
 * Luxury Editorial Navigation for E-Kodak Studio Companion App.
 * Stack for all screens + frosted bottom tabs for main hub navigation.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QrCode, BookOpen, Home } from 'lucide-react-native';
import { Colors, Typography } from '../theme';

// ── Screens ──────────────────────────────────────────────────────────────────
import HomeScreen              from '../screens/HomeScreen';
import QRScannerScreen         from '../screens/QRScannerScreen';
import BookingTrackerScreen    from '../screens/BookingTrackerScreen';
import SavedBookingsScreen     from '../screens/SavedBookingsScreen';
import PhotographerLoginScreen from '../screens/PhotographerLoginScreen';
import PhotographerScheduleScreen from '../screens/PhotographerScheduleScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Bottom Tab Navigator ──────────────────────────────────────────────────────

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
          fontSize: 11,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home size={size - 2} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={QRScannerScreen}
        options={{
          tabBarLabel: 'Scan Pass',
          tabBarIcon: ({ color, size }) => (
            <QrCode size={size - 2} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={SavedBookingsScreen}
        options={{
          tabBarLabel: 'Passes',
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size - 2} color={color} strokeWidth={1.75} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Root Stack Navigator ──────────────────────────────────────────────────────

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.bg.base },
      }}
    >
      {/* Main Tab Hub */}
      <Stack.Screen name="Main" component={MainTabs} />

      {/* Full-screen Push Screens */}
      <Stack.Screen
        name="BookingTracker"
        component={BookingTrackerScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="PhotographerLogin" component={PhotographerLoginScreen} />
      <Stack.Screen
        name="Schedule"
        component={PhotographerScheduleScreen}
        options={{ animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}
