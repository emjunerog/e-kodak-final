/**
 * PhotographerProfileScreen.jsx
 * Photographer Profile Screen (Tab 4):
 *  - Floating GlassHeader (no icon beside title) with manual refresh action
 *  - Card 1: Cover stage with layered optical blur transition + editable avatar + name
 *  - Card 2: Organized read-only Profile Details card with Pencil edit trigger (opens modal)
 *  - Card 3: Workload stats summary
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  RefreshCw,
  Pencil,
  Phone,
  ImageIcon,
  ImagePlus,
  Check,
  Save,
  X,
} from 'lucide-react-native';

import GlassBackground from '../components/GlassBackground';
import GlassHeader from '../components/GlassHeader';
import GlassCard from '../components/GlassCard';
import GoldButton from '../components/GoldButton';
import CardDecorElements from '../components/CardDecorElements';
import StudioShapeLoader from '../components/StudioShapeLoader';
import { verifyPhotographerSession } from '../services/bookingService';
import {
  getProfileCoverPreference,
  saveProfileCoverPreference,
} from '../services/storageService';
import {
  fetchPhotographerProfile,
  fetchAllAssignedShoots,
  calculatePhotographerStats,
  updatePhotographerProfile,
  updatePhotographerAvatar,
} from '../services/photographerService';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import { Shadow, Typography } from '../theme';

const DEFAULT_PROFILE_COVERS = [
  {
    id: 'atelier-gold',
    label: 'Atelier Sunlit',
    subtitle: 'Warm champagne daylight studio',
    source: require('../../assets/cover-atelier-gold.jpg'),
  },
  {
    id: 'velvet-twilight',
    label: 'Velvet Twilight',
    subtitle: 'Midnight slate & burnished amber',
    source: require('../../assets/cover-velvet-twilight.jpg'),
  },
];

const SPECIALTY_OPTIONS = [
  'Graduation Portraits',
  'Studio Sets',
  'Creative & Editorial',
  'Family Portraits',
  'Event Coverage',
];

function DetailRow({ label, value, isMutedValue, isDark, colors }) {
  return (
    <View style={staticStyles.detailRow}>
      <Text
        style={[
          staticStyles.detailLabel,
          { color: isDark ? 'rgba(214, 222, 235, 0.68)' : '#7C7469' },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          staticStyles.detailValue,
          {
            color: isMutedValue
              ? colors.text.muted
              : isDark
                ? colors.text.primary
                : '#181410',
          },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

export default function PhotographerProfileScreen({ navigation }) {
  const { isDark, isSage, colors, gradients } = useTheme();
  const { showAlert } = useDialog();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors, isDark, isSage), [colors, isDark, isSage]);

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, completed: 0, pendingConfirm: 0 });
  const [coverPref, setCoverPref] = useState(null);

  // Saved profile values
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [bio, setBio] = useState('');

  const [showCoverModal, setShowCoverModal] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [heroHeight, setHeroHeight] = useState(250);

  // Modal draft values (only committed when Save Profile succeeds)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [draftFirstName, setDraftFirstName] = useState('');
  const [draftLastName, setDraftLastName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftSpecialization, setDraftSpecialization] = useState('');
  const [draftBio, setDraftBio] = useState('');

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadProfileData = useCallback(async () => {
    try {
      const auth = await verifyPhotographerSession();
      if (!auth.authorized || !auth.profile?.id) {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        return;
      }
      const uid = auth.profile.id;
      const [profileRes, shootsRes, savedCover] = await Promise.all([
        fetchPhotographerProfile(uid),
        fetchAllAssignedShoots(uid),
        getProfileCoverPreference(),
      ]);

      const merged = profileRes?.data || auth.profile;
      setProfile(merged);
      setFirstName(merged.first_name || '');
      setLastName(merged.last_name || '');
      setPhone(merged.phone || '');
      setSpecialization(merged.specialization || '');
      setBio(merged.bio || '');

      if (typeof savedCover === 'string') {
        setCoverPref({ presetId: savedCover, customUri: null });
      } else if (savedCover && typeof savedCover === 'object') {
        setCoverPref(savedCover);
      } else {
        setCoverPref({
          presetId: isDark ? 'velvet-twilight' : 'atelier-gold',
          customUri: null,
        });
      }

      if (!shootsRes.error) {
        setStats(calculatePhotographerStats(shootsRes.data || []));
      }
    } catch {
      // Keep cached values on transient network issue
    } finally {
      setInitialLoading(false);
    }
  }, [navigation, isDark]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  }, [loadProfileData]);

  const defaultCoverId = isDark ? 'velvet-twilight' : 'atelier-gold';
  const activeCoverPresetId = coverPref?.presetId || defaultCoverId;
  const activeDefaultCover =
    DEFAULT_PROFILE_COVERS.find((c) => c.id === activeCoverPresetId) ||
    DEFAULT_PROFILE_COVERS[0];
  const activeCoverSource =
    activeCoverPresetId === 'custom' && coverPref?.customUri
      ? { uri: coverPref.customUri }
      : activeDefaultCover.source;

  const handleSelectDefaultCover = async (presetId) => {
    Haptics.selectionAsync().catch(() => {});
    const nextPref = { presetId, customUri: null };
    setCoverPref(nextPref);
    await saveProfileCoverPreference(nextPref).catch(() => {});
    setShowCoverModal(false);
  };

  const handlePickCustomCover = async () => {
    if (uploadingCover) return;
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showAlert(
            'Photo Access Needed',
            'Please allow photo library access in settings to choose a cover photo.',
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploadingCover(true);
      const asset = result.assets[0];
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 960 } }],
        {
          compress: 0.82,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );

      const dataUri = manipulated?.base64
        ? `data:image/jpeg;base64,${manipulated.base64}`
        : asset.uri;
      const nextPref = { presetId: 'custom', customUri: dataUri };
      setCoverPref(nextPref);
      await saveProfileCoverPreference(nextPref).catch(() => {});
      setShowCoverModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      showAlert('Cover Error', err?.message || 'Could not update your cover photo.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handlePickAvatar = async () => {
    if (!profile?.id || uploadingAvatar) return;
    Haptics.selectionAsync().catch(() => {});

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert('Photo Permission Needed', 'Please allow photo library access to update your avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploadingAvatar(true);
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 320, height: 320 } }],
        {
          compress: 0.78,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );

      if (!manipulated.base64) {
        showAlert('Upload Error', 'Could not prepare the selected photo.');
        return;
      }

      const dataUri = `data:image/jpeg;base64,${manipulated.base64}`;
      const res = await updatePhotographerAvatar(profile.id, dataUri);
      if (res.error) {
        showAlert('Upload Failed', res.error.message || 'Could not update profile photo.');
        return;
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: dataUri } : prev));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      showAlert('Photo Error', err?.message || 'Unable to change photo right now.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const openEditModal = () => {
    Haptics.selectionAsync().catch(() => {});
    setDraftFirstName(firstName);
    setDraftLastName(lastName);
    setDraftPhone(phone);
    setDraftSpecialization(specialization);
    setDraftBio(bio);
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!profile?.id || savingProfile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const cleanFirst = draftFirstName.trim();
    const cleanLast = draftLastName.trim();
    if (!cleanFirst && !cleanLast) {
      showAlert('Name Required', 'Please enter at least your first or last name.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updatePhotographerProfile(profile.id, {
        first_name: cleanFirst,
        last_name: cleanLast,
        phone: draftPhone.trim(),
        specialization: draftSpecialization.trim(),
        bio: draftBio.trim(),
      });

      if (res.error) {
        showAlert('Save Failed', res.error.message || 'Could not save your profile updates.');
        return;
      }

      await loadProfileData();
      setEditModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showAlert('Profile Saved', 'Your photographer profile has been updated.');
    } finally {
      setSavingProfile(false);
    }
  };

  const fullName =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    profile?.full_name ||
    'Studio Photographer';
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  const goldAvatarColors = gradients?.gold || [colors.gold.DEFAULT, colors.gold.light];
  const activeQueueCount = (stats.inProgress || 0) + (stats.pendingConfirm || 0);

  const cardGradientColors =
    gradients?.card ||
    (isDark ? ['#242029', '#151B24'] : ['#FAF2EA', '#E5EEF7']);
  const cardBorder = isDark
    ? 'rgba(180, 198, 224, 0.20)'
    : isSage
      ? '#D7DDD1'
      : '#DCDDE6';
  const dividerColor = isDark
    ? 'rgba(180, 198, 224, 0.14)'
    : isSage
      ? 'rgba(22, 27, 20, 0.08)'
      : 'rgba(24, 20, 16, 0.08)';
  const coverGradientOverlay = isDark
    ? [
        'rgba(23, 30, 42, 0.00)',
        'rgba(27, 29, 41, 0.14)',
        'rgba(25, 29, 41, 0.42)',
        'rgba(23, 30, 42, 0.74)',
        'rgba(23, 30, 42, 0.94)',
        '#171E2A',
      ]
    : isSage
      ? [
          'rgba(245, 247, 240, 0.00)',
          'rgba(241, 245, 236, 0.16)',
          'rgba(235, 241, 229, 0.46)',
          'rgba(230, 237, 223, 0.78)',
          'rgba(227, 235, 220, 0.95)',
          '#E3EBDC',
        ]
      : [
          'rgba(250, 240, 226, 0.00)',
          'rgba(244, 240, 236, 0.14)',
          'rgba(237, 238, 242, 0.44)',
          'rgba(230, 236, 245, 0.76)',
          'rgba(226, 236, 247, 0.95)',
          '#E2ECF7',
        ];

  const coverBlurBands = useMemo(
    () => [
      { topFrac: 0.18, blur: Platform.OS === 'ios' ? 6 : 4, opacity: 0.14 },
      { topFrac: 0.28, blur: Platform.OS === 'ios' ? 10 : 7, opacity: 0.2 },
      { topFrac: 0.38, blur: Platform.OS === 'ios' ? 14 : 10, opacity: 0.28 },
      { topFrac: 0.48, blur: Platform.OS === 'ios' ? 18 : 13, opacity: 0.42 },
      { topFrac: 0.58, blur: Platform.OS === 'ios' ? 24 : 16, opacity: 0.65 },
    ],
    [],
  );

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <GlassBackground />

      <GlassHeader
        title="Photographer Profile"
        subtitle="Identity, details & workload"
        right={
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={onRefresh}
            activeOpacity={0.75}
            accessibilityLabel="Refresh profile"
          >
            <RefreshCw size={18} color={colors.text.primary} strokeWidth={2} />
          </TouchableOpacity>
        }
      />

      {initialLoading ? (
        <View style={styles.loaderWrap}>
          <StudioShapeLoader size={88} isDark={isDark} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 120 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold.DEFAULT}
              colors={[colors.gold.DEFAULT]}
            />
          }
        >
          {/* Card 1: Cover Stage with Smooth Optical Blur Fade + Avatar + Photographer Name */}
          <View style={[styles.cardOuter, { borderColor: cardBorder }]}>
            <LinearGradient
              colors={cardGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.identityCardGradient}
              onLayout={(e) => {
                const h = Math.round(e.nativeEvent.layout.height);
                if (h > 0 && Math.abs(h - heroHeight) > 1) {
                  setHeroHeight(h);
                }
              }}
            >
              {/* Full-card Cover Image with Feathered Multi-Step Blur & Smooth Gradient Fade */}
              <View pointerEvents="none" style={styles.coverStage}>
                <Image
                  source={activeCoverSource}
                  resizeMode="cover"
                  style={[styles.coverBaseImage, { height: heroHeight }]}
                />
                {coverBlurBands.map((band, idx) => {
                  const offset = Math.round(heroHeight * band.topFrac);
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.coverBlurBandWrap,
                        { top: offset, opacity: band.opacity },
                      ]}
                    >
                      <Image
                        source={activeCoverSource}
                        resizeMode="cover"
                        blurRadius={band.blur}
                        style={[
                          styles.coverBlurBandImg,
                          { top: -offset, height: heroHeight },
                        ]}
                      />
                    </View>
                  );
                })}
                <LinearGradient
                  colors={coverGradientOverlay}
                  locations={[0, 0.22, 0.44, 0.64, 0.82, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              {/* Cover Chooser Pill (opens cover choices modal) */}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setShowCoverModal(true);
                }}
                style={[
                  styles.coverPickerPill,
                  {
                    backgroundColor: isDark
                      ? 'rgba(20, 24, 34, 0.68)'
                      : 'rgba(255, 255, 255, 0.78)',
                    borderColor: isDark
                      ? 'rgba(255, 255, 255, 0.18)'
                      : 'rgba(24, 20, 16, 0.12)',
                  },
                ]}
                accessibilityLabel="Choose profile cover photo"
              >
                <ImageIcon
                  size={12}
                  color={isDark ? '#F5E7CE' : '#181410'}
                  strokeWidth={2.1}
                />
                <Text
                  style={[
                    styles.coverPickerPillText,
                    { color: isDark ? '#F5E7CE' : '#181410' },
                  ]}
                >
                  Cover
                </Text>
              </TouchableOpacity>

              {/* Centered Editable Circular Avatar */}
              <TouchableOpacity
                style={styles.avatarRingWrap}
                onPress={handlePickAvatar}
                disabled={uploadingAvatar}
                activeOpacity={0.85}
                accessibilityLabel="Edit photographer profile photo"
              >
                <View
                  style={[
                    styles.avatarHalo,
                    {
                      borderColor: isDark
                        ? 'rgba(255, 244, 224, 0.34)'
                        : 'rgba(255, 255, 255, 0.92)',
                    },
                  ]}
                >
                  {profile?.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={styles.avatarCirclePhoto}
                    />
                  ) : (
                    <LinearGradient
                      colors={goldAvatarColors}
                      start={{ x: 0.15, y: 0 }}
                      end={{ x: 0.85, y: 1 }}
                      style={styles.avatarCircleGradient}
                    >
                      <Text
                        style={[
                          styles.avatarInitialText,
                          isSage && { color: '#FFFFFF' },
                        ]}
                      >
                        {initials || 'EK'}
                      </Text>
                    </LinearGradient>
                  )}
                </View>

                <View
                  style={[
                    styles.avatarEditBadge,
                    {
                      backgroundColor: isDark ? '#F5E7CE' : '#181410',
                      borderColor: isDark ? '#242029' : '#FAF2EA',
                    },
                  ]}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator
                      size={11}
                      color={isDark ? '#181410' : '#FAF2EA'}
                    />
                  ) : (
                    <Pencil
                      size={12}
                      color={isDark ? '#181410' : '#FAF2EA'}
                      strokeWidth={2.2}
                    />
                  )}
                </View>
              </TouchableOpacity>

              {/* Photographer Name */}
              <Text
                style={[
                  styles.centeredProfileName,
                  { color: isDark ? colors.text.primary : '#181410' },
                ]}
                numberOfLines={2}
              >
                {fullName}
              </Text>

              {/* Studio Bio directly below Profile Name */}
              <Text
                style={[
                  styles.heroBioText,
                  {
                    color: bio.trim()
                      ? isDark
                        ? 'rgba(226, 232, 240, 0.84)'
                        : '#554E45'
                      : colors.text.muted,
                  },
                ]}
                numberOfLines={3}
              >
                {bio.trim() || 'No studio bio added yet.'}
              </Text>
            </LinearGradient>
          </View>

          {/* Card 2: Workload Summary (immediately below profile hero card) */}
          <View style={[styles.cardOuter, { borderColor: cardBorder }]}>
            <LinearGradient
              colors={cardGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsCardGradient}
            >
              <Text style={styles.cardHeading}>Workload Summary</Text>

              <View style={styles.statsStrip}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Total Assigned</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{activeQueueCount}</Text>
                  <Text style={styles.statLabel}>Active Queue</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.completed}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Card 3: Organized Read-Only Profile Details with Edit Icon Trigger */}
          <View style={[styles.cardOuter, { borderColor: cardBorder }]}>
            <LinearGradient
              colors={cardGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.detailsCardGradient}
            >
              <CardDecorElements variant="corner" isDark={isDark} />

              <View style={styles.detailsCardHeader}>
                <Text style={styles.cardHeading}>Profile Details</Text>
                <TouchableOpacity
                  style={styles.editTriggerBtn}
                  onPress={openEditModal}
                  activeOpacity={0.78}
                  accessibilityLabel="Edit profile details"
                >
                  <Pencil size={15} color={colors.gold.DEFAULT} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              <DetailRow
                label="Full Name"
                value={fullName}
                isMutedValue={!firstName && !lastName && !profile?.full_name}
                isDark={isDark}
                colors={colors}
              />
              <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

              <DetailRow
                label="Studio Role"
                value={profile?.role ? String(profile.role).toUpperCase() : 'PHOTOGRAPHER'}
                isMutedValue={!profile?.role}
                isDark={isDark}
                colors={colors}
              />
              <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

              <DetailRow
                label="Portal Access"
                value={profile?.is_active !== false ? 'Active & Verified' : 'Pending Approval'}
                isMutedValue={false}
                isDark={isDark}
                colors={colors}
              />
              <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

              <DetailRow
                label="QR Pass ID"
                value={
                  profile?.qr_login_token
                    ? `PH-${String(profile.qr_login_token).slice(0, 8).toUpperCase()}`
                    : profile?.id
                      ? `PH-${String(profile.id).slice(0, 8).toUpperCase()}`
                      : 'Verified Staff'
                }
                isMutedValue={!profile?.qr_login_token && !profile?.id}
                isDark={isDark}
                colors={colors}
              />
              <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

              <DetailRow
                label="Contact Phone"
                value={phone.trim() || 'Not set'}
                isMutedValue={!phone.trim()}
                isDark={isDark}
                colors={colors}
              />
              <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

              <DetailRow
                label="Specialization"
                value={specialization.trim() || 'Not set'}
                isMutedValue={!specialization.trim()}
                isDark={isDark}
                colors={colors}
              />
              <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

              <DetailRow
                label="Account Email"
                value={profile?.email || 'Not set'}
                isMutedValue={!profile?.email}
                isDark={isDark}
                colors={colors}
              />
            </LinearGradient>
          </View>
        </ScrollView>
      )}

      {/* Edit Profile Modal (Triggered strictly from Edit Pencil Icon) */}
      <Modal
        visible={editModalVisible}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setEditModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardWrap}
          >
            <GlassCard opaque blurred={false} style={styles.editModalCard}>
              <View style={styles.editModalHeader}>
                <View>
                  <Text style={styles.editModalTitle}>Edit Profile</Text>
                  <Text style={styles.editModalSubtitle}>
                    Update your photographer details
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setEditModalVisible(false)}
                  activeOpacity={0.78}
                  accessibilityLabel="Close edit profile"
                >
                  <X size={17} color={colors.text.primary} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.editModalScrollContent}
              >
                <View style={styles.nameRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>FIRST NAME</Text>
                    <TextInput
                      style={styles.textInput}
                      value={draftFirstName}
                      onChangeText={setDraftFirstName}
                      placeholder="First name"
                      placeholderTextColor={colors.text.muted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>LAST NAME</Text>
                    <TextInput
                      style={styles.textInput}
                      value={draftLastName}
                      onChangeText={setDraftLastName}
                      placeholder="Last name"
                      placeholderTextColor={colors.text.muted}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>CONTACT PHONE</Text>
                <View style={styles.iconInputWrap}>
                  <Phone size={16} color={colors.text.muted} strokeWidth={2} />
                  <TextInput
                    style={styles.iconTextInput}
                    value={draftPhone}
                    onChangeText={setDraftPhone}
                    placeholder="+63 9XX XXX XXXX"
                    placeholderTextColor={colors.text.muted}
                    keyboardType="phone-pad"
                  />
                </View>

                <Text style={styles.fieldLabel}>SPECIALIZATION</Text>
                <View style={styles.chipWrap}>
                  {SPECIALTY_OPTIONS.map((item) => {
                    const selected =
                      draftSpecialization.trim().toLowerCase() === item.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.specialtyChip,
                          selected && styles.specialtyChipActive,
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setDraftSpecialization(item);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.specialtyChipText,
                            selected && styles.specialtyChipTextActive,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={[styles.textInput, { marginBottom: 14 }]}
                  value={draftSpecialization}
                  onChangeText={setDraftSpecialization}
                  placeholder="Or enter custom specialty"
                  placeholderTextColor={colors.text.muted}
                />

                <Text style={styles.fieldLabel}>STUDIO BIO</Text>
                <TextInput
                  style={[styles.textInput, styles.bioInput]}
                  value={draftBio}
                  onChangeText={setDraftBio}
                  placeholder="Share your portrait style or studio focus..."
                  placeholderTextColor={colors.text.muted}
                  multiline
                />

                <GoldButton
                  icon={Save}
                  loading={savingProfile}
                  onPress={handleSaveProfile}
                >
                  {savingProfile ? 'Saving Profile...' : 'Save Changes'}
                </GoldButton>
              </ScrollView>
            </GlassCard>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Profile Cover Chooser Modal (shows choices first before applying) */}
      <Modal
        visible={showCoverModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowCoverModal(false)}
      >
        <View style={styles.coverModalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowCoverModal(false)}
          />
          <View style={[styles.coverModalOuter, { borderColor: cardBorder }]}>
            <LinearGradient
              colors={cardGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverModalInner}
            >
              <View style={styles.coverModalHeader}>
                <View style={styles.coverModalTitleCol}>
                  <Text
                    style={[
                      styles.coverModalTitle,
                      { color: isDark ? colors.text.primary : '#181410' },
                    ]}
                  >
                    Profile Cover
                  </Text>
                  <Text
                    style={[
                      styles.coverModalSubtitle,
                      {
                        color: isDark
                          ? 'rgba(214, 222, 235, 0.72)'
                          : '#6C6458',
                      },
                    ]}
                  >
                    Choose one of 2 default covers or upload your own
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowCoverModal(false)}
                  style={[
                    styles.coverModalCloseBtn,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.10)'
                        : 'rgba(24, 20, 16, 0.06)',
                      borderColor: dividerColor,
                    },
                  ]}
                  accessibilityLabel="Close cover chooser"
                >
                  <X
                    size={16}
                    color={isDark ? colors.text.primary : '#181410'}
                    strokeWidth={2}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.coverOptionsList}>
                {DEFAULT_PROFILE_COVERS.map((preset) => {
                  const isSelected = activeCoverPresetId === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      activeOpacity={0.86}
                      onPress={() => handleSelectDefaultCover(preset.id)}
                      style={[
                        styles.coverOptionCard,
                        {
                          borderColor: isSelected
                            ? colors.gold.DEFAULT
                            : cardBorder,
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.04)'
                            : 'rgba(255, 255, 255, 0.72)',
                        },
                      ]}
                    >
                      <View style={styles.coverThumbWrap}>
                        <Image
                          source={preset.source}
                          resizeMode="cover"
                          style={styles.coverThumbImg}
                        />
                        <View style={styles.coverThumbBlurWrap}>
                          <Image
                            source={preset.source}
                            resizeMode="cover"
                            blurRadius={Platform.OS === 'ios' ? 14 : 9}
                            style={styles.coverThumbBlurImg}
                          />
                        </View>
                        <LinearGradient
                          colors={[
                            'rgba(0,0,0,0.02)',
                            'rgba(0,0,0,0.18)',
                            isDark ? 'rgba(21,27,36,0.92)' : 'rgba(250,242,234,0.88)',
                          ]}
                          locations={[0, 0.55, 1]}
                          style={StyleSheet.absoluteFill}
                        />
                        {isSelected && (
                          <View
                            style={[
                              styles.coverSelectedPill,
                              { backgroundColor: isSage ? '#637356' : '#E6C47E' },
                            ]}
                          >
                            <Check
                              size={11}
                              color={isSage ? '#FFFFFF' : '#181410'}
                              strokeWidth={2.6}
                            />
                            <Text
                              style={[
                                styles.coverSelectedPillText,
                                isSage && { color: '#FFFFFF' },
                              ]}
                            >
                              Active
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.coverOptionMeta}>
                        <Text
                          style={[
                            styles.coverOptionTitle,
                            { color: isDark ? colors.text.primary : '#181410' },
                          ]}
                        >
                          {preset.label}
                        </Text>
                        <Text
                          style={[
                            styles.coverOptionSub,
                            {
                              color: isDark
                                ? 'rgba(214, 222, 235, 0.72)'
                                : '#6C6458',
                            },
                          ]}
                        >
                          {preset.subtitle}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePickCustomCover}
                disabled={uploadingCover}
                style={[
                  styles.customCoverBtn,
                  {
                    borderColor:
                      activeCoverPresetId === 'custom'
                        ? colors.gold.DEFAULT
                        : dividerColor,
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(24, 20, 16, 0.06)',
                  },
                ]}
              >
                {uploadingCover ? (
                  <ActivityIndicator size="small" color={isDark ? '#F5E7CE' : '#181410'} />
                ) : (
                  <ImagePlus
                    size={16}
                    color={isDark ? '#F5E7CE' : '#181410'}
                    strokeWidth={2}
                  />
                )}
                <Text
                  style={[
                    styles.customCoverBtnText,
                    { color: isDark ? colors.text.primary : '#181410' },
                  ]}
                >
                  {activeCoverPresetId === 'custom'
                    ? 'Change Custom Gallery Photo'
                    : 'Choose Photo from Gallery'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 12,
  },
  detailLabel: {
    fontFamily: Typography.fontBody,
    fontSize: 13.5,
    lineHeight: 19,
  },
  detailValue: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'right',
    flex: 1,
  },
});

