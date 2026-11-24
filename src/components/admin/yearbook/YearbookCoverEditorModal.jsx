import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  X,
  Check,
  Upload,
  BookOpen,
  BookLock,
} from 'lucide-react';
import {
  YearbookHardcoverFront,
  YearbookHardcoverBack,
  COVER_COLOR_OPTIONS,
  COVER_ART_OPTIONS,
} from './YearbookCover';
import { OFFICIAL_SCHOOL_LOGOS } from '../../booking/SchoolLogo';
import { detectCampuses, STUDIO_BACKGROUND_RESOURCES } from '../../../services/yearbookService';

/**
 * YearbookCoverEditorModal — edit the front and back covers.
 * Every field is optional; blank fields are omitted from the PDF.
 * Nothing is pre-filled with invented content.
 */
export default function YearbookCoverEditorModal({
  isOpen,
  config = {},
  students = [],
  studentCount = 0,
  pageCount = 0,
  onSave,
  onClose,
}) {
  const [tab, setTab] = useState('front'); // 'front' | 'back'
  const [draft, setDraft] = useState(null);

  if (!isOpen) return null;

  const form = draft || config;
  const set = (field, val) => setDraft({ ...form, [field]: val });
  const detected = detectCampuses(students);
  const detectedCampusHint = detected.length > 0
    ? `Detected from records: ${detected.join(' · ')}`
    : 'No campus found in records yet.';

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDraft({ ...form, coverLogoUrl: ev.target?.result });
    reader.readAsDataURL(file);
  };

  const handleBgUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDraft({ ...form, coverBgUrl: ev.target?.result });
    reader.readAsDataURL(file);
  };

  const themeIds = COVER_COLOR_OPTIONS.map((c) => c.id);
  const themeValue = themeIds.includes(form.coverColor) ? form.coverColor : 'midnight';
  const artIds = COVER_ART_OPTIONS.map((a) => a.id);
  const artValue = artIds.includes(form.coverArt) ? form.coverArt : 'sunburst';

  const handleSave = () => {
    onSave?.(form);
    setDraft(null);
    onClose?.();
  };

  const inputCls =
    'w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:outline-none focus:border-amber-500';
  const labelCls =
    'block text-xs font-mono uppercase tracking-wider font-bold text-neutral-500 mb-1';

  const field = (labelText, control, hint) => (
    <div>
      <label className={labelCls}>{labelText}</label>
      {control}
      {hint && <p className="text-xs text-neutral-400 mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-neutral-200 font-body animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 font-heading">Edit Covers</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Front and back covers print on A4 bond paper. Blank fields are omitted.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-1 p-1 bg-neutral-100/80 rounded-2xl border border-neutral-200/80 w-fit">
            <button
              type="button"
              onClick={() => setTab('front')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                tab === 'front' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <BookOpen size={13} />
              <span>Front Cover</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('back')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                tab === 'back' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <BookLock size={13} />
              <span>Back Cover</span>
            </button>
          </div>
        </div>

        {/* Body: form + live preview */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          {tab === 'front' ? (
            <div className="space-y-3 text-xs">
              {field('School Name', (
                <input type="text" value={form.institutionName || ''} onChange={(e) => set('institutionName', e.target.value)} placeholder="Fills in from the selected school" className={inputCls} />
              ), 'Leave blank to always use the selected school name.')}
              {field('Campus (used when records have no campus)', (
                <input type="text" value={form.campus || ''} onChange={(e) => set('campus', e.target.value)} placeholder="Detected from records automatically" className={inputCls} />
              ), detectedCampusHint)}
              {field('Program / Track', (
                <input type="text" value={form.programName || ''} onChange={(e) => set('programName', e.target.value)} placeholder="Type program" className={inputCls} />
              ))}
              {field('Section / Class', (
                <input type="text" value={form.sectionName || ''} onChange={(e) => set('sectionName', e.target.value)} placeholder="Type section" className={inputCls} />
              ))}
              {field('Academic Year', (
                <input type="text" value={form.academicYear || ''} onChange={(e) => set('academicYear', e.target.value)} placeholder="Type academic year" className={inputCls} />
              ))}
              {field('Volume Line (optional)', (
                <input type="text" value={form.volumeNumber || ''} onChange={(e) => set('volumeNumber', e.target.value)} placeholder="Leave blank to omit" className={inputCls} />
              ))}
              {field('Premium Theme (brown · blue · yellow)', (
                <select value={themeValue} onChange={(e) => set('coverColor', e.target.value)} className={inputCls}>
                  {COVER_COLOR_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ))}
              {field('Cover Illustration', (
                <select value={artValue} onChange={(e) => set('coverArt', e.target.value)} className={inputCls}>
                  {COVER_ART_OPTIONS.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              ), 'Gold line art drawn over the cover.')}
              {field('Cover Background Photo (optional)', (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Upload size={14} />
                      <span>Upload Photo</span>
                      <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                    </label>
                    {form.coverBgUrl && (
                      <button type="button" onClick={() => set('coverBgUrl', '')} className="text-xs text-rose-600 hover:text-rose-700 underline cursor-pointer">
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {STUDIO_BACKGROUND_RESOURCES.slice(0, 4).map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => set('coverBgUrl', res.url)}
                        title={`Use ${res.label}`}
                        className={`h-11 rounded-lg overflow-hidden border transition-all cursor-pointer relative group ${
                          form.coverBgUrl === res.url ? 'border-amber-500 ring-2 ring-amber-400/50' : 'border-neutral-200 hover:border-amber-400'
                        }`}
                      >
                        <img src={res.url} alt={res.label} className="w-full h-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-neutral-950/75 text-white text-[9px] truncate px-1 py-0.5">
                          {res.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ), 'Upload your own Canva cover or pick an E-Kodak studio portrait backdrop.')}
              {field(`Background Shade (${form.coverBgShade ?? 72}%)`, (
                <input
                  type="range"
                  min="30"
                  max="92"
                  value={form.coverBgShade ?? 72}
                  onChange={(e) => set('coverBgShade', Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              ), 'Higher = deeper theme color over the photo.')}
              {field('School Seal / Crest (optional)', (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Upload size={14} />
                      <span>Upload Seal</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {form.coverLogoUrl && (
                      <button type="button" onClick={() => set('coverLogoUrl', '')} className="text-xs text-rose-600 hover:text-rose-700 underline cursor-pointer">
                        Reset
                      </button>
                    )}
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 cursor-pointer ml-auto">
                      <input
                        type="checkbox"
                        checked={Boolean(form.hideCoverLogo)}
                        onChange={(e) => set('hideCoverLogo', e.target.checked)}
                        className="rounded accent-amber-600 cursor-pointer"
                      />
                      <span>Hide Seal</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 p-2 rounded-xl bg-neutral-50 border border-neutral-200/80 max-h-28 overflow-y-auto">
                    {Object.entries(OFFICIAL_SCHOOL_LOGOS).map(([code, logo]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setDraft({ ...form, coverLogoUrl: logo.src, hideCoverLogo: false })}
                        title={logo.label}
                        className={`p-1 rounded-lg border bg-white flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                          form.coverLogoUrl === logo.src
                            ? 'border-amber-500 ring-2 ring-amber-400/40'
                            : 'border-neutral-200 hover:border-amber-400'
                        }`}
                      >
                        <img src={logo.src} alt={logo.short} className="w-6 h-6 object-contain" />
                        <span className="text-[9px] font-mono font-bold text-neutral-700 uppercase">{logo.short}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ), 'Auto-matches Cebu schools (CTU, USC, UC, CIT-U, CNU, UP, USJ-R, SWU, CDU, Velez) or pick one manually.')}
              {field('Photo Credit (optional)', (
                <input type="text" value={form.curatorName || ''} onChange={(e) => set('curatorName', e.target.value)} placeholder="Leave blank to omit" className={inputCls} />
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {field('Closing Title (optional)', (
                <input type="text" value={form.backTitle || ''} onChange={(e) => set('backTitle', e.target.value)} placeholder="Falls back to school name when blank" className={inputCls} />
              ))}
              {field('Closing Message (optional)', (
                <textarea rows={4} value={form.backMessage || ''} onChange={(e) => set('backMessage', e.target.value)} placeholder="Type the exact message to print" className={`${inputCls} resize-none`} />
              ), 'Printed word-for-word. Nothing is added automatically.')}
              {field('Credit Line (optional)', (
                <input type="text" value={form.backCredit || ''} onChange={(e) => set('backCredit', e.target.value)} placeholder="Leave blank to omit" className={inputCls} />
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="showBackCounts"
                  checked={form.showBackCounts !== false}
                  onChange={(e) => set('showBackCounts', e.target.checked)}
                  className="rounded text-amber-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="showBackCounts" className="text-neutral-700 cursor-pointer font-medium">
                  Show student and page totals on back cover
                </label>
              </div>
            </div>
          )}

          {/* Live preview */}
          <div className="space-y-2">
            <p className={labelCls}>Live Preview (A4 Portrait)</p>
            <div className="rounded-2xl overflow-hidden border border-neutral-200 aspect-[210/297] max-h-[520px] mx-auto w-full max-w-[320px]">
              {tab === 'front' ? (
                <YearbookHardcoverFront config={form} students={students} />
              ) : (
                <YearbookHardcoverBack config={form} students={students} studentCount={studentCount} pageCount={pageCount} />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-2 bg-neutral-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>Save Covers</span>
          </button>
        </div>
      </div>
    </div>
  );
}

YearbookCoverEditorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  config: PropTypes.object,
  students: PropTypes.array,
  studentCount: PropTypes.number,
  pageCount: PropTypes.number,
  onSave: PropTypes.func,
  onClose: PropTypes.func,
};
