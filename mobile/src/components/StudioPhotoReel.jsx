/**
 * StudioPhotoReel.jsx
 * Swipable animated photo collage & editorial reel for E-Kodak Studio.
 * Features:
 * - Real-time sync with Supabase gallery_items table
 * - Swipable card carousel with animated pagination dots
 * - Interactive heart like animation with haptic feedback & Supabase persistence
 * - Interactive full-screen lightbox with before/after retouching comparison
 */

import React, { useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  View, Text, StyleSheet, Image, Dimensions,
  ScrollView, TouchableOpacity, Modal, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Heart, Sparkles, X, Sliders, Image as ImageIcon,
  Maximize2, Eye, Award, Camera,
} from 'lucide-react-native';

import GlassCard from './GlassCard';
import { likeGalleryPhoto } from '../services/storageService';
import { Colors, Gradients, Typography, Spacing, Radius } from '../theme';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.78;
const CARD_SPACING = 16;
const SNAP_INTERVAL = CARD_WIDTH + CARD_SPACING;

export default function StudioPhotoReel({ galleryItems = [], onPhotoLike }) {
  const { isDark, colors, gradients } = useTheme();
  const styles = getStyles(colors, isDark);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showBefore, setShowBefore] = useState(false);
  const [likedMap, setLikedMap] = useState({});

  const scrollX = useRef(new Animated.Value(0)).current;
  const heartScaleAnim = useRef(new Animated.Value(1)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const offset = event.nativeEvent.contentOffset.x;
        const index = Math.round(offset / SNAP_INTERVAL);
        if (index !== activeIndex && index >= 0 && index < galleryItems.length) {
          setActiveIndex(index);
        }
      },
    }
  );

  const handleLike = async (photo) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    Animated.sequence([
      Animated.timing(heartScaleAnim, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.spring(heartScaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    const isAlreadyLiked = likedMap[photo.id];
    const currentLikes = photo.likes || 0;
    const nextLikes = isAlreadyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;

    setLikedMap((prev) => ({ ...prev, [photo.id]: !isAlreadyLiked }));

    // Persist to Supabase
    await likeGalleryPhoto(photo.id, currentLikes);
    onPhotoLike?.(photo.id, nextLikes);
  };

  const openLightbox = (photo) => {
    try { Haptics.selectionAsync(); } catch {}
    setSelectedPhoto(photo);
    setShowBefore(false);
  };

  if (!galleryItems || galleryItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* ── Section Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.badgePulse}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveBadgeText}>LIVE STUDIO GALLERY</Text>
          </View>
          <Text style={styles.sectionTitle}>Curated Portfolio Reel</Text>
        </View>

        <Text style={styles.photoCountText}>
          {activeIndex + 1} / {galleryItems.length}
        </Text>
      </View>

      {/* ── Swipable Photo Carousel ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {galleryItems.map((photo, index) => {
          const isLiked = likedMap[photo.id];
          const displayLikes = (photo.likes || 0) + (isLiked ? 1 : 0);

          return (
            <TouchableOpacity
              key={photo.id || index}
              activeOpacity={0.92}
              onPress={() => openLightbox(photo)}
              style={styles.cardWrapper}
            >
              <GlassCard glow={false} highlight={false} style={styles.photoCard}>
                {/* Photo Image */}
                <Image
                  source={{ uri: photo.image_url }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />

                {/* Dark Vignette Gradient */}
                <LinearGradient
                  colors={['transparent', 'rgba(13, 11, 9, 0.4)', 'rgba(13, 11, 9, 0.94)']}
                  locations={[0.3, 0.65, 1]}
                  style={styles.vignette}
                />

                {/* Top Overlay Badges */}
                <View style={styles.cardTopRow}>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryText}>{photo.category}</Text>
                  </View>

                  {photo.before_image && (
                    <View style={styles.retouchPill}>
                      <Sliders size={10} color={colors.gold.light} />
                      <Text style={styles.retouchText}>RAW / RETOUCH</Text>
                    </View>
                  )}
                </View>

                {/* Bottom Overlay Content */}
                <View style={styles.cardBottom}>
                  <Text style={styles.photoTitle} numberOfLines={1}>
                    {photo.title}
                  </Text>
                  {photo.description ? (
                    <Text style={styles.photoDesc} numberOfLines={2}>
                      {photo.description}
                    </Text>
                  ) : null}

                  {/* Footer with Like & Fullscreen */}
                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      onPress={() => handleLike(photo)}
                      style={styles.likeBtn}
                      activeOpacity={0.8}
                    >
                      <Animated.View style={{ transform: [{ scale: heartScaleAnim }] }}>
                        <Heart
                          size={15}
                          color={isLiked ? '#EF4444' : colors.gold.light}
                          fill={isLiked ? '#EF4444' : 'transparent'}
                        />
                      </Animated.View>
                      <Text style={[styles.likeCount, isLiked && { color: '#EF4444' }]}>
                        {displayLikes}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.expandPrompt}>
                      <Text style={styles.expandPromptText}>Tap to inspect</Text>
                      <Maximize2 size={12} color={colors.gold.light} />
                    </View>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Animated Pagination Dots Indicator ── */}
      <View style={styles.dotsRow}>
        {galleryItems.map((_, i) => {
          const isActive = i === activeIndex;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                isActive && styles.dotActive,
              ]}
            />
          );
        })}
      </View>

      {/* ── Fullscreen Interactive Lightbox Modal ── */}
      <Modal
        visible={Boolean(selectedPhoto)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop dismiss */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedPhoto(null)}
          />

          {selectedPhoto && (
            <View style={styles.lightboxCard}>
              <GlassCard glow highlight style={styles.lightboxGlass}>
                {/* Header with close button */}
                <View style={styles.lightboxHeader}>
                  <View style={styles.lightboxCategory}>
                    <Text style={styles.lightboxCategoryText}>
                      {selectedPhoto.category} · E-KODAK STUDIO
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedPhoto(null)}
                    style={styles.lightboxCloseBtn}
                    activeOpacity={0.7}
                  >
                    <X size={18} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>

                {/* Main Large Image Container */}
                <View style={styles.lightboxImageWrapper}>
                  <Image
                    source={{
                      uri: showBefore && selectedPhoto.before_image
                        ? selectedPhoto.before_image
                        : selectedPhoto.image_url,
                    }}
                    style={styles.lightboxImage}
                    resizeMode="cover"
                  />

                  {/* Retouching comparison tag overlay */}
                  {showBefore && (
                    <View style={styles.beforeTagOverlay}>
                      <Text style={styles.beforeTagText}>UNEDITED RAW PREVIEW</Text>
                    </View>
                  )}
                </View>

                {/* RAW vs Retouched Toggle (If Before Image Available) */}
                {selectedPhoto.before_image && (
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      onPress={() => {
                        try { Haptics.selectionAsync(); } catch {}
                        setShowBefore(false);
                      }}
                      style={[styles.toggleBtn, !showBefore && styles.toggleBtnActive]}
                      activeOpacity={0.8}
                    >
                      <Sparkles size={13} color={!showBefore ? colors.text.onGold : colors.neutral[400]} />
                      <Text style={[styles.toggleBtnText, !showBefore && styles.toggleBtnTextActive]}>
                        Color Graded & Retouched
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        try { Haptics.selectionAsync(); } catch {}
                        setShowBefore(true);
                      }}
                      style={[styles.toggleBtn, showBefore && styles.toggleBtnActive]}
                      activeOpacity={0.8}
                    >
                      <Camera size={13} color={showBefore ? colors.text.onGold : colors.neutral[400]} />
                      <Text style={[styles.toggleBtnText, showBefore && styles.toggleBtnTextActive]}>
                        Original RAW
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Details Footer */}
                <View style={styles.lightboxDetails}>
                  <Text style={styles.lightboxTitle}>{selectedPhoto.title}</Text>
                  <Text style={styles.lightboxDesc}>
                    {selectedPhoto.description || 'Captured in Studio Bay A under high-CRI continuous lighting and hand-retouched.'}
                  </Text>

                  <View style={styles.lightboxMetaRow}>
                    <TouchableOpacity
                      onPress={() => handleLike(selectedPhoto)}
                      style={styles.lightboxLikeBtn}
                      activeOpacity={0.8}
                    >
                      <Heart
                        size={16}
                        color={likedMap[selectedPhoto.id] ? '#EF4444' : colors.gold.light}
                        fill={likedMap[selectedPhoto.id] ? '#EF4444' : 'transparent'}
                      />
                      <Text style={styles.lightboxLikeText}>
                        {(selectedPhoto.likes || 0) + (likedMap[selectedPhoto.id] ? 1 : 0)} Likes
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.lightboxStudioTag}>
                      E-Kodak Master Color Science
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    marginTop: Spacing[6],
    marginBottom: Spacing[4],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[3],
  },
  titleGroup: {
    gap: 4,
  },
  badgePulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212, 168, 83, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 83, 0.25)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.status.ready,
  },
  liveBadgeText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    color: colors.gold.light,
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.lg,
    color: isDark ? colors.text.primary : '#1F1A15',
  },
  photoCountText: {
    fontFamily: Typography.fontMono,
    fontSize: Typography.size.xs,
    color: isDark ? colors.gold.light : colors.gold.dark,
    letterSpacing: 1,
  },

  // Carousel
  scrollContent: {
    paddingHorizontal: Spacing[5],
    gap: CARD_SPACING,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  photoCard: {
    height: 380,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    position: 'relative',
    padding: 0,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
  },
  cardTopRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPill: {
    backgroundColor: 'rgba(13, 11, 9, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 83, 0.3)',
  },
  categoryText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10,
    color: colors.gold.light,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  retouchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(13, 11, 9, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 83, 0.3)',
  },
  retouchText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    color: colors.gold.light,
    letterSpacing: 0.5,
  },

  // Bottom Content
  cardBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing[4],
  },
  photoTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.lg,
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  photoDesc: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: '#F5EFE6', // Crisp warm ivory with high contrast over dark photo vignette in both light & dark mode
    lineHeight: 18,
    marginBottom: Spacing[3],
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 168, 83, 0.15)',
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(13, 11, 9, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 83, 0.25)',
  },
  likeCount: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    color: colors.text.primary,
  },
  expandPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  expandPromptText: {
    fontFamily: Typography.fontBody,
    fontSize: 10,
    color: colors.gold.light,
    letterSpacing: 0.4,
  },

  // Dots indicator
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing[3],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.gold.light,
  },

  // Lightbox Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 4, 3, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
  },
  lightboxCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: height * 0.9,
  },
  lightboxGlass: {
    padding: Spacing[4],
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  lightboxCategory: {
    backgroundColor: 'rgba(212, 168, 83, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.gold.border,
  },
  lightboxCategoryText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    color: colors.gold.light,
    letterSpacing: 0.8,
  },
  lightboxCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImageWrapper: {
    width: '100%',
    height: 280,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.bg.surface,
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  beforeTagOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  beforeTagText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 9,
    color: '#FFF',
    letterSpacing: 0.6,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing[3],
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.gold.border,
  },
  toggleBtnActive: {
    backgroundColor: colors.gold.DEFAULT,
    borderColor: colors.gold.light,
  },
  toggleBtnText: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 11,
    color: colors.neutral[400],
  },
  toggleBtnTextActive: {
    fontFamily: Typography.fontBodySemi,
    color: colors.text.onGold,
  },
  lightboxDetails: {
    marginTop: Spacing[3],
  },
  lightboxTitle: {
    fontFamily: Typography.fontHeadingSemi,
    fontSize: Typography.size.md,
    color: colors.text.primary,
    marginBottom: 4,
  },
  lightboxDesc: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.size.xs,
    color: isDark ? colors.text.secondary : '#3A322A',
    lineHeight: 18,
    marginBottom: Spacing[3],
  },
  lightboxMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 168, 83, 0.15)',
  },
  lightboxLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lightboxLikeText: {
    fontFamily: Typography.fontMono,
    fontSize: 12,
    color: colors.text.primary,
  },
  lightboxStudioTag: {
    fontFamily: Typography.fontBody,
    fontSize: 10,
    color: colors.gold.light,
    letterSpacing: 0.5,
  },
});
