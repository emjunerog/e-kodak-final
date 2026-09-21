import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  CreditCard,
  Camera,
  Trash2,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  Filter,
  MessageSquare,
  X,
  Tag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StudioDropdown from '../ui/StudioDropdown';
import {
  fetchAdminActivityLogs,
  fetchAdministratorsList
} from '../../services/workstationService';

const ACTION_CONFIG = {
  STATUS_CHANGE:        { label: 'Status',        badge: 'bg-neutral-100 text-neutral-700' },
  PHOTOGRAPHER_ASSIGNED:{ label: 'Assigned',      badge: 'bg-purple-50 text-purple-700' },
  BOOKING_CREATED:      { label: 'Created',       badge: 'bg-blue-50 text-blue-700' },
  BOOKING_SOFT_DELETED: { label: 'Trashed',       badge: 'bg-amber-50 text-amber-800' },
  BOOKING_RESTORED:     { label: 'Restored',      badge: 'bg-emerald-50 text-emerald-700' },
  BOOKING_PURGED:       { label: 'Purged',        badge: 'bg-rose-50 text-rose-700' },
  PAYMENT_RECORD:       { label: 'Payment',       badge: 'bg-emerald-50 text-emerald-700' },
  TRANSFER_DISPATCH:    { label: 'Handoff',       badge: 'bg-indigo-50 text-indigo-700' },
  TRANSFER_RESOLVE:     { label: 'Resolved',      badge: 'bg-emerald-50 text-emerald-700' },
  DEFAULT:              { label: 'Action',        badge: 'bg-neutral-100 text-neutral-600' },
};

