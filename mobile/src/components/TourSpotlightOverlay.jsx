import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Check, X } from 'lucide-react-native';

import { useTour } from '../context/TourContext';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../theme';

const SPOTLIGHT_PAD = 6;

export default function TourSpotlightOverlay() {
  const tour = useTour();
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const [rect, setRect] = useState(null);

  const activeTourRole = tour?.activeTourRole || null;
  const currentStep = tour?.currentStep || null;
  const stepIndex = tour?.stepIndex || 0;
  const steps = tour?.steps || [];
  const getTargetRef = tour?.getTargetRef;

  const measureCurrent = useCallback(() => {
    if (!activeTourRole || !currentStep || !getTargetRef) {
      setRect(null);
      return;
    }

    const ref = getTargetRef(currentStep.id);
    if (!ref?.current || typeof ref.current.measureInWindow !== 'function') {
      setRect(null);
      return;
    }

    ref.current.measureInWindow((x, y, width, height) => {
      if (
        typeof x === 'number' &&
        typeof y === 'number' &&
        width > 0 &&
        height > 0
      ) {
        setRect({ x, y, width, height });
      }
    });
  }, [activeTourRole, currentStep, getTargetRef]);

  useEffect(() => {
    if (!activeTourRole || !currentStep) {
      setRect(null);
      return undefined;
    }

    setRect(null);
    const t1 = setTimeout(measureCurrent, 60);
    const t2 = setTimeout(measureCurrent, 220);
    const t3 = setTimeout(measureCurrent, 480);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeTourRole, currentStep, stepIndex, screenW, screenH, measureCurrent]);

  if (!activeTourRole || !currentStep) {
    return null;
  }

  const isLastStep = stepIndex >= steps.length - 1;

  const cutout = rect
    ? {
        left: Math.max(4, rect.x - SPOTLIGHT_PAD),
        top: Math.max(4, rect.y - SPOTLIGHT_PAD),
        width: Math.min(screenW - 8, rect.width + SPOTLIGHT_PAD * 2),
        height: Math.min(screenH - 8, rect.height + SPOTLIGHT_PAD * 2),
        radius: currentStep.borderRadius ?? 18,
      }
    : null;

  const scrimColor = isDark ? 'rgba(6, 8, 14, 0.80)' : 'rgba(14, 15, 22, 0.74)';

  // Place tooltip card above spotlight if button sits in bottom half of screen, otherwise below it
  const showTooltipAbove = cutout ? cutout.top > screenH * 0.52 : false;
  const tooltipTop = cutout
    ? showTooltipAbove
      ? undefined
      : Math.min(screenH - 220 - insets.bottom, cutout.top + cutout.height + 16)
    : Math.max(insets.top + 80, screenH * 0.34);
  const tooltipBottom =
    cutout && showTooltipAbove
      ? Math.max(insets.bottom + 24, screenH - cutout.top + 16)
      : undefined;

  const handleNext = () => {
    try { Haptics.selectionAsync(); } catch {}
    tour.nextStep();
  };

  const handlePrev = () => {
    try { Haptics.selectionAsync(); } catch {}
    tour.prevStep();
  };

  const handleSkip = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    tour.finishTour();
  };

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none" collapsable={false}>
      {/* Scrim Framing Strict Button Cutout */}
      {cutout ? (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {/* Top Scrim */}
          <View
            pointerEvents="auto"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: cutout.top,
              backgroundColor: scrimColor,
            }}
          />
          {/* Bottom Scrim */}
          <View
            pointerEvents="auto"
            style={{
              position: 'absolute',
              top: cutout.top + cutout.height,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: scrimColor,
            }}
          />
          {/* Left Scrim */}
          <View
            pointerEvents="auto"
            style={{
              position: 'absolute',
              top: cutout.top,
              left: 0,
              width: cutout.left,
              height: cutout.height,
              backgroundColor: scrimColor,
            }}
          />
          {/* Right Scrim */}
          <View
            pointerEvents="auto"
            style={{
              position: 'absolute',
              top: cutout.top,
              left: cutout.left + cutout.width,
              right: 0,
              height: cutout.height,
              backgroundColor: scrimColor,
            }}
          />

          {/* Glowing Gold Highlight Ring Strictly Around Target Button */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: cutout.top - 2,
              left: cutout.left - 2,
              width: cutout.width + 4,
              height: cutout.height + 4,
              borderRadius: cutout.radius,
              borderWidth: 2.5,
              borderColor: '#E5BD67',
              shadowColor: '#E5BD67',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.75,
              shadowRadius: 12,
              elevation: 8,
            }}
          />
        </View>
      ) : (
        <View
          pointerEvents="auto"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: scrimColor }]}
        />
      )}

      {/* Feature Explanation Card */}
      <View
        pointerEvents="box-none"
        style={[
          styles.tooltipWrap,
          {
            top: tooltipTop,
            bottom: tooltipBottom,
          },
        ]}
      >
        <View
          style={[
            styles.tooltipCard,
            {
              backgroundColor: isDark ? '#1A1E29' : '#FFFFFF',
              borderColor: isDark ? 'rgba(229, 189, 103, 0.45)' : '#E4C27A',
            },
          ]}
        >
          <View style={styles.tooltipHeader}>
            <Text style={[styles.stepCounter, { color: colors.gold.DEFAULT }]}>
              STEP {stepIndex + 1} OF {steps.length}
            </Text>
            <TouchableOpacity
              onPress={handleSkip}
              hitSlop={10}
              accessibilityLabel="Close tutorial"
              style={styles.closeBtn}
            >
              <X size={16} color={isDark ? '#A0A9BA' : '#6C6458'} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.tooltipTitle, { color: isDark ? '#F7F5F2' : '#181410' }]}>
            {currentStep.title}
          </Text>
          <Text style={[styles.tooltipBody, { color: isDark ? '#C5CEDE' : '#4E473E' }]}>
            {currentStep.description}
          </Text>

          <View style={styles.tooltipActions}>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.75}>
              <Text style={[styles.skipText, { color: isDark ? '#8E96A8' : '#7A7267' }]}>
                Skip
              </Text>
            </TouchableOpacity>

            <View style={styles.rightControls}>
              {stepIndex > 0 && (
                <TouchableOpacity
                  onPress={handlePrev}
                  activeOpacity={0.8}
                  style={[
                    styles.prevBtn,
                    {
                      borderColor: isDark ? 'rgba(255,255,255,0.16)' : '#DCDDE6',
                    },
                  ]}
                >
                  <Text style={[styles.prevText, { color: isDark ? '#E2E8F0' : '#3E3830' }]}>
                    Back
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.86}
                style={styles.nextBtn}
              >
                <Text style={styles.nextText}>{isLastStep ? 'Done' : 'Next'}</Text>
                {isLastStep ? (
                  <Check size={14} color="#181410" strokeWidth={2.5} />
                ) : (
                  <ChevronRight size={14} color="#181410" strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipWrap: {
    position: 'absolute',
    left: 18,
    right: 18,
    zIndex: 999,
    alignItems: 'center',
  },
  tooltipCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 16,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepCounter: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  tooltipTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: 19,
    lineHeight: 24,
    marginBottom: 6,
  },
  tooltipBody: {
    fontFamily: Typography.fontBody,
    fontSize: 13.5,
    lineHeight: 19.5,
    marginBottom: 14,
  },
  tooltipActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 13,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prevBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 13,
  },
  nextBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#E5BD67',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  nextText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 13,
    color: '#181410',
  },
});
