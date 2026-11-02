import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Filter,
  MessageSquare,
  X,
  ShieldCheck,
  UserCheck,
  Layers,
  CalendarDays,
  Settings,
  Sun,
  Moon,
  Volume2,
  Bell,
  Sliders,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StudioDropdown from '../ui/StudioDropdown';
import { fetchAdminActivityLogs } from '../../services/workstationService';

// ── Action Configuration with Icons & Palette ───────────────────────────────
const ACTION_CONFIG = {
  STATUS_CHANGE: {
    label: 'Status Update',
    icon: CheckCircle2,
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
  },
  PHOTOGRAPHER_ASSIGNED: {
    label: 'Assigned Bay / Photographer',
    icon: Camera,
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  PHOTOGRAPHER_AVAILABILITY: {
    label: 'Shift Schedule',
    icon: CalendarDays,
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  AVAILABILITY_TOGGLE: {
    label: 'Station Duty Toggle',
    icon: Clock,
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  BOOKING_CREATED: {
    label: 'New Intake',
    icon: Sparkles,
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  BOOKING_SOFT_DELETED: {
    label: 'Moved to Trash',
    icon: Trash2,
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  BOOKING_RESTORED: {
    label: 'Restored from Trash',
    icon: RotateCcw,
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  BOOKING_PURGED: {
    label: 'Permanently Purged',
    icon: Trash2,
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  PAYMENT_RECORD: {
    label: 'Payment Ledger',
    icon: CreditCard,
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  SETTINGS_UPDATED: {
    label: 'Station Preferences',
    icon: Settings,
    badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  TRANSFER_DISPATCH: {
    label: 'Handoff Dispatch',
    icon: ArrowRightLeft,
    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
  TRANSFER_RESOLVE: {
    label: 'Handoff Resolved',
    icon: CheckCircle2,
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  DEFAULT: {
    label: 'Movement',
    icon: History,
    badge: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  },
};

const ROLE_THEMES = {
  admin: {
    name: 'Administrator',
    box: 'bg-gradient-to-r from-white via-amber-50/40 to-amber-100/30 border border-amber-200/90 hover:border-amber-400 shadow-2xs hover:shadow-xs text-neutral-900',
    avatarRing: 'ring-2 ring-neutral-900/80 shadow-xs',
    avatarFallback: 'bg-neutral-900 text-gold ring-1 ring-gold/40',
    nameColor: 'text-neutral-950 font-bold',
    divider: 'sm:border-neutral-200/80',
    iconBadge: 'bg-amber-50 text-amber-900 border border-amber-200/90 hover:border-amber-400 shadow-2xs',
    message: 'text-neutral-800 font-medium',
    time: 'text-neutral-400',
    bookingLink: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80',
    expandedBox: 'bg-amber-50/40 border border-amber-200 text-neutral-800',
    expandBtn: 'text-neutral-400 hover:text-amber-800 hover:bg-amber-100/60 border-transparent',
    expandBtnActive: 'bg-amber-100 text-amber-900 border border-amber-300',
  },
  photographer: {
    name: 'Photographer',
    box: 'bg-gradient-to-r from-white via-amber-50/20 to-neutral-50/40 border border-amber-200/70 hover:border-amber-300 shadow-2xs hover:shadow-xs text-neutral-900',
    avatarRing: 'ring-2 ring-amber-600/70 shadow-xs',
    avatarFallback: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300',
    nameColor: 'text-neutral-950 font-bold',
    divider: 'sm:border-neutral-200/80',
    iconBadge: 'bg-amber-50 text-amber-900 border border-amber-200/90 hover:border-amber-300 shadow-2xs',
    message: 'text-neutral-800 font-medium',
    time: 'text-neutral-400',
    bookingLink: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80',
    expandedBox: 'bg-amber-50/30 border border-amber-200 text-neutral-800',
    expandBtn: 'text-neutral-400 hover:text-amber-800 hover:bg-amber-100/60 border-transparent',
    expandBtnActive: 'bg-amber-100 text-amber-900 border border-amber-300',
  },
  staff: {
    name: 'Frontdesk Staff',
    box: 'bg-gradient-to-r from-white via-stone-50/30 to-neutral-50/50 border border-neutral-200/90 hover:border-amber-300 shadow-2xs hover:shadow-xs text-neutral-900',
    avatarRing: 'ring-2 ring-stone-600/70 shadow-xs',
    avatarFallback: 'bg-stone-100 text-stone-900 ring-1 ring-stone-300',
    nameColor: 'text-neutral-950 font-bold',
    divider: 'sm:border-neutral-200/80',
    iconBadge: 'bg-stone-50 text-stone-900 border border-stone-200/90 hover:border-amber-300 shadow-2xs',
    message: 'text-neutral-800 font-medium',
    time: 'text-neutral-400',
    bookingLink: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80',
    expandedBox: 'bg-stone-50/40 border border-neutral-200 text-neutral-800',
    expandBtn: 'text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100/60 border-transparent',
    expandBtnActive: 'bg-neutral-100 text-neutral-900 border border-neutral-300',
  },
  finance: {
    name: 'Finance Officer',
    box: 'bg-gradient-to-r from-white via-amber-50/20 to-neutral-50/40 border border-amber-200/70 hover:border-amber-300 shadow-2xs hover:shadow-xs text-neutral-900',
    avatarRing: 'ring-2 ring-amber-600/70 shadow-xs',
    avatarFallback: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300',
    nameColor: 'text-neutral-950 font-bold',
    divider: 'sm:border-neutral-200/80',
    iconBadge: 'bg-amber-50 text-amber-900 border border-amber-200/90 hover:border-amber-300 shadow-2xs',
    message: 'text-neutral-800 font-medium',
    time: 'text-neutral-400',
    bookingLink: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80',
    expandedBox: 'bg-amber-50/30 border border-amber-200 text-neutral-800',
    expandBtn: 'text-neutral-400 hover:text-amber-800 hover:bg-amber-100/60 border-transparent',
    expandBtnActive: 'bg-amber-100 text-amber-900 border border-amber-300',
  },
};

function getRoleTheme(role) {
  if (!role) return ROLE_THEMES.admin;
  const r = String(role).toLowerCase();
  if (r.includes('photo')) return ROLE_THEMES.photographer;
  if (r.includes('fin')) return ROLE_THEMES.finance;
  if (r.includes('staff')) return ROLE_THEMES.staff;
  return ROLE_THEMES.admin;
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSecs = Math.floor((now - date) / 1000);

  if (diffSecs < 60) return 'Just now';
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  if (diffSecs < 604800) return `${Math.floor(diffSecs / 86400)}d ago`;

  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Smart Direct Message Formatter (strips repetition and name echoes) ───────
function formatDirectMessage(description, adminName) {
  if (!description) return 'Operational movement recorded';

  let text = description.trim();

  // 1. Remove admin's own name prefix (e.g. "Mark June Repunte scheduled..." -> "Scheduled...")
  if (adminName && text.toLowerCase().startsWith(adminName.toLowerCase())) {
    text = text.substring(adminName.length).trim();
    if (text.startsWith(':')) text = text.substring(1).trim();
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  // 2. Simplify "Moved [booking] [#]BK-... to Trash. Reason: ..."
  const trashMatch = text.match(/moved\s+(?:booking\s+)?#?(BK-[A-Z0-9-]+|[A-Z0-9-]+)?\s+to\s+trash/i);
  if (trashMatch) {
    const rawRef = trashMatch[1];
    const bkRef = rawRef ? ` #${rawRef.replace(/^#/, '')}` : '';
    return `Moved booking${bkRef} to Trash`;
  }
  if (/moved.*to trash/i.test(text)) {
    return 'Moved booking to Trash';
  }

  // 3. Simplify "Restored [booking] [#]BK-... from Trash"
  const restoreMatch = text.match(/restored\s+(?:booking\s+)?#?(BK-[A-Z0-9-]+|[A-Z0-9-]+)?\s+from\s+trash/i);
  if (restoreMatch) {
    const rawRef = restoreMatch[1];
    const bkRef = rawRef ? ` #${rawRef.replace(/^#/, '')}` : '';
    return `Restored booking${bkRef} from Trash`;
  }

  // 4. Simplify "Permanently purged [booking] [#]BK-..."
  const purgeMatch = text.match(/(?:permanently\s+)?purged\s+(?:booking\s+)?#?(BK-[A-Z0-9-]+|[A-Z0-9-]+)?/i);
  if (purgeMatch) {
    const rawRef = purgeMatch[1];
    const bkRef = rawRef ? ` #${rawRef.replace(/^#/, '')}` : '';
    return `Permanently purged booking${bkRef}`;
  }

  // 5. Simplify "Updated status of BK-... to PHOTOGRAPHER_ASSIGNED: "Photographer assigned: ...""
  const photoAssignMatch = text.match(/photographer assigned:?\s*"?([^"]+)"?/i);
  if (photoAssignMatch) {
    const pName = photoAssignMatch[1].trim();
    return `Assigned ${pName} to booking order`;
  }

  // 6. Simplify "Updated status of BK-... to [STATUS]"
  const statusMatch = text.match(/Updated status of (?:BK-[0-9-]+|#[A-Z0-9-]+)?\s*to\s+([A-Z_]+)/i);
  if (statusMatch) {
    const st = statusMatch[1].toUpperCase();
    if (st === 'CONFIRMED') return 'Confirmed booking order';
    if (st === 'IN_PROGRESS') return 'Started photoshoot session';
    if (st === 'COMPLETED') return 'Completed photoshoot session';
    if (st === 'CANCELLED') return 'Cancelled booking order';
    if (st === 'PHOTOGRAPHER_ASSIGNED') return 'Assigned photographer to order';
    return `Updated booking status to ${st.replace(/_/g, ' ')}`;
  }

  // 7. Clean "Updated shift status, dispatch controls, theme mode, and preferences."
  if (/updated shift status, dispatch controls/i.test(text)) {
    return 'Updated station preferences & display controls';
  }

  // 8. Clean "Switched station status to Available for new shoots."
  if (/switched station status to available/i.test(text)) {
    return 'Switched station status to Available';
  }
  if (/switched station status to off-duty/i.test(text)) {
    return 'Switched station status to Off-Duty';
  }

  // 9. Remove extraneous quotes and double colons
  text = text.replace(/:\s*""/g, '').replace(/""/g, '"');
  return text;
}

// ── Luxury Tweaked Settings Viewer (Translates Raw Codes to Direct UI) ───────
function TweakedSettingsViewer({ details }) {
  if (!details || Object.keys(details).length === 0) return null;

  const chips = [];

  // 1. Theme mode
  const themeMode = details.themeMode || details.theme_mode || details.theme;
  if (themeMode) {
    const isDark = String(themeMode).toLowerCase() === 'dark';
    chips.push({
      id: 'theme',
      icon: isDark ? Moon : Sun,
      label: 'Theme',
      value: isDark ? 'Dark Mode' : 'Light Mode',
      badgeClass: isDark
        ? 'bg-neutral-900 text-neutral-100 border-neutral-700'
        : 'bg-amber-50 text-amber-900 border-amber-200',
    });
  }

  // 2. Availability / Shift status
  if (details.isAvailable !== undefined || details.is_available !== undefined) {
    const isAvail = Boolean(details.isAvailable ?? details.is_available);
    chips.push({
      id: 'availability',
      icon: isAvail ? CheckCircle2 : Clock,
      label: 'Duty Status',
      value: isAvail ? 'On Duty (Available)' : 'Off Duty (Paused)',
      badgeClass: isAvail
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : 'bg-neutral-100 text-neutral-700 border-neutral-200',
    });
  }

  // 3. Audio Chime / Preferences
  const prefs = details.preferences || {};
  if (prefs.soundChime) {
    chips.push({
      id: 'soundChime',
      icon: Volume2,
      label: 'Chime',
      value: String(prefs.soundChime)
        .replace(/^chime-?/i, '')
        .replace(/-/g, ' ')
        .toUpperCase() + ' CHIME',
      badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    });
  }
  if (prefs.autoRefresh !== undefined) {
    chips.push({
      id: 'autoRefresh',
      icon: RefreshCw,
      label: 'Auto-Refresh',
      value: prefs.autoRefresh ? 'Enabled' : 'Disabled',
      badgeClass: prefs.autoRefresh
        ? 'bg-blue-50 text-blue-800 border-blue-200'
        : 'bg-neutral-100 text-neutral-700 border-neutral-200',
    });
  }
  if (prefs.compactMode !== undefined) {
    chips.push({
      id: 'compactMode',
      icon: Layers,
      label: 'Layout',
      value: prefs.compactMode ? 'Compact View' : 'Spacious View',
      badgeClass: 'bg-neutral-50 text-neutral-800 border-neutral-200',
    });
  }
  if (prefs.motionEffects !== undefined) {
    chips.push({
      id: 'motionEffects',
      icon: Sparkles,
      label: 'Animations',
      value: prefs.motionEffects ? 'Smooth Motion ON' : 'Reduced Motion',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    });
  }

  // 4. Dispatch Alerts
  const alerts = details.dispatchAlerts || details.dispatch_alerts || {};
  if (alerts.notifySms !== undefined) {
    chips.push({
      id: 'sms',
      icon: MessageSquare,
      label: 'SMS Alerts',
      value: alerts.notifySms ? 'Active' : 'Disabled',
      badgeClass: alerts.notifySms
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : 'bg-neutral-100 text-neutral-700 border-neutral-200',
    });
  }
  if (alerts.autoAccept !== undefined) {
    chips.push({
      id: 'autoAccept',
      icon: CheckCircle2,
      label: 'Auto-Accept',
      value: alerts.autoAccept ? 'Active' : 'Manual Triage',
      badgeClass: alerts.autoAccept
        ? 'bg-purple-50 text-purple-800 border-purple-200'
        : 'bg-neutral-100 text-neutral-700 border-neutral-200',
    });
  }
  if (alerts.soundAlerts !== undefined) {
    chips.push({
      id: 'soundAlerts',
      icon: Bell,
      label: 'Sound Alerts',
      value: alerts.soundAlerts ? 'Active' : 'Muted',
      badgeClass: alerts.soundAlerts
        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
        : 'bg-neutral-100 text-neutral-700 border-neutral-200',
    });
  }
  if (alerts.dailyDigest !== undefined) {
    chips.push({
      id: 'dailyDigest',
      icon: CalendarDays,
      label: 'Daily Digest',
      value: alerts.dailyDigest ? 'Subscribed' : 'Off',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    });
  }

  // 5. Payment Details
  if (details.method || details.payment_method) {
    chips.push({
      id: 'paymentMethod',
      icon: CreditCard,
      label: 'Method',
      value: String(details.method || details.payment_method).toUpperCase(),
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    });
  }
  if (details.amount !== undefined && details.amount !== null) {
    chips.push({
      id: 'amount',
      icon: CreditCard,
      label: 'Amount Paid',
      value: `₱${Number(details.amount).toLocaleString()}`,
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    });
  }
  if (details.reference_number || details.referenceNumber) {
    chips.push({
      id: 'refNum',
      icon: ShieldCheck,
      label: 'Reference No.',
      value: String(details.reference_number || details.referenceNumber),
      badgeClass: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    });
  }

  // 6. Shift and Photographer Details
  if (details.photographer_name) {
    chips.push({
      id: 'photographerName',
      icon: Camera,
      label: 'Operator',
      value: details.photographer_name,
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-200 font-semibold',
    });
  }
  if (details.event_date || details.availability_date) {
    chips.push({
      id: 'eventDate',
      icon: CalendarDays,
      label: 'Target Date',
      value: details.event_date || details.availability_date,
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    });
  }
  if (details.time_slot || details.hours) {
    chips.push({
      id: 'timeSlot',
      icon: Clock,
      label: 'Hours',
      value: details.time_slot || details.hours,
      badgeClass: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    });
  }

  // 7. Strip internal technical database IDs
  const ignoredKeys = new Set([
    'status', 'new_status', 'previous_status', 'old_status',
    'remarks', 'note', 'reason', 'comment',
    'photographer_id', 'photographerid', 'admin_id', 'adminid',
    'user_id', 'userid', 'booking_id', 'bookingid', 'entity_id', 'id',
    'thememode', 'theme_mode', 'theme', 'isavailable', 'is_available',
    'preferences', 'dispatchalerts', 'dispatch_alerts',
    'method', 'payment_method', 'amount', 'reference_number', 'referencenumber',
    'photographer_name', 'event_date', 'availability_date', 'time_slot', 'hours',
  ]);

  Object.entries(details).forEach(([k, v]) => {
    if (ignoredKeys.has(k.toLowerCase())) return;
    if (v === null || v === undefined || v === '') return;
    const formattedVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
    chips.push({
      id: k,
      icon: Sliders,
      label: k.replace(/_/g, ' '),
      value: formattedVal,
      badgeClass: 'bg-white text-neutral-800 border-neutral-200',
    });
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {chips.map((chip) => {
        const ChipIcon = chip.icon || Sliders;
        return (
          <div
            key={chip.id}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shadow-2xs transition-all ${chip.badgeClass}`}
          >
            <ChipIcon size={13} className="shrink-0 opacity-70" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                {chip.label}:
              </span>
              <span className="font-semibold">
                {chip.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedActionType, setSelectedActionType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadGlobalStats = useCallback(async () => {
    try {
      const globalRes = await fetchAdminActivityLogs({ limit: 250 });
      if (globalRes?.data) {
        setAllLogs(globalRes.data);
      }
    } catch (err) {
      console.error('Failed loading global activity stats:', err);
    }
  }, []);

  const loadFilteredLogs = useCallback(async () => {
    setLoading(true);
    try {
      const logsRes = await fetchAdminActivityLogs({
        role: selectedRole !== 'all' ? selectedRole : null,
        actionType: selectedActionType !== 'all' ? selectedActionType : null,
        search: debouncedSearch,
        limit: 150,
      });
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Failed loading admin activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRole, selectedActionType, debouncedSearch]);

  const loadData = useCallback(async () => {
    await Promise.all([loadFilteredLogs(), loadGlobalStats()]);
  }, [loadFilteredLogs, loadGlobalStats]);

  useEffect(() => {
    loadGlobalStats();
  }, [loadGlobalStats]);

  useEffect(() => {
    loadFilteredLogs();
  }, [loadFilteredLogs]);

  // ── Compute 4 Useful & Functional KPI Metrics ─────────────────────────────
  const statsSource = allLogs.length > 0 ? allLogs : logs;

  const stats = useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let todayCount = 0;
    let photoDispatchCount = 0;
    let photoScheduleCount = 0;
    let statusChangeCount = 0;
    let newIntakeCount = 0;
    let paymentCount = 0;
    let trashCount = 0;
    const uniqueOperators = new Set();

    statsSource.forEach((log) => {
      if (log.admin_name) uniqueOperators.add(log.admin_name);

      const logDate = new Date(log.created_at);
      if (!isNaN(logDate) && logDate >= oneDayAgo) {
        todayCount++;
      }

      const type = log.action_type;
      if (type === 'PHOTOGRAPHER_ASSIGNED') {
        photoDispatchCount++;
      } else if (type === 'PHOTOGRAPHER_AVAILABILITY' || type === 'AVAILABILITY_TOGGLE') {
        photoScheduleCount++;
      } else if (type === 'STATUS_CHANGE') {
        statusChangeCount++;
      } else if (type === 'BOOKING_CREATED') {
        newIntakeCount++;
      } else if (type === 'PAYMENT_RECORD') {
        paymentCount++;
      } else if (
        type === 'BOOKING_SOFT_DELETED' ||
        type === 'BOOKING_RESTORED' ||
        type === 'BOOKING_PURGED'
      ) {
        trashCount++;
      }
    });

    return {
      totalMovements: statsSource.length,
      todayCount,
      uniqueOperators: uniqueOperators.size,
      photoTotal: photoDispatchCount + photoScheduleCount,
      photoDispatchCount,
      photoScheduleCount,
      milestonesTotal: statusChangeCount + newIntakeCount,
      statusChangeCount,
      newIntakeCount,
      safetyFinancialTotal: paymentCount + trashCount,
      paymentCount,
      trashCount,
    };
  }, [statsSource]);

  // Role filter options - only icons and labels, no color dots or gray badges
  const roleOptions = [
    { value: 'all', label: 'All Roles', icon: ShieldCheck },
    { value: 'admin', label: 'Administrator', icon: ShieldCheck },
    { value: 'staff', label: 'Frontdesk Staff', icon: UserCheck },
    { value: 'finance', label: 'Finance Officer', icon: CreditCard },
    { value: 'photographer', label: 'Photographer', icon: Camera },
  ];

  // Action category options - all movements use the exact icons from log messages
  const actionOptions = [
    { value: 'all', label: 'All Movements', icon: Filter },
    { value: 'STATUS_CHANGE', label: 'Status Updates', icon: CheckCircle2 },
    { value: 'PHOTOGRAPHER_ASSIGNED', label: 'Assigned Bay', icon: Camera },
    { value: 'PHOTOGRAPHER_AVAILABILITY', label: 'Shift Schedules', icon: CalendarDays },
    { value: 'AVAILABILITY_TOGGLE', label: 'Station Duty Toggle', icon: Clock },
    { value: 'PAYMENT_RECORD', label: 'Payment Ledger', icon: CreditCard },
    { value: 'BOOKING_SOFT_DELETED', label: 'Moved to Trash', icon: Trash2 },
    { value: 'BOOKING_RESTORED', label: 'Restored from Trash', icon: RotateCcw },
    { value: 'BOOKING_PURGED', label: 'Permanently Purged', icon: Trash2 },
    { value: 'SETTINGS_UPDATED', label: 'Station Preferences', icon: Settings },
    { value: 'BOOKING_CREATED', label: 'New Intake', icon: Sparkles },
    { value: 'TRANSFER_DISPATCH', label: 'Handoff Dispatch', icon: ArrowRightLeft },
    { value: 'TRANSFER_RESOLVE', label: 'Handoff Resolved', icon: CheckCircle2 },
  ];

  const hasActiveFilters = selectedRole !== 'all' || selectedActionType !== 'all' || Boolean(searchQuery);

  const handleClearFilters = () => {
    setSelectedRole('all');
    setSelectedActionType('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-4 font-body">

      {/* ── 4 Useful & Functional Interactive KPI Cards ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Total Movements & Velocity */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleClearFilters}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClearFilters();
            }
          }}
          className={`group relative p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left select-none bg-white shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
            selectedActionType === 'all' && selectedRole === 'all' && !searchQuery
              ? 'ring-2 ring-gold border-gold/70 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 shadow-xs'
              : 'border-neutral-200/90 hover:border-neutral-300'
          }`}
          title="Click to view all movements"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Studio Velocity
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-heading tracking-tight">
              {stats.totalMovements}
            </span>
            <span className="text-xs font-semibold text-neutral-400">
              movements
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
            <span className="truncate">
              <strong className="text-neutral-700 font-semibold">{stats.todayCount}</strong> past 24h • {stats.uniqueOperators} staff
            </span>
            <span className="text-gold-dark font-semibold shrink-0 group-hover:underline flex items-center gap-0.5">
              <span>All</span>
              <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Bay & Shoot Operations */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setSelectedActionType(prev => prev === 'PHOTOGRAPHER_ASSIGNED' ? 'all' : 'PHOTOGRAPHER_ASSIGNED');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedActionType(prev => prev === 'PHOTOGRAPHER_ASSIGNED' ? 'all' : 'PHOTOGRAPHER_ASSIGNED');
            }
          }}
          className={`group relative p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left select-none bg-white shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
            selectedActionType === 'PHOTOGRAPHER_ASSIGNED'
              ? 'ring-2 ring-purple-500 border-purple-400 bg-gradient-to-br from-purple-50/40 via-white to-purple-50/20 shadow-xs'
              : 'border-neutral-200/90 hover:border-neutral-300'
          }`}
          title="Click to filter by bay assignments"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Bay & Shoots
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Camera size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-heading tracking-tight">
              {stats.photoTotal}
            </span>
            <span className="text-xs font-semibold text-neutral-400">
              dispatches
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
            <span className="truncate">
              <strong className="text-purple-700 font-semibold">{stats.photoDispatchCount}</strong> bays • {stats.photoScheduleCount} shifts
            </span>
            {selectedActionType === 'PHOTOGRAPHER_ASSIGNED' ? (
              <span className="inline-flex items-center gap-1 font-bold text-purple-700 shrink-0">
                <span>Active</span>
                <X size={11} />
              </span>
            ) : (
              <span className="text-purple-600 font-medium shrink-0 group-hover:underline flex items-center gap-0.5">
                <span>Filter</span>
                <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Booking Transitions */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setSelectedActionType(prev => prev === 'STATUS_CHANGE' ? 'all' : 'STATUS_CHANGE');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedActionType(prev => prev === 'STATUS_CHANGE' ? 'all' : 'STATUS_CHANGE');
            }
          }}
          className={`group relative p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left select-none bg-white shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
            selectedActionType === 'STATUS_CHANGE'
              ? 'ring-2 ring-blue-500 border-blue-400 bg-gradient-to-br from-blue-50/40 via-white to-blue-50/20 shadow-xs'
              : 'border-neutral-200/90 hover:border-neutral-300'
          }`}
          title="Click to filter by status updates"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Status Transitions
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-heading tracking-tight">
              {stats.milestonesTotal}
            </span>
            <span className="text-xs font-semibold text-neutral-400">
              milestones
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
            <span className="truncate">
              <strong className="text-blue-700 font-semibold">{stats.statusChangeCount}</strong> status • {stats.newIntakeCount} intake
            </span>
            {selectedActionType === 'STATUS_CHANGE' ? (
              <span className="inline-flex items-center gap-1 font-bold text-blue-700 shrink-0">
                <span>Active</span>
                <X size={11} />
              </span>
            ) : (
              <span className="text-blue-600 font-medium shrink-0 group-hover:underline flex items-center gap-0.5">
                <span>Filter</span>
                <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Ledger & Safety Audits */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setSelectedActionType(prev => prev === 'PAYMENT_RECORD' ? 'all' : 'PAYMENT_RECORD');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedActionType(prev => prev === 'PAYMENT_RECORD' ? 'all' : 'PAYMENT_RECORD');
            }
          }}
          className={`group relative p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left select-none bg-white shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
            selectedActionType === 'PAYMENT_RECORD'
              ? 'ring-2 ring-emerald-500 border-emerald-400 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 shadow-xs'
              : 'border-neutral-200/90 hover:border-neutral-300'
          }`}
          title="Click to filter by payment clearances"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Ledger & Safety
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-heading tracking-tight">
              {stats.safetyFinancialTotal}
            </span>
            <span className="text-xs font-semibold text-neutral-400">
              audits
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
            <span className="truncate">
              <strong className="text-emerald-700 font-semibold">{stats.paymentCount}</strong> ledger • {stats.trashCount} trash
            </span>
            {selectedActionType === 'PAYMENT_RECORD' ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 shrink-0">
                <span>Active</span>
                <X size={11} />
              </span>
            ) : (
              <span className="text-emerald-600 font-medium shrink-0 group-hover:underline flex items-center gap-0.5">
                <span>Filter</span>
                <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </div>
        </div>

      </div>

      {/* ── Main Activity Feed Luxury Card Hub ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-[#c9a96e]/35 bg-white/95 backdrop-blur-md shadow-xl shadow-amber-950/5 ring-1 ring-[#c9a96e]/15 font-body">
        {/* Top hairline amber accent */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#c9a96e] to-transparent pointer-events-none" />

        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-[#c9a96e]/20 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-b from-[#faf7f2]/60 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-900/20 shrink-0">
              <History size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
                  Audit Movement Feed
                </h2>
                <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                  {logs.length} logged
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Live studio actions, bay assignments, clearances &amp; shift updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="h-9 px-3.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset active filters"
              >
                <RotateCcw size={13} className="text-amber-700" />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="h-9 px-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-amber-600' : ''} />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-[#c9a96e]/15 bg-neutral-50/40 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search movements, operators, reference numbers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-8 py-2 bg-white border border-neutral-200/90 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 shadow-2xs placeholder:text-neutral-400 font-body transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5 rounded-full hover:bg-neutral-100 cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Role & Movement Filter Dropdowns */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <div className="w-full sm:w-48">
                <StudioDropdown
                  value={selectedRole}
                  onChange={setSelectedRole}
                  options={roleOptions}
                  placeholder="All Roles"
                  icon={ShieldCheck}
                  className="w-full"
                  menuClassName="w-52"
                />
              </div>
              <div className="w-full sm:w-64">
                <StudioDropdown
                  value={selectedActionType}
                  onChange={setSelectedActionType}
                  options={actionOptions}
                  placeholder="All Movements"
                  icon={Filter}
                  className="w-full"
                  menuClassName="w-64"
                />
              </div>
            </div>
          </div>

          {/* Active Filter Pill */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/60 flex-wrap text-xs text-neutral-500">
              <span className="font-semibold text-neutral-400 uppercase tracking-wider text-[11px]">Active Filter:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-medium">
                  Search: "{searchQuery}"
                  <X size={12} className="cursor-pointer text-neutral-400 hover:text-neutral-700" onClick={() => setSearchQuery('')} />
                </span>
              )}
              {selectedRole !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/70 text-xs font-medium">
                  Role: {roleOptions.find(o => o.value === selectedRole)?.label || selectedRole}
                  <X size={12} className="cursor-pointer text-amber-700 hover:text-amber-950" onClick={() => setSelectedRole('all')} />
                </span>
              )}
              {selectedActionType !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/70 text-xs font-medium">
                  Movement: {actionOptions.find(o => o.value === selectedActionType)?.label || selectedActionType}
                  <X size={12} className="cursor-pointer text-amber-700 hover:text-amber-950" onClick={() => setSelectedActionType('all')} />
                </span>
              )}
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-amber-700 hover:underline font-semibold text-xs ml-1 cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}
        </div>

      {/* ── Space-Efficient Activity List with Themed Gradient Cards ───────── */}
      {loading ? (
        <div className="p-4 sm:p-5 space-y-3 bg-neutral-100/50">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-neutral-200/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center text-sm text-neutral-500 font-body bg-neutral-50/30">
          <History size={36} className="mx-auto text-neutral-300 mb-2.5" />
          <p className="font-semibold text-neutral-700">No activity logs match your filter criteria.</p>
          <p className="text-xs text-neutral-400 mt-1">Try resetting the role or movement category filters.</p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="mt-3.5 px-3.5 py-1.5 bg-neutral-900 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="p-3.5 sm:p-5 space-y-2.5 bg-neutral-50/50">
          {logs.map((log) => {
            const cfg = ACTION_CONFIG[log.action_type] || ACTION_CONFIG.DEFAULT;
            const theme = getRoleTheme(log.admin_role);
            const isExpanded = expandedLogId === log.id;

            // Details metadata
            const details = log.details || {};
            const statusVal = details.status || details.new_status;
            const prevStatusVal = details.previous_status || details.old_status;
            const remarksVal = details.remarks || details.note || details.reason || details.comment;
            const photographerName = details.photographer_name;
            const amountVal = details.amount;

            // Direct message
            const directMsg = formatDirectMessage(log.description, log.admin_name);

            // Check if entity label is a real booking reference (e.g. BK-2026-00004)
            const isBookingTarget = log.entity_label && (
              log.entity_type === 'booking' ||
              log.entity_label.toUpperCase().startsWith('BK-') ||
              /^#?BK-\d+/i.test(log.entity_label)
            );
            const bookingNumber = isBookingTarget ? log.entity_label.replace(/^#/, '') : null;

            const ActionIcon = cfg.icon;
            const avatarUrl = log.admin_avatar || log.admin_profile?.avatar_url;

            return (
              <div
                key={log.id}
                className={`group p-3.5 sm:px-5 sm:py-3.5 rounded-2xl border transition-all duration-200 flex flex-col gap-2.5 ${theme.box}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  
                  {/* 1. Left Column: Administrator / Operator Identity */}
                  <div className="flex items-center gap-3 sm:w-56 md:w-64 lg:w-72 shrink-0">
                    
                    {/* Administrator Profile Photo with Fallback Initial */}
                    <div className="relative w-8 h-8 shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={log.admin_name || 'Operator'}
                          className={`w-8 h-8 rounded-full object-cover ${theme.avatarRing}`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs ${theme.avatarFallback}`}
                        style={{ display: avatarUrl ? 'none' : 'flex' }}
                      >
                        {log.admin_name?.charAt(0) || 'A'}
                      </div>
                    </div>

                    {/* Resolved Administrator / Operator Name (role text removed behind admin accounts) */}
                    <span className={`truncate max-w-[170px] sm:max-w-[210px] text-xs sm:text-sm ${theme.nameColor}`}>
                      {log.admin_name || 'Administrator'}
                    </span>
                  </div>

                  {/* 2. Middle Column: Generous Spacing + Movement Icon + Direct Log Message */}
                  <div className={`flex-1 min-w-0 flex items-center gap-3 sm:px-4 md:px-6 sm:border-l ${theme.divider}`}>
                    
                    {/* Movement Icon Badge */}
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 shadow-2xs ${theme.iconBadge}`}
                      title={cfg.label}
                      aria-label={cfg.label}
                    >
                      <ActionIcon size={14} />
                    </span>

                    {/* Direct, Crisp Movement Description */}
                    <span className={`truncate text-xs sm:text-sm flex-1 ${theme.message}`}>
                      {directMsg}
                    </span>
                  </div>

                  {/* 3. Right Column: Hover-Only Booking Target + Timestamp + Details Toggle */}
                  <div className="flex items-center justify-end gap-2.5 shrink-0 pl-2 self-end sm:self-center">
                    
                    {/* Hover-Only Booking Reference Link */}
                    {isBookingTarget && (
                      <Link
                        to={`/admin/bookings?search=${encodeURIComponent(bookingNumber)}`}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${theme.bookingLink}`}
                        title="Open assigned booking order"
                      >
                        <span>#{bookingNumber}</span>
                        <ExternalLink size={11} />
                      </Link>
                    )}

                    {/* Assigned Photographer Bay badge (hover-only) */}
                    {photographerName && (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold text-xs border border-purple-200">
                        <Camera size={11} />
                        <span>{photographerName}</span>
                      </span>
                    )}

                    {/* Payment Amount badge (hover-only) */}
                    {amountVal !== undefined && amountVal !== null && (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200">
                        <CreditCard size={11} />
                        <span>₱{Number(amountVal).toLocaleString()}</span>
                      </span>
                    )}

                    {/* Relative timestamp (always visible) */}
                    <span
                      className={`text-xs whitespace-nowrap ${theme.time}`}
                      title={new Date(log.created_at).toLocaleString()}
                    >
                      {formatRelativeTime(log.created_at)}
                    </span>

                    {/* Expand Details Toggle */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isExpanded
                            ? theme.expandBtnActive
                            : theme.expandBtn
                        }`}
                        title={isExpanded ? 'Collapse audit details' : 'Inspect what the operator tweaked'}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>

                </div>

                {/* ── Luxury Tweaked Details Inspector (Light Theme) ─────────── */}
                {isExpanded && log.details && (
                  <div className={`mt-1 p-3.5 rounded-xl space-y-2.5 animate-in fade-in duration-150 ${theme.expandedBox}`}>
                    
                    {/* Operational Status Row */}
                    {statusVal && (
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                          Recorded Status:
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white text-neutral-900 border border-neutral-300 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                          {String(statusVal).replace(/_/g, ' ')}
                        </span>
                        {prevStatusVal && (
                          <span className="text-xs text-neutral-500 font-medium">
                            (transitioned from <span className="font-semibold text-neutral-700">{String(prevStatusVal).replace(/_/g, ' ')}</span>)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Staff Remarks / Reason Callout */}
                    {remarksVal && (
                      <div className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-neutral-200/90 shadow-2xs">
                        <MessageSquare size={16} className="text-gold shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
                            Audit Notes & Remarks
                          </div>
                          <p className="text-xs font-medium text-neutral-800 leading-relaxed italic">
                            "{remarksVal}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Directly Display What the Admin Tweaked with Improved Luxury UI */}
                    <TweakedSettingsViewer details={log.details} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  </div>
);
}
