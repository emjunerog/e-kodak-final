import React from 'react';
import PropTypes from 'prop-types';
import {
  Printer,
  ShieldAlert,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

/**
 * YearbookAdminToolbar — slim full-width header.
 * Title + counts on the left, Preflight + Export actions on the right.
 * All workflow tools live in YearbookToolsSidebar (right 1/4 column).
 */
export default function YearbookAdminToolbar({
  preflight = {},
  onOpenPreflightAudit,
  onOpenExportModal,
  studentCount = 0,
  selectedSchool = '',
}) {
  const { passed, issuesCount = 0 } = preflight;

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm font-body overflow-hidden">
      <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-xl bg-amber-100 text-amber-900">
              <BookOpen size={18} />
            </span>
            <h1 className="font-heading text-lg sm:text-xl font-bold text-neutral-900">
              Yearbook Studio
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-mono font-bold uppercase tracking-wider border border-neutral-200">
              {studentCount} student{studentCount === 1 ? '' : 's'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-mono font-bold uppercase tracking-wider border border-neutral-200">
              A4
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {selectedSchool || 'One school per book'} · A4 bond paper · use the tools on the right.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenPreflightAudit}
            className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              passed
                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100'
                : 'border-amber-200 bg-amber-50/50 text-amber-900 hover:bg-amber-100'
            }`}
          >
            {passed ? <ShieldCheck size={14} className="text-emerald-600" /> : <ShieldAlert size={14} className="text-amber-600" />}
            <span>Preflight</span>
            {issuesCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[11px] font-mono flex items-center justify-center">
                {issuesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenExportModal}
            className="h-9 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Printer size={14} className="text-amber-400" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}

YearbookAdminToolbar.propTypes = {
  preflight: PropTypes.object,
  onOpenPreflightAudit: PropTypes.func,
  onOpenExportModal: PropTypes.func,
  studentCount: PropTypes.number,
  selectedSchool: PropTypes.string,
};
