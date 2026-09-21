/**
 * AdminPhotographers.jsx
 * ======================
 * High-End Administrative Photographer Roster & Operational Readiness Management.
 *
 * Space-Efficient Executive Layout:
 * • Sized to match Admin Command Center, Bookings & Customers (max-w-screen-2xl)
 * • Unified luxury dark hero banner (AdminHeroBanner) with live PST operations clock
 * • Real-time Photographer Portal presence detection (🟢 Live Now via Supabase Presence channel)
 * • Only one small pulsing emerald circle indicator icon on the avatar IF the photographer is online
 * • Red gradient highlighting on the row for inactive/unapproved accounts
 * • Compact, space-efficient 6-card KPI overview strip (1-click filtering)
 * • Design-matched CustomDropdown filters (Presence, Status, Specialization, Workload) & debounced search
 * • Sleek, space-optimized table view (px-4 py-3, text-xs/sm typography, unified badges)
 * • Admin Management Tools:
 *   - Quick 1-click Availability Toggle (Available <-> Off-duty)
 *   - Account Approval for newly registered photographers
 *   - Edit Photographer Profile modal
 *   - Deep Inspection modal (Profile, Workload, Recorded Availability Schedule, Assigned Bookings)
 *   - Safe Delete Photographer action with confirmation modal & workload safety warning
 * • Direct export of photographer roster to CSV
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Camera, RefreshCw, AlertCircle, CheckCircle2, XCircle, Search,
  Calendar, Clock, Briefcase, User, Phone, Eye, X, ChevronRight,
  ShieldCheck, FileText, Download, Plus, Edit3, Trash2, Mail,
  Check, AlertTriangle, Activity, Radio, Sparkles, UserCheck,
  CalendarDays, ArrowRightLeft, Users, Filter
} from 'lucide-react';
import { getPhotographersWithWorkloadAndAvailability } from '../../services/bookingAdminService';
import {
  togglePhotographerAvailability,
  approvePhotographer,
  getPhotographerAvailabilityRecords,
  getPhotographerBookings,
  deletePhotographer,
} from '../../services/adminService';
import { updatePhotographerProfileData } from '../../services/photographerService';
import { subscribeToCustomerPresence } from '../../services/presenceService';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CustomDropdown from '../../components/ui/CustomDropdown';

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

function PhotographerStatusCircle({ photographer, presenceInfo = null }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const liveSince = presenceInfo?.online_at ? fmtDateTime(presenceInfo.online_at) : null;
  const whenIsLast = photographer?.updated_at
    ? fmtDateTime(photographer.updated_at)
    : (photographer?.created_at ? fmtDateTime(photographer.created_at) : 'Recently');

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
      <span className="relative flex h-3 w-3 items-center justify-center">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-2 ring-white shadow-2xs" />
      </span>

      {/* Floating Tooltip */}
      {showTooltip && (
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-52 p-2 bg-neutral-950/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-neutral-700 text-xs pointer-events-none animate-fade-in text-left font-body"
          style={{ minWidth: '200px' }}
        >
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-neutral-950" />
          <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-neutral-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-[11px] text-emerald-400">Live on Photographer Portal</span>
          </div>
          <div className="space-y-0.5 text-[10px] text-neutral-300">
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

function Avatar({ p, isLive = false, presenceInfo = null, size = "9" }) {
  const ini = `${p?.first_name?.[0] || ''}${p?.last_name?.[0] || ''}`.toUpperCase() || 'P';
  const sizeClass = size === "12" ? "w-12 h-12 text-sm" : "w-9 h-9 text-xs";
  const isInactive = p?.is_active === false;

  return (
    <div className="relative shrink-0">
      {p?.avatar_url ? (
        <img
          src={p.avatar_url}
          alt={ini}
          className={`${sizeClass} rounded-full object-cover shadow-2xs transition-all ${
            isInactive ? 'ring-2 ring-rose-400/80 opacity-75' : 'ring-1.5 ring-neutral-200'
          }`}
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full flex items-center justify-center font-heading font-bold shadow-2xs transition-all ${
            isInactive
              ? 'bg-rose-100 text-rose-700 ring-1.5 ring-rose-300'
              : 'bg-gold/15 text-gold-dark ring-1.5 ring-gold/25'
          }`}
        >
          {ini}
        </div>
      )}

      {/* ONLY one small circle indicator icon if online; NO green icon when offline */}
      {isLive && (
        <PhotographerStatusCircle photographer={p} presenceInfo={presenceInfo} />
      )}
    </div>
  );
}

const COMMON_SPECIALIZATIONS = [
  'General Photography',
  'Portrait & Graduation',
  'Studio Portraiture',
  'Academic Regalia & Yearbooks',
  'Events & Ceremonies',
  'Commercial & Editorial',
  'Creative & Fashion',
];

export default function AdminPhotographers() {
  const { profile } = useAuth();

  // Primary data state
  const [photographers, setPhotographers] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Management operation states
  const [toggling, setToggling]           = useState(null);
  const [deletingPh, setDeletingPh]       = useState(null);
  const [isDeleting, setIsDeleting]       = useState(false);

  // Edit Modal state
  const [editingPh, setEditingPh]         = useState(null);
  const [editForm, setEditForm]           = useState({
    first_name: '',
    last_name: '',
    phone: '',
    specialization: '',
    bio: '',
    is_available: true,
    is_active: true,
  });
  const [isSavingEdit, setIsSavingEdit]   = useState(false);

  // Details inspection modal state
  const [selectedPh, setSelectedPh]       = useState(null);
  const [modalLoading, setModalLoading]   = useState(false);
  const [availRecords, setAvailRecords]   = useState([]);
  const [phBookings, setPhBookings]       = useState([]);

  // Search & Filter state
  const [search, setSearch]               = useState('');
  const [presenceFilter, setPresenceFilter]             = useState('ALL');       // ALL | ONLINE | OFFLINE
  const [statusFilter, setStatusFilter]                 = useState('ALL');       // ALL | AVAILABLE | UNAVAILABLE | PENDING | INACTIVE
  const [specializationFilter, setSpecializationFilter] = useState('ALL');       // ALL | string
  const [workloadFilter, setWorkloadFilter]             = useState('ALL');       // ALL | FREE | LIGHT | BUSY

  // Real-time live presence
  const [liveOnlineMap, setLiveOnlineMap] = useState(new Map());

  // Subscribe to live portal presence
  useEffect(() => {
    const unsubscribe = subscribeToCustomerPresence((onlineMap) => {
      setLiveOnlineMap(onlineMap);
    });
    return unsubscribe;
  }, []);

  // Load photographer roster
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await getPhotographersWithWorkloadAndAvailability();
    if (e) {
      setError('Failed to load photographer records.');
    } else {
      setPhotographers(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Flash action message helper
  const notifySuccess = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Toggle photographer availability (quick tool)
  const handleToggle = async (id, current) => {
    setToggling(id);
    const { error: err } = await togglePhotographerAvailability(id, !current);
    if (!err) {
      setPhotographers(prev => prev.map(p => p.id === id ? { ...p, is_available: !current } : p));
      if (selectedPh && selectedPh.id === id) {
        setSelectedPh(prev => ({ ...prev, is_available: !current }));
      }
      notifySuccess(`Availability updated to ${!current ? 'Available' : 'Off-duty'}.`);
    } else {
      setError('Failed to update photographer availability.');
    }
    setToggling(null);
  };

  // Approve pending photographer (quick tool)
  const handleApprove = async (id) => {
    setToggling(id);
    const { error: err } = await approvePhotographer(id);
    if (!err) {
      setPhotographers(prev => prev.map(p => p.id === id ? { ...p, is_active: true } : p));
      if (selectedPh && selectedPh.id === id) {
        setSelectedPh(prev => ({ ...prev, is_active: true }));
      }
      notifySuccess('Photographer account approved successfully.');
    } else {
      setError('Failed to approve photographer account.');
    }
    setToggling(null);
  };

  // Open Edit Photographer Modal
  const openEditModal = (ph) => {
    setEditingPh(ph);
    setEditForm({
      first_name: ph.first_name || '',
      last_name: ph.last_name || '',
      phone: ph.phone || '',
      specialization: ph.specialization || 'General Photography',
      bio: ph.bio || '',
      is_available: ph.is_available ?? true,
      is_active: ph.is_active ?? true,
    });
  };

  // Save Edit Photographer Modal
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPh) return;
    setIsSavingEdit(true);
    setError(null);

    const { error: saveErr } = await updatePhotographerProfileData(editingPh.id, editForm);
    if (saveErr) {
      setError('Failed to update photographer profile.');
      setIsSavingEdit(false);
      return;
    }

    setPhotographers(prev => prev.map(p => {
      if (p.id === editingPh.id) {
        return {
          ...p,
          ...editForm,
        };
      }
      return p;
    }));

    if (selectedPh && selectedPh.id === editingPh.id) {
      setSelectedPh(prev => ({ ...prev, ...editForm }));
    }

    setIsSavingEdit(false);
    setEditingPh(null);
    notifySuccess('Photographer profile updated successfully.');
  };

  // Delete Photographer Action
  const handleDeleteConfirm = async () => {
    if (!deletingPh) return;
    setIsDeleting(true);
    setError(null);

    const { error: delErr } = await deletePhotographer(deletingPh.id);
    if (delErr) {
      setError('Failed to delete photographer profile.');
      setIsDeleting(false);
      return;
    }

    setPhotographers(prev => prev.filter(p => p.id !== deletingPh.id));
    if (selectedPh && selectedPh.id === deletingPh.id) {
      setSelectedPh(null);
    }
    setIsDeleting(false);
    setDeletingPh(null);
    notifySuccess('Photographer account deleted from studio roster.');
  };

  // Open Details Modal
  const openDetailsModal = async (ph) => {
    setSelectedPh(ph);
    setModalLoading(true);
    setAvailRecords([]);
    setPhBookings([]);

    try {
      const [avRes, bkRes] = await Promise.all([
        getPhotographerAvailabilityRecords(ph.id),
        getPhotographerBookings(ph.id)
      ]);
      setAvailRecords(avRes.data || []);
      setPhBookings(bkRes.data || []);
    } catch (e) {
      console.error('Error fetching photographer details:', e);
    } finally {
      setModalLoading(false);
    }
  };

  // Export Roster to CSV
  const handleExportCSV = () => {
    if (photographers.length === 0) return;
    const headers = ['Full Name', 'Email', 'Phone', 'Specialization', 'Account Status', 'Readiness', 'Active Shoots', 'Next Assignment', 'Bio'];
    const rows = photographers.map(p => [
      `"${p.first_name || ''} ${p.last_name || ''}"`,
      `"${p.email || ''}"`,
      `"${p.phone || ''}"`,
      `"${p.specialization || 'General Photography'}"`,
      p.is_active ? 'Active' : 'Pending / Inactive',
      p.is_available ? 'Available' : 'Off-duty',
      p.activeWorkloadCount || 0,
      p.nextUpcoming ? `"${p.nextUpcoming.event_date} ${p.nextUpcoming.preferred_time || ''}"` : 'None',
      `"${(p.bio || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `e-kodak-photographers-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notifySuccess('Photographer roster exported successfully.');
  };

  // Dynamic Specialization list from data
  const availableSpecializations = useMemo(() => {
    const set = new Set(COMMON_SPECIALIZATIONS);
    photographers.forEach(p => {
      if (p.specialization) set.add(p.specialization);
    });
    return Array.from(set);
  }, [photographers]);

  // KPI calculations
  const kpiStats = useMemo(() => {
    const total = photographers.length;
    let liveOnline = 0;
    let available = 0;
    let unavailable = 0;
    let pending = 0;
    let totalWorkload = 0;

    photographers.forEach(p => {
      if (liveOnlineMap.has(p.id)) liveOnline++;
      if (p.is_active && p.is_available) available++;
      if (p.is_active && !p.is_available) unavailable++;
      if (!p.is_active) pending++;
      totalWorkload += (p.activeWorkloadCount || 0);
    });

    return {
      total,
      liveOnline,
      available,
      unavailable,
      pending,
      totalWorkload,
    };
  }, [photographers, liveOnlineMap]);

  // Filtered photographers
  const filtered = useMemo(() => {
    return photographers.filter(p => {
      // 1. Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
        const spec = (p.specialization || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        const bio = (p.bio || '').toLowerCase();
        if (!fullName.includes(q) && !spec.includes(q) && !phone.includes(q) && !email.includes(q) && !bio.includes(q)) {
          return false;
        }
      }

      // 2. Presence filter
      const isLive = liveOnlineMap.has(p.id);
      if (presenceFilter === 'ONLINE' && !isLive) return false;
      if (presenceFilter === 'OFFLINE' && isLive) return false;

      // 3. Status & Readiness filter
      if (statusFilter === 'AVAILABLE' && (!p.is_active || !p.is_available)) return false;
      if (statusFilter === 'UNAVAILABLE' && (!p.is_active || p.is_available)) return false;
      if (statusFilter === 'PENDING' && p.is_active) return false;
      if (statusFilter === 'INACTIVE' && p.is_active) return false;

      // 4. Specialization filter
      if (specializationFilter !== 'ALL' && p.specialization !== specializationFilter) return false;

      // 5. Workload filter
      const loadCount = p.activeWorkloadCount || 0;
      if (workloadFilter === 'FREE' && loadCount > 0) return false;
      if (workloadFilter === 'LIGHT' && (loadCount < 1 || loadCount > 2)) return false;
      if (workloadFilter === 'BUSY' && loadCount < 3) return false;

      return true;
    });
  }, [photographers, search, presenceFilter, statusFilter, specializationFilter, workloadFilter, liveOnlineMap]);

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-6 pb-16 animate-fade-in font-body">
      {/* ── 1. Luxury Dark Hero Banner (Adapted for Photographers) ───────────── */}
      <AdminHeroBanner
        station={profile?.role || 'admin'}
        badgeLabel="Photographer Roster & Readiness"
        badgeIcon={Camera}
        title="Photographer Management"
        subtitle="Manage photographer profiles, real-time availability schedules, assignments, and studio authorizations."
        statusSummary={`${photographers.length} Registered Photographers · ${kpiStats.liveOnline} Live on Portal · ${kpiStats.available} Ready for Assignment`}
        primaryAction={{
          label: 'Manage Bookings',
          icon: CalendarDays,
          href: '/admin/bookings',
        }}
        secondaryAction={{
          label: 'Export Roster',
          icon: Download,
          onClick: handleExportCSV,
        }}
        onRefresh={load}
        isRefreshing={loading}
        onExport={handleExportCSV}
        extraTools={[
          { label: 'Workstation Hub', href: '/admin/workstation', icon: ArrowRightLeft, iconColor: 'text-gold' },
          { label: 'Customer Directory', href: '/admin/customers', icon: Users, iconColor: 'text-gold' },
          { label: 'Security & Audit', href: '/admin/security', icon: ShieldCheck, iconColor: 'text-neutral-400' },
        ]}
      />

      {/* ── 2. KPI Overview Metric Strip (Space-Efficient 6 Cards) ───────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Photographers */}
        <button
          type="button"
          onClick={() => {
            setPresenceFilter('ALL');
            setStatusFilter('ALL');
            setSpecializationFilter('ALL');
            setWorkloadFilter('ALL');
          }}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none hover:border-gold/60 hover:shadow-warm-sm ${
            presenceFilter === 'ALL' && statusFilter === 'ALL' && specializationFilter === 'ALL' && workloadFilter === 'ALL'
              ? 'border-gold ring-2 ring-gold/25 bg-gradient-to-br from-amber-50/80 via-gold/15 to-white shadow-xs'
              : 'border-neutral-200/90 bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total Roster</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200/70 text-neutral-700 flex items-center justify-center">
              <Camera size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-primary">{photographers.length}</p>
          <span className="text-xs text-neutral-400 font-normal mt-1 block truncate">Full photographer team</span>
        </button>

        {/* Live on Photographer Portal (Online Now) */}
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
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live on Portal
            </span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200/60 text-emerald-800 flex items-center justify-center">
              <Radio size={15} className="animate-pulse" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-primary">{kpiStats.liveOnline}</p>
          <span className="text-xs text-neutral-400 font-medium mt-1 block truncate">Active on dashboard now</span>
        </button>

        {/* Available for Shoots */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none hover:border-gold/60 hover:shadow-warm-sm ${
            statusFilter === 'AVAILABLE'
              ? 'border-gold ring-2 ring-gold/25 bg-gradient-to-br from-amber-50/80 via-gold/15 to-white shadow-xs'
              : 'border-neutral-200/90 bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Available</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200/70 text-neutral-700 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-primary">{kpiStats.available}</p>
          <span className="text-xs text-neutral-400 font-normal mt-1 block truncate">Ready for sessions</span>
        </button>

        {/* Off-duty / Unavailable */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'UNAVAILABLE' ? 'ALL' : 'UNAVAILABLE')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none hover:border-gold/60 hover:shadow-warm-sm ${
            statusFilter === 'UNAVAILABLE'
              ? 'border-gold ring-2 ring-gold/25 bg-gradient-to-br from-amber-50/80 via-gold/15 to-white shadow-xs'
              : 'border-neutral-200/90 bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Unavailable</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200/70 text-neutral-500 flex items-center justify-center">
              <XCircle size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-neutral-700">{kpiStats.unavailable}</p>
          <span className="text-xs text-neutral-400 font-normal mt-1 block truncate">Off-duty or blocked</span>
        </button>

        {/* Pending Approval */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none hover:border-gold/60 hover:shadow-warm-sm ${
            statusFilter === 'PENDING'
              ? 'border-gold ring-2 ring-gold/25 bg-gradient-to-br from-amber-50/80 via-gold/15 to-white shadow-xs'
              : 'border-neutral-200/90 bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-100 to-gold/20 text-amber-800 flex items-center justify-center">
              <AlertCircle size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-amber-800">{kpiStats.pending}</p>
          <span className="text-xs text-amber-700/80 font-medium mt-1 block truncate">Awaiting sign-off</span>
        </button>

        {/* Active Shoot Workload */}
        <button
          type="button"
          onClick={() => setWorkloadFilter(workloadFilter === 'BUSY' ? 'ALL' : 'BUSY')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none hover:border-gold/60 hover:shadow-warm-sm ${
            workloadFilter === 'BUSY'
              ? 'border-gold ring-2 ring-gold/25 bg-gradient-to-br from-amber-50/80 via-gold/15 to-white shadow-xs'
              : 'border-neutral-200/90 bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Workload</span>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold/25 to-gold/10 text-gold-dark flex items-center justify-center">
              <Briefcase size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-gold-dark">{kpiStats.totalWorkload}</p>
          <span className="text-xs text-neutral-400 font-normal mt-1 block truncate">Total active shoots</span>
        </button>
      </div>

      {/* Action Flash Message */}
      {actionSuccessMsg && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-2.5 text-xs font-body animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-500 hover:text-emerald-700 p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-body animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── 3. Search & Filter Toolbar with CustomDropdown Components ───────── */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, specialization, phone, bio..."
              className="w-full pl-9 pr-8 py-2.5 sm:py-3 bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white rounded-xl text-xs sm:text-sm font-body border border-neutral-200 focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-all shadow-2xs"
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

          {/* Custom Dropdown Filters */}
          <div className="flex items-center gap-2.5 flex-wrap justify-start lg:justify-end">
            {/* Live Presence Filter */}
            <div className="w-40 sm:w-44">
              <CustomDropdown
                value={presenceFilter}
                onChange={setPresenceFilter}
                options={[
                  { value: 'ALL', label: 'All Presence', icon: Radio },
                  { value: 'ONLINE', label: '🟢 Live on Portal', dotColor: 'bg-emerald-500' },
                  { value: 'OFFLINE', label: '⚪ Offline Roster', dotColor: 'bg-neutral-400' },
                ]}
                placeholder="Presence"
                icon={Activity}
                className="w-full"
                popoverWidth="w-48"
              />
            </div>

            {/* Availability & Account Status Filter */}
            <div className="w-44 sm:w-48">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'AVAILABLE', label: 'Available', dotColor: 'bg-emerald-500' },
                  { value: 'UNAVAILABLE', label: 'Off-duty', dotColor: 'bg-neutral-400' },
                  { value: 'PENDING', label: 'Pending Approval', dotColor: 'bg-amber-500' },
                  { value: 'INACTIVE', label: 'Inactive Accounts', dotColor: 'bg-rose-500' },
                ]}
                placeholder="Status"
                icon={CheckCircle2}
                className="w-full"
                popoverWidth="w-52"
              />
            </div>

            {/* Specialization Filter */}
            <div className="w-48 sm:w-52">
              <CustomDropdown
                value={specializationFilter}
                onChange={setSpecializationFilter}
                options={[
                  { value: 'ALL', label: 'All Specializations' },
                  ...availableSpecializations.map(spec => ({
                    value: spec,
                    label: spec,
                  })),
                ]}
                placeholder="Specialization"
                icon={Camera}
                className="w-full"
                popoverWidth="w-56"
              />
            </div>

            {/* Workload Filter */}
            <div className="w-38 sm:w-42">
              <CustomDropdown
                value={workloadFilter}
                onChange={setWorkloadFilter}
                options={[
                  { value: 'ALL', label: 'All Workloads' },
                  { value: 'FREE', label: 'Free (0 Shoots)' },
                  { value: 'LIGHT', label: 'Light (1–2)' },
                  { value: 'BUSY', label: 'Busy (3+)' },
                ]}
                placeholder="Workload"
                icon={Briefcase}
                className="w-full"
                popoverWidth="w-44"
              />
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        {(presenceFilter !== 'ALL' || statusFilter !== 'ALL' || specializationFilter !== 'ALL' || workloadFilter !== 'ALL' || search) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-neutral-100 text-xs font-body">
            <span className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">Active Filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-medium">
                "{search}"
                <X size={12} className="cursor-pointer text-neutral-400 hover:text-neutral-700" onClick={() => setSearch('')} />
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
                {statusFilter}
                <X size={12} className="cursor-pointer text-neutral-400 hover:text-neutral-700" onClick={() => setStatusFilter('ALL')} />
              </span>
            )}
            {specializationFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-medium">
                {specializationFilter}
                <X size={12} className="cursor-pointer text-neutral-400 hover:text-neutral-700" onClick={() => setSpecializationFilter('ALL')} />
              </span>
            )}
            {workloadFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-medium">
                {workloadFilter}
                <X size={12} className="cursor-pointer text-neutral-400 hover:text-neutral-700" onClick={() => setWorkloadFilter('ALL')} />
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPresenceFilter('ALL');
                setStatusFilter('ALL');
                setSpecializationFilter('ALL');
                setWorkloadFilter('ALL');
              }}
              className="text-gold hover:underline font-semibold text-xs ml-1.5 cursor-pointer"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* ── 4. Main Photographer Roster Table (Space-Efficient View) ─────────── */}
      <div className="bg-gradient-to-b from-white to-neutral-50/30 rounded-2xl border border-neutral-200/90 shadow-warm-sm overflow-hidden">
        {loading ? (
          <div className="p-6 sm:p-8 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-neutral-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
              <Camera size={26} />
            </div>
            <p className="text-base font-semibold text-neutral-700 font-heading">No photographers match your search or filter</p>
            <p className="text-xs sm:text-sm text-neutral-400 font-body mt-1 max-w-sm">
              Try adjusting your presence, availability status, or keyword filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPresenceFilter('ALL');
                setStatusFilter('ALL');
                setSpecializationFilter('ALL');
                setWorkloadFilter('ALL');
              }}
              className="mt-4 px-4 py-2 text-xs sm:text-sm font-semibold text-gold bg-gold/10 hover:bg-gold/20 rounded-xl transition-all cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm font-body text-left">
              <thead>
                <tr className="border-b border-neutral-200/80 bg-gradient-to-r from-neutral-50 via-neutral-100/40 to-neutral-50 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">
                  <th className="px-5 sm:px-6 py-3.5 sm:py-4">Photographer Profile</th>
                  <th className="px-5 sm:px-6 py-3.5 sm:py-4">Specialization & Bio</th>
                  <th className="px-5 sm:px-6 py-3.5 sm:py-4">Readiness & Status</th>
                  <th className="px-5 sm:px-6 py-3.5 sm:py-4">Active Workload</th>
                  <th className="px-5 sm:px-6 py-3.5 sm:py-4">Upcoming Assignment</th>
                  <th className="px-5 sm:px-6 py-3.5 sm:py-4 text-right">Actions & Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map(ph => {
                  const isLive = liveOnlineMap.has(ph.id);
                  const presenceInfo = liveOnlineMap.get(ph.id);
                  const isApproved = ph.is_active;
                  const isAvail = ph.is_available;
                  const isInactive = ph.is_active === false;
                  const fullName = `${ph.first_name || ''} ${ph.last_name || ''}`.trim() || 'Photographer';

                  return (
                    <tr
                      key={ph.id}
                      className={`transition-all duration-150 ${
                        isInactive
                          ? 'bg-gradient-to-r from-rose-500/12 via-rose-500/5 to-transparent border-l-4 border-l-rose-500 hover:from-rose-500/18 hover:via-rose-500/8'
                          : 'hover:bg-neutral-50/70'
                      }`}
                    >
                      {/* Photographer Profile Identification */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5 min-w-[220px] align-middle">
                        <div className={`flex items-center gap-3.5 ${
                          isInactive ? 'p-1.5 -m-1.5 rounded-xl bg-gradient-to-r from-rose-100/70 via-rose-50/40 to-transparent' : ''
                        }`}>
                          <Avatar p={ph} isLive={isLive} presenceInfo={presenceInfo} />
                          <div className="min-w-0 flex-1">
                            {/* Inactive Account Indicator if inactive */}
                            {isInactive && (
                              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300 mb-1 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>Inactive Account</span>
                              </div>
                            )}
                            <p className={`font-semibold text-sm sm:text-base leading-tight truncate ${isInactive ? 'text-rose-950 font-bold' : 'text-neutral-900'}`} title={fullName}>
                              {fullName}
                            </p>
                            {ph.phone && (
                              <a
                                href={`tel:${ph.phone}`}
                                className="text-xs text-neutral-500 hover:text-gold hover:underline inline-flex items-center gap-1 font-mono mt-0.5"
                              >
                                <Phone size={11} className="text-neutral-400 shrink-0" />
                                <span>{ph.phone}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Specialization & Bio */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5 min-w-[180px] align-middle">
                        <span className="inline-block text-xs font-semibold text-primary bg-gold/15 border border-gold/30 px-2.5 py-0.5 rounded-md">
                          {ph.specialization || 'General Photography'}
                        </span>
                        {ph.bio ? (
                          <p className="text-xs text-neutral-500 mt-1 max-w-xs truncate" title={ph.bio}>
                            {ph.bio}
                          </p>
                        ) : (
                          <span className="text-[11px] text-neutral-400 italic block mt-1">No bio statement</span>
                        )}
                      </td>

                      {/* Readiness & Availability Status Badge */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5 whitespace-nowrap align-middle">
                        {!isApproved ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full shadow-2xs">
                            <AlertCircle size={13} className="text-amber-600" />
                            Pending Approval
                          </span>
                        ) : isAvail ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-2xs">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            Available for Shoots
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-full">
                            <XCircle size={13} className="text-neutral-400" />
                            Off-duty / Blocked
                          </span>
                        )}
                      </td>

                      {/* Active Workload */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5 whitespace-nowrap align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${
                            (ph.activeWorkloadCount || 0) === 0
                              ? 'bg-neutral-100 text-neutral-500'
                              : (ph.activeWorkloadCount || 0) <= 2
                                ? 'bg-gold/15 text-gold-dark'
                                : 'bg-rose-100 text-rose-700'
                          }`}>
                            <Briefcase size={15} />
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900 text-sm sm:text-base">
                              {ph.activeWorkloadCount || 0}
                              <span className="text-xs font-normal text-neutral-500 ml-1">
                                shoot{(ph.activeWorkloadCount || 0) !== 1 ? 's' : ''}
                              </span>
                            </p>
                            <span className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider block">
                              {(ph.activeWorkloadCount || 0) === 0 ? 'Free' : (ph.activeWorkloadCount || 0) <= 2 ? 'Normal' : 'High Load'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Upcoming Assignment */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5 min-w-[170px] align-middle">
                        {ph.nextUpcoming ? (
                          <div className="text-xs sm:text-sm space-y-0.5">
                            <p className="font-semibold text-primary truncate max-w-[190px]" title={ph.nextUpcoming.service?.name}>
                              {ph.nextUpcoming.service?.name || 'Assigned Session'}
                            </p>
                            <p className="text-xs text-neutral-500 flex items-center gap-1.5">
                              <Calendar size={13} className="text-gold shrink-0" />
                              <span>{fmt(ph.nextUpcoming.event_date)}</span>
                              {ph.nextUpcoming.preferred_time && (
                                <span className="text-neutral-400 font-mono text-[11px]">
                                  ({ph.nextUpcoming.preferred_time.substring(0, 5)})
                                </span>
                              )}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs sm:text-sm text-neutral-400 italic">None upcoming</span>
                        )}
                      </td>

                      {/* Actions & Tools */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5 text-right whitespace-nowrap align-middle">
                        <div className="flex items-center justify-end gap-2">
                          {/* View Profile & Schedule */}
                          <button
                            type="button"
                            onClick={() => openDetailsModal(ph)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-gold/80 rounded-xl transition-all shadow-2xs cursor-pointer"
                            title="Inspect Schedule & Portfolio"
                          >
                            <Eye size={14} className="text-neutral-500" />
                            <span>Details</span>
                          </button>

                          {/* Quick Toggle / Approve */}
                          {!isApproved ? (
                            <button
                              type="button"
                              onClick={() => handleApprove(ph.id)}
                              disabled={toggling === ph.id}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                              title="Approve photographer for portal access"
                            >
                              <UserCheck size={14} className="text-emerald-700" />
                              <span>{toggling === ph.id ? '...' : 'Approve'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggle(ph.id, isAvail)}
                              disabled={toggling === ph.id}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold border rounded-xl transition-all shadow-2xs disabled:opacity-50 cursor-pointer ${
                                isAvail
                                  ? 'text-neutral-700 bg-white hover:bg-neutral-100 border-neutral-200'
                                  : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300'
                              }`}
                              title={isAvail ? 'Mark as unavailable for new bookings' : 'Mark as ready and available'}
                            >
                              {toggling === ph.id ? (
                                <RefreshCw size={13} className="animate-spin text-gold" />
                              ) : isAvail ? (
                                <>
                                  <XCircle size={14} className="text-neutral-400" />
                                  <span>Off-duty</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={14} className="text-emerald-600" />
                                  <span>Available</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Edit Profile Tool */}
                          <button
                            type="button"
                            onClick={() => openEditModal(ph)}
                            className="p-2 text-neutral-400 hover:text-gold hover:bg-gold/10 rounded-xl transition-all cursor-pointer"
                            title="Edit Photographer Profile"
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Delete Photographer Tool */}
                          <button
                            type="button"
                            onClick={() => setDeletingPh(ph)}
                            className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Delete Photographer"
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
      </div>

      {/* ── 5. EDIT PHOTOGRAPHER MODAL ───────────────────────────────────────── */}
      {editingPh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-neutral-200 animate-scale-in">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gold/15 flex items-center justify-center text-gold-dark font-heading font-bold">
                  <Edit3 size={15} />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-base text-primary">Edit Photographer Profile</h3>
                  <p className="text-[11px] text-neutral-400 font-body">Update details, specialization and status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPh(null)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="p-4 sm:p-5 space-y-3 font-body text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.first_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.last_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1">Specialization</label>
                <input
                  type="text"
                  value={editForm.specialization}
                  onChange={(e) => setEditForm(prev => ({ ...prev, specialization: e.target.value }))}
                  placeholder="e.g. Portrait & Graduation, Creative, Commercial"
                  className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1">Biography / Statement</label>
                <textarea
                  rows={2}
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Brief background statement or photography style notes..."
                  className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none resize-none text-xs"
                />
              </div>

              {/* Status Toggles */}
              <div className="pt-2 border-t border-neutral-100 grid grid-cols-2 gap-2.5">
                {/* Availability Toggle */}
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-0.5">
                  <span className="text-[10px] font-bold text-neutral-700 block uppercase tracking-wider">Readiness</span>
                  <label className="flex items-center gap-1.5 cursor-pointer mt-0.5">
                    <input
                      type="checkbox"
                      checked={editForm.is_available}
                      onChange={(e) => setEditForm(prev => ({ ...prev, is_available: e.target.checked }))}
                      className="w-3.5 h-3.5 text-gold rounded border-neutral-300 focus:ring-gold/30"
                    />
                    <span className="text-xs text-neutral-600 font-medium">
                      {editForm.is_available ? 'Available' : 'Off-duty'}
                    </span>
                  </label>
                </div>

                {/* Account Active Toggle */}
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-0.5">
                  <span className="text-[10px] font-bold text-neutral-700 block uppercase tracking-wider">Authorization</span>
                  <label className="flex items-center gap-1.5 cursor-pointer mt-0.5">
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-3.5 h-3.5 text-gold rounded border-neutral-300 focus:ring-gold/30"
                    />
                    <span className="text-xs text-neutral-600 font-medium">
                      {editForm.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPh(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 text-xs font-bold text-primary bg-gold hover:bg-gold-light rounded-lg transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit && <RefreshCw size={11} className="animate-spin text-primary" />}
                  <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. DELETE CONFIRMATION MODAL ─────────────────────────────────────── */}
      {deletingPh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-neutral-200 p-5 space-y-4 animate-scale-in font-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-neutral-900">Delete Photographer?</h3>
                <p className="text-[11px] text-neutral-500">Permanently remove from studio roster.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 uppercase tracking-wider font-semibold text-[9px]">Photographer</span>
                <span className="font-bold text-primary">{deletingPh.first_name} {deletingPh.last_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 uppercase tracking-wider font-semibold text-[9px]">Specialization</span>
                <span className="font-medium text-neutral-700">{deletingPh.specialization || 'General'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 uppercase tracking-wider font-semibold text-[9px]">Workload</span>
                <span className={`font-bold ${deletingPh.activeWorkloadCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {deletingPh.activeWorkloadCount || 0} shoot{deletingPh.activeWorkloadCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {deletingPh.activeWorkloadCount > 0 && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-1.5 text-[11px] text-rose-800">
                <AlertCircle size={13} className="shrink-0 mt-0.5 text-rose-600" />
                <span>
                  <strong>Caution:</strong> Photographer is assigned to <strong>{deletingPh.activeWorkloadCount}</strong> active booking(s). Deletion will remove them from assignments.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setDeletingPh(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting && <RefreshCw size={11} className="animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. DETAILS & SCHEDULE INSPECTION MODAL ────────────────────────────── */}
      {selectedPh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-neutral-200 animate-scale-in font-body">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-start justify-between bg-neutral-50/70">
              <div className="flex items-center gap-3">
                <Avatar p={selectedPh} isLive={liveOnlineMap.has(selectedPh.id)} presenceInfo={liveOnlineMap.get(selectedPh.id)} size="12" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-heading text-lg text-primary font-bold">
                      {selectedPh.first_name} {selectedPh.last_name}
                    </h2>
                    {liveOnlineMap.has(selectedPh.id) && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online Now
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-gold-dark mt-0.5">
                    {selectedPh.specialization || 'General Photography'}
                  </p>
                  {selectedPh.phone && (
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-mono mt-0.5">
                      <Phone size={10} /> {selectedPh.phone}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPh(null)}
                className="p-1 text-neutral-400 hover:text-primary rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Quick Summary Strip */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 block">Readiness</span>
                  <div className="mt-1">
                    {selectedPh.is_available ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} /> Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 bg-neutral-200/70 px-2 py-0.5 rounded-full">
                        <XCircle size={11} /> Off-duty
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 block">Active Shoots</span>
                  <p className="text-lg font-heading font-bold text-primary mt-0.5">{selectedPh.activeWorkloadCount || 0}</p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 block">Authorization</span>
                  <p className={`text-[11px] font-bold mt-1 ${selectedPh.is_active ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedPh.is_active ? 'Active & Approved' : 'Pending Approval'}
                  </p>
                </div>
              </div>

              {/* Bio Statement Card */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 block">Artist Bio & Statement</span>
                <p className="text-xs text-neutral-700 leading-relaxed">
                  {selectedPh.bio || 'No artist bio or portfolio statement on file.'}
                </p>
              </div>

              {/* Recorded Availability Schedule */}
              <div>
                <h3 className="text-xs font-heading font-bold text-primary mb-2 flex items-center gap-1.5">
                  <Calendar size={14} className="text-gold" />
                  Recorded Availability Schedule ({availRecords.length})
                </h3>
                {availRecords.length === 0 ? (
                  <div className="p-3 rounded-xl border border-dashed border-neutral-200 text-center text-[11px] text-neutral-400">
                    No custom schedule records on file. Standard availability is governed by the studio toggle above.
                  </div>
                ) : (
                  <div className="border border-neutral-200 rounded-xl overflow-hidden">
                    <table className="min-w-full text-xs">
                      <thead className="bg-neutral-50 text-neutral-400 uppercase text-[9px] tracking-wider text-left border-b border-neutral-200">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Time Window</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {availRecords.map((r, i) => {
                          const d = r.availability_date || r.date;
                          const st = r.status || (r.is_available ? 'AVAILABLE' : 'UNAVAILABLE');
                          return (
                            <tr key={r.id || i} className="hover:bg-neutral-50/50">
                              <td className="px-3 py-2 font-semibold text-primary">{fmt(d)}</td>
                              <td className="px-3 py-2 text-neutral-600 font-mono text-[11px]">
                                {r.start_time && r.end_time
                                  ? `${r.start_time.substring(0, 5)} – ${r.end_time.substring(0, 5)}`
                                  : 'Full Day'}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  st === 'AVAILABLE'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {st}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-neutral-400 italic text-[11px]">
                                {r.notes || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Assigned Bookings List */}
              <div>
                <h3 className="text-xs font-heading font-bold text-primary mb-2 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-gold" />
                  Assigned Bookings ({phBookings.length})
                </h3>
                {phBookings.length === 0 ? (
                  <div className="p-3 rounded-xl border border-dashed border-neutral-200 text-center text-[11px] text-neutral-400">
                    No bookings currently assigned to this photographer.
                  </div>
                ) : (
                  <div className="border border-neutral-200 rounded-xl overflow-hidden">
                    <table className="min-w-full text-xs">
                      <thead className="bg-neutral-50 text-neutral-400 uppercase text-[9px] tracking-wider text-left border-b border-neutral-200">
                        <tr>
                          <th className="px-3 py-2">Booking #</th>
                          <th className="px-3 py-2">Client</th>
                          <th className="px-3 py-2">Service</th>
                          <th className="px-3 py-2">Date & Time</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {phBookings.map(b => (
                          <tr key={b.id} className="hover:bg-neutral-50/50">
                            <td className="px-3 py-2 font-mono font-bold text-gold-dark">{b.booking_number}</td>
                            <td className="px-3 py-2 font-semibold text-primary">
                              {b.customer?.first_name} {b.customer?.last_name}
                            </td>
                            <td className="px-3 py-2 text-neutral-600">{b.service?.name || '—'}</td>
                            <td className="px-3 py-2 text-neutral-500">
                              {fmt(b.event_date)} {b.preferred_time && `(${b.preferred_time.substring(0, 5)})`}
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700">
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-neutral-100 bg-neutral-50/70 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const target = selectedPh;
                  setSelectedPh(null);
                  openEditModal(target);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:border-gold rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 size={12} className="text-gold" />
                <span>Edit Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPh(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
