import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  QrCode, Camera, CheckCircle2, AlertCircle, X, ArrowRight,
  RefreshCw, User, Calendar, Clock, DollarSign, ShieldCheck,
  Search, Volume2, VolumeX, Sparkles, Upload, Image as ImageIcon,
  Copy, Check
} from 'lucide-react';
import jsQR from 'jsqr';
import { verifyQRPassScan } from '../../services/qrService';
import { useAuth } from '../../context/AuthContext';

// Simple Web Audio beep synthesizer for POS scanner feedback
function playScanBeep(isSuccess = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isSuccess ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(isSuccess ? 880 : 300, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isSuccess ? 0.15 : 0.25));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (isSuccess ? 0.15 : 0.25));
  } catch {
    // AudioContext not allowed or not supported
  }
}

// Decode QR code from an image File using jsQR on an HTML Canvas
function decodeQRFromImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not a supported image.'));
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 1600;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Downscale oversized screenshots to optimize memory and decoding speed
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        URL.revokeObjectURL(objectUrl);

        // Try regular contrast and inverted contrast
        let code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (!code) {
          code = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'onlyInvert',
          });
        }

        if (code && code.data) {
          resolve(code.data);
        } else {
          resolve(null);
        }
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image.'));
    };

    img.src = objectUrl;
  });
}

