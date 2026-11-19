/**
 * GuideChooserModal.jsx
 * Clean selector dialog triggered by the Header Question Mark (`?`) button on HomeScreen.
 * Lets the user choose between replaying the interactive button-by-button App Tour
 * or opening the "How to Track Session" visual guide.
 */

import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  HelpCircle,
  QrCode,
  Sparkles,
  X,
} from 'lucide-react-native';

import CardDecorElements from './CardDecorElements';
import { useTheme } from '../context/ThemeContext';
import { useResponsiveLayout } from '../utils/responsive';
import { Typography } from '../theme';

export default function GuideChooserModal({
  visible,
  onClose,
  onSelectTour,
  onSelectTrackGuide,
}) {
  const { isDark, isSage, colors, gradients } = useTheme();
  const layout = useResponsiveLayout();
  const styles = useMemo(
    () => getStyles(colors, isDark, isSage, layout),
    [colors, isDark, isSage, layout]
  );

  const cardGradientColors =
    gradients?.glassCard ||
    gradients?.card ||
    (isDark
      ? ['rgba(36, 32, 42, 0.88)', 'rgba(21, 27, 36, 0.92)']
      : ['rgba(255, 255, 255, 0.97)', 'rgba(246, 248, 252, 0.95)']);

  const sheetGradientColors = isDark
    ? ['#1D1B24', '#121620']
    : isSage
      ? ['#FAFBF8', '#EEF2E9']
      : ['#FBF8F3', '#EEF2F8'];

  const guideOptions = [
    {
      id: 'tour',
      title: 'Interactive App Tour',
      desc: 'Step-by-step button walkthrough across your studio dashboard.',
      Icon: Sparkles,
      spine: isSage ? colors.gold.DEFAULT : '#D9941E',
      circleBg: isDark
        ? 'rgba(217, 180, 108, 0.20)'
        : isSage
          ? 'rgba(99, 115, 86, 0.16)'
          : 'rgba(217, 164, 58, 0.20)',
      iconColor: isDark
        ? '#F3D27A'
        : isSage
          ? colors.gold.DEFAULT
          : '#8A5A10',
      onPress: () => {
        Haptics.selectionAsync().catch(() => {});
        onSelectTour?.();
      },
    },
    {
      id: 'track',
      title: 'How to Track Session',
      desc: 'Visual guide for scanning receipt QR codes and viewing milestones.',
      Icon: QrCode,
      spine: '#2F7FE0',
      circleBg: isDark ? 'rgba(47, 127, 224, 0.20)' : 'rgba(47, 127, 224, 0.14)',
      iconColor: isDark ? '#7EB6FF' : '#1E40AF',
      onPress: () => {
        Haptics.selectionAsync().catch(() => {});
        onSelectTrackGuide?.();
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheetWrapper, layout.modalFrameStyle]}>
          <View style={styles.sheetOuter}>
            <LinearGradient
              colors={sheetGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sheetGradient}
            >
              <CardDecorElements variant="hero" isDark={isDark} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerBadge}>
                    <HelpCircle
                      size={20}
                      color={isDark ? colors.gold.light : isSage ? colors.gold.DEFAULT : '#241D14'}
                      strokeWidth={1.85}
                    />
                  </View>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    Studio Guides
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeCircleBtn}
                  accessibilityLabel="Close guides"
                >
                  <X size={15} color={colors.text.primary} strokeWidth={2.1} />
                </TouchableOpacity>
              </View>

              {/* Guide Selection Cards */}
              <View style={styles.cardsStack}>
                {guideOptions.map((opt) => {
                  const OptionIcon = opt.Icon;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.86}
                      onPress={opt.onPress}
                      style={styles.optionCardOuter}
                    >
                      <LinearGradient
                        colors={cardGradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.optionCardGradient}
                      >
                        <CardDecorElements variant="list" isDark={isDark} />

                        <View
                          style={[styles.leftAccentSpine, { backgroundColor: opt.spine }]}
                        />

                        <View style={styles.optionInner}>
                          <View
                            style={[styles.optionCircle, { backgroundColor: opt.circleBg }]}
                          >
                            <OptionIcon size={18} color={opt.iconColor} strokeWidth={2} />
                          </View>

                          <View style={styles.optionTextCol}>
                            <Text style={styles.optionTitle}>{opt.title}</Text>
                            <Text style={styles.optionDesc}>{opt.desc}</Text>
                          </View>

                          <ChevronRight
                            size={17}
                            color={isDark ? colors.text.muted : '#4B4338'}
                            strokeWidth={1.9}
                          />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </LinearGradient>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors, isDark, isSage, layout) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(10, 8, 6, 0.72)',
      justifyContent: 'center',
      padding: layout.isCompact ? 14 : 18,
    },
    sheetWrapper: {
      width: '100%',
    },
    sheetOuter: {
      borderRadius: 26,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.22)'
        : isSage
          ? '#D7DDD1'
          : 'rgba(255, 255, 255, 0.90)',
      backgroundColor: isDark ? '#161923' : isSage ? '#FAFBF8' : '#FFFFFF',
      overflow: 'hidden',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: isDark ? 0.42 : 0.20,
      shadowRadius: 26,
      elevation: 12,
    },
    sheetGradient: {
      paddingHorizontal: layout.pad(16, 0.4),
      paddingTop: layout.pad(18, 0.45),
      paddingBottom: layout.pad(18, 0.45),
      position: 'relative',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 14,
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    headerBadge: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: isDark
        ? 'rgba(217, 180, 108, 0.16)'
        : isSage
          ? 'rgba(99, 115, 86, 0.14)'
          : 'rgba(229, 189, 103, 0.24)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(217, 180, 108, 0.28)'
        : isSage
          ? 'rgba(99, 115, 86, 0.22)'
          : 'rgba(196, 152, 64, 0.26)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flexShrink: 1,
      fontFamily: Typography.fontHeading,
      fontSize: layout.fs(19, 0.8),
      lineHeight: layout.fs(24, 0.8),
      color: isDark ? colors.text.primary : '#181410',
    },
    closeCircleBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardsStack: {
      gap: layout.pad(11, 0.45),
    },
    optionCardOuter: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#D7DDD1'
          : '#DCDDE6',
      backgroundColor: isDark ? '#181E29' : isSage ? '#FCFDFB' : '#FFFFFF',
      overflow: 'hidden',
      shadowColor: '#5B6472',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 10,
      elevation: isDark ? 0 : 2,
    },
    optionCardGradient: {
      flexDirection: 'row',
      borderRadius: 17,
      overflow: 'hidden',
      position: 'relative',
    },
    leftAccentSpine: {
      width: 3.5,
    },
    optionInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: layout.pad(13, 0.4),
      paddingVertical: layout.pad(13, 0.5),
      gap: 12,
    },
    optionCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionTextCol: {
      flex: 1,
    },
    optionTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: layout.fs(14, 0.9),
      lineHeight: layout.fs(19, 0.9),
      color: isDark ? colors.text.primary : '#181410',
    },
    optionDesc: {
      fontFamily: Typography.fontBody,
      fontSize: layout.fs(12, 0.9),
      lineHeight: layout.fs(17, 0.9),
      color: isDark ? colors.text.secondary : '#5C5346',
      marginTop: 2,
    },
  });
