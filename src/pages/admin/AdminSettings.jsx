import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Settings, Users, RefreshCw, AlertCircle, ShieldCheck, Info, Save, 
  ChevronRight, Lock, Key, Mail, Eye, EyeOff, CheckCircle2, AlertTriangle, 
  X, Check, Sparkles, Globe, MapPin, Phone, Clock, Search, Shield
} from 'lucide-react';
import { getStaffMembers } from '../../services/adminService';
import { getStudioSettings, updateStudioSettings, createStudioSettings } from '../../services/contentAdminService';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { validatePasswordStrength } from '../../lib/securityValidator';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import StudioDropdown from '../../components/ui/StudioDropdown';

const ROLE_BADGE = {
  admin: 'text-gold bg-gold/10 border-gold/20',
  staff: 'text-blue-700 bg-blue-50 border-blue-100',
  finance: 'text-emerald-700 bg-emerald-50 border-emerald-100',
};

const fmt = (d) => !d ? '—' : new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

function Section({ title, subtitle, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-heading text-base font-bold text-primary">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

export default function AdminSettings() {
  const { user, profile } = useAuth();
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Form Data for Settings
  const [formData, setFormData] = useState({ 
    contact_email: '', contact_phone: '', address: '', business_hours: '',
    facebook: '', instagram: '', tiktok: '', youtube: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Staff Search and Filter
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('ALL');

  // Credential Management State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [credNotice, setCredNotice] = useState(null);

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
    showPw: false,
    loading: false,
    error: ''
  });

  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    loading: false,
    error: ''
  });

  const pwStrength = validatePasswordStrength(passwordForm.newPassword);

  const showToast = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffRes, settingsRes] = await Promise.all([
        getStaffMembers(),
        getStudioSettings()
      ]);
      
      if (staffRes.error || settingsRes.error) {
        console.warn('Settings load warning:', { staffErr: staffRes.error, setErr: settingsRes.error });
      }
      
      setStaff(staffRes.data || []);
      
      if (settingsRes.data) {
        setSettings(settingsRes.data);
        setFormData({
          contact_email: settingsRes.data.contact_email || '',
          contact_phone: settingsRes.data.contact_phone || '',
          address: settingsRes.data.address || '',
          business_hours: settingsRes.data.business_hours || '',
          facebook: settingsRes.data.social_links?.facebook || '',
          instagram: settingsRes.data.social_links?.instagram || '',
          tiktok: settingsRes.data.social_links?.tiktok || '',
          youtube: settingsRes.data.social_links?.youtube || '',
        });
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
      setError('Failed to load some settings data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    
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
          youtube: formData.youtube
        }
      };

      await updateStudioSettings(settings?.id, payload);
      showToast('Studio Settings saved to Supabase successfully!');
      load();
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordForm(prev => ({ ...prev, error: '' }));

    if (!passwordForm.newPassword) {
      setPasswordForm(prev => ({ ...prev, error: 'Please enter a new password.' }));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordForm(prev => ({ ...prev, error: 'Passwords do not match.' }));
      return;
    }
    if (pwStrength.score < 3) {
      setPasswordForm(prev => ({ ...prev, error: 'Password does not meet strong complexity criteria.' }));
      return;
    }

    setPasswordForm(prev => ({ ...prev, loading: true }));
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      if (updateError) throw updateError;

      setShowPasswordModal(false);
      setPasswordForm({ newPassword: '', confirmPassword: '', showPw: false, loading: false, error: '' });
      setCredNotice({
        type: 'success',
        title: 'Admin Password Successfully Updated',
        message: 'Your new security password is now active. Subsequent logins from any device will require this password.'
      });
      showToast('Admin password updated successfully.');
    } catch (err) {
      setPasswordForm(prev => ({ ...prev, loading: false, error: err.message || 'Failed to update password.' }));
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setEmailForm(prev => ({ ...prev, error: '' }));

    const targetEmail = emailForm.newEmail.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setEmailForm(prev => ({ ...prev, error: 'Please enter a valid email address.' }));
      return;
    }

    setEmailForm(prev => ({ ...prev, loading: true }));
    try {
      const { error: emailErr } = await supabase.auth.updateUser({
        email: targetEmail
      });
      if (emailErr) throw emailErr;

      setShowEmailModal(false);
      setEmailForm({ newEmail: '', loading: false, error: '' });
      setCredNotice({
        type: 'warning',
        title: 'Email Change Verification Dispatched',
        message: `Supabase Auth has dispatched confirmation tokens to both your current address and ${targetEmail}. Please check both inboxes and click the verification links to finalize the change. Until confirmed, continue signing in with your current email.`
      });
      showToast('Verification emails dispatched.');
    } catch (err) {
      setEmailForm(prev => ({ ...prev, loading: false, error: err.message || 'Failed to update email.' }));
    }
  };

  // Staff filtering
  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      if (staffRoleFilter !== 'ALL' && s.role !== staffRoleFilter) return false;
      if (!staffSearch.trim()) return true;
      const q = staffSearch.toLowerCase();
      const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      const role = (s.role || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || role.includes(q);
    });
  }, [staff, staffRoleFilter, staffSearch]);

  const roleFilterOptions = [
    { value: 'ALL', label: 'All Staff Roles', desc: 'Display all internal studio accounts' },
    { value: 'admin', label: 'Administrators', desc: 'Full governance & settings access' },
    { value: 'staff', label: 'Studio Staff', desc: 'Front desk & intake operations' },
    { value: 'finance', label: 'Finance Officers', desc: 'Payments, ledger & balances' },
  ];

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-6 pb-16 animate-fade-in font-body">
      {/* ── 1. Luxury Administrative Hero Banner ────────────────────────────── */}
      <AdminHeroBanner
        station="admin"
        badgeLabel="Studio & Security Configuration"
        badgeIcon={Settings}
        userName={profile?.full_name || user?.email?.split('@')[0] || 'Administrator'}
        title="Studio Settings & System Governance"
        subtitle="Manage studio address, business hours, administrative credentials, security parameters, and staff accounts."
        statusSummary={`${staff.length} Authorized Staff · ${settings ? 'Live Studio Info' : 'Synchronizing'} · TLS 1.3 Active`}
        primaryAction={{
          label: 'Save Studio Info',
          icon: Save,
          onClick: handleSaveSettings
        }}
        secondaryAction={{
          label: 'Change Password',
          icon: Key,
          onClick: () => { setShowPasswordModal(true); setCredNotice(null); }
        }}
        onRefresh={load}
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
          <button onClick={load} className="underline font-semibold ml-auto">Retry</button>
        </div>
      )}

      {/* ── 2. Metric Overview Strip (4 Luxury Cards with Gradients) ───────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Studio Identity Card */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-gold/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
              <Globe size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              VERIFIED
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Studio Profile</p>
            <h3 className="font-heading text-lg font-bold text-primary mt-0.5 truncate">
              {formData.contact_email || 'contact@e-kodak.com'}
            </h3>
            <p className="text-xs text-neutral-500 mt-1 truncate">
              {formData.contact_phone || '+63 917 123 4567'}
            </p>
          </div>
        </div>

        {/* Staff Members Count */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
              <Users size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              ACCESS
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Staff Accounts</p>
            <h3 className="font-heading text-2xl font-bold text-primary mt-0.5">{staff.length}</h3>
            <p className="text-xs text-neutral-500 mt-1">
              {staff.filter(s => s.role === 'admin').length} Admins · {staff.filter(s => s.role === 'staff').length} Staff
            </p>
          </div>
        </div>

        {/* Security & Transport Status */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <ShieldCheck size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              SECURE
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Security Transport</p>
            <h3 className="font-heading text-lg font-bold text-primary mt-0.5">TLS 1.3 / Bcrypt</h3>
            <p className="text-xs text-neutral-500 mt-1">Row Level Security Active</p>
          </div>
        </div>

        {/* System Platform */}
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
              <Sparkles size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              STABLE
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">System Version</p>
            <h3 className="font-heading text-lg font-bold text-primary mt-0.5">E-Kodak v2.6</h3>
            <p className="text-xs text-neutral-500 mt-1">Supabase Cloud Database</p>
          </div>
        </div>
      </div>

      {/* ── 3. Global Studio Settings Section ─────────────────────────────── */}
      <Section 
        title="Global Studio Identity & Operating Schedule"
        subtitle="Public parameters synchronized across booking receipts, confirmation emails, and studio footer."
        action={
          <button 
            type="button" 
            onClick={handleSaveSettings} 
            disabled={savingSettings}
            className="btn-primary py-2 px-4 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <Save size={14} />
            <span>{savingSettings ? 'Saving...' : 'Save Studio Profile'}</span>
          </button>
        }
      >
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-neutral-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-100 pb-2">
                  <Mail size={14} className="text-gold" />
                  Direct Studio Communication
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Contact Email Address *
                  </label>
                  <input
                    required
                    type="email"
                    value={formData.contact_email}
                    onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                    placeholder="contact@e-kodak.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Studio Hotline / Phone *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.contact_phone}
                    onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                    placeholder="+63 917 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Physical Studio Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
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
                    onChange={e => setFormData({ ...formData, business_hours: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                    placeholder="Mon – Sat: 8:00 AM – 6:00 PM | Sun: By Appointment"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-100 pb-2">
                  <Globe size={14} className="text-gold" />
                  Social Media & Marketing Links
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Facebook URL</label>
                  <input
                    type="url"
                    value={formData.facebook}
                    onChange={e => setFormData({ ...formData, facebook: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                    placeholder="https://facebook.com/ekodakcebu"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Instagram URL</label>
                  <input
                    type="url"
                    value={formData.instagram}
                    onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                    placeholder="https://instagram.com/ekodakcebu"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">TikTok Handle / URL</label>
                  <input
                    type="url"
                    value={formData.tiktok}
                    onChange={e => setFormData({ ...formData, tiktok: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                    placeholder="https://tiktok.com/@ekodakcebu"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">YouTube URL</label>
                  <input
                    type="url"
                    value={formData.youtube}
                    onChange={e => setFormData({ ...formData, youtube: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:border-gold focus:outline-none"
                    placeholder="https://youtube.com/@ekodakcebu"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                Last modified: {settings?.updated_at ? new Date(settings.updated_at).toLocaleString('en-PH') : 'Initial Setup'}
              </span>
              <button
                type="submit"
                disabled={savingSettings}
                className="btn-primary py-2.5 px-6 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm"
              >
                <Save size={15} />
                <span>{savingSettings ? 'Saving...' : 'Save Studio Profile'}</span>
              </button>
            </div>
          </form>
        )}
      </Section>

      {/* ── 4. Account Credentials & System Info ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Administrator Account & Credentials */}
        <Section title="Administrator Account & Security Credentials">
          <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gold/15 flex items-center justify-center text-gold font-heading text-base font-bold border border-gold/30 shrink-0">
                {profile?.first_name?.[0] || 'A'}{profile?.last_name?.[0] || 'D'}
              </div>
              <div>
                <p className="font-semibold text-primary text-sm">{profile?.first_name} {profile?.last_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${ROLE_BADGE[profile?.role] || 'text-neutral-500 bg-neutral-100 border-neutral-200'}`}>
                    <ShieldCheck size={11} /> {profile?.role}
                  </span>
                  <span className="text-xs text-neutral-400 font-body truncate">{user?.email}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setShowPasswordModal(true); setCredNotice(null); }}
                className="px-3 py-1.5 border border-neutral-200 hover:border-gold rounded-xl text-xs font-semibold text-neutral-700 hover:text-primary transition-colors flex items-center gap-1.5 bg-neutral-50"
              >
                <Key size={13} className="text-gold" />
                Change Password
              </button>
              <button
                type="button"
                onClick={() => { setShowEmailModal(true); setCredNotice(null); }}
                className="px-3 py-1.5 border border-neutral-200 hover:border-gold rounded-xl text-xs font-semibold text-neutral-700 hover:text-primary transition-colors flex items-center gap-1.5 bg-neutral-50"
              >
                <Mail size={13} className="text-gold" />
                Update Email
              </button>
            </div>
          </div>

          {credNotice && (
            <div className={`mt-4 p-3.5 rounded-xl border text-xs font-body flex items-start gap-2.5 ${
              credNotice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              credNotice.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-red-50 border-red-200 text-red-700'
            }`}>
              {credNotice.type === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" /> :
               credNotice.type === 'warning' ? <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" /> :
               <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />}
              <div>
                <p className="font-semibold">{credNotice.title}</p>
                <p className="mt-0.5 leading-relaxed">{credNotice.message}</p>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-body">
            <div className="p-3 rounded-xl bg-neutral-50/80 border border-neutral-100">
              <span className="text-neutral-400 block uppercase text-[10px] font-bold tracking-wider">Session Status</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1 mt-1">
                <CheckCircle2 size={12} /> Active & Authenticated
              </span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50/80 border border-neutral-100">
              <span className="text-neutral-400 block uppercase text-[10px] font-bold tracking-wider">Transport Protocol</span>
              <span className="font-bold text-primary block mt-1">TLS 1.3 / HTTPS</span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50/80 border border-neutral-100">
              <span className="text-neutral-400 block uppercase text-[10px] font-bold tracking-wider">Credential Policy</span>
              <span className="font-bold text-primary block mt-1">Bcrypt & Salt</span>
            </div>
          </div>
        </Section>

        {/* System Information */}
        <Section title="System Architecture & Database Link">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-body">
            {[
              { label: 'Platform Engine',  value: 'E-KODAK Photography Management' },
              { label: 'Database Cloud',   value: 'Supabase PostgreSQL (abfjleaootqhhbqjvvif)' },
              { label: 'Frontend Stack',   value: 'React 18 + Vite + Tailwind CSS' },
              { label: 'Auth Infrastructure', value: 'Supabase GoTrue Auth Service' }
            ].map(({ label, value }) => (
              <div key={label} className="bg-neutral-50/80 border border-neutral-100 rounded-xl px-4 py-3">
                <dt className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">{label}</dt>
                <dd className="text-primary font-semibold text-xs truncate">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-body">Threat-Model & Security Controls</span>
            <Link
              to="/admin/security"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:text-primary transition-colors"
            >
              <ShieldCheck size={14} /> Open Security Center <ChevronRight size={13} />
            </Link>
          </div>
        </Section>
      </div>

      {/* ── 5. Staff Accounts Management ──────────────────────────────────── */}
      <Section 
        title="Authorized Personnel & Staff Accounts"
        subtitle="Manage studio administrative roles, photographers, front desk staff, and ledger finance officers."
        action={
          <div className="flex items-center gap-2">
            <div className="w-44">
              <StudioDropdown
                value={staffRoleFilter}
                onChange={setStaffRoleFilter}
                options={roleFilterOptions}
                placeholder="Filter Role"
              />
            </div>
            <button 
              onClick={load} 
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-primary border border-neutral-200 bg-white px-3 py-1.5 rounded-xl transition-all"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>
        }
      >
        <div className="mb-4">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              placeholder="Search staff members by name, phone, or role..."
              className="w-full pl-10 pr-9 py-2 bg-neutral-50/70 border border-neutral-200 rounded-xl text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-gold focus:bg-white transition-all"
            />
            {staffSearch && (
              <button onClick={() => setStaffSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-neutral-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-xs">
            <Users size={28} className="text-neutral-300 mx-auto mb-2" />
            No staff accounts found matching your search.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-xl overflow-hidden">
            {filteredStaff.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-3.5 hover:bg-neutral-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gold/15 flex items-center justify-center text-gold font-heading text-xs font-bold border border-gold/30 shrink-0">
                    {s.first_name?.[0] || 'S'}{s.last_name?.[0] || 'T'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary">{s.first_name} {s.last_name}</p>
                    <p className="text-[11px] text-neutral-400 font-body">
                      {s.phone || 'No phone set'} · Joined {fmt(s.created_at)}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${ROLE_BADGE[s.role] || 'text-neutral-500 bg-neutral-100 border-neutral-200'}`}>
                  {s.role}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400 font-body">
          <p className="flex items-start gap-1.5 text-[11px]">
            <Info size={12} className="shrink-0 mt-0.5 text-neutral-500" />
            To provision a new studio workstation account, register user on portal, then assign role in Supabase profiles table.
          </p>
          <span className="font-semibold text-neutral-500">{filteredStaff.length} Accounts Listed</span>
        </div>
      </Section>

      {/* ── Change Password Modal ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key size={18} className="text-gold" />
                <h3 className="font-heading text-base font-bold">Change Administrative Password</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPasswordModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4 font-body text-xs">
              {passwordForm.error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{passwordForm.error}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-primary mb-1 uppercase tracking-wider text-[10px]">
                  New Security Password
                </label>
                <div className="relative">
                  <input
                    type={passwordForm.showPw ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new strong password..."
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-gold/30 pr-10 text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordForm({ ...passwordForm, showPw: !passwordForm.showPw })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary"
                  >
                    {passwordForm.showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Live Strength Meter */}
              {passwordForm.newPassword && (
                <div className="space-y-1.5 p-3 rounded-xl bg-neutral-50 border border-neutral-200/70">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500">Complexity Rating:</span>
                    <span className={`font-bold ${pwStrength.color}`}>{pwStrength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${pwStrength.barColor}`}
                      style={{ width: `${(pwStrength.score / 4) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] pt-1">
                    <span className={pwStrength.rules.minLength ? 'text-emerald-700 flex items-center gap-1' : 'text-neutral-400 flex items-center gap-1'}>
                      <Check size={10} /> Min 8 chars
                    </span>
                    <span className={pwStrength.rules.hasUpper ? 'text-emerald-700 flex items-center gap-1' : 'text-neutral-400 flex items-center gap-1'}>
                      <Check size={10} /> Uppercase letter
                    </span>
                    <span className={pwStrength.rules.hasLower ? 'text-emerald-700 flex items-center gap-1' : 'text-neutral-400 flex items-center gap-1'}>
                      <Check size={10} /> Lowercase letter
                    </span>
                    <span className={pwStrength.rules.hasNumber ? 'text-emerald-700 flex items-center gap-1' : 'text-neutral-400 flex items-center gap-1'}>
                      <Check size={10} /> Number (0-9)
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-primary mb-1 uppercase tracking-wider text-[10px]">
                  Confirm New Password
                </label>
                <input
                  type={passwordForm.showPw ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter password to confirm..."
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-gold/30 text-xs"
                  required
                />
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordForm.loading || pwStrength.score < 3}
                  className="btn-primary py-2 px-5 text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {passwordForm.loading ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Update Email Modal ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-gold" />
                <h3 className="font-heading text-base font-bold">Update Administrative Email</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowEmailModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateEmail} className="p-6 space-y-4 font-body text-xs">
              {emailForm.error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{emailForm.error}</span>
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={14} className="text-amber-700" />
                  <span>Important Supabase Security Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Changing your login email triggers a verification email. Both your existing email and your new email must click the verification link before the new email becomes active for login.
                </p>
              </div>

              <div>
                <span className="text-neutral-400 block uppercase text-[10px] mb-1">Current Active Email</span>
                <p className="font-semibold text-primary p-2.5 bg-neutral-100 rounded-xl">{user?.email}</p>
              </div>

              <div>
                <label className="block font-semibold text-primary mb-1 uppercase tracking-wider text-[10px]">
                  New Administrator Email Address
                </label>
                <input
                  type="email"
                  value={emailForm.newEmail}
                  onChange={e => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                  placeholder="admin@yourdomain.com"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-gold/30 text-xs"
                  required
                />
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailForm.loading}
                  className="btn-primary py-2 px-5 text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {emailForm.loading ? 'Requesting...' : 'Dispatch Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