const getStyles = (colors, isDark, isSage) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg.base,
    },
    headerActionBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.08)'
        : isSage
          ? 'rgba(79, 104, 70, 0.10)'
          : 'rgba(15, 23, 42, 0.06)',
    },
    loaderWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 10,
      gap: 14,
    },

    // Shared 2-Tone Card Frame matching Customer ProfileScreen
    cardOuter: {
      borderRadius: 24,
      borderWidth: 1,
      overflow: 'hidden',
      shadowColor: isDark ? '#000000' : '#4E4332',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.22 : 0.09,
      shadowRadius: 14,
      elevation: isDark ? 2 : 3,
    },

    // Card 1: Cover Stage + Optical Blur Transition + Avatar & Name
    identityCardGradient: {
      minHeight: 196,
      paddingTop: 34,
      paddingBottom: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    coverStage: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    coverBaseImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      width: '100%',
    },
    coverBlurBandWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
    },
    coverBlurBandImg: {
      position: 'absolute',
      left: 0,
      right: 0,
      width: '100%',
    },
    coverPickerPill: {
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },
    coverPickerPillText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.15,
    },
    avatarRingWrap: {
      marginBottom: 12,
      position: 'relative',
      zIndex: 2,
      ...Shadow.goldSoft,
    },
    avatarHalo: {
      borderRadius: 38,
      borderWidth: 2.5,
      overflow: 'hidden',
    },
    avatarCircleGradient: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarCirclePhoto: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 2,
      borderColor: colors.gold.DEFAULT,
    },
    avatarInitialText: {
      fontFamily: Typography.fontHeading,
      fontSize: 27,
      color: '#181410',
      includeFontPadding: false,
    },
    avatarEditBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centeredProfileName: {
      fontFamily: Typography.fontHeading,
      fontSize: 22,
      lineHeight: 28,
      textAlign: 'center',
      letterSpacing: -0.25,
      zIndex: 2,
    },
    heroBioText: {
      fontFamily: Typography.fontBody,
      fontSize: 13.5,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: 6,
      paddingHorizontal: 8,
      zIndex: 2,
    },

    // Card 2: Organized Read-Only Profile Details
    detailsCardGradient: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 18,
      position: 'relative',
    },
    detailsCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    cardHeading: {
      fontFamily: Typography.fontHeading,
      fontSize: 17,
      color: colors.text.primary,
    },
    editTriggerBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.gold.bg,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(230, 196, 126, 0.28)'
        : isSage
          ? 'rgba(79, 104, 70, 0.22)'
          : 'rgba(176, 125, 30, 0.22)',
    },
    specDivider: {
      height: StyleSheet.hairlineWidth,
    },

    // Card 3: Workload Summary
    statsCardGradient: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 20,
      gap: 14,
    },
    statsStrip: {
      flexDirection: 'row',
      gap: 10,
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 6,
      borderRadius: 16,
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.05)'
        : isSage
          ? 'rgba(79, 104, 70, 0.08)'
          : 'rgba(15,23,42,0.04)',
    },
    statValue: {
      fontFamily: Typography.fontHeading,
      fontSize: 22,
      color: colors.text.primary,
    },
    statLabel: {
      fontFamily: Typography.fontBodyMedium,
      fontSize: 11,
      color: colors.text.muted,
      textAlign: 'center',
      marginTop: 2,
    },

    // Edit Profile Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(8, 12, 22, 0.54)',
      justifyContent: 'center',
      paddingHorizontal: 18,
      paddingVertical: 28,
    },
    modalKeyboardWrap: {
      width: '100%',
      maxHeight: '90%',
    },
    editModalCard: {
      padding: 20,
      borderRadius: 24,
      maxHeight: '100%',
    },
    editModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    editModalTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 18,
      color: colors.text.primary,
    },
    editModalSubtitle: {
      fontFamily: Typography.fontBody,
      fontSize: 12.5,
      color: colors.text.muted,
      marginTop: 2,
    },
    modalCloseBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(15,23,42,0.06)',
    },
    editModalScrollContent: {
      paddingBottom: 4,
    },
    nameRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    fieldLabel: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 11,
      letterSpacing: 0.9,
      color: colors.text.muted,
      marginBottom: 6,
    },
    textInput: {
      fontFamily: Typography.fontBody,
      fontSize: 14,
      color: colors.text.primary,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(15,23,42,0.11)',
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(255,255,255,0.88)',
    },
    iconInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 12,
      borderRadius: 13,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(15,23,42,0.11)',
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(255,255,255,0.88)',
    },
    iconTextInput: {
      flex: 1,
      fontFamily: Typography.fontBody,
      fontSize: 14,
      color: colors.text.primary,
      paddingVertical: 11,
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    specialtyChip: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(15,23,42,0.10)',
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(255,255,255,0.85)',
    },
    specialtyChipActive: {
      backgroundColor: colors.gold.DEFAULT,
      borderColor: colors.gold.DEFAULT,
    },
    specialtyChipText: {
      fontFamily: Typography.fontBodySemi,
      fontSize: 12,
      color: colors.text.secondary,
    },
    specialtyChipTextActive: {
      color: '#FFFFFF',
    },
    bioInput: {
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: 16,
    },

    // Cover Chooser Modal
    coverModalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(10, 12, 18, 0.58)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    coverModalOuter: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 24,
      borderWidth: 1,
      overflow: 'hidden',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.28,
      shadowRadius: 24,
      elevation: 10,
    },
    coverModalInner: {
      padding: 20,
    },
    coverModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 16,
    },
    coverModalTitleCol: {
      flex: 1,
    },
    coverModalTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.2,
    },
    coverModalSubtitle: {
      fontFamily: Typography.fontBody,
      fontSize: 12.5,
      lineHeight: 17,
      marginTop: 2,
    },
    coverModalCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverOptionsList: {
      gap: 12,
      marginBottom: 14,
    },
    coverOptionCard: {
      borderRadius: 16,
      borderWidth: 1.5,
      overflow: 'hidden',
    },
    coverThumbWrap: {
      height: 84,
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
    },
    coverThumbImg: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 84,
      width: '100%',
    },
    coverThumbBlurWrap: {
      position: 'absolute',
      top: 44,
      left: 0,
      right: 0,
      height: 40,
      overflow: 'hidden',
    },
    coverThumbBlurImg: {
      position: 'absolute',
      top: -44,
      left: 0,
      right: 0,
      height: 84,
      width: '100%',
    },
    coverSelectedPill: {
      position: 'absolute',
      top: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    coverSelectedPillText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 10.5,
      lineHeight: 14,
      color: '#181410',
    },
    coverOptionMeta: {
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    coverOptionTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 13.5,
      lineHeight: 18,
    },
    coverOptionSub: {
      fontFamily: Typography.fontBody,
      fontSize: 11.5,
      lineHeight: 16,
      marginTop: 1,
    },
    customCoverBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    customCoverBtnText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 13,
      lineHeight: 17,
    },
  });
