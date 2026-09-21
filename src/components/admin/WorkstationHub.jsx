import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRightLeft,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  CreditCard,
  Camera,
  PackageCheck,
  ShieldAlert,
  FileText,
  RefreshCw,
  Eye,
  X,
  Layers,
  Inbox,
  Sparkles,
  ChevronRight,
  Filter,
  Check,
  History
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AdminActivityLogs from './AdminActivityLogs';
import StudioDropdown from '../ui/StudioDropdown';
import {
  TRANSFER_TYPES,
  PRIORITY_CONFIG,
  createTransferLog,
  getWorkstationInbox,
  acknowledgeTransfer,
  resolveTransfer,
  getWorkstationMetrics
} from '../../services/workstationService';

const ROLE_DISPLAY = {
  admin:        { label: 'Admin Command Hub',   color: 'text-gold bg-gold/10 border-gold/30',        icon: ShieldAlert },
  staff:        { label: 'Front Desk Station',  color: 'text-blue-700 bg-blue-50 border-blue-200',    icon: PackageCheck },
  photographer: { label: 'Creative Studio Bay', color: 'text-purple-700 bg-purple-50 border-purple-200', icon: Camera },
  finance:      { label: 'Finance & Treasury',  color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CreditCard },
  all:          { label: 'All Departments',     color: 'text-neutral-700 bg-neutral-100 border-neutral-200', icon: Layers },
};

function fmtTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function WorkstationHub({ prefilledBooking = null, compact = false, onTransferCreated = null }) {
  const { user, profile } = useAuth();
  const currentRole = profile?.role || 'staff';

  const [inbox, setInbox] = useState([]);
  const [metrics, setMetrics] = useState({ totalPending: 0, urgentCount: 0, issueCount: 0, resolvedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('pending'); // 'pending' | 'all' | 'issues'
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // New Transfer Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState(currentRole === 'photographer' ? 'staff' : (currentRole === 'finance' ? 'staff' : 'photographer'));
  const [transferType, setTransferType] = useState('ORDER_HANDOFF');
  const [priority, setPriority] = useState('NORMAL');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [bookingIdInput, setBookingIdInput] = useState(prefilledBooking?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [inboxRes, metricsRes] = await Promise.all([
      getWorkstationInbox({
        role: currentRole,
        status: filterTab === 'pending' ? 'PENDING' : null,
        limit: 40
      }),
      getWorkstationMetrics(currentRole)
    ]);

    let data = inboxRes.data || [];
    if (filterTab === 'issues') {
      data = data.filter(t => t.transfer_type === 'ISSUE_ESCALATION');
    }
    setInbox(data);
    setMetrics(metricsRes);
    setLoading(false);
  }, [currentRole, filterTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!bookingIdInput.trim()) {
      alert('Please select or provide a booking ID or reference number.');
      return;
    }
    if (!title.trim() || !message.trim()) {
      alert('Please provide both a title and message.');
      return;
    }

    setSubmitting(true);

    let resolvedBookingId = bookingIdInput.trim();
    // Auto-resolve booking number (e.g. BK-2026-00004 or 00004) to UUID if needed
    if (!resolvedBookingId.includes('-') || resolvedBookingId.startsWith('BK-') || resolvedBookingId.length < 30) {
      const cleanNum = resolvedBookingId.replace(/^#/, '').trim();
      const { data: bData } = await supabase
        .from('bookings')
        .select('id')
        .ilike('booking_number', `%${cleanNum}%`)
        .limit(1)
        .maybeSingle();
      if (bData?.id) {
        resolvedBookingId = bData.id;
      }
    }

    const { data, error } = await createTransferLog({
      bookingId: resolvedBookingId,
      senderId: user?.id,
      senderRole: currentRole,
      targetRole,
      transferType,
      priority,
      title,
      message,
      payload: {
        submitted_by_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
      }
    });
    setSubmitting(false);

    if (error) {
      alert('Failed to send workstation transfer: ' + error.message);
    } else {
      setModalOpen(false);
      setTitle('');
      setMessage('');
      if (!prefilledBooking) setBookingIdInput('');
      await loadData();
      if (onTransferCreated) onTransferCreated(data);
    }
  };

  const handleAcknowledge = async (transferId) => {
    setStatusActionLoading(true);
    await acknowledgeTransfer(transferId, user?.id);
    await loadData();
    setStatusActionLoading(false);
  };

  const handleResolve = async (transferId) => {
    const remarks = prompt('Enter resolution remarks (optional):') || 'Resolved by workstation operator';
    setStatusActionLoading(true);
    await resolveTransfer(transferId, user?.id, remarks);
    await loadData();
    setStatusActionLoading(false);
  };

  const activeStation = ROLE_DISPLAY[currentRole] || ROLE_DISPLAY.staff;
  const StationIcon = activeStation.icon;

  return (
    <div className="space-y-6">

      {/* ── Section 1: Real-Time Database Activity Logs ──────────────────── */}
      <AdminActivityLogs />

      {/* ── Section 2: Space-Efficient Departmental Handoffs ────────────── */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-gold" />
            <h3 className="text-sm font-bold text-primary">Departmental Handoffs</h3>
            {metrics.totalPending > 0 ? (
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                {metrics.totalPending} pending
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                0 pending
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (prefilledBooking?.id) setBookingIdInput(prefilledBooking.id);
                setModalOpen(true);
              }}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs"
            >
              <Send size={13} />
              <span>Dispatch Handoff</span>
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:text-primary hover:bg-neutral-100 transition-colors"
              title="Refresh handoffs"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-gold' : ''} />
            </button>
          </div>
        </div>

        {/* Transfer Item List */}
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-10 bg-neutral-100/70 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : inbox.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400">
            No active departmental handoffs.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {inbox.map((t) => {
              const typeCfg = TRANSFER_TYPES[t.transfer_type] || TRANSFER_TYPES.GENERAL_NOTE;
              const prioCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.NORMAL;
              const senderCfg = ROLE_DISPLAY[t.sender_role] || ROLE_DISPLAY.staff;
              const targetCfg = ROLE_DISPLAY[t.target_role] || ROLE_DISPLAY.all;

              return (
                <div
                  key={t.id}
                  className={`p-4 sm:p-5 hover:bg-neutral-50/70 transition-all ${
                    t.priority === 'URGENT' && t.status === 'PENDING'
                      ? 'bg-red-50/30'
                      : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Header tags */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${typeCfg.badge}`}>
                          {typeCfg.label}
                        </span>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${prioCfg.badge}`}>
                          {prioCfg.label}
                        </span>
                        {t.status === 'PENDING' ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Action Required
                          </span>
                        ) : t.status === 'ACKNOWLEDGED' ? (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            In Progress
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Resolved
                          </span>
                        )}

                        <span className="text-xs text-neutral-400 font-body ml-auto">
                          {fmtTime(t.created_at)}
                        </span>
                      </div>

                      {/* Title & Booking reference */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-heading text-base font-bold text-primary">
                          {t.title}
                        </h4>
                        {t.booking?.booking_number && (
                          <span className="text-xs font-semibold text-gold bg-gold/10 px-2 py-0.5 rounded">
                            #{t.booking.booking_number}
                          </span>
                        )}
                      </div>

                      {/* Message body */}
                      <p className="text-sm text-neutral-700 font-body mt-1.5 whitespace-pre-wrap leading-relaxed">
                        {t.message}
                      </p>

                      {/* Route Path (Sender -> Target) */}
                      <div className="flex items-center gap-2 text-xs text-neutral-500 font-body mt-3">
                        <span className="font-medium text-neutral-700">From:</span>
                        <span className={`px-1.5 py-0.2 rounded text-[11px] font-semibold ${senderCfg.color}`}>
                          {senderCfg.label} ({t.sender?.first_name || 'Staff'})
                        </span>
                        <ChevronRight size={13} className="text-neutral-300" />
                        <span className="font-medium text-neutral-700">To:</span>
                        <span className={`px-1.5 py-0.2 rounded text-[11px] font-semibold ${targetCfg.color}`}>
                          {targetCfg.label}
                        </span>
                        {t.booking?.customer && (
                          <span className="text-neutral-400 hidden sm:inline">
                            • Client: {t.booking.customer.first_name} {t.booking.customer.last_name}
                          </span>
                        )}
                      </div>

                      {/* Resolution note if resolved */}
                      {t.status === 'RESOLVED' && t.payload?.resolution_remarks && (
                        <div className="mt-3 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-800">
                          <span className="font-semibold">Resolution Note:</span> {t.payload.resolution_remarks}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex sm:flex-col items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                      {t.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleAcknowledge(t.id)}
                            disabled={statusActionLoading}
                            className="btn-outline text-xs py-1.5 px-3 w-full justify-center"
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => handleResolve(t.id)}
                            disabled={statusActionLoading}
                            className="btn-primary text-xs py-1.5 px-3 w-full justify-center"
                          >
                            Resolve
                          </button>
                        </>
                      )}
                      {t.status === 'ACKNOWLEDGED' && (
                        <button
                          onClick={() => handleResolve(t.id)}
                          disabled={statusActionLoading}
                          className="btn-primary text-xs py-1.5 px-3 w-full justify-center"
                        >
                          Complete / Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Transfer Dispatch Modal ────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-4 border border-neutral-200/90 dark:border-neutral-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gold/15 text-gold flex items-center justify-center ring-1 ring-gold/25">
                  <Send size={18} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-primary dark:text-neutral-100">
                    Dispatch Workstation Transfer
                  </h3>
                  <p className="text-xs text-neutral-400 font-body">
                    Handoff order, report issue, or transfer clearances
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-neutral-400 hover:text-primary dark:hover:text-neutral-100 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-3.5 font-body text-sm">
              {/* Row 1: Target Station & Handoff Type (2 cols) */}
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                    Target Station
                  </label>
                  <StudioDropdown
                    value={targetRole}
                    onChange={setTargetRole}
                    options={[
                      { value: 'staff', label: 'Front Desk (Staff)' },
                      { value: 'photographer', label: 'Creative Bay (Photographer)' },
                      { value: 'finance', label: 'Treasury (Finance)' },
                      { value: 'admin', label: 'Command Hub (Admin)' },
                      { value: 'all', label: 'All Stations (Broadcast)' },
                    ]}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                    Handoff Type
                  </label>
                  <StudioDropdown
                    value={transferType}
                    onChange={setTransferType}
                    options={[
                      { value: 'ORDER_HANDOFF', label: 'Order Handoff' },
                      { value: 'PAYMENT_VERIFICATION', label: 'Payment Verification' },
                      { value: 'ISSUE_ESCALATION', label: 'Issue Escalation' },
                      { value: 'OUTPUT_SUBMISSION', label: 'Output Submission' },
                      { value: 'DISPATCH_CLEARANCE', label: 'Dispatch Clearance' },
                      { value: 'GENERAL_NOTE', label: 'Department Note' },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Row 2: Priority Level & Booking Reference (2 cols) */}
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                    Priority Level
                  </label>
                  <StudioDropdown
                    value={priority}
                    onChange={setPriority}
                    options={[
                      { value: 'NORMAL', label: 'Normal', colorBadge: 'bg-blue-500' },
                      { value: 'HIGH', label: 'High', colorBadge: 'bg-amber-500' },
                      { value: 'URGENT', label: 'Urgent', colorBadge: 'bg-red-500' },
                      { value: 'LOW', label: 'Low', colorBadge: 'bg-neutral-400' },
                    ]}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Booking Reference
                    </label>
                    {prefilledBooking?.booking_number && (
                      <span className="text-[11px] font-bold text-gold">
                        #{prefilledBooking.booking_number}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={bookingIdInput}
                    onChange={(e) => setBookingIdInput(e.target.value)}
                    placeholder="Booking # or UUID..."
                    className="w-full px-3.5 py-2 bg-white dark:bg-neutral-800 border border-neutral-300/80 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 shadow-2xs text-sm font-body placeholder:text-neutral-400 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Row 3: Transfer Subject / Purpose */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                  Subject / Purpose
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Order Ready for Shoot Bay 2 / Payment Cleared for Release"
                  className="w-full px-3.5 py-2 bg-white dark:bg-neutral-800 border border-neutral-300/80 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 shadow-2xs text-sm font-body placeholder:text-neutral-400 transition-all"
                  required
                />
              </div>

              {/* Row 4: Detailed Notes & Instructions */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                  Detailed Notes & Instructions
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Specify action required by recipient station, customer notes, or photo delivery instructions..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300/80 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 shadow-2xs text-sm font-body placeholder:text-neutral-400 resize-none leading-relaxed transition-all"
                  required
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-primary text-white hover:bg-neutral-800 text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send size={15} />
                  <span>{submitting ? 'Transmitting…' : 'Emit Transfer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
