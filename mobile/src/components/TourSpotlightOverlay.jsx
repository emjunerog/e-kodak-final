import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Check, X } from 'lucide-react-native';

import { useTour } from '../context/TourContext';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../theme';

const SPOTLIGHT_PAD = 3;

export default function TourSpotlightOverlay() {
  const tour = useTour();
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const overlayRef = useRef(null);
  const [overlaySize, setOverlaySize] = useState({ width: winW, height: winH });
  const [rect, setRect] = useState(null);

  const activeTourRole = tour?.activeTourRole || null;
  const currentStep = tour?.currentStep || null;
  const stepIndex = tour?.stepIndex || 0;
  const steps = tour?.steps || [];
  const getTargetRef = tour?.getTargetRef;

  const updateRectIfChanged = useCallback((next) => {
    if (
      !next ||
      !Number.isFinite(next.x) ||
      !Number.isFinite(next.y) ||
      next.width <= 0 ||
      next.height <= 0
    ) {
      return;
    }
    setRect((prev) => {
      if (
        prev &&
        Math.abs(prev.x - next.x) < 1 &&
        Math.abs(prev.y - next.y) < 1 &&
        Math.abs(prev.width - next.width) < 1 &&
        Math.abs(prev.height - next.height) < 1
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const measureCurrent = useCallback(() => {
    if (!activeTourRole || !currentStep || !getTargetRef) {
      setRect(null);
      return;
    }

    const ref = getTargetRef(currentStep.id);
    const targetNode = ref?.current;
    const overlayNode = overlayRef.current;
    if (!targetNode) {
      setRect(null);
      return;
    }

    // Prefer measureLayout relative to our own overlay container so status bar /
    // translucent edge-to-edge / safe-area window offsets cancel out 100%.
    if (overlayNode && typeof targetNode.measureLayout === 'function') {
      targetNode.measureLayout(
        overlayNode,
        (x, y, width, height) => {
          if (width > 0 && height > 0) {
            updateRectIfChanged({ x, y, width, height });
          }
        },
        () => {
          // Fallback: subtract overlay window origin from target window origin
          if (
            typeof overlayNode.measureInWindow === 'function' &&
            typeof targetNode.measureInWindow === 'function'
          ) {
            overlayNode.measureInWindow((ox, oy) => {
              targetNode.measureInWindow((tx, ty, width, height) => {
                if (width > 0 && height > 0) {
                  updateRectIfChanged({
                    x: tx - (ox || 0),
                    y: ty - (oy || 0),
                    width,
                    height,
                  });
                }
              });
            });
          }
        }
      );
      return;
    }

    if (typeof targetNode.measureInWindow === 'function') {
      if (overlayNode && typeof overlayNode.measureInWindow === 'function') {
        overlayNode.measureInWindow((ox, oy) => {
          targetNode.measureInWindow((tx, ty, width, height) => {
            if (width > 0 && height > 0) {
              updateRectIfChanged({
                x: tx - (ox || 0),
                y: ty - (oy || 0),
                width,
                height,
              });
            }
          });
        });
      } else {
        targetNode.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            updateRectIfChanged({ x, y, width, height });
          }
        });
      }
    }
  }, [activeTourRole, currentStep, getTargetRef, updateRectIfChanged]);

  useEffect(() => {
    if (!activeTourRole || !currentStep) {
      return undefined;
    }

    const raf = requestAnimationFrame(measureCurrent);
    const t1 = setTimeout(measureCurrent, 60);
    const t2 = setTimeout(measureCurrent, 220);
    const t3 = setTimeout(measureCurrent, 520);
    const interval = setInterval(measureCurrent, 400);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
    };
  }, [activeTourRole, currentStep, stepIndex, overlaySize.width, overlaySize.height, measureCurrent]);

  if (!activeTourRole || !currentStep) {
    return null;
  }

  const screenW = overlaySize.width || winW;
  const screenH = overlaySize.height || winH;
  const isLastStep = stepIndex >= steps.length - 1;

  const cutout = rect
    ? (() => {
        const left = Math.max(2, Math.round(rect.x - SPOTLIGHT_PAD));
        const top = Math.max(2, Math.round(rect.y - SPOTLIGHT_PAD));
        const width = Math.min(screenW - 4, Math.round(rect.width + SPOTLIGHT_PAD * 2));
        const height = Math.min(screenH - 4, Math.round(rect.height + SPOTLIGHT_PAD * 2));
        const rawRadius = currentStep.borderRadius ?? 16;
        const radius = Math.min(rawRadius, Math.floor(Math.min(width, height) / 2));
        return { left, top, width, height, radius };
      })()
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
    try { Haptics.selectionAsync().catch(() => {}); } catch {}
    tour.nextStep();
  };

  const handlePrev = () => {
    try { Haptics.selectionAsync().catch(() => {}); } catch {}
    tour.prevStep();
  };

  const handleSkip = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch {}
    tour.finishTour();
  };

  return (
    <View
      ref={overlayRef}
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      collapsable={false}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setOverlaySize((prev) =>
            Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
              ? prev
              : { width, height }
          );
        }
      }}
    >
      {/* Touch-blocking transparent layer so taps outside tooltip stay guarded */}
      <View pointerEvents="auto" style={StyleSheet.absoluteFill} />

      {/* Pixel-exact SVG rounded-rect / circular cutout scrim + crisp gold border */}
      <Svg
        width={screenW}
        height={screenH}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <Mask id="tourSpotlightMask">
            <Rect x={0} y={0} width={screenW} height={screenH} fill="#FFFFFF" />
            {cutout && (
              <Rect
                x={cutout.left}
                y={cutout.top}
                width={cutout.width}
                height={cutout.height}
                rx={cutout.radius}
                ry={cutout.radius}
                fill="#000000"
              />
            )}
          </Mask>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={screenW}
          height={screenH}
          fill={scrimColor}
          mask="url(#tourSpotlightMask)"
        />
        {cutout && (
          <Rect
            x={cutout.left}
            y={cutout.top}
            width={cutout.width}
            height={cutout.height}
            rx={cutout.radius}
            ry={cutout.radius}
            fill="none"
            stroke="#E5BD67"
            strokeWidth={2.5}
          />
        )}
      </Svg>

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
