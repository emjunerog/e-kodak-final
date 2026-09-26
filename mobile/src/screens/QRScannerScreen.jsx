/**
 * QRScannerScreen.jsx
 * Perfectly centered studio QR pass scanner.
 * Features:
 * - Direct CameraView mounting with dynamic key-remount on focus
 * - Hardware session recovery for Android Expo Go
 * - Explicit width & height layout bounding
 * - Visual camera activation status & tap-to-retry
 * - Centered 4-piece mask overlay & animated gold scanline
 * - 1-tap "Scan Sample Booking Pass" test trigger
 * - Full light mode & dark mode support via ThemeContext
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  QrCode, X, Flashlight, FlashlightOff, Keyboard, ChevronRight,
  RotateCcw, Sparkles, Camera as CameraIcon, AlertCircle,
} from 'lucide-react-native';

import { parseQRPayload, fetchBookingByToken, logQRScan } from '../services/bookingService';
import { saveBookingToken, saveCustomerProfileFromBooking } from '../services/storageService';
import GoldButton from '../components/GoldButton';
import StudioMascotKit from '../components/StudioMascotKit';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius, Shadow } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const RETICLE_SIZE = Math.min(SCREEN_WIDTH * 0.74, 280);
const RETICLE_TOP  = Math.round((SCREEN_HEIGHT - RETICLE_SIZE) / 2 - 30);
const RETICLE_LEFT = Math.round((SCREEN_WIDTH - RETICLE_SIZE) / 2);

const CORNER_SIZE = 26;
const CORNER_WIDTH = 3.5;

export default function QRScannerScreen({ navigation }) {
  const { isDark, colors, gradients } = useTheme();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();

  const [torch, setTorch]               = useState(false);
  const [scanning, setScanning]         = useState(true);
  const [loading, setLoading]           = useState(false);
  const [cameraReady, setCameraReady]   = useState(false);
  const [cameraError, setCameraError]   = useState(null);
  const [cameraKey, setCameraKey]       = useState(1);

  const [manualVisible, setManualVisible] = useState(false);
  const [manualToken, setManualToken]   = useState('');

  const [scanState, setScanState]       = useState('IDLE'); // 'IDLE' | 'LOADING' | 'ERROR' | 'SUCCESS'
  const [mascotMessage, setMascotMessage] = useState('');

  // Animated gold laser scanline
  const scanAnim = useRef(new Animated.Value(0)).current;
  const cornerAnim = useRef(new Animated.Value(1)).current;

  // Dynamic QR Tracking Reticle
  const reticleX = useRef(new Animated.Value(RETICLE_LEFT)).current;
  const reticleY = useRef(new Animated.Value(RETICLE_TOP)).current;
  const reticleW = useRef(new Animated.Value(RETICLE_SIZE)).current;
  const reticleH = useRef(new Animated.Value(RETICLE_SIZE)).current;

  const [isCameraActive, setIsCameraActive] = useState(false);

  // Cleanly mount/unmount camera on focus to prevent hardware deadlocks on Android
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const t = setTimeout(() => {
        if (active) {
          setIsCameraActive(true);
          setCameraReady(false);
          setCameraError(null);
          setScanning(true);
          setScanState('IDLE');
          resetReticle();
        }
      }, 250);
      return () => {
        active = false;
        setIsCameraActive(false);
        clearTimeout(t);
      };
    }, [])
  );

  // Auto request permission on mount if needed
  useEffect(() => {
    if (isFocused && (!permission || (!permission.granted && permission.canAskAgain))) {
      requestPermission();
    }
  }, [isFocused, permission]);

  useEffect(() => {
    startScanAnimation();
  }, []);

  const startScanAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: false,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: false,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(cornerAnim, { toValue: 0.35, duration: 1100, useNativeDriver: true }),
        Animated.timing(cornerAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ])
    ).start();
  };

  const resetReticle = () => {
    Animated.parallel([
      Animated.timing(reticleX, { toValue: RETICLE_LEFT, duration: 400, useNativeDriver: false }),
      Animated.timing(reticleY, { toValue: RETICLE_TOP, duration: 400, useNativeDriver: false }),
      Animated.timing(reticleW, { toValue: RETICLE_SIZE, duration: 400, useNativeDriver: false }),
      Animated.timing(reticleH, { toValue: RETICLE_SIZE, duration: 400, useNativeDriver: false }),
    ]).start();
  };

  const scanLineY = Animated.multiply(scanAnim, Animated.subtract(reticleH, 4));

  const handleRestartCamera = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setCameraReady(false);
    setCameraError(null);
    setScanState('IDLE');
    setScanning(true);
    resetReticle();
    setIsCameraActive(false);
    setTimeout(() => setIsCameraActive(true), 300);
  };

  const handleScanned = async ({ data, bounds }) => {
    if (!scanning || loading || scanState === 'LOADING') return;
    setScanning(false);
    setScanState('LOADING');
    setMascotMessage('Analyzing QR payload...');

    // Animate bounding box to exactly wrap the real-world QR code
    if (bounds && bounds.origin && bounds.size) {
      Animated.parallel([
        Animated.spring(reticleX, { toValue: bounds.origin.x - 10, useNativeDriver: false }),
        Animated.spring(reticleY, { toValue: bounds.origin.y - 10, useNativeDriver: false }),
        Animated.spring(reticleW, { toValue: bounds.size.width + 20, useNativeDriver: false }),
        Animated.spring(reticleH, { toValue: bounds.size.height + 20, useNativeDriver: false }),
      ]).start();
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    // Brief delay to allow the lock-on animation to play before processing
    setTimeout(async () => {
      const { valid, token, error } = parseQRPayload(data);
      if (!valid) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
        setScanState('ERROR');
        setMascotMessage(error || 'This QR code is not a valid E-Kodak booking pass.');
        return;
      }
      await processToken(token);
    }, 700);
  };

  const processToken = async (token) => {
    setScanning(false);
    setScanState('LOADING');
    setMascotMessage('Retrieving studio session...');

    const { data: booking, error } = await fetchBookingByToken(token);

    if (error || !booking) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setScanState('ERROR');
      setMascotMessage(error?.message || 'Could not locate a booking for this pass token. Please try again.');
      return;
    }

    await logQRScan({ bookingId: booking.id });
    await saveBookingToken(token, booking);
    await saveCustomerProfileFromBooking(booking);

    setScanState('SUCCESS');
    setMascotMessage('Pass verified! Loading session...');
    
    setTimeout(() => {
      navigation.replace('BookingTracker', { booking, token });
    }, 1200);
  };

  const maskColor = isDark ? 'rgba(13, 11, 9, 0.72)' : 'rgba(24, 20, 16, 0.65)';

  // ── Permission Not Granted View ──────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <View style={[styles.screenContainer, { backgroundColor: colors.bg.base }, styles.centered]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg.base} />
        
        <View style={[styles.permIconRing, { backgroundColor: colors.gold.bg, borderColor: colors.gold.border }]}>
          <QrCode size={52} color={colors.gold.DEFAULT} strokeWidth={1.25} />
        </View>

        <Text style={[styles.permTitle, { color: colors.text.primary }]}>Camera Access Required</Text>
        <Text style={[styles.permBody, { color: colors.text.secondary }]}>
          E-Kodak needs camera access to scan your studio pass and track your shoot progress in real time.
        </Text>

        <GoldButton
          onPress={() => requestPermission()}
          style={{ marginTop: Spacing[6], minWidth: 220 }}
        >
          Enable Camera Access
        </GoldButton>

        <TouchableOpacity
          onPress={() => setManualVisible(true)}
          style={[styles.manualFallbackBtn, { borderColor: colors.gold.border }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.manualFallbackText, { color: colors.gold.light }]}>Enter Pass Code Manually</Text>
        </TouchableOpacity>

        {/* Manual Pass Modal */}
        <Modal
          visible={manualVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setManualVisible(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.bg.overlay }]}>
            <View style={[styles.modalCard, { backgroundColor: colors.bg.card, borderColor: colors.gold.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Enter Pass Token</Text>
              <Text style={[styles.modalDesc, { color: colors.text.secondary }]}>
                Enter the alphanumeric code printed below the QR code on your reception pass.
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.bg.input, color: colors.text.primary, borderColor: colors.gold.border }]}
                placeholder="e.g. EK-892147"
                placeholderTextColor={colors.text.muted}
                value={manualToken}
                onChangeText={setManualToken}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setManualVisible(false)}
                  style={styles.modalCancel}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text.secondary }]}>Cancel</Text>
                </TouchableOpacity>
                <GoldButton
                  onPress={() => {
                    if (!manualToken.trim()) return;
                    setManualVisible(false);
                    processToken(manualToken.trim().toUpperCase());
                  }}
                  size="sm"
                >
                  Verify Pass
                </GoldButton>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ── Camera Scanner View ──────────────────────────────────────────────────
  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.bg.base }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0B09" />

      {/* Full-bleed Camera View mounted cleanly */}
      {isCameraActive && (
        <CameraView
          style={[
            StyleSheet.absoluteFillObject,
            { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
          ]}
          facing="back"
          mode="picture"
          autofocus="on"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanning && !loading ? handleScanned : undefined}
          onCameraReady={() => {
            setCameraReady(true);
            setCameraError(null);
          }}
          onMountError={(err) => {
            console.warn('Camera mount error:', err);
            setCameraError(err?.message || 'Camera preview failed to initialize');
          }}
        />
      )}

      {/* ── Airtight Animated 4-Piece Mask ── */}
      <Animated.View style={[styles.maskBlock, { backgroundColor: maskColor, top: 0, left: 0, right: 0, height: reticleY }]} />
      <Animated.View style={[styles.maskBlock, { backgroundColor: maskColor, top: reticleY, left: 0, width: reticleX, height: reticleH }]} />
      <Animated.View style={[styles.maskBlock, { backgroundColor: maskColor, top: reticleY, right: 0, left: Animated.add(reticleX, reticleW), height: reticleH }]} />
      <Animated.View style={[styles.maskBlock, { backgroundColor: maskColor, top: Animated.add(reticleY, reticleH), left: 0, right: 0, bottom: 0 }]} />

      {/* ── Dynamic Reticle Frame ── */}
      <Animated.View
        style={[
          styles.reticle,
          {
            top: reticleY,
            left: reticleX,
            width: reticleW,
            height: reticleH,
          },
        ]}
      >
        {/* Animated Gold Corner Brackets */}
        {['tl', 'tr', 'bl', 'br'].map((corner) => (
          <Animated.View
            key={corner}
            style={[
              styles.corner,
              styles[`corner_${corner}`],
              { borderColor: colors.gold.DEFAULT, opacity: cornerAnim },
            ]}
          />
        ))}

        {/* Animated Gold Laser Scanline */}
        <Animated.View
          style={[styles.scanLineWrapper, { transform: [{ translateY: scanLineY }] }]}
        >
          <LinearGradient
            colors={gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scanLine}
          />
        </Animated.View>

        {/* Camera Connecting/Error State in Reticle */}
        {!cameraReady && scanState === 'IDLE' && (
          <View style={styles.cameraStatusOverlay}>
            {cameraError ? (
              <View style={styles.statusPrompt}>
                <AlertCircle size={24} color="#EF4444" />
                <Text style={styles.statusPromptText}>Camera Session Busy</Text>
                <TouchableOpacity
                  onPress={handleRestartCamera}
                  style={styles.retryChip}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={14} color={colors.gold.light} />
                  <Text style={styles.retryChipText}>Tap to reconnect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.statusPrompt}>
                <ActivityIndicator size="small" color={colors.gold.light} />
                <Text style={styles.statusPromptSub}>Activating viewfinder…</Text>
              </View>
            )}
          </View>
        )}

      </Animated.View>

      {/* ── Mascot Result Overlay (Full Screen Blur + Slide-Up Card) ── */}
      <Modal
        visible={scanState !== 'IDLE'}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <BlurView
          intensity={isDark ? 75 : 50}
          tint={isDark ? 'dark' : 'light'}
          style={styles.mascotBlurFill}
        >
          {/* Slide-up result card */}
          <View style={[
            styles.mascotResultCard,
            { backgroundColor: isDark ? 'rgba(20,16,12,0.96)' : 'rgba(255,253,248,0.97)', borderColor: colors.gold.border },
          ]}>

            {/* Status Chip */}
            <View style={[
              styles.scanStatusChip,
              {
                backgroundColor:
                  scanState === 'SUCCESS' ? 'rgba(52,211,153,0.15)' :
                  scanState === 'ERROR'   ? 'rgba(239,68,68,0.12)'  :
                                            'rgba(212,175,55,0.12)',
                borderColor:
                  scanState === 'SUCCESS' ? 'rgba(52,211,153,0.45)' :
                  scanState === 'ERROR'   ? 'rgba(239,68,68,0.35)'  :
                                            colors.gold.border,
              },
            ]}>
              <View style={[
                styles.scanStatusDot,
                {
                  backgroundColor:
                    scanState === 'SUCCESS' ? '#34D399' :
                    scanState === 'ERROR'   ? '#EF4444' :
                                             colors.gold.DEFAULT,
                },
              ]} />
              <Text style={[
                styles.scanStatusLabel,
                {
                  color:
                    scanState === 'SUCCESS' ? '#34D399' :
                    scanState === 'ERROR'   ? '#EF4444' :
                                             colors.gold.light,
                },
              ]}>
                {scanState === 'SUCCESS' ? 'PASS VERIFIED' :
                 scanState === 'ERROR'   ? 'SCAN FAILED'   :
                                          'VERIFYING PASS'}
              </Text>
            </View>

            {/* Mascot — no speech bubble, message shown below */}
            <StudioMascotKit
              pose={
                scanState === 'SUCCESS' ? 'celebrate' :
                scanState === 'ERROR'   ? 'waiting'   :
                                         'inspect'
              }
              size={180}
              speechText={null}
              interactive={false}
            />

            {/* Message */}
            <Text style={[styles.scanResultMessage, { color: colors.text.primary }]}>
              {mascotMessage}
            </Text>

            {/* Loading indicator */}
            {scanState === 'LOADING' && (
              <View style={styles.scanLoadingRow}>
                <ActivityIndicator size="small" color={colors.gold.DEFAULT} />
                <Text style={[styles.scanLoadingText, { color: colors.text.secondary }]}>
                  Connecting to studio database...
                </Text>
              </View>
            )}

            {/* Success auto-nav hint */}
            {scanState === 'SUCCESS' && (
              <View style={styles.scanLoadingRow}>
                <ActivityIndicator size="small" color="#34D399" />
                <Text style={[styles.scanLoadingText, { color: '#34D399' }]}>
                  Opening your session...
                </Text>
              </View>
            )}

            {/* Error Actions */}
            {scanState === 'ERROR' && (
              <View style={styles.scanErrorActions}>
                <TouchableOpacity
                  style={[styles.scanRetryBtn, { backgroundColor: colors.gold.DEFAULT }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setScanState('IDLE');
                    setScanning(true);
                    resetReticle();
                  }}
                >
                  <RotateCcw size={15} color="#1E1711" />
                  <Text style={styles.scanRetryBtnText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scanManualBtn, { borderColor: colors.gold.border }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setScanState('IDLE');
                    setScanning(true);
                    resetReticle();
                    setTimeout(() => setManualVisible(true), 200);
                  }}
                >
                  <Text style={[styles.scanManualBtnText, { color: colors.gold.light }]}>
                    Enter pass code manually
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </BlurView>
      </Modal>

      {/* ── Header Controls (Safely positioned ABOVE the reticle) ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconBtn, { borderColor: colors.gold.border }]}
          activeOpacity={0.7}
        >
          <X size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Scan Studio Pass</Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={handleRestartCamera}
            style={[styles.iconBtn, { borderColor: colors.gold.border }]}
            activeOpacity={0.7}
          >
            <RotateCcw size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTorch(!torch)}
            style={[styles.iconBtn, { borderColor: colors.gold.border }]}
            activeOpacity={0.7}
          >
            {torch ? (
              <FlashlightOff size={20} color={colors.gold.DEFAULT} />
            ) : (
              <Flashlight size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Instructions (Positioned BELOW the reticle) ── */}
      <View style={[styles.instructions, { top: RETICLE_TOP + RETICLE_SIZE + 20 }]}>
        <Text style={styles.instructTitle}>Align QR code inside the frame</Text>
        <Text style={styles.instructSub}>
          Locate the QR code on your booking confirmation email or printed studio reception pass.
        </Text>
      </View>

      {/* ── Footer Controls ── */}
      <View style={styles.footer}>
        <View style={styles.footerButtonsRow}>
          <TouchableOpacity
            style={[styles.manualBtn, { borderColor: colors.gold.border, flex: 1, marginRight: 0 }]}
            onPress={() => setManualVisible(true)}
            activeOpacity={0.7}
          >
            <Keyboard size={15} color={colors.gold.light} />
            <Text style={styles.manualText}>Enter pass token manually</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Manual Entry Modal ── */}
      <Modal visible={manualVisible} animationType="slide" transparent>
        <BlurView intensity={75} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={styles.modalContainer}>
          <View style={[styles.modalCard, { backgroundColor: colors.bg.card, borderColor: colors.gold.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Enter Pass Token</Text>
            <Text style={[styles.modalSub, { color: colors.text.secondary }]}>
              Enter the verification token from your confirmation email or booking pass.
            </Text>

            <TextInput
              style={[
                styles.tokenInput,
                { backgroundColor: colors.bg.input, color: colors.text.primary, borderColor: colors.gold.border },
              ]}
              placeholder="e.g. EK-892147"
              placeholderTextColor={colors.text.muted}
              value={manualToken}
              onChangeText={setManualToken}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={() => {
                if (manualToken.trim()) {
                  setManualVisible(false);
                  processToken(manualToken.trim().toUpperCase());
                }
              }}
            />

            <View style={styles.modalButtons}>
              <GoldButton
                variant="ghost"
                onPress={() => { setManualVisible(false); setManualToken(''); }}
                style={{ flex: 1 }}
              >
                Cancel
              </GoldButton>
              <GoldButton
                icon={ChevronRight}
                onPress={() => {
                  if (manualToken.trim()) {
                    setManualVisible(false);
                    processToken(manualToken.trim().toUpperCase());
                  }
                }}
                disabled={!manualToken.trim()}
                style={{ flex: 1 }}
              >
                Verify Pass
              </GoldButton>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: Spacing[8] },

  permIconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
    ...Shadow.goldSoft,
  },
  permTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  permBody: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  manualFallbackBtn: {
    marginTop: Spacing[4],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  manualFallbackText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
  },

  // 4-piece mask overlay
  maskBlock: {
    position: 'absolute',
  },

  // Reticle
  reticle: {
    position: 'absolute',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  corner_tl: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  corner_tr: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  corner_bl: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  corner_br: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },

  // Laser scanline
  scanLineWrapper: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 3,
    ...Shadow.gold,
  },
  scanLine: {
    height: 3,
    borderRadius: 1.5,
  },

  // Status inside reticle
  cameraStatusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPrompt: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(13, 11, 9, 0.65)',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
  },
  statusPromptText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs,
    color: '#FAFAF8',
  },
  statusPromptSub: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: '#B5AE9F',
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
    marginTop: 4,
  },
  retryChipText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 11,
    color: '#E8D5B0',
  },

  // Header
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    zIndex: 10,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(26, 23, 20, 0.82)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: '#FFFFFF',
  },

  // Instructions
  instructions: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing[8],
  },
  instructTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: '#FAFAF8',
    textAlign: 'center',
    marginBottom: 4,
  },
  instructSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: '#B5AE9F',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 96,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing[2],
  },
  footerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingBar: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    borderWidth: 1,
    marginBottom: 6,
  },
  loadingText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.fontBodySemi,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(26, 23, 20, 0.82)',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2] + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  manualText: {
    color: '#FAFAF8',
    fontSize: 12,
    fontFamily: Typography.fontBodyMedium,
  },
  demoQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(201, 169, 110, 0.15)',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2] + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  demoQuickText: {
    fontSize: 12,
    fontFamily: Typography.fontBodySemi,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
  },
  modalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
  },
  modalCard: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: Spacing[6],
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  modalTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    marginBottom: Spacing[2],
  },
  modalDesc: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    lineHeight: 20,
    marginBottom: Spacing[4],
  },
  modalSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    lineHeight: 20,
    marginBottom: Spacing[4],
  },
  modalInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontSize: Typography.size.base,
    fontFamily: Typography.fontBodyMedium,
    letterSpacing: 1.5,
    marginBottom: Spacing[5],
  },
  tokenInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontSize: Typography.size.base,
    fontFamily: Typography.fontBodyMedium,
    letterSpacing: 1.5,
    marginBottom: Spacing[3],
  },
  demoChipLabel: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    marginBottom: 6,
  },
  demoChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing[5],
    flexWrap: 'wrap',
  },
  demoChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  demoChipText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing[3],
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginTop: Spacing[6],
  },
  modalCancel: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  modalCancelText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
  },

  // ── Mascot Result Overlay ──────────────────────────────────────────────────
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
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingTop: Spacing[5],
    paddingBottom: Spacing[7],
    paddingHorizontal: Spacing[6],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
  },
  scanStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginBottom: Spacing[2],
  },
  scanStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scanStatusLabel: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  scanResultMessage: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.base,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing[3],
    paddingHorizontal: Spacing[2],
  },
  scanLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing[4],
  },
  scanLoadingText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
  },
  scanErrorActions: {
    width: '100%',
    gap: Spacing[3],
    marginTop: Spacing[5],
  },
  scanRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: Radius.lg,
  },
  scanRetryBtnText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.base,
    color: '#1E1711',
  },
  scanManualBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  scanManualBtnText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.sm,
  },
});

