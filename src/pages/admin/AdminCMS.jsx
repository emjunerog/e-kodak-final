import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Megaphone, MessageCircle, Shield, Users, Image as ImageIcon,
  RefreshCw, AlertCircle, Plus, Edit2, Trash2, Save, Star,
  Search, X, CheckCircle2, Eye, EyeOff, Sparkles, Download,
  ExternalLink, Phone, Mail, MapPin, Clock, Globe, ArrowRight,
  HelpCircle, FileText, Check, ShieldCheck, Heart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import StudioDropdown from '../../components/ui/StudioDropdown';
import ImageDirectUploader from '../../components/ui/ImageDirectUploader';
import Modal from '../../components/ui/Modal';
import { 
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getFaqs, createFaq, updateFaq, deleteFaq,
  getLegalDocs, createLegalDoc, updateLegalDoc, deleteLegalDoc,
  getTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember,
  getGalleryItems, createGalleryItem, updateGalleryItem, deleteGalleryItem, incrementGalleryLikes,
  getStudioSettings, updateStudioSettings, createStudioSettings
} from '../../services/contentAdminService';

export default function AdminCMS() {
  const { user, profile } = useAuth();
  
  // Tab state: 'announcements' | 'faqs' | 'gallery' | 'settings' | 'team' | 'legal'
  const [activeTab, setActiveTab] = useState('announcements');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Data states directly from database
  const [announcements, setAnnouncements] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [legalDocs, setLegalDocs] = useState([]);
  const [team, setTeam] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [studioSettings, setStudioSettings] = useState(null);

  // Fetch all CMS & Settings data from live Supabase tables
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, fRes, lRes, tRes, gRes, sRes] = await Promise.all([
        getAnnouncements(),
        getFaqs(),
        getLegalDocs(),
        getTeamMembers(),
        getGalleryItems(),
        getStudioSettings()
      ]);

      if (aRes.error || fRes.error || lRes.error || tRes.error || gRes.error || sRes.error) {
        console.warn('CMS Load Warnings:', {
          announcements: aRes.error,
          faqs: fRes.error,
          legal: lRes.error,
          team: tRes.error,
          gallery: gRes.error,
          settings: sRes.error
        });
      }

      setAnnouncements(aRes.data || []);
      setFaqs(fRes.data || []);
      setLegalDocs(lRes.data || []);
      setTeam(tRes.data || []);
      setGallery(gRes.data || []);
      setStudioSettings(sRes.data || null);
    } catch (err) {
      console.error('Failed to load CMS data:', err);
      setError('Unable to fetch CMS records from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Flash message helper
  const showToast = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Export CMS summary backup
  const handleExportCmsBackup = () => {
    const backupData = {
      exportTimestamp: new Date().toISOString(),
      studioSettings,
      announcementsCount: announcements.length,
      announcements,
      faqsCount: faqs.length,
      faqs,
      galleryItemsCount: gallery.length,
      gallery,
      teamCount: team.length,
      team,
      legalDocsCount: legalDocs.length,
      legalDocs
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ekodak-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CMS database export downloaded successfully.');
  };

  // Primary action button config depending on active tab
  const getPrimaryAction = () => {
    switch (activeTab) {
      case 'announcements':
        return {
          label: 'New Notice',
          icon: Plus,
          onClick: () => window.dispatchEvent(new CustomEvent('ekodak:cms:open_announcement_modal'))
        };
      case 'faqs':
        return {
          label: 'New FAQ',
          icon: Plus,
          onClick: () => window.dispatchEvent(new CustomEvent('ekodak:cms:open_faq_modal'))
        };
      case 'gallery':
        return {
          label: 'New Photo',
          icon: Plus,
          onClick: () => window.dispatchEvent(new CustomEvent('ekodak:cms:open_gallery_modal'))
        };
      case 'settings':
        return {
          label: 'Save Studio Info',
          icon: Save,
          onClick: () => window.dispatchEvent(new CustomEvent('ekodak:cms:save_settings'))
        };
      case 'team':
        return {
          label: 'New Member',
          icon: Plus,
          onClick: () => window.dispatchEvent(new CustomEvent('ekodak:cms:open_team_modal'))
        };
      case 'legal':
        return {
          label: 'New Document',
          icon: Plus,
          onClick: () => window.dispatchEvent(new CustomEvent('ekodak:cms:open_legal_modal'))
        };
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-6 pb-16 animate-fade-in font-body">
      {/* ── 1. Luxury Administrative Hero Banner ────────────────────────────── */}
      <AdminHeroBanner
        station="admin"
        badgeLabel="Content Management System"
        badgeIcon={Sparkles}
        userName={profile?.full_name || user?.email?.split('@')[0] || 'Administrator'}
        title="CMS, Brand & Studio Settings"
        subtitle="Manage client announcements, FAQs, visual portfolio showcase, studio identity, and legal policies."
        statusSummary={`${announcements.length} Notices · ${faqs.length} FAQs · ${gallery.length} Portfolio Photos · ${studioSettings ? 'Live Studio Info' : 'Setting Up'}`}
        primaryAction={getPrimaryAction()}
        secondaryAction={{
          label: 'Export CMS Backup',
          icon: Download,
          onClick: handleExportCmsBackup
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
        {/* Announcements Card */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <Megaphone size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              BROADCAST
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Client Notices</p>
            <h3 className="font-heading text-2xl font-bold text-primary mt-0.5">{announcements.length}</h3>
            <p className="text-xs text-neutral-500 mt-1">
              {announcements.filter(a => a.is_active).length} live broadcast banners
            </p>
          </div>
        </div>

        {/* FAQs Card */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
              <MessageCircle size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              KNOWLEDGE
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Knowledge Base</p>
            <h3 className="font-heading text-2xl font-bold text-primary mt-0.5">{faqs.length}</h3>
            <p className="text-xs text-neutral-500 mt-1">
              {faqs.filter(f => f.is_active).length} active studio FAQs
            </p>
          </div>
        </div>

        {/* Visual Portfolio Showcase */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <ImageIcon size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              GALLERY
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Portfolio Photos</p>
            <h3 className="font-heading text-2xl font-bold text-primary mt-0.5">{gallery.length}</h3>
            <p className="text-xs text-neutral-500 mt-1">
              {gallery.filter(g => g.is_featured).length} featured on homepage
            </p>
          </div>
        </div>

        {/* Studio Identity & Profile */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-gold/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
              <Globe size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Studio Identity</p>
            <h3 className="font-heading text-lg font-bold text-primary mt-0.5 truncate">
              {studioSettings?.contact_email || 'contact@e-kodak.com'}
            </h3>
            <p className="text-xs text-neutral-500 mt-1 truncate">
              {studioSettings?.address ? 'Cebu City Studio Verified' : 'Settings Synchronized'}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Navigation Bar (Tabs with Counts) ───────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
            activeTab === 'announcements'
              ? 'bg-primary text-white shadow-sm'
              : 'text-neutral-600 hover:text-primary hover:bg-neutral-100/70'
          }`}
        >
          <Megaphone size={16} className={activeTab === 'announcements' ? 'text-gold' : 'text-neutral-400'} />
          <span>Notices & Banners</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            activeTab === 'announcements' ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
          }`}>
            {announcements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('faqs')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
            activeTab === 'faqs'
              ? 'bg-primary text-white shadow-sm'
              : 'text-neutral-600 hover:text-primary hover:bg-neutral-100/70'
          }`}
        >
          <MessageCircle size={16} className={activeTab === 'faqs' ? 'text-gold' : 'text-neutral-400'} />
          <span>FAQs</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            activeTab === 'faqs' ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
          }`}>
            {faqs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
            activeTab === 'gallery'
              ? 'bg-primary text-white shadow-sm'
              : 'text-neutral-600 hover:text-primary hover:bg-neutral-100/70'
          }`}
        >
          <ImageIcon size={16} className={activeTab === 'gallery' ? 'text-gold' : 'text-neutral-400'} />
          <span>Portfolio Gallery</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            activeTab === 'gallery' ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
          }`}>
            {gallery.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-primary text-white shadow-sm'
              : 'text-neutral-600 hover:text-primary hover:bg-neutral-100/70'
          }`}
        >
          <Globe size={16} className={activeTab === 'settings' ? 'text-gold' : 'text-neutral-400'} />
          <span>Studio Profile & Settings</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
            activeTab === 'team'
              ? 'bg-primary text-white shadow-sm'
              : 'text-neutral-600 hover:text-primary hover:bg-neutral-100/70'
          }`}
        >
          <Users size={16} className={activeTab === 'team' ? 'text-gold' : 'text-neutral-400'} />
          <span>Team Members</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            activeTab === 'team' ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
          }`}>
            {team.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('legal')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
            activeTab === 'legal'
              ? 'bg-primary text-white shadow-sm'
              : 'text-neutral-600 hover:text-primary hover:bg-neutral-100/70'
          }`}
        >
          <Shield size={16} className={activeTab === 'legal' ? 'text-gold' : 'text-neutral-400'} />
          <span>Legal Policies</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            activeTab === 'legal' ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
          }`}>
            {legalDocs.length}
          </span>
        </button>
      </div>

      {/* ── 4. Main Tab Content Views ───────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white/70 rounded-2xl border border-neutral-200/80 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'announcements' && (
            <AnnouncementsView 
              items={announcements} 
              onRefresh={loadData} 
              showToast={showToast} 
            />
          )}

          {activeTab === 'faqs' && (
            <FaqsView 
              items={faqs} 
              onRefresh={loadData} 
              showToast={showToast} 
            />
          )}

          {activeTab === 'gallery' && (
            <GalleryView 
              items={gallery} 
              onRefresh={loadData} 
              showToast={showToast} 
            />
          )}

          {activeTab === 'settings' && (
            <StudioSettingsView 
              settings={studioSettings} 
              onRefresh={loadData} 
              showToast={showToast} 
            />
          )}

          {activeTab === 'team' && (
            <TeamView 
              items={team} 
              onRefresh={loadData} 
              showToast={showToast} 
            />
          )}

          {activeTab === 'legal' && (
            <LegalView 
              items={legalDocs} 
              onRefresh={loadData} 
              showToast={showToast} 
            />
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 1. ANNOUNCEMENTS VIEW (Notices & Banners)
// ════════════════════════════════════════════════════════════════════════════════
function AnnouncementsView({ items, onRefresh, showToast }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [formData, setFormData] = useState({
    text: '',
    cta_text: '',
    cta_link: '',
    type: 'info',
    sort_order: 1,
    is_active: true,
  });

  // Listen for global trigger from AdminHeroBanner
  useEffect(() => {
    const handleOpenModal = () => openAdd();
    window.addEventListener('ekodak:cms:open_announcement_modal', handleOpenModal);
    return () => window.removeEventListener('ekodak:cms:open_announcement_modal', handleOpenModal);
  }, []);

  const openAdd = () => {
    setEditingItem(null);
    setFormData({
      text: '',
      cta_text: '',
      cta_link: '',
      type: 'info',
      sort_order: items.length + 1,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      text: item.text || item.title || item.content || '',
      cta_text: item.cta_text || '',
      cta_link: item.cta_link || '',
      type: item.type || 'info',
      sort_order: item.sort_order || 1,
      is_active: item.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateAnnouncement(editingItem.id, formData);
        showToast('Announcement updated successfully.');
      } else {
        await createAnnouncement(formData);
        showToast('New announcement created successfully.');
      }
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to save announcement:', err);
      alert('Failed to save announcement: ' + err.message);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const nextStatus = !item.is_active;
      await updateAnnouncement(item.id, { is_active: nextStatus });
      showToast(`Announcement is now ${nextStatus ? 'ACTIVE on portal' : 'HIDDEN'}.`);
      onRefresh();
    } catch (err) {
      console.error('Toggle active error:', err);
      alert('Failed to toggle status: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      await deleteAnnouncement(id);
      showToast('Announcement deleted from database.');
      onRefresh();
    }
  };

  // Dropdown filter options
  const typeOptions = [
    { value: 'ALL', label: 'All Notice Types', desc: 'Display info, warning & promo banners' },
    { value: 'info', label: 'Info Banner', desc: 'General studio updates & reminders' },
    { value: 'warning', label: 'Important Notice', desc: 'Schedule alerts & operational advisories' },
    { value: 'promo', label: 'Promotion / Seasonal', desc: 'Discounts & priority reservation notices' },
  ];

  const statusOptions = [
    { value: 'ALL', label: 'All Statuses', desc: 'Active & hidden announcements' },
    { value: 'ACTIVE', label: 'Live on Portal', desc: 'Only visible notices' },
    { value: 'INACTIVE', label: 'Draft / Inactive', desc: 'Hidden notices' },
  ];

  // Filtered announcements
  const filteredItems = useMemo(() => {
    return items.filter(a => {
      if (statusFilter === 'ACTIVE' && !a.is_active) return false;
      if (statusFilter === 'INACTIVE' && a.is_active) return false;
      if (typeFilter !== 'ALL' && a.type !== typeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const text = (a.text || a.title || a.content || '').toLowerCase();
      const cta = (a.cta_text || '').toLowerCase();
      return text.includes(q) || cta.includes(q);
    });
  }, [items, typeFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search announcement text or call to action..."
            className="w-full pl-10 pr-9 py-2 bg-neutral-50/70 border border-neutral-200 rounded-xl text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-gold focus:bg-white transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-48">
            <StudioDropdown
              value={typeFilter}
              onChange={setTypeFilter}
              options={typeOptions}
              placeholder="Filter Type"
            />
          </div>

          <div className="w-40">
            <StudioDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              placeholder="Filter Status"
            />
          </div>

          <button
            onClick={openAdd}
            className="btn-primary py-2 px-4 text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Plus size={15} />
            <span>New Notice</span>
          </button>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden divide-y divide-neutral-100">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 text-xs">
            <Megaphone size={32} className="mx-auto mb-2 text-neutral-300" />
            No announcements match your search or filter.
          </div>
        ) : (
          filteredItems.map(a => {
            const announcementText = a.text || a.title || a.content || 'Untitled Announcement';
            const isWarning = a.type === 'warning';
            const isPromo = a.type === 'promo';

            return (
              <div key={a.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isWarning 
                        ? 'bg-amber-50 text-amber-800 border-amber-200' 
                        : isPromo 
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {a.type || 'info'}
                    </span>

                    <button
                      onClick={() => handleToggleActive(a)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                        a.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                      }`}
                      title="Click to toggle portal visibility"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${a.is_active ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
                      {a.is_active ? 'Active on Portal' : 'Inactive / Hidden'}
                    </button>

                    <span className="text-[10px] text-neutral-400">
                      Sort Order: #{a.sort_order || 0}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-primary font-medium leading-relaxed">
                    {announcementText}
                  </p>

                  {a.cta_text && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-neutral-500 font-body">Call to Action:</span>
                      <span className="text-[11px] font-semibold text-gold bg-gold/10 px-2 py-0.5 rounded-md border border-gold/20 flex items-center gap-1">
                        {a.cta_text} {a.cta_link && <ArrowRight size={11} />}
                      </span>
                      {a.cta_link && (
                        <span className="text-[10px] text-neutral-400 font-mono">({a.cta_link})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-100">
                  <button
                    onClick={() => openEdit(a)}
                    className="p-2 text-neutral-500 hover:text-gold hover:bg-neutral-100 rounded-xl transition-colors"
                    title="Edit Announcement"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Delete Announcement"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Announcement Modal */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editingItem ? "Edit Announcement" : "Create Announcement"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Notice Type *
            </label>
            <StudioDropdown
              value={formData.type}
              onChange={(val) => setFormData({ ...formData, type: val })}
              options={[
                { value: 'info', label: 'Info (Standard Blue)' },
                { value: 'warning', label: 'Warning (Amber Alert)' },
                { value: 'promo', label: 'Promotion (Purple / Seasonal)' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Announcement Message / Text *
            </label>
            <textarea
              required
              rows={3}
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
              placeholder="e.g. 🎓 2026 Graduation Season Priority Bookings are now officially open! Reserve your slot today."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                CTA Button Text (Optional)
              </label>
              <input
                type="text"
                value={formData.cta_text}
                onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="e.g. Book Session"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                CTA Link (Optional)
              </label>
              <input
                type="text"
                value={formData.cta_link}
                onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="e.g. /services"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Sort Priority Order
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
              />
            </div>

            <div className="pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-gold focus:ring-gold"
                />
                <span>Active on Public Portal</span>
              </label>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary py-2 px-5 text-xs font-semibold rounded-xl"
            >
              Save Announcement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 2. FAQS VIEW (Knowledge Base & Inquiries)
// ════════════════════════════════════════════════════════════════════════════════
function FaqsView({ items, onRefresh, showToast }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'General',
    sort_order: 0,
    is_active: true,
  });

  // Listen for global trigger from AdminHeroBanner
  useEffect(() => {
    const handleOpenModal = () => openAdd();
    window.addEventListener('ekodak:cms:open_faq_modal', handleOpenModal);
    return () => window.removeEventListener('ekodak:cms:open_faq_modal', handleOpenModal);
  }, []);

  const openAdd = () => {
    setEditingItem(null);
    setFormData({
      question: '',
      answer: '',
      category: 'General',
      sort_order: items.length + 1,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      question: item.question || '',
      answer: item.answer || '',
      category: item.category || 'General',
      sort_order: item.sort_order || 0,
      is_active: item.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateFaq(editingItem.id, formData);
        showToast('FAQ updated successfully.');
      } else {
        await createFaq(formData);
        showToast('New FAQ added to knowledge base.');
      }
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to save FAQ:', err);
      alert('Failed to save FAQ: ' + err.message);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const nextStatus = !item.is_active;
      await updateFaq(item.id, { is_active: nextStatus });
      showToast(`FAQ is now ${nextStatus ? 'ACTIVE on portal' : 'HIDDEN'}.`);
      onRefresh();
    } catch (err) {
      console.error('Toggle active error:', err);
      alert('Failed to toggle status: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this FAQ?')) {
      await deleteFaq(id);
      showToast('FAQ deleted from database.');
      onRefresh();
    }
  };

  // Distinct categories for dropdown
  const categoryOptions = useMemo(() => {
    const opts = [{ value: 'ALL', label: 'All Categories', desc: 'Display all FAQ topics' }];
    const unique = Array.from(new Set(items.map(f => f.category || 'General')));
    unique.forEach(cat => {
      opts.push({ value: cat, label: cat, desc: `${cat} inquiries and answers` });
    });
    return opts;
  }, [items]);

  const statusOptions = [
    { value: 'ALL', label: 'All Statuses', desc: 'Active & hidden FAQs' },
    { value: 'ACTIVE', label: 'Live on Portal', desc: 'Only visible FAQs' },
    { value: 'INACTIVE', label: 'Hidden FAQs', desc: 'Draft or retired FAQs' },
  ];

  // Filtered FAQs
  const filteredItems = useMemo(() => {
    return items.filter(f => {
      if (statusFilter === 'ACTIVE' && !f.is_active) return false;
      if (statusFilter === 'INACTIVE' && f.is_active) return false;
      if (categoryFilter !== 'ALL' && (f.category || 'General') !== categoryFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const question = (f.question || '').toLowerCase();
      const answer = (f.answer || '').toLowerCase();
      const cat = (f.category || '').toLowerCase();
      return question.includes(q) || answer.includes(q) || cat.includes(q);
    });
  }, [items, categoryFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs by question, keywords, or answers..."
            className="w-full pl-10 pr-9 py-2 bg-neutral-50/70 border border-neutral-200 rounded-xl text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-gold focus:bg-white transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-48">
            <StudioDropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categoryOptions}
              placeholder="Category"
            />
          </div>

          <div className="w-40">
            <StudioDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              placeholder="Status"
            />
          </div>

          <button
            onClick={openAdd}
            className="btn-primary py-2 px-4 text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Plus size={15} />
            <span>New FAQ</span>
          </button>
        </div>
      </div>

      {/* FAQs List */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden divide-y divide-neutral-100">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 text-xs">
            <HelpCircle size={32} className="mx-auto mb-2 text-neutral-300" />
            No FAQs match your search or filter criteria.
          </div>
        ) : (
          filteredItems.map(f => (
            <div key={f.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-neutral-50/50 transition-colors">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                    {f.category || 'General'}
                  </span>

                  <button
                    onClick={() => handleToggleActive(f)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                      f.is_active 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                        : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                    }`}
                    title="Click to toggle portal visibility"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${f.is_active ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
                    {f.is_active ? 'Active' : 'Hidden'}
                  </button>

                  <span className="text-[10px] text-neutral-400">
                    Order: #{f.sort_order || 0}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-semibold text-primary">
                  {f.question}
                </h4>

                <p className="text-xs text-neutral-600 leading-relaxed font-body">
                  {f.answer}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-100">
                <button
                  onClick={() => openEdit(f)}
                  className="p-2 text-neutral-500 hover:text-gold hover:bg-neutral-100 rounded-xl transition-colors"
                  title="Edit FAQ"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Delete FAQ"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit FAQ Modal */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editingItem ? "Edit FAQ" : "Add New FAQ"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Question *
            </label>
            <input
              required
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
              placeholder="e.g. What is the reservation fee for graduation packages?"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Answer *
            </label>
            <textarea
              required
              rows={4}
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
              placeholder="Detailed answer for the client..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="e.g. Booking, Pricing, Studio"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded text-gold focus:ring-gold"
              />
              <span>Display on public FAQ page</span>
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary py-2 px-5 text-xs font-semibold rounded-xl"
            >
              Save FAQ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 3. GALLERY SHOWCASE VIEW (Portfolio Images)
// ════════════════════════════════════════════════════════════════════════════════
function GalleryView({ items, onRefresh, showToast }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [featuredFilter, setFeaturedFilter] = useState('ALL');

  const [formData, setFormData] = useState({
    title: '',
    category: 'portrait',
    image_url: '',
    before_image: '',
    likes: 0,
    sort_order: 0,
    is_featured: false,
    is_public: true,
  });

  // Listen for global trigger from AdminHeroBanner
  useEffect(() => {
    const handleOpenModal = () => openAdd();
    window.addEventListener('ekodak:cms:open_gallery_modal', handleOpenModal);
    return () => window.removeEventListener('ekodak:cms:open_gallery_modal', handleOpenModal);
  }, []);

  const openAdd = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      category: 'portrait',
      image_url: '',
      before_image: '',
      likes: 0,
      sort_order: items.length + 1,
      is_featured: false,
      is_public: true,
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      category: item.category || 'portrait',
      image_url: item.image_url || '',
      before_image: item.before_image || '',
      likes: typeof item.likes === 'number' ? item.likes : (parseInt(item.likes, 10) || 0),
      sort_order: item.sort_order || 0,
      is_featured: !!item.is_featured,
      is_public: item.is_public !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image_url.trim() || !formData.title.trim()) {
      alert('Please fill out photo title and provide a photo image.');
      return;
    }

    const payload = {
      ...formData,
      likes: Math.max(0, parseInt(formData.likes, 10) || 0),
      sort_order: parseInt(formData.sort_order, 10) || 0,
    };

    try {
      if (editingItem) {
        await updateGalleryItem(editingItem.id, payload);
        showToast('Gallery photo updated with verified customer appreciations.');
      } else {
        await createGalleryItem(payload);
        showToast('New photo added to studio portfolio.');
      }
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Save gallery item error:', err);
      alert('Failed to save gallery photo: ' + err.message);
    }
  };

  const handleToggleFeatured = async (item) => {
    try {
      const nextFeatured = !item.is_featured;
      await updateGalleryItem(item.id, { is_featured: nextFeatured });
      showToast(`Photo "${item.title}" is ${nextFeatured ? 'FEATURED on homepage' : 'unfeatured'}.`);
      onRefresh();
    } catch (err) {
      console.error('Toggle featured error:', err);
      alert('Failed to update photo: ' + err.message);
    }
  };

  const handleQuickAppreciate = async (e, item) => {
    e.stopPropagation();
    try {
      await incrementGalleryLikes(item.id, item.likes);
      showToast(`+1 Appreciation recorded for "${item.title}".`);
      onRefresh();
    } catch (err) {
      console.error('Appreciation error:', err);
      alert('Could not record appreciation: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this photo from the public portfolio?')) {
      await deleteGalleryItem(id);
      showToast('Photo removed from gallery.');
      onRefresh();
    }
  };

  // Distinct category options for StudioDropdown
  const categoryOptions = useMemo(() => {
    const opts = [
      { value: 'ALL', label: 'All Categories', desc: 'Display all portfolio photos' },
      { value: 'graduation', label: 'Graduation', desc: 'Toga, diploma & academic portraits' },
      { value: 'portrait', label: 'Portrait', desc: 'Studio individual & creative headshots' },
      { value: 'event', label: 'Events', desc: 'Milestones, birthdays & gatherings' },
      { value: 'family', label: 'Family', desc: 'Multi-generational family portraits' },
      { value: 'couple', label: 'Couple / Pre-Nup', desc: 'Romance, engagements & couples' },
      { value: 'commercial', label: 'Commercial', desc: 'Corporate branding & business' }
    ];
    return opts;
  }, []);

  const featuredOptions = [
    { value: 'ALL', label: 'All Photos', desc: 'Featured and standard gallery photos' },
    { value: 'FEATURED', label: 'Featured Only', desc: 'Highlighted on landing hero/showcase' },
    { value: 'STANDARD', label: 'Standard Only', desc: 'Regular gallery collection' },
  ];

  // Filtered gallery items
  const filteredItems = useMemo(() => {
    return items.filter(g => {
      if (featuredFilter === 'FEATURED' && !g.is_featured) return false;
      if (featuredFilter === 'STANDARD' && g.is_featured) return false;
      if (categoryFilter !== 'ALL' && (g.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const title = (g.title || '').toLowerCase();
      const cat = (g.category || '').toLowerCase();
      return title.includes(q) || cat.includes(q);
    });
  }, [items, categoryFilter, featuredFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gallery photos by title or tag..."
            className="w-full pl-10 pr-9 py-2 bg-neutral-50/70 border border-neutral-200 rounded-xl text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-gold focus:bg-white transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-48">
            <StudioDropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categoryOptions}
              placeholder="Category"
            />
          </div>

          <div className="w-40">
            <StudioDropdown
              value={featuredFilter}
              onChange={setFeaturedFilter}
              options={featuredOptions}
              placeholder="Featured"
            />
          </div>

          <button
            onClick={openAdd}
            className="btn-primary py-2 px-4 text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Plus size={15} />
            <span>New Photo</span>
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full p-12 text-center text-neutral-400 text-xs bg-white rounded-2xl border border-neutral-200">
            <ImageIcon size={32} className="mx-auto mb-2 text-neutral-300" />
            No portfolio photos found matching criteria.
          </div>
        ) : (
          filteredItems.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs hover:shadow-warm-sm transition-all flex flex-col group"
            >
              <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&q=80';
                  }}
                />
                
                {/* Category Badge */}
                <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm shadow-xs">
                  {item.category || 'portrait'}
                </span>

                {/* Featured Badge */}
                {item.is_featured && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold text-primary flex items-center gap-1 shadow-sm">
                    <Star size={10} className="fill-primary" /> Featured
                  </span>
                )}

                {/* Hover Overlay Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleToggleFeatured(item)}
                    className={`p-2 rounded-xl transition-colors shadow-sm ${
                      item.is_featured ? 'bg-gold text-primary' : 'bg-white/90 text-neutral-700 hover:text-gold'
                    }`}
                    title={item.is_featured ? 'Unfeature Photo' : 'Feature Photo on Homepage'}
                  >
                    <Star size={15} className={item.is_featured ? 'fill-primary' : ''} />
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="p-2 bg-white/90 rounded-xl text-primary hover:text-gold transition-colors shadow-sm"
                    title="Edit Photo & Appreciations"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-white/90 rounded-xl text-neutral-700 hover:text-red-500 transition-colors shadow-sm"
                    title="Delete Photo"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Photo Meta & Accurate Appreciations */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-primary text-xs truncate" title={item.title}>
                    {item.title}
                  </h4>

                  {/* Customer Appreciations Counter & Quick +1 Action */}
                  <div className="mt-2.5 flex items-center justify-between gap-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-[11px] font-semibold">
                      <Heart size={12} className="fill-rose-500 text-rose-500" />
                      <span>{Number(item.likes || 0).toLocaleString()} appreciations</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleQuickAppreciate(e, item)}
                      className="text-[10px] font-bold text-neutral-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg border border-neutral-200 hover:border-rose-200 transition-colors flex items-center gap-1 shrink-0"
                      title="Add +1 Customer Appreciation directly"
                    >
                      <span>+1</span>
                      <Heart size={10} className="fill-rose-500 text-rose-500" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-neutral-100 flex justify-between items-center text-[10px] text-neutral-400">
                  <span>Order #{item.sort_order || 0}</span>
                  <span className="capitalize font-medium text-neutral-500">{item.category}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Gallery Photo Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Portfolio Photo & Appreciations' : 'Add Photo to Portfolio'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Photo Title *
            </label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
              placeholder="e.g. Magna Cum Laude Portrait Series"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Category *
              </label>
              <StudioDropdown
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
                options={[
                  { value: 'graduation', label: 'Graduation' },
                  { value: 'portrait', label: 'Portrait' },
                  { value: 'event', label: 'Event' },
                  { value: 'family', label: 'Family' },
                  { value: 'couple', label: 'Couple' },
                  { value: 'commercial', label: 'Commercial' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          {/* Direct File Upload for Portfolio Image */}
          <div>
            <ImageDirectUploader
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
              label="Portfolio Photo *"
              folder="gallery"
              helperText="Upload image directly from device to Supabase storage or toggle URL"
              required={true}
              aspectRatio="aspect-[4/3]"
            />
          </div>

          {/* Optional Before/After Retouch Photo */}
          <div>
            <ImageDirectUploader
              value={formData.before_image}
              onChange={(url) => setFormData({ ...formData, before_image: url })}
              label="Before Retouch Photo (Optional)"
              folder="gallery"
              helperText="Raw unedited photo for client before/after comparison slider"
              required={false}
              aspectRatio="aspect-[4/3]"
            />
          </div>

          {/* Customer Appreciations / Likes Editor */}
          <div className="p-3.5 bg-gradient-to-r from-rose-50/70 to-pink-50/50 rounded-2xl border border-rose-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <Heart size={14} className="fill-rose-500 text-rose-500" />
                <span>Customer Appreciations (Accurate Count)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, likes: (parseInt(formData.likes, 10) || 0) + 1 })}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, likes: (parseInt(formData.likes, 10) || 0) + 10 })}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, likes: (parseInt(formData.likes, 10) || 0) + 50 })}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors"
                >
                  +50
                </button>
              </div>
            </div>
            <input
              type="number"
              min="0"
              value={formData.likes}
              onChange={(e) => setFormData({ ...formData, likes: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              className="w-full border border-rose-200 bg-white rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 focus:border-rose-400 focus:outline-none"
              placeholder="0"
            />
            <p className="text-[10px] text-rose-700/80 mt-1">
              Reflects genuine client feedback on public portfolio. Updates are synchronized directly to database.
            </p>
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="rounded text-gold focus:ring-gold"
              />
              <span>Feature on Landing Showcase</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="rounded text-gold focus:ring-gold"
              />
              <span>Visible to Public</span>
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary py-2 px-5 text-xs font-semibold rounded-xl"
            >
              Save Photo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. STUDIO SETTINGS VIEW (Live Database Settings Editor)
// ════════════════════════════════════════════════════════════════════════════════
function StudioSettingsView({ settings, onRefresh, showToast }) {
  const [formData, setFormData] = useState({
    contact_email: '',
    contact_phone: '',
    address: '',
    business_hours: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
  });
  const [saving, setSaving] = useState(false);

  // Sync state with database settings
  useEffect(() => {
    if (settings) {
      setFormData({
        contact_email: settings.contact_email || '',
        contact_phone: settings.contact_phone || '',
        address: settings.address || '',
        business_hours: settings.business_hours || '',
        facebook: settings.social_links?.facebook || '',
        instagram: settings.social_links?.instagram || '',
        tiktok: settings.social_links?.tiktok || '',
        youtube: settings.social_links?.youtube || '',
      });
    }
  }, [settings]);

  // Listen for global save trigger from AdminHeroBanner
  useEffect(() => {
    const handleSave = () => {
      document.getElementById('studio-settings-form')?.requestSubmit();
    };
    window.addEventListener('ekodak:cms:save_settings', handleSave);
    return () => window.removeEventListener('ekodak:cms:save_settings', handleSave);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        address: formData.address,
        business_hours: formData.business_hours,
        social_links: {
          facebook: formData.facebook,
          instagram: formData.instagram,
          tiktok: formData.tiktok,
          youtube: formData.youtube,
        }
      };

      await updateStudioSettings(settings?.id, payload);
      showToast('Studio settings saved to database successfully.');
      onRefresh();
    } catch (err) {
      console.error('Failed to save studio settings:', err);
      alert('Failed to save studio settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="font-heading text-lg font-bold text-primary">
            Studio Identity & Public Contact Configuration
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5 font-body">
            This information is rendered on the public footer, booking confirmations, email headers, and client receipts.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Supabase Database Synced
        </span>
      </div>

      <form id="studio-settings-form" onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-100 pb-2">
              <Mail size={14} className="text-gold" />
              Direct Communication
            </h4>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Official Studio Email *
              </label>
              <input
                required
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="contact@e-kodak.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Studio Hotline / Phone Number *
              </label>
              <input
                required
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="+63 917 123 4567"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Studio Physical Address *
              </label>
              <textarea
                required
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="3rd Floor Colon Heritage Bldg, Colon St, Cebu City, 6000 Cebu, Philippines"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Operating Schedule & Business Hours *
              </label>
              <textarea
                required
                rows={2}
                value={formData.business_hours}
                onChange={(e) => setFormData({ ...formData, business_hours: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="Mon – Sat: 8:00 AM – 6:00 PM | Sun: By Appointment"
              />
            </div>
          </div>

          {/* Social Media Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-100 pb-2">
              <Globe size={14} className="text-gold" />
              Social Media Channels
            </h4>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Facebook Page URL
              </label>
              <input
                type="url"
                value={formData.facebook}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="https://facebook.com/ekodakcebu"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Instagram URL
              </label>
              <input
                type="url"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="https://instagram.com/ekodakcebu"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                TikTok Handle / URL
              </label>
              <input
                type="url"
                value={formData.tiktok}
                onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="https://tiktok.com/@ekodakcebu"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                YouTube URL
              </label>
              <input
                type="url"
                value={formData.youtube}
                onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="https://youtube.com/@ekodakcebu"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
          <p className="text-[11px] text-neutral-400">
            Last modified: {settings?.updated_at ? new Date(settings.updated_at).toLocaleString('en-PH') : 'Initial Setup'}
          </p>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary py-2.5 px-6 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm"
          >
            <Save size={15} />
            <span>{saving ? 'Saving to Supabase...' : 'Save Studio Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 5. TEAM MEMBERS VIEW
// ════════════════════════════════════════════════════════════════════════════════
function TeamView({ items, onRefresh, showToast }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    bio: '',
    image: '',
    sort_order: 0,
    is_active: true,
  });

  // Listen for global trigger from AdminHeroBanner
  useEffect(() => {
    const handleOpenModal = () => openAdd();
    window.addEventListener('ekodak:cms:open_team_modal', handleOpenModal);
    return () => window.removeEventListener('ekodak:cms:open_team_modal', handleOpenModal);
  }, []);

  const openAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      role: '',
      bio: '',
      image: '',
      sort_order: items.length + 1,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      role: item.role || '',
      bio: item.bio || '',
      image: item.image || item.image_url || '',
      sort_order: item.sort_order || 0,
      is_active: item.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateTeamMember(editingItem.id, formData);
        showToast('Team member updated.');
      } else {
        await createTeamMember(formData);
        showToast('New team member added.');
      }
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to save team member:', err);
      alert('Failed to save team member: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this team member?')) {
      await deleteTeamMember(id);
      showToast('Team member removed.');
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h4 className="font-heading text-sm font-bold text-primary">Studio Photographers & Leadership</h4>
          <p className="text-xs text-neutral-500 font-body">Featured team members displayed in the About section.</p>
        </div>
        <button
          onClick={openAdd}
          className="btn-primary py-2 px-4 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={15} />
          <span>New Member</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 ? (
          <div className="col-span-full p-12 text-center text-neutral-400 text-xs bg-white rounded-2xl border border-neutral-200">
            <Users size={32} className="mx-auto mb-2 text-neutral-300" />
            No team members configured yet.
          </div>
        ) : (
          items.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center gap-3.5 mb-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-100 shrink-0 border-2 border-gold/30">
                    {m.image ? (
                      <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <Users size={22} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-primary text-sm truncate">{m.name}</h4>
                    <p className="text-xs text-gold font-medium truncate">{m.role}</p>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-1 ${
                      m.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {m.is_active ? 'Active Member' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 font-body line-clamp-3 leading-relaxed">
                  {m.bio}
                </p>
              </div>

              <div className="pt-3 mt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                <span>Order: #{m.sort_order || 0}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(m)} className="p-1.5 text-neutral-500 hover:text-gold rounded-lg">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="p-1.5 text-neutral-500 hover:text-red-500 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Member Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Team Member' : 'New Team Member'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Name *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="e.g. Miguel Santos"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Role *</label>
              <input
                required
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="e.g. Lead Photographer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Bio / Background</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
              placeholder="Short bio for the studio team page..."
            />
          </div>

          <div>
            <ImageDirectUploader
              value={formData.image}
              onChange={(url) => setFormData({ ...formData, image: url })}
              label="Team Member Portrait"
              folder="team"
              helperText="Upload professional headshot directly from device or paste image URL"
              aspectRatio="aspect-square"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Sort Order</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
              />
            </div>
            <div className="pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-gold focus:ring-gold"
                />
                <span>Active Member</span>
              </label>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary py-2 px-5 text-xs font-semibold rounded-xl"
            >
              Save Member
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 6. LEGAL POLICIES VIEW
// ════════════════════════════════════════════════════════════════════════════════
function LegalView({ items, onRefresh, showToast }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    content: '',
  });

  // Listen for global trigger from AdminHeroBanner
  useEffect(() => {
    const handleOpenModal = () => openAdd();
    window.addEventListener('ekodak:cms:open_legal_modal', handleOpenModal);
    return () => window.removeEventListener('ekodak:cms:open_legal_modal', handleOpenModal);
  }, []);

  const openAdd = () => {
    setEditingItem(null);
    setFormData({
      slug: '',
      title: '',
      content: '',
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      slug: item.slug || '',
      title: item.title || '',
      content: item.content || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateLegalDoc(editingItem.slug, {
          title: formData.title,
          content: formData.content,
        });
        showToast('Legal policy document updated.');
      } else {
        await createLegalDoc(formData);
        showToast('New legal policy document created.');
      }
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Save legal doc error:', err);
      alert('Failed to save document: ' + err.message);
    }
  };

  const handleDelete = async (slug) => {
    if (confirm(`Delete legal policy "${slug}"?`)) {
      await deleteLegalDoc(slug);
      showToast('Document removed.');
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h4 className="font-heading text-sm font-bold text-primary">Terms of Service & Privacy Policy</h4>
          <p className="text-xs text-neutral-500 font-body">Public legal documents governing bookings, retakes, and copyrights.</p>
        </div>
        <button
          onClick={openAdd}
          className="btn-primary py-2 px-4 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={15} />
          <span>New Document</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.length === 0 ? (
          <div className="col-span-full p-12 text-center text-neutral-400 text-xs bg-white rounded-2xl border border-neutral-200">
            <FileText size={32} className="mx-auto mb-2 text-neutral-300" />
            No legal policies configured.
          </div>
        ) : (
          items.map(d => (
            <div key={d.slug} className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:shadow-warm-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                    /{d.slug}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Updated: {d.updated_at ? new Date(d.updated_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Standard'}
                  </span>
                </div>

                <h4 className="font-heading font-bold text-primary text-base mb-2">
                  {d.title}
                </h4>

                <p className="text-xs text-neutral-600 font-body line-clamp-4 leading-relaxed bg-neutral-50/70 p-3 rounded-xl border border-neutral-100 font-mono text-[11px]">
                  {d.content}
                </p>
              </div>

              <div className="pt-3 mt-4 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">
                  {d.content?.length || 0} characters
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(d)} className="p-1.5 text-neutral-500 hover:text-gold rounded-lg">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(d.slug)} className="p-1.5 text-neutral-500 hover:text-red-500 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Legal Document Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Legal Policy' : 'New Legal Document'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Document Title *</label>
              <input
                required
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                placeholder="e.g. Terms of Service"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Slug Identifier *</label>
              <input
                required
                type="text"
                disabled={!!editingItem}
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none disabled:bg-neutral-100"
                placeholder="e.g. terms or privacy"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Policy Markdown / Text Content *</label>
            <textarea
              required
              rows={8}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono focus:border-gold focus:outline-none"
              placeholder="Paste or write the legal text..."
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary py-2 px-5 text-xs font-semibold rounded-xl"
            >
              Save Document
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
