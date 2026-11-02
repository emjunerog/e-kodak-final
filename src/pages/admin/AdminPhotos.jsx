import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ImageIcon,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Upload,
  Plus,
  Check,
  Trash2,
  ExternalLink,
  X,
  Sparkles,
  Layers,
  Search,
  Download,
  Filter,
  ArrowRightLeft,
  SlidersHorizontal,
  CalendarDays,
  ShieldCheck,
  Eye,
  Send,
  CheckCircle2,
  Clock,
  HardDrive,
  FolderCheck,
  Copy,
  FileImage,
  Maximize2,
  CheckCheck,
  User,
  Phone,
  Camera,
  Layers2,
  History,
  FolderOpen,
  Folder,
  FolderPlus,
  Link2,
  Table as TableIcon,
  LayoutGrid,
  MoreVertical,
  GraduationCap,
  Building2,
  Heart,
  Video,
  CreditCard,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import {
  getPhotoOutputs,
  uploadAdminPhotoOutput,
  deleteAdminPhotoOutput,
  updatePhotoOutputStatus,
  getCompletedBookingsAwaitingOutputs
} from '../../services/adminService';
import { extractSetName, getCleanFileName } from '../../services/photographerService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getEffectivePaymentStatus } from '../../lib/bookingUtils';
import Toast from '../../components/ui/Toast';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CategorizedMetricStrip from '../../components/admin/CategorizedMetricStrip';
import BookingLifecycleBadge from '../../components/admin/BookingLifecycleBadge';
import CustomDropdown from '../../components/ui/CustomDropdown';
import StudioDropdown from '../../components/ui/StudioDropdown';

const fmt = (d) => !d ? '—' : new Date(d).toLocaleDateString('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const fmtTime = (d) => !d ? '' : new Date(d).toLocaleTimeString('en-PH', {
  hour: '2-digit',
  minute: '2-digit'
});

const fmtSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const STATUS_CONFIG = {
  READY: {
    label: 'Ready for Release',
    badge: 'text-emerald-800 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-emerald-200/80',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
    desc: 'Approved & ready for client handover or download'
  },
  EDITING: {
    label: 'In Retouching',
    badge: 'text-amber-800 bg-gradient-to-r from-amber-50/90 via-gold/10 to-amber-50/50 border-gold/30',
    dot: 'bg-amber-500',
    icon: Clock,
    desc: 'Under active color grading, blemish removal, or crop'
  },
  RELEASED: {
    label: 'Client Released',
    badge: 'text-gold-dark bg-gradient-to-r from-gold/15 to-gold/5 border-gold/30',
    dot: 'bg-gold',
    icon: Sparkles,
    desc: 'Live on customer portal & accessible for download'
  },
  UPLOADED: {
    label: 'Raw Ingest',
    badge: 'text-neutral-800 bg-gradient-to-r from-neutral-100 to-neutral-200/50 border-neutral-200',
    dot: 'bg-neutral-500',
    icon: FileImage,
    desc: 'Direct camera ingest pending retoucher evaluation'
  },
};

const DELIVERABLE_TYPES = [
  { id: 'Soft Copies (Google Drive Folder)', label: 'Soft Copies (Google Drive Folder)', spec: 'All RAW & High-Res Shots (0 Supabase Storage Used)', isDrive: true, ratio: 'Folder' },
  { id: 'Toga Master Portrait', label: 'Toga Master Portrait', spec: 'Graduation Master Print', ratio: '2:3' },
  { id: '2x2 Formal ID Photo', label: '2x2 Formal ID Photo', spec: 'Standard Formal ID', ratio: '1:1' },
  { id: 'Passport Size Photo', label: 'Passport Size Photo', spec: 'Diplomatic / Embassy Spec', ratio: '7:9' },
  { id: 'Filipiniana / Barong Formal', label: 'Filipiniana / Barong Formal', spec: 'Heritage Formal Portrait', ratio: '4:5' },
  { id: 'Creative Milestone Solo', label: 'Creative Milestone Solo', spec: 'Graduation Solo Keepsake', ratio: '4:5' },
  { id: 'Family / Group Keepsake', label: 'Family / Group Keepsake', spec: 'Studio Group Session', ratio: '16:9' },
];

// ── Date formatting helper ─────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon = BookOpen, message = 'No matching bookings found for the selected filter.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={32} className="text-neutral-300 mb-3" />
      <p className="text-sm text-neutral-400 font-body">{message}</p>
    </div>
  );
}

