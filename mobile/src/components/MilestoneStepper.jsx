/**
 * MilestoneStepper.jsx — "List view" timeline cards.
 * Matches the spacious rounded card layout:
 *  - Done: soft mint-tinted card, crisp white icon tile, white DONE pill
 *  - Current: crisp white/elevated card, solid sage/gold icon tile & CURRENT pill, "You're here" dot
 *  - Upcoming: quiet neutral slate card
 * Purely status-driven (read-only customer view).
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Modal, Pressable, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, {
  Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop,
  Rect, Circle, Path,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  Check, X, ClipboardCheck, CalendarCheck, UserCheck, Camera, Aperture,
  Sparkles, Printer, Package,
} from 'lucide-react-native';
import {
  MILESTONE_STEPS, STATUS_META,
  Typography, Spacing,
} from '../theme';

const STEP_ICONS = [ClipboardCheck, CalendarCheck, UserCheck, Camera, Aperture, Sparkles, Printer, Package];

const CONCISE_STEP_SUBTITLES = [
  "We've got your booking request",
  'Your date & slot are approved',
  'Lead photographer assigned to you',
  'Shoot day in the studio',
  'Developing & toning portraits',
  'Fine-art retouch & color grading',
  'Digital soft copies prepared',
  'Ready to receive (Walk-In)',
];

const NEXT_UP_SUBTITLES = [
  'Order review at front desk',
  'Payment verification & slot lock',
  'Assigning your lead photographer',
  'Shoot day in the studio',
  'Darkroom developing & toning',
  'Fine-art retouch & proofing',
  'Preparing digital soft copies',
  'Walk-in studio pickup',
];

const STEP_POPUP_DESCRIPTIONS = [
  "Your booking request is logged with our reception team. We're verifying your selected package and preferred schedule.",
  'Your payment is verified and your studio slot is officially approved and reserved on our calendar.',
  'A dedicated E-Kodak lead photographer has been assigned to guide your lighting, styling, and studio poses.',
  "Lights, camera, and your moment. We'll guide poses, styling, and expressions so every frame feels natural and confident.",
  'Our darkroom team reviews all captures carefully, curating the strongest shots and balancing studio lighting and exposure.',
  'Selected portraits receive fine-art skin polishing, subtle blemish cleanup, and warm, timeless color grading.',
  'Your final digital soft copies are prepared and verified for release in your client portal.',
  'Your order is ready to receive! Claim via walk-in at E-Kodak Studio or open your digital gallery.',
];

function buildPineTreePath(cx, topY, baseY, halfW) {
  const h = baseY - topY;
  const y1 = topY + h * 0.34;
  const y2 = topY + h * 0.66;
  return [
    `M ${cx} ${topY}`,
    `L ${cx + halfW * 0.52} ${y1}`,
    `L ${cx + halfW * 0.22} ${y1}`,
    `L ${cx + halfW * 0.80} ${y2}`,
    `L ${cx + halfW * 0.36} ${y2}`,
    `L ${cx + halfW} ${baseY}`,
    `L ${cx - halfW} ${baseY}`,
    `L ${cx - halfW * 0.36} ${y2}`,
    `L ${cx - halfW * 0.80} ${y2}`,
    `L ${cx - halfW * 0.22} ${y1}`,
    `L ${cx - halfW * 0.52} ${y1}`,
    'Z',
  ].join(' ');
}

const NEXT_UP_FOREST_TREES = {
  far: [
    [22, 46, 98, 12], [66, 36, 98, 14], [116, 44, 98, 12],
    [164, 34, 98, 14], [212, 40, 98, 13], [250, 28, 98, 15],
    [288, 22, 98, 16], [322, 30, 98, 14], [350, 40, 98, 13],
  ],
  mid: [
    [40, 42, 108, 15], [140, 40, 108, 14], [228, 30, 108, 16],
    [270, 22, 108, 18], [310, 26, 108, 17], [344, 36, 108, 15],
  ],
  near: [
    [16, 54, 118, 16], [198, 48, 118, 15], [252, 38, 118, 17],
    [292, 28, 118, 20], [332, 36, 118, 18],
  ],
};

function PulseCircle({ active, isDone, styles, colors, isDark, isSage }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (!active) return;
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.38, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0.12, duration: 1200, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.45, duration: 1200, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [active, pulseAnim, opacityAnim]);

  const doneFill = colors.accent.mint;
  const activeAccent = isSage ? '#58664E' : colors.gold.DEFAULT;

  if (isDone) {
    return (
      <View style={styles.circleWrapper}>
        <View style={[styles.circleDoneOuter, { backgroundColor: colors.bg.card }]}>
          <View style={[styles.circleDone, { backgroundColor: doneFill }]}>
            <Check size={13} color={isDark ? '#0B2418' : '#FFFFFF'} strokeWidth={3} />
          </View>
        </View>
      </View>
    );
  }

  if (active) {
    return (
      <View style={styles.circleWrapper}>
        <Animated.View
          style={[
            styles.pulseHalo,
            {
              backgroundColor: activeAccent,
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
        <View
          style={[
            styles.circleActiveOuter,
            {
              backgroundColor: isDark ? '#2B2418' : isSage ? '#E2EAE0' : '#F8EFE0',
              borderColor: activeAccent,
            },
          ]}
        >
          <View
            style={[
              styles.circleActiveInner,
              { backgroundColor: isDark ? '#181C24' : '#FFFFFF' },
            ]}
          >
            <View style={[styles.circleDotActive, { backgroundColor: activeAccent }]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.circleWrapper}>
      <View style={styles.circle}>
        <View style={styles.circleDot} />
      </View>
    </View>
  );
}

export default function MilestoneStepper({ status, booking = null }) {
  const { isDark, isSage, colors } = useTheme();
  const styles = getStyles(colors, isDark, isSage);
  const [selectedStepIdx, setSelectedStepIdx] = useState(null);
  const meta = STATUS_META[String(status || 'PENDING').toUpperCase()] || STATUS_META.PENDING;
  const rawStep = meta?.step ?? 0;
  const currentStep = rawStep < 0 ? 0 : Math.min(rawStep, MILESTONE_STEPS.length);
  const assignedPhotogName = booking?.photographer?.profile
    ? `${booking.photographer.profile.first_name || ''} ${booking.photographer.profile.last_name || ''}`.trim()
    : (booking?.photographer?.name || '');

  const openStepPopup = (idx) => {
    try {
      Haptics.selectionAsync().catch(() => { });
    } catch { }
    setSelectedStepIdx(idx);
  };

  const mintLineColor = isDark ? colors.accent.mint : isSage ? '#2B8A63' : '#148F5B';
  const mintTextColor = isDark ? colors.accent.mint : isSage ? '#1E724E' : '#117A4D';
  const activeBadgeFill = isSage ? '#58664E' : colors.gold.DEFAULT;
  const futureTrackColor = isDark
    ? 'rgba(255, 255, 255, 0.12)'
    : isSage
      ? '#D3DCD2'
      : '#DCDAD4';

  const doneCardBg = isDark ? '#142920' : isSage ? '#DFF0E5' : '#E3F4EB';
  const doneCardBorder = isDark ? 'rgba(61, 220, 151, 0.32)' : isSage ? '#BEDDC9' : '#B9DEC9';
  const doneIconBg = isDark ? '#1D3D2F' : '#FFFFFF';

  const activeCardBg = isDark ? '#1E242E' : '#FFFFFF';
  const activeCardBorder = isDark
    ? 'rgba(217, 180, 108, 0.36)'
    : isSage
      ? '#C3D0BF'
      : '#DFD2B6';
  const activeCardBottomBorder = isDark
    ? 'rgba(217, 180, 108, 0.56)'
    : isSage
      ? '#9FB198'
      : '#C8B48A';

  const futureCardBg = isDark ? '#141820' : isSage ? '#F3F6F4' : '#F6F7FA';
  const futureCardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : isSage ? '#DFE6E1' : '#E2E6EE';
  const futureIconBg = isDark ? '#1B202C' : '#FFFFFF';
  const futureIconBorder = isDark ? 'rgba(255, 255, 255, 0.10)' : isSage ? '#D6DFD9' : '#D9DFE8';

  const isNegativeTerminal = rawStep < 0;
  const isAllDone = currentStep >= MILESTONE_STEPS.length;
  const nextStepIdx = currentStep + 1;
  const nextUpInfo = isNegativeTerminal
    ? null
    : isAllDone
      ? {
        kicker: 'COMPLETED',
        title: 'All Steps Finished',
        subtitle: 'Thank you for choosing E-Kodak Studio',
        done: true,
      }
      : nextStepIdx < MILESTONE_STEPS.length
        ? {
          kicker: 'NEXT UP',
          title: MILESTONE_STEPS[nextStepIdx].label,
          subtitle: NEXT_UP_SUBTITLES[nextStepIdx] || MILESTONE_STEPS[nextStepIdx].desc,
          done: false,
        }
        : {
          kicker: 'FINAL STEP',
          title: 'Order Completion',
          subtitle: 'Claim your portraits at the studio or via delivery',
          done: false,
        };

  const nextUpBg = nextUpInfo?.done
    ? (isDark ? '#113325' : '#146E47')
    : isDark
      ? '#1A1E2B'
      : isSage
        ? '#45543E'
        : '#745114';
  const nextUpBorder = nextUpInfo?.done
    ? 'rgba(130, 240, 190, 0.34)'
    : 'rgba(255, 255, 255, 0.30)';
  const sceneryPalette = nextUpInfo?.done
    ? {
      skyTop: '#0B2E20',
      skyMid: '#1C6E4B',
      skyGlow: '#7DE0B4',
      sunCore: '#E8FFF4',
      sunAura: '#6EE7B7',
      hillFar: '#266147',
      hillMid: '#184A35',
      hillNear: '#0D3323',
      scrim: ['rgba(12, 46, 31, 0.72)', 'rgba(18, 66, 45, 0.34)', 'rgba(30, 95, 65, 0.08)'],
    }
    : isDark
      ? {
        skyTop: '#131724',
        skyMid: '#2D273B',
        skyGlow: '#BA8F49',
        sunCore: '#FFF1D2',
        sunAura: '#E5BA6D',
        hillFar: '#39324A',
        hillMid: '#252132',
        hillNear: '#151822',
        scrim: ['rgba(17, 20, 30, 0.78)', 'rgba(24, 27, 40, 0.38)', 'rgba(34, 36, 52, 0.10)'],
      }
      : isSage
        ? {
          skyTop: '#2E3E2B',
          skyMid: '#597250',
          skyGlow: '#DCE6CE',
          sunCore: '#FFF9E8',
          sunAura: '#E9D9AA',
          hillFar: '#6C8462',
          hillMid: '#4A6043',
          hillNear: '#2E4029',
          scrim: ['rgba(40, 54, 37, 0.70)', 'rgba(56, 74, 51, 0.32)', 'rgba(84, 105, 76, 0.06)'],
        }
        : {
          skyTop: '#563B10',
          skyMid: '#9B6E24',
          skyGlow: '#F6DFAC',
          sunCore: '#FFFDF5',
          sunAura: '#F5D28A',
          hillFar: '#8B6222',
          hillMid: '#684715',
          hillNear: '#452E0C',
          scrim: ['rgba(68, 46, 12, 0.72)', 'rgba(105, 72, 20, 0.34)', 'rgba(145, 102, 32, 0.06)'],
        };

  return (
    <View style={styles.container}>
      {MILESTONE_STEPS.map((step, index) => {
        const isDone = index < currentStep;
        const isActive = index === currentStep;
        const isFuture = index > currentStep;
        const prevIsDone = index > 0 && index - 1 < currentStep;
        const StepIcon = STEP_ICONS[index] || Sparkles;
        const subtitle =
          index === 2 && assignedPhotogName
            ? `Lead: ${assignedPhotogName}`
            : CONCISE_STEP_SUBTITLES[index] || step.desc;

        return (
          <View key={index} style={styles.stepRow}>
            {/* ── Left: Node + Continuous Vertical Line ── */}
            <View style={styles.leftCol}>
              {index > 0 ? (
                <View
                  style={[
                    styles.topConnector,
                    isActive && styles.topConnectorActiveOffset,
                    { backgroundColor: prevIsDone ? mintLineColor : futureTrackColor },
                  ]}
                />
              ) : (
                <View style={[styles.topConnectorSpacer, isActive && styles.topConnectorActiveOffset]} />
              )}

              <PulseCircle
                active={isActive}
                isDone={isDone}
                styles={styles}
                colors={colors}
                isDark={isDark}
                isSage={isSage}
              />

              {index < MILESTONE_STEPS.length - 1 && (
                <View
                  style={[
                    styles.connectorTrack,
                    { backgroundColor: isDone ? mintLineColor : futureTrackColor },
                  ]}
                />
              )}
            </View>

            {/* ── Right: Clickable Spacious Step Card ── */}
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => openStepPopup(index)}
              accessibilityRole="button"
              accessibilityLabel={`View details for ${step.label}`}
              style={[
                styles.phaseBox,
                {
                  backgroundColor: isActive ? activeCardBg : isDone ? doneCardBg : futureCardBg,
                  borderColor: isActive ? activeCardBorder : isDone ? doneCardBorder : futureCardBorder,
                  borderWidth: isActive ? 1.25 : 1,
                },
                isDone && {
                  borderBottomWidth: 1.8,
                  borderBottomColor: isDark ? 'rgba(0, 0, 0, 0.45)' : '#A7CEB6',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.20 : 0.05,
                  shadowRadius: 6,
                  elevation: 1,
                },
                isActive && {
                  marginTop: 7,
                  paddingVertical: 16,
                  borderBottomWidth: 2.5,
                  borderBottomColor: activeCardBottomBorder,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: isDark ? 0.30 : 0.10,
                  shadowRadius: 14,
                  elevation: 4,
                },
              ]}
            >
              {isActive && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.youAreHereEdgeTag,
                    { backgroundColor: isDark ? '#1E242E' : '#FFFFFF' },
                  ]}
                >
                  <Text style={[styles.youAreHereEdgeText, { color: mintTextColor }]}>
                    You're here
                  </Text>
                </View>
              )}

              <View style={styles.phaseHeaderRow}>
                <View
                  style={[
                    styles.stepIconTile,
                    isActive && styles.stepIconTileLarger,
                    isActive
                      ? [
                        styles.stepIconTileActive,
                        {
                          backgroundColor: activeBadgeFill,
                          borderColor: 'rgba(255, 255, 255, 0.22)',
                          shadowColor: activeBadgeFill,
                        },
                      ]
                      : isDone
                        ? [
                          styles.stepIconTileRaised,
                          {
                            backgroundColor: doneIconBg,
                            borderColor: isDark ? 'rgba(61, 220, 151, 0.32)' : isSage ? '#BFE0CA' : '#B9DEC9',
                            borderBottomColor: isDark ? 'rgba(0, 0, 0, 0.45)' : isSage ? '#9ECAA9' : '#96C9AE',
                          },
                        ]
                        : [
                          styles.stepIconTileSubtle,
                          {
                            backgroundColor: futureIconBg,
                            borderColor: futureIconBorder,
                            borderBottomColor: isDark ? 'rgba(0, 0, 0, 0.40)' : isSage ? '#C2CEC6' : '#C8CFD9',
                          },
                        ],
                  ]}
                >
                  <StepIcon
                    size={isActive ? 20 : 18}
                    color={
                      isActive
                        ? colors.text.onGold
                        : isDone
                          ? mintTextColor
                          : colors.text.muted
                    }
                    strokeWidth={2}
                  />
                </View>

                <View style={styles.stepBodyCol}>
                  <Text
                    style={[
                      styles.stepLabel,
                      isActive && styles.stepLabelActive,
                      isDone && styles.stepLabelDone,
                      isFuture && styles.stepLabelFuture,
                    ]}
                    numberOfLines={2}
                  >
                    {step.label}
                  </Text>

                  <Text
                    style={[
                      styles.stepSubtitle,
                      isActive && styles.stepSubtitleActive,
                      {
                        color: isDone
                          ? isDark ? 'rgba(218, 238, 226, 0.78)' : '#526A5D'
                          : isActive
                            ? isDark ? colors.text.secondary : '#5A605A'
                            : isDark ? 'rgba(255, 255, 255, 0.40)' : '#8E9891',
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {subtitle}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        );
      })}

      {/* ── Next Up Frosted Scenery Card (Below Ready for Release) ── */}
      {nextUpInfo && (
        <TouchableOpacity
          activeOpacity={nextStepIdx < MILESTONE_STEPS.length ? 0.86 : 1}
          disabled={nextStepIdx >= MILESTONE_STEPS.length}
          onPress={() => {
            if (nextStepIdx < MILESTONE_STEPS.length) {
              openStepPopup(nextStepIdx);
            }
          }}
          style={[
            styles.nextUpCard,
            {
              backgroundColor: nextUpBg,
              borderColor: nextUpBorder,
            },
          ]}
        >
          {/* Scenery backdrop: misty layered mountains + golden-hour sun & soft lens bokeh */}
          <Svg
            viewBox="0 0 360 116"
            preserveAspectRatio="xMidYMid slice"
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <SvgLinearGradient id="nextUpSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={sceneryPalette.skyTop} />
                <Stop offset="52%" stopColor={sceneryPalette.skyMid} />
                <Stop offset="100%" stopColor={sceneryPalette.skyGlow} />
              </SvgLinearGradient>
              <RadialGradient id="nextUpSunGlow" cx="82%" cy="32%" r="44%">
                <Stop offset="0%" stopColor={sceneryPalette.sunCore} stopOpacity="0.92" />
                <Stop offset="35%" stopColor={sceneryPalette.sunAura} stopOpacity="0.52" />
                <Stop offset="100%" stopColor={sceneryPalette.skyMid} stopOpacity="0" />
              </RadialGradient>
              <SvgLinearGradient id="nextUpMistGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.22" />
              </SvgLinearGradient>
            </Defs>

            <Rect x="0" y="0" width="360" height="116" fill="url(#nextUpSkyGrad)" />
            <Circle cx="294" cy="37" r="78" fill="url(#nextUpSunGlow)" />
            <Circle cx="294" cy="36" r="15" fill={sceneryPalette.sunCore} fillOpacity="0.72" />

            {/* Woodland lightbeams filtering through pines */}
            <Path
              d="M 270 16 L 316 16 L 244 116 L 182 116 Z"
              fill={sceneryPalette.sunCore}
              fillOpacity="0.10"
            />

            {/* Soft forest sky bokeh */}
            <Circle cx="246" cy="22" r="8" fill={sceneryPalette.sunAura} fillOpacity="0.22" />
            <Circle cx="332" cy="46" r="6" fill="#FFFFFF" fillOpacity="0.20" />

            {/* Distant misty pine treeline */}
            {NEXT_UP_FOREST_TREES.far.map(([cx, topY, baseY, hw], i) => (
              <Path
                key={`nu-far-${i}`}
                d={buildPineTreePath(cx, topY, baseY, hw)}
                fill={sceneryPalette.hillFar}
                fillOpacity="0.62"
              />
            ))}
            <Path
              d="M0 84 Q 90 74 184 82 T 360 76 L 360 116 L 0 116 Z"
              fill={sceneryPalette.hillFar}
              fillOpacity="0.55"
            />

            {/* Drifting woodland mist */}
            <Rect x="0" y="48" width="360" height="38" fill="url(#nextUpMistGrad)" />

            {/* Mid pine canopy silhouettes */}
            {NEXT_UP_FOREST_TREES.mid.map(([cx, topY, baseY, hw], i) => (
              <Path
                key={`nu-mid-${i}`}
                d={buildPineTreePath(cx, topY, baseY, hw)}
                fill={sceneryPalette.hillMid}
                fillOpacity="0.82"
              />
            ))}
            <Path
              d="M0 98 Q 110 88 220 94 T 360 84 L 360 116 L 0 116 Z"
              fill={sceneryPalette.hillMid}
              fillOpacity="0.84"
            />

            {/* Foreground framing pines & forest floor */}
            {NEXT_UP_FOREST_TREES.near.map(([cx, topY, baseY, hw], i) => (
              <Path
                key={`nu-near-${i}`}
                d={buildPineTreePath(cx, topY, baseY, hw)}
                fill={sceneryPalette.hillNear}
                fillOpacity="0.96"
              />
            ))}
            <Path
              d="M0 106 Q 120 98 240 102 T 360 94 L 360 116 L 0 116 Z"
              fill={sceneryPalette.hillNear}
              fillOpacity="0.98"
            />
          </Svg>

          {/* Frosted glass blur + gradual contrast veil */}
          {Platform.OS === 'ios' && (
            <BlurView
              intensity={24}
              tint={isDark ? 'dark' : 'light'}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
          )}
          <LinearGradient
            colors={sceneryPalette.scrim}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 0.8 }}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.28)', 'rgba(255, 255, 255, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            pointerEvents="none"
            style={styles.nextUpFrostSheen}
          />

          <View style={styles.nextUpTextCol}>
            <Text style={styles.nextUpKicker}>{nextUpInfo.kicker}</Text>
            <Text style={styles.nextUpTitle} numberOfLines={1}>
              {nextUpInfo.title}
            </Text>
            <Text style={styles.nextUpSubtitle} numberOfLines={2}>
              {nextUpInfo.subtitle}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Step Detail Popup Card ── */}
      <Modal
        visible={selectedStepIdx !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedStepIdx(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedStepIdx(null)}
        >
          {selectedStepIdx !== null && (() => {
            const modalStep = MILESTONE_STEPS[selectedStepIdx] || MILESTONE_STEPS[0];
            const ModalIcon = STEP_ICONS[selectedStepIdx] || Sparkles;
            const modalSubtitle = CONCISE_STEP_SUBTITLES[selectedStepIdx] || '';
            const modalDescription = STEP_POPUP_DESCRIPTIONS[selectedStepIdx] || modalStep.desc;
            const isModalDone = selectedStepIdx < currentStep;
            const isModalActive = selectedStepIdx === currentStep;
            const iconBoxBg = isModalDone
              ? (isDark ? '#155A3E' : isSage ? '#147D50' : '#148F5B')
              : isModalActive
                ? activeBadgeFill
                : (isDark ? '#363D4D' : isSage ? '#6A756D' : '#6A717D');

            return (
              <Pressable
                style={styles.modalCard}
                onPress={(e) => e.stopPropagation()}
              >
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedStepIdx(null)}
                  activeOpacity={0.75}
                  accessibilityLabel="Close step details"
                >
                  <X size={16} color={colors.text.secondary} strokeWidth={2.2} />
                </TouchableOpacity>

                <View
                  style={[
                    styles.modalIconBox,
                    {
                      backgroundColor: iconBoxBg,
                      shadowColor: iconBoxBg,
                    },
                  ]}
                >
                  <ModalIcon
                    size={28}
                    color={isModalActive ? colors.text.onGold : '#FFFFFF'}
                    strokeWidth={2}
                  />
                </View>

                <Text style={styles.modalTitle}>
                  {modalStep.label}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {modalSubtitle}
                </Text>

                <Text style={styles.modalDescription}>
                  {modalDescription}
                </Text>
              </Pressable>
            );
          })()}
        </Pressable>
      </Modal>
    </View>
  );
}

