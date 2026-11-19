import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  ScanQrCode, CreditCard, Home, User, Settings, CalendarDays, ClipboardList,
} from 'lucide-react-native';

import { useTheme } from '../context/ThemeContext';
import { useTour, useRegisterTourTarget } from '../context/TourContext';
import { Typography } from '../theme';

// ── Screens ──────────────────────────────────────────────────────────────────
import HomeScreen                 from '../screens/HomeScreen';
import QRScannerScreen            from '../screens/QRScannerScreen';
import SavedBookingsScreen        from '../screens/SavedBookingsScreen';
import ProfileScreen              from '../screens/ProfileScreen';
import SettingsScreen             from '../screens/SettingsScreen';
import BookingTrackerScreen       from '../screens/BookingTrackerScreen';
import PhotographerHomeScreen     from '../screens/PhotographerHomeScreen';
import PhotographerScheduleScreen from '../screens/PhotographerScheduleScreen';
import PhotographerShootsScreen   from '../screens/PhotographerShootsScreen';
import PhotographerProfileScreen  from '../screens/PhotographerProfileScreen';
import PhotographerSettingsScreen from '../screens/PhotographerSettingsScreen';
import TutorialScreen             from '../screens/TutorialScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function WelcomeTourRoute({ navigation, route }) {
  const tour = useTour();
  const initialSlide = route?.params?.initialSlide ?? 0;
  return (
    <TutorialScreen
      initialSlide={initialSlide}
      onComplete={(role = 'customer', extra = {}) => {
        if (role === 'photographer') {
          navigation.reset({
            index: 0,
            routes: [{ name: 'PhotographerMain' }],
          });
          if (extra?.startInteractiveTour && tour?.startTour) {
            setTimeout(() => tour.startTour('photographer'), 320);
          }
          return;
        }
        if (extra?.booking) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
          if (extra?.startInteractiveTour && tour?.startTour) {
            setTimeout(() => tour.startTour('customer'), 320);
          }
          return;
        }
        navigation.goBack();
      }}
    />
  );
}

// ── Dark Dock Gradient Backdrop ──────────────────────────────────────────────

