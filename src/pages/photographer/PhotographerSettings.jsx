import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Clock,
  RefreshCw,
  Sparkles,
  Check,
  Zap,
  Volume2,
  Smartphone,
  MailCheck,
  Moon,
  Sun,
  Monitor,
  LayoutGrid,
  Sliders,
  Palette,
  ArrowRight,
  Play,
  Activity,
  PanelLeftClose,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getPhotographerProfileData,
  updatePhotographerProfileData,
  toggleGeneralAvailability,
  recordPhotographerActivity,
} from '../../services/photographerService';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import Toast from '../../components/ui/Toast';

// Web Audio synthesizer chime for instant acoustic feedback
function playStudioChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    // Luxury two-tone chime (587.33Hz D5 -> 880Hz A5)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  } catch (e) {
    console.warn('Audio chime playback error:', e);
  }
}

// Reusable Accessible Toggle Switch Row with Real Checkbox Input and Visual Indicator
function SettingToggleRow({
  id,
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  checked,
  onChange,
  onTestSound,
}) {
  return (
    <label
      htmlFor={id}
      className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none group ${
        checked
          ? 'bg-amber-50/40 dark:bg-neutral-800/60 border-amber-300/80 dark:border-neutral-700/80 shadow-2xs'
          : 'bg-neutral-50/80 dark:bg-neutral-800/40 border-neutral-200/80 dark:border-neutral-700/60 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/70'
      }`}
    >
      {/* Hidden real accessible checkbox input */}
      <input
        type="checkbox"
        id={id}
        name={id}
        checked={checked}
        onChange={onChange}
        className="sr-only"
        aria-checked={checked}
      />

      <div className="flex items-center gap-3 min-w-0 pr-3">
        <div className={`w-8 h-8 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-2xs`}>
          <Icon size={15} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
              {title}
            </span>
            {onTestSound && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTestSound();
                }}
                className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/80 text-xs font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                title="Play test audio chime"
              >
                <Play size={8} fill="currentColor" />
                <span>Test Cue</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
            {description}
          </p>
        </div>
      </div>

      {/* Modern Interactive Switch with Checkmark Indicator */}
      <div
        className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
          checked
            ? 'bg-amber-500 dark:bg-gold'
            : 'bg-neutral-300 dark:bg-neutral-700'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white dark:bg-neutral-900 shadow-md transform transition-transform duration-200 flex items-center justify-center ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {checked ? (
            <Check size={10} className="text-amber-600 dark:text-gold stroke-[3]" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          )}
        </div>
      </div>
    </label>
  );
}

SettingToggleRow.propTypes = {
  id: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  iconBg: PropTypes.string.isRequired,
  iconColor: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onTestSound: PropTypes.func,
};

export default function PhotographerSettings() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // ── 1. Shift Status & Dispatch State ─────────────────────────────────────────
  const [isAvailable, setIsAvailable] = useState(true);
  const [dispatchAlerts, setDispatchAlerts] = useState({
    notifySms: true,
    autoAccept: true,
    soundAlerts: true,
    dailyDigest: true,
  });

  // ── 2. Theme Mode (dark | light | system) ────────────────────────────────────
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('ekodak_photographer_theme_mode');
      if (savedMode) return savedMode;
      const savedDark = localStorage.getItem('ekodak_photographer_darkMode');
      if (savedDark !== null) return JSON.parse(savedDark) ? 'dark' : 'light';
      return 'dark'; // Default studio station dark aesthetic
    } catch {
      return 'dark';
    }
  });

  // ── 3. Workstation Preferences ───────────────────────────────────────────────
  const [preferences, setPreferences] = useState(() => {
    let compactMode = false;
    let motionEffects = true;
    let autoRefresh = true;
    let sidebarCollapsed = false;
    try {
      const savedCompact = localStorage.getItem('ekodak_photographer_compactView');
      if (savedCompact !== null) compactMode = JSON.parse(savedCompact);
      const savedMotion = localStorage.getItem('ekodak_photographer_motionEffects');
      if (savedMotion !== null) motionEffects = JSON.parse(savedMotion);
      const savedRefresh = localStorage.getItem('ekodak_photographer_autoRefresh');
      if (savedRefresh !== null) autoRefresh = JSON.parse(savedRefresh);
      const savedCollapsed = localStorage.getItem('ekodak_photographer_sidebar_collapsed');
      if (savedCollapsed !== null) sidebarCollapsed = savedCollapsed === 'true' || JSON.parse(savedCollapsed) === true;
    } catch (e) {
      console.warn('Initial preferences read error:', e);
    }
    return { compactMode, motionEffects, autoRefresh, sidebarCollapsed };
  });

  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const storageKey = user?.id ? `ekodak_photographer_station_prefs_${user.id}` : null;

  // Sync sidebar state from header/sidebar toggle clicks
  useEffect(() => {
    const handleSidebarCollapseEvent = (e) => {
      if (typeof e.detail?.collapsed === 'boolean') {
        setPreferences((prev) => ({ ...prev, sidebarCollapsed: e.detail.collapsed }));
      }
    };
    window.addEventListener('ekodak_photographer_sidebar_collapsed_changed', handleSidebarCollapseEvent);
    return () => window.removeEventListener('ekodak_photographer_sidebar_collapsed_changed', handleSidebarCollapseEvent);
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAvailable, dispatchAlerts, themeMode, preferences, user?.id]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // 1. Fetch DB availability and profile studio_specs
      const { data } = await getPhotographerProfileData(user.id);
      const avail = data?.is_available ?? true;
      setIsAvailable(avail);

      // 2. Load stored theme and station preferences
      let loadedDispatch = { ...dispatchAlerts };
      let loadedTheme = themeMode;
      let loadedPrefs = { ...preferences };

      // Check DB specs first if available
      try {
        const { data: profileRecord } = await supabase
          .from('profiles')
          .select('studio_specs')
          .eq('id', user.id)
          .single();

        if (profileRecord?.studio_specs) {
          const specs = profileRecord.studio_specs;
          if (specs.dispatchAlerts) loadedDispatch = { ...loadedDispatch, ...specs.dispatchAlerts };
          if (specs.themeMode) loadedTheme = specs.themeMode;
          if (specs.stationPreferences) loadedPrefs = { ...loadedPrefs, ...specs.stationPreferences };
        }
      } catch (dbErr) {
        console.warn('Could not read profile studio_specs from DB:', dbErr);
      }

      // Check localStorage cached settings
      const savedThemeMode = localStorage.getItem('ekodak_photographer_theme_mode');
      if (savedThemeMode) {
        loadedTheme = savedThemeMode;
      } else {
        const globalDark = localStorage.getItem('ekodak_photographer_darkMode');
        if (globalDark !== null) {
          loadedTheme = JSON.parse(globalDark) ? 'dark' : 'light';
        }
      }

      const savedCompact = localStorage.getItem('ekodak_photographer_compactView');
      if (savedCompact !== null) {
        loadedPrefs.compactMode = JSON.parse(savedCompact);
      }

      const savedMotion = localStorage.getItem('ekodak_photographer_motionEffects');
      if (savedMotion !== null) {
        loadedPrefs.motionEffects = JSON.parse(savedMotion);
      }

      const savedRefresh = localStorage.getItem('ekodak_photographer_autoRefresh');
      if (savedRefresh !== null) {
        loadedPrefs.autoRefresh = JSON.parse(savedRefresh);
      }

      const savedCollapsed = localStorage.getItem('ekodak_photographer_sidebar_collapsed');
      if (savedCollapsed !== null) {
        loadedPrefs.sidebarCollapsed = savedCollapsed === 'true' || JSON.parse(savedCollapsed) === true;
      }

      if (storageKey) {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.dispatchAlerts) loadedDispatch = { ...loadedDispatch, ...parsed.dispatchAlerts };
            if (parsed.themeMode) loadedTheme = parsed.themeMode;
            if (parsed.preferences) loadedPrefs = { ...loadedPrefs, ...parsed.preferences };
          } catch (e) {
            console.warn('Failed to parse cached station preferences', e);
          }
        }
      }

      setDispatchAlerts(loadedDispatch);
      setThemeMode(loadedTheme);
      setPreferences(loadedPrefs);

      setInitialSnapshot({
        isAvailable: avail,
        dispatchAlerts: loadedDispatch,
        themeMode: loadedTheme,
        preferences: loadedPrefs,
      });
    } catch (err) {
      console.warn('loadSettings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return (
      isAvailable !== initialSnapshot.isAvailable ||
      themeMode !== initialSnapshot.themeMode ||
      JSON.stringify(dispatchAlerts) !== JSON.stringify(initialSnapshot.dispatchAlerts) ||
      JSON.stringify(preferences) !== JSON.stringify(initialSnapshot.preferences)
    );
  }, [isAvailable, themeMode, dispatchAlerts, preferences, initialSnapshot]);

  // Instant Shift Availability Toggle
  const handleToggleAvailability = async () => {
    if (!user?.id) return;
    const nextVal = !isAvailable;
    setIsAvailable(nextVal);
    const { error } = await toggleGeneralAvailability(user.id, nextVal);
    if (error) {
      setIsAvailable(!nextVal);
      setToast({ type: 'error', message: 'Failed to update shift availability.' });
    } else {
      setToast({
        type: 'success',
        message: nextVal ? 'Station Active: Open for shoot bookings.' : 'Station Off-Duty: Paused for new bookings.',
      });
      await recordPhotographerActivity({
        photographerId: user.id,
        photographerName: 'Photographer',
        actionType: 'AVAILABILITY_TOGGLE',
        entityType: 'photographer_availability',
        entityId: user.id,
        entityLabel: nextVal ? 'Status: Available' : 'Status: Off-Duty',
        description: nextVal
          ? 'Switched station status to Available for new shoots.'
          : 'Switched station status to Off-Duty / editing mode.',
        details: { is_available: nextVal },
      }).catch(() => {});
    }
  };

  // Immediate Functional Theme Change Handler
  const handleThemeChange = (mode) => {
    setThemeMode(mode);
    let isDark = false;
    if (mode === 'dark') {
      isDark = true;
    } else if (mode === 'light') {
      isDark = false;
    } else if (mode === 'system') {
      isDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    localStorage.setItem('ekodak_photographer_theme_mode', mode);
    localStorage.setItem('ekodak_photographer_darkMode', JSON.stringify(isDark));
    window.dispatchEvent(new CustomEvent('ekodak_photographer_theme_changed', { detail: { darkMode: isDark } }));

    setToast({
      type: 'info',
      message: `Station theme updated: ${mode === 'dark' ? 'Obsidian Dark' : mode === 'light' ? 'Studio Light' : 'System Auto'}.`,
    });
  };

  // Immediate Functional Dispatch Toggle Handlers
  const handleToggleDispatch = (key) => {
    setDispatchAlerts((prev) => {
      const nextVal = !prev[key];
      if (key === 'soundAlerts' && nextVal) {
        playStudioChime();
      }
      return { ...prev, [key]: nextVal };
    });
  };

  // Immediate Functional Workstation Preference Handlers
  const handleTogglePreference = (key) => {
    setPreferences((prev) => {
      const nextVal = !prev[key];
      if (key === 'compactMode') {
        if (nextVal) {
          document.documentElement.classList.add('compact-layout');
        } else {
          document.documentElement.classList.remove('compact-layout');
        }
        localStorage.setItem('ekodak_photographer_compactView', JSON.stringify(nextVal));
        window.dispatchEvent(new CustomEvent('ekodak_photographer_compact_changed', { detail: { compactView: nextVal } }));
      } else if (key === 'motionEffects') {
        if (!nextVal) {
          document.documentElement.classList.add('reduce-motion');
        } else {
          document.documentElement.classList.remove('reduce-motion');
        }
        localStorage.setItem('ekodak_photographer_motionEffects', JSON.stringify(nextVal));
        window.dispatchEvent(new CustomEvent('ekodak_photographer_motion_changed', { detail: { motionEffects: nextVal } }));
      } else if (key === 'autoRefresh') {
        localStorage.setItem('ekodak_photographer_autoRefresh', JSON.stringify(nextVal));
        window.dispatchEvent(new CustomEvent('ekodak_photographer_autorefresh_changed', { detail: { autoRefresh: nextVal } }));
      } else if (key === 'sidebarCollapsed') {
        localStorage.setItem('ekodak_photographer_sidebar_collapsed', JSON.stringify(nextVal));
        window.dispatchEvent(new CustomEvent('ekodak_photographer_sidebar_collapsed_changed', { detail: { collapsed: nextVal } }));
        setToast({
          type: 'info',
          message: nextVal ? 'Sidebar collapsed to icon-only rail.' : 'Sidebar expanded to full width.',
        });
      }
      return { ...prev, [key]: nextVal };
    });
  };

  // Revert Unsaved Modifications
  const handleDiscard = () => {
    if (!initialSnapshot) return;
    setIsAvailable(initialSnapshot.isAvailable);
    setDispatchAlerts({ ...initialSnapshot.dispatchAlerts });
    setThemeMode(initialSnapshot.themeMode);
    setPreferences({ ...initialSnapshot.preferences });

    // Restore DOM classes
    const wasDark =
      initialSnapshot.themeMode === 'dark' ||
      (initialSnapshot.themeMode === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (wasDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (initialSnapshot.preferences.compactMode) {
      document.documentElement.classList.add('compact-layout');
    } else {
      document.documentElement.classList.remove('compact-layout');
    }

    if (!initialSnapshot.preferences.motionEffects) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }

    setToast({ type: 'info', message: 'Reverted unsaved settings modifications.' });
  };

  // Commit Settings & Preferences to Database and LocalStorage
  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);

    try {
      // 1. Update DB availability in photographer_profiles
      const { error: availErr } = await updatePhotographerProfileData(user.id, {
        is_available: isAvailable,
      });
      if (availErr) throw availErr;

      // 2. Persist dispatch alerts and workstation preferences to profiles studio_specs
      try {
        const { data: curProfile } = await supabase
          .from('profiles')
          .select('studio_specs')
          .eq('id', user.id)
          .single();

        const currentSpecs = curProfile?.studio_specs || {};
        await supabase
          .from('profiles')
          .update({
            studio_specs: {
              ...currentSpecs,
              dispatchAlerts,
              themeMode,
              stationPreferences: preferences,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      } catch (specsErr) {
        console.warn('Could not persist studio_specs to profiles:', specsErr);
      }

      // 3. Persist locally to localStorage
      const payload = {
        dispatchAlerts,
        themeMode,
        preferences,
      };

      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(payload));
      }

      localStorage.setItem('ekodak_photographer_theme_mode', themeMode);
      localStorage.setItem('ekodak_photographer_compactView', JSON.stringify(preferences.compactMode));
      localStorage.setItem('ekodak_photographer_motionEffects', JSON.stringify(preferences.motionEffects));
      localStorage.setItem('ekodak_photographer_autoRefresh', JSON.stringify(preferences.autoRefresh));

      const isDark =
        themeMode === 'dark' ||
        (themeMode === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      localStorage.setItem('ekodak_photographer_darkMode', JSON.stringify(isDark));
      window.dispatchEvent(new CustomEvent('ekodak_photographer_theme_changed', { detail: { darkMode: isDark } }));

      setInitialSnapshot({
        isAvailable,
        dispatchAlerts: { ...dispatchAlerts },
        themeMode,
        preferences: { ...preferences },
      });

      setToast({ type: 'success', message: 'Station settings and preferences saved successfully.' });

      // 4. Log audit activity
      await recordPhotographerActivity({
        photographerId: user.id,
        photographerName: 'Photographer',
        actionType: 'SETTINGS_UPDATED',
        entityType: 'photographer_settings',
        entityId: user.id,
        entityLabel: 'Station Preferences Saved',
        description: 'Updated shift status, dispatch controls, theme mode, and preferences.',
        details: { isAvailable, themeMode, dispatchAlerts, preferences },
      }).catch(() => {});
    } catch (err) {
      console.error('handleSave settings error:', err);
      setToast({ type: 'error', message: 'Failed to save station settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full pb-16 font-body animate-fade-in">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* ── 1. Page Hero Banner ────────────────────────────────────────── */}
      <AdminHeroBanner
        station="photographer"
        userName="Studio Station"
        title="Station Settings"
        subtitle="Manage your shift availability, dispatch automation controls, and workstation preferences."
        primaryAction={{
          label: 'Photographer Profile',
          href: '/photographer/profile',
          icon: Sliders,
        }}
        secondaryAction={{
          label: 'Availability Schedule',
          href: '/photographer/availability',
          icon: Clock,
        }}
        onRefresh={loadSettings}
        isRefreshing={loading}
      />

      {/* ── Page Content Wrapper (Full Width Edge-to-Edge) ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-5 mt-2.5 sm:mt-3">

      {loading ? (
        <div className="py-24 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs">
          <RefreshCw size={26} className="animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 font-body">Loading station settings…</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="w-full space-y-6">

          {/* ── 2. COMBINED 50/50 TWO-PANEL LAYOUT (Shift & Dispatch | Theme & Preferences) ── */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

            {/* ── PANEL 1: Shift Status & Dispatch Controls (50% Width) ───── */}
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 p-6 sm:p-7 shadow-xs flex flex-col justify-between h-full transition-colors">
              <div className="space-y-6">
                
                {/* Panel Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                      <Clock size={16} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                        Shift Status &amp; Dispatch Controls
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        Station availability and automated booking dispatch
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-mono ${
                      isAvailable
                        ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                    {isAvailable ? 'Available' : 'Off-Duty'}
                  </span>
                </div>

                {/* Shift Status Hero Box */}
                <div className="p-5 sm:p-6 rounded-2xl bg-neutral-50/90 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {isAvailable ? 'Station Active for Shoots' : 'Station Off-Duty / Editing Mode'}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      {isAvailable
                        ? 'Your bay is active. Incoming customer shoots and front-desk bookings will be dispatched to your queue.'
                        : 'Your bay is paused for new bookings. You can focus on editing or taking scheduled breaks.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAvailability}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs whitespace-nowrap active:scale-95 ${
                      isAvailable
                        ? 'bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white border border-neutral-700/60'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    {isAvailable ? 'Set Off-Duty' : 'Set Available'}
                  </button>
                </div>

                {/* Dispatch Automation Checkboxes / Toggles */}
                <div className="space-y-2.5">
                  <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Automated Dispatch Preferences:
                  </p>

                  {/* SMS Dispatch Alerts */}
                  <SettingToggleRow
                    id="setting-notify-sms"
                    icon={Smartphone}
                    iconBg="bg-amber-50 dark:bg-amber-950/60"
                    iconColor="text-amber-600 dark:text-amber-400"
                    title="SMS Shoot Notifications"
                    description="Receive instant SMS alerts when a shoot is assigned"
                    checked={dispatchAlerts.notifySms}
                    onChange={() => handleToggleDispatch('notifySms')}
                  />

                  {/* Auto-Confirm Booking Slots */}
                  <SettingToggleRow
                    id="setting-auto-accept"
                    icon={Zap}
                    iconBg="bg-blue-50 dark:bg-blue-950/60"
                    iconColor="text-blue-600 dark:text-blue-400"
                    title="Auto-Confirm Booking Slots"
                    description="Auto-acknowledge shoots in open calendar slots"
                    checked={dispatchAlerts.autoAccept}
                    onChange={() => handleToggleDispatch('autoAccept')}
                  />

                  {/* Station Audio Chimes */}
                  <SettingToggleRow
                    id="setting-sound-alerts"
                    icon={Volume2}
                    iconBg="bg-purple-50 dark:bg-purple-950/60"
                    iconColor="text-purple-600 dark:text-purple-400"
                    title="Station Audio Chimes"
                    description="Audible sound cue upon incoming shoot handoff"
                    checked={dispatchAlerts.soundAlerts}
                    onChange={() => handleToggleDispatch('soundAlerts')}
                    onTestSound={playStudioChime}
                  />

                  {/* Morning Daily Digest */}
                  <SettingToggleRow
                    id="setting-daily-digest"
                    icon={MailCheck}
                    iconBg="bg-emerald-50 dark:bg-emerald-950/60"
                    iconColor="text-emerald-600 dark:text-emerald-400"
                    title="Morning Daily Schedule Digest"
                    description="Send daily shoot schedule email at 8:00 AM"
                    checked={dispatchAlerts.dailyDigest}
                    onChange={() => handleToggleDispatch('dailyDigest')}
                  />
                </div>

              </div>

              {/* Panel 1 Footer */}
              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-400">Shift Roster Sync:</span>
                <Link
                  to="/photographer/availability"
                  className="font-bold text-amber-700 dark:text-gold hover:underline flex items-center gap-1 group text-xs"
                >
                  <span>Edit Availability Schedule</span>
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* ── PANEL 2: Theme & Workstation Preferences (50% Width) ─────── */}
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 p-6 sm:p-7 shadow-xs flex flex-col justify-between h-full transition-colors">
              <div className="space-y-6">

                {/* Panel Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                      <Palette size={16} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                        Theme &amp; Preferences
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        Station appearance, density, and experience options
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-gold border border-amber-200 dark:border-amber-800 font-mono">
                    INTERFACE
                  </span>
                </div>

                {/* Theme Selector with Visual Active Badges */}
                <div className="space-y-2.5">
                  <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Station Theme Mode:
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Obsidian Dark */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('dark')}
                      className={`relative p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        themeMode === 'dark'
                          ? 'bg-amber-500/10 dark:bg-neutral-800 text-neutral-950 dark:text-white border-amber-500 dark:border-gold ring-2 ring-amber-500/40 dark:ring-gold/40 shadow-sm'
                          : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {themeMode === 'dark' && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 dark:bg-gold text-neutral-950 flex items-center justify-center text-xs shadow-2xs">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform ${
                        themeMode === 'dark' ? 'bg-neutral-900 dark:bg-neutral-700 text-gold shadow-xs' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        <Moon size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">Obsidian Dark</span>
                        <span className={`text-xs block truncate ${themeMode === 'dark' ? 'text-amber-700 dark:text-gold font-semibold' : 'text-neutral-400'}`}>
                          Gold &amp; Charcoal
                        </span>
                      </div>
                    </button>

                    {/* Studio Light */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('light')}
                      className={`relative p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        themeMode === 'light'
                          ? 'bg-amber-500/10 dark:bg-neutral-800 text-neutral-950 dark:text-white border-amber-500 dark:border-gold ring-2 ring-amber-500/40 dark:ring-gold/40 shadow-sm'
                          : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {themeMode === 'light' && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 dark:bg-gold text-neutral-950 flex items-center justify-center text-xs shadow-2xs">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform ${
                        themeMode === 'light' ? 'bg-amber-500 dark:bg-neutral-700 text-neutral-950 dark:text-gold shadow-xs' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        <Sun size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">Studio Light</span>
                        <span className={`text-xs block truncate ${themeMode === 'light' ? 'text-amber-700 dark:text-gold font-semibold' : 'text-neutral-400'}`}>
                          Crisp High-Key
                        </span>
                      </div>
                    </button>

                    {/* System Auto */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('system')}
                      className={`relative p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        themeMode === 'system'
                          ? 'bg-amber-500/10 dark:bg-neutral-800 text-neutral-950 dark:text-white border-amber-500 dark:border-gold ring-2 ring-amber-500/40 dark:ring-gold/40 shadow-sm'
                          : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {themeMode === 'system' && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 dark:bg-gold text-neutral-950 flex items-center justify-center text-xs shadow-2xs">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform ${
                        themeMode === 'system' ? 'bg-neutral-900 dark:bg-neutral-700 text-gold shadow-xs' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        <Monitor size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">System Auto</span>
                        <span className={`text-xs block truncate ${themeMode === 'system' ? 'text-amber-700 dark:text-gold font-semibold' : 'text-neutral-400'}`}>
                          Sync with OS
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Workstation Experience Checkboxes / Toggles */}
                <div className="space-y-2.5">
                  <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Workstation Preferences:
                  </p>

                  {/* Compact Density View */}
                  <SettingToggleRow
                    id="setting-compact-mode"
                    icon={LayoutGrid}
                    iconBg="bg-neutral-100 dark:bg-neutral-800"
                    iconColor="text-neutral-700 dark:text-neutral-300"
                    title="Compact Density View"
                    description="Condensed layout to fit more bookings on screen"
                    checked={preferences.compactMode}
                    onChange={() => handleTogglePreference('compactMode')}
                  />

                  {/* Fluid Motion Effects */}
                  <SettingToggleRow
                    id="setting-motion-effects"
                    icon={Activity}
                    iconBg="bg-purple-50 dark:bg-purple-950/60"
                    iconColor="text-purple-600 dark:text-purple-400"
                    title="Fluid Motion Effects"
                    description="Enable smooth micro-animations and transitions"
                    checked={preferences.motionEffects}
                    onChange={() => handleTogglePreference('motionEffects')}
                  />

                  {/* Live Auto-Refresh */}
                  <SettingToggleRow
                    id="setting-auto-refresh"
                    icon={RefreshCw}
                    iconBg="bg-emerald-50 dark:bg-emerald-950/60"
                    iconColor="text-emerald-600 dark:text-emerald-400"
                    title="Live Queue Auto-Refresh"
                    description="Silently sync booking updates in the background"
                    checked={preferences.autoRefresh}
                    onChange={() => handleTogglePreference('autoRefresh')}
                  />

                  {/* Collapsed Icon-Only Sidebar */}
                  <SettingToggleRow
                    id="setting-sidebar-collapsed"
                    icon={PanelLeftClose}
                    iconBg="bg-amber-50 dark:bg-amber-950/60"
                    iconColor="text-amber-600 dark:text-amber-400"
                    title="Collapsed Icon-Only Sidebar"
                    description="Keep sidebar minimized with icons only for maximum station screen space"
                    checked={preferences.sidebarCollapsed}
                    onChange={() => handleTogglePreference('sidebarCollapsed')}
                  />
                </div>

              </div>

              {/* Panel 2 Footer */}
              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-400">Current Theme:</span>
                <span className="text-[11px] text-neutral-800 dark:text-gold font-bold uppercase font-mono">
                  {themeMode === 'dark' ? 'Obsidian Dark' : themeMode === 'light' ? 'Studio Light' : 'System Auto'}
                </span>
              </div>
            </div>

          </div>

          {/* ── 3. FULL-WIDTH POINT-TO-POINT SYNCHRONIZED ACTION BAR ────────── */}
          <div className="w-full p-5 sm:p-6 rounded-3xl bg-neutral-900 dark:bg-neutral-950 text-white border border-neutral-800 shadow-md flex flex-wrap items-center justify-between gap-4 transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-neutral-800 dark:bg-neutral-900 border border-neutral-700 dark:border-neutral-800 flex items-center justify-center text-amber-400 dark:text-gold shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">
                  {isDirty ? 'Unsaved settings modifications' : 'Station settings & preferences synchronized'}
                </p>
                <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                  {isDirty
                    ? 'You have unsaved changes. Click Save Settings or press Ctrl+S to commit.'
                    : 'Shift availability, dispatch notifications, theme mode, and preferences are synchronized.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving || !isDirty}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Discard
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-7 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 dark:from-gold dark:to-gold-light text-neutral-950 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 hover:shadow-amber-500/20 active:scale-98"
              >
                {saving ? (
                  <RefreshCw size={14} className="animate-spin text-neutral-950" />
                ) : (
                  <Check size={14} className="text-neutral-950 stroke-[3]" />
                )}
                <span>Save Settings</span>
              </button>
            </div>
          </div>

        </form>
      )}
      </div>
    </div>
  );
}
