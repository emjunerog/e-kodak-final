/**
 * QRScannerScreen.jsx
 * Perfectly centered studio QR pass scanner.
 * Features:
 * - Pixel-perfect vertical & horizontal reticle centering
 * - Full-bleed camera feed without letterboxing or black margins
 * - Distinct header safely positioned above the reticle frame
 * - Instructions positioned comfortably below the reticle
 * - Gold corner brackets with animated laser scanline
 * - Auto-saves customer profile upon pass retrieval
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar, TextInput, Modal, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  QrCode, X, Flashlight, FlashlightOff, Keyboard, ChevronRight,
} from 'lucide-react-native';

import { parseQRPayload, fetchBookingByToken, logQRScan } from '../services/bookingService';
import { saveBookingToken, saveCustomerProfileFromBooking } from '../services/storageService';
import GoldButton from '../components/GoldButton';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';

const { width, height } = Dimensions.get('window');
const RETICLE_SIZE = Math.min(width * 0.74, 280);
const RETICLE_TOP  = Math.round((height - RETICLE_SIZE) / 2 - 30);
const RETICLE_LEFT = Math.round((width - RETICLE_SIZE) / 2);

const MASK_COLOR = 'rgba(13, 11, 9, 0.72)';
const CORNER_SIZE = 26;
const CORNER_WIDTH = 3.5;

export default function QRScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch]               = useState(false);
  const [scanning, setScanning]         = useState(true);
  const [loading, setLoading]           = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualToken, setManualToken]   = useState('');

  // Animated gold laser scanline
  const scanAnim = useRef(new Animated.Value(0)).current;
  const cornerAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startScanAnimation();
  }, []);

  const startScanAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
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

  const scanLineY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, RETICLE_SIZE - 4],
  });

  const handleScanned = async ({ data }) => {
    if (!scanning || loading) return;
    setScanning(false);
    setLoading(true);

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const { valid, token, error } = parseQRPayload(data);
    if (!valid) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      Alert.alert('Invalid QR Code', error || 'This QR code is not a valid E-Kodak booking pass.', [
        { text: 'Try Again', onPress: () => { setScanning(true); setLoading(false); } },
      ]);
      return;
    }

    await processToken(token);
  };

  const processToken = async (token) => {
    setLoading(true);
    const { data: booking, error } = await fetchBookingByToken(token);

    if (error || !booking) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      Alert.alert('Booking Not Found', 'Could not locate a booking for this pass. Please verify with the studio.', [
        { text: 'Try Again', onPress: () => { setScanning(true); setLoading(false); } },
      ]);
      return;
    }

    await logQRScan({ bookingId: booking.id });
    await saveBookingToken(token, booking);
    await saveCustomerProfileFromBooking(booking);

    setLoading(false);
    navigation.replace('BookingTracker', { booking, token });
  };

  if (!permission) return <View style={styles.dark} />;

  if (!permission.granted) {
    return (
      <View style={[styles.dark, styles.centered]}>
        <View style={styles.permIconRing}>
          <QrCode size={52} color={Colors.gold.DEFAULT} strokeWidth={1.25} />
        </View>
        <Text style={styles.permTitle}>Camera Permission Required</Text>
        <Text style={styles.permBody}>
          E-Kodak needs camera access to scan your studio pass and track your shoot progress.
        </Text>
        <GoldButton onPress={requestPermission} style={{ marginTop: Spacing[6] }}>
          Grant Camera Access
        </GoldButton>
      </View>
    );
  }

  return (
    <View style={styles.dark}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg.base} />

      {/* Full-bleed Camera View */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanning && !loading ? handleScanned : undefined}
      />

      {/* ── Airtight Centered 4-Piece Mask ── */}
      {/* Top Mask */}
      <View style={[styles.maskBlock, { top: 0, left: 0, right: 0, height: RETICLE_TOP }]} />

      {/* Left Mask */}
      <View style={[styles.maskBlock, { top: RETICLE_TOP, left: 0, width: RETICLE_LEFT, height: RETICLE_SIZE }]} />

      {/* Right Mask */}
      <View style={[styles.maskBlock, { top: RETICLE_TOP, right: 0, width: RETICLE_LEFT, height: RETICLE_SIZE }]} />

      {/* Bottom Mask */}
      <View style={[styles.maskBlock, { top: RETICLE_TOP + RETICLE_SIZE, left: 0, right: 0, bottom: 0 }]} />

      {/* ── Perfectly Centered Reticle Frame ── */}
      <View
        style={[
          styles.reticle,
          {
            top: RETICLE_TOP,
            left: RETICLE_LEFT,
            width: RETICLE_SIZE,
            height: RETICLE_SIZE,
          },
        ]}
      >
        {/* Animated Gold Corner Brackets */}
        {['tl', 'tr', 'bl', 'br'].map((corner) => (
          <Animated.View
            key={corner}
            style={[styles.corner, styles[`corner_${corner}`], { opacity: cornerAnim }]}
          />
        ))}

        {/* Animated Gold Laser Scanline */}
        <Animated.View
          style={[styles.scanLineWrapper, { transform: [{ translateY: scanLineY }] }]}
        >
          <LinearGradient
            colors={Gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scanLine}
          />
        </Animated.View>
      </View>

      {/* ── Header Controls (Safely positioned ABOVE the reticle) ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <X size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Studio Pass</Text>
        <TouchableOpacity
          onPress={() => setTorch(!torch)}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          {torch ? (
            <FlashlightOff size={20} color={Colors.gold.DEFAULT} />
          ) : (
            <Flashlight size={20} color={Colors.text.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Instructions (Comfortably positioned BELOW the reticle) ── */}
      <View style={[styles.instructions, { top: RETICLE_TOP + RETICLE_SIZE + 22 }]}>
        <Text style={styles.instructTitle}>Align QR code inside the frame</Text>
        <Text style={styles.instructSub}>
          Locate the QR code on your booking confirmation email or printed studio reception pass.
        </Text>
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        {loading && (
          <View style={styles.loadingBar}>
            <Text style={styles.loadingText}>Retrieving studio session…</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.manualBtn}
          onPress={() => setManualVisible(true)}
          activeOpacity={0.7}
        >
          <Keyboard size={15} color={Colors.gold.light} />
          <Text style={styles.manualText}>Enter pass token manually</Text>
        </TouchableOpacity>
      </View>

      {/* ── Manual Entry Modal ── */}
      <Modal visible={manualVisible} animationType="slide" transparent>
        <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter Pass Token</Text>
            <Text style={styles.modalSub}>
              Enter the verification token from your confirmation email or booking pass.
            </Text>
            <TextInput
              style={styles.tokenInput}
              placeholder="e.g. 550e8400-e29b-41d4..."
              placeholderTextColor={Colors.neutral[600]}
              value={manualToken}
              onChangeText={setManualToken}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={() => {
                if (manualToken.trim()) {
                  setManualVisible(false);
                  processToken(manualToken.trim());
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
                    processToken(manualToken.trim());
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
  dark: { flex: 1, backgroundColor: Colors.bg.base },
  centered: { alignItems: 'center', justifyContent: 'center', padding: Spacing[8] },

  permIconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
    ...Shadow.goldSoft,
  },
  permTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  permBody: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // 4-piece mask overlay
  maskBlock: {
    position: 'absolute',
    backgroundColor: MASK_COLOR,
  },

  // Reticle
  reticle: {
    position: 'absolute',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.gold.DEFAULT,
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
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(26, 23, 20, 0.82)',
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: Colors.text.primary,
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
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  instructSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing[2],
  },
  loadingBar: {
    backgroundColor: Colors.gold.bg,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gold.border,
  },
  loadingText: {
    color: Colors.gold.light,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fontBodySemi,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    backgroundColor: 'rgba(26, 23, 20, 0.75)',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gold.border,
  },
  manualText: {
    color: Colors.gold.light,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fontBodyMedium,
    letterSpacing: 0.5,
  },

  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing[4],
    paddingBottom: 40,
  },
  modalCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gold.borderLight,
    padding: Spacing[6],
    gap: Spacing[4],
    ...Shadow.card,
  },
  modalTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.xl,
    color: Colors.text.primary,
  },
  modalSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 19,
  },
  tokenInput: {
    backgroundColor: Colors.bg.input,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    borderRadius: Radius.md,
    padding: Spacing[4],
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
    fontFamily: Typography.fontBody,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
});
