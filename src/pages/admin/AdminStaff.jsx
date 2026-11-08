import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Users, Plus, Search, X, Edit2, Trash2, Shield,
  RefreshCw, CheckCircle2, AlertCircle, Mail, Camera,
  CreditCard, Briefcase, Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CategorizedMetricStrip from '../../components/admin/CategorizedMetricStrip';
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
  const norm = (role || '').toLowerCase();
  let label = 'Photographer';
  let Icon = Camera;

  if (norm === 'admin') {
    label = 'Admin';
    Icon = Shield;
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
      <Icon size={11} className="text-amber-600" />
      <span>{label}</span>
    </span>
  );
}

export default function AdminStaff() {
  const { user, profile } = useAuth();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);
  const workersRef = useRef(workers);
  workersRef.current = workers;

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

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
    role: 'photographer',
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

  const loadData = useCallback(async (forceFresh = false) => {
    const hasData = workersRef.current.length > 0;
    if (forceFresh || hasData) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const { data, error: err } = await getAllWorkers({ forceFresh });
      if (err) throw err;
      setWorkers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load workers:', err);
      setError(err?.message || 'Unable to load worker records from database.');
      if (workersRef.current.length === 0) setWorkers([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Stats calculation (real DB roles)
  const stats = useMemo(() => {
    const list = Array.isArray(workers) ? workers : [];
    const total = list.length;
    let online = 0;
    let photographers = 0;
    let finance = 0;
    let staff = 0;
    let admin = 0;
    let active = 0;

    list.forEach(w => {
      if (!w || !w.email || !w.email.trim()) return;
      if (liveOnlineMap instanceof Map && liveOnlineMap.has(w.id)) online++;
      if (w.is_active) active++;
      const r = (w.role || '').toLowerCase();
      if (r === 'photographer') photographers++;
      else if (r === 'admin') admin++;
    });

    return { total, online, photographers, admin, active };
  }, [workers, liveOnlineMap]);

  // Filtered workers
  const filteredWorkers = useMemo(() => {
    const list = Array.isArray(workers) ? workers : [];
    return list.filter(w => {
      if (!w || !w.email || !w.email.trim()) return false;
      if (roleFilter !== 'ALL' && (w.role || '').toLowerCase() !== (roleFilter || '').toLowerCase()) return false;

      if (!searchQuery || !searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = `${w.first_name || ''} ${w.last_name || ''}`.toLowerCase();
      const email = (w.email || '').toLowerCase();
      const phone = (w.phone || '').toLowerCase();
      const role = (w.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || role.includes(q);
    });
  }, [workers, roleFilter, searchQuery]);

  // Open Add Modal
  const openAdd = () => {
    setEditingWorker(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'photographer',
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
      role: worker.role || 'photographer',
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
    const headers = ['Full Name', 'Email', 'Role', 'Phone', 'Specialization', 'Status'];
    const rows = filteredWorkers.map(w => {
      const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
      const isOnline = liveOnlineMap instanceof Map && liveOnlineMap.has(w.id);
      const fullName = `${w.first_name || ''} ${w.last_name || ''}`.trim() || 'Staff Member';
      return [
        escape(fullName),
        escape(w.email),
        escape(w.role),
        escape(w.phone),
        escape(w.specialization || '—'),
        escape(isOnline ? 'Online' : 'Offline')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ekodak-workforce-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Worker roster exported to CSV.');
  };

  return (
    <div className="w-full pb-16 animate-fade-in font-body">
      {/* ── 1. Hero Banner ─────────────────────────────────────────────────── */}
      <AdminHeroBanner
        station="admin"
        userName={profile?.full_name || user?.email?.split('@')[0] || 'Administrator'}
        title="Studio Team Management"
        subtitle="Manage studio administrators and official photographers."
        primaryAction={{
          label: 'Add Team Member',
          icon: Plus,
          onClick: openAdd
        }}
        secondaryAction={{
          label: 'Export Team CSV',
          icon: Download,
          onClick: handleExportCsv
        }}
        onRefresh={() => loadData(true)}
        isRefreshing={isRefreshing || loading}
      />

      {/* ── Page Content Wrapper (Full Width Edge-to-Edge) ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-5 mt-2.5 sm:mt-3">

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

      {/* ── 2. Unified Luxury Studio KPI Overview Metric Strip ─────────────── */}
      <CategorizedMetricStrip
        loading={loading}
        columns="grid-cols-1 sm:grid-cols-3"
        cards={[
          {
            key: 'ALL',
            label: 'PERSONNEL',
            subtitle: 'Registered team members',
            value: stats.total,
            isActive: roleFilter === 'ALL',
            onClick: () => setRoleFilter('ALL'),
          },
          {
            key: 'ADMIN',
            label: 'ADMINS',
            subtitle: 'System administrators',
            value: stats.admin,
            isActive: roleFilter === 'admin',
            onClick: () => setRoleFilter(roleFilter === 'admin' ? 'ALL' : 'admin'),
          },
          {
            key: 'PHOTOGRAPHER',
            label: 'PHOTOGRAPHERS',
            subtitle: 'Studio & field shooters',
            value: stats.photographers,
            isActive: roleFilter === 'photographer',
            onClick: () => setRoleFilter(roleFilter === 'photographer' ? 'ALL' : 'photographer'),
          },
        ]}
      />

      {/* ── 3. Unified Luxury Workforce Hub ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-[#c9a96e]/35 bg-white/95 backdrop-blur-md shadow-xl shadow-amber-950/5 ring-1 ring-[#c9a96e]/15 font-body">
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#c9a96e] to-transparent pointer-events-none" />

        {/* Header Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex-shrink-0 bg-white space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Station Icon & Title */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-sm ring-1 ring-amber-600/30 shrink-0">
                <Users size={22} />
              </div>
              <div>
                <h3 className="font-heading text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                  Studio Workforce
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {filteredWorkers.length} {filteredWorkers.length === 1 ? 'member' : 'members'} listed • Real-time operational roster
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={handleExportCsv}
                className="h-9 px-3.5 text-xs font-bold flex items-center gap-1.5 border border-neutral-200/80 hover:border-emerald-500/60 rounded-xl bg-white hover:bg-emerald-50/50 text-neutral-700 hover:text-emerald-900 shadow-2xs transition-all cursor-pointer"
                title="Export Workforce to CSV"
              >
                <Download size={14} className="text-emerald-600" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={openAdd}
                className="h-9 px-3.5 text-xs font-bold flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-[#c9a96e] to-amber-600 hover:brightness-105 text-neutral-900 shadow-xs transition-all cursor-pointer shrink-0 font-medium"
                title="Add new worker profile"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>Add Worker</span>
              </button>
              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={isRefreshing || loading}
                className="w-9 h-9 flex items-center justify-center border border-neutral-200/80 hover:border-amber-400/60 rounded-xl bg-white hover:bg-amber-50/40 transition-colors disabled:opacity-50 text-neutral-600 hover:text-neutral-900 cursor-pointer shadow-2xs"
                title="Refresh Personnel Roster"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-amber-600' : 'text-neutral-500'} />
              </button>
            </div>
          </div>

          {/* Search & Single Role Filter Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search worker by name, email, phone, or role..."
                className="w-full h-9 pl-9 pr-8 bg-neutral-50/80 hover:bg-neutral-100/60 focus:bg-white rounded-xl text-xs sm:text-sm font-body border border-neutral-200/80 focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 outline-none transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Single Clean Role Filter (NO colored dots, no presence/status dropdowns) */}
            <div className="w-full sm:w-64 shrink-0">
              <CustomDropdown
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: 'ALL', label: `All Personnel (${stats.total})`, icon: Users },
                  { value: 'admin', label: `Administrators (${stats.admin})`, icon: Shield },
                  { value: 'photographer', label: `Photographers (${stats.photographers})`, icon: Camera },
                ]}
                placeholder="Filter by Role"
                icon={Briefcase}
                className="w-full text-xs sm:text-sm"
                popoverWidth="w-full min-w-[240px]"
              />
            </div>
          </div>

          {/* Active Filter Pill */}
          {(roleFilter !== 'ALL' || searchQuery) && (
            <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 flex-wrap text-xs text-neutral-500">
              <span className="font-semibold text-neutral-400 uppercase tracking-wider text-[11px]">Active Filter:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-medium">
                  Keyword: "{searchQuery}"
                  <X size={12} className="cursor-pointer text-neutral-400 hover:text-neutral-700" onClick={() => setSearchQuery('')} />
                </span>
              )}
              {roleFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/70 text-xs font-medium">
                  Role: {roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
                  <X size={12} className="cursor-pointer text-amber-700 hover:text-amber-950" onClick={() => setRoleFilter('ALL')} />
                </span>
              )}
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setRoleFilter('ALL'); }}
                className="text-amber-700 hover:underline font-semibold text-xs ml-1 cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm font-body border-collapse">
            <thead className="sticky top-0 z-10 bg-[#faf7f2]/95 border-b border-[#c9a96e]/25 shadow-2xs backdrop-blur-md">
              <tr className="border-b border-neutral-200/80 text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                <th className="px-5 sm:px-6 py-3.5">Personnel</th>
                <th className="px-4 sm:px-5 py-3.5">Studio Role</th>
                <th className="px-4 sm:px-5 py-3.5">Contact</th>
                <th className="px-4 sm:px-5 py-3.5 text-center">Status</th>
                <th className="px-5 sm:px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-neutral-100 ${isRefreshing ? 'opacity-70 transition-opacity' : 'opacity-100 transition-opacity'}`}>
              {loading && workers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-amber-600" />
                    <span>Loading studio workforce records...</span>
                  </td>
                </tr>
              ) : filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
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
                    <tr key={w.id} className="hover:bg-amber-50/20 transition-colors">
                      {/* Name & Avatar */}
                      <td className="px-5 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {w.avatar_url ? (
                              <img
                                src={w.avatar_url}
                                alt={fullName}
                                className="w-9 h-9 rounded-full object-cover ring-1.5 ring-neutral-200"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-900 ring-1.5 ring-[#c9a96e]/25 font-bold flex items-center justify-center text-xs">
                                {ini}
                              </div>
                            )}
                            {/* Online Indicator Badge on Avatar */}
                            {isOnline && (
                              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-neutral-900 text-sm leading-tight flex items-center gap-1.5">
                              <span>{fullName}</span>
                              {isPhotographer && w.specialization && (
                                <span className="text-xs font-normal text-neutral-400 truncate max-w-[160px]">
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

                      {/* Studio Role */}
                      <td className="px-4 sm:px-5 py-4 whitespace-nowrap">
                        <RoleBadge role={w.role} />
                      </td>

                      {/* Contact */}
                      <td className="px-4 sm:px-5 py-4 whitespace-nowrap">
                        <span className="text-neutral-700 font-medium text-xs">
                          {w.phone || '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 sm:px-5 py-4 text-center whitespace-nowrap">
                        {isOnline ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Online</span>
                            </span>
                            {presence?.online_at && (
                              <span className="text-[11px] text-neutral-400 mt-0.5">
                                Since {fmtTimeOnly(presence.online_at)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                            <span>Offline</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 sm:px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(w)}
                            className="p-1.5 text-neutral-500 hover:text-amber-800 hover:bg-amber-50/60 rounded-xl transition-colors border border-neutral-200 cursor-pointer shadow-2xs"
                            title="Edit Account Details"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(w)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-neutral-200 hover:border-red-200 cursor-pointer shadow-2xs"
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
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Role Assignment *
              </label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
              >
                <option value="photographer">Photographer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
