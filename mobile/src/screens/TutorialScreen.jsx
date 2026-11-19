/**
 * TutorialScreen.jsx
 * Three-phase role-based onboarding flow:
 *  Phase 1 ('gate'):
 *    - Slide 1: What is E-Kodak & studio logo
 *    - Slide 2: Active QR Camera Scanner (required before accessing app resources)
 *  Phase 2 ('role_splash'):
 *    - Role-specific feature splash screens tailored to 'customer' or 'photographer'
 *    - Hands off cleanly into Home + Interactive Button Spotlight Tour (Phase 3)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  useWindowDimensions,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
  AppState,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, Camera, useCameraPermissions } from 'expo-camera';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  QrCode,
  ScanQrCode,
  Activity,
  ChevronLeft,
  ChevronRight,
  Check,
  PackageCheck,
  Flashlight,
  Sun,
  Camera as CameraIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MapPin,
  Tags,
  ClipboardList,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react-native';

import GlassBackground from '../components/GlassBackground';
import GoldButton from '../components/GoldButton';
import CardDecorElements from '../components/CardDecorElements';
import IntroVideoOverlay from '../components/IntroVideoOverlay';
import {
  CameraBrightnessOverlay,
  CameraBrightnessControl,
} from '../components/CameraBrightnessTool';
import {
  setUserRole,
  saveBookingToken,
  saveCustomerProfileFromBooking,
} from '../services/storageService';
import {
  parseQRPayload,
  loginPhotographerWithQRToken,
  fetchBookingByToken,
  logQRScan,
} from '../services/bookingService';
import { Typography, Spacing, Radius } from '../theme';

const { width, height } = Dimensions.get('window');
const E_KODAK_LOGO = require('../../assets/ekodak-logo.png');
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAM_CORNER_RADIUS = 18;
const CAM_CORNER_MASKS = [
  { key: 'tl', pos: { top: 0, left: 0 }, d: `M0,0 H${CAM_CORNER_RADIUS} A${CAM_CORNER_RADIUS},${CAM_CORNER_RADIUS} 0 0 0 0,${CAM_CORNER_RADIUS} Z` },
  { key: 'tr', pos: { top: 0, right: 0 }, d: `M0,0 H${CAM_CORNER_RADIUS} V${CAM_CORNER_RADIUS} A${CAM_CORNER_RADIUS},${CAM_CORNER_RADIUS} 0 0 0 0,0 Z` },
  { key: 'bl', pos: { bottom: 0, left: 0 }, d: `M0,0 A${CAM_CORNER_RADIUS},${CAM_CORNER_RADIUS} 0 0 0 ${CAM_CORNER_RADIUS},${CAM_CORNER_RADIUS} H0 Z` },
  { key: 'br', pos: { bottom: 0, right: 0 }, d: `M${CAM_CORNER_RADIUS},0 V${CAM_CORNER_RADIUS} H0 A${CAM_CORNER_RADIUS},${CAM_CORNER_RADIUS} 0 0 0 ${CAM_CORNER_RADIUS},0 Z` },
];

const GATE_SLIDES = [
  {
    id: 'what_is_ekodak',
    type: 'logo',
    badge: 'E-KODAK STUDIO',
    headline: 'Your Studio\nCompanion',
    body: 'Track your studio shoots in real time or sign in with your verified photographer pass.',
  },
  {
    id: 'qr_gate',
    type: 'scanner',
    icon: ScanQrCode,
    badge: 'QR VERIFICATION',
    headline: 'Scan QR Code',
    body: 'Center your Customer Booking QR or Photographer Pass QR inside the frame.',
  },
];

const CUSTOMER_SPLASH_SLIDES = [
  {
    id: 'cust_track',
    type: 'timeline',
    icon: Activity,
    badge: 'LIVE TRACKING',
    headline: 'Follow Your Shoot\nin Real Time',
    body: 'See every update from studio capture and editing to printing and pickup.',
    stages: ['Booked', 'Shoot', 'Editing', 'Ready'],
  },
  {
    id: 'cust_passes',
    type: 'features',
    icon: Tags,
    badge: 'PASSES & PACKAGES',
    headline: 'Booking Passes &\nStudio Rates',
    body: 'Access your saved QR receipts offline and browse studio package rates anytime.',
    items: [
      'Saved QR passes & balances',
      'Studio packages & inclusions',
      'Live status notifications',
    ],
  },
  {
    id: 'cust_pickup',
    type: 'features',
    icon: MapPin,
    badge: 'PICKUP & DELIVERY',
    headline: 'Studio Pickup &\nOrder Delivery',
    body: 'Get directions to the E-Kodak pickup bay or manage your home delivery details.',
    items: [
      'Studio pickup directions',
      'Delivery address & courier tracking',
      'Profile & appearance settings',
    ],
  },
];

const PHOTOGRAPHER_SPLASH_SLIDES = [
  {
    id: 'ph_creds',
    type: 'features',
    icon: ShieldCheck,
    badge: 'PHOTOGRAPHER PORTAL',
    headline: 'Verified Profile &\nDuty Status',
    body: 'Your staff profile, specialization, and duty availability stay synced with the studio.',
    items: [
      'Verified staff profile & Pass ID',
      'One-tap duty status toggle',
      'Instant workstation alerts',
    ],
  },
  {
    id: 'ph_shoots',
    type: 'timeline',
    icon: ClipboardList,
    badge: 'ASSIGNED SHOOTS',
    headline: 'Manage Sessions\nStep by Step',
    body: 'Accept assigned bookings, start studio captures, and move sessions to editing.',
    stages: ['Assigned', 'Capture', 'Editing', 'Done'],
  },
  {
    id: 'ph_schedule',
    type: 'features',
    icon: CalendarDays,
    badge: 'WORK SCHEDULE',
    headline: 'Your Calendar &\nShift Hours',
    body: 'View upcoming bookings by date and update your working hours or off-duty days.',
    items: [
      'Monthly shoot calendar',
      'Custom shift hours & days off',
      'Live studio roster sync',
    ],
  },
];

function SplashSlide({ item, isDark, colors, gradients, slideWidth }) {
  const styles = getStyles(colors, isDark);
  const cardColors =
    gradients?.card || (isDark ? ['#242029', '#151B24'] : ['#FAF2EA', '#E5EEF7']);
  const goldPill = gradients?.goldPill || ['#EAD082', '#C7962D'];
  const IconComp = item.icon || PackageCheck;

  return (
    <View style={[styles.slide, { width: slideWidth }]}>
      <View style={styles.slideContent}>
        <View style={styles.visualCardOuter}>
          <LinearGradient
            colors={cardColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.visualCardGrad}
          >
            <CardDecorElements
              variant={item.type === 'logo' ? 'hero' : 'action-scan'}
              isDark={isDark}
            />

            {item.type === 'logo' ? (
              <View style={styles.logoHeroStage}>
                <Image
                  source={E_KODAK_LOGO}
                  style={styles.splashLogoImage}
                  resizeMode="contain"
                />
              </View>
            ) : item.type === 'features' ? (
              <View style={styles.processStage}>
                <LinearGradient
                  colors={goldPill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.processIconBadge}
                >
                  <IconComp size={28} color="#181410" strokeWidth={2} />
                </LinearGradient>

                <View style={styles.stepsStack}>
                  {item.items.map((point, idx) => (
                    <View key={point} style={styles.miniStepRow}>
                      <View style={styles.miniStepNum}>
                        <Text style={styles.miniStepNumText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.miniStepText}>{point}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.timelineStage}>
                <LinearGradient
                  colors={goldPill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.processIconBadge}
                >
                  <IconComp size={28} color="#181410" strokeWidth={2} />
                </LinearGradient>

                <View style={styles.stagesRow}>
                  {item.stages.map((stage, idx) => (
                    <View key={stage} style={styles.stageItem}>
                      <View
                        style={[
                          styles.stageDot,
                          idx < 3 ? styles.stageDotGold : styles.stageDotReady,
                        ]}
                      />
                      <Text style={styles.stageLabel}>{stage}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </LinearGradient>
        </View>

        <Text style={styles.eyebrow}>{item.badge}</Text>

        <Text style={styles.headline}>{item.headline}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </View>
    </View>
  );
}

export default function TutorialScreen({ onComplete, initialSlide = 0 }) {
  const { isDark, colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const slideWidth = winWidth || width || 390;
  const screenHeight = winHeight || height || 844;
  const styles = getStyles(colors, isDark);

  const clampedInitial = Math.max(0, Math.min(GATE_SLIDES.length - 1, initialSlide ? 1 : 0));

  const [introDone, setIntroDone] = useState(false);
  const [phase, setPhase] = useState('gate'); // 'gate' | 'role_splash'
  const [detectedRole, setDetectedRole] = useState(null); // 'customer' | 'photographer' | null
  const [authPayload, setAuthPayload] = useState({});
  const [currentIndex, setCurrentIndex] = useState(clampedInitial);

  const activeSlides =
    phase === 'role_splash'
      ? detectedRole === 'photographer'
        ? PHOTOGRAPHER_SPLASH_SLIDES
        : CUSTOMER_SPLASH_SLIDES
      : GATE_SLIDES;

  const isScannerSlide = introDone && phase === 'gate' && currentIndex === GATE_SLIDES.length - 1;

  const [hookPermission, requestHookPermission, getHookPermission] = useCameraPermissions();
  const [osPermission, setOsPermission] = useState(null);
  const permission = hookPermission || osPermission;

  const [torch, setTorch] = useState(false);
  const [camBrightness, setCamBrightness] = useState(0);
  const [showBrightnessBar, setShowBrightnessBar] = useState(false);
  const [scanState, setScanState] = useState('SCANNING'); // 'SCANNING' | 'VERIFYING' | 'SUCCESS' | 'ERROR'
  const [scanMessage, setScanMessage] = useState('');
  const [cameraKey, setCameraKey] = useState(1);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [camWidth, setCamWidth] = useState(0);

  const scrollRef = useRef(null);
  const scanLockRef = useRef(false);
  const resetTimerRef = useRef(null);
  const autoPermRequestedRef = useRef(false);
  const getPermRef = useRef(getHookPermission);
  const reqPermRef = useRef(requestHookPermission);
  useEffect(() => {
    getPermRef.current = getHookPermission;
    reqPermRef.current = requestHookPermission;
  });

  const [scanLineAnim] = useState(() => new Animated.Value(0));
  const [laserOpacityAnim] = useState(() => new Animated.Value(0));
  const [cornerPulseAnim] = useState(() => new Animated.Value(1));
  const [contentRevealAnim] = useState(() => new Animated.Value(0));

  const runContentReveal = useCallback(
    (duration = 560) => {
      contentRevealAnim.stopAnimation();
      contentRevealAnim.setValue(0);
      Animated.timing(contentRevealAnim, {
        toValue: 1,
        duration,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }).start();
    },
    [contentRevealAnim]
  );

  useEffect(() => {
    if (introDone) {
      runContentReveal(620);
    }
  }, [introDone, runContentReveal]);

  useEffect(() => {
    if (clampedInitial === 0 && phase === 'gate' && slideWidth > 0) {
      const t = setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
      }, 30);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [clampedInitial, phase, slideWidth]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const refreshOsCameraPermission = useCallback(async () => {
    try {
      const current = getPermRef.current
        ? await getPermRef.current()
        : await Camera.getCameraPermissionsAsync();
      if (current) setOsPermission(current);
      return current;
    } catch {
      return null;
    }
  }, []);

  // Re-check OS permission when returning from device Settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isScannerSlide) {
        refreshOsCameraPermission();
      }
    });
    return () => sub.remove();
  }, [isScannerSlide, refreshOsCameraPermission]);

  // Initialize camera permission strictly once per scanner entry (never looping on hook callbacks)
  useEffect(() => {
    if (!isScannerSlide) {
      autoPermRequestedRef.current = false;
      return undefined;
    }

    let mounted = true;
    const ensurePermission = async () => {
      const current = await refreshOsCameraPermission();
      if (!mounted || current?.granted) return;

      if (!autoPermRequestedRef.current && current?.canAskAgain !== false) {
        autoPermRequestedRef.current = true;
        try {
          const req = reqPermRef.current
            ? await reqPermRef.current()
            : await Camera.requestCameraPermissionsAsync();
          if (mounted && req) {
            setOsPermission(req);
          }
        } catch { }
      }
    };
    ensurePermission();

    return () => {
      mounted = false;
    };
  }, [isScannerSlide, refreshOsCameraPermission]);

  // Smooth sinusoidal scan beam + breathing corner reticle animation
  useEffect(() => {
    if (!isScannerSlide || !permission?.granted || !cameraReady || scanState !== 'SCANNING') {
      scanLineAnim.stopAnimation();
      laserOpacityAnim.stopAnimation();
      cornerPulseAnim.stopAnimation();
      Animated.parallel([
        Animated.timing(laserOpacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(cornerPulseAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      return undefined;
    }

    scanLineAnim.setValue(0);
    laserOpacityAnim.setValue(0);
    cornerPulseAnim.setValue(0.76);

    Animated.timing(laserOpacityAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerPulseAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(cornerPulseAnim, {
          toValue: 0.65,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    scanLoop.start();
    pulseLoop.start();

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
    };
  }, [isScannerSlide, permission?.granted, cameraReady, scanState, scanLineAnim, laserOpacityAnim, cornerPulseAnim]);

  const scheduleScannerUnlock = useCallback((delayMs = 2000) => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      scanLockRef.current = false;
      setScanState('SCANNING');
      setScanMessage('');
    }, delayMs);
  }, []);

  const handleRequestCamera = async () => {
    try {
      const current = (await refreshOsCameraPermission()) || permission;
      if (current && current.canAskAgain === false) {
        await Linking.openSettings();
        return;
      }
      const res = reqPermRef.current
        ? await reqPermRef.current()
        : await Camera.requestCameraPermissionsAsync();
      if (res) setOsPermission(res);
      if (res?.granted) {
        setCameraError(null);
        setCameraReady(false);
        setCameraKey((k) => k + 1);
      }
    } catch { }
  };

  const enterRoleSplash = useCallback((role, payload = {}) => {
    setDetectedRole(role);
    setAuthPayload(payload);
    setPhase('role_splash');
    setCurrentIndex(0);
    runContentReveal(480);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    }, 20);
  }, [runContentReveal]);

  const handleBarcodeScanned = useCallback(
    async (scanResult) => {
      if (!isScannerSlide || scanLockRef.current) return;
      scanLockRef.current = true;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); } catch { }
      setScanState('VERIFYING');
      setScanMessage('Identifying role from QR code...');

      const parsed = parseQRPayload(scanResult?.data);
      if (!parsed.valid || !parsed.token) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); } catch { }
        setScanState('ERROR');
        setScanMessage(parsed.error || 'Unrecognized QR code.');
        scheduleScannerUnlock(1900);
        return;
      }

      // 1. Check Photographer QR Login Pass
      if (parsed.kind === 'photographer' || (parsed.kind === 'unknown' && UUID_REGEX.test(parsed.token))) {
        const phAuth = await loginPhotographerWithQRToken(parsed.token);
        if (phAuth.authorized && phAuth.profile) {
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch { }
          setScanState('SUCCESS');
          setScanMessage(
            `Photographer verified · Welcome ${phAuth.profile.first_name || phAuth.profile.full_name || ''}`
          );
          setTimeout(() => {
            enterRoleSplash('photographer', { profile: phAuth.profile });
          }, 420);
          return;
        }
        if (parsed.kind === 'photographer') {
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); } catch { }
          setScanState('ERROR');
          setScanMessage(phAuth.reason || 'Photographer QR pass is inactive or invalid.');
          scheduleScannerUnlock(2300);
          return;
        }
      }

      // 2. Check Customer Booking QR Pass
      const { data: booking } = await fetchBookingByToken(parsed.token);
      if (booking) {
        const resolvedToken = booking.booking_token || booking.booking_number || booking.id || parsed.token;
        logQRScan({ bookingId: booking.id }).catch(() => { });
        await Promise.all([
          saveBookingToken(resolvedToken, booking),
          saveCustomerProfileFromBooking(booking),
          setUserRole('customer'),
        ]).catch(() => { });
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch { }
        setScanState('SUCCESS');
        setScanMessage(`Customer pass #${booking.booking_number || ''} verified!`);
        setTimeout(() => {
          enterRoleSplash('customer', { booking, token: resolvedToken });
        }, 420);
        return;
      }

      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); } catch { }
      setScanState('ERROR');
      setScanMessage('QR pass not found in studio records.');
      scheduleScannerUnlock(2100);
    },
    [isScannerSlide, enterRoleSplash, scheduleScannerUnlock]
  );

  const goToSlide = (index) => {
    const target = Math.max(0, Math.min(activeSlides.length - 1, index));
    try { Haptics.selectionAsync().catch(() => {}); } catch { }
    if (phase === 'gate') {
      if (target === 0) {
        setTorch(false);
        setCamBrightness(0);
        setShowBrightnessBar(false);
        setCameraReady(false);
        setCameraError(null);
      }
      if (target !== currentIndex) {
        runContentReveal(440);
      }
    }
    scrollRef.current?.scrollTo({ x: target * slideWidth, y: 0, animated: true });
    setCurrentIndex(target);
  };

  const handleMomentumScrollEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.max(0, Math.min(activeSlides.length - 1, Math.round(offsetX / slideWidth)));
    if (index !== currentIndex) {
      try { Haptics.selectionAsync().catch(() => {}); } catch { }
      setCurrentIndex(index);
    }
  };

  const handleCompleteRoleSplash = async () => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch { }
    const role = detectedRole === 'photographer' ? 'photographer' : 'customer';
    await setUserRole(role).catch(() => { });
    await AsyncStorage.setItem('ekodak:tutorial_done', '1').catch(() => { });
    onComplete?.(role, { ...authPayload, startInteractiveTour: true });
  };

  const handleNext = () => {
    if (currentIndex < activeSlides.length - 1) {
      goToSlide(currentIndex + 1);
    } else if (phase === 'role_splash') {
      handleCompleteRoleSplash();
    }
  };

  const stageH = Math.min(Math.max(Math.round(screenHeight * 0.40), 330), 390);
  const reticleSize = camWidth > 0 ? Math.round(Math.min(camWidth - 52, stageH - 52, 224)) : 210;
  const reticleTop = Math.round((stageH - reticleSize) / 2);
  const reticleLeft = camWidth > 0 ? Math.round((camWidth - reticleSize) / 2) : 0;
  const scanTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, Math.max(80, reticleSize - 36)],
  });
  const reticleScale = cornerPulseAnim.interpolate({
    inputRange: [0.65, 1],
    outputRange: [0.985, 1.015],
  });

  const gateItem = GATE_SLIDES[1];
  const bezelSurface = isDark ? '#181A22' : '#FAF6ED';
  const bezelBorder =
    scanState === 'SUCCESS'
      ? '#10B981'
      : scanState === 'ERROR'
        ? '#EF4444'
        : isDark
          ? 'rgba(217, 180, 108, 0.42)'
          : '#C7962D';

  const scannerNode = (
    <View style={styles.scannerOuter}>
      <View style={styles.bezelFrame}>
        <View
          style={[
            styles.bezelTop,
            { backgroundColor: bezelSurface, borderColor: bezelBorder },
          ]}
        />

        <View style={[styles.bezelMiddleRow, { height: stageH }]}>
          <View
            style={[
              styles.bezelSideLeft,
              { backgroundColor: bezelSurface, borderColor: bezelBorder },
            ]}
          />

          <View
            style={[styles.cameraWindowSlot, { height: stageH }]}
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              if (w > 0) {
                setCamWidth((prev) => (Math.abs(prev - w) < 2 ? prev : w));
              }
            }}
          >
            {isScannerSlide && permission?.granted ? (
              <>
                {camWidth > 0 && (
                  <CameraView
                    key={`gate-cam-${cameraKey}`}
                    style={{ width: camWidth, height: stageH }}
                    facing="back"
                    autofocus="on"
                    flash="off"
                    exposure={camBrightness}
                    enableTorch={torch}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={scanState === 'SCANNING' ? handleBarcodeScanned : undefined}
                    onCameraReady={() => {
                      setCameraReady(true);
                      setCameraError(null);
                    }}
                    onMountError={(err) => {
                      setCameraError(err?.message || 'Unable to start camera preview.');
                    }}
                  />
                )}

                <CameraBrightnessOverlay
                  brightness={camBrightness}
                  width={camWidth}
                  height={stageH}
                />

                {CAM_CORNER_MASKS.map(({ key, pos, d }) => (
                  <View key={key} pointerEvents="none" style={[styles.camCornerMask, pos]}>
                    <Svg
                      width={CAM_CORNER_RADIUS}
                      height={CAM_CORNER_RADIUS}
                      viewBox={`0 0 ${CAM_CORNER_RADIUS} ${CAM_CORNER_RADIUS}`}
                    >
                      <Path d={d} fill={bezelSurface} />
                    </Svg>
                  </View>
                ))}

                {cameraReady && !cameraError ? (
                  <>
                    {camWidth > 0 && (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.reticleBox,
                          {
                            top: reticleTop,
                            left: reticleLeft,
                            width: reticleSize,
                            height: reticleSize,
                            transform: [{ scale: reticleScale }],
                          },
                        ]}
                      >
                        <View style={styles.reticleGuideBorder} />

                        <Animated.View
                          style={[
                            styles.corner,
                            styles.cornerTL,
                            { borderColor: '#F3D27A', opacity: cornerPulseAnim },
                          ]}
                        />
                        <Animated.View
                          style={[
                            styles.corner,
                            styles.cornerTR,
                            { borderColor: '#F3D27A', opacity: cornerPulseAnim },
                          ]}
                        />
                        <Animated.View
                          style={[
                            styles.corner,
                            styles.cornerBL,
                            { borderColor: '#F3D27A', opacity: cornerPulseAnim },
                          ]}
                        />
                        <Animated.View
                          style={[
                            styles.corner,
                            styles.cornerBR,
                            { borderColor: '#F3D27A', opacity: cornerPulseAnim },
                          ]}
                        />

                        {scanState === 'SCANNING' && (
                          <Animated.View
                            style={[
                              styles.scanBeamWrap,
                              {
                                opacity: laserOpacityAnim,
                                transform: [{ translateY: scanTranslateY }],
                              },
                            ]}
                          >
                            <LinearGradient
                              colors={[
                                'rgba(243, 210, 122, 0)',
                                'rgba(243, 210, 122, 0.28)',
                                'rgba(243, 210, 122, 0)',
                              ]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 0, y: 1 }}
                              style={styles.scanBeamGlow}
                            />
                            <LinearGradient
                              colors={[
                                'rgba(243, 210, 122, 0)',
                                '#FFE7A8',
                                'rgba(243, 210, 122, 0)',
                              ]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.scanLaserLine}
                            />
                          </Animated.View>
                        )}
                      </Animated.View>
                    )}

                    <View style={styles.cameraTopTools}>
                      <TouchableOpacity
                        onPress={() => {
                          try { Haptics.selectionAsync().catch(() => {}); } catch { }
                          setShowBrightnessBar((v) => !v);
                        }}
                        style={[
                          styles.toolCircleBtn,
                          (showBrightnessBar || camBrightness !== 0) && styles.toolCircleBtnActive,
                        ]}
                        activeOpacity={0.8}
                        accessibilityLabel="Adjust camera brightness"
                      >
                        <Sun
                          size={16}
                          color={showBrightnessBar || camBrightness !== 0 ? '#F3D27A' : '#FFFFFF'}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setTorch((t) => !t)}
                        style={[
                          styles.toolCircleBtn,
                          torch && styles.toolCircleBtnActive,
                        ]}
                        activeOpacity={0.8}
                        accessibilityLabel="Toggle flashlight"
                      >
                        <Flashlight size={16} color={torch ? '#F3D27A' : '#FFFFFF'} />
                      </TouchableOpacity>
                    </View>

                    <CameraBrightnessControl
                      brightness={camBrightness}
                      onChange={setCamBrightness}
                      visible={showBrightnessBar}
                    />
                  </>
                ) : (
                  <View style={styles.cameraStatusOverlay} pointerEvents="box-none">
                    <View style={styles.statusPromptCard}>
                      {cameraError ? (
                        <>
                          <AlertCircle size={22} color="#EF4444" strokeWidth={2} />
                          <Text style={styles.permissionSub}>{cameraError}</Text>
                          <TouchableOpacity
                            onPress={() => {
                              setCameraError(null);
                              setCameraReady(false);
                              setCameraKey((k) => k + 1);
                            }}
                            style={styles.allowCamBtn}
                            activeOpacity={0.84}
                          >
                            <Text style={styles.allowCamText}>Retry Camera</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <ActivityIndicator size="small" color="#F3D27A" />
                          <Text style={styles.statusPromptText}>Starting camera…</Text>
                        </>
                      )}
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.permissionFallback}>
                <View style={styles.permissionIconBox}>
                  <CameraIcon size={26} color="#D9B46C" strokeWidth={1.9} />
                </View>
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionSub}>
                  {permission?.canAskAgain === false
                    ? 'Enable camera permission in device settings to scan your QR code.'
                    : 'Allow camera access to scan your Customer Booking QR or Photographer Pass QR.'}
                </Text>
                <TouchableOpacity
                  onPress={handleRequestCamera}
                  style={styles.allowCamBtn}
                  activeOpacity={0.84}
                >
                  <Text style={styles.allowCamText}>
                    {permission?.canAskAgain === false ? 'Open Settings' : 'Open Camera'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View
            style={[
              styles.bezelSideRight,
              { backgroundColor: bezelSurface, borderColor: bezelBorder },
            ]}
          />
        </View>

        <View
          style={[
            styles.bezelBottom,
            { backgroundColor: bezelSurface, borderColor: bezelBorder },
          ]}
        />
      </View>

      {(scanState === 'VERIFYING' || scanState === 'SUCCESS' || scanState === 'ERROR') && (
        <View
          style={[
            styles.scannerStatusPill,
            scanState === 'SUCCESS' && styles.statusPillSuccess,
            scanState === 'ERROR' && styles.statusPillError,
          ]}
        >
          {scanState === 'VERIFYING' ? (
            <ActivityIndicator size="small" color={colors.gold.DEFAULT} />
          ) : scanState === 'SUCCESS' ? (
            <CheckCircle2 size={15} color="#10B981" />
          ) : (
            <AlertCircle size={15} color="#EF4444" />
          )}
          <Text style={styles.scannerStatusText} numberOfLines={2}>
            {scanMessage}
          </Text>
          {scanState === 'ERROR' && (
            <TouchableOpacity
              onPress={() => scheduleScannerUnlock(50)}
              hitSlop={8}
              accessibilityLabel="Retry scan"
            >
              <RefreshCw size={14} color={colors.gold.DEFAULT} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  if (!introDone) {
    return (
      <View style={[styles.container, { backgroundColor: '#EEF1F6' }]} collapsable={false}>
        <IntroVideoOverlay onComplete={() => setIntroDone(true)} />
      </View>
    );
  }

  const contentTranslateY = contentRevealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });
  const contentScale = contentRevealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.base }]} collapsable={false}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg.base}
      />
      <GlassBackground>
        <Animated.View
          style={[
            styles.foreground,
            {
              paddingTop: Math.max(insets.top, 12),
              opacity: contentRevealAnim,
              transform: [{ translateY: contentTranslateY }, { scale: contentScale }],
            },
          ]}
          collapsable={false}
        >
          {isScannerSlide ? (
            <View style={[styles.slide, { flex: 1, width: '100%' }]}>
              <View style={styles.slideContent}>
                {scannerNode}
                <Text style={[styles.eyebrow, { marginTop: Spacing[4] }]}>
                  {gateItem.badge}
                </Text>
                <Text style={[styles.headline, { fontSize: 23, lineHeight: 29, marginBottom: Spacing[2] }]}>
                  {gateItem.headline}
                </Text>
                <Text style={styles.body}>{gateItem.body}</Text>
              </View>
            </View>
          ) : (
            <ScrollView
              key={phase}
              ref={scrollRef}
              horizontal
              pagingEnabled
              scrollEnabled={phase === 'role_splash'}
              scrollEventThrottle={16}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              showsHorizontalScrollIndicator={false}
              style={styles.pager}
              contentContainerStyle={styles.pagerContent}
            >
              {(phase === 'gate' ? [GATE_SLIDES[0]] : activeSlides).map((item) => (
                <SplashSlide
                  key={item.id}
                  item={item}
                  isDark={isDark}
                  colors={colors}
                  gradients={gradients}
                  slideWidth={slideWidth}
                />
              ))}
            </ScrollView>
          )}

          <View
            style={[
              styles.controls,
              { paddingBottom: Math.max(insets.bottom, 20) + 12 },
            ]}
            collapsable={false}
          >
            <View style={styles.dots}>
              {activeSlides.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => goToSlide(i)} activeOpacity={0.7}>
                  <View style={[styles.dot, i === currentIndex && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.navRow}>
              {currentIndex > 0 && (
                <TouchableOpacity
                  onPress={() => goToSlide(currentIndex - 1)}
                  style={isScannerSlide ? styles.backBtnFull : styles.backIconBtn}
                  activeOpacity={0.78}
                  accessibilityLabel="Go back"
                >
                  <ChevronLeft size={20} color={colors.text.primary} strokeWidth={2.2} />
                  {isScannerSlide && (
                    <Text style={styles.backText}>Back to Welcome</Text>
                  )}
                </TouchableOpacity>
              )}

              {phase === 'gate' && currentIndex === 0 && (
                <GoldButton
                  onPress={() => goToSlide(1)}
                  icon={QrCode}
                  style={styles.nextBtn}
                  size="md"
                >
                  Scan QR to Continue
                </GoldButton>
              )}

              {phase === 'role_splash' && (
                <GoldButton
                  onPress={handleNext}
                  icon={currentIndex < activeSlides.length - 1 ? ChevronRight : Check}
                  iconPosition={currentIndex < activeSlides.length - 1 ? 'right' : 'left'}
                  style={styles.nextBtn}
                  size="md"
                >
                  {currentIndex < activeSlides.length - 1 ? 'Next' : 'Start Tour'}
                </GoldButton>
              )}
            </View>

            {phase === 'role_splash' && currentIndex < activeSlides.length - 1 && (
              <TouchableOpacity
                onPress={handleCompleteRoleSplash}
                style={styles.skipBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Skip Tour</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </GlassBackground>
    </View>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    container: { flex: 1 },
    foreground: { flex: 1, position: 'relative', zIndex: 2 },
    pager: { flex: 1 },
    pagerContent: { flexGrow: 1, alignItems: 'stretch' },
    slide: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Spacing[6],
    },
    slideContent: {
      alignItems: 'center',
      width: '100%',
      maxWidth: 360,
    },
    visualCardOuter: {
      width: '100%',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.22)' : '#DCDDE6',
      overflow: 'hidden',
      marginBottom: Spacing[5],
      shadowColor: '#5B6472',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0 : 0.10,
      shadowRadius: 16,
      elevation: isDark ? 0 : 3,
    },
    visualCardGrad: {
      paddingVertical: 26,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      minHeight: 226,
    },
    logoHeroStage: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
    },
    splashLogoImage: {
      width: 152,
      height: 152,
    },
    processStage: {
      width: '100%',
      alignItems: 'center',
      gap: 16,
    },
    processIconBadge: {
      width: 62,
      height: 62,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepsStack: {
      width: '100%',
      gap: 8,
    },
    miniStepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.82)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180,198,224,0.16)' : '#E2E4EC',
    },
    miniStepNum: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#C7962D',
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniStepNumText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 12,
      color: '#181410',
    },
    miniStepText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 13.5,
      color: colors.text.primary,
    },
    timelineStage: {
      width: '100%',
      alignItems: 'center',
      gap: 20,
    },
    stagesRow: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.82)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180,198,224,0.16)' : '#E2E4EC',
    },
    stageItem: {
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    stageDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    stageDotGold: {
      backgroundColor: '#C7962D',
    },
    stageDotReady: {
      backgroundColor: '#10B981',
    },
    stageLabel: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 11.5,
      color: colors.text.primary,
    },
    eyebrow: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 11,
      letterSpacing: 1.8,
      color: colors.gold.DEFAULT,
      marginBottom: Spacing[2],
      textAlign: 'center',
    },
    headline: {
      fontFamily: Typography.fontHeading,
      fontSize: 25,
      color: colors.text.primary,
      textAlign: 'center',
      lineHeight: 32,
      marginBottom: Spacing[2],
    },
    body: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 13.5,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 310,
    },
    controls: {
      width: '100%',
      paddingHorizontal: Spacing[6],
      paddingBottom: Spacing[8],
      paddingTop: Spacing[3],
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginBottom: Spacing[4],
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(91, 100, 114, 0.22)',
    },
    dotActive: {
      width: 26,
      backgroundColor: '#C7962D',
    },
    navRow: {
      width: '100%',
      maxWidth: 360,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backIconBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.24)' : '#D5D8E2',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.88)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtnFull: {
      flex: 1,
      height: 52,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180, 198, 224, 0.24)' : '#D5D8E2',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.88)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    backText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: Typography.size.base - 0.5,
      letterSpacing: 0.2,
      color: colors.text.primary,
    },
    nextBtn: {
      flex: 1,
    },
    skipBtn: {
      alignItems: 'center',
      paddingVertical: Spacing[2],
      marginTop: Spacing[2],
    },
    skipText: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: Typography.size.xs,
      color: colors.text.muted,
    },
    scannerOuter: {
      width: '100%',
      alignItems: 'center',
      gap: 10,
    },
    bezelFrame: {
      width: '100%',
    },
    bezelTop: {
      height: 10,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1.5,
      borderLeftWidth: 1.5,
      borderRightWidth: 1.5,
      zIndex: 6,
      elevation: 6,
    },
    bezelMiddleRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    bezelSideLeft: {
      width: 10,
      borderLeftWidth: 1.5,
      zIndex: 6,
      elevation: 6,
    },
    bezelSideRight: {
      width: 10,
      borderRightWidth: 1.5,
      zIndex: 6,
      elevation: 6,
    },
    bezelBottom: {
      height: 10,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      borderBottomWidth: 1.5,
      borderLeftWidth: 1.5,
      borderRightWidth: 1.5,
      zIndex: 6,
      elevation: 6,
    },
    cameraWindowSlot: {
      flex: 1,
      backgroundColor: 'transparent',
      position: 'relative',
    },
    camCornerMask: {
      position: 'absolute',
      width: CAM_CORNER_RADIUS,
      height: CAM_CORNER_RADIUS,
      zIndex: 5,
      elevation: 5,
    },
    reticleBox: {
      position: 'absolute',
      zIndex: 7,
      elevation: 7,
    },
    reticleGuideBorder: {
      ...StyleSheet.absoluteFill,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.22)',
    },
    corner: {
      position: 'absolute',
      width: 26,
      height: 26,
    },
    cornerTL: {
      top: 0,
      left: 0,
      borderTopWidth: 3,
      borderLeftWidth: 3,
      borderTopLeftRadius: 12,
    },
    cornerTR: {
      top: 0,
      right: 0,
      borderTopWidth: 3,
      borderRightWidth: 3,
      borderTopRightRadius: 12,
    },
    cornerBL: {
      bottom: 0,
      left: 0,
      borderBottomWidth: 3,
      borderLeftWidth: 3,
      borderBottomLeftRadius: 12,
    },
    cornerBR: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 3,
      borderRightWidth: 3,
      borderBottomRightRadius: 12,
    },
    scanBeamWrap: {
      position: 'absolute',
      top: 0,
      left: 10,
      right: 10,
      height: 24,
      justifyContent: 'center',
    },
    scanBeamGlow: {
      ...StyleSheet.absoluteFill,
    },
    scanLaserLine: {
      height: 2,
      borderRadius: 2,
    },
    cameraTopTools: {
      position: 'absolute',
      top: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      zIndex: 9,
      elevation: 9,
    },
    toolCircleBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(18, 21, 30, 0.76)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolCircleBtnActive: {
      borderColor: '#F3D27A',
      backgroundColor: 'rgba(243, 210, 122, 0.22)',
    },
    cameraStatusOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      elevation: 10,
    },
    statusPromptCard: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: 'rgba(13, 11, 9, 0.84)',
      maxWidth: '84%',
    },
    statusPromptText: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 12.5,
      color: '#FAFAF8',
      textAlign: 'center',
    },
    permissionFallback: {
      ...StyleSheet.absoluteFill,
      backgroundColor: '#12151E',
      borderRadius: 18,
      paddingHorizontal: 22,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    permissionIconBox: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: 'rgba(217, 180, 108, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(217, 180, 108, 0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    permissionTitle: {
      fontFamily: Typography.fontHeadingSemi,
      fontSize: 15,
      color: '#F7F5F2',
      textAlign: 'center',
    },
    permissionSub: {
      fontFamily: Typography.fontBody,
      fontSize: 12,
      color: '#B6C0D0',
      textAlign: 'center',
      lineHeight: 17,
    },
    allowCamBtn: {
      marginTop: 6,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: Radius.full,
      backgroundColor: '#C7962D',
    },
    allowCamText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 12.5,
      color: '#181410',
    },
    scannerStatusPill: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180,198,224,0.2)' : '#DCDDE6',
    },
    statusPillSuccess: {
      borderColor: '#10B981',
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ECFDF5',
    },
    statusPillError: {
      borderColor: '#EF4444',
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEF2F2',
    },
    scannerStatusText: {
      flexShrink: 1,
      fontFamily: Typography.fontBodySemi,
      fontSize: 12.5,
      color: colors.text.primary,
      textAlign: 'center',
    },
  });
