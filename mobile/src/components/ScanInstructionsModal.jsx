/**
 * ScanInstructionsModal.jsx
 * Aesthetic in-app visual guide for studio clients on how to scan and track session passes.
 * Now features step-by-step interactive carousel with Studio Mascot.
 */

import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  QrCode, FileText, Sparkles, X, Camera,
  ShieldCheck, ArrowRight, ArrowLeft
} from 'lucide-react-native';

import GlassCard from './GlassCard';
import GoldButton from './GoldButton';
import StudioMascotKit from './StudioMascotKit';
import { Typography, Spacing, Radius } from '../theme';

const { height } = Dimensions.get('window');

const GUIDE_STEPS = [
  {
    title: 'Locate Your Studio Pass',
    desc: 'Find the official QR code printed on your studio receipt, in your confirmation email, or under "My Bookings" in your online studio dashboard.',
    tag: 'RECEIPT & WEB PASS',
    icon: FileText,
  },
  {
    title: 'Align Code in Viewfinder',
    desc: 'Tap "Scan Studio Pass" and point your camera. The high-speed studio scanner locks on automatically and verifies your cryptographic session pass.',
    tag: 'INSTANT RECOGNITION',
    icon: QrCode,
  },
  {
    title: 'Experience Live Tracking',
    desc: 'Your customer profile auto-syncs. Follow your session through lighting setup, raw capture, professional retouching, proof approvals, and print delivery.',
    tag: 'REAL-TIME UPDATES',
    icon: Sparkles,
  },
];

export default function ScanInstructionsModal({ visible, onClose, onOpenScanner }) {
  const { isDark, colors, gradients } = useTheme();
  const styles = getStyles(colors, isDark);
  const [currentStep, setCurrentStep] = useState(0);

  if (!visible) return null;

  const handleScanPress = () => {
    try { Haptics.selectionAsync(); } catch {}
    onClose?.();
    onOpenScanner?.();
  };

  const handleNext = () => {
    try { Haptics.selectionAsync(); } catch {}
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleScanPress();
    }
  };

  const handlePrev = () => {
    try { Haptics.selectionAsync(); } catch {}
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const stepData = GUIDE_STEPS[currentStep];
  const StepIcon = stepData.icon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalCardWrapper}>
          <GlassCard glow highlight style={styles.modalCard}>
            {/* Header row */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconBox}>
                  <Camera size={20} color={colors.gold.light} />
                </View>
                <View>
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>CLIENT QUICK GUIDE</Text>
                  </View>
                  <Text style={styles.headerTitle}>How to Track Session</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={18} color={colors.neutral[400]} />
              </TouchableOpacity>
            </View>

            {/* Mascot Camera Animation Area */}
            <View style={styles.mascotStage}>
              <LinearGradient
                colors={isDark ? ['rgba(212, 175, 55, 0.12)', 'transparent'] : ['rgba(212, 175, 55, 0.15)', 'transparent']}
                style={StyleSheet.absoluteFillObject}
              />
              <StudioMascotKit 
                pose="camera_reveal" 
                size={160} 
                interactive={false} 
                showBadge={false} 
                animationStep={currentStep + 1}
              />
            </View>

            {/* Step Progress Indicators */}
            <View style={styles.progressRow}>
              {GUIDE_STEPS.map((_, idx) => (
                <View 
                  key={idx} 
                  style={[
                    styles.progressDot, 
                    { backgroundColor: idx === currentStep ? colors.gold.DEFAULT : colors.bg.elevated },
                    idx === currentStep && styles.progressDotActive
                  ]} 
                />
              ))}
            </View>

            {/* Current Step Content */}
            <View style={styles.stepContentBox}>
              <View style={styles.stepMetaRow}>
                <Text style={styles.stepNumText}>STEP 0{currentStep + 1}</Text>
                <View style={styles.tagPill}>
                  <Text style={styles.tagPillText}>{stepData.tag}</Text>
                </View>
              </View>
              
              <View style={styles.stepTitleRow}>
                <StepIcon size={20} color={colors.gold.DEFAULT} />
                <Text style={styles.stepTitle}>{stepData.title}</Text>
              </View>
              
              <Text style={styles.stepDesc}>{stepData.desc}</Text>
            </View>

            {/* Studio Security Callout */}
            {currentStep === 2 && (
              <View style={styles.securityBox}>
                <ShieldCheck size={16} color={colors.gold.light} />
                <Text style={styles.securityText}>
                  Your pass token is securely stored offline. Profile data synchronizes securely.
                </Text>
              </View>
            )}

            {/* Bottom Actions */}
            <View style={styles.actionsGroup}>
              {currentStep > 0 && (
                <TouchableOpacity
                  onPress={handlePrev}
                  style={styles.prevBtn}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={20} color={colors.text.primary} />
                </TouchableOpacity>
              )}
              
              <View style={{ flex: 1 }}>
                <GoldButton
                  icon={currentStep === 2 ? QrCode : ArrowRight}
                  onPress={handleNext}
                  size="md"
                >
                  {currentStep === 2 ? 'Open Scanner' : 'Next Step'}
                </GoldButton>
              </View>
            </View>
          </GlassCard>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 4, 3, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
  },
  modalCardWrapper: {
    width: '100%',
    maxWidth: 440,
    maxHeight: height * 0.9,
  },
  modalCard: {
    padding: Spacing[5],
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: colors.gold.bg,
    borderWidth: 1,
    borderColor: colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212, 168, 83, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.gold.border,
    marginBottom: 3,
  },
  headerBadgeText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.gold.light,
  },
  headerTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.lg,
    color: colors.text.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotStage: {
    height: 180,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(28, 22, 17, 0.6)' : 'rgba(255, 250, 240, 0.6)',
    borderWidth: 1,
    borderColor: colors.gold.border,
    marginBottom: Spacing[4],
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing[4],
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    width: 20,
  },
  stepContentBox: {
    minHeight: 120,
    marginBottom: Spacing[4],
  },
  stepMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stepNumText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10,
    color: colors.gold.light,
    letterSpacing: 0.8,
  },
  tagPill: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPillText: {
    fontFamily: Typography.fontBody,
    fontSize: 9,
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  stepTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: colors.text.primary,
  },
  stepDesc: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(212, 168, 83, 0.05)',
    borderWidth: 1,
    borderColor: colors.gold.border,
    borderRadius: Radius.md,
    padding: Spacing[3],
    marginBottom: Spacing[4],
  },
  securityText: {
    flex: 1,
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: colors.text.muted,
    lineHeight: 16,
  },
  actionsGroup: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  prevBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold.border,
  }
});
