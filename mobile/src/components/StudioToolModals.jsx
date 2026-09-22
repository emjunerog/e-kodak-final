/**
 * StudioToolModals.jsx
 * Interactive functional modals for the 3 Home dashboard tools:
 * 1. Studio Rates & Packages
 * 2. Shoot Preparation & Wardrobe Guide
 * 3. Studio Bay Location & Hours
 */

import React from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  X, Sparkles, CheckCircle2, Clock, MapPin, Phone,
  Camera, Shirt, Calendar, ExternalLink,
} from 'lucide-react-native';

import GlassCard from './GlassCard';
import GoldButton from './GoldButton';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';

// ── 1. Studio Rates & Packages Modal ──────────────────────────────────────

export function RatesModal({ visible, onClose }) {
  const PACKAGES = [
    {
      name: 'Fine Art Portraiture',
      price: '₱2,500',
      duration: '45 mins',
      shoots: 'Studio Bay A or B',
      inclusions: [
        '10 High-resolution retouched proofs',
        '2 Studio backdrop changes',
        'Private digital gallery access (30 days)',
        '1 8×10 Museum fine art print',
      ],
    },
    {
      name: 'Commencement & Graduation',
      price: '₱3,200',
      duration: '60 mins',
      shoots: 'Academic Bay',
      inclusions: [
        'Complete academic regalia portrait session',
        '15 Professionally color-graded photos',
        'Family/Companion portraits included (up to 3)',
        '1 11×14 Crystal framed portrait output',
        'Digital pass with instant QR download',
      ],
    },
    {
      name: 'Creative Editorial & Branding',
      price: '₱5,800',
      duration: '90 mins',
      shoots: 'Full Studio Floor',
      inclusions: [
        'Commercial lighting setup & creative direction',
        '25 Ultra-high definition retouched outputs',
        'Unlimited wardrobe & backdrop changes',
        'Commercial release rights included',
        'High-speed cloud delivery within 48 hours',
      ],
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Studio Packages & Rates</Text>
              <Text style={styles.modalSub}>Transparent studio pricing with premium museum prints.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {PACKAGES.map((pkg, i) => (
              <GlassCard key={i} highlight style={styles.packageCard}>
                <View style={styles.pkgTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pkgName}>{pkg.name}</Text>
                    <View style={styles.metaRow}>
                      <Clock size={12} color={Colors.gold.light} />
                      <Text style={styles.metaText}>{pkg.duration} · {pkg.shoots}</Text>
                    </View>
                  </View>
                  <Text style={styles.pkgPrice}>{pkg.price}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.inclusionsList}>
                  {pkg.inclusions.map((item, idx) => (
                    <View key={idx} style={styles.inclusionRow}>
                      <CheckCircle2 size={13} color={Colors.gold.DEFAULT} />
                      <Text style={styles.inclusionText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </GlassCard>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>

          <GoldButton onPress={onClose} style={{ marginTop: Spacing[3] }}>
            Close Guide
          </GoldButton>
        </View>
      </View>
    </Modal>
  );
}

// ── 2. Shoot Preparation & Wardrobe Guide Modal ───────────────────────────

export function PrepModal({ visible, onClose }) {
  const TIPS = [
    {
      title: 'Wardrobe Palette',
      icon: Shirt,
      desc: 'Solid neutrals (black, charcoal, ivory, navy) and warm earthy tones photograph best. Avoid tight houndstooth or small busy patterns that create moiré effects under studio strobes.',
    },
    {
      title: 'Grooming & Retouching',
      icon: Sparkles,
      desc: 'Hydrate well before shoot day. Matte makeup prevents studio flash glare. Our retouchers refine skin texture and flyaway hair while preserving natural expression.',
    },
    {
      title: 'Arrival Time',
      icon: Clock,
      desc: 'Please arrive 15 minutes before your scheduled studio slot to check in your QR pass, unpack wardrobe choices, and consult with your assigned photographer.',
    },
    {
      title: 'Props & Regalia',
      icon: Camera,
      desc: 'For graduation sessions, remember your academic cap, hood, medals, and diploma tube. Personal props reflecting your craft or passion are warmly welcomed.',
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
              <Text style={styles.modalSub}>Everything you need to prepare for a flawless session.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {TIPS.map((tip, i) => {
              const Icon = tip.icon;
              return (
                <GlassCard key={i} highlight style={styles.tipCard}>
                  <View style={styles.tipHeader}>
                    <View style={styles.tipIconWrapper}>
                      <Icon size={16} color={Colors.gold.light} />
                    </View>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                  </View>
                  <Text style={styles.tipDesc}>{tip.desc}</Text>
                </GlassCard>
              );
            })}
            <View style={{ height: 20 }} />
          </ScrollView>

          <GoldButton onPress={onClose} style={{ marginTop: Spacing[3] }}>
            Got It, Thanks
          </GoldButton>
        </View>
      </View>
    </Modal>
  );
}

// ── 3. Studio Bay Location & Hours Modal ──────────────────────────────────

export function StudioBayModal({ visible, onClose }) {
  const callStudio = () => {
    Linking.openURL('tel:+63321234567');
  };

  const openMaps = () => {
    Linking.openURL('https://maps.google.com/?q=E-Kodak+Photography+Studio+Cebu');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Studio Location & Hours</Text>
              <Text style={styles.modalSub}>Visit us at our flagship Cebu studio bay.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <GlassCard highlight style={styles.locationCard}>
              <View style={styles.locRow}>
                <View style={styles.locIconWrapper}>
                  <MapPin size={18} color={Colors.gold.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locLabel}>STUDIO ADDRESS</Text>
                  <Text style={styles.locValue}>E-Kodak Photography Studio</Text>
                  <Text style={styles.locSub}>Gorordo Avenue, Lahug, Cebu City 6000, Philippines</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.locRow}>
                <View style={styles.locIconWrapper}>
                  <Clock size={18} color={Colors.gold.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locLabel}>STUDIO OPERATING HOURS</Text>
                  <Text style={styles.locValue}>Monday – Saturday: 9:00 AM – 7:00 PM</Text>
                  <Text style={styles.locSub}>Sunday: 10:00 AM – 5:00 PM (By Appointment)</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.locRow}>
                <View style={styles.locIconWrapper}>
                  <Phone size={18} color={Colors.gold.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locLabel}>STUDIO CONCIERGE</Text>
                  <Text style={styles.locValue}>+63 (32) 123-4567</Text>
                  <Text style={styles.locSub}>concierge@ekodak.ph</Text>
                </View>
              </View>
            </GlassCard>

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
                style={{ flex: 1 }}
                size="sm"
              >
                Get Directions
              </GoldButton>
            </View>
            <View style={{ height: 20 }} />
          </ScrollView>

          <GoldButton variant="ghost" onPress={onClose} style={{ marginTop: Spacing[2] }}>
            Close
          </GoldButton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(13, 11, 9, 0.55)',
  },
  modalCard: {
    backgroundColor: Colors.bg.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gold.borderLight,
    padding: Spacing[6],
    maxHeight: '85%',
    ...Shadow.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing[4],
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
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalScroll: {
    maxHeight: 460,
  },

  // Packages
  packageCard: {
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  pkgTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pkgName: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  metaText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  pkgPrice: {
    fontFamily: Typography.fontHeading,
    fontSize: Typography.size.lg,
    color: Colors.gold.light,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gold.border,
    marginVertical: Spacing[3],
  },
  inclusionsList: {
    gap: 6,
  },
  inclusionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inclusionText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.neutral[300],
    lineHeight: 18,
    flex: 1,
  },

  // Tips
  tipCard: {
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginBottom: Spacing[2],
  },
  tipIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
  },
  tipDesc: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 20,
  },

  // Location
  locationCard: {
    padding: Spacing[4],
    marginBottom: Spacing[4],
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  locIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gold.bg,
    borderWidth: 1,
    borderColor: Colors.gold.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  locLabel: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10,
    color: Colors.gold.light,
    letterSpacing: 1,
    marginBottom: 2,
  },
  locValue: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
  },
  locSub: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    marginTop: 2,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
});
