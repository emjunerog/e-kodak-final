import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  X,
  Upload,
  ZoomIn,
  AlertTriangle,
  Shield,
  Crop,
  Check,
} from 'lucide-react';
import { validateStudentRecord } from '../../../services/yearbookService';

export default function IndividualStudentEditorModal({
  isOpen,
  student,
  defaultSchool = '',
  onClose,
  onSave,
  onDelete,
}) {
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    studentId: '',
    school: '',
    degree: '',
    section: '',
    role: 'Student',
    isOfficer: false,
    honors: '',
    motto: '',
    biography: '',
    photoUrl: '',
    zoom: 1,
    panX: 0,
    panY: 0,
    aspectRatio: '2x2',
    filter: 'natural',
    syncToDb: false,
  });
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (student) {
        setFormData({
          name: student.name || '',
          nickname: student.nickname || '',
          studentId: student.studentId || '',
          school: student.school || '',
          degree: student.degree || student.credentials || '',
          section: student.section || '',
          role: student.role || 'Student',
          isOfficer: student.isOfficer || false,
          honors: student.honors || '',
          motto: student.motto || '',
          biography: student.biography || '',
          photoUrl: student.photoUrl || '',
          zoom: student.photoSpecs?.zoom || 1,
          panX: student.photoSpecs?.panX || 0,
          panY: student.photoSpecs?.panY || 0,
          aspectRatio: student.photoSpecs?.aspectRatio || '2x2',
          filter: student.photoSpecs?.filter || 'natural',
          syncToDb: false,
        });
      } else {
        setFormData((prev) => ({ ...prev, school: '' }));
      }
      setErrors([]);
    }
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setFormData(prev => ({
          ...prev,
          photoUrl: uploadEvent.target?.result,
          zoom: 1,
          panX: 0,
          panY: 0,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const candidate = {
      ...student,
      name: formData.name.trim(),
      nickname: formData.nickname.trim(),
      studentId: formData.studentId.trim(),
      school: formData.school.trim(),
      degree: formData.degree.trim(),
      section: formData.section.trim(),
      role: formData.role,
      isOfficer: formData.role !== 'Student',
      honors: formData.honors.trim(),
      credentials: formData.degree.trim(),
      motto: formData.motto.trim(),
      biography: formData.biography.trim(),
      photoUrl: formData.photoUrl,
      has2x2Copy: !!formData.photoUrl,
      photoSpecs: {
        zoom: formData.zoom,
        panX: formData.panX,
        panY: formData.panY,
        aspectRatio: formData.aspectRatio,
        filter: formData.filter,
      },
    };

    // Strict validation: nothing is saved with missing required data.
    const check = validateStudentRecord(candidate);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }

    onSave(candidate, formData.syncToDb);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-neutral-200 font-body animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900 font-heading">
                {student ? 'Edit Student' : 'Add Student'}
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Name, school, section, ID, and photo are required. Nothing is auto-filled.
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

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          
          {/* ── 2x2 Photo Preview & Precision Cropping Studio ──────────────── */}
          <div className="p-5 bg-neutral-950 text-white rounded-2xl border border-neutral-800 shadow-md">
            <div className="flex items-center justify-between mb-3 border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <Crop size={16} className="text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-200 font-heading">
                  2×2 Portrait Preview &amp; Framing Alignment
                </h3>
              </div>
              <span className="text-xs font-mono text-neutral-400">
                Print Spec: 2×2 in · 300 DPI (600×600px equivalent)
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              
              {/* The 2x2 Viewport with Alignment Guides */}
              <div className="relative w-44 h-44 rounded-xl overflow-hidden bg-neutral-900 border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0 flex items-center justify-center select-none group">
                
                {formData.photoUrl ? (
                  <div
                    className="w-full h-full relative overflow-hidden"
                    style={{
                      filter: formData.filter === 'bw' ? 'grayscale(100%)' : (formData.filter === 'sepia' ? 'sepia(80%)' : 'none'),
                    }}
                  >
                    <img
                      src={formData.photoUrl}
                      alt={formData.name || 'Preview'}
                      className="w-full h-full object-cover pointer-events-none transition-transform"
                      style={{
                        transform: `scale(${formData.zoom}) translate(${formData.panX}px, ${formData.panY}px)`,
                      }}
                    />

                    {/* 2x2 Safe Guidelines Overlay (Eye level & Center line) */}
                    <div className="absolute inset-0 pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity">
                      <div className="w-full h-px bg-cyan-400 absolute top-[35%] border-b border-dashed border-cyan-400" title="Ideal Eye Level Guide" />
                      <div className="w-px h-full bg-cyan-400 absolute left-1/2 border-r border-dashed border-cyan-400" title="Center Alignment Guide" />
                      <div className="absolute inset-3 border border-dashed border-amber-300/40 rounded-lg" title="Safe Printable Area" />
                    </div>

                    <div className="absolute bottom-1 inset-x-1 flex items-center justify-between px-1.5 py-0.5 bg-black/80 rounded text-[10px] font-mono font-bold text-amber-300 backdrop-blur-xs">
                      <span>2×2 VERIFIED</span>
                      <span>{Math.round(formData.zoom * 100)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-3 text-neutral-400">
                    <AlertTriangle size={32} className="text-amber-400 mb-1" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Missing Portrait
                    </span>
                    <span className="text-[11px] text-neutral-400 mt-0.5">
                      No 2×2 photo found in database
                    </span>
                  </div>
                )}
              </div>

              {/* Cropping Controls */}
              <div className="flex-1 w-full space-y-3">
                
                {/* Photo Upload Actions */}
                <div className="flex items-center gap-2">
                  <label className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors">
                    <Upload size={14} />
                    <span>Upload New Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, photoUrl: '' }))}
                      className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Zoom & Pan Sliders */}
                {formData.photoUrl && (
                  <div className="space-y-2 pt-1 text-xs">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-300 mb-1">
                        <span className="flex items-center gap-1">
                          <ZoomIn size={12} className="text-amber-400" />
                          <span>Portrait Zoom</span>
                        </span>
                        <span className="font-mono text-amber-300">{Math.round(formData.zoom * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="2.5"
                        step="0.05"
                        value={formData.zoom}
                        onChange={(e) => setFormData(p => ({ ...p, zoom: parseFloat(e.target.value) }))}
                        className="w-full accent-amber-400 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-neutral-400 block mb-0.5">Horizontal Pan</span>
                        <input
                          type="range"
                          min="-30"
                          max="30"
                          value={formData.panX}
                          onChange={(e) => setFormData(p => ({ ...p, panX: parseInt(e.target.value, 10) }))}
                          className="w-full accent-amber-400 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-neutral-400 block mb-0.5">Vertical Pan</span>
                        <input
                          type="range"
                          min="-30"
                          max="30"
                          value={formData.panY}
                          onChange={(e) => setFormData(p => ({ ...p, panY: parseInt(e.target.value, 10) }))}
                          className="w-full accent-amber-400 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Student Information Fields (all required data typed by hand) ─── */}
          <div className="space-y-3">

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                School *
              </label>
              <input
                type="text"
                required
                value={formData.school}
                onChange={(e) => setFormData(p => ({ ...p, school: e.target.value }))}
                placeholder="Type school name"
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-900 outline-none focus:border-amber-500"
              />
              {defaultSchool && (
                <p className="text-xs text-neutral-400 mt-0.5">
                  This book covers {defaultSchool} only.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Full Student Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Type full name"
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-900 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Student ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.studentId}
                  onChange={(e) => setFormData(p => ({ ...p, studentId: e.target.value }))}
                  placeholder="Type student ID"
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-neutral-800 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Role (officers only when assigned)
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-semibold text-neutral-800 outline-none focus:border-amber-500"
                >
                  <option value="Student">Student</option>
                  <option value="Class President">Class President</option>
                  <option value="Vice President">Vice President</option>
                  <option value="Class Secretary">Class Secretary</option>
                  <option value="Class Treasurer">Class Treasurer</option>
                  <option value="Valedictorian">Valedictorian</option>
                  <option value="Salutatorian">Salutatorian</option>
                  <option value="First Honorable Mention">First Honorable Mention</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Program / Strand
                </label>
                <input
                  type="text"
                  value={formData.degree}
                  onChange={(e) => setFormData(p => ({ ...p, degree: e.target.value }))}
                  placeholder="Type program"
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Section *
                </label>
                <input
                  type="text"
                  required
                  value={formData.section}
                  onChange={(e) => setFormData(p => ({ ...p, section: e.target.value }))}
                  placeholder="Type section"
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Honors (only when actually awarded)
              </label>
              <input
                type="text"
                value={formData.honors}
                onChange={(e) => setFormData(p => ({ ...p, honors: e.target.value }))}
                placeholder="Leave blank when none"
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Motto (student's own words only)
              </label>
              <textarea
                rows={2}
                value={formData.motto}
                onChange={(e) => setFormData(p => ({ ...p, motto: e.target.value }))}
                placeholder="Leave blank when none provided"
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 outline-none focus:border-amber-500 font-serif italic resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Personal Biography / Memory Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={formData.biography}
                onChange={(e) => setFormData(p => ({ ...p, biography: e.target.value }))}
                placeholder="Reflections on school memories, achievements, and aspirations..."
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-700 outline-none focus:border-amber-500 resize-none"
              />
            </div>

          </div>

          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <p className="font-bold">Cannot save yet:</p>
              <ul className="list-disc list-inside">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Database Synchronization Notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2 text-xs text-amber-900">
            <Shield size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Yearbook-only edits</p>
              <p className="text-[11px] text-amber-800/80 mt-0.5">
                Changes here apply to this yearbook only.
              </p>
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
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Remove from Yearbook</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Save to Yearbook Page</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}

IndividualStudentEditorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  student: PropTypes.object,
  defaultSchool: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
};
