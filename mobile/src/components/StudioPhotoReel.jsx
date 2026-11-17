import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Heart, X } from 'lucide-react-native';
import { likeGalleryPhoto } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function StudioPhotoReel({ galleryItems = [], onPhotoLike }) {
  const { isDark, colors } = useTheme();
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [likedIds, setLikedIds] = useState({});
  const [showBefore, setShowBefore] = useState(false);

  const handleLike = useCallback(async (photo) => {
    if (!photo?.id) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const alreadyLiked = Boolean(likedIds[photo.id]);
    setLikedIds((prev) => ({ ...prev, [photo.id]: !alreadyLiked }));

    if (!alreadyLiked) {
      const nextLikes = await likeGalleryPhoto(photo.id, photo.likes || 0);
      onPhotoLike?.(photo.id, nextLikes);
    }
  }, [likedIds, onPhotoLike]);

  const openLightbox = useCallback((photo) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setShowBefore(false);
    setSelectedPhoto(photo);
  }, []);

  if (!galleryItems || galleryItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionWrap}>
      <Text
        style={[
          styles.sectionHeading,
          { color: isDark ? colors.text.secondary : '#5E5447' },
        ]}
      >
        SAMPLE PHOTOS
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {galleryItems.map((photo) => {
          const isLiked = Boolean(likedIds[photo.id]);
          return (
            <TouchableOpacity
              key={photo.id}
              activeOpacity={0.9}
              onPress={() => openLightbox(photo)}
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? colors.bg.card : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#EAE1CF',
                },
              ]}
            >
              <View style={styles.imageWrap}>
                <Image
                  source={{ uri: photo.image_url }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.cardBody}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    styles.cardTitle,
                    { color: isDark ? colors.text.primary : '#181410' },
                  ]}
                >
                  {photo.title || 'Studio Portrait'}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleLike(photo);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    styles.heartPill,
                    isLiked
                      ? {
                          backgroundColor: isDark ? 'rgba(225, 29, 72, 0.22)' : '#FCE8EA',
                          borderColor: isDark ? 'rgba(244, 63, 94, 0.35)' : 'rgba(190, 60, 80, 0.16)',
                        }
                      : {
                          backgroundColor: isDark ? 'rgba(212, 175, 55, 0.16)' : '#FCF3D6',
                          borderColor: isDark ? 'rgba(212, 175, 55, 0.28)' : 'rgba(180, 140, 50, 0.16)',
                        },
                  ]}
                  accessibilityLabel={`Favorite ${photo.title || 'sample photo'}`}
                >
                  <Heart
                    size={12}
                    strokeWidth={2}
                    color={
                      isLiked
                        ? (isDark ? '#FDA4AF' : '#A93A4B')
                        : (isDark ? '#F5D67B' : '#3D3224')
                    }
                    fill={isLiked ? (isDark ? '#FDA4AF' : '#A93A4B') : 'transparent'}
                  />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lightbox Modal */}
      <Modal
        visible={Boolean(selectedPhoto)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setSelectedPhoto(null)}
            accessibilityLabel="Close photo preview"
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedPhoto && (
            <View style={styles.modalCard}>
              <Image
                source={{
                  uri:
                    showBefore && selectedPhoto.before_image
                      ? selectedPhoto.before_image
                      : selectedPhoto.image_url,
                }}
                style={styles.modalImage}
                resizeMode="contain"
              />

              <View
                style={[
                  styles.modalMeta,
                  {
                    backgroundColor: isDark ? '#1A171C' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#EAE1CF',
                  },
                ]}
              >
                <View style={styles.modalTitleRow}>
                  <View style={styles.modalTextCol}>
                    <Text
                      style={[
                        styles.modalTitle,
                        { color: isDark ? '#FFFFFF' : '#181410' },
                      ]}
                    >
                      {selectedPhoto.title}
                    </Text>
                    {Boolean(selectedPhoto.description) && (
                      <Text
                        style={[
                          styles.modalDesc,
                          { color: isDark ? '#BDB5A8' : '#5C5346' },
                        ]}
                      >
                        {selectedPhoto.description}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleLike(selectedPhoto)}
                    style={[
                      styles.modalHeartBtn,
                      {
                        backgroundColor: likedIds[selectedPhoto.id] ? '#FCE8EA' : '#FCF3D6',
                      },
                    ]}
                  >
                    <Heart
                      size={16}
                      color={likedIds[selectedPhoto.id] ? '#A93A4B' : '#3D3224'}
                      fill={likedIds[selectedPhoto.id] ? '#A93A4B' : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>

                {Boolean(selectedPhoto.before_image) && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setShowBefore((v) => !v)}
                    style={[
                      styles.beforeToggleBtn,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F4EEDB',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.beforeToggleText,
                        { color: isDark ? '#F5D67B' : '#181410' },
                      ]}
                    >
                      {showBefore ? 'View Final Edit' : 'View Original'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    marginTop: 22,
  },
  sectionHeading: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  scrollContent: {
    gap: 12,
    paddingRight: 8,
    paddingBottom: 6,
  },
  card: {
    width: 158,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#8B7344',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    height: 152,
    backgroundColor: '#E8DEC8',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  cardTitle: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 13.5,
    lineHeight: 18,
  },
  heartPill: {
    marginTop: 8,
    width: 34,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 10, 8, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 14,
  },
  modalImage: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.54,
    borderRadius: 18,
  },
  modalMeta: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTextCol: {
    flex: 1,
  },
  modalTitle: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 16,
  },
  modalDesc: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  modalHeartBtn: {
    width: 40,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beforeToggleBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  beforeToggleText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 13,
  },
});
