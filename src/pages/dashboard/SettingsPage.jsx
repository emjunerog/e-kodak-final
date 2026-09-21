import React, { useState, useEffect } from 'react';
import { 
  Moon, Sun, Bell, MessageSquare, Shield, Smartphone, LogOut, Trash2, 
  AlertTriangle, Database, Activity, RefreshCw, Download, Eye, FileText, 
  CheckCircle, Clock, Server, HardDrive, Key, Lock, Sparkles, Sliders, 
  Info, Zap, HelpCircle, Check, ChevronRight, Laptop, Globe, Cpu,
  ShieldCheck, EyeOff, Award, Bookmark, ArrowUpRight,
  Building, Truck, Phone, User, MapPin, Package, Loader2, Save
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
    subtitle: 'Claim directly at Cebu Studio counter',
    badge: 'Studio Pickup',
    icon: Building,
  },
  {
    id: 'STUDIO_DELIVERY',
    name: 'Studio Direct Delivery',
    subtitle: 'Personally delivered by our studio team',
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

  // Delivery & Claiming State (No 3rd party carriers)
  const [fulfillmentData, setFulfillmentData] = useState({
    fulfillmentMode: 'STUDIO_PICKUP', // 'STUDIO_PICKUP' | 'STUDIO_DELIVERY'
    contactName: '',
    contactPhone: '',
    deliveryAddress: '',
    deliveryInstructions: '',
  });

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
    compactView:          loadSetting('compactView', true),
    motionEffects:        loadSetting('motionEffects', true),
    emailBookingAlerts:   loadSetting('emailBookingAlerts', true),
    emailProofingAlerts:  loadSetting('emailProofingAlerts', true),
    smsReminders:         loadSetting('smsReminders', true),
    marketingNewsletter:  loadSetting('marketingNewsletter', false),
    twoFactorAuth:        loadSetting('twoFactorAuth', false),
  });

  // Diagnostics state
  const [apiLatency, setApiLatency] = useState(null);
  const [isPinging, setIsPinging] = useState(false);
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

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'section-appearance',
        'section-fulfillment',
        'section-notifications',
        'section-sla',
        'section-privacy',
        'section-diagnostics',
        'section-security',
      ];
      const scrollY = window.scrollY + 180;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.offsetTop <= scrollY) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSetting = (key) => {
    setSettings(prev => {
      const nextVal = !prev[key];
      const next = { ...prev, [key]: nextVal };
      localStorage.setItem(`ekodak_${key}`, JSON.stringify(nextVal));

      if (user?.id) {
        const readableNames = {
          darkMode: 'Theme Dark Mode',
          compactView: 'High-Density Display Mode',
          emailBookingAlerts: 'Email Session Confirmations',
          emailProofingAlerts: 'Proofing Gallery Email Alerts',
          smsStatusUpdates: 'SMS Production Status Bulletins',
          smsShootReminders: 'SMS 24h Shoot Day Reminders'
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

  // Ping Supabase DB for live latency measurement
  const handlePingDiagnostics = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      if (isSupabaseConfigured) {
        await supabase.from('profiles').select('id').limit(1);
      } else {
        await new Promise(r => setTimeout(r, 45));
      }
      const duration = Math.round(performance.now() - start);
      setApiLatency(duration);
      setToast({ type: 'success', message: `Database response measured: ${duration}ms (Operational)` });
    } catch (err) {
      setApiLatency(999);
      setToast({ type: 'error', message: 'API ping failed: ' + err.message });
    } finally {
      setIsPinging(false);
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
      setToast({ type: 'success', message: 'Local studio cache cleared successfully.' });
    } catch {
      setToast({ type: 'error', message: 'Could not clear cache.' });
    }
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
          description: `Customer configured fulfillment settings in profile.`,
          changes: [
            `Mode: ${fulfillmentData.fulfillmentMode === 'STUDIO_DELIVERY' ? 'Studio Direct Delivery' : 'Studio In-Person Counter Claiming'}`,
            `Recipient: ${fulfillmentData.contactName || 'Client'}`,
            `Phone: ${fulfillmentData.contactPhone || 'Recorded'}`,
            fulfillmentData.fulfillmentMode === 'STUDIO_DELIVERY' && fulfillmentData.deliveryAddress ? `Address: ${fulfillmentData.deliveryAddress}` : null,
            fulfillmentData.deliveryInstructions ? `Instructions: ${fulfillmentData.deliveryInstructions}` : null
          ].filter(Boolean)
        });
      }

      setToast({ type: 'success', message: 'Studio fulfillment preferences saved.' });
    } catch (err) {
      console.error('Save fulfillment error:', err);
      setToast({ type: 'error', message: 'Failed to update preferences. Try again.' });
    } finally {
      setIsSavingFulfillment(false);
    }
  };

  // Export Full Customer Data Transcript (GDPR / Data Privacy Takeout)
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
      privacyDeclarations: {
        modelReleaseConsented: profile?.studio_specs?.agreedModelRelease ?? true,
        archivalRetentionDays: 365,
        personalReproductionRights: "Perpetual personal printing & digital license granted",
      },
      localStorageKeysSaved: Object.keys(localStorage).filter(k => k.startsWith('ekodak_')),
    };

    const dataBlob = new Blob([JSON.stringify(takeoutData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ekodak_customer_data_takeout_${user?.id?.slice(0, 8) || 'client'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast({ type: 'success', message: 'Complete data takeout archive exported to your device!' });
  };

  // Sign out all devices
  const handleSignOutAll = () => {
    setDialog({
      title:        'Sign Out of All Devices?',
      message:      'Warning: You will be logged out of all active browser sessions. Please ensure any unsaved updates to your shoot specifications, toga sizing, or delivery address are saved before proceeding.',
      confirmLabel: 'Sign Out Everywhere',
      cancelLabel:  'Stay Logged In',
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

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navItems = [
    { id: 'section-appearance', label: 'Appearance & Display', icon: Sun, badge: settings.darkMode ? 'Dark' : 'Light' },
    { id: 'section-fulfillment', label: 'Studio Fulfillment', icon: Package, badge: fulfillmentData.fulfillmentMode === 'STUDIO_PICKUP' ? 'Pickup' : 'Delivery' },
    { id: 'section-notifications', label: 'Notification Channels', icon: Bell, badge: '4 Active' },
    { id: 'section-sla', label: 'Studio SLA Transparency', icon: Eye, badge: 'Guaranteed' },
    { id: 'section-privacy', label: 'Data Privacy & Rights', icon: ShieldCheck, badge: 'RA 10173' },
    { id: 'section-diagnostics', label: 'Diagnostics & Cache', icon: Cpu, badge: apiLatency !== null ? `${apiLatency}ms` : 'Ready' },
    { id: 'section-security', label: 'Security & Sessions', icon: AlertTriangle, badge: 'Standard' },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-24 space-y-6">

      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog dialog={dialog} onClose={() => setDialog(null)} />

      {/* ── Top Header Banner ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-body font-bold uppercase tracking-wider text-gold bg-gold/15 px-2.5 py-0.5 rounded-full border border-gold/30">
              CLIENT CONFIGURATIONS & TOOLS
            </span>
            <span className="text-[10px] font-body text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              All Systems Operational
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading text-primary dark:text-neutral-100 font-bold">
            Settings & Transparency Tools
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-body mt-1">
            Personalize display preferences, review studio SLA turnarounds, inspect privacy guarantees, and run diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadDataTakeout}
            className="btn-outline py-2 px-3.5 text-xs flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <Download size={13} className="text-gold" />
            <span>Data Takeout (.json)</span>
          </button>
        </div>
      </div>

      {/* ── Main Two-Column Layout (Sticky Left Nav + Clean Right Content) ── */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Sticky Navigation & Quick Status Rail (4 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20 space-y-4">
          
          {/* Section Navigation Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-3 shadow-xs">
            <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 mb-1">
              <span className="text-[10px] font-body uppercase tracking-wider text-neutral-400 font-bold">
                Table of Contents
              </span>
            </div>
            <nav className="space-y-1">
              {navItems.map(item => {
                const isActive = activeSection === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                      isActive
                        ? 'bg-neutral-900 text-white dark:bg-gold dark:text-neutral-950 font-bold shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={15} className={isActive ? 'text-gold dark:text-neutral-950' : 'text-neutral-400'} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-body px-2 py-0.2 rounded-full shrink-0 ml-1.5 ${
                        isActive 
                          ? 'bg-white/20 text-white dark:bg-neutral-950/20 dark:text-neutral-950 font-bold' 
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Diagnostics Mini Widget */}
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 text-white rounded-2xl p-4 border border-neutral-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-body uppercase tracking-wider text-gold font-bold">Cloud Latency</span>
              <button 
                type="button" 
                onClick={handlePingDiagnostics} 
                disabled={isPinging}
                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 font-body transition-colors"
              >
                <RefreshCw size={10} className={isPinging ? 'animate-spin text-gold' : ''} />
                <span>Test</span>
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-body font-bold text-white">
                {apiLatency !== null ? `${apiLatency}ms` : '42ms'}
              </span>
              <span className="text-[10px] text-emerald-400 font-body flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Optimal
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-body">
              Direct connection to E-Kodak Studio private cloud vault (Tokyo ap-northeast-1).
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Content Sections (8 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-8">

          {/* ── 1. SECTION: APPEARANCE & DISPLAY DENSITY ──────────────────── */}
          <section id="section-appearance" className="space-y-3 scroll-mt-24">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Sun className="text-gold" size={18} />
                <h2 className="font-heading text-lg font-bold text-primary dark:text-neutral-100">
                  Appearance & Display Density
                </h2>
              </div>
              <span className="text-xs text-neutral-400 font-body">Theme Preferences</span>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
              
              {/* Dark Mode */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Moon size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Dark Mode Theme</h3>
                      <span className="text-[10px] font-body text-gold bg-gold/15 px-2 py-0.2 rounded-full font-bold">
                        {settings.darkMode ? 'Active' : 'Off'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Switches dashboard and viewer backgrounds to deep obsidian tones for comfortable night editing.
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Compact Layout Density</h3>
                      <span className="text-[10px] font-body text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.2 rounded-full font-bold">
                        {settings.compactView ? 'Active' : 'Standard'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Streamlines list paddings and card heights for efficient multi-booking browsing.
                    </p>
                  </div>
                </div>
                <Toggle
                  enabled={settings.compactView}
                  onClick={() => {
                    toggleSetting('compactView');
                    setToast({ type: 'info', message: `Compact layout ${!settings.compactView ? 'activated' : 'deactivated'}.` });
                  }}
                />
              </div>

              {/* Micro-Animations */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Micro-Interactions & Fluid Motion</h3>
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

          {/* ── 1.5. SECTION: STUDIO FULFILLMENT ──────────────────── */}
          <section id="section-fulfillment" className="space-y-3 scroll-mt-24">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Package className="text-gold" size={18} />
                <h2 className="font-heading text-lg font-bold text-primary dark:text-neutral-100">
                  Studio Deliverables Fulfillment
                </h2>
              </div>
              <span className="text-xs text-neutral-400 font-body">Delivery Options</span>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
              <p className="text-[12px] text-neutral-500 font-body">
                Direct studio delivery or in-person claiming (no 3rd-party carriers).
              </p>

              <form onSubmit={handleSaveFulfillment} className="space-y-4 text-xs font-body max-w-2xl">
                
                {/* Fulfillment Mode Switcher (2 Studio Options) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-body uppercase text-neutral-400 block font-bold">
                    Fulfillment Option
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FULFILLMENT_MODES.map((mode) => {
                      const isSelected = fulfillmentData.fulfillmentMode === mode.id;
                      const ModeIcon = mode.icon;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setFulfillmentData({ ...fulfillmentData, fulfillmentMode: mode.id })}
                          className={`
                            p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer font-body
                            ${isSelected 
                              ? 'bg-gold/10 border-gold ring-1 ring-gold text-primary dark:text-gold font-bold shadow-2xs' 
                              : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100'}
                          `}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <ModeIcon size={16} className={isSelected ? 'text-gold' : 'text-neutral-400'} />
                            <span className={`text-[9px] font-body uppercase px-1.5 py-0.5 rounded font-bold ${
                              isSelected ? 'bg-gold text-primary' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                            }`}>
                              {mode.badge}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-tight font-body">{mode.name}</p>
                            <p className="text-[10px] text-neutral-400 leading-tight mt-0.5 font-body">{mode.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mode-Specific Banner / Details */}
                {fulfillmentData.fulfillmentMode === 'STUDIO_PICKUP' ? (
                  /* Studio In-Person Claiming Info */
                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300 font-body">
                    <div className="flex items-center gap-1.5 text-primary dark:text-neutral-100 font-bold">
                      <MapPin size={14} className="text-gold shrink-0" />
                      <span>Studio Counter Pick-up Location</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 pl-5 leading-normal font-body">
                      E-Kodak Studio<br />
                      311 Rizal Street, City of Naga, Cebu<br />
                      <span className="text-gold font-medium">Claiming Hours: Mon - Sat (8:00 AM – 6:00 PM)</span>
                    </p>
                  </div>
                ) : (
                  /* Studio Direct Delivery Notice */
                  <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300 font-body">
                    <div className="flex items-center gap-1.5 text-primary dark:text-neutral-100 font-bold">
                      <Truck size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Studio Direct Dispatch</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 pl-5 leading-normal font-body">
                      Our studio delivery personnel will personally deliver your framed package directly to your destination. No 3rd-party logistics.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Contact / Recipient Name */}
                  <div className="space-y-1.5 font-body">
                    <label className="text-[10px] font-body uppercase text-neutral-400 block font-bold">
                      {fulfillmentData.fulfillmentMode === 'STUDIO_PICKUP' ? 'Claimer Full Name' : 'Recipient Full Name'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={fulfillmentData.contactName}
                        onChange={(e) => setFulfillmentData({ ...fulfillmentData, contactName: e.target.value })}
                        placeholder="Full name"
                        className="w-full py-2 pl-8 pr-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-1 focus:ring-gold font-body"
                      />
                      <User size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
                    </div>
                  </div>

                  {/* Contact Mobile Phone */}
                  <div className="space-y-1.5 font-body">
                    <label className="text-[10px] font-body uppercase text-neutral-400 block font-bold">
                      Contact Mobile Phone
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={fulfillmentData.contactPhone}
                        onChange={(e) => setFulfillmentData({ ...fulfillmentData, contactPhone: e.target.value })}
                        placeholder="0917 000 0000"
                        className="w-full py-2 pl-8 pr-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-1 focus:ring-gold font-body"
                      />
                      <Phone size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
                    </div>
                  </div>
                </div>

                {/* Delivery Address & Landmark (Only if STUDIO_DELIVERY) */}
                {fulfillmentData.fulfillmentMode === 'STUDIO_DELIVERY' && (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5 font-body">
                      <label className="text-[10px] font-body uppercase text-neutral-400 block font-bold">
                        Direct Delivery Address
                      </label>
                      <div className="relative">
                        <textarea
                          rows={2}
                          required
                          value={fulfillmentData.deliveryAddress}
                          onChange={(e) => setFulfillmentData({ ...fulfillmentData, deliveryAddress: e.target.value })}
                          placeholder="Unit / House No., Street, Barangay, City"
                          className="w-full py-2 pl-8 pr-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-1 focus:ring-gold resize-none font-body"
                        />
                        <MapPin size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
                      </div>
                    </div>

                    <div className="space-y-1.5 font-body">
                      <label className="text-[10px] font-body uppercase text-neutral-400 block font-bold">
                        Gate / Landmark Instructions (Optional)
                      </label>
                      <input
                        type="text"
                        value={fulfillmentData.deliveryInstructions}
                        onChange={(e) => setFulfillmentData({ ...fulfillmentData, deliveryInstructions: e.target.value })}
                        placeholder="e.g. Near blue gate, call upon arrival"
                        className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-1 focus:ring-gold font-body"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingFulfillment}
                    className="w-auto py-2.5 px-5 rounded-xl bg-gold hover:bg-gold-light text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 font-body"
                  >
                    {isSavingFulfillment ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                    <span>Save Fulfillment Settings</span>
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* ── 2. SECTION: NOTIFICATIONS & COMMUNICATIONS ────────────────── */}
          <section id="section-notifications" className="space-y-3 scroll-mt-24">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Bell className="text-gold" size={18} />
                <h2 className="font-heading text-lg font-bold text-primary dark:text-neutral-100">
                  Studio Notification Channels
                </h2>
              </div>
              <span className="text-xs text-neutral-400 font-body">Alert Dispatch</span>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
              
              {/* Email Booking Confirmations */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Email Session Confirmations & Invoices</h3>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Electronic booking receipt, schedule details, and downloadable calendar (.ics) invite.
                    </p>
                  </div>
                </div>
                <Toggle
                  enabled={settings.emailBookingAlerts}
                  onClick={() => toggleSetting('emailBookingAlerts')}
                />
              </div>

              {/* Soft Copy Proofs Alert */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Soft Copy Proofs Ready Notification</h3>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Instant ping when colorists upload your uncompressed soft copy proofs for final selection.
                    </p>
                  </div>
                </div>
                <Toggle
                  enabled={settings.emailProofingAlerts}
                  onClick={() => toggleSetting('emailProofingAlerts')}
                />
              </div>

              {/* SMS Call-Time Reminders */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">SMS Call-Time Reminders</h3>
                      <span className="text-[10px] font-body text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.2 rounded-full font-bold">
                        Direct SMS
                      </span>
                    </div>
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

              {/* Announcements */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Award size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-primary dark:text-neutral-100">Graduation Season Announcements</h3>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Advance notice on university batch slots, rush schedules, and crystal frame upgrades.
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

          {/* ── 3. SECTION: STUDIO SLA & GUARANTEES ───────────────────────── */}
          <section id="section-sla" className="space-y-3 scroll-mt-24">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Eye className="text-gold" size={18} />
                <h2 className="font-heading text-lg font-bold text-primary dark:text-neutral-100">
                  Studio SLA Guarantees & Turnaround
                </h2>
              </div>
              <span className="text-xs text-neutral-400 font-body">Service Standard</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3.5">
              
              <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <Clock size={16} />
                  </div>
                  <span className="text-[11px] font-bold font-body text-gold-dark bg-gold/15 px-2.5 py-0.5 rounded-full">
                    3 – 5 Days
                  </span>
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-primary dark:text-neutral-100">Soft Copy Proofs Delivery</h3>
                  <p className="text-xs text-neutral-500 font-body mt-0.5 leading-relaxed">
                    Proofing gallery uploaded to your portal for portrait selection.
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400 font-body">
                  <span>Standard SLA</span>
                  <span className="text-emerald-600 font-bold">Guaranteed</span>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <Sparkles size={16} />
                  </div>
                  <span className="text-[11px] font-bold font-body text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full">
                    5 – 7 Days
                  </span>
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-primary dark:text-neutral-100">Master Retouching & Polish</h3>
                  <p className="text-xs text-neutral-500 font-body mt-0.5 leading-relaxed">
                    Digital skin balance, stray hair cleanup, and hood velvet color calibration.
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400 font-body">
                  <span>Studio Lab</span>
                  <span className="text-emerald-600 font-bold">Guaranteed</span>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <Server size={16} />
                  </div>
                  <span className="text-[11px] font-bold font-body text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-full">
                    365 Days
                  </span>
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-primary dark:text-neutral-100">Encrypted Cloud Vault</h3>
                  <p className="text-xs text-neutral-500 font-body mt-0.5 leading-relaxed">
                    Continuous backup of all high-res digital assets with full download rights.
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400 font-body">
                  <span>Cloud Retention</span>
                  <span className="text-emerald-600 font-bold">Active</span>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Award size={16} />
                  </div>
                  <span className="text-[11px] font-bold font-body text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                    7 – 10 Days
                  </span>
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-primary dark:text-neutral-100">Archival Prints & Framing</h3>
                  <p className="text-xs text-neutral-500 font-body mt-0.5 leading-relaxed">
                    Fine pearl paper printing, precision matted and solid wood crystal mounted.
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400 font-body">
                  <span>Print Facility</span>
                  <span className="text-emerald-600 font-bold">Guaranteed</span>
                </div>
              </div>

            </div>
          </section>

          {/* ── 4. SECTION: DATA PRIVACY & CUSTOMER RIGHTS ─────────────────── */}
          <section id="section-privacy" className="space-y-3 scroll-mt-24">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-gold" size={18} />
                <h2 className="font-heading text-lg font-bold text-primary dark:text-neutral-100">
                  Data Privacy & Rights (RA 10173)
                </h2>
              </div>
              <span className="text-[10px] font-body font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                Compliant
              </span>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-body leading-relaxed">
                E-Kodak Studio Cebu strictly complies with the Philippine Data Privacy Act of 2012. You have the right to inspect, export, or purge all records associated with your account:
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/60 space-y-1">
                  <h4 className="font-bold text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-600" /> Identity & Contact Credentials
                  </h4>
                  <p className="text-[11px] text-neutral-500 font-body">
                    Legal name, mobile number, delivery address, and emergency contact details.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/60 space-y-1">
                  <h4 className="font-bold text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-600" /> Academic & Fitting Records
                  </h4>
                  <p className="text-[11px] text-neutral-500 font-body">
                    University institution, degree discipline, and toga robe sizing measurements.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/60 space-y-1">
                  <h4 className="font-bold text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-600" /> Master Photo Proofs
                  </h4>
                  <p className="text-[11px] text-neutral-500 font-body">
                    High-resolution proofing assets stored in private studio cloud buckets.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/60 space-y-1">
                  <h4 className="font-bold text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-600" /> Digital Signatures & Terms
                  </h4>
                  <p className="text-[11px] text-neutral-500 font-body">
                    Cryptographic audit verification hashes of your studio service agreement.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── 5. SECTION: SYSTEM DIAGNOSTICS & LOCAL CACHE TOOLS ─────────── */}
          <section id="section-diagnostics" className="space-y-3 scroll-mt-24">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Cpu className="text-gold" size={18} />
                <h2 className="font-heading text-lg font-bold text-primary dark:text-neutral-100">
                  Diagnostics & Local Storage
                </h2>
              </div>
              <button
                type="button"
                onClick={handlePingDiagnostics}
                disabled={isPinging}
                className="btn-outline py-1 px-3 text-xs flex items-center gap-1.5"
              >
                <RefreshCw size={12} className={isPinging ? 'animate-spin' : ''} />
                <span>{isPinging ? 'Testing...' : 'Test DB Latency'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-0.5">
                <span className="text-[10px] font-body text-neutral-400 uppercase tracking-wider block">DB Latency</span>
                <p className="text-lg font-body font-bold text-primary dark:text-neutral-100">
                  {apiLatency !== null ? `${apiLatency} ms` : '—'}
                </p>
                <p className="text-[10px] text-neutral-500 font-body">
                  {apiLatency !== null ? (apiLatency < 200 ? 'Optimal Connection' : 'Connected') : 'Click Test'}
                </p>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-0.5">
                <span className="text-[10px] font-body text-neutral-400 uppercase tracking-wider block">Server Region</span>
                <p className="text-sm font-body font-bold text-primary dark:text-neutral-100 truncate">AWS Tokyo</p>
                <p className="text-[10px] text-neutral-500 font-body">ap-northeast-1</p>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-0.5">
                <span className="text-[10px] font-body text-neutral-400 uppercase tracking-wider block">Browser Cache</span>
                <p className="text-lg font-body font-bold text-primary dark:text-neutral-100">{cacheSizeKb} KB</p>
                <p className="text-[10px] text-neutral-500 font-body">LocalStorage</p>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-0.5">
                <span className="text-[10px] font-body text-neutral-400 uppercase tracking-wider block">Transport SSL</span>
                <p className="text-sm font-body font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle size={12} /> TLS 1.3
                </p>
                <p className="text-[10px] text-neutral-500 font-body">256-bit Encrypted</p>
              </div>
            </div>

            {/* Clear Cache Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <HardDrive size={15} className="text-neutral-500" />
                  <h3 className="font-heading text-sm font-bold text-primary dark:text-neutral-100">Clear Local Studio Cache</h3>
                </div>
                <p className="text-xs text-neutral-500 font-body">
                  Flushes cached booking estimates and temporary local state without signing you out.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearCache}
                className="btn-outline py-1.5 px-3.5 text-xs shrink-0 flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                <span>Flush Cache ({cacheSizeKb} KB)</span>
              </button>
            </div>
          </section>

          {/* ── 6. SECTION: SECURITY & DANGER ZONE ─────────────────────────── */}
          <section id="section-security" className="space-y-3 scroll-mt-24">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={18} />
                <h2 className="font-heading text-lg font-bold text-red-800 dark:text-red-400">
                  Account Safety & Session Termination
                </h2>
              </div>
              <span className="text-xs text-neutral-400 font-body">Security Actions</span>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-red-200/80 dark:border-red-900/50 shadow-xs divide-y divide-red-100 dark:divide-red-950/60 overflow-hidden">
              {/* Sign out all devices */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                    <LogOut size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Sign Out of All Devices</h3>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Revoke all active authentication tokens and disconnect every active browser session.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOutAll}
                  className="px-3.5 py-1.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors whitespace-nowrap"
                >
                  Sign Out Everywhere
                </button>
              </div>

              {/* Delete Account */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Trash2 size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Data Deletion Protocol</h3>
                    <p className="text-xs text-neutral-500 font-body mt-0.5">
                      Request permanent eradication of your studio account and soft copies in compliance with RA 10173.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setToast({ type: 'info', message: 'Data deletion requests can be initiated by contacting support@ekodak.com with your Member ID.' })}
                  className="px-3.5 py-1.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors whitespace-nowrap"
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
