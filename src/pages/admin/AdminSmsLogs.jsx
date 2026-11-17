import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  MessageSquare,
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
  Layers,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CategorizedMetricStrip from '../../components/admin/CategorizedMetricStrip';
import CustomDropdown from '../../components/ui/CustomDropdown';
import SmsGatewayBanner from '../../components/admin/SmsGatewayBanner';
import SmsCustomerDirectory from '../../components/admin/SmsCustomerDirectory';
import SmsInboxFeed from '../../components/admin/SmsInboxFeed';
import { getSmsLogs, deleteSmsLog } from '../../services/adminService';
import {
  getTextBeeConfig,
  saveTextBeeConfigOverride,
  clearTextBeeConfigOverride,
  getTextBeeDeviceStatus,
  getTextBeeMessages,
  getCustomerSmsDirectory,
  subscribeLiveSmsDirectory,
  resolveGatewayMessageContact,
  sendPersonalizedBatchToCustomers,
  interpolateSmsTemplate,
  normalizePhPhone,
  detectPhilippineCarrier,
} from '../../services/textbeeService';

const PAGE_SIZE = 15;

const fmt = (d) => (!d ? '—' : new Date(d).toLocaleString('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}));

function timeAgo(dateString) {
  if (!dateString) return '—';
  const diffSec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

const STATUS_CONFIG = {
  SENT: {
    label: 'Sent',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dotClass: 'bg-emerald-500',
  },
  DELIVERED: {
    label: 'Delivered',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dotClass: 'bg-emerald-500',
  },
  QUEUED: {
    label: 'Queued',
    icon: Clock,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dotClass: 'bg-amber-500',
  },
  PENDING: {
    label: 'Pending',
    icon: Clock,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dotClass: 'bg-amber-500',
  },
  FAILED: {
    label: 'Failed',
    icon: XCircle,
    badgeClass: 'bg-red-50 text-red-800 border-red-200/80',
    dotClass: 'bg-red-500',
  },
};

const QUICK_TEMPLATES = [
  {
    id: 'SHOOT_REMINDER',
    label: 'Shoot reminder',
    text: 'E-KODAK REMINDER: Hi {firstName}, your studio session (#{bookingNumber}) is set for {date} at {time}. Please arrive 15 mins early with your QR pass. See you!',
  },
  {
    id: 'ORDER_READY',
    label: 'Proofs ready',
    text: 'E-KODAK: Hi {firstName}, your edited portraits & soft copies for #{bookingNumber} are now ready! Log in to your E-Kodak client portal to view & download.',
  },
  {
    id: 'PAYMENT_CONFIRMED',
    label: 'Payment verified',
    text: 'E-KODAK: Hi {firstName}, your payment for Booking #{bookingNumber} ({service}) is verified. Thank you for choosing E-Kodak Studios!',
  },
  {
    id: 'BALANCE_REMINDER',
    label: 'Balance notice',
    text: 'E-KODAK: Hi {firstName}, friendly reminder that Booking #{bookingNumber} has a remaining balance of {balance} payable on session day. Thank you!',
  },
  {
    id: 'RESCHEDULE_UPDATE',
    label: 'Schedule update',
    text: 'E-KODAK ADVISORY: Hi {firstName}, your schedule for #{bookingNumber} has been updated to {date} ({time}). Check your client dashboard for details.',
  },
];

export default function AdminSmsLogs() {
  const { user, profile } = useAuth();

  // Workspace Tab
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'inbox' | 'logs'

  // TextBee Device & Cloud Feed State
  const [tbConfig, setTbConfig] = useState(() => getTextBeeConfig());
  const [device, setDevice] = useState(null);
  const [deviceLoading, setDeviceLoading] = useState(true);
  const [deviceError, setDeviceError] = useState(null);
  const [gatewayMessages, setGatewayMessages] = useState([]);
  const [gatewayMessagesLoading, setGatewayMessagesLoading] = useState(true);
  const [gatewayMessagesError, setGatewayMessagesError] = useState(null);

  // Live Current Orders Directory State
  const [contacts, setContacts] = useState([]);
  const [phoneToCustomerMap, setPhoneToCustomerMap] = useState(() => new Map());
  const [directoryStats, setDirectoryStats] = useState({
    totalCustomers: 0,
    reachableCount: 0,
    missingPhoneCount: 0,
    activeBookingPhones: 0,
    unpaidBalanceCount: 0,
  });
  const [directoryLoading, setDirectoryLoading] = useState(true);

  // Composer State (strictly DB-verified order recipients)
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [orderLookupInput, setOrderLookupInput] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingSms, setSendingSms] = useState(false);

  // Supabase Audit Logs State
  const [rows, setRows] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);
  const [inspectModalLog, setInspectModalLog] = useState(null);

  // Gateway Settings Modal State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftApiKey, setDraftApiKey] = useState('');
  const [draftDeviceId, setDraftDeviceId] = useState('');

  // Feedback Banners
  const [toastSuccess, setToastSuccess] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showSuccess = (msg) => {
    setToastError(null);
    setToastSuccess(msg);
    setTimeout(() => setToastSuccess(null), 5000);
  };

  const showError = (msg) => {
    setToastSuccess(null);
    setToastError(msg);
  };

  // Load TextBee Device & Cloud Messages
  const loadGatewayTelemetry = useCallback(async () => {
    setDeviceLoading(true);
    setGatewayMessagesLoading(true);
    const currentCfg = getTextBeeConfig();
    setTbConfig(currentCfg);

    const [devRes, msgRes] = await Promise.all([
      getTextBeeDeviceStatus(),
      getTextBeeMessages({ direction: 'all', limit: 60 }),
    ]);

    if (devRes.success) {
      setDevice(devRes.device);
      setDeviceError(null);
    } else {
      setDevice(null);
      setDeviceError(devRes.error);
    }
    setDeviceLoading(false);

    if (msgRes.success) {
      setGatewayMessages(msgRes.data || []);
      setGatewayMessagesError(null);
    } else {
      setGatewayMessagesError(msgRes.error);
    }
    setGatewayMessagesLoading(false);
  }, []);

  // Load Current Orders with Phone Numbers (live from Supabase)
  const loadCustomerDirectory = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setDirectoryLoading(true);
    const res = await getCustomerSmsDirectory();
    const freshContacts = res.contacts || [];
    setContacts(freshContacts);
    setPhoneToCustomerMap(res.phoneToCustomerMap || new Map());
    setDirectoryStats(res.stats || {
      totalCustomers: 0,
      reachableCount: 0,
      missingPhoneCount: 0,
      activeBookingPhones: 0,
      unpaidBalanceCount: 0,
    });
    setSelectedContactIds((prev) => {
      if (prev.length === 0) return prev;
      const validIds = new Set(freshContacts.map((c) => c.id));
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
    if (!silent) setDirectoryLoading(false);
  }, []);

  // Load Supabase sms_logs Audit Trail
  const loadAuditLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const logsRes = await getSmsLogs({ page: 1, pageSize: 150 });
      setRows(logsRes.data || []);
    } catch (err) {
      console.error('Failed to load SMS logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    loadGatewayTelemetry();
    loadCustomerDirectory();
    loadAuditLogs();
  }, [loadGatewayTelemetry, loadCustomerDirectory, loadAuditLogs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshAll();
    }, 0);
    const handleUpdate = () => loadAuditLogs();
    const handleLiveDirectoryRefresh = () => {
      if (typeof document === 'undefined' || !document.hidden) {
        loadCustomerDirectory({ silent: true });
      }
    };

    window.addEventListener('ekodak:sms_logs_updated', handleUpdate);
    window.addEventListener('focus', handleLiveDirectoryRefresh);

    // Live Supabase realtime + 15s polling while visible so new/updated orders pull automatically
    const unsubscribeOrders = subscribeLiveSmsDirectory(() => {
      loadCustomerDirectory({ silent: true });
    });
    const pollTimer = setInterval(handleLiveDirectoryRefresh, 15000);

    return () => {
      clearTimeout(timer);
      clearInterval(pollTimer);
      window.removeEventListener('ekodak:sms_logs_updated', handleUpdate);
      window.removeEventListener('focus', handleLiveDirectoryRefresh);
      unsubscribeOrders();
    };
  }, [refreshAll, loadAuditLogs, loadCustomerDirectory]);

  // Selected Customer Objects
  const selectedContacts = useMemo(() => {
    const idSet = new Set(selectedContactIds);
    return contacts.filter((c) => idSet.has(c.id));
  }, [contacts, selectedContactIds]);

  const totalRecipientCount = selectedContacts.length;

  // Live Preview of Interpolated Message for First Selected Database Order
  const previewMessage = useMemo(() => {
    if (!messageText.trim() || selectedContacts.length === 0) return '';
    return interpolateSmsTemplate(messageText, selectedContacts[0]);
  }, [messageText, selectedContacts]);

  // Strict DB Order Lookup Helper (never allows arbitrary/non-DB phone numbers)
  const findVerifiedOrderContact = useCallback((rawInput) => {
    const clean = String(rawInput || '').trim();
    if (!clean) return null;
    const strippedBk = clean.replace(/^#/, '').toLowerCase();
    const normalizedPhone = normalizePhPhone(clean);

    return (
      contacts.find((c) => {
        const bk = String(c.latestBooking?.booking_number || '').toLowerCase();
        if (bk && bk === strippedBk) return true;
        if (normalizedPhone && c.normalizedPhone === normalizedPhone) return true;
        if (c.rawPhone && c.rawPhone.toLowerCase() === clean.toLowerCase()) return true;
        if (c.name && c.name.toLowerCase() === clean.toLowerCase()) return true;
        return false;
      }) || null
    );
  }, [contacts]);

  // Selection Handlers
  const handleToggleSelectContact = (id) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleQuickPickCustomer = (contact) => {
    if (!contact?.isValidPhone) {
      showError('Selected order does not have a valid Philippine mobile number in the database.');
      return;
    }
    setSelectedContactIds([contact.id]);
    setActiveTab('compose');
  };

  const handleLookupOrderRecipient = () => {
    const raw = orderLookupInput.trim();
    if (!raw) return;

    const matched = findVerifiedOrderContact(raw);
    if (!matched) {
      showError('No matching order found in the database. SMS is exclusive to verified booking records.');
      return;
    }

    setSelectedContactIds((prev) => (prev.includes(matched.id) ? prev : [...prev, matched.id]));
    setOrderLookupInput('');
    setToastError(null);
  };

  const handleReplyFromInbox = ({ phone, customer }) => {
    const normalized = normalizePhPhone(phone);
    const activeMatch =
      (customer?.id && contacts.find((c) => c.id === customer.id)) ||
      (normalized && contacts.find((c) => c.normalizedPhone === normalized)) ||
      null;

    if (!activeMatch) {
      showError('This number is not linked to any active order in the database.');
      return;
    }

    setSelectedContactIds([activeMatch.id]);
    setActiveTab('compose');
  };

  // Send SMS Handler (strictly exclusive to verified database order records)
  const handleSendSms = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) {
      showError('Please enter an SMS message before sending.');
      return;
    }

    let finalTargets = [...selectedContacts];
    if (orderLookupInput.trim()) {
      const matched = findVerifiedOrderContact(orderLookupInput.trim());
      if (!matched) {
        showError('No matching order found in the database. Clear the lookup field or enter an existing #BK / order mobile.');
        return;
      }
      if (!finalTargets.some((c) => c.id === matched.id)) {
        finalTargets.push(matched);
      }
    }

    if (finalTargets.length === 0) {
      showError('Select at least one current order from the database before sending.');
      return;
    }

    setSendingSms(true);
    setToastError(null);

    try {
      const res = await sendPersonalizedBatchToCustomers({
        customers: finalTargets,
        template: messageText.trim(),
        notificationType: finalTargets.length > 1 ? 'BULK_DISPATCH' : 'MANUAL_DISPATCH',
      });

      const sentTotal = res.sentCount || 0;
      const failedTotal = res.failedCount || 0;
      const lastBatchId = res.smsBatchId || null;

      if (sentTotal > 0) {
        showSuccess(
          `Dispatched ${sentTotal} SMS ${sentTotal === 1 ? 'message' : 'messages'} via TextBee${
            lastBatchId ? ` (Batch: ${lastBatchId})` : ''
          }${failedTotal > 0 ? ` · ${failedTotal} failed` : ''}.`
        );
        setOrderLookupInput('');
        setSelectedContactIds([]);
        setMessageText('');
        loadAuditLogs();
        setTimeout(() => loadGatewayTelemetry(), 1200);
      } else {
        showError(res.error || 'Failed to send SMS via TextBee.');
      }
    } catch (err) {
      showError(err.message || 'Unexpected error sending SMS.');
    } finally {
      setSendingSms(false);
    }
  };

  // Gateway Settings Modal Handlers
  const openGatewaySettings = () => {
    const cfg = getTextBeeConfig();
    setDraftApiKey(cfg.apiKey);
    setDraftDeviceId(cfg.deviceId);
    setSettingsOpen(true);
  };

  const handleSaveGatewaySettings = (e) => {
    e.preventDefault();
    saveTextBeeConfigOverride({ apiKey: draftApiKey, deviceId: draftDeviceId });
    setSettingsOpen(false);
    showSuccess('TextBee gateway configuration updated. Syncing device status...');
    loadGatewayTelemetry();
  };

  const handleResetGatewaySettings = () => {
    clearTextBeeConfigOverride();
    const cfg = getTextBeeConfig();
    setDraftApiKey(cfg.apiKey);
    setDraftDeviceId(cfg.deviceId);
    showSuccess('Restored TextBee credentials from environment configuration.');
    loadGatewayTelemetry();
  };

  // Audit Logs filtered strictly to verified database order/customer records
  const dbMatchedRows = useMemo(() => {
    return rows.filter((r) => {
      if (r.booking_id || r.customer_id) return true;
      const norm = normalizePhPhone(r.phone_number);
      return Boolean(norm && phoneToCustomerMap.has(norm));
    });
  }, [rows, phoneToCustomerMap]);

  // Audit Log Stats & Filtering
  const auditStats = useMemo(() => {
    const total = dbMatchedRows.length;
    const delivered = dbMatchedRows.filter((r) => r.status === 'SENT' || r.status === 'DELIVERED').length;
    const queued = dbMatchedRows.filter((r) => r.status === 'QUEUED' || r.status === 'PENDING').length;
    const failed = dbMatchedRows.filter((r) => r.status === 'FAILED').length;
    return { total, delivered, queued, failed };
  }, [dbMatchedRows]);

  const filteredRows = useMemo(() => {
    return dbMatchedRows.filter((r) => {
      if (statusFilter === 'SENT' && !(r.status === 'SENT' || r.status === 'DELIVERED')) return false;
      if (statusFilter === 'PENDING' && !(r.status === 'PENDING' || r.status === 'QUEUED')) return false;
      if (statusFilter === 'FAILED' && r.status !== 'FAILED') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const cName = r.customer ? `${r.customer.first_name || ''} ${r.customer.last_name || ''}`.toLowerCase() : '';
      const phone = (r.phone_number || '').toLowerCase();
      const msg = (r.message || '').toLowerCase();
      const bNum = (r.booking?.booking_number || '').toLowerCase();
      const provId = (r.provider_message_id || '').toLowerCase();
      return cName.includes(q) || phone.includes(q) || msg.includes(q) || bNum.includes(q) || provId.includes(q);
    });
  }, [dbMatchedRows, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const from = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(from, from + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const handleDeleteLog = async (id) => {
    if (!window.confirm('Are you sure you want to remove this SMS transmission record?')) return;
    await deleteSmsLog(id);
    showSuccess('SMS transmission record removed.');
    if (inspectModalLog?.id === id) setInspectModalLog(null);
    loadAuditLogs();
  };

  const handleCopyText = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert('Copied: ' + text);
    }
  };

  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      showError('No SMS records to export.');
      return;
    }
    const headers = ['ID', 'Status', 'Recipient Name', 'Phone Number', 'Carrier', 'Notification Type', 'Booking Number', 'Message', 'Sent At'];
    const csvLines = [
      headers.join(','),
      ...filteredRows.map((r) => {
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
          escape(r.sent_at || r.created_at),
        ].join(',');
      }),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ekodak-sms-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter TextBee messages strictly to numbers matching verified database order records
  const matchedGatewayMessages = useMemo(() => {
    return gatewayMessages.filter((m) => {
      const { matchedCustomer } = resolveGatewayMessageContact(m, phoneToCustomerMap);
      return Boolean(matchedCustomer);
    });
  }, [gatewayMessages, phoneToCustomerMap]);

  const inboundCount = useMemo(
    () => matchedGatewayMessages.filter((m) => m.direction === 'received' || m.type === 'RECEIVED').length,
    [matchedGatewayMessages]
  );

  const gatewaySentCount = auditStats.delivered;

  return (
    <div className="w-full pb-16 animate-fade-in font-body">
      {/* 1. Luxury Administrative Hero Banner */}
      <AdminHeroBanner
        station="admin"
        userName={profile?.full_name || user?.email?.split('@')[0] || 'Administrator'}
        title="SMS Messaging"
        subtitle="Active order directory, live SIM inbox, and SMS dispatch."
        onRefresh={refreshAll}
        isRefreshing={deviceLoading || directoryLoading || logsLoading}
      />

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-5 mt-2.5 sm:mt-3">
        {/* Live TextBee Paired Phone Telemetry */}
        <SmsGatewayBanner
          device={device}
          loading={deviceLoading}
          error={deviceError}
          isConfigured={tbConfig.isConfigured}
          onRefresh={loadGatewayTelemetry}
          onOpenSettings={openGatewaySettings}
        />

        {/* Toasts */}
        {toastSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
              <span className="font-semibold">{toastSuccess}</span>
            </div>
            <button type="button" onClick={() => setToastSuccess(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {toastError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={17} className="text-rose-600 shrink-0" />
              <span className="font-semibold">{toastError}</span>
            </div>
            <button type="button" onClick={() => setToastError(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* 2. KPI Overview Strip */}
        <CategorizedMetricStrip
          loading={directoryLoading && deviceLoading}
          columns="grid-cols-2 lg:grid-cols-4"
          cards={[
            {
              key: 'detected',
              label: 'CURRENT ORDERS',
              value: directoryStats.reachableCount,
              isActive: activeTab === 'compose',
              onClick: () => setActiveTab('compose'),
            },
            {
              key: 'balance_due',
              label: 'WITH BALANCE',
              value: directoryStats.unpaidBalanceCount ?? contacts.filter((c) => c.hasUnpaidBalance).length,
              isActive: false,
              onClick: () => setActiveTab('compose'),
            },
            {
              key: 'inbound',
              label: 'INBOX',
              value: inboundCount,
              isActive: activeTab === 'inbox',
              onClick: () => setActiveTab('inbox'),
            },
            {
              key: 'sent',
              label: 'SENT',
              value: gatewaySentCount,
              isActive: activeTab === 'logs',
              onClick: () => setActiveTab('logs'),
            },
          ]}
        />

        {/* 3. Workspace Navigation Tabs */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#EAE7E0]/85 border border-neutral-200/60">
            {[
              { id: 'compose', label: 'Compose', badge: null },
              { id: 'inbox', label: 'Inbox', badge: matchedGatewayMessages.length },
              { id: 'logs', label: 'Audit Logs', badge: null },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-8 px-3.5 rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-neutral-900 font-semibold shadow-2xs'
                      : 'text-neutral-600 font-medium hover:text-neutral-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== null && (
                    <span className="px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-200/80 text-neutral-700">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: Current Orders & Compose SMS Unified Card */}
        {activeTab === 'compose' && (
          <div className="rounded-2xl border border-neutral-200/90 bg-white shadow-xs overflow-hidden font-body">
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200/70">
              {/* Left: Live Current Orders */}
              <div className="lg:col-span-5 flex flex-col">
                <SmsCustomerDirectory
                  contacts={contacts}
                  loading={directoryLoading}
                  selectedIds={selectedContactIds}
                  onToggleSelect={handleToggleSelectContact}
                  onSelectMany={setSelectedContactIds}
                  onClearSelection={() => setSelectedContactIds([])}
                  onQuickPickCustomer={handleQuickPickCustomer}
                  embedded
                />
              </div>

              {/* Right: Compose SMS */}
              <div className="lg:col-span-7 flex flex-col">
                <form
                  onSubmit={handleSendSms}
                  className="p-5 sm:p-6 space-y-5 font-body flex-1 flex flex-col"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#B45309] text-white flex items-center justify-center shrink-0">
                      <Send size={15} />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                      Compose SMS
                    </h3>
                  </div>

                  {/* Recipients */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      TO
                    </label>

                    {selectedContacts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 max-h-28 overflow-y-auto">
                        {selectedContacts.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-xs font-medium text-neutral-800 shadow-2xs"
                          >
                            <Users size={11} className="text-[#B45309]" />
                            <span>{c.name}</span>
                            {c.latestBooking?.booking_number && (
                              <span className="text-[11px] text-neutral-400">#{c.latestBooking.booking_number}</span>
                            )}
                            <span className="font-mono text-[11px] text-emerald-700">{c.normalizedPhone}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleSelectContact(c.id)}
                              className="text-neutral-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={orderLookupInput}
                        onChange={(e) => setOrderLookupInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLookupOrderRecipient();
                          }
                        }}
                        placeholder="Match #BK or order mobile (DB only)"
                        className="flex-1 h-10 px-3.5 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#B45309] focus:ring-2 focus:ring-amber-600/15"
                      />
                      <button
                        type="button"
                        onClick={handleLookupOrderRecipient}
                        className="h-10 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Quick Templates */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      TEMPLATES
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {QUICK_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => setMessageText(tpl.text)}
                          className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 border border-neutral-200 transition-colors cursor-pointer"
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Textarea */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                        MESSAGE
                      </label>
                      <span className="text-[11px] text-neutral-500 tabular-nums">
                        {messageText.length} chars
                        {messageText.length > 160 ? ` · ${Math.ceil(messageText.length / 160)} seg` : ''}
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Write your message..."
                      className="w-full p-3.5 rounded-xl bg-white border border-neutral-200 text-xs sm:text-sm leading-relaxed text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#B45309] focus:ring-2 focus:ring-amber-600/15 resize-y"
                    />
                  </div>

                  {/* Live Personalized Preview */}
                  {previewMessage && (
                    <div className="p-3.5 rounded-xl bg-neutral-900 text-neutral-100 border border-neutral-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span className="font-semibold text-amber-400">
                          Preview{selectedContacts[0] ? ` · ${selectedContacts[0].name}` : ''}
                        </span>
                        <span className="font-mono">{previewMessage.length} chars</span>
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{previewMessage}</p>
                    </div>
                  )}

                  {/* Send Button Row */}
                  <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
                    <button
                      type="submit"
                      disabled={sendingSms || !tbConfig.isConfigured}
                      className="h-10 px-5 rounded-xl bg-[#B45309] hover:bg-[#92400E] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
                    >
                      {sendingSms ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                      <span>
                        {sendingSms
                          ? 'Sending...'
                          : `Send SMS${totalRecipientCount > 0 ? ` (${totalRecipientCount})` : ''}`}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Live Order-Matched TextBee Inbox & Feed */}
        {activeTab === 'inbox' && (
          <SmsInboxFeed
            messages={matchedGatewayMessages}
            loading={gatewayMessagesLoading}
            error={gatewayMessagesError}
            phoneToCustomerMap={phoneToCustomerMap}
            onRefresh={loadGatewayTelemetry}
            onReply={handleReplyFromInbox}
          />
        )}

        {/* TAB 3: Studio SMS Audit Logs (Supabase sms_logs) */}
        {activeTab === 'logs' && (
          <div className="rounded-2xl border border-neutral-200/90 bg-white shadow-xs overflow-hidden font-body">

            {/* Header Controls */}
            <div className="p-4 sm:p-5 border-b border-neutral-100 bg-white space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-sm shrink-0">
                    <MessageSquare size={22} />
                  </div>
                  <div>
                    <h3 className="font-heading text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                      SMS Audit
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {filteredRows.length} {filteredRows.length === 1 ? 'record' : 'records'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="h-9 px-3.5 text-xs font-bold flex items-center gap-1.5 border border-neutral-200/80 hover:border-emerald-500/60 rounded-xl bg-white hover:bg-emerald-50/50 text-neutral-700 hover:text-emerald-900 shadow-2xs transition-all cursor-pointer"
                  >
                    <Download size={14} className="text-emerald-600" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('compose')}
                    className="h-9 px-3.5 text-xs font-bold flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-[#c9a96e] to-amber-600 hover:brightness-105 text-neutral-900 shadow-xs transition-all cursor-pointer"
                  >
                    <Send size={14} />
                    <span>Compose SMS</span>
                  </button>
                  <button
                    type="button"
                    onClick={loadAuditLogs}
                    disabled={logsLoading}
                    className="w-9 h-9 flex items-center justify-center border border-neutral-200/80 hover:border-amber-400/60 rounded-xl bg-white hover:bg-amber-50/40 transition-colors disabled:opacity-50 text-neutral-600 cursor-pointer shadow-2xs"
                    title="Refresh SMS Audit Logs"
                  >
                    <RefreshCw size={14} className={logsLoading ? 'animate-spin text-amber-600' : 'text-neutral-500'} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                <div className="relative flex-1 min-w-[220px]">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search phone, name, #BK, or message..."
                    className="w-full h-9 pl-9 pr-8 bg-neutral-50/80 hover:bg-neutral-100/60 focus:bg-white rounded-xl text-xs sm:text-sm font-body border border-neutral-200/80 focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 outline-none transition-all shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="w-full sm:w-64 shrink-0">
                  <CustomDropdown
                    value={statusFilter}
                    onChange={(val) => {
                      setStatusFilter(val);
                      setPage(1);
                    }}
                    options={[
                      { value: 'ALL', label: `All Logs (${dbMatchedRows.length})`, icon: Layers },
                      { value: 'SENT', label: `Sent / Delivered (${auditStats.delivered})`, icon: CheckCircle2 },
                      { value: 'PENDING', label: `Queued (${auditStats.queued})`, icon: Clock },
                      { value: 'FAILED', label: `Failed (${auditStats.failed})`, icon: XCircle },
                    ]}
                    placeholder="Filter Status"
                    icon={Layers}
                    className="w-full text-xs sm:text-sm"
                    popoverWidth="w-full min-w-[240px]"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            {logsLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-neutral-100/70 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 border border-amber-200">
                  <MessageSquare size={24} />
                </div>
                <h3 className="font-heading text-lg font-bold text-neutral-900">
                  {rows.length === 0 ? 'No SMS Dispatches Logged Yet' : 'No Logs Match Your Filter'}
                </h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
                  Send your first message from the Compose &amp; Directory tab to populate your studio SMS audit trail.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm font-body border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#faf7f2]/95 border-b border-[#c9a96e]/25">
                    <tr className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Recipient &amp; Mobile</th>
                      <th className="px-4 py-3.5 hidden md:table-cell">Carrier &amp; Gateway</th>
                      <th className="px-4 py-3.5 hidden lg:table-cell">Booking Context</th>
                      <th className="px-4 py-3.5">Message</th>
                      <th className="px-4 py-3.5 hidden sm:table-cell">Sent Time</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {paginatedRows.map((r) => {
                      const statusConf = STATUS_CONFIG[r.status] || STATUS_CONFIG.SENT;
                      const StatusIcon = statusConf.icon;
                      const matchedByPhone = phoneToCustomerMap.get(normalizePhPhone(r.phone_number));
                      const cName = r.customer
                        ? `${r.customer.first_name || ''} ${r.customer.last_name || ''}`.trim()
                        : matchedByPhone?.name || 'Studio Contact';
                      const carrier = detectPhilippineCarrier(r.phone_number);
                      const isCopied = copiedId === r.id;

                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-neutral-50/60 transition-colors cursor-pointer"
                          onClick={() => setInspectModalLog(r)}
                        >
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${statusConf.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dotClass}`} />
                              <StatusIcon size={11} />
                              <span>{statusConf.label}</span>
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-bold text-primary truncate max-w-[160px]">{cName}</div>
                            <div className="font-mono text-xs text-neutral-500">{r.phone_number || 'No phone'}</div>
                          </td>

                          <td className="px-4 py-3.5 hidden md:table-cell whitespace-nowrap">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80">
                              {carrier}
                            </span>
                            <div className="text-[11px] text-neutral-400 mt-0.5">
                              {r.provider_message_id?.split('_')[0] || 'TEXTBEE'}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 hidden lg:table-cell whitespace-nowrap">
                            {r.booking?.booking_number ? (
                              <span className="font-mono text-xs font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded border border-neutral-200">
                                #{r.booking.booking_number}
                              </span>
                            ) : (
                              <span className="text-neutral-400 text-xs">Direct SMS</span>
                            )}
                            <div className="text-[11px] text-neutral-400 mt-0.5">
                              {r.notification_type?.replace(/_/g, ' ') || 'DISPATCH'}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 max-w-xs sm:max-w-sm">
                            <p className="text-neutral-700 line-clamp-2 leading-relaxed">{r.message}</p>
                          </td>

                          <td className="px-4 py-3.5 hidden sm:table-cell whitespace-nowrap">
                            <div className="text-neutral-700 font-medium">{timeAgo(r.sent_at || r.created_at)}</div>
                            <div className="text-xs text-neutral-400">{fmt(r.sent_at || r.created_at)}</div>
                          </td>

                          <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleCopyText(r.message, r.id)}
                                className="p-1.5 text-neutral-400 hover:text-primary hover:bg-neutral-100 rounded-lg border border-neutral-200/80 cursor-pointer"
                                title="Copy SMS Text"
                              >
                                {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setInspectModalLog(r)}
                                className="p-1.5 text-neutral-500 hover:text-primary hover:bg-neutral-100 rounded-lg border border-neutral-200/80 cursor-pointer"
                                title="Inspect Details"
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLog(r.id)}
                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-neutral-200 cursor-pointer"
                                title="Delete Log"
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200/80 text-xs text-neutral-500 bg-neutral-50/50">
                <span>
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({filteredRows.length} entries)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft size={13} />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    Next
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gateway Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-neutral-200 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-gold uppercase tracking-widest">TextBee Android Gateway</span>
                <h3 className="font-heading text-lg font-bold text-neutral-900">Gateway Credentials</h3>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveGatewaySettings} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  TextBee API Key
                </label>
                <input
                  type="text"
                  required
                  value={draftApiKey}
                  onChange={(e) => setDraftApiKey(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-mono outline-none focus:bg-white focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Device ID
                </label>
                <input
                  type="text"
                  value={draftDeviceId}
                  onChange={(e) => setDraftDeviceId(e.target.value)}
                  placeholder="Optional (uses default paired device if blank)"
                  className="w-full h-10 px-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-mono outline-none focus:bg-white focus:border-gold"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={handleResetGatewaySettings}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 underline cursor-pointer"
                >
                  Reset to .env default
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="h-9 px-3.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-4 rounded-xl bg-neutral-900 text-white text-xs font-bold cursor-pointer"
                  >
                    Save &amp; Sync
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Log Modal */}
      {inspectModalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-neutral-200 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-xs font-bold text-gold uppercase tracking-widest">SMS Transmission Audit</span>
                <h3 className="font-heading text-base font-bold text-primary mt-0.5">
                  {inspectModalLog.customer
                    ? `${inspectModalLog.customer.first_name || ''} ${inspectModalLog.customer.last_name || ''}`.trim()
                    : 'Studio SMS Dispatch'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalLog(null)}
                className="p-1.5 text-neutral-400 hover:text-primary rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 bg-neutral-900 text-white rounded-2xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-neutral-800 pb-1.5 font-mono">
                <span>Gateway: TextBee</span>
                <span>{fmt(inspectModalLog.sent_at || inspectModalLog.created_at)}</span>
              </div>
              <p className="text-xs leading-relaxed text-neutral-100 whitespace-pre-wrap">{inspectModalLog.message}</p>
            </div>

            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 grid grid-cols-2 gap-2.5 text-xs text-neutral-600">
              <div>
                <span className="text-neutral-400 block">Mobile Phone:</span>
                <span className="font-mono font-bold text-primary">{inspectModalLog.phone_number || '—'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Carrier Network:</span>
                <span className="font-semibold text-blue-700">{detectPhilippineCarrier(inspectModalLog.phone_number)}</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Status:</span>
                <span className="font-semibold text-emerald-700">{inspectModalLog.status || 'SENT'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Booking Reference:</span>
                <span className="font-semibold text-primary">
                  {inspectModalLog.booking?.booking_number ? `#${inspectModalLog.booking.booking_number}` : 'Direct SMS'}
                </span>
              </div>
              {inspectModalLog.error_message && (
                <div className="col-span-2 text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200">
                  Error: {inspectModalLog.error_message}
                </div>
              )}
              <div className="col-span-2 pt-1 border-t border-neutral-200/60">
                <span className="text-neutral-400 block">Provider Batch / Reference ID:</span>
                <span className="font-mono text-xs text-neutral-700">{inspectModalLog.provider_message_id || inspectModalLog.id}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 flex-wrap">
              <button
                type="button"
                onClick={() => handleDeleteLog(inspectModalLog.id)}
                className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const norm = normalizePhPhone(inspectModalLog.phone_number);
                    const matchedOrder =
                      (inspectModalLog.booking_id &&
                        contacts.find((c) => c.bookingId === inspectModalLog.booking_id)) ||
                      (norm && contacts.find((c) => c.normalizedPhone === norm)) ||
                      null;

                    setInspectModalLog(null);
                    if (!matchedOrder) {
                      showError('Cannot resend: this record is no longer an active order in the database.');
                      return;
                    }
                    setSelectedContactIds([matchedOrder.id]);
                    setMessageText(inspectModalLog.message || '');
                    setActiveTab('compose');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-gold/40 bg-gold/10 text-gold-dark hover:bg-gold hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Resend</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectModalLog(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold cursor-pointer"
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
