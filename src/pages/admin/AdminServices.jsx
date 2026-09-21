import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  ShoppingBag, RefreshCw, AlertCircle, CheckCircle2, XCircle, 
  Plus, Edit2, Trash2, Tag, Layers, Settings, Search, X, 
  Download, Sparkles, Check, ChevronDown, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
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
    <div className="w-full max-w-screen-2xl mx-auto space-y-6 pb-16 animate-fade-in font-body">
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

      {/* ── 2. Metric Overview Strip (4 Luxury Cards with Gradients) ───────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Packages */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-gold/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
              <ShoppingBag size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
              CATALOG
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Packages</p>
            <h3 className="font-heading text-2xl font-bold text-primary mt-0.5">{stats.totalServices}</h3>
            <p className="text-xs text-neutral-500 mt-1">Configured studio services</p>
          </div>
        </div>

        {/* Live on Booking Portal */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {stats.totalServices > 0 ? Math.round((stats.activeServices / stats.totalServices) * 100) : 100}% LIVE
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Live in Portal</p>
            <h3 className="font-heading text-2xl font-bold text-emerald-700 mt-0.5">{stats.activeServices}</h3>
            <p className="text-xs text-neutral-500 mt-1">Bookable by clients online</p>
          </div>
        </div>

        {/* Service Categories */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
              <Layers size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              TAXONOMY
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Categories</p>
            <h3 className="font-heading text-2xl font-bold text-primary mt-0.5">{stats.totalCategories}</h3>
            <p className="text-xs text-neutral-500 mt-1">Graduation, Portrait, Event &amp; Sets</p>
          </div>
        </div>

        {/* Studio Add-Ons */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
              <Tag size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
              EXTRAS
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Studio Add-Ons</p>
            <h3 className="font-heading text-2xl font-bold text-primary mt-0.5">{stats.totalAddOns}</h3>
            <p className="text-xs text-neutral-500 mt-1">Framing, prints, and hair/makeup</p>
          </div>
        </div>
      </div>

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
              <label className="block text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
              <span className="text-[10.5px] font-semibold text-neutral-500 mr-1">Status:</span>
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
  );
}

// ── 1. Services View ──────────────────────────────────────────────────────────
function ServicesView({ services, allCategories, onRefresh, onToggleActive }) {
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

  useEffect(() => {
    const handleOpen = () => openAdd();
    window.addEventListener('ekodak:open_service_modal', handleOpen);
    return () => window.removeEventListener('ekodak:open_service_modal', handleOpen);
  }, [allCategories]);

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
          highlights: ['1-12x18 with crystal wood frame', '1-8x10 portrait frame', '12pcs 2x2 colored ID', 'Free hair & makeup styling']
        },
        {
          name: 'Set B',
          price: '₱3,575.00',
          edited: 'All prints included',
          duration: 'Studio Session',
          popular: false,
          highlights: ['1-12x16 crystal wood frame', '6pcs wallet size', '12pcs 2x2 ID']
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
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      await deleteService(id);
      onRefresh();
    }
  };

  const handleAddTier = () => {
    const nextIdx = formData.tiers.length + 1;
    setFormData(prev => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        {
          name: `Set ${String.fromCharCode(64 + nextIdx)}`,
          price: '₱2,500.00',
          duration: 'Studio Session',
          edited: 'Complete prints included',
          popular: false,
          highlights: ['High-resolution soft copies', 'Studio portraits']
        }
      ]
    }));
  };

  const handleUpdateTier = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.tiers];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, tiers: updated };
    });
  };

  const handleRemoveTier = (index) => {
    if (formData.tiers.length <= 1) {
      if (!window.confirm('Remove this set? Package will have no configured tier sets.')) return;
    }
    setFormData(prev => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
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
      alert('Error saving service: ' + err.message);
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
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500 font-semibold">
          Showing <strong>{services.length}</strong> photography packages
        </span>
        <button onClick={openAdd} className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-xs">
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
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200/80 text-[10.5px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Package Name &amp; Configured Sets</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Sets &amp; Pricing Range</th>
                  <th className="px-4 py-3 hidden md:table-cell">Down Payment</th>
                  <th className="px-4 py-3 text-center">Portal Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {services.map((s) => {
                  const tiers = Array.isArray(s.tiers) ? s.tiers : [];
                  
                  return (
                    <tr key={s.id} className="hover:bg-neutral-50/60 transition-colors">
                      {/* Name, Thumb & Sets Pricings Display */}
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden border border-neutral-200 shrink-0 flex items-center justify-center mt-0.5">
                            {s.cover_image ? (
                              <img src={s.cover_image} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={20} className="text-neutral-400" />
                            )}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="font-bold text-primary text-sm leading-snug">
                              {s.name}
                            </div>
                            {s.description && (
                              <div className="text-[11px] text-neutral-400 line-clamp-1 max-w-md">
                                {s.description}
                              </div>
                            )}

                            {/* Prominent Sets & Pricings Display */}
                            {tiers.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {tiers.map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50/90 border border-amber-200 text-[11px] font-medium text-amber-900 shadow-3xs"
                                  >
                                    <span className="font-bold text-primary">{t.name}:</span>
                                    <span className="font-semibold text-gold-dark">{t.price}</span>
                                    {t.popular && (
                                      <span className="text-[9px] font-extrabold uppercase bg-gold text-primary px-1 rounded-sm shadow-3xs">
                                        Popular
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[11px] text-neutral-400 pt-0.5">
                                Base Rate: {peso(s.base_price)} (No custom sets configured)
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold/15 text-gold-dark border border-gold/30">
                          {s.category || 'General'}
                        </span>
                      </td>

                      {/* Pricing / Sets Summary */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {tiers.length > 0 ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/80 text-amber-900 font-bold text-xs border border-amber-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                              {tiers.length} Set{tiers.length !== 1 ? 's' : ''} Active
                            </span>
                            <span className="text-[10px] text-neutral-400 block font-medium">
                              Configured tiers
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-primary text-xs">{peso(s.base_price)}</span>
                            <span className="text-[10px] text-neutral-400 block">Base rate</span>
                          </div>
                        )}
                      </td>

                      {/* Down Payment */}
                      <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap">
                        <span className="font-semibold text-neutral-700">{peso(s.down_payment_amount)}</span>
                        <span className="text-[9.5px] text-neutral-400 block mt-0.5">Required booking deposit</span>
                      </td>

                      {/* Portal Status */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleActive(s)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold border transition-all ${
                            s.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                              : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                          }`}
                          title="Click to toggle booking availability"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                          <span>{s.is_active ? 'Active' : 'Hidden'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className="p-1.5 text-neutral-500 hover:text-primary hover:bg-neutral-100 rounded-xl transition-colors border border-neutral-200"
                            title="Edit Service & Sets"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-neutral-200 hover:border-red-200"
                            title="Delete Service"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── High-End Edit / New Package Modal with Sets Editor ─────────────── */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editingItem ? `Edit Package: ${editingItem.name}` : "Create Photography Package"}
      >
        <form onSubmit={handleSubmit} className="space-y-5 font-body text-xs">
          {/* Sub-tabs inside modal for General Details vs Sets Configurator */}
          <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-xl">
            <button
              type="button"
              onClick={() => setEditTab('general')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                editTab === 'general'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-neutral-500 hover:text-primary'
              }`}
            >
              1. Package Details &amp; Cover
            </button>
            <button
              type="button"
              onClick={() => setEditTab('sets')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                editTab === 'sets'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-neutral-500 hover:text-primary'
              }`}
            >
              <span>2. Sets &amp; Pricing Tiers</span>
              <span className="px-1.5 py-0.5 rounded-full bg-gold/20 text-gold-dark text-[10px] font-extrabold">
                {formData.tiers?.length || 0}
              </span>
            </button>
          </div>

          {/* TAB 1: General Details */}
          {editTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Package Name *
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. College Packages and sets"
                  className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Down Payment Deposit Required (₱) *
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
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
              <div>
                <ImageDirectUploader
                  value={formData.cover_image}
                  onChange={url => setFormData({ ...formData, cover_image: url })}
                  label="Package Cover Image"
                  folder="services"
                  helperText="Upload image file directly from your computer or provide an image link."
                />
              </div>

              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-gold focus:ring-gold"
                />
                <span className="font-semibold text-neutral-700 text-xs">Live &amp; Bookable in Client Portal</span>
              </label>
            </div>
          )}

          {/* TAB 2: Sets & Pricing Configurator */}
          {editTab === 'sets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-primary text-xs">Configured Set Tiers &amp; Pricing</h4>
                  <p className="text-[11px] text-neutral-400">
                    Define distinct sets (e.g. Set A, Set B, Deluxe), individual prices, inclusions, and popular status.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <Plus size={13} />
                  <span>Add Set / Tier</span>
                </button>
              </div>

              {(!formData.tiers || formData.tiers.length === 0) ? (
                <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                  <p className="text-xs text-neutral-400 mb-2">No individual sets configured for this package.</p>
                  <button
                    type="button"
                    onClick={handleAddTier}
                    className="btn-outline py-1.5 px-3 text-xs font-semibold"
                  >
                    + Add First Set
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {formData.tiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="bg-neutral-50/80 border border-neutral-200/90 rounded-2xl p-3.5 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-gold/20 text-gold-dark font-extrabold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-primary text-xs">
                            {tier.name || `Set ${idx + 1}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!tier.popular}
                              onChange={e => handleUpdateTier(idx, 'popular', e.target.checked)}
                              className="rounded text-gold focus:ring-gold"
                            />
                            <span>Popular Tag</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveTier(idx)}
                            className="p-1 text-neutral-400 hover:text-red-500 rounded-lg transition-colors"
                            title="Remove this set"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
                            Set Name *
                          </label>
                          <input
                            required
                            type="text"
                            value={tier.name}
                            onChange={e => handleUpdateTier(idx, 'name', e.target.value)}
                            placeholder="e.g. Set A or Deluxe"
                            className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold focus:border-gold outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
                            Set Price * (e.g. ₱4,875.00)
                          </label>
                          <input
                            required
                            type="text"
                            value={tier.price}
                            onChange={e => handleUpdateTier(idx, 'price', e.target.value)}
                            placeholder="e.g. ₱4,875.00"
                            className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold focus:border-gold outline-none text-gold-dark font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
                            Duration / Session Format
                          </label>
                          <input
                            type="text"
                            value={tier.duration || ''}
                            onChange={e => handleUpdateTier(idx, 'duration', e.target.value)}
                            placeholder="e.g. Studio Session or 2 hours"
                            className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs focus:border-gold outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
                            Prints / Outputs Summary
                          </label>
                          <input
                            type="text"
                            value={tier.edited || ''}
                            onChange={e => handleUpdateTier(idx, 'edited', e.target.value)}
                            placeholder="e.g. All prints & soft copies included"
                            className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs focus:border-gold outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
                          Highlights &amp; Prints Included (1 item per line)
                        </label>
                        <textarea
                          rows={3}
                          value={Array.isArray(tier.highlights) ? tier.highlights.join('\n') : ''}
                          onChange={e => handleUpdateTier(idx, 'highlights', e.target.value.split('\n').filter(Boolean))}
                          placeholder="1-12x18 crystal frame&#10;1-8x10 portrait with frame&#10;Free hair and makeup"
                          className="w-full p-2 bg-white border border-neutral-200 rounded-xl text-xs focus:border-gold outline-none font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
            {editTab === 'general' ? (
              <button
                type="button"
                onClick={() => setEditTab('sets')}
                className="text-xs font-semibold text-gold hover:underline flex items-center gap-1"
              >
                <span>Proceed to Sets &amp; Pricing →</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditTab('general')}
                className="text-xs font-semibold text-neutral-500 hover:text-primary flex items-center gap-1"
              >
                <span>← Back to Package Details</span>
              </button>
            )}

            <div className="flex items-center gap-2">
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
                {saving ? 'Saving to Database...' : editingItem ? 'Save Package Changes' : 'Create Package'}
              </button>
            </div>
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
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
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
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
              <tr className="bg-neutral-50/80 border-b border-neutral-200/80 text-[10.5px] font-bold text-neutral-500 uppercase tracking-wider">
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
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 capitalize">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-primary whitespace-nowrap">
                        {peso(item.price)}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
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
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
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
