import React from 'react';
import PropTypes from 'prop-types';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  CameraOff,
  Quote,
  ShieldCheck,
  ChevronRight,
  CopyX,
} from 'lucide-react';
import { validateStudentRecord, detectDuplicateRecords } from '../../../services/yearbookService';

const COVER_THEME_LABELS = {
  midnight: 'Midnight Blue · Gold',
  royal: 'Royal Sapphire · Yellow',
  espresso: 'Espresso Brown · Gold',
  marigold: 'Marigold Bronze · Yellow',
  noir: 'Noir Champagne · Gold',
  navy: 'Midnight Blue · Gold',
  black: 'Noir Champagne · Gold',
  crimson: 'Espresso Brown · Gold',
  emerald: 'Midnight Blue · Gold',
};

function coverThemeName(id) {
  return COVER_THEME_LABELS[id] || 'Midnight Blue · Gold';
}

export default function CompletenessAuditDrawer({
  isOpen,
  onClose,
  preflight = {},
  students = [],
  config = {},
  onSelectStudent,
  onRemoveDuplicates,
}) {
  if (!isOpen) return null;

  const { issues = [], warnings = [], passed, warningsCount = 0 } = preflight;

  const missingPhotos = students.filter((s) => !s.photoUrl);
  const missingQuotes = students.filter((s) => !s.motto || s.motto.trim() === '');
  const missingDegree = students.filter((s) => !s.degree && !s.credentials);
  const invalidRecords = students.filter((s) => !(s.validation || validateStudentRecord(s)).valid);
  const duplicates = detectDuplicateRecords(students);

  // Overall readiness score
  const totalWeight = students.length * 3 || 1;
  const verifiedCount = (students.length - missingPhotos.length) * 1.5 + (students.length - missingQuotes.length) * 0.75 + (students.length - missingDegree.length) * 0.75;
  const readinessPercentage = Math.min(100, Math.round((verifiedCount / totalWeight) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-neutral-200 flex flex-col font-body animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
              {passed ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-neutral-900">
                Preflight Report
              </h3>
              <p className="text-xs text-neutral-500">
                {students.length} student record{students.length === 1 ? '' : 's'} checked
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Readiness Score Progress Bar */}
        <div className="p-5 bg-gradient-to-b from-neutral-50 to-white border-b border-neutral-100">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-neutral-700">Readiness</span>
            <span className={`font-mono font-bold ${readinessPercentage >= 90 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {readinessPercentage}% Ready
            </span>
          </div>
          <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${readinessPercentage >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${readinessPercentage}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-neutral-100 text-center">
            <div className="p-1.5 rounded-lg bg-neutral-50">
              <span className="block text-xs font-bold text-neutral-900 font-mono">
                {missingPhotos.length}
              </span>
              <span className="text-[11px] uppercase font-semibold text-neutral-500">
                No Photo
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-neutral-50">
              <span className="block text-xs font-bold text-neutral-900 font-mono">
                {missingQuotes.length}
              </span>
              <span className="text-[11px] uppercase font-semibold text-neutral-500">
                No Motto
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-neutral-50">
              <span className="block text-xs font-bold text-neutral-900 font-mono">
                {warningsCount}
              </span>
              <span className="text-[11px] uppercase font-semibold text-neutral-500">
                Warnings
              </span>
            </div>
          </div>
        </div>

        {/* Audit Details Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Invalid records — fail strict validation */}
          {invalidRecords.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/90 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <AlertTriangle size={15} />
                <span>{invalidRecords.length} Incomplete Record{invalidRecords.length === 1 ? '' : 's'} — Fix Required</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Name, school, section, student ID, and photo are all required.
              </p>
              <div className="space-y-1 pt-1">
                {invalidRecords.map((stu) => {
                  const v = stu.validation || validateStudentRecord(stu);
                  return (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectStudent?.(stu);
                      }}
                      className="w-full p-2 bg-white rounded-xl border border-rose-200 flex items-center justify-between text-left hover:bg-rose-100/50 transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-semibold text-neutral-900 truncate">
                        {stu.name || '(unnamed record)'}
                      </span>
                      <span className="text-xs text-rose-600 font-mono shrink-0" title={v.errors.join(', ')}>
                        {v.errors[0] || 'Fix'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Duplicates — one-click removal */}
          {duplicates.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/90 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <CopyX size={15} />
                <span>{duplicates.length} Duplicate{duplicates.length === 1 ? '' : 's'} — Export Blocked</span>
              </div>
              <div className="space-y-1 pt-1">
                {duplicates.slice(0, 6).map((d, i) => (
                  <div key={i} className="w-full p-2 bg-white rounded-xl border border-rose-200 text-xs text-neutral-700">
                    <span className="font-semibold text-neutral-900">{d.student.name}</span>
                    <span className="text-neutral-500"> · {d.type}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  onRemoveDuplicates?.();
                  onClose();
                }}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Remove All Duplicates
              </button>
            </div>
          )}

          {/* Missing Photos Section */}
          {missingPhotos.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/90 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <CameraOff size={15} />
                <span>{missingPhotos.length} Without Photo</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                These records will print with an empty photo frame.
              </p>
              <div className="space-y-1 pt-1">
                {missingPhotos.map((stu) => (
                  <button
                    key={stu.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectStudent?.(stu);
                    }}
                    className="w-full p-2 bg-white rounded-xl border border-rose-200 flex items-center justify-between text-left hover:bg-rose-100/50 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-neutral-900 truncate">
                      {stu.name}
                    </span>
                    <span className="text-xs text-rose-600 font-mono flex items-center gap-1 shrink-0">
                      <span>Assign Photo</span>
                      <ChevronRight size={12} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Missing Quotes Section */}
          {missingQuotes.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Quote size={15} />
                <span>{missingQuotes.length} Without Motto</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Records without a motto print name, ID, and program only.
              </p>
              <div className="space-y-1 pt-1">
                {missingQuotes.slice(0, 8).map((stu) => (
                  <button
                    key={stu.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectStudent?.(stu);
                    }}
                    className="w-full p-2 bg-white rounded-xl border border-amber-200 flex items-center justify-between text-left hover:bg-amber-100/50 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-neutral-900 truncate">
                      {stu.name}
                    </span>
                    <span className="text-xs text-amber-800 font-mono flex items-center gap-1 shrink-0">
                      <span>Add Quote</span>
                      <ChevronRight size={12} />
                    </span>
                  </button>
                ))}
                {missingQuotes.length > 8 && (
                  <p className="text-xs text-neutral-500 font-mono text-center pt-1">
                    +{missingQuotes.length - 8} more candidates
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Passed Checks */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
            <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Checks</span>
            </h4>
            <ul className="text-xs text-neutral-600 space-y-1.5 pl-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Records come from the database; nothing is auto-generated</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Cover theme: {coverThemeName(config.coverColor)}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Edits apply to this yearbook only</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 font-mono">
            Audit updated in real time
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Audit
          </button>
        </div>

      </div>
    </div>
  );
}

CompletenessAuditDrawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  preflight: PropTypes.object,
  students: PropTypes.array,
  config: PropTypes.object,
  onSelectStudent: PropTypes.func,
  onRemoveDuplicates: PropTypes.func,
};
