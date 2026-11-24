import React from 'react';
import PropTypes from 'prop-types';
import {
  Database,
  Plus,
  Camera,
  BookOpen,
  Printer,
  Sliders,
  Sparkles,
  Quote,
  Award,
  PanelRightClose,
} from 'lucide-react';
import { resolveSchoolCrest } from '../../../services/yearbookService';

const DENSITIES = [4, 6, 8, 9, 12];

/**
 * Collapsible frosty-glass Studio Tools Sidebar.
 * Uses clean frosted-glass controls, balanced text spacing, and zero dead space.
 */
export default function YearbookToolsSidebar({
  viewMode = 'book',
  onChangeView,
  onHideSidebar,
  selectedSchool = '',
  availableSchools = [],
  onSelectSchool,
  selectedSection = 'ALL',
  availableSections = [],
  onSelectSection,
  totalStudentsCount = 0,
  bookStudentsCount = 0,
  excludedCount = 0,
  onAutoDetectDB,
  isDetectingDB = false,
  onOpenAddStudent,
  onOpenBatchPhotoUpload,
  config = {},
  onUpdateConfig,
  onOpenConfigModal,
  onOpenExport,
}) {
  const density = config.layoutDensity || 6;
  const activeCrest = resolveSchoolCrest(selectedSchool);

  const glassSectionCls =
    'rounded-xl bg-white/45 backdrop-blur-md border border-white/80 ring-1 ring-[#c9a96e]/15 p-3 space-y-2.5 shadow-2xs';
  const sectionLabelCls =
    'text-[11px] font-sans uppercase tracking-[0.06em] font-bold text-neutral-700 leading-tight';
  const glassBtnCls =
    'py-1.5 px-2.5 rounded-xl bg-white/60 hover:bg-white/90 backdrop-blur-md border border-white/90 ring-1 ring-neutral-900/5 shadow-2xs text-neutral-800 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all';
  const activePillCls =
    'bg-neutral-900/90 backdrop-blur-md text-amber-300 border border-amber-400/35 shadow-xs';
  const glassPillCls =
    'bg-white/60 hover:bg-white/90 backdrop-blur-md border border-white/90 ring-1 ring-neutral-900/5 text-neutral-700 hover:text-neutral-950 shadow-2xs';

  return (
    <aside className="h-fit flex flex-col gap-2.5 p-2.5 rounded-2xl bg-white/55 backdrop-blur-xl border border-white/80 ring-1 ring-[#c9a96e]/25 shadow-lg">
      {/* ── WORKSPACE VIEW + 1-CLICK HIDE ─────────────────────── */}
      <section className={glassSectionCls}>
        <div className="flex items-center justify-between gap-2">
          <span className={`${sectionLabelCls} whitespace-nowrap`}>Workspace View</span>
          {onHideSidebar && (
            <button
              type="button"
              onClick={onHideSidebar}
              title="Hide Tools Panel"
              className="px-2 py-1 rounded-lg bg-white/65 hover:bg-white/95 backdrop-blur-md border border-white/90 ring-1 ring-neutral-900/10 text-neutral-700 hover:text-neutral-950 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs shrink-0"
            >
              <PanelRightClose size={11} />
              <span>Hide</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'book', label: '3D Book', icon: BookOpen },
            { id: 'design', label: 'My Design', icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon;
            const active = viewMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView?.(item.id)}
                className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  active ? activePillCls : glassPillCls
                }`}
              >
                <Icon size={12} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 1 · SCHOOL & SECTION ───────────────────────────────── */}
      <section className={glassSectionCls}>
        <div className="flex items-center justify-between">
          <span className={sectionLabelCls}>1 · School &amp; Section</span>
          {totalStudentsCount > 0 && (
            <span className="text-[11px] text-neutral-600 font-medium tabular-nums">
              <strong className="text-neutral-900">{bookStudentsCount}</strong>/{totalStudentsCount}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onAutoDetectDB}
          disabled={isDetectingDB}
          className="w-full py-2 px-3 bg-neutral-900/90 hover:bg-neutral-900 backdrop-blur-md border border-amber-400/25 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <Database size={12} className="text-amber-300" />
          <span>{isDetectingDB ? 'Syncing Bookings...' : 'Sync Database Batches'}</span>
        </button>

        {/* School Picker with matched Crest */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl border border-white/90 bg-white/75 backdrop-blur-md ring-1 ring-neutral-900/5 flex items-center justify-center p-1 shrink-0 shadow-2xs">
            {activeCrest?.src ? (
              <img src={activeCrest.src} alt={activeCrest.short} className="w-full h-full object-contain" />
            ) : (
              <span className="text-[9px] font-mono font-bold text-neutral-500">SCH</span>
            )}
          </div>
          <select
            value={selectedSchool}
            onChange={(e) => onSelectSchool?.(e.target.value)}
            aria-label="Target school"
            className="flex-1 min-w-0 px-2.5 py-1.5 bg-white/65 backdrop-blur-md border border-white/90 ring-1 ring-neutral-900/5 rounded-xl text-[11px] font-semibold text-neutral-900 focus:outline-none focus:border-amber-500 shadow-2xs"
          >
            {availableSchools.length === 0 ? (
              <option value="">No schools detected</option>
            ) : (
              availableSchools.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.count})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Section Batch Picker */}
        <select
          value={selectedSection || 'ALL'}
          onChange={(e) => onSelectSection?.(e.target.value)}
          aria-label="Target section batch"
          className="w-full px-2.5 py-1.5 bg-white/65 backdrop-blur-md border border-white/90 ring-1 ring-neutral-900/5 rounded-xl text-[11px] font-semibold text-neutral-900 focus:outline-none focus:border-amber-500 shadow-2xs"
        >
          <option value="ALL">All Sections in School</option>
          {availableSections.map((sec) => (
            <option key={sec} value={sec}>
              Section: {sec}
            </option>
          ))}
        </select>

        {excludedCount > 0 && (
          <p className="text-[10px] text-amber-800 leading-snug bg-amber-50/80 backdrop-blur-md border border-amber-200/90 rounded-xl px-2.5 py-1.5">
            {excludedCount} incomplete —{' '}
            <button
              type="button"
              onClick={() => onChangeView?.('roster')}
              className="underline font-bold cursor-pointer"
            >
              fix in Roster
            </button>
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button type="button" onClick={onOpenAddStudent} className={glassBtnCls} title="Add Student">
            <Plus size={12} />
            <span>Add</span>
          </button>
          <button type="button" onClick={onOpenBatchPhotoUpload} className={glassBtnCls} title="Batch Match 2x2 Photos">
            <Camera size={12} className="text-amber-700" />
            <span>Photos</span>
          </button>
        </div>
      </section>

      {/* ── 2 · PAGE OPTIONS (PER PAGE + MOTTOS & HONORS) ──────── */}
      <section className={glassSectionCls}>
        <div className="flex items-center justify-between">
          <span className={sectionLabelCls}>2 · Page Options</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-sans uppercase tracking-[0.06em] text-neutral-600 font-bold">
            Per Page
          </span>
          <div className="flex items-center gap-1.5">
            {DENSITIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onUpdateConfig?.({ layoutDensity: d })}
                className={`w-7 h-6 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                  density === d ? activePillCls : glassPillCls
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/70">
          <button
            type="button"
            onClick={() => onUpdateConfig?.({ showMottos: config.showMottos === false })}
            className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              config.showMottos !== false ? activePillCls : glassPillCls
            }`}
          >
            <Quote size={11} />
            <span>Mottos</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateConfig?.({ showHonors: config.showHonors === false })}
            className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              config.showHonors !== false ? activePillCls : glassPillCls
            }`}
          >
            <Award size={11} />
            <span>Honors</span>
          </button>
        </div>
      </section>

      {/* ── 3 · REVIEW & EXPORT PDF ────────────────────────────── */}
      <section className={glassSectionCls}>
        <div className="flex items-center justify-between">
          <span className={sectionLabelCls}>3 · Review &amp; Export</span>
          <button
            type="button"
            onClick={onOpenConfigModal}
            className="px-2 py-0.5 rounded-lg bg-white/60 hover:bg-white/90 border border-white/85 text-[10px] font-semibold text-neutral-700 hover:text-neutral-950 flex items-center gap-1 cursor-pointer transition-all"
          >
            <Sliders size={10} />
            <span>Details</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenExport}
          className="w-full py-2.5 px-3 bg-gradient-to-r from-[#d4af37]/95 to-[#b58b28]/95 hover:brightness-105 backdrop-blur-md border border-amber-200/60 text-neutral-950 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Printer size={13} />
          <span>Export A4 PDF</span>
        </button>
      </section>
    </aside>
  );
}

YearbookToolsSidebar.propTypes = {
  viewMode: PropTypes.string,
  onChangeView: PropTypes.func,
  onHideSidebar: PropTypes.func,
  selectedSchool: PropTypes.string,
  availableSchools: PropTypes.array,
  onSelectSchool: PropTypes.func,
  selectedSection: PropTypes.string,
  availableSections: PropTypes.array,
  onSelectSection: PropTypes.func,
  totalStudentsCount: PropTypes.number,
  bookStudentsCount: PropTypes.number,
  excludedCount: PropTypes.number,
  onAutoDetectDB: PropTypes.func,
  isDetectingDB: PropTypes.bool,
  onOpenAddStudent: PropTypes.func,
  onOpenBatchPhotoUpload: PropTypes.func,
  config: PropTypes.object,
  onUpdateConfig: PropTypes.func,
  onOpenConfigModal: PropTypes.func,
  onOpenExport: PropTypes.func,
};