function LiquidGlassTabBarBackground({ isDark }) {
  if (!isDark) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tabBarBgWrapper]}>
      <LinearGradient
        colors={['#1E222E', '#11141D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ── Fixed Bottom Dock (custom tab bar) ───────────────────────────────────────
// Clean curved bottom tray with labeled side tabs, a centered primary Scan QR
// circle button, and a fluid gliding top indicator pill.

const INDICATOR_WIDTH = 28;

const TAB_META = {
  Home:                 { label: 'Home',     Icon: Home },
  Bookings:             { label: 'Bookings', Icon: CreditCard,   tourId: 'customer_tab_bookings' },
  Scanner:              { label: 'Scan QR',  Icon: ScanQrCode,   isCenterAction: true, tourId: 'customer_tab_scanner' },
  Profile:              { label: 'Profile',  Icon: User,         tourId: 'customer_tab_profile' },
  Settings:             { label: 'Settings', Icon: Settings },
  PhotographerHome:     { label: 'Home',     Icon: Home },
  PhotographerSchedule: { label: 'Schedule', Icon: CalendarDays, tourId: 'ph_tab_schedule' },
  PhotographerShoots:   { label: 'Shoots',   Icon: ClipboardList, isCenterAction: true, tourId: 'ph_tab_shoots' },
  PhotographerProfile:  { label: 'Profile',  Icon: User,         tourId: 'ph_tab_profile' },
  PhotographerSettings: { label: 'Settings', Icon: Settings },
};

function DockTab({
  routeName,
  focused,
  onPress,
  onLongPress,
  isDark,
  isSage,
  pillColors,
}) {
  const meta = TAB_META[routeName] || { label: routeName, Icon: Home };
  const tourRef = useRegisterTourTarget(meta.tourId);
  const { Icon, isCenterAction } = meta;
  const inactiveColor = isDark ? '#8E95A5' : isSage ? '#7A8474' : '#787E8A';
  const activeSideColor = isDark ? '#F7F5F2' : isSage ? '#2E3A26' : '#181410';
  const centerIconColor = isSage ? '#FFFFFF' : '#181410';
  const centerSolidBg = isSage ? '#5E6E51' : '#C7962D';
  const centerActiveRing = isDark
    ? 'rgba(255, 241, 214, 0.55)'
    : isSage
      ? 'rgba(116, 134, 101, 0.45)'
      : 'rgba(199, 150, 45, 0.55)';

  const [focusAnim] = useState(() => new Animated.Value(focused ? 1 : 0));
  const [pressAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: focused ? 1 : 0,
      stiffness: 320,
      damping: 26,
      mass: 0.75,
      useNativeDriver: true,
    }).start();
  }, [focused, focusAnim]);

  const iconScale = Animated.multiply(
    focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, isCenterAction ? 1.07 : 1.08],
    }),
    pressAnim
  );
  const iconLift = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1.5],
  });

  const handlePressIn = () => {
    pressAnim.stopAnimation();
    Animated.timing(pressAnim, {
      toValue: 0.9,
      duration: 60,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    pressAnim.stopAnimation();
    Animated.spring(pressAnim, {
      toValue: 1,
      stiffness: 420,
      damping: 26,
      mass: 0.65,
      useNativeDriver: true,
    }).start();
  };

  if (isCenterAction) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={meta.label}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        pressRetentionOffset={8}
        style={styles.centerTabSlot}
      >
        <View
          ref={tourRef}
          collapsable={false}
          style={styles.centerScanButtonWrap}
        >
          <Animated.View
            style={[
              styles.centerScanButton,
              {
                backgroundColor: centerSolidBg,
                borderWidth: focused ? 2 : 0,
                borderColor: centerActiveRing,
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <LinearGradient
              colors={pillColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.centerGradientFill}
            >
              <Icon
                size={focused ? 27 : 25}
                color={centerIconColor}
                strokeWidth={focused ? 2.25 : 2.05}
              />
            </LinearGradient>
          </Animated.View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      ref={tourRef}
      collapsable={false}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={meta.label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      pressRetentionOffset={8}
      style={styles.tabItem}
    >
      <Animated.View
        style={[
          styles.tabIconWrap,
          {
            transform: [{ scale: iconScale }, { translateY: iconLift }],
          },
        ]}
      >
        <Icon
          size={22}
          color={focused ? activeSideColor : inactiveColor}
          strokeWidth={focused ? 2.2 : 1.85}
        />
      </Animated.View>
      <Text
        numberOfLines={1}
        style={[
          styles.tabLabel,
          {
            color: focused ? activeSideColor : inactiveColor,
            fontFamily: focused ? Typography.fontBodySemi : Typography.fontBodyMedium,
          },
        ]}
      >
        {meta.label}
      </Text>
    </Pressable>
  );
}

function FloatingDock({ state, navigation }) {
  const { isDark, isSage, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState(0);
  const [pillX] = useState(() => new Animated.Value(0));
  const [pillStretch] = useState(() => new Animated.Value(1));
  const activeRoute = state.routes[state.index];
  const visibleRoutes = useMemo(
    () => state.routes.filter((r) => Boolean(TAB_META[r.name])),
    [state.routes]
  );
  const activeTabIndex = useMemo(() => {
    if (activeRoute?.name === 'BookingTracker') {
      const bookingsIdx = visibleRoutes.findIndex((r) => r.name === 'Bookings');
      return bookingsIdx >= 0 ? bookingsIdx : 0;
    }
    const idx = visibleRoutes.findIndex((r) => r.key === activeRoute?.key);
    return idx >= 0 ? idx : 0;
  }, [activeRoute?.key, activeRoute?.name, visibleRoutes]);

  const isCenterActive = Boolean(TAB_META[activeRoute?.name]?.isCenterAction);
  const [pillOpacity] = useState(() => new Animated.Value(isCenterActive ? 0 : 1));
  const [pillScale] = useState(() => new Animated.Value(isCenterActive ? 0.8 : 1));
  const [pillScaleX] = useState(() => Animated.multiply(pillStretch, pillScale));
  const hasMeasuredRef = useRef(false);

  const hideDock = Boolean(activeRoute?.params?.fullScanner);

  const tabCount = visibleRoutes.length || 5;
  const slotWidth = rowWidth > 0 ? rowWidth / tabCount : 0;
  const pillColors = gradients?.goldPill || ['#EAD082', '#C7962D'];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(pillOpacity, {
        toValue: isCenterActive ? 0 : 1,
        duration: isCenterActive ? 140 : 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(pillScale, {
        toValue: isCenterActive ? 0.7 : 1,
        stiffness: 340,
        damping: 26,
        mass: 0.7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isCenterActive, pillOpacity, pillScale]);

  useEffect(() => {
    if (hideDock || slotWidth <= 0) return;
    const targetX = activeTabIndex * slotWidth + (slotWidth - INDICATOR_WIDTH) / 2;

    if (!hasMeasuredRef.current) {
      pillX.setValue(targetX);
      hasMeasuredRef.current = true;
      return;
    }

    pillX.stopAnimation();
    pillStretch.stopAnimation();
    Animated.parallel([
      Animated.spring(pillX, {
        toValue: targetX,
        stiffness: 320,
        damping: 26,
        mass: 0.75,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(pillStretch, {
          toValue: 1.24,
          duration: 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(pillStretch, {
          toValue: 1,
          stiffness: 340,
          damping: 24,
          mass: 0.7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [hideDock, activeTabIndex, slotWidth, pillX, pillStretch]);

  if (hideDock) {
    return null;
  }

  return (
    <View style={styles.dockWrap}>
      <View
        style={[
          styles.dockOuterTray,
          {
            backgroundColor: isDark ? '#131620' : '#FFFFFF',
            paddingBottom: Math.max(insets.bottom, 10),
            borderTopColor: isDark
              ? 'rgba(242, 221, 176, 0.12)'
              : isSage
                ? '#DDE2D6'
                : '#E5E8F0',
            shadowColor: isDark ? '#000' : '#4E5869',
          },
        ]}
      >
        <LiquidGlassTabBarBackground isDark={isDark} />

        <View
          style={styles.dockRow}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && Math.abs(w - rowWidth) > 0.5) {
              setRowWidth(w);
            }
          }}
        >
          {/* Gliding top accent indicator pill */}
          {slotWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.slidingPillWrap,
                {
                  width: INDICATOR_WIDTH,
                  opacity: pillOpacity,
                  transform: [
                    { translateX: pillX },
                    { scaleX: pillScaleX },
                    { scaleY: pillScale },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={pillColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.slidingPillFill}
              />
            </Animated.View>
          )}

          {visibleRoutes.map((route, index) => {
            const focused = activeTabIndex === index;
            const isExactRouteFocused = activeRoute?.key === route.key;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isExactRouteFocused && !event.defaultPrevented) {
                try { Haptics.selectionAsync().catch(() => {}); } catch {}
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
                isSage={isSage}
                pillColors={pillColors}
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
      backBehavior="history"
      tabBar={(props) => <FloatingDock {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bookings" component={SavedBookingsScreen} />
      <Tab.Screen name="Scanner" component={QRScannerScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="BookingTracker" component={BookingTrackerScreen} />
    </Tab.Navigator>
  );
}

function PhotographerTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingDock {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="PhotographerHome" component={PhotographerHomeScreen} />
      <Tab.Screen name="PhotographerSchedule" component={PhotographerScheduleScreen} />
      <Tab.Screen name="PhotographerShoots" component={PhotographerShootsScreen} />
      <Tab.Screen name="PhotographerProfile" component={PhotographerProfileScreen} />
      <Tab.Screen name="PhotographerSettings" component={PhotographerSettingsScreen} />
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
      {/* 5-Tab Main Hubs */}
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="PhotographerMain"
        component={PhotographerTabs}
        options={{ animation: 'fade' }}
      />

      {/* Push Screens */}
      <Stack.Screen
        name="WelcomeTour"
        component={WelcomeTourRoute}
        options={{ animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'stretch',
    zIndex: 20,
    elevation: 10,
  },
  dockOuterTray: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 10,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 10,
    overflow: 'hidden',
  },
  dockRow: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  tabBarBgWrapper: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  slidingPillWrap: {
    position: 'absolute',
    top: -10,
    left: 0,
    height: 3.5,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    overflow: 'hidden',
    zIndex: 1,
  },
  slidingPillFill: {
    flex: 1,
  },
  tabItem: {
    flex: 1,
    height: 62,
    paddingTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  centerTabSlot: {
    flex: 1,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  centerScanButtonWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  centerScanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  centerGradientFill: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});
