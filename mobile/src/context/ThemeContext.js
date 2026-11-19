/**
 * ThemeContext.js
 * Comprehensive theme management provider supporting:
 *  - "Darkroom Mode" (deep studio noir + gold)
 *  - "Daylight Gallery" (warm alabaster linen + antique gold)
 *  - "Sage Atelier" (botanical slate-sage + crisp porcelain)
 *  - Accessibility High Contrast mode overriding surfaces, typography, dividers & borders
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DarkColors,
  DarkGradients,
  getThemeColors,
  getThemeGradients,
} from '../theme';
import { getAppSettings, saveAppSettings } from '../services/storageService';

const THEME_STORAGE_KEY = '@ekodak:theme_mode';

function applyHighContrastColors(base, isDark, isSage) {
  if (isDark) {
    return {
      ...base,
      bg: {
        ...base.bg,
        base: '#030406',
        surface: '#0A0D13',
        card: '#0D1119',
        cardElevated: '#151B27',
        elevated: '#151B27',
        input: '#080B10',
        glass: 'rgba(10, 13, 20, 0.94)',
      },
      gold: {
        ...base.gold,
        DEFAULT: '#FFD66E',
        light: '#FFF1BD',
        dark: '#E5B442',
        muted: '#F3D27D',
        border: 'rgba(255, 214, 110, 0.56)',
        borderLight: 'rgba(255, 214, 110, 0.92)',
        bg: 'rgba(255, 214, 110, 0.22)',
      },
      surface: {
        ...base.surface,
        chip: 'rgba(255, 255, 255, 0.14)',
        chipHi: 'rgba(255, 255, 255, 0.22)',
        hairline: 'rgba(255, 255, 255, 0.34)',
        divider: 'rgba(255, 255, 255, 0.26)',
      },
      text: {
        ...base.text,
        primary: '#FFFFFF',
        secondary: '#EAF0FA',
        muted: '#C2CDE0',
        gold: '#FFE8A3',
        goldDark: '#FFD66E',
      },
    };
  }

  if (isSage) {
    return {
      ...base,
      bg: {
        ...base.bg,
        base: '#E7EDE2',
        surface: '#FFFFFF',
        card: '#FFFFFF',
        cardElevated: '#F4F8F0',
        elevated: '#F4F8F0',
        input: '#FFFFFF',
        glass: 'rgba(255, 255, 255, 0.96)',
      },
      gold: {
        ...base.gold,
        DEFAULT: '#314624',
        light: '#456034',
        dark: '#1C2914',
        muted: '#3D542E',
        border: 'rgba(30, 46, 22, 0.42)',
        borderLight: 'rgba(49, 70, 36, 0.90)',
        bg: 'rgba(49, 70, 36, 0.16)',
      },
      surface: {
        ...base.surface,
        chip: 'rgba(20, 32, 16, 0.10)',
        chipHi: 'rgba(20, 32, 16, 0.16)',
        hairline: 'rgba(20, 32, 16, 0.32)',
        divider: 'rgba(20, 32, 16, 0.22)',
      },
      text: {
        ...base.text,
        primary: '#080D06',
        secondary: '#1D2919',
        muted: '#33422E',
        gold: '#26391B',
        goldDark: '#1C2914',
      },
    };
  }

  return {
    ...base,
    bg: {
      ...base.bg,
      base: '#E3E9F2',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      cardElevated: '#F2F5FA',
      elevated: '#F2F5FA',
      input: '#FFFFFF',
      glass: 'rgba(255, 255, 255, 0.96)',
    },
    gold: {
      ...base.gold,
      DEFAULT: '#8C5E08',
      light: '#A87312',
      dark: '#573903',
      muted: '#7B530A',
      border: 'rgba(20, 24, 32, 0.36)',
      borderLight: 'rgba(140, 94, 8, 0.90)',
      bg: 'rgba(140, 94, 8, 0.16)',
    },
    surface: {
      ...base.surface,
      chip: 'rgba(15, 23, 42, 0.09)',
      chipHi: 'rgba(15, 23, 42, 0.15)',
      hairline: 'rgba(15, 23, 42, 0.30)',
      divider: 'rgba(15, 23, 42, 0.22)',
    },
    text: {
      ...base.text,
      primary: '#090B10',
      secondary: '#1C222D',
      muted: '#3A4352',
      gold: '#6B4806',
      goldDark: '#573903',
    },
  };
}

function applyHighContrastGradients(base, isDark, isSage) {
  if (isDark) {
    return {
      ...base,
      card: ['#141923', '#0A0D14'],
      header: ['rgba(18, 22, 32, 0.98)', 'rgba(10, 13, 20, 0.98)'],
      darkStudio: ['#0B0E14', '#05070B', '#030406'],
      glassCard: ['rgba(16, 20, 30, 0.97)', 'rgba(8, 11, 18, 0.98)'],
    };
  }
  if (isSage) {
    return {
      ...base,
      card: ['#FFFFFF', '#EFF5EA'],
      header: ['rgba(255, 255, 255, 0.99)', 'rgba(239, 245, 234, 0.98)'],
      darkStudio: ['#F5F9F1', '#EBF2E5', '#E3EBDC'],
      glassCard: ['rgba(255, 255, 255, 0.98)', 'rgba(241, 247, 236, 0.98)'],
    };
  }
  return {
    ...base,
    card: ['#FFFFFF', '#EEF3FA'],
    header: ['rgba(255, 255, 255, 0.99)', 'rgba(238, 243, 250, 0.98)'],
    darkStudio: ['#FFFFFF', '#EDF2F9', '#E2E9F4'],
    glassCard: ['rgba(255, 255, 255, 0.98)', 'rgba(240, 245, 252, 0.98)'],
  };
}

const ThemeContext = createContext({
  isDark: true,
  isSage: false,
  themeMode: 'dark',
  highContrast: false,
  fontScale: 1,
  toggleTheme: () => {},
  setThemeMode: () => {},
  setHighContrast: () => {},
  setFontScale: () => {},
  colors: DarkColors,
  gradients: DarkGradients,
});

function clampFontScale(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return 1;
  return Math.min(1.28, Math.max(0.78, Math.round(num * 100) / 100));
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState('light');
  const [highContrast, setHighContrastState] = useState(false);
  const [fontScale, setFontScaleState] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const [stored, appSettings] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          getAppSettings(),
        ]);
        if (stored === 'light' || stored === 'dark' || stored === 'sage') {
          setThemeModeState(stored);
        }
        if (typeof appSettings?.highContrast === 'boolean') {
          setHighContrastState(appSettings.highContrast);
        }
        if (typeof appSettings?.fontScale === 'number') {
          setFontScaleState(clampFontScale(appSettings.fontScale));
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e);
      }
    })();
  }, []);

  const setThemeMode = useCallback(async (mode) => {
    const nextMode =
      mode === 'dark' ? 'dark' : mode === 'sage' ? 'sage' : 'light';
    setThemeModeState(nextMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch (e) {
      console.warn('Failed to persist theme preference', e);
    }
  }, []);

  const setHighContrast = useCallback(async (enabled) => {
    const nextVal = Boolean(enabled);
    setHighContrastState(nextVal);
    try {
      const current = await getAppSettings();
      await saveAppSettings({ ...current, highContrast: nextVal });
    } catch (e) {
      console.warn('Failed to persist high contrast preference', e);
    }
  }, []);

  const setFontScale = useCallback(async (nextScale) => {
    const clamped = clampFontScale(nextScale);
    setFontScaleState(clamped);
    try {
      const current = await getAppSettings();
      await saveAppSettings({ ...current, fontScale: clamped });
    } catch (e) {
      console.warn('Failed to persist font scale preference', e);
    }
  }, []);

  const isDark = themeMode === 'dark';
  const isSage = themeMode === 'sage';

  const toggleTheme = useCallback(() => {
    const next = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
  }, [themeMode, setThemeMode]);

  const colors = useMemo(() => {
    const base = getThemeColors(themeMode);
    return highContrast ? applyHighContrastColors(base, isDark, isSage) : base;
  }, [themeMode, highContrast, isDark, isSage]);

  const gradients = useMemo(() => {
    const base = getThemeGradients(themeMode);
    return highContrast ? applyHighContrastGradients(base, isDark, isSage) : base;
  }, [themeMode, highContrast, isDark, isSage]);

  const value = useMemo(
    () => ({
      isDark,
      isSage,
      themeMode,
      highContrast,
      fontScale,
      toggleTheme,
      setThemeMode,
      setHighContrast,
      setFontScale,
      colors,
      gradients,
    }),
    [isDark, isSage, themeMode, highContrast, fontScale, toggleTheme, setThemeMode, setHighContrast, setFontScale, colors, gradients],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      isDark: true,
      isSage: false,
      themeMode: 'dark',
      highContrast: false,
      fontScale: 1,
      toggleTheme: () => {},
      setThemeMode: () => {},
      setHighContrast: () => {},
      setFontScale: () => {},
      colors: DarkColors,
      gradients: DarkGradients,
    };
  }
  return ctx;
}
