import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Database,
  Printer,
  Plus,
  Camera,
  Crop,
  BookOpen,
  Grid,
  Layers,
  FileText,
  ChevronDown,
  SlidersHorizontal,
  School,
  BookImage,
  CopyX,
} from 'lucide-react';

/**
 * YearbookToolsSidebar — the 1/4 right-side tool column.
 * View switcher + 4-step workflow stacked vertically:
 * Step 1 Records → Step 2 Layout + Covers → Step 3 Review → Step 4 Export.
 */
export default function YearbookToolsSidebar({
  currentTheme = 'classic',
  onSelectTheme,
  config = {},
  onUpdateConfig,
  onAutoDetectDB,
  onAddStudent,
  onBatchUploadPhotos,
  onOpenTwoByTwoRoll,
  onOpenExportModal,
  onEditCovers,
  isDetectingDB,
  viewMode = 'book',
  onSelectViewMode,
  schools = [],
  selectedSchool = '',
  onSelectSchool,
  duplicateCount = 0,
  onRemoveDuplicates,
}) {
  const [showSettings, setShowSettings] = useState(false);

  const themes = [
    { id: 'classic', name: 'Classic' },
    { id: 'editorial', name: 'Editorial' },
    { id: 'minimalist', name: 'Minimalist' },
    { id: 'scrapbook', name: 'Scrapbook' },
    { id: 'chalkboard', name: 'Chalkboard' },
  ];

  const handleUpdate = (field, val) => {
    onUpdateConfig?.({ ...config, [field]: val });
  };

  const views = [
    { id: 'book', label: '3D Preview', icon: BookOpen, hint: 'Flip-through preview' },
    { id: 'print', label: 'PDF Pages', icon: FileText, hint: 'What will be exported (A4)' },
    { id: 'roster', label: 'Roster', icon: Layers, hint: 'Edit records' },
    { id: 'twobytwo', label: 'Photos', icon: Grid, hint: 'Check portraits' },
  ];

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm font-body overflow-hidden">
      <div className="p-3 sm:p-4 space-y-2.5">
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 px-1">
          Tools
        </p>

        {/* View switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-100/80 rounded-2xl border border-neutral-200/80">
          {views.map((v) => {
            const Icon = v.icon;
            const active = viewMode === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectViewMode?.(v.id)}
                title={v.hint}
                className={`px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  active ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Icon size={13} />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* Step 1 — Records (one school) */}
        <div className="p-3 rounded-2xl border border-neutral-200 bg-neutral-50/60">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2">
            1 · Records (One School)
          </p>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onAutoDetectDB}
              disabled={isDetectingDB}
              className="h-9 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Database size={14} className={isDetectingDB ? 'animate-spin text-amber-400' : 'text-amber-400'} />
              <span>{isDetectingDB ? 'Syncing…' : 'Sync Database'}</span>
            </button>
            <label className="flex items-center gap-1.5 text-xs">
              <School size={14} className="text-amber-600 shrink-0" />
              <select
                value={selectedSchool}
                onChange={(e) => onSelectSchool?.(e.target.value)}
                className="flex-1 min-w-0 py-1.5 px-2 text-xs font-bold bg-white border border-neutral-200 rounded-xl text-neutral-800 outline-none focus:border-amber-500"
                title="School included in this book"
              >
                {schools.length === 0 && <option value="">No schools detected</option>}
                {schools.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.count})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={onAddStudent}
                className="flex-1 h-9 px-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
              <button
                type="button"
                onClick={onBatchUploadPhotos}
                className="flex-1 h-9 px-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Camera size={14} className="text-amber-600" />
                <span>Photos</span>
              </button>
            </div>
          </div>
        </div>

        {/* Step 2 — Layout + Covers */}
        <div className="p-3 rounded-2xl border border-neutral-200 bg-neutral-50/60">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2">
            2 · Layout + Covers
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {themes.map((theme) => {
              const selected = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onSelectTheme(theme.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    selected
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  {theme.name}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <span className="text-xs font-mono uppercase text-neutral-400">Per page:</span>
            {[4, 6, 8].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => handleUpdate('layoutDensity', count)}
                className={`w-7 h-7 rounded-lg text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                  (config.layoutDensity || 6) === count
                    ? 'bg-neutral-900 text-amber-300'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {count}
              </button>
            ))}
            <button
              type="button"
              onClick={onEditCovers}
              className="ml-auto h-7 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <BookImage size={13} />
              <span>Edit Covers</span>
            </button>
          </div>
        </div>

        {/* Step 3 — Review */}
        <div className="p-3 rounded-2xl border border-neutral-200 bg-neutral-50/60">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2">
            3 · Review
          </p>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onSelectViewMode?.('roster')}
              className="h-9 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Layers size={14} className="text-amber-600" />
              <span>Roster &amp; fixes</span>
            </button>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={onOpenTwoByTwoRoll}
                className="flex-1 h-9 px-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Crop size={14} className="text-cyan-600" />
                <span>Photos</span>
              </button>
              <button
                type="button"
                onClick={onRemoveDuplicates}
                disabled={duplicateCount === 0}
                title={duplicateCount === 0 ? 'No duplicates' : `Remove ${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'}`}
                className="flex-1 h-9 px-2 rounded-xl border border-neutral-200 bg-white hover:bg-rose-50 text-neutral-700 hover:text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <CopyX size={14} />
                <span>Dupes{duplicateCount > 0 ? ` (${duplicateCount})` : ''}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Step 4 — Export */}
        <div className="p-3 rounded-2xl border border-amber-300 bg-amber-50/60">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 mb-2">
            4 · PDF Export (A4)
          </p>
          <button
            type="button"
            onClick={onOpenExportModal}
            className="w-full h-9 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Printer size={14} />
            <span>Export A4 PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="mt-1.5 w-full text-[11px] text-neutral-600 hover:text-neutral-900 font-semibold flex items-center justify-center gap-1 cursor-pointer"
          >
            <SlidersHorizontal size={12} className="text-amber-600" />
            <span>Book details ({config.sectionName || config.batchName || 'Untitled'})</span>
            <ChevronDown size={13} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Collapsible book details */}
        {showSettings && (
          <div className="p-3 bg-neutral-50/80 rounded-2xl border border-neutral-200/90 grid grid-cols-1 gap-2.5 animate-in fade-in duration-150 text-xs">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider font-bold text-neutral-500 mb-1">
                Academic Year
              </label>
              <input
                type="text"
                value={config.academicYear || ''}
                onChange={(e) => handleUpdate('academicYear', e.target.value)}
                placeholder="Type academic year"
                className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-xl font-medium focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider font-bold text-neutral-500 mb-1">
                Section / Class
              </label>
              <input
                type="text"
                value={config.sectionName || config.batchName || ''}
                onChange={(e) => {
                  onUpdateConfig?.({ ...config, sectionName: e.target.value, batchName: e.target.value });
                }}
                placeholder="Type section"
                className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-xl font-medium focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider font-bold text-neutral-500 mb-1">
                School Message (message page — blank omits)
              </label>
              <textarea
                rows={2}
                value={config.principalMessage || ''}
                onChange={(e) => handleUpdate('principalMessage', e.target.value)}
                placeholder="Type the exact message to print"
                className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-xl font-medium focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider font-bold text-neutral-500 mb-1">
                Signed By (optional)
              </label>
              <input
                type="text"
                value={config.principalName || ''}
                onChange={(e) => handleUpdate('principalName', e.target.value)}
                placeholder="Name"
                className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-xl font-medium focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider font-bold text-neutral-500 mb-1">
                Title (optional)
              </label>
              <input
                type="text"
                value={config.principalTitle || ''}
                onChange={(e) => handleUpdate('principalTitle', e.target.value)}
                placeholder="e.g. Principal"
                className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-xl font-medium focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

YearbookToolsSidebar.propTypes = {
  currentTheme: PropTypes.string,
  onSelectTheme: PropTypes.func,
  config: PropTypes.object,
  onUpdateConfig: PropTypes.func,
  onAutoDetectDB: PropTypes.func,
  onAddStudent: PropTypes.func,
  onBatchUploadPhotos: PropTypes.func,
  onOpenTwoByTwoRoll: PropTypes.func,
  onOpenExportModal: PropTypes.func,
  onEditCovers: PropTypes.func,
  isDetectingDB: PropTypes.bool,
  viewMode: PropTypes.string,
  onSelectViewMode: PropTypes.func,
  schools: PropTypes.array,
  selectedSchool: PropTypes.string,
  onSelectSchool: PropTypes.func,
  duplicateCount: PropTypes.number,
  onRemoveDuplicates: PropTypes.func,
};
