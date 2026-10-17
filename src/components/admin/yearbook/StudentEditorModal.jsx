import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  X,
  Camera,
  Sparkles,
  Award,
  Music,
  Quote,
  CheckCircle2,
  Trash2,
  Upload,
} from 'lucide-react';

export default function StudentEditorModal({
  isOpen,
  student,
  onClose,
  onSave,
  onDelete,
}) {
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    role: 'Student',
    isOfficer: false,
    motto: '',
    superlative: '',
    credentials: '',
    song: '',
    artist: '',
    photoUrl: '',
    doodleTag: '',
    doodleColor: '#00ffff',
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        nickname: student.nickname || '',
        role: student.role || 'Student',
        isOfficer: student.isOfficer || false,
        motto: student.motto || '',
        superlative: student.superlative || '',
        credentials: student.credentials || '',
        song: student.song || 'With A Smile',
        artist: student.artist || 'Eraserheads',
        photoUrl: student.photoUrl || '',
        doodleTag: student.doodleTag || '',
        doodleColor: student.doodleColor || '#00ffff',
      });
    } else {
      setFormData({
        name: '',
        nickname: '',
        role: 'Student',
        isOfficer: false,
        motto: 'Every moment is a memory in the making.',
        superlative: 'Most Likely to Succeed 🌟',
        credentials: 'Senior High Graduate 2026',
        song: 'With A Smile',
        artist: 'Eraserheads',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        doodleTag: 'Graduate',
        doodleColor: '#00ffff',
      });
    }
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...student,
      ...formData,
      id: student?.id || `stu-${Date.now()}`,
    });
    onClose();
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setFormData(prev => ({ ...prev, photoUrl: uploadEvent.target?.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-neutral-200 font-body animate-fade-in flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div>
            <h2 className="font-heading text-lg font-bold text-neutral-900">
              {student ? 'Edit Graduate Yearbook Profile' : 'Add New Graduate Profile'}
            </h2>
            <p className="text-xs text-neutral-500">
              Configure 2x2 photo roll preview, senior motto, and generation superlatives
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* 2x2 Photo Preview & Upload */}
          <div className="flex items-center gap-4 p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80">
            <div className="w-20 h-24 rounded-xl overflow-hidden bg-neutral-900 relative ring-2 ring-gold/40 shrink-0 shadow-sm">
              <img
                src={formData.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"}
                alt="2x2 Preview"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 inset-x-0 bg-gold text-neutral-950 text-[9px] font-black uppercase text-center py-0.5">
                2x2 ROLL
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700">
                2x2 Student Portrait Photo
              </label>
              <div className="flex gap-2">
                <label className="btn-outline px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5">
                  <Upload size={13} />
                  <span>Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <input
                type="url"
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                placeholder="Or paste image URL..."
                className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-xs outline-none focus:border-gold transition-colors"
              />
            </div>
          </div>

          {/* Name & Nickname */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Full Student Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Mark June Repunte"
                className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:border-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Nickname (for Doodles / Spotify)
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="e.g. Makie"
                className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:border-gold outline-none"
              />
            </div>
          </div>

          {/* Role & Officer status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Academic Role / Position
              </label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const role = e.target.value;
                  const isOff = ['Class President', 'Vice President', 'Class Secretary', 'Class Treasurer', 'Valedictorian'].includes(role);
                  setFormData({ ...formData, role, isOfficer: isOff });
                }}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:border-gold outline-none"
              >
                <option value="Student">Regular Graduate</option>
                <option value="Class President">Class President</option>
                <option value="Vice President">Vice President</option>
                <option value="Class Secretary">Class Secretary</option>
                <option value="Class Treasurer">Class Treasurer</option>
                <option value="Valedictorian">Valedictorian</option>
                <option value="Salutatorian">Salutatorian</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Academic Credentials &amp; Honors
              </label>
              <input
                type="text"
                value={formData.credentials}
                onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
                placeholder="e.g. With High Honors · STEM Club"
                className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:border-gold outline-none"
              />
            </div>
          </div>

          {/* Superlative & Quirky Doodle Tag */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
              <span>Superlative Title (Doodle Callout)</span>
              <span className="text-xs text-neutral-400 font-normal">e.g. Future Corrupt Politician, Robotics Wizard</span>
            </label>
            <input
              type="text"
              value={formData.superlative}
              onChange={(e) => setFormData({ ...formData, superlative: e.target.value })}
              placeholder="e.g. Robotics Wizard 🤖"
              className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:border-gold outline-none"
            />
          </div>

          {/* Senior Motto */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center gap-1">
              <Quote size={12} className="text-gold" />
              <span>Senior Motto / Yearbook Quote</span>
            </label>
            <textarea
              rows={2}
              value={formData.motto}
              onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
              placeholder="Enter student senior motto..."
              className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:border-gold outline-none resize-none"
            />
          </div>

          {/* Spotify Track & Artist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-900 text-white rounded-2xl">
            <div>
              <label className="block text-[11px] font-bold text-emerald-400 mb-1 flex items-center gap-1">
                <Music size={12} />
                <span>Graduation Anthem Song</span>
              </label>
              <input
                type="text"
                value={formData.song}
                onChange={(e) => setFormData({ ...formData, song: e.target.value })}
                placeholder="e.g. With A Smile"
                className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                Artist / Band
              </label>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                placeholder="e.g. Eraserheads"
                className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
            {student && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(student.id);
                  onClose();
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 p-2 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                <span>Remove Student</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <CheckCircle2 size={14} />
                <span>Save Profile</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}

StudentEditorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  student: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
};
