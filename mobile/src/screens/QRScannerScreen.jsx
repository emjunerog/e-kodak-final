/**
 * QRScannerScreen.jsx — Smart Scan QR Dashboard + Full Scanner Mode
 * Features:
 * - Real device OS camera permission flow via expo-camera (triggers native OS prompt / settings)
 * - Large prioritized scanner viewfinder card filling dashboard proportions cleanly
 * - Preserves Refresh (RotateCcw) & Flashlight (Torch) icon controls in header & full mode
 * - Expand icon (Maximize2) beside "Scan Again" button launches Full Scanner Mode with
 *   adjusted wider frame & useful top icons (Refresh, Flashlight, Enter Code)
 * - Keeps onBarcodeScanned persistently attached (gating via refs) so Android CameraX never
 *   unbinds QR detection after one scan, and restarts NativeAnimated loops reliably
 * - Mounts CameraView with zero background/clipping/ScrollView ancestors behind its slot
 *   so Android SurfaceView renders live preview cleanly without black-screen occlusion
 * - Search card accepts QR pass codes AND customer Booking IDs (e.g. BK-2026-00001)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  AppState,
  Linking,
  Keyboard as RNKeyboard,
  InteractionManager,
} from 'react-native';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, Camera, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  Camera as CameraIcon,
  Flashlight,
  FlashlightOff,
  RotateCcw,
  Check,
  Search,
  ChevronRight,
  AlertCircle,
  Maximize2,
  Minimize2,
  Keyboard,
  X,
} from 'lucide-react-native';

import {
  parseQRPayload,
  fetchBookingByToken,
  logQRScan,
  loginPhotographerWithQRToken,
} from '../services/bookingService';
import { saveBookingToken, saveCustomerProfileFromBooking } from '../services/storageService';
import GoldButton from '../components/GoldButton';
import GlassBackground from '../components/GlassBackground';
import CardDecorElements from '../components/CardDecorElements';
import StudioShapeLoader from '../components/StudioShapeLoader';
import StudioMascotKit from '../components/StudioMascotKit';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius, Shadow } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const E_KODAK_LOGO = require('../../assets/ekodak-logo.png');

// Scanner card occupies ~75-80% of the vertical dashboard workspace above the bottom bar
const DASH_STAGE_HEIGHT = Math.min(Math.max(Math.round(SCREEN_HEIGHT * 0.54), 380), 520);
// Horizontal padding (16 * 2) + bezel side rails (10 * 2)
const DASH_STAGE_WIDTH = Math.max(SCREEN_WIDTH - 32 - 20, 240);
const DASH_RETICLE_SIZE = Math.round(Math.min(DASH_STAGE_WIDTH * 0.72, DASH_STAGE_HEIGHT * 0.58, 250));
const FULL_RETICLE_SIZE = Math.round(Math.min(SCREEN_WIDTH * 0.82, 310));

const CORNER_SIZE = 26;
const CORNER_WIDTH = 3.2;
const CAMERA_CORNER_RADIUS = 18;
const CAMERA_CORNER_MASKS = [
  {
    key: 'tl',
    pos: { top: 0, left: 0 },
    d: `M0 0 H${CAMERA_CORNER_RADIUS} A${CAMERA_CORNER_RADIUS} ${CAMERA_CORNER_RADIUS} 0 0 0 0 ${CAMERA_CORNER_RADIUS} Z`,
  },
  {
    key: 'tr',
    pos: { top: 0, right: 0 },
    d: `M0 0 H${CAMERA_CORNER_RADIUS} V${CAMERA_CORNER_RADIUS} A${CAMERA_CORNER_RADIUS} ${CAMERA_CORNER_RADIUS} 0 0 0 0 0 Z`,
  },
  {
    key: 'bl',
    pos: { bottom: 0, left: 0 },
    d: `M0 0 A${CAMERA_CORNER_RADIUS} ${CAMERA_CORNER_RADIUS} 0 0 0 ${CAMERA_CORNER_RADIUS} ${CAMERA_CORNER_RADIUS} H0 Z`,
  },
  {
    key: 'br',
    pos: { bottom: 0, right: 0 },
    d: `M${CAMERA_CORNER_RADIUS} 0 V${CAMERA_CORNER_RADIUS} H0 A${CAMERA_CORNER_RADIUS} ${CAMERA_CORNER_RADIUS} 0 0 0 ${CAMERA_CORNER_RADIUS} 0 Z`,
  },
];

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Extracts a clamped square target frame inside the active camera viewport
 * from CameraView barcode bounds or cornerPoints.
 */
