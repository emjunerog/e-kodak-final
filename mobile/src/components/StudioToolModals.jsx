/**
 * StudioToolModals.jsx
 * Interactive functional modals reading live database pricing sets and studio location:
 * 1. Studio Rates & Packages (Live from Supabase `services` table)
 * 2. Shoot Preparation & Wardrobe Guide
 * 3. Studio Bay Location & Hours (Live from Supabase `studio_settings` table)
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, Linking, ActivityIndicator, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  X, Sparkles, CheckCircle2, Clock, MapPin, Phone,
  Camera, Shirt, Calendar, ExternalLink, Tag, Mail,
  ChevronDown, ChevronUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import GlassCard from './GlassCard';
import GoldButton from './GoldButton';
import { fetchStudioServices, fetchStudioSettings } from '../services/storageService';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';

const { height } = Dimensions.get('window');

// ── 1. Studio Rates & Packages Modal (Live from Database) ──────────────────

export function RatesModal({ visible, onClose }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedSets, setExpandedSets] = useState({});

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchStudioServices().then((data) => {
        setServices(data);
        setLoading(false);
      });
    }
  }, [visible]);

  const toggleSetExpanded = (setId) => {
    try { Haptics.selectionAsync(); } catch {}
    setExpandedSets((prev) => ({ ...prev, [setId]: !prev[setId] }));
  };

  const CATEGORIES = [
    { id: 'all', label: 'All Packages' },
    { id: 'college', label: 'College' },
    { id: 'senior-high', label: 'Senior High' },
    { id: 'wedding-photo', label: 'Wedding Photo' },
    { id: 'wedding-video', label: 'Wedding Video' },
  ];

  const filteredServices = services.filter((svc) => {
    if (activeCategory === 'all') return true;
    return svc.category === activeCategory;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.liveDbBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveDbBadgeText}>LIVE FROM STUDIO DATABASE</Text>
              </View>
              <Text style={styles.modalTitle}>Studio Packages & Rates</Text>
              <Text style={styles.modalSub}>
                Official sets, inclusions, and crystal wood framed packages.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesRow}
          >
            {CATEGORIES.map((cat) => {
              const isActive = cat.id === activeCategory;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    try { Haptics.selectionAsync(); } catch {}
                    setActiveCategory(cat.id);
                  }}
                  style={[styles.categoryTab, isActive && styles.categoryTabActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Packages Scrollable Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.gold.light} />
              <Text style={styles.loadingText}>Loading studio pricing...</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {filteredServices.map((service) => (
                <View key={service.id} style={styles.serviceSection}>
                  {/* Service Header Card */}
                  <View style={styles.serviceHeaderBox}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    {service.tagline ? (
                      <Text style={styles.serviceTagline}>{service.tagline}</Text>
                    ) : null}
                  </View>

                  {/* Sets / Tiers from Database */}
                  <View style={styles.tiersGroup}>
                    {service.tiers?.map((tier, idx) => {
                      const tierKey = `${service.id}-${tier.name}`;
                      const isExpanded = expandedSets[tierKey] ?? (idx === 0);

                      return (
                        <GlassCard
                          key={idx}
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
        </View>
      </View>
    </Modal>
  );
}

// ── 2. Shoot Preparation & Wardrobe Guide Modal ───────────────────────────

export function PrepModal({ visible, onClose }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const TIPS = [
    {
      title: 'Wardrobe Palette',
      icon: Shirt,
      desc: 'Solid neutrals (black, charcoal, ivory, navy) and warm earthy tones photograph best. Avoid busy patterns that cause digital moiré effects under studio strobes.',
    },
    {
      title: 'Grooming & Hair Styling',
      icon: Sparkles,
      desc: 'Hydrate well before shoot day. Matte foundation prevents strobe flash glare. Our package includes studio hair and make-up artists.',
    },
    {
      title: 'Arrival Time',
      icon: Clock,
      desc: 'Please arrive 15 minutes before your booked slot to check in your digital QR pass, steam wardrobe options, and align with your assigned studio photographer.',
    },
    {
      title: 'Academic & Formal Props',
      icon: Camera,
      desc: 'We provide barong, Filipiniana attire, graduation toga sets, and formal backdrops. Feel free to bring personal academic medals or diplomas.',
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Shoot Preparation Guide</Text>
              <Text style={styles.modalSub}>Look and feel your absolute best in the studio.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {TIPS.map((tip, idx) => {
              const IconComp = tip.icon;
              return (
                <GlassCard key={idx} highlight style={styles.tipCard}>
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
        </View>
      </View>
    </Modal>
  );
}

// ── 3. Studio Location & Hours Modal (Live from Database) ──────────────────

export function StudioBayModal({ visible, onClose }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);

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
  const studioPhone   = settings?.contact_phone || '+63 917 123 4567';
  const studioEmail   = settings?.contact_email || 'contact@e-kodak.com';
  const studioHours   = settings?.business_hours || 'Mon – Sat: 8:00 AM – 6:00 PM | Sun: By Appointment';

  const callStudio = () => {
    const cleaned = studioPhone.replace(/[^+\d]/g, '');
    Linking.openURL(`tel:${cleaned}`);
  };

  const emailStudio = () => {
    Linking.openURL(`mailto:${studioEmail}`);
  };

  const openMaps = () => {
    const query = encodeURIComponent(`E-Kodak Studio, ${studioAddress}`);
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.liveDbBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveDbBadgeText}>VERIFIED STUDIO LOCATION</Text>
              </View>
              <Text style={styles.modalTitle}>Studio Location & Hours</Text>
              <Text style={styles.modalSub}>Visit us at our flagship Cebu studio bay.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.gold.light} />
              <Text style={styles.loadingText}>Fetching studio location...</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <GlassCard highlight style={styles.locationCard}>
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

          <GoldButton variant="ghost" onPress={onClose} style={{ marginTop: Spacing[2] }}>
            Close
          </GoldButton>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(13, 11, 9, 0.65)',
  },
  modalCard: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: colors.gold.borderLight,
    padding: Spacing[5],
    maxHeight: height * 0.88,
    ...Shadow.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  liveDbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(212, 168, 83, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.gold.border,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.status.ready,
  },
  liveDbBadgeText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 8.5,
    color: colors.gold.light,
    letterSpacing: 0.6,
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
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category Tab Pills
  categoriesScroll: {
    maxHeight: 38,
    marginBottom: Spacing[3],
  },
  categoriesRow: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 83, 0.2)',
  },
  categoryTabActive: {
    backgroundColor: colors.gold.DEFAULT,
    borderColor: colors.gold.light,
  },
  categoryTabText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11,
    color: colors.neutral[400],
  },
  categoryTabTextActive: {
    fontFamily: Typography.fontBodySemi,
    color: colors.text.onGold,
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
  serviceHeaderBox: {
    marginBottom: Spacing[2],
  },
  serviceName: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: colors.text.primary,
    marginBottom: 2,
  },
  serviceTagline: {
    fontFamily: Typography.fontBody,
    fontSize: 11,
    color: colors.gold.light,
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
