import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Info,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from './ThemeContext';
import CardDecorElements from '../components/CardDecorElements';
import { Typography } from '../theme';

const DialogContext = createContext({
  showDialog: () => {},
  showAlert: () => {},
  showProcess: () => {},
  waitProcessDuration: async () => {},
  hideDialog: () => {},
});

function inferDialogType(title = '', buttons = [], explicitType = null) {
  if (explicitType) return explicitType;
  if (Array.isArray(buttons) && buttons.some((b) => b?.style === 'destructive')) {
    return 'danger';
  }
  if (Array.isArray(buttons) && buttons.length >= 3) {
    return 'selection';
  }
  const cleanTitle = String(title || '').toLowerCase();
  if (/(cleared|up to date|updated|success|ready|saved|synced|complete)/.test(cleanTitle)) {
    return 'success';
  }
  if (/(failed|error|denied|locked|invalid|unable|missing|incorrect|needed)/.test(cleanTitle)) {
    return 'danger';
  }
  if (Array.isArray(buttons) && buttons.length === 2) {
    return 'confirm';
  }
  return 'info';
}

export function DialogProvider({ children }) {
  const { isDark, isSage, colors, gradients } = useTheme();
  const [dialog, setDialog] = useState(null);

  const [scaleAnim] = useState(() => new Animated.Value(0.95));
  const [opacityAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const processStartedAtRef = useRef(0);
  const openedDuringHandlerRef = useRef(false);

  const isOpen = Boolean(dialog);

  // Only animate modal entrance when transitioning closed -> open (never re-flash between steps)
  useEffect(() => {
    if (!isOpen) return;
    scaleAnim.setValue(0.95);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        stiffness: 320,
        damping: 26,
        mass: 0.78,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, scaleAnim, opacityAnim]);

  useEffect(() => {
    if (dialog?.type === 'process') {
      pulseAnim.setValue(1);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.07,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 520,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }

    if (dialog?.type === 'success') {
      pulseAnim.setValue(0.9);
      Animated.spring(pulseAnim, {
        toValue: 1,
        stiffness: 320,
        damping: 22,
        mass: 0.7,
        useNativeDriver: true,
      }).start();
      return undefined;
    }

    pulseAnim.setValue(1);
    return undefined;
  }, [dialog?.type, pulseAnim]);

  const hideDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const showDialog = useCallback((config) => {
    if (!config) return;
    openedDuringHandlerRef.current = true;
    const rawButtons = Array.isArray(config.buttons) ? config.buttons : [];
    const type = inferDialogType(config.title, rawButtons, config.type);
    const resolvedButtons =
      type === 'process'
        ? []
        : rawButtons.length > 0
          ? rawButtons
          : [{ text: 'OK', style: 'default' }];

    setDialog({
      title: config.title || '',
      message: config.message || '',
      type,
      buttons: resolvedButtons,
      cancelable: config.cancelable ?? (type !== 'process'),
    });
  }, []);

  const showAlert = useCallback(
    (title, message = '', buttons = [], options = {}) => {
      showDialog({
        title,
        message,
        buttons,
        type: options?.type || null,
        cancelable: options?.cancelable,
      });
    },
    [showDialog]
  );

  const showProcess = useCallback(
    (title = 'Processing...', message = '') => {
      processStartedAtRef.current = Date.now();
      showDialog({
        title,
        message,
        type: 'process',
        buttons: [],
        cancelable: false,
      });
    },
    [showDialog]
  );

  const waitProcessDuration = useCallback(async (minMs = 1100) => {
    const started = processStartedAtRef.current || 0;
    const elapsed = Date.now() - started;
    const remaining = Math.max(0, minMs - elapsed);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }, []);

  const handlePressButton = (btn) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    openedDuringHandlerRef.current = false;
    if (typeof btn?.onPress === 'function') {
      btn.onPress();
    }
    // Only close if the handler didn't seamlessly transition into another step (e.g. showProcess/showAlert)
    if (!openedDuringHandlerRef.current) {
      setDialog(null);
    }
  };

  const styles = useMemo(() => getStyles(colors, isDark, isSage), [colors, isDark, isSage]);

  const cardGradientColors =
    gradients?.card ||
    (isDark
      ? ['#242029', '#151B24']
      : isSage
        ? ['#FFFFFF', '#EEF2E9']
        : ['#FAF2EA', '#E5EEF7']);

  const cardBorder = isDark
    ? 'rgba(180, 198, 224, 0.22)'
    : isSage
      ? '#D7DDD1'
      : '#DCDDE6';

  const primaryAccent = isDark ? colors.gold.light : colors.gold.DEFAULT;
  const primaryButtonFill = colors.gold.DEFAULT;

  const badgePalette = (() => {
    switch (dialog?.type) {
      case 'success':
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.12)',
          border: isDark ? 'rgba(16, 185, 129, 0.34)' : 'rgba(16, 185, 129, 0.28)',
          iconColor: '#10B981',
          Icon: CheckCircle2,
        };
      case 'danger':
        return {
          bg: isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.10)',
          border: isDark ? 'rgba(239, 68, 68, 0.32)' : 'rgba(239, 68, 68, 0.24)',
          iconColor: '#EF4444',
          Icon: AlertTriangle,
        };
      case 'selection':
        return {
          bg: colors.gold.bg,
          border: isDark
            ? 'rgba(217, 180, 108, 0.28)'
            : isSage
              ? 'rgba(99, 115, 86, 0.24)'
              : 'rgba(176, 125, 30, 0.22)',
          iconColor: primaryAccent,
          Icon: SlidersHorizontal,
        };
      case 'confirm':
      case 'warning':
        return {
          bg: colors.gold.bg,
          border: isDark
            ? 'rgba(217, 180, 108, 0.28)'
            : isSage
              ? 'rgba(99, 115, 86, 0.24)'
              : 'rgba(176, 125, 30, 0.22)',
          iconColor: primaryAccent,
          Icon: HelpCircle,
        };
      default:
        return {
          bg: colors.gold.bg,
          border: isDark
            ? 'rgba(217, 180, 108, 0.28)'
            : isSage
              ? 'rgba(99, 115, 86, 0.24)'
              : 'rgba(176, 125, 30, 0.22)',
          iconColor: primaryAccent,
          Icon: Info,
        };
    }
  })();

  const buttons = dialog?.buttons || [];
  const isStacked = buttons.length >= 3;

  const value = useMemo(
    () => ({
      showDialog,
      showAlert,
      showProcess,
      waitProcessDuration,
      hideDialog,
    }),
    [showDialog, showAlert, showProcess, waitProcessDuration, hideDialog]
  );

  return (
    <DialogContext.Provider value={value}>
      {children}

      <Modal
        visible={Boolean(dialog)}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {
          if (dialog?.cancelable) hideDialog();
        }}
      >
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (dialog?.cancelable) hideDialog();
            }}
          />

          <Animated.View
            style={[
              styles.cardOuter,
              {
                borderColor: cardBorder,
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <LinearGradient
              colors={cardGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGrad}
            >
              <CardDecorElements variant="hero" isDark={isDark} />

              {/* Status / Process Emblem */}
              <Animated.View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: badgePalette.bg,
                    borderColor: badgePalette.border,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                {dialog?.type === 'process' ? (
                  <ActivityIndicator size="small" color={primaryAccent} />
                ) : (
                  <badgePalette.Icon
                    size={24}
                    color={badgePalette.iconColor}
                    strokeWidth={2.1}
                  />
                )}
              </Animated.View>

              {/* Title & Message */}
              {dialog?.title ? (
                <Text style={styles.title}>{dialog.title}</Text>
              ) : null}

              {dialog?.message ? (
                <Text style={styles.message}>{dialog.message}</Text>
              ) : null}

              {/* Action Buttons / User Selections */}
              {buttons.length > 0 && (
                isStacked ? (
                  <View style={styles.stackedButtonsCol}>
                    {buttons.map((btn, idx) => {
                      const isCancel = btn.style === 'cancel';
                      const isDestructive = btn.style === 'destructive';
                      return (
                        <TouchableOpacity
                          key={`${btn.text || 'opt'}-${idx}`}
                          activeOpacity={0.82}
                          onPress={() => handlePressButton(btn)}
                          style={[
                            styles.stackedOptionBtn,
                            isCancel
                              ? styles.secondaryPill
                              : isDestructive
                                ? styles.destructiveSoftPill
                                : styles.choicePill,
                          ]}
                        >
                          <Text
                            style={[
                              styles.stackedOptionText,
                              isCancel
                                ? styles.secondaryPillText
                                : isDestructive
                                  ? styles.destructiveSoftText
                                  : styles.choicePillText,
                            ]}
                          >
                            {btn.text}
                          </Text>
                          {!isCancel && (
                            <ChevronRight
                              size={16}
                              color={
                                isDestructive
                                  ? '#EF4444'
                                  : isDark
                                    ? colors.text.muted
                                    : '#6C6458'
                              }
                              strokeWidth={2}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.rowButtons}>
                    {buttons.map((btn, idx) => {
                      const isCancel = btn.style === 'cancel';
                      const isDestructive = btn.style === 'destructive';
                      const solidBg = isDestructive
                        ? '#EF4444'
                        : dialog?.type === 'success' && !isCancel
                          ? '#10B981'
                          : primaryButtonFill;

                      return (
                        <TouchableOpacity
                          key={`${btn.text || 'btn'}-${idx}`}
                          activeOpacity={0.85}
                          onPress={() => handlePressButton(btn)}
                          style={[
                            styles.rowBtn,
                            isCancel
                              ? styles.secondaryPill
                              : { backgroundColor: solidBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.rowBtnText,
                              isCancel
                                ? styles.secondaryPillText
                                : styles.primaryBtnText,
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {btn.text}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )
              )}
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  return useContext(DialogContext);
}

const getStyles = (colors, isDark, isSage) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(8, 10, 14, 0.62)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    cardOuter: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 26,
      borderWidth: 1,
      overflow: 'hidden',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: isDark ? 0.42 : 0.22,
      shadowRadius: 28,
      elevation: 10,
    },
    cardGrad: {
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 20,
      alignItems: 'center',
      position: 'relative',
    },
    iconBadge: {
      width: 54,
      height: 54,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    title: {
      fontFamily: Typography.fontHeading,
      fontSize: 19,
      lineHeight: 25,
      color: isDark ? colors.text.primary : '#181410',
      textAlign: 'center',
    },
    message: {
      fontFamily: Typography.fontBody,
      fontSize: 13.5,
      lineHeight: 20,
      color: isDark ? colors.text.secondary : isSage ? '#555E50' : '#5C5346',
      textAlign: 'center',
      marginTop: 7,
    },
    rowButtons: {
      flexDirection: 'row',
      width: '100%',
      gap: 10,
      marginTop: 20,
    },
    rowBtn: {
      flex: 1,
      height: 45,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    rowBtnText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 13.5,
      letterSpacing: 0.1,
    },
    primaryBtnText: {
      color: '#FFFFFF',
    },
    secondaryPill: {
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(255, 255, 255, 0.78)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.20)'
        : isSage
          ? '#CFD7C7'
          : '#D5DAE5',
    },
    secondaryPillText: {
      color: isDark ? colors.text.secondary : '#4B4338',
    },
    stackedButtonsCol: {
      width: '100%',
      gap: 9,
      marginTop: 20,
    },
    stackedOptionBtn: {
      width: '100%',
      minHeight: 46,
      borderRadius: 15,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stackedOptionText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 14,
    },
    choicePill: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(180, 198, 224, 0.22)'
        : isSage
          ? '#CFD7C7'
          : '#DCDDE6',
    },
    choicePillText: {
      color: isDark ? colors.text.primary : '#181410',
    },
    destructiveSoftPill: {
      backgroundColor: isDark
        ? 'rgba(239, 68, 68, 0.14)'
        : 'rgba(239, 68, 68, 0.08)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(239, 68, 68, 0.30)'
        : 'rgba(239, 68, 68, 0.22)',
    },
    destructiveSoftText: {
      color: '#EF4444',
    },
  });
