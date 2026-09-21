import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Link as LinkIcon, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { uploadDirectImage } from '../../services/storageService';

/**
 * ImageDirectUploader
 * Allows admins to upload image files directly from their device (with direct Supabase Storage cloud upload)
 * or toggle to direct URL input.
 */
export default function ImageDirectUploader({
  value = '',
  onChange,
  label = 'Image / Photo',
  folder = 'uploads',
  helperText = 'Supports JPG, PNG, WEBP up to 10MB',
  required = false,
  aspectRatio = 'aspect-[4/3]'
}) {
  const [activeMode, setActiveMode] = useState('upload'); // 'upload' | 'url'
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WEBP, etc.).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const res = await uploadDirectImage(file, folder);
      if (res.error) {
        setUploadError('Upload failed: ' + res.error.message);
      } else if (res.url) {
        onChange(res.url);
      }
    } catch (err) {
      setUploadError('Error uploading image: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div className="space-y-2 font-body">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-neutral-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
              activeMode === 'upload'
                ? 'bg-gold/15 text-gold font-bold'
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <UploadCloud size={12} /> Direct Upload
          </button>
          <span className="text-neutral-300">•</span>
          <button
            type="button"
            onClick={() => setActiveMode('url')}
            className={`px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
              activeMode === 'url'
                ? 'bg-gold/15 text-gold font-bold'
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <LinkIcon size={12} /> Image URL
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-1.5">
          <AlertCircle size={14} className="shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Mode 1: Direct File Drag and Drop */}
      {activeMode === 'upload' && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
          />

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
              isDragOver
                ? 'border-gold bg-gold/5'
                : 'border-neutral-200 hover:border-gold/60 hover:bg-neutral-50/70 bg-neutral-50/40'
            }`}
          >
            {uploading ? (
              <div className="py-3 flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-gold" />
                <p className="text-xs font-medium text-neutral-600">Uploading directly to cloud storage...</p>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20">
                  <UploadCloud size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary">
                    Click to browse from device or drag photo here
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">{helperText}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Direct URL Input */}
      {activeMode === 'url' && (
        <div className="space-y-1">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://images.unsplash.com/... or cloud image URL"
            className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none bg-neutral-50/60 focus:bg-white transition-colors"
          />
          <p className="text-[10px] text-neutral-400">{helperText}</p>
        </div>
      )}

      {/* Preview Box if value is present */}
      {value && (
        <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 p-1 group">
          <div className={`w-full ${aspectRatio} rounded-xl overflow-hidden relative bg-neutral-900/10`}>
            <img
              src={value}
              alt="Uploaded Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&q=80';
              }}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-3 py-1.5 rounded-xl bg-white/90 text-primary text-xs font-semibold hover:text-gold shadow-sm"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="p-1.5 rounded-xl bg-white/90 text-neutral-600 hover:text-red-500 shadow-sm"
                title="Remove photo"
              >
                <X size={15} />
              </button>
            </div>
          </div>
          <div className="p-2 flex items-center justify-between text-[10px] text-neutral-500">
            <span className="truncate max-w-[240px] font-mono text-[9px]">{value}</span>
            <span className="shrink-0 text-emerald-700 font-bold flex items-center gap-1">
              <Check size={11} /> Ready
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
