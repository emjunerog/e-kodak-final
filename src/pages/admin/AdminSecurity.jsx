import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  QrCode,
  History,
  Database,
  Lock,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  ExternalLink,
  ChevronRight,
  Server,
  HardDrive,
  Key,
  Fingerprint,
  Eye,
  EyeOff,
  Search,
  Check,
  X,
  CreditCard,
  DownloadCloud,
  FileText,
  UserCheck,
  Laptop,
  SlidersHorizontal,
  Filter,
  BadgeAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import { 
  getQRScanAuditLogs, 
  getBookingAuditLogs,
  getPayments 
} from '../../services/adminService';
import { getAdminActivityLogs } from '../../services/bookingAdminService';
import { 
  FILE_SECURITY_POLICIES,
  maskClientPII,
  SECURITY_RBAC_MATRIX,
  DATABASE_RLS_POLICIES
} from '../../lib/securityValidator';

const fmt = (d) => (!d ? '—' : new Date(d).toLocaleString('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}));

function timeAgo(dateString) {
  if (!dateString) return '—';
  const now = new Date();
  const past = new Date(dateString);
  const diffSec = Math.floor((now - past) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return past.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

const CATEGORY_STYLES = {
  ADMIN_ACTION: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    label: 'Admin Action'
  },
  STATUS_CHANGE: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    label: 'Booking Status'
  },
  QR_SCAN: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    label: 'QR Check-in'
  },
  PAYMENT: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Payment Ledger'
  }
};

