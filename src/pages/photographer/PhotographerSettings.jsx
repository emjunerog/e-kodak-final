import React, { useState, useEffect, useRef } from 'react';
import { Camera, CalendarDays } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getPhotographerProfileData,
  updatePhotographerProfileData,
  toggleGeneralAvailability,
} from '../../services/photographerService';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import Toast from '../../components/ui/Toast';

export default function PhotographerSettings() {
  const { user, profile, updateProfile, uploadAvatar } = useAuth();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    bio: '',
  });

  const [isAvailable, setIsAvailable] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [autoAccept, setAutoAccept] = useState(true);

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    setLoading(true);
    const { data } = await getPhotographerProfileData(user.id);
    if (data) {
      // Clean any legacy tools metadata from bio
      const cleanBio = (data.bio || '').replace(/\[TOOLS:.*?\]/g, '').trim();
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        bio: cleanBio,
      });
      setIsAvailable(data.is_available ?? true);
    }
    if (profile?.avatar_url) {
      setAvatarPreview(profile.avatar_url);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleAvailability = async () => {
    if (!user?.id) return;
    const nextVal = !isAvailable;
    setIsAvailable(nextVal);
    const { error } = await toggleGeneralAvailability(user.id, nextVal);
    if (error) {
      setIsAvailable(!nextVal);
      setToast({ type: 'error', message: 'Failed to update shift availability.' });
    } else {
      setToast({
        type: 'success',
        message: nextVal ? 'Status updated: Available for shoots.' : 'Status updated: Off-duty / editing.',
      });
    }
  };

  // ── Avatar Upload Handler ───────────────────────────────────────────────────
  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToast({ type: 'error', message: 'Please select a valid image file (JPG, PNG, or WebP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', message: 'Image size exceeds 5MB limit.' });
      return;
    }

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setUploadingAvatar(true);

    try {
      if (uploadAvatar) {
        const publicUrl = await uploadAvatar(file);
        setAvatarPreview(publicUrl);
        setToast({ type: 'success', message: 'Profile photo uploaded successfully.' });
      } else {
        throw new Error('uploadAvatar unavailable');
      }
    } catch (err) {
      console.warn('Storage upload fallback to base64 Data URL:', err);
      // Fallback: encode as Base64 Data URL and update profile
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Url = reader.result;
          if (updateProfile) {
            await updateProfile({ avatar_url: base64Url });
          }
          setAvatarPreview(base64Url);
          setToast({ type: 'success', message: 'Profile photo saved successfully.' });
        } catch {
          setToast({ type: 'error', message: 'Failed to save profile photo.' });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarPreview(null);
    try {
      if (updateProfile) {
        await updateProfile({ avatar_url: null });
      }
      setToast({ type: 'success', message: 'Profile photo removed.' });
    } catch {
      setToast({ type: 'error', message: 'Failed to remove photo.' });
    }
  };

  // ── Save Profile Settings ──────────────────────────────────────────────────
  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);

    const { error } = await updatePhotographerProfileData(user.id, {
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
      bio: formData.bio,
      is_available: isAvailable,
    });
    setSaving(false);

    if (error) {
      setToast({ type: 'error', message: 'Failed to update studio profile.' });
    } else {
      setToast({ type: 'success', message: 'Profile settings saved successfully.' });
    }
  };

  const displayName = formData.first_name || profile?.first_name || 'Photographer';
  const initial = (formData.first_name?.charAt(0) || user?.email?.charAt(0) || 'P').toUpperCase();
  const currentAvatar = avatarPreview || profile?.avatar_url;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12 font-body">
      {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}

      {/* ── 1. Hero Banner Header ────────────────────────────────────────── */}
      <AdminHeroBanner
        station="photographer"
        badgeLabel="Photographer Station"
        userName={displayName}
        title="Studio Settings"
        subtitle="Manage your personal profile details, contact information, notes, and shift availability."
        statusSummary={isAvailable ? 'Shift: Available for Shoots' : 'Shift: Off-Duty / Editing'}
        primaryAction={{
          label: 'My Shoots Queue',
          href: '/photographer/bookings',
          icon: Camera,
        }}
        secondaryAction={{
          label: 'Shoot Calendar',
          href: '/photographer/availability',
          icon: CalendarDays,
        }}
        onRefresh={loadProfile}
        isRefreshing={loading}
      />

      {loading ? (
        <div className="py-20 text-center rounded-2xl bg-white border border-neutral-200/90 shadow-2xs">
          <i className="bi bi-arrow-repeat animate-spin text-2xl text-gold mx-auto mb-2 block"></i>
          <p className="text-xs text-neutral-400 font-body">Loading settings…</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ── Left Column: Profile Photo & Shift (4 cols) ───────────────── */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Profile Photo Card */}
            <div className="rounded-2xl bg-white border border-neutral-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="bi bi-person-badge text-gold"></i>
                  Profile Photo
                </h3>
                {currentAvatar && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Photo Added
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center text-center space-y-3 pt-1">
                {/* Avatar Preview */}
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-neutral-100 text-primary flex items-center justify-center font-heading text-2xl font-bold overflow-hidden ring-4 ring-gold/20 shadow-sm transition-transform group-hover:scale-102">
                    {currentAvatar ? (
                      <img
                        src={currentAvatar}
                        alt="Profile Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-gold">{initial}</span>
                    )}

                    {/* Upload Spinner Overlay */}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center text-white">
                        <i className="bi bi-arrow-repeat animate-spin text-xl text-gold"></i>
                      </div>
                    )}
                  </div>

                  {/* Quick Camera Icon Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 shadow-md transition-all cursor-pointer border-2 border-white hover:scale-110"
                    title="Choose photo"
                  >
                    <i className="bi bi-camera-fill text-xs text-gold"></i>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>

                {/* Identity Info */}
                <div className="space-y-0.5">
                  <h4 className="font-heading text-base font-bold text-primary">
                    {displayName} {formData.last_name || ''}
                  </h4>
                  <p className="text-xs font-semibold text-gold flex items-center justify-center gap-1">
                    <i className="bi bi-shield-check"></i>
                    Studio Photographer
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate max-w-[220px]">
                    {user?.email || 'photographer@ekodak.studio'}
                  </p>
                </div>

                {/* Photo Action Buttons */}
                <div className="flex items-center gap-2 pt-1 w-full">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="flex-1 py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {uploadingAvatar ? (
                      <i className="bi bi-arrow-repeat animate-spin text-xs"></i>
                    ) : (
                      <i className="bi bi-upload text-xs text-gold"></i>
                    )}
                    <span>{currentAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>

                  {currentAvatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="py-2 px-3 bg-neutral-100 hover:bg-red-50 text-neutral-600 hover:text-red-600 rounded-xl text-xs font-bold transition-all border border-neutral-200 hover:border-red-200 cursor-pointer"
                      title="Remove profile image"
                    >
                      <i className="bi bi-trash text-xs"></i>
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-neutral-400">
                  JPG, PNG or WebP up to 5MB
                </p>
              </div>
            </div>

            {/* Shift & Availability Card */}
            <div className="rounded-2xl bg-white border border-neutral-200/90 p-5 shadow-2xs space-y-3.5 font-body">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <i className="bi bi-clock-history text-gold"></i>
                Shift &amp; Alerts
              </h3>

              {/* Shift Availability Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`}></span>
                    {isAvailable ? 'Available for Shoots' : 'Off Duty / Editing'}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    Accept incoming shoot bookings
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAvailability}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer shrink-0 ${
                    isAvailable
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                      : 'bg-neutral-200 text-neutral-700 border border-neutral-300 hover:bg-neutral-300'
                  }`}
                >
                  {isAvailable ? 'Set Off-Duty' : 'Set Available'}
                </button>
              </div>

              {/* SMS Alerts Checkbox */}
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 cursor-pointer select-none">
                <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                  <p className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                    <i className="bi bi-chat-dots text-gold"></i>
                    SMS Shoot Alerts
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    Notify mobile on session dispatch
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifySms}
                  onChange={(e) => setNotifySms(e.target.checked)}
                  className="w-4 h-4 text-gold accent-gold rounded cursor-pointer shrink-0"
                />
              </label>

              {/* Auto Confirm Checkbox */}
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 cursor-pointer select-none">
                <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                  <p className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                    <i className="bi bi-calendar-check text-gold"></i>
                    Auto-Acknowledge
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    Auto-confirm assigned calendar slots
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoAccept}
                  onChange={(e) => setAutoAccept(e.target.checked)}
                  className="w-4 h-4 text-gold accent-gold rounded cursor-pointer shrink-0"
                />
              </label>
            </div>

          </div>

          {/* ── Right Column: Details & Notes (8 cols) ────────────────────── */}
          <div className="lg:col-span-8 space-y-5 font-body">

            {/* Personal & Contact Details */}
            <div className="rounded-2xl bg-white border border-neutral-200/90 p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <i className="bi bi-person-lines-fill text-gold"></i>
                Personal &amp; Contact Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    First Name
                  </label>
                  <div className="relative">
                    <i className="bi bi-person absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs"></i>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                      className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all"
                      placeholder="First name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Last Name
                  </label>
                  <div className="relative">
                    <i className="bi bi-person absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs"></i>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                      className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Registered Email (Read-only)
                  </label>
                  <div className="relative">
                    <i className="bi bi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs"></i>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full pl-8 pr-3 py-2 bg-neutral-100 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <i className="bi bi-telephone absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs"></i>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all"
                      placeholder="+63 9XX XXX XXXX"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Shooting Style & Station Notes */}
            <div className="rounded-2xl bg-white border border-neutral-200/90 p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <i className="bi bi-journal-text text-gold"></i>
                Shooting Notes &amp; Guidelines
              </h3>
              <p className="text-xs text-neutral-500">
                Notes on your preferred lighting styles, client direction, and studio session guidelines.
              </p>
              <textarea
                name="bio"
                rows={4}
                value={formData.bio}
                onChange={handleChange}
                placeholder="Add notes about your shooting style, client posing reminders, or custom studio setup preferences..."
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all resize-none"
              />
            </div>

            {/* Bottom Save Action Bar */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs">
              <span className="text-xs text-neutral-500">
                Changes will be saved to your studio profile.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadProfile}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:text-primary transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <i className="bi bi-arrow-repeat animate-spin text-sm"></i>
                  ) : (
                    <i className="bi bi-check-circle-fill text-gold text-sm"></i>
                  )}
                  <span>Save Settings</span>
                </button>
              </div>
            </div>

          </div>

        </form>
      )}
    </div>
  );
}
