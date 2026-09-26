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
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { Typography } from './src/theme';

// Keep splash visible until fonts and storage are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent({ showTutorial, setShowTutorial, initialRoute, setInitialRoute }) {
  const { isDark, colors } = useTheme();

  const appNavTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      primary:      colors.gold.DEFAULT,
      background:   colors.bg.base,
      card:         colors.bg.surface,
      text:         colors.text.primary,
      border:       colors.gold.border,
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
        fontFamily: Typography.fontHeadingSemi,
        fontWeight: '600',
      },
      heavy: {
        fontFamily: Typography.fontHeading,
        fontWeight: '700',
      },
    },
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg.base}
      />
      {showTutorial ? (
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
      ) : (
        <NavigationContainer theme={appNavTheme}>
          <AppNavigator initialRouteName={initialRoute} />
        </NavigationContainer>
      )}
    </>
  );
}

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
        const savedRole = await AsyncStorage.getItem('ekodak:user_role');
        
        if (!hasSeenTutorial || !savedRole) {
          setShowTutorial(true);
        } else {
          setShowTutorial(false);
          setInitialRoute(savedRole === 'photographer' ? 'PhotographerLogin' : 'Main');
        }
      } catch {
        setShowTutorial(false);
      } finally {
        setAppReady(true);
      }
    }
    prepare();

    // Safety fallback: Never allow splash screen to hang indefinitely
    const fallbackTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 2000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  const isReady = (fontsLoaded || fontError) && appReady;

  // Immediately hide splash screen once ready
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent
            showTutorial={showTutorial}
            setShowTutorial={setShowTutorial}
            initialRoute={initialRoute}
            setInitialRoute={setInitialRoute}
          />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
