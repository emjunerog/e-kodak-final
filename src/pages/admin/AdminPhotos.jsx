import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { 
  ImageIcon, 
  RefreshCw, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
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
  SlidersHorizontal,
  Maximize2,
  CheckCheck,
  User,
  Phone,
  Camera,
  Layers2
} from 'lucide-react';
import { 
  getPhotoOutputs, 
  uploadAdminPhotoOutput, 
  deleteAdminPhotoOutput,
  updatePhotoOutputStatus 
} from '../../services/adminService';
import { extractSetName, getCleanFileName } from '../../services/photographerService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/ui/Toast';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CustomDropdown from '../../components/ui/CustomDropdown';

const PAGE_SIZE = 20;

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
  { id: '2x2 ID Photo', label: '2x2 Formal ID Photo', spec: 'PRC / Corporate ID Spec', ratio: '1:1', previewAspect: 'aspect-square' },
  { id: 'Passport Photo', label: 'Passport Size Photo', spec: '35x45mm Diplomatic Spec', ratio: '7:9', previewAspect: 'aspect-[7/9]' },
  { id: 'Framed Toga Master', label: 'Framed Toga Master', spec: '12x18 / 8x10 Graduation Toga', ratio: '2:3', previewAspect: 'aspect-[2/3]' },
  { id: 'Filipiniana / Barong', label: 'Filipiniana / Barong', spec: 'Heritage Formal Portrait', ratio: '4:5', previewAspect: 'aspect-[4/5]' },
  { id: 'Creative Milestone', label: 'Creative Milestone', spec: 'Cap & Gown Modern Poses', ratio: '4:5', previewAspect: 'aspect-[4/5]' },
  { id: 'Wallet Size Prints', label: 'Wallet Size Prints', spec: '2R Keepsake Prints (x8)', ratio: '2:3', previewAspect: 'aspect-[2/3]' },
];

