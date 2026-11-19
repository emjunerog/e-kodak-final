/**
 * StudioToolModals.jsx
 * Interactive functional modals reading live database pricing sets and studio location:
 * 1. Studio Rates & Packages (Live from Supabase `services` table)
 * 2. Shoot Preparation & Wardrobe Guide
 * 3. Studio Bay Location & Hours (Live from Supabase `studio_settings` table)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, Pressable, Linking, Dimensions, Platform,
  Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X, Sparkles, CheckCircle2, Clock, MapPin, Phone,
  Camera, ExternalLink, Mail, ChevronDown, ChevronUp,
  SlidersHorizontal, Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import GlassCard from './GlassCard';
import GoldButton from './GoldButton';
import StudioShapeLoader from './StudioShapeLoader';
import { fetchStudioServices, fetchStudioSettings } from '../services/storageService';
import { useResponsiveLayout } from '../utils/responsive';
import { Typography, Spacing, Radius, Shadow } from '../theme';

const { height } = Dimensions.get('window');

function BottomSheetModal({ visible, onClose, styles, bottomInset, children }) {
  const { modalFrameStyle, sheetMaxHeight } = useResponsiveLayout();
  const [isMounted, setIsMounted] = useState(visible);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(Math.min(height * 0.55, 420)));
  const latestVisibleRef = useRef(visible);

  if (visible && !isMounted) {
    setIsMounted(true);
  }

  useEffect(() => {
    latestVisibleRef.current = visible;
    if (!isMounted) return;

    fadeAnim.stopAnimation();
    slideAnim.stopAnimation();

    const hiddenOffset = Math.min(height * 0.55, 420);

    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(hiddenOffset);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 190,
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

  if (!isMounted) return null;

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
              paddingBottom: Math.max(bottomInset, 16) + 8,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── 1. Studio Rates & Packages Modal ───────────────────────────────────────

const PACKAGE_FILTERS = [
  { id: 'all', label: 'All Packages' },
  { id: 'college', label: 'College' },
  { id: 'senior-high', label: 'Senior High' },
];

export function RatesModal({ visible, onClose, initialCategory = 'all' }) {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, isDark);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedSets, setExpandedSets] = useState({});

  useEffect(() => {
    if (visible) {
      const validInit =
        initialCategory === 'college' || initialCategory === 'senior-high'
          ? initialCategory
          : 'all';
      setActiveCategory(validInit);
      setFilterOpen(false);
      setLoading(true);
      fetchStudioServices().then((data) => {
        setServices(data);
        setLoading(false);
      });
    }
  }, [visible, initialCategory]);

  const toggleSetExpanded = (setId) => {
    try { Haptics.selectionAsync().catch(() => {}); } catch { }
    setExpandedSets((prev) => ({ ...prev, [setId]: !prev[setId] }));
  };

  const selectedFilter =
    PACKAGE_FILTERS.find((item) => item.id === activeCategory) || PACKAGE_FILTERS[0];

  const filteredServices = services.filter((svc) => {
    if (svc.category !== 'college' && svc.category !== 'senior-high') {
      return false;
    }
    if (activeCategory === 'all') return true;
    return svc.category === activeCategory;
  });

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      styles={styles}
      bottomInset={insets.bottom}
    >
      {/* Header */}
      <View style={styles.modalHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalTitle}>Studio Packages & Rates</Text>
          <Text style={styles.modalSub}>
            Official sets, prints, and framed packages.
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
          <X size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Dropdown Control */}
      <View style={styles.filterWrap}>
        <TouchableOpacity
          onPress={() => {
            try { Haptics.selectionAsync().catch(() => {}); } catch { }
            setFilterOpen((prev) => !prev);
          }}
          activeOpacity={0.85}
          style={styles.filterBtn}
          accessibilityRole="button"
          accessibilityLabel={`Filter packages: ${selectedFilter.label}`}
        >
          <View style={styles.filterBtnLeft}>
            <SlidersHorizontal size={15} color={colors.gold.DEFAULT} />
            <Text style={styles.filterBtnLabel}>Filter:</Text>
            <Text style={styles.filterBtnValue}>{selectedFilter.label}</Text>
          </View>
          {filterOpen ? (
            <ChevronUp size={17} color={colors.text.secondary} />
          ) : (
            <ChevronDown size={17} color={colors.text.secondary} />
          )}
        </TouchableOpacity>

        {filterOpen && (
          <View style={styles.filterDropdown}>
            {PACKAGE_FILTERS.map((cat, idx) => {
              const isActive = cat.id === activeCategory;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    try { Haptics.selectionAsync().catch(() => {}); } catch { }
                    setActiveCategory(cat.id);
                    setFilterOpen(false);
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.filterOption,
                    idx < PACKAGE_FILTERS.length - 1 && styles.filterOptionDivider,
                    isActive && styles.filterOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      isActive && styles.filterOptionTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                  {isActive && (
                    <Check size={16} color={colors.gold.DEFAULT} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Packages Scrollable Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <StudioShapeLoader size={44} isDark={isDark} />
        </View>
      ) : (
        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {filteredServices.map((service) => (
            <View key={service.id} style={styles.serviceSection}>
              {activeCategory === 'all' && (
                <View style={styles.categoryDividerRow}>
                  <Text style={styles.categoryDividerLabel}>
                    {service.category === 'college' ? 'College' : 'Senior High'}
                  </Text>
                  <View style={styles.categoryDividerLine} />
                </View>
              )}

              {/* Sets / Tiers from Database */}
              <View style={styles.tiersGroup}>
                {service.tiers?.map((tier, idx) => {
                  const tierKey = `${service.id}-${tier.name}`;
                  const isExpanded = expandedSets[tierKey] ?? (idx === 0);

                  return (
                    <GlassCard
                      key={idx}
                      opaque
                      blurred={false}
                      highlight={tier.popular}
                      glow={tier.popular}
                      style={styles.packageCard}
                    >
                      {/* Set Header */}
                      <TouchableOpacity
                        onPress={() => toggleSetExpanded(tierKey)}
                        activeOpacity={0.85}
                        style={styles.pkgTop}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={styles.setNameRow}>
                            <Text style={styles.pkgName}>{tier.name}</Text>
                            {tier.popular && (
                              <View style={styles.popularBadge}>
                                <Text style={styles.popularText}>POPULAR SET</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.metaRow}>
                            <Clock size={11} color={colors.gold.light} />
                            <Text style={styles.metaText}>{tier.duration || 'Studio Session'}</Text>
                          </View>
                        </View>

                        <View style={styles.priceCol}>
                          <Text style={styles.pkgPrice}>{tier.price}</Text>
                          <View style={styles.chevronToggle}>
                            <Text style={styles.chevronToggleText}>
                              {isExpanded ? 'Hide' : 'Details'}
                            </Text>
                            {isExpanded ? (
                              <ChevronUp size={13} color={colors.gold.light} />
                            ) : (
                              <ChevronDown size={13} color={colors.gold.light} />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Highlights & Inclusions (Expanded) */}
                      {isExpanded && (
                        <View style={styles.expandedContent}>
                          <View style={styles.divider} />
                          <Text style={styles.highlightsLabel}>PACKAGE INCLUSIONS & PRINTS</Text>
                          <View style={styles.inclusionsList}>
                            {tier.highlights?.map((hl, hIdx) => (
                              <View key={hIdx} style={styles.inclusionRow}>
                                <CheckCircle2 size={13} color={colors.gold.DEFAULT} />
                                <Text style={styles.inclusionText}>{hl}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </GlassCard>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <GoldButton onPress={onClose} style={{ marginTop: Spacing[3] }}>
        Close Rates
      </GoldButton>
    </BottomSheetModal>
  );
}

// ── 2. Shoot Preparation Guide Modal ───────────────────────────────────────

export function PrepModal({ visible, onClose }) {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, isDark);
  const TIPS = [
    {
      title: 'Hair & Makeup',
      icon: Sparkles,
      desc: 'Drink water before your shoot day. Light makeup helps prevent shine on camera. Hair and makeup are included in your package.',
    },
    {
      title: 'Arrive Early',
      icon: Clock,
      desc: 'Come 15 minutes before your booked time. Show your QR pass at the counter so we can get your shoot ready.',
    },
    {
      title: 'Outfits & Props',
      icon: Camera,
      desc: 'We have barong, Filipiniana, toga sets, and backdrops ready. You can also bring your own medals or diploma.',
    },
  ];

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      styles={styles}
      bottomInset={insets.bottom}
    >
      <View style={styles.modalHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalTitle}>Shoot Preparation Guide</Text>
          <Text style={styles.modalSub}>Simple tips to get ready for your shoot.</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
          <X size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
        {TIPS.map((tip, idx) => {
          const IconComp = tip.icon;
          return (
            <GlassCard key={idx} opaque blurred={false} highlight style={styles.tipCard}>
              <View style={styles.tipIconWrapper}>
                <IconComp size={20} color={colors.gold.light} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDesc}>{tip.desc}</Text>
              </View>
            </GlassCard>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      <GoldButton onPress={onClose} style={{ marginTop: Spacing[3] }}>
        Got It
      </GoldButton>
    </BottomSheetModal>
  );
}

// ── 3. Studio Location & Hours Modal ───────────────────────────────────────

export function StudioBayModal({ visible, onClose }) {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, isDark);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchStudioSettings().then((data) => {
        setSettings(data);
        setLoading(false);
      });
    }
  }, [visible]);

  const studioAddress = settings?.address || '311 Rizal Street, City of Naga, Cebu';
  const studioPhone = settings?.contact_phone || '+63 917 123 4567';
  const studioEmail = settings?.contact_email || 'contact@e-kodak.com';
  const studioHours = settings?.business_hours || 'Mon – Sat: 8:00 AM – 6:00 PM | Sun: By Appointment';

  const callStudio = () => {
    const cleaned = studioPhone.replace(/[^+\d]/g, '');
    Linking.openURL(`tel:${cleaned}`);
  };

  const openMaps = () => {
    const query = encodeURIComponent(`E-Kodak Studio, ${studioAddress}`);
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      styles={styles}
      bottomInset={insets.bottom}
    >
      <View style={styles.modalHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalTitle}>Studio Location & Hours</Text>
          <Text style={styles.modalSub}>Visit us at our flagship Cebu studio bay.</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
          <X size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <StudioShapeLoader size={44} isDark={isDark} />
        </View>
      ) : (
        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <GlassCard opaque blurred={false} highlight style={styles.locationCard}>
            {/* Address */}
            <View style={styles.locRow}>
              <View style={styles.locIconWrapper}>
                <MapPin size={18} color={colors.gold.light} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locLabel}>FLAGSHIP STUDIO ADDRESS</Text>
                <Text style={styles.locValue}>E-Kodak Photography Studio</Text>
                <Text style={styles.locSub}>{studioAddress}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Hours */}
            <View style={styles.locRow}>
              <View style={styles.locIconWrapper}>
                <Clock size={18} color={colors.gold.light} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locLabel}>STUDIO OPERATING HOURS</Text>
                <Text style={styles.locValue}>{studioHours}</Text>
                <Text style={styles.locSub}>Walk-ins welcome based on bay availability.</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Phone */}
            <View style={styles.locRow}>
              <View style={styles.locIconWrapper}>
                <Phone size={18} color={colors.gold.light} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locLabel}>STUDIO CONCIERGE PHONE</Text>
                <Text style={styles.locValue}>{studioPhone}</Text>
                <Text style={styles.locSub}>Tap below to dial direct reception desk</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Email */}
            <View style={styles.locRow}>
              <View style={styles.locIconWrapper}>
                <Mail size={18} color={colors.gold.light} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locLabel}>OFFICIAL EMAIL</Text>
                <Text style={styles.locValue}>{studioEmail}</Text>
              </View>
            </View>
          </GlassCard>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <GoldButton
              variant="outline"
              icon={Phone}
              onPress={callStudio}
              style={{ flex: 1 }}
              size="sm"
            >
              Call Studio
            </GoldButton>
            <GoldButton
              icon={ExternalLink}
              onPress={openMaps}
              style={{ flex: 1.2 }}
              size="sm"
            >
              Open in Maps
            </GoldButton>
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <GoldButton onPress={onClose} style={{ marginTop: Spacing[3] }}>
        Got It
      </GoldButton>
    </BottomSheetModal>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 10, 14, 0.52)',
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  modalTitle: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: colors.text.primary,
    marginBottom: 2,
  },
  modalSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: colors.surface?.chip || 'rgba(127, 127, 140, 0.14)',
    borderWidth: 1,
    borderColor: colors.surface?.hairline || colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Package Filter Dropdown
  filterWrap: {
    marginBottom: Spacing[3],
    zIndex: 10,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: Radius.md,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.gold.borderLight,
  },
  filterBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtnLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
  },
  filterBtnValue: {
    fontFamily: Typography.fontBodySemi,
    fontSize: Typography.size.xs,
    color: colors.text.primary,
  },
  filterDropdown: {
    marginTop: 6,
    borderRadius: Radius.md,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.gold.borderLight,
    overflow: 'hidden',
    ...Shadow.card,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterOptionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface?.hairline || colors.gold.border,
  },
  filterOptionActive: {
    backgroundColor: colors.gold.bg,
  },
  filterOptionText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
  },
  filterOptionTextActive: {
    fontFamily: Typography.fontBodySemi,
    color: colors.text.primary,
  },

  modalScroll: {
    maxHeight: height * 0.58,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.gold.light,
  },

  // Service Section
  serviceSection: {
    marginBottom: Spacing[4],
  },
  categoryDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing[2],
    marginTop: 2,
  },
  categoryDividerLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.gold.light,
  },
  categoryDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface?.hairline || colors.gold.border,
  },
  tiersGroup: {
    gap: Spacing[3],
  },

  // Package Card
  packageCard: {
    padding: Spacing[4],
    borderRadius: Radius.lg,
  },
  pkgTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  setNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  pkgName: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: colors.text.primary,
  },
  popularBadge: {
    backgroundColor: colors.gold.DEFAULT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  popularText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 8,
    color: colors.text.onGold,
    letterSpacing: 0.5,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  pkgPrice: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.base,
    color: colors.gold.light,
  },
  chevronToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  chevronToggleText: {
    fontFamily: Typography.fontBody,
    fontSize: 10,
    color: colors.gold.light,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontFamily: Typography.fontBody,
    fontSize: 10,
    color: colors.text.muted,
  },

  expandedContent: {
    marginTop: Spacing[2],
  },
  highlightsLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    color: colors.gold.light,
    letterSpacing: 0.8,
    marginBottom: Spacing[2],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gold.border,
    marginVertical: Spacing[3],
    opacity: 0.5,
  },
  inclusionsList: {
    gap: 6,
  },
  inclusionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  inclusionText: {
    flex: 1,
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: colors.text.secondary,
    lineHeight: 16,
  },

  // Tips
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[4],
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderRadius: Radius.lg,
  },
  tipIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: colors.gold.bg,
    borderWidth: 1,
    borderColor: colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.sm,
    color: colors.text.primary,
    marginBottom: 4,
  },
  tipDesc: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
    lineHeight: 18,
  },

  // Location
  locationCard: {
    padding: Spacing[5],
    borderRadius: Radius.lg,
    marginBottom: Spacing[4],
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[4],
  },
  locIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: colors.gold.bg,
    borderWidth: 1,
    borderColor: colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    color: colors.gold.light,
    letterSpacing: 1,
    marginBottom: 2,
  },
  locValue: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.sm,
    color: colors.text.primary,
    marginBottom: 2,
  },
  locSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
});
