/**
 * App.js — E-Kodak Companion App Root
 * Handles:
 * - Splash screen & Google Fonts preload (Playfair Display & Inter)
 * - First-launch tutorial & customer vs photographer role routing
 * - Navigation container with luxury dark-gold theme & 5-tab structure
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import AppNavigator from './src/navigation/AppNavigator';
import TutorialScreen from './src/screens/TutorialScreen';
import { Colors, Typography } from './src/theme';

// Keep splash visible until fonts and storage are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// ── Navigation Theme ──────────────────────────────────────────────────────────

const APP_THEME = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary:      Colors.gold.DEFAULT,
    background:   Colors.bg.base,
    card:         Colors.bg.surface,
    text:         Colors.text.primary,
    border:       Colors.gold.border,
    notification: Colors.gold.DEFAULT,
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
      fontFamily: Typography.fontHeadingSemi,
      fontWeight: '600',
    },
    heavy: {
      fontFamily: Typography.fontHeading,
      fontWeight: '700',
    },
  },
};

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [appReady, setAppReady]         = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Main');

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      try {
        const hasSeenTutorial = await AsyncStorage.getItem('ekodak:tutorial_done');
        setShowTutorial(!hasSeenTutorial);
      } catch {
        setShowTutorial(false);
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  const isReady = (fontsLoaded || fontError) && appReady;

  const onLayoutRootView = useCallback(async () => {
    if (isReady) {
      try {
        await SplashScreen.hideAsync();
      } catch {}
    }
  }, [isReady]);

  if (!isReady) return null;

  if (showTutorial) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg.base} />
        <TutorialScreen
          onComplete={async (role) => {
            await AsyncStorage.setItem('ekodak:tutorial_done', '1');
            if (role === 'photographer') {
              setInitialRoute('PhotographerLogin');
            } else {
              setInitialRoute('Main');
            }
            setShowTutorial(false);
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg.base} />
        <NavigationContainer theme={APP_THEME}>
          <AppNavigator initialRouteName={initialRoute} />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
