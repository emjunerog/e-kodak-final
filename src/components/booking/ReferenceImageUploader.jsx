import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, X, Eye, Maximize2 } from 'lucide-react';

export default function ReferenceImageUploader({ files, setFiles, maxFiles = 3, maxSizeMB = 3 }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState("");
  const [previewModalUrl, setPreviewModalUrl] = useState(null);
  const [previewModalTitle, setPreviewModalTitle] = useState("");
  const [objectUrls, setObjectUrls] = useState({});

  // Generate object URLs for file thumbnails and clean them up
  useEffect(() => {
    const urls = {};
    files.forEach((file, idx) => {
      if (file instanceof File || file instanceof Blob) {
        urls[idx] = URL.createObjectURL(file);
      } else if (typeof file === 'string') {
        urls[idx] = file;
      }
    });
    setObjectUrls(urls);

    return () => {
      Object.values(urls).forEach(url => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [files]);

  const handleFileChange = (e) => {
    setError("");
    const selectedFiles = Array.from(e.target.files);
    
    if (files.length + selectedFiles.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} reference images.`);
      return;
    }

    const validFiles = [];
    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" is not an image file.`);
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`"${file.name}" exceeds the ${maxSizeMB}MB limit.`);
        return;
      }
      validFiles.push(file);
    }

    setFiles([...files, ...validFiles]);
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, idx) => idx !== indexToRemove));
  };

  const openLightbox = (url, title) => {
    setPreviewModalUrl(url);
    setPreviewModalTitle(title || "Reference Image");
  };

  // Lock body scroll and handle Escape key when modal is open
  useEffect(() => {
    if (!previewModalUrl) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setPreviewModalUrl(null);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewModalUrl]);

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (files.length < maxFiles) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError("");

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    const droppedFiles = Array.from(e.dataTransfer.files);

    if (files.length + droppedFiles.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} reference images.`);
      return;
    }

    const validFiles = [];
    for (const file of droppedFiles) {
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" is not an image file.`);
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`"${file.name}" exceeds the ${maxSizeMB}MB limit.`);
        return;
      }
      validFiles.push(file);
    }

    setFiles([...files, ...validFiles]);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {files.length < maxFiles ? (
        <div 
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center transition-all cursor-pointer group text-center ${
            isDragging
              ? "border-gold bg-amber-500/10 ring-2 ring-gold/40 scale-[0.99]"
              : "border-neutral-300 hover:border-gold/70 bg-gradient-to-b from-neutral-50/90 to-white hover:bg-amber-50/15"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 via-gold/15 to-amber-500/10 border border-gold/30 group-hover:border-gold/60 group-hover:scale-105 flex items-center justify-center mb-2.5 transition-all shadow-2xs">
            <UploadCloud size={24} className="text-amber-800" />
          </div>
          <p className="font-heading text-sm text-neutral-900 font-bold">
            Drag &amp; drop or click to upload visual peg images
          </p>
          <p className="font-body text-neutral-500 text-xs mt-1 max-w-sm">
            Attach sample poses, lighting styles, or backdrop concepts (Max {maxFiles} images, up to {maxSizeMB}MB each)
          </p>
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-neutral-900 group-hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-colors">
            <UploadCloud size={13} className="text-gold" />
            <span>Select Photos</span>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            multiple 
            accept="image/jpeg, image/png, image/webp" 
            className="hidden" 
          />
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-gold/40 text-center flex items-center justify-center gap-2 text-xs font-semibold text-neutral-900">
          <UploadCloud size={16} className="text-amber-800" />
          <span>Maximum reference photo limit reached ({maxFiles}/{maxFiles}). Remove an image below to upload a different one.</span>
        </div>
      )}

      {error && (
        <p className="text-red-700 text-xs font-body font-semibold bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-2">
          <span>{error}</span>
        </p>
      )}

      {/* File Previews with real thumbnail and Click-to-View */}
      {files.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-3.5 pt-1">
          {files.map((file, idx) => {
            const url = objectUrls[idx];
            return (
              <div key={idx} className="relative group rounded-2xl overflow-hidden border border-neutral-200 bg-white shadow-2xs hover:shadow-warm-xs transition-all flex flex-col justify-between">
                <div 
                  className="h-32 w-full bg-neutral-100 relative cursor-pointer overflow-hidden"
                  onClick={() => openLightbox(url, file.name)}
                  title="Click to view full photo"
                >
                  {url ? (
                    <img 
                      src={url} 
                      alt={file.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                      Loading...
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-medium text-xs">
                    <Maximize2 size={14} /> Enlarge
                  </div>
                </div>

                <div className="p-3 flex items-center justify-between gap-2 border-t border-neutral-100 bg-white">
                  <div className="min-w-0">
                    <p className="font-body text-xs font-bold text-primary truncate">{file.name}</p>
                    <p className="font-body text-[10px] text-neutral-500 font-medium mt-0.5">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Ready for bay
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title="Remove image"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Lightbox Modal rendered via Portal outside parent stacking context */}
      {previewModalUrl && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in overflow-y-auto"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div 
            className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 bg-neutral-50">
              <span className="font-heading text-sm font-semibold text-primary truncate max-w-md">
                {previewModalTitle}
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="p-1.5 text-neutral-400 hover:text-primary rounded-lg hover:bg-neutral-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3 bg-neutral-950 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img 
                src={previewModalUrl} 
                alt={previewModalTitle} 
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-inner"
              />
            </div>
            <div className="px-5 py-3 text-center text-xs text-neutral-500 font-body bg-neutral-50 flex items-center justify-between border-t border-neutral-100">
              <span>Client Reference Peg Image</span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="text-xs font-semibold text-primary hover:text-gold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
