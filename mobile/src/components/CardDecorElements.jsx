import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

/**
 * Decorative frosted-glass color gradient glaze rendered inside dashboard cards.
 * Adds subtle theme-colored frosted depth and a soft diagonal sheen without
 * circles, reticles, or dashed shapes that could clash with card text.
 */
export default function CardDecorElements({ variant = 'tool', isDark = false }) {
  const { isSage } = useTheme();

  const colorGlaze = isDark
    ? ['rgba(217, 180, 108, 0.08)', 'rgba(122, 184, 255, 0.04)', 'rgba(15, 20, 30, 0.10)']
    : isSage
      ? ['rgba(255, 255, 255, 0.16)', 'rgba(240, 246, 236, 0.10)', 'rgba(226, 236, 220, 0.14)']
      : ['rgba(255, 251, 242, 0.14)', 'rgba(255, 255, 255, 0.12)', 'rgba(240, 245, 252, 0.14)'];

  const topSpecularColors = isDark
    ? ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.0)']
    : ['rgba(255, 255, 255, 0.65)', 'rgba(255, 255, 255, 0.0)'];

  const sheenColors = isDark
    ? ['rgba(255, 255, 255, 0.0)', 'rgba(255, 244, 220, 0.05)', 'rgba(255, 255, 255, 0.0)']
    : ['rgba(255, 255, 255, 0.0)', 'rgba(255, 255, 255, 0.34)', 'rgba(255, 255, 255, 0.0)'];

  const isHero = variant === 'hero';
  const isAction = variant === 'action-scan' || variant === 'action-bookings';

  return (
    <View pointerEvents="none" style={styles.clipLayer}>
      {/* Theme-tinted frosted gradient glaze */}
      <LinearGradient
        colors={colorGlaze}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft diagonal glass reflection */}
      <LinearGradient
        colors={sheenColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={
          isHero
            ? styles.heroSheenBand
            : isAction
              ? styles.cardSheenBand
              : styles.rowSheenBand
        }
      />

      {/* Crisp top-edge frost highlight */}
      <LinearGradient
        colors={topSpecularColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.topFrostEdge}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clipLayer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  topFrostEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
  },
  heroSheenBand: {
    position: 'absolute',
    top: -40,
    left: 88,
    width: 110,
    height: 290,
    transform: [{ rotate: '22deg' }],
  },
  cardSheenBand: {
    position: 'absolute',
    top: -30,
    left: 44,
    width: 78,
    height: 240,
    transform: [{ rotate: '24deg' }],
  },
  rowSheenBand: {
    position: 'absolute',
    top: -28,
    left: 145,
    width: 76,
    height: 160,
    transform: [{ rotate: '22deg' }],
  },
});