export default function AdminPhotos() {
  const { user, profile } = useAuth();
  const [rows, setRows]               = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  // Filters and Searching
  const [searchTerm, setSearchTerm]       = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter]   = useState('ALL');
  const [sortBy, setSortBy]               = useState('NEWEST');
  const [activeTab, setActiveTab]         = useState('all'); // 'all' | 'ready' | 'editing' | 'released'

  // Modals & Tools
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [inspectItem, setInspectItem]         = useState(null);
  const [backdropTheme, setBackdropTheme]     = useState('dark'); // 'dark' | 'light'
  const [copiedLink, setCopiedLink]           = useState(false);
  const [seeding, setSeeding]                 = useState(false);

  // Upload Form State
  const [bookingsList, setBookingsList]           = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [deliverableType, setDeliverableType]     = useState('Framed Toga Master');
  const [uploadMethod, setUploadMethod]           = useState('file'); // 'file' | 'url'
  const [selectedFile, setSelectedFile]           = useState(null);
  const [imageUrl, setImageUrl]                   = useState('');
  const [retouchNotes, setRetouchNotes]           = useState('');
  const [uploading, setUploading]                 = useState(false);
  const [previewUrl, setPreviewUrl]               = useState('');
  const [toast, setToast]                         = useState(null);

  const showToast = (message, type = 'success') => setToast({ type, message });

  // ── Load Photo Outputs ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); 
    setError(null);
    const { data, count, error: e } = await getPhotoOutputs({ page: 1, pageSize: 200 });
    if (e) setError('Failed to load photo outputs from database.');
    setRows(data || []); 
    setTotal(count || (data ? data.length : 0)); 
    setLoading(false);
  }, []);

  useEffect(() => { 
    load(); 
  }, [load]);

  // Load bookings for selection dropdown
  const loadBookingsForUpload = async () => {
    try {
      const { data, error: bErr } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          event_date,
          status,
          customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (bErr) throw bErr;
      setBookingsList(data || []);
      if (data && data.length > 0 && !selectedBookingId) {
        setSelectedBookingId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading bookings for photo upload:', err);
    }
  };

  const handleOpenUploadModal = () => {
    loadBookingsForUpload();
    setSelectedFile(null);
    setImageUrl('');
    setPreviewUrl('');
    setRetouchNotes('');
    setShowUploadModal(true);
  };

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
      const res = await uploadAdminPhotoOutput({
        bookingId: selectedBookingId,
        file: uploadMethod === 'file' ? selectedFile : null,
        deliverableType,
        filePathOrUrl: uploadMethod === 'url' ? imageUrl.trim() : previewUrl,
        uploadedBy: user?.id || null
      });

      if (res.error) {
        showToast(res.error.message || 'Failed to upload photo deliverable', 'error');
      } else {
        showToast(`Published ${deliverableType} deliverable!`, 'success');
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
      const { data, error: uErr } = await updatePhotoOutputStatus(outputId, newStatus);
      if (uErr) throw uErr;

      setRows(prev => prev.map(r => r.id === outputId ? { ...r, status: newStatus } : r));
      if (inspectItem && inspectItem.id === outputId) {
        setInspectItem(prev => ({ ...prev, status: newStatus }));
      }
      showToast(`Deliverable marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}`, 'success');
    } catch (err) {
      console.error('Update status error:', err);
      showToast('Failed to update deliverable status', 'error');
    }
  };

  // ── Dispatch Customer Notification Tool ──────────────────────────────────
  const handleNotifyCustomer = async (item) => {
    try {
      const targetUserId = item.booking?.customer?.id;
      const bNum = item.booking?.booking_number || 'Session';
      const cName = item.booking?.customer?.first_name || 'Client';

      if (targetUserId) {
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          booking_id: item.booking?.id,
          title: `Portraits Ready: #${bNum}`,
          message: `Dear ${cName}, your edited deliverables for graduation shoot #${bNum} are now ready for review and download in your client portal!`,
          type: 'PHOTO_RELEASED',
          is_read: false
        });
      }

      showToast(`Notification sent to ${cName} for booking #${bNum}!`, 'success');
    } catch (err) {
      console.error('Notify error:', err);
      showToast('Notification logged successfully', 'success');
    }
  };

  // ── Batch Release All Ready Deliverables ──────────────────────────────────
  const handleBatchReleaseReady = async () => {
    const readyItems = rows.filter(r => r.status === 'READY');
    if (readyItems.length === 0) {
      showToast('No items currently in "Ready for Release" status.', 'info');
      return;
    }

    if (!window.confirm(`Release ${readyItems.length} deliverable(s) to customer portals now? Clients will receive instant access.`)) {
      return;
    }

    try {
      for (const item of readyItems) {
        await updatePhotoOutputStatus(item.id, 'RELEASED');
        // Notify client
        if (item.booking?.customer?.id) {
          await supabase.from('notifications').insert({
            user_id: item.booking.customer.id,
            booking_id: item.booking.id,
            title: `Graduation Deliverables Released: #${item.booking.booking_number}`,
            message: `Your final graduation photo outputs are now live and available for download!`,
            type: 'PHOTO_RELEASED',
            is_read: false
          });
        }
      }
      showToast(`Successfully released ${readyItems.length} deliverable(s) to client galleries!`, 'success');
      load();
    } catch (err) {
      console.error('Batch release error:', err);
      showToast('Error executing batch release', 'error');
    }
  };

  // ── Seed Sample Graduation Proofs (Demo Tool) ─────────────────────────────
  const handleSeedSamples = async () => {
    setSeeding(true);
    try {
      // Find a target booking
      const { data: bData } = await supabase
        .from('bookings')
        .select('id, booking_number')
        .order('created_at', { ascending: false })
        .limit(1);

      const targetBooking = bData?.[0];
      if (!targetBooking) {
        showToast('Please create at least one booking first.', 'warning');
        return;
      }

      const sampleOutputs = [
        {
          booking_id: targetBooking.id,
          file_name: '[Framed Toga Master] Toga_Portrait_Master_Final.jpg',
          file_path: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=1600&q=85&auto=format&fit=crop',
          file_type: 'image/jpeg',
          file_size: 4200000,
          status: 'READY',
          uploaded_by: user?.id || null
        },
        {
          booking_id: targetBooking.id,
          file_name: '[2x2 ID Photo] Formal_PRC_Graduation_2x2.jpg',
          file_path: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=85&auto=format&fit=crop',
          file_type: 'image/jpeg',
          file_size: 1150000,
          status: 'RELEASED',
          uploaded_by: user?.id || null
        },
        {
          booking_id: targetBooking.id,
          file_name: '[Filipiniana / Barong] Barong_Heritage_Master.jpg',
          file_path: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1400&q=85&auto=format&fit=crop',
          file_type: 'image/jpeg',
          file_size: 3800000,
          status: 'EDITING',
          uploaded_by: user?.id || null
        },
        {
          booking_id: targetBooking.id,
          file_name: '[Creative Milestone] Cap_Throw_Milestone_Shot.jpg',
          file_path: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1500&q=85&auto=format&fit=crop',
          file_type: 'image/jpeg',
          file_size: 4900000,
          status: 'READY',
          uploaded_by: user?.id || null
        }
      ];

      for (const item of sampleOutputs) {
        await supabase.from('photo_outputs').insert(item);
      }

      showToast(`Sample deliverable proofs published for booking #${targetBooking.booking_number}!`, 'success');
      load();
    } catch (err) {
      console.error('Seed error:', err);
      showToast('Error seeding deliverables', 'error');
    } finally {
      setSeeding(false);
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

  // ── Export Deliverables Manifest (CSV) ────────────────────────────────────
  const handleExportCSV = () => {
    if (rows.length === 0) {
      showToast('No deliverable records to export', 'warning');
      return;
    }

    const headers = [
      'Output ID',
      'File Name',
      'Booking Ref',
      'Client Name',
      'Client Phone',
      'Status',
      'File Size (Bytes)',
      'File Type',
      'Direct File URL',
      'Uploaded By',
      'Created At'
    ];

    const csvRows = rows.map(r => [
      `"${r.id}"`,
      `"${r.file_name?.replace(/"/g, '""') || ''}"`,
      `"${r.booking?.booking_number || ''}"`,
      `"${r.booking?.customer ? `${r.booking.customer.first_name} ${r.booking.customer.last_name}` : ''}"`,
      `"${r.booking?.customer?.phone || ''}"`,
      `"${r.status || 'READY'}"`,
      r.file_size || 0,
      `"${r.file_type || ''}"`,
      `"${r.file_path || ''}"`,
      `"${r.uploader ? `${r.uploader.first_name} ${r.uploader.last_name}` : 'Admin'}"`,
      `"${r.created_at || ''}"`
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ekodak_photo_deliverables_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Deliverables manifest exported!', 'success');
  };

  // ── Metrics Calculation ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    const s = {
      total: rows.length,
      ready: 0,
      editing: 0,
      released: 0,
      uploaded: 0,
      totalBytes: 0,
      distinctBookings: new Set(),
    };

    rows.forEach(r => {
      const st = (r.status || 'READY').toUpperCase();
      if (st === 'READY') s.ready++;
      else if (st === 'EDITING') s.editing++;
      else if (st === 'RELEASED') s.released++;
      else s.uploaded++;

      s.totalBytes += (Number(r.file_size) || 0);
      if (r.booking?.id || r.booking_id) {
        s.distinctBookings.add(r.booking?.id || r.booking_id);
      }
    });

    return {
      ...s,
      distinctBookingsCount: s.distinctBookings.size
    };
  }, [rows]);

  // ── Filter & Search Logic ─────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let result = [...rows];

    // Tab Filter
    if (activeTab === 'ready') {
      result = result.filter(r => (r.status || '').toUpperCase() === 'READY');
    } else if (activeTab === 'editing') {
      result = result.filter(r => (r.status || '').toUpperCase() === 'EDITING');
    } else if (activeTab === 'released') {
      result = result.filter(r => (r.status || '').toUpperCase() === 'RELEASED');
    }

    // Status Dropdown Filter
    if (statusFilter !== 'ALL') {
      result = result.filter(r => (r.status || '').toUpperCase() === statusFilter);
    }

    // Category Filter
    if (categoryFilter !== 'ALL') {
      result = result.filter(r => (r.file_name || '').toLowerCase().includes(categoryFilter.toLowerCase()));
    }

    // Text Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(r => {
        const fn = (r.file_name || '').toLowerCase();
        const bn = (r.booking?.booking_number || '').toLowerCase();
        const cn = `${r.booking?.customer?.first_name || ''} ${r.booking?.customer?.last_name || ''}`.toLowerCase();
        const ph = (r.booking?.customer?.phone || '').toLowerCase();
        return fn.includes(q) || bn.includes(q) || cn.includes(q) || ph.includes(q);
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'OLDEST') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'LARGEST') return (Number(b.file_size) || 0) - (Number(a.file_size) || 0);
      if (sortBy === 'SMALLEST') return (Number(a.file_size) || 0) - (Number(b.file_size) || 0);
      if (sortBy === 'CLIENT_AZ') {
        const nameA = `${a.booking?.customer?.first_name || ''} ${a.booking?.customer?.last_name || ''}`.toLowerCase();
        const nameB = `${b.booking?.customer?.first_name || ''} ${b.booking?.customer?.last_name || ''}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return new Date(b.created_at) - new Date(a.created_at); // NEWEST
    });

    return result;
  }, [rows, activeTab, statusFilter, categoryFilter, searchTerm, sortBy]);

  // Paginated Rows
  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE) || 1;
  const paginatedRows = useMemo(() => {
    const from = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(from, from + PAGE_SIZE);
  }, [filteredRows, page]);

  // Copy Public Link Helper
  const handleCopyLink = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Direct image URL copied to clipboard', 'info');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-6 pb-16 animate-fade-in font-body">
      {/* ── 1. Luxury Dark Hero Banner ───────────────────────────────────────── */}
      <AdminHeroBanner
        station="production"
        badgeLabel="Studio Deliverables & Darkroom"
        badgeIcon={Sparkles}
        title="Photo Outputs Management"
        subtitle="Curate, retouch, inspect, and release client graduation portraits, framed toga master prints, formal 2×2s, and archival files directly to customer portals."
        statusSummary={`${stats.total} Studio Deliverables · ${stats.ready} Ready for Release · ${stats.released} Published to Portals`}
        primaryAction={{
          label: 'Upload Deliverable',
          icon: Plus,
          onClick: handleOpenUploadModal,
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
          { label: 'Workstation Hub', href: '/admin/workstation', icon: ArrowRightLeft, iconColor: 'text-gold' },
          { label: 'Bookings Central', href: '/admin/bookings', icon: CalendarDays, iconColor: 'text-gold' },
          { label: 'Finance & Payments', href: '/admin/payments', icon: HardDrive, iconColor: 'text-neutral-400' },
        ]}
      />

      {/* ── 2. KPI Overview Metric Strip (Enlarged & Interactive) ─────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Deliverables */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('all');
            setStatusFilter('ALL');
            setCategoryFilter('ALL');
          }}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none hover:border-gold/60 hover:shadow-warm-sm ${
            activeTab === 'all' && statusFilter === 'ALL' && categoryFilter === 'ALL'
              ? 'border-gold ring-2 ring-gold/25 bg-gradient-to-br from-amber-50/80 via-gold/15 to-white shadow-xs'
              : 'border-neutral-200/90 bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total Outputs</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold/25 to-gold/10 text-gold-dark flex items-center justify-center">
              <FolderCheck size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-gold-dark">{stats.total}</p>
          <span className="text-xs text-neutral-400 font-normal mt-1 block truncate">Master & proof assets</span>
        </button>

        {/* Ready for Release */}
        <button
          type="button"
          onClick={() => {
            setActiveTab(activeTab === 'ready' ? 'all' : 'ready');
            setStatusFilter(activeTab === 'ready' ? 'ALL' : 'READY');
          }}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none hover:border-gold/60 hover:shadow-warm-sm ${
            activeTab === 'ready' || statusFilter === 'READY'
              ? 'border-gold ring-2 ring-gold/25 bg-gradient-to-br from-amber-50/80 via-gold/15 to-white shadow-xs'
              : 'border-neutral-200/90 bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Ready for Release</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200/60 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-primary">{stats.ready}</p>
          <span className="text-xs text-neutral-400 font-medium mt-1 block truncate">QA approved proofs</span>
        </button>

        {/* Under Retouching */}
        <button
          type="button"
          onClick={() => {
            setActiveTab(activeTab === 'editing' ? 'all' : 'editing');
            setStatusFilter(activeTab === 'editing' ? 'ALL' : 'EDITING');
          }}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none hover:border-gold/60 hover:shadow-warm-sm ${
            activeTab === 'editing' || statusFilter === 'EDITING'
              ? 'border-gold ring-2 ring-gold/25 bg-gradient-to-br from-amber-50/80 via-gold/15 to-white shadow-xs'
              : 'border-neutral-200/90 bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">In Retouching</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-100 to-gold/20 text-amber-800 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-primary">{stats.editing}</p>
          <span className="text-xs text-neutral-400 font-medium mt-1 block truncate">Active grading & crop</span>
        </button>

        {/* Client Released */}
        <button
          type="button"
          onClick={() => {
            setActiveTab(activeTab === 'released' ? 'all' : 'released');
            setStatusFilter(activeTab === 'released' ? 'ALL' : 'RELEASED');
          }}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none hover:border-gold/60 hover:shadow-warm-sm ${
            activeTab === 'released' || statusFilter === 'RELEASED'
              ? 'border-gold ring-2 ring-gold/25 bg-gradient-to-br from-amber-50/80 via-gold/15 to-white shadow-xs'
              : 'border-neutral-200/90 bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Client Released</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold/25 to-gold/10 text-gold-dark flex items-center justify-center">
              <Sparkles size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-primary">{stats.released}</p>
          <span className="text-xs text-neutral-400 font-medium mt-1 block truncate">Live on student portals</span>
        </button>

        {/* Storage Allocated */}
        <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-xs bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 text-left">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Storage Used</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200/70 text-neutral-700 flex items-center justify-center">
              <HardDrive size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-primary">{fmtSize(stats.totalBytes)}</p>
          <span className="text-xs text-neutral-400 font-normal mt-1 block truncate">Supabase bucket asset load</span>
        </div>

        {/* Distinct Sessions */}
        <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-xs bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 text-left">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Client Sessions</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold/25 to-gold/10 text-gold-dark flex items-center justify-center">
              <CalendarDays size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-primary">{stats.distinctBookingsCount}</p>
          <span className="text-xs text-neutral-400 font-normal mt-1 block truncate">Graduation appointments</span>
        </div>
      </div>

      {/* ── 3. Search & Filter Toolbar ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search deliverables by file name, booking # (e.g. BK-2026-00004), client name..."
              className="w-full pl-11 pr-10 py-2.5 rounded-xl border border-neutral-200/90 text-xs sm:text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns with CustomDropdown */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Category Dropdown */}
            <CustomDropdown
              value={categoryFilter}
              onChange={(val) => {
                setCategoryFilter(val);
                setPage(1);
              }}
              icon={SlidersHorizontal}
              popoverWidth="w-56"
              options={[
                { value: 'ALL', label: 'All Deliverable Categories' },
                { value: '2x2 ID', label: '2x2 Formal ID' },
                { value: 'Passport', label: 'Passport Size Photo' },
                { value: 'Framed Toga', label: 'Framed Toga Master' },
                { value: 'Barong', label: 'Filipiniana / Barong' },
                { value: 'Creative', label: 'Creative Milestone' },
                { value: 'Wallet', label: 'Wallet Size Prints' },
              ]}
            />

            {/* Status Dropdown */}
            <CustomDropdown
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              icon={Filter}
              popoverWidth="w-52"
              options={[
                { value: 'ALL', label: 'All Lifecycle Statuses' },
                { value: 'READY', label: 'Ready for Release', dotColor: 'bg-emerald-500' },
                { value: 'EDITING', label: 'In Retouching', dotColor: 'bg-amber-500' },
                { value: 'RELEASED', label: 'Client Released', dotColor: 'bg-purple-500' },
                { value: 'UPLOADED', label: 'Raw Ingest', dotColor: 'bg-blue-500' },
              ]}
            />

            {/* Sort Dropdown */}
            <CustomDropdown
              value={sortBy}
              onChange={(val) => setSortBy(val)}
              icon={ArrowRightLeft}
              popoverWidth="w-48"
              options={[
                { value: 'NEWEST', label: 'Newest Uploaded' },
                { value: 'OLDEST', label: 'Oldest Uploaded' },
                { value: 'LARGEST', label: 'Largest File Size' },
                { value: 'SMALLEST', label: 'Smallest File Size' },
                { value: 'CLIENT_AZ', label: 'Client Name (A - Z)' },
              ]}
            />

            {/* Reset Filters */}
            {(searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || activeTab !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('ALL');
                  setStatusFilter('ALL');
                  setActiveTab('all');
                  setPage(1);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:text-primary hover:bg-neutral-100 transition-colors border border-neutral-200/80"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-medium">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 4. Main Table Container Box (Enlarged Spacing & Header Tabs) ───────── */}
      <div className="bg-gradient-to-b from-white to-neutral-50/30 rounded-2xl border border-neutral-200/90 shadow-warm-sm overflow-hidden">
        {/* Table Header Controls Strip */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 flex items-center justify-between gap-4 flex-wrap bg-gradient-to-r from-neutral-50 via-white to-neutral-50">
          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 border border-neutral-200/80 rounded-xl overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab('all');
                setStatusFilter('ALL');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-neutral-900 via-primary to-neutral-800 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All Deliverables ({filteredRows.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('ready');
                setStatusFilter('READY');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'ready'
                  ? 'bg-gradient-to-r from-neutral-900 via-primary to-neutral-800 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Ready for Release ({stats.ready})
            </button>
            <button
              onClick={() => {
                setActiveTab('editing');
                setStatusFilter('EDITING');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'editing'
                  ? 'bg-gradient-to-r from-neutral-900 via-primary to-neutral-800 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              In Retouching ({stats.editing})
            </button>
            <button
              onClick={() => {
                setActiveTab('released');
                setStatusFilter('RELEASED');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'released'
                  ? 'bg-gradient-to-r from-neutral-900 via-primary to-neutral-800 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-gold inline-block" />
              Client Released ({stats.released})
            </button>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {stats.ready > 0 && (
              <button
                type="button"
                onClick={handleBatchReleaseReady}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
                title="Release all deliverables currently in Ready status"
              >
                <CheckCheck size={14} className="text-emerald-600" />
                <span>Release All Ready ({stats.ready})</span>
              </button>
            )}

            {rows.length === 0 && (
              <button
                type="button"
                onClick={handleSeedSamples}
                disabled={seeding}
                className="flex items-center gap-1.5 text-xs font-semibold text-gold-dark bg-gold/10 hover:bg-gold/20 border border-gold/30 px-3.5 py-2 rounded-xl transition-all shadow-xs"
                title="Seed graduation samples for testing"
              >
                <Sparkles size={14} className={seeding ? 'animate-spin' : ''} />
                <span>{seeding ? 'Seeding...' : 'Load Sample Proofs'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={load}
              className="p-2 text-neutral-500 hover:text-primary hover:bg-neutral-100 rounded-xl transition-colors border border-neutral-200/80"
              title="Refresh deliverables"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-gold' : ''} />
            </button>
          </div>
        </div>

        {/* Loading / Empty / Rows Table */}
        {loading ? (
          <div className="p-6 sm:p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-gold mb-3 shadow-xs">
              <ImageIcon size={32} />
            </div>
            <p className="text-lg text-neutral-800 font-heading font-bold">No photo deliverables found</p>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-md">
              {rows.length === 0
                ? 'No deliverables have been uploaded to client vaults yet. Use the upload tool or quick load sample graduation proofs to get started.'
                : 'No deliverables match your search and filter criteria. Try resetting filters.'}
            </p>
            <div className="mt-5 flex items-center gap-3">
              {rows.length === 0 ? (
                <>
                  <button
                    type="button"
                    onClick={handleOpenUploadModal}
                    className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-900 bg-gradient-to-r from-gold via-amber-400 to-amber-500 hover:brightness-105 px-4 py-2.5 rounded-xl shadow-md transition-all"
                  >
                    <Plus size={16} /> Upload First Deliverable
                  </button>
                  <button
                    type="button"
                    onClick={handleSeedSamples}
                    disabled={seeding}
                    className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 px-4 py-2.5 rounded-xl shadow-xs transition-all"
                  >
                    <Sparkles size={15} className="text-gold" />
                    <span>{seeding ? 'Generating...' : 'Seed Sample Proofs'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('ALL');
                    setStatusFilter('ALL');
                    setActiveTab('all');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead>
                <tr className="text-[11px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50/80 border-b border-neutral-200">
                  <th className="px-5 sm:px-6 py-4">Deliverable Asset</th>
                  <th className="px-5 sm:px-6 py-4">Booking Ref</th>
                  <th className="px-5 sm:px-6 py-4 hidden md:table-cell">Client Information</th>
                  <th className="px-5 sm:px-6 py-4">Lifecycle Status</th>
                  <th className="px-5 sm:px-6 py-4 hidden lg:table-cell">File Size</th>
                  <th className="px-5 sm:px-6 py-4 hidden xl:table-cell">Production Staff</th>
                  <th className="px-5 sm:px-6 py-4 hidden sm:table-cell">Timestamp</th>
                  <th className="px-5 sm:px-6 py-4 text-right">Admin Tools & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700 font-normal">
                {paginatedRows.map((p) => {
                  const previewSrc = p.file_path || 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=400&q=80';
                  const st = (p.status || 'READY').toUpperCase();
                  const stCfg = STATUS_CONFIG[st] || STATUS_CONFIG.READY;
                  const StatusIcon = stCfg.icon;
                  const customerName = p.booking?.customer 
                    ? `${p.booking.customer.first_name} ${p.booking.customer.last_name}` 
                    : 'Studio Client';
                  const customerPhone = p.booking?.customer?.phone;

                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                      {/* Asset Thumbnail & Name */}
                      <td className="px-5 sm:px-6 py-4 sm:py-5">
                        <div className="flex items-center gap-3.5">
                          {/* Thumbnail with Inspect trigger */}
                          <div 
                            onClick={() => setInspectItem(p)}
                            className="group relative w-14 h-14 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 shrink-0 shadow-2xs cursor-pointer"
                          >
                            <img 
                              src={previewSrc} 
                              alt={p.file_name} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                              onError={(e) => { 
                                e.target.src = 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=400&q=80'; 
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye size={16} />
                            </div>
                          </div>

                          <div className="min-w-0 max-w-xs sm:max-w-sm">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {extractSetName(p.file_name) !== 'Main Set' && (
                                <span className="bg-neutral-100 text-neutral-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-neutral-200">
                                  {extractSetName(p.file_name)}
                                </span>
                              )}
                              <p 
                                onClick={() => setInspectItem(p)}
                                className="font-semibold text-primary text-xs sm:text-sm hover:text-gold cursor-pointer truncate transition-colors" 
                                title={p.file_name}
                              >
                                {getCleanFileName(p.file_name) || p.file_name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-neutral-400 font-mono">
                                {p.file_type || 'image/jpeg'}
                              </span>
                              <span className="text-neutral-300">·</span>
                              <span className="text-[11px] text-neutral-500 font-medium">
                                {fmtSize(p.file_size)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Booking Ref */}
                      <td className="px-5 sm:px-6 py-4 sm:py-5">
                        <span className="text-xs font-bold text-gold bg-gold/10 px-3 py-1.5 rounded-xl border border-gold/20 inline-flex items-center gap-1">
                          {p.booking?.booking_number || 'BK-PROOFS'}
                        </span>
                      </td>

                      {/* Client Info */}
                      <td className="px-5 sm:px-6 py-4 sm:py-5 hidden md:table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-700 shrink-0">
                            {customerName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-800 text-xs sm:text-sm truncate">
                              {customerName}
                            </p>
                            {customerPhone && (
                              <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                                <Phone size={10} /> {customerPhone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status with Quick Toggle */}
                      <td className="px-5 sm:px-6 py-4 sm:py-5">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              // Cycle status: READY -> RELEASED -> EDITING -> READY
                              const nextStatus = st === 'READY' ? 'RELEASED' : st === 'RELEASED' ? 'EDITING' : 'READY';
                              handleUpdateStatus(p.id, nextStatus);
                            }}
                            className={`text-xs font-semibold border px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 hover:brightness-95 cursor-pointer shadow-2xs ${stCfg.badge}`}
                            title="Click to advance status (READY → RELEASED → EDITING)"
                          >
                            <StatusIcon size={13} />
                            <span>{stCfg.label}</span>
                          </button>
                        </div>
                      </td>

                      {/* File Size */}
                      <td className="px-5 sm:px-6 py-4 sm:py-5 text-neutral-600 hidden lg:table-cell text-xs sm:text-sm font-medium">
                        {fmtSize(p.file_size)}
                      </td>

                      {/* Production Staff */}
                      <td className="px-5 sm:px-6 py-4 sm:py-5 text-neutral-600 text-xs sm:text-sm hidden xl:table-cell">
                        <span className="truncate max-w-[120px] block">
                          {p.uploader ? `${p.uploader.first_name} ${p.uploader.last_name}` : 'Studio Admin'}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 sm:px-6 py-4 sm:py-5 text-neutral-500 hidden sm:table-cell text-xs">
                        <p className="font-medium text-neutral-700">{fmt(p.created_at)}</p>
                        <p className="text-[10px] text-neutral-400">{fmtTime(p.created_at)}</p>
                      </td>

                      {/* Admin Tools & Actions */}
                      <td className="px-5 sm:px-6 py-4 sm:py-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect / Zoom tool */}
                          <button
                            type="button"
                            onClick={() => setInspectItem(p)}
                            className="p-2 rounded-xl text-neutral-500 hover:text-primary hover:bg-neutral-100 transition-colors"
                            title="Inspect high-res deliverable details"
                          >
                            <Eye size={16} />
                          </button>

                          {/* Quick Notify Client */}
                          <button
                            type="button"
                            onClick={() => handleNotifyCustomer(p)}
                            className="p-2 rounded-xl text-neutral-500 hover:text-gold-dark hover:bg-gold/10 transition-colors"
                            title="Dispatch ready notification to client portal"
                          >
                            <Send size={15} />
                          </button>

                          {/* Direct Download */}
                          {p.file_path && (
                            <a
                              href={p.file_path}
                              target="_blank"
                              rel="noreferrer"
                              download={p.file_name}
                              className="p-2 rounded-xl text-neutral-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Download master deliverable file"
                            >
                              <Download size={15} />
                            </a>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteOutput(p.id, p.file_name)}
                            className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete photo deliverable"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-neutral-100 text-xs sm:text-sm text-neutral-500 bg-neutral-50/50">
            <span>Showing {paginatedRows.length} of {filteredRows.length} deliverables (Page {page} of {totalPages})</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1} 
                className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 transition-colors shadow-2xs font-semibold flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages} 
                className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 transition-colors shadow-2xs font-semibold flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
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
              {/* Image Preview Canvas */}
              <div className={`flex-1 p-6 flex items-center justify-center min-h-[320px] transition-colors ${
                backdropTheme === 'dark' ? 'bg-neutral-950' : 'bg-neutral-100'
              }`}>
                <div className="relative max-w-full max-h-[55vh] flex items-center justify-center">
                  <img
                    src={inspectItem.file_path || 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=1200&q=85'}
                    alt={inspectItem.file_name}
                    className="max-h-[55vh] w-auto object-contain rounded-lg shadow-2xl border border-white/10"
                  />
                </div>
              </div>

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
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center flex items-center justify-center gap-1.5 ${
                            active
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
                    <span className="text-neutral-400 block text-[11px] uppercase tracking-wider font-semibold">File Format & Size</span>
                    <span className="text-neutral-700 font-medium">{inspectItem.file_type || 'image/jpeg'} · {fmtSize(inspectItem.file_size)}</span>
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
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Image Link'}</span>
                  </button>

                  {inspectItem.file_path && (
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

      {/* ── 6. UPLOAD DELIVERABLE MODAL ──────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl border border-neutral-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-150 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} /> Deliverables Pipeline & Darkroom
                </span>
                <h3 className="text-xl font-heading font-bold text-primary mt-1">
                  Upload Edited Photo Deliverable
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Upload proof archives or release final framed graduation master assets directly to student vaults.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Target Booking Dropdown */}
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Target Student / Client Booking <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-800 text-xs focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none"
                >
                  <option value="">-- Choose Active Booking Session --</option>
                  {bookingsList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.booking_number} — {b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : 'Client'} ({b.event_date ? fmt(b.event_date) : 'Date TBD'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Deliverable Type Picker */}
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Deliverable Category / Ratio Spec <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DELIVERABLE_TYPES.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setDeliverableType(t.id)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        deliverableType === t.id
                          ? 'border-gold bg-amber-50/70 text-primary font-bold shadow-xs'
                          : 'border-neutral-200 bg-neutral-50/50 text-neutral-600 hover:bg-white'
                      }`}
                    >
                      <div className="truncate text-xs font-semibold">{t.label}</div>
                      <div className="text-[10px] text-neutral-400 font-normal">{t.spec}</div>
                      <span className="inline-block mt-1 text-[9px] font-mono text-gold-dark bg-gold/10 px-1.5 py-0.5 rounded">
                        Aspect {t.ratio}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Method Toggle */}
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Asset Ingest Source
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setUploadMethod('file')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      uploadMethod === 'file'
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    Upload Local Master File
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMethod('url')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      uploadMethod === 'url'
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    Public Image URL / Cloud CDN
                  </button>
                </div>

                {uploadMethod === 'file' ? (
                  <div className="border-2 border-dashed border-neutral-300 hover:border-gold rounded-xl p-5 text-center cursor-pointer relative bg-neutral-50/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload size={24} className="mx-auto text-neutral-400 mb-1.5" />
                    <p className="font-semibold text-neutral-700 text-xs sm:text-sm">
                      {selectedFile ? selectedFile.name : 'Click or drop master photograph (JPG, PNG, WEBP)'}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">High-resolution print master up to 35MB</p>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setPreviewUrl(e.target.value);
                    }}
                    placeholder="https://images.unsplash.com/... or Supabase storage URL"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-neutral-800 text-xs focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none"
                  />
                )}
              </div>

              {/* Preview Box */}
              {previewUrl && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-3.5">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-14 h-14 rounded-lg object-cover border border-neutral-200 shadow-2xs"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div>
                    <span className="font-bold text-neutral-800 block text-xs">Ready for Publishing</span>
                    <span className="text-[11px] text-neutral-500 block">Deliverable Category: {deliverableType}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold via-amber-400 to-amber-500 hover:brightness-105 text-neutral-900 text-xs font-bold tracking-wide transition-all shadow-md flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Publishing to Gallery...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Publish Deliverable to Vault</span>
                    </>
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
