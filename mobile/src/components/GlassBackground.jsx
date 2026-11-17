import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

/**
 * GlassBackground
 * Renders a lush, frosted gradient backdrop with smooth radial color blooms
 * (feathered smoothly to 0 opacity with no sharp circular outlines) and a
 * gentle translucent frost glaze so theme colors stay vivid and blurred.
 */
const GlassBackground = ({ children, variant }) => {
  const { isDark, isSage, colors } = useTheme();
  const mode = variant || (isDark ? 'dark' : isSage ? 'sage' : 'light');
  const isDarkMode = mode === 'dark';
  const isSageMode = mode === 'sage';

  const baseBg = isDarkMode
    ? colors.bg.base
    : isSageMode
      ? '#EDF2E7'
      : '#EDEFF6';

  const gradientColors = isDarkMode
    ? ['#12101A', '#131926', '#11141E', '#0B0D13']
    : isSageMode
      ? ['#F6F8F2', '#E5EDE0', '#EEF3E9', '#DDE7D5']
      : ['#F9F2E6', '#EBF1F9', '#F3F5FA', '#E2EAF6'];

  // Rich theme-tinted ambient glows feathered softly to 0 at edges
  const warmGlow = isDarkMode
    ? '#D9B46C'
    : isSageMode
      ? '#B4C8A2'
      : '#E6C27D';
  const coolGlow = isDarkMode
    ? '#6B8FC2'
    : isSageMode
      ? '#95AC84'
      : '#A4BDDD';
  const secondaryGlow = isDarkMode
    ? '#7A5B8E'
    : isSageMode
      ? '#CBD9BF'
      : '#EBD3AB';

  const glowOpacityMain = isDarkMode ? 0.22 : isSageMode ? 0.50 : 0.48;
  const glowOpacityCool = isDarkMode ? 0.20 : isSageMode ? 0.46 : 0.48;
  const glowOpacityWarm = isDarkMode ? 0.16 : isSageMode ? 0.42 : 0.44;

  return (
    <View
      pointerEvents={children ? 'box-none' : 'none'}
      style={[styles.wrapper, { backgroundColor: baseBg }]}
    >
      <View
        pointerEvents="none"
        style={[styles.container, { backgroundColor: baseBg }]}
      >
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.36, 0.72, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Feathered gaussian ambient gradient blooms — rich color, zero circle outlines */}
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <RadialGradient id="ekBgTopRight" cx="84%" cy="10%" rx="62%" ry="46%">
              <Stop offset="0%" stopColor={coolGlow} stopOpacity={glowOpacityCool} />
              <Stop offset="45%" stopColor={coolGlow} stopOpacity={glowOpacityCool * 0.48} />
              <Stop offset="80%" stopColor={coolGlow} stopOpacity={glowOpacityCool * 0.12} />
              <Stop offset="100%" stopColor={coolGlow} stopOpacity={0} />
            </RadialGradient>

            <RadialGradient id="ekBgMidLeft" cx="10%" cy="40%" rx="60%" ry="44%">
              <Stop offset="0%" stopColor={warmGlow} stopOpacity={glowOpacityMain} />
              <Stop offset="45%" stopColor={warmGlow} stopOpacity={glowOpacityMain * 0.48} />
              <Stop offset="82%" stopColor={warmGlow} stopOpacity={glowOpacityMain * 0.12} />
              <Stop offset="100%" stopColor={warmGlow} stopOpacity={0} />
            </RadialGradient>

            <RadialGradient id="ekBgLowRight" cx="88%" cy="76%" rx="62%" ry="46%">
              <Stop offset="0%" stopColor={coolGlow} stopOpacity={glowOpacityCool} />
              <Stop offset="48%" stopColor={coolGlow} stopOpacity={glowOpacityCool * 0.46} />
              <Stop offset="84%" stopColor={coolGlow} stopOpacity={glowOpacityCool * 0.10} />
              <Stop offset="100%" stopColor={coolGlow} stopOpacity={0} />
            </RadialGradient>

            <RadialGradient id="ekBgLowLeft" cx="16%" cy="94%" rx="58%" ry="40%">
              <Stop offset="0%" stopColor={secondaryGlow} stopOpacity={glowOpacityWarm} />
              <Stop offset="50%" stopColor={secondaryGlow} stopOpacity={glowOpacityWarm * 0.40} />
              <Stop offset="100%" stopColor={secondaryGlow} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          <Rect x="0" y="0" width="100" height="100" fill="url(#ekBgTopRight)" />
          <Rect x="0" y="0" width="100" height="100" fill="url(#ekBgMidLeft)" />
          <Rect x="0" y="0" width="100" height="100" fill="url(#ekBgLowRight)" />
          <Rect x="0" y="0" width="100" height="100" fill="url(#ekBgLowLeft)" />
        </Svg>

        {/* Subtle frosted mist glaze — preserves rich gradient colors beneath */}
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={isDarkMode ? 32 : 34}
            tint={isDarkMode ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={
            isDarkMode
              ? ['rgba(22, 20, 32, 0.14)', 'rgba(12, 14, 22, 0.06)', 'rgba(20, 24, 36, 0.16)']
              : isSageMode
                ? ['rgba(255, 255, 253, 0.14)', 'rgba(228, 238, 220, 0.08)', 'rgba(218, 231, 208, 0.16)']
                : ['rgba(255, 252, 245, 0.14)', 'rgba(235, 242, 252, 0.08)', 'rgba(226, 236, 249, 0.16)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {children ? (
        <View style={styles.foreground} collapsable={false}>
          {children}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFill,
  },
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  foreground: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
});

export default GlassBackground;
