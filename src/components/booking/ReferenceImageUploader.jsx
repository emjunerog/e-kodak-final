import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, X, Eye, Maximize2 } from 'lucide-react';

export default function ReferenceImageUploader({ files, setFiles, maxFiles = 3, maxSizeMB = 5 }) {
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

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div 
        className="border-2 border-dashed border-neutral-200 hover:border-gold/60 rounded-2xl p-5 flex flex-col items-center justify-center bg-neutral-50/70 hover:bg-neutral-50 transition-all cursor-pointer group"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-11 h-11 rounded-full bg-gold/10 group-hover:bg-gold/20 flex items-center justify-center mb-2 transition-colors">
          <UploadCloud size={22} className="text-gold" />
        </div>
        <p className="font-heading text-sm text-primary font-semibold">Click to upload visual peg images</p>
        <p className="font-body text-neutral-400 text-xs text-center max-w-xs mt-0.5">
          JPEG, PNG, WEBP (Max {maxFiles} files, {maxSizeMB}MB each)
        </p>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          multiple 
          accept="image/jpeg, image/png, image/webp" 
          className="hidden" 
        />
      </div>

      {error && (
        <p className="text-red-500 text-xs font-body font-medium bg-red-50 border border-red-200 p-2.5 rounded-xl">{error}</p>
      )}

      {/* File Previews with real thumbnail and Click-to-View */}
      {files.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-3">
          {files.map((file, idx) => {
            const url = objectUrls[idx];
            return (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-neutral-200 bg-white shadow-sm flex flex-col">
                <div 
                  className="h-28 w-full bg-neutral-100 relative cursor-pointer overflow-hidden"
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
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white font-medium text-xs">
                    <Maximize2 size={14} /> View
                  </div>
                </div>

                <div className="p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-body text-xs font-semibold text-primary truncate">{file.name}</p>
                    <p className="font-body text-[10px] text-neutral-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Click to enlarge
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title="Remove image"
                  >
                    <X size={14} />
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
