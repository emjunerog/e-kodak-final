/**
 * QRScannerScreen.jsx
 * Camera-based QR scanner with animated gold reticle, haptics,
 * and fallback manual token entry.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar, TextInput, Modal, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import {
  QrCode, X, Flashlight, FlashlightOff, Keyboard, ChevronRight
} from 'lucide-react-native';
import { parseQRPayload, fetchBookingByToken, logQRScan } from '../services/bookingService';
import { saveBookingToken } from '../services/storageService';
import GoldButton from '../components/GoldButton';
import { Colors, Typography, Spacing, Radius } from '../theme';

const { width } = Dimensions.get('window');
const RETICLE_SIZE = width * 0.68;

export default function QRScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch]               = useState(false);
  const [scanning, setScanning]         = useState(true);
  const [loading, setLoading]           = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualToken, setManualToken]   = useState('');

  // Animated gold scanning line
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
        Animated.timing(cornerAnim, { toValue: 0.5, duration: 1100, useNativeDriver: true }),
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

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const { valid, token, error } = parseQRPayload(data);
    if (!valid) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Booking Not Found', 'We couldn\'t find a booking for this code. Please check with your studio.', [
        { text: 'Try Again', onPress: () => { setScanning(true); setLoading(false); } },
      ]);
      return;
    }

    // Log the scan
    await logQRScan({ bookingId: booking.id });
    // Persist locally
    await saveBookingToken(token, booking);

    setLoading(false);
    navigation.replace('BookingTracker', { booking, token });
  };

  if (!permission) return <View style={styles.dark} />;

  if (!permission.granted) {
    return (
      <View style={[styles.dark, styles.centered]}>
        <QrCode size={64} color={Colors.gold.DEFAULT} strokeWidth={1} />
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permBody}>
          E-Kodak needs camera access to scan your booking QR code.
        </Text>
        <GoldButton onPress={requestPermission} style={{ marginTop: Spacing[6] }}>
          Grant Camera Access
        </GoldButton>
      </View>
    );
  }

  return (
    <View style={styles.dark}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0E" />

      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanning && !loading ? handleScanned : undefined}
      />

      {/* Overlay: darken everything outside the reticle */}
      <View style={styles.overlay}>
        {/* Top dark area */}
        <View style={styles.overlayTop} />

        {/* Middle row */}
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />

          {/* ── Reticle ── */}
          <View style={styles.reticle}>
            {/* Corner brackets */}
            {['tl','tr','bl','br'].map((corner) => (
              <Animated.View
                key={corner}
                style={[styles.corner, styles[`corner_${corner}`], { opacity: cornerAnim }]}
              />
            ))}

            {/* Animated scan line */}
            <Animated.View
              style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]}
            />
          </View>

          <View style={styles.overlaySide} />
        </View>

        {/* Bottom dark area */}
        <View style={styles.overlayBottom} />
      </View>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <X size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Pass</Text>
        <TouchableOpacity onPress={() => setTorch(!torch)} style={styles.iconBtn}>
          {torch
            ? <FlashlightOff size={22} color={Colors.gold.DEFAULT} />
            : <Flashlight size={22} color={Colors.text.primary} />
          }
        </TouchableOpacity>
      </View>

      {/* ── Instructions ── */}
      <View style={styles.instructions}>
        <Text style={styles.instructTitle}>Point at your booking QR code</Text>
        <Text style={styles.instructSub}>
          The QR code is on your E-Kodak booking confirmation email or the studio website.
        </Text>
      </View>

      {/* ── Manual Entry Button ── */}
      <View style={styles.footer}>
        {loading && (
          <View style={styles.loadingBar}>
            <Text style={styles.loadingText}>Loading booking details…</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.manualBtn}
          onPress={() => setManualVisible(true)}
        >
          <Keyboard size={16} color={Colors.gold.dim} />
          <Text style={styles.manualText}>Enter booking token manually</Text>
        </TouchableOpacity>
      </View>

      {/* ── Manual Entry Modal ── */}
      <Modal visible={manualVisible} animationType="slide" transparent>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter Booking Token</Text>
            <Text style={styles.modalSub}>
              Find your token in the booking email or the web portal under "My Bookings".
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
                Find Booking
              </GoldButton>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const OVERLAY_COLOR = 'rgba(0,0,0,0.72)';
const CORNER_SIZE   = 24;
const CORNER_WIDTH  = 3;

const styles = StyleSheet.create({
  dark:    { flex: 1, backgroundColor: '#0B0B0E' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: Spacing[8] },

  // Overlay layout
  overlay:       { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  overlayTop:    { flex: 1, width: '100%', backgroundColor: OVERLAY_COLOR },
  overlayBottom: { flex: 1, width: '100%', backgroundColor: OVERLAY_COLOR },
  overlayMiddle: { flexDirection: 'row', alignItems: 'center' },
  overlaySide:   { flex: 1, height: RETICLE_SIZE, backgroundColor: OVERLAY_COLOR },

  // Reticle
  reticle: {
    width: RETICLE_SIZE,
    height: RETICLE_SIZE,
    overflow: 'hidden',
    position: 'relative',
  },

  // Gold corner brackets
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

  // Scan line
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.gold.DEFAULT,
    shadowColor: Colors.gold.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
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
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },

  // Instructions
  instructions: {
    position: 'absolute',
    top: '62%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing[8],
  },
  instructTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  instructSub: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing[3],
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
    color: Colors.gold.DEFAULT,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing[2],
  },
  manualText: {
    color: Colors.gold.dim,
    fontSize: Typography.size.sm,
    textDecorationLine: 'underline',
  },

  // Permission
  permTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginTop: Spacing[6],
    marginBottom: Spacing[3],
  },
  permBody: {
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
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
    borderColor: Colors.gold.border,
    padding: Spacing[6],
    gap: Spacing[4],
  },
  modalTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  modalSub: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  tokenInput: {
    backgroundColor: Colors.bg.input,
    borderWidth: 1.5,
    borderColor: Colors.gold.border,
    borderRadius: Radius.md,
    padding: Spacing[4],
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
    fontFamily: 'monospace',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
});
