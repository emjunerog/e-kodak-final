import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import {
  X,
  Camera,
  ShieldCheck,
  Mail,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Lock,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminProfileModal({ isOpen, onClose }) {
  const { user, profile, updateProfile, uploadAvatar } = useAuth();
  const fileInputRef = useRef(null);
  const firstNameRef = useRef(null);
  const objectUrlRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Synchronize form data when modal opens or profile changes
  useEffect(() => {
    if (isOpen && profile) {
      setFormData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      });
      setAvatarPreview(profile.avatar_url || null);
      setFeedback(null);
    }
  }, [isOpen, profile]);

  // Revoke stale object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // Lock background scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Close on Escape + autofocus first field for keyboard users
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    // Focus after paint so the modal animation doesn't jank
    const t = setTimeout(() => firstNameRef.current?.focus(), 60);
    return () => {
      document.removeEventListener('keydown', handleKey);
      clearTimeout(t);
    };
  }, [isOpen, onClose]);

  const setPreviewUrl = (url) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (url && url.startsWith('blob:')) {
      objectUrlRef.current = url;
    }
    setAvatarPreview(url);
  };

  // Handle Photo selection & upload
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    // Reset input so the same file can be picked again
    e.target.value = '';
    if (!file) return;

    // Validate type & size (max 5MB)
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Please select a valid image file (PNG, JPG, WebP).' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Image size exceeds 5MB limit.' });
      return;
    }

    setIsUploading(true);
    setFeedback(null);

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      if (uploadAvatar) {
        await uploadAvatar(file);
        setFeedback({ type: 'success', message: 'Profile portrait updated successfully!' });
      } else {
        throw new Error('uploadAvatar unavailable');
      }
    } catch (err) {
      console.warn('Storage upload fallback to base64 Data URL:', err);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Url = reader.result;
          await updateProfile({ avatar_url: base64Url });
          setPreviewUrl(base64Url);
          setFeedback({ type: 'success', message: 'Profile photo saved successfully!' });
        } catch {
          setFeedback({ type: 'error', message: 'Failed to update profile photo.' });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim()) {
      setFeedback({ type: 'error', message: 'First name cannot be blank.' });
      firstNameRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const { error } = await updateProfile({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone.trim(),
        bio: formData.bio.trim(),
      });

      if (error) {
        throw error;
      }

      setFeedback({ type: 'success', message: 'Administrative profile updated successfully!' });
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error('Profile update error:', err);
      setFeedback({ type: 'error', message: err.message || 'Could not save profile changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  const roleName = profile?.role === 'admin'
    ? 'Administrator / Studio Director'
    : (profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Officer');

  const initial = (profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'A').toUpperCase();
  const displayName = `${formData.firstName} ${formData.lastName}`.trim() || 'Studio Officer';

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-body"
      role="dialog"
      aria-modal="true"
      aria-label="Staff and executive profile"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card — fixed header + scrollable body + sticky footer */}
      <div
        className="relative w-full max-w-lg my-auto bg-white rounded-2xl shadow-2xl border border-neutral-200/80 overflow-hidden animate-slide-up flex flex-col max-h-[90vh] sm:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative px-5 sm:px-6 py-4 sm:py-5 bg-neutral-900 text-white flex items-center justify-between gap-3 border-b border-white/10 shrink-0">
          {/* subtle gold top accent */}
          <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" aria-hidden="true" />
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-heading font-bold text-white tracking-wide truncate">
                Staff &amp; Executive Profile
              </h2>
              <p className="text-xs text-neutral-400 font-body truncate">
                Update your administrative information and identity
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile dialog"
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            title="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form wraps scrollable body + sticky footer so actions never scroll away */}
        <form id="admin-profile-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
            {/* Feedback Alert */}
            {feedback && (
              <div
                role="status"
                className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
                )}
                <span className="min-w-0 break-words">{feedback.message}</span>
              </div>
            )}

            {/* Avatar + identity banner */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70">
              <div className="relative group flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white ring-2 ring-gold/40 ring-offset-2 ring-offset-neutral-50 flex items-center justify-center text-gold font-heading font-bold text-xl sm:text-2xl overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Staff avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span aria-hidden="true">{initial}</span>
                  )}
                </div>

                {/* Single trigger: visible on touch, hover-reveal on desktop (one tab stop) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  aria-label="Upload new portrait photo"
                  title="Upload new portrait photo"
                  className="absolute inset-0 rounded-full bg-neutral-950/45 text-white flex flex-col items-center justify-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
                >
                  {isUploading ? (
                    <Loader2 size={18} className="animate-spin text-gold" />
                  ) : (
                    <>
                      <Camera size={18} aria-hidden="true" />
                      <span className="text-xs font-semibold leading-none">Change</span>
                    </>
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoSelect}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>

              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gold/15 text-gold-dark border border-gold/30 max-w-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden="true" />
                  <span className="truncate">{roleName}</span>
                </span>
                <p className="mt-1.5 text-sm font-semibold text-neutral-900 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-neutral-500 truncate">{user?.email || ''}</p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  {isUploading ? 'Uploading portrait…' : 'Tap photo to change · PNG, JPG or WebP up to 5MB'}
                </p>
              </div>
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label htmlFor="admin-first-name" className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center gap-1.5">
                  <User size={13} className="text-neutral-400" aria-hidden="true" />
                  First Name <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="admin-first-name"
                  ref={firstNameRef}
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="e.g. Maria"
                  autoComplete="given-name"
                  className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all font-body text-neutral-900 bg-white placeholder:text-neutral-400"
                />
              </div>

              <div className="min-w-0">
                <label htmlFor="admin-last-name" className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center gap-1.5">
                  <User size={13} className="text-neutral-400" aria-hidden="true" />
                  Last Name
                </label>
                <input
                  id="admin-last-name"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="e.g. Santos"
                  autoComplete="family-name"
                  className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all font-body text-neutral-900 bg-white placeholder:text-neutral-400"
                />
              </div>
            </div>

            {/* Contact fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label htmlFor="admin-phone" className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center gap-1.5">
                  <Phone size={13} className="text-neutral-400" aria-hidden="true" />
                  Contact Phone
                </label>
                <input
                  id="admin-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="0917 123 4567"
                  autoComplete="tel"
                  className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all font-body text-neutral-900 bg-white placeholder:text-neutral-400"
                />
              </div>

              <div className="min-w-0">
                <label htmlFor="admin-email" className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} className="text-neutral-400" aria-hidden="true" />
                    Staff Email
                  </span>
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1 shrink-0">
                    <Lock size={10} aria-hidden="true" /> Locked
                  </span>
                </label>
                <input
                  id="admin-email"
                  type="email"
                  disabled
                  value={user?.email || ''}
                  tabIndex={-1}
                  aria-disabled="true"
                  className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-500 text-sm cursor-not-allowed outline-none font-body truncate"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="admin-bio" className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center gap-1.5">
                <FileText size={13} className="text-neutral-400" aria-hidden="true" />
                Department Representation / Motto / Bio
              </label>
              <textarea
                id="admin-bio"
                rows={3}
                maxLength={280}
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="e.g. Overseeing studio photography workflows, client bookings, and executive operations."
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all font-body text-neutral-900 resize-none bg-white placeholder:text-neutral-400"
              />
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-[11px] text-neutral-400">
                  Visible on team directories and administrative logs.
                </p>
                <p className="text-[11px] text-neutral-400 tabular-nums shrink-0" aria-live="polite">
                  {formData.bio.length}/280
                </p>
              </div>
            </div>
          </div>

          {/* Sticky footer — always visible, never scrolls away */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-neutral-100 bg-neutral-50/70 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isUploading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-dark hover:text-white text-neutral-900 text-xs font-bold transition-all shadow-md shadow-gold/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-wait"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} aria-hidden="true" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

AdminProfileModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
