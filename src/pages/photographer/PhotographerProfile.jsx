import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Upload,
  Trash2,
  Sparkles,
  Check,
  RefreshCw,
  Lock,
  Tag,
  Sliders,
  FileText,
  Award,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getPhotographerProfileData,
  updatePhotographerProfileData,
  recordPhotographerActivity,
} from '../../services/photographerService';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import Toast from '../../components/ui/Toast';

const SPECIALTY_TAGS = [
  'Studio Portraiture',
  'Graduation & Toga',
  'Barong & Filipiniana',
  'Corporate Headshots',
  'High-Key Lighting',
  'Cinematic Ambient',
  'Editorial Direction',
  'Creative Posing',
  'Natural Window Light',
  'Fine Art Monochrome',
  'Family & Group Portraits',
  'Fashion & Glamour',
];

export default function PhotographerProfile() {
  const { user, profile, updateProfile, uploadAvatar } = useAuth();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    specialization: 'Lead Portrait & Studio Photographer',
    bio: '',
  });

  const [initialData, setInitialData] = useState(null);
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

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, user?.id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await getPhotographerProfileData(user.id);
      if (data) {
        const cleanBio = (data.bio || '').replace(/\[TOOLS:.*?\]/g, '').trim();
        const loaded = {
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          specialization: data.specialization || 'Lead Portrait & Studio Photographer',
          bio: cleanBio,
        };
        setFormData(loaded);
        setInitialData(loaded);
      }
      if (profile?.avatar_url) {
        setAvatarPreview(profile.avatar_url);
      }
    } catch (err) {
      console.warn('loadProfile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!initialData) return false;
    return (
      formData.first_name !== initialData.first_name ||
      formData.last_name !== initialData.last_name ||
      formData.phone !== initialData.phone ||
      formData.specialization !== initialData.specialization ||
      formData.bio !== initialData.bio
    );
  }, [formData, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Avatar Upload Handler
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

  // Toggle specialty tag to bio
  const handleToggleTag = (tag) => {
    setFormData((prev) => {
      const current = prev.bio;
      const bulletTag = `• ${tag}`;
      if (current.includes(bulletTag)) {
        const removed = current
          .split('\n')
          .filter((line) => line.trim() !== bulletTag)
          .join('\n')
          .trim();
        return { ...prev, bio: removed };
      } else {
        const updated = current.trim() ? `${current.trim()}\n${bulletTag}` : bulletTag;
        return { ...prev, bio: updated };
      }
    });
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);

    const { error } = await updatePhotographerProfileData(user.id, {
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
      specialization: formData.specialization,
      bio: formData.bio,
    });
    setSaving(false);

    if (error) {
      setToast({ type: 'error', message: 'Failed to update photographer profile.' });
    } else {
      setInitialData({ ...formData });
      setToast({ type: 'success', message: 'Photographer profile saved successfully.' });
      if (updateProfile) {
        updateProfile({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        }).catch(() => {});
      }
      await recordPhotographerActivity({
        photographerId: user.id,
        photographerName: `${formData.first_name} ${formData.last_name}`.trim() || 'Photographer',
        actionType: 'PROFILE_UPDATED',
        entityType: 'profiles',
        entityId: user.id,
        entityLabel: 'Photographer Profile Updated',
        description: 'Updated profile credentials, contact info, and public studio bio.',
        details: { phone: formData.phone, specialization: formData.specialization },
      }).catch(() => {});
    }
  };

  const displayName = formData.first_name || profile?.first_name || 'Photographer';
  const fullName = `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || displayName;
  const initial = (formData.first_name?.charAt(0) || user?.email?.charAt(0) || 'P').toUpperCase();
  const currentAvatar = avatarPreview || profile?.avatar_url;

  return (
    <div className="w-full pb-16 font-body animate-fade-in">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* ── 1. Page Hero Banner ────────────────────────────────────────── */}
      <AdminHeroBanner
        station="photographer"
        userName={fullName}
        title="Photographer Profile"
        subtitle="Manage your personal photographer credentials, contact numbers, public bio, and avatar portrait."
        statusSummary="Photographer Identity"
        primaryAction={{
          label: 'Station Settings',
          href: '/photographer/settings',
          icon: Sliders,
        }}
        secondaryAction={{
          label: 'My Shoots Queue',
          href: '/photographer/bookings',
          icon: Camera,
        }}
        onRefresh={loadProfile}
        isRefreshing={loading}
      />

      {/* ── Page Content Wrapper with Balanced Side Margins ───────────────── */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 mt-4 sm:mt-5">

      {loading ? (
        <div className="py-24 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs">
          <RefreshCw size={26} className="animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 font-body">Loading profile credentials…</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="w-full space-y-6">

          {/* ── 2. TWO COMBINED, EQUAL-HEIGHT PANELS (50/50 SPLIT) ─────────── */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

            {/* ── PANEL 1: Identity, Photo & Public Bio (50% Width) ──────── */}
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 p-6 sm:p-7 shadow-xs relative overflow-hidden flex flex-col justify-between h-full transition-colors">
              <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-amber-200/20 to-transparent rounded-bl-full pointer-events-none" />

              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                      <Camera size={15} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                        Profile Photo &amp; Public Bio
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        Portrait image and client-facing introduction
                      </p>
                    </div>
                  </div>
                  {currentAvatar ? (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
                      Photo Added
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 font-mono">
                      Default Avatar
                    </span>
                  )}
                </div>

                {/* Avatar Hero Row */}
                <div className="flex flex-row items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60">
                  {/* Clickable Avatar Container */}
                  <div className="relative group shrink-0">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-primary dark:text-gold flex items-center justify-center font-heading text-3xl font-bold overflow-hidden ring-2 ring-amber-400/30 dark:ring-amber-400/20 shadow-sm transition-all group-hover:scale-102 cursor-pointer relative"
                      title="Click to change profile photo"
                    >
                      {currentAvatar ? (
                        <img
                          src={currentAvatar}
                          alt="Profile Avatar"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-neutral-900 to-neutral-800 text-gold flex items-center justify-center text-3xl font-bold">
                          {initial}
                        </div>
                      )}

                      {/* Subtle hover overlay */}
                      <div className="absolute inset-0 bg-neutral-950/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-0.5 backdrop-blur-[1px]">
                        <Camera size={16} className="text-amber-400" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-200">Change</span>
                      </div>

                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center text-white">
                          <RefreshCw size={20} className="animate-spin text-amber-400" />
                        </div>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Left-Aligned Identity & Photo Actions Column */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1.5 text-left">
                    <div>
                      <h4 className="font-heading text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate tracking-tight">
                        {fullName}
                      </h4>
                      <p className="text-xs font-semibold text-amber-700 dark:text-gold truncate">
                        {formData.specialization || 'Portrait & Studio Photography'}
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono truncate">
                        {user?.email || 'photographer@ekodak.studio'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="py-1.5 px-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-gold dark:hover:bg-amber-400 text-white dark:text-neutral-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {uploadingAvatar ? (
                          <RefreshCw size={12} className="animate-spin text-amber-400 dark:text-neutral-950" />
                        ) : (
                          <Upload size={12} className="text-amber-400 dark:text-neutral-950" />
                        )}
                        <span>{currentAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                      </button>

                      {currentAvatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={uploadingAvatar}
                          className="py-1.5 px-2.5 bg-white dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-neutral-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 rounded-xl text-xs font-bold transition-all border border-neutral-200 dark:border-neutral-700 hover:border-rose-200 cursor-pointer"
                          title="Remove profile image"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}

                      <span className="text-xs text-neutral-400 font-medium hidden sm:inline ml-1 font-mono">
                        JPG, PNG or WebP
                      </span>
                    </div>
                  </div>
                </div>

                {/* Public Bio Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200">
                      Public Bio &amp; Client Introduction
                    </label>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {formData.bio.length} chars
                    </span>
                  </div>

                  <textarea
                    name="bio"
                    rows={3}
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell your clients about your photography background, client direction style, and studio aesthetic..."
                    className="w-full p-3.5 bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none transition-all resize-none shadow-2xs leading-relaxed"
                  />
                  <p className="text-xs text-neutral-400">
                    Supports markdown bullets. This text appears on client passes and bookings dossier.
                  </p>
                </div>

                {/* Live Client Pass Preview Box (Balances vertical height perfectly) */}
                <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Sparkles size={11} className="text-amber-500 dark:text-gold" />
                      <span>Client Booking Pass Preview</span>
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Sync</span>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-700/80 shadow-2xs flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 ring-1 ring-gold/30 flex items-center justify-center font-heading text-sm font-bold text-gold overflow-hidden shrink-0 shadow-2xs">
                      {currentAvatar ? (
                        <img src={currentAvatar} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span>{initial}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                          {fullName || 'Photographer Name'}
                        </h5>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-gold border border-amber-200 dark:border-amber-800 font-mono shrink-0">
                          VERIFIED
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-amber-700 dark:text-gold truncate">
                        {formData.specialization || 'Lead Portrait & Studio Photographer'}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 italic leading-relaxed pt-0.5">
                        &ldquo;{formData.bio || 'Official E-Kodak Studio Photographer'}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 1 Footer */}
              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">Role: Verified Studio Photographer</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Active Portal Access
                </span>
              </div>
            </div>

            {/* ── PANEL 2: Personal Credentials & Specialties (50% Width) ─── */}
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 p-6 sm:p-7 shadow-xs flex flex-col justify-between h-full transition-colors">
              <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                      <User size={15} className="text-neutral-700 dark:text-neutral-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                        Personal Credentials &amp; Specialties
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        Official contact information and photography disciplines
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-gold border border-amber-200 dark:border-amber-800 font-mono">
                    CREDENTIALS
                  </span>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Mark June"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Repunte"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Registered Email (Locked) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Registered Email
                      </label>
                      <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                        <Lock size={10} /> Locked
                      </span>
                    </div>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-100/90 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm font-mono text-neutral-500 dark:text-neutral-400 cursor-not-allowed select-none"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Contact Phone
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+63 910 294 9414"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Studio Specialization Title */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Studio Role &amp; Specialization Title
                    </label>
                    <div className="relative">
                      <ShieldCheck size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        placeholder="e.g. Lead Portrait &amp; Graduation Photographer"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Specialties Tag Cloud */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      Studio Disciplines (Click to Add / Remove):
                    </span>
                    <span className="text-xs text-amber-700 dark:text-gold font-semibold font-mono">12 PRESETS</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {SPECIALTY_TAGS.map((tag) => {
                      const isSelected = formData.bio.includes(`• ${tag}`);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 active:scale-95 border ${
                            isSelected
                              ? 'bg-neutral-900 dark:bg-neutral-800 text-gold border-neutral-900 dark:border-gold shadow-2xs ring-1 ring-gold/40'
                              : 'bg-neutral-50 dark:bg-neutral-800/50 hover:bg-amber-50/80 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-amber-900 dark:hover:text-gold border-neutral-200/90 dark:border-neutral-700 hover:border-amber-300 dark:hover:border-gold/40'
                          }`}
                        >
                          {isSelected ? (
                            <Check size={11} className="text-gold stroke-[3]" />
                          ) : (
                            <Plus size={11} className="text-neutral-400" />
                          )}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Panel 2 Footer */}
              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-400">Account ID: <span className="font-mono text-neutral-600 dark:text-neutral-400">{user?.id ? user.id.slice(0, 8) + '...' : 'Unknown'}</span></span>
                <span className="text-amber-700 dark:text-gold font-semibold text-[11px]">Synced with Client Passes</span>
              </div>
            </div>

          </div>

          {/* ── 3. FULL-WIDTH POINT-TO-POINT SYNCHRONIZED ACTION BAR ────────── */}
          <div className="w-full p-5 sm:p-6 rounded-3xl bg-neutral-900 dark:bg-neutral-950 text-white border border-neutral-800 shadow-md flex flex-wrap items-center justify-between gap-4 transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-neutral-800 dark:bg-neutral-900 border border-neutral-700 dark:border-neutral-800 flex items-center justify-center text-amber-400 dark:text-gold shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">
                  {isDirty ? 'Unsaved profile modifications' : 'Profile information synchronized'}
                </p>
                <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                  {isDirty
                    ? 'You have unsaved changes. Click Save Profile or press Ctrl+S to commit.'
                    : 'All photographer credentials, contact numbers, and public bio are currently synchronized.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={loadProfile}
                disabled={saving || !isDirty}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Discard
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-7 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 hover:shadow-amber-500/20 active:scale-98"
              >
                {saving ? (
                  <RefreshCw size={14} className="animate-spin text-neutral-950" />
                ) : (
                  <Check size={14} className="text-neutral-950 stroke-[3]" />
                )}
                <span>Save Profile</span>
              </button>
            </div>
          </div>

        </form>
      )}
      </div>
    </div>
  );
}
