import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  ShoppingBag, RefreshCw, AlertCircle, CheckCircle2, XCircle, 
  Plus, Edit2, Trash2, Tag, Layers, Settings, Search, X, 
  Download, Sparkles, Check, ChevronDown, ChevronUp, Image as ImageIcon, ExternalLink,
  Star, Copy, ArrowUp, ArrowDown, MoreHorizontal, GripVertical
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CategorizedMetricStrip from '../../components/admin/CategorizedMetricStrip';
import StudioDropdown from '../../components/ui/StudioDropdown';
import ImageDirectUploader from '../../components/ui/ImageDirectUploader';
import Modal from '../../components/ui/Modal';
import { 
  getAdminServices, 
  createService,
  updateService,
  deleteService,
  getServiceCategories, 
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  getAddOns,
  createAddOn,
  updateAddOn,
  deleteAddOn,
  deleteAddOnsBatch
} from '../../services/adminService';

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function AdminServices() {
  const { user, profile } = useAuth();
  
  // Tab State: 'services' | 'categories' | 'addons'
  const [activeTab, setActiveTab] = useState('services');
  
  // Data State
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [addOns, setAddOns] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [srvRes, catRes, addRes] = await Promise.all([
        getAdminServices(),
        getServiceCategories(),
        getAddOns()
      ]);

      if (srvRes.error || catRes.error || addRes.error) {
        console.warn('Load warning:', { srvErr: srvRes.error, catErr: catRes.error, addErr: addRes.error });
      }
      
      setServices(srvRes.data || []);
      setCategories(catRes.data || []);
      setAddOns(addRes.data || []);
    } catch (err) {
      console.error('Failed to load services data:', err);
      setError('Unable to fetch services catalog from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Statistics
  const stats = useMemo(() => {
    const totalServices = services.length;
    const activeServices = services.filter(s => s.is_active).length;
    const totalCategories = categories.length;
    const totalAddOns = addOns.length;
    return { totalServices, activeServices, totalCategories, totalAddOns };
  }, [services, categories, addOns]);

  const serviceMetricCards = useMemo(() => [
    {
      key: 'services_all',
      label: 'CATALOG',
      subtitle: 'TOTAL PACKAGES',
      value: stats.totalServices,
      isActive: activeTab === 'services' && statusFilter === 'ALL',
      onClick: () => {
        setActiveTab('services');
        setStatusFilter('ALL');
      }
    },
    {
      key: 'services_active',
      label: `${stats.totalServices > 0 ? Math.round((stats.activeServices / stats.totalServices) * 100) : 100}% LIVE`,
      subtitle: 'LIVE IN PORTAL',
      value: stats.activeServices,
      isActive: activeTab === 'services' && statusFilter === 'ACTIVE',
      onClick: () => {
        setActiveTab('services');
        setStatusFilter('ACTIVE');
      }
    },
    {
      key: 'categories',
      label: 'TAXONOMY',
      subtitle: 'CATEGORIES',
      value: stats.totalCategories,
      isActive: activeTab === 'categories',
      onClick: () => setActiveTab('categories')
    },
    {
      key: 'addons',
      label: 'EXTRAS',
      subtitle: 'STUDIO ADD-ONS',
      value: stats.totalAddOns,
      isActive: activeTab === 'addons',
      onClick: () => setActiveTab('addons')
    }
  ], [stats, activeTab, statusFilter]);

  // Category Filter Options for StudioDropdown
  const categoryDropdownOptions = useMemo(() => {
    const opts = [{ value: 'ALL', label: 'All Categories', desc: 'Display all service categories' }];
    categories.forEach(c => {
      opts.push({
        value: c.name.toLowerCase(),
        label: c.name,
        desc: c.description || `${c.name} photography offerings`
      });
    });
    // Add distinct categories from services if not in categories table
    services.forEach(s => {
      if (s.category && !opts.some(o => o.value === s.category.toLowerCase())) {
        const title = s.category.charAt(0).toUpperCase() + s.category.slice(1);
        opts.push({ value: s.category.toLowerCase(), label: title, desc: `${title} packages` });
      }
    });
    return opts;
  }, [categories, services]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      if (statusFilter === 'ACTIVE' && !s.is_active) return false;
      if (statusFilter === 'INACTIVE' && s.is_active) return false;
      if (categoryFilter !== 'ALL') {
        const cat = (s.category || '').toLowerCase();
        if (cat !== categoryFilter.toLowerCase()) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (s.name || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const cat = (s.category || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }, [services, statusFilter, categoryFilter, searchQuery]);

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(c => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.description || '').toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  // Filtered Add-Ons
  const filteredAddOns = useMemo(() => {
    if (!searchQuery.trim()) return addOns;
    const q = searchQuery.toLowerCase();
    return addOns.filter(a => 
      (a.name || '').toLowerCase().includes(q) || 
      (a.category || '').toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q)
    );
  }, [addOns, searchQuery]);

  // 1-Click Toggle Active Status for Service
  const handleToggleServiceActive = async (service) => {
    try {
      const nextStatus = !service.is_active;
      await updateService(service.id, { is_active: nextStatus });
      setActionSuccessMsg(`"${service.name}" is now ${nextStatus ? 'ACTIVE in portal' : 'HIDDEN from portal'}.`);
      setTimeout(() => setActionSuccessMsg(null), 3500);
      loadData();
    } catch (err) {
      console.error('Toggle active error:', err);
      alert('Failed to update service status: ' + err.message);
    }
  };

  // 1-Click Export Catalog CSV
  const handleExportCsv = () => {
    const headers = ['Type', 'Name', 'Category', 'Base Price', 'Down Payment', 'Status', 'Tiers Count'];
    const lines = [
      headers.join(','),
      ...services.map(s => {
        const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
        const tierCount = Array.isArray(s.tiers) ? s.tiers.length : 0;
        return [
          escape('Service'),
          escape(s.name),
          escape(s.category),
          escape(s.base_price || 0),
          escape(s.down_payment_amount || 0),
          escape(s.is_active ? 'Active' : 'Inactive'),
          escape(tierCount)
        ].join(',');
      }),
      ...addOns.map(a => {
        const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
        return [
          escape('Add-On'),
          escape(a.name),
          escape(a.category || 'General'),
          escape(a.price || 0),
          escape(0),
          escape(a.is_active !== false ? 'Active' : 'Inactive'),
          escape(0)
        ].join(',');
      })
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ekodak-services-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full pb-16 animate-fade-in font-body">
      {/* ── 1. Luxury Administrative Hero Banner ────────────────────────────── */}
      <AdminHeroBanner
        station="admin"
        badgeLabel="Catalog & Studio Offerings"
        badgeIcon={ShoppingBag}
        userName={profile?.full_name || user?.email?.split('@')[0] || 'Administrator'}
        title="Services, Packages & Studio Add-Ons"
        subtitle="Manage photography packages, multi-tier pricing, studio inclusions, categories, and framing add-ons."
        statusSummary={`${stats.totalServices} Total Packages · ${stats.activeServices} Active in Portal · ${stats.totalCategories} Categories · ${stats.totalAddOns} Add-Ons`}
        primaryAction={{
          label: 'New Package',
          icon: Plus,
          onClick: () => {
            window.dispatchEvent(new CustomEvent('ekodak:open_service_modal'));
          }
        }}
        secondaryAction={{
          label: 'Export Catalog CSV',
          icon: Download,
          onClick: handleExportCsv
        }}
        onRefresh={loadData}
        isRefreshing={loading}
      />

      {/* ── Page Content Wrapper with Balanced Side Margins ───────────────── */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 mt-4 sm:mt-5">

      {/* Action Success Toast */}
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

      {/* ── 2. Metric Overview Strip (Unified Luxury Studio KPI Cards) ───────── */}
      <CategorizedMetricStrip
        loading={loading}
        columns="grid-cols-2 lg:grid-cols-4"
        cards={serviceMetricCards}
      />

      {/* ── 3. Search & Filter Bar with StudioDropdown ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-3.5 font-body">
        {/* Top Navigation Tab Pills */}
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            {[
              { id: 'services',   label: `Packages & Services (${services.length})`, icon: ShoppingBag },
              { id: 'categories', label: `Categories (${categories.length})`, icon: Layers },
              { id: 'addons',     label: `Add-Ons (${addOns.length})`, icon: Tag },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-neutral-100/80 text-neutral-600 hover:bg-neutral-200/60'
                  }`}
                >
                  <tab.icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'services' ? 'Search package name, category...' : activeTab === 'categories' ? 'Search categories...' : 'Search add-on name...'}
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

        {/* Second Row: Specific Filters for Services tab */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-neutral-100 items-center">
            <div className="sm:col-span-6">
              <label className="block text-[11.5px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Filter by Category
              </label>
              <StudioDropdown
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={categoryDropdownOptions}
                placeholder="All Categories"
                className="w-full"
                triggerClassName="py-1.5 text-xs bg-neutral-50/50 border-neutral-200/80 rounded-xl"
              />
            </div>

            <div className="sm:col-span-4 flex items-center gap-1 pt-4 sm:pt-4">
              <span className="text-xs font-semibold text-neutral-500 mr-1">Status:</span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'ACTIVE', label: 'Active Only' },
                { id: 'INACTIVE', label: 'Inactive' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === s.id
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2 sm:pt-4">
              {(searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  className="w-full py-1.5 px-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 flex items-center justify-center gap-1 transition-colors"
                >
                  <X size={12} />
                  Reset
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Main Views ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-neutral-100/70 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'services' && (
            <ServicesView
              services={filteredServices}
              allCategories={categories}
              onRefresh={loadData}
              onToggleActive={handleToggleServiceActive}
            />
          )}
          {activeTab === 'categories' && (
            <CategoriesView
              categories={filteredCategories}
              services={services}
              onRefresh={loadData}
            />
          )}
          {activeTab === 'addons' && (
            <AddOnsView
              addOns={filteredAddOns}
              onRefresh={loadData}
            />
          )}
        </>
      )}
      </div>
    </div>
  );
}

// ── 1. Services View ──────────────────────────────────────────────────────────

const COMMON_DELIVERABLES = [
  '1-12x18 crystal wood frame',
  '1-8x10 portrait frame',
  '1-5x7 tabletop portrait frame',
  '6pcs wallet size photos',
  '12pcs 2x2 colored ID photos',
  'Free hair and makeup styling',
  'Toga, cap & hood graduation attire',
  'High-resolution soft copies via Drive',
  'Creative photoshoot session (1-2 Hours)'
];

const SESSION_TYPE_PRESETS = [
  'Studio Session',
  'School / Campus Session',
  'Outdoor / On-location',
  'Church & Reception Coverage',
  'Creative Studio Session (1-2 Hours)',
  'Full Day Coverage'
];

function ServicesView({ services, allCategories, onRefresh, onToggleActive }) {
  // Main Package Modal state (Package-level details)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editTab, setEditTab] = useState('general'); // 'general' | 'sets'
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: 'college',
    description: '',
    base_price: 0,
    down_payment_amount: 500,
    is_active: true,
    cover_image: '',
    tiers: []
  });
  const [saving, setSaving] = useState(false);

  // Accordion sets console state: { [serviceId]: boolean }
  const [expandedServices, setExpandedServices] = useState({});

  // Menu Dropdown states for "•••"
  const [openPackageMenuId, setOpenPackageMenuId] = useState(null);
  const [openSetMenuKey, setOpenSetMenuKey] = useState(null);

  // Manage Sets Modal state (Dedicated organization modal)
  const [manageSetsModal, setManageSetsModal] = useState({
    isOpen: false,
    service: null
  });

  const openManageSets = (service) => {
    setManageSetsModal({
      isOpen: true,
      service
    });
  };

  const currentManageService = useMemo(() => {
    if (!manageSetsModal.service) return null;
    return services.find(s => s.id === manageSetsModal.service.id) || manageSetsModal.service;
  }, [services, manageSetsModal.service]);

  // Quick Set Modal state (for directly editing an individual set)
  const [quickSetModal, setQuickSetModal] = useState({
    isOpen: false,
    service: null,
    tierIndex: -1, // -1 = Add New Set
    name: '',
    price: '',
    duration: '',
    edited: '',
    popular: false,
    highlights: []
  });
  const [savingQuickSet, setSavingQuickSet] = useState(false);
  const [editingInclusionIndex, setEditingInclusionIndex] = useState(null);
  const [editingInclusionText, setEditingInclusionText] = useState('');
  const [newInclusionInput, setNewInclusionInput] = useState('');
  const [showAddInclusionInput, setShowAddInclusionInput] = useState(false);

  // Close menus on click outside
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest('.action-menu-container')) {
        setOpenPackageMenuId(null);
        setOpenSetMenuKey(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    const handleOpen = () => openAdd();
    window.addEventListener('ekodak:open_service_modal', handleOpen);
    return () => window.removeEventListener('ekodak:open_service_modal', handleOpen);
  }, [allCategories]);

  // Toggle drawer for a package
  const toggleExpand = (serviceId) => {
    setExpandedServices(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
  };

  // Open Direct Set Editor
  const openQuickSet = (service, tierIndex = -1) => {
    const tiers = Array.isArray(service.tiers) ? service.tiers : [];
    const existingTier = (tierIndex >= 0 && tiers[tierIndex]) ? tiers[tierIndex] : null;
    const defaultName = `Set ${String.fromCharCode(65 + tiers.length)}`;

    setEditingInclusionIndex(null);
    setEditingInclusionText('');
    setNewInclusionInput('');
    setShowAddInclusionInput(false);

    setQuickSetModal({
      isOpen: true,
      service,
      tierIndex,
      name: existingTier ? (existingTier.name || '') : defaultName,
      price: existingTier ? (existingTier.price || '') : '₱2,500.00',
      duration: existingTier ? (existingTier.duration || '') : 'Studio Session',
      edited: existingTier ? (existingTier.edited || '') : 'All standard prints included',
      popular: existingTier ? !!existingTier.popular : false,
      highlights: existingTier?.highlights 
        ? (Array.isArray(existingTier.highlights) ? [...existingTier.highlights] : []) 
        : [
            '1 piece 12×18 portrait with crystal wood frame',
            '1 piece 8×10 portrait',
            '6 wallet-size colored prints',
            '12 pieces 2×2 ID colored photos'
          ]
    });
  };

  // Save changes from Set Editor
  const handleSaveQuickSet = async (e) => {
    if (e) e.preventDefault();
    const { service, tierIndex, name, price, duration, edited, popular, highlights } = quickSetModal;
    if (!service) return;

    setSavingQuickSet(true);
    try {
      const currentTiers = Array.isArray(service.tiers) ? JSON.parse(JSON.stringify(service.tiers)) : [];
      
      let formattedPrice = (price || '').trim();
      if (formattedPrice && !formattedPrice.startsWith('₱') && !isNaN(Number(formattedPrice.replace(/,/g, '')))) {
        formattedPrice = `₱${Number(formattedPrice.replace(/,/g, '')).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
      }

      const updatedSet = {
        name: name.trim() || 'Untitled Set',
        price: formattedPrice || '₱0.00',
        duration: (duration || 'Studio Session').trim(),
        edited: (edited || '').trim(),
        popular: !!popular,
        highlights: Array.isArray(highlights) ? highlights.filter(Boolean) : []
      };

      if (tierIndex >= 0 && tierIndex < currentTiers.length) {
        currentTiers[tierIndex] = updatedSet;
      } else {
        currentTiers.push(updatedSet);
      }

      const { error } = await updateService(service.id, { tiers: currentTiers });
      if (error) throw error;

      setQuickSetModal(prev => ({ ...prev, isOpen: false }));
      // Expand sets console so admin immediately sees their updated set
      setExpandedServices(prev => ({ ...prev, [service.id]: true }));
      onRefresh();
    } catch (err) {
      alert('Error updating set: ' + err.message);
    } finally {
      setSavingQuickSet(false);
    }
  };

  // Set Editor Inclusion Handlers
  const handleAppendInclusion = (text) => {
    if (!text || !text.trim()) return;
    setQuickSetModal(prev => ({
      ...prev,
      highlights: [...(prev.highlights || []), text.trim()]
    }));
  };

  const handleRemoveInclusion = (idx) => {
    setQuickSetModal(prev => ({
      ...prev,
      highlights: (prev.highlights || []).filter((_, i) => i !== idx)
    }));
    if (editingInclusionIndex === idx) {
      setEditingInclusionIndex(null);
    }
  };

  const handleSaveInclusionEdit = () => {
    if (editingInclusionIndex === null) return;
    const trimmed = editingInclusionText.trim();
    if (!trimmed) {
      handleRemoveInclusion(editingInclusionIndex);
    } else {
      setQuickSetModal(prev => {
        const next = [...(prev.highlights || [])];
        next[editingInclusionIndex] = trimmed;
        return { ...prev, highlights: next };
      });
    }
    setEditingInclusionIndex(null);
    setEditingInclusionText('');
  };

  const handleConfirmNewInclusion = () => {
    if (newInclusionInput.trim()) {
      handleAppendInclusion(newInclusionInput.trim());
      setNewInclusionInput('');
    }
    setShowAddInclusionInput(false);
  };

  // 1-Click Toggle Popular on a Set
  const handleTogglePopular = async (service, tierIndex, e) => {
    if (e) e.stopPropagation();
    const currentTiers = Array.isArray(service.tiers) ? JSON.parse(JSON.stringify(service.tiers)) : [];
    if (!currentTiers[tierIndex]) return;

    currentTiers[tierIndex].popular = !currentTiers[tierIndex].popular;
    try {
      await updateService(service.id, { tiers: currentTiers });
      onRefresh();
    } catch (err) {
      alert('Failed to update popular status: ' + err.message);
    }
  };

  // 1-Click Duplicate a Set
  const handleDuplicateSet = async (service, tierIndex, e) => {
    if (e) e.stopPropagation();
    const currentTiers = Array.isArray(service.tiers) ? JSON.parse(JSON.stringify(service.tiers)) : [];
    const source = currentTiers[tierIndex];
    if (!source) return;

    const cloned = JSON.parse(JSON.stringify(source));
    cloned.name = `${cloned.name || 'Set'} (Copy)`;
    cloned.popular = false;

    currentTiers.splice(tierIndex + 1, 0, cloned);
    try {
      await updateService(service.id, { tiers: currentTiers });
      setExpandedServices(prev => ({ ...prev, [service.id]: true }));
      onRefresh();
    } catch (err) {
      alert('Failed to duplicate set: ' + err.message);
    }
  };

  // 1-Click Reorder Sets (Move Earlier / Later)
  const handleMoveSet = async (service, tierIndex, direction, e) => {
    if (e) e.stopPropagation();
    const currentTiers = Array.isArray(service.tiers) ? JSON.parse(JSON.stringify(service.tiers)) : [];
    const targetIdx = tierIndex + direction;
    if (targetIdx < 0 || targetIdx >= currentTiers.length) return;

    const [moved] = currentTiers.splice(tierIndex, 1);
    currentTiers.splice(targetIdx, 0, moved);

    try {
      await updateService(service.id, { tiers: currentTiers });
      onRefresh();
    } catch (err) {
      alert('Failed to reorder sets: ' + err.message);
    }
  };

  // 1-Click Delete Set
  const handleDeleteSet = async (service, tierIndex, e) => {
    if (e) e.stopPropagation();
    const currentTiers = Array.isArray(service.tiers) ? JSON.parse(JSON.stringify(service.tiers)) : [];
    const target = currentTiers[tierIndex];
    if (!target) return;

    if (!window.confirm(`Delete set "${target.name || 'Set ' + (tierIndex + 1)}" from "${service.name}"?`)) {
      return;
    }

    currentTiers.splice(tierIndex, 1);
    try {
      await updateService(service.id, { tiers: currentTiers });
      onRefresh();
    } catch (err) {
      alert('Failed to delete set: ' + err.message);
    }
  };

  // Edit Package Details Modal Handlers
  const openAdd = () => {
    setEditingItem(null);
    setEditTab('general');
    setFormData({
      name: '',
      slug: '',
      category: allCategories[0]?.name?.toLowerCase() || 'college',
      description: '',
      base_price: 1500,
      down_payment_amount: 500,
      is_active: true,
      cover_image: '',
      tiers: [
        {
          name: 'Set A',
          price: '₱4,875.00',
          edited: 'All prints included',
          duration: 'Studio Session',
          popular: true,
          highlights: ['1 piece 12×18 crystal wood frame', '1 piece 8×10 portrait', '6 wallet-size colored prints', '12 pieces 2×2 ID photos']
        },
        {
          name: 'Set B',
          price: '₱3,575.00',
          edited: 'All prints included',
          duration: 'Studio Session',
          popular: false,
          highlights: ['1 piece 12×16 crystal wood frame', '6 wallet size prints', '12 pieces 2×2 ID photos']
        }
      ]
    });
    setModalOpen(true);
  };

  const openEdit = (s, targetTab = 'general') => {
    setEditingItem(s);
    setEditTab(targetTab);
    const existingTiers = Array.isArray(s.tiers) 
      ? JSON.parse(JSON.stringify(s.tiers)) 
      : [];

    setFormData({
      name: s.name || '',
      slug: s.slug || '',
      category: s.category || 'college',
      description: s.description || '',
      base_price: s.base_price || 0,
      down_payment_amount: s.down_payment_amount || 0,
      is_active: s.is_active !== false,
      cover_image: s.cover_image || '',
      tiers: existingTiers
    });
    setModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete package "${name}"? This action cannot be undone.`)) {
      await deleteService(id);
      onRefresh();
    }
  };

  const handlePackageSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: formData.category,
        description: formData.description,
        base_price: parseFloat(formData.base_price) || 0,
        down_payment_amount: parseFloat(formData.down_payment_amount) || 0,
        is_active: formData.is_active,
        cover_image: formData.cover_image || null,
        tiers: formData.tiers
      };

      if (editingItem) {
        await updateService(editingItem.id, payload);
      } else {
        await createService(payload);
      }
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      alert('Error saving package: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Category options for StudioDropdown
  const categoryOptions = allCategories.map(c => ({
    value: c.name.toLowerCase(),
    label: c.name,
    desc: c.description || ''
  }));

  return (
    <div className="space-y-4">
      {/* Top Header Summary */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-neutral-500 font-semibold">
          Showing <strong>{services.length}</strong> photography packages
        </span>

        <button 
          onClick={openAdd} 
          className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus size={14} /> New Package
        </button>
      </div>

      {services.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold flex items-center justify-center mx-auto mb-3">
            <ShoppingBag size={22} />
          </div>
          <h3 className="font-heading text-base font-bold text-primary">No Services Found</h3>
          <p className="text-xs text-neutral-400 mt-1">No services match your filters. Try clearing your search.</p>
          <button onClick={openAdd} className="btn-primary py-2 px-4 text-xs font-bold mt-4 inline-flex items-center gap-1.5">
            <Plus size={13} /> Create Service
          </button>
        </div>
      ) : (
        /* ── MAIN PACKAGE LIST: Direct Package Containers with Configured Sets ── */
        <div className="space-y-6">
          {services.map((s) => {
            const tiers = Array.isArray(s.tiers) ? s.tiers : [];
            
            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-neutral-200/90 p-5 sm:p-6 shadow-xs hover:border-neutral-300 transition-all space-y-4"
              >
                {/* ── 1. PACKAGE HEADER (Primary Level Information) ── */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-neutral-100">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-neutral-100 overflow-hidden border border-neutral-200 shrink-0 flex items-center justify-center shadow-3xs mt-0.5">
                      {s.cover_image ? (
                        <img src={s.cover_image} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={24} className="text-neutral-400" />
                      )}
                    </div>

                    {/* Identity & Metadata */}
                    <div className="space-y-1.5 min-w-0">
                      <h3 className="font-heading font-extrabold text-primary text-base sm:text-lg leading-tight">
                        {s.name}
                      </h3>

                      {s.description && (
                        <p className="text-xs text-neutral-500 leading-relaxed max-w-3xl line-clamp-2">
                          {s.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
                        {/* Category Badge */}
                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gold/15 text-gold-dark border border-gold/30">
                          {s.category || 'General'}
                        </span>

                        <span className="text-neutral-300">·</span>

                        <span className="text-xs font-semibold text-neutral-500">
                          Required Deposit: <strong className="text-neutral-700">{peso(s.down_payment_amount)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Active/Inactive Status Indicator & Package-Level Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-center action-menu-container relative">
                    {/* Active / Inactive Status Indicator */}
                    <button
                      type="button"
                      onClick={() => onToggleActive(s)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        s.is_active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                          : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                      }`}
                      title="Click to toggle Active / Inactive status"
                    >
                      <span className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                      <span>{s.is_active ? 'Active' : 'Inactive'}</span>
                    </button>

                    {/* [Manage Sets] - Right beside Active */}
                    <button
                      type="button"
                      onClick={() => openManageSets(s)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 border border-neutral-200/90 transition-all flex items-center gap-2 cursor-pointer shadow-3xs"
                      title="Manage, duplicate, or reorder all sets for this package"
                    >
                      <Layers size={14} className="text-neutral-600" />
                      <span>Manage Sets</span>
                    </button>

                    {/* [Edit Package Details] - Right beside Manage Sets */}
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/90 hover:border-neutral-300 transition-all flex items-center gap-2 shadow-3xs cursor-pointer"
                      title="Edit package name, category, description, and required deposit"
                    >
                      <Edit2 size={14} className="text-neutral-700" />
                      <span>Edit Package Details</span>
                    </button>

                    {/* [•••] Package More Options */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenPackageMenuId(openPackageMenuId === s.id ? null : s.id);
                        }}
                        className="p-1.5 text-neutral-500 hover:text-primary hover:bg-neutral-100 rounded-full transition-colors border border-neutral-200 cursor-pointer shadow-3xs"
                        title="More package options"
                      >
                        <MoreHorizontal size={14} />
                      </button>

                      {openPackageMenuId === s.id && (
                        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-warm-lg border border-neutral-200/90 py-1.5 z-30 animate-fade-in text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenPackageMenuId(null);
                              onToggleActive(s);
                            }}
                            className="w-full px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <span className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                            <span>{s.is_active ? 'Set Inactive (Hide)' : 'Set Active (Show)'}</span>
                          </button>
                          <div className="my-1 border-t border-neutral-100" />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenPackageMenuId(null);
                              handleDelete(s.id, s.name);
                            }}
                            className="w-full px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Delete Package</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>                </div>

                {/* ── 2. CONFIGURED SETS (Directly Visible Underneath) ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider">
                        CONFIGURED SETS
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-bold">
                        {tiers.length} Set{tiers.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Wrapping Set Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                    {tiers.map((tier, tIdx) => {
                      const highlights = Array.isArray(tier.highlights) ? tier.highlights : [];
                      const isPopular = !!tier.popular;
                      const setMenuKey = `${s.id}-${tIdx}`;

                      return (
                        <div
                          key={tIdx}
                          className={`bg-white rounded-xl border p-4 flex flex-col justify-between transition-all relative group shadow-3xs ${
                            isPopular
                              ? 'border-gold/60 shadow-warm-xs ring-1 ring-gold/30 bg-gold/[0.02]'
                              : 'border-neutral-200/90 hover:border-neutral-300'
                          }`}
                        >
                          <div className="space-y-2">
                            {/* Card Top: ① Set Name & Popular / Regular Status */}
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-4 h-4 rounded-full bg-neutral-100 text-neutral-600 font-bold text-[11.5px] flex items-center justify-center shrink-0">
                                  {tIdx + 1}
                                </span>
                                <span className="font-heading font-extrabold text-primary text-sm truncate" title={tier.name}>
                                  {tier.name || `Set ${String.fromCharCode(65 + tIdx)}`}
                                </span>
                              </div>

                              {isPopular ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-gold/20 text-gold-dark border border-gold/40 shadow-3xs shrink-0">
                                  ★ Popular
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider shrink-0">
                                  Regular
                                </span>
                              )}
                            </div>

                            {/* Price */}
                            <div className="text-xl font-bold font-mono text-primary leading-tight pt-0.5">
                              {tier.price}
                            </div>

                            {/* Session Type */}
                            <div className="text-xs text-neutral-500 font-medium truncate">
                              {tier.duration || 'Studio Session'}
                            </div>

                            {/* Inclusions count */}
                            <div className="text-[11px] font-semibold text-neutral-400 pt-2 border-t border-neutral-100">
                              {highlights.length} inclusion{highlights.length !== 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Set Card Actions: [Edit Set] and [•••] */}
                          <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between gap-2 action-menu-container relative">
                            <button
                              type="button"
                              onClick={() => openQuickSet(s, tIdx)}
                              className="flex-1 py-1.5 px-3 bg-neutral-100 hover:bg-gold/15 text-neutral-700 hover:text-gold-dark rounded-lg text-xs font-bold transition-all border border-neutral-200/80 hover:border-gold/30 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Edit2 size={12} />
                              <span>Edit Set</span>
                            </button>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenSetMenuKey(openSetMenuKey === setMenuKey ? null : setMenuKey);
                                }}
                                className="p-1.5 text-neutral-400 hover:text-primary hover:bg-neutral-100 rounded-lg border border-neutral-200 transition-colors cursor-pointer"
                                title="More set options"
                              >
                                <MoreHorizontal size={13} />
                              </button>

                              {openSetMenuKey === setMenuKey && (
                                <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-white rounded-xl shadow-warm-lg border border-neutral-200/90 py-1.5 z-30 animate-fade-in text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      setOpenSetMenuKey(null);
                                      handleDuplicateSet(s, tIdx, e);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Copy size={12} />
                                    <span>Duplicate Set</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={tIdx === 0}
                                    onClick={(e) => {
                                      setOpenSetMenuKey(null);
                                      handleMoveSet(s, tIdx, -1, e);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <ArrowUp size={12} />
                                    <span>Move Earlier</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={tIdx === tiers.length - 1}
                                    onClick={(e) => {
                                      setOpenSetMenuKey(null);
                                      handleMoveSet(s, tIdx, 1, e);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <ArrowDown size={12} />
                                    <span>Move Later</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      setOpenSetMenuKey(null);
                                      handleTogglePopular(s, tIdx, e);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Star size={12} className={isPopular ? 'text-neutral-400' : 'fill-gold text-gold'} />
                                    <span>{isPopular ? 'Mark as Regular' : 'Mark as Popular'}</span>
                                  </button>
                                  <div className="my-1 border-t border-neutral-100" />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      setOpenSetMenuKey(null);
                                      handleDeleteSet(s, tIdx, e);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={12} />
                                    <span>Delete Set</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Trailing [ + Add Set ] Card */}
                    <button
                      type="button"
                      onClick={() => openQuickSet(s, -1)}
                      className="border-2 border-dashed border-neutral-200 hover:border-gold/60 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-gold/5 transition-all text-neutral-400 hover:text-gold-dark group min-h-[160px] cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-neutral-100 group-hover:bg-gold/20 text-neutral-400 group-hover:text-gold-dark flex items-center justify-center transition-all">
                        <Plus size={15} />
                      </div>
                      <span className="font-bold text-xs text-primary group-hover:text-gold-dark">
                        + Add Set
                      </span>
                      <span className="text-xs text-neutral-400 text-center">
                        Configure new tier
                      </span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. MANAGE SETS MODAL (Dedicated organization, reordering, duplicate) ─ */}
      <Modal
        isOpen={manageSetsModal.isOpen}
        onClose={() => setManageSetsModal({ isOpen: false, service: null })}
        customLayout
        hideHeader
        maxWidth="max-w-xl"
      >
        {currentManageService && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden font-body text-xs">
            {/* Fixed Header */}
            <div className="shrink-0 px-6 py-4 border-b border-neutral-100 bg-white flex items-center justify-between gap-3 z-10">
              <div>
                <span className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider block">
                  Manage Sets
                </span>
                <h3 className="font-heading text-lg font-bold text-primary mt-0.5">
                  {currentManageService.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManageSetsModal({ isOpen: false, service: null });
                    openQuickSet(currentManageService, -1);
                  }}
                  className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Set</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManageSetsModal({ isOpen: false, service: null })}
                  className="p-1.5 text-neutral-400 hover:text-primary hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-3">
              <p className="text-[11px] text-neutral-400">
                Reorder sets, duplicate tiers, change popular tags, or delete sets. Changes save immediately to the database.
              </p>

            {(!currentManageService.tiers || currentManageService.tiers.length === 0) ? (
              <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                <p className="text-xs text-neutral-400 mb-2">No sets currently configured for this package.</p>
                <button
                  type="button"
                  onClick={() => {
                    setManageSetsModal({ isOpen: false, service: null });
                    openQuickSet(currentManageService, -1);
                  }}
                  className="btn-primary py-1.5 px-3 text-xs font-semibold cursor-pointer"
                >
                  + Add First Set
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {currentManageService.tiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-neutral-50/80 hover:bg-neutral-100/70 border border-neutral-200/90 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-white text-neutral-600 font-bold text-xs flex items-center justify-center shrink-0 border border-neutral-200">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary text-xs truncate">
                            {tier.name}
                          </span>
                          {tier.popular && (
                            <span className="text-[11.5px] font-extrabold uppercase bg-gold text-primary px-1.5 py-0.2 rounded shadow-3xs">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gold-dark font-mono font-bold mt-0.5">
                          {tier.price} <span className="text-neutral-400 font-normal font-sans">· {tier.duration || 'Studio Session'} · {(tier.highlights || []).length} inclusions</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Reorder Up/Down */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => handleMoveSet(currentManageService, idx, -1, e)}
                        title="Move Up"
                        className="p-1 text-neutral-400 hover:text-primary disabled:opacity-30 rounded hover:bg-white transition-colors cursor-pointer"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === currentManageService.tiers.length - 1}
                        onClick={(e) => handleMoveSet(currentManageService, idx, 1, e)}
                        title="Move Down"
                        className="p-1 text-neutral-400 hover:text-primary disabled:opacity-30 rounded hover:bg-white transition-colors cursor-pointer"
                      >
                        <ArrowDown size={13} />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={(e) => handleDuplicateSet(currentManageService, idx, e)}
                        title="Duplicate Set"
                        className="p-1.5 text-neutral-500 hover:text-primary hover:bg-white rounded-lg border border-transparent hover:border-neutral-200 transition-colors cursor-pointer"
                      >
                        <Copy size={13} />
                      </button>

                      {/* Star / Popular */}
                      <button
                        type="button"
                        onClick={(e) => handleTogglePopular(currentManageService, idx, e)}
                        title={tier.popular ? "Remove Popular" : "Mark as Popular"}
                        className="p-1.5 text-neutral-400 hover:text-amber-500 hover:bg-white rounded-lg border border-transparent hover:border-neutral-200 transition-colors cursor-pointer"
                      >
                        <Star size={13} className={tier.popular ? 'fill-gold text-gold' : ''} />
                      </button>

                      {/* Edit Set */}
                      <button
                        type="button"
                        onClick={() => {
                          setManageSetsModal({ isOpen: false, service: null });
                          openQuickSet(currentManageService, idx);
                        }}
                        className="px-2.5 py-1 bg-gold/15 text-gold-dark hover:text-primary rounded-lg text-[11px] font-bold border border-gold/30 transition-colors cursor-pointer"
                      >
                        Edit Set
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSet(currentManageService, idx, e)}
                        title="Delete Set"
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>

            {/* Fixed Footer */}
            <div className="shrink-0 px-6 py-3.5 border-t border-neutral-100 bg-neutral-50/80 flex items-center justify-end z-10">
              <button
                type="button"
                onClick={() => setManageSetsModal({ isOpen: false, service: null })}
                className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 bg-white transition-colors cursor-pointer shadow-3xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── 5. SET EDITOR MODAL (Prominent Context: EDIT SET · [Set Name]) ─── */}
      <Modal
        isOpen={quickSetModal.isOpen}
        onClose={() => setQuickSetModal(prev => ({ ...prev, isOpen: false }))}
        customLayout
        hideHeader
        maxWidth="max-w-2xl"
      >
        {/* Prominent Context Header - Fixed at top */}
        <div className="shrink-0 px-6 py-4 border-b border-neutral-100 bg-white z-10">
          <button
            type="button"
            onClick={() => setQuickSetModal(prev => ({ ...prev, isOpen: false }))}
            className="text-[11px] font-semibold text-neutral-500 hover:text-primary transition-colors flex items-center gap-1 mb-2 cursor-pointer"
          >
            <span>← Back to {quickSetModal.service?.name}</span>
          </button>

          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider block">
                {quickSetModal.tierIndex >= 0 ? 'Edit Set' : 'Create New Set'}
              </span>
              <h3 className="font-heading text-lg font-bold text-primary mt-0.5">
                {quickSetModal.name || 'New Set'}
              </h3>
            </div>

            {quickSetModal.popular ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-gold/20 text-gold-dark border border-gold/40 shadow-3xs">
                ★ Popular Set
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200">
                Regular Set
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveQuickSet} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Body - Only this section scrolls vertically */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4 font-body text-xs">

          {/* SET INFORMATION */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider">
              Set Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Set Name *
                </label>
                <input
                  required
                  type="text"
                  value={quickSetModal.name}
                  onChange={e => setQuickSetModal(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Set A"
                  className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Price *
                </label>
                <input
                  required
                  type="text"
                  value={quickSetModal.price}
                  onChange={e => setQuickSetModal(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g. ₱4,875.00"
                  className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs font-mono font-bold text-gold-dark outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Session Type
                </label>
                <input
                  type="text"
                  list="session-presets"
                  value={quickSetModal.duration}
                  onChange={e => setQuickSetModal(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g. Studio Session"
                  className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                />
                <datalist id="session-presets">
                  {SESSION_TYPE_PRESETS.map((p, idx) => (
                    <option key={idx} value={p} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Outputs / Deliverables Overview
                </label>
                <input
                  type="text"
                  value={quickSetModal.edited}
                  onChange={e => setQuickSetModal(prev => ({ ...prev, edited: e.target.value }))}
                  placeholder="e.g. All prints & soft copies included"
                  className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-100 my-2" />

          {/* INCLUSIONS LIST WITH PER-ITEM EDIT & DELETE */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider">
                  Inclusions
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-bold text-xs">
                  {(quickSetModal.highlights || []).length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowAddInclusionInput(true)}
                className="btn-primary py-1 px-2.5 text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Plus size={12} />
                <span>+ Add Inclusion</span>
              </button>
            </div>

            {/* Inline New Inclusion Input */}
            {showAddInclusionInput && (
              <div className="flex items-center gap-2 p-2 bg-gold/10 rounded-xl border border-gold/30 animate-fade-in">
                <input
                  type="text"
                  autoFocus
                  value={newInclusionInput}
                  onChange={e => setNewInclusionInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmNewInclusion();
                    } else if (e.key === 'Escape') {
                      setShowAddInclusionInput(false);
                    }
                  }}
                  placeholder="e.g. 1 piece 12×18 portrait with crystal wood frame"
                  className="flex-1 px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs outline-none focus:border-gold"
                />
                <button
                  type="button"
                  onClick={handleConfirmNewInclusion}
                  className="px-3 py-1.5 bg-gold text-primary font-bold rounded-lg text-xs hover:bg-gold-dark transition-colors cursor-pointer"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddInclusionInput(false)}
                  className="px-2 py-1.5 text-neutral-500 hover:text-primary text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* List of Inclusions */}
            {(quickSetModal.highlights || []).length === 0 ? (
              <div className="p-4 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200 text-xs text-neutral-400">
                No inclusions added yet. Click "+ Add Inclusion" or select from suggestions below.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {(quickSetModal.highlights || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 bg-neutral-50/80 hover:bg-neutral-100/70 rounded-xl border border-neutral-200/80 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <GripVertical size={13} className="text-neutral-300 shrink-0" />
                      {editingInclusionIndex === idx ? (
                        <input
                          type="text"
                          autoFocus
                          value={editingInclusionText}
                          onChange={e => setEditingInclusionText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveInclusionEdit();
                            }
                          }}
                          className="w-full px-2 py-1 bg-white border border-gold rounded-lg text-xs font-medium outline-none"
                        />
                      ) : (
                        <span className="text-xs text-neutral-700 truncate font-medium">
                          {item}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {editingInclusionIndex === idx ? (
                        <button
                          type="button"
                          onClick={handleSaveInclusionEdit}
                          className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md text-xs font-bold border border-emerald-200 cursor-pointer"
                        >
                          Done
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingInclusionIndex(idx);
                              setEditingInclusionText(item);
                            }}
                            className="px-2 py-0.5 text-neutral-500 hover:text-primary hover:bg-white rounded-md text-xs font-semibold border border-transparent hover:border-neutral-200 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveInclusion(idx)}
                            className="px-2 py-0.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Suggestions Chips */}
            <div className="pt-2">
              <span className="text-[11.5px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Quick Deliverable Suggestions (Click to add):
              </span>
              <div className="flex flex-wrap gap-1">
                {COMMON_DELIVERABLES.map((item, dIdx) => (
                  <button
                    key={dIdx}
                    type="button"
                    onClick={() => handleAppendInclusion(item)}
                    className="px-2 py-0.5 rounded-lg bg-white hover:bg-gold/15 text-xs text-neutral-600 hover:text-gold-dark border border-neutral-200 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Plus size={10} />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-100 my-2" />

          {/* SET STATUS: Popular / Regular Toggle */}
          <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-neutral-800 text-xs">
                <Star size={13} className={quickSetModal.popular ? "fill-gold text-gold" : "text-neutral-400"} />
                <span>Feature as "Popular" Set</span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Displays a prominent gold highlight badge in client booking portal.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={quickSetModal.popular}
                onChange={e => setQuickSetModal(prev => ({ ...prev, popular: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
            </label>
          </div>

          {/* Modal Actions */}
          </div>

          {/* Fixed Footer - Always pinned at bottom */}
          <div className="shrink-0 px-6 py-3.5 border-t border-neutral-100 bg-neutral-50/80 flex items-center justify-between gap-3 z-10">
            <button
              type="button"
              onClick={() => setQuickSetModal(prev => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 bg-white transition-colors cursor-pointer shadow-3xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={savingQuickSet}
              className="btn-primary py-2 px-6 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {savingQuickSet ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving Set...</span>
                </>
              ) : (
                <>
                  <Check size={13} />
                  <span>Save Set</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── 2. EDIT PACKAGE DETAILS MODAL (Package-level information) ─────── */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        customLayout
        hideHeader
        maxWidth="max-w-2xl"
      >
        {/* Fixed Header - Stays sticky at top */}
        <div className="shrink-0 px-6 py-4 border-b border-neutral-100 bg-white flex items-center justify-between gap-3 z-10">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-base sm:text-lg text-primary truncate">
              {editingItem ? `Edit Package Details: ${editingItem.name}` : "Create Photography Package"}
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Configure package name, category, description, cover photo, and required booking deposit.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setModalOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-primary hover:bg-neutral-100 rounded-full transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form wrapping scrollable content + fixed footer */}
        <form onSubmit={handlePackageSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Body - Only this section scrolls vertically */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4 font-body text-xs">
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Package Name *
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. College Packages and Sets"
                className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <StudioDropdown
                  value={formData.category}
                  onChange={cat => setFormData({ ...formData, category: cat })}
                  options={categoryOptions}
                  placeholder="Select Category"
                  className="w-full"
                  triggerClassName="py-2 text-xs bg-neutral-50/60 border-neutral-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. college-packages"
                  className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Base Reference Price (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={e => setFormData({ ...formData, base_price: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Required Booking Deposit (₱) *
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={formData.down_payment_amount}
                  onChange={e => setFormData({ ...formData, down_payment_amount: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Description &amp; Package Overview
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Comprehensive description, prints included, and attire guidance..."
                className="w-full p-3 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 resize-none leading-relaxed"
              />
            </div>

            {/* Direct Image Uploader for Cover Image */}
            <div className="pt-1">
              <ImageDirectUploader
                value={formData.cover_image}
                onChange={url => setFormData({ ...formData, cover_image: url })}
                label="Package Cover Image"
                folder="services"
                helperText="Upload image file directly from your computer or provide an image link."
              />
            </div>

            {/* Portal Live Status */}
            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded text-gold focus:ring-gold"
              />
              <span className="font-semibold text-neutral-700 text-xs">Live &amp; Bookable in Client Portal</span>
            </label>

            {/* Sets reminder */}
            <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-gold-dark shrink-0" />
                <span className="text-[11px] text-neutral-600 font-medium">
                  This package has <strong>{formData.tiers?.length || 0} configured sets</strong>. Manage and reorder individual sets using the <strong>Manage Sets</strong> button on the main table.
                </span>
              </div>
            </div>
          </div>

          {/* Fixed Footer - Always pinned at bottom */}
          <div className="shrink-0 px-6 py-3.5 border-t border-neutral-100 bg-neutral-50/80 flex items-center justify-between gap-3 z-10">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 bg-white transition-colors cursor-pointer shadow-3xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary py-2 px-5 text-xs font-bold cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {saving ? 'Saving...' : editingItem ? 'Save Package Details' : 'Create Package'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


// ── 2. Categories View ────────────────────────────────────────────────────────
function CategoriesView({ categories = [], services = [], onRefresh }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });
  const [saving, setSaving] = useState(false);

  // Derive consolidated list of categories directly from database services + service_categories
  const consolidatedCategories = useMemo(() => {
    const list = [...categories];
    const knownKeys = new Set(list.map(c => (c.name || '').trim().toLowerCase()));

    // Active canonical database services categories:
    // Senior High, College, Video / Wedding, Photo / Wedding
    const canonicalMap = {
      'senior-high': { name: 'Senior High Packages', desc: 'Senior High School graduation portraits & studio inclusions' },
      'college': { name: 'College Packages', desc: 'Tertiary academic milestones, commencement regalia & sets' },
      'wedding-video': { name: 'Video / Wedding Packages', desc: 'Cinematic wedding films, highlights & audio coverage' },
      'wedding-photo': { name: 'Photo / Wedding Services', desc: 'Full-day wedding photography, prenup sessions & albums' },
    };

    services.forEach(s => {
      const catKey = (s.category || '').toLowerCase();
      const meta = canonicalMap[catKey];
      const displayName = meta ? meta.name : (s.category ? s.category.charAt(0).toUpperCase() + s.category.slice(1) : 'General');
      
      if (!knownKeys.has(displayName.toLowerCase()) && !knownKeys.has(catKey)) {
        knownKeys.add(displayName.toLowerCase());
        list.push({
          id: `derived_${catKey || s.id}`,
          name: displayName,
          description: meta?.desc || `${displayName} photography & packages`,
          is_active: true,
          is_derived: true,
          category_key: catKey
        });
      }
    });

    return list;
  }, [categories, services]);

  const openAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', description: '', is_active: true });
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditingItem(cat);
    setFormData({
      name: cat.name || '',
      description: cat.description || '',
      is_active: cat.is_active !== false
    });
    setModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete category "${name}"?`)) {
      if (String(id).startsWith('derived_')) {
        alert('This category is actively mapped to existing packages in your database. To remove it, edit the packages or reassign their category.');
        return;
      }
      await deleteServiceCategory(id);
      onRefresh();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem && !String(editingItem.id).startsWith('derived_')) {
        await updateServiceCategory(editingItem.id, formData);
      } else {
        await createServiceCategory(formData);
      }
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      alert('Error saving category: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h3 className="font-heading text-sm font-bold text-primary">Service Categories in Database</h3>
          <p className="text-xs text-neutral-500">
            Currently active catalog offerings: <strong>Senior High</strong>, <strong>College</strong>, <strong>Video / Wedding</strong>, and <strong>Photo / Wedding</strong> services.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 border border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            title="Reload categories from database"
          >
            <RefreshCw size={13} />
            <span>Sync with DB</span>
          </button>
          <button onClick={openAdd} className="btn-primary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <Plus size={14} /> New Category
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {consolidatedCategories.map((cat) => {
          const matchingServices = services.filter(s => {
            const sc = (s.category || '').toLowerCase();
            const cc = (cat.category_key || cat.name || '').toLowerCase();
            return sc.includes(cc) || cc.includes(sc);
          });

          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:border-gold/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center border border-gold/30">
                    <Layers size={16} />
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    cat.is_active !== false
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                  }`}>
                    {matchingServices.length > 0 ? `${matchingServices.length} Package${matchingServices.length !== 1 ? 's' : ''}` : 'Active'}
                  </span>
                </div>
                <h3 className="font-heading text-sm font-bold text-primary mt-3">{cat.name}</h3>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed line-clamp-2">
                  {cat.description || 'Verified studio service category.'}
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-1.5 mt-4 text-[11px] text-neutral-400">
                <span>{cat.is_derived ? 'DB Canonical' : 'Custom'}</span>
                <div className="flex items-center gap-1">
                  {!cat.is_derived && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(cat)}
                        className="p-1.5 text-neutral-500 hover:text-primary hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200"
                        title="Edit Category"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-neutral-200 hover:border-red-200"
                        title="Delete Category"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? "Edit Category" : "New Category"}>
        <form onSubmit={handleSubmit} className="space-y-4 font-body text-xs">
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Category Name *
            </label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Senior High Packages"
              className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Overview of this package category..."
              className="w-full p-3 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 resize-none leading-relaxed"
            />
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded text-gold focus:ring-gold"
            />
            <span className="font-semibold text-neutral-700 text-xs">Active Category</span>
          </label>

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
              className="btn-primary py-2 px-5 text-xs font-bold"
            >
              {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── 3. Add-Ons View with Multi-Select Bulk Deletion ────────────────────────────
function AddOnsView({ addOns = [], onRefresh }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: 0, category: 'prints', description: '', is_active: true });
  const [saving, setSaving] = useState(false);

  // Multi-row selection for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingBatch, setDeletingBatch] = useState(false);

  const allSelected = addOns.length > 0 && selectedIds.length === addOns.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(addOns.map(a => a.id));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', price: 350, category: 'prints', description: '', is_active: true });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      price: item.price || 0,
      category: item.category || 'prints',
      description: item.description || '',
      is_active: item.is_active !== false
    });
    setModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete add-on "${name}"?`)) {
      await deleteAddOn(id);
      setSelectedIds(prev => prev.filter(x => x !== id));
      onRefresh();
    }
  };

  // Bulk Delete Selected Add-Ons
  const handleDeleteBatch = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (window.confirm(`Are you sure you want to permanently delete all ${count} selected add-on items?`)) {
      setDeletingBatch(true);
      try {
        await deleteAddOnsBatch(selectedIds);
        setSelectedIds([]);
        onRefresh();
      } catch (err) {
        alert('Failed to delete selected items: ' + err.message);
      } finally {
        setDeletingBatch(false);
      }
    }
  };

  // Wipe / Purge All Add-Ons from Table
  const handleDeleteAll = async () => {
    if (addOns.length === 0) return;
    if (window.confirm(`WARNING: Are you sure you want to delete ALL ${addOns.length} add-on items in this table? This cannot be undone.`)) {
      setDeletingBatch(true);
      try {
        const allIds = addOns.map(a => a.id);
        await deleteAddOnsBatch(allIds);
        setSelectedIds([]);
        onRefresh();
      } catch (err) {
        alert('Failed to clear add-ons table: ' + err.message);
      } finally {
        setDeletingBatch(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        price: parseFloat(formData.price) || 0,
        category: formData.category,
        description: formData.description,
        is_active: formData.is_active
      };
      if (editingItem) {
        await updateAddOn(editingItem.id, payload);
      } else {
        await createAddOn(payload);
      }
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      alert('Error saving add-on: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs text-neutral-500 font-semibold">
          Showing <strong>{addOns.length}</strong> studio add-on items
        </span>
        <div className="flex items-center gap-2">
          {addOns.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={deletingBatch}
              className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Delete all add-ons from database"
            >
              <Trash2 size={13} />
              <span>Delete Entire Table</span>
            </button>
          )}
          <button onClick={openAdd} className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <Plus size={14} /> New Add-On
          </button>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-warm-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {selectedIds.length}
            </span>
            <span className="font-semibold text-xs text-red-900">
              {selectedIds.length} of {addOns.length} item{selectedIds.length !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={handleDeleteBatch}
              disabled={deletingBatch}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Trash2 size={13} />
              <span>{deletingBatch ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200/80 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded text-gold focus:ring-gold cursor-pointer"
                    title="Select all items"
                  />
                </th>
                <th className="px-4 py-3">Add-On Item</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {addOns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-neutral-400 text-xs">
                    No add-ons currently configured.
                  </td>
                </tr>
              ) : (
                addOns.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-amber-50/50 hover:bg-amber-50/70' : 'hover:bg-neutral-50/60'
                      }`}
                    >
                      <td className="w-10 px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(item.id)}
                          className="rounded text-gold focus:ring-gold cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-primary text-sm">{item.name}</div>
                        {item.description && <div className="text-[11px] text-neutral-400 mt-0.5">{item.description}</div>}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 capitalize">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-primary whitespace-nowrap">
                        {peso(item.price)}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          item.is_active !== false
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                        }`}>
                          {item.is_active !== false ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="p-1.5 text-neutral-500 hover:text-primary hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200"
                            title="Edit Add-On"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-neutral-200 hover:border-red-200"
                            title="Delete Add-On"
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? "Edit Add-On" : "New Add-On"}>
        <form onSubmit={handleSubmit} className="space-y-4 font-body text-xs">
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Add-On Name *
            </label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. 1-12x18 Crystal Wood Frame"
              className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Price (₱) *
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30"
              >
                <option value="prints">Prints &amp; Photos</option>
                <option value="frames">Frames &amp; Crystal Wood</option>
                <option value="makeup">Hair &amp; Makeup</option>
                <option value="digital">Digital Soft Copies</option>
                <option value="attire">Toga &amp; Barong Attire</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details regarding this add-on..."
              className="w-full p-3 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 resize-none leading-relaxed"
            />
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded text-gold focus:ring-gold"
            />
            <span className="font-semibold text-neutral-700 text-xs">Active Add-On</span>
          </label>

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
              className="btn-primary py-2 px-5 text-xs font-bold"
            >
              {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Add-On'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
