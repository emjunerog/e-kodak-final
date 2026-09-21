/**
 * App.js — E-Kodak Companion App Root
 * Handles:
 * - Splash screen
 * - First-launch tutorial detection
 * - Navigation container with app theme
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppNavigator from './src/navigation/AppNavigator';
import TutorialScreen from './src/screens/TutorialScreen';
import { Colors } from './src/theme';

// Keep splash visible until we're ready
SplashScreen.preventAutoHideAsync();

// ── Navigation Theme ──────────────────────────────────────────────────────────

const APP_THEME = {
  dark: true,
  colors: {
    primary:      Colors.gold.DEFAULT,
    background:   Colors.bg.base,
    card:         Colors.bg.card,
    text:         Colors.text.primary,
    border:       Colors.gold.border,
    notification: Colors.gold.DEFAULT,
  },
};

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [appReady, setAppReady]               = useState(false);
  const [showTutorial, setShowTutorial]       = useState(false);

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

  const onLayoutRootView = useCallback(async () => {
    if (appReady) await SplashScreen.hideAsync();
  }, [appReady]);

  if (!appReady) return null;

  if (showTutorial) {
    return (
      <SafeAreaProvider>
        <TutorialScreen
          onComplete={async () => {
            await AsyncStorage.setItem('ekodak:tutorial_done', '1');
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
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
