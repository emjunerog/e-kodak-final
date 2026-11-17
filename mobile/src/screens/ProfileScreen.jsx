/**
 * ProfileScreen.jsx
 * Client Profile & Booking Details View.
 * Preserves the Google Sans typography, floating GlassHeader pill, and bottom navigation dock,
 * featuring Card 1 (centered gold monogram/editable avatar + name), Card 2 (booking specs +
 * Booking Code toggle/copy banner), and Card 3 (Delivery Processes from the shared database).
 * Returns empty ('—') fields when no QR pass has been scanned.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Image,
  Animated,
  Easing,
  NativeModules,
  TurboModuleRegistry,
  Share,
  ActivityIndicator,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  User,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Pencil,
  Truck,
  MapPin,
  Navigation,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ImagePlus,
  X,
} from 'lucide-react-native';

import GlassBackground from '../components/GlassBackground';
import GlassHeader from '../components/GlassHeader';
import CardDecorElements from '../components/CardDecorElements';
import DeliveryGoogleMap from '../components/DeliveryGoogleMap';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import {
  getCustomerProfile,
  getProfileCoverPreference,
  getSavedBookings,
  saveBookingToken,
  saveProfileCoverPreference,
  updateCachedCustomerAvatar,
} from '../services/storageService';
import {
  fetchBookingByToken,
  updateCustomerAvatarByPassToken,
} from '../services/bookingService';
import {
  fetchDeliveryGoogleMapInfo,
  buildGoogleMapsLinks,
  formatRouteDistance,
  formatRouteDuration,
  STUDIO_ORIGIN_ADDRESS,
} from '../services/googleMapsService';
import { Typography, Spacing, Shadow } from '../theme';

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

function formatPeso(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '';
  try {
    return '₱' + v.toLocaleString('en-PH', { maximumFractionDigits: 0 });
  } catch {
    return `₱${v}`;
  }
}

function formatSessionSchedule(dateStr, timeStr) {
  let formattedDate = '';
  if (dateStr) {
    try {
      const parsed = new Date(dateStr);
      if (!Number.isNaN(parsed.getTime())) {
        formattedDate = parsed.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch {
      formattedDate = '';
    }
  }
  const cleanTime = timeStr && String(timeStr).trim() ? String(timeStr).trim() : '';
  if (formattedDate && cleanTime) return `${formattedDate} · ${cleanTime}`;
  if (formattedDate) return formattedDate;
  if (cleanTime) return cleanTime;
  return 'Not set by studio';
}

function formatPaymentLabel(detailed, latestPass) {
  const amountText = formatPeso(
    detailed?.total_amount ?? detailed?.total_price ?? latestPass?.totalAmount
  );
  const rawStatus =
    detailed?.payment_status ||
    latestPass?.paymentStatus ||
    (detailed?.down_payment_confirmed || latestPass?.downPaymentConfirmed
      ? 'DOWN_PAYMENT_CONFIRMED'
      : '');
  const formattedStatus = rawStatus
    ? String(rawStatus)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase())
    : '';

  if (amountText && formattedStatus) return `${amountText} · ${formattedStatus}`;
  if (amountText) return amountText;
  if (formattedStatus) return formattedStatus;
  return 'Not set by studio';
}

async function copyTextToClipboard(text) {
  if (!text) return false;
  try {
    const turboClipboard = TurboModuleRegistry?.get?.('Clipboard');
    if (turboClipboard?.setString) {
      turboClipboard.setString(text);
      return true;
    }
    if (NativeModules?.Clipboard?.setString) {
      NativeModules.Clipboard.setString(text);
      return true;
    }
    if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback to share sheet if clipboard module is unavailable
  }
  try {
    await Share.share({ message: text });
    return true;
  } catch {
    return false;
  }
}

function formatDeliveryModeLabel(rawMode) {
  if (!rawMode || !String(rawMode).trim()) return '';
  const clean = String(rawMode).trim().toUpperCase();
  if (clean === 'SHIPPING' || clean === 'COURIER' || clean === 'DELIVERY' || clean === 'LBC' || clean === 'JNT') {
    return 'Door-to-Door Courier';
  }
  if (clean === 'STUDIO_PICKUP' || clean === 'PICKUP' || clean === 'STUDIO PICKUP') {
    return 'Studio Pickup';
  }
  if (clean === 'DIGITAL' || clean === 'DIGITAL_VAULT' || clean === 'DIGITAL ONLY') {
    return 'Digital Gallery Delivery';
  }
  return String(rawMode)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatDeliveryStatusLabel(deliveryDetails, latestDelivery) {
  const raw = latestDelivery?.status || deliveryDetails?.deliveryStatus || '';
  const clean = raw
    ? String(raw)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase())
    : '';
  const confirmed = Boolean(latestDelivery?.confirmed_by_customer_at || deliveryDetails?.confirmedByCustomerAt);
  if (clean && confirmed) return `${clean} · Customer Confirmed`;
  if (clean) return clean;
  if (confirmed) return 'Confirmed by Customer';
  return 'Pending studio dispatch';
}

function SpecRow({ label, value, isMutedValue = false, valueLines = 2, isDark, colors }) {
  return (
    <View style={staticStyles.specRow}>
      <Text
        style={[
          staticStyles.specLabel,
          { color: isDark ? 'rgba(214, 222, 235, 0.72)' : '#6C6458' },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          staticStyles.specValue,
          { color: isMutedValue ? colors.text.muted : colors.text.primary },
        ]}
        numberOfLines={valueLines}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { isDark, isSage, colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert, showProcess, waitProcessDuration } = useDialog();
  const styles = getStyles(colors, isDark);

  const [profile, setProfile] = useState(null);
  const [savedBookings, setSavedBookings] = useState([]);
  const [detailed, setDetailed] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showBookingCode, setShowBookingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [mapState, setMapState] = useState({
    key: '',
    data: null,
    configured: true,
    error: '',
  });
  const [mapLoadingKey, setMapLoadingKey] = useState('');
  const [isDeliveryExpanded, setIsDeliveryExpanded] = useState(true);
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [coverPref, setCoverPref] = useState(null);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [spinAnim] = useState(() => new Animated.Value(0));

  const handleToggleDelivery = () => {
    Haptics.selectionAsync().catch(() => { });
    setIsDeliveryExpanded((prev) => !prev);
  };

  const handleToggleMap = () => {
    Haptics.selectionAsync().catch(() => { });
    setIsMapExpanded((prev) => !prev);
  };

  const handleSelectDefaultCover = async (presetId) => {
    Haptics.selectionAsync().catch(() => { });
    const nextPref = { presetId, customUri: null };
    setCoverPref(nextPref);
    await saveProfileCoverPreference(nextPref);
    setShowCoverModal(false);
    showAlert(
      'Cover Updated',
      'Your profile cover theme has been applied.',
      [{ text: 'Done' }],
      { type: 'success' }
    );
  };

  const handlePickCustomCover = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showAlert(
            'Photo Access Needed',
            'Please allow photo library access in settings to choose a cover photo.',
            [{ text: 'OK' }],
            { type: 'danger' }
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

      if (result.canceled || !result.assets?.[0]) return;
      setShowCoverModal(false);
      showProcess('Updating Cover', 'Preparing your custom studio cover...');
      const asset = result.assets[0];
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 960 } }],
        {
          compress: 0.82,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      const dataUri = manipulated?.base64
        ? `data:image/jpeg;base64,${manipulated.base64}`
        : asset.uri;
      const nextPref = { presetId: 'custom', customUri: dataUri };
      setCoverPref(nextPref);
      await Promise.all([
        saveProfileCoverPreference(nextPref),
        waitProcessDuration(1050),
      ]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      showAlert(
        'Cover Updated',
        'Your custom profile cover photo has been saved.',
        [{ text: 'Done' }],
        { type: 'success' }
      );
    } catch (err) {
      showAlert(
        'Cover Error',
        err?.message || 'Could not update your cover photo.',
        [{ text: 'OK' }],
        { type: 'danger' }
      );
    }
  };

  useEffect(() => {
    if (!copiedCode) return undefined;
    const timer = setTimeout(() => {
      setCopiedCode(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [copiedCode]);

  const loadData = useCallback(async () => {
    const [prof, bookings, savedCover] = await Promise.all([
      getCustomerProfile(),
      getSavedBookings(),
      getProfileCoverPreference(),
    ]);

    if (savedCover) {
      setCoverPref(savedCover);
    }

    if (!bookings || bookings.length === 0) {
      setProfile(null);
      setSavedBookings([]);
      setDetailed(null);
      setShowBookingCode(false);
      return;
    }

    setProfile(prof);
    setSavedBookings(bookings);

    // Pull live client & booking record from Supabase for the active pass
    try {
      const primaryToken = bookings[0]?.token;
      if (primaryToken) {
        const { data } = await fetchBookingByToken(primaryToken);
        if (data) {
          setDetailed(data);
          const refreshedList = await saveBookingToken(primaryToken, data);
          if (Array.isArray(refreshedList) && refreshedList.length > 0) {
            setSavedBookings(refreshedList);
          }
          const refreshedProf = await getCustomerProfile();
          if (refreshedProf) setProfile(refreshedProf);
        } else {
          setDetailed(null);
        }
      }
    } catch {
      // Keep cached pass copy intact when offline
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    await loadData();
    setRefreshing(false);
  };

  // Strict QR-scanned state: if no QR pass is saved, return empty ('—') fields
  const hasScannedPass = savedBookings.length > 0;
  const latestPass = hasScannedPass ? savedBookings[0] : null;
  const dbProfile = hasScannedPass ? detailed?.profile || {} : {};
  const dbService = hasScannedPass ? detailed?.services || detailed?.service || {} : {};

  const safeProfileName =
    profile?.fullName && profile.fullName !== 'Studio Guest' ? profile.fullName : '';
  const safeProfileLocation =
    profile?.location && profile.location !== 'Studio Bay' ? profile.location : '';

  const clientName = hasScannedPass
    ? dbProfile.full_name || latestPass?.clientName || safeProfileName || '—'
    : '—';
  const clientAvatarUrl = hasScannedPass
    ? dbProfile.avatar_url || latestPass?.avatarUrl || null
    : null;

  const bookingRef = hasScannedPass
    ? detailed?.booking_number || latestPass?.bookingNumber || '—'
    : '—';
  const passToken = hasScannedPass
    ? detailed?.booking_token || latestPass?.token || ''
    : '';

  const packageParts = hasScannedPass
    ? [
      dbService.name || latestPass?.serviceName || '',
      detailed?.tier_name || latestPass?.tierName || '',
    ].filter((part, idx, arr) => Boolean(part) && arr.indexOf(part) === idx)
    : [];
  const packageLabel = hasScannedPass
    ? packageParts.length > 0
      ? packageParts.join(' · ')
      : 'Not set by studio'
    : '—';

  const locationLabel = hasScannedPass
    ? detailed?.location_address ||
    detailed?.location ||
    latestPass?.location ||
    safeProfileLocation ||
    'Not set by studio'
    : '—';

  const scheduleLabel = hasScannedPass
    ? formatSessionSchedule(
      detailed?.session_date || detailed?.event_date || latestPass?.sessionDate,
      detailed?.session_time || detailed?.preferred_time || latestPass?.sessionTime
    )
    : '—';

  const paymentLabel = hasScannedPass
    ? formatPaymentLabel(detailed, latestPass)
    : '—';

  // Delivery Processes values (DB-backed)
  const deliveryDetails = hasScannedPass
    ? detailed?.delivery_details || latestPass?.deliveryDetails || profile?.deliveryDetails || {}
    : {};
  const deliveryRecords = hasScannedPass
    ? detailed?.booking_deliveries || latestPass?.deliveries || profile?.deliveries || []
    : [];
  const latestDelivery = Array.isArray(deliveryRecords) && deliveryRecords.length > 0
    ? deliveryRecords[0]
    : null;

  const formattedMode = hasScannedPass
    ? formatDeliveryModeLabel(deliveryDetails?.fulfillmentMode || latestDelivery?.delivery_type)
    : '';
  const deliveryModeLabel = hasScannedPass
    ? formattedMode || 'Not selected yet'
    : '—';

  const deliveryStatusLabel = hasScannedPass
    ? formatDeliveryStatusLabel(deliveryDetails, latestDelivery)
    : '—';

  const recipientParts = hasScannedPass
    ? [
      deliveryDetails?.recipientName || dbProfile?.full_name || latestPass?.clientName,
      deliveryDetails?.recipientPhone || dbProfile?.phone || latestPass?.clientPhone,
    ].filter(Boolean)
    : [];
  const deliveryRecipientLabel = hasScannedPass
    ? recipientParts.length > 0
      ? recipientParts.join(' · ')
      : 'Not set by customer'
    : '—';

  const isPickupMode =
    hasScannedPass &&
    String(deliveryDetails?.fulfillmentMode || latestDelivery?.delivery_type || '')
      .toUpperCase()
      .includes('PICKUP');

  const deliveryAddressLabel = hasScannedPass
    ? deliveryDetails?.address ||
    latestDelivery?.dispatch_address ||
    dbProfile?.address ||
    (isPickupMode ? '331 Rizal Street, City of Naga, Cebu, 6037' : 'Not set by customer')
    : '—';

  const courierParts = hasScannedPass
    ? [
      latestDelivery?.carrier || deliveryDetails?.preferredCourier || deliveryDetails?.carrier,
      latestDelivery?.tracking_number || deliveryDetails?.trackingNumber,
    ].filter((part, idx, arr) => Boolean(part) && arr.indexOf(part) === idx)
    : [];
  const deliveryTrackingLabel = hasScannedPass
    ? courierParts.length > 0
      ? courierParts.join(' · ')
      : 'Not assigned yet'
    : '—';

  const deliveryInstructionsLabel = hasScannedPass
    ? deliveryDetails?.instructions || latestDelivery?.notes || 'None'
    : '—';

  const handleToggleReveal = () => {
    if (!passToken) return;
    Haptics.selectionAsync().catch(() => { });
    setShowBookingCode((prev) => !prev);
  };

  const handleCopyBookingCode = async () => {
    if (!passToken) return;
    Haptics.selectionAsync().catch(() => { });
    const ok = await copyTextToClipboard(passToken);
    if (ok) setCopiedCode(true);
  };

  const persistNewAvatar = async (dataUri) => {
    const tokenForUpdate = passToken || (bookingRef !== '—' ? bookingRef : '');
    if (!tokenForUpdate) return;
    setUploadingAvatar(true);
    showProcess(
      dataUri ? 'Updating Profile Photo' : 'Removing Profile Photo',
      'Syncing directly to your E-Kodak studio dossier...'
    );
    try {
      const [{ error }] = await Promise.all([
        updateCustomerAvatarByPassToken(tokenForUpdate, dataUri),
        waitProcessDuration(1050),
      ]);
      if (error) {
        showAlert(
          'Unable to Save Photo',
          error.message || 'Could not update your profile photo in the database.',
          [{ text: 'OK' }],
          { type: 'danger' }
        );
        return;
      }

      const nextAvatar = dataUri || null;
      await updateCachedCustomerAvatar(nextAvatar);
      setDetailed((prev) =>
        prev
          ? {
            ...prev,
            profile: prev.profile ? { ...prev.profile, avatar_url: nextAvatar } : prev.profile,
          }
          : prev
      );
      setSavedBookings((prev) =>
        prev.map((item, idx) => (idx === 0 ? { ...item, avatarUrl: nextAvatar } : item))
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      await loadData();
      showAlert(
        dataUri ? 'Profile Photo Updated' : 'Profile Photo Removed',
        dataUri
          ? 'Your new profile photo is now synced across your studio pass.'
          : 'Your profile avatar has been reset to monogram.',
        [{ text: 'Done' }],
        { type: 'success' }
      );
    } catch (err) {
      showAlert(
        'Photo Upload Failed',
        err?.message || 'Something went wrong while updating your profile photo.',
        [{ text: 'OK' }],
        { type: 'danger' }
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickAndUploadAvatar = async (source) => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          showAlert(
            'Camera Permission Needed',
            'Please allow camera access in settings to take a profile photo.',
            [{ text: 'OK' }],
            { type: 'danger' }
          );
          return;
        }
      } else if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showAlert(
            'Photo Access Needed',
            'Please allow photo library access in settings to select a profile photo.',
            [{ text: 'OK' }],
            { type: 'danger' }
          );
          return;
        }
      }

      const pickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 256, height: 256 } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      const base64Payload = manipulated?.base64 || asset.base64;
      if (!base64Payload) {
        showAlert(
          'Invalid Image',
          'Could not read image data from the selected photo.',
          [{ text: 'OK' }],
          { type: 'danger' }
        );
        return;
      }

      const dataUri = `data:image/jpeg;base64,${base64Payload}`;
      await persistNewAvatar(dataUri);
    } catch (err) {
      showAlert(
        'Photo Error',
        err?.message || 'Could not process the selected image.',
        [{ text: 'OK' }],
        { type: 'danger' }
      );
    }
  };

  const handleOpenAvatarEditor = () => {
    if (!hasScannedPass || uploadingAvatar) return;
    Haptics.selectionAsync().catch(() => { });

    if (Platform.OS === 'web') {
      pickAndUploadAvatar('library');
      return;
    }

    const actions = [
      { text: 'Choose from Library', onPress: () => pickAndUploadAvatar('library') },
      { text: 'Take Photo', onPress: () => pickAndUploadAvatar('camera') },
    ];
    if (clientAvatarUrl) {
      actions.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => persistNewAvatar(''),
      });
    }
    actions.push({ text: 'Cancel', style: 'cancel' });

    showAlert(
      'Profile Photo',
      'Your photo syncs directly to your E-Kodak web dashboard.',
      actions,
      { type: 'selection' }
    );
  };

  // Resolve target address & Google Maps info directly under Delivery Processes
  const mapLookupAddress = !hasScannedPass
    ? ''
    : isPickupMode
      ? STUDIO_ORIGIN_ADDRESS
      : deliveryAddressLabel !== 'Not set by customer'
        ? deliveryAddressLabel
        : '';

  const mapLookupKey = hasScannedPass && mapLookupAddress
    ? `${isPickupMode ? 'pickup' : 'addr'}:${mapLookupAddress}`
    : '';

  const retrieveDeliveryMapInfo = useCallback(async (targetAddr, pickupFlag, targetKey) => {
    if (!targetAddr || !targetKey) return;
    setMapLoadingKey(targetKey);
    const result = await fetchDeliveryGoogleMapInfo(targetAddr, {
      isPickup: pickupFlag,
      regionCode: 'ph',
    });
    setMapLoadingKey('');
    setMapState({
      key: targetKey,
      data: result.data?.destination ? result.data : null,
      configured: result.configured,
      error: result.data?.destination ? '' : result.error || '',
    });
  }, []);

  useEffect(() => {
    if (!mapLookupKey) return undefined;
    let cancelled = false;
    fetchDeliveryGoogleMapInfo(mapLookupAddress, {
      isPickup: isPickupMode,
      regionCode: 'ph',
    }).then((result) => {
      if (cancelled) return;
      setMapState({
        key: mapLookupKey,
        data: result.data?.destination ? result.data : null,
        configured: result.configured,
        error: result.data?.destination ? '' : result.error || '',
      });
    });
    return () => {
      cancelled = true;
    };
  }, [mapLookupKey, mapLookupAddress, isPickupMode]);

  const activeMapMatched = Boolean(mapLookupKey) && mapState.key === mapLookupKey;
  const mapLoading = Boolean(mapLookupKey) && (!activeMapMatched || mapLoadingKey === mapLookupKey);
  const mapInfo = activeMapMatched ? mapState.data : null;

  const googleDest = mapInfo?.destination || null;
  const googleRoute = mapInfo?.route || null;

  const routeDistance = formatRouteDistance(googleRoute?.distanceMeters);
  const routeDuration = formatRouteDuration(googleRoute?.duration);

  const googleMapsLinks = buildGoogleMapsLinks({
    address: googleDest?.formattedAddress || mapLookupAddress || STUDIO_ORIGIN_ADDRESS,
    placeId: googleDest?.placeId || '',
    latitude: googleDest?.latitude ?? null,
    longitude: googleDest?.longitude ?? null,
    isPickup: !hasScannedPass || isPickupMode || !mapLookupAddress,
  });

  const handleOpenMapsUrl = async (url) => {
    if (!url) return;
    Haptics.selectionAsync().catch(() => { });
    try {
      await Linking.openURL(url);
    } catch {
      showAlert(
        'Unable to Open Maps',
        'Could not launch Google Maps on this device.',
        [{ text: 'OK' }],
        { type: 'danger' }
      );
    }
  };

  // Exact 2-tone card tokens shared across Home, Scanner, and Bookings dashboards
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
  const refreshBg = isDark ? 'rgba(255, 255, 255, 0.10)' : '#FFFFFF';
  const refreshBorder = isDark
    ? 'rgba(255, 255, 255, 0.16)'
    : isSage
      ? '#D7DDD1'
      : 'rgba(220, 221, 230, 0.85)';
  const bannerBg = isDark
    ? 'rgba(217, 180, 108, 0.14)'
    : isSage
      ? 'rgba(99, 115, 86, 0.14)'
      : 'rgba(235, 208, 130, 0.30)';
  const bannerBorder = isDark
    ? 'rgba(217, 180, 108, 0.28)'
    : isSage
      ? 'rgba(99, 115, 86, 0.24)'
      : 'rgba(176, 125, 30, 0.20)';
  const accentIcon = isDark ? '#E6C47E' : isSage ? '#4B5B40' : '#9F7420';
  const accentIconStrong = isDark ? '#E6C47E' : isSage ? '#38452F' : '#7A5814';

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const avatarInitial =
    clientName !== '—' && clientName.trim()
      ? clientName.trim().charAt(0).toUpperCase()
      : null;

  const goldAvatarColors = gradients?.gold || ['#E6C47E', '#C59A3B', '#A9823A'];

  const defaultCoverId = isDark ? 'velvet-twilight' : 'atelier-gold';
  const activeCoverPresetId = coverPref?.presetId || defaultCoverId;
  const activeDefaultCover =
    DEFAULT_PROFILE_COVERS.find((c) => c.id === activeCoverPresetId) ||
    DEFAULT_PROFILE_COVERS[0];
  const activeCoverSource =
    activeCoverPresetId === 'custom' && coverPref?.customUri
      ? { uri: coverPref.customUri }
      : activeDefaultCover.source;

  const coverGradientOverlay = isDark
    ? [
      'rgba(18, 16, 24, 0.20)',
      'rgba(24, 21, 30, 0.42)',
      'rgba(21, 27, 36, 0.88)',
      '#151B24',
    ]
    : isSage
      ? [
        'rgba(246, 247, 242, 0.12)',
        'rgba(242, 244, 238, 0.38)',
        'rgba(238, 242, 233, 0.88)',
        '#EEF2E9',
      ]
      : [
        'rgba(255, 250, 243, 0.12)',
        'rgba(250, 242, 234, 0.34)',
        'rgba(244, 241, 238, 0.86)',
        '#E5EEF7',
      ];

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg.base}
      />

      {/* Ambient Glass Backdrop */}
      <GlassBackground />

      {/* ── Top Floating Pill Header (icon beside Client Profile removed) ── */}
      <GlassHeader
        title="Client Profile"
        subtitle="Session details & order dossier"
        right={
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onRefresh}
            style={[
              styles.headerRefreshBtn,
              {
                backgroundColor: refreshBg,
                borderColor: refreshBorder,
              },
            ]}
            accessibilityLabel="Refresh client profile"
          >
            <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
              <RotateCcw
                size={18}
                color={isDark ? colors.text.primary : '#181410'}
                strokeWidth={2}
              />
            </Animated.View>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 104 },
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
        {/* ── Card 1: Profile Account Cover + Centered Client Monogram & Editable Photo ── */}
        <View style={[styles.cardOuter, { borderColor: cardBorder }]}>
          <LinearGradient
            colors={cardGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.identityCardGradient}
          >
            {/* Full-width Cover Image with End-of-Image Blur & Gradient Fade */}
            <View pointerEvents="none" style={styles.coverStage}>
              <Image
                source={activeCoverSource}
                resizeMode="cover"
                style={styles.coverBaseImage}
              />
              <View style={styles.coverMidBlurWrap}>
                <Image
                  source={activeCoverSource}
                  resizeMode="cover"
                  blurRadius={Platform.OS === 'ios' ? 10 : 7}
                  style={styles.coverMidBlurImage}
                />
              </View>
              <View style={styles.coverEndBlurWrap}>
                <Image
                  source={activeCoverSource}
                  resizeMode="cover"
                  blurRadius={Platform.OS === 'ios' ? 22 : 14}
                  style={styles.coverEndBlurImage}
                />
              </View>
              <LinearGradient
                colors={coverGradientOverlay}
                locations={[0, 0.42, 0.76, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>

            {/* Quick Cover Theme Switcher Pill */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => {
                Haptics.selectionAsync().catch(() => { });
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
              accessibilityLabel="Change profile cover photo"
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

            <TouchableOpacity
              activeOpacity={hasScannedPass ? 0.85 : 1}
              disabled={!hasScannedPass || uploadingAvatar}
              onPress={handleOpenAvatarEditor}
              style={styles.avatarRingWrap}
              accessibilityLabel={
                hasScannedPass ? 'Edit profile photo' : 'Client avatar'
              }
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
                {clientAvatarUrl ? (
                  <Image
                    source={{ uri: clientAvatarUrl }}
                    style={styles.avatarCirclePhoto}
                  />
                ) : (
                  <LinearGradient
                    colors={
                      hasScannedPass
                        ? goldAvatarColors
                        : isDark
                          ? ['#353A4A', '#232734']
                          : ['#E5E8EF', '#D5DBE6']
                    }
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.85, y: 1 }}
                    style={styles.avatarCircleGradient}
                  >
                    {avatarInitial ? (
                      <Text
                        style={[
                          styles.avatarInitialText,
                          isSage && { color: '#FFFFFF' },
                        ]}
                      >
                        {avatarInitial}
                      </Text>
                    ) : (
                      <User
                        size={28}
                        color={isDark ? colors.text.muted : '#6C6458'}
                        strokeWidth={1.85}
                      />
                    )}
                  </LinearGradient>
                )}
              </View>

              {hasScannedPass && (
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
              )}
            </TouchableOpacity>

            <Text
              style={[
                styles.centeredClientName,
                {
                  color:
                    clientName === '—'
                      ? colors.text.muted
                      : isDark
                        ? colors.text.primary
                        : '#181410',
                },
              ]}
              numberOfLines={2}
            >
              {clientName}
            </Text>
          </LinearGradient>
        </View>

        {/* ── Card 2: Booking Specs & Booking Code Card ── */}
        <View style={[styles.cardOuter, { borderColor: cardBorder }]}>
          <LinearGradient
            colors={cardGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.detailsCardGradient}
          >
            <CardDecorElements variant="tool" isDark={isDark} />

            <SpecRow
              label="Booking #"
              value={bookingRef}
              isMutedValue={!hasScannedPass || bookingRef === '—'}
              isDark={isDark}
              colors={colors}
            />
            <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

            <SpecRow
              label="Package"
              value={packageLabel}
              isMutedValue={!hasScannedPass || packageLabel === '—'}
              isDark={isDark}
              colors={colors}
            />
            <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

            <SpecRow
              label="Location"
              value={locationLabel}
              isMutedValue={!hasScannedPass || locationLabel === '—'}
              isDark={isDark}
              colors={colors}
            />
            <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

            <SpecRow
              label="Session Schedule"
              value={scheduleLabel}
              isMutedValue={!hasScannedPass || scheduleLabel === '—'}
              isDark={isDark}
              colors={colors}
            />
            <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

            <SpecRow
              label="Payment"
              value={paymentLabel}
              isMutedValue={!hasScannedPass || paymentLabel === '—'}
              isDark={isDark}
              colors={colors}
            />

            {/* Warm Gold Booking Code Banner with Eye Reveal + Circular Copy */}
            <View
              style={[
                styles.codeBanner,
                {
                  backgroundColor: bannerBg,
                  borderColor: bannerBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.codeBannerTitle,
                  { color: isDark ? colors.text.primary : '#181410' },
                ]}
              >
                Booking Code
              </Text>

              <Text
                style={[
                  styles.codeBannerValue,
                  {
                    color: passToken
                      ? isDark
                        ? colors.text.primary
                        : '#181410'
                      : colors.text.muted,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {passToken
                  ? showBookingCode
                    ? passToken
                    : '••••••••••••••••'
                  : '—'}
              </Text>

              <View style={styles.codeActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.78}
                  disabled={!passToken}
                  onPress={handleToggleReveal}
                  style={[
                    styles.eyeCircleBtn,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.14)'
                        : '#FFFFFF',
                      borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.22)'
                        : 'rgba(24, 20, 16, 0.10)',
                      opacity: passToken ? 1 : 0.45,
                    },
                  ]}
                  accessibilityLabel={
                    showBookingCode ? 'Hide booking code' : 'Show booking code'
                  }
                >
                  {showBookingCode ? (
                    <EyeOff
                      size={15}
                      color={isDark ? colors.text.primary : '#181410'}
                      strokeWidth={2}
                    />
                  ) : (
                    <Eye
                      size={15}
                      color={isDark ? colors.text.primary : '#181410'}
                      strokeWidth={2}
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!passToken}
                  onPress={handleCopyBookingCode}
                  style={[
                    styles.copyCircleBtn,
                    {
                      backgroundColor: copiedCode
                        ? '#16A34A'
                        : isDark
                          ? '#F5E7CE'
                          : '#181410',
                      opacity: passToken ? 1 : 0.45,
                    },
                  ]}
                  accessibilityLabel="Copy booking code"
                >
                  {copiedCode ? (
                    <Check
                      size={15}
                      color="#FFFFFF"
                      strokeWidth={2.4}
                    />
                  ) : (
                    <Copy
                      size={15}
                      color={isDark ? '#181410' : '#FFFFFF'}
                      strokeWidth={2}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Card 3: Delivery Processes Card (DB-backed customer delivery choice) ── */}
        <View style={[styles.cardOuter, { borderColor: cardBorder }]}>
          <LinearGradient
            colors={cardGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.detailsCardGradient,
              !isDeliveryExpanded && styles.collapsedCardGradient,
            ]}
          >
            <CardDecorElements variant="recent" isDark={isDark} />

            <TouchableOpacity
              activeOpacity={0.78}
              onPress={handleToggleDelivery}
              style={[
                styles.deliveryCardHeader,
                styles.mapCardHeaderRow,
                !isDeliveryExpanded && styles.collapsedHeaderRow,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isDeliveryExpanded
                  ? 'Hide Delivery Processes details'
                  : 'Show Delivery Processes details'
              }
            >
              <View style={styles.mapSubheaderLeft}>
                <View
                  style={[
                    styles.deliveryHeaderBadge,
                    {
                      backgroundColor: bannerBg,
                      borderColor: bannerBorder,
                    },
                  ]}
                >
                  <Truck
                    size={15}
                    color={accentIcon}
                    strokeWidth={2}
                  />
                </View>
                <Text
                  style={[
                    styles.deliveryCardTitle,
                    { color: isDark ? colors.text.primary : '#181410' },
                  ]}
                >
                  Delivery Processes
                </Text>
              </View>

              <View
                style={[
                  styles.collapseArrowBtn,
                  {
                    backgroundColor: bannerBg,
                    borderColor: bannerBorder,
                  },
                ]}
              >
                {isDeliveryExpanded ? (
                  <ChevronUp
                    size={16}
                    color={accentIconStrong}
                    strokeWidth={2.2}
                  />
                ) : (
                  <ChevronDown
                    size={16}
                    color={accentIconStrong}
                    strokeWidth={2.2}
                  />
                )}
              </View>
            </TouchableOpacity>

            {isDeliveryExpanded && (
              <>
                <SpecRow
                  label="Chosen Delivery"
                  value={deliveryModeLabel}
                  isMutedValue={!hasScannedPass || deliveryModeLabel === 'Not selected yet'}
                  isDark={isDark}
                  colors={colors}
                />
                <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

                <SpecRow
                  label="Process Status"
                  value={deliveryStatusLabel}
                  isMutedValue={!hasScannedPass}
                  isDark={isDark}
                  colors={colors}
                />
                <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

                <SpecRow
                  label="Recipient"
                  value={deliveryRecipientLabel}
                  isMutedValue={!hasScannedPass || deliveryRecipientLabel === 'Not set by customer'}
                  isDark={isDark}
                  colors={colors}
                />
                <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

                <SpecRow
                  label="Delivery Address"
                  value={deliveryAddressLabel}
                  isMutedValue={!hasScannedPass || deliveryAddressLabel === 'Not set by customer'}
                  valueLines={3}
                  isDark={isDark}
                  colors={colors}
                />
                <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

                <SpecRow
                  label="Courier & Tracking"
                  value={deliveryTrackingLabel}
                  isMutedValue={!hasScannedPass || deliveryTrackingLabel === 'Not assigned yet'}
                  isDark={isDark}
                  colors={colors}
                />
                <View style={[styles.specDivider, { backgroundColor: dividerColor }]} />

                <SpecRow
                  label="Instructions"
                  value={deliveryInstructionsLabel}
                  isMutedValue={!hasScannedPass || deliveryInstructionsLabel === 'None'}
                  valueLines={3}
                  isDark={isDark}
                  colors={colors}
                />
              </>
            )}
          </LinearGradient>
        </View>

        {/* ── Card 4: Standalone Google Maps Card (separate from Delivery Processes) ── */}
        <View style={[styles.cardOuter, { borderColor: cardBorder }]}>
          <LinearGradient
            colors={cardGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.detailsCardGradient,
              !isMapExpanded && styles.collapsedCardGradient,
            ]}
          >
            <CardDecorElements variant="details" isDark={isDark} />

            <View
              style={[
                styles.deliveryCardHeader,
                styles.mapCardHeaderRow,
                !isMapExpanded && styles.collapsedHeaderRow,
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={handleToggleMap}
                style={styles.mapSubheaderLeft}
                accessibilityRole="button"
                accessibilityLabel={
                  isMapExpanded ? 'Hide Google Maps details' : 'Show Google Maps details'
                }
              >
                <View
                  style={[
                    styles.deliveryHeaderBadge,
                    {
                      backgroundColor: bannerBg,
                      borderColor: bannerBorder,
                    },
                  ]}
                >
                  <MapPin
                    size={15}
                    color={accentIcon}
                    strokeWidth={2}
                  />
                </View>
                <Text
                  style={[
                    styles.deliveryCardTitle,
                    { color: isDark ? colors.text.primary : '#181410' },
                  ]}
                >
                  Google Maps
                </Text>
              </TouchableOpacity>

              <View style={styles.mapHeaderActions}>
                {isMapExpanded && hasScannedPass && Boolean(mapLookupAddress) && (
                  <TouchableOpacity
                    activeOpacity={0.78}
                    disabled={mapLoading}
                    onPress={() => retrieveDeliveryMapInfo(mapLookupAddress, isPickupMode, mapLookupKey)}
                    style={[
                      styles.mapRefreshBtn,
                      {
                        backgroundColor: bannerBg,
                        borderColor: bannerBorder,
                      },
                    ]}
                    accessibilityLabel="Retrieve Google Maps information"
                  >
                    {mapLoading ? (
                      <ActivityIndicator
                        size={12}
                        color={accentIcon}
                      />
                    ) : (
                      <RefreshCw
                        size={12}
                        color={accentIcon}
                        strokeWidth={2.2}
                      />
                    )}
                    <Text
                      style={[
                        styles.mapRefreshText,
                        { color: isDark ? '#F5E7CE' : accentIconStrong },
                      ]}
                    >
                      {mapLoading ? 'Loading' : 'Sync'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={handleToggleMap}
                  style={[
                    styles.collapseArrowBtn,
                    {
                      backgroundColor: bannerBg,
                      borderColor: bannerBorder,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isMapExpanded ? 'Hide Google Maps details' : 'Show Google Maps details'
                  }
                >
                  {isMapExpanded ? (
                    <ChevronUp
                      size={16}
                      color={accentIconStrong}
                      strokeWidth={2.2}
                    />
                  ) : (
                    <ChevronDown
                      size={16}
                      color={accentIconStrong}
                      strokeWidth={2.2}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {isMapExpanded && (
              <>
                <DeliveryGoogleMap
                  hasScannedPass={hasScannedPass}
                  isPickupMode={isPickupMode}
                  deliveryAddress={deliveryAddressLabel}
                  verifiedAddress={googleDest?.formattedAddress || ''}
                  placeId={googleDest?.placeId || ''}
                  latitude={googleDest?.latitude ?? null}
                  longitude={googleDest?.longitude ?? null}
                  encodedPolyline={googleRoute?.encodedPolyline || ''}
                  routeDistance={routeDistance}
                  routeDuration={routeDuration}
                  staticMapUri={mapInfo?.staticMapUri || null}
                  isDark={isDark}
                  colors={colors}
                  cardBorder={cardBorder}
                  bannerBg={bannerBg}
                  bannerBorder={bannerBorder}
                  onOpenExternalUrl={handleOpenMapsUrl}
                />

                <SpecRow
                  label="E-Kodak Address"
                  value="331 Rizal Street, City of Naga, Cebu, 6037"
                  valueLines={2}
                  isDark={isDark}
                  colors={colors}
                />

                <View style={styles.mapActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => handleOpenMapsUrl(googleMapsLinks.viewUrl)}
                    style={[
                      styles.mapActionBtn,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
                        borderColor: cardBorder,
                      },
                    ]}
                  >
                    <MapPin
                      size={14}
                      color={isDark ? colors.text.primary : '#181410'}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.mapActionText,
                        { color: isDark ? colors.text.primary : '#181410' },
                      ]}
                    >
                      Open in Maps
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => handleOpenMapsUrl(googleMapsLinks.directionsUrl)}
                    style={[
                      styles.mapActionBtn,
                      {
                        backgroundColor: isDark ? '#F5E7CE' : '#181410',
                        borderColor: isDark ? '#F5E7CE' : '#181410',
                      },
                    ]}
                  >
                    <Navigation
                      size={14}
                      color={isDark ? '#181410' : '#FFFFFF'}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.mapActionText,
                        { color: isDark ? '#181410' : '#FFFFFF' },
                      ]}
                    >
                      Directions
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </LinearGradient>
        </View>
      </ScrollView>

      {/* ── Profile Cover Selector Modal (2 Default Studio Covers + Custom Upload) ── */}
      <Modal
        visible={showCoverModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCoverModal(false)}
      >
        <View style={styles.modalBackdrop}>
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
                <ImagePlus
                  size={16}
                  color={isDark ? '#F5E7CE' : '#181410'}
                  strokeWidth={2}
                />
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
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 11,
  },
  specLabel: {
    fontFamily: Typography.fontBody,
    fontSize: 13.5,
    lineHeight: 19,
  },
  specValue: {
    fontFamily: Typography.fontBodyBold,
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'right',
    flex: 1,
  },
});

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg.base },
    scroll: { flex: 1, zIndex: 1 },
    content: {
      paddingHorizontal: 16,
      paddingTop: 2,
      gap: Spacing[4],
    },

    headerRefreshBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#2E261B',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 8,
      elevation: 2,
    },

    // Shared 2-Tone Dashboard Card Frame (matches Home / Scanner / Bookings)
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

    // Card 1: Profile Cover + Centered Monogram & Name
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
      height: 196,
    },
    coverBaseImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 196,
      width: '100%',
    },
    coverMidBlurWrap: {
      position: 'absolute',
      top: 86,
      left: 0,
      right: 0,
      height: 110,
      overflow: 'hidden',
    },
    coverMidBlurImage: {
      position: 'absolute',
      top: -86,
      left: 0,
      right: 0,
      height: 196,
      width: '100%',
    },
    coverEndBlurWrap: {
      position: 'absolute',
      top: 124,
      left: 0,
      right: 0,
      height: 72,
      overflow: 'hidden',
    },
    coverEndBlurImage: {
      position: 'absolute',
      top: -124,
      left: 0,
      right: 0,
      height: 196,
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
    avatarCircleGradient: {
      width: 70,
      height: 70,
      borderRadius: 35,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarCirclePhoto: {
      width: 70,
      height: 70,
      borderRadius: 35,
      borderWidth: 2,
      borderColor: colors.gold.DEFAULT,
    },
    avatarInitialText: {
      fontFamily: Typography.fontHeading,
      fontSize: 29,
      color: '#181410',
      includeFontPadding: false,
    },
    centeredClientName: {
      fontFamily: Typography.fontHeading,
      fontSize: 22,
      lineHeight: 28,
      textAlign: 'center',
      letterSpacing: -0.25,
      zIndex: 2,
    },

    // Card 2: Booking Specs & Booking Code Banner
    detailsCardGradient: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
      position: 'relative',
    },
    specDivider: {
      height: StyleSheet.hairlineWidth,
    },
    codeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 10,
      marginTop: 12,
    },
    codeBannerTitle: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 13.5,
      lineHeight: 18,
    },
    codeBannerValue: {
      flex: 1,
      fontFamily: Typography.fontMono,
      fontSize: 12.5,
      lineHeight: 17,
      textAlign: 'right',
      letterSpacing: 0.6,
    },
    codeActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    eyeCircleBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copyCircleBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deliveryCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingTop: 6,
      paddingBottom: 8,
    },
    deliveryHeaderBadge: {
      width: 30,
      height: 30,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deliveryCardTitle: {
      fontFamily: Typography.fontHeading,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: -0.15,
    },
    mapCardHeaderRow: {
      justifyContent: 'space-between',
    },
    collapsedCardGradient: {
      paddingBottom: 12,
    },
    collapsedHeaderRow: {
      paddingBottom: 0,
    },
    mapHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    collapseArrowBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapSubheaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    mapRefreshBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },
    mapRefreshText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 11.5,
      lineHeight: 15,
    },
    mapActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
    },
    mapActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
    },
    mapActionText: {
      fontFamily: Typography.fontBodyBold,
      fontSize: 12.5,
      lineHeight: 17,
    },

    // Cover Chooser Modal
    modalBackdrop: {
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
      backgroundColor: '#E6C47E',
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
