/**
 * ShootDetailModal.jsx
 * Bottom-sheet shoot dossier & workflow controls for studio photographers.
 * Matches E-Kodak themes (Light, Darkroom, Sage Atelier) with solid opaque sheet
 * surfaces and GPU-driven slide/fade animations.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Linking,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  CalendarDays,
  MapPin,
  User,
  Phone,
  Camera,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Sparkles,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';
import GlassCard from './GlassCard';
import GoldButton from './GoldButton';
import StatusBadge from './StatusBadge';
import { formatReadableDate, formatTime12 } from '../services/photographerService';
import { useResponsiveLayout } from '../utils/responsive';
import { Typography, Spacing, Radius, Shadow } from '../theme';

const { height } = Dimensions.get('window');

function getNextStageAction(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'CONFIRMED') {
    return { nextStatus: 'PHOTOGRAPHER_ASSIGNED', label: 'Accept Shoot Assignment', kind: 'accept' };
  }
  if (s === 'PHOTOGRAPHER_ASSIGNED') {
    return { nextStatus: 'CAPTURE', label: 'Start Pictorial Session', kind: 'advance' };
  }
  if (s === 'CAPTURE' || s === 'IN_PROGRESS') {
    return { nextStatus: 'EDITING', label: 'Finish & Move to Editing', kind: 'advance' };
  }
  if (s === 'EDITING') {
    return { nextStatus: 'RETOUCHING', label: 'Move to Retouching', kind: 'advance' };
  }
  if (s === 'RETOUCHING') {
    return { nextStatus: 'FINALIZED', label: 'Mark Shoot Finalized', kind: 'advance' };
  }
  return null;
}

export default function ShootDetailModal({
  visible,
  booking,
  busy = false,
  onClose,
  onAccept,
  onDecline,
  onAdvanceStatus,
  onRequestReschedule,
}) {
  const { isDark, isSage, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { modalFrameStyle, sheetMaxHeight } = useResponsiveLayout();
  const styles = useMemo(() => getStyles(colors, isDark, isSage), [colors, isDark, isSage]);

  const [isMounted, setIsMounted] = useState(visible);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(Math.min(height * 0.65, 480)));
  const latestVisibleRef = useRef(visible);

  // Sub-panels: 'details' | 'decline' | 'reschedule'
  const [panel, setPanel] = useState('details');
  const [declineReason, setDeclineReason] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  if (visible && !isMounted) {
    setIsMounted(true);
  }

  useEffect(() => {
    if (visible) {
      setPanel('details');
      setDeclineReason('');
      setProposedDate(booking?.session_date || '');
      setProposedTime(booking?.session_time ? String(booking.session_time).slice(0, 5) : '09:00');
      setRescheduleReason('');
    }
  }, [visible, booking?.id, booking?.session_date, booking?.session_time]);

  useEffect(() => {
    latestVisibleRef.current = visible;
    if (!isMounted) return;

    fadeAnim.stopAnimation();
    slideAnim.stopAnimation();
    const hiddenOffset = Math.min(height * 0.65, 480);

    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(hiddenOffset);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 185,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 230,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: hiddenOffset,
        duration: 185,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && !latestVisibleRef.current) {
        setIsMounted(false);
      }
    });
  }, [visible, isMounted, fadeAnim, slideAnim]);

  if (!isMounted || !booking) return null;

  const nextAction = getNextStageAction(booking.status);
  const inclusions = Array.isArray(booking.services?.inclusions)
    ? booking.services.inclusions
    : [];
  const clientName = booking.profile?.full_name || 'Studio Client';
  const clientPhone = booking.profile?.phone || '';
  const packageTitle = booking.services?.name || 'Studio Session';
  const packageSubtitle = booking.tier_name ? `${packageTitle} • ${booking.tier_name}` : packageTitle;
  const accentColor = isDark ? colors.gold.light : colors.gold.DEFAULT;
  const placeholderColor = isDark ? '#9BA4B5' : isSage ? '#6D7667' : '#7B7366';

  const handleCallClient = () => {
    const clean = String(clientPhone || '').replace(/[^\d+]/g, '');
    if (!clean) return;
    Haptics.selectionAsync().catch(() => {});
    Linking.openURL(`tel:${clean}`).catch(() => {});
  };

  return (
    <Modal
      visible
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalCard,
            modalFrameStyle,
            {
              maxHeight: sheetMaxHeight,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={styles.passHeaderRow}>
                <Text style={styles.passCodeText}>
                  #{booking.booking_number || 'SHOOT'}
                </Text>
                <StatusBadge status={booking.status} size="sm" />
              </View>
              <Text style={styles.sheetTitle} numberOfLines={2}>
                {packageSubtitle}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.75}
              accessibilityLabel="Close shoot details"
            >
              <X size={18} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {panel === 'details' && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: height * 0.52 }}
            >
              <GlassCard opaque blurred={false} style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <View style={styles.iconCircle}>
                    <User size={16} color={accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>CLIENT</Text>
                    <Text style={styles.infoValue}>{clientName}</Text>
                    {clientPhone ? (
                      <Text style={styles.infoSub}>{clientPhone}</Text>
                    ) : null}
                  </View>
                  {clientPhone ? (
                    <TouchableOpacity
                      onPress={handleCallClient}
                      style={styles.callChip}
                      activeOpacity={0.8}
                    >
                      <Phone size={13} color={accentColor} />
                      <Text style={[styles.callChipText, { color: accentColor }]}>
                        Call
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.iconCircle}>
                    <CalendarDays size={16} color={accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>SCHEDULED SLOT</Text>
                    <Text style={styles.infoValue}>
                      {formatReadableDate(booking.session_date)} •{' '}
                      {formatTime12(booking.session_time)}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.iconCircle}>
                    <MapPin size={16} color={accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>LOCATION</Text>
                    <Text style={styles.infoValue}>
                      {booking.location_address || 'E-Kodak Main Studio Bay'}
                    </Text>
                  </View>
                </View>

                {booking.notes ? (
                  <>
                    <View style={styles.rowDivider} />
                    <View style={styles.infoRow}>
                      <View style={styles.iconCircle}>
                        <FileText size={16} color={accentColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>SESSION NOTES</Text>
                        <Text style={styles.infoNotes}>{booking.notes}</Text>
                      </View>
                    </View>
                  </>
                ) : null}
              </GlassCard>

              {inclusions.length > 0 && (
                <GlassCard opaque blurred={false} style={styles.inclusionsCard}>
                  <View style={styles.inclusionsHeader}>
                    <Sparkles size={14} color={accentColor} />
                    <Text style={styles.infoLabel}>PACKAGE DELIVERABLES</Text>
                  </View>
                  {inclusions.slice(0, 6).map((item, idx) => (
                    <Text key={`${idx}-${item}`} style={styles.inclusionItem}>
                      • {typeof item === 'string' ? item : item?.label || String(item)}
                    </Text>
                  ))}
                </GlassCard>
              )}

              <View style={{ height: 8 }} />
            </ScrollView>
          )}

          {panel === 'decline' && (
            <View style={styles.subPanel}>
              <Text style={styles.subPanelTitle}>Decline Shoot Assignment</Text>
              <Text style={styles.subPanelSub}>
                This shoot will return to the studio queue so admin can reassign another photographer.
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="Reason for declining (e.g. schedule conflict)..."
                placeholderTextColor={placeholderColor}
                value={declineReason}
                onChangeText={setDeclineReason}
                multiline
                numberOfLines={3}
              />
              <View style={styles.dualRow}>
                <GoldButton
                  variant="outline"
                  onPress={() => setPanel('details')}
                  disabled={busy}
                  style={{ flex: 1 }}
                >
                  Back
                </GoldButton>
                <GoldButton
                  onPress={() => onDecline?.(booking, declineReason)}
                  loading={busy}
                  style={{ flex: 1 }}
                >
                  Confirm Decline
                </GoldButton>
              </View>
            </View>
          )}

          {panel === 'reschedule' && (
            <View style={styles.subPanel}>
              <Text style={styles.subPanelTitle}>Request Schedule Adjustment</Text>
              <Text style={styles.subPanelSub}>
                Propose a new date or time. Admin will confirm with the client.
              </Text>
              <View style={styles.dualInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputCaption}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="2026-11-20"
                    placeholderTextColor={placeholderColor}
                    value={proposedDate}
                    onChangeText={setProposedDate}
                  />
                </View>
                <View style={{ width: 108 }}>
                  <Text style={styles.inputCaption}>Time (HH:MM)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="10:00"
                    placeholderTextColor={placeholderColor}
                    value={proposedTime}
                    onChangeText={setProposedTime}
                  />
                </View>
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Reason for reschedule request..."
                placeholderTextColor={placeholderColor}
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
                multiline
                numberOfLines={2}
              />
              <View style={styles.dualRow}>
                <GoldButton
                  variant="outline"
                  onPress={() => setPanel('details')}
                  disabled={busy}
                  style={{ flex: 1 }}
                >
                  Back
                </GoldButton>
                <GoldButton
                  onPress={() =>
                    onRequestReschedule?.(booking, {
                      proposedDate,
                      proposedTime,
                      reason: rescheduleReason,
                    })
                  }
                  loading={busy}
                  style={{ flex: 1 }}
                >
                  Send Request
                </GoldButton>
              </View>
            </View>
          )}

          {/* Bottom Actions */}
          {panel === 'details' && (
            <View style={styles.footerActions}>
              {nextAction && (
                <GoldButton
                  loading={busy}
                  onPress={() => {
                    if (nextAction.kind === 'accept') {
                      onAccept?.(booking);
                    } else {
                      onAdvanceStatus?.(booking, nextAction.nextStatus);
                    }
                  }}
                  icon={nextAction.kind === 'accept' ? CheckCircle2 : Camera}
                >
                  {nextAction.label}
                </GoldButton>
              )}

              {['CONFIRMED', 'PHOTOGRAPHER_ASSIGNED'].includes(
                String(booking.status || '').toUpperCase()
              ) && (
                <View style={styles.secondaryActionRow}>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => setPanel('reschedule')}
                    disabled={busy}
                    style={styles.secondaryChipBtn}
                  >
                    <CalendarClock size={15} color={colors.text.primary} />
                    <Text style={styles.secondaryChipText}>Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => setPanel('decline')}
                    disabled={busy}
                    style={[styles.secondaryChipBtn, styles.declineChipBtn]}
                  >
                    <XCircle size={15} color="#EF4444" />
                    <Text style={[styles.secondaryChipText, { color: '#EF4444' }]}>
                      Decline
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {!nextAction && (
                <GoldButton variant="outline" onPress={onClose}>
                  Done
                </GoldButton>
              )}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const getStyles = (colors, isDark, isSage) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(8, 10, 14, 0.58)',
    },
    modalCard: {
      backgroundColor: isDark ? colors.bg.surface : colors.bg.base,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.gold.borderLight,
      padding: Spacing[5],
      maxHeight: height * 0.88,
      ...(Platform.OS === 'ios' ? Shadow.card : { elevation: 0 }),
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: Spacing[3],
    },
    passHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 6,
    },
    passCodeText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 12,
      color: isDark ? colors.gold.light : colors.gold.DEFAULT,
      letterSpacing: 0.6,
    },
    sheetTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 20,
      lineHeight: 25,
      color: colors.text.primary,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: isDark ? colors.bg.elevated : '#EEF1F6',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D9DFE8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoCard: {
      marginBottom: 12,
      padding: 14,
      borderRadius: Radius.lg,
    },
    inclusionsCard: {
      marginBottom: 8,
      padding: 14,
      borderRadius: Radius.lg,
    },
    inclusionsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    inclusionItem: {
      fontFamily: Typography.fontBody,
      fontSize: 12.5,
      lineHeight: 19,
      color: colors.text.secondary,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    iconCircle: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.gold.bg,
      borderWidth: 1,
      borderColor: colors.gold.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoLabel: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 10,
      letterSpacing: 0.9,
      color: isDark ? colors.text.muted : '#6B6256',
      marginBottom: 2,
    },
    infoValue: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 14,
      lineHeight: 19,
      color: colors.text.primary,
    },
    infoSub: {
      fontFamily: Typography.fontBody,
      fontSize: 12.5,
      color: colors.text.secondary,
      marginTop: 2,
    },
    infoNotes: {
      fontFamily: Typography.fontBody,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.text.secondary,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.surface?.divider || colors.gold.border,
      marginVertical: 11,
    },
    callChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.gold.border,
      backgroundColor: colors.gold.bg,
    },
    callChipText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 12,
    },
    subPanel: {
      gap: 10,
      paddingVertical: 6,
    },
    subPanelTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 17,
      color: colors.text.primary,
    },
    subPanelSub: {
      fontFamily: Typography.fontBody,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.text.secondary,
    },
    dualInputs: {
      flexDirection: 'row',
      gap: 10,
    },
    inputCaption: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 11,
      color: colors.text.secondary,
      marginBottom: 4,
    },
    textInput: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180,198,224,0.22)' : '#D5DAE5',
      borderRadius: 14,
      paddingHorizontal: 12,
      height: 44,
      fontFamily: Typography.fontBodyMedium,
      fontSize: 13.5,
      color: colors.text.primary,
    },
    textArea: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180,198,224,0.22)' : '#D5DAE5',
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 78,
      textAlignVertical: 'top',
      fontFamily: Typography.fontBodyMedium,
      fontSize: 13.5,
      color: colors.text.primary,
    },
    dualRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    footerActions: {
      marginTop: 12,
      gap: 10,
    },
    secondaryActionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    secondaryChipBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 44,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180,198,224,0.22)' : isSage ? '#D1D9C8' : '#D5DAE5',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
    },
    declineChipBtn: {
      borderColor: 'rgba(239, 68, 68, 0.35)',
    },
    secondaryChipText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 13,
      color: colors.text.primary,
    },
  });