export default function StaffQRScannerModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mode tabs: 'upload' (default for desktop/screenshots), 'camera', 'manual'
  const [activeTab, setActiveTab] = useState('upload');
  const [manualInput, setManualInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Screenshot upload state
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const manualInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isScanningRef = useRef(false);

  // ── Global Clipboard Paste Listener (Ctrl+V) ────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            setActiveTab('upload');
            handleProcessUploadedFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // ── Reset state on modal open/close ─────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setVerifiedResult(null);
      setErrorMsg(null);
      setManualInput('');
      setUploadedPreview(null);
      isScanningRef.current = true;

      if (activeTab === 'camera') {
        startCamera();
      } else if (activeTab === 'manual') {
        setTimeout(() => manualInputRef.current?.focus(), 150);
      }
    } else {
      stopCamera();
      isScanningRef.current = false;
      setUploadedPreview(null);
    }

    return () => {
      stopCamera();
      isScanningRef.current = false;
    };
  }, [isOpen, activeTab]);

  // ── Camera Scanner Lifecycle ────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported on this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        startCameraDetection();
      }
    } catch (err) {
      console.warn('Camera start error:', err);
      setCameraError(err.message || 'Could not access camera feed. Please check permissions or upload a screenshot.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Continuous camera frame detection using BarcodeDetector or jsQR canvas fallback
  const startCameraDetection = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const scanFrame = async () => {
      if (!isScanningRef.current || !videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      try {
        const video = videoRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          isScanningRef.current = false;
          handleVerifyToken(code.data);
          return;
        }
      } catch {
        // frame processing catch
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, []);

  // ── Screenshot / Image Processing ───────────────────────────────────────────
  const handleProcessUploadedFile = async (file) => {
    if (!file) return;
    setErrorMsg(null);
    setIsVerifying(true);

    try {
      const previewUrl = URL.createObjectURL(file);
      setUploadedPreview(previewUrl);

      const qrPayloadString = await decodeQRFromImageFile(file);

      if (!qrPayloadString) {
        setIsVerifying(false);
        setErrorMsg('No QR code could be read from this screenshot. Please ensure the QR pass is clear and well-lit, or type the booking number.');
        if (soundEnabled) playScanBeep(false);
        return;
      }

      // Verify detected token
      await handleVerifyToken(qrPayloadString);
    } catch (err) {
      console.error('File scan error:', err);
      setIsVerifying(false);
      setErrorMsg(err.message || 'Failed to process screenshot file.');
      if (soundEnabled) playScanBeep(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleProcessUploadedFile(file);
  };

  // ── Token Verification Logic ────────────────────────────────────────────────
  const handleVerifyToken = async (tokenString) => {
    const cleanToken = tokenString?.trim();
    if (!cleanToken) return;

    setIsVerifying(true);
    setErrorMsg(null);

    const { success, message, booking, isDuplicate } = await verifyQRPassScan({
      bookingToken: cleanToken,
      scannedBy: user?.id || null,
      scanType: 'STAFF_CHECKIN',
    });

    setIsVerifying(false);

    if (success && booking) {
      if (soundEnabled) playScanBeep(true);
      setVerifiedResult({ booking, isDuplicate: !!isDuplicate });
      stopCamera();
    } else {
      if (soundEnabled) playScanBeep(false);
      setErrorMsg(message || 'Unrecognized QR code. Please ensure it belongs to an E-Kodak booking.');
      // Resume scanning after 2.5 seconds
      setTimeout(() => {
        isScanningRef.current = true;
        if (activeTab === 'camera') startCameraDetection();
      }, 2500);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleVerifyToken(manualInput.trim());
    }
  };

  const handleResetScanner = () => {
    setVerifiedResult(null);
    setErrorMsg(null);
    setManualInput('');
    setUploadedPreview(null);
    isScanningRef.current = true;

    if (activeTab === 'camera') {
      startCamera();
    } else if (activeTab === 'manual') {
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  };

  const handleOpenBooking = () => {
    if (verifiedResult?.booking?.id) {
      onClose();
      navigate(`/admin/bookings/${verifiedResult.booking.id}`);
    }
  };

  if (!isOpen) return null;

  // Render directly to document.body via Portal to eliminate parent stacking context trapping
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-neutral-950/75 backdrop-blur-sm font-body animate-fade-in overflow-y-auto">
      
      {/* Click-outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative bg-white rounded-3xl border border-neutral-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-auto z-10 animate-scale-in">

        {/* ── Modal Header: Clean, Justified Brand Bar ───────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold/15 text-gold border border-gold/30 flex items-center justify-center shrink-0">
              <QrCode size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base font-bold text-primary">
                  Studio QR Pass Scanner
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Staff Desk
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-body">
                Verify customer passes via screenshot upload, live camera, or barcode gun
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                  : 'bg-neutral-50 text-neutral-400 border-neutral-200'
              }`}
              title={soundEnabled ? 'Mute scanner beep' : 'Enable scanner beep'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Mode Tabs: Justified 3-Way Selector ─────────────────────────── */}
        {!verifiedResult && (
          <div className="px-6 pt-4 pb-2">
            <div className="flex p-1 bg-neutral-100/90 rounded-2xl border border-neutral-200/80 gap-1">
              {/* Tab 1: Upload Screenshot */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('upload');
                  stopCamera();
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white text-primary shadow-xs ring-1 ring-neutral-200'
                    : 'text-neutral-500 hover:text-primary hover:bg-white/50'
                }`}
              >
                <Upload size={14} className={activeTab === 'upload' ? 'text-gold' : ''} />
                <span>Upload Screenshot</span>
              </button>

              {/* Tab 2: Live Camera */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('camera');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-white text-primary shadow-xs ring-1 ring-neutral-200'
                    : 'text-neutral-500 hover:text-primary hover:bg-white/50'
                }`}
              >
                <Camera size={14} className={activeTab === 'camera' ? 'text-gold' : ''} />
                <span>Camera</span>
              </button>

              {/* Tab 3: Barcode Gun / Manual Code */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('manual');
                  stopCamera();
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-white text-primary shadow-xs ring-1 ring-neutral-200'
                    : 'text-neutral-500 hover:text-primary hover:bg-white/50'
                }`}
              >
                <Search size={14} className={activeTab === 'manual' ? 'text-gold' : ''} />
                <span>Barcode Gun</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Modal Body Content ──────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto space-y-4 max-h-[68vh]">

          {/* Verification in progress spinner */}
          {isVerifying && (
            <div className="py-10 text-center space-y-3">
              <i className="bi bi-arrow-repeat animate-spin text-3xl text-gold mx-auto block"></i>
              <p className="text-xs font-semibold text-neutral-700">
                Decoding QR pass and verifying transaction ledger…
              </p>
            </div>
          )}

          {/* ── State 1: Verified Result Success Card ─────────────────────── */}
          {verifiedResult && !isVerifying && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 size={26} />
                </div>
                <div>
                  <h4 className="font-heading text-base font-bold text-emerald-950">
                    QR Pass Successfully Verified
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {verifiedResult.isDuplicate
                      ? 'Replay notice: Customer already scanned within last 5 seconds.'
                      : 'Authentic booking pass verified with studio audit trail.'}
                  </p>
                </div>
              </div>

              {/* Customer & Booking Details */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/90 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60">
                  <span className="text-neutral-500 font-medium">Booking Number</span>
                  <span className="font-mono font-bold text-primary text-sm">
                    {verifiedResult.booking.booking_number}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 flex items-center gap-1.5">
                    <User size={13} className="text-gold" />
                    Customer Name
                  </span>
                  <span className="font-bold text-neutral-900">
                    {verifiedResult.booking.customer
                      ? `${verifiedResult.booking.customer.first_name} ${verifiedResult.booking.customer.last_name || ''}`
                      : 'Studio Customer'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-gold" />
                    Service Package
                  </span>
                  <span className="font-bold text-neutral-900">
                    {verifiedResult.booking.service?.name || 'Studio Photography Session'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 flex items-center gap-1.5">
                    <Calendar size={13} className="text-gold" />
                    Event Schedule
                  </span>
                  <span className="font-semibold text-neutral-800">
                    {verifiedResult.booking.event_date || 'Scheduled'} • {verifiedResult.booking.preferred_time || 'Session'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60">
                  <span className="text-neutral-500 font-medium">Payment Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    verifiedResult.booking.payment_status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {verifiedResult.booking.payment_status || 'DOWNPAYMENT_PAID'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleResetScanner}
                  className="flex-1 py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Scan Another Pass
                </button>
                <button
                  type="button"
                  onClick={handleOpenBooking}
                  className="flex-1 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer hover:scale-102"
                >
                  <span>Open Booking Details</span>
                  <ArrowRight size={14} className="text-gold" />
                </button>
              </div>
            </div>
          )}

          {/* ── Mode 1: Upload Screenshot / Image File ─────────────────────── */}
          {!verifiedResult && !isVerifying && activeTab === 'upload' && (
            <div className="space-y-3.5">
              
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-gold bg-gold/10'
                    : 'border-neutral-300 hover:border-gold/60 bg-neutral-50 hover:bg-neutral-100/70'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 text-gold flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <Upload size={22} />
                </div>
                <h4 className="font-heading text-sm font-bold text-primary">
                  Upload Screenshot or Press Ctrl+V
                </h4>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                  Drag &amp; drop customer QR screenshot here, or click to browse files
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 shadow-2xs hover:bg-neutral-50">
                  <ImageIcon size={14} className="text-gold" />
                  <span>Choose Image File</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProcessUploadedFile(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </div>

              {/* Screenshot Preview if present */}
              {uploadedPreview && (
                <div className="p-3 rounded-2xl bg-neutral-100 border border-neutral-200/80 flex items-center gap-3">
                  <img
                    src={uploadedPreview}
                    alt="Uploaded QR screenshot"
                    className="w-14 h-14 object-cover rounded-xl border border-neutral-200 shadow-2xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-neutral-800 truncate">
                      Processing Screenshot File…
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Reading cryptographic QR pattern
                    </p>
                  </div>
                </div>
              )}

              {/* Direct Paste Tip */}
              <div className="p-3 rounded-xl bg-gold/10 border border-gold/30 text-xs text-neutral-700 flex items-center gap-2">
                <Sparkles size={15} className="text-gold shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  <strong className="font-bold">Fast Paste:</strong> Take a screenshot (<kbd className="px-1.5 py-0.5 rounded bg-white font-mono text-[10px] border border-neutral-200">Win+Shift+S</kbd>) and press <kbd className="px-1.5 py-0.5 rounded bg-white font-mono text-[10px] border border-neutral-200">Ctrl+V</kbd> anywhere on this screen.
                </p>
              </div>

            </div>
          )}

          {/* ── Mode 2: Camera Scanner View ────────────────────────────────── */}
          {!verifiedResult && !isVerifying && activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-neutral-900 aspect-video flex items-center justify-center border border-neutral-300 shadow-inner">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      muted
                      autoPlay
                      playsInline
                    />
                    {/* Viewfinder Target Frame */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-gold rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                        {/* Corner Accents */}
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-sm"></div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-sm"></div>
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-sm"></div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-sm"></div>
                        {/* Animated Laser Sweep */}
                        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent animate-pulse absolute top-1/2 -translate-y-1/2"></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 text-neutral-400 space-y-2">
                    <Camera size={32} className="mx-auto text-neutral-600 animate-pulse" />
                    <p className="text-xs">Connecting to camera feed…</p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle size={15} className="text-amber-600 shrink-0" />
                    <span>Camera Permission or Device Notice</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    {cameraError}
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('upload')}
                      className="px-3 py-1 bg-amber-900 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      Switch to Upload Screenshot
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-neutral-400 text-center">
                Position customer QR pass within the viewfinder box. Scanner auto-detects.
              </p>
            </div>
          )}

          {/* ── Mode 3: Manual Code / Barcode Gun View ─────────────────────── */}
          {!verifiedResult && !isVerifying && activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700">
                  Scan Barcode Gun or Type Booking Number
                </label>
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    ref={manualInputRef}
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Scan gun or enter EK-2026-XXXX / token..."
                    className="w-full pl-9 pr-24 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all font-mono"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!manualInput.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    Verify Pass
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400">
                  USB / Bluetooth 2D barcode scanner guns automatically transmit upon trigger.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs text-neutral-600 space-y-1">
                <p className="font-bold text-neutral-800 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-gold" />
                  Cryptographic Anti-Replay Check
                </p>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Every scan verifies token integrity and creates an auditable record in the studio scan logs.
                </p>
              </div>
            </form>
          )}

          {/* Error Banner */}
          {errorMsg && !isVerifying && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">
                <p className="font-bold">Scan Verification Notice</p>
                <p className="text-[11px] mt-0.5 leading-relaxed">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-red-400 hover:text-red-700 p-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

        </div>

        {/* ── Modal Footer ───────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-neutral-100 bg-neutral-50/80 flex items-center justify-between text-xs">
          <span className="text-neutral-400 text-[11px]">
            E-Kodak Security Standard • Pass Token v1
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 hover:text-primary transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

StaffQRScannerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
