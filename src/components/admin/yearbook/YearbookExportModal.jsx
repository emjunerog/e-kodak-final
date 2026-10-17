import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  X,
  Printer,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  getStudentPageCount,
  PRINT_SHEET_COUNT_OFFSET,
} from '../../../services/yearbookService';

/**
 * YearbookExportModal — fixed A4 bond paper (210 × 297 mm) PDF export.
 * Prints the linear print book (#yearbook-print-book) via the browser's
 * Print → Save as PDF pipeline. Export is blocked while critical
 * validation issues (missing data, duplicates) are unresolved.
 */
export default function YearbookExportModal({
  isOpen,
  onClose,
  config = {},
  students = [],
  preflight = {},
  onTriggerPrint,
}) {
  const [confirmedWarnings, setConfirmedWarnings] = useState(false);

  if (!isOpen) return null;

  const { passed, issues = [], warnings = [] } = preflight;
  const canExport = issues.length === 0 || confirmedWarnings;
  const interiorPages = getStudentPageCount(students.length, config.layoutDensity || 6);
  const totalSheets = interiorPages + PRINT_SHEET_COUNT_OFFSET;

  const handleStartExport = () => {
    onTriggerPrint?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-neutral-200 font-body animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-neutral-900 text-amber-400">
              <Printer size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-neutral-900 font-heading">
                Export Yearbook PDF
              </h2>
              <p className="text-xs text-neutral-500">
                A4 bond paper (210 × 297 mm) · {students.length} student{students.length === 1 ? '' : 's'} · {totalSheets} sheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">

          {/* Preflight status */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            passed ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}>
            {passed ? (
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <h4 className="font-bold">
                {passed ? 'Ready to export' : 'Resolve before exporting'}
              </h4>
              <p className="mt-0.5 opacity-90">
                {preflight.summary || ''}
              </p>
              {issues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {issues.map((iss, i) => (
                    <div key={i} className="font-semibold text-rose-700 flex items-center gap-1.5">
                      <span>•</span>
                      <span>{iss.title}</span>
                    </div>
                  ))}
                </div>
              )}
              {warnings.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {warnings.map((warn, i) => (
                    <div key={i} className="text-amber-800 opacity-90 flex items-center gap-1.5">
                      <span>•</span>
                      <span>{warn.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* What gets exported */}
          <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-neutral-800">
              <FileText size={14} className="text-amber-600" />
              <span>PDF contents (in order, one A4 sheet each)</span>
            </div>
            <ol className="list-decimal list-inside text-neutral-600 space-y-1 text-[11px]">
              <li>Front cover — {config.institutionName || 'school name'}</li>
              <li>School message</li>
              <li>Class directory</li>
              <li>{interiorPages} student page{interiorPages === 1 ? '' : 's'} ({config.layoutDensity || 6} per page, {currentThemeLabel(config)})</li>
              <li>Back cover</li>
            </ol>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Paper is fixed to A4 bond paper. In the print dialog: Destination <strong>Save as PDF</strong>, enable <strong>Background graphics</strong>, margins <strong>None</strong>.
            </p>
          </div>

          {/* Confirmation if issues exist */}
          {issues.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs flex items-start gap-2">
              <input
                type="checkbox"
                id="confirmWarnings"
                checked={confirmedWarnings}
                onChange={(e) => setConfirmedWarnings(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="confirmWarnings" className="text-rose-900 cursor-pointer leading-tight">
                <strong>Export anyway:</strong> records with missing data or duplicates will print as-is.
              </label>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <p className="text-[11px] text-neutral-500 font-mono">
            {totalSheets} A4 sheets · {config.sectionName || config.batchName || 'Untitled'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartExport}
              disabled={!canExport}
              className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer size={14} className="text-amber-400" />
              <span>Open Print / Save PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function currentThemeLabel(config) {
  const map = { classic: 'Classic', editorial: 'Editorial', minimalist: 'Minimalist', scrapbook: 'Scrapbook', chalkboard: 'Chalkboard' };
  return map[config.templateId] || 'Classic';
}

YearbookExportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  config: PropTypes.object,
  students: PropTypes.array,
  preflight: PropTypes.object,
  onTriggerPrint: PropTypes.func,
};
