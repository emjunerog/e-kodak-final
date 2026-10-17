import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import PhotographerSidebar from './PhotographerSidebar';
import PhotographerHeader from './PhotographerHeader';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { trackCustomerPresence } from '../../services/presenceService';
import ErrorBoundary from '../common/ErrorBoundary';

export default function PhotographerLayout() {
  const { user, profile, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('ekodak_photographer_sidebar_collapsed');
      return saved === 'true' || (saved !== null && JSON.parse(saved) === true);
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ekodak_photographer_sidebar_collapsed', JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent('ekodak_photographer_sidebar_collapsed_changed', { detail: { collapsed: next } })
        );
      } catch (e) {
        console.warn('Failed to persist sidebar collapsed state:', e);
      }
      return next;
    });
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const mode = localStorage.getItem('ekodak_photographer_theme_mode');
      if (mode === 'system') {
        return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
      }
      if (mode === 'light') return false;
      if (mode === 'dark') return true;
      const savedDark = localStorage.getItem('ekodak_photographer_darkMode');
      if (savedDark !== null) return JSON.parse(savedDark);
      return true; // Default photographer studio aesthetic
    } catch {
      return true;
    }
  });

  // Broadcast live presence while browsing photographer portal
  useEffect(() => {
    if (!user) return;
    const cleanup = trackCustomerPresence(user, profile);
    return cleanup;
  }, [user, profile]);

  // Sync theme (dark mode), compact layout, and motion effects exclusively for Photographer station
  useEffect(() => {
    // 1. Initial theme resolution
    const themeMode = localStorage.getItem('ekodak_photographer_theme_mode');
    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    
    let activeDark = true;
    if (themeMode === 'system' && mediaQuery) {
      activeDark = mediaQuery.matches;
    } else if (themeMode === 'light') {
      activeDark = false;
    } else if (themeMode === 'dark') {
      activeDark = true;
    } else {
      const savedDark = localStorage.getItem('ekodak_photographer_darkMode');
      if (savedDark !== null) {
        activeDark = JSON.parse(savedDark);
      }
    }

    setIsDarkMode(activeDark);
    if (activeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 2. Initial compact view
    const savedCompact = localStorage.getItem('ekodak_photographer_compactView');
    if (savedCompact !== null && (savedCompact === 'true' || JSON.parse(savedCompact) === true)) {
      document.documentElement.classList.add('compact-layout');
    } else {
      document.documentElement.classList.remove('compact-layout');
    }

    // 3. Initial motion effects
    const savedMotion = localStorage.getItem('ekodak_photographer_motionEffects');
    if (savedMotion !== null && JSON.parse(savedMotion) === false) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }

    // Event listeners scoped for Photographer Station
    const handleThemeUpdate = (e) => {
      if (typeof e.detail?.darkMode === 'boolean') {
        setIsDarkMode(e.detail.darkMode);
        if (e.detail.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    const handleSystemMediaChange = (e) => {
      const curMode = localStorage.getItem('ekodak_photographer_theme_mode');
      if (curMode === 'system') {
        setIsDarkMode(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    const handleCompactUpdate = (e) => {
      if (typeof e.detail?.compactView === 'boolean') {
        if (e.detail.compactView) {
          document.documentElement.classList.add('compact-layout');
        } else {
          document.documentElement.classList.remove('compact-layout');
        }
      }
    };

    const handleMotionUpdate = (e) => {
      if (typeof e.detail?.motionEffects === 'boolean') {
        if (!e.detail.motionEffects) {
          document.documentElement.classList.add('reduce-motion');
        } else {
          document.documentElement.classList.remove('reduce-motion');
        }
      }
    };

    const handleSidebarCollapseUpdate = (e) => {
      if (typeof e.detail?.collapsed === 'boolean') {
        setSidebarCollapsed(e.detail.collapsed);
      }
    };

    window.addEventListener('ekodak_photographer_theme_changed', handleThemeUpdate);
    window.addEventListener('ekodak_photographer_compact_changed', handleCompactUpdate);
    window.addEventListener('ekodak_photographer_motion_changed', handleMotionUpdate);
    window.addEventListener('ekodak_photographer_sidebar_collapsed_changed', handleSidebarCollapseUpdate);
    if (mediaQuery) {
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemMediaChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleSystemMediaChange);
      }
    }

    // CLEANUP ON UNMOUNT: Ensure photographer station theme does NOT leak into Admin or Customer portals
    return () => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.remove('compact-layout');
      document.documentElement.classList.remove('reduce-motion');

      window.removeEventListener('ekodak_photographer_theme_changed', handleThemeUpdate);
      window.removeEventListener('ekodak_photographer_compact_changed', handleCompactUpdate);
      window.removeEventListener('ekodak_photographer_motion_changed', handleMotionUpdate);
      window.removeEventListener('ekodak_photographer_sidebar_collapsed_changed', handleSidebarCollapseUpdate);
      if (mediaQuery) {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleSystemMediaChange);
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(handleSystemMediaChange);
        }
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className={`h-screen w-screen overflow-hidden dashboard-gradient-bg flex font-body selection:bg-gold/20 selection:text-primary ${isDarkMode ? 'dark' : ''} dark:bg-neutral-950 dark:text-neutral-100`}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Fixed Full-Height Sidebar with Collapsible Rail */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 h-screen flex-shrink-0 bg-white dark:bg-neutral-900 border-r border-neutral-200/80 dark:border-neutral-800 shadow-xs
        transform transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
        w-64
        lg:translate-x-0 lg:static lg:h-screen lg:flex lg:flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <PhotographerSidebar
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <PhotographerHeader
          onMenuClick={() => setSidebarOpen(true)}
          isSidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebarCollapsed}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 scrollbar-smooth dashboard-gradient-bg dark:bg-neutral-950 w-full min-w-0">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
