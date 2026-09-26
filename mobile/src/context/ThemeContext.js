/**
 * ThemeContext.js
 * Comprehensive theme management provider supporting both
 * "Darkroom Mode" (signature deep studio noir + gold) and
 * "Daylight Gallery" (warm alabaster linen + antique gold).
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DarkColors, LightColors, DarkGradients, LightGradients,
  getThemeColors, getThemeGradients,
} from '../theme';

const THEME_STORAGE_KEY = '@ekodak:theme_mode';

const ThemeContext = createContext({
  isDark: true,
  themeMode: 'dark',
  toggleTheme: () => {},
  setThemeMode: () => {},
  colors: DarkColors,
  gradients: DarkGradients,
});

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState('dark');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          setThemeModeState(stored);
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e);
      }
    })();
  }, []);

  const setThemeMode = async (mode) => {
    const nextMode = mode === 'light' ? 'light' : 'dark';
    setThemeModeState(nextMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch (e) {
      console.warn('Failed to persist theme preference', e);
    }
  };

  const toggleTheme = () => {
    const next = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
  };

  const isDark = themeMode === 'dark';
  const colors = getThemeColors(isDark);
  const gradients = getThemeGradients(isDark);

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        themeMode,
        toggleTheme,
        setThemeMode,
        colors,
        gradients,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      isDark: true,
      themeMode: 'dark',
      toggleTheme: () => {},
      setThemeMode: () => {},
      colors: DarkColors,
      gradients: DarkGradients,
    };
  }
  return ctx;
}