function extractQRTargetBox(scanResult, stageWidth, stageHeight) {
  if (!scanResult || stageWidth <= 0 || stageHeight <= 0) return null;

  let minX;
  let minY;
  let boxW = 0;
  let boxH = 0;

  const bounds = scanResult.bounds;
  if (
    bounds?.origin &&
    bounds?.size &&
    Number.isFinite(bounds.origin.x) &&
    Number.isFinite(bounds.origin.y) &&
    bounds.size.width > 0 &&
    bounds.size.height > 0
  ) {
    minX = bounds.origin.x;
    minY = bounds.origin.y;
    boxW = bounds.size.width;
    boxH = bounds.size.height;
  } else if (Array.isArray(scanResult.cornerPoints) && scanResult.cornerPoints.length >= 2) {
    const xs = scanResult.cornerPoints.map((p) => p?.x).filter(Number.isFinite);
    const ys = scanResult.cornerPoints.map((p) => p?.y).filter(Number.isFinite);
    if (xs.length >= 2 && ys.length >= 2) {
      minX = Math.min(...xs);
      minY = Math.min(...ys);
      boxW = Math.max(...xs) - minX;
      boxH = Math.max(...ys) - minY;
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || (boxW <= 2 && boxH <= 2)) {
    return null;
  }

  // Some drivers report normalized 0..1 coordinates; upscale safely if so.
  if (minX <= 1 && minY <= 1 && boxW <= 1 && boxH <= 1) {
    minX *= stageWidth;
    minY *= stageHeight;
    boxW *= stageWidth;
    boxH *= stageHeight;
  }

  const maxAllowedSize = Math.max(96, Math.min(stageWidth, stageHeight) - 20);
  const rawSide = Math.max(boxW, boxH);
  const targetSize = Math.round(clamp(rawSide + 32, 82, maxAllowedSize));

  const centerX = minX + boxW / 2;
  const centerY = minY + boxH / 2;

  const targetLeft = Math.round(clamp(centerX - targetSize / 2, 10, stageWidth - targetSize - 10));
  const targetTop = Math.round(clamp(centerY - targetSize / 2, 10, stageHeight - targetSize - 10));

  return { left: targetLeft, top: targetTop, size: targetSize };
}

function SmoothPressable({
  children,
  onPress,
  disabled = false,
  pressScale = 0.92,
  activeOpacity = 0.8,
  hitSlop = 4,
  style,
  accessibilityLabel,
}) {
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [opacityAnim] = useState(() => new Animated.Value(1));

  const animatePress = (scaleVal, opacityVal, isRelease) => {
    scaleAnim.stopAnimation();
    opacityAnim.stopAnimation();
    if (isRelease) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: scaleVal,
          stiffness: 420,
          damping: 26,
          mass: 0.65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: opacityVal,
          duration: 140,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: scaleVal,
        duration: 65,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: opacityVal,
        duration: 65,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      pressRetentionOffset={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => {
        if (!disabled) animatePress(pressScale, activeOpacity, false);
      }}
      onPressOut={() => {
        animatePress(1, 1, true);
      }}
    >
      <Animated.View
        style={[
          style,
          !disabled && { opacity: opacityAnim },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function QRScannerScreen({ navigation }) {
  const { isDark, isSage, colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [hookPermission, requestHookPermission, getHookPermission] = useCameraPermissions();
  const [osPermission, setOsPermission] = useState(null);
  const permission = hookPermission || osPermission;

  const [torch, setTorch] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showConnectingOverlay, setShowConnectingOverlay] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraKey, setCameraKey] = useState(1);
  const [isFullScanner, setIsFullScanner] = useState(false);

  const [manualToken, setManualToken] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualErrorSource, setManualErrorSource] = useState(false);

  // 'IDLE' | 'LOCKING' | 'LOADING' | 'SUCCESS' | 'ERROR'
  const [scanState, setScanState] = useState('IDLE');
  const [statusCaption, setStatusCaption] = useState('Align QR code inside the frame');
  const [mascotMessage, setMascotMessage] = useState('');
  const [foundBooking, setFoundBooking] = useState(null);
  const [foundToken, setFoundToken] = useState('');

  const [dashLayout, setDashLayout] = useState({
    width: DASH_STAGE_WIDTH,
    height: DASH_STAGE_HEIGHT,
  });
  const [androidKeyboardInset, setAndroidKeyboardInset] = useState(0);

  // Mutable refs so useFocusEffect & callbacks never re-trigger mid-interaction
  const dashLayoutRef = useRef({ width: DASH_STAGE_WIDTH, height: DASH_STAGE_HEIGHT });
  const isFullScannerRef = useRef(false);
  const scanStateRef = useRef('IDLE');
  const scanLockRef = useRef(false);
  const lookupEpochRef = useRef(0);
  const timersRef = useRef([]);
  const codeInputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const scrollViewHeightRef = useRef(0);
  const baseScrollHeightRef = useRef(0);
  const isKeyboardOpenRef = useRef(false);
  const isCodeInputFocusedRef = useRef(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    let scrollTimer = null;

    const showSub = RNKeyboard.addListener(showEvent, (e) => {
      isKeyboardOpenRef.current = true;
      const kHeight = e?.endCoordinates?.height || 0;

      if (Platform.OS === 'android' && kHeight > 0) {
        const shrank =
          baseScrollHeightRef.current > 0 &&
          baseScrollHeightRef.current - scrollViewHeightRef.current > kHeight * 0.45;
        setAndroidKeyboardInset(shrank ? 0 : kHeight + 28);
      }

      if (!isFullScannerRef.current && (isCodeInputFocusedRef.current || codeInputRef.current?.isFocused?.())) {
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    });

    const hideSub = RNKeyboard.addListener(hideEvent, () => {
      isKeyboardOpenRef.current = false;
      if (scrollTimer) clearTimeout(scrollTimer);
      setAndroidKeyboardInset(0);
    });

    return () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (androidKeyboardInset <= 0 || isFullScannerRef.current) return undefined;
    const id = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(id);
  }, [androidKeyboardInset]);

  const activeStageW = isFullScanner ? SCREEN_WIDTH : dashLayout.width;
  const baseReticleSize = isFullScanner ? FULL_RETICLE_SIZE : DASH_RETICLE_SIZE;

  const [reticleLeft] = useState(
    () => new Animated.Value(Math.round((DASH_STAGE_WIDTH - DASH_RETICLE_SIZE) / 2))
  );
  const [reticleTop] = useState(
    () => new Animated.Value(Math.round((DASH_STAGE_HEIGHT - DASH_RETICLE_SIZE) / 2))
  );
  const [reticleSize] = useState(() => new Animated.Value(DASH_RETICLE_SIZE));
  const [scanAnim] = useState(() => new Animated.Value(0));
  const [cornerAnim] = useState(() => new Animated.Value(1));
  const [lockScaleAnim] = useState(() => new Animated.Value(1));
  const [laserOpacityAnim] = useState(() => new Animated.Value(0));
  const [statusChipAnim] = useState(() => new Animated.Value(0));
  const [cameraOverlayAnim] = useState(() => new Animated.Value(1));
  const [modeFadeAnim] = useState(() => new Animated.Value(1));
  const [refreshSpinAnim] = useState(() => new Animated.Value(0));
  const [foundCardAnim] = useState(() => new Animated.Value(1));
  const [permHaloAnim] = useState(() => new Animated.Value(1));

  const syncScanState = useCallback((nextState) => {
    scanStateRef.current = nextState;
    setScanState(nextState);
  }, []);

  const clearPendingTimers = useCallback(() => {
    lookupEpochRef.current += 1;
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);

  const stopReticleMotion = useCallback(() => {
    reticleLeft.stopAnimation();
    reticleTop.stopAnimation();
    reticleSize.stopAnimation();
    lockScaleAnim.stopAnimation();
  }, [reticleLeft, reticleTop, reticleSize, lockScaleAnim]);

  const animateModeReveal = useCallback(() => {
    modeFadeAnim.stopAnimation();
    modeFadeAnim.setValue(0.68);
    Animated.timing(modeFadeAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [modeFadeAnim]);

  const triggerRefreshSpin = useCallback(() => {
    refreshSpinAnim.stopAnimation();
    refreshSpinAnim.setValue(0);
    Animated.timing(refreshSpinAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [refreshSpinAnim]);

  const focusManualInputAfterTransition = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      const t = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        codeInputRef.current?.focus();
      }, 90);
      timersRef.current.push(t);
    });
  }, []);

  const resetReticle = useCallback(
    (animate = true, fullOverride = isFullScannerRef.current) => {
      stopReticleMotion();
      const stageW = fullOverride ? SCREEN_WIDTH : dashLayoutRef.current.width;
      const stageH = fullOverride ? SCREEN_HEIGHT : dashLayoutRef.current.height;
      const targetSize = fullOverride ? FULL_RETICLE_SIZE : DASH_RETICLE_SIZE;
      const centerLeft = Math.round((stageW - targetSize) / 2);
      const centerTop = fullOverride
        ? Math.round((stageH - targetSize) / 2 - 24)
        : Math.round((stageH - targetSize) / 2);

      if (!animate) {
        reticleLeft.setValue(centerLeft);
        reticleTop.setValue(centerTop);
        reticleSize.setValue(targetSize);
        lockScaleAnim.setValue(1);
        return;
      }

      Animated.parallel([
        Animated.spring(reticleLeft, {
          toValue: centerLeft,
          stiffness: 210,
          damping: 24,
          mass: 0.9,
          useNativeDriver: false,
        }),
        Animated.spring(reticleTop, {
          toValue: centerTop,
          stiffness: 210,
          damping: 24,
          mass: 0.9,
          useNativeDriver: false,
        }),
        Animated.spring(reticleSize, {
          toValue: targetSize,
          stiffness: 210,
          damping: 24,
          mass: 0.9,
          useNativeDriver: false,
        }),
        Animated.spring(lockScaleAnim, {
          toValue: 1,
          stiffness: 220,
          damping: 22,
          mass: 0.85,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [stopReticleMotion, reticleLeft, reticleTop, reticleSize, lockScaleAnim]
  );

  const resetToIdle = useCallback(
    ({ animateReticle = true } = {}) => {
      scanLockRef.current = false;
      setManualLoading(false);
      setManualErrorSource(false);
      setCameraError(null);
      syncScanState('IDLE');
      setStatusCaption('Align QR code inside the frame');
      resetReticle(animateReticle, isFullScannerRef.current);
    },
    [resetReticle, syncScanState]
  );

  // Sync navigation param so bottom tab bar hides in Full Scanner Mode
  useEffect(() => {
    navigation.setParams({ fullScanner: isFullScanner });
  }, [isFullScanner, navigation]);

  const refreshOsCameraPermission = useCallback(async () => {
    try {
      const current = getHookPermission
        ? await getHookPermission()
        : await Camera.getCameraPermissionsAsync();
      if (current) setOsPermission(current);
      return current;
    } catch {
      return null;
    }
  }, [getHookPermission]);

  // Re-check OS permission when returning from device Settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isFocused) {
        refreshOsCameraPermission();
      }
    });
    return () => sub.remove();
  }, [isFocused, refreshOsCameraPermission]);

  // Handle "Open Camera" tap: requests real OS permission if needed, never auto-toggles torch
  const handleOpenCamera = useCallback(async (openFullAfter = false) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { }
    setTorch(false);

    const current = (await refreshOsCameraPermission()) || permission;
    if (!current?.granted) {
      if (current && current.canAskAgain === false) {
        await Linking.openSettings();
        return false;
      }

      const requested = await requestHookPermission();
      if (requested) setOsPermission(requested);
      if (!requested?.granted) {
        return false;
      }
    }

    clearPendingTimers();
    scanLockRef.current = false;
    syncScanState('IDLE');
    setCameraError(null);
    setCameraReady(false);
    cameraOverlayAnim.stopAnimation();
    cameraOverlayAnim.setValue(1);
    setShowConnectingOverlay(true);
    isFullScannerRef.current = openFullAfter;
    setIsFullScanner(openFullAfter);
    resetReticle(false, openFullAfter);
    setCameraKey((k) => k + 1);
    setIsCameraActive(true);
    setStatusCaption('Align QR code inside the frame');
    animateModeReveal();
    return true;
  }, [
    animateModeReveal,
    cameraOverlayAnim,
    clearPendingTimers,
    permission,
    refreshOsCameraPermission,
    requestHookPermission,
    resetReticle,
    syncScanState,
  ]);

  // Keep camera off until user taps "Open Camera"; release hardware & torch on blur
  useFocusEffect(
    useCallback(() => {
      let active = true;
      scanLockRef.current = false;
      scanStateRef.current = 'IDLE';
      setScanState('IDLE');
      setStatusCaption('Align QR code inside the frame');
      setManualErrorSource(false);
      setManualLoading(false);
      setTorch(false);
      setCameraError(null);
      resetReticle(false, isFullScannerRef.current);

      refreshOsCameraPermission().then((perm) => {
        if (!active || !perm) return;
        setOsPermission(perm);
      });

      return () => {
        active = false;
        clearPendingTimers();
        scanLockRef.current = true;
        setIsCameraActive(false);
        setCameraReady(false);
        setShowConnectingOverlay(false);
        isFullScannerRef.current = false;
        setIsFullScanner(false);
        setTorch(false);
      };
    }, [clearPendingTimers, refreshOsCameraPermission, resetReticle])
  );

  const cameraLive = isFocused && Boolean(permission?.granted) && isCameraActive;

  // Restart NativeAnimated loops cleanly every time IDLE live scanning is shown
  // so the laser & corner pulse never freeze after scanning or navigating back.
  const canAnimateScanner =
    isFocused &&
    Boolean(permission?.granted) &&
    isCameraActive &&
    cameraReady &&
    scanState === 'IDLE';

  useEffect(() => {
    if (!canAnimateScanner) {
      scanAnim.stopAnimation();
      cornerAnim.stopAnimation();
      Animated.parallel([
        Animated.timing(laserOpacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(cornerAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
      return undefined;
    }

    scanAnim.setValue(0);
    cornerAnim.setValue(1);
    Animated.timing(laserOpacityAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const cornerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerAnim, {
          toValue: 0.58,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(cornerAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    scanLoop.start();
    cornerLoop.start();

    return () => {
      scanLoop.stop();
      cornerLoop.stop();
    };
  }, [canAnimateScanner, isFullScanner, scanAnim, cornerAnim, laserOpacityAnim]);

  // Smooth fade-out for camera connecting status overlay once live frames begin arriving
  useEffect(() => {
    if (!cameraLive) {
      cameraOverlayAnim.stopAnimation();
      setShowConnectingOverlay(false);
      return;
    }

    if (!cameraReady || cameraError) {
      cameraOverlayAnim.stopAnimation();
      cameraOverlayAnim.setValue(1);
      setShowConnectingOverlay(true);
      return;
    }

    Animated.timing(cameraOverlayAnim, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShowConnectingOverlay(false);
    });
  }, [cameraLive, cameraReady, cameraError, cameraOverlayAnim]);

  // Spring-pop entrance for reticle lock / loading / found chip
  useEffect(() => {
    if (scanState === 'LOCKING' || scanState === 'LOADING' || scanState === 'SUCCESS') {
      statusChipAnim.stopAnimation();
      statusChipAnim.setValue(0.84);
      Animated.spring(statusChipAnim, {
        toValue: 1,
        stiffness: 260,
        damping: 20,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    } else {
      statusChipAnim.setValue(0);
    }
  }, [scanState, statusChipAnim]);

  // Subtle entrance for Found Booking card
  useEffect(() => {
    if (!foundBooking) return;
    foundCardAnim.stopAnimation();
    foundCardAnim.setValue(0);
    Animated.timing(foundCardAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [foundBooking, foundCardAnim]);

  // Subtle idle halo pulse on pre-permission camera icon
  useEffect(() => {
    if (!isFocused || cameraLive) {
      permHaloAnim.stopAnimation();
      permHaloAnim.setValue(1);
      return undefined;
    }

    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(permHaloAnim, {
          toValue: 1.06,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(permHaloAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    haloLoop.start();
    return () => haloLoop.stop();
  }, [isFocused, cameraLive, permHaloAnim]);

  // Scan Again: instant unlock & re-center WITHOUT tearing down camera stream
  const handleScanAgain = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { }
    if (!permission?.granted || !isCameraActive) {
      handleOpenCamera(isFullScannerRef.current);
      return;
    }
    clearPendingTimers();
    resetToIdle({ animateReticle: true });
  };

  // Header Refresh icon: spins icon cleanly and reconnects camera or triggers Open Camera flow
  const handleRestartCamera = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { }
    triggerRefreshSpin();
    if (!permission?.granted || !isCameraActive) {
      handleOpenCamera(isFullScannerRef.current);
      return;
    }
    clearPendingTimers();
    resetToIdle({ animateReticle: false });
    setCameraReady(false);
    cameraOverlayAnim.setValue(1);
    setShowConnectingOverlay(true);
    setTorch(false);
    setIsCameraActive(false);
    const t = setTimeout(() => {
      setCameraKey((k) => k + 1);
      setIsCameraActive(true);
    }, 120);
    timersRef.current.push(t);
  };

  const handleToggleFullScanner = async (nextFull, focusManualAfter = false) => {
    try { Haptics.selectionAsync(); } catch { }

    if (nextFull && (!permission?.granted || !isCameraActive)) {
      await handleOpenCamera(true);
      return;
    }

    clearPendingTimers();
    resetToIdle({ animateReticle: false });
    setCameraReady(false);
    cameraOverlayAnim.setValue(1);
    setShowConnectingOverlay(Boolean(permission?.granted && isCameraActive));
    isFullScannerRef.current = nextFull;
    setIsFullScanner(nextFull);
    resetReticle(false, nextFull);
    animateModeReveal();

    if (permission?.granted && isCameraActive) {
      setIsCameraActive(false);
      const t = setTimeout(() => {
        setCameraKey((k) => k + 1);
        setIsCameraActive(true);
        if (!nextFull && focusManualAfter) {
          focusManualInputAfterTransition();
        }
      }, 120);
      timersRef.current.push(t);
    } else if (!nextFull && focusManualAfter) {
      focusManualInputAfterTransition();
    }
  };

  const processToken = async (token, fromManual = false, settlePromise = null, qrKind = 'unknown') => {
    const epoch = ++lookupEpochRef.current;
    scanLockRef.current = true;
    setManualErrorSource(fromManual);
    if (fromManual) setManualLoading(true);
    setMascotMessage(
      qrKind === 'photographer' ? 'Verifying photographer QR pass...' : 'Retrieving studio session...'
    );

    if (qrKind === 'photographer') {
      if (settlePromise) {
        await settlePromise;
        if (epoch !== lookupEpochRef.current) return;
      }
      syncScanState('LOADING');
      setStatusCaption('Signing in photographer...');
      const phAuth = await loginPhotographerWithQRToken(token);
      if (epoch !== lookupEpochRef.current) return;

      if (phAuth.authorized && phAuth.profile) {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { }
        setManualLoading(false);
        setManualErrorSource(false);
        syncScanState('SUCCESS');
        setStatusCaption('Photographer verified · Opening portal');
        setMascotMessage(`Welcome back, ${phAuth.profile.first_name || phAuth.profile.full_name || 'Photographer'}!`);

        const navTimer = setTimeout(() => {
          if (epoch !== lookupEpochRef.current) return;
          navigation.reset({
            index: 0,
            routes: [{ name: 'PhotographerMain' }],
          });
        }, 380);
        timersRef.current.push(navTimer);
        return;
      }

      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch { }
      setManualLoading(false);
      syncScanState('ERROR');
      setStatusCaption('Photographer pass rejected');
      setMascotMessage(phAuth.reason || 'This photographer QR pass is invalid or inactive.');
      return;
    }

    const lookupPromise = fetchBookingByToken(token);

    if (settlePromise) {
      await settlePromise;
      if (epoch !== lookupEpochRef.current) return;
    }

    syncScanState('LOADING');
    setStatusCaption('Locating studio booking...');

    try {
      const { data: booking, error } = await lookupPromise;
      if (epoch !== lookupEpochRef.current) return;

      if (error || !booking) {
        // Fallback: if unknown raw UUID matched a Photographer QR Token, sign them right in
        if (qrKind === 'unknown' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(token || '').trim())) {
          const phFallback = await loginPhotographerWithQRToken(token);
          if (epoch !== lookupEpochRef.current) return;
          if (phFallback.authorized && phFallback.profile) {
            try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { }
            setManualLoading(false);
            setManualErrorSource(false);
            syncScanState('SUCCESS');
            setStatusCaption('Photographer verified · Opening portal');
            setMascotMessage(`Welcome, ${phFallback.profile.first_name || phFallback.profile.full_name || 'Photographer'}!`);
            const navTimer = setTimeout(() => {
              if (epoch !== lookupEpochRef.current) return;
              navigation.reset({
                index: 0,
                routes: [{ name: 'PhotographerMain' }],
              });
            }, 380);
            timersRef.current.push(navTimer);
            return;
          }
        }

        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch { }
        setManualLoading(false);
        syncScanState('ERROR');
        setStatusCaption(
          fromManual ? 'Booking ID or code not found' : 'Booking not found — tap Scan Again'
        );
        setMascotMessage(
          error?.message ||
          'Could not locate a booking for that pass code or Booking ID. Please check and try again.'
        );
        return;
      }

      const resolvedToken = booking.booking_token || booking.booking_number || booking.id || token;

      // Never block UI navigation on scan telemetry; persist local cache & profile concurrently
      logQRScan({ bookingId: booking.id }).catch(() => { });
      await Promise.all([
        saveBookingToken(resolvedToken, booking),
        saveCustomerProfileFromBooking(booking),
      ]);
      if (epoch !== lookupEpochRef.current) return;

      if (fromManual) {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { }
      }

      setManualLoading(false);
      setManualErrorSource(false);
      setFoundBooking(booking);
      setFoundToken(resolvedToken);
      syncScanState('SUCCESS');
      setStatusCaption('Booking found · Opening tracker');
      setMascotMessage('Pass verified! Loading session...');

      const navTimer = setTimeout(() => {
        if (epoch !== lookupEpochRef.current) return;
        navigation.navigate('BookingTracker', { booking, token: resolvedToken });
      }, 340);
      timersRef.current.push(navTimer);
    } catch (err) {
      if (epoch !== lookupEpochRef.current) return;
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch { }
      setManualLoading(false);
      syncScanState('ERROR');
      setStatusCaption(
        fromManual ? 'Booking ID or code not found' : 'Booking not found — tap Scan Again'
      );
      setMascotMessage(
        err?.message ||
        'Could not locate a booking for that pass code or Booking ID. Please check and try again.'
      );
    }
  };

  const handleScanned = useCallback(
    (scanResult) => {
      if (scanLockRef.current || scanStateRef.current !== 'IDLE') return;
      scanLockRef.current = true;
      setManualErrorSource(false);
      syncScanState('LOCKING');

      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { }

      const stageW = isFullScannerRef.current ? SCREEN_WIDTH : dashLayoutRef.current.width;
      const stageH = isFullScannerRef.current ? SCREEN_HEIGHT : dashLayoutRef.current.height;
      const targetBox = extractQRTargetBox(scanResult, stageW, stageH);

      setStatusCaption('QR detected · Locking onto code...');

      if (targetBox) {
        Animated.parallel([
          Animated.spring(reticleLeft, {
            toValue: targetBox.left,
            stiffness: 240,
            damping: 22,
            mass: 0.8,
            useNativeDriver: false,
          }),
          Animated.spring(reticleTop, {
            toValue: targetBox.top,
            stiffness: 240,
            damping: 22,
            mass: 0.8,
            useNativeDriver: false,
          }),
          Animated.spring(reticleSize, {
            toValue: targetBox.size,
            stiffness: 240,
            damping: 22,
            mass: 0.8,
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.timing(lockScaleAnim, {
              toValue: 1.045,
              duration: 120,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(lockScaleAnim, {
              toValue: 1,
              duration: 150,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      } else {
        Animated.sequence([
          Animated.timing(lockScaleAnim, {
            toValue: 1.06,
            duration: 120,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(lockScaleAnim, {
            toValue: 1,
            duration: 150,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }

      const { valid, token, kind, error } = parseQRPayload(scanResult?.data);
      const minLockPromise = new Promise((resolve) => {
        const lockTimer = setTimeout(resolve, 260);
        timersRef.current.push(lockTimer);
      });

      if (!valid) {
        const epoch = lookupEpochRef.current;
        minLockPromise.then(async () => {
          if (epoch !== lookupEpochRef.current || !scanLockRef.current) return;
          try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch { }
          syncScanState('ERROR');
          setStatusCaption('Invalid studio QR code');
          setMascotMessage(error || 'This QR code is not a valid E-Kodak booking pass.');
        });
        return;
      }

      processToken(token, false, minLockPromise, kind);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncScanState, reticleLeft, reticleTop, reticleSize, lockScaleAnim]
  );

  const handleManualLookup = () => {
    const trimmed = manualToken.trim();
    if (!trimmed || manualLoading) return;
    try { Haptics.selectionAsync(); } catch { }
    RNKeyboard.dismiss();
    const parsed = parseQRPayload(trimmed);
    const tokenToLookup = parsed.valid && parsed.token ? parsed.token : trimmed;
    processToken(tokenToLookup, true, null, parsed.kind || 'unknown');
  };

  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, baseReticleSize - 16],
  });

  const refreshSpinRotate = refreshSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const lockColor =
    scanState === 'SUCCESS' ? '#34D399' :
      scanState === 'ERROR' ? '#EF4444' :
        scanState === 'LOCKING' ? '#F3D27A' :
          colors.gold.DEFAULT;

  const cardGradient =
    gradients?.card ||
    (isDark ? ['#242029', '#151B24'] : ['#FAF2EA', '#E5EEF7']);
  const bezelTopGradient = isDark
    ? ['#242029', '#1D1D27']
    : isSage
      ? ['#FFFFFF', '#F6F8F3']
      : ['#FAF2EA', '#EFEFF3'];
  const bezelLeftGradient = isDark
    ? ['#242029', '#1D1C26']
    : isSage
      ? ['#FFFFFF', '#F4F6F0']
      : ['#FAF2EA', '#F3EFF0'];
  const bezelRightGradient = isDark
    ? ['#1D1D27', '#151B24']
    : isSage
      ? ['#F6F8F3', '#EEF2E9']
      : ['#EFEFF3', '#E5EEF7'];
  const bezelBottomGradient = isDark
    ? ['#1D1C26', '#151B24']
    : isSage
      ? ['#F4F6F0', '#EEF2E9']
      : ['#F3EFF0', '#E5EEF7'];
  const cornerMaskColors = {
    tl: bezelTopGradient[0],
    tr: bezelTopGradient[1],
    bl: bezelBottomGradient[0],
    br: bezelBottomGradient[1],
  };
  const cardBorder = isDark
    ? 'rgba(180, 198, 224, 0.20)'
    : isSage
      ? '#D7DDD1'
      : '#DCDDE6';
  const inputSurface = isDark ? '#12151E' : '#FFFFFF';
  const inputBorder = isDark
    ? 'rgba(180, 198, 224, 0.22)'
    : isSage
      ? '#D0D7C9'
      : '#D5DAE5';

  const renderReticleOverlay = () => (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.reticleOuter,
        {
          left: reticleLeft,
          top: reticleTop,
          width: reticleSize,
          height: reticleSize,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.reticleInner,
          {
            borderColor:
              scanState === 'LOCKING' || scanState === 'SUCCESS'
                ? lockColor
                : 'rgba(255,255,255,0.22)',
            transform: [{ scale: lockScaleAnim }],
          },
        ]}
      >
        <Animated.View style={[styles.smartGrid, { opacity: cornerAnim }]}>
          <View style={[styles.gridLineV, { left: '33.3%', backgroundColor: lockColor }]} />
          <View style={[styles.gridLineV, { left: '66.6%', backgroundColor: lockColor }]} />
          <View style={[styles.gridLineH, { top: '33.3%', backgroundColor: lockColor }]} />
          <View style={[styles.gridLineH, { top: '66.6%', backgroundColor: lockColor }]} />
        </Animated.View>

        {['tl', 'tr', 'bl', 'br'].map((corner) => (
          <Animated.View
            key={corner}
            style={[
              styles.corner,
              styles[`corner_${corner}`],
              {
                borderColor: scanState === 'IDLE' ? '#FFFFFF' : lockColor,
                opacity: cornerAnim,
              },
            ]}
          />
        ))}

        {scanState === 'IDLE' && cameraReady && (
          <Animated.View
            style={[
              styles.scanLineWrapper,
              {
                opacity: laserOpacityAnim,
                transform: [{ translateY: scanTranslateY }],
              },
            ]}
          >
            <LinearGradient
              colors={gradients.gold}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scanLine}
            />
          </Animated.View>
        )}

        {scanState === 'SUCCESS' && (
          <Animated.View
            style={[
              styles.reticleStatusChip,
              {
                opacity: statusChipAnim,
                transform: [{ scale: statusChipAnim }],
              },
            ]}
          >
            <Check size={14} color="#34D399" strokeWidth={2.5} />
            <Text style={styles.reticleStatusText}>Booking found</Text>
          </Animated.View>
        )}

        {(scanState === 'LOCKING' || scanState === 'LOADING') && (
          <Animated.View
            style={[
              styles.reticleStatusChip,
              {
                opacity: statusChipAnim,
                transform: [{ scale: statusChipAnim }],
              },
            ]}
          >
            <StudioShapeLoader size={20} isDark={true} />
            <Text style={styles.reticleStatusText}>
              {scanState === 'LOCKING' ? 'QR Locked' : 'Opening...'}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );

  const renderCameraStatusOverlay = (connectingText, loaderSize = 24) => {
    if (!cameraLive || (!showConnectingOverlay && !cameraError) || scanState !== 'IDLE') {
      return null;
    }

    return (
      <Animated.View
        pointerEvents={cameraReady && !cameraError ? 'none' : 'box-none'}
        style={[styles.cameraStatusOverlay, { opacity: cameraOverlayAnim }]}
      >
        {cameraError ? (
          <View style={styles.statusPrompt}>
            <AlertCircle size={loaderSize > 24 ? 20 : 22} color="#EF4444" />
            <Text style={styles.statusPromptText}>Camera Session Busy</Text>
            <SmoothPressable
              onPress={handleRestartCamera}
              style={styles.retryChip}
              pressScale={0.95}
              activeOpacity={0.8}
            >
              <RotateCcw size={13} color={colors.gold.light} />
              <Text style={styles.retryChipText}>Tap to reconnect</Text>
            </SmoothPressable>
          </View>
        ) : (
          <View style={styles.statusPrompt}>
            <StudioShapeLoader size={loaderSize} isDark={true} />
            <Text style={styles.statusPromptSub}>{connectingText}</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  // ── Mode 1: Full Scanner Mode ───────────────────────────────────────────────
  if (isFullScanner) {
    const fullTopMaskH = Math.max(0, Math.round((SCREEN_HEIGHT - FULL_RETICLE_SIZE) / 2 - 24));
    const fullSideMaskW = Math.max(0, Math.round((SCREEN_WIDTH - FULL_RETICLE_SIZE) / 2));

    return (
      <View style={styles.fullScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {cameraLive ? (
          <CameraView
            key={`full-cam-${cameraKey}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
            }}
            facing="back"
            autofocus="on"
            flash="off"
            enableTorch={cameraLive && torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScanned}
            onCameraReady={() => {
              setCameraReady(true);
              setCameraError(null);
            }}
            onMountError={(err) => {
              console.warn('Camera mount error:', err);
              setCameraError(err?.message || 'Camera preview failed to initialize');
            }}
          />
        ) : null}

        {/* Subtle 4-piece mask framing adjusted full scanner width */}
        <View
          pointerEvents="none"
          style={[styles.fullMask, { top: 0, left: 0, right: 0, height: fullTopMaskH }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.fullMask,
            { top: fullTopMaskH, left: 0, width: fullSideMaskW, height: FULL_RETICLE_SIZE },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.fullMask,
            { top: fullTopMaskH, right: 0, width: fullSideMaskW, height: FULL_RETICLE_SIZE },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.fullMask,
            { top: fullTopMaskH + FULL_RETICLE_SIZE, left: 0, right: 0, bottom: 0 },
          ]}
        />

        {cameraLive && renderReticleOverlay()}

        {/* Camera Connecting / Error Status in Full Mode */}
        {renderCameraStatusOverlay('Activating viewfinder…', 24)}

        {/* Top Useful Utility Icons Bar */}
        <Animated.View
          style={[
            styles.fullTopBar,
            { top: Math.max(insets.top + 10, 22), opacity: modeFadeAnim },
          ]}
        >
          <View style={styles.fullModePill}>
            <View style={styles.fullModeDot} />
            <Text style={styles.fullModeText}>Full QR Scanner</Text>
          </View>

          <View style={styles.fullTopRight}>
            <SmoothPressable
              onPress={handleRestartCamera}
              accessibilityLabel="Refresh camera"
              style={styles.fullTopIconBtn}
              pressScale={0.9}
              activeOpacity={0.75}
            >
              <Animated.View style={{ transform: [{ rotate: refreshSpinRotate }] }}>
                <RotateCcw size={18} color="#FFFFFF" />
              </Animated.View>
            </SmoothPressable>

            <SmoothPressable
              onPress={() => {
                try { Haptics.selectionAsync(); } catch { }
                setTorch((prev) => !prev);
              }}
              accessibilityLabel={torch ? 'Turn flashlight off' : 'Turn flashlight on'}
              style={[
                styles.fullTopIconBtn,
                torch && { borderColor: colors.gold.DEFAULT, backgroundColor: 'rgba(212,175,55,0.22)' },
              ]}
              pressScale={0.9}
              activeOpacity={0.75}
            >
              {torch ? (
                <FlashlightOff size={18} color={colors.gold.light} />
              ) : (
                <Flashlight size={18} color="#FFFFFF" />
              )}
            </SmoothPressable>

            <SmoothPressable
              onPress={() => handleToggleFullScanner(false, true)}
              accessibilityLabel="Enter booking code manually"
              style={styles.fullTopIconBtn}
              pressScale={0.9}
              activeOpacity={0.75}
            >
              <Keyboard size={18} color="#FFFFFF" />
            </SmoothPressable>
          </View>
        </Animated.View>

        {/* Bottom Controls Bar (Navbar is hidden in Full Mode) */}
        <Animated.View
          style={[
            styles.fullBottomBar,
            { bottom: Math.max(insets.bottom + 20, 28), opacity: modeFadeAnim },
          ]}
        >
          <Text style={styles.fullCaption}>{statusCaption}</Text>

          <View style={styles.scanAgainRow}>
            <GoldButton
              onPress={handleScanAgain}
              size="md"
              style={{ flex: 1 }}
            >
              Scan Again
            </GoldButton>

            <SmoothPressable
              onPress={() => handleToggleFullScanner(false)}
              accessibilityLabel="Exit full scanner mode"
              style={styles.expandIconBtn}
              pressScale={0.91}
              activeOpacity={0.8}
            >
              <Minimize2 size={20} color="#F3D27A" strokeWidth={2} />
            </SmoothPressable>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── Mode 2: Scan QR Dashboard Mode ──────────────────────────────────────────
  // Surrounding background panels never wrap behind cameraWindowSlot so Android SurfaceView
  // has an unobstructed window cut when camera is active.
  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg.base}
      />

      {/* ── Pinned Top Floating Glass-Pill Header Strip (Does not overlap cameraWindowSlot) ── */}
      <View
        style={[
          styles.headerWrap,
          {
            backgroundColor: colors.bg.base,
            paddingTop: Math.max(insets.top, 10) + 8,
          },
        ]}
      >
        <GlassBackground />

        <View
          style={[
            styles.headerPillShadow,
            { shadowColor: isDark ? '#000000' : '#4E4332' },
          ]}
        >
          <View
            style={[
              styles.headerPillFrame,
              {
                borderColor: isDark
                  ? 'rgba(180, 198, 224, 0.20)'
                  : 'rgba(255, 255, 255, 0.88)',
              },
            ]}
          >
            <LinearGradient
              colors={
                isDark
                  ? ['#242029', '#151B24']
                  : ['rgba(255, 253, 250, 0.94)', 'rgba(241, 246, 252, 0.90)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255, 255, 255, 0.14)', 'transparent']
                  : ['rgba(255, 255, 255, 0.96)', 'transparent']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.headerSpecular}
              pointerEvents="none"
            />

            <View style={styles.headerRow}>
              <View style={styles.headerTitleCol}>
                <Text style={[styles.pageTitle, { color: colors.text.primary }]} numberOfLines={1}>
                  Scan Booking QR
                </Text>
                <Text style={[styles.pageSubtitle, { color: colors.text.secondary }]} numberOfLines={1}>
                  Point camera at your QR code.
                </Text>
              </View>

              <View style={styles.headerActions}>
                <SmoothPressable
                  onPress={handleRestartCamera}
                  accessibilityLabel="Refresh camera scanner"
                  style={[
                    styles.headerIconBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(220, 221, 230, 0.85)',
                    },
                  ]}
                  pressScale={0.9}
                  activeOpacity={0.75}
                >
                  <Animated.View style={{ transform: [{ rotate: refreshSpinRotate }] }}>
                    <RotateCcw size={18} color={colors.text.primary} strokeWidth={2} />
                  </Animated.View>
                </SmoothPressable>

                <SmoothPressable
                  disabled={!cameraLive}
                  onPress={() => {
                    if (!cameraLive) return;
                    try { Haptics.selectionAsync(); } catch { }
                    setTorch((prev) => !prev);
                  }}
                  accessibilityLabel={torch ? 'Turn flashlight off' : 'Turn flashlight on'}
                  style={[
                    styles.headerIconBtn,
                    {
                      backgroundColor: torch && cameraLive
                        ? colors.gold.bg
                        : isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : '#EFECE6',
                      borderColor: torch && cameraLive
                        ? colors.gold.DEFAULT
                        : isDark
                          ? 'rgba(255, 255, 255, 0.14)'
                          : 'rgba(218, 214, 206, 0.85)',
                      opacity: cameraLive ? 1 : 0.62,
                    },
                  ]}
                  pressScale={0.9}
                  activeOpacity={0.75}
                >
                  {torch && cameraLive ? (
                    <FlashlightOff size={18} color={colors.gold.DEFAULT} strokeWidth={2} />
                  ) : (
                    <Flashlight size={18} color={colors.text.secondary} strokeWidth={2} />
                  )}
                </SmoothPressable>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ── Scrollable Dashboard Body (Scanner Card + Booking ID Search scroll smoothly together) ── */}
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={styles.mainScrollContent}
          removeClippedSubviews={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          onLayout={(e) => {
            const nextH = e.nativeEvent.layout.height;
            scrollViewHeightRef.current = nextH;
            if (!isKeyboardOpenRef.current) {
              baseScrollHeightRef.current = nextH;
            }
          }}
        >
          {/* ── Prioritized Large Scanner Frame Row (Zero background behind cameraWindowSlot) ── */}
          <View style={styles.scannerBandRow}>
            {/* Outer left margin in theme bg */}
            <View style={[styles.outerMarginStrip, { backgroundColor: colors.bg.base }]} />

            <View style={styles.bezelFrame}>
              <View style={[styles.bezelTop, { borderColor: cardBorder }]}>
                <LinearGradient
                  colors={bezelTopGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              <View style={styles.bezelMiddleRow}>
                <View style={[styles.bezelSideLeft, { borderColor: cardBorder }]}>
                  <LinearGradient
                    colors={bezelLeftGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>

                <View
                  style={styles.cameraWindowSlot}
                  onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    if (width > 0 && height > 0) {
                      dashLayoutRef.current = { width, height };
                      setDashLayout((prev) => {
                        if (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
                          return prev;
                        }
                        return { width, height };
                      });
                      if (scanStateRef.current === 'IDLE' && !isFullScannerRef.current) {
                        reticleLeft.setValue(Math.round((width - DASH_RETICLE_SIZE) / 2));
                        reticleTop.setValue(Math.round((height - DASH_RETICLE_SIZE) / 2));
                        reticleSize.setValue(DASH_RETICLE_SIZE);
                      }
                    }
                  }}
                >
                  {cameraLive ? (
                    <CameraView
                      key={`dash-cam-${cameraKey}`}
                      style={{ width: activeStageW, height: DASH_STAGE_HEIGHT }}
                      facing="back"
                      autofocus="on"
                      flash="off"
                      enableTorch={cameraLive && torch}
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={handleScanned}
                      onCameraReady={() => {
                        setCameraReady(true);
                        setCameraError(null);
                      }}
                      onMountError={(err) => {
                        console.warn('Camera mount error:', err);
                        setCameraError(err?.message || 'Camera preview failed to initialize');
                      }}
                    />
                  ) : (
                    /* Explicit "Open Camera" gate — requests OS permission on tap, never opens directly */
                    <LinearGradient
                      colors={cardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.consentNoticeBox}
                    >
                      <CardDecorElements variant="hero" isDark={isDark} />

                      <Animated.View
                        style={[
                          styles.permIconCircle,
                          {
                            backgroundColor: colors.gold.bg,
                            borderColor: colors.gold.borderLight,
                            transform: [{ scale: permHaloAnim }],
                          },
                        ]}
                      >
                        <CameraIcon size={28} color={colors.gold.DEFAULT} strokeWidth={1.8} />
                      </Animated.View>

                      <Text style={[styles.permTitle, { color: colors.text.primary }]}>
                        {permission && !permission.granted ? 'Camera Access Required' : 'Camera Scanner'}
                      </Text>
                      <Text style={[styles.permSub, { color: colors.text.secondary }]}>
                        {permission?.canAskAgain === false
                          ? 'Enable camera permission in device settings to scan.'
                          : 'Tap below to allow camera access and scan your QR.'}
                      </Text>

                      <GoldButton
                        onPress={() => handleOpenCamera(false)}
                        size="md"
                        icon={CameraIcon}
                        style={{ marginTop: 18, minWidth: 196 }}
                      >
                        {permission?.canAskAgain === false ? 'Open Settings' : 'Open Camera'}
                      </GoldButton>
                    </LinearGradient>
                  )}

                  {cameraLive && (
                    <>
                      {CAMERA_CORNER_MASKS.map(({ key, pos, d }) => (
                        <View
                          key={key}
                          pointerEvents="none"
                          style={[
                            styles.cameraCornerMask,
                            pos,
                          ]}
                        >
                          <Svg
                            width={CAMERA_CORNER_RADIUS}
                            height={CAMERA_CORNER_RADIUS}
                            viewBox={`0 0 ${CAMERA_CORNER_RADIUS} ${CAMERA_CORNER_RADIUS}`}
                          >
                            <Path d={d} fill={cornerMaskColors[key]} />
                          </Svg>
                        </View>
                      ))}
                      <View
                        pointerEvents="none"
                        style={[styles.windowHairlineBorder, { borderColor: cardBorder }]}
                      />
                    </>
                  )}

                  {cameraLive && renderReticleOverlay()}

                  {renderCameraStatusOverlay('Starting camera preview…', 26)}
                </View>

                <View style={[styles.bezelSideRight, { borderColor: cardBorder }]}>
                  <LinearGradient
                    colors={bezelRightGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.bezelBottom,
                  { borderColor: cardBorder },
                  !cameraLive && { paddingTop: 4, paddingBottom: 10 },
                ]}
              >
                <LinearGradient
                  colors={bezelBottomGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {cameraLive && (
                  <>
                    <Text style={[styles.stageCaption, { color: colors.text.secondary }]}>
                      {statusCaption}
                    </Text>

                    <View style={styles.scanAgainRow}>
                      <GoldButton
                        onPress={handleScanAgain}
                        size="md"
                        style={{ flex: 1 }}
                      >
                        Scan Again
                      </GoldButton>

                      <SmoothPressable
                        onPress={() => handleToggleFullScanner(true)}
                        accessibilityLabel="Open full scanner mode"
                        style={[
                          styles.expandIconBtn,
                          {
                            backgroundColor: colors.gold.bg,
                            borderColor: colors.gold.borderLight,
                          },
                        ]}
                        pressScale={0.91}
                        activeOpacity={0.8}
                      >
                        <Maximize2 size={20} color={colors.gold.DEFAULT} strokeWidth={2} />
                      </SmoothPressable>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Outer right margin in theme bg */}
            <View style={[styles.outerMarginStrip, { backgroundColor: colors.bg.base }]} />
          </View>

          {/* ── Lower Section (Themed GlassBackground + Inline Code / Booking ID Search & Found Booking) ── */}
          <View
            style={[
              styles.lowerRegion,
              {
                backgroundColor: colors.bg.base,
                paddingBottom: Math.max(
                  insets.bottom + 112,
                  androidKeyboardInset > 0 ? androidKeyboardInset : 122
                ),
              },
            ]}
          >
            <GlassBackground />
            <View style={styles.lowerContentInner}>
              {foundBooking && (
                <Animated.View
                  style={{
                    opacity: foundCardAnim,
                    transform: [
                      {
                        translateY: foundCardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <LinearGradient
                    colors={cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.foundCard, { borderColor: cardBorder }]}
                  >
                    <CardDecorElements variant="recent" isDark={isDark} />
                    <View style={styles.foundCardRow}>
                      <View style={styles.foundLogoBox}>
                        <Image source={E_KODAK_LOGO} style={styles.foundLogoImg} resizeMode="contain" />
                      </View>

                      <View style={styles.foundInfo}>
                        <Text style={[styles.foundTitle, { color: colors.text.primary }]}>
                          Booking Found
                        </Text>
                        <Text
                          style={[styles.foundSub, { color: colors.text.secondary }]}
                          numberOfLines={2}
                        >
                          {foundBooking.booking_number ? `#${foundBooking.booking_number} · ` : ''}
                          {foundBooking.tier_name || foundBooking.package_name || 'Studio Session'}
                          {foundBooking.status ? ` · ${foundBooking.status}` : ''}
                        </Text>
                      </View>

                      <SmoothPressable
                        onPress={() =>
                          navigation.navigate('BookingTracker', {
                            booking: foundBooking,
                            token: foundToken,
                          })
                        }
                        style={[
                          styles.viewBookingBtn,
                          { backgroundColor: isDark ? colors.gold.DEFAULT : '#181410' },
                        ]}
                        pressScale={0.95}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.viewBookingBtnText,
                            { color: isDark ? '#181410' : '#FFFFFF' },
                          ]}
                        >
                          View Booking
                        </Text>
                      </SmoothPressable>
                    </View>
                  </LinearGradient>
                </Animated.View>
              )}

              <Text style={[styles.orLabel, { color: colors.text.primary }]}>
                Manual Lookup
              </Text>

              <LinearGradient
                colors={cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.manualCard, { borderColor: cardBorder }]}
              >
                <CardDecorElements variant="tool" isDark={isDark} />

                <View style={styles.manualCardHeader}>
                  <Text style={[styles.manualCardTitle, { color: colors.text.primary }]}>
                    Enter Booking ID
                  </Text>
                </View>

                <Text style={[styles.manualDirection, { color: colors.text.secondary }]}>
                  Find your Booking ID (e.g. BK-2026-00001) under Order Reference on your studio pass, then enter it below.
                </Text>

                <View
                  style={[
                    styles.codeInputWrap,
                    {
                      backgroundColor: inputSurface,
                      borderColor: inputBorder,
                    },
                  ]}
                >
                  <TextInput
                    ref={codeInputRef}
                    style={[styles.codeInputField, { color: colors.text.primary }]}
                    placeholder="BK-2026-00001"
                    placeholderTextColor={colors.text.muted}
                    value={manualToken}
                    onChangeText={setManualToken}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    onFocus={() => {
                      isCodeInputFocusedRef.current = true;
                      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 140);
                    }}
                    onBlur={() => {
                      isCodeInputFocusedRef.current = false;
                    }}
                    onSubmitEditing={handleManualLookup}
                  />

                  {manualToken.length > 0 && (
                    <SmoothPressable
                      onPress={() => setManualToken('')}
                      accessibilityLabel="Clear Booking ID"
                      style={styles.clearInputBtn}
                      pressScale={0.88}
                      activeOpacity={0.7}
                    >
                      <X size={16} color={colors.text.muted} />
                    </SmoothPressable>
                  )}
                </View>

                <GoldButton
                  variant="primary"
                  size="md"
                  loading={manualLoading}
                  disabled={!manualToken.trim()}
                  onPress={handleManualLookup}
                  icon={Search}
                  style={styles.findBookingBtn}
                >
                  Find Your Booking
                </GoldButton>
              </LinearGradient>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Error Feedback Modal ── */}
      <Modal
        visible={scanState === 'ERROR'}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => resetToIdle({ animateReticle: true })}
      >
        <BlurView
          intensity={isDark ? 75 : 50}
          tint={isDark ? 'dark' : 'light'}
          style={styles.mascotBlurFill}
        >
          <View
            style={[
              styles.mascotResultCard,
              {
                backgroundColor: isDark ? 'rgba(20, 22, 30, 0.96)' : 'rgba(255, 255, 255, 0.98)',
                borderColor: cardBorder,
              },
            ]}
          >
            <View style={styles.errorStatusChip}>
              <View style={styles.errorStatusDot} />
              <Text style={styles.errorStatusLabel}>
                {manualErrorSource ? 'BOOKING NOT FOUND' : 'SCAN FAILED'}
              </Text>
            </View>

            <StudioMascotKit
              pose="waiting"
              size={148}
              speechText={null}
              interactive={false}
            />

            <Text style={[styles.scanResultMessage, { color: colors.text.primary }]}>
              {mascotMessage}
            </Text>

            <View style={styles.scanErrorActions}>
              <GoldButton
                onPress={() => {
                  const wasManual = manualErrorSource;
                  resetToIdle({ animateReticle: true });
                  if (wasManual) {
                    focusManualInputAfterTransition();
                  }
                }}
                icon={manualErrorSource ? Search : RotateCcw}
                size="md"
              >
                {manualErrorSource ? 'Try Another Booking ID' : 'Try Again'}
              </GoldButton>

              {!manualErrorSource && (
                <SmoothPressable
                  onPress={() => {
                    resetToIdle({ animateReticle: true });
                    focusManualInputAfterTransition();
                  }}
                  style={[styles.dismissErrorBtn, { borderColor: cardBorder }]}
                  pressScale={0.96}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dismissErrorText, { color: colors.text.secondary }]}>
                    Enter Booking ID below
                  </Text>
                  <ChevronRight size={15} color={colors.text.muted} />
                </SmoothPressable>
              )}
            </View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerWrap: {
    paddingHorizontal: Spacing[4],
    paddingBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  headerPillShadow: {
    zIndex: 1,
    borderRadius: 28,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  headerPillFrame: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  headerSpecular: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
  },
  mainScrollContent: {
    flexGrow: 1,
  },
  scannerBandRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  outerMarginStrip: {
    width: Spacing[4],
  },
  lowerRegion: {
    flexGrow: 1,
    overflow: 'hidden',
  },
  lowerContentInner: {
    zIndex: 1,
    paddingHorizontal: Spacing[4],
    paddingTop: 14,
    gap: 10,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 1,
  },
  headerTitleCol: {
    flex: 1,
  },
  pageTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.35,
    includeFontPadding: false,
  },
  pageSubtitle: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    includeFontPadding: false,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },

  // Gradient Bezel Frame wrapping unobstructed camera slot
  bezelFrame: {
    flex: 1,
  },
  bezelTop: {
    height: 10,
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  bezelMiddleRow: {
    height: DASH_STAGE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  bezelSideLeft: {
    width: 10,
    overflow: 'hidden',
    borderLeftWidth: 1,
  },
  bezelSideRight: {
    width: 10,
    overflow: 'hidden',
    borderRightWidth: 1,
  },
  cameraWindowSlot: {
    flex: 1,
    height: DASH_STAGE_HEIGHT,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  cameraCornerMask: {
    position: 'absolute',
    width: CAMERA_CORNER_RADIUS,
    height: CAMERA_CORNER_RADIUS,
    zIndex: 2,
  },
  windowHairlineBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CAMERA_CORNER_RADIUS,
    borderWidth: 1,
    zIndex: 3,
  },
  bezelBottom: {
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },

  // Camera Gate Card inside viewfinder before opening camera
  consentNoticeBox: {
    flex: 1,
    borderRadius: CAMERA_CORNER_RADIUS,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  permIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  permTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: 18,
    lineHeight: 23,
    textAlign: 'center',
    includeFontPadding: false,
  },
  permSub: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 260,
    includeFontPadding: false,
  },

  // Smart Dynamic QR Reticle
  reticleOuter: {
    position: 'absolute',
    zIndex: 4,
  },
  reticleInner: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineV: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    width: 1,
    opacity: 0.28,
  },
  gridLineH: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 1,
    opacity: 0.28,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  corner_tl: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 14,
  },
  corner_tr: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 14,
  },
  corner_bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 14,
  },
  corner_br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 14,
  },
  scanLineWrapper: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 3,
    top: 0,
  },
  scanLine: {
    height: 3,
    borderRadius: 2,
  },
  reticleStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(14, 14, 16, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  reticleStatusText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 12,
    color: '#FFFFFF',
  },

  // Camera connecting/error status inside stage
  cameraStatusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  statusPrompt: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(13, 11, 9, 0.78)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  statusPromptText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 12.5,
    color: '#FAFAF8',
  },
  statusPromptSub: {
    fontFamily: Typography.fontBody,
    fontSize: 11.5,
    color: '#C7BFB2',
  },
  retryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(201, 169, 110, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 110, 0.4)',
    marginTop: 2,
  },
  retryChipText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 11.5,
    color: '#E8D5B0',
  },

  stageCaption: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 12.5,
    color: '#D8D1C4',
    textAlign: 'center',
    marginBottom: 10,
  },
  scanAgainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expandIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(243, 210, 122, 0.12)',
    borderWidth: 1.2,
    borderColor: 'rgba(243, 210, 122, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Full Scanner Mode
  fullScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullMask: {
    position: 'absolute',
    backgroundColor: 'rgba(10, 9, 7, 0.54)',
  },
  fullTopBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 15,
  },
  fullTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullTopIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(20, 18, 15, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(243, 210, 122, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(20, 18, 15, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(243, 210, 122, 0.3)',
  },
  fullModeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F3D27A',
  },
  fullModeText: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  fullBottomBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(18, 16, 14, 0.9)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(243, 210, 122, 0.32)',
    padding: 14,
    zIndex: 15,
  },
  fullCaption: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 12.5,
    color: '#E6DFD3',
    textAlign: 'center',
    marginBottom: 10,
  },

  // Found Booking Card
  foundCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    overflow: 'hidden',
    ...Shadow.card,
  },
  foundCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foundLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  foundLogoImg: {
    width: 36,
    height: 36,
  },
  foundInfo: {
    flex: 1,
  },
  foundTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: 15.5,
    lineHeight: 20,
    includeFontPadding: false,
  },
  foundSub: {
    fontFamily: Typography.fontBody,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
    includeFontPadding: false,
  },
  viewBookingBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  viewBookingBtnText: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 12,
    includeFontPadding: false,
  },

  // Compact Inline Manual Entry Card
  orLabel: {
    fontFamily: Typography.fontHeading,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: -0.25,
    marginTop: 6,
    marginBottom: 0,
    paddingHorizontal: 2,
    includeFontPadding: false,
  },
  manualCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    overflow: 'hidden',
    shadowColor: '#2B313E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  manualCardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  manualCardTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  manualDirection: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    includeFontPadding: false,
  },
  codeInputWrap: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeInputField: {
    flex: 1,
    fontFamily: Typography.fontBodyMedium,
    fontSize: 14,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  clearInputBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findBookingBtn: {
    width: '100%',
  },

  // Error Overlay Modal
  mascotBlurFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 48,
    paddingHorizontal: Spacing[5],
  },
  mascotResultCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    paddingTop: Spacing[5],
    paddingBottom: Spacing[6],
    paddingHorizontal: Spacing[6],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
  },
  errorStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginBottom: Spacing[2],
  },
  errorStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  errorStatusLabel: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#EF4444',
  },
  scanResultMessage: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.base,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[2],
  },
  scanErrorActions: {
    width: '100%',
    gap: 10,
    marginTop: Spacing[5],
  },
  dismissErrorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 11,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  dismissErrorText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 13,
  },
});
