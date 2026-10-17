import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Animated } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
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

// ── Frosted Glass Dock Background ────────────────────────────────────────────

function LiquidGlassTabBarBackground({ isDark }) {
  return (
    <View style={[StyleSheet.absoluteFillObject, styles.tabBarBgWrapper]}>
      {/* Solid frosted base (guarantees no bleed-through on Android) */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: isDark ? 'rgba(18, 16, 20, 0.92)' : 'rgba(255, 255, 255, 0.92)' },
        ]}
      />
      <BlurView
        intensity={Platform.OS === 'ios' ? 90 : 100}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={
          isDark
            ? ['rgba(30, 27, 32, 0.90)', 'rgba(14, 12, 16, 0.96)']
            : ['rgba(255, 255, 255, 0.94)', 'rgba(248, 245, 240, 0.97)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Top specular edge */}
      <LinearGradient
        colors={
          isDark
            ? ['transparent', 'rgba(255, 241, 214, 0.35)', 'transparent']
            : ['transparent', 'rgba(255, 255, 255, 1)', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.specularEdge}
      />
    </View>
  );
}

// ── Floating Dock (custom tab bar) ────────────────────────────────────────────
// Active tab morphs into a champagne-gold pill with its label; inactive
// tabs are icon-only. Each tab owns its own native-driven Animated.Value
// (opacity/scale/translate only), so nothing touches layout props.

const TAB_META = {
  Home:     { label: 'Home',     Icon: Home },
  Scanner:  { label: 'Scan',     Icon: QrCode },
  Bookings: { label: 'Passes',   Icon: BookOpen },
  Profile:  { label: 'Profile',  Icon: User },
  Settings: { label: 'Settings', Icon: Settings },
};

function DockTab({ routeName, focused, onPress, onLongPress, isDark, gradients }) {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [focused, anim]);

  const meta = TAB_META[routeName] || { label: routeName, Icon: Home };
  const { Icon } = meta;
  const inactiveColor = isDark ? '#9C958C' : '#6A6156';
  const activeColor = isDark ? '#17130C' : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={meta.label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.tabItem, focused && styles.tabItemFocused]}
    >
      {/* Gold pill (fades/scales in when focused) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.activePill,
          {
            opacity: anim,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
      >
        <LinearGradient
          colors={gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.tabInner}>
        <Icon size={20} color={focused ? activeColor : inactiveColor} strokeWidth={focused ? 2.4 : 1.9} />
        {focused && (
          <Text numberOfLines={1} style={[styles.tabLabel, { color: activeColor }]}>
            {meta.label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function FloatingDock({ state, navigation }) {
  const { isDark, gradients } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dockWrap, { bottom: Math.max(insets.bottom, 10) + 4 }]}
    >
      <View
        style={[
          styles.dock,
          {
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(30,20,5,0.08)',
            shadowColor: isDark ? '#000' : '#5A4524',
            shadowOpacity: isDark ? 0.5 : 0.16,
          },
        ]}
      >
        <LiquidGlassTabBarBackground isDark={isDark} />
        <View style={styles.dockRow}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                try { Haptics.selectionAsync(); } catch {}
                navigation.navigate(route.name, route.params);
              }
            };
            const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
            return (
              <DockTab
                key={route.key}
                routeName={route.name}
                focused={focused}
                onPress={onPress}
                onLongPress={onLongPress}
                isDark={isDark}
                gradients={gradients}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── 5-Tab Bottom Navigator ───────────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingDock {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Scanner" component={QRScannerScreen} />
      <Tab.Screen name="Bookings" component={SavedBookingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
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
  dockWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'stretch',
  },
  dock: {
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 14,
  },
  dockRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    gap: 4,
  },
  tabBarBgWrapper: {
    borderRadius: 33,
    overflow: 'hidden',
  },
  specularEdge: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
  },
  tabItem: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabItemFocused: {
    flex: 1.9,
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 25,
    overflow: 'hidden',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  tabLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
});