// ── Deliverable Action Dropdown ───────────────────────────────────────────────
function DeliverableActionDropdown({ item, onInspect, onUpload, onNotify, onDelete, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (item.booking?.booking_number) {
      navigator.clipboard.writeText(item.booking.booking_number);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    }
  };

  const isDrive = item.file_type === 'gdrive_folder' || (item.file_path && item.file_path.includes('drive.google.com'));

  return (
    <div className="relative inline-block text-left" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
        title="Deliverable actions"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-2xl shadow-xl border border-neutral-200/80 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 font-body text-left">
          {onUpload && (
            <button
              type="button"
              onClick={() => {
                onUpload(item.booking?.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-amber-900 hover:bg-amber-50 font-semibold cursor-pointer text-left"
            >
              <FolderPlus size={13} className="text-amber-600" />
              <span>Upload Soft Copies / Drive Link</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onInspect?.(item);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-800 hover:bg-amber-50/60 font-semibold cursor-pointer text-left"
          >
            <Eye size={13} className="text-[#c9a96e]" />
            <span>Inspect Deliverable</span>
          </button>

          {isDrive ? (
            <a
              href={item.file_path}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-blue-700 hover:bg-blue-50 font-medium"
            >
              <ExternalLink size={13} className="text-blue-600" />
              <span>Open Google Drive</span>
            </a>
          ) : (
            item.file_path && (
              <a
                href={item.file_path}
                target="_blank"
                rel="noreferrer"
                download={item.file_name}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 font-medium"
              >
                <Download size={13} className="text-neutral-500" />
                <span>Download Original</span>
              </a>
            )
          )}

          {onNotify && (
            <button
              type="button"
              onClick={() => {
                onNotify(item);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-amber-900 font-medium cursor-pointer text-left"
            >
              <Send size={13} className="text-amber-600" />
              <span>Dispatch Notification</span>
            </button>
          )}

          {onStatusChange && (
            <div className="border-t border-neutral-100 my-1 pt-1">
              <span className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                Update Status
              </span>
              <div className="grid grid-cols-2 gap-1 px-2 py-1">
                <button
                  type="button"
                  onClick={() => {
                    onStatusChange(item.id, 'READY');
                    setOpen(false);
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-left truncate"
                >
                  ✓ Ready
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onStatusChange(item.id, 'RELEASED');
                    setOpen(false);
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 text-left truncate"
                >
                  ★ Release
                </button>
              </div>
            </div>
          )}

          <Link
            to="/admin/bookings"
            className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 font-medium"
            onClick={() => setOpen(false)}
          >
            <CalendarDays size={13} className="text-[#c9a96e]" />
            <span>Bookings Central</span>
          </Link>

          {item.booking?.booking_number && (
            <button
              type="button"
              onClick={handleCopy}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 font-medium border-t border-neutral-100 mt-1 cursor-pointer text-left"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-500" />
                  <span className="text-emerald-600 font-semibold">Copied Ref!</span>
                </>
              ) : (
                <>
                  <Copy size={13} className="text-neutral-400" />
                  <span>Copy Ref #{item.booking.booking_number}</span>
                </>
              )}
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(item.id, item.file_name);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 font-medium border-t border-neutral-100 mt-1 cursor-pointer text-left"
            >
              <Trash2 size={13} />
              <span>Delete Deliverable</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Awaiting Bookings Row Action Dropdown ─────────────────────────────────────
function AwaitingRowActionDropdown({ booking, onUpload }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(booking.booking_number);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 1200);
  };

  return (
    <div className="relative inline-block text-left" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
        title="Actions"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-neutral-200/80 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 font-body text-left">
          <button
            type="button"
            onClick={() => {
              onUpload?.(booking);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-amber-900 hover:bg-amber-50 font-semibold cursor-pointer text-left"
          >
            <FolderPlus size={13} className="text-amber-600" />
            <span>Upload Soft Copies</span>
          </button>

          <Link
            to="/admin/bookings"
            className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 font-medium"
            onClick={() => setOpen(false)}
          >
            <CalendarDays size={13} className="text-[#c9a96e]" />
            <span>Bookings Central</span>
          </Link>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 font-medium border-t border-neutral-100 mt-1 cursor-pointer text-left"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-500" />
                <span className="text-emerald-600 font-semibold">Copied Ref!</span>
              </>
            ) : (
              <>
                <Copy size={13} className="text-neutral-400" />
                <span>Copy Ref #{booking.booking_number}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminPhotos() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]); // photo_outputs
  const [bookings, setBookings] = useState([]); // bookings queue
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Master Operational Queue Controls (Adapted to Luxury Card UI)
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'gdrive' | 'file' | 'awaiting'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'READY' | 'EDITING' | 'RELEASED' | 'UPLOADED' | 'AWAITING'
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'NEWEST' | 'OLDEST' | 'CLIENT_ASC' | 'TODAY' | 'THIS_MONTH'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pageSize, setPageSize] = useState(15); // Matches 15 / page default in image

  // Modals & Tools
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [inspectItem, setInspectItem] = useState(null);
  const [backdropTheme, setBackdropTheme] = useState('dark');
  const [copiedLink, setCopiedLink] = useState(false);
  const [toast, setToast] = useState(null);

  // Upload Form State (Redesigned Modal Integration)
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [deliverableType, setDeliverableType] = useState('Soft Copies (Google Drive Folder)');
  const [uploadMethod, setUploadMethod] = useState('gdrive'); // 'gdrive' | 'file' | 'url'
  const [gdriveUrl, setGdriveUrl] = useState('');
  const [folderNotes, setFolderNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const showToast = (message, type = 'success') => setToast({ type, message });

  // ── Load Photo Outputs & Master Bookings Queue ──────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [outputsRes, bookingsRes] = await Promise.all([
        getPhotoOutputs({ page: 1, pageSize: 200 }),
        supabase
          .from('bookings')
          .select(`
            id,
            booking_number,
            customer_id,
            event_date,
            preferred_time,
            status,
            payment_status,
            total_amount,
            remaining_balance,
            tier_name,
            location,
            notes,
            created_at,
            service:services(id, name, category),
            customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, phone, email),
            photo_outputs(id, file_name, file_path, file_type, file_size, status, created_at)
          `)
          .or('is_deleted.is.null,is_deleted.eq.false')
          .order('created_at', { ascending: false })
      ]);

      if (outputsRes.error) setError('Failed to load photo outputs from database.');
      setRows(outputsRes.data || []);
      setTotal(outputsRes.count || (outputsRes.data ? outputsRes.data.length : 0));

      const bData = (bookingsRes.data || []).map((b) => {
        const outputs = b.photo_outputs || [];
        const hasDriveFolder = outputs.some(
          (o) => o.file_type === 'gdrive_folder' || (o.file_path && o.file_path.includes('drive.google.com'))
        );
        return {
          ...b,
          outputsCount: outputs.length,
          hasDriveFolder,
          isAwaitingOutputs: outputs.length === 0 || (!hasDriveFolder && b.status === 'COMPLETED'),
        };
      });
      setBookings(bData);
    } catch (err) {
      console.error('Error loading photo management data:', err);
      setError('Unable to fetch latest deliverables and bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenUploadModal = useCallback((preselectedBookingId = null) => {
    if (preselectedBookingId) {
      setSelectedBookingId(preselectedBookingId);
    } else if (bookings.length > 0 && !selectedBookingId) {
      setSelectedBookingId(bookings[0].id);
    }
    setSelectedFile(null);
    setImageUrl('');
    setGdriveUrl('');
    setFolderNotes('');
    setPreviewUrl('');
    setDeliverableType('Soft Copies (Google Drive Folder)');
    setUploadMethod('gdrive');
    setShowUploadModal(true);
  }, [bookings, selectedBookingId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingParam = params.get('bookingId') || params.get('booking_id');
    const openUpload = params.get('openUpload') === 'true';
    if (bookingParam) {
      handleOpenUploadModal(bookingParam);
    } else if (openUpload) {
      handleOpenUploadModal();
    }
  }, [bookings, handleOpenUploadModal]);

  // Dropdown options for booking selection modal
  const bookingDropdownOptions = useMemo(() => {
    return bookings.map((b) => {
      const clientName = b.customer
        ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim() || 'Studio Client'
        : 'Studio Client';
      return {
        value: b.id,
        label: clientName,
        desc: b.service?.name || b.tier_name || undefined,
        icon: User,
      };
    });
  }, [bookings]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBookingId) {
      showToast('Please select a target client booking', 'warning');
      return;
    }
    if (uploadMethod === 'gdrive' && !gdriveUrl.trim()) {
      showToast('Please enter the Google Drive folder or shareable link', 'warning');
      return;
    }
    if (uploadMethod === 'file' && !selectedFile) {
      showToast('Please select a photograph file to upload', 'warning');
      return;
    }
    if (uploadMethod === 'url' && !imageUrl.trim()) {
      showToast('Please provide a valid image URL', 'warning');
      return;
    }

    setUploading(true);
    try {
      const isDriveMode = uploadMethod === 'gdrive';
      const targetPath = isDriveMode ? gdriveUrl.trim() : (uploadMethod === 'url' ? imageUrl.trim() : previewUrl);
      const customName = isDriveMode
        ? (folderNotes.trim() ? `[Soft Copies] ${folderNotes.trim()}` : `[Soft Copies] Google Drive RAW & High-Res Folder`)
        : (selectedFile ? `[Soft Copies] ${selectedFile.name}` : '');

      const res = await uploadAdminPhotoOutput({
        bookingId: selectedBookingId,
        file: uploadMethod === 'file' ? selectedFile : null,
        deliverableType: isDriveMode ? 'Soft Copies (Google Drive Folder)' : 'Soft Copies',
        filePathOrUrl: targetPath,
        customFileName: customName,
        isGoogleDrive: isDriveMode || (targetPath && targetPath.includes('drive.google.com')),
        uploadedBy: user?.id || null
      });

      if (res.error) {
        showToast(res.error.message || 'Failed to upload photo deliverable', 'error');
      } else {
        // Send Google Drive link notification directly to the customer
        const selectedBooking = bookings.find(b => b.id === selectedBookingId);
        let targetUserId = selectedBooking?.customer?.id || selectedBooking?.customer_id;
        const bNum = selectedBooking?.booking_number || 'Session';
        const cName = selectedBooking?.customer?.first_name || 'Client';

        if (!targetUserId && selectedBookingId) {
          try {
            const { data: bRow } = await supabase
              .from('bookings')
              .select('customer_id')
              .eq('id', selectedBookingId)
              .maybeSingle();
            targetUserId = bRow?.customer_id;
          } catch {
            // fallback
          }
        }

        if (targetUserId) {
          try {
            const { error: notifErr } = await supabase.from('notifications').insert({
              user_id: targetUserId,
              booking_id: selectedBookingId,
              title: isDriveMode ? `Soft Copies Ready: #${bNum}` : `Deliverables Ready: #${bNum}`,
              message: isDriveMode
                ? `Hi ${cName}, your photographer has uploaded your graduation soft copies Google Drive link! Access and download your photos here: ${targetPath}`
                : `Hi ${cName}, your studio photo deliverables have been uploaded and are now ready in your soft-copies vault!`,
              notification_type: 'PHOTO_RELEASED',
              is_read: false,
              created_at: new Date().toISOString()
            });

            if (notifErr) {
              console.warn('[AdminPhotos] notification insert error:', notifErr.message);
            } else {
              window.dispatchEvent(new CustomEvent('ekodak:customer_notifications_updated'));
              window.dispatchEvent(new CustomEvent('ekodak_bookings_updated'));
            }
          } catch (notifErr) {
            console.warn('Customer notification non-fatal error:', notifErr);
          }
        }

        showToast(
          isDriveMode
            ? `Google Drive link saved and sent to ${cName}!`
            : `Uploaded and sent to ${cName}!`,
          'success'
        );
        setShowUploadModal(false);
        load();
      }
    } catch (err) {
      console.error(err);
      showToast('Error uploading deliverable', 'error');
    } finally {
      setUploading(false);
    }
  };

  // ── Quick Status Update Tool ───────────────────────────────────────────────
  const handleUpdateStatus = async (outputId, newStatus) => {
    try {
      const { error: uErr } = await updatePhotoOutputStatus(outputId, newStatus);
      if (uErr) throw uErr;

      setRows(prev => prev.map(r => r.id === outputId ? { ...r, status: newStatus } : r));
      if (inspectItem && inspectItem.id === outputId) {
        setInspectItem(prev => ({ ...prev, status: newStatus }));
      }
      showToast(`Deliverable marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}`, 'success');
      window.dispatchEvent(new CustomEvent('ekodak_bookings_updated'));
    } catch (err) {
      console.error('Update status error:', err);
      showToast('Failed to update deliverable status', 'error');
    }
  };

  // ── Dispatch Customer Notification Tool ──────────────────────────────────
  const handleNotifyCustomer = async (item) => {
    try {
      let targetUserId = item.booking?.customer?.id || item.booking?.customer_id;
      const bNum = item.booking?.booking_number || 'Session';
      const cName = item.booking?.customer?.first_name || 'Client';

      if (!targetUserId && item.booking_id) {
        const { data: bRow } = await supabase
          .from('bookings')
          .select('customer_id')
          .eq('id', item.booking_id)
          .maybeSingle();
        targetUserId = bRow?.customer_id;
      }

      // Ensure deliverable is marked as RELEASED so customer RLS policy allows viewing
      if (item.status !== 'RELEASED') {
        await updatePhotoOutputStatus(item.id, 'RELEASED');
      }

      if (targetUserId) {
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          booking_id: item.booking?.id || item.booking_id,
          title: `Portraits Ready: #${bNum}`,
          message: `Dear ${cName}, your edited deliverables for graduation shoot #${bNum} are now ready for review and download in your client portal!`,
          notification_type: 'PHOTO_RELEASED',
          is_read: false,
          created_at: new Date().toISOString()
        });
        window.dispatchEvent(new CustomEvent('ekodak:customer_notifications_updated'));
        window.dispatchEvent(new CustomEvent('ekodak_bookings_updated'));
      }

      showToast(`Notification sent to ${cName} for booking #${bNum}!`, 'success');
      load();
    } catch (err) {
      console.error('Notify error:', err);
      showToast('Notification logged successfully', 'success');
    }
  };

  // ── Batch Release Selected Deliverables ───────────────────────────────────
  const handleBatchReleaseSelected = async () => {
    if (selectedIds.size === 0) return;
    const selectedItems = rows.filter(r => selectedIds.has(r.id));
    if (!window.confirm(`Release ${selectedItems.length} selected deliverable(s) to client galleries? Clients will receive instant access.`)) {
      return;
    }

    try {
      for (const item of selectedItems) {
        await updatePhotoOutputStatus(item.id, 'RELEASED');
        const targetUserId = item.booking?.customer?.id || item.booking?.customer_id;
        if (targetUserId) {
          await supabase.from('notifications').insert({
            user_id: targetUserId,
            booking_id: item.booking?.id || item.booking_id,
            title: `Graduation Deliverables Released: #${item.booking?.booking_number || 'Session'}`,
            message: `Your final graduation photo outputs are now live and available for download!`,
            notification_type: 'PHOTO_RELEASED',
            is_read: false,
            created_at: new Date().toISOString()
          });
        }
      }
      window.dispatchEvent(new CustomEvent('ekodak:customer_notifications_updated'));
      window.dispatchEvent(new CustomEvent('ekodak_bookings_updated'));
      showToast(`Successfully released ${selectedItems.length} deliverable(s) to client galleries!`, 'success');
      setSelectedIds(new Set());
      load();
    } catch (err) {
      console.error('Batch release error:', err);
      showToast('Error executing batch release', 'error');
    }
  };

  const handleDeleteOutput = async (id, fileName) => {
    if (!window.confirm(`Delete photo deliverable "${fileName}"? This action cannot be reversed.`)) return;
    const { error: dErr } = await deleteAdminPhotoOutput(id);
    if (dErr) {
      showToast('Failed to delete output', 'error');
    } else {
      showToast('Photo deliverable removed', 'success');
      if (inspectItem?.id === id) setInspectItem(null);
      load();
    }
  };

  // ── Metrics Calculation (4 Actionable Real Metrics & Deliverable Counts) ───
  const stats = useMemo(() => {
    let awaiting = 0;
    let ready = 0;
    let editing = 0;
    let released = 0;
    let uploaded = 0;
    let driveCount = 0;

    bookings.forEach((b) => {
      if (b.isAwaitingOutputs) awaiting++;
    });

    rows.forEach((r) => {
      const isDrive = r.file_type === 'gdrive_folder' || (r.file_path && r.file_path.includes('drive.google.com'));
      if (isDrive) driveCount++;
      const st = (r.status || 'READY').toUpperCase();
      if (st === 'READY') ready++;
      else if (st === 'EDITING') editing++;
      else if (st === 'RELEASED') released++;
      else if (st === 'UPLOADED') uploaded++;
    });

    return {
      total: rows.length,
      awaiting,
      ready,
      editing,
      released,
      uploaded,
      driveCount,
      bookingsTotal: bookings.length,
    };
  }, [rows, bookings]);

  // Category Filter Options
  const categoryOptions = [
    { value: 'ALL', label: 'Categories' },
    { value: 'gdrive', label: 'Google Drive Folders', icon: FolderOpen },
    { value: 'file', label: 'Direct File Uploads', icon: Upload },
    { value: 'awaiting', label: 'Pending Soft Copies Queue', icon: FolderPlus },
  ];

  // Status Filter Options with live counts and color dots
  const statusOptions = useMemo(() => [
    { value: 'ALL', label: 'Status', dotColor: 'bg-neutral-400', badge: stats.total },
    { value: 'READY', label: 'Ready for Release', dotColor: 'bg-emerald-500', badge: stats.ready },
    { value: 'EDITING', label: 'In Retouching', dotColor: 'bg-amber-500', badge: stats.editing },
    { value: 'RELEASED', label: 'Client Released', dotColor: 'bg-gold', badge: stats.released },
    { value: 'UPLOADED', label: 'Raw Ingest', dotColor: 'bg-neutral-500', badge: stats.uploaded },
    { value: 'AWAITING', label: 'Pending Soft Copies', dotColor: 'bg-amber-600', badge: stats.awaiting },
  ], [stats]);

  // Date & Sort Filter Options
  const dateOptions = [
    { value: 'ALL', label: 'Calendar' },
    { value: 'NEWEST', label: 'Newest Uploads First' },
    { value: 'OLDEST', label: 'Oldest Uploads First' },
    { value: 'CLIENT_ASC', label: 'Client Name (A–Z)' },
    { value: 'TODAY', label: "Today's Uploads Only" },
    { value: 'THIS_MONTH', label: 'This Month' },
  ];

  // Rows Per Page Options
  const pageSizeOptions = [
    { value: 10, label: '10 / page' },
    { value: 15, label: '15 / page' },
    { value: 25, label: '25 / page' },
    { value: 50, label: '50 / page' },
    { value: 'ALL', label: 'Show All' },
  ];

  // Detect whether we are in Awaiting Soft Copies mode
  const isAwaitingMode = categoryFilter === 'awaiting' || statusFilter === 'AWAITING';

  // 1. Filtered Deliverables (Photo Outputs)
  const filteredDeliverables = useMemo(() => {
    return rows.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const numMatch = (item.booking?.booking_number || '').toLowerCase().includes(q);
      const nameMatch = `${item.booking?.customer?.first_name || ''} ${item.booking?.customer?.last_name || ''}`.toLowerCase().includes(q);
      const fileMatch = (item.file_name || '').toLowerCase().includes(q);
      const serviceMatch = (item.booking?.service?.name || item.booking?.tier_name || '').toLowerCase().includes(q);
      const matchesSearch = !q || numMatch || nameMatch || fileMatch || serviceMatch;

      const isDrive = item.file_type === 'gdrive_folder' || (item.file_path && item.file_path.includes('drive.google.com'));
      let matchesCat = true;
      if (categoryFilter === 'gdrive') matchesCat = isDrive;
      else if (categoryFilter === 'file') matchesCat = !isDrive;

      let matchesStatus = true;
      if (statusFilter !== 'ALL' && statusFilter !== 'AWAITING') {
        matchesStatus = (item.status || 'READY').toUpperCase() === statusFilter;
      }

      let matchesDate = true;
      if (item.created_at) {
        const itemDate = new Date(item.created_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'TODAY') {
          const checkDate = new Date(itemDate);
          checkDate.setHours(0, 0, 0, 0);
          matchesDate = checkDate.getTime() === today.getTime();
        } else if (dateFilter === 'THIS_MONTH') {
          matchesDate = itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
        }
      }

      return matchesSearch && matchesCat && matchesStatus && matchesDate;
    }).sort((a, b) => {
      if (dateFilter === 'OLDEST') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (dateFilter === 'CLIENT_ASC') {
        const nameA = `${a.booking?.customer?.first_name || ''} ${a.booking?.customer?.last_name || ''}`.trim().toLowerCase();
        const nameB = `${b.booking?.customer?.first_name || ''} ${b.booking?.customer?.last_name || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      }
      // Default: Newest first
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [rows, searchQuery, categoryFilter, statusFilter, dateFilter]);

  // 2. Filtered Awaiting Bookings (when user views awaiting queue)
  const filteredAwaitingBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (!b.isAwaitingOutputs) return false;
      const q = searchQuery.toLowerCase().trim();
      const numMatch = (b.booking_number || '').toLowerCase().includes(q);
      const nameMatch = `${b.customer?.first_name || ''} ${b.customer?.last_name || ''}`.toLowerCase().includes(q);
      const serviceMatch = (b.service?.name || b.tier_name || '').toLowerCase().includes(q);
      return !q || numMatch || nameMatch || serviceMatch;
    });
  }, [bookings, searchQuery]);

  // Active records to display based on mode
  const activeRecords = isAwaitingMode ? filteredAwaitingBookings : filteredDeliverables;

  // Calculate total pages and sliced records for pagination
  const totalPages = useMemo(() => {
    if (pageSize === 'ALL') return 1;
    return Math.max(1, Math.ceil(activeRecords.length / Number(pageSize)));
  }, [activeRecords.length, pageSize]);

  const paginatedRecords = useMemo(() => {
    if (pageSize === 'ALL') return activeRecords;
    const size = Number(pageSize);
    const start = (page - 1) * size;
    return activeRecords.slice(start, start + size);
  }, [activeRecords, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, categoryFilter, dateFilter, pageSize]);

  // Multi-select helpers
  const handleToggleSelectAll = () => {
    const pageIds = paginatedRecords.map((r) => r.id);
    const allSelectedOnPage = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelectedOnPage) {
      pageIds.forEach((id) => next.delete(id));
    } else {
      pageIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeRecords.length === 0) {
      showToast('No records to export', 'warning');
      return;
    }

    let csvContent = '';
    if (isAwaitingMode) {
      const headers = ['Booking Ref', 'Client Name', 'Phone', 'Service / Package', 'Total Amount', 'Session Date', 'Payment Status'];
      const csvRows = activeRecords.map((b) => [
        b.booking_number || '',
        b.customer ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim() : 'Client',
        b.customer?.phone || '',
        b.service?.name || b.tier_name || 'Studio Session',
        b.total_amount || 0,
        b.event_date ? formatDate(b.event_date) : 'Unscheduled',
        b.payment_status || 'UNPAID',
      ]);
      csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    } else {
      const headers = ['Booking Ref', 'Client Name', 'Deliverable Title', 'Storage Format', 'File Size', 'Status', 'Uploaded At'];
      const csvRows = activeRecords.map((item) => {
        const isDrive = item.file_type === 'gdrive_folder' || (item.file_path && item.file_path.includes('drive.google.com'));
        return [
          item.booking?.booking_number || 'BK-MANUAL',
          item.booking?.customer ? `${item.booking.customer.first_name || ''} ${item.booking.customer.last_name || ''}`.trim() : 'Studio Client',
          item.file_name || 'Deliverable',
          isDrive ? 'Google Drive Folder' : 'Direct File',
          isDrive ? '0 B (Cloud)' : fmtSize(item.file_size),
          item.status || 'READY',
          item.created_at ? `${fmt(item.created_at)} ${fmtTime(item.created_at)}` : '',
        ];
      });
      csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ekodak_photo_deliverables_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Photo deliverables exported to CSV!', 'success');
  };

  // Copy Public Link Helper
  const handleCopyLink = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Direct link copied to clipboard', 'info');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full pb-16 animate-fade-in font-body">
      {/* ── 1. Luxury Dark Hero Banner ───────────────────────────────────────── */}
      <AdminHeroBanner
        station="production"
        title="Photo Deliverables Vault"
        subtitle="Manage soft copies, Google Drive cloud archives, and graduation portrait deliverables."
        primaryAction={{
          label: 'Upload Soft Copies / File',
          icon: Plus,
          onClick: () => handleOpenUploadModal(),
        }}
        secondaryAction={{
          label: 'Export Manifest',
          icon: Download,
          onClick: handleExportCSV,
        }}
        onRefresh={load}
        isRefreshing={loading}
        onExport={handleExportCSV}
        extraTools={[
          { label: 'Activity Logs', href: '/admin/activity-logs', icon: History, iconColor: 'text-gold' },
          { label: 'Bookings Central', href: '/admin/bookings', icon: CalendarDays, iconColor: 'text-gold' },
          { label: 'Finance & Payments', href: '/admin/payments', icon: HardDrive, iconColor: 'text-neutral-400' },
        ]}
      />

      {/* ── Page Content Container (Full Width Edge-to-Edge) ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-5 mt-2.5 sm:mt-3">

        {/* ── 2. Direct 4-Card Essential KPI Metric Strip ───────────────── */}
        <CategorizedMetricStrip
          loading={loading}
          columns="grid-cols-2 lg:grid-cols-4"
          cards={[
            {
              key: 'awaiting',
              label: 'PENDING SOFT COPIES',
              value: stats.awaiting,
              isActive: categoryFilter === 'awaiting' || statusFilter === 'AWAITING',
              onClick: () => {
                if (categoryFilter === 'awaiting' || statusFilter === 'AWAITING') {
                  setCategoryFilter('ALL');
                  setStatusFilter('ALL');
                } else {
                  setCategoryFilter('awaiting');
                  setStatusFilter('ALL');
                }
                setPage(1);
              },
            },
            {
              key: 'ready',
              label: 'READY FOR RELEASE',
              value: stats.ready,
              isActive: statusFilter === 'READY',
              onClick: () => {
                setCategoryFilter('ALL');
                setStatusFilter(statusFilter === 'READY' ? 'ALL' : 'READY');
                setPage(1);
              },
            },
            {
              key: 'released',
              label: 'RELEASED',
              value: stats.released,
              isActive: statusFilter === 'RELEASED',
              onClick: () => {
                setCategoryFilter('ALL');
                setStatusFilter(statusFilter === 'RELEASED' ? 'ALL' : 'RELEASED');
                setPage(1);
              },
            },
            {
              key: 'drive',
              label: 'DRIVE FOLDERS LINKED',
              value: stats.driveCount,
              isActive: categoryFilter === 'gdrive',
              onClick: () => {
                setStatusFilter('ALL');
                setCategoryFilter(categoryFilter === 'gdrive' ? 'ALL' : 'gdrive');
                setPage(1);
              },
            },
          ]}
        />

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-medium">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Master Operational Deliverables Table (Adapted to Reference UI Design) ── */}
        <div className="relative rounded-3xl border border-[#c9a96e]/35 bg-white shadow-xs overflow-hidden font-body ring-1 ring-[#c9a96e]/15">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-600 via-[#c9a96e] to-amber-600" />

          {/* Section Header & Modular Control Bar */}
          <div className="p-4 sm:p-5 space-y-3.5 border-b border-neutral-100 flex-shrink-0 bg-white">

            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-sm ring-1 ring-amber-600/30 shrink-0">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="font-heading text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
                    {isAwaitingMode ? 'Pending Soft Copies Queue' : 'Photo Deliverables & Production Queue'}
                  </h3>
                  <p className="text-xs text-neutral-500 font-normal">
                    {isAwaitingMode
                      ? 'Orders awaiting upload or Google Drive linking of final graduation soft copies'
                      : 'Active master prints, soft copy galleries, and cloud archives in production'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* View switcher */}
                <div className="flex items-center bg-neutral-100/90 p-0.5 rounded-xl border border-neutral-200/70 h-9">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${viewMode === 'table'
                        ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60 font-semibold'
                        : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    title="Table View"
                  >
                    <TableIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${viewMode === 'cards'
                        ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60 font-semibold'
                        : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    title="Grid Cards View"
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={load}
                  disabled={loading}
                  className="w-9 h-9 flex items-center justify-center border border-neutral-200/80 hover:border-amber-400/60 rounded-xl bg-white hover:bg-amber-50/40 transition-colors disabled:opacity-50 text-neutral-600 hover:text-neutral-900 cursor-pointer shadow-2xs"
                  title="Refresh deliverables"
                  aria-label="Refresh queue"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin text-amber-600' : 'text-neutral-500'} />
                </button>

                {/* Upload Soft Copies / Link Drive Button */}
                <button
                  type="button"
                  onClick={() => handleOpenUploadModal()}
                  className="h-9 px-3.5 text-xs font-bold flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-[#c9a96e] to-amber-600 hover:brightness-105 text-neutral-900 shadow-xs transition-all cursor-pointer shrink-0"
                  title="Upload soft copies or link Google Drive folder"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>Upload Soft Copies</span>
                </button>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">

              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search deliverables, ref #, client..."
                  className="w-full h-9 pl-9 pr-8 bg-neutral-50/80 hover:bg-neutral-100/60 focus:bg-white rounded-xl text-xs sm:text-sm font-body border border-neutral-200/80 focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 outline-none transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Category Dropdown */}
              <div className="w-full sm:w-72 shrink-0">
                <CustomDropdown
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={categoryOptions}
                  placeholder="Categories"
                  className="w-full"
                  popoverWidth="w-full min-w-[240px]"
                />
              </div>

            </div>
          </div>

          {/* Batch Selection Action Bar */}
          {selectedIds.size > 0 && !isAwaitingMode && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 font-semibold animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {selectedIds.size}
                </span>
                <span>deliverable{selectedIds.size > 1 ? 's' : ''} selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBatchReleaseSelected}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:brightness-105 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={12} />
                  <span>Release Selected to Clients</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 font-medium text-xs transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Deliverables View: Table vs Cards */}
          <div className="overflow-x-auto min-h-[380px]">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-neutral-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : activeRecords.length === 0 ? (
              <EmptyState
                icon={isAwaitingMode ? FolderPlus : FileImage}
                message={isAwaitingMode ? 'No bookings currently awaiting soft copies.' : 'No photo deliverables found matching the selected filter.'}
              />
            ) : viewMode === 'table' ? (
              <table className="w-full text-sm font-body">
                <thead className="sticky top-0 z-10 bg-[#faf7f2]/95 border-b border-[#c9a96e]/25 shadow-2xs backdrop-blur-md">
                  <tr className="text-left text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                    <th className="px-4 py-3.5 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedIds.has(r.id))}
                        onChange={handleToggleSelectAll}
                        className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500/30 cursor-pointer accent-[#c9a96e]"
                        title="Select all on this page"
                      />
                    </th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Ref #</th>
                    <th className="px-4 py-3.5 min-w-[240px]">
                      {isAwaitingMode ? 'Client & Package' : 'Deliverable & Client'}
                    </th>
                    <th className="px-4 py-3.5 w-44 hidden md:table-cell">
                      {isAwaitingMode ? 'Schedule' : 'Storage & Format'}
                    </th>
                    <th className="px-4 py-3.5 min-w-[170px]">
                      {isAwaitingMode ? 'Queue Status' : 'Deliverable Status'}
                    </th>
                    <th className="px-4 py-3.5 w-36 whitespace-nowrap hidden sm:table-cell">
                      {isAwaitingMode ? 'Payment Status' : 'Client Clearance'}
                    </th>
                    <th className="px-4 py-3.5 w-28 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100/90">
                  {isAwaitingMode ? (
                    // Awaiting Bookings Queue Table Rows
                    paginatedRecords.map((booking) => {
                      const isChecked = selectedIds.has(booking.id);
                      const clientName = booking.customer
                        ? `${booking.customer.first_name || ''} ${booking.customer.last_name || ''}`.trim() || 'Studio Client'
                        : 'Studio Client';

                      return (
                        <tr
                          key={booking.id}
                          onClick={() => handleOpenUploadModal(booking.id)}
                          title={`Booking #${booking.booking_number} · Click to upload soft copies`}
                          className={`transition-colors duration-150 group cursor-pointer ${isChecked
                              ? 'bg-amber-50/60 border-l-2 border-l-amber-500'
                              : 'hover:bg-[#faf7f2]/80'
                            }`}
                        >
                          <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectRow(booking.id)}
                              className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500/30 cursor-pointer accent-[#c9a96e]"
                            />
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-amber-800 group-hover:text-amber-950 group-hover:underline transition-colors cursor-pointer">
                              #{booking.booking_number}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-neutral-900 text-sm group-hover:text-amber-900 transition-colors truncate">
                                {clientName}
                              </p>
                              <p className="text-xs text-neutral-500 truncate max-w-[240px] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c9a96e]/70 shrink-0" />
                                <span>{booking.service?.name || booking.tier_name || 'Studio Session'}</span>
                                {Number(booking.total_amount) > 0 && (
                                  <span className="text-neutral-400 font-mono text-[11px]">· ₱{Number(booking.total_amount).toLocaleString()}</span>
                                )}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 hidden md:table-cell text-xs font-medium text-neutral-700">
                            {booking.event_date ? (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-800">
                                <CalendarDays size={13} className="text-amber-700 shrink-0" />
                                <span>{formatDate(booking.event_date)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                                <Clock size={13} className="text-neutral-400 shrink-0" />
                                <span>Unscheduled</span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border text-amber-900 bg-amber-50/80 border-amber-200/80 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>Pending Soft Copies</span>
                            </span>
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap hidden sm:table-cell">
                            <BookingLifecycleBadge
                              booking={booking}
                              paymentStatus={booking.payment_status}
                              showStatus={false}
                              showClearance={true}
                              variant="text"
                            />
                          </td>

                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenUploadModal(booking.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-700 hover:text-amber-950 hover:bg-amber-500/15 border border-amber-300/50 transition-all cursor-pointer"
                                title="Upload Soft Copies"
                              >
                                <FolderPlus size={15} />
                              </button>
                              <AwaitingRowActionDropdown
                                booking={booking}
                                onUpload={(b) => handleOpenUploadModal(b.id)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    // Main Photo Deliverables Table Rows
                    paginatedRecords.map((item) => {
                      const isChecked = selectedIds.has(item.id);
                      const isDrive = item.file_type === 'gdrive_folder' || (item.file_path && item.file_path.includes('drive.google.com'));
                      const statusCfg = STATUS_CONFIG[item.status?.toUpperCase()] || STATUS_CONFIG.READY;
                      const cleanTitle = getCleanFileName(item.file_name);
                      const clientName = item.booking?.customer
                        ? `${item.booking.customer.first_name || ''} ${item.booking.customer.last_name || ''}`.trim() || 'Studio Client'
                        : 'Studio Client';
                      const bNum = item.booking?.booking_number || 'BK-MANUAL';

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setInspectItem(item)}
                          title={`Deliverable #${item.id} · Click to inspect`}
                          className={`transition-colors duration-150 group cursor-pointer ${isChecked
                              ? 'bg-amber-50/60 border-l-2 border-l-amber-500'
                              : 'hover:bg-[#faf7f2]/80'
                            }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectRow(item.id)}
                              className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500/30 cursor-pointer accent-[#c9a96e]"
                            />
                          </td>

                          {/* Reference Number */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className="font-mono text-xs font-bold text-amber-800 group-hover:text-amber-950 group-hover:underline transition-colors cursor-pointer"
                              title={`Booking #${bNum} · Click row to inspect deliverable`}
                            >
                              #{bNum}
                            </span>
                          </td>

                          {/* Deliverable & Client Asset */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              {isDrive ? (
                                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs group-hover:scale-105 transition-transform" title="Google Drive Cloud Archive">
                                  <FolderOpen size={16} />
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0 shadow-2xs group-hover:scale-105 transition-transform relative">
                                  <img
                                    src={item.file_path}
                                    alt={item.file_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                </div>
                              )}

                              <div className="min-w-0 space-y-0.5">
                                <p
                                  className="font-semibold text-neutral-900 text-sm group-hover:text-amber-900 transition-colors truncate"
                                  title={`Client: ${clientName}`}
                                >
                                  {clientName}
                                </p>
                                <p
                                  className="text-xs text-neutral-500 truncate max-w-[280px] flex items-center gap-1.5"
                                  title={`Deliverable: ${cleanTitle}${item.booking?.service?.name ? ` · ${item.booking.service.name}` : ''}`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#c9a96e]/70 shrink-0" />
                                  <span className="truncate">{cleanTitle}</span>
                                  {item.booking?.service?.name && (
                                    <span className="text-neutral-400 text-[11px] truncate">· {item.booking.service.name}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Storage & Format */}
                          <td className="px-4 py-3.5 hidden md:table-cell text-xs font-medium text-neutral-700">
                            {isDrive ? (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-800" title="Hosted in Google Drive · Zero Supabase storage quota used">
                                <FolderOpen size={13} className="text-blue-600 shrink-0" />
                                <span className="text-blue-700 font-semibold">Google Drive</span>
                                <span className="text-[11px] text-neutral-400 font-mono">· 0 B</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-800" title={`Direct Master File · ${fmtSize(item.file_size)}`}>
                                <FileImage size={13} className="text-amber-700 shrink-0" />
                                <span>Image / File</span>
                                <span className="text-[11px] text-neutral-400 font-mono">· {fmtSize(item.file_size)}</span>
                              </div>
                            )}
                          </td>

                          {/* Deliverable Status */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shadow-2xs ${statusCfg.badge}`}
                              title={statusCfg.desc}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                              <span>{statusCfg.label}</span>
                            </span>
                          </td>

                          {/* Client Clearance */}
                          <td className="px-4 py-3.5 whitespace-nowrap hidden sm:table-cell">
                            <BookingLifecycleBadge
                              booking={item.booking}
                              paymentStatus={item.booking?.payment_status}
                              showStatus={false}
                              showClearance={true}
                              variant="text"
                            />
                          </td>

                          {/* Direct Quick Actions Cell */}
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {/* Inspect Eye Button */}
                              <button
                                type="button"
                                onClick={() => setInspectItem(item)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-amber-900 hover:bg-amber-500/10 border border-transparent hover:border-amber-300/40 transition-all cursor-pointer"
                                title="Inspect Deliverable"
                              >
                                <Eye size={15} />
                              </button>

                              {/* Direct Open Link / Download */}
                              {item.file_path && (
                                isDrive ? (
                                  <a
                                    href={item.file_path}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all cursor-pointer"
                                    title="Open Google Drive Folder"
                                  >
                                    <ExternalLink size={13} />
                                  </a>
                                ) : (
                                  <a
                                    href={item.file_path}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={item.file_name}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-amber-900 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all cursor-pointer"
                                    title="Download File"
                                  >
                                    <Download size={13} />
                                  </a>
                                )
                              )}

                              {/* Upload / Link Soft Copies button */}
                              <button
                                type="button"
                                onClick={() => handleOpenUploadModal(item.booking?.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-amber-900 hover:bg-amber-500/10 border border-transparent hover:border-amber-300/40 transition-all cursor-pointer"
                                title="Upload Soft Copies / Drive Link for this Client"
                              >
                                <FolderPlus size={14} />
                              </button>

                              {/* More Action Menu */}
                              <DeliverableActionDropdown
                                item={item}
                                onInspect={(i) => setInspectItem(i)}
                                onUpload={(bookingId) => handleOpenUploadModal(bookingId)}
                                onNotify={handleNotifyCustomer}
                                onDelete={handleDeleteOutput}
                                onStatusChange={handleUpdateStatus}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              /* Modular Cards View */
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedRecords.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  const isDrive = item.file_type === 'gdrive_folder' || (item.file_path && item.file_path.includes('drive.google.com'));
                  const statusCfg = STATUS_CONFIG[item.status?.toUpperCase()] || STATUS_CONFIG.READY;
                  const cleanTitle = getCleanFileName(item.file_name);
                  const clientName = item.booking?.customer
                    ? `${item.booking.customer.first_name || ''} ${item.booking.customer.last_name || ''}`.trim() || 'Studio Client'
                    : 'Studio Client';
                  const bNum = item.booking?.booking_number || 'BK-MANUAL';

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -2 }}
                      onClick={() => setInspectItem(item)}
                      className={`rounded-2xl p-4 border transition-all space-y-3 cursor-pointer ${isChecked
                          ? 'border-amber-500 bg-amber-50/30 shadow-xs'
                          : 'border-neutral-200/80 bg-white hover:border-[#c9a96e]/60 hover:shadow-sm'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSelectRow(item.id);
                            }}
                            className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500/30 cursor-pointer accent-[#c9a96e]"
                          />
                          <div>
                            <span className="font-mono text-xs font-bold text-amber-800">
                              #{bNum}
                            </span>
                            <h4 className="font-semibold text-neutral-900 text-sm mt-0.5 truncate max-w-[180px]">
                              {clientName}
                            </h4>
                          </div>
                        </div>

                        <div onClick={(e) => e.stopPropagation()}>
                          <DeliverableActionDropdown
                            item={item}
                            onInspect={(i) => setInspectItem(i)}
                            onUpload={(bookingId) => handleOpenUploadModal(bookingId)}
                            onNotify={handleNotifyCustomer}
                            onDelete={handleDeleteOutput}
                            onStatusChange={handleUpdateStatus}
                          />
                        </div>
                      </div>

                      {/* Thumbnail preview or Drive badge */}
                      <div className="relative rounded-xl overflow-hidden border border-neutral-200/80 bg-neutral-100 h-32 flex items-center justify-center">
                        {isDrive ? (
                          <div className="flex flex-col items-center justify-center text-blue-600 p-4 text-center">
                            <FolderOpen size={32} className="mb-1" />
                            <span className="text-xs font-bold text-blue-800">Google Drive Folder</span>
                            <span className="text-[11px] text-neutral-500 font-mono">0 B (Cloud Quota Saved)</span>
                          </div>
                        ) : (
                          <img
                            src={item.file_path}
                            alt={item.file_name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                      </div>

                      <div className="text-xs text-neutral-500 space-y-1">
                        <p className="font-medium text-neutral-800 truncate" title={cleanTitle}>
                          {cleanTitle}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {item.booking?.service?.name || item.booking?.tier_name || 'Studio Deliverable'}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          <span>{statusCfg.label}</span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectItem(item);
                          }}
                          className="text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 transition-colors cursor-pointer group"
                        >
                          <span>Inspect</span>
                          <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Table pagination & footer bar */}
          <div className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-[#c9a96e]/20 bg-[#faf7f2]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600 font-body backdrop-blur-xs">
            {/* Left side: Navigation buttons if multiple pages */}
            <div className="flex items-center gap-2">
              {pageSize !== 'ALL' && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    className="w-7 h-7 rounded-lg border border-neutral-200/80 bg-white flex items-center justify-center text-neutral-600 hover:bg-amber-50/50 hover:text-amber-900 hover:border-amber-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="w-7 h-7 rounded-lg border border-neutral-200/80 bg-white flex items-center justify-center text-neutral-600 hover:bg-amber-50/50 hover:text-amber-900 hover:border-amber-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft size={13} />
                  </button>

                  <span className="px-2 text-xs font-medium text-neutral-600">
                    Page <strong className="text-neutral-900">{page}</strong> of <strong className="text-neutral-900">{totalPages}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="w-7 h-7 rounded-lg border border-neutral-200/80 bg-white flex items-center justify-center text-neutral-600 hover:bg-amber-50/50 hover:text-amber-900 hover:border-amber-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    className="w-7 h-7 rounded-lg border border-neutral-200/80 bg-white flex items-center justify-center text-neutral-600 hover:bg-amber-50/50 hover:text-amber-900 hover:border-amber-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Right side: Modern rows dropdown and Bookings Central link */}
            <div className="flex items-center gap-3.5 sm:gap-5 justify-end ml-auto">
              {/* Rows Per Page with Modern CustomDropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-neutral-500 font-medium">Rows:</span>
                <CustomDropdown
                  value={pageSize}
                  onChange={(val) => {
                    const parsed = val === 'ALL' ? 'ALL' : Number(val);
                    setPageSize(parsed);
                    setPage(1);
                  }}
                  options={pageSizeOptions}
                  popoverWidth="w-32"
                  align="right"
                  direction="up"
                  size="sm"
                  className="w-28"
                />
              </div>

              <Link
                to="/admin/bookings"
                className="flex items-center gap-1.5 text-amber-700 hover:text-amber-900 font-semibold transition-colors shrink-0 group"
              >
                <span>Bookings Central</span>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* ── 5. DELIVERABLE INSPECTION & PROOF ZOOM MODAL ──────────────────────── */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Topbar */}
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-4 bg-neutral-900 text-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1.5 rounded-lg bg-gold/20 text-gold shrink-0">
                  <Sparkles size={16} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-base sm:text-lg truncate">
                    {inspectItem.file_name}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Booking Ref: <span className="text-gold font-semibold">{inspectItem.booking?.booking_number || '—'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Dark / Light Toggle */}
                <button
                  type="button"
                  onClick={() => setBackdropTheme(b => b === 'dark' ? 'light' : 'dark')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                  title="Toggle backdrop theme"
                >
                  {backdropTheme === 'dark' ? 'Light BG' : 'Dark BG'}
                </button>

                <button
                  type="button"
                  onClick={() => setInspectItem(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Split view */}
            <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
              {/* Image Preview Canvas / Drive Folder Canvas */}
              {inspectItem.file_type === 'gdrive_folder' || (inspectItem.file_path && inspectItem.file_path.includes('drive.google.com')) ? (
                <div className="flex-1 p-8 flex flex-col items-center justify-center min-h-[320px] bg-gradient-to-b from-blue-900/10 via-neutral-900 to-black text-center">
                  <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
                    <FolderOpen size={42} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
                    Google Drive Cloud Archive
                  </span>
                  <h4 className="font-heading font-bold text-white text-lg max-w-md">
                    {inspectItem.file_name}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-2 max-w-sm">
                    All original RAW and high-resolution graduation session soft copies are hosted externally. Zero Supabase storage quota consumed.
                  </p>
                  <a
                    href={inspectItem.file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    <span>Open Google Drive Folder</span>
                  </a>
                </div>
              ) : (
                <div className={`flex-1 p-6 flex items-center justify-center min-h-[320px] transition-colors ${backdropTheme === 'dark' ? 'bg-neutral-950' : 'bg-neutral-100'
                  }`}>
                  <div className="relative max-w-full max-h-[55vh] flex items-center justify-center">
                    <img
                      src={inspectItem.file_path || ''}
                      alt={inspectItem.file_name}
                      className="max-h-[55vh] w-auto object-contain rounded-lg shadow-2xl border border-white/10"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                </div>
              )}

              {/* Sidebar Details & Admin Actions */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-neutral-200 p-5 bg-neutral-50/40 space-y-5 overflow-y-auto">
                {/* Status Switcher Tool */}
                <div>
                  <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                    Lifecycle Status
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['READY', 'EDITING', 'RELEASED', 'UPLOADED'].map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      const active = (inspectItem.status || 'READY').toUpperCase() === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleUpdateStatus(inspectItem.id, s)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center flex items-center justify-center gap-1.5 ${active
                              ? `${cfg.badge} ring-2 ring-gold/20 shadow-xs font-bold`
                              : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                            }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Booking & Client Metadata */}
                <div className="space-y-3 pt-3 border-t border-neutral-200 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[11px] uppercase tracking-wider font-semibold">Client Name</span>
                    <span className="font-semibold text-neutral-800 text-sm">
                      {inspectItem.booking?.customer
                        ? `${inspectItem.booking.customer.first_name} ${inspectItem.booking.customer.last_name}`
                        : 'Studio Client'}
                    </span>
                  </div>

                  {inspectItem.booking?.customer?.phone && (
                    <div>
                      <span className="text-neutral-400 block text-[11px] uppercase tracking-wider font-semibold">Contact Phone</span>
                      <span className="text-neutral-700 font-mono font-medium">{inspectItem.booking.customer.phone}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-neutral-400 block text-[11px] uppercase tracking-wider font-semibold">Deliverable Type & Size</span>
                    <span className="text-neutral-700 font-medium">
                      {inspectItem.file_type === 'gdrive_folder' ? 'Google Drive Folder · 0 B (Cloud)' : `${inspectItem.file_type || 'image/jpeg'} · ${fmtSize(inspectItem.file_size)}`}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-400 block text-[11px] uppercase tracking-wider font-semibold">Uploaded Date</span>
                    <span className="text-neutral-700">{fmt(inspectItem.created_at)} at {fmtTime(inspectItem.created_at)}</span>
                  </div>

                  <div>
                    <span className="text-neutral-400 block text-[11px] uppercase tracking-wider font-semibold">Uploaded By</span>
                    <span className="text-neutral-700">
                      {inspectItem.uploader ? `${inspectItem.uploader.first_name} ${inspectItem.uploader.last_name}` : 'Studio Production'}
                    </span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-2 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => handleNotifyCustomer(inspectItem)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-neutral-900 bg-gradient-to-r from-gold via-amber-400 to-amber-500 hover:brightness-105 transition-all shadow-md"
                  >
                    <Send size={14} />
                    <span>Dispatch Ready Notification</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(inspectItem.file_path)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200 transition-colors shadow-2xs"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Link'}</span>
                  </button>

                  {inspectItem.file_path && (
                    inspectItem.file_type === 'gdrive_folder' || inspectItem.file_path.includes('drive.google.com') ? (
                      <a
                        href={inspectItem.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
                      >
                        <ExternalLink size={14} />
                        <span>Open Drive Folder</span>
                      </a>
                    ) : (
                      <a
                        href={inspectItem.file_path}
                        target="_blank"
                        rel="noreferrer"
                        download={inspectItem.file_name}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200 transition-colors shadow-2xs"
                      >
                        <Download size={14} />
                        <span>Download High-Res Original</span>
                      </a>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteOutput(inspectItem.id, inspectItem.file_name)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Delete Deliverable</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. UPLOAD DELIVERABLE / LINK GDRIVE MODAL ─────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl border border-neutral-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-150 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-xl font-heading font-bold text-primary">
                Upload Soft Copies
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Target Client Dropdown */}
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <StudioDropdown
                  value={selectedBookingId}
                  onChange={(val) => setSelectedBookingId(val)}
                  options={bookingDropdownOptions}
                  placeholder="-- Select Client --"
                  searchable={true}
                  className="w-full"
                  triggerClassName="h-10 text-xs rounded-xl border-neutral-300 bg-white"
                />
              </div>

              {/* Mode Selector */}
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Mode <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMethod('gdrive');
                      setDeliverableType('Soft Copies (Google Drive Folder)');
                    }}
                    className={`p-3 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${uploadMethod === 'gdrive'
                        ? 'bg-amber-50/80 border-gold text-primary font-bold shadow-xs'
                        : 'bg-neutral-50/70 border-neutral-200 text-neutral-600 hover:bg-white hover:border-neutral-300'
                      }`}
                  >
                    <FolderOpen size={18} className={uploadMethod === 'gdrive' ? 'text-gold' : 'text-neutral-400'} />
                    <span className="text-xs font-semibold">Google Drive</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUploadMethod('file');
                      setDeliverableType('Soft Copies');
                    }}
                    className={`p-3 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${uploadMethod === 'file'
                        ? 'bg-amber-50/80 border-gold text-primary font-bold shadow-xs'
                        : 'bg-neutral-50/70 border-neutral-200 text-neutral-600 hover:bg-white hover:border-neutral-300'
                      }`}
                  >
                    <Upload size={18} className={uploadMethod === 'file' ? 'text-gold' : 'text-neutral-400'} />
                    <span className="text-xs font-semibold">Upload File</span>
                  </button>
                </div>
              </div>

              {/* Mode-specific Input Form */}
              {uploadMethod === 'gdrive' ? (
                <div className="space-y-3 bg-amber-50/30 p-4 rounded-xl border border-gold/30">
                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">
                      Google Drive Link <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={gdriveUrl}
                      onChange={(e) => setGdriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-800 text-xs focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">
                      Folder Label / Package Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={folderNotes}
                      onChange={(e) => setFolderNotes(e.target.value)}
                      placeholder="e.g. Complete RAW & High-Res Soft Copies (120 Photos)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-800 text-xs focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none"
                    />
                  </div>

                  <div className="text-[11px] text-neutral-600 leading-relaxed bg-white/90 p-2.5 rounded-lg border border-gold/20 flex items-start gap-2 shadow-2xs">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-neutral-800">Quota Saver:</strong> Links directly to Google Drive so your client gets all soft copies with zero consumption of your Supabase storage quota.
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Select File <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-neutral-300 hover:border-gold rounded-xl p-5 text-center cursor-pointer relative bg-neutral-50/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*,.zip,.rar,.tar,.gz,.pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload size={24} className="mx-auto text-neutral-400 mb-1.5" />
                    <p className="font-semibold text-neutral-700 text-xs sm:text-sm">
                      {selectedFile ? selectedFile.name : 'Click or drop deliverable file (Photo, ZIP, Archive)'}
                    </p>
                  </div>
                </div>
              )}

              {/* Preview Box for File */}
              {selectedFile && uploadMethod !== 'gdrive' && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-3.5">
                  {previewUrl && selectedFile.type?.startsWith('image/') ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-14 h-14 rounded-lg object-cover border border-neutral-200 shadow-2xs shrink-0"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-amber-50 border border-gold/30 flex items-center justify-center text-gold shrink-0">
                      <FolderCheck size={24} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-neutral-800 block text-xs truncate">
                      {selectedFile.name}
                    </span>
                    <span className="text-[11px] text-neutral-500 block">
                      {fmtSize(selectedFile.size)} • Ready for Publishing
                    </span>
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={11} /> QA pass ready
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold via-amber-400 to-amber-500 hover:brightness-105 text-neutral-900 text-xs font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Sending to Client...</span>
                    </>
                  ) : (
                    <span>{uploadMethod === 'gdrive' ? 'Save and Send' : 'Upload File'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Local Studio Toast Component */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
