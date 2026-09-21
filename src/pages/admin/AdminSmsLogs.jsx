import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Smartphone,
  Radio,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Eye,
  Trash2,
  Copy,
  Check,
  Download,
  Sparkles,
  Filter,
  ExternalLink,
  ShieldCheck,
  CheckCheck,
  User,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import StudioDropdown from '../../components/ui/StudioDropdown';
import { getSmsLogs, dispatchManualSms, deleteSmsLog, getRecentBookings } from '../../services/adminService';

const PAGE_SIZE = 15;

const fmt = (d) => (!d ? '—' : new Date(d).toLocaleString('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}));

function timeAgo(dateString) {
  if (!dateString) return '—';
  const diffSec = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

// Detect Philippine carrier network by phone prefix
function detectPhilippineCarrier(phone) {
  if (!phone) return 'PH Telco';
  const clean = phone.replace(/[^0-9]/g, '');
  let prefix = '';
  if (clean.startsWith('639')) prefix = '09' + clean.slice(3, 5);
  else if (clean.startsWith('09')) prefix = clean.slice(0, 4);

  const globePrefixes = ['0905','0906','0915','0916','0917','0926','0927','0935','0936','0945','0955','0956','0965','0966','0967','0975','0976','0977','0978','0979','0995','0996','0997'];
  const smartPrefixes = ['0907','0908','0909','0910','0911','0912','0913','0914','0918','0919','0920','0921','0928','0929','0930','0938','0939','0940','0946','0947','0948','0949','0950','0951','0961','0963','0964','0968','0969','0970','0971','0981','0989','0992','0998','0999'];
  const ditoPrefixes = ['0991','0992','0993','0994','0895','0896','0897','0898'];

  if (globePrefixes.includes(prefix)) return 'Globe / TM';
  if (smartPrefixes.includes(prefix)) return 'Smart / TNT';
  if (ditoPrefixes.includes(prefix)) return 'DITO Telco';
  return 'Direct Route';
}

const STATUS_CONFIG = {
  SENT: {
    label: 'Delivered',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dotClass: 'bg-emerald-500'
  },
  DELIVERED: {
    label: 'Delivered',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dotClass: 'bg-emerald-500'
  },
  QUEUED: {
    label: 'Queued',
    icon: Clock,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dotClass: 'bg-amber-500'
  },
  PENDING: {
    label: 'Queued',
    icon: Clock,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dotClass: 'bg-amber-500'
  },
  FAILED: {
    label: 'Failed',
    icon: XCircle,
    badgeClass: 'bg-red-50 text-red-800 border-red-200/80',
    dotClass: 'bg-red-500'
  }
};

export default function AdminSmsLogs() {
  const { user, profile } = useAuth();

  // Core Data State
  const [rows, setRows] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'SENT' | 'PENDING' | 'FAILED'
  const [carrierFilter, setCarrierFilter] = useState('ALL'); // 'ALL' | 'SEMAPHORE' | 'PHILSMS' | 'TWILIO'
  const [bookingFilter, setBookingFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);

  // Modals & Tools
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [inspectModalLog, setInspectModalLog] = useState(null);
  const [showGatewayDrawer, setShowGatewayDrawer] = useState(false);

  // Compose State
  const [dispatchPhone, setDispatchPhone] = useState('');
  const [dispatchName, setDispatchName] = useState('');
  const [dispatchMessage, setDispatchMessage] = useState('');
  const [dispatchBookingId, setDispatchBookingId] = useState('');
  const [dispatchBookingNumber, setDispatchBookingNumber] = useState('');
  const [dispatchGateway, setDispatchGateway] = useState('semaphore');
  const [sendingSms, setSendingSms] = useState(false);

  // Load Data
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, bookingsRes] = await Promise.all([
        getSmsLogs({ page: 1, pageSize: 100 }),
        getRecentBookings(50)
      ]);

      setRows(logsRes.data || []);
      setRecentBookings(bookingsRes.data || []);
    } catch (err) {
      console.error('Failed to load SMS logs:', err);
      setError('Unable to load SMS transmission records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener('ekodak:sms_logs_updated', handleUpdate);
    return () => window.removeEventListener('ekodak:sms_logs_updated', handleUpdate);
  }, [load]);

  // Statistics
  const stats = useMemo(() => {
    const total = rows.length;
    const delivered = rows.filter(r => r.status === 'SENT' || r.status === 'DELIVERED').length;
    const queued = rows.filter(r => r.status === 'QUEUED' || r.status === 'PENDING').length;
    const failed = rows.filter(r => r.status === 'FAILED').length;
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 100;
    return { total, delivered, queued, failed, deliveryRate };
  }, [rows]);

  // Filter Options for StudioDropdown: Bookings Filter
  const bookingFilterOptions = useMemo(() => {
    const opts = [
      { value: 'ALL', label: 'All Bookings & Manual Messages', desc: 'Display all studio SMS dispatches' }
    ];
    recentBookings.forEach(b => {
      const cName = b.customer 
        ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim()
        : 'Client';
      opts.push({
        value: b.id,
        label: `#${b.booking_number} — ${cName}`,
        desc: `${b.service?.name || 'Studio Session'} · ${b.customer?.phone || 'No phone'}`
      });
    });
    return opts;
  }, [recentBookings]);

  // Filter Options for StudioDropdown: Carrier Gateways
  const carrierFilterOptions = [
    { value: 'ALL', label: 'All Telco Carriers', desc: 'Semaphore, PhilSMS & Twilio' },
    { value: 'SEMAPHORE', label: 'Semaphore PH', desc: 'Primary direct telco route' },
    { value: 'PHILSMS', label: 'PhilSMS Gateway', desc: 'Secondary carrier failover' },
    { value: 'TWILIO', label: 'Twilio Global', desc: 'International mobile numbers' }
  ];

  // Compose Modal: Booking Options for StudioDropdown
  const composeBookingOptions = useMemo(() => {
    return recentBookings.map(b => {
      const cName = b.customer 
        ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim()
        : 'Client';
      const phone = b.customer?.phone || '';
      return {
        value: b.id,
        label: `#${b.booking_number} — ${cName}`,
        desc: `${phone ? `📱 ${phone} · ` : ''}${b.service?.name || 'Session'} · Rem: ₱${Number(b.remaining_balance || 0).toLocaleString()}`,
        badge: phone ? 'Has Mobile' : 'No Phone',
        colorBadge: phone ? 'bg-emerald-500' : 'bg-neutral-400'
      };
    });
  }, [recentBookings]);

  // Handle selecting a booking in the Quick Dispatch Modal
  const handleSelectComposeBooking = (bId) => {
    setDispatchBookingId(bId);
    const found = recentBookings.find(b => String(b.id) === String(bId));
    if (found) {
      const cName = found.customer 
        ? `${found.customer.first_name || ''} ${found.customer.last_name || ''}`.trim()
        : (found.customer_name || 'Client');
      setDispatchName(cName);
      setDispatchBookingNumber(found.booking_number || '');
      if (found.customer?.phone) {
        setDispatchPhone(found.customer.phone);
      }
      // Auto-set initial SMS template if message is blank
      if (!dispatchMessage.trim()) {
        setDispatchMessage(
          `E-KODAK: Hi ${cName}, your portrait session (#${found.booking_number}) has been updated. Please visit your client portal for details.`
        );
      }
    }
  };

  // Quick Preset Templates for SMS Dispatch
  const applySmsTemplate = (type) => {
    const name = dispatchName || 'Valued Client';
    const bNum = dispatchBookingNumber || 'STUDIO';
    const templates = {
      ORDER_READY: `E-KODAK: Hi ${name}, your portraits & proofs for #${bNum} are now ready for download! View your gallery in the portal today.`,
      PAYMENT_CONFIRMED: `E-KODAK: Payment verified for Booking #${bNum}. Your studio session schedule is confirmed. Thank you for choosing E-Kodak!`,
      SHOOT_REMINDER: `E-KODAK REMINDER: Your studio session for #${bNum} is coming up. Please arrive 15 minutes before your time slot with prescribed attire. See you!`,
      RESCHEDULE_UPDATE: `E-KODAK ADVISORY: Your session schedule for #${bNum} has been updated. Please check your client dashboard for the new call-time.`,
      STUDIO_BULLETIN: `E-KODAK BULLETIN: 2026 graduation season slots and expedited portrait packages are now open for priority booking!`
    };
    setDispatchMessage(templates[type] || templates.ORDER_READY);
  };

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      // Status Filter
      if (statusFilter === 'SENT' && !(r.status === 'SENT' || r.status === 'DELIVERED')) return false;
      if (statusFilter === 'PENDING' && !(r.status === 'PENDING' || r.status === 'QUEUED')) return false;
      if (statusFilter === 'FAILED' && r.status !== 'FAILED') return false;

      // Carrier Filter
      if (carrierFilter !== 'ALL') {
        const prov = (r.provider_message_id || r.gateway || '').toUpperCase();
        if (!prov.includes(carrierFilter)) return false;
      }

      // Booking Filter
      if (bookingFilter !== 'ALL') {
        if (String(r.booking_id) !== String(bookingFilter) && String(r.booking?.id) !== String(bookingFilter)) {
          return false;
        }
      }

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const cName = r.customer ? `${r.customer.first_name || ''} ${r.customer.last_name || ''}`.toLowerCase() : '';
      const phone = (r.phone_number || '').toLowerCase();
      const msg = (r.message || '').toLowerCase();
      const bNum = (r.booking?.booking_number || '').toLowerCase();
      const provId = (r.provider_message_id || '').toLowerCase();

      return cName.includes(q) || phone.includes(q) || msg.includes(q) || bNum.includes(q) || provId.includes(q);
    });
  }, [rows, statusFilter, carrierFilter, bookingFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const from = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(from, from + PAGE_SIZE);
  }, [filteredRows, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, carrierFilter, bookingFilter, searchQuery]);

  // Quick Dispatch Handler
  const handleDispatchSms = async (e) => {
    e.preventDefault();
    if (!dispatchPhone.trim() || !dispatchMessage.trim()) {
      alert('Please provide a mobile phone number and SMS message payload.');
      return;
    }

    setSendingSms(true);
    try {
      await dispatchManualSms({
        phoneNumber: dispatchPhone.trim(),
        message: dispatchMessage.trim(),
        notificationType: 'MANUAL_DISPATCH',
        bookingId: dispatchBookingId || null,
        customerId: recentBookings.find(b => String(b.id) === String(dispatchBookingId))?.customer_id || null,
        customerName: dispatchName || 'Client',
        bookingNumber: dispatchBookingNumber || '',
        gateway: dispatchGateway
      });

      setActionSuccessMsg(`SMS dispatched to ${dispatchPhone} via ${dispatchGateway.toUpperCase()}! Transmission logged.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);

      setComposeModalOpen(false);
      setDispatchMessage('');
      setDispatchPhone('');
      setDispatchName('');
      load();
    } catch (err) {
      console.error('SMS dispatch error:', err);
      alert('Failed to dispatch SMS: ' + err.message);
    } finally {
      setSendingSms(false);
    }
  };

  // Delete Log Handler
  const handleDeleteLog = async (id) => {
    if (!window.confirm('Are you sure you want to remove this SMS transmission record?')) return;
    try {
      await deleteSmsLog(id);
      setActionSuccessMsg('SMS transmission record removed.');
      setTimeout(() => setActionSuccessMsg(null), 3500);
      if (inspectModalLog?.id === id) setInspectModalLog(null);
      load();
    } catch (err) {
      console.error('Failed to delete SMS log:', err);
    }
  };

  // Copy text to clipboard
  const handleCopyText = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      alert('Copied: ' + text);
    }
  };

  // Export Filtered Logs to CSV
  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      alert('No SMS records to export.');
      return;
    }

    const headers = ['ID', 'Status', 'Recipient Name', 'Phone Number', 'Carrier', 'Notification Type', 'Booking Number', 'Message', 'Sent At'];
    const csvLines = [
      headers.join(','),
      ...filteredRows.map(r => {
        const cName = r.customer ? `${r.customer.first_name || ''} ${r.customer.last_name || ''}`.trim() : 'Valued Client';
        const carrier = detectPhilippineCarrier(r.phone_number);
        const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
        return [
          escape(r.id),
          escape(r.status),
          escape(cName),
          escape(r.phone_number),
          escape(carrier),
          escape(r.notification_type),
          escape(r.booking?.booking_number || 'N/A'),
          escape(r.message),
          escape(r.sent_at || r.created_at)
        ].join(',');
      })
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ekodak-sms-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Seed sample demonstration records if empty
  const handleSeedDemoLogs = async () => {
    const demos = [
      {
        phoneNumber: '09171234567',
        customerName: 'Mark June Repunte',
        bookingNumber: 'BK-2026-00004',
        message: 'E-KODAK: Hi Mark June, your Senior High portrait soft copies and proofs are ready for review on your client portal!',
        notificationType: 'ORDER_READY',
        gateway: 'semaphore'
      },
      {
        phoneNumber: '09189876543',
        customerName: 'Maria Clara Santos',
        bookingNumber: 'BK-2026-00008',
        message: 'E-KODAK: Official Receipt: Downpayment of ₱500.00 confirmed for Booking #BK-2026-00008. Session confirmed.',
        notificationType: 'PAYMENT_RECEIVED',
        gateway: 'semaphore'
      },
      {
        phoneNumber: '09228889999',
        customerName: 'Gabriel Mendoza',
        bookingNumber: 'BK-2026-00012',
        message: 'E-KODAK REMINDER: Your studio session is tomorrow at 2:00 PM. Please bring your school prescribed hood. See you!',
        notificationType: 'SHOOT_REMINDER',
        gateway: 'philsms'
      }
    ];

    for (const d of demos) {
      await dispatchManualSms(d);
    }
    setActionSuccessMsg('Generated demonstration SMS logs.');
    setTimeout(() => setActionSuccessMsg(null), 3500);
    load();
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-6 pb-16 animate-fade-in font-body">
      {/* ── 1. Luxury Administrative Hero Banner ────────────────────────────── */}
      <AdminHeroBanner
        station="admin"
        badgeLabel="Telco & Communications Gateway"
        badgeIcon={Smartphone}
        userName={profile?.full_name || user?.email?.split('@')[0] || 'Administrator'}
        title="SMS Delivery Logs & Carrier Gateway"
        subtitle="Real-time SMS dispatch audit trail, Philippine carrier delivery telemetry, and gateway balance monitoring."
        statusSummary={`${stats.total} Total Transmissions · ${stats.delivered} Delivered (${stats.deliveryRate}%) · ${stats.queued} Queued · ${stats.failed} Errors`}
        primaryAction={{
          label: 'Quick Dispatch SMS',
          icon: Send,
          onClick: () => setComposeModalOpen(true)
        }}
        secondaryAction={{
          label: 'Export Logs CSV',
          icon: Download,
          onClick: handleExportCsv
        }}
        onRefresh={load}
        isRefreshing={loading}
      />

      {/* Action Success Toast Banner */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 animate-fade-in shadow-warm-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-900 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={load} className="underline text-red-700 font-semibold">Retry</button>
        </div>
      )}

      {/* ── 2. Metric Overview Strip (4 Spacious Luxury Cards) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Messages */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-gold/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
              <MessageSquare size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
              AUDIT TRAIL
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Dispatched</p>
            <h3 className="font-heading text-2xl font-bold text-primary mt-0.5">{stats.total}</h3>
            <p className="text-xs text-neutral-500 mt-1">Lifetime studio SMS transmissions</p>
          </div>
        </div>

        {/* Card 2: Delivered */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {stats.deliveryRate}% SUCCESS
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Delivered to Handsets</p>
            <h3 className="font-heading text-2xl font-bold text-emerald-700 mt-0.5">{stats.delivered}</h3>
            <p className="text-xs text-neutral-500 mt-1">Confirmed telco handshakes</p>
          </div>
        </div>

        {/* Card 3: Queued */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <Clock size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              IN TRANSIT
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Carrier Queue</p>
            <h3 className="font-heading text-2xl font-bold text-amber-700 mt-0.5">{stats.queued}</h3>
            <p className="text-xs text-neutral-500 mt-1">Pending carrier acknowledgement</p>
          </div>
        </div>

        {/* Card 4: Gateway Route */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
              <Radio size={20} />
            </div>
            <button
              onClick={() => setShowGatewayDrawer(!showGatewayDrawer)}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              {showGatewayDrawer ? 'Hide Details' : 'View Routes'}
            </button>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Philippine Telco Route</p>
            <h3 className="font-heading text-base font-bold text-primary mt-0.5 truncate">
              Semaphore · PhilSMS
            </h3>
            <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Direct Carrier Gateways Active
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Philippine Telco Carrier Gateways Status Card (Expandable) ────── */}
      {showGatewayDrawer && (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs animate-fade-in space-y-4 font-body">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gold/15 text-gold flex items-center justify-center border border-gold/30">
                <Radio size={14} />
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold text-primary">Philippine SMS Carrier Telemetry</h4>
                <p className="text-[11px] text-neutral-400">Direct connections to Globe, Smart, TNT, and DITO cellular networks</p>
              </div>
            </div>
            <button onClick={() => setShowGatewayDrawer(false)} className="text-neutral-400 hover:text-primary">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">Semaphore PH</span>
                <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                  Primary · Connected
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">Official Sender ID: <strong className="text-neutral-800 font-mono">E-KODAK</strong></p>
              <p className="text-[10px] text-neutral-400">Routes: Globe Telecom, Smart Communications, DITO</p>
            </div>

            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">PhilSMS Gateway</span>
                <span className="text-[9.5px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-full">
                  Failover Ready
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">Dedicated high-throughput transactional gateway</p>
              <p className="text-[10px] text-neutral-400">Automatic retry on network congestion</p>
            </div>

            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">Twilio SMS Global</span>
                <span className="text-[9.5px] font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded-full">
                  International Standby
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">Global roaming and overseas client notifications</p>
              <p className="text-[10px] text-neutral-400">E.164 standard formatting verified</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Search & Filter Bar with StudioDropdown Integration ─────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-3.5 font-body">
        {/* Top Controls Row */}
        <div className="flex items-center justify-between gap-3 flex-wrap lg:flex-nowrap">
          {/* Status Tab Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 w-full lg:w-auto">
            {[
              { id: 'ALL',     label: `All Logs (${stats.total})`, icon: Layers },
              { id: 'SENT',    label: `Delivered (${stats.delivered})`, icon: CheckCircle2 },
              { id: 'PENDING', label: `Queued (${stats.queued})`, icon: Clock },
              { id: 'FAILED',  label: `Failed (${stats.failed})`, icon: XCircle },
            ].map(tab => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-neutral-100/80 text-neutral-600 hover:bg-neutral-200/60'
                  }`}
                >
                  {tab.icon && <tab.icon size={13} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search phone, recipient, #BK, message..."
              className="w-full pl-9 pr-3.5 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs font-body outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary text-xs"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Second Filter Row with StudioDropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2 border-t border-neutral-100 items-center">
          {/* StudioDropdown: Filter by Booking / Customer */}
          <div className="lg:col-span-6">
            <label className="block text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Filter by Booking or Client
            </label>
            <StudioDropdown
              value={bookingFilter}
              onChange={setBookingFilter}
              options={bookingFilterOptions}
              searchable={true}
              placeholder="Filter by Booking Number or Customer..."
              className="w-full"
              triggerClassName="py-1.5 text-xs bg-neutral-50/50 border-neutral-200/80 rounded-xl"
            />
          </div>

          {/* StudioDropdown: Filter by Carrier */}
          <div className="lg:col-span-4">
            <label className="block text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Filter by Carrier Gateway
            </label>
            <StudioDropdown
              value={carrierFilter}
              onChange={setCarrierFilter}
              options={carrierFilterOptions}
              placeholder="All Gateways"
              className="w-full"
              triggerClassName="py-1.5 text-xs bg-neutral-50/50 border-neutral-200/80 rounded-xl"
            />
          </div>

          {/* Clear Filters / Actions */}
          <div className="lg:col-span-2 flex items-end justify-end pt-4 sm:pt-0">
            {(searchQuery || statusFilter !== 'ALL' || carrierFilter !== 'ALL' || bookingFilter !== 'ALL') ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setCarrierFilter('ALL');
                  setBookingFilter('ALL');
                }}
                className="w-full py-2 px-3 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 flex items-center justify-center gap-1 transition-colors"
              >
                <X size={12} />
                Reset Filters
              </button>
            ) : (
              <button
                onClick={() => setComposeModalOpen(true)}
                className="w-full btn-primary py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Send size={12} />
                New SMS
              </button>
            )}
          </div>
        </div>

        {/* Footer info strip */}
        <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100 flex-wrap gap-2">
          <span>
            Showing <strong>{paginatedRows.length}</strong> of <strong>{filteredRows.length}</strong> filtered records
            {statusFilter !== 'ALL' && ` · Filter: ${statusFilter}`}
            {carrierFilter !== 'ALL' && ` · Gateway: ${carrierFilter}`}
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="text-xs font-semibold text-neutral-600 hover:text-primary flex items-center gap-1 transition-colors"
            >
              <Download size={12} />
              Export CSV
            </button>
            <button
              onClick={() => setComposeModalOpen(true)}
              className="text-xs font-semibold text-gold hover:text-primary flex items-center gap-1 transition-colors"
            >
              <Sparkles size={12} />
              Quick Dispatch
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. Enhanced SMS Logs Table Container ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden font-body">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-neutral-100/70 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 text-gold flex items-center justify-center mb-3 border border-gold/30">
              <MessageSquare size={24} />
            </div>
            <h3 className="font-heading text-lg font-bold text-primary">
              {rows.length === 0 ? 'No SMS Messages Logged Yet' : 'No Messages Match Your Filters'}
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1 leading-relaxed">
              {rows.length === 0
                ? 'SMS logs will record real-time notifications dispatched via Semaphore PH, PhilSMS, or Twilio when client alerts are sent.'
                : 'Try clearing your search query, carrier selection, or status filters.'}
            </p>

            <div className="flex items-center gap-2 mt-5">
              {rows.length === 0 ? (
                <>
                  <button
                    onClick={() => setComposeModalOpen(true)}
                    className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Send size={13} />
                    Send First SMS
                  </button>
                  <button
                    onClick={handleSeedDemoLogs}
                    className="py-2 px-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition-colors"
                  >
                    Generate Demo Logs
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setCarrierFilter('ALL');
                    setBookingFilter('ALL');
                  }}
                  className="btn-primary py-2 px-4 text-xs font-semibold"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200/80 text-[10.5px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recipient &amp; Mobile</th>
                  <th className="px-4 py-3 hidden md:table-cell">Carrier Network</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Booking Context</th>
                  <th className="px-4 py-3">Message Payload</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Sent Time</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedRows.map((r) => {
                  const statusConf = STATUS_CONFIG[r.status] || STATUS_CONFIG.SENT;
                  const StatusIcon = statusConf.icon;
                  const cName = r.customer 
                    ? `${r.customer.first_name || ''} ${r.customer.last_name || ''}`.trim()
                    : 'Valued Client';
                  const carrier = detectPhilippineCarrier(r.phone_number);
                  const isCopied = copiedId === r.id;

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-neutral-50/60 transition-colors group cursor-pointer"
                      onClick={() => setInspectModalLog(r)}
                    >
                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConf.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dotClass}`} />
                          <StatusIcon size={11} />
                          <span>{statusConf.label}</span>
                        </span>
                      </td>

                      {/* Recipient & Phone */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center font-bold text-[10px] shrink-0 border border-neutral-200">
                            {cName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-primary truncate max-w-[140px]">{cName}</div>
                            <div className="font-mono text-[10px] text-neutral-500">{r.phone_number || 'No phone'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Carrier Network */}
                      <td className="px-4 py-3.5 hidden md:table-cell whitespace-nowrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {carrier}
                        </span>
                        <div className="text-[9.5px] text-neutral-400 mt-0.5">
                          {r.provider_message_id?.split('_')[0] || 'SEMAPHORE'}
                        </div>
                      </td>

                      {/* Booking Context */}
                      <td className="px-4 py-3.5 hidden lg:table-cell whitespace-nowrap">
                        {r.booking?.booking_number ? (
                          <span className="font-mono text-[10px] font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded border border-neutral-200">
                            #{r.booking.booking_number}
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-[10px]">Direct SMS</span>
                        )}
                        <div className="text-[9.5px] text-neutral-400 mt-0.5">
                          {r.notification_type?.replace(/_/g, ' ') || 'DISPATCH'}
                        </div>
                      </td>

                      {/* Message Payload */}
                      <td className="px-4 py-3.5 max-w-xs sm:max-w-sm">
                        <p className="text-neutral-700 line-clamp-2 leading-relaxed">
                          {r.message}
                        </p>
                        <span className="text-[9px] text-neutral-400 font-mono mt-0.5 block">
                          {r.message?.length || 0} chars · {Math.ceil((r.message?.length || 1) / 160)} credit
                        </span>
                      </td>

                      {/* Sent Time */}
                      <td className="px-4 py-3.5 hidden sm:table-cell whitespace-nowrap">
                        <div className="text-neutral-700 font-medium">{timeAgo(r.sent_at || r.created_at)}</div>
                        <div className="text-[10px] text-neutral-400">{fmt(r.sent_at || r.created_at)}</div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Copy Text */}
                          <button
                            type="button"
                            onClick={() => handleCopyText(r.message, r.id)}
                            className="p-1.5 text-neutral-400 hover:text-primary hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200/80 text-[10px]"
                            title="Copy SMS Message Text"
                          >
                            {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>

                          {/* Inspect Modal */}
                          <button
                            type="button"
                            onClick={() => setInspectModalLog(r)}
                            className="p-1.5 text-neutral-500 hover:text-primary hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200/80 text-[10px] flex items-center gap-1"
                            title="Inspect Details"
                          >
                            <Eye size={12} />
                            <span className="hidden sm:inline">Details</span>
                          </button>

                          {/* Delete Log */}
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(r.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-neutral-200 hover:border-red-200 text-[10px]"
                            title="Delete this record"
                          >
                            <Trash2 size={12} />
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

        {/* Pagination Strip */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200/80 text-xs text-neutral-500 font-body bg-neutral-50/50">
            <span>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({filteredRows.length} total entries)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-white disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={13} />
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-white disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                Next
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 6. TOOL: QUICK SMS DISPATCH MODAL ──────────────────────────────── */}
      {composeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in font-body">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-neutral-200 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 border-b border-neutral-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center border border-gold/30 shrink-0">
                  <Send size={15} />
                </div>
                <div>
                  <h4 className="font-heading text-sm font-bold text-primary leading-tight">
                    Quick Telco SMS Dispatch
                  </h4>
                  <p className="text-[10.5px] text-neutral-400 leading-tight">
                    Direct transmission via Philippine carrier gateways (Semaphore / PhilSMS)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setComposeModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-primary rounded-xl hover:bg-neutral-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleDispatchSms} className="p-5 overflow-y-auto space-y-4">
              {/* Select from Booking with StudioDropdown */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Recipient Booking (Auto-detects Mobile &amp; Name)
                </label>
                <StudioDropdown
                  value={dispatchBookingId}
                  onChange={handleSelectComposeBooking}
                  options={composeBookingOptions}
                  searchable={true}
                  placeholder="Select a customer booking or enter manual number..."
                  className="w-full"
                  triggerClassName="py-2 text-xs bg-neutral-50/60 border-neutral-200 rounded-xl"
                />
              </div>

              {/* Recipient Name & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={dispatchName}
                    onChange={e => setDispatchName(e.target.value)}
                    placeholder="e.g. Mark June Repunte"
                    className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Philippine Mobile Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={dispatchPhone}
                      onChange={e => setDispatchPhone(e.target.value)}
                      placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                      className="w-full pl-3 pr-16 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                      {detectPhilippineCarrier(dispatchPhone)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Preset Templates */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Quick Studio Templates
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'ORDER_READY',       label: '📸 Proofs Ready' },
                    { id: 'PAYMENT_CONFIRMED', label: '💳 Payment Verified' },
                    { id: 'SHOOT_REMINDER',    label: '⏰ Call-Time' },
                    { id: 'RESCHEDULE_UPDATE', label: '📅 Reschedule' },
                    { id: 'STUDIO_BULLETIN',   label: '📢 Season Bulletin' },
                  ].map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applySmsTemplate(tpl.id)}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-gold/10 text-gold-dark hover:bg-gold hover:text-white border border-gold/30 transition-colors"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SMS Message Payload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    SMS Message Payload
                  </label>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {dispatchMessage.length} / 160 chars ({Math.ceil(dispatchMessage.length / 160) || 1} credit)
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={dispatchMessage}
                  onChange={e => setDispatchMessage(e.target.value)}
                  placeholder="Type official SMS text message..."
                  className="w-full p-3 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs font-body leading-relaxed outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white resize-none"
                />
              </div>

              {/* Gateway Selection & Telco Route */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between gap-3 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-bold text-neutral-600">Telco Gateway:</span>
                  <select
                    value={dispatchGateway}
                    onChange={e => setDispatchGateway(e.target.value)}
                    className="bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-gold"
                  >
                    <option value="semaphore">Semaphore PH (Official Direct Route)</option>
                    <option value="philsms">PhilSMS Gateway (Failover Route)</option>
                    <option value="twilio">Twilio SMS (Global Numbers)</option>
                  </select>
                </div>
                <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Carrier Ready
                </span>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setComposeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingSms}
                  className="btn-primary py-2 px-5 text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  {sendingSms ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                  <span>{sendingSms ? 'Transmitting...' : 'Dispatch SMS'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. TOOL: SMS LOG DETAILS & AUDIT INSPECTION MODAL ──────────────── */}
      {inspectModalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-body">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-neutral-200 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-gold uppercase tracking-widest">
                  SMS Transmission Audit
                </span>
                <h3 className="font-heading text-base font-bold text-primary mt-0.5">
                  {inspectModalLog.customer ? `${inspectModalLog.customer.first_name || ''} ${inspectModalLog.customer.last_name || ''}`.trim() : 'Studio SMS Dispatch'}
                </h3>
              </div>
              <button
                onClick={() => setInspectModalLog(null)}
                className="p-1.5 text-neutral-400 hover:text-primary rounded-lg hover:bg-neutral-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Message Bubble Preview */}
            <div className="p-4 bg-neutral-900 text-white rounded-2xl border border-neutral-800 space-y-2 shadow-inner">
              <div className="flex items-center justify-between text-[10px] text-neutral-400 border-b border-neutral-800 pb-1.5 font-mono">
                <span>Sender: E-KODAK</span>
                <span>{fmt(inspectModalLog.sent_at || inspectModalLog.created_at)}</span>
              </div>
              <p className="text-xs leading-relaxed font-body text-neutral-100">
                {inspectModalLog.message}
              </p>
              <div className="text-[9.5px] text-neutral-400 text-right pt-1 font-mono">
                {inspectModalLog.message?.length || 0} characters ({Math.ceil((inspectModalLog.message?.length || 1) / 160)} SMS Credit)
              </div>
            </div>

            {/* Dossier Grid */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 grid grid-cols-2 gap-2.5 text-[11px] text-neutral-600">
              <div>
                <span className="text-neutral-400 block text-[10px]">Mobile Phone:</span>
                <span className="font-mono font-bold text-primary">{inspectModalLog.phone_number || '—'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Carrier Network:</span>
                <span className="font-semibold text-blue-700">{detectPhilippineCarrier(inspectModalLog.phone_number)}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Delivery Status:</span>
                <span className="font-semibold text-emerald-700">{inspectModalLog.status || 'SENT'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Booking Reference:</span>
                <span className="font-semibold text-primary">
                  {inspectModalLog.booking?.booking_number ? `#${inspectModalLog.booking.booking_number}` : 'Direct SMS'}
                </span>
              </div>
              <div className="col-span-2 pt-1 border-t border-neutral-200/60">
                <span className="text-neutral-400 block text-[10px]">Provider Transaction ID:</span>
                <span className="font-mono text-[10px] text-neutral-700">{inspectModalLog.provider_message_id || inspectModalLog.id}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 flex-wrap">
              <button
                type="button"
                onClick={() => handleDeleteLog(inspectModalLog.id)}
                className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Delete this record"
              >
                <Trash2 size={13} />
                <span>Delete Log</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(inspectModalLog.message, inspectModalLog.id)}
                  className="px-3.5 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5 transition-all"
                >
                  <Copy size={13} />
                  <span>{copiedId === inspectModalLog.id ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDispatchPhone(inspectModalLog.phone_number || '');
                    setDispatchMessage(inspectModalLog.message || '');
                    setDispatchName(inspectModalLog.customer ? `${inspectModalLog.customer.first_name || ''} ${inspectModalLog.customer.last_name || ''}`.trim() : '');
                    setInspectModalLog(null);
                    setComposeModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-gold/40 bg-gold/10 text-gold-dark hover:bg-gold hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw size={13} />
                  <span>Resend / Retry</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectModalLog(null)}
                  className="btn-primary px-4 py-2 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
