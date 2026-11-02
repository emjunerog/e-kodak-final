import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Copy, Check, Download, RefreshCw, X,
  ArrowUpRight, ArrowRight, FileText, FolderOpen, Eye, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getCustomerBookings, getCachedCustomerBookings } from '../../services/bookingService';
import ClientHeroBanner from '../../components/dashboard/ClientHeroBanner';
import Toast from '../../components/ui/Toast';
import { SoftCopiesSkeleton, SmartLoadingContainer } from '../../components/dashboard/skeletons';

// Bespoke Animated Studio Camera with Floating Photo Cards & Geometric Shapes
function AnimatedStudioCamera({ className = "w-36 h-36 sm:w-44 sm:h-44" }) {
  return (
    <div className={`relative flex items-center justify-center select-none shrink-0 ${className}`}>
      {/* Background Orbital Geometric Dashed Rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-1 sm:inset-2 rounded-full border border-dashed border-amber-400/35 dark:border-amber-500/25 pointer-events-none"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-5 sm:inset-6 rounded-full border border-amber-300/20 dark:border-amber-500/15 pointer-events-none"
      />

      {/* Floating Photo Card 1 (Back Left, tilted -14°) */}
      <motion.div
        animate={{
          y: [0, -8, 0],
          rotate: [-14, -18, -14],
        }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-2 top-2 sm:top-3 w-16 h-20 sm:w-18 sm:h-22 rounded-xl bg-white dark:bg-[#1a1b1e] border border-neutral-200/90 dark:border-neutral-700/80 shadow-md p-1.5 flex flex-col justify-between -z-10"
      >
        <div className="w-full h-11 sm:h-13 rounded-lg bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300 dark:from-amber-950/40 dark:via-neutral-800 dark:to-amber-900/40 relative overflow-hidden flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-amber-400/80" />
          <motion.div
            animate={{ x: ['-100%', '160%'] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />
        </div>
        <div className="h-1.5 w-8 rounded bg-neutral-200 dark:bg-neutral-700" />
      </motion.div>

      {/* Floating Photo Card 2 (Back Right, tilted +12°) */}
      <motion.div
        animate={{
          y: [0, 8, 0],
          rotate: [12, 16, 12],
        }}
        transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        className="absolute -right-2 top-4 sm:top-5 w-16 h-20 sm:w-18 sm:h-22 rounded-xl bg-white dark:bg-[#1a1b1e] border border-amber-200/90 dark:border-amber-900/70 shadow-md p-1.5 flex flex-col justify-between -z-10"
      >
        <div className="w-full h-11 sm:h-13 rounded-lg bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-600 relative overflow-hidden flex items-center justify-center">
          <Eye size={13} className="text-neutral-950/80" />
        </div>
        <div className="h-1.5 w-10 rounded bg-neutral-200 dark:bg-neutral-700" />
      </motion.div>

      {/* Main Studio Camera Object (Foreground) */}
      <motion.div
        animate={{
          y: [0, -5, 0],
          rotate: [0, 1.5, 0, -1.5, 0],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 w-28 h-20 sm:w-32 sm:h-22 rounded-2xl bg-gradient-to-b from-[#25272d] to-[#121316] border border-neutral-700/80 shadow-xl flex items-center justify-center"
      >
        {/* Top Camera Dial & Shutter Button */}
        <div className="absolute -top-2 left-4 w-5 h-2 rounded-t-xs bg-neutral-500 border border-neutral-600" />
        <div className="absolute -top-3 right-5 w-4 h-3 rounded-t bg-amber-500 border border-amber-400 shadow-xs" />
        <div className="absolute -top-1.5 right-11 w-5 h-1.5 rounded-t bg-neutral-600" />

        {/* Viewfinder Prism */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-3 rounded-t-lg bg-[#2a2d34] border border-neutral-600/70" />

        {/* Studio Lens Barrel with Concentric Rings */}
        <div className="w-15 h-15 sm:w-17 sm:h-17 rounded-full bg-gradient-to-br from-[#1c1d22] via-[#2f323a] to-[#0e0f12] border-2 border-amber-400/90 p-1.5 shadow-inner flex items-center justify-center relative">
          {/* Outer Lens Grip Ridges */}
          <div className="absolute inset-0 rounded-full border border-dashed border-amber-300/40" />

          {/* Inner Lens Glass with Animated Aperture Blades */}
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#0b0c0e] via-[#16181f] to-[#1f232d] relative overflow-hidden flex items-center justify-center">
            {/* Rotating Aperture Shutter Blades */}
            <motion.div
              animate={{
                rotate: [0, 60, 0],
                scale: [0.92, 1.08, 0.92],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-amber-400/70 relative flex items-center justify-center"
            >
              <div className="w-3 h-3 rounded-full bg-amber-400/90 shadow-sm shadow-amber-400/60" />
              {/* Aperture Iris lines */}
              <div className="absolute w-full h-[1px] bg-amber-400/50 rotate-0" />
              <div className="absolute w-full h-[1px] bg-amber-400/50 rotate-60" />
              <div className="absolute w-full h-[1px] bg-amber-400/50 rotate-120" />
            </motion.div>

            {/* Lens Glass Reflection Sheen */}
            <motion.div
              animate={{
                opacity: [0.15, 0.6, 0.15],
                x: [-10, 10, -10],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -inset-1 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none"
            />
          </div>
        </div>

        {/* Red Studio Tally Light */}
        <motion.div
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-2 left-2.5 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-xs shadow-rose-500"
        />

        {/* Metallic Gold Accent Strip */}
        <div className="absolute bottom-2 inset-x-3 h-0.5 bg-gradient-to-r from-amber-500/0 via-amber-400 to-amber-500/0" />
      </motion.div>

      {/* Floating 4-Point Geometric Star (Top Right) */}
      <motion.div
        animate={{
          scale: [0.75, 1.25, 0.75],
          rotate: [0, 90, 180, 270, 360],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-1 -right-1 text-amber-500 pointer-events-none"
      >
        <Sparkles size={18} />
      </motion.div>

      {/* Floating Camera Viewfinder Corner (Bottom Left) */}
      <motion.div
        animate={{
          opacity: [0.35, 0.85, 0.35],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-amber-500/80 rounded-bl-sm pointer-events-none"
      />

      {/* Floating Mini Diamond Shape */}
      <motion.div
        animate={{
          y: [0, -6, 0],
          rotate: [45, 65, 45],
        }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -bottom-1 right-3 w-2.5 h-2.5 bg-amber-400/80 rotate-45 rounded-xs pointer-events-none"
      />
    </div>
  );
}

// Authentic Google Drive 6-segment vector emblem
function GoogleDriveIcon({ className = "w-7 h-7" }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
    </svg>
  );
}

function isDriveItem(item) {
  if (!item) return false;
  return (
    item.file_type === 'gdrive_folder' ||
    item.file_type === 'gdrive_link' ||
    Boolean(item.file_path && (item.file_path.includes('drive.google.com') || item.file_path.includes('docs.google.com')))
  );
}

function isImageItem(item) {
  if (!item || isDriveItem(item)) return false;
  const ft = (item.file_type || '').toLowerCase();
  const fn = (item.file_name || '').toLowerCase();
  if (ft === 'application/pdf' || fn.endsWith('.pdf') || fn.endsWith('.zip') || fn.endsWith('.rar')) {
    return false;
  }
  return ft.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif)$/i.test(fn);
}

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!n || n <= 0) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SoftCopiesPage() {
  const { user } = useAuth();
  const outletContext = useOutletContext();

  // Instant resolution from context or in-memory cache to prevent skeleton flash
  const initialBookings = useMemo(() => {
    if (outletContext?.bookings && Array.isArray(outletContext.bookings)) {
      return outletContext.bookings.filter(b => b.status !== 'CANCELLED' && b.status !== 'REJECTED' && !b.is_deleted);
    }
    const cached = getCachedCustomerBookings(user?.id);
    if (cached && Array.isArray(cached)) {
      return cached.filter(b => b.status !== 'CANCELLED' && b.status !== 'REJECTED' && !b.is_deleted);
    }
    return [];
  }, [outletContext?.bookings, user?.id]);

  const [bookings, setBookings] = useState(initialBookings);
  const [selectedBookingId, setSelectedBookingId] = useState(initialBookings[0]?.id || null);
  const [photoOutputs, setPhotoOutputs] = useState([]);
  const [loading, setLoading] = useState(initialBookings.length === 0);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [toast, setToast] = useState(null);

  // Sync if outlet context updates
  useEffect(() => {
    if (outletContext?.bookings && Array.isArray(outletContext.bookings)) {
      const valid = outletContext.bookings.filter(b => b.status !== 'CANCELLED' && b.status !== 'REJECTED' && !b.is_deleted);
      setBookings(valid);
      if (valid.length > 0) {
        setSelectedBookingId(prev => prev || valid[0].id);
      }
      setLoading(false);
      setError(null);
    }
  }, [outletContext?.bookings]);

  const loadBookings = useCallback(async () => {
    if (!user?.id) return;
    try {
      setError(null);
      const { data: bData, error: bErr } = await getCustomerBookings(user.id);
      if (bErr) {
        setError(bErr);
      } else {
        const validBookings = (bData || []).filter(b => b.status !== 'CANCELLED' && b.status !== 'REJECTED' && !b.is_deleted);
        setBookings(validBookings);
        if (validBookings.length > 0) {
          setSelectedBookingId((prev) => prev || validBookings[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load customer bookings:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (initialBookings.length > 0) {
      setBookings(initialBookings);
      setLoading(false);
    }
    loadBookings();
  }, [user?.id, loadBookings]);

  // Currently active booking derived from state
  const activeBooking = useMemo(() => {
    if (!bookings || bookings.length === 0) return null;
    return bookings.find(b => b.id.toString() === selectedBookingId?.toString()) || bookings[0] || null;
  }, [bookings, selectedBookingId]);

  const activeBookingId = activeBooking?.id;

  // Fetch photo outputs for the currently active booking
  const fetchOutputs = useCallback(async (isSilent = false) => {
    if (!activeBookingId) {
      setPhotoOutputs([]);
      return;
    }
    if (!isSilent) setRefreshing(true);
    try {
      const { data: outputs, error: outErr } = await supabase
        .from('photo_outputs')
        .select('*')
        .eq('booking_id', activeBookingId)
        .order('created_at', { ascending: false });

      if (outErr) {
        console.warn('Error loading photo_outputs:', outErr);
        setPhotoOutputs([]);
      } else {
        setPhotoOutputs(outputs || []);
      }
    } catch (err) {
      console.error('Failed to load photo outputs:', err);
      setPhotoOutputs([]);
    } finally {
      if (!isSilent) setRefreshing(false);
    }
  }, [activeBookingId]);

  useEffect(() => {
    let isCurrent = true;

    async function loadData() {
      if (!activeBookingId) {
        if (isCurrent) setPhotoOutputs([]);
        return;
      }
      try {
        const { data: outputs, error: outErr } = await supabase
          .from('photo_outputs')
          .select('*')
          .eq('booking_id', activeBookingId)
          .order('created_at', { ascending: false });

        if (isCurrent) {
          setPhotoOutputs(outErr ? [] : (outputs || []));
        }
      } catch (err) {
        console.error('Failed to load photo outputs:', err);
        if (isCurrent) setPhotoOutputs([]);
      }
    }

    loadData();
    return () => { isCurrent = false; };
  }, [activeBookingId]);

  // Real-time synchronization with Supabase and custom events
  useEffect(() => {
    if (!user?.id) return;

    const handleUpdate = () => {
      fetchOutputs(false);
    };

    window.addEventListener('ekodak_bookings_updated', handleUpdate);
    window.addEventListener('ekodak:customer_notifications_updated', handleUpdate);

    const channelName = `realtime:customer-softcopies:${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photo_outputs'
        },
        () => {
          fetchOutputs(false);
          setToast({
            type: 'success',
            message: 'Your studio soft copies have just been updated!'
          });
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('ekodak_bookings_updated', handleUpdate);
      window.removeEventListener('ekodak:customer_notifications_updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchOutputs]);

  // Handle booking switch
  const handleSelectBooking = (bId) => {
    setSelectedBookingId(bId);
  };

  const hasAnySoftCopies = photoOutputs.length > 0;

  // Determine Folder Category / Delivery Channel label
  const folderCategoryLabel = useMemo(() => {
    if (!hasAnySoftCopies) return 'Pending';
    if (photoOutputs.some(isDriveItem)) return 'Google Drive';
    const first = photoOutputs[0];
    const bracketMatch = first?.file_name?.match(/^\[(.*?)\]/);
    if (bracketMatch?.[1]) return bracketMatch[1];
    return 'Direct Files';
  }, [hasAnySoftCopies, photoOutputs]);

  // Copy link helper
  const handleCopyLink = (outputId, url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLinkId(outputId);
    setTimeout(() => setCopiedLinkId(null), 2500);
  };

  const fmtDate = (d, opts = { month: 'short', day: 'numeric', year: 'numeric' }) =>
    d ? new Date(d).toLocaleDateString('en-PH', opts) : '—';

  const cleanName = (name, fallback) =>
    name?.replace(/^\[.*?\]\s*/i, '') || fallback;

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] flex flex-col font-body pb-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <ClientHeroBanner
        bookings={bookings}
        selectedBooking={activeBooking}
        title={
          <span className="inline-flex items-baseline">
            <span>Soft-</span>
            <span className="font-heading italic font-light bg-gradient-to-r from-amber-200 via-gold to-amber-300 bg-clip-text text-transparent drop-shadow-sm">
              copies
            </span>
          </span>
        }
      />

      <div className="w-full flex-1 flex flex-col px-2 sm:px-4 lg:px-6 pt-3 animate-fade-in">
        <SmartLoadingContainer
          loading={loading}
          hasData={bookings.length > 0}
          error={error}
          onRetry={loadBookings}
          skeleton={<SoftCopiesSkeleton />}
          delayMs={220}
          title="Soft-copies"
        >
          {!activeBooking ? (
          <div className="rounded-[36px] bg-white dark:bg-[#111215] border border-neutral-200/80 dark:border-neutral-800/80 border-t-2 sm:border-t-[3px] border-t-amber-500 p-12 sm:p-16 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 sm:h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 pointer-events-none" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-500 mb-2">
              Soft-copies
            </p>
            <h3 className="font-heading font-bold text-2xl sm:text-3xl text-neutral-900 dark:text-white">
              No bookings yet
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              Your photos will appear here after your session.
            </p>
            <Link
              to="/dashboard/book"
              className="mt-6 inline-flex px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
            >
              Book a session
            </Link>
          </div>
        ) : (
          <section
            aria-label="Soft-copies"
            className="flex-1 flex flex-col rounded-[32px] sm:rounded-[36px] bg-white dark:bg-[#111215] border border-neutral-200/80 dark:border-neutral-800/80 border-t-2 sm:border-t-[3px] border-t-amber-500 px-5 sm:px-8 lg:px-10 py-7 sm:py-10 shadow-xs relative overflow-hidden min-h-[520px] lg:min-h-[580px]"
          >
            {/* Top Orange Accent Outline */}
            <div className="absolute top-0 inset-x-0 h-1 sm:h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 pointer-events-none" />
            {/* ── 50 / 50 Split: Left (Status & Session) | Right (Category & Sent File/Link) ── */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

              {/* ── LEFT HALF: Centered Booking Number, Headline, Sentence & Package/Tier ── */}
              <div className="lg:col-span-6 flex flex-col justify-center items-center text-center lg:pr-10 lg:border-r border-neutral-100 dark:border-neutral-800/80 my-auto py-6">
                {/* Centered Booking Number */}
                {bookings.length > 1 ? (
                  <div className="mb-3">
                    <select
                      value={selectedBookingId || ''}
                      onChange={(e) => handleSelectBooking(e.target.value)}
                      aria-label="Select booking"
                      className="text-[11.5px] font-mono font-bold uppercase tracking-[0.2em] bg-neutral-100 dark:bg-neutral-900 text-amber-600 dark:text-amber-500 px-3.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 cursor-pointer focus:outline-hidden focus:border-amber-500 text-center"
                    >
                      {bookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          #{b.booking_number}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-[11px] sm:text-[12px] font-mono font-bold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-500 mb-3">
                    #{activeBooking?.booking_number || 'BK-2026-00002'}
                  </p>
                )}

                <h2 className="font-heading font-bold text-4xl sm:text-5xl lg:text-[52px] text-neutral-900 dark:text-white leading-[1.1] tracking-tight">
                  {hasAnySoftCopies ? (
                    <>Your photos are<br />ready.</>
                  ) : (
                    <>Your photos are<br />being edited.</>
                  )}
                </h2>

                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-normal leading-relaxed mt-4 max-w-md mx-auto">
                  {hasAnySoftCopies
                    ? 'Your studio deliverables have been released. Open the folder or download your files directly from the right panel.'
                    : 'Our studio team is retouching and preparing your deliverables. Your folder link or files will appear on the right as soon as they are released.'}
                </p>

                {/* Package & Tier neatly positioned below the sentence */}
                <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-center gap-10 text-xs flex-wrap">
                  <div className="text-center">
                    <p className="text-[10.5px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold">
                      Package
                    </p>
                    <p className="font-bold text-neutral-900 dark:text-white mt-1">
                      {activeBooking?.service?.name || activeBooking?.tier_name || 'Studio Session'}
                    </p>
                  </div>

                  <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

                  <div className="text-center">
                    <p className="text-[10.5px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold">
                      Tier
                    </p>
                    <p className="font-bold text-neutral-900 dark:text-white mt-1">
                      {activeBooking?.tier_name || 'Standard'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── RIGHT HALF: Folder Category directly above the card(s) ── */}
              <div className="lg:col-span-6 flex flex-col justify-center my-auto py-6">
                {/* Folder Category & Refresh positioned directly above the card */}
                <div className="flex items-end justify-between gap-4 mb-4 sm:mb-5">
                  <div>
                    <p className="text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400 dark:text-neutral-500 mb-1">
                      Folder Category
                    </p>
                    <div className="font-heading italic text-3xl sm:text-4xl lg:text-[38px] text-amber-500 dark:text-amber-400 leading-none">
                      {folderCategoryLabel}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchOutputs(false)}
                    title="Refresh deliverables"
                    aria-label="Refresh deliverables"
                    className="h-8 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/80 inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0 mb-0.5"
                  >
                    <RefreshCw size={12} className={refreshing ? 'animate-spin text-amber-500' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Sent File / Link Deliverable Card(s) or Awaiting Release Card */}
                <div className="space-y-4">
                  {hasAnySoftCopies ? (
                    photoOutputs.map((item) => {
                      const isDrive = isDriveItem(item);
                      const isImage = isImageItem(item);
                      const isCopied = copiedLinkId === item.id;
                      const displayTitle = cleanName(
                        item.file_name,
                        isDrive ? 'Google Drive RAW & High-Res Folder' : 'Studio Deliverable'
                      );
                      const sizeLabel = formatBytes(item.file_size);
                      const extMatch = (item.file_name || '').match(/\.([a-z0-9]+)$/i);
                      const extBadge = extMatch ? extMatch[1].toUpperCase() : '';

                      const itemEyebrow = isDrive
                        ? 'Google Drive Folder'
                        : isImage
                          ? `Studio Photograph${extBadge ? ` · ${extBadge}` : ''}`
                          : `Studio File${extBadge ? ` · ${extBadge}` : ''}`;

                      return (
                        <div
                          key={item.id}
                          className="bg-[#fbf7ee] dark:bg-[#181613] border border-amber-200/80 dark:border-amber-900/40 rounded-2xl sm:rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-2xs"
                        >
                          {/* Top Info Row */}
                          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
                            {isDrive ? (
                              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-900 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-center shrink-0 shadow-xs">
                                <GoogleDriveIcon className="w-7 h-7" />
                              </div>
                            ) : isImage ? (
                              <button
                                type="button"
                                onClick={() => setPreviewItem(item)}
                                className="relative w-16 h-16 rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 border border-amber-200/80 dark:border-amber-900/40 shrink-0 group cursor-pointer"
                                title="Preview photograph"
                              >
                                <img
                                  src={item.file_path}
                                  alt={displayTitle}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye size={16} />
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPreviewItem(item)}
                                className="w-14 h-14 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-xs hover:scale-105 transition-transform cursor-pointer"
                                title="Preview file"
                              >
                                <FileText size={24} />
                              </button>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-500 mb-1">
                                {itemEyebrow}
                              </p>
                              <h4 className="font-heading font-bold text-xl sm:text-2xl text-neutral-900 dark:text-white leading-tight break-words">
                                {displayTitle}
                              </h4>
                              <p className="text-xs sm:text-[13px] text-neutral-600 dark:text-neutral-400 mt-1.5">
                                Released {fmtDate(item.created_at)}
                                {sizeLabel ? ` · ${sizeLabel}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Bottom Action Row */}
                          <div className="pt-4 border-t border-amber-200/60 dark:border-amber-900/30 flex items-center justify-between gap-3 flex-wrap">
                            {isDrive ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleCopyLink(item.id, item.file_path)}
                                  className="text-xs sm:text-sm text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
                                >
                                  {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                  <span>{isCopied ? 'Copied' : 'Copy link'}</span>
                                </button>

                                <a
                                  href={item.file_path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl inline-flex items-center gap-2 transition-all shadow-sm active:scale-95"
                                >
                                  <span>Open in Drive</span>
                                  <ArrowUpRight size={14} />
                                </a>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  {/* Preview button for files */}
                                  <button
                                    type="button"
                                    onClick={() => setPreviewItem(item)}
                                    className="h-10 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Eye size={14} className="text-amber-500" />
                                    <span>Preview</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleCopyLink(item.id, item.file_path)}
                                    className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                    title="Copy file link"
                                  >
                                    {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                    <span>{isCopied ? 'Copied' : 'Copy link'}</span>
                                  </button>
                                </div>

                                <a
                                  href={item.file_path}
                                  download={cleanName(item.file_name, 'deliverable')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl inline-flex items-center gap-2 transition-all shadow-sm active:scale-95"
                                >
                                  <Download size={14} />
                                  <span>Download</span>
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* Animated Empty state on the right with Studio Object & Shapes */
                    <div className="relative overflow-hidden bg-[#fcfaf4] dark:bg-[#161513] border border-amber-200/90 dark:border-amber-900/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xs group">
                      {/* Top Shimmer Light Beam Sweep */}
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
                        className="absolute top-0 left-0 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent pointer-events-none"
                      />

                      {/* Main Showcase: Animated Studio Camera & Shapes alongside editorial copy */}
                      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 pt-1">
                        {/* The Animated Camera, Floating Prints & Geometric Shapes */}
                        <AnimatedStudioCamera />

                        {/* Editorial Text */}
                        <div className="min-w-0 flex-1 text-center">
                          <h4 className="font-heading font-bold text-2xl sm:text-3xl text-neutral-900 dark:text-white leading-tight">
                            No files or links sent yet
                          </h4>
                          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mt-2.5 max-w-lg mx-auto">
                            Your studio deliverables are currently in production. Google Drive folders will appear here as soon as they are released.
                          </p>
                        </div>
                      </div>

                      {/* Full-width Divider Line across the card */}
                      <div className="w-full h-px bg-amber-200/70 dark:bg-amber-900/40" />

                      {/* Bottom Action Row: Centered Check progress button */}
                      <div className="w-full flex items-center justify-center pt-1 pb-1">
                        <Link
                          to="/dashboard/progress"
                          className="group relative overflow-hidden bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm px-8 py-3 rounded-xl inline-flex items-center gap-2 transition-all shadow-sm active:scale-95"
                        >
                          <span className="relative z-10">Check progress</span>
                          <ArrowRight size={14} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                          <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtle bottom note on the right with generous breathing room */}
                <div className="mt-8 sm:mt-10 text-[11.5px] sm:text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-2 px-1">
                  <FolderOpen size={13} className="text-amber-500 shrink-0" />
                  <span>All released links and files sync automatically in real time.</span>
                </div>
              </div>

            </div>
          </section>
        )}
        </SmartLoadingContainer>
      </div>

      {/* ── File Preview Modal (Supports Images, PDFs, and Documents) ── */}
      {previewItem && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fade-in"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-[#18191c] rounded-3xl max-w-4xl w-full p-4 sm:p-6 text-white border border-neutral-800 flex flex-col max-h-[92vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-semibold truncate">
                  {cleanName(previewItem.file_name, 'Deliverable')}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {isImageItem(previewItem) ? 'Image Photograph' : 'Document File'}
                  {previewItem.file_size ? ` · ${formatBytes(previewItem.file_size)}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewItem.file_path}
                  download={cleanName(previewItem.file_name, 'deliverable')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  aria-label="Close preview"
                  className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto flex items-center justify-center py-4 min-h-[300px]">
              {isImageItem(previewItem) ? (
                <img
                  src={previewItem.file_path}
                  alt={cleanName(previewItem.file_name, 'Photo')}
                  className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
                />
              ) : (previewItem.file_type === 'application/pdf' || (previewItem.file_name || '').toLowerCase().endsWith('.pdf')) ? (
                <iframe
                  src={`${previewItem.file_path}#toolbar=1`}
                  title={cleanName(previewItem.file_name, 'PDF Preview')}
                  sandbox="allow-scripts allow-forms allow-popups"
                  className="w-full h-[75vh] rounded-xl border border-neutral-700 bg-white"
                />
              ) : (
                <div className="text-center py-12 px-6">
                  <FileText size={48} className="mx-auto text-amber-500 mb-3" />
                  <p className="text-sm text-neutral-300 font-medium">
                    Preview not available for this file type
                  </p>
                  <p className="text-xs text-neutral-500 mt-1 mb-4">
                    You can download the file directly to view it on your device.
                  </p>
                  <a
                    href={previewItem.file_path}
                    download={cleanName(previewItem.file_name, 'file')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all"
                  >
                    <Download size={14} />
                    <span>Download File</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