const CIRCLE_SIZE = 30;

const getStyles = (colors, isDark, isSage) => StyleSheet.create({
  container: {
    paddingTop: Spacing[1],
    paddingBottom: Spacing[1],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  leftCol: {
    alignItems: 'center',
    width: 34,
    marginRight: Spacing[3],
  },
  topConnectorSpacer: {
    height: 19,
  },
  topConnector: {
    width: 2,
    height: 19,
  },
  topConnectorActiveOffset: {
    height: 29,
  },
  circleWrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleDoneOuter: {
    width: 29,
    height: 29,
    borderRadius: 14.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.25 : 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  circleDone: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActiveOuter: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.25 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  circleActiveInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDotActive: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  pulseHalo: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    zIndex: 0,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : isSage ? '#C7D0BF' : '#D2D7E2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#151822' : '#FFFFFF',
    zIndex: 1,
  },
  circleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : isSage ? '#9AA592' : '#B4BAC7',
  },
  connectorTrack: {
    width: 2,
    flex: 1,
    minHeight: 20,
  },

  // ── Phase Card ──
  phaseBox: {
    flex: 1,
    position: 'relative',
    borderRadius: 19,
    paddingVertical: 14,
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  youAreHereEdgeTag: {
    position: 'absolute',
    top: -8.5,
    left: 18,
    paddingHorizontal: 7,
    zIndex: 4,
  },
  youAreHereEdgeText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  phaseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  stepIconTile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconTileLarger: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  stepIconTileActive: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  stepIconTileRaised: {
    borderBottomWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.22 : 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  stepIconTileSubtle: {
    borderBottomWidth: 1.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.15 : 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  stepBodyCol: {
    flex: 1,
    justifyContent: 'center',
  },
  stepLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text.primary,
  },
  stepLabelActive: {
    fontFamily: Typography.fontHeading,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.25,
    color: colors.text.primary,
  },
  stepLabelDone: {
    fontFamily: Typography.fontHeading,
    fontSize: 15,
    color: colors.text.primary,
  },
  stepLabelFuture: {
    fontFamily: Typography.fontBodyMedium,
    color: colors.text.muted,
  },
  stepSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
  },
  stepSubtitleActive: {
    fontSize: 13,
    marginTop: 3,
  },

  // ── Next Up Frosted Scenery Card ──
  nextUpCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 19,
    paddingHorizontal: 20,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  nextUpFrostSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 24,
  },
  nextUpTextCol: {
    gap: 3,
  },
  nextUpKicker: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.80)',
    textShadowColor: 'rgba(0, 0, 0, 0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  nextUpTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: 19.5,
    lineHeight: 25,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  nextUpSubtitle: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.90)',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── Step Detail Popup Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(6, 7, 12, 0.78)' : 'rgba(18, 26, 20, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[5],
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: isDark ? '#1B202B' : '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : isSage ? '#D3DFD5' : '#DFD5C0',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: isDark ? 0.45 : 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    backgroundColor: isDark ? '#242A38' : isSage ? '#F4F7F5' : '#F8F6F1',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : isSage ? '#DCE4DE' : '#E2D8C5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: 22.5,
    lineHeight: 28,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 18,
  },
  modalSubtitle: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 15,
    lineHeight: 21,
    color: isDark ? colors.gold.light : isSage ? '#4C5A44' : '#7B5917',
    textAlign: 'center',
    marginTop: 4,
  },
  modalDescription: {
    fontFamily: Typography.fontBody,
    fontSize: 14,
    lineHeight: 21,
    color: isDark ? colors.text.secondary : isSage ? '#5A665E' : '#575B66',
    textAlign: 'center',
    marginTop: 14,
  },
});