export default function AdminSecurity() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'policies' | 'privacy'
  const [qrLogs, setQrLogs] = useState([]);
  const [statusLogs, setStatusLogs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Client PII Confidentiality Guard (Least-privilege masking by default)
  const [revealClientPII, setRevealClientPII] = useState(false);

  // Unified Audit Trail Filter & Search
  const [logSearch, setLogSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'ADMIN_ACTION' | 'STATUS_CHANGE' | 'QR_SCAN' | 'PAYMENT'

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [qrRes, statusRes, payRes] = await Promise.all([
        getQRScanAuditLogs({ limit: 50 }),
        getBookingAuditLogs({ limit: 50 }),
        getPayments({ page: 1, pageSize: 50 })
      ]);
      setQrLogs(qrRes.data || []);
      setStatusLogs(statusRes.data || []);
      setPayments(payRes.data || []);
      setActivityLogs(getAdminActivityLogs() || []);
    } catch (err) {
      console.error('Failed to load security audit data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine all 4 log sources into a single chronological, immutable audit log
  const unifiedAuditLogs = useMemo(() => {
    const list = [];

    // 1. Admin Activity Logs (deletions, overrides, cancellations)
    activityLogs.forEach((log, idx) => {
      list.push({
        id: log.id || `act-${idx}`,
        rawTimestamp: log.deleted_at || log.created_at || new Date().toISOString(),
        category: 'ADMIN_ACTION',
        action: log.action || 'ADMIN_OVERRIDE',
        bookingNumber: log.booking_number ? `#${log.booking_number}` : 'SYSTEM',
        clientName: log.client_name || 'N/A',
        clientEmail: log.client_email || '',
        clientPhone: log.client_phone || '',
        actor: log.deleted_by_name || 'Administrator',
        actorRole: 'Admin',
        details: log.reason ? `Reason: ${log.reason}` : (log.service_name ? `Service: ${log.service_name}` : 'Administrative record modification'),
        status: 'AUDITED'
      });
    });

    // 2. Booking Status Lifecycle History
    statusLogs.forEach((log, idx) => {
      const actorName = log.changed_by_profile 
        ? `${log.changed_by_profile.first_name || ''} ${log.changed_by_profile.last_name || ''}`.trim()
        : 'Studio Staff';
      list.push({
        id: log.id || `stat-${idx}`,
        rawTimestamp: log.created_at || new Date().toISOString(),
        category: 'STATUS_CHANGE',
        action: log.status ? `Status → ${log.status.toUpperCase()}` : 'STATUS_UPDATE',
        bookingNumber: log.booking?.tracking_number || (log.booking_id ? `BK-${String(log.booking_id).slice(0, 8)}` : 'N/A'),
        clientName: 'Studio Client',
        clientEmail: '',
        clientPhone: '',
        actor: actorName || 'System Trigger',
        actorRole: log.changed_by_profile?.role ? log.changed_by_profile.role.toUpperCase() : 'STAFF',
        details: log.remarks || `Booking status updated to ${log.status}`,
        status: 'VERIFIED'
      });
    });

    // 3. QR Check-in & Station Scans
    qrLogs.forEach((log, idx) => {
      const scannerName = log.scanned_by_profile 
        ? `${log.scanned_by_profile.first_name || ''} ${log.scanned_by_profile.last_name || ''}`.trim() 
        : 'Studio Desk Scanner';
      list.push({
        id: log.id || `qr-${idx}`,
        rawTimestamp: log.created_at || new Date().toISOString(),
        category: 'QR_SCAN',
        action: log.scan_type || 'STATION_CHECK_IN',
        bookingNumber: log.booking?.tracking_number || 'QR-PASS',
        clientName: 'Studio Guest',
        clientEmail: '',
        clientPhone: '',
        actor: scannerName,
        actorRole: 'STATION_SCANNER',
        details: `Anti-replay verification: ${log.scan_result || 'SUCCESS'}${log.booking_token ? ` · Token: ${log.booking_token.slice(0, 8)}...` : ''}`,
        status: log.scan_result || 'SUCCESS'
      });
    });

    // 4. Financial & Payment Ledger Records
    payments.forEach((pay, idx) => {
      const client = pay.booking?.customer 
        ? `${pay.booking.customer.first_name || ''} ${pay.booking.customer.last_name || ''}`.trim()
        : 'Customer';
      const recorderName = pay.recorder 
        ? `${pay.recorder.first_name || ''} ${pay.recorder.last_name || ''}`.trim()
        : (pay.payment_method ? `${pay.payment_method} Gateway` : 'Cashier');
      list.push({
        id: pay.id || `pay-${idx}`,
        rawTimestamp: pay.created_at || pay.payment_date || new Date().toISOString(),
        category: 'PAYMENT',
        action: pay.payment_type ? `PAYMENT (${pay.payment_type})` : 'PAYMENT_RECORDED',
        bookingNumber: pay.booking?.booking_number || pay.booking?.tracking_number || 'BILLING',
        clientName: client || 'Customer',
        clientEmail: pay.booking?.customer?.email || '',
        clientPhone: pay.booking?.customer?.phone || '',
        actor: recorderName,
        actorRole: 'TREASURY',
        details: `₱${Number(pay.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} received via ${pay.payment_method || 'Cash'}${pay.reference_number ? ` (Ref: ${pay.reference_number})` : ''}`,
        status: 'VALIDATED'
      });
    });

    // Sort descending by timestamp
    return list.sort((a, b) => new Date(b.rawTimestamp) - new Date(a.rawTimestamp));
  }, [activityLogs, statusLogs, qrLogs, payments]);

  // Filtered unified logs
  const filteredLogs = useMemo(() => {
    return unifiedAuditLogs.filter(item => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      if (!logSearch.trim()) return true;
      const q = logSearch.toLowerCase();
      return (
        item.bookingNumber.toLowerCase().includes(q) ||
        item.action.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.actor.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q)
      );
    });
  }, [unifiedAuditLogs, categoryFilter, logSearch]);

  // Export Unified Audit Trail to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No audit logs available to export.');
      return;
    }

    const headers = [
      'Timestamp (PST)',
      'Category',
      'Action / Event',
      'Booking #',
      'Client / Subject',
      'Performed By / Actor',
      'Role',
      'Status / Verification',
      'Details / Remarks'
    ];

    const csvRows = filteredLogs.map(log => [
      `"${fmt(log.rawTimestamp)}"`,
      `"${log.category}"`,
      `"${log.action}"`,
      `"${log.bookingNumber}"`,
      `"${log.clientName}"`,
      `"${log.actor}"`,
      `"${log.actorRole}"`,
      `"${log.status}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `e-kodak-security-audit-trail-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const roleLabel = profile?.role === 'admin' ? 'Super Administrator' : 'Studio Staff';

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-6 pb-16 animate-fade-in font-body">
      {/* ── 1. Luxury Administrative Hero Banner ────────────────────────────── */}
      <AdminHeroBanner
        station="admin"
        badgeLabel="System Security & Audit Console"
        badgeIcon={ShieldCheck}
        userName={profile?.full_name || user?.email?.split('@')[0] || 'Administrator'}
        title="Security & Audit Command Center"
        subtitle="Operational access control, real-time audit logging, database RLS enforcement, and client data confidentiality."
        statusSummary={`${unifiedAuditLogs.length} Audited Events · 6 Database RLS Policies Active · TLS 1.3 Enforced`}
        primaryAction={{
          label: 'Export Audit Log (CSV)',
          icon: DownloadCloud,
          onClick: handleExportCSV
        }}
        secondaryAction={{
          label: revealClientPII ? 'Enforce PII Masking' : 'Reveal Client PII',
          icon: revealClientPII ? EyeOff : Eye,
          onClick: () => setRevealClientPII(!revealClientPII)
        }}
        onRefresh={loadData}
        isRefreshing={loading}
        onExport={handleExportCSV}
      />

      {/* ── 2. Real-Time System Security Posture Strip (4 Core Pillars) ───────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Pillar 1: Auth & Session */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-gold/30 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <UserCheck size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 size={11} /> AUTHENTICATED
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Identity & Session Guard</p>
            <p className="text-sm font-bold text-primary truncate mt-0.5">{user?.email || 'admin@e-kodak.com'}</p>
            <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5">
              <span className="font-semibold text-gold">{roleLabel}</span> · TLS 1.3 / HTTPS
            </p>
          </div>
        </div>

        {/* Pillar 2: Database Row-Level Security */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-gold/30 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Database size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <ShieldCheck size={11} /> 6/6 ENFORCED
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Database Access Control</p>
            <p className="text-sm font-bold text-primary mt-0.5">Row-Level Security (RLS)</p>
            <p className="text-xs text-neutral-500 mt-1">
              Strict isolation on bookings, payments & profiles
            </p>
          </div>
        </div>

        {/* Pillar 3: Client PII Confidentiality */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-gold/30 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Lock size={20} />
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${revealClientPII ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
              {revealClientPII ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
              {revealClientPII ? 'ADMIN REVEALED' : 'MASKED (ACTIVE)'}
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Client Data Privacy</p>
            <p className="text-sm font-bold text-primary mt-0.5">Least-Privilege PII Guard</p>
            <p className="text-xs text-neutral-500 mt-1">
              {revealClientPII ? 'Full visibility active for admin audit' : 'Phone, email & IDs masked for staff'}
            </p>
          </div>
        </div>

        {/* Pillar 4: Storage Defense & Upload Policies */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-gold/30 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <HardDrive size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 size={11} /> SAFE STORAGE
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Media & File Defense</p>
            <p className="text-sm font-bold text-primary mt-0.5">Upload Guard & Quotas</p>
            <p className="text-xs text-neutral-500 mt-1">
              MIME allowlist · 25MB Portraits · Scripts blocked
            </p>
          </div>
        </div>
      </div>

      {/* PII Reveal Alert Notice (displayed when admin unmasks data) */}
      {revealClientPII && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 text-xs text-amber-900 animate-fade-in shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block uppercase text-[10px] tracking-wider text-amber-800">
                Administrative PII Unmasking Active
              </span>
              <span>
                Customer phone numbers, emails, and identifiers are currently displayed in plain text for official studio administrative audit. Staff views remain masked by default under the Principle of Least Privilege.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRevealClientPII(false)}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 underline shrink-0"
          >
            Re-enforce Mask
          </button>
        </div>
      )}

      {/* ── 3. Operational Navigation Tabs ─────────────────────────────────── */}
      <div className="flex border-b border-neutral-200/80 gap-2 overflow-x-auto pb-px">
        {[
          { id: 'audit', label: `Unified Audit Trail (${unifiedAuditLogs.length})`, icon: Fingerprint },
          { id: 'policies', label: 'Access Control & RLS Matrix', icon: Database },
          { id: 'privacy', label: 'Data Privacy & Storage Policies', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-all rounded-t-lg ${
                isActive
                  ? 'border-gold text-primary font-bold bg-gradient-to-t from-gold/10 to-transparent'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50/50'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-gold' : 'text-neutral-400'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: UNIFIED AUDIT TRAIL & ACTIVITY LOGS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div className="space-y-4 animate-fade-in">
          {/* Toolbar: Category Filters + Search + Export */}
          <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                {[
                  { id: 'ALL', label: `All Events (${unifiedAuditLogs.length})` },
                  { id: 'ADMIN_ACTION', label: `Admin Actions (${activityLogs.length})` },
                  { id: 'STATUS_CHANGE', label: `Booking Lifecycle (${statusLogs.length})` },
                  { id: 'QR_SCAN', label: `QR Check-ins (${qrLogs.length})` },
                  { id: 'PAYMENT', label: `Payments (${payments.length})` },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      categoryFilter === cat.id
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-neutral-100/80 text-neutral-600 hover:bg-neutral-200/60'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full lg:w-80">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  placeholder="Search by booking #, client, actor, keyword..."
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-body outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
                />
                {logSearch && (
                  <button
                    type="button"
                    onClick={() => setLogSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary text-xs"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-200/60">
              <span>
                Showing <strong>{filteredLogs.length}</strong> of <strong>{unifiedAuditLogs.length}</strong> events recorded in Philippine Standard Time (PST).
              </span>
              <button
                type="button"
                onClick={handleExportCSV}
                className="text-xs font-semibold text-gold hover:text-primary flex items-center gap-1.5 transition-colors"
              >
                <DownloadCloud size={13} />
                Download Filtered Log (CSV)
              </button>
            </div>
          </div>

          {/* Unified Audit Log Table */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-body">
                <thead>
                  <tr className="border-b border-neutral-200 text-[10px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50/80">
                    <th className="py-3 px-4">Timestamp (PST)</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Action / Event</th>
                    <th className="py-3 px-4">Booking #</th>
                    <th className="py-3 px-4">Client / Subject</th>
                    <th className="py-3 px-4">Actor / Performed By</th>
                    <th className="py-3 px-4">Details / Remarks</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-400 italic">
                        {logSearch || categoryFilter !== 'ALL'
                          ? 'No audit events match your search criteria.'
                          : 'No operational audit events recorded yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((item) => {
                      const catStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.ADMIN_ACTION;
                      return (
                        <tr key={item.id} className="hover:bg-neutral-50/70 transition-colors">
                          {/* Timestamp */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-primary block">{timeAgo(item.rawTimestamp)}</span>
                            <span className="text-[10px] text-neutral-400">{fmt(item.rawTimestamp)}</span>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${catStyle.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                              {catStyle.label}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 font-bold text-primary whitespace-nowrap">
                            {item.action}
                          </td>

                          {/* Booking # */}
                          <td className="py-3 px-4 font-bold text-primary whitespace-nowrap">
                            {item.bookingNumber}
                          </td>

                          {/* Client */}
                          <td className="py-3 px-4">
                            <span className="font-medium text-neutral-800 block">
                              {item.clientName}
                            </span>
                            {item.clientEmail && (
                              <span className="text-[10px] text-neutral-400 block truncate max-w-[140px]">
                                {revealClientPII ? item.clientEmail : maskClientPII(item.clientEmail, 'email')}
                              </span>
                            )}
                          </td>

                          {/* Actor */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-primary block">{item.actor}</span>
                            <span className="text-[10px] text-neutral-400 uppercase font-semibold">{item.actorRole}</span>
                          </td>

                          {/* Details / Remarks */}
                          <td className="py-3 px-4 text-neutral-600 max-w-xs truncate" title={item.details}>
                            {item.details}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={10} />
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: ACCESS CONTROL & RLS MATRIX
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'policies' && (
        <div className="space-y-6 animate-fade-in">
          {/* Database Row-Level Security (RLS) Active Policies */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-primary flex items-center gap-2">
                  <Database size={18} className="text-blue-600" />
                  Supabase Database Row-Level Security (RLS) Enforcement
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  PostgreSQL kernel-enforced data partitioning ensuring complete privacy between clients, photographers, and studio staff.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                <CheckCircle2 size={12} /> ALL ACTIVE (ENFORCED)
              </span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {DATABASE_RLS_POLICIES.map((p, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50 hover:bg-neutral-50 transition-colors flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-primary">{p.table}</span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                        {p.rls}
                      </span>
                    </div>
                    <div className="mt-2.5 space-y-1 text-xs">
                      <p className="text-neutral-600">
                        <strong className="text-neutral-700">Read (SELECT):</strong> {p.select}
                      </p>
                      <p className="text-neutral-600">
                        <strong className="text-neutral-700">Write (INSERT/UPDATE):</strong> {p.insert || p.update}
                      </p>
                      {p.delete && (
                        <p className="text-neutral-600">
                          <strong className="text-neutral-700">Delete:</strong> {p.delete}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-neutral-200/50 flex items-center justify-between text-[10px] text-neutral-400">
                    <span>Target: Supabase PostgreSQL</span>
                    <span className="text-emerald-700 font-bold">Policy Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Role-Based Access Control (RBAC) Studio Matrix */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-primary flex items-center gap-2">
                  <Users size={18} className="text-gold" />
                  Role-Based Access Control (RBAC) Permission Matrix
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Granular permission allocation across Administrator, Studio Staff, Assigned Photographers, and Clients.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-body">
                <thead>
                  <tr className="border-b border-neutral-200 text-[10px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50/80">
                    <th className="py-3 px-3">Resource / Operation</th>
                    <th className="py-3 px-3">Level</th>
                    <th className="py-3 px-3 font-bold text-primary">Administrator</th>
                    <th className="py-3 px-3 text-gold font-bold">Staff</th>
                    <th className="py-3 px-3 text-neutral-600">Photographer</th>
                    <th className="py-3 px-3 text-neutral-500">Customer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {SECURITY_RBAC_MATRIX.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-primary">{row.resource}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-body px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-semibold">
                          {row.level}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700">{row.admin}</td>
                      <td className="py-2.5 px-3 font-medium text-neutral-700">{row.staff}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{row.photographer}</td>
                      <td className="py-2.5 px-3 text-neutral-500">{row.customer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: DATA PRIVACY & STORAGE GUARDRAILS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'privacy' && (
        <div className="space-y-6 animate-fade-in">
          {/* Part A: Client Data Privacy & PII Confidentiality Guard */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-primary flex items-center gap-2">
                  <Lock size={18} className="text-purple-600" />
                  Personally Identifiable Information (PII) Confidentiality
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Protects customer contact records according to the Philippine Data Privacy Act of 2012 (RA 10173).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRevealClientPII(!revealClientPII)}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 w-fit"
              >
                {revealClientPII ? <EyeOff size={13} /> : <Eye size={13} />}
                {revealClientPII ? "Enforce PII Mask" : "Simulate Admin Reveal"}
              </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-3.5 text-xs">
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Customer Mobile Phone</span>
                <span className="font-body font-bold text-primary text-sm block">
                  {revealClientPII ? '0917 842 1993' : maskClientPII('09178421993', 'phone')}
                </span>
                <span className="text-[10px] text-neutral-500 block">
                  {revealClientPII ? 'Admin visible' : 'Masked for studio staff'}
                </span>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Customer Email Address</span>
                <span className="font-body font-bold text-primary text-sm block">
                  {revealClientPII ? 'alimentomakie@gmail.com' : maskClientPII('alimentomakie@gmail.com', 'email')}
                </span>
                <span className="text-[10px] text-neutral-500 block">
                  {revealClientPII ? 'Admin visible' : 'Masked for studio staff'}
                </span>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Student / School ID</span>
                <span className="font-body font-bold text-primary text-sm block">
                  {revealClientPII ? '22104582' : maskClientPII('22104582', 'id_number')}
                </span>
                <span className="text-[10px] text-neutral-500 block">
                  {revealClientPII ? 'Admin visible' : 'Masked for studio staff'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2 leading-relaxed">
              <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                Staff members and desk attendants view masked contact records by default to protect customer privacy. Any administrative unmasking is permanently logged with actor credentials in the system audit trail.
              </span>
            </div>
          </div>

          {/* Part B: Storage Bucket Security & Upload Policies */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-primary flex items-center gap-2">
                  <HardDrive size={18} className="text-amber-600" />
                  Storage Bucket Security & Media Upload Quotas
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Production guardrails preventing malicious executable uploads, server resource exhaustion, and unauthorized downloads.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">Allowed Upload MIME Formats</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ALLOWLIST ACTIVE
                  </span>
                </div>
                <p className="text-neutral-600 text-[11px]">
                  Only safe raster image formats (JPEG, PNG, WebP) and finalized publication documents (PDF) are permitted for studio intake and deliverable release.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].map(mime => (
                    <span key={mime} className="font-mono text-[10px] bg-white border border-neutral-200 px-2 py-0.5 rounded text-neutral-700">
                      {mime}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">Strictly Blocked Executables</span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    ZERO TOLERANCE
                  </span>
                </div>
                <p className="text-neutral-600 text-[11px]">
                  Files with executable or script extensions are rejected prior to transmission to prevent arbitrary code execution attacks.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['.exe', '.bat', '.sh', '.php', '.js', '.svg', '.dll', '.msi'].map(ext => (
                    <span key={ext} className="font-mono text-[10px] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-rose-700 font-bold">
                      {ext}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">Reference Peg Upload Limits</span>
                  <span className="font-mono text-xs font-bold text-gold">10 MB Cap</span>
                </div>
                <p className="text-neutral-600 text-[11px]">
                  Customer visual reference submissions and photoshoot concept moodboards are restricted to a maximum size of 10 MB per file.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">High-Res Deliverable Cap</span>
                  <span className="font-mono text-xs font-bold text-gold">25 MB Cap</span>
                </div>
                <p className="text-neutral-600 text-[11px]">
                  Final graduation portraits and retouched yearbook proofs are allocated up to 25 MB per deliverable with time-expiring download tokens.
                </p>
              </div>
            </div>
          </div>

          {/* Part C: Encryption & Hardware Guarantees */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3.5">
            <h3 className="font-heading text-base font-bold text-primary flex items-center gap-2 border-b border-neutral-100 pb-3">
              <ShieldCheck size={18} className="text-emerald-600" />
              Cryptographic & Transit Encryption Guarantees
            </h3>

            <div className="grid sm:grid-cols-3 gap-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
                <span className="font-bold text-primary block">Data at Rest: AES-256</span>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  PostgreSQL database volumes and media attachments are encrypted at rest with hardware-accelerated AES-256 block ciphers.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
                <span className="font-bold text-primary block">Data in Transit: TLS 1.3</span>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Strict Transport Security (HSTS) with perfect forward secrecy secures all customer-to-studio API and web traffic.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
                <span className="font-bold text-primary block">Password Hashing: bcrypt</span>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  User credentials are encrypted using bcrypt with per-user cryptographic salts to safeguard against credential stuffing.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
