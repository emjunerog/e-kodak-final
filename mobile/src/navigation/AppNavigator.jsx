/**
 * AppNavigator.jsx
 * Root navigation structure for E-Kodak Companion App.
 * Uses React Navigation: Stack for all screens + Bottom Tabs for the main hub.
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
          backgroundColor: Colors.bg.card,
          borderTopColor: Colors.gold.border,
          borderTopWidth: 1,
          paddingTop: 8,
          height: 64,
          paddingBottom: 10,
        },
        tabBarActiveTintColor:   Colors.gold.DEFAULT,
        tabBarInactiveTintColor: Colors.neutral[600],
        tabBarLabelStyle: {
          fontSize: Typography.size.xs,
          fontWeight: Typography.weight.semibold,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={QRScannerScreen}
        options={{
          tabBarLabel: 'Scan QR',
          tabBarIcon: ({ color, size }) => <QrCode size={size} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={SavedBookingsScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} strokeWidth={1.5} />,
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

      {/* Full-screen push screens */}
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
