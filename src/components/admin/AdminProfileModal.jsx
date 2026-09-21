import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
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

  if (!isOpen) return null;

  // Handle Photo selection & upload
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
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
    setAvatarPreview(objectUrl);

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
          setAvatarPreview(base64Url);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-fade-in font-body">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden z-10 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-neutral-900 via-neutral-900 to-primary text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-white tracking-wide">
                Staff &amp; Executive Profile
              </h2>
              <p className="text-[11px] text-neutral-300 font-body">
                Update your administrative information and identity
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-medium ${
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
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Avatar Upload Banner */}
          <div className="flex items-center gap-5 p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/70">
            <div className="relative group flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-gold/10 ring-4 ring-gold/20 flex items-center justify-center text-gold font-heading font-bold text-2xl overflow-hidden shadow-inner">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Staff Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>

              {/* Camera overlay button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer"
                title="Upload new portrait photo"
              >
                {isUploading ? (
                  <Loader2 size={18} className="animate-spin text-gold" />
                ) : (
                  <>
                    <Camera size={18} />
                    <span className="text-[9px] font-semibold mt-0.5">Change</span>
                  </>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold/15 text-gold border border-gold/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {roleName}
                </span>
              </div>
              <p className="text-sm font-semibold text-primary truncate">
                {formData.firstName || formData.lastName 
                  ? `${formData.firstName} ${formData.lastName}`.trim() 
                  : 'Studio Officer'}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="mt-1.5 text-xs font-semibold text-gold hover:text-primary transition-colors flex items-center gap-1"
              >
                <Camera size={13} />
                {isUploading ? 'Uploading Portrait...' : 'Change Portrait Photo'}
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-neutral-400" />
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="e.g. Maria"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-all font-body text-primary"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-neutral-400" />
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="e.g. Santos"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-all font-body text-primary"
              />
            </div>
          </div>

          {/* Contact Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center gap-1.5">
                <Phone size={13} className="text-neutral-400" />
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="0917 123 4567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-all font-body text-primary"
              />
            </div>

            {/* Email (Read only) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-neutral-400" />
                  Staff Email
                </span>
                <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                  <Lock size={10} /> Locked
                </span>
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-100/70 text-neutral-500 text-sm cursor-not-allowed outline-none font-body"
              />
            </div>
          </div>

          {/* Department Motto / Operational Bio */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center gap-1.5">
              <FileText size={13} className="text-neutral-400" />
              Department Representation / Motto / Bio
            </label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="e.g. Overseeing studio photography workflows, client bookings, and executive operations."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-all font-body text-primary resize-none"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              Visible on team directories and administrative communication logs.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-light text-primary text-xs font-bold transition-all shadow-md shadow-gold/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

AdminProfileModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