const ROLE_LABELS = {
  admin:   'Admin',
  staff:   'Staff',
  finance: 'Finance',
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSecs = Math.floor((now - date) / 1000);

  if (diffSecs < 60) return 'Just now';
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  if (diffSecs < 604800) return `${Math.floor(diffSecs / 86400)}d ago`;

  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function AdminActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedAdminId, setSelectedAdminId] = useState('all');
  const [selectedActionType, setSelectedActionType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, adminsRes] = await Promise.all([
        fetchAdminActivityLogs({
          adminId: selectedAdminId !== 'all' ? selectedAdminId : null,
          actionType: selectedActionType !== 'all' ? selectedActionType : null,
          search: searchQuery,
          limit: 100,
        }),
        fetchAdministratorsList(),
      ]);

      setLogs(logsRes.data || []);
      setAdminsList(adminsRes.data || []);
    } catch (err) {
      console.error('Failed loading admin activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAdminId, selectedActionType, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Format admin options
  const adminOptions = [
    {
      value: 'all',
      label: 'All Administrators',
      badge: adminsList.length > 0 ? `${adminsList.length}` : undefined,
    },
    ...adminsList.map((a) => ({
      value: a.id,
      label: `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Administrator',
      badge: ROLE_LABELS[a.role] || a.role || 'Staff',
      desc: a.email || undefined,
    })),
  ];

  // Format action category options
  const actionOptions = [
    { value: 'all', label: 'All Actions' },
    { value: 'STATUS_CHANGE', label: 'Status Changes', colorBadge: 'bg-neutral-400', badge: 'Status' },
    { value: 'PHOTOGRAPHER_ASSIGNED', label: 'Assignments', colorBadge: 'bg-purple-500', badge: 'Staff' },
    { value: 'BOOKING_CREATED', label: 'Creations', colorBadge: 'bg-blue-500', badge: 'New' },
    { value: 'BOOKING_SOFT_DELETED', label: 'Trash', colorBadge: 'bg-amber-500', badge: 'Trash' },
    { value: 'BOOKING_RESTORED', label: 'Restored', colorBadge: 'bg-emerald-500', badge: 'Restore' },
    { value: 'BOOKING_PURGED', label: 'Purged', colorBadge: 'bg-rose-500', badge: 'Purge' },
    { value: 'PAYMENT_RECORD', label: 'Payments', colorBadge: 'bg-emerald-600', badge: 'Finance' },
    { value: 'TRANSFER_DISPATCH', label: 'Handoffs', colorBadge: 'bg-indigo-500', badge: 'Handoff' },
  ];

  return (
    <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs relative">
      
      {/* ── Compact Header & Inline Filters ───────────────────────────────── */}
      <div className="px-5 py-3 border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/60 rounded-t-xl">
        
        {/* Left: Title + Count */}
        <div className="flex items-center gap-2.5">
          <History size={18} className="text-gold shrink-0" />
          <h3 className="text-base font-bold text-primary">Activity Logs</h3>
          <span className="text-xs font-semibold text-neutral-600 bg-neutral-200/80 px-2.5 py-0.5 rounded-full">
            {logs.length}
          </span>
        </div>

        {/* Right: Space-efficient Inline Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Admin custom luxury dropdown */}
          <StudioDropdown
            value={selectedAdminId}
            onChange={setSelectedAdminId}
            options={adminOptions}
            placeholder="All Administrators"
            icon={Users}
            searchable={adminsList.length > 5}
            className="w-52 sm:w-60"
            menuClassName="w-72"
          />

          {/* Action category custom luxury dropdown */}
          <StudioDropdown
            value={selectedActionType}
            onChange={setSelectedActionType}
            options={actionOptions}
            placeholder="All Actions"
            icon={Filter}
            className="w-44 sm:w-52"
            menuClassName="w-64"
          />

          {/* Search input with proper icon padding & clear button */}
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-sm pl-10 pr-8 py-2 w-44 sm:w-56 bg-white dark:bg-neutral-800 border border-neutral-300/80 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 shadow-2xs placeholder:text-neutral-400 font-body transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-neutral-300/80 bg-white text-neutral-600 hover:text-primary hover:border-gold/50 hover:bg-neutral-50 transition-all shadow-2xs cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-gold' : ''} />
          </button>
        </div>

      </div>

      {/* ── Space-Efficient Activity List ─────────────────────────────────── */}
      {loading ? (
        <div className="p-5 space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-neutral-100/80 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-400">
          No activity logs match your filter.
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 text-sm">
          {logs.map((log) => {
            const cfg = ACTION_CONFIG[log.action_type] || ACTION_CONFIG.DEFAULT;
            const isExpanded = expandedLogId === log.id;

            // Extract primary details fields for luxury presentation
            const details = log.details || {};
            const statusVal = details.status || details.new_status;
            const prevStatusVal = details.previous_status || details.old_status;
            const remarksVal = details.remarks || details.note || details.reason || details.comment;
            const otherEntries = Object.entries(details).filter(
              ([k]) => !['status', 'new_status', 'previous_status', 'old_status', 'remarks', 'note', 'reason', 'comment'].includes(k.toLowerCase())
            );

            return (
              <div
                key={log.id}
                className="px-5 py-3.5 hover:bg-neutral-50/70 transition-colors flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-3">
                  
                  {/* Left: Admin name, Action badge, Description */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* User initial avatar */}
                    <div className="w-8 h-8 rounded-full bg-gold/15 text-gold font-bold flex items-center justify-center text-xs flex-shrink-0 ring-1 ring-gold/25">
                      {log.admin_name?.charAt(0) || 'A'}
                    </div>

                    <span className="font-bold text-primary truncate max-w-[160px] flex-shrink-0">
                      {log.admin_name || 'Admin'}
                    </span>

                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md flex-shrink-0 ${cfg.badge}`}>
                      {cfg.label}
                    </span>

                    <span className="text-neutral-800 font-medium truncate">
                      {log.description}
                    </span>
                  </div>

                  {/* Right: Booking Pill + Timestamp + Toggle */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {log.entity_label && (
                      <Link
                        to={`/admin/bookings?search=${encodeURIComponent(log.entity_label)}`}
                        className="text-xs font-bold text-gold hover:underline"
                        title="View linked booking"
                      >
                        #{log.entity_label}
                      </Link>
                    )}

                    <span className="text-xs text-neutral-500 whitespace-nowrap">
                      {formatRelativeTime(log.created_at)}
                    </span>

                    {log.details && Object.keys(log.details).length > 0 && (
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isExpanded
                            ? 'bg-gold/15 text-gold-dark border-gold/30'
                            : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 border-transparent'
                        }`}
                        title={isExpanded ? 'Collapse details' : 'View remarks & details'}
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    )}
                  </div>

                </div>

                {/* ── Luxury Status & Remarks Detail UI ──────────────────────── */}
                {isExpanded && log.details && (
                  <div className="mt-1 p-3.5 rounded-xl bg-gradient-to-br from-neutral-50/90 via-warm-50/40 to-neutral-50/90 dark:from-neutral-800/80 dark:to-neutral-900/80 border border-neutral-200/90 dark:border-neutral-700/80 shadow-2xs space-y-2.5 animate-in fade-in duration-150">
                    
                    {/* Operational Status Row */}
                    {statusVal && (
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Recorded Status:
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white dark:bg-neutral-800 text-primary dark:text-gold border border-gold/40 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                          {String(statusVal).replace(/_/g, ' ')}
                        </span>
                        {prevStatusVal && (
                          <span className="text-xs text-neutral-400 font-medium">
                            (transitioned from <span className="font-semibold text-neutral-600 dark:text-neutral-300">{String(prevStatusVal).replace(/_/g, ' ')}</span>)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Staff Remarks / Note Callout */}
                    {remarksVal && (
                      <div className="flex items-start gap-2.5 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700/70 shadow-2xs">
                        <MessageSquare size={16} className="text-gold shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-neutral-400 dark:text-neutral-400 uppercase tracking-wider mb-0.5">
                            Remarks & Audit Notes
                          </div>
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed italic">
                            "{remarksVal}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Additional Metadata Chips */}
                    {otherEntries.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60">
                        {otherEntries.map(([k, v]) => (
                          <span
                            key={k}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-neutral-800/90 border border-neutral-200/70 dark:border-neutral-700 text-xs font-body shadow-2xs"
                          >
                            <span className="text-neutral-400 font-medium capitalize">
                              {k.replace(/_/g, ' ')}:
                            </span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
