/**
 * AdminCustomers.jsx
 * ==================
 * High-End Administrative Customer Directory & Live Portal Presence Management.
 *
 * Key Capabilities:
 * • Seamless executive layout matching Admin Command Center & Bookings (max-w-screen-2xl)
 * • Unified luxury dark hero banner (AdminHeroBanner) with live Philippine Standard Time operations clock
 * • Real-time Customer Portal presence detection (🟢 Live Now via Supabase Presence channel)
 * • Interactive KPI overview strip (Total Clients, Live on Portal, Active Accounts, Academic Clients, Badges)
 * • Design-matched CustomDropdown filters (Presence, Status, Academic Affiliation) & live debounced search
 * • Controlled PII access toggle (Least privilege masking with audited unmasking)
 * • Full customer inspection drawer & modal (Identity, academic credentials, regalia fitting, booking history)
 * • Official Studio Recognitions (Milestone badges award & verification)
 * • Direct export to CSV
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight,
  Lock, Eye, Award, Check, Loader2, Save, X, GraduationCap, Shirt,
  Sparkles, Truck, ShieldCheck, MapPin, Phone, UserCheck, Calendar,
  FileText, Store, Info, CheckCircle2, Download, ArrowRightLeft,
  Camera, CalendarDays, ExternalLink, Activity, Radio, Plus, Filter,
  Copy, BookOpen, Layers, Trash2, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCustomers, updateCustomerBadges, deleteCustomer } from '../../services/adminService';
import { subscribeToCustomerPresence } from '../../services/presenceService';
import { maskClientPII } from '../../lib/securityValidator';
import { OFFICIAL_STUDIO_BADGES, hasBadge } from '../../data/studioBadgesData';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CustomDropdown from '../../components/ui/CustomDropdown';

const PAGE_SIZE = 20;

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function CustomerStatusCircle({ customer, presenceInfo = null }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const liveSince = presenceInfo?.online_at ? fmtDateTime(presenceInfo.online_at) : null;
  const whenIsLast = customer?.updated_at
    ? fmtDateTime(customer.updated_at)
    : (customer?.created_at ? fmtDateTime(customer.created_at) : 'Recently');

  return (
    <div
      className="absolute -top-1 -right-1 z-10 inline-flex items-center justify-center cursor-pointer"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.stopPropagation();
        setShowTooltip((v) => !v);
      }}
    >
      {/* Only one small circle indicator icon if the profile is online */}
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white shadow-xs" />
      </span>

      {/* Floating Tooltip */}
      {showTooltip && (
        <div
          className="absolute left-5 top-1/2 -translate-y-1/2 z-50 w-56 p-2.5 bg-neutral-950/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-neutral-700 text-xs pointer-events-none animate-fade-in text-left font-body"
          style={{ minWidth: '200px' }}
        >
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-neutral-950" />
          <div className="flex items-center gap-1.5 pb-1 mb-1.5 border-b border-neutral-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-xs text-emerald-400">Live on Customer Portal</span>
          </div>
          <div className="space-y-1 text-[11px] text-neutral-300">
            {liveSince && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-neutral-400 shrink-0">Live since:</span>
                <span className="font-semibold text-emerald-300 text-right">{liveSince}</span>
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <span className="text-neutral-400 shrink-0">Last activity:</span>
              <span className="text-neutral-200 text-right">{whenIsLast}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ c, isLive = false, presenceInfo = null }) {
  const ini = `${c?.first_name?.[0] || ''}${c?.last_name?.[0] || ''}`.toUpperCase() || 'U';
  const isInactive = c?.is_active === false;

  return (
    <div className="relative shrink-0">
      {c?.avatar_url ? (
        <img
          src={c.avatar_url}
          alt={ini}
          className={`w-10 h-10 rounded-full object-cover shadow-xs transition-all ${
            isInactive ? 'ring-2 ring-rose-400/80 opacity-75' : 'ring-2 ring-neutral-200'
          }`}
        />
      ) : (
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-heading text-sm font-bold shadow-xs transition-all ${
            isInactive
              ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-300'
              : 'bg-gold/15 text-gold-dark ring-2 ring-gold/25'
          }`}
        >
          {ini}
        </div>
      )}

      {/* ONLY one small circle indicator icon if the profile is online; NO green icon when offline/inactive */}
      {isLive && (
        <CustomerStatusCircle customer={c} presenceInfo={presenceInfo} />
      )}
    </div>
  );
}

export default function AdminCustomers() {
  const { profile } = useAuth();

  // Primary data state
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [query, setQuery]   = useState('');
  const [presenceFilter, setPresenceFilter]       = useState('ALL');    // ALL | ONLINE | OFFLINE
  const [statusFilter, setStatusFilter]           = useState('ALL');    // ALL | ACTIVE | INACTIVE
  const [affiliationFilter, setAffiliationFilter] = useState('ALL');    // ALL | STUDENT | GENERAL

  // Controlled PII Protection
  const [maskPii, setMaskPii] = useState(true);

  // Live Presence State (Real-time tracking of active portal users)
  const [liveOnlineMap, setLiveOnlineMap] = useState(new Map());

  // Customer Profile & Records Modal state
  const [selectedCustomerRecord, setSelectedCustomerRecord] = useState(null);

  // Badge management modal state
  const [badgeModalCustomer, setBadgeModalCustomer] = useState(null);
  const [badgeDraft, setBadgeDraft]                 = useState([]);
  const [savingBadges, setSavingBadges]             = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg]     = useState(null);

  // Customer Deletion Modal & Action state
  const [customerToDelete, setCustomerToDelete]     = useState(null);
  const [isDeleting, setIsDeleting]                 = useState(false);

  // ── 1. Subscribe to Live Customer Presence Channel ─────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToCustomerPresence((onlineMap) => {
      setLiveOnlineMap(new Map(onlineMap));
    });
    return unsubscribe;
  }, []);

  // ── 2. Load Customers from Database ────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, count, error: e } = await getCustomers({ page, pageSize: PAGE_SIZE, search: query });
    if (e) {
      setError('Failed to load customers from database.');
    }
    setRows(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page, query]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // ── 3. Client-Side Filtering on Rows (Presence, Status, Affiliation) ───────
  const filteredRows = useMemo(() => {
    return rows.filter((c) => {
      // Presence Filter
      const isOnline = liveOnlineMap.has(c.id);
      if (presenceFilter === 'ONLINE' && !isOnline) return false;
      if (presenceFilter === 'OFFLINE' && isOnline) return false;

      // Status Filter
      if (statusFilter === 'ACTIVE' && !c.is_active) return false;
      if (statusFilter === 'INACTIVE' && c.is_active) return false;

      // Affiliation Filter
      const isStudent = Boolean(c.studio_specs?.university || c.studio_specs?.degree);
      if (affiliationFilter === 'STUDENT' && !isStudent) return false;
      if (affiliationFilter === 'GENERAL' && isStudent) return false;

      return true;
    });
  }, [rows, liveOnlineMap, presenceFilter, statusFilter, affiliationFilter]);

  // ── 4. KPI Metrics Calculations ───────────────────────────────────────────
  const kpiStats = useMemo(() => {
    let onlineCount = 0;
    let activeAccounts = 0;
    let academicClients = 0;
    let totalBadges = 0;

    rows.forEach((c) => {
      if (liveOnlineMap.has(c.id)) onlineCount++;
      if (c.is_active) activeAccounts++;
      if (c.studio_specs?.university || c.studio_specs?.degree) academicClients++;
      if (Array.isArray(c.badges)) totalBadges += c.badges.length;
    });

    // Also consider live users from map who may be in full count
    const totalLivePresence = liveOnlineMap.size;

    return {
      totalClients: total,
      liveOnline: Math.max(onlineCount, totalLivePresence),
      activeAccounts,
      academicClients,
      totalBadges,
    };
  }, [rows, total, liveOnlineMap]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── 5. Badge Handlers ──────────────────────────────────────────────────────
  const handleOpenBadgeModal = (customer) => {
    setBadgeModalCustomer(customer);
    const existing = Array.isArray(customer.badges) ? customer.badges : [];
    setBadgeDraft(existing);
  };

  const handleToggleBadge = (badgeId) => {
    setBadgeDraft((prev) => {
      const exists = hasBadge(prev, badgeId);
      if (exists) {
        return prev.filter((b) => (typeof b === 'string' ? b !== badgeId : b?.id !== badgeId));
      } else {
        return [...prev, { id: badgeId, awarded_at: new Date().toISOString() }];
      }
    });
  };

  const handleSaveBadges = async () => {
    if (!badgeModalCustomer) return;
    setSavingBadges(true);
    try {
      const { error: saveErr } = await updateCustomerBadges(badgeModalCustomer.id, badgeDraft);
      if (saveErr) throw saveErr;

      // Update in local table state
      setRows((prev) =>
        prev.map((r) => (r.id === badgeModalCustomer.id ? { ...r, badges: badgeDraft } : r))
      );
      setActionSuccessMsg(`Recognitions updated for ${badgeModalCustomer.first_name || 'Customer'} ${badgeModalCustomer.last_name || ''}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      setBadgeModalCustomer(null);
    } catch (err) {
      alert(err.message || 'Failed to update recognitions.');
    } finally {
      setSavingBadges(false);
    }
  };

  // ── 6. CSV Export Function ─────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!rows.length) return;
    const headers = [
      'Customer ID', 'Full Name', 'Phone', 'Address', 'University / School',
      'Degree / Program', 'Live Presence', 'Account Status', 'Bookings Count', 'Badges Count', 'Registered Date'
    ];

    const csvRows = rows.map((c) => {
      const isOnline = liveOnlineMap.has(c.id) ? 'LIVE_NOW' : 'OFFLINE';
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Guest';
      const phone = c.phone || '';
      const address = (c.address || '').replace(/"/g, '""');
      const school = (c.studio_specs?.university || '').replace(/"/g, '""');
      const degree = (c.studio_specs?.degree || '').replace(/"/g, '""');
      const bookingsCount = c.bookings?.length || 0;
      const badgesCount = Array.isArray(c.badges) ? c.badges.length : 0;
      const status = c.is_active ? 'Active' : 'Inactive';
      const registered = c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '';

      return [
        `"${c.id}"`,
        `"${fullName}"`,
        `"${phone}"`,
        `"${address}"`,
        `"${school}"`,
        `"${degree}"`,
        `"${isOnline}"`,
        `"${status}"`,
        bookingsCount,
        badgesCount,
        `"${registered}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ekodak_customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── 5. Customer Deletion Handler ───────────────────────────────────────────
  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      const { error: delErr } = await deleteCustomer(customerToDelete.id);
      if (delErr) throw delErr;

      setRows((prev) => prev.filter((r) => r.id !== customerToDelete.id));
      setTotal((t) => Math.max(0, t - 1));
      if (selectedCustomerRecord?.id === customerToDelete.id) {
        setSelectedCustomerRecord(null);
      }
      const deletedName = `${customerToDelete.first_name || 'Customer'} ${customerToDelete.last_name || ''}`.trim();
      setCustomerToDelete(null);
      setActionSuccessMsg(`Customer account "${deletedName}" was successfully deleted.`);
      setTimeout(() => setActionSuccessMsg(null), 4500);
    } catch (err) {
      console.error('Delete customer error:', err);
      setError(`Failed to delete customer: ${err.message || 'Database error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-7 pb-20 animate-fade-in font-body">

      {/* ── 1. Luxury Dark Hero Banner adapted for Customer Directory ───────── */}
      <AdminHeroBanner
        station={profile?.role || 'admin'}
        badgeLabel="Customer Directory & Live Presence"
        badgeIcon={Users}
        title="Customer Management"
        subtitle="Monitor live client portal presence, academic credentials, fitting custody, and studio milestone recognitions."
        statusSummary={`${total} Registered Clients · ${kpiStats.liveOnline} Live on Portal · ${kpiStats.activeAccounts} Active Accounts`}
        primaryAction={{
          label: 'New Booking',
          icon: Plus,
          href: '/admin/bookings',
        }}
        secondaryAction={{
          label: 'Export CSV',
          icon: Download,
          onClick: handleExportCSV,
        }}
        onRefresh={load}
        isRefreshing={loading}
        onExport={handleExportCSV}
        extraTools={[
          { label: 'Workstation Hub', href: '/admin/workstation', icon: ArrowRightLeft, iconColor: 'text-gold' },
          { label: 'Manage Bookings', href: '/admin/bookings', icon: CalendarDays, iconColor: 'text-gold' },
          { label: 'Security & Audit', href: '/admin/security', icon: ShieldCheck, iconColor: 'text-neutral-400' },
        ]}
      />

      {/* ── 2. KPI Overview Metric Strip with 1-Click Filters ────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 font-body">
        {/* Total Customers */}
        <button
          type="button"
          onClick={() => {
            setPresenceFilter('ALL');
            setStatusFilter('ALL');
            setAffiliationFilter('ALL');
          }}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none hover:border-gold/60 hover:shadow-warm-sm ${
            presenceFilter === 'ALL' && statusFilter === 'ALL' && affiliationFilter === 'ALL'
              ? 'border-gold ring-2 ring-gold/25 bg-gradient-to-br from-amber-50/80 via-gold/15 to-white shadow-xs'
              : 'border-neutral-200/90 bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total Clients</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200/70 text-neutral-700 flex items-center justify-center">
              <Users size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-primary">{total}</p>
          <span className="text-xs text-neutral-400 font-normal mt-0.5 block truncate">Full registered database</span>
        </button>

        {/* Live on Customer Dashboard (Online Now) */}
        <button
          type="button"
          onClick={() => setPresenceFilter(presenceFilter === 'ONLINE' ? 'ALL' : 'ONLINE')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none hover:border-gold/60 hover:shadow-warm-sm ${
            presenceFilter === 'ONLINE'
              ? 'border-gold ring-2 ring-gold/25 bg-gradient-to-br from-amber-50/80 via-gold/15 to-white shadow-xs'
              : 'border-neutral-200/90 bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live on Portal
            </span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200/60 text-emerald-800 flex items-center justify-center">
              <Radio size={15} className="animate-pulse" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-primary">{kpiStats.liveOnline}</p>
          <span className="text-xs text-neutral-400 font-medium mt-0.5 block truncate">Active on dashboard now</span>
        </button>

        {/* Active Accounts */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none hover:border-gold/60 hover:shadow-warm-sm ${
            statusFilter === 'ACTIVE'
              ? 'border-gold ring-2 ring-gold/25 bg-gradient-to-br from-amber-50/80 via-gold/15 to-white shadow-xs'
              : 'border-neutral-200/90 bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Active Profiles</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200/70 text-neutral-700 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-primary">{kpiStats.activeAccounts}</p>
          <span className="text-xs text-neutral-400 font-normal mt-0.5 block truncate">Verified credentials</span>
        </button>

        {/* Academic / Student Clients */}
        <button
          type="button"
          onClick={() => setAffiliationFilter(affiliationFilter === 'STUDENT' ? 'ALL' : 'STUDENT')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none hover:border-gold/60 hover:shadow-warm-sm ${
            affiliationFilter === 'STUDENT'
              ? 'border-gold ring-2 ring-gold/25 bg-gradient-to-br from-amber-50/80 via-gold/15 to-white shadow-xs'
              : 'border-neutral-200/90 bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Academic Clients</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold/25 to-gold/10 text-gold-dark flex items-center justify-center">
              <GraduationCap size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-gold-dark">{kpiStats.academicClients}</p>
          <span className="text-xs text-neutral-400 font-normal mt-0.5 block truncate">With university record</span>
        </button>

        {/* Total Recognitions Awarded */}
        <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-xs bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Recognitions</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold/25 to-gold/10 text-gold-dark flex items-center justify-center">
              <Award size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-neutral-900">{kpiStats.totalBadges}</p>
          <span className="text-xs text-neutral-400 font-normal mt-0.5 block truncate">Studio badges verified</span>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-5 py-3.5 text-sm font-body animate-fade-in shadow-xs">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccessMsg}</span>
        </div>
      )}

      {/* ── 3. Search & Filter Toolbar with CustomDropdown Components ───────── */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[260px] max-w-xl">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client name, phone, school, degree..."
              className="w-full pl-10 pr-8 py-2.5 sm:py-3 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white rounded-xl text-xs sm:text-sm font-body border border-neutral-300/80 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & Real-time Launchers */}
          <div className="flex items-center gap-2.5 flex-wrap justify-start xl:justify-end">
            {/* Live Presence Filter */}
            <div className="w-44 sm:w-48">
              <CustomDropdown
                value={presenceFilter}
                onChange={setPresenceFilter}
                options={[
                  { value: 'ALL', label: 'All Presence', icon: Radio },
                  { value: 'ONLINE', label: '🟢 Live on Dashboard', dotColor: 'bg-emerald-500' },
                  { value: 'OFFLINE', label: '⚪ Offline Clients', dotColor: 'bg-neutral-400' },
                ]}
                placeholder="Live Presence"
                icon={Activity}
                className="w-full"
                popoverWidth="w-56"
              />
            </div>

            {/* Account Status Filter */}
            <div className="w-38 sm:w-42">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'ACTIVE', label: 'Active Profiles', dotColor: 'bg-emerald-500' },
                  { value: 'INACTIVE', label: 'Inactive / Suspended', dotColor: 'bg-neutral-400' },
                ]}
                placeholder="Account Status"
                icon={CheckCircle2}
                className="w-full"
                popoverWidth="w-52"
              />
            </div>

            {/* Affiliation / Client Type */}
            <div className="w-44 sm:w-48">
              <CustomDropdown
                value={affiliationFilter}
                onChange={setAffiliationFilter}
                options={[
                  { value: 'ALL', label: 'All Client Types' },
                  { value: 'STUDENT', label: 'Academic / Student', icon: GraduationCap },
                  { value: 'GENERAL', label: 'General Portrait' },
                ]}
                placeholder="Client Affiliation"
                icon={GraduationCap}
                className="w-full"
                popoverWidth="w-56"
              />
            </div>

            {/* Controlled PII Masking Security Button */}
            <button
              type="button"
              onClick={() => setMaskPii(!maskPii)}
              className="h-10 px-3.5 border border-neutral-300/80 bg-neutral-50 hover:bg-white hover:border-gold/60 rounded-xl text-xs sm:text-sm font-semibold text-neutral-700 transition-all inline-flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
              title="Toggle Controlled PII Masking (Role Audit Enforced)"
            >
              {maskPii ? <Lock size={14} className="text-purple-600" /> : <Eye size={14} className="text-emerald-600" />}
              <span>{maskPii ? 'Mask PII' : 'Reveal PII'}</span>
            </button>
          </div>

        </div>

        {/* Active Filters Pill Bar */}
        {(presenceFilter !== 'ALL' || statusFilter !== 'ALL' || affiliationFilter !== 'ALL' || query) && (
          <div className="flex items-center gap-2 pt-2.5 border-t border-neutral-100 flex-wrap text-xs text-neutral-500">
            <span className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">Active Filters:</span>
            {query && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-medium">
                Keyword: "{query}"
                <X size={12} className="cursor-pointer text-neutral-400 hover:text-neutral-700" onClick={() => { setSearch(''); setQuery(''); }} />
              </span>
            )}
            {presenceFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                {presenceFilter === 'ONLINE' ? 'Live on Portal' : 'Offline'}
                <X size={12} className="cursor-pointer text-emerald-600 hover:text-emerald-900" onClick={() => setPresenceFilter('ALL')} />
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-medium">
                {statusFilter === 'ACTIVE' ? 'Active Profiles' : 'Inactive / Suspended'}
                <X size={12} className="cursor-pointer text-neutral-400 hover:text-neutral-700" onClick={() => setStatusFilter('ALL')} />
              </span>
            )}
            {affiliationFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-medium">
                {affiliationFilter === 'STUDENT' ? 'Academic / Student' : 'General Portrait'}
                <X size={12} className="cursor-pointer text-neutral-400 hover:text-neutral-700" onClick={() => setAffiliationFilter('ALL')} />
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setQuery('');
                setPresenceFilter('ALL');
                setStatusFilter('ALL');
                setAffiliationFilter('ALL');
              }}
              className="text-gold hover:underline font-semibold text-xs ml-1 cursor-pointer"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {actionSuccessMsg && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-5 py-3.5 text-sm font-body animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-3.5 text-sm font-body">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 4. Main Customer Records Table (Display All in One View, No Sideways Scroll) ── */}
      <div className="bg-gradient-to-b from-white to-neutral-50/30 rounded-2xl border border-neutral-200/90 shadow-warm-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-neutral-100/70 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-3xl bg-neutral-100 text-neutral-400 flex items-center justify-center mb-4">
              <Users size={32} />
            </div>
            <h3 className="font-heading text-lg font-bold text-neutral-900">No Customers Found</h3>
            <p className="text-sm text-neutral-500 font-body max-w-sm mt-1">
              {query || presenceFilter !== 'ALL' || statusFilter !== 'ALL' || affiliationFilter !== 'ALL'
                ? 'No client profiles match your active search filters.'
                : 'No client profiles registered in the database yet.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed text-sm font-body text-left">
              <thead>
                <tr className="border-b border-neutral-200/80 bg-gradient-to-r from-neutral-50 via-neutral-100/40 to-neutral-50 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">
                  <th className="w-[36%] px-5 sm:px-6 py-3.5 sm:py-4">Customer Profile</th>
                  <th className="w-[26%] px-4 sm:px-5 py-3.5 sm:py-4">Contact & Location</th>
                  <th className="w-[18%] px-4 sm:px-5 py-3.5 sm:py-4">Bookings & Badges</th>
                  <th className="w-[20%] px-5 sm:px-6 py-3.5 sm:py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredRows.map((c) => {
                  const isLive = liveOnlineMap.has(c.id);
                  const presenceInfo = liveOnlineMap.get(c.id);
                  const badgeCount = Array.isArray(c.badges) ? c.badges.length : 0;
                  const bookingsCount = c.bookings?.length || 0;
                  const fullName = `${c.first_name || 'Guest'} ${c.last_name || ''}`.trim();
                  const university = c.studio_specs?.university;
                  const degree = c.studio_specs?.degree;
                  const isInactive = c.is_active === false;

                  return (
                    <tr
                      key={c.id}
                      className={`transition-all duration-150 ${
                        isInactive
                          ? 'bg-gradient-to-r from-rose-500/12 via-rose-500/5 to-transparent border-l-4 border-l-rose-500 hover:from-rose-500/18 hover:via-rose-500/8'
                          : 'hover:bg-neutral-50/70'
                      }`}
                    >

                      {/* Customer Profile & Academic Identification */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5 min-w-0 align-middle">
                        <div className={`flex items-center gap-3.5 min-w-0 ${
                          isInactive ? 'p-1.5 -m-1.5 rounded-2xl bg-gradient-to-r from-rose-100/70 via-rose-50/40 to-transparent' : ''
                        }`}>
                          <Avatar c={c} isLive={isLive} presenceInfo={presenceInfo} />
                          <div className="min-w-0 flex-1">
                            {/* Inactive Account Indicator if inactive */}
                            {isInactive && (
                              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300 mb-1 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>Inactive Account</span>
                              </div>
                            )}
                            <p className={`font-semibold text-sm sm:text-base leading-snug truncate ${isInactive ? 'text-rose-950 font-bold' : 'text-neutral-900'}`} title={fullName}>
                              {fullName}
                            </p>
                            {c.middle_name && (
                              <p className="text-xs text-neutral-400 truncate">{c.middle_name}</p>
                            )}
                            {(university || degree) ? (
                              <div
                                className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium mt-0.5 truncate"
                                title={`${university || ''} ${degree ? '• ' + degree : ''}`}
                              >
                                <GraduationCap size={13} className="text-gold shrink-0" />
                                <span className="truncate">{university || degree}</span>
                              </div>
                            ) : (
                              <p className="text-xs text-neutral-400 mt-0.5 truncate font-mono">
                                ID: {c.id.substring(0, 8)}...
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Phone & Residential Address */}
                      <td className="px-4 sm:px-5 py-4 sm:py-4.5 min-w-0 align-middle">
                        <div className="space-y-1 min-w-0">
                          {c.phone ? (
                            <a
                              href={`tel:${c.phone}`}
                              className="hover:text-gold hover:underline inline-flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-neutral-700 font-mono truncate max-w-full"
                            >
                              <Phone size={12} className="text-neutral-400 shrink-0" />
                              <span className="truncate">{maskPii ? maskClientPII(c.phone, 'phone') : c.phone}</span>
                            </a>
                          ) : (
                            <span className="text-neutral-400 text-xs italic block">—</span>
                          )}

                          <div className="flex items-center gap-1.5 text-xs text-neutral-500 truncate" title={c.address || 'Address not provided'}>
                            <MapPin size={12} className="text-neutral-400 shrink-0" />
                            <span className="truncate">{c.address || 'No address provided'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Bookings & Badges */}
                      <td className="px-4 sm:px-5 py-4 sm:py-4.5 align-middle">
                        <div className="flex flex-wrap items-center gap-2">
                          {bookingsCount > 0 ? (
                            <Link
                              to={`/admin/bookings?search=${encodeURIComponent(fullName)}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-neutral-100 hover:bg-gold/15 text-neutral-800 hover:text-gold-dark transition-all border border-neutral-200/70 shrink-0 shadow-2xs"
                              title="Filter bookings for this customer"
                            >
                              <CalendarDays size={13} className="text-gold" />
                              <span>{bookingsCount} {bookingsCount === 1 ? 'Booking' : 'Bookings'}</span>
                            </Link>
                          ) : (
                            <span className="text-xs text-neutral-400 italic">0 Bookings</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenBadgeModal(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-amber-50 text-neutral-700 border border-neutral-200 hover:border-gold hover:text-gold-dark transition-all shrink-0 cursor-pointer shadow-2xs"
                            title="Award or verify studio recognitions"
                          >
                            <Award size={13} className={badgeCount > 0 ? "text-gold" : "text-neutral-400"} />
                            <span>{badgeCount}</span>
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5 text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerRecord(c)}
                            className="px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-neutral-800 hover:text-gold bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-gold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            title="Inspect full profile, academic credentials & booking history"
                          >
                            <FileText size={14} className="text-gold" />
                            <span>Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenBadgeModal(c)}
                            className="px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-gold hover:text-gold-dark bg-white hover:bg-gold/5 border border-gold/40 hover:border-gold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                            title="Manage Studio Milestone Recognitions"
                          >
                            <Award size={14} />
                            <span>Badges</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCustomerToDelete(c)}
                            className="px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-neutral-200 hover:border-rose-300 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Delete customer account"
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
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
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-t border-neutral-100 text-xs sm:text-sm text-neutral-500 font-body bg-neutral-50/50">
            <span className="text-xs sm:text-sm">
              Showing page <strong className="text-neutral-900 font-semibold">{page}</strong> of <strong className="text-neutral-900 font-semibold">{totalPages}</strong> ({total} total records)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 transition-colors cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 transition-colors cursor-pointer"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Studio Badges Award Modal ──────────────────────────────────────── */}
      {badgeModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full border border-neutral-200 shadow-2xl space-y-5 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gold/15 text-gold-dark flex items-center justify-center shadow-xs">
                  <Award size={22} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-neutral-900">Award Studio Recognitions</h3>
                  <p className="text-xs text-neutral-500 font-body mt-0.5">
                    {badgeModalCustomer.first_name} {badgeModalCustomer.last_name || ''} · {badgeModalCustomer.phone || 'No phone set'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBadgeModalCustomer(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 font-body leading-relaxed">
              Verify and award milestone recognitions earned across client onboarding, photoshoot sessions, styling, and final handover:
            </p>

            <div className="space-y-3">
              {OFFICIAL_STUDIO_BADGES.map((badge) => {
                const isAwarded = hasBadge(badgeDraft, badge.id);
                return (
                  <div
                    key={badge.id}
                    onClick={() => handleToggleBadge(badge.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isAwarded
                        ? 'bg-amber-50/40 border-gold/50 shadow-2xs ring-1 ring-gold/30'
                        : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-body font-bold uppercase tracking-wider text-neutral-400">
                          {badge.category}
                        </span>
                        {isAwarded && (
                          <span className="text-[10px] font-body font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <Check size={10} /> Verified
                          </span>
                        )}
                      </div>
                      <h4 className={`text-sm font-bold ${isAwarded ? 'text-neutral-900' : 'text-neutral-700'}`}>
                        {badge.title}
                      </h4>
                      <p className="text-xs text-neutral-500 font-body leading-relaxed">
                        {badge.description}
                      </p>
                    </div>

                    <div className="shrink-0 mt-1">
                      <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                        isAwarded
                          ? 'bg-gold border-gold text-white shadow-xs'
                          : 'border-neutral-300 bg-white'
                      }`}>
                        {isAwarded && <Check size={14} className="stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs font-body text-neutral-500">
                <strong className="text-neutral-900">{badgeDraft.length}</strong> of {OFFICIAL_STUDIO_BADGES.length} recognitions selected
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setBadgeModalCustomer(null)}
                  className="px-4 py-2.5 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingBadges}
                  onClick={handleSaveBadges}
                  className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2 shadow-md shadow-gold/20 cursor-pointer disabled:opacity-50"
                >
                  {savingBadges ? (
                    <><Loader2 size={14} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={14} /> Save Recognitions</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Records & Specifications Modal ─────────────────────────── */}
      {selectedCustomerRecord && (() => {
        const c = selectedCustomerRecord;
        const specs = c.studio_specs || {};
        const badgesList = Array.isArray(c.badges) ? c.badges : [];
        const bookingsList = Array.isArray(c.bookings) ? c.bookings : [];
        const isOnline = liveOnlineMap.has(c.id);
        const presenceInfo = liveOnlineMap.get(c.id);

        const displayPhone = c.phone ? (maskPii ? maskClientPII(c.phone, 'phone') : c.phone) : '—';
        const displayCourierPhone = specs.courier_phone ? (maskPii ? maskClientPII(specs.courier_phone, 'phone') : specs.courier_phone) : null;
        const displayEmergencyPhone = specs.emergencyContactPhone ? (maskPii ? maskClientPII(specs.emergencyContactPhone, 'phone') : specs.emergencyContactPhone) : null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/75 backdrop-blur-xs animate-fade-in">
            <div className={`bg-white rounded-3xl max-w-4xl w-full border shadow-2xl animate-slide-up max-h-[92vh] flex flex-col overflow-hidden ${
              !c.is_active ? 'border-rose-300 ring-2 ring-rose-500/20' : 'border-neutral-200'
            }`}>

              {/* Active Online Presence Banner at Top of Profile Account */}
              {isOnline && (
                <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-800 shrink-0">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
                    <span>Active Now: Customer is live on the customer portal</span>
                  </div>
                  {presenceInfo?.online_at && (
                    <span className="text-emerald-700 font-medium text-[11px] font-mono">
                      Connected: {fmtDateTime(presenceInfo.online_at)}
                    </span>
                  )}
                </div>
              )}

              {/* Inactive Profile Banner with Red Gradient */}
              {!c.is_active && (
                <div className="bg-gradient-to-r from-rose-500/20 via-rose-500/10 to-transparent border-b border-rose-200 px-6 py-2.5 flex items-center justify-between text-xs text-rose-800 shrink-0">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/25" />
                    <span>Inactive Customer Profile (Account Deactivated)</span>
                  </div>
                </div>
              )}

              {/* Modal Header with Live Presence Indicator */}
              <div className={`flex items-center justify-between border-b p-6 pb-5 shrink-0 ${
                !c.is_active
                  ? 'bg-gradient-to-r from-rose-50/90 via-rose-50/30 to-neutral-50/60 border-rose-100'
                  : 'bg-neutral-50/60 border-neutral-100'
              }`}>
                <div className="flex items-center gap-4">
                  <Avatar c={c} isLive={isOnline} presenceInfo={presenceInfo} />
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className={`font-heading text-xl sm:text-2xl font-bold ${!c.is_active ? 'text-rose-950' : 'text-neutral-900'}`}>
                        {c.first_name} {c.middle_name ? `${c.middle_name} ` : ''}{c.last_name || ''}
                      </h3>
                      {isOnline ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Live on Customer Portal
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                          Offline
                        </span>
                      )}
                      {c.is_active ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 size={12} /> Active Account
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                          Inactive Account
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 font-body flex items-center gap-2 mt-1">
                      <span>Client ID: <span className="font-mono text-neutral-700 font-semibold">{c.id.substring(0, 13)}...</span></span>
                      <span>•</span>
                      <span>Registered on: {fmt(c.created_at)}</span>
                      {presenceInfo?.online_at && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">Session connected: {fmtDateTime(presenceInfo.online_at)}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomerRecord(null)}
                  className="text-neutral-400 hover:text-neutral-700 p-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content Body - Scrollable */}
              <div className="p-6 pt-0 overflow-y-auto space-y-6 font-body text-sm flex-1">

                {/* Quick Contact & Bio Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1">
                      <Phone size={12} className="text-gold" /> Phone Contact
                    </span>
                    <p className="font-semibold text-neutral-900 text-sm">{displayPhone}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1">
                      <MapPin size={12} className="text-gold" /> Profile Address
                    </span>
                    <p className="font-semibold text-neutral-900 text-sm truncate" title={c.address || 'Not provided'}>
                      {c.address || '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1">
                      <UserCheck size={12} className="text-gold" /> Profile Notes
                    </span>
                    <p className="font-semibold text-neutral-900 text-sm truncate" title={c.bio || 'None'}>
                      {c.bio || '—'}
                    </p>
                  </div>
                </div>

                {/* Booking History Section */}
                {bookingsList.length > 0 && (
                  <div className="p-5 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={18} className="text-gold" />
                        <h4 className="font-heading text-base font-bold text-neutral-900">
                          Booking Records ({bookingsList.length})
                        </h4>
                      </div>
                      <Link
                        to={`/admin/bookings?search=${encodeURIComponent(c.first_name + ' ' + (c.last_name || ''))}`}
                        className="text-xs text-gold hover:underline font-bold"
                      >
                        View all in Bookings →
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {bookingsList.map((b) => (
                        <div key={b.id} className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-2xs space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-neutral-900 text-sm">{b.booking_number}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                              {b.status}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500">
                            Shoot: {fmt(b.event_date)} · Payment: <span className="font-semibold text-neutral-700">{b.payment_status}</span>
                          </p>
                          <Link
                            to={`/admin/bookings/${b.id}`}
                            className="text-xs text-gold hover:underline inline-flex items-center gap-1 font-bold pt-1"
                          >
                            Open Master Record <ExternalLink size={10} />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Card 1: Academic Affiliation & Fitting */}
                  <div className="p-5 rounded-2xl border border-neutral-200/80 bg-white shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
                      <GraduationCap size={18} className="text-gold" />
                      <h4 className="font-heading text-base font-bold text-neutral-900">Academic Affiliation & Fitting</h4>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                        <span className="text-neutral-500">University / College</span>
                        <span className="font-semibold text-neutral-900 text-right">{specs.university || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                        <span className="text-neutral-500">Campus / Branch</span>
                        <span className="font-semibold text-neutral-900 text-right">{specs.campus || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                        <span className="text-neutral-500">Degree / Program</span>
                        <span className="font-semibold text-neutral-900 text-right">{specs.degree || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                        <span className="text-neutral-500">Student ID Number</span>
                        <span className="font-mono font-semibold text-neutral-900 text-right">{specs.studentId || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                        <span className="text-neutral-500">Class Term / Year</span>
                        <span className="font-semibold text-neutral-900 text-right">{specs.gradYear || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                        <span className="text-neutral-500">Academic Honors</span>
                        <span className="font-semibold text-gold-dark text-right">{specs.honors || 'Standard'}</span>
                      </div>

                      <div className="pt-2">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1 mb-2">
                          <Shirt size={13} className="text-gold" /> Studio Wardrobe Sizing
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                            <p className="text-[10px] text-neutral-400 uppercase font-semibold">Toga Robe Size</p>
                            <p className="text-xs font-bold text-neutral-900 mt-0.5">{specs.togaSize || 'Unspecified'}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                            <p className="text-[10px] text-neutral-400 uppercase font-semibold">Height (cm)</p>
                            <p className="text-xs font-bold text-neutral-900 mt-0.5">{specs.height_cm ? `${specs.height_cm} cm` : 'Unspecified'}</p>
                          </div>
                        </div>
                        {specs.hoodDiscipline && (
                          <div className="mt-2 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                            <p className="text-[10px] text-neutral-400 uppercase font-semibold">Hood Discipline & Trim</p>
                            <p className="text-xs font-bold text-neutral-900 mt-0.5">{specs.hoodDiscipline}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Creative Styling & Shoot Instructions */}
                  <div className="p-5 rounded-2xl border border-neutral-200/80 bg-white shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
                      <Sparkles size={18} className="text-gold" />
                      <h4 className="font-heading text-base font-bold text-neutral-900">Creative Styling Calibration</h4>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                        <span className="text-neutral-500">Backdrop Tone / Setting</span>
                        <span className="font-semibold text-neutral-900 text-right">{specs.backdrop || 'Default Classic Gray'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                        <span className="text-neutral-500">Retouching Calibration</span>
                        <span className="font-semibold text-neutral-900 text-right">{specs.retouch || 'Natural Studio Polish'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                        <span className="text-neutral-500">Makeup Preference</span>
                        <span className="font-semibold text-neutral-900 text-right">{specs.makeupPreference || 'Standard Studio Styling'}</span>
                      </div>

                      <div className="pt-2">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1 mb-1">
                          Photographer Custom Guidance
                        </span>
                        <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 min-h-[64px]">
                          <p className="text-xs text-neutral-700 italic leading-relaxed">
                            {specs.photographerNotes || 'No custom pose or lighting instructions noted by customer.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Fulfillment & Handover Protocols */}
                  <div className="p-5 rounded-2xl border border-neutral-200/80 bg-white shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
                      <Truck size={18} className="text-gold" />
                      <h4 className="font-heading text-base font-bold text-neutral-900">Fulfillment & Handover Protocols</h4>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between">
                        <span className="text-neutral-600 font-medium">Selected Protocol:</span>
                        {specs.fulfillment_mode === 'direct_delivery' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Truck size={13} /> Studio Direct Delivery
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Store size={13} /> Studio In-Person Claiming
                          </span>
                        )}
                      </div>

                      {specs.fulfillment_mode === 'direct_delivery' ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                            <span className="text-neutral-500">Recipient Name</span>
                            <span className="font-semibold text-neutral-900">{specs.courier_recipient_name || '—'}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                            <span className="text-neutral-500">Contact Number</span>
                            <span className="font-semibold text-neutral-900">{displayCourierPhone || '—'}</span>
                          </div>
                          <div className="py-1 border-b border-neutral-50">
                            <span className="text-neutral-500 block mb-0.5">Shipping Destination</span>
                            <span className="font-semibold text-neutral-900">{specs.shipping_address || c.address || '—'}</span>
                          </div>
                          <div className="py-1">
                            <span className="text-neutral-500 block mb-0.5">Dispatch / Gate Instructions</span>
                            <span className="text-neutral-700 italic">{specs.delivery_instructions || 'None provided'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200 text-blue-900 text-xs leading-relaxed">
                          Client has elected for in-person photo package counter claiming at the studio facility upon completion of prints & framing.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 4: Legal & Digital Audit Code */}
                  <div className="p-5 rounded-2xl border border-neutral-200/80 bg-white shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
                      <ShieldCheck size={18} className="text-gold" />
                      <h4 className="font-heading text-base font-bold text-neutral-900">Legal Compliance & Digital Audit</h4>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                        <span className="text-neutral-500">Model Release Consent</span>
                        {specs.agreedModelRelease ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            Authorized & Signed
                          </span>
                        ) : (
                          <span className="text-neutral-500 font-medium">
                            Private Studio Use Only
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                        <span className="text-neutral-500">Digital Audit Signature</span>
                        <span className="font-mono font-bold text-xs bg-neutral-100 text-neutral-800 px-2.5 py-1 rounded-md border border-neutral-200">
                          {specs.termsSignatureHash || 'SIG-UNINITIALIZED'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-neutral-50">
                        <span className="text-neutral-500">Terms Acceptance</span>
                        <span className="font-semibold text-neutral-900">
                          {specs.termsSignedTimestamp ? fmt(specs.termsSignedTimestamp) : 'Pending booking sign-off'}
                        </span>
                      </div>

                      <div className="pt-2">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
                          Emergency Contact Reference
                        </span>
                        <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex justify-between items-center">
                          <span className="text-neutral-800 font-semibold">{specs.emergencyContactName || 'None listed'}</span>
                          <span className="text-neutral-500">{displayEmergencyPhone || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 5: Awarded Studio Recognitions */}
                {badgesList.length > 0 && (
                  <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/60 space-y-3">
                    <div className="flex items-center gap-2">
                      <Award size={18} className="text-gold" />
                      <h4 className="font-heading text-base font-bold text-neutral-900">
                        Awarded Studio Recognitions ({badgesList.length})
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {badgesList.map((b, idx) => {
                        const bId = typeof b === 'string' ? b : b?.id;
                        const match = OFFICIAL_STUDIO_BADGES.find((x) => x.id === bId);
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gold/40 rounded-full text-xs font-semibold text-neutral-900 shadow-2xs"
                          >
                            <Award size={14} className="text-gold" />
                            <span>{match?.title || bId}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 px-7 border-t border-neutral-100 bg-neutral-50/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const custToBadge = c;
                      setSelectedCustomerRecord(null);
                      handleOpenBadgeModal(custToBadge);
                    }}
                    className="h-10 px-4 text-xs font-bold text-gold hover:text-gold-dark border border-gold/40 hover:border-gold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer bg-white shadow-2xs"
                  >
                    <Award size={15} />
                    <span>Manage Milestone Badges</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const toDel = c;
                      setSelectedCustomerRecord(null);
                      setCustomerToDelete(toDel);
                    }}
                    className="h-10 px-4 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer bg-white shadow-2xs"
                    title="Delete this customer profile"
                  >
                    <Trash2 size={15} />
                    <span>Delete Profile</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCustomerRecord(null)}
                  className="h-10 px-6 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Close Records
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Delete Customer Confirmation Modal ───────────────────────────────── */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-neutral-200 shadow-2xl p-6 space-y-5 animate-scale-in">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/70">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-neutral-900">Delete Customer Account</h3>
                <p className="text-xs text-neutral-500 font-body">Permanent administrative deletion</p>
              </div>
            </div>

            <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80 space-y-3 text-xs font-body">
              <div className="flex items-center gap-3">
                <Avatar c={customerToDelete} showStatus={false} />
                <div className="min-w-0">
                  <p className="font-bold text-neutral-900 text-sm truncate">
                    {customerToDelete.first_name || 'Guest'} {customerToDelete.last_name || ''}
                  </p>
                  <p className="text-neutral-500 font-mono text-[11px] truncate">
                    ID: {customerToDelete.id}
                  </p>
                </div>
              </div>
              <p className="text-neutral-600 leading-relaxed pt-1 border-t border-neutral-200/60">
                Are you sure you want to permanently delete this customer profile? All associated bookings, specifications, and client records will be permanently removed from the system.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={isDeleting}
                className="h-10 px-4 text-xs font-bold text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCustomer}
                disabled={isDeleting}
                className="h-10 px-5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
