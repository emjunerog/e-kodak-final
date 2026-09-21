import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users, UserCheck, Plus, Search, X, Edit2, Trash2, Shield,
  RefreshCw, CheckCircle2, AlertCircle, Phone, Mail, Camera,
  CreditCard, Briefcase, Download, Activity, Check, Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CustomDropdown from '../../components/ui/CustomDropdown';
import Modal from '../../components/ui/Modal';
import {
  getAllWorkers,
  createWorkerProfile,
  updateWorkerProfile,
  deleteWorkerProfile,
  togglePhotographerAvailability
} from '../../services/adminService';
import { subscribeToCustomerPresence } from '../../services/presenceService';

function fmtDateTime(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

function fmtTimeOnly(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleTimeString('en-PH', {
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

function RoleBadge({ role }) {
  switch ((role || '').toLowerCase()) {
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
          <Shield size={11} className="text-amber-600" />
          <span>Admin</span>
        </span>
      );
    case 'finance':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CreditCard size={11} className="text-emerald-600" />
          <span>Finance</span>
        </span>
      );
    case 'photographer':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
          <Camera size={11} className="text-purple-600" />
          <span>Photographer</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
          <Briefcase size={11} className="text-blue-600" />
          <span>Staff</span>
        </span>
      );
  }
}

export default function AdminStaff() {
  const { user, profile } = useAuth();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [presenceFilter, setPresenceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Real-time live presence
  const [liveOnlineMap, setLiveOnlineMap] = useState(new Map());

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'staff',
    phone: '',
    specialization: '',
    bio: '',
    isActive: true,
    isAvailable: true
  });

  // Subscribe to live presence
  useEffect(() => {
    let unsubscribe = null;
    try {
      unsubscribe = subscribeToCustomerPresence((onlineMap) => {
        if (onlineMap instanceof Map) {
          setLiveOnlineMap(onlineMap);
        }
      });
    } catch (err) {
      console.warn('subscribeToCustomerPresence failed:', err);
    }
    return () => {
      if (typeof unsubscribe === 'function') {
        try { unsubscribe(); } catch {}
      }
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await getAllWorkers();
      if (err) throw err;
      setWorkers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load workers:', err);
      setError(err?.message || 'Unable to load worker records from database.');
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const list = Array.isArray(workers) ? workers : [];
    const total = list.length;
    let online = 0;
    let photographers = 0;
    let finance = 0;
    let staff = 0;
    let active = 0;

    list.forEach(w => {
      if (!w) return;
      if (liveOnlineMap instanceof Map && liveOnlineMap.has(w.id)) online++;
      if (w.is_active) active++;
      const r = (w.role || '').toLowerCase();
      if (r === 'photographer') photographers++;
      else if (r === 'finance') finance++;
      else if (r === 'staff') staff++;
    });

    return { total, online, photographers, finance, staff, active };
  }, [workers, liveOnlineMap]);

  // Filtered workers
  const filteredWorkers = useMemo(() => {
    const list = Array.isArray(workers) ? workers : [];
    return list.filter(w => {
      if (!w) return false;
      if (roleFilter !== 'ALL' && (w.role || '').toLowerCase() !== (roleFilter || '').toLowerCase()) return false;
      if (statusFilter === 'ACTIVE' && !w.is_active) return false;
      if (statusFilter === 'INACTIVE' && w.is_active) return false;

      const isOnline = liveOnlineMap instanceof Map ? liveOnlineMap.has(w.id) : false;
      if (presenceFilter === 'ONLINE' && !isOnline) return false;
      if (presenceFilter === 'OFFLINE' && isOnline) return false;

      if (!searchQuery || !searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = `${w.first_name || ''} ${w.last_name || ''}`.toLowerCase();
      const email = (w.email || '').toLowerCase();
      const phone = (w.phone || '').toLowerCase();
      const role = (w.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || role.includes(q);
    });
  }, [workers, roleFilter, statusFilter, presenceFilter, searchQuery, liveOnlineMap]);

  // Open Add Modal
  const openAdd = () => {
    setEditingWorker(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'staff',
      phone: '',
      specialization: '',
      bio: '',
      isActive: true,
      isAvailable: true
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEdit = (worker) => {
    setEditingWorker(worker);
    setFormData({
      firstName: worker.first_name || '',
      lastName: worker.last_name || '',
      email: worker.email || '',
      role: worker.role || 'staff',
      phone: worker.phone || '',
      specialization: worker.specialization || '',
      bio: worker.bio || '',
      isActive: worker.is_active !== false,
      isAvailable: worker.is_available !== false
    });
    setModalOpen(true);
  };

  // 1-Click Toggle Active Status
  const handleToggleActive = async (worker) => {
    const nextStatus = !worker.is_active;
    try {
      await updateWorkerProfile(worker.id, { isActive: nextStatus });
      showToast(`Worker "${worker.first_name} ${worker.last_name}" account is now ${nextStatus ? 'ACTIVE' : 'DEACTIVATED'}.`);
      loadData();
    } catch (err) {
      alert('Failed to update worker status: ' + err.message);
    }
  };

  // 1-Click Toggle Availability (Photographer)
  const handleToggleAvailability = async (worker) => {
    const nextAvail = !worker.is_available;
    try {
      await togglePhotographerAvailability(worker.id, nextAvail);
      showToast(`Photographer availability updated to ${nextAvail ? 'AVAILABLE' : 'OFF-DUTY'}.`);
      loadData();
    } catch (err) {
      alert('Failed to update availability: ' + err.message);
    }
  };

  // Delete Worker
  const handleDelete = async (worker) => {
    const fullName = `${worker.first_name} ${worker.last_name}`.trim() || worker.email;
    if (window.confirm(`Are you sure you want to permanently delete the worker account for "${fullName}"? This action cannot be undone.`)) {
      try {
        await deleteWorkerProfile(worker.id);
        showToast(`Worker account for "${fullName}" removed.`);
        loadData();
      } catch (err) {
        alert('Failed to delete worker: ' + err.message);
      }
    }
  };

  // Form Submit (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingWorker) {
        await updateWorkerProfile(editingWorker.id, formData);
        showToast(`Worker account updated successfully.`);
      } else {
        await createWorkerProfile(formData);
        showToast(`New worker account created successfully.`);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error saving worker profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Role', 'Phone', 'Active Status', 'Live Presence'];
    const rows = workers.map(w => {
      const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
      const isOnline = liveOnlineMap.has(w.id);
      return [
        escape(w.first_name),
        escape(w.last_name),
        escape(w.email),
        escape(w.role),
        escape(w.phone),
        escape(w.is_active ? 'Active' : 'Inactive'),
        escape(isOnline ? 'Online Now' : 'Offline')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ekodak-workers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Worker roster exported to CSV.');
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-6 pb-16 animate-fade-in font-body">
      {/* ── 1. Hero Banner ─────────────────────────────────────────────────── */}
      <AdminHeroBanner
        station="admin"
        badgeLabel="Personnel & Operations"
        badgeIcon={UserCheck}
        userName={profile?.full_name || user?.email?.split('@')[0] || 'Administrator'}
        title="Studio Staff & Worker Management"
        subtitle="Monitor worker active online status in real-time, provision team accounts (photographers, finance, staff), update credentials, and manage operational privileges."
        statusSummary={`${stats.total} Total Personnel · ${stats.online} Live Online Now · ${stats.active} Active Accounts`}
        primaryAction={{
          label: 'Add Worker',
          icon: Plus,
          onClick: openAdd
        }}
        secondaryAction={{
          label: 'Export Roster CSV',
          icon: Download,
          onClick: handleExportCsv
        }}
        onRefresh={loadData}
        isRefreshing={loading}
      />

      {/* Action Toast */}
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
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-xs shadow-xs">
          <AlertCircle size={15} />
          <span>{error}</span>
          <button onClick={loadData} className="underline font-semibold ml-auto">Retry</button>
        </div>
      )}

      {/* ── 2. Metric Overview Strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-wider">Total Personnel</span>
            <Users size={16} className="text-neutral-400" />
          </div>
          <div className="mt-2">
            <span className="font-heading text-2xl font-bold text-primary">{stats.total}</span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">Registered workforce</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50/60 to-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider">Live Online</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>
          <div className="mt-2">
            <span className="font-heading text-2xl font-bold text-emerald-900">{stats.online}</span>
            <span className="text-[11px] text-emerald-700 block mt-0.5">Active on portal right now</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-purple-700 uppercase tracking-wider">Photographers</span>
            <Camera size={16} className="text-purple-500" />
          </div>
          <div className="mt-2">
            <span className="font-heading text-2xl font-bold text-primary">{stats.photographers}</span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">Studio &amp; field shooters</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider">Finance</span>
            <CreditCard size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="font-heading text-2xl font-bold text-primary">{stats.finance}</span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">Cashiers &amp; ledger staff</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-blue-700 uppercase tracking-wider">Staff / Desk</span>
            <Briefcase size={16} className="text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="font-heading text-2xl font-bold text-primary">{stats.staff}</span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">Front desk &amp; operations</span>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Search Bar ────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search worker by name, email, phone, or role..."
            className="w-full pl-9 pr-8 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <div className="w-38 sm:w-44">
            <CustomDropdown
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: 'ALL', label: 'All Roles' },
                { value: 'photographer', label: 'Photographers', icon: Camera },
                { value: 'finance', label: 'Finance', icon: CreditCard },
                { value: 'staff', label: 'Staff', icon: Briefcase },
                { value: 'admin', label: 'Administrators', icon: Shield }
              ]}
              placeholder="Filter Role"
              icon={Briefcase}
              className="w-full"
              popoverWidth="w-48"
            />
          </div>

          {/* Presence Filter */}
          <div className="w-38 sm:w-44">
            <CustomDropdown
              value={presenceFilter}
              onChange={setPresenceFilter}
              options={[
                { value: 'ALL', label: 'All Presence', icon: Radio },
                { value: 'ONLINE', label: '🟢 Online Now', dotColor: 'bg-emerald-500' },
                { value: 'OFFLINE', label: '⚪ Offline', dotColor: 'bg-neutral-400' }
              ]}
              placeholder="Presence"
              icon={Activity}
              className="w-full"
              popoverWidth="w-44"
            />
          </div>

          {/* Status Filter */}
          <div className="w-36 sm:w-40">
            <CustomDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active', dotColor: 'bg-emerald-500' },
                { value: 'INACTIVE', label: 'Inactive', dotColor: 'bg-neutral-400' }
              ]}
              placeholder="Account Status"
              icon={UserCheck}
              className="w-full"
              popoverWidth="w-40"
            />
          </div>

          {(searchQuery || roleFilter !== 'ALL' || presenceFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setPresenceFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="py-1.5 px-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 flex items-center gap-1 transition-colors"
            >
              <X size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Workers Table ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200/80 text-[10.5px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Personnel</th>
                <th className="px-4 py-3.5">Studio Role</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5 text-center">Live Active Status</th>
                <th className="px-4 py-3.5 text-center">Account Access</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-gold" />
                    <span>Loading studio workforce records...</span>
                  </td>
                </tr>
              ) : filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    No worker accounts match your search filters.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map(w => {
                  if (!w) return null;
                  const fullName = `${w.first_name || ''} ${w.last_name || ''}`.trim() || 'Staff Member';
                  const ini = `${w.first_name?.[0] || ''}${w.last_name?.[0] || ''}`.toUpperCase() || 'W';
                  const isOnline = (liveOnlineMap instanceof Map && w.id) ? liveOnlineMap.has(w.id) : false;
                  const presence = (liveOnlineMap instanceof Map && w.id) ? liveOnlineMap.get(w.id) : null;
                  const isPhotographer = (w.role || '').toLowerCase() === 'photographer';

                  return (
                    <tr key={w.id} className="hover:bg-neutral-50/60 transition-colors">
                      {/* Name & Avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {w.avatar_url ? (
                              <img
                                src={w.avatar_url}
                                alt={fullName}
                                className="w-9 h-9 rounded-full object-cover ring-1.5 ring-neutral-200"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gold/15 text-gold-dark ring-1.5 ring-gold/25 font-bold flex items-center justify-center text-xs">
                                {ini}
                              </div>
                            )}
                            {/* Live Presence Pulse on Avatar */}
                            {isOnline && (
                              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-primary text-sm leading-tight flex items-center gap-1.5">
                              <span>{fullName}</span>
                              {isPhotographer && w.specialization && (
                                <span className="text-[10px] font-normal text-neutral-400 truncate max-w-[140px]">
                                  • {w.specialization}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                              <Mail size={11} className="text-neutral-400 shrink-0" />
                              <span className="truncate">{w.email || 'No email registered'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <RoleBadge role={w.role} />
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-neutral-700 font-medium text-xs">
                          {w.phone || '—'}
                        </span>
                      </td>

                      {/* Live Status */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {isOnline ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Live Online</span>
                            </span>
                            {presence?.online_at && (
                              <span className="text-[9.5px] text-neutral-400 mt-0.5">
                                Since {fmtTimeOnly(presence.online_at)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                            <span>Offline</span>
                          </span>
                        )}
                      </td>

                      {/* Account Access & Availability */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(w)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border transition-colors ${
                              w.is_active
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                            }`}
                            title="Click to toggle worker account active status"
                          >
                            <span>{w.is_active ? 'Active' : 'Disabled'}</span>
                          </button>

                          {isPhotographer && (
                            <button
                              type="button"
                              onClick={() => handleToggleAvailability(w)}
                              className={`text-[9.5px] font-bold underline transition-colors ${
                                w.is_available ? 'text-purple-600 hover:text-purple-800' : 'text-neutral-400 hover:text-neutral-600'
                              }`}
                            >
                              {w.is_available ? 'Shooter Available' : 'Shooter Off-duty'}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(w)}
                            className="p-1.5 text-neutral-500 hover:text-primary hover:bg-neutral-100 rounded-xl transition-colors border border-neutral-200"
                            title="Edit Account Details"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(w)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-neutral-200 hover:border-red-200"
                            title="Delete Worker Account"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Add / Edit Worker Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingWorker ? `Edit Worker: ${editingWorker.first_name} ${editingWorker.last_name}` : 'Add Worker Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 font-body text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                First Name *
              </label>
              <input
                required
                type="text"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Maria"
                className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Last Name *
              </label>
              <input
                required
                type="text"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Santos"
                className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. staff@e-kodak.com"
                className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Role Assignment *
              </label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
              >
                <option value="photographer">Photographer</option>
                <option value="finance">Finance Officer</option>
                <option value="staff">Frontdesk / Staff</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Contact Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0917 123 4567"
                className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
              />
            </div>

            {formData.role === 'photographer' ? (
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Specialization
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="e.g. Portrait & Graduation"
                  className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Department Note
                </label>
                <input
                  type="text"
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="e.g. Morning Shift Frontdesk"
                  className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded text-gold focus:ring-gold"
              />
              <span className="font-semibold text-neutral-700 text-xs">Active Account Privilege</span>
            </label>

            {formData.role === 'photographer' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isAvailable}
                  onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="rounded text-gold focus:ring-gold"
                />
                <span className="font-semibold text-neutral-700 text-xs">Available for Shoots</span>
              </label>
            )}
          </div>

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary py-2 px-5 text-xs font-bold shadow-xs"
            >
              {saving ? 'Saving...' : editingWorker ? 'Update Worker' : 'Create Worker Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
