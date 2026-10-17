import React, { useState, useEffect } from 'react';
import { 
  Moon, Sun, Bell, MessageSquare, Shield, Smartphone, LogOut, Trash2, 
  AlertTriangle, CheckCircle, Clock, Server, HardDrive, Key, Lock, Sparkles, Sliders, 
  Info, Zap, Check, ChevronRight, Eye, EyeOff, Award, Download,
  Building, Truck, Phone, User, MapPin, Package, Loader2, Save, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { recordCustomerAction } from '../../services/customerAuditService';
import Toast from '../../components/ui/Toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const FULFILLMENT_MODES = [
  {
    id: 'STUDIO_PICKUP',
    name: 'Studio In-Person Claiming',
    subtitle: 'Claim directly at Cebu Studio counter (No delivery fee)',
    badge: 'Studio Pickup',
    icon: Building,
  },
  {
    id: 'STUDIO_DELIVERY',
    name: 'Studio Direct Delivery',
    subtitle: 'Personally delivered by our studio team in protective packaging',
    badge: 'Studio Dispatch',
    icon: Truck,
  },
];

// ── Interactive Toggle Switch ─────────────────────────────────────────────────
function Toggle({ enabled, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={enabled}
      className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-gold/30 disabled:opacity-40 shrink-0 cursor-pointer ${
        enabled ? 'bg-gold' : 'bg-neutral-200 dark:bg-neutral-700'
      }`}
    >
      <div 
        className={`w-4 h-4 bg-white rounded-full shadow-sm absolute top-1 transition-all ${
          enabled ? 'left-6' : 'left-1'
        }`} 
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [activeSection, setActiveSection] = useState('section-appearance');
  const [isSavingFulfillment, setIsSavingFulfillment] = useState(false);

  // Delivery & Claiming State
  const [fulfillmentData, setFulfillmentData] = useState({
    fulfillmentMode: 'STUDIO_PICKUP',
    contactName: '',
    contactPhone: '',
    deliveryAddress: '',
    deliveryInstructions: '',
  });

  // Password Update State
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Sync fulfillment preferences from profile studio_specs
  useEffect(() => {
    if (profile) {
      const specs = profile.studio_specs || {};
      const savedMode = specs.fulfillment_mode === 'STUDIO_DELIVERY' || specs.preferred_courier === 'studio_delivery'
        ? 'STUDIO_DELIVERY'
        : 'STUDIO_PICKUP';

      setFulfillmentData({
        fulfillmentMode: savedMode,
        contactName: specs.courier_recipient_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        contactPhone: specs.courier_phone || profile.phone || '',
        deliveryAddress: specs.shipping_address || profile.address || '',
        deliveryInstructions: specs.delivery_instructions || '',
      });
    }
  }, [profile]);

  // ── Persisted Settings from localStorage ──
  const loadSetting = (key, fallback) => {
    try { 
      const val = localStorage.getItem(`ekodak_${key}`);
      return val !== null ? JSON.parse(val) : fallback; 
    }
    catch { return fallback; }
  };

  const [settings, setSettings] = useState({
    darkMode:             loadSetting('darkMode', true),
    compactView:          loadSetting('compactView', false),
    motionEffects:        loadSetting('motionEffects', true),
    emailBookingAlerts:   loadSetting('emailBookingAlerts', true),
    emailProofingAlerts:  loadSetting('emailProofingAlerts', true),
    smsReminders:         loadSetting('smsReminders', true),
    marketingNewsletter:  loadSetting('marketingNewsletter', false),
  });

  const [cacheSizeKb, setCacheSizeKb] = useState(0);

  // Calculate local storage size
  const calculateCacheSize = () => {
    let total = 0;
    for (let x in localStorage) {
      if (localStorage.hasOwnProperty(x)) {
        total += (localStorage[x].length * 2);
      }
    }
    setCacheSizeKb((total / 1024).toFixed(1));
  };

  useEffect(() => {
    calculateCacheSize();
  }, []);

  // ── Apply Dark Mode and Compact Density to HTML ────────────────────────────
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  useEffect(() => {
    if (settings.compactView) {
      document.documentElement.classList.add('compact-layout');
    } else {
      document.documentElement.classList.remove('compact-layout');
    }
  }, [settings.compactView]);

  // Synchronize when changed from Header or external components
  useEffect(() => {
    const handleThemeUpdate = (e) => {
      if (typeof e.detail?.darkMode === 'boolean') {
        setSettings(prev => ({ ...prev, darkMode: e.detail.darkMode }));
      }
    };
    const handleCompactUpdate = (e) => {
      if (typeof e.detail?.compactView === 'boolean') {
        setSettings(prev => ({ ...prev, compactView: e.detail.compactView }));
      }
    };
    window.addEventListener('ekodak_theme_changed', handleThemeUpdate);
    window.addEventListener('ekodak_compact_changed', handleCompactUpdate);
    return () => {
      window.removeEventListener('ekodak_theme_changed', handleThemeUpdate);
      window.removeEventListener('ekodak_compact_changed', handleCompactUpdate);
    };
  }, []);

  const toggleSetting = (key) => {
    setSettings(prev => {
      const nextVal = !prev[key];
      const next = { ...prev, [key]: nextVal };
      localStorage.setItem(`ekodak_${key}`, JSON.stringify(nextVal));

      if (key === 'darkMode') {
        window.dispatchEvent(new CustomEvent('ekodak_theme_changed', { detail: { darkMode: nextVal } }));
      } else if (key === 'compactView') {
        window.dispatchEvent(new CustomEvent('ekodak_compact_changed', { detail: { compactView: nextVal } }));
      }

      if (user?.id) {
        const readableNames = {
          darkMode: 'Theme Dark Mode',
          compactView: 'Compact Density Mode',
          motionEffects: 'Micro-Animations',
          emailBookingAlerts: 'Email Confirmations',
          emailProofingAlerts: 'Soft Copy Proof Alerts',
          smsReminders: 'SMS Pictorial Reminders',
          marketingNewsletter: 'Season Announcements'
        };
        const titleLabel = readableNames[key] || key;
        recordCustomerAction({
          userId: user.id,
          category: 'PREFERENCE_UPDATE',
          title: `${titleLabel} ${nextVal ? 'Enabled' : 'Disabled'}`,
          description: `Customer adjusted portal preference for ${titleLabel}.`,
          changes: [`${titleLabel}: ${nextVal ? 'ACTIVE' : 'INACTIVE'}`]
        });
      }

      return next;
    });
  };

  // Save Delivery / Claiming Customization
  const handleSaveFulfillment = async (e) => {
    e.preventDefault();
    setIsSavingFulfillment(true);
    try {
      const updatedSpecs = {
        ...(profile?.studio_specs || {}),
        fulfillment_mode: fulfillmentData.fulfillmentMode,
        preferred_courier: fulfillmentData.fulfillmentMode === 'STUDIO_DELIVERY' ? 'studio_delivery' : 'studio_pickup',
        courier_recipient_name: fulfillmentData.contactName,
        courier_phone: fulfillmentData.contactPhone,
        shipping_address: fulfillmentData.fulfillmentMode === 'STUDIO_DELIVERY' ? fulfillmentData.deliveryAddress : 'Studio Pickup (311 Rizal Street, City of Naga, Cebu)',
        delivery_instructions: fulfillmentData.deliveryInstructions,
      };

      const { error } = await updateProfile({
        studio_specs: updatedSpecs,
        address: fulfillmentData.fulfillmentMode === 'STUDIO_DELIVERY' ? fulfillmentData.deliveryAddress : profile?.address,
        phone: fulfillmentData.contactPhone || profile?.phone,
      });

      if (error) throw error;

      if (user?.id) {
        recordCustomerAction({
          userId: user.id,
          category: 'DELIVERY_UPDATE',
          title: fulfillmentData.fulfillmentMode === 'STUDIO_DELIVERY' ? 'Studio Direct Delivery Preferences Saved' : 'Studio In-Person Counter Claiming Selected',
          description: `Customer configured fulfillment settings.`,
          changes: [
            `Mode: ${fulfillmentData.fulfillmentMode === 'STUDIO_DELIVERY' ? 'Studio Direct Delivery' : 'Studio In-Person Counter Claiming'}`,
            `Recipient: ${fulfillmentData.contactName || 'Client'}`,
            `Phone: ${fulfillmentData.contactPhone || 'Recorded'}`,
            fulfillmentData.fulfillmentMode === 'STUDIO_DELIVERY' && fulfillmentData.deliveryAddress ? `Address: ${fulfillmentData.deliveryAddress}` : null,
          ].filter(Boolean)
        });
      }

      setToast({ type: 'success', message: 'Studio fulfillment preferences saved successfully!' });
    } catch (err) {
      console.error('Save fulfillment error:', err);
      setToast({ type: 'error', message: 'Failed to update preferences. Try again.' });
    } finally {
      setIsSavingFulfillment(false);
    }
  };

  // Handle Real Password Update via Supabase Auth
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.newPassword) {
      setToast({ type: 'error', message: 'Please enter a new password.' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setToast({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToast({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({
          password: passwordData.newPassword
        });
        if (error) throw error;
      }

      setPasswordData({ newPassword: '', confirmPassword: '' });
      setToast({ type: 'success', message: 'Password updated successfully!' });

      if (user?.id) {
        recordCustomerAction({
          userId: user.id,
          category: 'SECURITY_UPDATE',
          title: 'Account Password Changed',
          description: 'Customer updated their account authentication password.',
          changes: ['Password: Modified']
        });
      }
    } catch (err) {
      console.error('Password update error:', err);
      setToast({ type: 'error', message: err.message || 'Failed to update password.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Clear Studio Local Cache
  const handleClearCache = () => {
    try {
      const keysToKeep = ['sb-', 'supabase', 'ekodak_darkMode', 'ekodak_compactView'];
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.some(k => key.includes(k))) {
          localStorage.removeItem(key);
        }
      });
      calculateCacheSize();
      setToast({ type: 'success', message: 'Local studio temporary cache cleared.' });
    } catch {
      setToast({ type: 'error', message: 'Could not clear cache.' });
    }
  };

  // Export Full Customer Data Transcript (.json)
  const handleDownloadDataTakeout = () => {
    const takeoutData = {
      exportTimestamp: new Date().toISOString(),
      studioProvider: "E-Kodak Photography Studio Cebu",
      clientAccount: {
        id: user?.id,
        email: user?.email,
        profile: profile,
      },
      clientPreferences: settings,
    };

    const dataBlob = new Blob([JSON.stringify(takeoutData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ekodak_account_data_${user?.id?.slice(0, 6) || 'client'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast({ type: 'success', message: 'Account data archive exported to your device!' });
  };

  // Sign out all devices
  const handleSignOutAll = () => {
    setDialog({
      title:        'Sign Out of All Devices?',
      message:      'You will be signed out of all active browser sessions. You will need to log in again on your devices.',
      confirmLabel: 'Sign Out Everywhere',
      cancelLabel:  'Cancel',
      confirmClass: 'bg-red-600 text-white hover:bg-red-700',
      icon:         LogOut,
      iconColor:    'text-red-500',
      iconBg:       'bg-red-50',
      onConfirm:    async () => {
        await signOut();
        navigate('/login');
      },
    });
  };

  const navItems = [
    { id: 'section-appearance', label: 'Theme & Appearance', icon: Sun },
    { id: 'section-fulfillment', label: 'Deliverables & Fulfillment', icon: Package },
    { id: 'section-notifications', label: 'Notification Channels', icon: Bell },
    { id: 'section-security', label: 'Security & Password', icon: Lock },
    { id: 'section-privacy', label: 'Data & Privacy', icon: Shield },
  ];

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto w-full animate-fade-in pb-20 space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog dialog={dialog} onClose={() => setDialog(null)} />

      {/* ── Top Header Banner ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-body font-bold uppercase tracking-wider text-gold bg-gold/15 px-2.5 py-0.5 rounded-full border border-gold/30 inline-block mb-1.5">
            CLIENT SETTINGS
          </span>
          <h1 className="text-2xl sm:text-3xl font-heading text-primary dark:text-neutral-100 font-bold">
            Settings & Preferences
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-body mt-1">
            Customize display mode, deliverable claiming preferences, notifications, and security.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadDataTakeout}
          className="btn-outline py-2 px-3.5 text-xs flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <Download size={13} className="text-gold" />
          <span>Export Data (.json)</span>
        </button>
      </div>

      {/* ── Main Two-Column Layout ────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Sticky Navigation Rail (3 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20 space-y-3">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-2.5 shadow-xs">
            <nav className="space-y-1">
              {navItems.map(item => {
                const isActive = activeSection === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-neutral-900 text-white dark:bg-gold dark:text-neutral-950 font-bold shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <Icon size={15} className={isActive ? 'text-gold dark:text-neutral-950' : 'text-neutral-400'} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white rounded-2xl border border-neutral-800 shadow-xs space-y-1.5 text-xs font-body">
            <span className="text-xs uppercase font-bold text-gold tracking-wider block">Studio Support</span>
            <p className="text-neutral-300 text-[11px] leading-relaxed">
              Need assistance with your booking or photoshoot package? Reach us at <span className="text-gold">support@ekodak.com</span>.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Settings Content Sections (9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">

          {/* ── 1. THEME & DISPLAY ─────────────────────────────────────────── */}
          <section id="section-appearance" className="space-y-3 scroll-mt-24">
            <div className="flex items-center gap-2 pb-1">
              <Sun className="text-gold" size={18} />
              <h2 className="font-heading text-lg font-bold text-primary dark:text-neutral-100">
                Theme & Appearance
              </h2>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
              
              {/* Dark Mode */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Moon size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Dark Mode Theme</h3>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Switches dashboard and viewer backgrounds to deep obsidian tones for comfortable viewing.
                    </p>
                  </div>
                </div>
                <Toggle
                  enabled={settings.darkMode}
                  onClick={() => {
                    toggleSetting('darkMode');
                    setToast({ type: 'info', message: `Dark mode ${!settings.darkMode ? 'activated' : 'deactivated'}.` });
                  }}
                />
              </div>

              {/* Compact Density View */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Sliders size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Compact Density View</h3>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Streamlines card padding and row heights for efficient viewing on smaller displays.
                    </p>
                  </div>
                </div>
                <Toggle
                  enabled={settings.compactView}
                  onClick={() => {
                    toggleSetting('compactView');
                    setToast({ type: 'info', message: `Compact density ${!settings.compactView ? 'activated' : 'deactivated'}.` });
                  }}
                />
              </div>

              {/* Fluid Motion */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Fluid Micro-Animations</h3>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Smooth gallery transitions, zoom reveals, and responsive hover highlights.
                    </p>
                  </div>
                </div>
                <Toggle
                  enabled={settings.motionEffects}
                  onClick={() => toggleSetting('motionEffects')}
                />
              </div>

            </div>
          </section>

          {/* ── 2. STUDIO FULFILLMENT & DELIVERABLES ────────────────────────── */}
          <section id="section-fulfillment" className="space-y-3 scroll-mt-24">
            <div className="flex items-center gap-2 pb-1">
              <Package className="text-gold" size={18} />
              <h2 className="font-heading text-lg font-bold text-primary dark:text-neutral-100">
                Deliverables & Fulfillment
              </h2>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
              <form onSubmit={handleSaveFulfillment} className="space-y-4 text-xs font-body">
                
                {/* Fulfillment Mode Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-body uppercase text-neutral-400 block font-bold">
                    Claiming / Delivery Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {FULFILLMENT_MODES.map((mode) => {
                      const isSelected = fulfillmentData.fulfillmentMode === mode.id;
                      const ModeIcon = mode.icon;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setFulfillmentData({ ...fulfillmentData, fulfillmentMode: mode.id })}
                          className={`
                            p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer font-body
                            ${isSelected 
                              ? 'bg-gold/10 border-gold ring-1 ring-gold text-primary dark:text-gold font-bold shadow-xs' 
                              : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100'}
                          `}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <ModeIcon size={18} className={isSelected ? 'text-gold' : 'text-neutral-400'} />
                            <span className={`text-[11px] uppercase px-1.5 py-0.5 rounded font-bold ${
                              isSelected ? 'bg-gold text-primary' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                            }`}>
                              {mode.badge}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-tight">{mode.name}</p>
                            <p className="text-xs text-neutral-400 leading-tight mt-0.5 font-normal">{mode.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mode-Specific Information Banner */}
                {fulfillmentData.fulfillmentMode === 'STUDIO_PICKUP' ? (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 text-[11px] text-neutral-600 dark:text-neutral-300 space-y-1">
                    <div className="flex items-center gap-1.5 text-primary dark:text-neutral-100 font-bold">
                      <MapPin size={14} className="text-gold shrink-0" />
                      <span>Studio Pickup Location</span>
                    </div>
                    <p className="pl-5 text-neutral-500 dark:text-neutral-400">
                      E-Kodak Studio: 311 Rizal Street, City of Naga, Cebu<br />
                      <span className="text-gold font-semibold">Hours: Monday – Saturday (8:00 AM – 6:00 PM)</span>
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 text-[11px] text-neutral-600 dark:text-neutral-300 space-y-1">
                    <div className="flex items-center gap-1.5 text-primary dark:text-neutral-100 font-bold">
                      <Truck size={14} className="text-blue-500 shrink-0" />
                      <span>Studio Direct Dispatch</span>
                    </div>
                    <p className="pl-5 text-neutral-500 dark:text-neutral-400">
                      Our studio dispatch personnel will personally deliver your framed package and prints directly to your address.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider block">
                      {fulfillmentData.fulfillmentMode === 'STUDIO_PICKUP' ? 'Claimer Full Name' : 'Recipient Full Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={fulfillmentData.contactName}
                      onChange={(e) => setFulfillmentData({ ...fulfillmentData, contactName: e.target.value })}
                      placeholder="e.g. Maria Santos"
                      className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-1 focus:ring-gold outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider block">
                      Contact Mobile Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={fulfillmentData.contactPhone}
                      onChange={(e) => setFulfillmentData({ ...fulfillmentData, contactPhone: e.target.value })}
                      placeholder="0917 123 4567"
                      className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-1 focus:ring-gold outline-none"
                    />
                  </div>
                </div>

                {fulfillmentData.fulfillmentMode === 'STUDIO_DELIVERY' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider block">
                        Direct Delivery Address
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={fulfillmentData.deliveryAddress}
                        onChange={(e) => setFulfillmentData({ ...fulfillmentData, deliveryAddress: e.target.value })}
                        placeholder="House/Unit No., Street, Barangay, City/Municipality, Province"
                        className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-1 focus:ring-gold outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider block">
                        Gate / Landmark Instructions (Optional)
                      </label>
                      <input
                        type="text"
                        value={fulfillmentData.deliveryInstructions}
                        onChange={(e) => setFulfillmentData({ ...fulfillmentData, deliveryInstructions: e.target.value })}
                        placeholder="e.g. Near blue gate, call upon arrival"
                        className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-1 focus:ring-gold outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingFulfillment}
                    className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    {isSavingFulfillment ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
                    <span>Save Fulfillment Preferences</span>
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* ── 3. NOTIFICATION CHANNELS ───────────────────────────────────── */}
          <section id="section-notifications" className="space-y-3 scroll-mt-24">
            <div className="flex items-center gap-2 pb-1">
              <Bell className="text-gold" size={18} />
              <h2 className="font-heading text-lg font-bold text-primary dark:text-neutral-100">
                Notification Channels
              </h2>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
              
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Email Session Confirmations & Invoices</h3>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Electronic booking receipt, schedule details, and calendar invite.
                    </p>
                  </div>
                </div>
                <Toggle
                  enabled={settings.emailBookingAlerts}
                  onClick={() => toggleSetting('emailBookingAlerts')}
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Soft Copy Proofs Ready Alert</h3>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Instant notification when proofing photos are ready for your shot selection.
                    </p>
                  </div>
                </div>
                <Toggle
                  enabled={settings.emailProofingAlerts}
                  onClick={() => toggleSetting('emailProofingAlerts')}
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">SMS Shoot-Day Reminders</h3>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Dispatched 2 hours prior to your scheduled pictorial at E-Kodak Studio Cebu.
                    </p>
                  </div>
                </div>
                <Toggle
                  enabled={settings.smsReminders}
                  onClick={() => toggleSetting('smsReminders')}
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Award size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Graduation Season Announcements</h3>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Advance notices on university batch slots and crystal frame releases.
                    </p>
                  </div>
                </div>
                <Toggle
                  enabled={settings.marketingNewsletter}
                  onClick={() => toggleSetting('marketingNewsletter')}
                />
              </div>

            </div>
          </section>

          {/* ── 4. SECURITY & PASSWORD ─────────────────────────────────────── */}
          <section id="section-security" className="space-y-3 scroll-mt-24">
            <div className="flex items-center gap-2 pb-1">
              <Lock className="text-gold" size={18} />
              <h2 className="font-heading text-lg font-bold text-primary dark:text-neutral-100">
                Security & Authentication
              </h2>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-5">
              {/* Password Change Form */}
              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
                <div>
                  <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Change Account Password</h3>
                  <p className="text-xs text-neutral-500 font-body mt-0.5">
                    Set a secure password of at least 6 characters.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider block">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="••••••••"
                        className="w-full py-2 pl-3 pr-10 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-1 focus:ring-gold outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider block">
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-1 focus:ring-gold outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingPassword || !passwordData.newPassword}
                  className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingPassword ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
                  <span>{isUpdatingPassword ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </form>

              {/* Session Termination Divider */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">Sign Out Everywhere</h4>
                  <p className="text-[11px] text-neutral-500 font-body mt-0.5">
                    Revoke active tokens and log out from all browser devices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOutAll}
                  className="btn-outline py-1.5 px-3.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900 shrink-0 cursor-pointer"
                >
                  Sign Out of All Devices
                </button>
              </div>
            </div>
          </section>

          {/* ── 5. DATA & LOCAL STORAGE ────────────────────────────────────── */}
          <section id="section-privacy" className="space-y-3 scroll-mt-24">
            <div className="flex items-center gap-2 pb-1">
              <Shield className="text-gold" size={18} />
              <h2 className="font-heading text-lg font-bold text-primary dark:text-neutral-100">
                Data Privacy & Cache
              </h2>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
              
              {/* Data Takeout */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Export Personal Data</h3>
                  <p className="text-xs text-neutral-500 font-body mt-0.5">
                    Download an archive of your profile details, session bookings, and preferences (.json).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadDataTakeout}
                  className="btn-outline py-1.5 px-3.5 text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download Archive</span>
                </button>
              </div>

              {/* Clear Cache */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Clear Local Browser Cache</h3>
                  <p className="text-xs text-neutral-500 font-body mt-0.5">
                    Flushes cached temporary estimates and local session logs ({cacheSizeKb} KB) without signing you out.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="btn-outline py-1.5 px-3.5 text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Flush Local Cache</span>
                </button>
              </div>

              {/* Deletion Request */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Account Data Deletion</h3>
                  <p className="text-xs text-neutral-500 font-body mt-0.5">
                    Request complete permanent removal of your account, photo deliverables, and records.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setToast({ type: 'info', message: 'To request complete account deletion, please email support@ekodak.com with your Member ID.' })}
                  className="px-3.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
                >
                  Request Deletion
                </button>
              </div>

            </div>
          </section>

        </div>

      </div>

    </div>
  );
}
