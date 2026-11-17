/**
 * App.js — E-Kodak Companion App Root
 * Handles:
 * - Splash screen & Google Fonts preload (Playfair Display & Inter)
 * - First-launch tutorial & customer vs photographer role routing
 * - Navigation container with luxury dark-gold theme & 5-tab structure
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, BackHandler, StatusBar, View } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  GoogleSans_400Regular,
  GoogleSans_500Medium,
  GoogleSans_600SemiBold,
  GoogleSans_700Bold,
  GoogleSans_400Regular_Italic,
} from '@expo-google-fonts/google-sans';

import AppNavigator from './src/navigation/AppNavigator';
import TutorialScreen from './src/screens/TutorialScreen';
import AnimatedSplashOverlay from './src/components/AnimatedSplashOverlay';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { DialogProvider } from './src/context/DialogContext';
import { TourProvider, useTour } from './src/context/TourContext';
import TourSpotlightOverlay from './src/components/TourSpotlightOverlay';
import { verifyPhotographerSession } from './src/services/bookingService';
import { setUserRole, getSavedBookings } from './src/services/storageService';
import { Typography } from './src/theme';

const navigationRef = createNavigationContainerRef();

// Keep splash visible until fonts and storage are ready
SplashScreen.preventAutoHideAsync().catch(() => { });

function AppContent({
  showTutorial,
  setShowTutorial,
  tutorialInitialSlide,
  initialRoute,
  setInitialRoute,
}) {
  const { isDark, colors } = useTheme();
  const tour = useTour();
  const [splashMode, setSplashMode] = useState('enter');
  const [splashKey, setSplashKey] = useState(0);
  const appStateRef = useRef(AppState.currentState);
  const wentBackgroundAtRef = useRef(0);
  const isExitingRef = useRef(false);

  // Play enter splash animation whenever returning into the app from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background') {
        wentBackgroundAtRef.current = Date.now();
        return;
      }

      if (
        prevState === 'background' &&
        nextState === 'active' &&
        !isExitingRef.current &&
        Date.now() - wentBackgroundAtRef.current >= 900
      ) {
        setSplashMode('enter');
        setSplashKey((k) => k + 1);
      }
    });

    return () => subscription.remove();
  }, []);

  // Play exit splash animation when Android hardware Back closes the root app
  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isExitingRef.current) {
        return true;
      }
      if (showTutorial) {
        isExitingRef.current = true;
        setSplashMode('exit');
        setSplashKey((k) => k + 1);
        return true;
      }
      if (!navigationRef.isReady() || navigationRef.canGoBack()) {
        return false;
      }

      const rootState = navigationRef.getRootState();
      const activeMain = rootState?.routes?.[rootState.index];
      const activeTabIndex = activeMain?.state?.index ?? 0;

      // Let Tab.Navigator return non-Home tabs back to Home first
      if ((activeMain?.name === 'Main' || activeMain?.name === 'PhotographerMain') && activeTabIndex > 0) {
        return false;
      }

      isExitingRef.current = true;
      setSplashMode('exit');
      setSplashKey((k) => k + 1);
      return true;
    });

    return () => backSub.remove();
  }, [showTutorial]);

  const handleSplashComplete = useCallback(() => {
    if (splashMode === 'exit') {
      BackHandler.exitApp();
      setTimeout(() => {
        isExitingRef.current = false;
        setSplashMode(null);
      }, 250);
      return;
    }
    setSplashMode(null);
  }, [splashMode]);

  const appNavTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.gold.DEFAULT,
      background: colors.bg.base,
      card: colors.bg.surface,
      text: colors.text.primary,
      border: colors.gold.border,
      notification: colors.gold.DEFAULT,
    },
    fonts: {
      regular: {
        fontFamily: Typography.fontBody,
        fontWeight: '400',
      },
      medium: {
        fontFamily: Typography.fontBodyMedium,
        fontWeight: '500',
      },
      bold: {
        fontFamily: Typography.fontBodyBold,
        fontWeight: '700',
      },
      heavy: {
        fontFamily: Typography.fontHeading,
        fontWeight: '700',
      },
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg.base}
      />
      {showTutorial ? (
        <TutorialScreen
          initialSlide={tutorialInitialSlide}
          onComplete={async (role = 'customer', extra = {}) => {
            if (role === 'photographer') {
              await setUserRole('photographer');
              await AsyncStorage.setItem('ekodak:tutorial_done', '1');
              setInitialRoute('PhotographerMain');
            } else {
              await setUserRole('customer');
              await AsyncStorage.setItem('ekodak:tutorial_done', '1');
              setInitialRoute('Main');
            }
            setShowTutorial(false);
            if (extra?.startInteractiveTour && tour?.startTour) {
              setTimeout(() => {
                tour.startTour(role === 'photographer' ? 'photographer' : 'customer');
              }, 320);
            }
          }}
        />
      ) : (
        <>
          <NavigationContainer ref={navigationRef} theme={appNavTheme}>
            <AppNavigator initialRouteName={initialRoute} />
          </NavigationContainer>
          <TourSpotlightOverlay />
        </>
      )}
      {splashMode && (
        <AnimatedSplashOverlay
          key={`${splashMode}-${splashKey}`}
          mode={splashMode}
          isDark={isDark}
          onComplete={handleSplashComplete}
        />
      )}
    </View>
  );
}

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialInitialSlide, setTutorialInitialSlide] = useState(0);
  const [initialRoute, setInitialRoute] = useState('Main');

  const [fontsLoaded, fontError] = useFonts({
    GoogleSans_400Regular,
    GoogleSans_500Medium,
    GoogleSans_600SemiBold,
    GoogleSans_700Bold,
    GoogleSans_400Regular_Italic,
  });

  useEffect(() => {
    async function prepare() {
      try {
        const [storedRole, tutorialDone, savedBookings] = await Promise.all([
          AsyncStorage.getItem('ekodak:user_role'),
          AsyncStorage.getItem('ekodak:tutorial_done'),
          getSavedBookings(),
        ]);

        const seenTour = tutorialDone === '1';

        if (storedRole === 'photographer') {
          const authCheck = await verifyPhotographerSession();
          if (authCheck.authorized) {
            setInitialRoute('PhotographerMain');
            setShowTutorial(false);
          } else {
            await setUserRole('customer');
            if (seenTour && Array.isArray(savedBookings) && savedBookings.length > 0) {
              setInitialRoute('Main');
              setShowTutorial(false);
            } else {
              setTutorialInitialSlide(seenTour ? 1 : 0);
              setShowTutorial(true);
            }
          }
        } else if (seenTour && Array.isArray(savedBookings) && savedBookings.length > 0) {
          setInitialRoute('Main');
          setShowTutorial(false);
        } else {
          // QR code scan is required in splash/tutorial before entering Home for both roles
          setTutorialInitialSlide(seenTour ? 1 : 0);
          setShowTutorial(true);
        }
      } catch {
        setTutorialInitialSlide(0);
        setShowTutorial(true);
        setInitialRoute('Main');
      } finally {
        setAppReady(true);
      }
    }
    prepare();

    // Safety fallback: Never allow splash screen to hang indefinitely
    const fallbackTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => { });
    }, 2000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  const isReady = (fontsLoaded || fontError) && appReady;

  // Immediately hide splash screen once ready
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <DialogProvider>
            <TourProvider>
              <AppContent
                showTutorial={showTutorial}
                setShowTutorial={setShowTutorial}
                tutorialInitialSlide={tutorialInitialSlide}
                initialRoute={initialRoute}
                setInitialRoute={setInitialRoute}
              />
            </TourProvider>
          </DialogProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
