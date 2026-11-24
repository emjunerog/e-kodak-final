import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  BookOpen,
  Palette,
  RefreshCw,
  GraduationCap,
  Layers,
  ChevronDown,
  PanelRight,
} from 'lucide-react';
import { resolveSchoolCrest } from '../../../services/yearbookService';

const VIEW_TABS = [
  { id: 'book', label: '3D Flipbook', icon: BookOpen },
  { id: 'design', label: 'My Design', icon: Palette },
];

export default function YearbookAdminToolbar({
  selectedSchool = '',
  selectedSection = 'ALL',
  viewMode = 'book',
  onChangeView,
  onAutoDetectDB,
  isDetectingDB = false,
  onOpenExport,
  showToolsSidebar = true,
  onToggleToolsSidebar,
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const crest = resolveSchoolCrest(selectedSchool);

  useEffect(() => {
    if (!actionsOpen) return undefined;
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActionsOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setActionsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [actionsOpen]);

  return (
    <header className="relative z-20 w-full mt-0 overflow-visible rounded-none rounded-b-2xl sm:rounded-b-3xl border-t-0 border-x-0 border-b border-amber-500/20 bg-gradient-to-r from-[#14100c] via-[#21180f] via-[#16151a] to-[#0f1726] text-white shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8),0_0_25px_rgba(201,169,110,0.12)] px-4 sm:px-6 py-2.5 sm:py-3">
      {/* Seamless Studio Gradient & Ambient Lights mirrored from AdminHeader (clipped within bottom radius) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-2xl sm:rounded-b-3xl">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-luminosity"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1600&q=80&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_100%_at_5%_0%,rgba(217,119,6,0.35),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_35%_0%,rgba(180,83,9,0.25),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_80%_at_95%_0%,rgba(30,58,138,0.25),transparent_60%)]" />
        <div className="absolute -bottom-20 -right-16 w-80 h-80 bg-gradient-to-tl from-sky-600/20 via-amber-600/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Emblem + Prominent Feature Title */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl bg-white/95 border border-[#c9a96e]/50 shadow-md flex items-center justify-center p-1.5 shrink-0">
            {crest?.src ? (
              <img src={crest.src} alt={crest.label || selectedSchool} className="w-full h-full object-contain" />
            ) : (
              <GraduationCap className="text-amber-600" size={22} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl sm:text-[28px] font-light text-white tracking-tight leading-tight truncate">
              <span>Yearbook </span>
              <span className="italic bg-gradient-to-r from-amber-200 via-gold to-amber-300 bg-clip-text text-transparent">
                Studio
              </span>
            </h1>
            {selectedSchool && (
              <p className="text-xs sm:text-sm font-medium text-amber-300/90 truncate mt-0.5">
                {selectedSchool}
                {selectedSection && selectedSection !== 'ALL' ? ` · ${selectedSection}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Right: Minimal Nav Switcher + Tools Dropdown */}
        <div className="flex items-center gap-2.5 shrink-0">
          <nav
            aria-label="Yearbook workspace views"
            className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.06] border border-white/15 backdrop-blur-md"
          >
            {VIEW_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeView?.(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-neutral-950 shadow-sm'
                      : 'text-neutral-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Dropdown Tool Menu for Sync DB & Export PDF */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setActionsOpen((prev) => !prev)}
              aria-expanded={actionsOpen}
              aria-haspopup="menu"
              title="Sync DB & Export PDF tools"
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-105 text-neutral-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Actions</span>
              <ChevronDown
                size={15}
                className={`transition-transform duration-150 ${actionsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {actionsOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#1a1511] border border-[#c9a96e]/35 shadow-2xl p-1.5 z-50 space-y-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActionsOpen(false);
                    onAutoDetectDB?.();
                  }}
                  disabled={isDetectingDB}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isDetectingDB ? 'animate-spin text-amber-300' : 'text-amber-300'} />
                  <span>{isDetectingDB ? 'Syncing DB...' : 'Sync DB'}</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActionsOpen(false);
                    onOpenExport?.();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-amber-300 hover:bg-amber-500/15 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Layers size={14} />
                  <span>Export PDF</span>
                </button>

                {onToggleToolsSidebar && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsOpen(false);
                      onToggleToolsSidebar?.();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-neutral-200 hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <PanelRight size={14} className="text-neutral-400" />
                    <span>{showToolsSidebar ? 'Hide Sidebar' : 'Show Sidebar'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

YearbookAdminToolbar.propTypes = {
  selectedSchool: PropTypes.string,
  selectedSection: PropTypes.string,
  viewMode: PropTypes.string,
  onChangeView: PropTypes.func,
  onAutoDetectDB: PropTypes.func,
  isDetectingDB: PropTypes.bool,
  onOpenExport: PropTypes.func,
  showToolsSidebar: PropTypes.bool,
  onToggleToolsSidebar: PropTypes.func,
};
