import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  X,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileImage,
  Trash2,
  Sparkles,
  UserCheck,
} from 'lucide-react';

export default function BatchPhotoUploadModal({
  isOpen,
  onClose,
  students = [],
  onApplyPhotos,
}) {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [assignments, setAssignments] = useState({}); // { fileIndex: studentId }
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newEntries = files.map((file, idx) => {
      const url = URL.createObjectURL(file);
      const cleanFileName = file.name.toLowerCase().replace(/\.[^/.]+$/, '');
      
      // Auto-match algorithm: check if filename matches student name or ID
      let matchedStudentId = '';
      const foundStudent = students.find((s) => {
        const namePart = (s.name || '').toLowerCase();
        const idPart = (s.studentId || '').toLowerCase();
        return (
          cleanFileName.includes(namePart) ||
          (idPart && cleanFileName.includes(idPart)) ||
          cleanFileName.includes((s.nickname || '').toLowerCase())
        );
      });

      if (foundStudent) {
        matchedStudentId = foundStudent.id;
      }

      return {
        id: `file-${Date.now()}-${idx}`,
        file,
        fileName: file.name,
        previewUrl: url,
        autoMatchedId: matchedStudentId,
      };
    });

    setUploadedFiles((prev) => [...prev, ...newEntries]);

    // Prepopulate assignments
    const newAssignments = { ...assignments };
    newEntries.forEach((entry, i) => {
      if (entry.autoMatchedId) {
        newAssignments[entry.id] = entry.autoMatchedId;
      }
    });
    setAssignments(newAssignments);
  };

  const handleRemoveFile = (entryId) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== entryId));
    setAssignments((prev) => {
      const updated = { ...prev };
      delete updated[entryId];
      return updated;
    });
  };

  const handleAssignStudent = (entryId, studentId) => {
    setAssignments((prev) => ({
      ...prev,
      [entryId]: studentId,
    }));
  };

  const handleSaveBatch = () => {
    const photoUpdates = {};
    uploadedFiles.forEach((item) => {
      const assignedStuId = assignments[item.id];
      if (assignedStuId) {
        photoUpdates[assignedStuId] = item.previewUrl;
      }
    });

    onApplyPhotos(photoUpdates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-neutral-200 font-body animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-neutral-900">
                Batch Import 2×2 Student Portraits
              </h3>
              <p className="text-xs text-neutral-500">
                Upload student photos from your files and match them to real database records
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* File Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-amber-300 bg-amber-50/30 hover:bg-amber-50/60 transition-colors rounded-2xl p-6 text-center cursor-pointer group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFilesSelected}
            />
            <Upload size={32} className="mx-auto text-amber-700 group-hover:scale-110 transition-transform mb-2" />
            <p className="text-xs font-bold text-neutral-800">
              Click to select 2×2 portraits or drag and drop files here
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Supports JPEG, PNG, WEBP. Tip: Name files after student surname or student ID for auto-matching.
            </p>
          </div>

          {/* Uploaded Files Table */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
                <span>Selected Portraits ({uploadedFiles.length})</span>
                <span className="text-[11px] text-amber-800 font-mono">
                  {Object.keys(assignments).length} of {uploadedFiles.length} matched
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {uploadedFiles.map((entry) => {
                  const assignedId = assignments[entry.id] || '';
                  return (
                    <div
                      key={entry.id}
                      className="p-2.5 rounded-xl border border-neutral-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                    >
                      {/* Photo Thumbnail */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-neutral-200">
                          <img
                            src={entry.previewUrl}
                            alt={entry.fileName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-neutral-900 truncate">
                            {entry.fileName}
                          </p>
                          <span className="text-xs text-neutral-400 font-mono">
                            {(entry.file.size / 1024).toFixed(0)} KB · 2×2 Aspect
                          </span>
                        </div>
                      </div>

                      {/* Student Assignment Dropdown */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={assignedId}
                          onChange={(e) => handleAssignStudent(entry.id, e.target.value)}
                          className="py-1 px-2 text-xs border border-neutral-200 rounded-lg bg-neutral-50 font-medium text-neutral-800 focus:outline-none focus:border-amber-500 max-w-[200px]"
                        >
                          <option value="">-- Assign to Candidate --</option>
                          {students.map((stu) => (
                            <option key={stu.id} value={stu.id}>
                              {stu.name} {stu.studentId ? `(${stu.studentId})` : ''}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(entry.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <p className="text-xs text-neutral-500">
            Assigned photos will immediately update the yearbook spreads and 2×2 previews.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveBatch}
              disabled={uploadedFiles.length === 0}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <CheckCircle2 size={14} className="text-amber-400" />
              <span>Apply {Object.keys(assignments).length} Photos to Yearbook</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

BatchPhotoUploadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  students: PropTypes.array,
  onApplyPhotos: PropTypes.func.isRequired,
};
